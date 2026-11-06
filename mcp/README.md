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

Build this directory with its Dockerfile. Deploy the image as a Coolify Compose service on port 3000, with HTTPS routing for cv.copymyui.com. Keep Telegram values in a protected host environment file referenced by Compose `env_file`, not in the image or Git. The deployed container runs as a non-root user with read-only filesystem and dropped capabilities.

The production image is built on the existing Coolify host and managed by the Career MCP Compose service. Updating Git alone does not redeploy: rebuild the image from this directory and redeploy through Coolify.

`profile.md` is a curated snapshot of the public EXPERIENCE.md, excluding its MCP connection instructions. Refresh it when career content changes. Do not copy the private career bank, interview notes, funding details or user metrics into this service.
