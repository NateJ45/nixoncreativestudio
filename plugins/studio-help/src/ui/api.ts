// Safe to edit. The admin half's only network code: it reads the validated content
// and the user's "seen" record from the plugin's own routes (plugin.ts), and writes
// the record back. Plain `fetch` on purpose, so this file does not depend on the
// admin's internal client. The `X-EmDash-Request` header is the CSRF header every
// private EmDash route requires.
//
// Browser fallback: if the server cannot be reached, the "seen" record is kept in
// localStorage under a key that includes the user id (engine.localKey), so the tour
// still shows once per person per browser instead of looping or never showing. That
// is a fallback only; the server record is the one that follows a person across
// devices.
import { localKey, parseSeenRecord } from '../engine.ts';
import { PLUGIN_ID, ROUTE_CONTENT, ROUTE_STATE } from '../constants.ts';
import type { HelpFile, SeenRecord } from '../types.ts';

const BASE = `/_emdash/api/plugins/${PLUGIN_ID}`;

interface Envelope<T> {
  success: boolean;
  data?: T;
  error?: { code?: string; message?: string };
}

async function call<T>(route: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE}/${route}`, {
    credentials: 'same-origin',
    ...init,
    headers: {
      Accept: 'application/json',
      'X-EmDash-Request': '1',
      ...(init?.body ? { 'Content-Type': 'application/json' } : {}),
    },
  });
  let body: Envelope<T> | undefined;
  try {
    body = (await res.json()) as Envelope<T>;
  } catch {
    // not JSON
  }
  if (!res.ok || !body?.success || body.data === undefined) {
    throw new Error(body?.error?.message ?? `studio-help: ${route} answered ${res.status}`);
  }
  return body.data;
}

let contentPromise: Promise<HelpFile> | null = null;

/** The content, fetched once per page load and shared by every component. */
export function fetchContent(): Promise<HelpFile> {
  if (!contentPromise) {
    contentPromise = call<HelpFile>(ROUTE_CONTENT).catch((err) => {
      contentPromise = null; // let a later mount retry
      throw err;
    });
  }
  return contentPromise;
}

export interface StateResult {
  seen: SeenRecord | null;
  /** false when the server could not store it (no signed-in user id). */
  persisted: boolean;
}

/** The signed-in user's id, learned from the first state call; scopes the browser fallback. */
let knownUserId: string | null = null;

export async function fetchState(): Promise<StateResult> {
  const data = await call<{ seen: unknown; persisted: boolean; userId: string | null }>(
    ROUTE_STATE,
  );
  if (data.userId) knownUserId = data.userId;
  return { seen: parseSeenRecord(data.seen), persisted: data.persisted };
}

export async function postState(action: 'seen' | 'reset', how?: SeenRecord['how']): Promise<void> {
  await call(ROUTE_STATE, { method: 'POST', body: JSON.stringify({ action, how }) });
}

// ---- browser fallback ----

export function readLocalSeen(userId: string | null = knownUserId): SeenRecord | null {
  try {
    const raw = window.localStorage.getItem(localKey(userId));
    return raw ? parseSeenRecord(JSON.parse(raw)) : null;
  } catch {
    return null;
  }
}

export function writeLocalSeen(
  record: SeenRecord | null,
  userId: string | null = knownUserId,
): void {
  try {
    if (record) window.localStorage.setItem(localKey(userId), JSON.stringify(record));
    else window.localStorage.removeItem(localKey(userId));
  } catch {
    // storage blocked: nothing more to do
  }
}
