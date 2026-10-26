import { newMockEvent } from "matchstick-as"
import { ethereum, Address, BigInt } from "@graphprotocol/graph-ts"
import {
  OfferCreated,
  OfferAccepted,
  OfferCancelled,
  SaleExecuted,
  Refunded,
  OfferExpired
} from "../generated/DirectoryEscrow/DirectoryEscrow"

export const ESCROW = Address.fromString("0x00000000000000000000000000000000000000e5")

function addr(name: string, value: Address): ethereum.EventParam {
  return new ethereum.EventParam(name, ethereum.Value.fromAddress(value))
}
function uint(name: string, value: BigInt): ethereum.EventParam {
  return new ethereum.EventParam(name, ethereum.Value.fromUnsignedBigInt(value))
}

// Mock events share one tx hash; give each a unique log index so EscrowOfferEvent ids differ.
let logIndex = 0

function base(at: i32): ethereum.Event {
  let e = newMockEvent()
  e.logIndex = BigInt.fromI32(logIndex++)
  e.address = ESCROW
  e.block.timestamp = BigInt.fromI32(at)
  e.parameters = new Array()
  return e
}

export function createOfferCreatedEvent(
  offerId: BigInt,
  seller: Address,
  buyer: Address,
  creator: Address,
  side: i32,
  amount: BigInt,
  usdValue: BigInt,
  at: i32
): OfferCreated {
  let e = changetype<OfferCreated>(base(at))
  e.parameters.push(uint("offerId", offerId))
  e.parameters.push(addr("seller", seller))
  e.parameters.push(addr("buyer", buyer))
  e.parameters.push(addr("creator", creator))
  e.parameters.push(uint("side", BigInt.fromI32(side)))
  e.parameters.push(uint("amount", amount))
  e.parameters.push(uint("usdValue", usdValue))
  return e
}

export function createOfferAcceptedEvent(
  offerId: BigInt,
  seller: Address,
  buyer: Address,
  amount: BigInt,
  at: i32
): OfferAccepted {
  let e = changetype<OfferAccepted>(base(at))
  e.parameters.push(uint("offerId", offerId))
  e.parameters.push(addr("seller", seller))
  e.parameters.push(addr("buyer", buyer))
  e.parameters.push(uint("amount", amount))
  return e
}

export function createOfferCancelledEvent(offerId: BigInt, by: Address, at: i32): OfferCancelled {
  let e = changetype<OfferCancelled>(base(at))
  e.parameters.push(uint("offerId", offerId))
  e.parameters.push(addr("cancelledBy", by))
  return e
}

export function createSaleExecutedEvent(
  offerId: BigInt,
  seller: Address,
  buyer: Address,
  amount: BigInt,
  usdValue: BigInt,
  at: i32
): SaleExecuted {
  let e = changetype<SaleExecuted>(base(at))
  e.parameters.push(uint("offerId", offerId))
  e.parameters.push(addr("seller", seller))
  e.parameters.push(addr("buyer", buyer))
  e.parameters.push(uint("amount", amount))
  e.parameters.push(uint("usdValue", usdValue))
  return e
}

export function createRefundedEvent(
  offerId: BigInt,
  buyer: Address,
  by: Address,
  amount: BigInt,
  at: i32
): Refunded {
  let e = changetype<Refunded>(base(at))
  e.parameters.push(uint("offerId", offerId))
  e.parameters.push(addr("buyer", buyer))
  e.parameters.push(addr("refundedBy", by))
  e.parameters.push(uint("amount", amount))
  return e
}

export function createOfferExpiredEvent(
  offerId: BigInt,
  buyer: Address,
  by: Address,
  amount: BigInt,
  at: i32
): OfferExpired {
  let e = changetype<OfferExpired>(base(at))
  e.parameters.push(uint("offerId", offerId))
  e.parameters.push(addr("buyer", buyer))
  e.parameters.push(addr("expiredBy", by))
  e.parameters.push(uint("amount", amount))
  return e
}
