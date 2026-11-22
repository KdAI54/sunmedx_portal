import React, { useState, useEffect } from 'react';
import {
  BookOpenText,
  KeyRound,
  Terminal,
  GitBranch,
  Layers,
  Copy,
  Check,
  Search,
  RefreshCw,
  Download,
  Server,
  ShieldCheck,
  Database,
  ExternalLink,
  CheckCircle2,
  AlertCircle,
} from 'lucide-react';
import { env } from '../config/env';
import { SiteSettings } from '../types';

interface SunMedXDocumentationProps {
  adminEmail: string;
  siteSettings: SiteSettings | null;
  changeLogsCount: number;
  catalogueCount: number;
  coursesCount: number;
  toolsCount: number;
}

type DocSection = 'all' | 'resources' | 'env' | 'setup' | 'vcs';

interface EnvVarSpec {
  name: string;
  scope: 'Server Secret' | 'Client Build (VITE_)' | 'GitHub CI Secret';
  example: string;
  requiredFor: string;
  notes: string;
}

const ENV_VARS: EnvVarSpec[] = [
  {
    name: 'GEMINI_API_KEY',
    scope: 'Server Secret',
    example: 'Configure in Settings > Secrets / Cloudflare Env',
    requiredFor: 'Biomedical AI Worker (/api/admin-agent), Fault Diagnosis (/api/diagnose), AI Quote (/api/suggest-quote)',
    notes: 'Accessed strictly on server runtimes (server.ts & functions/api/*). Never expose in browser VITE_ vars.',
  },
  {
    name: 'AUTH_SECRET',
    scope: 'Server Secret',
    example: 'Random 32+ char cryptographic string',
    requiredFor: 'Cloudflare Functions signed auth tokens (/api/auth/*)',
    notes: 'Required when using built-in Cloudflare D1 account authentication.',
  },
  {
    name: 'RAZORPAY_KEY_SECRET',
    scope: 'Server Secret',
    example: 'Set in Server Secrets (never in browser UI)',
    requiredFor: 'Server-side Razorpay order signing & payment verification',
    notes: 'Public Key ID goes in Admin -> Payment Gateway Setup; secret remains server-only.',
  },
  {
    name: 'STRIPE_SECRET_KEY',
    scope: 'Server Secret',
    example: 'Set in Server Secrets (never in browser UI)',
    requiredFor: 'Server-side Stripe PaymentIntent / Checkout verification',
    notes: 'Checked as boolean readiness flag via GET /api/payments/status.',
  },
  {
    name: 'PAYMENT_WEBHOOK_SECRET',
    scope: 'Server Secret',
    example: 'Gateway webhook signing secret',
    requiredFor: 'Verifying incoming payment webhook signatures',
    notes: 'Configure matching webhook URL (/api/payments/webhook) in your gateway dashboard.',
  },
  {
    name: 'APP_URL',
    scope: 'Server Secret',
    example: 'https://sunmedx.pages.dev',
    requiredFor: 'Canonical application origin for server callbacks & metadata',
    notes: 'Set to your live Cloudflare Pages custom domain in production.',
  },
  {
    name: 'VITE_DATA_SOURCE',
    scope: 'Client Build (VITE_)',
    example: 'local | rest | supabase',
    requiredFor: 'Selects active persistence adapter in src/services/dataClient.ts',
    notes: 'Defaults to "local" (zero-setup browser storage). Use "rest" for Cloudflare D1.',
  },
  {
    name: 'VITE_API_BASE_URL',
    scope: 'Client Build (VITE_)',
    example: '/api',
    requiredFor: 'Base URL for REST collections & AI endpoints when VITE_DATA_SOURCE="rest"',
    notes: 'Defaults to "/api" for same-origin Cloudflare Pages Functions or Express.',
  },
  {
    name: 'VITE_AUTH_ENDPOINT',
    scope: 'Client Build (VITE_)',
    example: '/api/auth',
    requiredFor: 'External / D1 auth endpoint in src/services/authService.ts',
    notes: 'Leave empty to use built-in local session adapter; set "/api/auth" for Cloudflare D1.',
  },
  {
    name: 'VITE_SUPABASE_URL',
    scope: 'Client Build (VITE_)',
    example: 'https://your-project.supabase.co',
    requiredFor: 'Supabase PostgREST adapter (VITE_DATA_SOURCE="supabase")',
    notes: 'Requires a "documents" table with (collection text, id text, data jsonb, updated_at timestamptz).',
  },
  {
    name: 'VITE_SUPABASE_ANON_KEY',
    scope: 'Client Build (VITE_)',
    example: 'Public Supabase anon JWT key',
    requiredFor: 'Client authentication header for Supabase REST adapter',
    notes: 'Use RLS policies on your Supabase documents table in production.',
  },
  {
    name: 'CLOUDFLARE_API_TOKEN',
    scope: 'GitHub CI Secret',
    example: 'Cloudflare Pages Edit API Token',
    requiredFor: 'GitHub Actions automated deployment (.github/workflows/deploy.yml)',
    notes: 'Add in GitHub Repository -> Settings -> Secrets and variables -> Actions.',
  },
  {
    name: 'CLOUDFLARE_ACCOUNT_ID',
    scope: 'GitHub CI Secret',
    example: '32-char Cloudflare Account ID',
    requiredFor: 'Targeting Cloudflare account inside cloudflare/pages-action@v1',
    notes: 'Found in Cloudflare Dashboard sidebar URL or Overview panel.',
  },
];

