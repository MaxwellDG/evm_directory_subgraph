import {
  assert,
  describe,
  test,
  clearStore,
  beforeAll,
  afterAll
} from "matchstick-as/assembly/index"
import { Bytes, BigInt, Address } from "@graphprotocol/graph-ts"
import { MessageExecuted } from "../generated/schema"
import { MessageExecuted as MessageExecutedEvent } from "../generated/CCIPRouter/CCIPRouter"
import { handleMessageExecuted } from "../src/ccip-router"
import { createMessageExecutedEvent } from "./ccip-router-utils"

// Tests structure (matchstick-as >=0.5.0)
// https://thegraph.com/docs/en/subgraphs/developing/creating/unit-testing-framework/#tests-structure

let ENTITY_ID = ""

describe("Describe entity assertions", () => {
  beforeAll(() => {
    let messageId = Bytes.fromI32(1234567890)
    let sourceChainSelector = BigInt.fromI32(234)
    let offRamp = Address.fromString(
      "0x0000000000000000000000000000000000000001"
    )
    let calldataHash = Bytes.fromI32(1234567890)
    let newMessageExecutedEvent = createMessageExecutedEvent(
      messageId,
      sourceChainSelector,
      offRamp,
      calldataHash
    )
    handleMessageExecuted(newMessageExecutedEvent)
    ENTITY_ID = newMessageExecutedEvent.transaction.hash
      .concatI32(newMessageExecutedEvent.logIndex.toI32())
      .toHexString()
  })

  afterAll(() => {
    clearStore()
  })

  // For more test scenarios, see:
  // https://thegraph.com/docs/en/subgraphs/developing/creating/unit-testing-framework/#write-a-unit-test

  test("MessageExecuted created and stored", () => {
    assert.entityCount("MessageExecuted", 1)

    // Entity ids are tx hash + log index (see src/ccip-router.ts).
    assert.fieldEquals(
      "MessageExecuted",
      ENTITY_ID,
      "messageId",
      Bytes.fromI32(1234567890).toHexString()
    )
    assert.fieldEquals(
      "MessageExecuted",
      ENTITY_ID,
      "sourceChainSelector",
      "234"
    )
    assert.fieldEquals(
      "MessageExecuted",
      ENTITY_ID,
      "offRamp",
      "0x0000000000000000000000000000000000000001"
    )
    assert.fieldEquals(
      "MessageExecuted",
      ENTITY_ID,
      "calldataHash",
      Bytes.fromI32(1234567890).toHexString()
    )

    // More assert options:
    // https://thegraph.com/docs/en/subgraphs/developing/creating/unit-testing-framework/#asserts
  })
})
