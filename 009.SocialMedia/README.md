# Social Media Invitation — Accumulate Nodes

Copy for inviting the open-source community to participate. Pick the variant that fits the
platform; all point back to the same destinations:

- **Live docs/design site:** `https://bizfirstai.github.io/AccumulateNodes/`
- **Repo:** `https://github.com/BizFirstAi/AccumulateNodes`
- **Discussion (ask questions here, not in comments):** `https://github.com/BizFirstAi/AccumulateNodes/discussions`

---

## Personal invitation message (DM / email to someone specific)

For reaching out 1:1 to a specific developer, colleague, or contact — warmer and more direct
than a broadcast post. Fill in the bracketed part.

```
Hey [name] — thought of you for this.

I'm part of an open-source project called Accumulate Nodes: we're building a workflow
node that lets BizFirst (a workflow automation platform) talk directly to the Accumulate
blockchain — tamper-evident record-keeping, multi-sig approvals, token payments, that
kind of thing, all as drag-and-drop workflow steps.

It's built on Acme.Net.Sdk, a C# SDK for Accumulate maintained by jason_gregoire. We're
still early — the design is public and still being shaped, so it's a good time to get in
before things are locked in.

Given your [C#/.NET background // interest in blockchain // whatever fits], I thought
you might want to take a look. No pressure, just wanted to point you at it:

https://github.com/BizFirstAi/AccumulateNodes/discussions

Happy to walk you through it if you're curious.
```

---

## LinkedIn Story (short-form, casual — a few slides' worth of text)

LinkedIn Stories are brief, disappear in 24 hours, and read more like a series of short
statements than a post. Suggested as 3–4 separate slides:

**Slide 1:**
```
Building something new 🔧
An open-source workflow node for the Accumulate blockchain.
```
*(Note: the guideline for this project's technical docs bans emoji/decorative icons — that
rule is for the documentation site, not necessarily social content. Drop the 🔧 if you want
strict consistency with that rule across every channel; it's a judgment call, not a hard
requirement here.)*

**Slide 2:**
```
Tamper-evident audit trails.
Multi-sig approvals with real cryptographic proof.
Programmable payments — right inside a workflow.
```

**Slide 3:**
```
Built on Acme.Net.Sdk by community dev jason_gregoire.
We're early. The design is public. Come shape it with us.
```

**Slide 4 (call to action):**
```
Link in bio / comments:
github.com/BizFirstAi/AccumulateNodes/discussions
```

---

## X / Twitter (short)

```
We're building an open-source ExecutionNode that brings the Accumulate blockchain
into BizFirst's workflow automation platform — tamper-evident audit trails,
multi-sig approvals, and programmable payments as drag-and-drop workflow steps.

Built on @accumulatenetwork's Acme.Net.Sdk by community dev jason_gregoire.

Come build it with us 👇
https://github.com/BizFirstAi/AccumulateNodes/discussions
```

(Swap the `@accumulatenetwork` handle for whatever their actual X handle is before posting —
not independently verified here.)

---

## LinkedIn (professional, longer)

```
Announcing an open-source community project: Accumulate Nodes.

We're bringing the Accumulate blockchain protocol into BizFirst's node-based workflow
automation platform as a set of pluggable ExecutionNodes — the same drag-and-drop building
blocks workflow authors already use for email, forms, and approvals.

Why this matters: workflow automation already moves data and triggers actions across
systems, but some steps need stronger guarantees than a database row can offer —
tamper-evident audit trails for compliance-sensitive approvals, cryptographic multi-party
sign-off instead of an "approved_by" column, and the ability to actually move value
(not just record that a payment happened elsewhere).

The project is built on Acme.Net.Sdk, the C# SDK for Accumulate maintained by community
developer jason_gregoire — this effort exists because of that work.

We're early — design decisions are being made in the open, with a public, evolving
specification anyone can read and weigh in on. If you're comfortable with C#/.NET and
curious about blockchain integration (no prior blockchain experience required — our
reference docs start from zero), we'd love your input or your code.

Got questions? Ask them in the discussion forum — that's genuinely where we want them,
not in the comments here.

📄 Docs & design: https://bizfirstai.github.io/AccumulateNodes/
💻 Repo: https://github.com/BizFirstAi/AccumulateNodes
💬 Questions & discussion: https://github.com/BizFirstAi/AccumulateNodes/discussions
```

---

## Discord / Reddit / long-form community post

```
## Accumulate Nodes — an open-source community project, and we want your help

**What this is:** We're building an ExecutionNode for BizFirst (a node-based workflow
automation platform) that lets workflows talk directly to the Accumulate blockchain —
create identities, write tamper-evident data records, manage multi-signature key
authority, send tokens, and query chain state, all as reusable workflow steps.

**Why it exists:** It started with a real update from community developer
u/jason_gregoire (github: jason_gregoire), who maintains Acme.Net.Sdk — a C# SDK
unifying Accumulate's V2/V3 APIs with Ed25519 signing and transaction builders. This
project is what happens when you take that SDK and ask "what could a workflow platform
actually do with this?"

**Concrete ideas already scoped:**
- Compliance-sensitive approval trails that can't be quietly edited after the fact
  (Accumulate's Data Accounts)
- Multi-party approvals backed by real cryptographic signatures, not just a database
  column saying who clicked "approve"
- Payroll-style batch payments and marketplace payouts triggered directly from a workflow
- Reactive workflows that start automatically when a payment or transaction arrives

**Where things stand:** Early and open. There's a public design proposal — resources,
operations, an architecture sketch, and a running decision log — that anyone can read
and challenge. Nothing is locked in stone yet except what's explicitly marked resolved.

**Who we're looking for:** Comfortable with C#/.NET? Curious about blockchain
integration? You don't need prior blockchain experience — the reference docs in the
repo are written to take a .NET developer from zero to productive, covering what makes
Accumulate's identity-based model different from typical chains before you touch any code.

Docs & design site: https://bizfirstai.github.io/AccumulateNodes/
Repo: https://github.com/BizFirstAi/AccumulateNodes
Discussions (start here, ask anything): https://github.com/BizFirstAi/AccumulateNodes/discussions
```

---

## Notes for whoever posts this

- All three variants credit `jason_gregoire` by name — please keep that credit intact, the
  project is built on their SDK.
- The X/Twitter variant references an `@accumulatenetwork` handle that hasn't been
  independently verified — check the actual handle before posting, or drop the mention.
- None of these claim the project is production-ready or feature-complete — they're
  accurate to the current state (early, design-phase, actively welcoming input), and
  should be updated once that changes rather than reused unedited months from now.
