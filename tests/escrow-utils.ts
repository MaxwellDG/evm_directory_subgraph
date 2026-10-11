import { newMockEvent } from "matchstick-as"
import { ethereum, Address, BigInt, Bytes } from "@graphprotocol/graph-ts"
import {
  EscrowCreated,
  SellerAgreed,
  EscrowFunded,
  EscrowCancelled,
  Released,
  Refunded,
  DisputeEscalated,
  DisputeResolved
} from "../generated/Escrow/Escrow"

function addr(name: string, value: Address): ethereum.EventParam {
  return new ethereum.EventParam(name, ethereum.Value.fromAddress(value))
}
function uint(name: string, value: BigInt): ethereum.EventParam {
  return new ethereum.EventParam(name, ethereum.Value.fromUnsignedBigInt(value))
}
function u8(name: string, value: i32): ethereum.EventParam {
  return new ethereum.EventParam(name, ethereum.Value.fromUnsignedBigInt(BigInt.fromI32(value)))
}

export function createEscrowCreatedEvent(
  id: BigInt,
  creator: Address,
  seller: Address,
  buyer: Address,
  amount: BigInt
): EscrowCreated {
  let event = changetype<EscrowCreated>(newMockEvent())
  event.parameters = new Array()
  event.parameters.push(uint("id", id))
  event.parameters.push(addr("creator", creator))
  event.parameters.push(addr("seller", seller))
  event.parameters.push(addr("buyer", buyer))
  event.parameters.push(addr("broker", Address.zero()))
  event.parameters.push(addr("token", Address.zero()))
  event.parameters.push(uint("amount", amount))
  event.parameters.push(u8("feeBps", 100))
  event.parameters.push(u8("brokerBps", 0))
  event.parameters.push(u8("challengeWindow", 0))
  event.parameters.push(
    new ethereum.EventParam("detailsHash", ethereum.Value.fromFixedBytes(Bytes.fromHexString("0x" + "ab".repeat(32))))
  )
  return event
}

export function createSellerAgreedEvent(id: BigInt, seller: Address): SellerAgreed {
  let event = changetype<SellerAgreed>(newMockEvent())
  event.parameters = new Array()
  event.parameters.push(uint("id", id))
  event.parameters.push(addr("seller", seller))
  return event
}

export function createEscrowFundedEvent(id: BigInt, buyer: Address, deposit: BigInt): EscrowFunded {
  let event = changetype<EscrowFunded>(newMockEvent())
  event.parameters = new Array()
  event.parameters.push(uint("id", id))
  event.parameters.push(addr("buyer", buyer))
  event.parameters.push(uint("deposit", deposit))
  return event
}

export function createEscrowCancelledEvent(id: BigInt, by: Address): EscrowCancelled {
  let event = changetype<EscrowCancelled>(newMockEvent())
  event.parameters = new Array()
  event.parameters.push(uint("id", id))
  event.parameters.push(addr("by", by))
  return event
}

export function createReleasedEvent(id: BigInt, sellerAmount: BigInt, fee: BigInt): Released {
  let event = changetype<Released>(newMockEvent())
  event.parameters = new Array()
  event.parameters.push(uint("id", id))
  event.parameters.push(uint("sellerAmount", sellerAmount))
  event.parameters.push(uint("brokerAmount", BigInt.zero()))
  event.parameters.push(uint("feeAmount", fee))
  return event
}

export function createRefundedEvent(id: BigInt, buyerAmount: BigInt): Refunded {
  let event = changetype<Refunded>(newMockEvent())
  event.parameters = new Array()
  event.parameters.push(uint("id", id))
  event.parameters.push(uint("buyerAmount", buyerAmount))
  return event
}

export function createDisputeEscalatedEvent(id: BigInt, by: i32): DisputeEscalated {
  let event = changetype<DisputeEscalated>(newMockEvent())
  event.parameters = new Array()
  event.parameters.push(uint("id", id))
  event.parameters.push(u8("by", by))
  return event
}

export function createDisputeResolvedEvent(id: BigInt, resolver: Address, sellerBps: i32): DisputeResolved {
  let event = changetype<DisputeResolved>(newMockEvent())
  event.parameters = new Array()
  event.parameters.push(uint("id", id))
  event.parameters.push(addr("resolver", resolver))
  event.parameters.push(u8("sellerBps", sellerBps))
  event.parameters.push(uint("sellerAmount", BigInt.fromI32(sellerBps)))
  event.parameters.push(uint("buyerAmount", BigInt.fromI32(10000 - sellerBps)))
  event.parameters.push(uint("feeAmount", BigInt.zero()))
  return event
}
