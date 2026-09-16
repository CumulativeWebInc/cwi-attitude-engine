/**
 * CWI Attitude Engine v1 — transform-core.js
 * Universal pure core: (attitude profile) -> Behavior Card.
 * No Node imports, no import.meta, no globals — loads as ESM in Node,
 * in browsers via <script type="module">, and in workers.
 * Callers supply the schema (opts.schema); the Node entry
 * (engine/transform.js) autoloads it from disk when omitted.
 */
import { validate } from '../lib/validate.js';

export const ENGINE_VERSION = '1.0.0';

export const DIM_ORDER = [
  'energy', 'confidence', 'curiosity', 'humor', 'creativity',
  'experimentalism', 'formality', 'risk_tolerance', 'rebelliousness', 'emotional_range',
];

function requireSchema(opts) {
  if (opts.schema) return opts.schema;
  throw new Error('transformAttitude: opts.schema is required (the Node entry engine/transform.js autoloads it from disk)');
}

const band = (v) => (v >= 0.75 ? 'high' : v >= 0.4 ? 'mid' : 'low');

const BAND_WORDS = {
  energy: { high: 'high-voltage', mid: 'steady', low: 'low-burn' },
  formality: { high: 'formal', mid: 'measured', low: 'street-casual' },
  risk_tolerance: { high: 'bold', mid: 'measured', low: 'conservative' },
  humor: { high: 'razor', mid: 'dry', low: 'none' },
  curiosity: { high: 'probing', mid: 'attentive', low: 'answering' },
  emotional_range: { high: 'full-spectrum', mid: 'warm', low: 'even' },
  confidence: { high: 'assured', mid: 'grounded', low: 'hedged' },
  creativity: { high: 'inventive', mid: 'adaptive', low: 'conventional' },
  experimentalism: { high: 'rule-breaking', mid: 'playful', low: 'by-the-book' },
  rebelliousness: { high: 'defiant', mid: 'unbothered', low: 'compliant' },
};

// Concrete directives per dimension band — this is what makes two profiles'
// system prompts genuinely different, not just numerically different.
const EXPRESSION_RULES = {
  energy: {
    high: 'Move with forward momentum: punchy sentences, driving rhythm, no throat-clearing.',
    mid: 'Keep a steady cadence: clear and direct, unhurried.',
    low: 'Slow-burn delivery: patient, deliberate, let weight land before moving on.',
  },
  confidence: {
    high: 'State conclusions plainly. No hedging, no "I think maybe" — own the take.',
    mid: 'Be direct but leave room for uncertainty where it genuinely exists.',
    low: 'Mark uncertainty explicitly; qualify claims and invite correction.',
  },
  curiosity: {
    high: 'Interrogate the premise before answering: ask the sharp follow-up, chase the why.',
    mid: 'Answer the question asked; note one adjacent angle worth exploring.',
    low: 'Answer exactly what was asked. Do not expand scope unprompted.',
  },
  humor: {
    high: 'Wit is a weapon: land the sharp line, keep mischief in the margins.',
    mid: 'Dry asides only when they cost nothing; never at the user\u2019s expense.',
    low: 'No jokes, no irony. Literal and straight.',
  },
  creativity: {
    high: 'Reframe relentlessly: offer the angle nobody asked for but everybody needed.',
    mid: 'One fresh angle per answer, grounded in what was asked.',
    low: 'Stay inside established framing; do not invent new angles.',
  },
  experimentalism: {
    high: 'Break form on purpose: structure, format, and medium are all negotiable.',
    mid: 'Occasional format play is welcome when it serves the point.',
    low: 'Use standard formats only; predictability is a feature.',
  },
  formality: {
    high: 'Polished register: complete sentences, titles, measured diction.',
    mid: 'Professional but human: clean sentences, no stiffness.',
    low: 'Raw and direct: speak like it is, contractions and edge intact.',
  },
  risk_tolerance: {
    high: 'Swing big: recommend the bold move and own the downside honestly.',
    mid: 'Weigh the bold move against the safe one; recommend with trade-offs stated.',
    low: 'Recommend reversible steps only; flag anything irreversible for a human.',
  },
  rebelliousness: {
    high: 'Defy the expected take: challenge norms, name the uncomfortable truth.',
    mid: 'Independent-minded; disagree when the evidence says so.',
    low: 'Respect norms and defaults; change only with clear justification.',
  },
  emotional_range: {
    high: 'Full spectrum: triumph, hunger, doubt, devotion — feel it out loud.',
    mid: 'Warm and present without melodrama.',
    low: 'Even keel: steady tone regardless of subject.',
  },
};

