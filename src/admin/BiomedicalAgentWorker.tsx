import React, { useState } from 'react';
import {
  Bot,
  Sparkles,
  Globe,
  BookOpen,
  Wrench,
  ShoppingBag,
  ClipboardCheck,
  Send,
  RefreshCw,
  CheckCircle2,
  ExternalLink,
  Copy,
  Check,
  AlertCircle,
  ArrowUpRight,
  Trash2,
  CopyPlus,
  Download,
  Rocket,
} from 'lucide-react';
import { getDb } from '../services/dataClient';
import { PRODUCT_ASSET_FALLBACKS } from '../config/seed';
import { Course, Product, SiteSettings, Tool } from '../types';

export type WorkerMode = 'research' | 'course_gen' | 'tool_gen' | 'catalogue_gen' | 'ops_worker' | 'portal_clone';

interface BiomedicalAgentWorkerProps {
  adminEmail: string;
  catalogue: Product[];
  courses: Course[];
  tools: Tool[];
  pendingQuotesCount: number;
  pendingServicesCount: number;
  activeAmcCount: number;
  siteSettings: SiteSettings | null;
  onUpdateSettings: (newSettings: Partial<SiteSettings>) => Promise<void>;
  onLogAction: (action: string, details: string) => Promise<void>;
  onStageProduct: (draft: Partial<Product>) => void;
  onStageCourse: (draft: Partial<Course>) => void;
  onStageTool: (draft: Partial<Tool>) => void;
}

interface WorkerRunItem {
  id: string;
  mode: WorkerMode;
  prompt: string;
  timestamp: string;
  result: any;
  deployed?: boolean;
}

const MODE_CONFIG: Record<
  WorkerMode,
  {
    label: string;
    shortLabel: string;
    icon: React.ComponentType<any>;
    description: string;
    placeholder: string;
    presets: string[];
  }
> = {
  research: {
    label: 'Biomedical Research',
    shortLabel: 'Research',
    icon: Globe,
    description: 'Live Google-grounded research on NABL ISO 17025, NABH compliance, CDSCO regulations & hospital equipment pricing.',
    placeholder: 'e.g. Research IEC 60601-1 electrical safety leakage current limits for ICU patient monitors and NABL calibration intervals in India',
    presets: [
      'NABL ISO 17025 calibration tolerances & annual interval for biphasic defibrillators',
      'CDSCO Class B & Class C registration compliance checklist for infusion pumps in India',
      'Indian hospital tender price benchmarks for 5-para ICU patient monitors (INR)',
    ],
  },
  course_gen: {
    label: 'Course Generator',
    shortLabel: 'Courses',
    icon: BookOpen,
    description: 'Generate SunMedX Academy biomedical training courses with module-wise syllabus ready to publish.',
    placeholder: 'e.g. Create an intermediate 6-week course for hospital biomedical engineers on ICU Ventilator PM, pneumatic calibration & sensor testing',
    presets: [
      '6-Week ICU Ventilator Calibration & Preventive Maintenance Certification (Rs 4,500)',
      'Free 2-Week Crash Course on Hospital Electrical Safety & IEC 60601 Audits',
      '4-Week Biphasic Defibrillator & Anesthesia Workstation Servicing Workshop (Hindi/English)',
    ],
  },
  tool_gen: {
    label: 'Clinical Tool Builder',
    shortLabel: 'Tools',
    icon: Wrench,
    description: 'Design biomedical engineering calculators & diagnostic sidebar utilities for clinical technicians.',
    placeholder: 'e.g. Build a Defibrillator Energy Delivery & Impedance Loss Verification tool for field calibration engineers',
    presets: [
      'Defibrillator Joules Tolerance & Discharge Impedance Checker',
      'Infusion Pump Flow Accuracy & Occlusion Alarm Deviation Calculator',
      'Autoclave Sterilization F0 Thermal Lethality & Pressure Verification Tool',
    ],
  },
  catalogue_gen: {
    label: 'Catalogue Spec Drafter',
    shortLabel: 'Catalogue',
    icon: ShoppingBag,
    description: 'Draft technical product specs, INR pricing, HSN codes & clinical feature bullets for SunMedX E-Catalogue.',
    placeholder: 'e.g. Draft an E-Catalogue entry for a Portable Electrical Safety Analyzer with NABL traceable certificate priced at Rs 1,45,000',
    presets: [
      'Portable IEC 60601 Electrical Safety Analyzer (Testing Tools, Rs 1,45,000)',
      'Dual-Channel ICU Syringe Infusion Pump with Anti-Bolus (Critical Care, Rs 32,000)',
      'Modular Multipara Central Nursing Station Telemetry Gateway (RFQ / Price on Request)',
    ],
  },
  ops_worker: {
    label: 'SunMedX Ops Worker',
    shortLabel: 'Ops Agent',
    icon: ClipboardCheck,
    description: 'Draft biomedical SOPs, AMC maintenance scopes, RFQ pricing breakdowns, announcements & Public FAQ entries.',
    placeholder: 'e.g. Draft an NABL calibration SOP checklist for ICU bedside monitors and a matching announcement banner for Mumbai hospitals',
    presets: [
      'Draft an Emergency Breakdown Dispatch SOP checklist for Mumbai ICU calls (<4h SLA)',
      'Write a Public Chatbot FAQ entry explaining SunMedX NABL ISO 17025 calibration validity',
      'Generate a seasonal announcement marquee promoting Platinum ICU AMC Preventive Audits',
    ],
  },
  portal_clone: {
    label: 'Clone / Build Client Portal',
    shortLabel: 'Clone Portal',
    icon: CopyPlus,
    description: 'Clone a complete SunMedX-style portal for a new client brand with full or selective modules, custom theme, starter data & Cloudflare deployment bundle.',
    placeholder: 'Optional extra instructions (e.g. Focus on dialysis centers in Pune, emphasize NABL traceability, or keep free academy courses only)',
    presets: [
      'Full Biomedical Service & E-Catalogue Clone for "MedPulse BioTech" (Pune)',
      'Selective Dental Equipment & AMC Calibration Portal for "DentaCare India" (Bengaluru)',
      'Laboratory Testing Tools & Academy Training Portal for "PathLab Metrology" (Delhi NCR)',
    ],
  },
};

const CLONE_FEATURE_OPTIONS = [
  { key: 'services', label: 'Calibration & Repair Services' },
  { key: 'catalogue', label: 'E-Catalogue & RFQ Cart' },
  { key: 'academy', label: 'Training Academy & Courses' },
  { key: 'tools', label: 'Clinical Calculators' },
  { key: 'quoteInvoice', label: 'GST Quote / Invoice PDF' },
  { key: 'paymentGateway', label: 'Payment Gateway (Razorpay/Stripe/UPI)' },
  { key: 'amcContracts', label: 'AMC Contracts & Field Dispatch' },
  { key: 'aiWorker', label: 'AI Worker & FAQ Assistant' },
  { key: 'multilingual', label: 'EN / HI / MR Translations' },
] as const;

type CloneFeatureKey = (typeof CLONE_FEATURE_OPTIONS)[number]['key'];

