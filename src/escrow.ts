// Event handlers for the Sepolia Escrow data source.
//
// Lifecycle mapping (owner intent -> real contract events):
//   offer created   -> EscrowCreated
//   offer accepted  -> SellerAgreed + EscrowFunded (deal is live once both happened)
//   offer cancelled -> EscrowCancelled (only possible before the deal is live)
//   sale executed   -> Released, or DisputeResolved with sellerBps == 10000
// Fall-through after funding -> Refunded, or DisputeResolved with sellerBps < 10000.
import { Address, BigInt, Bytes, ethereum } from "@graphprotocol/graph-ts"
import {
  EscrowCreated,
  SellerAgreed,
  EscrowFunded,
  EscrowCancelled,
  Released,
  Refunded,
  DisputeRaised,
  DisputeEscalated,
  DisputeCancelled,
  DisputeResolved
} from "../generated/Escrow/Escrow"
import { Escrow, EscrowEvent, EscrowStats } from "../generated/schema"

const STATS_ID = "global"
const FULL_BPS = 10000

function getStats(timestamp: BigInt): EscrowStats {
  let stats = EscrowStats.load(STATS_ID)
  if (stats == null) {
    stats = new EscrowStats(STATS_ID)
    stats.created = BigInt.zero()
    stats.funded = BigInt.zero()
    stats.open = BigInt.zero()
    stats.succeeded = BigInt.zero()
    stats.failed = BigInt.zero()
    stats.released = BigInt.zero()
    stats.refunded = BigInt.zero()
    stats.cancelled = BigInt.zero()
    stats.disputed = BigInt.zero()
  }
  stats.updatedAt = timestamp
  return stats
}

function partyFromUint(value: i32): string {
  if (value == 1) return "BUYER"
  if (value == 2) return "SELLER"
  return "NONE"
}

function recordEvent(
  event: ethereum.Event,
  escrowId: string,
  type: string,
  actor: Bytes | null,
  party: string | null,
  amount: BigInt | null
): void {
  let e = new EscrowEvent(event.transaction.hash.concatI32(event.logIndex.toI32()))
  e.escrow = escrowId
  e.type = type
  e.actor = actor
  e.party = party
  e.amount = amount
  e.blockNumber = event.block.number
  e.blockTimestamp = event.block.timestamp
  e.transactionHash = event.transaction.hash
  e.save()
}

/** Marks a deal finished and updates the success/fail counters. */
function close(escrow: Escrow, status: string, succeeded: boolean, timestamp: BigInt): void {
  let stats = getStats(timestamp)
  escrow.status = status
  escrow.outcome = succeeded ? "SUCCEEDED" : "FAILED"
  escrow.closedAt = timestamp
  stats.open = stats.open.minus(BigInt.fromI32(1))
  if (succeeded) {
    stats.succeeded = stats.succeeded.plus(BigInt.fromI32(1))
  } else {
    stats.failed = stats.failed.plus(BigInt.fromI32(1))
  }
  if (status == "RELEASED") stats.released = stats.released.plus(BigInt.fromI32(1))
  if (status == "REFUNDED") stats.refunded = stats.refunded.plus(BigInt.fromI32(1))
  if (status == "CANCELLED") stats.cancelled = stats.cancelled.plus(BigInt.fromI32(1))
  stats.save()
}

function activateIfReady(escrow: Escrow, timestamp: BigInt): void {
  if (escrow.status == "CREATED" && escrow.sellerAgreed && escrow.buyerFunded) {
    escrow.status = "FUNDED"
    let stats = getStats(timestamp)
    stats.funded = stats.funded.plus(BigInt.fromI32(1))
    stats.save()
  }
}

export function handleEscrowCreated(event: EscrowCreated): void {
  let id = event.params.id.toString()
  let escrow = new Escrow(id)
  escrow.escrowId = event.params.id
  escrow.contract = event.address
  escrow.creator = event.params.creator
  escrow.seller = event.params.seller
  escrow.buyer = event.params.buyer
  escrow.broker = event.params.broker
  escrow.token = event.params.token
  escrow.amount = event.params.amount
  escrow.feeBps = event.params.feeBps
  escrow.brokerBps = event.params.brokerBps
  escrow.challengeWindow = event.params.challengeWindow
  escrow.detailsHash = event.params.detailsHash
  escrow.status = "CREATED"
  escrow.outcome = "PENDING"
  // createEscrow() pre-agrees for the seller when the seller is the creator
  // (no SellerAgreed event is emitted in that case).
  escrow.sellerAgreed = event.params.creator.equals(event.params.seller)
  escrow.buyerFunded = false
  escrow.createdAt = event.block.timestamp
  escrow.createdBlock = event.block.number
  escrow.createdTx = event.transaction.hash
  escrow.updatedAt = event.block.timestamp
  escrow.save()

  let stats = getStats(event.block.timestamp)
  stats.created = stats.created.plus(BigInt.fromI32(1))
  stats.open = stats.open.plus(BigInt.fromI32(1))
  stats.save()

  recordEvent(event, id, "CREATED", event.params.creator, null, event.params.amount)
}

