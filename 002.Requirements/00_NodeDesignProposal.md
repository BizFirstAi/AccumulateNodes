# Accumulate ExecutionNode — Draft Node Design Proposal

**Status:** 🟡 DRAFT — for project owner review, not a locked decision
**Date:** 2026-07-02
**Scope:** Step 1 of BizFirst's node-engineering process — *list of operations, list of resources* —
for a new ExecutionNode wrapping `Acme.Net.Sdk` (Accumulate protocol). This is the precursor design
pass; the detailed, finalized spec belongs in `003.ApiSpec/` and is the project owner's to write.
**Companions:** [`AboutAccumulate.md`](../004.References/AboutAccumulate.md) (protocol primer),
[`AboutAcmeNetSdk.md`](../004.References/AboutAcmeNetSdk.md) (SDK primer) — read those first; this
document builds on them without repeating their content.
**Handoff target:** `jason_gregoire` (author of `Acme.Net.Sdk`)

---

## 0. How to read this document

Every resource/operation below is a *proposal*, not a decision. Where a priority call ("MVP" vs.
"Phase 2+") isn't backed by something concrete (an SDK method that clearly exists, a protocol
mechanic that clearly requires it), it's marked **needs owner input** rather than invented. Anything
genuinely undecided is pulled into [§5 Open Questions](#5-open-questions-for-owner-review) at the
end — please treat that section as the actual punch list for review.

---

## 1. Quick Facts

| Metric | Value |
|---|---|
| **Resources (proposed)** | 8 — Identity (ADI), Token Account, Data Account, Key Management, Credits, SmartSigner (Signing), Query/Explorer, Utility (testnet) |
| **Operations (proposed)** | 45 total — 31 MVP candidates, 14 Phase 2+ (+ 1 trigger, TRIG01) |
| **Triggers** | **Decided 2026-07-02 (owner):** in scope for v1 — 1-second poll interval (TRIG01, §2.9) |
| **Signing** | **Decided 2026-07-02 (owner):** promoted to its own resource — SmartSigner (§2.5) — not cross-cutting-only infrastructure as originally proposed |
| **Architecture** | 3-project SRP, mirroring the Ethereum ExecutionNode pattern (Domain / Services / Executor) |
| **SDK basis** | `Acme.Net.Sdk` v1.1.0 — `TxBody` factory (write side, verified against the package README) + Accumulate protocol's V2 JSON-RPC method inventory (read side, verified against `pkg/client/api/v2` in the `AccumulateNetwork/accumulate` source repo) |
| **Read-side verification** | V2 method names below are sourced directly from the protocol's own Go SDK-gen source, not guessed. Exact V3 method-name parity was **not** independently confirmed — see §5. |

---

## 2. Resource → Operation Breakdown

Each operation lists: **code**, short description, underlying SDK/API surface it maps to, one line
on workflow-author value, and a **priority marker**:

- 🟢 **MVP candidate** — small, high-value, low-risk; propose building first
- 🟡 **Phase 2+** — real but deferrable (multi-sig, provisioning, testnet-only, diagnostics)
- ⭐ marks operations that look like likely high-frequency "core" ops based on protocol mechanics
  (e.g., something nearly every workflow would need). This is **not** a market-data-backed
  popularity ranking like Ethereum's — flagged explicitly as **needs owner input** to confirm.

### 2.1 Identity (ADI) — 6 operations

| Code | Operation | Maps to | Why a workflow author wants it | Priority |
|---|---|---|---|---|
| ID01 | Create Identity | `TxBody.CreateIdentity()` | Provision a new ADI as part of onboarding/setup workflow | 🟢 MVP |
| ID02 | Create Identity (Inherited authority) | `TxBody.CreateIdentityInherited()` | Create a sub-identity that inherits its parent's key book, common for org sub-units | 🟢 MVP |
| ID03 | Query Identity / Account Info | V2 `query` | Read an ADI's current state before branching workflow logic | 🟢 MVP ⭐ |
| ID04 | Query ADI Directory (list sub-accounts) | V2 `query-directory` | Enumerate an ADI's token/data/key-book sub-accounts, e.g. to discover what already exists | 🟢 MVP |
| ID05 | Provision ADI Hierarchy | `Acme.Net.Sdk.Provisioning.HierarchyProvisioner` | One call to stand up a multi-level ADI tree (e.g. an org identity with several department sub-identities, each with its own key page config), instead of a workflow author manually looping ID01/ID02 + KM01/KM02. Gets the SDK's built-in idempotency — safe to retry after a partial failure without creating duplicates | 🟡 Phase 2 — **Decided 2026-07-02 (owner): dedicated operation, not composed from primitives.** Phase 2 rather than MVP because it needs a tree-shaped input schema (parent/children + per-level key config), more design work than the flat-settings operations above |
| ID06 | Get Identity Transaction History | V2 `query-tx-history` scoped to the ADI's `acc://` URL | List transactions against this specific identity — added 2026-07-02 per owner request for resource-scoped history ops (parity with Ethereum's AC03, which sits under Account rather than only existing as a generic Transactions-resource op). Same underlying call as `QX02`, just typed/scoped to this resource | 🟢 MVP |

