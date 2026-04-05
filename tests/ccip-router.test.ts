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
  })

  afterAll(() => {
    clearStore()
  })

  // For more test scenarios, see:
  // https://thegraph.com/docs/en/subgraphs/developing/creating/unit-testing-framework/#write-a-unit-test

  test("MessageExecuted created and stored", () => {
    assert.entityCount("MessageExecuted", 1)

    // 0xa16081f360e3847006db660bae1c6d1b2e17ec2a is the default address used in newMockEvent() function
    assert.fieldEquals(
      "MessageExecuted",
      "0xa16081f360e3847006db660bae1c6d1b2e17ec2a-1",
      "messageId",
      "1234567890"
    )
    assert.fieldEquals(
      "MessageExecuted",
      "0xa16081f360e3847006db660bae1c6d1b2e17ec2a-1",
      "sourceChainSelector",
      "234"
    )
    assert.fieldEquals(
      "MessageExecuted",
      "0xa16081f360e3847006db660bae1c6d1b2e17ec2a-1",
      "offRamp",
      "0x0000000000000000000000000000000000000001"
    )
    assert.fieldEquals(
      "MessageExecuted",
      "0xa16081f360e3847006db660bae1c6d1b2e17ec2a-1",
      "calldataHash",
      "1234567890"
    )

    // More assert options:
    // https://thegraph.com/docs/en/subgraphs/developing/creating/unit-testing-framework/#asserts
  })
})
