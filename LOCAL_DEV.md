# Full local stack (chain → subgraph → API → frontend)

Requires Node ≥ 22 (Hardhat 3), pnpm and Docker. Nothing touches Sepolia or spends funds.

| Step | Repo | Command | Port |
|---|---|---|---|
| 1. Hardhat node (genesis 60 days ago) | evm_directory_chain | `pnpm node:local` | 8545 |
| 2. Deploy Escrow + mock Chainlink feed | evm_directory_chain | `pnpm deploy:local` | |
| 3. Seed ~3 weeks of offers (create/accept/complete/cancel/refund/expire) | evm_directory_chain | `pnpm seed:local` | |
| 4. RPC shim for graph-node ↔ Hardhat 3 | evm_directory_subgraph | `pnpm rpc-proxy:local` | 8546 |
| 5. Postgres + IPFS + graph-node | evm_directory_subgraph | `pnpm stack:local` (or `DOCKER="sudo docker" pnpm stack:local`) | 8000/8020/5001 |
| 6. Build + deploy the local subgraph | evm_directory_subgraph | `pnpm create:hardhat && pnpm deploy:hardhat` | |
| 7. API | evm_directory_api | `.env`: `SUBGRAPH_URL=http://localhost:8000/subgraphs/name/escrow-local`, then `pnpm start` | 4000 |
| 8. Frontend | evm_directory | `.env`: `VITE_API_URL=http://localhost:4000/`, then `pnpm dev` | 5173 |

Notes
- Run step 1 on a fresh node so the deterministic addresses match `subgraph.local.yaml`
  (feed `0x5FbDB2315678afecb367f032d93F642f64180aa3`, Escrow `0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512`).
  Delete `ignition/deployments/chain-31337` in the chain repo before redeploying.
- `subgraph.local.yaml` indexes only DirectoryEscrow on `hardhat`; the third-party Escrow and CCIP router
  live on Sepolia only, so the frontend Contracts screen is empty locally.
- Why the RPC shim: graph-node sends `eth_call` with both `input` and `data` and a 50M gas limit; Hardhat 3 (EDR)
  rejects both. The shim drops `data` and clamps gas to 16,777,216. Without it, indexing stalls at the first
  `OfferAccepted` (`settlementPeriod()` call).
- The `eth_getBlockReceipts is not supported` warning from graph-node is harmless.
