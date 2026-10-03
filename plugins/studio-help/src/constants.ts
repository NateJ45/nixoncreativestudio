// Foundation, edit with care. Values shared by the server half (plugin.ts), the
// descriptor (descriptor.ts) and the admin half (admin.tsx). The id appears in the
// plugin's API URLs, so changing it means changing it everywhere at once; that is
// why it is one constant.
export const PLUGIN_ID = 'studio-help';
export const PLUGIN_VERSION = '1.0.0';

/** The route (under /_emdash/api/plugins/<id>/) that returns the validated content. */
export const ROUTE_CONTENT = 'content';
/** The route that reads and writes the per-user "seen" record. */
export const ROUTE_STATE = 'state';

/** Admin page path (relative to /_emdash/admin/plugins/<id>). */
export const HELP_PAGE_PATH = '/help';
export const WIDGET_ID = 'start-here';

/** The page that hosts the Help screen in the admin SPA. */
export const HELP_PAGE_URL = `/_emdash/admin/plugins/${PLUGIN_ID}${HELP_PAGE_PATH}`;
