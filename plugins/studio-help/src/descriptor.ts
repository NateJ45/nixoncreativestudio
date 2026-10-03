// Foundation, edit with care. The function you call in astro.config.mjs:
//
//   import helpContent from './cms/help/tour.json' with { type: 'json' };
//   import { studioHelp } from './plugins/studio-help/src/descriptor.ts';
//   emdash({ ..., plugins: [studioHelp({ content: helpContent })] })
//
// It validates the content file RIGHT HERE, at config time, so a mistake in the JSON
// stops `astro dev` / `astro build` with one readable message instead of surfacing as
// a blank admin screen later. It returns the descriptor EmDash needs: where the server
// half and the admin half live, and the page and widget the admin should list.
//
// This file imports nothing from "emdash" or React on purpose, so astro.config.mjs can
// load it without pulling the admin or the Worker runtime into the config step.
import { fileURLToPath } from 'node:url';
import { HELP_PAGE_PATH, PLUGIN_ID, PLUGIN_VERSION, WIDGET_ID } from './constants.ts';
import { validateHelpFile } from './validate.ts';

export interface StudioHelpDescriptorOptions {
  /** The parsed content file. */
  content: unknown;
  /** Name shown in the error message if the file is bad. */
  source?: string;
}

/** Vite and EmDash want forward slashes in a module specifier, also on Windows. */
function here(rel: string): string {
  return fileURLToPath(new URL(rel, import.meta.url)).replace(/\\/g, '/');
}

export function studioHelp(options: StudioHelpDescriptorOptions) {
  // Fail early, with every problem listed.
  const content = validateHelpFile(options.content, options.source ?? 'cms/help/tour.json');
  return {
    id: PLUGIN_ID,
    version: PLUGIN_VERSION,
    // Native format: this plugin ships a React admin entry, which a sandboxed plugin
    // cannot. It runs in the Worker with the site, not in an isolate.
    format: 'native' as const,
    entrypoint: here('./plugin.ts'),
    adminEntry: here('./admin.tsx'),
    options: { content },
    adminPages: [{ path: HELP_PAGE_PATH, label: 'Help', icon: 'question' }],
    adminWidgets: [{ id: WIDGET_ID, size: 'full' as const, title: 'Start here' }],
  };
}