export function handleSellerAgreed(event: SellerAgreed): void {
  let id = event.params.id.toString()
  let escrow = Escrow.load(id)
  if (escrow == null) return
  escrow.sellerAgreed = true
  escrow.updatedAt = event.block.timestamp
  activateIfReady(escrow, event.block.timestamp)
  escrow.save()
  recordEvent(event, id, "SELLER_AGREED", event.params.seller, "SELLER", null)
}

export function handleEscrowFunded(event: EscrowFunded): void {
  let id = event.params.id.toString()
  let escrow = Escrow.load(id)
  if (escrow == null) return
  escrow.buyer = event.params.buyer
  escrow.buyerFunded = true
  escrow.deposit = event.params.deposit
  escrow.updatedAt = event.block.timestamp
  activateIfReady(escrow, event.block.timestamp)
  escrow.save()
  recordEvent(event, id, "FUNDED", event.params.buyer, "BUYER", event.params.deposit)
}

export function handleEscrowCancelled(event: EscrowCancelled): void {
  let id = event.params.id.toString()
  let escrow = Escrow.load(id)
  if (escrow == null) return
  escrow.updatedAt = event.block.timestamp
  close(escrow, "CANCELLED", false, event.block.timestamp)
  escrow.save()
  recordEvent(event, id, "CANCELLED", event.params.by, null, null)
}

export function handleReleased(event: Released): void {
  let id = event.params.id.toString()
  let escrow = Escrow.load(id)
  if (escrow == null) return
  escrow.sellerAmount = event.params.sellerAmount
  escrow.brokerAmount = event.params.brokerAmount
  escrow.feeAmount = event.params.feeAmount
  escrow.updatedAt = event.block.timestamp
  close(escrow, "RELEASED", true, event.block.timestamp)
  escrow.save()
  recordEvent(event, id, "RELEASED", null, null, event.params.sellerAmount)
}

export function handleRefunded(event: Refunded): void {
  let id = event.params.id.toString()
  let escrow = Escrow.load(id)
  if (escrow == null) return
  escrow.buyerRefundAmount = event.params.buyerAmount
  escrow.updatedAt = event.block.timestamp
  close(escrow, "REFUNDED", false, event.block.timestamp)
  escrow.save()
  recordEvent(event, id, "REFUNDED", null, null, event.params.buyerAmount)
}

export function handleDisputeRaised(event: DisputeRaised): void {
  let id = event.params.id.toString()
  let escrow = Escrow.load(id)
  if (escrow == null) return
  escrow.status = "CLAIMED"
  escrow.updatedAt = event.block.timestamp
  escrow.save()
  recordEvent(event, id, "DISPUTE_RAISED", null, partyFromUint(event.params.by), null)
}

export function handleDisputeEscalated(event: DisputeEscalated): void {
  let id = event.params.id.toString()
  let escrow = Escrow.load(id)
  if (escrow == null) return
  if (escrow.status != "DISPUTED") {
    let stats = getStats(event.block.timestamp)
    stats.disputed = stats.disputed.plus(BigInt.fromI32(1))
    stats.save()
  }
  escrow.status = "DISPUTED"
  escrow.updatedAt = event.block.timestamp
  escrow.save()
  recordEvent(event, id, "DISPUTE_ESCALATED", null, partyFromUint(event.params.by), null)
}

export function handleDisputeCancelled(event: DisputeCancelled): void {
  let id = event.params.id.toString()
  let escrow = Escrow.load(id)
  if (escrow == null) return
  escrow.status = "FUNDED"
  escrow.updatedAt = event.block.timestamp
  escrow.save()
  recordEvent(event, id, "DISPUTE_CANCELLED", null, partyFromUint(event.params.by), null)
}

export function handleDisputeResolved(event: DisputeResolved): void {
  let id = event.params.id.toString()
  let escrow = Escrow.load(id)
  if (escrow == null) return
  let sellerBps = event.params.sellerBps
  escrow.resolvedSellerBps = sellerBps
  escrow.sellerAmount = event.params.sellerAmount
  escrow.buyerRefundAmount = event.params.buyerAmount
  escrow.feeAmount = event.params.feeAmount
  escrow.updatedAt = event.block.timestamp
  // Contract sets State.Released only for a 100% seller split, else Refunded.
  if (sellerBps == FULL_BPS) {
    close(escrow, "RELEASED", true, event.block.timestamp)
  } else {
    close(escrow, "REFUNDED", false, event.block.timestamp)
  }
  escrow.save()
  recordEvent(event, id, "DISPUTE_RESOLVED", event.params.resolver, null, event.params.sellerAmount)
}
