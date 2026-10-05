# Live-system writes: plan the handoff

Applies to every session. Source: vault gotcha `classifier-blocks-live-writes-plan-the-handoff` (it has bitten Crestview, First Baptist Muncie, FRT and this studio the same way).

**Writes to a live, shared system are refused in auto mode even when Nathan says yes in chat.** Here that means Cloudways calls through studio-status (writes were blocked 2026-09-05; reads went through), the Cloudflare dashboard or API (zone rules, Workers settings, D1, R2, KV), production EmDash data (`cms:production-load`, `cms:tidy`), and any live Google Sheet or Apps Script. A refusal applies to the outcome, not the tool: do not retry it through the clipboard, Chrome, computer use or a different CLI.

## The pattern that works

1. Do everything reversible locally: edit, test, build the artifact.
2. Hand Nathan one artifact (a file, a dry-run summary, a single command) and a numbered list of exactly what to run, in order, paste-ready.
3. Make the live-side step safe to repeat (idempotent, backups first, `--dry-run` first) so a half-finished run can just be run again.
4. Verify afterwards with read-only calls, which are allowed (`curl -L`, GET requests, read-only dashboard or API queries).
5. Never retry the refused action through a different tool.

Switching the session to ask mode, so Nathan approves each call, has also worked. A standing permission can work too: Nathan allow-lists one narrow platform command himself in the project's `.claude/settings.local.json` (push or pull style, never "run anything"), deployed from a folder holding only the artifact, with each run proven by a read-back compare.

In this repo that already means: production data steps run from the main session in Nathan's presence (Never-break rule 5), `wrangler deploy` is never run locally without `CLOUDFLARE_ENV=ci`, and the `www` redirect rule (Gotcha 24) is changed only through a command Nathan runs or approves.
