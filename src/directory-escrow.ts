// Event handlers for DirectoryEscrow: the Escrow contract in evm_directory_chain.
//
// Lifecycle: OPEN -> ACCEPTED -> COMPLETED | REFUNDED | EXPIRED, or OPEN -> CANCELLED.
// COMPLETED counts as a successful deal; CANCELLED, REFUNDED and EXPIRED count as failed.
import { Address, BigInt, Bytes, ethereum } from "@graphprotocol/graph-ts"
import {
  OfferCreated,
  OfferAccepted,
  OfferCancelled,
  SaleExecuted,
  Refunded,
  OfferExpired
} from "../generated/DirectoryEscrow/DirectoryEscrow"
import { EscrowOffer, EscrowOfferEvent, EscrowOfferStats } from "../generated/schema"

const STATS_ID = "global"

function offerKey(contract: Address, offerId: BigInt): string {
  return contract.toHexString() + "-" + offerId.toString()
}

export function getOfferStats(timestamp: BigInt): EscrowOfferStats {
  let stats = EscrowOfferStats.load(STATS_ID)
  if (stats == null) {
    stats = new EscrowOfferStats(STATS_ID)
    stats.created = BigInt.zero()
    stats.open = BigInt.zero()
    stats.accepted = BigInt.zero()
    stats.succeeded = BigInt.zero()
    stats.failed = BigInt.zero()
    stats.completed = BigInt.zero()
    stats.cancelled = BigInt.zero()
    stats.refunded = BigInt.zero()
    stats.expired = BigInt.zero()
    stats.volume = BigInt.zero()
    stats.volumeUsd = BigInt.zero()
  }
  stats.updatedAt = timestamp
  return stats
}

function recordEvent(
  event: ethereum.Event,
  offerId: string,
  type: string,
  actor: Bytes | null,
  amount: BigInt | null
): void {
  let e = new EscrowOfferEvent(event.transaction.hash.concatI32(event.logIndex.toI32()))
  e.offer = offerId
  e.type = type
  e.actor = actor
  e.amount = amount
  e.blockNumber = event.block.number
  e.blockTimestamp = event.block.timestamp
  e.transactionHash = event.transaction.hash
  e.save()
}

/** Closes an offer and bumps the success/fail counters. */
function close(offer: EscrowOffer, status: string, by: Bytes, event: ethereum.Event): void {
  let one = BigInt.fromI32(1)
  let stats = getOfferStats(event.block.timestamp)
  let succeeded = status == "COMPLETED"
  offer.status = status
  offer.outcome = succeeded ? "SUCCEEDED" : "FAILED"
  offer.closedBy = by
  offer.closedAt = event.block.timestamp
  offer.updatedAt = event.block.timestamp
  stats.open = stats.open.minus(one)
  if (succeeded) {
    stats.succeeded = stats.succeeded.plus(one)
    stats.completed = stats.completed.plus(one)
    stats.volume = stats.volume.plus(offer.amount)
    stats.volumeUsd = stats.volumeUsd.plus(offer.usdValue)
  } else {
    stats.failed = stats.failed.plus(one)
    if (status == "CANCELLED") stats.cancelled = stats.cancelled.plus(one)
    if (status == "REFUNDED") stats.refunded = stats.refunded.plus(one)
    if (status == "EXPIRED") stats.expired = stats.expired.plus(one)
  }
  stats.save()
}

export function handleOfferCreated(event: OfferCreated): void {
  let id = offerKey(event.address, event.params.offerId)
  let offer = new EscrowOffer(id)
  offer.offerId = event.params.offerId
  offer.contract = event.address
  offer.side = event.params.side == 1 ? "BUY" : "SELL"
  offer.creator = event.params.creator
  offer.seller = event.params.seller
  offer.buyer = event.params.buyer
  offer.amount = event.params.amount
  offer.usdValue = event.params.usdValue
  offer.status = "OPEN"
  offer.outcome = "PENDING"
  offer.createdAt = event.block.timestamp
  offer.createdBlock = event.block.number
  offer.createdTx = event.transaction.hash
  offer.updatedAt = event.block.timestamp
  offer.save()

  let stats = getOfferStats(event.block.timestamp)
  stats.created = stats.created.plus(BigInt.fromI32(1))
  stats.open = stats.open.plus(BigInt.fromI32(1))
  stats.save()

  recordEvent(event, id, "CREATED", event.params.creator, event.params.amount)
}

export function handleOfferAccepted(event: OfferAccepted): void {
  let id = offerKey(event.address, event.params.offerId)
  let offer = EscrowOffer.load(id)
  if (offer == null) return
  offer.seller = event.params.seller
  offer.buyer = event.params.buyer
  offer.status = "ACCEPTED"
  offer.acceptedAt = event.block.timestamp
  offer.updatedAt = event.block.timestamp
  offer.save()

  let stats = getOfferStats(event.block.timestamp)
  stats.accepted = stats.accepted.plus(BigInt.fromI32(1))
  stats.save()

  // The party that accepted is whoever was not the creator.
  let actor = offer.side == "SELL" ? event.params.buyer : event.params.seller
  recordEvent(event, id, "ACCEPTED", actor, event.params.amount)
}

export function handleOfferCancelled(event: OfferCancelled): void {
  let id = offerKey(event.address, event.params.offerId)
  let offer = EscrowOffer.load(id)
  if (offer == null) return
  close(offer, "CANCELLED", event.params.cancelledBy, event)
  offer.save()
  recordEvent(event, id, "CANCELLED", event.params.cancelledBy, null)
}

export function handleSaleExecuted(event: SaleExecuted): void {
  let id = offerKey(event.address, event.params.offerId)
  let offer = EscrowOffer.load(id)
  if (offer == null) return
  close(offer, "COMPLETED", event.transaction.from, event)
  offer.save()
  recordEvent(event, id, "SALE_EXECUTED", event.transaction.from, event.params.amount)
}

export function handleOfferRefunded(event: Refunded): void {
  let id = offerKey(event.address, event.params.offerId)
  let offer = EscrowOffer.load(id)
  if (offer == null) return
  close(offer, "REFUNDED", event.params.refundedBy, event)
  offer.save()
  recordEvent(event, id, "REFUNDED", event.params.refundedBy, event.params.amount)
}

export function handleOfferExpired(event: OfferExpired): void {
  let id = offerKey(event.address, event.params.offerId)
  let offer = EscrowOffer.load(id)
  if (offer == null) return
  close(offer, "EXPIRED", event.params.expiredBy, event)
  offer.save()
  recordEvent(event, id, "EXPIRED", event.params.expiredBy, event.params.amount)
}
