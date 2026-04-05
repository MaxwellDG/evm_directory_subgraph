import {
  MessageExecuted as MessageExecutedEvent,
  OffRampAdded as OffRampAddedEvent,
  OffRampRemoved as OffRampRemovedEvent,
  OnRampSet as OnRampSetEvent,
  OwnershipTransferRequested as OwnershipTransferRequestedEvent,
  OwnershipTransferred as OwnershipTransferredEvent
} from "../generated/CCIPRouter/CCIPRouter"
import {
  MessageExecuted,
  OffRampAdded,
  OffRampRemoved,
  OnRampSet,
  OwnershipTransferRequested,
  OwnershipTransferred
} from "../generated/schema"

export function handleMessageExecuted(event: MessageExecutedEvent): void {
  let entity = new MessageExecuted(
    event.transaction.hash.concatI32(event.logIndex.toI32())
  )
  entity.messageId = event.params.messageId
  entity.sourceChainSelector = event.params.sourceChainSelector
  entity.offRamp = event.params.offRamp
  entity.calldataHash = event.params.calldataHash

  entity.blockNumber = event.block.number
  entity.blockTimestamp = event.block.timestamp
  entity.transactionHash = event.transaction.hash

  entity.save()
}

export function handleOffRampAdded(event: OffRampAddedEvent): void {
  let entity = new OffRampAdded(
    event.transaction.hash.concatI32(event.logIndex.toI32())
  )
  entity.sourceChainSelector = event.params.sourceChainSelector
  entity.offRamp = event.params.offRamp

  entity.blockNumber = event.block.number
  entity.blockTimestamp = event.block.timestamp
  entity.transactionHash = event.transaction.hash

  entity.save()
}

export function handleOffRampRemoved(event: OffRampRemovedEvent): void {
  let entity = new OffRampRemoved(
    event.transaction.hash.concatI32(event.logIndex.toI32())
  )
  entity.sourceChainSelector = event.params.sourceChainSelector
  entity.offRamp = event.params.offRamp

  entity.blockNumber = event.block.number
  entity.blockTimestamp = event.block.timestamp
  entity.transactionHash = event.transaction.hash

  entity.save()
}

export function handleOnRampSet(event: OnRampSetEvent): void {
  let entity = new OnRampSet(
    event.transaction.hash.concatI32(event.logIndex.toI32())
  )
  entity.destChainSelector = event.params.destChainSelector
  entity.onRamp = event.params.onRamp

  entity.blockNumber = event.block.number
  entity.blockTimestamp = event.block.timestamp
  entity.transactionHash = event.transaction.hash

  entity.save()
}

export function handleOwnershipTransferRequested(
  event: OwnershipTransferRequestedEvent
): void {
  let entity = new OwnershipTransferRequested(
    event.transaction.hash.concatI32(event.logIndex.toI32())
  )
  entity.from = event.params.from
  entity.to = event.params.to

  entity.blockNumber = event.block.number
  entity.blockTimestamp = event.block.timestamp
  entity.transactionHash = event.transaction.hash

  entity.save()
}

export function handleOwnershipTransferred(
  event: OwnershipTransferredEvent
): void {
  let entity = new OwnershipTransferred(
    event.transaction.hash.concatI32(event.logIndex.toI32())
  )
  entity.from = event.params.from
  entity.to = event.params.to

  entity.blockNumber = event.block.number
  entity.blockTimestamp = event.block.timestamp
  entity.transactionHash = event.transaction.hash

  entity.save()
}
