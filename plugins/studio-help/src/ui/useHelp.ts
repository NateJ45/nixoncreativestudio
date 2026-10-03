// Safe to edit. One hook that every screen uses to get the content, plus the small
// "tour controller" that records the seen state when a tour ends.
import { useCallback, useEffect, useState } from 'react';
import { makeSeenRecord } from '../engine.ts';
import type { HelpFile, SeenRecord } from '../types.ts';
import { fetchContent, postState, writeLocalSeen } from './api.ts';

export interface HelpState {
  content: HelpFile | null;
  error: string | null;
}

export function useHelpContent(): HelpState {
  const [state, setState] = useState<HelpState>({ content: null, error: null });
  useEffect(() => {
    let alive = true;
    fetchContent().then(
      (content) => alive && setState({ content, error: null }),
      (err: unknown) =>
        alive &&
        setState({ content: null, error: err instanceof Error ? err.message : String(err) }),
    );
    return () => {
      alive = false;
    };
  }, []);
  return state;
}

/**
 * Record that this user has seen the tour: on the server first, and in the browser
 * fallback too (so a server hiccup cannot make the tour loop).
 */
export function useRecordSeen(tourId: string | undefined) {
  return useCallback(
    (how: SeenRecord['how']) => {
      if (!tourId) return;
      writeLocalSeen(makeSeenRecord(tourId, how));
      postState('seen', how).catch(() => {
        // The browser copy above already keeps it to once per browser.
      });
    },
    [tourId],
  );
}
