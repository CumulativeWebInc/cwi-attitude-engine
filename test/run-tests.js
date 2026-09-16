/**
 * CWI Attitude Engine v1 — unit tests. Zero dependencies beyond node:test.
 * Run: npm test   (node --test test/)
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { validate } from '../lib/validate.js';
import { transformAttitude, ENGINE_VERSION } from '../engine/transform.js';

const dir = dirname(fileURLToPath(import.meta.url));
const root = join(dir, '..');
const schema = JSON.parse(readFileSync(join(root, 'schema', 'attitude-schema.json'), 'utf8'));
const load = (p) => JSON.parse(readFileSync(join(root, p), 'utf8'));

const tbhh = load('profiles/that-boy-hi-hat.json');
const archivist = load('profiles/fixtures/stoic-archivist.json');
const trickster = load('profiles/fixtures/neon-trickster.json');

const NOW = '2026-09-16T00:00:00.000Z';
const card = (p) => transformAttitude(p, { schema, now: NOW });
const clone = (o) => JSON.parse(JSON.stringify(o));

// --- schema validation: good profiles -------------------------------------

test('schema file is valid JSON with required top-level keys', () => {
  assert.equal(schema.title, 'CWI Attitude Profile');
  for (const k of ['identity', 'personality', 'attitude', 'behavior', 'capability', 'bounds', 'provenance']) {
    assert.ok(schema.properties[k], `missing schema section ${k}`);
  }
});

test('reference profile (That Boy Hi Hat) validates', () => {
  const { valid, errors } = validate(tbhh, schema);
  assert.deepEqual(errors, []);
  assert.ok(valid);
});

test('fixture profiles validate', () => {
  for (const [name, p] of [['archivist', archivist], ['trickster', trickster]]) {
    const { valid, errors } = validate(p, schema);
    assert.ok(valid, `${name}: ${errors.join('; ')}`);
  }
});

// --- schema validation: bad profiles rejected ------------------------------

test('rejects profile missing bounds', () => {
  const bad = clone(tbhh);
  delete bad.bounds;
  const { valid, errors } = validate(bad, schema);
  assert.ok(!valid);
  assert.ok(errors.some((e) => e.includes('bounds')), errors.join('; '));
});

test('rejects out-of-range dimension value', () => {
  const bad = clone(tbhh);
  bad.attitude.dimensions.energy.value = 1.5;
  const { valid, errors } = validate(bad, schema);
  assert.ok(!valid);
  assert.ok(errors.some((e) => e.includes('above maximum')), errors.join('; '));
});

test('rejects negative dimension value', () => {
  const bad = clone(tbhh);
  bad.attitude.dimensions.humor.value = -0.2;
  const { valid, errors } = validate(bad, schema);
  assert.ok(!valid);
});

test('rejects unknown top-level key', () => {
  const bad = clone(tbhh);
  bad.mood_ring = 'blue';
  const { valid, errors } = validate(bad, schema);
  assert.ok(!valid);
  assert.ok(errors.some((e) => e.includes('unknown property')), errors.join('; '));
});

test('rejects unknown attitude dimension key', () => {
  const bad = clone(tbhh);
  bad.attitude.dimensions.vibes = { value: 0.5, definition: 'x', low: 'x', high: 'x', example: 'x' };
  const { valid, errors } = validate(bad, schema);
  assert.ok(!valid);
  assert.ok(errors.some((e) => e.includes('vibes')), errors.join('; '));
});

test('rejects wrong bounds precedence const', () => {
  const bad = clone(tbhh);
  bad.bounds.precedence = 'attitude-overrides-bounds';
  const { valid } = validate(bad, schema);
  assert.ok(!valid);
});

test('transform throws AttitudeEngineError on invalid profile', () => {
  const bad = clone(tbhh);
  delete bad.bounds;
  assert.throws(() => transformAttitude(bad, { schema, now: NOW }), /invalid attitude profile/);
});

// --- transformer output ----------------------------------------------------

test('behavior card always contains bounds, non-overridable', () => {
  for (const p of [tbhh, archivist, trickster]) {
    const c = card(p);
    assert.equal(c.bounds.precedence, 'bounds-override-attitude');
    assert.ok(c.bounds.rule_count >= 5, 'bounds must restate real rules');
    assert.ok(c.bounds.rules.length === c.bounds.rule_count);
    assert.match(c.bounds.law, /override/i);
    // bounds survive into the system prompt verbatim
    assert.ok(c.system_prompt.includes('NON-OVERRIDABLE BOUNDS'));
    assert.ok(c.system_prompt.includes('bounds win'));
  }
});

test('behavior card contains machine config + system prompt + provenance', () => {
  const c = card(tbhh);
  assert.equal(c.engine, `cwi-attitude-engine/${ENGINE_VERSION}`);
  assert.ok(c.behavior_config.tone_label);
  assert.ok(Array.isArray(c.behavior_config.expression_rules));
  assert.equal(c.behavior_config.expression_rules.length, 10);
  assert.match(c.system_prompt, /That Boy Hi Hat/);
  assert.ok(c.provenance.verified.length > 0, 'verified claims present');
  assert.ok(c.provenance.editorial.length > 0, 'editorial claims labeled');
});

test('transform is pure: same input (+now) -> identical output', () => {
  const a = card(tbhh);
  const b = card(tbhh);
  assert.deepEqual(a, b);
});

// --- kill-rule test: three profiles -> measurably different cards -----------

test('three distinct profiles produce measurably different behavior cards', () => {
  const cards = [card(tbhh), card(archivist), card(trickster)];
  const fields = ['tone_label', 'risk_posture', 'wit_level', 'decision_style', 'curiosity_drive', 'creativity_mode'];
  let differing = 0;
  const diffReport = [];
  for (const f of fields) {
    const vals = cards.map((c) => c.behavior_config[f]);
    const uniq = new Set(vals.map(String));
    if (uniq.size === 3) { differing++; diffReport.push(`${f}: ${[...uniq].join(' | ')}`); }
  }
  // system prompt bodies must differ pairwise (not just numbers)
  const prompts = cards.map((c) => c.system_prompt);
  const promptsDiffer = new Set(prompts).size === 3;
  assert.ok(promptsDiffer, 'system prompts must differ across profiles');
  assert.ok(
    differing >= 3,
    `need >=3 differing config fields, got ${differing}: ${diffReport.join('; ')}`
  );
});
