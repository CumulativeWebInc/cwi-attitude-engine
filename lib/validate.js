/**
 * CWI Attitude Engine — zero-dependency JSON Schema validator (subset).
 * Validates an Attitude Profile against schema/attitude-schema.json.
 *
 * Supports: type, required, properties, additionalProperties:false,
 * patternProperties, items, enum, const, minimum/maximum, minLength,
 * minItems, minProperties, pattern, $ref (local pointers only).
 * Zero dependencies. Works in Node (ESM) and in the browser (classic script).
 */

function resolveRef(root, ref) {
  if (!ref.startsWith('#/')) throw new Error('only local $refs supported: ' + ref);
  const parts = ref.slice(2).split('/').map((p) => p.replace(/~1/g, '/').replace(/~0/g, '~'));
  let node = root;
  for (const p of parts) {
    if (node == null || typeof node !== 'object' || !(p in node)) {
      throw new Error('unresolvable $ref: ' + ref);
    }
    node = node[p];
  }
  return node;
}

function typeOf(v) {
  if (v === null) return 'null';
  if (Array.isArray(v)) return 'array';
  return typeof v;
}

function checkType(v, t) {
  if (t === 'integer') return typeof v === 'number' && Number.isInteger(v);
  if (t === 'number') return typeof v === 'number' && Number.isFinite(v);
  return typeOf(v) === t;
}

/**
 * Validate value against schema. Returns { valid: boolean, errors: string[] }.
 */
export function validate(value, schema, root = schema, path = '$') {
  const errors = [];
  const push = (p, msg) => errors.push(`${p}: ${msg}`);

  function walk(v, s, p) {
    if (s.$ref) s = resolveRef(root, s.$ref);
    if (s.const !== undefined && JSON.stringify(v) !== JSON.stringify(s.const)) {
      push(p, `must equal ${JSON.stringify(s.const)}`);
    }
    if (s.enum && !s.enum.some((e) => JSON.stringify(e) === JSON.stringify(v))) {
      push(p, `must be one of ${JSON.stringify(s.enum)}`);
    }
    if (s.type) {
      const types = Array.isArray(s.type) ? s.type : [s.type];
      if (!types.some((t) => checkType(v, t))) {
        push(p, `expected type ${types.join('|')}, got ${typeOf(v)}`);
        return;
      }
    }
    if (typeof v === 'string') {
      if (s.minLength !== undefined && v.length < s.minLength) push(p, `shorter than minLength ${s.minLength}`);
      if (s.maxLength !== undefined && v.length > s.maxLength) push(p, `longer than maxLength ${s.maxLength}`);
      if (s.pattern && !new RegExp(s.pattern).test(v)) push(p, `does not match pattern ${s.pattern}`);
    }
    if (typeof v === 'number') {
      if (s.minimum !== undefined && v < s.minimum) push(p, `below minimum ${s.minimum}`);
      if (s.maximum !== undefined && v > s.maximum) push(p, `above maximum ${s.maximum}`);
    }
    if (Array.isArray(v)) {
      if (s.minItems !== undefined && v.length < s.minItems) push(p, `fewer than minItems ${s.minItems}`);
      if (s.maxItems !== undefined && v.length > s.maxItems) push(p, `more than maxItems ${s.maxItems}`);
      if (s.items) v.forEach((item, i) => walk(item, s.items, `${p}[${i}]`));
    }
    if (v !== null && typeof v === 'object' && !Array.isArray(v)) {
      const keys = Object.keys(v);
      if (s.minProperties !== undefined && keys.length < s.minProperties) {
        push(p, `fewer than minProperties ${s.minProperties}`);
      }
      for (const req of s.required || []) {
        if (!(req in v)) push(p, `missing required property '${req}'`);
      }
      const propSchemas = s.properties || {};
      const patterns = Object.entries(s.patternProperties || {});
      for (const k of keys) {
        const kp = `${p}.${k}`;
        if (k in propSchemas) { walk(v[k], propSchemas[k], kp); continue; }
        let matched = false;
        for (const [pat, ps] of patterns) {
          if (new RegExp(pat).test(k)) { walk(v[k], ps, kp); matched = true; break; }
        }
        if (!matched && s.additionalProperties === false) {
          push(p, `unknown property '${k}' (additionalProperties is false)`);
        }
      }
    }
  }

  walk(value, schema, path);
  return { valid: errors.length === 0, errors };
}

export const VALIDATOR_VERSION = '1.0.0';

// Classic-script attach (browser / non-module use)
if (typeof globalThis !== 'undefined') {
  globalThis.AttitudeValidator = { validate, VALIDATOR_VERSION };
}