export default function BiomedicalAgentWorker({
  adminEmail,
  catalogue,
  courses,
  tools,
  pendingQuotesCount,
  pendingServicesCount,
  activeAmcCount,
  siteSettings,
  onUpdateSettings,
  onLogAction,
  onStageProduct,
  onStageCourse,
  onStageTool,
}: BiomedicalAgentWorkerProps) {
  const [mode, setMode] = useState<WorkerMode>('research');
  const [prompt, setPrompt] = useState('');
  const [isRunning, setIsRunning] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [statusBanner, setStatusBanner] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [runs, setRuns] = useState<WorkerRunItem[]>([]);

  // Portal Clone Builder states
  const [cloneBrandName, setCloneBrandName] = useState('');
  const [cloneNiche, setCloneNiche] = useState<'Biomedical' | 'Dental' | 'Pharma' | 'Lab' | 'Fitness' | 'Optical'>('Biomedical');
  const [cloneCity, setCloneCity] = useState('Pune, Maharashtra, India');
  const [cloneDomain, setCloneDomain] = useState('');
  const [cloneEmail, setCloneEmail] = useState('');
  const [clonePhone, setClonePhone] = useState('');
  const [cloneScope, setCloneScope] = useState<'full' | 'selective'>('full');
  const [selectedFeatures, setSelectedFeatures] = useState<Record<CloneFeatureKey, boolean>>({
    services: true,
    catalogue: true,
    academy: true,
    tools: true,
    quoteInvoice: true,
    paymentGateway: true,
    amcContracts: true,
    aiWorker: true,
    multilingual: true,
  });

  const activeConfig = MODE_CONFIG[mode];

  const notifyStatus = (msg: string) => {
    setStatusBanner(msg);
    setTimeout(() => {
      setStatusBanner((prev) => (prev === msg ? null : prev));
    }, 4500);
  };

  const handleCopy = async (id: string, text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedId(id);
      setTimeout(() => setCopiedId(null), 2000);
    } catch {
      // Clipboard blocked in non-HTTPS contexts
    }
  };

  const applyCloneScope = (scope: 'full' | 'selective') => {
    setCloneScope(scope);
    if (scope === 'full') {
      setSelectedFeatures({
        services: true,
        catalogue: true,
        academy: true,
        tools: true,
        quoteInvoice: true,
        paymentGateway: true,
        amcContracts: true,
        aiWorker: true,
        multilingual: true,
      });
    }
  };

  const executeWorkerTask = async (overridePrompt?: string) => {
    const isClone = mode === 'portal_clone';
    const rawPrompt = (overridePrompt ?? prompt).trim();

    if (isClone && !overridePrompt && !cloneBrandName.trim()) {
      setErrorMsg('Enter a Brand / Client Organization Name to build the cloned portal.');
      return;
    }

    const enabledFeatureKeys = (Object.keys(selectedFeatures) as CloneFeatureKey[]).filter(
      (k) => cloneScope === 'full' || selectedFeatures[k]
    );

    const taskPrompt = isClone
      ? overridePrompt
        ? rawPrompt
        : `Build a ${cloneScope === 'full' ? 'FULL-SUITE' : 'SELECTIVE-FEATURE'} white-label portal clone named "${cloneBrandName.trim()}" (${cloneNiche} niche, city: ${cloneCity || 'India'}, domain: ${cloneDomain || 'auto-generate'}, email: ${cloneEmail || 'auto-generate'}, phone: ${clonePhone || '+91 98765 00000'}). Selected modules: [${enabledFeatureKeys.join(', ')}]. ${rawPrompt ? `Extra notes: ${rawPrompt}` : ''}`
      : rawPrompt;

    if (!taskPrompt || isRunning) return;

    setIsRunning(true);
    setErrorMsg(null);

    try {
      const workspaceContext = {
        siteName: siteSettings?.siteName || 'SunMedX',
        city: 'Mumbai, Maharashtra, India',
        counts: {
          catalogueItems: catalogue.length,
          academyCourses: courses.length,
          sidebarTools: tools.length,
          pendingQuotes: pendingQuotesCount,
          pendingServices: pendingServicesCount,
          activeAmcContracts: activeAmcCount,
        },
        existingCategories: Array.from(new Set(catalogue.map((p) => p.category))).slice(0, 8),
        sampleCourses: courses.slice(0, 5).map((c) => c.title),
        sampleTools: tools.slice(0, 6).map((t) => t.name),
      };

      const res = await fetch('/api/admin-agent', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          mode,
          prompt: taskPrompt,
          workspaceContext,
          ...(isClone && !overridePrompt
            ? {
                portalSpec: {
                  brandName: cloneBrandName.trim(),
                  niche: cloneNiche,
                  city: cloneCity,
                  domain: cloneDomain.trim() || undefined,
                  contactEmail: cloneEmail.trim() || undefined,
                  contactPhone: clonePhone.trim() || undefined,
                  cloneScope,
                  enabledFeatures: enabledFeatureKeys,
                },
              }
            : {}),
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data?.error || `Worker request failed (${res.status})`);
      }

      const newRun: WorkerRunItem = {
        id: `run_${Date.now()}`,
        mode,
        prompt: taskPrompt,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        result: data,
      };

      setRuns((prev) => [newRun, ...prev]);
      if (!overridePrompt) setPrompt('');
      await onLogAction('AI_WORKER_RUN', `Executed ${mode} task: "${taskPrompt.slice(0, 90)}"`);
    } catch (err: any) {
      setErrorMsg(err?.message || 'Unable to reach Biomedical AI Worker endpoint.');
    } finally {
      setIsRunning(false);
    }
  };

  const resolveAssetImage = (assetKey?: string) => {
    switch (assetKey) {
      case 'monitor':
        return PRODUCT_ASSET_FALLBACKS.monitor;
      case 'defibrillator':
        return PRODUCT_ASSET_FALLBACKS.defibrillator;
      case 'ventilator':
        return PRODUCT_ASSET_FALLBACKS.ventilator;
      default:
        return PRODUCT_ASSET_FALLBACKS.analyzer;
    }
  };

  const publishCourseDirect = async (runId: string, courseData: any) => {
    try {
      const db = getDb();
      await db.collection('academy_courses').add({
        title: courseData.title,
        level: courseData.level || 'Intermediate',
        duration: courseData.duration || '4 Weeks',
        language: courseData.language || 'English / Hindi',
        price: Number(courseData.price) || 0,
        featured: Boolean(courseData.featured),
        graphyUrl: courseData.graphyUrl || 'https://sunmedxacademy.graphy.com',
      });
      await onLogAction('AI_WORKER_COURSE_PUBLISH', `AI Worker published course: ${courseData.title}`);
      setRuns((prev) => prev.map((r) => (r.id === runId ? { ...r, deployed: true } : r)));
      notifyStatus(`Course "${courseData.title}" published to SunMedX Academy!`);
    } catch (e: any) {
      setErrorMsg(e?.message || 'Failed publishing course.');
    }
  };

  const deployToolDirect = async (runId: string, toolData: any) => {
    try {
      const db = getDb();
      await db.collection('tools').add({
        name: toolData.name,
        icon: toolData.icon || 'fa-solid fa-calculator',
        category: toolData.category || 'Diagnostics',
        color: toolData.color || '#0EA5E9',
        isFree: toolData.isFree !== false,
        url: null,
        order: tools.length + 1,
      });
      await onLogAction('AI_WORKER_TOOL_DEPLOY', `AI Worker deployed clinical tool: ${toolData.name}`);
      setRuns((prev) => prev.map((r) => (r.id === runId ? { ...r, deployed: true } : r)));
      notifyStatus(`Clinical tool "${toolData.name}" deployed to Tools customizer!`);
    } catch (e: any) {
      setErrorMsg(e?.message || 'Failed deploying clinical tool.');
    }
  };

  const publishProductDirect = async (runId: string, prodData: any) => {
    try {
      const db = getDb();
      await db.collection('products').add({
        name: prodData.name,
        price: !prodData.price || Number(prodData.price) <= 0 ? null : Number(prodData.price),
        category: prodData.category || 'Critical Care',
        badge: prodData.badge || 'SunMedX Verified',
        description: prodData.description || '',
        image: resolveAssetImage(prodData.suggestedAsset),
        features: Array.isArray(prodData.features) ? prodData.features : [],
      });
      await onLogAction('AI_WORKER_PRODUCT_PUBLISH', `AI Worker published product: ${prodData.name}`);
      setRuns((prev) => prev.map((r) => (r.id === runId ? { ...r, deployed: true } : r)));
      notifyStatus(`Equipment "${prodData.name}" added to E-Catalogue!`);
    } catch (e: any) {
      setErrorMsg(e?.message || 'Failed publishing product.');
    }
  };

  const applyFaqEntry = async (runId: string, faq: { question: string; answer: string }) => {
    try {
      const db = getDb();
      await db.collection('chatbot_qa').add({
        question: (faq.question || '').toLowerCase(),
        answer: faq.answer,
      });
      await onLogAction('AI_WORKER_FAQ_ADD', `AI Worker saved FAQ entry: ${faq.question}`);
      setRuns((prev) => prev.map((r) => (r.id === runId ? { ...r, deployed: true } : r)));
      notifyStatus('FAQ entry saved to Public Chatbot FAQ Matrix!');
    } catch (e: any) {
      setErrorMsg(e?.message || 'Failed saving FAQ entry.');
    }
  };

  const applyAnnouncement = async (runId: string, text: string) => {
    try {
      await onUpdateSettings({ tagline: text });
      await onLogAction('AI_WORKER_MARQUEE_UPDATE', `AI Worker updated marquee tagline`);
      setRuns((prev) => prev.map((r) => (r.id === runId ? { ...r, deployed: true } : r)));
      notifyStatus('Sitewide announcement marquee updated!');
    } catch (e: any) {
      setErrorMsg(e?.message || 'Failed updating announcement marquee.');
    }
  };

  const provisionClonedTenant = async (runId: string, bp: any) => {
    try {
      const db = getDb();
      const normalizedNiche = (['Biomedical', 'Dental', 'Pharma', 'Lab', 'Fitness', 'Optical'].includes(bp.niche)
        ? bp.niche
        : 'Biomedical') as 'Biomedical' | 'Dental' | 'Pharma' | 'Lab' | 'Fitness' | 'Optical';
      const normalizedPlan = (['Basic', 'Professional', 'Enterprise'].includes(bp.planType)
        ? bp.planType
        : 'Professional') as 'Basic' | 'Professional' | 'Enterprise';

      const setupFee = Number(bp.setupFeeInr) || 45000;
      const monthlyFee = Number(bp.monthlyRetainerInr) || 15000;

      await db.collection('platform_clients').add({
        name: bp.brandName,
        niche: normalizedNiche,
        domain: bp.domain || `${bp.slug || 'client'}.sunmedx.in`,
        databaseId: bp.databaseId || `db-${bp.slug || 'client'}`,
        deploymentDate: new Date().toISOString().split('T')[0],
        planType: normalizedPlan,
        monthlyFee,
        status: 'Active',
        billingSetupFee: setupFee,
        billingRetainer: monthlyFee,
        paymentHistory: [
          {
            date: new Date().toISOString().split('T')[0],
            amount: setupFee,
            status: 'Paid',
          },
        ],
        nextInvoiceDue: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        totalRevenue: setupFee,
        enabledModules: bp.enabledModules || [],
        blueprint: bp,
      });

      await onLogAction('PORTAL_CLONE_PROVISION', `Provisioned white-label portal clone for ${bp.brandName} (${bp.domain})`);
      setRuns((prev) => prev.map((r) => (r.id === runId ? { ...r, deployed: true } : r)));
      notifyStatus(`Cloned portal "${bp.brandName}" provisioned in Platform Tenants & SaaS Ledger!`);
    } catch (e: any) {
      setErrorMsg(e?.message || 'Failed provisioning cloned client portal.');
    }
  };

  const applyClonedBrandToWorkspace = async (runId: string, bp: any) => {
    if (
      !window.confirm(
        `Apply "${bp.brandName}" white-label branding, theme colors, and homepage layout to this live studio instance?`
      )
    ) {
      return;
    }
    try {
      const themeVars = bp.themeVariables || {
        colorNavy: '#211D70',
        colorCrimson: '#EA2227',
        colorAmber: '#F8C72E',
        colorGolden: '#F8BE15',
        colorDarkBg: '#211C70',
      };

      await onUpdateSettings({
        siteName: bp.brandName,
        tagline: bp.tagline,
        phone: bp.supportPhone,
        email: bp.supportEmail,
        address: bp.address,
        academyUrl: bp.academyUrl,
        themeVariables: themeVars,
        homepageOrder:
          Array.isArray(bp.homepageOrder) && bp.homepageOrder.length > 0
            ? bp.homepageOrder
            : ['hero', 'stats', 'services_preview', 'academy_preview', 'tools_preview', 'testimonials'],
        paymentGateway: {
          ...(siteSettings?.paymentGateway || {
            enabled: true,
            provider: 'razorpay',
            mode: 'test',
            publicKeyId: 'rzp_test_KeyPlaceholder',
            currency: 'INR',
            bankDetails: 'Configure Bank A/C & IFSC in Payment Setup',
            acceptedMethods: { upi: true, cards: true, netbanking: true, wallet: true },
            webhookEndpoint: '/api/payments/webhook',
          }),
          merchantName: bp.merchantName || bp.brandName,
          companyGstin: bp.companyGstin || '',
          upiVpa: bp.upiVpa || '',
        },
      });

      const root = document.documentElement;
      root.style.setProperty('--color-navy', themeVars.colorNavy);
      root.style.setProperty('--color-crimson', themeVars.colorCrimson);
      root.style.setProperty('--color-amber', themeVars.colorAmber);
      root.style.setProperty('--color-golden', themeVars.colorGolden);
      root.style.setProperty('--color-dark-bg', themeVars.colorDarkBg);

      await onLogAction('PORTAL_CLONE_BRAND_APPLY', `Applied white-label clone branding "${bp.brandName}" to active portal`);
      setRuns((prev) => prev.map((r) => (r.id === runId ? { ...r, deployed: true } : r)));
      notifyStatus(`Live portal rebranded to "${bp.brandName}"!`);
    } catch (e: any) {
      setErrorMsg(e?.message || 'Failed applying white-label branding.');
    }
  };

  const exportClonedPortalBundle = (bp: any) => {
    const slug = (bp.slug || bp.brandName || 'client-portal')
      .toLowerCase()
      .replace(/[^a-z0-9-]+/g, '-');

    const bundle = {
      exportedAt: new Date().toISOString(),
      exportedBy: adminEmail,
      sourceTemplate: 'SunMedX Platform v2.12',
      tenantMeta: {
        brandName: bp.brandName,
        slug,
        niche: bp.niche,
        domain: bp.domain,
        databaseId: bp.databaseId,
        planType: bp.planType,
        enabledModules: bp.enabledModules,
      },
      envTemplate: {
        APP_URL: `https://${bp.domain || `${slug}.pages.dev`}`,
        VITE_DATA_SOURCE: 'rest',
        VITE_API_BASE_URL: '/api',
        VITE_AUTH_ENDPOINT: '/api/auth',
        D1_DATABASE_NAME: bp.databaseId || `db-${slug}`,
      },
      seedData: {
        site_settings: {
          seeded: true,
          siteName: bp.brandName,
          tagline: bp.tagline,
          phone: bp.supportPhone,
          email: bp.supportEmail,
          address: bp.address,
          academyUrl: bp.academyUrl,
          gstPercent: 18,
          chatbotEnabled: (bp.enabledModules || []).includes('aiWorker'),
          themeVariables: bp.themeVariables,
          homepageOrder: bp.homepageOrder,
          paymentGateway: {
            merchantName: bp.merchantName,
            companyGstin: bp.companyGstin,
            upiVpa: bp.upiVpa,
          },
        },
        services: bp.services || [],
        products: (bp.products || []).map((p: any) => ({
          ...p,
          image: resolveAssetImage(p.suggestedAsset),
        })),
        academy_courses: bp.courses || [],
        tools: bp.tools || [],
        chatbot_qa: bp.chatbotQa || [],
      },
    };

    const blob = new Blob([JSON.stringify(bundle, null, 2)], { type: 'application/json;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${slug}-portal-clone-bundle.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    notifyStatus(`Exported complete portal clone bundle: ${slug}-portal-clone-bundle.json`);
  };

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* Header & SunMedX Worker Training Status */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 bg-navy border border-amber/20 rounded-2xl p-5 sm:p-6 shadow-xl">
        <div className="flex items-start gap-3.5 min-w-0">
          <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-crimson to-amber text-navy flex items-center justify-center shrink-0 shadow-lg shadow-crimson/20">
            <Bot className="w-6 h-6" />
          </div>
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="font-syne font-black text-lg sm:text-xl text-white uppercase tracking-wider">
                SunMedX Biomedical AI Worker
              </h2>
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 font-mono text-[10px] font-bold uppercase">
                <Sparkles className="w-3 h-3" /> Domain Trained
              </span>
            </div>
            <p className="text-xs text-gray-400 font-mono mt-1 leading-relaxed">
              Autonomous engineering &amp; operations agent trained on SunMedX NABL/IEC 60601 workflows, course/tool/catalogue builders, and multi-tenant client portal cloning.
            </p>
          </div>
        </div>

        {/* Action Trigger + Live Context Snapshot */}
        <div className="flex flex-col sm:flex-row lg:flex-col xl:flex-row items-start sm:items-center lg:items-end xl:items-center gap-2.5 shrink-0">
          <button
            type="button"
            onClick={() => setMode('portal_clone')}
            className={`px-4 py-2.5 rounded-xl font-syne font-black uppercase text-xs tracking-wider flex items-center gap-2 shadow-lg transition-all ${
              mode === 'portal_clone'
                ? 'bg-amber text-navy ring-2 ring-amber/40'
                : 'bg-gradient-to-r from-crimson to-amber text-navy hover:opacity-95'
            }`}
          >
            <CopyPlus className="w-4 h-4 shrink-0" />
            <span>Build / Clone Portal for Client</span>
          </button>

          <div className="flex flex-wrap gap-1.5 text-[10px] font-mono">
            <span className="px-2 py-1 rounded-lg bg-[#10101e] border border-white/10 text-gray-300">
              Cat: <strong className="text-amber">{catalogue.length}</strong>
            </span>
            <span className="px-2 py-1 rounded-lg bg-[#10101e] border border-white/10 text-gray-300">
              Courses: <strong className="text-amber">{courses.length}</strong>
            </span>
            <span className="px-2 py-1 rounded-lg bg-[#10101e] border border-white/10 text-gray-300">
              RFQs: <strong className="text-red-400">{pendingQuotesCount}</strong>
            </span>
          </div>
        </div>
      </div>

      {/* Notifications */}
      {statusBanner && (
        <div className="bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 rounded-xl px-4 py-3 text-xs font-mono flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 shrink-0" />
          <span>{statusBanner}</span>
        </div>
      )}

      {errorMsg && (
        <div className="bg-red-500/10 border border-red-500/30 text-red-300 rounded-xl px-4 py-3 text-xs font-mono flex items-start gap-2">
          <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
          <div className="min-w-0 flex-1">
            <p className="font-bold">Worker Execution Error</p>
            <p className="text-red-200/90 mt-0.5 break-words">{errorMsg}</p>
          </div>
        </div>
      )}

      {/* Main Responsive Split: Controls + Live Results */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 items-start">
        {/* Left Task Dispatcher */}
        <div className="xl:col-span-5 bg-navy border border-white/10 rounded-2xl p-4 sm:p-6 space-y-5 shadow-xl">
          {/* Mode Selector */}
          <div className="space-y-2">
            <label className="block text-[10px] font-mono uppercase text-gray-400 font-bold tracking-wider">
              1. Select Worker Specialization
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-2 gap-2">
              {(Object.keys(MODE_CONFIG) as WorkerMode[]).map((mKey) => {
                const cfg = MODE_CONFIG[mKey];
                const IconComp = cfg.icon;
                const active = mode === mKey;
                return (
                  <button
                    key={mKey}
                    type="button"
                    onClick={() => setMode(mKey)}
                    className={`flex items-center gap-2 px-3 py-2.5 rounded-xl border text-left text-xs font-syne font-bold transition-all ${
                      active
                        ? 'bg-gradient-to-r from-crimson to-amber text-navy border-amber shadow-md'
                        : 'bg-[#10101e] text-gray-300 border-white/10 hover:border-amber/40 hover:text-white'
                    }`}
                  >
                    <IconComp className="w-4 h-4 shrink-0" />
                    <span className="truncate">{cfg.shortLabel}</span>
                  </button>
                );
              })}
            </div>
            <p className="text-[11px] font-mono text-gray-400 leading-relaxed pt-1">
              {activeConfig.description}
            </p>
          </div>

          {/* Portal Clone Structured Configurator (only when mode === 'portal_clone') */}
          {mode === 'portal_clone' && (
            <div className="space-y-4 bg-[#10101e] border border-amber/25 rounded-xl p-4">
              <div className="flex items-center justify-between gap-2">
                <span className="text-[10px] font-mono uppercase text-amber font-bold tracking-wider">
                  White-Label Client Portal Spec
                </span>
                <div className="flex rounded-lg overflow-hidden border border-white/10 text-[10px] font-mono">
                  <button
                    type="button"
                    onClick={() => applyCloneScope('full')}
                    className={`px-2.5 py-1 font-bold ${
                      cloneScope === 'full' ? 'bg-amber text-navy' : 'bg-navy text-gray-300'
                    }`}
                  >
                    Full Suite
                  </button>
                  <button
                    type="button"
                    onClick={() => applyCloneScope('selective')}
                    className={`px-2.5 py-1 font-bold ${
                      cloneScope === 'selective' ? 'bg-amber text-navy' : 'bg-navy text-gray-300'
                    }`}
                  >
                    Selective
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 text-xs">
                <div>
                  <label className="block text-[10px] font-mono text-gray-400 mb-1">Client Brand Name *</label>
                  <input
                    type="text"
                    placeholder="e.g. Apex MedTech"
                    value={cloneBrandName}
                    onChange={(e) => setCloneBrandName(e.target.value)}
                    className="w-full bg-navy border border-white/15 rounded-lg px-3 py-2 text-xs text-white focus:border-amber focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-mono text-gray-400 mb-1">Industry Niche</label>
                  <select
                    value={cloneNiche}
                    onChange={(e) => setCloneNiche(e.target.value as any)}
                    className="w-full bg-navy border border-white/15 rounded-lg px-3 py-2 text-xs text-white focus:border-amber focus:outline-none"
                  >
                    {['Biomedical', 'Dental', 'Pharma', 'Lab', 'Fitness', 'Optical'].map((n) => (
                      <option key={n} value={n}>{n}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-[10px] font-mono text-gray-400 mb-1">Target Domain / Subdomain</label>
                  <input
                    type="text"
                    placeholder="e.g. apex.sunmedx.in"
                    value={cloneDomain}
                    onChange={(e) => setCloneDomain(e.target.value)}
                    className="w-full bg-navy border border-white/15 rounded-lg px-3 py-2 text-xs text-white font-mono focus:border-amber focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-mono text-gray-400 mb-1">City / Region</label>
                  <input
                    type="text"
                    placeholder="Pune, Maharashtra"
                    value={cloneCity}
                    onChange={(e) => setCloneCity(e.target.value)}
                    className="w-full bg-navy border border-white/15 rounded-lg px-3 py-2 text-xs text-white focus:border-amber focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-mono text-gray-400 mb-1">Contact Email</label>
                  <input
                    type="email"
                    placeholder="care@apexmedtech.in"
                    value={cloneEmail}
                    onChange={(e) => setCloneEmail(e.target.value)}
                    className="w-full bg-navy border border-white/15 rounded-lg px-3 py-2 text-xs text-white font-mono focus:border-amber focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-mono text-gray-400 mb-1">Contact Phone</label>
                  <input
                    type="text"
                    placeholder="+91 98200 11223"
                    value={clonePhone}
                    onChange={(e) => setClonePhone(e.target.value)}
                    className="w-full bg-navy border border-white/15 rounded-lg px-3 py-2 text-xs text-white font-mono focus:border-amber focus:outline-none"
                  />
                </div>
              </div>

              {cloneScope === 'selective' && (
                <div className="space-y-1.5 pt-1">
                  <span className="block text-[10px] font-mono uppercase text-gray-400 font-bold">
                    Select Portal Modules to Clone
                  </span>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                    {CLONE_FEATURE_OPTIONS.map((feat) => (
                      <label
                        key={feat.key}
                        className={`flex items-center gap-2 px-2.5 py-1.5 rounded-lg border text-[11px] cursor-pointer transition-colors ${
                          selectedFeatures[feat.key]
                            ? 'bg-amber/10 border-amber/35 text-white'
                            : 'bg-navy border-white/5 text-gray-500'
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={selectedFeatures[feat.key]}
                          onChange={() =>
                            setSelectedFeatures((prev) => ({ ...prev, [feat.key]: !prev[feat.key] }))
                          }
                          className="accent-amber w-3.5 h-3.5"
                        />
                        <span className="truncate">{feat.label}</span>
                      </label>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Task Input */}
          <div className="space-y-2">
            <label className="block text-[10px] font-mono uppercase text-gray-400 font-bold tracking-wider">
              {mode === 'portal_clone' ? '3. Custom Clone Notes (Optional)' : `2. Assign Task Brief (${activeConfig.label})`}
            </label>
            <textarea
              rows={mode === 'portal_clone' ? 2 : 4}
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              onKeyDown={(e) => {
                if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
                  e.preventDefault();
                  executeWorkerTask();
                }
              }}
              placeholder={activeConfig.placeholder}
              className="w-full bg-[#10101e] border border-orange-500/25 focus:border-amber rounded-xl px-4 py-3 text-xs text-white placeholder:text-gray-500 focus:outline-none leading-relaxed"
            />
            <div className="flex items-center justify-between gap-2">
              <span className="text-[10px] font-mono text-gray-500">Operator: {adminEmail}</span>
              <button
                type="button"
                onClick={() => executeWorkerTask()}
                disabled={isRunning || (mode === 'portal_clone' ? !cloneBrandName.trim() : !prompt.trim())}
                className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-crimson to-amber text-navy font-syne font-black uppercase text-xs tracking-wider flex items-center gap-2 hover:opacity-95 disabled:opacity-45 transition-all shadow-lg shadow-crimson/20"
              >
                {isRunning ? (
                  <RefreshCw className="w-4 h-4 animate-spin" />
                ) : mode === 'portal_clone' ? (
                  <Rocket className="w-4 h-4" />
                ) : (
                  <Send className="w-4 h-4" />
                )}
                <span>
                  {isRunning
                    ? 'Building...'
                    : mode === 'portal_clone'
                    ? 'Build & Clone Portal'
                    : 'Run AI Worker'}
                </span>
              </button>
            </div>
          </div>

          {/* SunMedX Trained Quick Task Presets */}
          <div className="space-y-2 border-t border-white/10 pt-4">
            <span className="block text-[10px] font-mono uppercase text-amber font-bold tracking-wider">
              SunMedX One-Click Worker Tasks
            </span>
            <div className="space-y-2">
              {activeConfig.presets.map((presetText, idx) => (
                <button
                  key={idx}
                  type="button"
                  disabled={isRunning}
                  onClick={() => {
                    setPrompt(presetText);
                    executeWorkerTask(presetText);
                  }}
                  className="w-full text-left p-2.5 rounded-xl bg-[#10101e] hover:bg-[#17172d] border border-white/10 hover:border-amber/40 text-[11px] font-mono text-gray-300 flex items-start justify-between gap-2 transition-colors disabled:opacity-50"
                >
                  <span className="leading-snug">{presetText}</span>
                  <ArrowUpRight className="w-3.5 h-3.5 text-amber shrink-0 mt-0.5" />
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Right Output & Action Artifacts */}
        <div className="xl:col-span-7 space-y-4 min-w-0">
          <div className="flex items-center justify-between">
            <h3 className="font-syne font-black text-sm text-gray-300 uppercase tracking-widest">
              Worker Output &amp; Deployable Deliverables ({runs.length})
            </h3>
            {runs.length > 0 && (
              <button
                type="button"
                onClick={() => setRuns([])}
                className="text-[11px] font-mono text-gray-400 hover:text-red-400 flex items-center gap-1"
              >
                <Trash2 className="w-3.5 h-3.5" /> Clear Log
              </button>
            )}
          </div>

          {runs.length === 0 ? (
            <div className="bg-navy border border-white/10 rounded-2xl p-8 sm:p-10 text-center space-y-3">
              <Bot className="w-10 h-10 text-amber mx-auto opacity-80" />
              <h4 className="font-syne font-bold text-white text-base">
                Ready for Biomedical Admin Operations
              </h4>
              <p className="text-xs font-mono text-gray-400 max-w-md mx-auto leading-relaxed">
                Select a worker specialization on the left to research Indian NABL/CDSCO regulations, generate Academy courses, build clinical tools, draft E-Catalogue listings, or execute SOP &amp; quote tasks.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {runs.map((run) => {
                const cfg = MODE_CONFIG[run.mode];
                const IconComp = cfg.icon;
                const res = run.result;

                return (
                  <div
                    key={run.id}
                    className="bg-navy border border-white/10 rounded-2xl p-4 sm:p-6 space-y-4 shadow-xl"
                  >
                    {/* Card Header */}
                    <div className="flex flex-wrap items-start justify-between gap-2 border-b border-white/10 pb-3">
                      <div className="space-y-1 min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-amber/15 border border-amber/30 text-amber text-[10px] font-mono font-bold uppercase">
                            <IconComp className="w-3 h-3" /> {cfg.label}
                          </span>
                          <span className="text-[10px] font-mono text-gray-500">{run.timestamp}</span>
                          {run.deployed && (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 text-[10px] font-mono font-bold">
                              <Check className="w-3 h-3" /> Deployed
                            </span>
                          )}
                        </div>
                        <p className="text-xs font-mono text-gray-300 italic break-words">
                          Task: "{run.prompt}"
                        </p>
                      </div>
                    </div>

                    {/* Mode: Research */}
                    {run.mode === 'research' && (
                      <div className="space-y-4">
                        <div className="bg-[#10101e] border border-white/10 rounded-xl p-4 text-xs sm:text-sm text-gray-200 whitespace-pre-wrap leading-relaxed font-sans">
                          {res.text}
                        </div>

                        {Array.isArray(res.sources) && res.sources.length > 0 && (
                          <div className="space-y-2">
                            <span className="block text-[10px] font-mono uppercase text-amber font-bold">
                              Verified Web Sources ({res.sources.length})
                            </span>
                            <div className="flex flex-wrap gap-2">
                              {res.sources.slice(0, 8).map((src: any, idx: number) => (
                                <a
                                  key={idx}
                                  href={src.uri}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#10101e] border border-white/10 hover:border-amber/40 text-[11px] font-mono text-sky-300 hover:text-amber transition-colors max-w-full"
                                >
                                  <span className="truncate max-w-[220px]">{src.title || src.uri}</span>
                                  <ExternalLink className="w-3 h-3 shrink-0" />
                                </a>
                              ))}
                            </div>
                          </div>
                        )}

                        <div className="flex flex-wrap gap-2">
                          <button
                            type="button"
                            onClick={() => handleCopy(run.id, res.text || '')}
                            className="px-3.5 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-xs font-mono text-gray-200 flex items-center gap-1.5"
                          >
                            {copiedId === run.id ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                            <span>{copiedId === run.id ? 'Copied Brief' : 'Copy Research Brief'}</span>
                          </button>
                          <button
                            type="button"
                            onClick={() =>
                              applyFaqEntry(run.id, {
                                question: run.prompt.slice(0, 120),
                                answer: (res.text || '').slice(0, 750),
                              })
                            }
                            className="px-3.5 py-2 rounded-xl bg-amber/15 hover:bg-amber/25 border border-amber/30 text-xs font-mono font-bold text-amber"
                          >
                            Save Summary to FAQ Matrix
                          </button>
                        </div>
                      </div>
                    )}

                    {/* Mode: Course Generator */}
                    {run.mode === 'course_gen' && res.course && (
                      <div className="space-y-4">
                        <p className="text-xs text-gray-300 leading-relaxed">{res.summary}</p>
                        <div className="bg-[#10101e] border border-white/10 rounded-xl p-4 space-y-3">
                          <div className="flex flex-wrap items-start justify-between gap-2">
                            <div>
                              <h4 className="font-syne font-bold text-white text-base">{res.course.title}</h4>
                              <p className="text-[11px] font-mono text-amber mt-0.5">
                                {res.course.level} • {res.course.duration} • {res.course.language}
                              </p>
                            </div>
                            <span className="px-3 py-1 rounded-lg bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 font-mono text-xs font-bold">
                              {Number(res.course.price) > 0 ? `Rs ${Number(res.course.price).toLocaleString()}` : 'FREE CERTIFIED'}
                            </span>
                          </div>

                          {res.course.targetAudience && (
                            <p className="text-xs text-gray-400">
                              <strong className="text-gray-200">Target Audience:</strong> {res.course.targetAudience}
                            </p>
                          )}

                          {Array.isArray(res.course.syllabus) && res.course.syllabus.length > 0 && (
                            <div className="space-y-2 pt-2 border-t border-white/10">
                              <span className="text-[10px] font-mono uppercase text-gray-400 font-bold">
                                Generated Syllabus Outline
                              </span>
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
                                {res.course.syllabus.map((mod: any, idx: number) => (
                                  <div key={idx} className="bg-navy border border-white/5 rounded-lg p-3 space-y-1">
                                    <p className="text-xs font-bold text-white">{mod.module}</p>
                                    <ul className="list-disc list-inside text-[11px] text-gray-400 space-y-0.5">
                                      {(mod.topics || []).map((t: string, tidx: number) => (
                                        <li key={tidx}>{t}</li>
                                      ))}
                                    </ul>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>

                        <div className="flex flex-wrap gap-2.5">
                          <button
                            type="button"
                            onClick={() => publishCourseDirect(run.id, res.course)}
                            className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-crimson to-amber text-navy font-syne font-black uppercase text-xs tracking-wider"
                          >
                            Publish to Academy
                          </button>
                          <button
                            type="button"
                            onClick={() =>
                              onStageCourse({
                                title: res.course.title,
                                level: res.course.level,
                                duration: res.course.duration,
                                language: res.course.language,
                                price: Number(res.course.price) || 0,
                                featured: Boolean(res.course.featured),
                                graphyUrl: res.course.graphyUrl || 'https://sunmedxacademy.graphy.com',
                              })
                            }
                            className="px-4 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-xs font-mono text-gray-200"
                          >
                            Load into Academy Editor
                          </button>
                        </div>
                      </div>
                    )}

                    {/* Mode: Clinical Tool Generator */}
                    {run.mode === 'tool_gen' && res.tool && (
                      <div className="space-y-4">
                        <p className="text-xs text-gray-300 leading-relaxed">{res.summary}</p>
                        <div className="bg-[#10101e] border border-white/10 rounded-xl p-4 space-y-3">
                          <div className="flex flex-wrap items-center justify-between gap-2">
                            <div className="flex items-center gap-3">
                              <div
                                className="w-10 h-10 rounded-xl bg-navy border border-white/10 flex items-center justify-center shrink-0"
                                style={{ color: res.tool.color || '#F8C72E' }}
                              >
                                <i className={`${res.tool.icon || 'fa-solid fa-calculator'} text-base`} />
                              </div>
                              <div>
                                <h4 className="font-syne font-bold text-white text-base">{res.tool.name}</h4>
                                <p className="text-[11px] font-mono text-gray-400">{res.tool.category}</p>
                              </div>
                            </div>
                            <span className="px-2.5 py-1 rounded-lg bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 font-mono text-[10px] font-bold uppercase">
                              {res.tool.isFree ? 'Free Clinical Tool' : 'Pro Utility'}
                            </span>
                          </div>

                          <p className="text-xs text-gray-300 leading-relaxed">{res.tool.description}</p>

                          <div className="bg-navy border border-white/10 rounded-lg p-3 space-y-1 font-mono text-xs">
                            <div className="text-amber font-bold">Formula: {res.tool.formula}</div>
                            <div className="text-gray-300">Output Metric: {res.tool.outputLabel}</div>
                            <div className="text-emerald-400">Safety Tolerance: {res.tool.safetyThreshold}</div>
                          </div>

                          {Array.isArray(res.tool.inputs) && res.tool.inputs.length > 0 && (
                            <div className="flex flex-wrap gap-2">
                              {res.tool.inputs.map((inp: any, idx: number) => (
                                <div key={idx} className="px-3 py-1.5 rounded-lg bg-white/5 border border-white/10 text-[11px] font-mono text-gray-200">
                                  {inp.label}: <span className="text-amber">{inp.defaultValue} {inp.unit}</span>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>

                        <div className="flex flex-wrap gap-2.5">
                          <button
                            type="button"
                            onClick={() => deployToolDirect(run.id, res.tool)}
                            className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-crimson to-amber text-navy font-syne font-black uppercase text-xs tracking-wider"
                          >
                            Deploy Tool to Sidebar
                          </button>
                          <button
                            type="button"
                            onClick={() =>
                              onStageTool({
                                name: res.tool.name,
                                icon: res.tool.icon,
                                category: res.tool.category,
                                color: res.tool.color,
                                isFree: res.tool.isFree,
                                url: '',
                              })
                            }
                            className="px-4 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-xs font-mono text-gray-200"
                          >
                            Open in Tools Customizer
                          </button>
                        </div>
                      </div>
                    )}

                    {/* Mode: Catalogue Product Generator */}
                    {run.mode === 'catalogue_gen' && res.product && (
                      <div className="space-y-4">
                        <p className="text-xs text-gray-300 leading-relaxed">{res.summary}</p>
                        <div className="bg-[#10101e] border border-white/10 rounded-xl p-4 space-y-3">
                          <div className="flex items-start gap-3">
                            <img
                              src={resolveAssetImage(res.product.suggestedAsset)}
                              alt={res.product.name}
                              className="w-16 h-16 rounded-xl object-cover border border-white/10 shrink-0"
                            />
                            <div className="min-w-0 flex-1">
                              <div className="flex flex-wrap items-center justify-between gap-2">
                                <h4 className="font-syne font-bold text-white text-base">{res.product.name}</h4>
                                <span className="font-mono text-xs font-bold text-amber">
                                  {Number(res.product.price) > 0
                                    ? `Rs ${Number(res.product.price).toLocaleString()}`
                                    : 'Price on Request (RFQ)'}
                                </span>
                              </div>
                              <p className="text-[11px] font-mono text-gray-400 mt-0.5">
                                {res.product.category} • Badge: {res.product.badge} • HSN/SAC: {res.product.hsnSac}
                              </p>
                            </div>
                          </div>

                          <p className="text-xs text-gray-300 leading-relaxed">{res.product.description}</p>

                          {Array.isArray(res.product.features) && (
                            <ul className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 text-[11px] font-mono text-gray-300">
                              {res.product.features.map((f: string, idx: number) => (
                                <li key={idx} className="bg-navy px-2.5 py-1.5 rounded-lg border border-white/5">
                                  • {f}
                                </li>
                              ))}
                            </ul>
                          )}
                        </div>

                        <div className="flex flex-wrap gap-2.5">
                          <button
                            type="button"
                            onClick={() => publishProductDirect(run.id, res.product)}
                            className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-crimson to-amber text-navy font-syne font-black uppercase text-xs tracking-wider"
                          >
                            Publish to E-Catalogue
                          </button>
                          <button
                            type="button"
                            onClick={() =>
                              onStageProduct({
                                name: res.product.name,
                                price: Number(res.product.price) || 0,
                                category: res.product.category,
                                badge: res.product.badge,
                                description: res.product.description,
                                features: res.product.features || [],
                                image: resolveAssetImage(res.product.suggestedAsset),
                              })
                            }
                            className="px-4 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-xs font-mono text-gray-200"
                          >
                            Open in Catalogue CRUD (Edit / Attach Photo)
                          </button>
                        </div>
                      </div>
                    )}

                    {/* Mode: SunMedX Ops Worker */}
                    {run.mode === 'ops_worker' && res.deliverables && (
                      <div className="space-y-4">
                        <p className="text-xs text-gray-300 leading-relaxed">{res.summary}</p>
                        <div className="bg-[#10101e] border border-white/10 rounded-xl p-4 space-y-3">
                          <h4 className="font-syne font-bold text-white text-sm uppercase tracking-wide">
                            {res.deliverables.title}
                          </h4>

                          {Array.isArray(res.deliverables.checklist) && res.deliverables.checklist.length > 0 && (
                            <ul className="space-y-1.5 text-xs text-gray-300 font-mono">
                              {res.deliverables.checklist.map((step: string, idx: number) => (
                                <li key={idx} className="flex items-start gap-2 bg-navy px-3 py-2 rounded-lg border border-white/5">
                                  <span className="text-amber font-bold">{idx + 1}.</span>
                                  <span>{step}</span>
                                </li>
                              ))}
                            </ul>
                          )}

                          {res.deliverables.faqEntry?.question && (
                            <div className="bg-navy border border-amber/20 rounded-xl p-3 space-y-1.5 text-xs">
                              <span className="text-[10px] font-mono uppercase text-amber font-bold">
                                Ready FAQ Entry
                              </span>
                              <p className="font-bold text-white">Q: {res.deliverables.faqEntry.question}</p>
                              <p className="text-gray-300">A: {res.deliverables.faqEntry.answer}</p>
                              <button
                                type="button"
                                onClick={() => applyFaqEntry(run.id, res.deliverables.faqEntry)}
                                className="mt-2 px-3.5 py-2 rounded-lg bg-amber text-navy font-syne font-bold uppercase text-[11px]"
                              >
                                Save to Public FAQ Matrix
                              </button>
                            </div>
                          )}

                          {res.deliverables.announcementText && (
                            <div className="bg-navy border border-amber/20 rounded-xl p-3 space-y-2 text-xs">
                              <span className="text-[10px] font-mono uppercase text-amber font-bold">
                                Announcement Marquee Draft
                              </span>
                              <p className="font-mono text-amber">{res.deliverables.announcementText}</p>
                              <button
                                type="button"
                                onClick={() => applyAnnouncement(run.id, res.deliverables.announcementText)}
                                className="px-3.5 py-2 rounded-lg bg-amber text-navy font-syne font-bold uppercase text-[11px]"
                              >
                                Apply to Site Announcement
                              </button>
                            </div>
                          )}

                          {res.deliverables.quoteDraft?.description && (
                            <div className="bg-navy border border-white/10 rounded-xl p-3 space-y-1 text-xs font-mono">
                              <span className="text-[10px] uppercase text-amber font-bold">Draft Quote Scope</span>
                              <p className="text-white font-bold">{res.deliverables.quoteDraft.description}</p>
                              <p className="text-gray-400">
                                HSN/SAC: {res.deliverables.quoteDraft.hsnSac} • Qty: {res.deliverables.quoteDraft.quantity} • Unit: Rs {Number(res.deliverables.quoteDraft.unitPrice || 0).toLocaleString()}
                              </p>
                              <p className="text-gray-300">{res.deliverables.quoteDraft.notes}</p>
                            </div>
                          )}
                        </div>

                        <button
                          type="button"
                          onClick={() =>
                            handleCopy(
                              run.id,
                              `${res.deliverables.title}\n\n${res.summary}\n\n${(res.deliverables.checklist || [])
                                .map((c: string, i: number) => `${i + 1}. ${c}`)
                                .join('\n')}`
                            )
                          }
                          className="px-3.5 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-xs font-mono text-gray-200 flex items-center gap-1.5"
                        >
                          {copiedId === run.id ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                          <span>{copiedId === run.id ? 'Copied Deliverable' : 'Copy Deliverable'}</span>
                        </button>
                      </div>
                    )}
                    {/* Mode: Cloned Portal Blueprint */}
                    {run.mode === 'portal_clone' && res.portalBlueprint && (() => {
                      const bp = res.portalBlueprint;
                      const tv = bp.themeVariables || {};
                      const envSnippet = `APP_URL="https://${bp.domain}"\nVITE_DATA_SOURCE="rest"\nVITE_API_BASE_URL="/api"\nVITE_AUTH_ENDPOINT="/api/auth"\n# Cloudflare D1: npx wrangler d1 create ${bp.databaseId}`;

                      return (
                        <div className="space-y-4">
                          <p className="text-xs text-gray-300 leading-relaxed">{res.summary}</p>
                          <div className="bg-[#10101e] border border-white/10 rounded-xl p-4 space-y-4">
                            <div className="flex flex-wrap items-start justify-between gap-3 border-b border-white/10 pb-3">
                              <div>
                                <div className="flex flex-wrap items-center gap-2">
                                  <h4 className="font-syne font-bold text-white text-base">{bp.brandName}</h4>
                                  <span className="px-2 py-0.5 rounded bg-indigo-500/20 text-indigo-300 font-mono text-[10px] font-bold uppercase">
                                    {bp.niche}
                                  </span>
                                  <span className="px-2 py-0.5 rounded bg-amber/15 text-amber font-mono text-[10px] font-bold">
                                    {bp.planType}
                                  </span>
                                </div>
                                <p className="text-xs text-sky-300 font-mono mt-0.5">
                                  {bp.domain} • D1: {bp.databaseId}
                                </p>
                                <p className="text-[11px] text-gray-400 mt-1 italic">{bp.tagline}</p>
                              </div>

                              <div className="text-right font-mono text-xs shrink-0">
                                <div className="text-amber font-bold">
                                  Setup: Rs {Number(bp.setupFeeInr || 45000).toLocaleString()}
                                </div>
                                <div className="text-emerald-300 text-[11px]">
                                  Retainer: Rs {Number(bp.monthlyRetainerInr || 15000).toLocaleString()}/mo
                                </div>
                              </div>
                            </div>

                            {/* Palette & Contact */}
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-[11px] font-mono">
                              <div className="bg-navy rounded-lg p-3 border border-white/5 space-y-1.5">
                                <span className="text-gray-400 uppercase font-bold block text-[10px]">
                                  Brand Identity &amp; Billing
                                </span>
                                <p className="text-white truncate">{bp.merchantName}</p>
                                <p className="text-gray-300">GSTIN: {bp.companyGstin} • UPI: {bp.upiVpa}</p>
                                <p className="text-gray-400 truncate">{bp.supportEmail} • {bp.supportPhone}</p>
                              </div>
                              <div className="bg-navy rounded-lg p-3 border border-white/5 space-y-2">
                                <span className="text-gray-400 uppercase font-bold block text-[10px]">
                                  Cloned Theme Swatches
                                </span>
                                <div className="flex flex-wrap gap-2">
                                  {Object.entries(tv).map(([k, hex]) => (
                                    <div key={k} className="flex items-center gap-1.5 bg-black/30 px-2 py-1 rounded border border-white/10">
                                      <span className="w-3 h-3 rounded-full border border-white/20" style={{ backgroundColor: String(hex) }} />
                                      <span className="text-[10px] text-gray-300">{String(hex)}</span>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            </div>

                            {/* Enabled Modules & Seeded Counts */}
                            <div className="space-y-2">
                              <span className="text-[10px] font-mono uppercase text-amber font-bold">
                                Cloned Features ({(bp.enabledModules || []).length}) &amp; Starter Seed Data
                              </span>
                              <div className="flex flex-wrap gap-1.5">
                                {(bp.enabledModules || []).map((mod: string) => (
                                  <span key={mod} className="px-2 py-0.5 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 font-mono text-[10px]">
                                    ✓ {mod}
                                  </span>
                                ))}
                              </div>
                              <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 pt-1 text-[11px] font-mono text-center">
                                <div className="bg-navy p-2 rounded-lg border border-white/5 text-gray-300">
                                  <strong className="text-white block">{(bp.services || []).length}</strong>Services
                                </div>
                                <div className="bg-navy p-2 rounded-lg border border-white/5 text-gray-300">
                                  <strong className="text-white block">{(bp.products || []).length}</strong>Catalogue
                                </div>
                                <div className="bg-navy p-2 rounded-lg border border-white/5 text-gray-300">
                                  <strong className="text-white block">{(bp.courses || []).length}</strong>Courses
                                </div>
                                <div className="bg-navy p-2 rounded-lg border border-white/5 text-gray-300">
                                  <strong className="text-white block">{(bp.tools || []).length}</strong>Tools
                                </div>
                                <div className="bg-navy p-2 rounded-lg border border-white/5 text-gray-300">
                                  <strong className="text-white block">{(bp.chatbotQa || []).length}</strong>FAQs
                                </div>
                              </div>
                            </div>
                          </div>

                          {/* Cloned Portal Real Execution Actions */}
                          <div className="flex flex-wrap gap-2.5">
                            <button
                              type="button"
                              onClick={() => provisionClonedTenant(run.id, bp)}
                              className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-crimson to-amber text-navy font-syne font-black uppercase text-xs tracking-wider flex items-center gap-1.5"
                            >
                              <Rocket className="w-3.5 h-3.5" />
                              <span>Provision Client Tenant</span>
                            </button>
                            <button
                              type="button"
                              onClick={() => exportClonedPortalBundle(bp)}
                              className="px-4 py-2.5 rounded-xl bg-sky-500/20 hover:bg-sky-500/30 border border-sky-400/30 text-xs font-mono font-bold text-sky-200 flex items-center gap-1.5"
                            >
                              <Download className="w-3.5 h-3.5" />
                              <span>Export Portal JSON Bundle</span>
                            </button>
                            <button
                              type="button"
                              onClick={() => handleCopy(run.id, envSnippet)}
                              className="px-3.5 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-xs font-mono text-gray-200 flex items-center gap-1.5"
                            >
                              {copiedId === run.id ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                              <span>{copiedId === run.id ? 'Copied .env' : 'Copy Client .env'}</span>
                            </button>
                            <button
                              type="button"
                              onClick={() => applyClonedBrandToWorkspace(run.id, bp)}
                              className="px-3.5 py-2.5 rounded-xl bg-amber/15 hover:bg-amber/25 border border-amber/30 text-xs font-mono font-bold text-amber"
                            >
                              Apply Brand to Live Portal
                            </button>
                          </div>
                        </div>
                      );
                    })()}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
