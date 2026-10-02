// Foundation, edit with care.
// Worker entry for EmDash on Cloudflare. Re-exports the plugin bridge and wires
// the scheduled handler (publishing scheduled posts, plugin cron).
import handler, { createScheduledHandler, PluginBridge } from '@emdash-cms/cloudflare/worker';

export { PluginBridge };
export default {
  ...handler,
  scheduled: createScheduledHandler(),
} satisfies ExportedHandler;