const API_ROUTES = [
  { method: 'GET', path: '/api/health', runtime: 'Express + CF Functions', purpose: 'Service liveness & active NODE_ENV check' },
  { method: 'POST', path: '/api/admin-agent', runtime: 'Express + CF Functions', purpose: 'SunMedX Biomedical AI Worker (Research + Course/Tool/Catalogue/Ops)' },
  { method: 'POST', path: '/api/diagnose', runtime: 'Express + CF Functions', purpose: 'AI Biomedical Equipment Fault Diagnosis simulator' },
  { method: 'POST', path: '/api/suggest-quote', runtime: 'Express + CF Functions', purpose: 'AI Quotation INR price range & justification analyzer' },
  { method: 'GET', path: '/api/payments/status', runtime: 'Express + CF Functions', purpose: 'Boolean secret-readiness check for Razorpay, Stripe & Webhooks' },
  { method: 'POST', path: '/api/auth/*', runtime: 'CF Functions (/functions/api/auth)', purpose: 'D1-backed sign-in, registration & token verification' },
  { method: 'CRUD', path: '/api/collections/*', runtime: 'CF Functions (/functions/api/collections)', purpose: 'Document CRUD persistence backed by Cloudflare D1 (documents table)' },
];

const RELEASES = [
  {
    version: 'v2.12',
    title: 'Complete SunMedX Documentation & Ops Runbook',
    notes: 'Added searchable Admin Documentation tab covering architecture resources, env/secrets matrix, local/D1/Cloudflare setup procedures, GitHub CI/CD version control, and live environment telemetry.',
  },
  {
    version: 'v2.11',
    title: 'SunMedX Biomedical AI Worker (Admin Studio)',
    notes: 'Replaced public chatbot inside Admin with a domain-trained AI Agent supporting Google Search-grounded research, Academy course generation, clinical tool building, catalogue drafting, and SOP/FAQ ops automation.',
  },
  {
    version: 'v2.10',
    title: 'Responsive UI & E-Catalogue Rich Image Attachments',
    notes: 'Collapsible Admin mobile module drawer, viewport-safe scrollable modals, proportional mobile signature scaling, and Browse / Take Photo / Live Camera / URL / Studio Presets upload field.',
  },
  {
    version: 'v2.09',
    title: 'Editable SunMedX Issuer Profile & Quote/Invoice PDF Suite',
    notes: 'Live-editable GSTIN, address, bank, and UPI VPA inside Studio with per-document snapshots, CGST/SGST & IGST breakdowns, and A4 PDF generation.',
  },
  {
    version: 'v2.08',
    title: 'Payment Gateway Setup & Customer Checkout Sync',
    notes: 'Configurable Razorpay / Stripe / Manual UPI-NEFT modes wired into Storefront checkout and Client Portal quote settlements.',
  },
  {
    version: 'v2.00',
    title: 'Cloudflare Pages + Pluggable Data/Auth Architecture',
    notes: 'Removed Firebase dependency, standardized local/REST/Supabase adapters, added schema.sql, wrangler.toml, and GitHub Actions deployment workflow.',
  },
];

