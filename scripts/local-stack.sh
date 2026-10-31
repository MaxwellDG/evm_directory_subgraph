#!/usr/bin/env bash
# Starts Postgres, IPFS and graph-node on the host network for local dev.
# graph-node talks to the Hardhat node through scripts/rpc-proxy.mjs on :8546.
# (docker-compose.yml uses host.docker.internal / bridge networking; use this where that isn't available.)
set -euo pipefail
D=${DOCKER:-docker}
$D rm -f gn-node gn-pg gn-ipfs >/dev/null 2>&1 || true
$D run -d --name gn-ipfs --network host ipfs/kubo:v0.17.0
$D run -d --name gn-pg --network host -e POSTGRES_USER=graph-node -e POSTGRES_PASSWORD=let-me-in \
  -e POSTGRES_DB=graph-node -e POSTGRES_INITDB_ARGS="-E UTF8 --locale=C" postgres:14 \
  postgres -cshared_preload_libraries=pg_stat_statements -cmax_connections=200
sleep 8
$D run -d --name gn-node --network host -e postgres_host=localhost -e postgres_user=graph-node \
  -e postgres_pass=let-me-in -e postgres_db=graph-node -e ipfs=localhost:5001 \
  -e ethereum=hardhat:http://localhost:8546 -e GRAPH_LOG=info graphprotocol/graph-node
