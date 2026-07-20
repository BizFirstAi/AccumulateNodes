# Workflow Blueprint — Invoice Approval on the BizFirst canvas

A node-by-node build for the BizFirst workflow that drives this reference. It uses only existing
platform nodes plus one HTTP call to the anchor sidecar (the future swap-in point for the C# node).

```
Form Trigger → AI Agent (classify tier) → Switch (by tier)
   → ApprovalNode T1 (1-of-1) ─┐
   → ApprovalNode T3 (2-of-3) ─┼→ Build Decision → HTTP /anchor → Notify (approved)
   → ApprovalNode T4 (3-of-3) ─┘
        (rejected / abstained) ─────────────────→ Notify (not approved) → Stop
```

### 1. Form Trigger — "Invoice intake"
Fields: `vendor`, `vendor_id`, `amount_usd` (number), `description`, `submitted_by` (email),
`invoice_id`. On submit, data lands as `form.*`. This is the link a reviewer (e.g. a stakeholder
testing it) uses to submit an invoice.

### 2. AI Agent — "Classify approval tier"
System prompt (paste in):
> You are an accounts-payable controller. Given an invoice (vendor, amount_usd, description), return
> JSON with `tier` (T1–T5), `rule` (the rule text), and `summary` (one sentence for approvers).
> Tiers by amount_usd: ≤5000 T1 "1-of-1 (Manager)"; 5001–50000 T2 "1-of-1 (Director)";
> 50001–250000 T3 "2-of-3 (Director, Finance Lead, Controller)";
> 250001–1000000 T4 "3-of-3 (Director, Controller, CFO)"; >1000000 T5 "escalate (Board 3-of-5)".
> Output JSON only.

Store output as `classification` (`.tier`, `.rule`, `.summary`). A deterministic Switch on
`form.amount_usd` alone also works; the AI node additionally writes the human-readable summary the
approvers see, and is the seed for later "AI acting within authority" work (design proposal §2, AI
audit-layer idea in 001.BusinessIdeas §4).

### 3. Switch — "Route by tier"
Expression `classification.tier`; output ports `T1`…`T5`. T2 reuses the T1 approval (both 1-of-1);
T5 wires to a board-escalation branch.

### 4. ApprovalNode (HIL, strategy **NofM**) — one per tier
This is the platform's existing ApprovalNode — the design proposal (§2.2) explicitly delegates
threshold-waiting to it rather than reimplementing it.

- **T1:** actors = [Manager], N=1, M=1
- **T3:** actors = [Director, Finance Lead, Controller], N=2, M=3; on timeout `escalated` → CFO
- **T4:** actors = [Director, Controller, CFO], N=3, M=3 (unanimous)

Message to each actor: `{{classification.summary}}` + invoice details. Ports: `approved` → node 5;
`rejected` / `abstained` → not-approved branch. Capture the per-actor decisions (who + when) into a
variable `approvals` for the record.

> Today this produces the platform's approval record. The Accumulate upgrade path (`KM01`–`KM04`,
> `SS04`, design proposal §2.2) is to bind each approver to a Key Page signature so the record is
> cryptographic, not just a logged user id. This reference stops at the audit-trail half (§2.1).

### 5. Data Mapping — "Build decision record"
Produce the object that gets anchored:
```json
{
  "use_case": "invoice-approval",
  "invoice_id":  "{{form.invoice_id}}",
  "vendor":      "{{form.vendor}}",
  "vendor_id":   "{{form.vendor_id}}",
  "amount_usd":  {{form.amount_usd}},
  "tier":        "{{classification.tier}}",
  "rule_version":"approval-matrix-v1",
  "rule":        "{{classification.rule}}",
  "decision":    "approved",
  "approvers":   {{approvals}},
  "submitted_by":"{{form.submitted_by}}",
  "timestamp":   "{{now}}"
}
```
Field order does not matter — the anchor service canonicalizes (sorts keys recursively) before hashing.

### 6. HTTP Request — "Anchor on Accumulate" *(swap point for the C# node)*
- POST `https://<your-tunnel>/anchor` (local test: `http://127.0.0.1:8787/anchor`)
- Headers: `Authorization: Bearer {{secrets.ANCHOR_TOKEN}}`, `Content-Type: application/json`
- Body: `{{decision}}`
- Store response as `anchor` → `anchor.receipt_hash`, `anchor.txid`, `anchor.explorer`
- Maps to `DA02` (write). When the native Accumulate node lands, replace this one node with its
  WriteData operation; nodes 1–5 and 7 are unchanged.

### 7. Notify — Email / Slack
On approved: include tier, approvers, `{{anchor.explorer}}` and `{{anchor.receipt_hash}}`.
On not-approved: short "needs revision" message, then **Stop Workflow**.

## How a reviewer tests it
1. **Hands-on:** open the Form link, submit a demo invoice (e.g. Vertex Data Systems, $750,000), get
   added as an approver, approve in the WorkDesk/email, receive the explorer link.
2. **Independent proof:** take the returned `decision` JSON, recompute `sha256(canonical)` (the
   `/verify` endpoint or the fixtures in `test-vectors/`), compare to the on-chain entry.
3. **Zero-effort:** a demo GIF + the live explorer link.