export default function SunMedXDocumentation({
  adminEmail,
  siteSettings,
  changeLogsCount,
  catalogueCount,
  coursesCount,
  toolsCount,
}: SunMedXDocumentationProps) {
  const [sectionFilter, setSectionFilter] = useState<DocSection>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  const [checkingHealth, setCheckingHealth] = useState(false);
  const [healthStatus, setHealthStatus] = useState<{ ok: boolean; detail: string } | null>(null);
  const [paymentReadiness, setPaymentReadiness] = useState<{
    razorpaySecretConfigured: boolean;
    stripeSecretConfigured: boolean;
    webhookSecretConfigured: boolean;
    runtime?: string;
  } | null>(null);

  const fetchRuntimeStatus = async () => {
    setCheckingHealth(true);
    try {
      const [hRes, pRes] = await Promise.all([
        fetch('/api/health').catch(() => null),
        fetch('/api/payments/status').catch(() => null),
      ]);

      if (hRes && hRes.ok) {
        const hJson = await hRes.json();
        setHealthStatus({ ok: true, detail: `API Online (${hJson.mode || 'dev'})` });
      } else {
        setHealthStatus({ ok: false, detail: 'Health endpoint unreachable' });
      }

      if (pRes && pRes.ok) {
        setPaymentReadiness(await pRes.json());
      }
    } finally {
      setCheckingHealth(false);
    }
  };

  useEffect(() => {
    fetchRuntimeStatus();
  }, []);

  const copyText = async (id: string, value: string) => {
    try {
      await navigator.clipboard.writeText(value);
      setCopiedKey(id);
      setTimeout(() => setCopiedKey((prev) => (prev === id ? null : prev)), 2000);
    } catch {
      // Clipboard blocked in restricted context
    }
  };

  const q = searchQuery.trim().toLowerCase();
  const matchesSearch = (...fields: string[]) =>
    !q || fields.some((f) => f.toLowerCase().includes(q));

  const showSection = (key: Exclude<DocSection, 'all'>) =>
    sectionFilter === 'all' || sectionFilter === key;

  const filteredEnvVars = ENV_VARS.filter((v) =>
    matchesSearch(v.name, v.scope, v.requiredFor, v.notes)
  );

  const filteredRoutes = API_ROUTES.filter((r) =>
    matchesSearch(r.method, r.path, r.runtime, r.purpose)
  );

  const envTemplateBlock = `# Server / Cloudflare Pages Secrets
GEMINI_API_KEY="YOUR_GEMINI_API_KEY"
AUTH_SECRET="CHANGE_ME_32_CHAR_RANDOM_SECRET"
RAZORPAY_KEY_SECRET=""
STRIPE_SECRET_KEY=""
PAYMENT_WEBHOOK_SECRET=""

# Public App URL & Data/Auth Adapter
APP_URL="https://sunmedx.pages.dev"
VITE_DATA_SOURCE="local"
VITE_API_BASE_URL="/api"
VITE_AUTH_ENDPOINT=""

# Optional Supabase Mode (VITE_DATA_SOURCE="supabase")
VITE_SUPABASE_URL=""
VITE_SUPABASE_ANON_KEY=""`;

  const downloadRunbookMarkdown = () => {
    const md = `# SunMedX Biomedical Platform — Complete Ops & Setup Documentation
Generated: ${new Date().toISOString()}
Operator: ${adminEmail}
Active Adapter Mode: ${env.dataSource} (${env.apiBaseUrl})

## 1. Environment Variables
${ENV_VARS.map((v) => `- **${v.name}** (${v.scope}): ${v.requiredFor} — ${v.notes}`).join('\n')}

## 2. Local Development Setup
\`\`\`bash
npm install
cp .env.example .env
npm run dev
\`\`\`

## 3. Build & Verification Commands
- Typecheck: \`npm run typecheck\`
- Cloudflare Build: \`npm run build:cf\`
- Full Node Server Build: \`npm run build && npm start\`

## 4. Cloudflare D1 Setup
\`\`\`bash
npx wrangler d1 create sunmedx-db
npx wrangler d1 execute sunmedx-db --remote --file=./schema.sql
\`\`\`
Set build vars: \`VITE_DATA_SOURCE=rest\`, \`VITE_API_BASE_URL=/api\`, \`VITE_AUTH_ENDPOINT=/api/auth\`.

## 5. GitHub & CI/CD (.github/workflows/deploy.yml)
Push to \`main\` triggers: \`npm ci\` -> \`npm run typecheck\` -> \`npm run build:cf\` -> Cloudflare Pages deploy (\`dist\`).
Required GitHub Secrets: \`CLOUDFLARE_API_TOKEN\`, \`CLOUDFLARE_ACCOUNT_ID\`.

## 6. Version History
${RELEASES.map((r) => `- **${r.version} — ${r.title}**: ${r.notes}`).join('\n')}
`;
    const blob = new Blob([md], { type: 'text/markdown;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'SUNMEDX-DOCUMENTATION.md';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const CodeSnippet = ({ id, title, code }: { id: string; title: string; code: string }) => (
    <div className="bg-[#0b0b16] border border-white/10 rounded-xl overflow-hidden">
      <div className="flex items-center justify-between px-3.5 py-2 bg-white/5 border-b border-white/5">
        <span className="text-[10px] font-mono uppercase text-amber font-bold">{title}</span>
        <button
          type="button"
          onClick={() => copyText(id, code)}
          className="text-[10px] font-mono text-gray-300 hover:text-amber flex items-center gap-1"
        >
          {copiedKey === id ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
          <span>{copiedKey === id ? 'Copied' : 'Copy'}</span>
        </button>
      </div>
      <pre className="p-3.5 text-[11px] font-mono text-gray-200 overflow-x-auto leading-relaxed whitespace-pre">
        {code}
      </pre>
    </div>
  );

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* Header Banner */}
      <div className="bg-navy border border-amber/20 rounded-2xl p-5 sm:p-6 shadow-xl flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div className="flex items-start gap-3.5 min-w-0">
          <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-crimson to-amber text-navy flex items-center justify-center shrink-0 shadow-lg">
            <BookOpenText className="w-6 h-6" />
          </div>
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="font-syne font-black text-lg sm:text-xl text-white uppercase tracking-wider">
                SunMedX Complete Documentation
              </h2>
              <span className="px-2.5 py-0.5 rounded-full bg-amber/15 border border-amber/30 text-amber font-mono text-[10px] font-bold">
                v2.12 Runbook
              </span>
            </div>
            <p className="text-xs font-mono text-gray-400 mt-1 leading-relaxed">
              Architecture resources, environment variables &amp; secrets matrix, Cloudflare/D1 setup procedure, GitHub version control, and release changelog.
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2.5 shrink-0">
          <button
            type="button"
            onClick={fetchRuntimeStatus}
            disabled={checkingHealth}
            className="px-3.5 py-2 rounded-xl bg-[#10101e] border border-white/10 hover:border-amber/40 text-xs font-mono text-gray-200 flex items-center gap-1.5"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${checkingHealth ? 'animate-spin' : ''}`} />
            <span>Check Runtime</span>
          </button>
          <button
            type="button"
            onClick={downloadRunbookMarkdown}
            className="px-4 py-2 rounded-xl bg-gradient-to-r from-crimson to-amber text-navy font-syne font-black uppercase text-xs tracking-wider flex items-center gap-1.5 shadow-md"
          >
            <Download className="w-4 h-4" />
            <span>Export .MD Runbook</span>
          </button>
        </div>
      </div>

      {/* Live Environment & Readiness Strip */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <div className="bg-navy border border-white/10 rounded-2xl p-4 space-y-1">
          <span className="text-[10px] font-mono uppercase text-gray-400 font-bold flex items-center gap-1.5">
            <Database className="w-3.5 h-3.5 text-amber" /> Data Source Mode
          </span>
          <p className="font-syne font-bold text-white text-base uppercase">{env.dataSource}</p>
          <p className="text-[11px] font-mono text-gray-400 truncate">API: {env.apiBaseUrl}</p>
        </div>

        <div className="bg-navy border border-white/10 rounded-2xl p-4 space-y-1">
          <span className="text-[10px] font-mono uppercase text-gray-400 font-bold flex items-center gap-1.5">
            <Server className="w-3.5 h-3.5 text-amber" /> Backend Runtime
          </span>
          <div className="flex items-center gap-1.5">
            {healthStatus?.ok ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            ) : (
              <AlertCircle className="w-4 h-4 text-amber shrink-0" />
            )}
            <p className="font-syne font-bold text-white text-sm truncate">
              {healthStatus?.detail || 'Checking...'}
            </p>
          </div>
          <p className="text-[11px] font-mono text-gray-400 truncate">
            Runtime: {paymentReadiness?.runtime || 'Express / CF Pages'}
          </p>
        </div>

        <div className="bg-navy border border-white/10 rounded-2xl p-4 space-y-1">
          <span className="text-[10px] font-mono uppercase text-gray-400 font-bold flex items-center gap-1.5">
            <ShieldCheck className="w-3.5 h-3.5 text-amber" /> Server Secrets Readiness
          </span>
          <div className="flex flex-wrap gap-1.5 pt-1 text-[10px] font-mono">
            <span className={`px-2 py-0.5 rounded border ${paymentReadiness?.razorpaySecretConfigured ? 'bg-emerald-500/15 border-emerald-500/30 text-emerald-300' : 'bg-white/5 border-white/10 text-gray-400'}`}>
              Razorpay: {paymentReadiness?.razorpaySecretConfigured ? 'Set' : 'Unset'}
            </span>
            <span className={`px-2 py-0.5 rounded border ${paymentReadiness?.stripeSecretConfigured ? 'bg-emerald-500/15 border-emerald-500/30 text-emerald-300' : 'bg-white/5 border-white/10 text-gray-400'}`}>
              Stripe: {paymentReadiness?.stripeSecretConfigured ? 'Set' : 'Unset'}
            </span>
          </div>
        </div>

        <div className="bg-navy border border-white/10 rounded-2xl p-4 space-y-1">
          <span className="text-[10px] font-mono uppercase text-gray-400 font-bold flex items-center gap-1.5">
            <Layers className="w-3.5 h-3.5 text-amber" /> Live Workspace Inventory
          </span>
          <p className="font-syne font-bold text-white text-sm">
            {catalogueCount} Products • {coursesCount} Courses
          </p>
          <p className="text-[11px] font-mono text-gray-400">
            {toolsCount} Tools • {changeLogsCount} Audit Events
          </p>
        </div>
      </div>

      {/* Navigation Pills + Live Search */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 bg-navy border border-white/10 rounded-2xl p-3.5 sm:p-4">
        <div className="flex flex-wrap gap-2">
          {[
            { id: 'all', label: 'All Docs', icon: BookOpenText },
            { id: 'resources', label: 'Resources & APIs', icon: Layers },
            { id: 'env', label: 'Env Variables', icon: KeyRound },
            { id: 'setup', label: 'Setup Procedure', icon: Terminal },
            { id: 'vcs', label: 'Version Control & Releases', icon: GitBranch },
          ].map((tab) => {
            const IconComp = tab.icon;
            const active = sectionFilter === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setSectionFilter(tab.id as DocSection)}
                className={`px-3.5 py-2 rounded-xl text-xs font-syne font-bold flex items-center gap-1.5 transition-all ${
                  active
                    ? 'bg-gradient-to-r from-crimson to-amber text-navy shadow'
                    : 'bg-[#10101e] text-gray-300 border border-white/10 hover:text-white'
                }`}
              >
                <IconComp className="w-3.5 h-3.5 shrink-0" />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>

        <div className="relative w-full md:w-72">
          <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Filter vars, routes, commands..."
            className="w-full bg-[#10101e] border border-white/15 focus:border-amber rounded-xl pl-9 pr-3 py-2 text-xs text-white font-mono focus:outline-none"
          />
        </div>
      </div>

      {/* SECTION 1: RESOURCES & SYSTEM ARCHITECTURE */}
      {showSection('resources') && (
        <div className="bg-navy border border-white/10 rounded-2xl p-5 sm:p-6 space-y-5 shadow-xl">
          <div>
            <span className="text-[10px] font-mono uppercase text-amber font-bold tracking-wider">
              Section 01
            </span>
            <h3 className="font-syne font-black text-base sm:text-lg text-white uppercase tracking-wide mt-0.5">
              Platform Resources, Directory Map &amp; Backend Endpoints
            </h3>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            <div className="bg-[#10101e] border border-white/10 rounded-xl p-4 space-y-3">
              <h4 className="font-syne font-bold text-amber text-xs uppercase tracking-wider">
                Codebase Module Structure
              </h4>
              <ul className="space-y-2 text-xs font-mono text-gray-300">
                <li><strong className="text-white">src/admin/AdminPanel.tsx</strong> — Core CMS, E-Catalogue CRUD, RFQs, Orders, Dispatch, AMC, Telemetry</li>
                <li><strong className="text-white">src/admin/BiomedicalAgentWorker.tsx</strong> — Domain-trained Gemini 4 Hydrogen AI Worker</li>
                <li><strong className="text-white">src/admin/QuoteInvoiceGenerator.tsx</strong> — GST Quote/Invoice PDF builder + editable SunMedX issuer settings</li>
                <li><strong className="text-white">src/admin/PaymentGatewaySetup.tsx</strong> — Razorpay, Stripe &amp; UPI gateway studio config</li>
                <li><strong className="text-white">src/services/dataClient.ts &amp; authService.ts</strong> — Pluggable Local / REST (D1) / Supabase adapters</li>
                <li><strong className="text-white">src/components/ImageAttachmentField.tsx</strong> — Browse, Mobile Capture, Live Webcam, URL &amp; Presets</li>
                <li><strong className="text-white">functions/api/ &amp; server.ts</strong> — Dual Node Express + Cloudflare Pages Edge API handlers</li>
              </ul>
            </div>

            <div className="bg-[#10101e] border border-white/10 rounded-xl p-4 space-y-3">
              <h4 className="font-syne font-bold text-amber text-xs uppercase tracking-wider">
                SunMedX Brand &amp; External Portal Links
              </h4>
              <div className="space-y-2.5 text-xs font-mono">
                <div className="p-3 rounded-lg bg-navy border border-white/5 flex items-center justify-between gap-2">
                  <div className="min-w-0">
                    <p className="text-white font-bold">SunMedX Academy (Graphy Classroom)</p>
                    <p className="text-gray-400 truncate">{siteSettings?.academyUrl || 'https://sunmedxacademy.graphy.com'}</p>
                  </div>
                  <a
                    href={siteSettings?.academyUrl || 'https://sunmedxacademy.graphy.com'}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="p-2 rounded-lg bg-white/5 hover:bg-white/10 text-amber shrink-0"
                  >
                    <ExternalLink className="w-4 h-4" />
                  </a>
                </div>

                <div className="p-3 rounded-lg bg-navy border border-white/5 space-y-1">
                  <p className="text-white font-bold">Configured Legal &amp; Billing Identity</p>
                  <p className="text-gray-300">
                    {siteSettings?.paymentGateway?.merchantName || 'SunMedX Biomedical India Pvt Ltd'} • GSTIN: {siteSettings?.paymentGateway?.companyGstin || '27AABCS1429B1Z5'}
                  </p>
                  <p className="text-gray-400">
                    Support: {siteSettings?.email || 'info@sunmedx.in'} • {siteSettings?.phone || '+91 98765 43210'}
                  </p>
                </div>

                <div className="p-3 rounded-lg bg-navy border border-white/5 space-y-1">
                  <p className="text-white font-bold">Package Scripts (package.json)</p>
                  <p className="text-gray-300">dev: tsx server.ts | typecheck: tsc --noEmit | build:cf: vite build | start: node dist/server.cjs</p>
                </div>
              </div>
            </div>
          </div>

          <div className="overflow-x-auto border border-white/10 bg-[#10101e] rounded-xl">
            <table className="w-full text-xs text-left divide-y divide-white/5 text-gray-300">
              <thead>
                <tr className="bg-navy text-gray-400 font-mono">
                  <th className="p-3.5">Method</th>
                  <th className="p-3.5">Endpoint Path</th>
                  <th className="p-3.5">Runtime Target</th>
                  <th className="p-3.5">Purpose</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5 font-mono">
                {filteredRoutes.map((route) => (
                  <tr key={route.path} className="hover:bg-white/2">
                    <td className="p-3.5">
                      <span className="px-2 py-0.5 rounded bg-amber/15 text-amber font-bold text-[10px]">
                        {route.method}
                      </span>
                    </td>
                    <td className="p-3.5 text-white font-bold">{route.path}</td>
                    <td className="p-3.5 text-sky-300">{route.runtime}</td>
                    <td className="p-3.5 font-sans text-gray-300">{route.purpose}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* SECTION 2: ENVIRONMENT VARIABLES & SECRETS */}
      {showSection('env') && (
        <div className="bg-navy border border-white/10 rounded-2xl p-5 sm:p-6 space-y-5 shadow-xl">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <span className="text-[10px] font-mono uppercase text-amber font-bold tracking-wider">
                Section 02
              </span>
              <h3 className="font-syne font-black text-base sm:text-lg text-white uppercase tracking-wide mt-0.5">
                Environment Variables &amp; Secrets Configuration
              </h3>
            </div>
            <span className="text-[11px] font-mono text-gray-400">
              Source: .env.example &amp; .github/workflows/deploy.yml
            </span>
          </div>

          <div className="overflow-x-auto border border-white/10 bg-[#10101e] rounded-xl">
            <table className="w-full text-xs text-left divide-y divide-white/5 text-gray-300">
              <thead>
                <tr className="bg-navy text-gray-400 font-mono">
                  <th className="p-3.5">Variable</th>
                  <th className="p-3.5">Scope</th>
                  <th className="p-3.5">Required For</th>
                  <th className="p-3.5">Guidance</th>
                  <th className="p-3.5 text-right">Copy</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {filteredEnvVars.map((v) => (
                  <tr key={v.name} className="hover:bg-white/2">
                    <td className="p-3.5 font-mono font-bold text-white whitespace-nowrap">{v.name}</td>
                    <td className="p-3.5 whitespace-nowrap">
                      <span
                        className={`px-2 py-0.5 rounded-full text-[10px] font-mono font-bold border ${
                          v.scope === 'Server Secret'
                            ? 'bg-red-500/15 border-red-500/30 text-red-300'
                            : v.scope === 'GitHub CI Secret'
                            ? 'bg-purple-500/15 border-purple-500/30 text-purple-300'
                            : 'bg-sky-500/15 border-sky-500/30 text-sky-300'
                        }`}
                      >
                        {v.scope}
                      </span>
                    </td>
                    <td className="p-3.5 text-gray-200">{v.requiredFor}</td>
                    <td className="p-3.5 text-gray-400 text-[11px] leading-relaxed">{v.notes}</td>
                    <td className="p-3.5 text-right">
                      <button
                        type="button"
                        onClick={() => copyText(v.name, v.name)}
                        className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-amber"
                        title={`Copy ${v.name}`}
                      >
                        {copiedKey === v.name ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <CodeSnippet id="env-template" title=".env Template (Copy to local .env — Never commit .env)" code={envTemplateBlock} />

          {/* Step-by-Step Guide: How to Obtain Each Environment Variable */}
          <div className="bg-[#10101e] border border-amber/20 rounded-xl p-4 sm:p-5 space-y-4">
            <div>
              <span className="text-[10px] font-mono uppercase text-amber font-bold tracking-wider">
                Step-by-Step Walkthrough
              </span>
              <h4 className="font-syne font-bold text-white text-sm uppercase mt-0.5">
                How to Obtain Each Required Environment Variable
              </h4>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
              <div className="bg-navy border border-white/10 rounded-xl p-4 space-y-2">
                <p className="font-mono font-bold text-amber">1. GEMINI_API_KEY (AI Worker, Diagnosis &amp; Quote AI)</p>
                <ol className="list-decimal list-inside space-y-1 text-gray-300 leading-relaxed">
                  <li>Open <strong>aistudio.google.com</strong> and sign in with your Google account.</li>
                  <li>Click <strong>Get API key</strong> → <strong>Create API key</strong> and link a Google Cloud project.</li>
                  <li>Copy the generated key string.</li>
                  <li>Paste it into <strong>AI Studio Settings → Secrets</strong> (name: <code className="text-white">GEMINI_API_KEY</code>), your local <code className="text-white">.env</code>, and Cloudflare Pages Environment Variables.</li>
                </ol>
              </div>

              <div className="bg-navy border border-white/10 rounded-xl p-4 space-y-2">
                <p className="font-mono font-bold text-amber">2. AUTH_SECRET (D1 Token Signing — Optional for Local Mode)</p>
                <ol className="list-decimal list-inside space-y-1 text-gray-300 leading-relaxed">
                  <li>Not issued by an external service — you generate your own high-entropy secret.</li>
                  <li>Run in terminal: <code className="text-sky-300">openssl rand -hex 32</code> (or <code className="text-sky-300">node -e &quot;console.log(require(&apos;crypto&apos;).randomBytes(32).toString(&apos;hex&apos;))&quot;</code>).</li>
                  <li>Save the output as <code className="text-white">AUTH_SECRET</code> in Cloudflare Pages Secrets whenever <code className="text-white">VITE_AUTH_ENDPOINT=/api/auth</code>.</li>
                </ol>
              </div>

              <div className="bg-navy border border-white/10 rounded-xl p-4 space-y-2">
                <p className="font-mono font-bold text-amber">3. RAZORPAY_KEY_SECRET / STRIPE_SECRET_KEY / PAYMENT_WEBHOOK_SECRET</p>
                <ol className="list-decimal list-inside space-y-1 text-gray-300 leading-relaxed">
                  <li><strong>Razorpay:</strong> Log in to <strong>dashboard.razorpay.com</strong> → <strong>Account &amp; Settings</strong> → <strong>API Keys</strong> → Generate Test/Live Key. Put <em>Key ID</em> in Admin → Payment Gateway Setup, and <em>Key Secret</em> in <code className="text-white">RAZORPAY_KEY_SECRET</code>.</li>
                  <li><strong>Stripe:</strong> Open <strong>dashboard.stripe.com</strong> → <strong>Developers → API keys</strong>. Put Publishable key in Payment Gateway Setup, and Secret key in <code className="text-white">STRIPE_SECRET_KEY</code>.</li>
                  <li><strong>Webhooks:</strong> Add <code className="text-white">/api/payments/webhook</code> in your gateway Webhooks tab and copy its signing secret into <code className="text-white">PAYMENT_WEBHOOK_SECRET</code>.</li>
                </ol>
              </div>

              <div className="bg-navy border border-white/10 rounded-xl p-4 space-y-2">
                <p className="font-mono font-bold text-amber">4. CLOUDFLARE_API_TOKEN &amp; CLOUDFLARE_ACCOUNT_ID (GitHub CI/CD)</p>
                <ol className="list-decimal list-inside space-y-1 text-gray-300 leading-relaxed">
                  <li>Log in to <strong>dash.cloudflare.com</strong> and copy your 32-character <strong>Account ID</strong> from the URL or <strong>Workers &amp; Pages → Overview</strong> right sidebar.</li>
                  <li>Go to <strong>My Profile (top-right) → API Tokens → Create Token</strong>.</li>
                  <li>Use the <strong>Edit Cloudflare Workers</strong> / Pages edit permission template and copy the token.</li>
                  <li>Add both in GitHub Repo → <strong>Settings → Secrets and variables → Actions</strong>.</li>
                </ol>
              </div>

              <div className="bg-navy border border-white/10 rounded-xl p-4 space-y-2">
                <p className="font-mono font-bold text-amber">5. VITE_DATA_SOURCE, VITE_API_BASE_URL, VITE_AUTH_ENDPOINT &amp; APP_URL</p>
                <ol className="list-decimal list-inside space-y-1 text-gray-300 leading-relaxed">
                  <li>No third-party signup required — these select SunMedX&apos;s storage adapter.</li>
                  <li><strong>Zero-setup default:</strong> Keep <code className="text-white">VITE_DATA_SOURCE=&quot;local&quot;</code>.</li>
                  <li><strong>Cloudflare D1 mode:</strong> Set <code className="text-white">VITE_DATA_SOURCE=&quot;rest&quot;</code>, <code className="text-white">VITE_API_BASE_URL=&quot;/api&quot;</code>, <code className="text-white">VITE_AUTH_ENDPOINT=&quot;/api/auth&quot;</code>, and set <code className="text-white">APP_URL</code> to your live <code className="text-white">*.pages.dev</code> or custom domain.</li>
                </ol>
              </div>

              <div className="bg-navy border border-white/10 rounded-xl p-4 space-y-2">
                <p className="font-mono font-bold text-amber">6. VITE_SUPABASE_URL &amp; VITE_SUPABASE_ANON_KEY (Optional Supabase)</p>
                <ol className="list-decimal list-inside space-y-1 text-gray-300 leading-relaxed">
                  <li>Only needed if using <code className="text-white">VITE_DATA_SOURCE=&quot;supabase&quot;</code> instead of Local or Cloudflare D1.</li>
                  <li>Open <strong>supabase.com/dashboard</strong> → Select Project → <strong>Settings (gear) → API</strong>.</li>
                  <li>Copy <strong>Project URL</strong> into <code className="text-white">VITE_SUPABASE_URL</code> and the <strong>anon / public</strong> key into <code className="text-white">VITE_SUPABASE_ANON_KEY</code>.</li>
                </ol>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* SECTION 3: SETUP & DEPLOYMENT PROCEDURES */}
      {showSection('setup') && (
        <div className="bg-navy border border-white/10 rounded-2xl p-5 sm:p-6 space-y-5 shadow-xl">
          <div>
            <span className="text-[10px] font-mono uppercase text-amber font-bold tracking-wider">
              Section 03
            </span>
            <h3 className="font-syne font-black text-base sm:text-lg text-white uppercase tracking-wide mt-0.5">
              End-to-End Setup &amp; Deployment Procedure
            </h3>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            <div className="space-y-3">
              <h4 className="font-syne font-bold text-white text-sm uppercase">
                1. Local Full-Stack Setup (Port 3000)
              </h4>
              <p className="text-xs text-gray-400 leading-relaxed">
                Runs the Express API backend alongside Vite middleware for hot development of client views and server AI/payment routes.
              </p>
              <CodeSnippet
                id="setup-local"
                title="Terminal Commands — Local Dev & Production Check"
                code={`npm install
cp .env.example .env
# Add GEMINI_API_KEY inside .env (or AI Studio Settings > Secrets)
npm run dev

# Pre-deploy verification:
npm run typecheck
npm run build:cf`}
              />
            </div>

            <div className="space-y-3">
              <h4 className="font-syne font-bold text-white text-sm uppercase">
                2. Cloudflare D1 Database &amp; Pages Binding
              </h4>
              <p className="text-xs text-gray-400 leading-relaxed">
                Switch from browser storage to persistent Cloudflare D1 edge SQL using the pre-configured schema and Functions API.
              </p>
              <CodeSnippet
                id="setup-d1"
                title="Cloudflare Wrangler D1 Provisioning"
                code={`npx wrangler d1 create sunmedx-db
npx wrangler d1 execute sunmedx-db --remote --file=./schema.sql

# 1. Uncomment [[d1_databases]] in wrangler.toml with your database_id
# 2. Or bind DB in Cloudflare Pages -> Settings -> Functions
# 3. Set Cloudflare Build Environment Variables:
#    VITE_DATA_SOURCE=rest
#    VITE_API_BASE_URL=/api
#    VITE_AUTH_ENDPOINT=/api/auth`}
              />
            </div>
          </div>

          <div className="bg-[#10101e] border border-white/10 rounded-xl p-4 space-y-3">
            <h4 className="font-syne font-bold text-amber text-xs uppercase tracking-wider">
              3. Studio Operational Checklist After Provisioning
            </h4>
            <ol className="grid grid-cols-1 md:grid-cols-2 gap-2.5 text-xs font-mono text-gray-300">
              <li className="bg-navy p-3 rounded-lg border border-white/5">
                <strong className="text-white">Step 1 — Payment Gateway:</strong> Open <span className="text-amber">Payment Gateway Setup</span>, set provider, mode (Test/Live), public key ID, and verify server secrets via Readiness panel.
              </li>
              <li className="bg-navy p-3 rounded-lg border border-white/5">
                <strong className="text-white">Step 2 — SunMedX Billing Identity:</strong> Open <span className="text-amber">Quote / Invoice Generator</span>, edit Company GSTIN, Address, UPI VPA &amp; Bank Details, then click <em>Save as SunMedX Default</em>.
              </li>
              <li className="bg-navy p-3 rounded-lg border border-white/5">
                <strong className="text-white">Step 3 — E-Catalogue Media:</strong> Use <span className="text-amber">E-Catalogue CRUD</span> or the <span className="text-amber">Biomedical AI Worker</span> to draft products and attach equipment photos via Browse or Camera.
              </li>
              <li className="bg-navy p-3 rounded-lg border border-white/5">
                <strong className="text-white">Step 4 — Cloudflare Pages Settings:</strong> Build command <code className="text-sky-300">npm run build:cf</code>, output dir <code className="text-sky-300">dist</code>, Node 20+.
              </li>
            </ol>
          </div>
        </div>
      )}

      {/* SECTION 4: VERSION CONTROL & RELEASE CHANGELOG */}
      {showSection('vcs') && (
        <div className="bg-navy border border-white/10 rounded-2xl p-5 sm:p-6 space-y-5 shadow-xl">
          <div>
            <span className="text-[10px] font-mono uppercase text-amber font-bold tracking-wider">
              Section 04
            </span>
            <h3 className="font-syne font-black text-base sm:text-lg text-white uppercase tracking-wide mt-0.5">
              GitHub Version Control, CI/CD &amp; Release History
            </h3>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            <CodeSnippet
              id="vcs-git"
              title="Git Release & Branch Push Workflow"
              code={`# Always verify types & production bundle before pushing
npm run typecheck && npm run build:cf

# Standard release commit to main (triggers Cloudflare CI)
git status
git add .
git commit -m "feat: update sunmedx platform modules"
git branch -M main
git push -u origin main`}
            />

            <div className="bg-[#10101e] border border-white/10 rounded-xl p-4 space-y-2.5 text-xs font-mono">
              <h4 className="font-syne font-bold text-amber text-xs uppercase tracking-wider">
                CI/CD Pipeline (.github/workflows/deploy.yml)
              </h4>
              <p className="text-gray-300 leading-relaxed">
                Triggers automatically on push to <code className="text-white">main</code> or manual <code className="text-white">workflow_dispatch</code>:
              </p>
              <ul className="space-y-1 text-gray-400 list-disc list-inside">
                <li>Checkout repository (<code className="text-gray-200">actions/checkout@v4</code>)</li>
                <li>Setup Node.js 20 with npm cache (<code className="text-gray-200">npm ci</code>)</li>
                <li>Run strict TypeScript check (<code className="text-gray-200">npm run typecheck</code>)</li>
                <li>Build production SPA (<code className="text-gray-200">npm run build:cf</code>)</li>
                <li>Publish <code className="text-gray-200">dist/</code> via <code className="text-gray-200">cloudflare/pages-action@v1</code></li>
              </ul>
              <p className="text-[11px] text-emerald-400 pt-1">
                Guardrail: Ensure .env remains gitignored and all secrets live in Cloudflare / GitHub Secrets.
              </p>
            </div>
          </div>

          <div className="space-y-3">
            <h4 className="font-syne font-bold text-white text-xs uppercase tracking-wider">
              Platform Release Log
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {RELEASES.filter((r) => matchesSearch(r.version, r.title, r.notes)).map((rel) => (
                <div key={rel.version} className="bg-[#10101e] border border-white/10 rounded-xl p-4 space-y-1.5">
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-syne font-bold text-white text-sm">{rel.title}</span>
                    <span className="px-2 py-0.5 rounded bg-amber/15 border border-amber/30 text-amber font-mono text-[10px] font-bold shrink-0">
                      {rel.version}
                    </span>
                  </div>
                  <p className="text-xs text-gray-400 leading-relaxed">{rel.notes}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
