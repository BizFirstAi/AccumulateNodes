# Accumulate Nodes

# About the project
https://bizfirstai.github.io/AccumulateNodes/


Welcome! This is a **community-driven project** to bring the [Accumulate](https://accumulate.org)
blockchain protocol into [BizFirst](https://www.bizfirstai.com)'s node-based workflow engine, as a
new set of pluggable **ExecutionNodes**.

## Why this project exists

BizFirst's workflow platform (similar in spirit to n8n) runs on a plugin model — a "node" is a
self-contained, reusable building block a workflow author drags onto a canvas (send an email,
query a database, call an API, wait for approval, and so on). This project is about building the
node(s) that let a BizFirst workflow talk to Accumulate: create identities, send tokens, write
tamper-evident data records, manage multi-signature key authority, and query chain state.

It started from a real update: community developer **[jason_gregoire](https://www.nuget.org/profiles/jason_gregoire)**
maintains [`Acme.Net.Sdk`](https://www.nuget.org/packages/Acme.Net.Sdk) — a C# SDK unifying
Accumulate's V2 and V3 APIs with Ed25519 signing (`SmartSigner`), transaction builders (`TxBody`),
and identity-hierarchy tooling. That SDK is what this project's nodes will wrap. Thank you, Jason,
for building and maintaining it — this project wouldn't exist without it.

## Who this is for

Anyone comfortable with C#/.NET who's curious about blockchain integration, wants to learn how
Accumulate's identity-based architecture differs from typical L1 chains, or just wants to help build
something real for the BizFirst community. No prior blockchain experience required — the reference
docs below are written to get a .NET developer from zero to productive.

## Where to start

Read in this order:

1. **[`004.References/AboutAccumulate.md`](004.References/AboutAccumulate.md)** — what Accumulate
   actually is: identities (ADIs) instead of address-as-identity, the `acc://` URL/account model,
   key books & key pages, synthetic transactions, and why this protocol doesn't behave like a
   "typical" chain. Start here even if you've worked with other blockchains before.
2. **[`004.References/AboutAcmeNetSdk.md`](004.References/AboutAcmeNetSdk.md)** — the SDK itself:
   namespaces, the `TxBody` transaction-builder surface, the `SmartSigner` signing model, and a
   working quick-start example.
3. **[`002.Requirements/00_NodeDesignProposal.md`](002.Requirements/00_NodeDesignProposal.md)** —
   the current draft design: proposed resources and operations for the ExecutionNode(s), an
   architecture sketch, and a running log of decisions made so far (and what's still open). This is
   a living document, not a finished spec — check its status header before assuming anything in it
   is final.

## Questions & discussion

Have a question, a design opinion, or want to say hi before diving in? Use
**[GitHub Discussions](https://github.com/BizFirstAi/AccumulateNodes/discussions)** — that's the
place for open-ended conversation, design debate, and getting to know the rest of the contributors.
(Use GitHub Issues instead once there's concrete implementation work to track.)

## Repository layout

| Folder | Purpose |
|---|---|
| `001.BusinessIdeas/` | Why this matters, use cases, motivation — the "why" layer |
| `002.Requirements/` | Node design proposals — resources, operations, architecture (draft, evolving) |
| `003.ApiSpec/` | The detailed, finalized API specification — reserved for the project owner to write once the design in `002.Requirements/` is settled |
| `004.References/` | Background reading on Accumulate the protocol and `Acme.Net.Sdk` the library |
| `009.SocialMedia/` | Community invitation copy — social posts, DM/email templates, LinkedIn Story drafts |
| `docs/` | The project documentation website (home page + one page per resource) |

## Status

🟡 **Early stage — design phase.** The resource/operation breakdown in `002.Requirements/` is under
active review; several design decisions are already locked (see that document's decision log), and
several are still open. `003.ApiSpec/` and the actual C# implementation haven't started yet. If
you're interested in contributing, the design proposal's "Open Questions" section is the best place
to see what's still up for discussion.

## A note on the domain

Accumulate signs with **Ed25519**, not the secp256k1/ECDSA scheme used by Ethereum and most
EVM chains — an Ethereum key/wallet is not compatible here. If you're coming from EVM-chain
experience, the identity model (ADIs, not raw addresses) and the transaction-then-synthetic-
transaction settlement flow are the two biggest mental-model shifts — both are covered in
`AboutAccumulate.md`.
