import { assert, describe, test, clearStore, afterEach } from "matchstick-as/assembly/index"
import { Address, BigInt } from "@graphprotocol/graph-ts"
import {
  handleEscrowCreated,
  handleSellerAgreed,
  handleEscrowFunded,
  handleEscrowCancelled,
  handleReleased,
  handleRefunded,
  handleDisputeEscalated,
  handleDisputeResolved
} from "../src/escrow"
import {
  createEscrowCreatedEvent,
  createSellerAgreedEvent,
  createEscrowFundedEvent,
  createEscrowCancelledEvent,
  createReleasedEvent,
  createRefundedEvent,
  createDisputeEscalatedEvent,
  createDisputeResolvedEvent
} from "./escrow-utils"

const SELLER = Address.fromString("0x0000000000000000000000000000000000000001")
const BUYER = Address.fromString("0x0000000000000000000000000000000000000002")
const OWNER = Address.fromString("0x0000000000000000000000000000000000000003")
const ONE = BigInt.fromI32(1)
const AMOUNT = BigInt.fromI32(1000)

function createBySeller(id: BigInt): void {
  handleEscrowCreated(createEscrowCreatedEvent(id, SELLER, SELLER, Address.zero(), AMOUNT))
}

describe("Escrow lifecycle", () => {
  afterEach(() => {
    clearStore()
  })

  test("seller-created escrow is pre-agreed and goes FUNDED -> RELEASED", () => {
    createBySeller(ONE)
    assert.fieldEquals("Escrow", "1", "status", "CREATED")
    assert.fieldEquals("Escrow", "1", "sellerAgreed", "true")
    assert.fieldEquals("EscrowStats", "global", "open", "1")

    // mock events share a tx hash, so give each its own log index
    let funded = createEscrowFundedEvent(ONE, BUYER, BigInt.fromI32(1010))
    funded.logIndex = BigInt.fromI32(2)
    handleEscrowFunded(funded)
    assert.fieldEquals("Escrow", "1", "status", "FUNDED")
    assert.fieldEquals("Escrow", "1", "buyer", BUYER.toHexString())
    assert.fieldEquals("Escrow", "1", "deposit", "1010")

    let released = createReleasedEvent(ONE, BigInt.fromI32(990), BigInt.fromI32(10))
    released.logIndex = BigInt.fromI32(3)
    handleReleased(released)
    assert.fieldEquals("Escrow", "1", "status", "RELEASED")
    assert.fieldEquals("Escrow", "1", "outcome", "SUCCEEDED")
    assert.fieldEquals("EscrowStats", "global", "succeeded", "1")
    assert.fieldEquals("EscrowStats", "global", "open", "0")
    assert.entityCount("EscrowEvent", 3)
  })

  test("buyer-created escrow needs SellerAgreed to become FUNDED", () => {
    handleEscrowCreated(createEscrowCreatedEvent(ONE, BUYER, SELLER, BUYER, AMOUNT))
    assert.fieldEquals("Escrow", "1", "sellerAgreed", "false")
    handleEscrowFunded(createEscrowFundedEvent(ONE, BUYER, AMOUNT))
    assert.fieldEquals("Escrow", "1", "status", "CREATED")
    handleSellerAgreed(createSellerAgreedEvent(ONE, SELLER))
    assert.fieldEquals("Escrow", "1", "status", "FUNDED")
    assert.fieldEquals("EscrowStats", "global", "funded", "1")
  })

  test("cancelled and refunded deals count as failed", () => {
    createBySeller(ONE)
    handleEscrowCancelled(createEscrowCancelledEvent(ONE, SELLER))
    assert.fieldEquals("Escrow", "1", "status", "CANCELLED")
    assert.fieldEquals("Escrow", "1", "outcome", "FAILED")

    let two = BigInt.fromI32(2)
    createBySeller(two)
    handleEscrowFunded(createEscrowFundedEvent(two, BUYER, AMOUNT))
    handleRefunded(createRefundedEvent(two, AMOUNT))
    assert.fieldEquals("Escrow", "2", "status", "REFUNDED")

    assert.fieldEquals("EscrowStats", "global", "failed", "2")
    assert.fieldEquals("EscrowStats", "global", "cancelled", "1")
    assert.fieldEquals("EscrowStats", "global", "refunded", "1")
  })

  test("dispute resolved at 100% seller is a success, partial is a failure", () => {
    createBySeller(ONE)
    handleEscrowFunded(createEscrowFundedEvent(ONE, BUYER, AMOUNT))
    handleDisputeEscalated(createDisputeEscalatedEvent(ONE, 1))
    assert.fieldEquals("Escrow", "1", "status", "DISPUTED")
    handleDisputeResolved(createDisputeResolvedEvent(ONE, OWNER, 10000))
    assert.fieldEquals("Escrow", "1", "status", "RELEASED")
    assert.fieldEquals("Escrow", "1", "outcome", "SUCCEEDED")

    let two = BigInt.fromI32(2)
    createBySeller(two)
    handleEscrowFunded(createEscrowFundedEvent(two, BUYER, AMOUNT))
    handleDisputeEscalated(createDisputeEscalatedEvent(two, 2))
    handleDisputeResolved(createDisputeResolvedEvent(two, OWNER, 4000))
    assert.fieldEquals("Escrow", "2", "status", "REFUNDED")
    assert.fieldEquals("Escrow", "2", "resolvedSellerBps", "4000")
    assert.fieldEquals("EscrowStats", "global", "disputed", "2")
    assert.fieldEquals("EscrowStats", "global", "succeeded", "1")
    assert.fieldEquals("EscrowStats", "global", "failed", "1")
  })
})
