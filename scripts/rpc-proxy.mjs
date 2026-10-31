// Local-dev JSON-RPC shim: graph-node sends eth_call params with both `input` and `data`,
// which Hardhat 3 (EDR) rejects ("duplicate field `data`"), and a 50M gas limit above
// EDR's 16,777,216 per-tx cap. Strip `data` when `input` exists and clamp `gas`.
import http from "node:http";
const UP = process.env.UPSTREAM_RPC ?? "http://127.0.0.1:8545";
const PORT = Number(process.env.PROXY_PORT ?? 8546);
const fix = (m) => {
  if (m && Array.isArray(m.params)) for (const p of m.params)
    if (p && typeof p === "object" && "input" in p && "data" in p) delete p.data;
  if (m && m.method === "eth_call" && Array.isArray(m.params) && m.params[0]?.gas && BigInt(m.params[0].gas) > 0xffffffn) m.params[0].gas = "0xffffff";
  return m;
};
http.createServer(async (req, res) => {
  let body = ""; for await (const c of req) body += c;
  try { const j = JSON.parse(body); body = JSON.stringify(Array.isArray(j) ? j.map(fix) : fix(j)); } catch {}
  try {
    const r = await fetch(UP, { method: "POST", headers: { "content-type": "application/json" }, body });
    res.writeHead(r.status, { "content-type": "application/json" }); res.end(await r.text());
  } catch (e) { res.writeHead(502); res.end(String(e)); }
}).listen(PORT, () => console.log(`rpc-proxy :${PORT} -> ${UP}`));
