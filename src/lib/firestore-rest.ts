// src/lib/firestore-rest.ts
// Server-side Firestore writes authenticated AS the requesting user, via the
// Firestore REST API. The server's own firebase client SDK is unauthenticated
// (no service-account key), so it can only read docs that rules expose with
// `get: if true`. For writes the server instead replays the user's Firebase ID
// token so Firestore security rules evaluate them as the owner — the server
// still controls exactly which fields are written and when.

const PROJECT = () => process.env.FIREBASE_PROJECT_ID || '';
const BASE = () =>
  `https://firestore.googleapis.com/v1/projects/${PROJECT()}/databases/(default)/documents`;

function encodeValue(v: any): any {
  if (v === null || v === undefined) return { nullValue: null };
  if (typeof v === 'string') return { stringValue: v };
  if (typeof v === 'boolean') return { booleanValue: v };
  if (typeof v === 'number') return Number.isInteger(v) ? { integerValue: String(v) } : { doubleValue: v };
  if (v instanceof Date) return { timestampValue: v.toISOString() };
  if (Array.isArray(v)) return { arrayValue: { values: v.map(encodeValue) } };
  if (typeof v === 'object') {
    const fields: Record<string, any> = {};
    for (const k of Object.keys(v)) fields[k] = encodeValue(v[k]);
    return { mapValue: { fields } };
  }
  return { stringValue: String(v) };
}

function decodeValue(v: any): any {
  if (!v) return null;
  if ('stringValue' in v) return v.stringValue;
  if ('integerValue' in v) return Number(v.integerValue);
  if ('doubleValue' in v) return v.doubleValue;
  if ('booleanValue' in v) return v.booleanValue;
  if ('timestampValue' in v) return v.timestampValue;
  if ('nullValue' in v) return null;
  if ('arrayValue' in v) return (v.arrayValue.values ?? []).map(decodeValue);
  if ('mapValue' in v) {
    const out: Record<string, any> = {};
    const fields = v.mapValue.fields ?? {};
    for (const k of Object.keys(fields)) out[k] = decodeValue(fields[k]);
    return out;
  }
  return null;
}

/** GET a document. Returns decoded data or null if it does not exist. */
export async function fsGet(token: string, docPath: string): Promise<any | null> {
  if (!PROJECT()) throw new Error('FIREBASE_PROJECT_ID is not set.');
  const res = await fetch(`${BASE()}/${docPath}`, {
    headers: { Authorization: `Bearer ${token}` },
    signal: AbortSignal.timeout(10_000),
  });
  if (res.status === 404) return null;
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`fsGet ${docPath} failed (${res.status}): ${text.slice(0, 200)}`);
  }
  const data = await res.json();
  const fields = data?.fields ?? {};
  const out: Record<string, any> = {};
  for (const k of Object.keys(fields)) out[k] = decodeValue(fields[k]);
  return out;
}

/** PATCH (merge) an existing document. Only listed top-level fields change. */
export async function fsPatch(token: string, docPath: string, fields: Record<string, any>): Promise<void> {
  if (!PROJECT()) throw new Error('FIREBASE_PROJECT_ID is not set.');
  const keys = Object.keys(fields);
  if (keys.length === 0) return;
  const mask = keys.map((k) => `updateMask.fieldPaths=${encodeURIComponent(k)}`).join('&');
  const url = `${BASE()}/${docPath}?currentDocument.exists=true&${mask}`;
  const body = { fields: Object.fromEntries(keys.map((k) => [k, encodeValue(fields[k])])) };
  const res = await fetch(url, {
    method: 'PATCH',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(10_000),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`fsPatch ${docPath} failed (${res.status}): ${text.slice(0, 200)}`);
  }
}

/**
 * CREATE a document in a collection (optionally with a fixed id).
 * Throws if a document with that id already exists (used for atomic receipt
 * reservation / duplicate detection).
 */
export async function fsCreate(
  token: string,
  collectionPath: string,
  fields: Record<string, any>,
  docId?: string
): Promise<string> {
  if (!PROJECT()) throw new Error('FIREBASE_PROJECT_ID is not set.');
  const suffix = docId ? `?documentId=${encodeURIComponent(docId)}` : '';
  const url = `${BASE()}/${collectionPath}${suffix}`;
  const body = { fields: Object.fromEntries(Object.keys(fields).map((k) => [k, encodeValue(fields[k])])) };
  const res = await fetch(url, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(10_000),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`fsCreate ${collectionPath} failed (${res.status}): ${text.slice(0, 200)}`);
  }
  const data = await res.json();
  const name: string = data?.name ?? '';
  return name.split('/').pop() ?? '';
}

/**
 * RUN a structured query authenticated as the user (must satisfy rules for
 * `list`). `structuredQuery.from` may use `allDescendants` to reach
 * subcollections. Returns an array of decoded documents.
 */
export async function fsQuery(token: string, structuredQuery: any): Promise<any[]> {
  if (!PROJECT()) throw new Error('FIREBASE_PROJECT_ID is not set.');
  const url = `${BASE()}:runQuery`;
  const res = await fetch(url, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ structuredQuery }),
    signal: AbortSignal.timeout(15_000),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`fsQuery failed (${res.status}): ${text.slice(0, 200)}`);
  }
  const rows: any[] = await res.json();
  const docs: any[] = [];
  for (const row of rows) {
    const fields = row?.document?.fields;
    if (!fields) continue;
    const out: Record<string, any> = {};
    for (const k of Object.keys(fields)) out[k] = decodeValue(fields[k]);
    const name: string = row.document.name ?? '';
    out.id = name.split('/').pop() ?? '';
    docs.push(out);
  }
  return docs;
}
