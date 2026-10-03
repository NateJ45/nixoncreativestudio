// Foundation, edit with care. The SERVER half of the plugin. EmDash imports this
// file as the plugin `entrypoint` and calls `createPlugin(options)` while the Worker
// starts. It does two things:
//   1. validates the content file again (descriptor.ts already did at config time)
//   2. serves two private routes the admin screens call:
//        GET  /_emdash/api/plugins/studio-help/content   the validated content
//        GET  /_emdash/api/plugins/studio-help/state     this user's "seen" record
//        POST /_emdash/api/plugins/studio-help/state     {action: "seen"|"reset", how?}
// The per-user record lives in the plugin's own key-value store (`ctx.kv`, a table in
// the site database), keyed by the signed-in user's id, so it follows the person to
// any browser. Routes are private (sign-in required, plus the `content:read`
// permission, which every admin role has) and answer `Cache-Control: private,
// no-store`, so nothing here can reach the public site or its cache.
import { definePlugin } from 'emdash';
import { makeSeenRecord, parseSeenRecord, serverKey } from './engine.ts';
import {
  HELP_PAGE_PATH,
  PLUGIN_ID,
  PLUGIN_VERSION,
  ROUTE_CONTENT,
  ROUTE_STATE,
  WIDGET_ID,
} from './constants.ts';
import { validateHelpFile } from './validate.ts';
import type { HelpFile, SeenRecord } from './types.ts';

export interface StudioHelpOptions {
  /** The parsed content file (JSON). Validated here and in descriptor.ts. */
  content: unknown;
}

interface StateInput {
  action?: unknown;
  how?: unknown;
}

export function createPlugin(options: StudioHelpOptions) {
  // Throws HelpContentError (one message listing every problem) on a bad file.
  const content: HelpFile = validateHelpFile(options.content, 'the studio-help content file');

  return definePlugin({
    id: PLUGIN_ID,
    version: PLUGIN_VERSION,
    capabilities: [],
    routes: {
      [ROUTE_CONTENT]: {
        permission: 'content:read',
        handler: async () => content,
      },
      [ROUTE_STATE]: {
        permission: 'content:read',
        handler: async (ctx) => {
          const userId = ctx.user?.id;
          if (!userId) return { seen: null as SeenRecord | null, persisted: false, userId: null };
          const key = serverKey(userId);

          if (ctx.request.method.toUpperCase() === 'POST') {
            const input = (ctx.input ?? {}) as StateInput;
            if (input.action === 'reset') {
              await ctx.kv.delete(key);
              return { seen: null as SeenRecord | null, persisted: true, userId };
            }
            if (input.action === 'seen') {
              const how = input.how === 'done' || input.how === 'skipped' ? input.how : 'auto';
              const record = makeSeenRecord(content.tour.id, how);
              await ctx.kv.set(key, record);
              return { seen: record as SeenRecord | null, persisted: true, userId };
            }
            throw new Error('studio-help: action must be "seen" or "reset"');
          }

          const stored = await ctx.kv.get<unknown>(key);
          return { seen: parseSeenRecord(stored), persisted: true, userId };
        },
      },
    },
    admin: {
      pages: [{ path: HELP_PAGE_PATH, label: 'Help', icon: 'question' }],
      widgets: [{ id: WIDGET_ID, size: 'full', title: 'Start here' }],
    },
  });
}

export default createPlugin;
