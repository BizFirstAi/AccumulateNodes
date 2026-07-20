# Canonicalization & hashing spec (the reproducibility contract)

For a decision to be independently verifiable, every implementation must reduce the same decision
object to the same bytes before hashing. This spec defines that reduction. If a C# (or any)
implementation reproduces the `sha256` values in `vectors.json`, it interoperates with this
reference.

## Canonical JSON

1. **Objects:** serialize keys in ascending Unicode code-point order (JavaScript `Array.sort()`
   default / .NET `StringComparer.Ordinal`). Apply recursively at every nesting level.
2. **Arrays:** preserve element order (do **not** sort). Canonicalize each element.
3. **Strings / numbers / booleans / null:** standard JSON encoding. Numbers are integers here; avoid
   floats to sidestep representation differences. No insignificant whitespace anywhere.
4. Output is a single line, no spaces after `:` or `,`.

Reference implementation (JavaScript, from `anchor-service/anchor_service.mjs`):
```js
function canonicalize(v) {
  if (Array.isArray(v)) return '[' + v.map(canonicalize).join(',') + ']';
  if (v && typeof v === 'object')
    return '{' + Object.keys(v).sort().map(k => JSON.stringify(k) + ':' + canonicalize(v[k])).join(',') + '}';
  return JSON.stringify(v);
}
```

## Hash

`receipt_hash = SHA-256( utf8( canonicalize(decision) ) )`, expressed as lowercase hex.
On-chain it is written as a `DoubleHashDataEntry` (`DA02`); the fixture value below is the
pre-chain SHA-256 of the canonical payload.

## Fixtures

See `vectors.json`. Each entry pairs a decision object with its canonical string and expected
SHA-256. Quick check with the reference implementation:

```
node -e '
const {createHash}=require("crypto");
const canon=v=>Array.isArray(v)?"["+v.map(canon).join(",")+"]":(v&&typeof v==="object"?"{"+Object.keys(v).sort().map(k=>JSON.stringify(k)+":"+canon(v[k])).join(",")+"}":JSON.stringify(v));
const d=require("./vectors.json").vectors[2].decision;
console.log(createHash("sha256").update(canon(d)).digest("hex"));
'
# -> ce768dd99a4bac850e5ef0cef58c0bfc71b43c7baa6f9487edb84ffef74fba2e
```