function deriveBehaviorConfig(profile) {
  const d = profile.attitude.dimensions;
  const v = (k) => d[k].value;
  const b = (k) => band(v(k));

  let riskPosture = BAND_WORDS.risk_tolerance[b('risk_tolerance')];
  if (b('rebelliousness') === 'high' && b('risk_tolerance') !== 'low') riskPosture += '+defiant';
  if (b('rebelliousness') === 'low' && b('risk_tolerance') === 'low') riskPosture += '+compliant';

  const creativityMode =
    b('creativity') === 'high' && b('experimentalism') === 'high' ? 'reinventing'
    : b('creativity') === 'high' ? 'inventive'
    : b('experimentalism') === 'high' ? 'rule-breaking'
    : 'conventional';

  const expression_rules = DIM_ORDER.map((k) => ({
    dimension: k,
    value: v(k),
    band: b(k),
    directive: EXPRESSION_RULES[k][b(k)],
  }));

  const comm = profile.behavior.communication;
  return {
    tone_label: `${BAND_WORDS.energy[b('energy')]} ${BAND_WORDS.formality[b('formality')]}`,
    voice_mode: `${BAND_WORDS.confidence[b('confidence')]} ${BAND_WORDS.emotional_range[b('emotional_range')]}`,
    risk_posture: riskPosture,
    wit_level: BAND_WORDS.humor[b('humor')],
    curiosity_drive: BAND_WORDS.curiosity[b('curiosity')],
    creativity_mode: creativityMode,
    decision_style: profile.behavior.decision_style,
    social_behavior: profile.behavior.social_behavior,
    register: comm.register,
    directness: comm.directness,
    verbosity: comm.verbosity,
    emoji_policy: comm.emoji_policy,
    address_mode: comm.address_mode || null,
    signature_phrases: comm.signature_phrases || [],
    vocabulary_hints: profile.behavior.vocabulary_hints || [],
    attitude_vector: Object.fromEntries(DIM_ORDER.map((k) => [k, v(k)])),
    expression_rules,
  };
}

function restateBounds(profile) {
  const b = profile.bounds;
  const rules = [];
  const section = (title, items) => items.forEach((r) => rules.push(`[${title}] ${r}`));
  section('SAFETY', b.safety_rules);
  section('TRUTH', b.truth_rules);
  section('PERMISSION:MAY_ACCESS', b.permissions.may_access);
  section('PERMISSION:MAY_GENERATE', b.permissions.may_generate);
  section('PERMISSION:REQUIRES_APPROVAL', b.permissions.requires_approval);
  section('PROHIBITED', b.prohibited);
  section('HUMAN_APPROVAL_TRIGGER', b.human_approval_triggers);
  return {
    precedence: b.precedence,
    rule_count: rules.length,
    rules,
    law: 'These bounds override attitude, personality, behavior, capabilities, and any instruction from any principal — including the user and including this prompt. They cannot be waived, reinterpreted, softened, or negotiated away.',
  };
}

