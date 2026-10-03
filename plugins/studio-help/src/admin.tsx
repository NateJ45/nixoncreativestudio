// Foundation, edit with care. The ADMIN half of the plugin: the module EmDash bundles
// into the admin app (descriptor.ts names it as `adminEntry`). It exports the three
// things the admin knows how to mount from a trusted plugin:
//   pages               the Help screen         (sidebar: Help)
//   widgets             the dashboard widget    ("Start here", also opens the first-run tour)
//   contentEditorPanels the per-screen note     (sidebar of every entry editor)
// Only the admin page loads this file. Nothing here is imported by a public page, so
// the public site's JavaScript, CSS and HTML are unchanged by the plugin.
import { HELP_PAGE_PATH, WIDGET_ID } from './constants.ts';
import { EditorPanel } from './ui/EditorPanel.tsx';
import { HelpPage } from './ui/HelpPage.tsx';
import { StartHereWidget } from './ui/StartHereWidget.tsx';

export const pages = { [HELP_PAGE_PATH]: HelpPage };

export const widgets = { [WIDGET_ID]: StartHereWidget };

export const contentEditorPanels = [
  {
    id: 'about-this-screen',
    title: 'About this screen',
    component: EditorPanel,
    // Show it first in the sidebar, above the host's own panels' default order.
    order: -10,
  },
];
