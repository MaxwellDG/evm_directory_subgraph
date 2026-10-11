// Event handlers for the Sepolia Escrow data source.
// Handlers are wired up in subgraph.yaml; entity logic is added in the
// following commit together with the schema.
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

export function handleEscrowCreated(event: EscrowCreated): void {}
export function handleSellerAgreed(event: SellerAgreed): void {}
export function handleEscrowFunded(event: EscrowFunded): void {}
export function handleEscrowCancelled(event: EscrowCancelled): void {}
export function handleReleased(event: Released): void {}
export function handleRefunded(event: Refunded): void {}
export function handleDisputeRaised(event: DisputeRaised): void {}
export function handleDisputeEscalated(event: DisputeEscalated): void {}
export function handleDisputeCancelled(event: DisputeCancelled): void {}
export function handleDisputeResolved(event: DisputeResolved): void {}
