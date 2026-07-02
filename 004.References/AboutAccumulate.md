# About Accumulate

*A technical primer for community developers building the BizFirst Accumulate ExecutionNode.*

## Why this document exists

This project's goal is to bring **Accumulate** — a distributed-ledger protocol — into BizFirst's
node-based workflow engine as a new, community-built **ExecutionNode**. Before writing any code
against the SDK, a contributor needs a working mental model of what Accumulate actually is, because
it does not behave like a "typical" chain (no single global ledger of accounts, no EOA-style
private-key addresses as the default identity). This document summarizes what's verifiable from
official Accumulate sources as of July 2026. It is deliberately scoped to *background knowledge*,
not to BizFirst's integration requirements — those belong in `002.Requirements/` and the eventual
`003.ApiSpec/`.

Sources used: [accumulate.org](https://accumulate.org), [accumulatenetwork.io](https://accumulatenetwork.io)
(the project's blog/announcements domain), the official developer docs at
[docs.accumulatenetwork.io](https://docs.accumulatenetwork.io), the
[AccumulateNetwork GitHub org](https://github.com/AccumulateNetwork), and the
[Acme.Net.Sdk NuGet page](https://www.nuget.org/packages/Acme.Net.Sdk). Where a claim comes from
marketing/blog material rather than technical docs, it's flagged as such below.

---

## 1. What Accumulate is

Accumulate describes itself as an **identity-based blockchain protocol** — per accumulate.org, "an
identity-based blockchain protocol with multi-chain support, human-readable addresses, and key
hierarchies." Its native token is **ACME**. Mainnet launched October 31, 2022 (per accumulate.org).
The protocol grew out of work related to Factom and reuses some of its ideas (a modular
"chain-of-chains" structure and periodic data anchoring), per Accumulate's own "Key Innovations"
write-up.

### The core architectural difference: identities are first-class, not addresses

Most L1 chains (Bitcoin, Ethereum, etc.) center on a single global ledger where a cryptographic
keypair *is* your address. Accumulate inverts this: the base unit is an **Accumulate Digital
Identifier (ADI)** — a human-readable, URL-shaped identity (e.g. `acc://redwagon.acme`) that a
person, organization, or device controls. An ADI is not just an address; per the docs, each ADI
"functions as an independent chain" with its own state and its own set of sub-accounts (token
accounts, data accounts, key management structures, etc.), nested under the ADI's URL, e.g.
`acc://redwagon.acme/tokens`. This is Accumulate's "chain-of-chains" design: rather than one shared
ledger, every ADI is effectively its own mini-blockchain, anchored periodically into the wider
network.

### Network layers

Per the official glossary and docs:
- **Block Validator Networks (BVNs)** — Tendermint-based sub-networks that execute transactions
  against the records (ADIs) assigned to them. The protocol routes an ADI to a BVN by hashing its
  name. Scaling is achieved by adding more BVNs, each handling a shard of the total ADI population.
- **Directory Network (DN)** — executes transactions against network-wide system records (such as
  the ACME token issuer) and collects Merkle **anchors** from every BVN, tying the whole system
  together and, per Accumulate's materials, enabling anchoring into external Layer-1 chains too.
- **Synthetic transactions** — transactions the *protocol itself* generates (not a user) to settle
  effects that cross ADI/BVN boundaries — e.g., crediting a token deposit on the receiving ADI's
  chain, or refunding a failed transaction. This is how Accumulate keeps each ADI's chain
  independently consistent while still supporting cross-identity operations.

**On performance claims:** Accumulate's own marketing pages state throughput figures in the tens of
thousands of TPS at launch, scaling higher by adding BVNs (accumulate.org's homepage cites "up to
70,000 transactions per second"; a 2022 blog post on accumulatenetwork.io cites "about 75,000 TPS...
scal[ing] to millions of TPS by adding more BVNs"). These are the project's own published figures,
not independently benchmarked numbers this document can confirm — treat them as directional
marketing claims about the sharded architecture's intent, not a guaranteed SLA.

---

## 2. Core concepts you need before touching the SDK

### ADIs and Lite Accounts

- **ADI (Accumulate Digital Identifier)**: a human-readable URL identity, e.g. `acc://bob.acme`,
  that can represent a person, organization, or device. ADIs must be created on-chain (they cost
  ACME-funded "credits" to create) and are secured by a **Key Book**.
- **Lite Account**: an unstructured, address-like account (not human-readable) that requires no
  setup — comparable to a raw keypair-derived address on other chains. Per the docs, lite token
  accounts are free to create but aren't acknowledged by the network until they hold ACME. Lite
  accounts are the typical starting point (e.g., to fund the credits needed to then create an ADI).

### The account/URL model

Every resource in Accumulate — an identity, a token account, a data account, a key book, a key
page — is addressed by an `acc://` URL, nested under its owning ADI. Examples from the docs:
- `acc://redwagon.acme` — the ADI itself
- `acc://bob.acme/tokens` — a token account owned by the `bob.acme` ADI
- `acc://bob.acme/data` — a data account
- Sub-identities can nest further, e.g. `acc://company.acme/accounting/payroll`

This is the biggest conceptual shift for a developer coming from EVM/UTXO chains: "accounts" in
Accumulate are typed, purpose-specific sub-chains under an identity's URL, not a single balance
tied to a keypair.

### Key Books, Key Pages, and multi-signature

Accumulate separates *authority to act* from *the account being acted on*:
- A **Key Book** is an ordered set of **Key Pages**, prioritized so a higher-priority page can
  modify itself or any lower-priority page.
- A **Key Page** lists the public key hashes (and/or delegate URLs) allowed to sign, plus an
  m-of-n signature threshold (e.g., 2-of-3) and a credit balance used to pay for the page's
  transactions.
- Per the docs' "Signatures and Authorities" page: a transaction is accepted once *all* of the
  target account's authorities accept it, and an authority accepts once *any one* of its signers
  (key pages) reaches its own threshold. Remote/cross-ADI authority approval is relayed via
  synthetic "forward" transactions.

This authority model is what makes Accumulate naturally suited to organizational key hierarchies
(e.g., "a payment over $10,000 needs 2 of 3 finance-team signatures") without needing a custom
smart contract for it.

### Transactions and "TxBody"

An Accumulate transaction has a **header** (identifying the target/principal account, etc.) and a
**body**, whose `type` field selects the operation — e.g. creating an identity, creating a token
account, sending tokens, writing to a data account, updating a key page, and so on. "TxBody" (as
named in the `Acme.Net.Sdk` package) refers to this transaction-body payload: the SDK exposes
static factory/builder methods per transaction type so a caller doesn't need to hand-construct the
JSON body for each operation.

### Signing: Ed25519 and SmartSigner

Per the `Acme.Net.Sdk` NuGet listing, the SDK's primary signing mechanism is **Ed25519**, with
support for additional signature types (the listing mentions 17 total, including legacy Ed25519,
RCD1, and chain-interop types like Bitcoin/Ethereum-style and RSA/ECDSA signatures) — reflecting
that Accumulate's key pages can hold keys of more than one cryptographic type. **SmartSigner**, per
the same listing, is an SDK-level convenience that automatically tracks and increments the correct
signer/key-page version when constructing a signature, which matters because Accumulate key pages
carry a version number that must match what's referenced in a signature for it to validate.
(This "smart" version tracking is an `Acme.Net.Sdk` feature/abstraction, not necessarily an
official Accumulate protocol term — worth confirming directly with Jason_Gregoire or the SDK
source if the distinction matters for the ExecutionNode's design.)

### The V2 vs V3 API split

Accumulate nodes expose a JSON-RPC HTTP API, historically at a `/v2` path. Per search results
against the official docs and the `Acme.Net.Sdk` package description, the protocol has been
transitioning to a **V3** API: V2 is described in SDK docs as the "legacy" API (covering things
like faucet, execute, and query operations), while V3 is the newer API (submit/query/node-info
endpoints), reportedly adding improved error diagnostics and a more modular messaging framework.
`Acme.Net.Sdk` 1.1.0 advertises itself as supporting *both* V2 and V3 through one unified client —
this project could not independently verify the full V2/V3 differences beyond what the SDK's own
description states, so a contributor building the ExecutionNode should treat the SDK's client
abstraction as the source of truth here rather than assuming parity with other chains' API
versioning conventions.

---

## 3. Why this matters for a BizFirst ExecutionNode

BizFirst's ExecutionNode model is about exposing discrete, composable operations inside a workflow
graph (similar in spirit to n8n nodes). Accumulate's primitives map naturally onto that idea. Purely
as *framing* for what's plausible (concrete scope belongs in `002.Requirements/` and
`003.ApiSpec/`, not here), the kind of operations Accumulate's model would support in a workflow
context include things like:

- Creating and managing identities (ADIs) and their sub-accounts as part of an onboarding or
  provisioning workflow
- Building and signing transactions (token transfers, data writes, key-page updates) using the
  SDK's TxBody builders and SmartSigner/Ed25519 signing
- Querying chain state (balances, account data, transaction status) to drive conditional workflow
  logic
- Modeling multi-party approval steps (key book / key page thresholds) as workflow
  approval/signature-gathering steps
- Writing arbitrary data to a Data Account as a tamper-evident audit trail for a workflow run

Because credentials in BizFirst ExecutionNodes are never stored raw (see the Credential Pattern —
all secrets go through `ICredentialResolver` with a `credentialId`), a contributor should plan for
how an Accumulate signing key is resolved and used at execution time rather than embedded in node
settings.

---

## 4. Where to learn more

- **Project site**: [accumulate.org](https://accumulate.org) — mission, whitepaper/litepaper links,
  wallet
- **Announcements / technical blog**: [accumulatenetwork.io](https://accumulatenetwork.io) — e.g.
  the ["Accumulate's Key Innovations"](https://accumulatenetwork.io/2022/05/accumulates-key-innovations/)
  and ["Accumulate Digital Identifiers: Technical Guide"](https://accumulatenetwork.io/2021/10/adi-technical-documentation/)
  posts
- **Official developer docs**: [docs.accumulatenetwork.io](https://docs.accumulatenetwork.io) —
  see especially the *Deep Dive* section (`identity`, `identity-hierarchies`, `key-management`,
  `signatures-and-authorities`, `synthetic-transactions`) and the *Getting Started* glossary
- **Protocol source (mirror)**: [github.com/AccumulateNetwork/accumulate](https://github.com/AccumulateNetwork/accumulate)
  (Go implementation; the org's README notes this GitHub copy is a mirror — check the org for the
  canonical/primary repo location, referenced elsewhere as GitLab)
- **Docs source**: [github.com/AccumulateNetwork/accumulate-docs](https://github.com/AccumulateNetwork/accumulate-docs)
- **Whitepaper**: [accumulate.org/whitepaper](https://accumulate.org/whitepaper) (released April 2022)
- **The .NET SDK this ExecutionNode will wrap**: [Acme.Net.Sdk on NuGet](https://www.nuget.org/packages/Acme.Net.Sdk)
  — maintained by community member Jason_Gregoire; v1.1.0 (2026-06-30) describes itself as
  "Accumulate C# SDK (V2/V3 unified) with SmartSigner, TxBody builders, and Ed25519 signing,"
  targeting .NET 9.0

### Gaps / things not independently verified

- Exact, current V2-vs-V3 API differences beyond what the SDK listing states — the official docs
  did not surface a single authoritative comparison page during this research pass.
- Whether "SmartSigner" is an `Acme.Net.Sdk`-specific abstraction or maps to an official protocol
  concept.
- Throughput/TPS figures are the project's own published marketing numbers (varying between
  ~70,000–75,000 TPS at launch across two of Accumulate's own sources), not something this
  document independently benchmarked.
- The canonical (non-mirror) location of the core protocol repository — the GitHub org's own
  `accumulate` repo is labeled "MIRROR ONLY," and other sources point to a GitLab org; a
  contributor should confirm the current authoritative source repo before relying on it.

A contributor picking up SDK work should verify current API/version specifics directly against the
`Acme.Net.Sdk` source and against `docs.accumulatenetwork.io` at the time of implementation, since
this document reflects a July 2026 research pass and the protocol/SDK are both actively evolving.
