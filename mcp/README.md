# Career MCP service

Public career evidence for Igor Shadurin / Ihar Shaduryn.

- Endpoint: https://cv.copymyui.com/mcp
- Discovery and instructions: https://cv.copymyui.com/llms.txt
- Plain Markdown: https://cv.copymyui.com/experience.md
- MCP 2026-07-28 through the official v2 SDK; stateless compatibility for 2025 clients.

## Tool

`get_candidate_details` requires `company` and `position`. `focus` optionally selects `general`, `ai`, `video`, `frontend`, `infrastructure` or `fintech`.

The tool discloses its Telegram side effect. Callers must provide only information they may share. `Not disclosed` / `General research` are permitted instead of invented or confidential details. The result includes public experience, selected evidence, GitHub, email, LinkedIn and portfolio links. It does not assign hiring scores.

Only valid tool calls trigger notification attempts. Static pages, resources and discovery do not. Company/position are caller-supplied, not verified identities. Duplicate notifications are suppressed for one hour, with a maximum of 30 attempts per hour. In-memory limits reset on restart; run one replica. Delivery is best-effort with a five-second timeout; career data remains available if Telegram is unavailable. No request bodies or IP addresses are stored by this application. Hosting/proxy access logs may still exist.

## Local development

Node.js 24:

```sh
npm ci
npm test
npm start
```

Telegram is disabled unless both `TELEGRAM_BOT_TOKEN` and `TELEGRAM_CHAT_ID` are provided as runtime environment variables. Never commit them. Tests use a fake sender and send no real messages.

## Deployment

Production is a GitHub-backed Coolify **Application**, using the existing GitHub App integration:

- Repository: `IgorShadurin/IgorShadurin`, branch `main`.
- Build strategy: Dockerfile; base directory `/mcp`; Dockerfile location `/Dockerfile`.
- Container port: `3000`; public domain: `https://cv.copymyui.com`.
- Health check: the Dockerfile checks `/health` with Node.js.
- Store `TELEGRAM_BOT_TOKEN` and `TELEGRAM_CHAT_ID` in Coolify Environment Variables, available at runtime only. Never put secrets in Git or build arguments.
- Custom container options: `--read-only --tmpfs /tmp --cap-drop ALL --security-opt no-new-privileges:true`.
- Keep automatic deployment on push enabled. Coolify clones the source, builds the image, manages rolling updates and records deployment history.
- Deployment success/failure notifications use the existing Coolify team notification settings. These are separate from MCP request notifications.

Use Coolify's Deploy/Redeploy controls or push to `main`. Do not build production images manually or run Docker Compose over SSH. Keep one replica because notification limits are in memory.

`profile.md` is a curated snapshot of the public EXPERIENCE.md, excluding its MCP connection instructions. Refresh it when career content changes. Do not copy the private career bank, interview notes, funding details or user metrics into this service.
