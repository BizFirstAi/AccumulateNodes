# About Acme.Net.Sdk

*A technical primer on the C# SDK this project wraps — companion to [AboutAccumulate.md](./AboutAccumulate.md), which covers the protocol itself.*

## Why this document exists

`Acme.Net.Sdk` is the concrete .NET library the eventual BizFirst ExecutionNode(s) will call into.
`AboutAccumulate.md` explains *what Accumulate is*; this document explains *what the SDK gives you
to talk to it* — its namespaces, its signing model, and the transaction-builder surface a node
operation will map onto. Source: the [NuGet package page](https://www.nuget.org/packages/Acme.Net.Sdk)
and the [GitHub repository README](https://github.com/opendlt/accumulate-csharp-sdk), both fetched
2026-07-02.

## Package basics

| | |
|---|---|
| **Package ID** | `Acme.Net.Sdk` |
| **Latest version** | 1.1.0 (published 2026-06-30) |
| **Author** | `jason_gregoire` |
| **License** | MIT |
| **Repository** | https://github.com/opendlt/accumulate-csharp-sdk |
| **Target framework** | .NET 9.0 (listed compatible with .NET 10.0) |
| **Dependencies** | `Newtonsoft.Json` (≥ 13.0.3), `NSec.Cryptography` (≥ 24.4.0, provides the Ed25519 signing primitives) |
| **Install** | `dotnet add package Acme.Net.Sdk --version 1.1.0` |

Version history on NuGet shows a fast iteration pace: 1.0.0 (2026-02-27) → 1.0.1 (2026-06-17) →
1.0.2 (2026-06-26) → 1.1.0 (2026-06-30). Total downloads at time of writing: 398. This is a young,
actively-maintained, low-adoption package — worth noting for anyone assessing implementation risk.

## What it does, in one paragraph

`Acme.Net.Sdk` is a "unified V2/V3" client: it wraps both of Accumulate's JSON-RPC API generations
behind one `Accumulate` client object, adds Ed25519 key generation and signing (via `NSec.Cryptography`),
and provides factory methods (`TxBody`) for every Accumulate transaction type so a caller doesn't
hand-build the wire format. Its headline feature, `SmartSigner`, bundles "build → sign → submit →
poll for delivery" into a single async call — which matters because Accumulate transactions are not
finalized in one step (see `AboutAccumulate.md` §3 on synthetic transactions).

## Namespaces and key types

| Namespace | Contains | Purpose |
|---|---|---|
| `Acme.Net.Sdk.Signing` | `SmartSigner`, `AccKeyPairGenerator`, `KeyManager` | Key generation, signer-version tracking, sign+submit+poll workflows, key page state queries |
| `Acme.Net.Sdk.Transactions` | `TxBody` | Static factory for building every supported transaction body |
| `Acme.Net.Sdk.Protocol` | `Principal`, `SignatureType`, `Url`, `VoteType` | Core protocol value types — `Url` models the `acc://` address format from `AboutAccumulate.md` |
| `Acme.Net.Sdk.Provisioning` | `HierarchyProvisioner` | Idempotent creation of nested ADI hierarchies (e.g. provisioning a multi-level identity tree in one call) |
| `Acme.Net.Sdk.Helpers` | `AccumulateHelper` | Balance polling, oracle queries, credit math (ACME↔credits conversion) |
| `Acme.Net.Sdk.V2` / `Acme.Net.Sdk.V3` | API client implementations | Raw access to each API generation; most new code should prefer V3 |
| (root) `Accumulate.cs` | Unified client | Exposes both generations as `client.V2` / `client.V3` properties on one object |

**Unverified:** whether `SmartSigner` is an SDK-specific abstraction or maps to an official protocol
concept — the NuGet/README material describes it only as a client-side convenience layer. Treat it
as `Acme.Net.Sdk`'s own design, not a protocol primitive, unless a contributor finds evidence otherwise.

## Signing model

- Keys are Ed25519 (`SignatureType.ED25519`), generated via `AccKeyPairGenerator.GenerateSignatureKeyPair(...)`.
- A `SmartSigner` is constructed from a client (`client.V3`), a keypair, and the signer's `acc://` URL
  (typically a Lite Identity or a Key Page under an ADI — see `AboutAccumulate.md` §2 for what those are).
- `SmartSigner.SignSubmitAndWaitAsync(principal, body)` does the full round trip: builds the envelope,
  signs it, submits it, and polls until the transaction (and any synthetic follow-on transactions)
  are delivered.
- Multi-signature (M-of-N) is supported both synchronously (co-signers present together) and
  asynchronously (pending-transaction flow where later signers complete it independently) — this
  lines up with the Key Book / Key Page threshold model described in `AboutAccumulate.md`.

## Transaction builders (`TxBody` factory)

The README lists factory methods grouped by purpose — this is the concrete surface a BizFirst node
"operation" will most directly wrap:

- **Token operations:** `SendTokensSingle()`, `SendTokens()` (batch), `IssueTokens()`, `BurnTokens()`
- **Identity management:** `CreateIdentity()`, `CreateIdentityInherited()`
- **Account creation:** `CreateTokenAccount()`, `CreateDataAccount()`, `CreateKeyBook()`, `CreateKeyPage()`
- **Custom tokens:** `CreateToken()`
- **Data operations:** `WriteData()`, `WriteDataTo()`
- **Key management:** `UpdateKeyPage()`, `AddKeyOperation()`, `SetThresholdOperation()`
- **Account authorization:** `UpdateAccountAuth()`, `LockAccount()`
- **Utility:** `AddCredits()` (converts ACME to the credits used to pay for transactions),
  `AcmeFaucet()` (testnet-only funding)

Each of these is a natural candidate for a distinct ExecutionNode **operation** under a **resource**
grouping (Token / Identity / Account / Data / KeyPage / Utility) — the actual resource/operation
breakdown for the node itself belongs in `003.ApiSpec/`, not here; this file only documents what
the SDK exposes.

## Networks

The SDK's quick-start example connects to `https://kermit.accumulatenetwork.io` — Kermit is
Accumulate's public testnet (there's also a public [Kermit explorer](https://kermit.explorer.accumulatenetwork.io/)
for verifying transactions during development). The client also supports mainnet and a local DevNet
endpoint, selected purely by which URL the `Accumulate` client is constructed with — no separate
SDK configuration is needed per network.

## Quick-start (from the README)

```csharp
using var client = new Accumulate("https://kermit.accumulatenetwork.io");
var kp = AccKeyPairGenerator.GenerateSignatureKeyPair(SignatureType.ED25519);
var signer = new SmartSigner(client.V3, kp, lite_identity_url);

var result = await signer.SignSubmitAndWaitAsync(
    principal: token_account_url,
    body: TxBody.SendTokensSingle("acc://recipient/tokens", "100000000")
);
```

This single call performs the entire submit-and-confirm flow described in `AboutAccumulate.md`'s
synthetic-transaction section — worth internalizing before designing how a BizFirst node operation
should expose "did this actually finish" back to a workflow (poll vs. fire-and-forget vs. a
follow-up "check status" operation).

## Open questions for the ExecutionNode design (not answered here — see `003.ApiSpec/`)

- Does the node need read-only (query-only, no signing key) operations as a separate credential mode,
  the way the Ethereum ExecutionNode supports a read-only wallet mode?
- Should `HierarchyProvisioner` be exposed as its own operation, or is ADI creation better modeled
  as a sequence of existing `TxBody` calls a workflow author composes themselves?
- How should the node surface multi-sig's asynchronous pending-transaction flow — a single
  long-running operation, or a "submit" operation plus a separate "co-sign pending" operation?
- Given the package's low download count and single-maintainer status (`jason_gregoire`, who is
  also the community developer this project is being handed to), what's the fallback if a required
  `TxBody` method or API surface turns out to be missing or buggy — patch upstream, or vendor a fork?

## Where to learn more

- NuGet package: https://www.nuget.org/packages/Acme.Net.Sdk
- Source repository: https://github.com/opendlt/accumulate-csharp-sdk
- Accumulate testnet (Kermit) explorer: https://kermit.explorer.accumulatenetwork.io/
- Protocol background: [`AboutAccumulate.md`](./AboutAccumulate.md) in this same folder
