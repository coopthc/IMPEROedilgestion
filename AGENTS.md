# AGENTS.md

## Project Context

This is a Base44 app repository. Treat it as user-owned application code, keep changes focused on the user's request, and preserve existing project conventions.

Start with `README.md` for local setup, environment variables, and publish workflow.

## Base44 References

- CLI overview: https://docs.base44.com/developers/references/cli/get-started/overview.md
- Agent skills: https://docs.base44.com/developers/backend/overview/skills.md

If your agent supports Agent Skills, install or update Base44 skills before Base44-specific work:

```bash
npx skills add base44/skills
```

## Key Files

- `src/`: frontend application source.
- `src/api/base44Client.js`: frontend Base44 SDK client.
- `vite.config.js`: Vite config and Base44 Vite plugin setup.
- `.env.local`: local-only environment values; never commit secrets.

## Sandbox / Docker Compose

- The Base44 dev environment runs via `docker compose -f docker-compose.base44.yml up -d` (single `web` service: `node:22`, source bind-mounted at `/app`, `npm run dev` with Vite live reload on port 5173, mapped to host port 3000).
- `vite.config.js` sets `server.host: true` and `server.allowedHosts: true` so the preview's external hostname is accepted.
- `.env.base44-defaults` holds placeholder values for `VITE_BASE44_APP_ID` / `VITE_BASE44_APP_BASE_URL` so the frontend boots before real credentials are supplied. Real values are delivered via the platform secrets file (`/run/base44/app.env`) and override the placeholders.
- Without real Base44 backend credentials, the frontend renders but API calls (auth, entities) fail — the app shows a loading/error state. Supply `VITE_BASE44_APP_ID` and `VITE_BASE44_APP_BASE_URL` to make it fully functional.
- The Base44 Vite plugin proxies `/api` requests to `VITE_BASE44_APP_BASE_URL`.

## Working Notes

- Use `base44 dev` as the default local development command when you need the local Base44 backend. It can run the backend and frontend together.
- When docs or code mention the frontend being started automatically, that usually means the Base44 project config includes `site.serveCommand`, for example `"serveCommand": "npm run dev"` in `base44/config.jsonc`.
- Use `npm run dev` only for frontend-only work against the hosted Base44 backend.
- Prefer the existing Base44 CLI workflow over adding new npm scripts for Base44-specific tasks.
- Reuse the existing SDK client and Vite plugin patterns before adding new Base44 integration paths.
- Run the relevant checks from `package.json` before finishing code changes.
