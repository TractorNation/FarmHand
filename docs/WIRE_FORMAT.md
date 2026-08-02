# FarmHand QR Wire Format

Authoritative specification for FarmHand QR codes and match exports. Written for
implementers outside this repository (e.g. the data-analysis pipeline).

Reference implementation: [`src/utils/`](../src/utils/) — `Base45.ts`,
`BitStream.ts`, `MatchCodec.ts`, `PathCodec.ts`, `BatchCodec.ts`, `QrUtils.ts`.

---

## 1. QR string grammar

```text
<PREFIX> ":" <TYPE> ":" <SCHEMA_HASH> ":" <DEVICE_ID> ":" <PAYLOAD>
```

| Field | Value |
| --- | --- |
| `PREFIX` | `FRMHND`, uppercase, compared case-sensitively |
| `TYPE` | exactly one character: `M` `S` `T` `E` `B` |
| `SCHEMA_HASH` | 8 uppercase hex |
| `DEVICE_ID` | decimal integer (`0` for batch and schema codes) |
| `PAYLOAD` | depends on type — see below |

Type codes: `M`atch, `S`chema, `T`heme, `E`settings, `B`atch.

| Code | Payload |
| --- | --- |
| `M` | Base45 of a bit-packed match body (§4) |
| `B` | Base45 of a batch container (§6) |
| `S` | Base64 of zlib of the minified schema (§7) |

Match and schema payloads differ because their content does: a match has a known
shape the schema defines, so bit packing wins; a schema is repetitive JSON of
unbounded shape, where general-purpose compression wins.

> ### Parsing rule (important)
>
> **Split on the first four colons only; everything after the fourth colon is
> payload.** The Base45 alphabet contains both `:` and space, and every punctuation
> character in the QR alphanumeric set is also a Base45 character, so no delimiter
> can avoid this. A naive `split(":")` corrupts payloads.

