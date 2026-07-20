// Invoice Approval — Accumulate anchor service (interim reference implementation)
//
// LANGUAGE/SCOPE NOTE: this is a small JavaScript (accumulate.js) HTTP sidecar, deliberately NOT
// the proposed in-engine C#/Acme.Net.Sdk node from 002.Requirements. Its purpose is to prove the
// DA01/DA02 data-anchor pattern (see 001.BusinessIdeas §2.1) working end-to-end on mainnet today,
// and to give the eventual C# node a reference behaviour + test vectors to validate against.
// It signs with a Key Page (KM/SS side); credentials never leave the host running it.
//
// Endpoints:
//   GET  /health                 -> { ok, adi, dataAccount, endpoint }
//   POST /anchor   (Bearer auth) -> canonicalize+sha256(payload) -> WriteData -> { receipt_hash, txid, explorer }
//   POST /verify                 -> recompute the hash from a payload (no key, no chain write)
//
// Env: ANCHOR_TOKEN (required) · ACC_ALLOW_MAINNET=true (spend guard) · PORT (8787) · HOST (127.0.0.1)
//      ACC_KEYFILE · ACC_STATE · ACC_ENDPOINT · MEMO_PREFIX
import { createServer } from 'http';
import { readFileSync, existsSync } from 'fs';
import { createHash } from 'crypto';
import { homedir } from 'os';
import { api_v3, core, Signer, ED25519Key } from 'accumulate.js';

const ENDPOINT    = process.env.ACC_ENDPOINT || 'https://mainnet.accumulatenetwork.io/v3';
const KEYFILE     = process.env.ACC_KEYFILE  || `${homedir()}/.secrets/bearing_acc_mainnet.json`;
const STATEFILE   = process.env.ACC_STATE    || `${homedir()}/.secrets/bearing_acc_mainnet_state.json`;
const PORT        = parseInt(process.env.PORT || '8787', 10);
const HOST        = process.env.HOST || '127.0.0.1';
const TOKEN       = process.env.ANCHOR_TOKEN || '';
const MEMO_PREFIX = process.env.MEMO_PREFIX || 'bfa-approval';

const client = new api_v3.JsonRpcClient(ENDPOINT);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

function loadKey() {
  const k = JSON.parse(readFileSync(KEYFILE, 'utf8'));
  if (!k.seed) throw new Error('Key file has no "seed" field');
  return k;
}
function loadState() {
  if (!existsSync(STATEFILE)) return {};
  return JSON.parse(readFileSync(STATEFILE, 'utf8'));
}

// Deterministic canonical JSON: object keys sorted recursively at every level; arrays keep order.
// This is the reproducibility contract — any implementation (incl. the future C# node) must
// produce byte-identical output to arrive at the same SHA-256. See test-vectors/ for fixtures.
function canonicalize(v) {
  if (Array.isArray(v)) return '[' + v.map(canonicalize).join(',') + ']';
  if (v && typeof v === 'object') {
    return '{' + Object.keys(v).sort().map((k) => JSON.stringify(k) + ':' + canonicalize(v[k])).join(',') + '}';
  }
  return JSON.stringify(v); // strings, numbers, booleans, null via standard JSON encoding
}
function sha256hex(str) { return createHash('sha256').update(str).digest('hex'); }

async function submitAndWait(txn, sig, label) {
  const subs = await client.submit({ transaction: [txn], signatures: [sig] });
  for (const sub of subs) {
    if (!sub.success) throw new Error(`${label}: submit failed: ${JSON.stringify(sub.asObject?.() ?? sub)}`);
  }
  const txid = Buffer.from(txn.hash()).toString('hex');
  for (let i = 0; i < 15; i++) {
    await sleep(2000);
    try {
      const r = await client.call('query', { scope: `acc://${txid}@unknown` });
      if (r?.status === 'delivered') return { txid, delivered: true };
      if (r?.status === 'failed' || r?.error) throw new Error(`${label}: FAILED ${JSON.stringify(r?.error ?? r?.status)}`);
    } catch (e) { /* keep polling until timeout */ }
  }
  return { txid, delivered: false };
}

const k = loadKey();
const key = ED25519Key.from(Buffer.from(k.seed, 'hex'));

async function anchor(payload) {
  if (process.env.ACC_ALLOW_MAINNET !== 'true') throw new Error('SPENDING BLOCKED: set ACC_ALLOW_MAINNET=true');
  const s = loadState();
  if (!s.adi || !s.dataAccount) throw new Error('State missing adi/dataAccount');
  const canon = canonicalize(payload);
  const receiptHashHex = sha256hex(canon);
  const receiptHash = Buffer.from(receiptHashHex, 'hex');
  const pageSigner = Signer.forPage(`${s.adi}/book/1`, key).withVersion(1);
  const memoId = payload.invoice_id ?? payload.solution_id ?? payload.id ?? '';
  const txn = new core.Transaction({
    header: { principal: s.dataAccount, memo: `${MEMO_PREFIX}:${memoId}` },
    body: new core.WriteData({ entry: new core.DoubleHashDataEntry({ data: [receiptHash] }) }),
  });
  const sig = await pageSigner.sign(txn, { timestamp: Date.now() });
  const { txid, delivered } = await submitAndWait(txn, sig, 'writeData');
  return {
    ok: true, delivered, receipt_hash: receiptHashHex, canonical_payload: canon, txid,
    data_account: s.dataAccount, memo: `${MEMO_PREFIX}:${memoId}`,
    explorer: `https://explorer.accumulatenetwork.io/acc/${s.dataAccount.replace('acc://', '')}`,
  };
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    let data = '';
    req.on('data', (c) => { data += c; if (data.length > 1e6) req.destroy(); });
    req.on('end', () => resolve(data));
    req.on('error', reject);
  });
}
function send(res, code, obj) {
  res.writeHead(code, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify(obj, null, 2));
}
function authorized(req) {
  if (!TOKEN) return false;
  return (req.headers['authorization'] || '') === `Bearer ${TOKEN}`;
}

const server = createServer(async (req, res) => {
  try {
    if (req.method === 'GET' && req.url === '/health') {
      const s = loadState();
      return send(res, 200, { ok: true, endpoint: ENDPOINT, adi: s.adi ?? null, dataAccount: s.dataAccount ?? null });
    }
    if (req.method === 'POST' && req.url === '/verify') {
      const payload = JSON.parse(await readBody(req) || '{}');
      const canon = canonicalize(payload);
      return send(res, 200, { ok: true, receipt_hash: sha256hex(canon), canonical_payload: canon });
    }
    if (req.method === 'POST' && req.url === '/anchor') {
      if (!authorized(req)) return send(res, 401, { ok: false, error: 'unauthorized' });
      const payload = JSON.parse(await readBody(req) || '{}');
      if (!payload || typeof payload !== 'object' || Array.isArray(payload)) {
        return send(res, 400, { ok: false, error: 'body must be a JSON object' });
      }
      return send(res, 200, await anchor(payload));
    }
    return send(res, 404, { ok: false, error: 'not found' });
  } catch (e) {
    return send(res, 500, { ok: false, error: e && e.message ? e.message : String(e) });
  }
});

server.listen(PORT, HOST, () => {
  console.log(`invoice-approval anchor service on http://${HOST}:${PORT} · ADI ${k.lid}`);
  if (!TOKEN) console.log('WARNING: ANCHOR_TOKEN not set — /anchor rejects all requests.');
});
