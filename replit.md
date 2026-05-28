# FactScan

Aplicativo móvel verificador de fatos com IA Gemini — escaneia artigos, jornais, revistas e QR codes para verificar a veracidade do conteúdo, dando uma nota de 0 a 100.

## Run & Operate

- `pnpm --filter @workspace/api-server run dev` — run the API server (port 8080)
- `pnpm --filter @workspace/fact-scanner run dev` — run the Expo mobile app
- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from the OpenAPI spec
- Required env: `AI_INTEGRATIONS_GEMINI_BASE_URL`, `AI_INTEGRATIONS_GEMINI_API_KEY` — auto-provisioned via Replit AI Integrations

## Stack

- pnpm workspaces, Node.js 24, TypeScript 5.9
- API: Express 5
- DB: PostgreSQL + Drizzle ORM
- AI: Gemini 2.5 Flash via Replit AI Integrations (`@workspace/integrations-gemini-ai`)
- Mobile: Expo (React Native) with expo-router, @expo/vector-icons
- Validation: Zod (`zod/v4`), `drizzle-zod`
- API codegen: Orval (from OpenAPI spec)
- Build: esbuild (CJS bundle)

## Where things live

- `lib/api-spec/openapi.yaml` — OpenAPI spec (source of truth)
- `lib/api-client-react/src/generated/` — generated React Query hooks
- `lib/api-zod/src/generated/` — generated Zod schemas
- `lib/integrations-gemini-ai/` — Gemini AI integration lib
- `artifacts/api-server/src/routes/fact-check/` — fact-check route (Gemini analysis)
- `artifacts/fact-scanner/app/(tabs)/scanner.tsx` — main scanner screen
- `artifacts/fact-scanner/app/(tabs)/history.tsx` — scan history
- `artifacts/fact-scanner/app/result.tsx` — result detail screen
- `artifacts/fact-scanner/context/HistoryContext.tsx` — AsyncStorage history state
- `artifacts/fact-scanner/constants/colors.ts` — dark navy theme tokens

## Architecture decisions

- Gemini vision model (`gemini-2.5-flash`) analyzes images and text via the backend API server, keeping API keys secure server-side.
- History is persisted in AsyncStorage on device (no backend DB needed for this feature).
- Image picking uses `expo-image-picker` with `base64: true` — base64 is sent to the backend since Expo cannot read files directly from the API server.
- The `@google/genai` package is externalized in esbuild but must be a direct dependency of `api-server` so Node.js can resolve it at runtime.

## Product

- **Scanner tab**: Three modes — Image (camera/gallery), Texto (paste text), QR Code (paste URL)
- **Result screen**: Score 0-100 bar, verdict label, reasoning, per-claim breakdown (precise/imprecise)
- **Histórico tab**: Full history of all scans with score, verdict, and date; tap to re-view result

## User preferences

- Interface in Portuguese (Brazil)
- Dark navy theme (#0A1628 background, #4DC8F5 primary)
- No "Powered by Gemini" branding
- Compact text input that doesn't dominate the layout

## Gotchas

- Always run `pnpm install --no-frozen-lockfile` after adding new dependencies
- After OpenAPI spec changes, run `pnpm --filter @workspace/api-spec run codegen`
- `@google/genai` must be in api-server's direct dependencies (not just in integrations-gemini-ai) because it's externalized in esbuild

## Pointers

- See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details
