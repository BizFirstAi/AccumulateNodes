# Reference Implementation — Invoice Approval (Data-Account audit trail)

A working, end-to-end reference for the use cases already described in
`001.BusinessIdeas/` — specifically **§2.1 (tamper-evident approval trails)** applied to
high-dollar invoice approval, the same "governance + verifiable trail" shape the Chairman's
use-case list centers on. It exists to make one of those ideas *runnable and verifiable today*,
ahead of the C# node.

## What this is — and what it is not

**It is:**
- A concrete worked example: three demo invoices, an approval matrix, and a BizFirst workflow
  blueprint (Form → AI classify → Switch → **ApprovalNode (NofM)** → anchor → notify).
- A small **interim** anchor implementation in JavaScript (`accumulate.js`) that writes the
  approval decision to an Accumulate **Data Account** (`DA01`/`DA02`) and is independently
  verifiable — **live on mainnet**.
- A reproducibility contract (canonicalization spec + `test-vectors/`) so any other
  implementation can produce byte-identical hashes.

**It is not:**
- The proposed in-engine node from `002.Requirements/00_NodeDesignProposal.md`. That node is
  C#/.NET wrapping `Acme.Net.Sdk`; this sidecar is JavaScript and talks to the workflow over HTTP.
  It is a **proof of the pattern and a reference to validate the C# node against**, not a competing
  design. When the C# node ships, the workflow's single HTTP call is swapped for it and everything
  else stays the same.
- A demonstration of **§2.2** (per-approver cryptographic signatures via Key Pages / `SS04`). This
  reference proves the **audit-trail half (§2.1)** live; the multi-signature half is exactly what
  the C# node (`KM01`–`KM04`, `SS04`) is designed to add. The approval *orchestration* here uses
  the platform's existing **ApprovalNode**; the on-chain artifact is the anchored decision record.
- Using a project-owned identity. It anchors under `acc://marcdebary.acme` (a personal mainnet ADI)
  purely as a demonstrator.

## Mapping to the design proposal

| This reference does | Operation codes | From |
|---|---|---|
| Create a data account for the trail (one-time) | `DA01` | 001.BusinessIdeas §2.1 |
| Write the approval decision as an immutable entry | `DA02` | 001.BusinessIdeas §2.1 |
| Anyone reconstructs/verifies the entry | `DA04` / `DA06` | 001.BusinessIdeas §2.1 |
| Fund writes with credits (supporting) | `CR01` / `CR02` | 001.BusinessIdeas §2.7 |
| *(next, via the C# node)* per-approver signatures | `KM01`–`KM04`, `SS04` | 001.BusinessIdeas §2.2 |

## The use case

A high-dollar invoice must be approved under a governance rule, and the decision must be provably
unaltered afterwards. The amount decides the tier; the tier decides who must approve
(`rule_version: approval-matrix-v1`):

| Tier | Amount (USD)        | Rule    | Approvers                                  |
|------|---------------------|---------|--------------------------------------------|
| T1   | ≤ 5,000             | 1-of-1  | Manager                                    |
| T2   | 5,001 – 50,000      | 1-of-1  | Director                                   |
| T3   | 50,001 – 250,000    | 2-of-3  | Director, Finance Lead, Controller         |
| T4   | 250,001 – 1,000,000 | 3-of-3  | Director, Controller, CFO                  |
| T5   | > 1,000,000         | escalate| Board quorum (3-of-5)                      |

The three files in `demo-invoices/` hit **T1** ($4,200), **T3** ($120,000) and **T4** ($750,000)
so a reviewer sees three visibly different approval paths.

## Contents

| Path | What |
|------|------|
| `WorkflowBlueprint.md` | Node-by-node BizFirst canvas build (Form, AI Agent, Switch, ApprovalNode, HTTP, Notify) |
| `demo-invoices/` | Three sample invoices spanning three approval tiers |
| `anchor-service/anchor_service.mjs` | Interim JS anchor sidecar (`/anchor`, `/verify`, `/health`) |
| `anchor-service/acc_mainnet.mjs` | CLI used to stand up the identity/data-account and write receipts |
| `test-vectors/` | Canonicalization spec + fixtures (decision JSON → canonical form → SHA-256) |

## The anchor pattern (the part that matters)

1. The workflow assembles the final `decision` object (invoice, tier, rule version, the approver
   list from the ApprovalNode, timestamp).
2. It is reduced to **canonical JSON** — object keys sorted recursively at every level, arrays kept
   in order (see `test-vectors/CANONICALIZATION.md`).
3. `SHA-256` of that canonical string is written to the Data Account as a `DoubleHash` entry
   (`DA02`).
4. Verification needs no trust in DE BARY or BizFirst: take the decision JSON, recompute the hash,
   compare it to the on-chain entry. Match = authentic and unaltered since approval.

**Canonicalization is the reproducibility contract.** The fixtures in `test-vectors/` give exact
`decision → sha256` pairs so a C# (or any) implementation can confirm it hashes identically before
it is trusted to interoperate.

## Live proof

Decisions written by this reference land in `acc://marcdebary.acme/receipts` on Accumulate mainnet:
https://explorer.accumulatenetwork.io/acc/marcdebary.acme/receipts

## Running it

See `anchor-service/README.md`. In short: the service reads a signing key from the host (never
exposed), the workflow's HTTP Request node POSTs the decision to `/anchor` with a bearer token, and
the response carries `receipt_hash`, `txid`, and an explorer link the notify step can share.

## Honest caveats

- Writing to a Data Account is slower and costs credits, and cannot be undone — appropriate only
  where immutability is the point (see 001.BusinessIdeas §1). For an internal-trust audit log, the
  platform's existing history tables are the better tool.
- This reference anchors a **hash** of the decision, not the decision itself — the plaintext lives
  in the workflow/CRM; only the tamper-evident fingerprint is on-chain (privacy-preserving, but it
  means verification requires the original JSON).
- The JS/HTTP architecture is an interim bridge, chosen so the pattern is provable now; it is not a
  recommendation over the proposed in-engine C# node.

*Contributed by Marc de Bary / DE BARY LLC as a reference implementation. Placement and scope are a
suggestion — owners, please move or trim as fits the repo.*