### 2.2 Token Account — 7 operations

| Code | Operation | Maps to | Why a workflow author wants it | Priority |
|---|---|---|---|---|
| TA01 | Create Token Account | `TxBody.CreateTokenAccount()` | Set up a place to hold ACME or a custom token under an ADI | 🟢 MVP |
| TA02 | Send Tokens (single recipient) | `TxBody.SendTokensSingle()` | Core payment operation — pay one counterparty | 🟢 MVP ⭐ |
| TA03 | Send Tokens (batch) | `TxBody.SendTokens()` | Payroll-style disbursement to many recipients in one transaction | 🟢 MVP |
| TA04 | Query Token Balance | V2 `query` | Pre-transaction balance validation, portfolio/status checks | 🟢 MVP ⭐ |
| TA05 | Create Custom Token (issuer) | `TxBody.CreateToken()` | Stand up a new token type — needed for token-issuance use cases, not everyday payments | 🟡 Phase 2 |
| TA06 | Issue Tokens | `TxBody.IssueTokens()` | Mint additional supply under an existing custom token issuer | 🟡 Phase 2 |
| TA07 | Burn Tokens | `TxBody.BurnTokens()` | Reduce token supply — same use-case tier as TA05/06 | 🟡 Phase 2 |
| TA08 | Get Token Account Transaction History | V2 `query-tx-history` scoped to the token account's `acc://` URL | List transactions against this specific token account — payment history, reconciliation | 🟢 MVP |

### 2.3 Data Account — 6 operations

| Code | Operation | Maps to | Why a workflow author wants it | Priority |
|---|---|---|---|---|
| DA01 | Create Data Account | `TxBody.CreateDataAccount()` | Set up a tamper-evident record store under an ADI (e.g. audit trail target) | 🟢 MVP |
| DA02 | Write Data | `TxBody.WriteData()` | Write an entry to the caller's own data account — the audit-trail use case called out in `AboutAccumulate.md` §3 | 🟢 MVP ⭐ |
| DA03 | Write Data To | `TxBody.WriteDataTo()` | Write an entry to a *different* target data account (cross-account writes) | 🟢 MVP |
| DA04 | Query Data Entry | V2 `query-data` | Read back a specific data entry, e.g. to verify a workflow's own prior write | 🟢 MVP |
| DA05 | Query Data Set (range) | V2 `query-data-set` | Bulk-read a range of entries — more of a reporting/explorer use case than a per-workflow step | 🟡 Phase 2 |
| DA06 | Get Data Account Transaction History | V2 `query-tx-history` scoped to the data account's `acc://` URL | List transactions (writes) against this specific data account — **explicitly requested by owner 2026-07-02** as a must-have alongside ID06/TA08, distinct from DA04/DA05 which read data *entry contents*, not the transaction/write history itself | 🟢 MVP ⭐ |