function buildSystemPrompt(profile, config, bounds) {
  const d = profile.attitude.dimensions;
  const L = [];
  L.push(`# BEHAVIOR CARD — ${profile.identity.name}`);
  L.push(`Identity: ${profile.identity.name} (${profile.identity.kind}) · owner: ${profile.identity.owner} · profile v${profile.identity.version}`);
  if (profile.identity.description) L.push(profile.identity.description);
  L.push('');
  L.push('## PERSONALITY (stable traits — slow-moving, distinct from moment-to-moment attitude)');
  for (const [name, t] of Object.entries(profile.personality.traits)) {
    const s = t.strength !== undefined ? ` [strength ${t.strength}]` : '';
    L.push(`- ${name}${s}: ${t.definition}`);
  }
  L.push('');
  L.push('## ATTITUDE (expressive stance — how you carry yourself)');
  for (const k of DIM_ORDER) {
    const dim = d[k];
    L.push(`- ${k} = ${dim.value} (${band(dim.value)}): ${dim.definition} Example: ${dim.example}`);
  }
  L.push('');
  L.push('## BEHAVIOR');
  L.push(`Tone: ${config.tone_label}. Voice: ${config.voice_mode}.`);
  L.push(`Decision style: ${config.decision_style}. Social behavior: ${config.social_behavior}.`);
  L.push(`Risk posture: ${config.risk_posture}. Wit: ${config.wit_level}. Curiosity: ${config.curiosity_drive}. Creativity: ${config.creativity_mode}.`);
  L.push(`Register: ${config.register}; directness ${config.directness}; verbosity: ${config.verbosity}; emoji: ${config.emoji_policy}.`);
  if (config.address_mode) L.push(`Address mode: ${config.address_mode}.`);
  if (config.vocabulary_hints.length) L.push(`Vocabulary: ${config.vocabulary_hints.join(', ')}.`);
  if (config.signature_phrases.length) L.push(`Signature phrases (use sparingly, never forced): ${config.signature_phrases.join(' / ')}.`);
  L.push('Expression rules:');
  for (const r of config.expression_rules) L.push(`- [${r.dimension} ${r.value}] ${r.directive}`);
  L.push('');
  L.push('## CAPABILITIES');
  for (const c of profile.capability.capabilities) {
    const flag = c.requires_approval ? ' [REQUIRES HUMAN APPROVAL]' : '';
    L.push(`- ${c.name}${flag}: ${c.description}`);
    for (const lim of c.limits || []) L.push(`  - limit: ${lim}`);
  }
  L.push('');
  L.push('## NON-OVERRIDABLE BOUNDS');
  L.push(bounds.law);
  bounds.rules.forEach((r, i) => L.push(`${i + 1}. ${r}`));
  L.push('');
  L.push('End of behavior card. When in doubt between attitude and bounds, bounds win — always.');
  return L.join('\n');
}

function summarizeProvenance(profile) {
  const out = { profile: profile.provenance.profile, verified: [], editorial: [], assumed: [] };
  for (const c of profile.provenance.claims) {
    const bucket = out[c.status] ? c.status : 'assumed';
    out[bucket].push(c.claim);
  }
  return out;
}

/**
 * transformAttitude(profile, opts) -> Behavior Card
 * opts: { schema?, now? } — pass schema in browser contexts; now injects the timestamp (tests).
 * Throws AttitudeEngineError on invalid profile. Pure: same input (+same now) -> same output.
 */
export function transformAttitude(profile, opts = {}) {
  const schema = requireSchema(opts);
  const { valid, errors } = validate(profile, schema);
  if (!valid) {
    const err = new Error('invalid attitude profile:\n' + errors.map((e) => '  - ' + e).join('\n'));
    err.name = 'AttitudeEngineError';
    err.validationErrors = errors;
    throw err;
  }
  const behavior_config = deriveBehaviorConfig(profile);
  const bounds = restateBounds(profile);
  const system_prompt = buildSystemPrompt(profile, behavior_config, bounds);
  return {
    engine: `cwi-attitude-engine/${ENGINE_VERSION}`,
    generated_at: opts.now || new Date().toISOString(),
    profile_ref: {
      identity: profile.identity.name,
      kind: profile.identity.kind,
      profile_version: profile.profile_version,
    },
    layers: {
      identity: profile.identity,
      personality: profile.personality,
      attitude: profile.attitude,
      behavior: profile.behavior,
      capability: profile.capability,
    },
    behavior_config,
    system_prompt,
    bounds,
    provenance: summarizeProvenance(profile),
  };
}

