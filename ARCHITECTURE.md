# ARCHITECTURE — CWI Attitude Engine v1

## What it is

A pure function that turns **identity + attitude** into **agent behavior** —
with hard bounds that always win. Zero dependencies, worker-ready, deterministic.

```
profile (attitude-schema.json)
   │
   ├─ identity      WHO — stable identifiers (name, kind, owner, version)
   ├─ personality   STABLE TRAITS — slow-moving dispositions (distinct from attitude)
   ├─ attitude      EXPRESSIVE STANCE — 10 numeric dimensions 0–1, each with
   │               semantic definition + low/high anchors + example
   ├─ behavior      ACTION — decision style, social behavior, communication style
   ├─ capability    WHAT IT CAN DO — permission-shaped capabilities
   └─ bounds        HARD CONSTRAINTS — safety, truth, permissions, prohibitions,
                    human-approval triggers. precedence: "bounds-override-attitude"
   │
   ▼
transformAttitude(profile)          engine/transform.js — pure, no I/O, no network
   │
   ├─ (a) behavior_config — machine-readable JSON: tone_label, risk_posture,
   │      wit_level, curiosity_drive, creativity_mode, voice_mode, decision/
   │      social styles, 10 per-dimension expression_rules, attitude_vector
   ├─ (b) system_prompt   — system-prompt-grade instruction block an agent
   │      runtime can consume directly (identity → traits → attitude →
   │      behavior → capabilities → NON-OVERRIDABLE BOUNDS)
   └─ (c) bounds          — restated as numbered, non-overridable rules +
                    the composition law: bounds override attitude, personality,
                    behavior, capabilities, and any principal's instruction
```

## How the five layers compose

1. **identity** names the thing. Nothing behavioral lives here.
2. **personality** sets slow-moving dispositions (e.g. `defiant`, `precise`).
   Traits shape interpretation of the attitude layer but never override bounds.
3. **attitude** sets the expressive stance. Each dimension maps through threshold
   bands (`high ≥ 0.75`, `mid ≥ 0.40`, else `low`) to concrete vocabulary
   (`high-voltage`, `street-casual`, `bold+defiant`, `razor`, …) and to one
   concrete expression directive per dimension. This is what makes two profiles'
   cards genuinely different — not just numerically different.
4. **behavior** fixes decision style, social posture, and communication style;
   the engine merges these with the attitude-derived tone/voice/risk/wit.
5. **capability** declares what the identity may attempt, each flagged
   `requires_approval` or not. Capabilities never expand permissions —
   `bounds.permissions` is the ceiling.

## How bounds dominate attitude

- The schema **requires** `bounds` and fixes `precedence` to the constant
  `"bounds-override-attitude"`. A profile without bounds, or with any other
  precedence value, fails validation — the engine refuses to run.
- `restateBounds()` flattens every bound into numbered rules and appends the
  composition law. The system prompt ends with: *"When in doubt between
  attitude and bounds, bounds win — always."*
- Bounds are restated in **all three** output forms, so a downstream runtime
  cannot consume the behavior config while dropping the constraints.

## Determinism and testing

- Pure function: same profile + same `now` → byte-identical card
  (asserted by test). `opts.now` injects the timestamp for tests.
- `lib/validate.js` is a zero-dependency JSON Schema subset validator driven
  by the actual schema file — the tests validate against the real schema,
  not a copy of its logic.
- Kill-rule gate (in `test/run-tests.js`): three distinct profiles must
  produce behavior cards differing on ≥ 3 config fields plus pairwise-distinct
  system prompts, or the build does not ship.

## Files

| Path | Role |
|---|---|
| `schema/attitude-schema.json` | Canonical JSON Schema (also served at `/attitude-schema.json`) |
| `engine/transform-core.js` | The pure transformer core (universal ESM: Node, browser module, worker) |
| `engine/transform.js` | Node entry: re-exports core + autoloads schema from disk |
| `lib/validate.js` | Zero-dep schema validator |
| `profiles/that-boy-hi-hat.json` | Reference implementation (provenance-labeled) |
| `profiles/fixtures/` | Differentiation fixtures (fictional, labeled `assumed`) |
| `index.html` | Interactive Pages demo (sliders + bounds checklist → live card) |
| `.well-known/agent-card.json` | A2A-style agent card |
| `discovery.txt`, `llms.txt` | Agent-readable surfaces |

## What this is not

Not a chatbot, not model training, not a rights grant. The engine produces
*behavioral configuration* — what an agent may say and do, and what it must
never do. Licensing, publishing, and spending always route through
`bounds.permissions.requires_approval` and `human_approval_triggers`.