### 2.4 Key Management — 8 operations

| Code | Operation | Maps to | Why a workflow author wants it | Priority |
|---|---|---|---|---|
| KM01 | Create Key Book | `TxBody.CreateKeyBook()` | Establish the authority structure for a new ADI or sub-account | 🟢 MVP |
| KM02 | Create Key Page | `TxBody.CreateKeyPage()` | Add a signer set + threshold under a key book | 🟢 MVP |
| KM03 | Add/Remove Key Operation | `TxBody.AddKeyOperation()` | Onboard/offboard a signer on an existing key page — common lifecycle operation | 🟢 MVP |
| KM04 | Set Signature Threshold | `TxBody.SetThresholdOperation()` | Change the m-of-n requirement on a key page (e.g. tighten approval policy) | 🟢 MVP |
| KM05 | Update Key Page (generic) | `TxBody.UpdateKeyPage()` | Generic multi-op container for key-page changes not covered by KM03/KM04 individually | 🟡 Phase 2 — needs owner input on whether this overlaps/replaces KM03+KM04 |
| KM06 | Update Account Auth | `TxBody.UpdateAccountAuth()` | Change which authorities govern an account (advanced authority management) | 🟡 Phase 2 |
| KM07 | Lock Account | `TxBody.LockAccount()` | Freeze an account's ability to transact — an incident-response/compliance operation | 🟡 Phase 2 |
| KM09 | Get Key Page Transaction History | V2 `query-tx-history` scoped to the key page's `acc://` URL | List transactions against this key page — key rotations, threshold changes, multi-sig co-sign activity (SS04) | 🟢 MVP |

**Moved to §2.5 SmartSigner:** Query Key Page (was KM08) — it wraps `KeyManager` from the
`Signing` namespace, not a `TxBody`/account-structure call, so it now lives with the rest of the
signing-related operations per the owner's decision to make Signing its own resource.

### 2.5 SmartSigner (Signing) — 4 operations — **added 2026-07-02 per owner decision**

