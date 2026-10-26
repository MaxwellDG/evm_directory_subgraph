import { assert, describe, test, clearStore, afterEach, beforeEach, createMockedFunction } from "matchstick-as/assembly/index"
import { Address, BigInt, ethereum } from "@graphprotocol/graph-ts"
import { EscrowOffer } from "../generated/schema"
import {
  handleOfferCreated,
  handleOfferAccepted,
  handleOfferCancelled,
  handleSaleExecuted,
  handleOfferRefunded,
  handleOfferExpired
} from "../src/directory-escrow"
import {
  ESCROW,
  createOfferCreatedEvent,
  createOfferAcceptedEvent,
  createOfferCancelledEvent,
  createSaleExecutedEvent,
  createRefundedEvent,
  createOfferExpiredEvent
} from "./directory-escrow-utils"

const SELLER = Address.fromString("0x0000000000000000000000000000000000000001")
const BUYER = Address.fromString("0x0000000000000000000000000000000000000002")
const KEEPER = Address.fromString("0x0000000000000000000000000000000000000003")
const AMOUNT = BigInt.fromI32(1000)
const USD = BigInt.fromI32(2000000)

function key(id: i32): string {
  return ESCROW.toHexString() + "-" + id.toString()
}

/** Sell listing `id` created at t=100 and accepted by BUYER at t=200. */
function listAndAccept(id: i32): void {
  let offerId = BigInt.fromI32(id)
  handleOfferCreated(createOfferCreatedEvent(offerId, SELLER, Address.zero(), SELLER, 0, AMOUNT, USD, 100))
  handleOfferAccepted(createOfferAcceptedEvent(offerId, SELLER, BUYER, AMOUNT, 200))
}

const SETTLEMENT_PERIOD = BigInt.fromI32(604800)

describe("DirectoryEscrow", () => {
  beforeEach(() => {
    createMockedFunction(ESCROW, "settlementPeriod", "settlementPeriod():(uint256)").returns([
      ethereum.Value.fromUnsignedBigInt(SETTLEMENT_PERIOD)
    ])
  })

  afterEach(() => {
    clearStore()
  })

  test("sell listing: OPEN -> ACCEPTED -> COMPLETED counts as a success", () => {
    let offerId = BigInt.fromI32(1)
    handleOfferCreated(createOfferCreatedEvent(offerId, SELLER, Address.zero(), SELLER, 0, AMOUNT, USD, 100))
    assert.fieldEquals("EscrowOffer", key(1), "status", "OPEN")
    assert.fieldEquals("EscrowOffer", key(1), "side", "SELL")
    assert.fieldEquals("EscrowOffer", key(1), "usdValue", USD.toString())
    assert.fieldEquals("EscrowOfferStats", "global", "open", "1")

    handleOfferAccepted(createOfferAcceptedEvent(offerId, SELLER, BUYER, AMOUNT, 200))
    assert.fieldEquals("EscrowOffer", key(1), "status", "ACCEPTED")
    assert.fieldEquals("EscrowOffer", key(1), "buyer", BUYER.toHexString())
    assert.fieldEquals("EscrowOffer", key(1), "acceptedAt", "200")
    assert.fieldEquals("EscrowOffer", key(1), "expiresAt", SETTLEMENT_PERIOD.plus(BigInt.fromI32(200)).toString())

    handleSaleExecuted(createSaleExecutedEvent(offerId, SELLER, BUYER, AMOUNT, USD, 300))
    assert.fieldEquals("EscrowOffer", key(1), "status", "COMPLETED")
    assert.fieldEquals("EscrowOffer", key(1), "outcome", "SUCCEEDED")
    assert.fieldEquals("EscrowOffer", key(1), "closedAt", "300")
    assert.fieldEquals("EscrowOfferStats", "global", "succeeded", "1")
    assert.fieldEquals("EscrowOfferStats", "global", "volume", AMOUNT.toString())
    assert.fieldEquals("EscrowOfferStats", "global", "volumeUsd", USD.toString())
    assert.fieldEquals("EscrowOfferStats", "global", "open", "0")
    assert.entityCount("EscrowOfferEvent", 3)
  })

  test("buy offer records side and the accepting seller", () => {
    let offerId = BigInt.fromI32(1)
    handleOfferCreated(createOfferCreatedEvent(offerId, Address.zero(), BUYER, BUYER, 1, AMOUNT, USD, 100))
    assert.fieldEquals("EscrowOffer", key(1), "side", "BUY")
    handleOfferAccepted(createOfferAcceptedEvent(offerId, SELLER, BUYER, AMOUNT, 200))
    assert.fieldEquals("EscrowOffer", key(1), "seller", SELLER.toHexString())
  })

  test("expired offer is FAILED and counted under expired", () => {
    listAndAccept(1)
    handleOfferExpired(createOfferExpiredEvent(BigInt.fromI32(1), BUYER, KEEPER, AMOUNT, 900))
    assert.fieldEquals("EscrowOffer", key(1), "status", "EXPIRED")
    assert.fieldEquals("EscrowOffer", key(1), "outcome", "FAILED")
    assert.fieldEquals("EscrowOffer", key(1), "closedBy", KEEPER.toHexString())
    assert.fieldEquals("EscrowOfferStats", "global", "expired", "1")
    assert.fieldEquals("EscrowOfferStats", "global", "failed", "1")
    assert.fieldEquals("EscrowOfferStats", "global", "succeeded", "0")
    assert.fieldEquals("EscrowOfferStats", "global", "open", "0")
  })

  test("cancelled, refunded and expired all count as failed", () => {
    handleOfferCreated(
      createOfferCreatedEvent(BigInt.fromI32(1), SELLER, Address.zero(), SELLER, 0, AMOUNT, USD, 100)
    )
    handleOfferCancelled(createOfferCancelledEvent(BigInt.fromI32(1), SELLER, 150))
    listAndAccept(2)
    handleOfferRefunded(createRefundedEvent(BigInt.fromI32(2), BUYER, SELLER, AMOUNT, 300))
    listAndAccept(3)
    handleOfferExpired(createOfferExpiredEvent(BigInt.fromI32(3), BUYER, KEEPER, AMOUNT, 900))

    assert.fieldEquals("EscrowOffer", key(1), "status", "CANCELLED")
    assert.fieldEquals("EscrowOffer", key(2), "status", "REFUNDED")
    assert.fieldEquals("EscrowOfferStats", "global", "created", "3")
    assert.fieldEquals("EscrowOfferStats", "global", "accepted", "2")
    assert.fieldEquals("EscrowOfferStats", "global", "cancelled", "1")
    assert.fieldEquals("EscrowOfferStats", "global", "refunded", "1")
    assert.fieldEquals("EscrowOfferStats", "global", "expired", "1")
    assert.fieldEquals("EscrowOfferStats", "global", "failed", "3")
    assert.fieldEquals("EscrowOfferStats", "global", "open", "0")
  })

  test("expiresAt stays null when settlementPeriod() reverts", () => {
    createMockedFunction(ESCROW, "settlementPeriod", "settlementPeriod():(uint256)").reverts()
    listAndAccept(1)
    assert.fieldEquals("EscrowOffer", key(1), "acceptedAt", "200")
    let offer = EscrowOffer.load(key(1))!
    assert.assertTrue(offer.expiresAt === null)
  })

  test("events for unknown offers are ignored", () => {
    handleOfferExpired(createOfferExpiredEvent(BigInt.fromI32(42), BUYER, KEEPER, AMOUNT, 900))
    assert.entityCount("EscrowOffer", 0)
    assert.entityCount("EscrowOfferEvent", 0)
  })
})
