# CWI Attitude Engine v1

Turn identity + attitude into agent behavior. A pure, zero-dependency function
that takes a machine-readable Attitude Profile and emits a **Behavior Card**:

- **(a)** `behavior_config` — machine-readable behavior JSON
- **(b)** `system_prompt` — system-prompt-grade instruction block for an agent runtime
- **(c)** `bounds` — the profile's bounds restated as non-overridable rules

Five layers — identity, personality, attitude, behavior, capability — composed
**under** a mandatory `bounds` block. Bounds always override attitude:
`precedence: "bounds-override-attitude"` is structural, not advisory.

## Use it

```js
import { transformAttitude } from './engine/transform.js';
import profile from './profiles/that-boy-hi-hat.json' with { type: 'json' };

const card = transformAttitude(profile);
console.log(card.behavior_config.tone_label); // "high-voltage street-casual"
console.log(card.system_prompt);              // prompt-ready block
console.log(card.bounds.precedence);          // "bounds-override-attitude"
```

In the browser: `<script src="engine/transform.js"></script>` exposes
`globalThis.AttitudeEngine.transformAttitude` (pass `{ schema }`; fetch
`schema/attitude-schema.json` first).

## Test

```
npm test   # 14/14 green — node --test, zero dependencies
```

## Live demo

https://cumulativewebinc.github.io/cwi-attitude-engine/ — sliders for all ten
attitude dimensions, a bounds checklist, and a live-regenerating behavior card.

## Machine surfaces

- `/attitude-schema.json` — the canonical schema
- `/.well-known/agent-card.json` — A2A-style agent card
- `/discovery.txt`, `/llms.txt` — agent-readable descriptions

## Truth rules

Reference profile claims carry provenance (`verified` / `editorial` / `assumed`).
Sonic descriptors are editorial — never audio analysis. No endorsements,
integrations, users, or adoption are claimed. See `ARCHITECTURE.md`.