`SCHEMA_HASH` is the first 8 hex characters of the MD5 of `JSON.stringify(schema)`.
Compare case-insensitively — it is uppercased so the whole string stays inside the
QR alphanumeric charset (5.5 bits/char instead of byte mode's 8).

Codes are rendered at **error-correction level Q** (~25% recoverable).

---

## 2. Base45

Per **RFC 9285**. Alphabet (index = value):

```text
0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ $%*+-./:
```

- Encode: take input two bytes at a time as `n = b0*256 + b1`; emit three digits
  `n mod 45`, `(n/45) mod 45`, `n/2025` (little-endian base-45).
- A trailing odd byte emits two digits: `n mod 45`, `n/45`.
- Decode reverses this. A length where `len % 3 == 1` is invalid. A triplet
  decoding above 65535, or a pair above 255, is invalid.

Cost: ~1.5 characters per byte, ~8.25 bits per byte in alphanumeric mode, versus
Base64's ~10.67.

---

## 3. Bit order

All bit fields are **most-significant-bit first**, both within a byte and across a
multi-bit integer. A body is zero-padded to a whole byte.

`bitsForCount(n)` = number of bits needed to represent `0..n-1`
= `0` when `n <= 1`, else `ceil(log2(n))`. **A single-option field costs 0 bits.**

**Varint** (unsigned LEB128-style): repeat `[continuation: 1 bit][payload: 7 bits]`,
least-significant group first. The continuation bit is 1 while more groups follow.

**Zigzag** (for signed varints): encode `n >= 0 ? 2n : -2n - 1`; decode
`even ? v/2 : -(v+1)/2`.

---

## 4. Match payload (`M`)

```text
[flags: 1 byte][field data: bit-packed, zero-padded to a byte][crc8: 1 byte]
```

- `flags` bit 0 = payload was raw-deflated. Bits 1–7 reserved. Currently always 0.
- `crc8` covers every byte before it. **Verify before parsing** — corrupt bits can
  inflate a text length field and run a reader off the end.

### CRC-8

CRC-8/ATM: polynomial `0x07`, init `0x00`, no reflection, no final XOR.
Check value for ASCII `"123456789"` is `0xF4`.

This is redundant with the QR's own Reed–Solomon correction. Its purpose is catching
encoder/decoder drift and 8-hex-character schema-hash collisions, not camera noise.

### Field order

Fields are encoded in `schema.sections.flatMap(s => s.fields)` order.
**`filler` fields are skipped entirely** (0 bits) — they are layout spacers.

### Per-type encoding

| Type | Encoding |
| --- | --- |
| `checkbox` | 1 bit |
| `dropdown`, `multiplechoice` | `bitsForCount(options.length + 1)` bits. `0` = unset sentinel; option *i* is transmitted as `i + 1` |
| `counter`, `number` | 1 presence bit; then a bounded value if both `min` and `max` are defined and `max - min + 1 <= 65536`, else a zigzag varint |
| `slider` | as `number`, defaulting `min=0, max=25`. When `selectsRange`, two values in `[low, high]` order |
| `timer` | 1 presence bit + varint **deciseconds** |
| `grid` | `rows * cols` bits, row-major, 1 = cell active. Defaults `3x3` |
| `text` | 1 presence bit; then 8-bit **UTF-8 byte** length + those bytes. Empty string encodes as presence 0. Truncated at 255 bytes on a code-point boundary |
| `autopath` | see §5 |
| `filler` | 0 bits |

**Bounded value**: `bitsForCount(max - min + 1)` bits carrying `value - min`, with
`value` clamped into `[min, max]`.

### Decoded representations

| Type | Decoded value |
| --- | --- |
| `checkbox` | boolean |
| `dropdown`, `multiplechoice` | the option string, or `"Select an option..."` when unset |
| `counter`, `number`, `slider` | number, or `null` when absent |
| `slider` (range) | `[number\|null, number\|null]` |
| `timer` | `"12.3"` under a minute, `"2:30.0"` at or above one; `null` when absent |
| `grid` | `"<rows>x<cols>:[i,j,k]"` |
| `text` | string (`""` when absent) |
| `autopath` | object, see §5 |

---

## 5. Auto path

A path is a polyline quantized to a **128 × 128** grid, plus events anchored to
points along it. The action / game-piece / result vocabularies live in the schema, so
the payload carries only indices.

Schema properties on an `autopath` field:

| Property | Meaning |
| --- | --- |
| `pathActions` | ordered actions, each `{ label, icon, results? }`. Max 8, max 4 results each |
| `gamePieces` | ordered pieces, each `{ label, icon }`. Max 3 |
| `fieldImageKey` | optional per-schema field image filename |
| `simplifyEpsilon` | RDP epsilon in grid units, default 2 |

### Bit layout

```text
[present: 1]

  present == 0:
    [explicitNoAuto: 1]      1 = scout asserted the robot had no autonomous
                             0 = nothing was recorded

  present == 1:
    [tokenCount: 7]          0..127
    [startX: 7][startY: 7]   absolute first point
    tokenCount x token
```

Token:

```text
[type: 1]

  type == 0 (MOVE):
    [escX: 1] [dx: 4 bits if escX==0 else 8 bits]
    [escY: 1] [dy: 4 bits if escY==0 else 8 bits]

  type == 1 (EVENT):
    [action: bitsForCount(pathActions.length)]
    [piece:  bitsForCount(gamePieces.length + 1)]   omitted when gamePieces is empty
    [result: bitsForCount(action.results.length)]   omitted when that action has no results
```

- Deltas are signed and biased: 4-bit form carries `d + 8` (range −8..7); 8-bit form
  carries `d + 128` (range −128..127). Each coordinate is clamped to `0..127` after
  applying its delta.
- `piece` is 1-based on the wire; `0` means "no piece was armed".
- An EVENT token anchors to the most recent point, i.e. `points.length - 1` at that
  moment in the stream. Events may precede any MOVE, anchoring them to the start point.
- At the caps an event costs 3 + 2 + 2 = 7 bits. A 20-point, 8-event path is ~35
  bytes. Both empty states cost 2 bits.

### The three path states

| State | Encoding | Meaning |
| --- | --- | --- |
| `PATH` | `present=1` | A path was drawn |
| `NO_AUTO` | `present=0, explicitNoAuto=1` | The scout recorded that the robot had no autonomous |
| `NOT_RECORDED` | `present=0, explicitNoAuto=0` | Nothing was captured |

`NO_AUTO` and `NOT_RECORDED` are deliberately distinct: a real no-show is a data
point, a missed recording is not.

### Standalone path blob

The `... (encoded)` CSV column contains the **path bit layout above, on its own**,
Base45-encoded — no flags byte and no CRC. Decode it with the same schema's
`pathActions` / `gamePieces` to recover the geometry.

---

## 6. Batch payload (`B`)

Carries many matches sharing one schema hash.

```text
FRMHND:B:<SCHEMA_HASH>:0:<BASE45>

body = [flags: 1 byte][matchCount: 1 byte]
       matchCount x { [deviceId: 1 byte][byteLength: varint][pad to byte boundary]
                      [match payload: byteLength bytes] }
       [crc8: 1 byte]
```

- Each `match payload` is a complete §4 body, **including its own flags and CRC**.
- `deviceId` is per record: a lead device's collection may mix scout devices.
- The container `DEVICE_ID` field is `0` and carries no meaning.
- `matchCount` is one byte, so at most 255 matches.

Producers additionally cap batch size for scannability — 30 matches per code on a
`md`+ screen, 20 on `sm`, 15 on `xs` — and close a chunk early if the encoded payload
would approach QR capacity (level Q, version 40 alphanumeric = 1,852 characters).
Consumers should not assume any particular count.

---

## 7. Schema payload (`S`)

Base64 of zlib of JSON — not bit-packed, because a schema's shape is exactly what a
bit-packed encoding would need to know in advance:

```json
[ schemaName, [ [ sectionTitle, [ field, ... ] ], ... ] ]
```

Each `field` is a positional array:

```json
[ name, typeCode, requiredFlag, props, extras ]
```

`extras` (index 4) may be absent in codes produced before it existed.

### Type codes

| Code | Type | Code | Type |
| --- | --- | --- | --- |
| `c` | checkbox | `s` | slider |
| `n` | counter | `T` | timer |
| `d` | dropdown | `g` | grid |
| `m` | multiplechoice | `a` | autopath |
| `t` | text | `f` | filler |
| `N` | number | | |

An unrecognized code is the type name spelled in full (older codes did this for
`multiplechoice`).

### Prop codes

| Code | Prop | Code | Prop |
| --- | --- | --- | --- |
| `d` | default | `L` | cellLabel |
| `o` | options | `T` | label |
| `m` | min | `B` | pullFromTBA |
| `M` | max | `I` | fieldImageKey |
| `l` | multiline | `P` | gamePieces |
| `r` | selectsRange | `A` | pathActions |
| `s` | step | `E` | simplifyEpsilon |
| `R` | rows | | |
| `C` | cols | | |

`valid` and `onChange` are never transmitted.

### Extras codes

| Code | Meaning |
| --- | --- |
| `i` | field `id` |
| `n` | `note` |
| `w` | `doubleWidth` is true |
| `p` | `persist` is true |
| `r` | the source field had **no** `required` key (distinguishes absent from explicit `false`) |

When `i` is absent, the id is derived as `sectionIndex * 1000 + fieldIndex`.

> **Schema identity caveat.** This encoding normalizes key order, so a schema
> imported from a QR code is functionally identical to its source but not
> byte-identical — and therefore hashes differently. FarmHand records the sending
> device's hash on import and matches on it first. If you compute schema hashes
> yourself, do not assume a re-serialized schema reproduces the original hash.

---

## 8. Export formats

### Unset values

**A field the scout never filled in exports as `null` (JSON) or an empty cell (CSV) —
never as a substituted default.** A real `0` is still `0`, and empty text is still
distinguishable from text that was typed.

This matters for aggregation: `null` must be excluded from averages and counts rather
than treated as zero. Which fields can be unset follows from §4 — any type with a
presence bit (`counter`, `number`, `slider`, `timer`, `text`) plus `dropdown` /
`multiplechoice` at their unset sentinel. `checkbox` and `grid` have no unset state;
they are always `false` / an empty selection.

> **Changed in 2026.3.3.** Earlier exports substituted a per-type default, so an
> untouched number arrived as `0` and blank text as the literal string
> `"No text provided"` — both indistinguishable from real entries. Analysis code that
> relied on those placeholders needs a null check instead.

### Record order

Export order is **not** guaranteed. Records follow the order codes were selected
(tap order, or the current on-screen sort via Select All), not match order. **Sort by
`Match Number` yourself** if order matters.

### CSV

One row per match. Columns follow `sections.flatMap(s => s.fields)` order, using each
field's `name` as the header. An `autopath` field expands to several columns instead
of one:

| Column | Contents |
| --- | --- |
| `<Field> Status` | `PATH` \| `NO_AUTO` \| `NOT_RECORDED` |
| `<Field> Start Zone` | 3×3 zone label: column letter `A`–`C`, row digit `1`–`3` (`A1` = top-left) |
| `<Field> Start X` | 0–127 grid units |
| `<Field> Start Y` | 0–127 grid units |
| `<Field> Action Sequence` | action labels in order joined by `>`, each `Label` or `Label:Result` |
| `<Field> <Action> Count` | one column per configured action |
| `<Field> (encoded)` | the standalone Base45 path blob (§5) |

When `Status` is not `PATH`, every other path column is **empty** rather than `0`, so
a genuine zero stays distinguishable from an absence.

Cells are quoted only when they contain `"`, `,`, `\r`, or `\n`; embedded quotes are
doubled. That is RFC 4180 quoting and nothing more.

> **Formula injection is not neutralised.** A leading `=`, `+`, `-` or `@` is left as
> written, so a comment of `=1+1` is a live formula when the file is opened in Excel
> or Sheets. This is a deliberate trade: prefixing an escape character would visibly
> alter ordinary text — comments legitimately start with `-`, and numeric columns are
> negative — and the export is a data file, not a document.
>
> Worth knowing because the text is not always local: comment fields arrive from other
> teams' devices via scanned match codes, so a spreadsheet built from an event's codes
> can contain strings this device never typed. Treat an exported CSV the way you would
> any file from an outside source.

Rows whose schema hash differs from the first selected code are omitted.

### JSON

An array of objects keyed by field `name`. `filler` fields are omitted. An `autopath`
field becomes:

```json
"Auto Path": {
  "status": "PATH",
  "grid": 128,
  "startZone": "A2",
  "points": [[12, 64], [20, 61], [31, 55]],
  "events": [
    { "afterPoint": 1, "action": "Pickup", "piece": "Fuel", "result": null },
    { "afterPoint": 2, "action": "Score",  "piece": "Fuel", "result": "Made" }
  ]
}
```

`action`, `piece`, and `result` are resolved to their **labels**, not indices.
`points` are `[x, y]` pairs in grid units. `startZone` is `null` when there is no path.

Non-autopath fields carry their decoded value directly, or `null` when unset:

```json
{
  "Match Number": 12,
  "Team Number": 1023,
  "Auto Fuel Score": 0,      // a real zero
  "Total Fuel Score": null,  // never recorded
  "Comments": null           // never recorded
}
```

---

## 9. Reference decoder (Python)

Handles `M` and `B` codes. Requires the schema as a Python dict.

```python
import hashlib
from typing import Any

B45 = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ $%*+-./:"
B45_INV = {c: i for i, c in enumerate(B45)}


def parse_qr(s: str):
    """Split on the first four colons; the rest is payload."""
    parts, start = [], 0
    for _ in range(4):
        i = s.index(":", start)
        parts.append(s[start:i])
        start = i + 1
    prefix, type_token, schema_hash, device_id = parts
    # Case-sensitive: the retired v1 format is lowercase and must be rejected here
    # rather than guessed at.
    assert prefix == "FRMHND", "not a FarmHand code"
    # No version field. A longer token is not this format.
    assert len(type_token) == 1, "unrecognised type token"
    return {
        "type": type_token,
        "schema_hash": schema_hash.lower(),
        "device_id": int(device_id),
        "payload": s[start:],
    }


def b45_decode(text: str) -> bytes:
    assert len(text) % 3 != 1, "invalid Base45 length"
    d = [B45_INV[c] for c in text]
    out = bytearray()
    i = 0
    while i + 2 < len(d):
        n = d[i] + d[i + 1] * 45 + d[i + 2] * 2025
        assert n <= 0xFFFF
        out += bytes((n >> 8, n & 0xFF))
        i += 3
    if i < len(d):
        n = d[i] + d[i + 1] * 45
        assert n <= 0xFF
        out.append(n)
    return bytes(out)


def crc8(data: bytes) -> int:
    crc = 0
    for byte in data:
        crc ^= byte
        for _ in range(8):
            crc = ((crc << 1) ^ 0x07) & 0xFF if crc & 0x80 else (crc << 1) & 0xFF
    return crc


class Reader:
    """MSB-first bit reader."""

    def __init__(self, data: bytes):
        self.data, self.pos = data, 0

    def bit(self) -> int:
        if self.pos >= len(self.data) * 8:
            raise EOFError("read past end")
        b = (self.data[self.pos >> 3] >> (7 - (self.pos & 7))) & 1
        self.pos += 1
        return b

    def bits(self, n: int) -> int:
        v = 0
        for _ in range(n):
            v = v * 2 + self.bit()
        return v

    def varint(self) -> int:
        result, mult = 0, 1
        while True:
            more = self.bit()
            result += self.bits(7) * mult
            if not more:
                return result
            mult *= 128

    def align(self):
        while self.pos % 8:
            self.pos += 1

    def read_bytes(self, n: int) -> bytes:
        return bytes(self.bits(8) for _ in range(n))


def bits_for_count(n: int) -> int:
    return 0 if n <= 1 else (n - 1).bit_length()


def zigzag(v: int) -> int:
    return v // 2 if v % 2 == 0 else -(v + 1) // 2


def ordered_fields(schema: dict) -> list:
    return [f for s in schema["sections"] for f in s["fields"]]


def read_number(r: Reader, props: dict):
    if not r.bit():
        return None
    lo, hi = props.get("min"), props.get("max")
    if lo is not None and hi is not None and (hi - lo + 1) <= 65536:
        return r.bits(bits_for_count(hi - lo + 1)) + int(lo)
    return zigzag(r.varint())


def format_time(tenths: int) -> str:
    total = tenths / 10
    minutes = int(total // 60)
    return f"{minutes}:{total % 60:04.1f}" if minutes else f"{total:.1f}"


def read_path(r: Reader, props: dict) -> dict:
    actions = props.get("pathActions") or []
    pieces = props.get("gamePieces") or []
    action_bits = bits_for_count(len(actions))
    piece_bits = bits_for_count(len(pieces) + 1) if pieces else 0

    if not r.bit():
        return {
            "status": "NO_AUTO" if r.bit() else "NOT_RECORDED",
            "points": [],
            "events": [],
        }

    count = r.bits(7)
    points = [[r.bits(7), r.bits(7)]]
    events = []
    for _ in range(count):
        if r.bit() == 0:  # MOVE
            dx = r.bits(8) - 128 if r.bit() else r.bits(4) - 8
            dy = r.bits(8) - 128 if r.bit() else r.bits(4) - 8
            x = min(127, max(0, points[-1][0] + dx))
            y = min(127, max(0, points[-1][1] + dy))
            points.append([x, y])
        else:  # EVENT
            a = r.bits(action_bits)
            piece = None
            if piece_bits:
                code = r.bits(piece_bits)
                piece = pieces[code - 1]["label"] if code else None
            results = (actions[a] or {}).get("results") if a < len(actions) else None
            result = results[r.bits(bits_for_count(len(results)))] if results else None
            events.append({
                "afterPoint": len(points) - 1,
                "action": actions[a]["label"] if a < len(actions) else None,
                "piece": piece,
                "result": result,
            })
    return {"status": "PATH", "grid": 128, "points": points, "events": events}


def read_field(r: Reader, field: dict) -> Any:
    t = field["type"]
    props = field.get("props") or {}

    if t == "filler":
        return None
    if t == "checkbox":
        return bool(r.bit())
    if t in ("dropdown", "multiplechoice"):
        options = props.get("options") or []
        code = r.bits(bits_for_count(len(options) + 1))
        return options[code - 1] if code else "Select an option..."
    if t in ("counter", "number"):
        return read_number(r, props)
    if t == "slider":
        p = {"min": props.get("min", 0), "max": props.get("max", 25)}
        if props.get("selectsRange"):
            return [read_number(r, p), read_number(r, p)]
        return read_number(r, p)
    if t == "timer":
        return format_time(r.varint()) if r.bit() else None
    if t == "grid":
        rows, cols = props.get("rows", 3), props.get("cols", 3)
        active = [i for i in range(rows * cols) if r.bit()]
        return f"{rows}x{cols}:[{','.join(map(str, active))}]"
    if t == "text":
        if not r.bit():
            return ""
        return r.read_bytes(r.bits(8)).decode("utf-8")
    if t == "autopath":
        return read_path(r, props)
    # Unknown types are stored as text.
    if not r.bit():
        return ""
    return r.read_bytes(r.bits(8)).decode("utf-8")


def decode_match_body(schema: dict, payload: bytes) -> dict:
    body, expected = payload[:-1], payload[-1]
    if crc8(body) != expected:
        raise ValueError("checksum failed")
    r = Reader(body)
    r.bits(8)  # flags
    return {
        f["name"]: read_field(r, f)
        for f in ordered_fields(schema)
        if f["type"] != "filler"
    }


def decode_batch_body(payload: bytes) -> list:
    body, expected = payload[:-1], payload[-1]
    if crc8(body) != expected:
        raise ValueError("batch checksum failed")
    r = Reader(body)
    r.bits(8)  # flags
    out = []
    for _ in range(r.bits(8)):
        device_id = r.bits(8)
        length = r.varint()
        r.align()
        out.append((device_id, r.read_bytes(length)))
    return out


def decode(qr_string: str, schema: dict):
    """Returns a dict for an M code, or a list of (device_id, dict) for a B code."""
    h = parse_qr(qr_string)
    payload = b45_decode(h["payload"])
    if h["type"] == "M":
        return decode_match_body(schema, payload)
    if h["type"] == "B":
        return [
            (dev, decode_match_body(schema, body))
            for dev, body in decode_batch_body(payload)
        ]
    raise ValueError(f"unsupported type {h['type']}")


def schema_hash(schema_json_string: str) -> str:
    """Matches FarmHand: first 8 hex chars of MD5 over the exact JSON text."""
    return hashlib.md5(schema_json_string.encode()).hexdigest()[:8]
```

---

## 10. Measured sizes

From a 12-field schema exercising every type, including a 3-point / 2-event auto path
and a 30-character UTF-8 comment with an emoji:

| Case | Body bytes | Payload chars | Full QR string chars |
| --- | --- | --- | --- |
| Fully populated match | 60 | 90 | 110 |
| Empty match | 7 | 11 | 31 |
| 3-match batch | — | 148 | 169 |

For comparison, the retired v1 payload for the same populated match — Base64 of zlib
of the JSON value array — ran several hundred characters. The bulk of the 60 bytes
above is the comment string; a schema without free text lands far smaller.

These figures are reproducible: the fixtures were generated by the encoders in
`src/utils/` and decoded by the §9 Python listing verbatim.

---

## 11. Changelog

| Format | Change |
| --- | --- |
| ~~v1~~ | ~~`frmhnd:<t>:<hash>:<dev>:` + Base64(zlib(JSON array of values))~~ — **retired, no longer readable** |
| current | Uppercase prefix, Base45, schema-driven bit packing, CRC-8, `autopath` field type, `B` batch container, error correction raised to level Q |

The current format briefly carried a version token (`M2`, `S2`, `B2`) during
development. It never shipped in a release, and it was dropped before it did: with a
single format defined, the digit was a constant on every code, and three separate
"payload version" constants had to be kept in lockstep to express it. The type
character is where an incompatible change would announce itself instead.

The **wire format is unchanged** by the export revision below; only the representation
of decoded values in CSV/JSON changed.

| App version | Change |
| --- | --- |
| 2026.3.3 | Unset fields export as `null` / empty instead of substituted defaults (`0`, `"No text provided"`). Batch codes now reuse each match's stored bytes verbatim rather than decoding and re-encoding, so batched records are byte-identical to their sources. |
| 2026.3.4 | v1 decoding removed. Schema codes retagged from lowercase `s` to `S` and the prefix uppercased — payload encoding unchanged, so only the header differs. |

### Schema identity

The hash covers the whole schema object, so **any** edit mints a new identity and
codes recorded under the old hash will not decode against the new schema — the bit
layout genuinely differs. The app keeps every saved revision under
`$APPLOCALDATA/schemas/revisions/<hash>.json` and resolves an incoming hash against
that archive, so older codes stay readable. If you decode outside the app, key your
schema copies by hash the same way.
