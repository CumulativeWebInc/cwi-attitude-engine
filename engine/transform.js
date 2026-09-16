/**
 * CWI Attitude Engine v1 — transform.js (Node entry)
 * Re-exports the universal core with schema autoload from disk:
 * transformAttitude(profile) works with no opts in Node.
 * For browsers/workers use engine/transform-core.js directly (type="module")
 * and pass opts.schema.
 */
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import {
  transformAttitude as coreTransform,
  ENGINE_VERSION,
  DIM_ORDER,
} from './transform-core.js';

function autoloadSchema() {
  const dir = dirname(fileURLToPath(import.meta.url));
  return JSON.parse(readFileSync(join(dir, '..', 'schema', 'attitude-schema.json'), 'utf8'));
}

export function transformAttitude(profile, opts = {}) {
  return coreTransform(profile, { schema: opts.schema || autoloadSchema(), now: opts.now });
}

export { ENGINE_VERSION, DIM_ORDER };
