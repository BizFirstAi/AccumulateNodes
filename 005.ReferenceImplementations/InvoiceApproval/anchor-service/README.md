# Anchor service (interim reference)

A ~140-line JavaScript HTTP sidecar that writes an approval decision to an Accumulate Data Account
and lets anyone verify it. **Interim by design** — it exists so the `DA01`/`DA02` pattern is
provable today; the target is the in-engine C#/`Acme.Net.Sdk` node from `002.Requirements`, at which
point the workflow's HTTP call is replaced by that node.

## Endpoints
| Method | Path | Auth | Does |
|--------|------|------|------|
| GET | `/health` | — | reports the ADI, data account, endpoint |
| POST | `/verify` | — | recompute `sha256(canonical(payload))` — no key, no chain write |
| POST | `/anchor` | Bearer | canonicalize → hash → `WriteData` (DoubleHash) → `{ receipt_hash, txid, explorer }` |

## Run (Node 18+)
```
npm install accumulate.js tweetnacl @scure/bip32 bip39 ed25519-hd-key
npm install --save-dev esbuild
npx esbuild anchor_service.mjs --bundle --platform=node --format=cjs --outfile=anchor.cjs \
  '--external:@ledgerhq/*' '--external:rxjs'
ANCHOR_TOKEN='<your-secret>' ACC_ALLOW_MAINNET=true node anchor.cjs
```
> `accumulate.js` uses directory imports that Node's strict ESM resolver rejects on newer versions,
> so the entry is bundled with esbuild first. The four peer deps above are required by the SDK.

## Configuration (env)
| Var | Default | Purpose |
|-----|---------|---------|
| `ANCHOR_TOKEN` | — (required) | shared secret for the `Authorization: Bearer` header |
| `ACC_ALLOW_MAINNET` | — | must be `true` to permit any on-chain write (spend guard) |
| `ACC_ENDPOINT` | `https://mainnet.accumulatenetwork.io/v3` | Accumulate v3 JSON-RPC |
| `ACC_KEYFILE` | `~/.secrets/bearing_acc_mainnet.json` | signing key (seed) — stays on the host |
| `ACC_STATE` | `~/.secrets/bearing_acc_mainnet_state.json` | holds the `adi` + `dataAccount` |
| `PORT` / `HOST` | `8787` / `127.0.0.1` | bind address |
| `MEMO_PREFIX` | `bfa-approval` | transaction memo prefix |

## Standing up the identity
`acc_mainnet.mjs` is the CLI used once to create the identity and data account and fund credits:
```
node acc.cjs info | balance | oracle
ACC_ALLOW_MAINNET=true node acc.cjs credits-lite <acme>
ACC_ALLOW_MAINNET=true node acc.cjs create-adi
ACC_ALLOW_MAINNET=true node acc.cjs credits-page <acme>
ACC_ALLOW_MAINNET=true node acc.cjs create-data-account
```
Bundle it the same way (`--outfile=acc.cjs`). Costs are small and fixed (create-ADI 500 credits =
$5 for an 8+ char name; a data write is 0.10 credits).

## Security notes
- The signing key never leaves the host; only a bearer token is shared with the workflow.
- Run it inside the container it serves and reach it over a private tunnel; do not expose `/anchor`
  publicly without the token (and ideally network isolation).
- `ACC_ALLOW_MAINNET` is a deliberate second guard so the service can't spend by accident.