Originally proposed as cross-cutting infrastructure only (see the removed "Not proposed as a
resource" note below), the project owner decided this should be a first-class resource. Every
write operation in every other resource (ID01–ID02, TA01–TA07, DA01–DA03, KM01–KM07, CR01) still
*internally* goes through `SmartSigner` to actually sign and submit — these three operations expose
that signing layer directly as workflow-visible capability, rather than replacing the per-resource
write operations above.

| Code | Operation | Maps to | Why a workflow author wants it | Priority |
|---|---|---|---|---|
| SS01 | Generate Signing Keypair | `AccKeyPairGenerator.GenerateSignatureKeyPair(SignatureType.ED25519)` | Provision a brand-new Ed25519 keypair as part of an onboarding workflow, e.g. before creating a Lite Identity or Key Page. Accumulate signs with Ed25519, not Ethereum's secp256k1 — not compatible with an Ethereum key/wallet | 🟢 MVP |
| SS02 | Query Signer / Key Page Version | `KeyManager` (+ V2 `query` / `query-key-index`) | Look up a key page's current signer set, threshold, and **version** before signing — this is the exact "stale version gets rejected" problem `SmartSigner` exists to solve; also useful standalone for diagnostics (was KM08) | 🟢 MVP ⭐ |
| SS03 | Sign, Submit &amp; Wait (generic) | `SmartSigner.SignSubmitAndWaitAsync(principal, body)` | Raw escape hatch: sign and submit an arbitrary `TxBody` and wait for delivery, for transaction types that don't have their own named operation in another resource yet | 🟡 Phase 2 — **needs owner input:** does this overlap with the "raw execute escape hatch" question in §5? (SS03 still requires a `TxBody`, so it's one level less raw than V2's `execute` methods) |
| SS04 | Sign and Proceed (Multi-Sig Co-Sign) | `SmartSigner` co-signing a pending transaction | Adds this signer's Ed25519 signature to an already-pending multi-sig transaction. **Decided 2026-07-02 (owner):** this is the ONLY multi-sig operation the node needs — see the design note below on why | 🟢 MVP |

**Multi-sig design decision (2026-07-02):** the node does **not** build its own pending-transaction
tracking, threshold counting, or a separate long-running "wait for N signers" operation. The
platform already has `ApprovalNode` (`BizFirst.Ai.ExecutionNodes.Core`, see
`node-engineer/010_NodeDesign-Engineer/ExecutionNodes/ApprovalNode/`) with an `eApprovalStrategy`
enum that includes `NofM` (N-of-M threshold) alongside `All`/`AnyOne` — exactly the consolidation
mechanic Accumulate's async multi-sig needs. The intended workflow pattern: an `ApprovalNode` step
(strategy `NofM`, one actor per required signer) gates the workflow; each actor's approval action
invokes SS04 to add their signature to the pending Accumulate transaction; `ApprovalNode`'s existing
suspend/resume framework — not anything built into this node — handles waiting for the threshold and
resuming the workflow once satisfied. `QX03` (Query Pending Transaction) remains available for
status checks but is not required for the core flow. This resolves the "one long-running op vs.
submit + separate co-sign op" question from earlier discussion: it's effectively the submit +
co-sign shape, but the *waiting* is delegated entirely to `ApprovalNode` rather than designed here.

### 2.6 Credits — 3 operations

| Code | Operation | Maps to | Why a workflow author wants it | Priority |
|---|---|---|---|---|
| CR01 | Add Credits | `TxBody.AddCredits()` | Converts ACME → credits, which pay for **every** other write operation's transaction fee — a near-universal prerequisite step | 🟢 MVP ⭐ |
| CR02 | Query Credit Balance | V2 `query` (against a key page) | Check whether a signer has enough credits before attempting a write, to fail fast with a clear error | 🟢 MVP |
| CR03 | Query ACME/Credit Oracle Rate | `AccumulateHelper` oracle helper | Needed to calculate how much ACME to convert for a target credit amount | 🟢 MVP — **exact underlying V2 endpoint/account URL not independently verified; confirm against SDK source before implementing** |

### 2.7 Query / Explorer (Transactions & Chain State) — 8 operations

| Code | Operation | Maps to | Why a workflow author wants it | Priority |
|---|---|---|---|---|
| QX01 | Query Transaction | V2 `query-tx` | Look up a transaction by ID — verification/monitoring, the read-side complement to every write op | 🟢 MVP ⭐ |
| QX02 | Query Transaction History | V2 `query-tx-history` | List an account's past transactions for reporting/reconciliation workflows | 🟢 MVP |
| QX03 | Query Pending Transaction | V2 `query-tx` (pending state) | Check whether a submitted transaction (or a multi-sig pending transaction) has settled | 🟢 MVP — directly relevant to the multi-sig design question in §5 |
| QX05 | Query Directory (generic URL listing) | V2 `query-directory` | Generic "what's under this `acc://` URL" — reusable beyond ID04's ADI-specific case | 🟢 MVP |
| QX04 | Query Synthetic Transaction | V2 `query-synth` | Inspect the protocol-generated synthetic transaction behind a cross-ADI effect (see `AboutAccumulate.md` §1) — debugging/advanced use | 🟡 Phase 2 |
| QX06 | Query Minor Blocks | V2 `query-minor-blocks` | Chain-explorer-style browsing, not a typical workflow step | 🟡 Phase 2 |
| QX07 | Query Major Blocks | V2 `query-major-blocks` | Same tier as QX06 | 🟡 Phase 2 |
| QX08 | Node Status / Version / Describe | V2 `status` / `version` / `describe` | Operational diagnostics (network config, fee schedule) — arguably infra tooling, not workflow logic; flagged for scope discussion | 🟡 Phase 2 — needs owner input on whether this belongs in-node at all |

### 2.8 Utility (testnet-only) — 1 operation

| Code | Operation | Maps to | Why a workflow author wants it | Priority |
|---|---|---|---|---|
| UT01 | Request Faucet Funds | V2 `faucet` / `TxBody.AcmeFaucet()` | Fund a test Lite Account with test-ACME during development | 🟡 Phase 2 — testnet-only; needs owner input on whether a production-facing node should even ship this |

### 2.9 Triggers — 1 operation — **added 2026-07-02 per owner decision**

Unlike every other resource above (implementing `INodeExecutor`), a trigger is a different kind of
node — it implements `ITriggerNodeExecutor` and returns `TriggerNodeResult { HasNewItems, Items,
ErrorMessage }`, per the established pattern already used by `email-imap-trigger`
(`node-engineer/010_NodeDesign-Engineer/ExecutionNodes/Email/IMAP/`). It's cron/interval-scheduled
polling, not a real push subscription.

| Code | Operation | Maps to | Why a workflow author wants it | Priority |
|---|---|---|---|---|
| TRIG01 | Watch Account for New Transactions | Poll `QX01`/`QX02` (V2 `query-tx` / `query-tx-history`) on a **1-second interval** | Start a workflow automatically when a new transaction lands on a watched account — e.g. "a payment arrived" | 🟢 MVP — **owner-set poll interval: 1s** |

**Implementation note (not a decision to relitigate, just a flag for whoever builds this):** a
1-second interval is aggressive relative to Accumulate's synthetic-transaction settlement delay
(`AboutAccumulate.md` §1) — a newly-submitted transaction's cross-chain effects may not be visible
that quickly, so most 1-second polls will find nothing new. It also means one poll call *per
second, per workflow instance* using this trigger, which is worth keeping in mind for API
rate-limits and node load at scale (dedup/backoff strategy, if needed, is a Phase 2 concern, not
part of this design decision). The interval itself is fixed by owner decision, not left as a
per-workflow configurable default — if per-workflow tuning is wanted later, that's a §2.9 follow-up,
not implied by this decision.

---

## 3. Proposed 3-Project Architecture (SRP)

Sketch only, mirroring the pattern used for the Ethereum ExecutionNode — same rationale (Domain has
no dependencies, Services depends on Domain, Executor depends on Services, one-way, no cycles):

```
BizFirst.Integration.Accumulate.Domain/
├─ Results/
│  ├─ Identity/        (6 result types)
│  ├─ TokenAccount/     (8 result types)
│  ├─ DataAccount/      (6 result types)
│  ├─ KeyManagement/    (8 result types)
│  ├─ SmartSigner/      (4 result types)
│  ├─ Credits/          (3 result types)
│  ├─ QueryExplorer/    (8 result types)
│  ├─ Triggers/         (1 result type — TriggerNodeResult per §2.9)
│  └─ Common/           (AccountRef, TxReference, KeyPageRef, CreditAmount, AcmeUrl wrapper)

BizFirst.Integration.Accumulate.Services/
├─ AccumulateClient.cs        (wraps Acme.Net.Sdk's unified `Accumulate` client — client.V2/client.V3)
├─ Services/
│  ├─ IdentityService.cs
│  ├─ TokenAccountService.cs
│  ├─ DataAccountService.cs
│  ├─ KeyManagementService.cs
│  ├─ SmartSignerService.cs   (SS01–SS03 — this is now the resource's own service, separate from SignerFactory below)
│  ├─ CreditsService.cs
│  └─ QueryExplorerService.cs
├─ Signing/
│  └─ SignerFactory.cs        (still used internally by every OTHER resource's write operations to
│                               resolve a credential → SmartSigner instance; SmartSignerService above
│                               is the workflow-visible resource, SignerFactory is the shared plumbing
│                               every write op — including SS03 — calls into)
├─ Helpers/
│  ├─ OracleHelper.cs         (wraps AccumulateHelper's ACME/credit math — pending CR03 verification)
│  └─ UrlHelper.cs            (acc:// URL construction/validation)
└─ ErrorCodes.cs

BizFirst.Integration.Accumulate.Executor/
├─ AccumulateNodeExecutor.cs           (routing, credential resolution)
├─ AccumulateNodeExecutor.Identity.cs  (feature partials, one per resource)
├─ AccumulateNodeExecutor.TokenAccount.cs
├─ [... one partial per resource ...]
└─ Settings/
   ├─ AccumulateNodeExecutorSettings.cs
   └─ {Resource}{Operation}Settings.cs  (one per operation, per the established naming convention)
```

Credential resolution follows the mandatory Credential Pattern already used across BizFirst
ExecutionNodes (SMTP is the reference implementation): the signing keypair is never stored raw in
node settings — it's resolved at execution time via `ICredentialResolver` + a `credentialId`, then
used to construct a `SmartSigner` for that operation.

---

## 4. Key Design Decisions (draft — open to challenge)

1. **Credentials-only signing, no raw keys in settings.** Follows the existing mandatory pattern;
   `SignerFactory` resolves a keypair via `ICredentialResolver` per operation rather than embedding
   one in node config. Not controversial given existing BizFirst convention, but restated here since
   it directly shapes how CR01/every write op is designed.
2. **Query/Explorer operations use the V2 method surface as the baseline**, because V2 method names
   (`query`, `query-tx`, `query-directory`, etc.) were independently verified against the protocol's
   own Go source (`pkg/client/api/v2/api_v2_sdk_gen.go` in `AccumulateNetwork/accumulate`), while V3's
   exact method-name surface was not. This is a starting point, not a final call — see §5.
3. **Signing is a first-class Resource (§2.5 SmartSigner), decided by the project owner on
   2026-07-02** — originally proposed as cross-cutting infrastructure only; the owner overruled that
   and asked for it as its own resource. `SignerFactory` (Services-layer plumbing) still exists and
   is still used internally by every other resource's write operations — the resource-level change
   is that key generation and signer/version querying (SS01–SS02) are now directly workflow-visible
   operations in their own right, not merely internal mechanics.
4. **Multi-actor consolidation is delegated to the existing `ApprovalNode`, never reimplemented in
   this node.** Decided 2026-07-02 for multi-sig specifically (SS04 + `ApprovalNode` `NofM`
   strategy, §2.5), but stated here as a general principle for the rest of the design too: any future
   operation that needs "wait for multiple humans/systems to act before proceeding" semantics should
   default to composing with `ApprovalNode` rather than this node growing its own suspend/consolidate
   logic. `HierarchyProvisioner` (ID05) is a different case — that's SDK-side idempotent
   provisioning, not human consolidation, so it stays a direct SDK wrap.
5. **Same naming conventions as the Ethereum node** (`{Resource}{Operation}Settings`,
   `{Resource}Service.{Operation}Async()`, `_Accumulate_{Resource}_{Operation}Async`) — chosen purely
   for consistency across BizFirst's ExecutionNode catalog, not an Accumulate-specific requirement.
6. **No popularity/priority data exists for this project** (unlike Ethereum's market-cap-backed
   rankings) — the 🟢/🟡 split above is based on protocol mechanics (e.g. "credits gate every write,
   so Add Credits is probably high-frequency") rather than usage data. Treat every priority marker as
   a starting proposal, not a researched ranking.
7. **Transaction confirmation wait policy: 3 seconds. Decided 2026-07-02 (owner).** Every write
   operation that submits a transaction (ID01–ID02, TA01–TA07, DA01–DA03, KM01–KM07, CR01, SS03,
   SS04 — anything going through `SmartSigner`) waits **3 seconds after submit** before returning.
   If the transaction has confirmed within that window, the operation returns as a normal
   synchronous success ("in case it signs we can continue as is" — owner's words) — no special
   pending-state handling needed for the fast-confirming case. If it has **not** confirmed within 3
   seconds, the operation returns with a pending/not-yet-confirmed status rather than blocking
   further; the workflow author follows up via `QX01`/`QX03` (query transaction / pending
   transaction) or `TRIG01` (§2.9) to learn when it eventually settles. This effectively defines the
   sync/async boundary for every write operation in this node: **3 seconds is the line between
   "treat as done" and "treat as pending, check later."** Needs confirmation at implementation time
   against how `SmartSigner.SignSubmitAndWaitAsync()`'s own internal polling behaves — the SDK's
   "wait for delivery" may need a timeout/cancellation parameter to actually enforce a 3-second cap
   rather than blocking until the SDK's own poll loop finishes on its own schedule.

---

## 5. Open Questions for Owner Review

- **Read-only credential mode.** Should the node support a no-signing-key, query-only credential
  mode (parity with the Ethereum node's read-only wallet mode), so a workflow can be built purely
  around the Query/Explorer + balance-check operations without provisioning a signing key at all?
- ~~**HierarchyProvisioner.**~~ **RESOLVED 2026-07-02:** dedicated operation — see ID05 in §2.1.
- ~~**Multi-sig pending-transaction flow.**~~ **RESOLVED 2026-07-02:** SS04 "Sign and Proceed"
  (§2.5) plus the existing platform `ApprovalNode` (`NofM` strategy) for threshold consolidation —
  see the design note under §2.5. No bespoke pending-transaction tracking is built into this node.
- ~~**Triggers / polling scope for v1.**~~ **RESOLVED 2026-07-02:** in scope — TRIG01 (§2.9),
  1-second poll interval, owner-specified.
- **V2 vs. V3 targeting.** This document's Query/Explorer operations are grounded in V2 method
  names verified against protocol source. `Acme.Net.Sdk` exposes both `client.V2` and `client.V3` —
  should the node target V2 (verified, but per the SDK's own docs positioned as legacy), V3 (newer,
  but this document could not independently confirm its exact method-name surface), or let the SDK's
  unified client abstraction decide per call? Needs direct confirmation against
  `docs.accumulatenetwork.io` and/or the SDK source at implementation time.
- **CR03's exact oracle endpoint.** `AccumulateHelper`'s oracle/credit-math helper is referenced in
  `AboutAcmeNetSdk.md`, but this document could not independently verify which V2/V3 method or system
  account URL it queries under the hood — confirm against SDK source before implementation.
- **Raw "execute" escape hatch.** The V2 surface includes generic `execute` / `execute-direct` /
  `execute-local` methods alongside the named per-type methods (`create-adi`, `send-tokens`, etc.).
  Should the node expose a generic "raw transaction" operation as an escape hatch for transaction
  types not covered by a named `TxBody` builder, or is that out of scope / too low-level for a
  workflow node?
- **Diagnostics scope (QX08).** Does node status/version/network-describe belong in this
  ExecutionNode at all, or is that purely operational tooling outside a workflow-automation node's
  purpose?
- **Faucet in a production tool (UT01).** Should a testnet-only faucet operation ship in the node
  at all, or be excluded/gated so it can't accidentally appear as an option in a production workflow?
- **KM05 vs. KM03/KM04 overlap.** Is `UpdateKeyPage()` (generic multi-op) meant to fully subsume
  the more specific `AddKeyOperation()`/`SetThresholdOperation()` calls, making KM03/KM04 the "easy
  mode" and KM05 the "advanced mode" — or are these functionally distinct enough to design
  independently? Affects whether KM05 stays Phase 2 or folds into MVP.

---

*This is a draft precursor to `003.ApiSpec/`, produced from `AboutAccumulate.md`, `AboutAcmeNetSdk.md`,
the `Acme.Net.Sdk` README, and Accumulate's V2 JSON-RPC method inventory (verified against
`AccumulateNetwork/accumulate` protocol source, July 2026). It does not reflect any decision by the
project owner or `jason_gregoire` and should be treated as a starting point for discussion.*
