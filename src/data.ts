import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import type { Dataset } from './types.js';

const LIVE_URL = 'https://www.globalsolo.global/data/banking-access-index.json';
const REFRESH_TIMEOUT_MS = 4000;

const here = dirname(fileURLToPath(import.meta.url));
const SNAPSHOT_PATH = join(here, '..', 'data', 'banking-access-index.json');

export interface LoadedDataset {
  data: Dataset;
  /** 'live' = fetched from globalsolo.global this session. 'snapshot' = the copy shipped in this package. */
  origin: 'live' | 'snapshot';
  /** Present when a live refresh was attempted and did not complete. */
  refresh_error?: string;
}

let cached: LoadedDataset | null = null;

async function readSnapshot(): Promise<Dataset> {
  const raw = await readFile(SNAPSHOT_PATH, 'utf8');
  return JSON.parse(raw) as Dataset;
}

async function fetchLive(): Promise<Dataset> {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), REFRESH_TIMEOUT_MS);
  try {
    const res = await fetch(LIVE_URL, { signal: ctrl.signal });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return (await res.json()) as Dataset;
  } finally {
    clearTimeout(timer);
  }
}

/**
 * The live copy is tried first because a claim's value here is its verification date.
 * The bundled snapshot is the fallback, and the origin is reported to the caller either way
 * rather than being hidden behind a single answer.
 */
export async function loadDataset(): Promise<LoadedDataset> {
  if (cached) return cached;
  try {
    const data = await fetchLive();
    cached = { data, origin: 'live' };
  } catch (err) {
    const data = await readSnapshot();
    cached = {
      data,
      origin: 'snapshot',
      refresh_error: err instanceof Error ? err.message : String(err),
    };
  }
  return cached;
}

export function provenanceFooter(d: LoadedDataset): Record<string, unknown> {
  return {
    dataset: d.data.name,
    verified_at: d.data.verified_at,
    mined_at: d.data.mined_at,
    source: d.origin === 'live' ? LIVE_URL : 'bundled snapshot shipped with this package',
    origin: d.origin,
    ...(d.refresh_error ? { refresh_error: d.refresh_error } : {}),
    doi: 'https://doi.org/10.5281/zenodo.21336392',
    license: d.data.license,
    attribution: d.data.attribution,
  };
}
