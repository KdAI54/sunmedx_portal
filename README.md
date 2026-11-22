# SunMedX Biomedical Platform

Biomedical calibration, preventive maintenance, equipment catalogue, clinical tools, and service portal built with React, Vite, TypeScript, and Tailwind CSS — structured for GitHub + Cloudflare Pages deployment with pluggable data and authentication adapters.

## Project Structure

```text
├── .github/workflows/deploy.yml   # CI/CD deployment to Cloudflare Pages
├── functions/api/                 # Cloudflare Pages Functions (AI + D1 collections + Auth)
├── public/_headers                # Cloudflare Pages security headers
├── src/
│   ├── admin/                     # Admin CMS & operations console
│   ├── components/                # Shared UI components
│   ├── config/                    # Environment config & initial seed data
│   ├── pages/                     # Route views (Home, AuthPage, Services, Catalogue, Portal, Technician)
│   ├── services/                  # Pluggable DataAdapter & AuthAdapter interfaces
│   ├── utils/                     # WhatsApp alerts & translation helpers
│   ├── App.tsx                    # Root shell and hash router
│   └── types.ts                   # Shared TypeScript interfaces
├── schema.sql                     # Cloudflare D1 / SQLite schema
├── server.ts                      # Local Express + Vite dev server
├── wrangler.toml                  # Cloudflare Pages configuration
└── package.json
```

## Local Development

```bash
npm install
cp .env.example .env
npm run dev
```

## Push to GitHub

```bash
git init
git add .
git commit -m "Cloudflare-ready build with pluggable data and auth layer"
git branch -M main
git remote add origin https://github.com/<your-org>/<your-repo>.git
git push -u origin main
```

## Cloudflare Pages Deployment

1. Open **Cloudflare Dashboard → Workers & Pages → Create → Pages → Connect to Git**.
2. Select your GitHub repository and set:
   - **Build command**: `npm run build:cf`
   - **Build output directory**: `dist`
   - **Deploy command** *(if prompted by Cloudflare)*: `npx wrangler pages deploy dist` (or leave blank for automatic Pages deployment — **never** use `npx wrangler deploy`, which fails with `Missing entry-point to Worker script or to assets directory` on Pages projects).
3. Set environment variables in **Settings → Environment variables (Production & Preview)**:
   - `GEMINI_API_KEY`: Server-side Gemini API key used by `/api/diagnose` (public), `/api/suggest-quote`, and `/api/admin-agent`. Visitors on your deployed portal automatically use AI via these server proxy routes without exposing the key in browser code, and any client deploying their own cloned portal attaches their own `GEMINI_API_KEY` in their Cloudflare Pages Environment variables.
   - `AUTH_SECRET`: Random secret string for signing auth tokens (when using `/api/auth/*`).

## Connecting an External Database & Auth Source via Environment Variables

Firebase Auth and Firestore have been removed. Choose any backend mode by setting environment variables on Cloudflare Pages:

### Option 1: Cloudflare D1 (Built-in Serverless Edge API)
1. Create a D1 database: `npx wrangler d1 create sunmedx-db`
2. Apply schema: `npx wrangler d1 execute sunmedx-db --remote --file=./schema.sql`
3. Bind the database as `DB` in Cloudflare Pages **Settings → Functions → D1 database bindings** (or uncomment `[[d1_databases]]` in `wrangler.toml`).
4. Set build-time env vars:
   - `VITE_DATA_SOURCE=rest`
   - `VITE_API_BASE_URL=/api`
   - `VITE_AUTH_ENDPOINT=/api/auth`

### Option 2: External REST API
- `VITE_DATA_SOURCE=rest`
- `VITE_API_BASE_URL=https://api.yourdomain.com`
- `VITE_AUTH_ENDPOINT=https://api.yourdomain.com/auth`

### Option 3: Supabase (PostgREST)
Create a `documents` table `(collection text, id text, data jsonb, updated_at timestamptz, primary key (collection, id))` and set:
- `VITE_DATA_SOURCE=supabase`
- `VITE_SUPABASE_URL=https://your-project.supabase.co`
- `VITE_SUPABASE_ANON_KEY=your-anon-key`
