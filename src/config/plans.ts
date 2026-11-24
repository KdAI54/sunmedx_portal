import { PlanModuleKey, SubscriptionPlan, SubscriptionTierId } from '../types';

export const PLAN_MODULE_LABELS: Record<PlanModuleKey, string> = {
  catalogue: 'E-Catalogue & RFQ Orders',
  basicTools: 'Biomedical Calculators',
  aiAdvisor: 'Client Hub AI Advisor',
  aiFaultTriage: 'AI Equipment Fault Triage',
  amcTracking: 'AMC & Asset Lifecycle Tracking',
  pdfCertificates: 'Signed Calibration & AMC PDFs',
  priorityDispatch: 'Priority Onsite Engineer Dispatch',
  marketingTools: 'Email Marketing & Social Manager',
};

export const DEFAULT_SUBSCRIPTION_PLANS: SubscriptionPlan[] = [
  {
    id: 'free',
    name: 'Free',
    audience: 'For individual clinics & evaluation teams',
    tagline: 'Essential equipment browsing, standard calculators & starter AI access',
    monthlyPriceInr: 0,
    annualPriceInr: 0,
    aiQueryLimitPerMonth: 5,
    maxAmcContracts: 1,
    enabledModules: {
      catalogue: true,
      basicTools: true,
      aiAdvisor: true,
      aiFaultTriage: false,
      amcTracking: true,
      pdfCertificates: false,
      priorityDispatch: false,
      marketingTools: false,
    },
    highlights: [
      'Full E-Catalogue browsing & RFQ requests',
      'Standard Ventilator, Gas & NABL Deviation calculators',
      '5 AI Biomedical Advisor queries / month',
      '1 active equipment lifecycle view',
    ],
  },
  {
    id: 'pro',
    name: 'Pro',
    audience: 'For multi-specialty hospitals & diagnostic labs',
    tagline: 'Complete NABL calibration documentation, AMC tracking & expanded AI',
    monthlyPriceInr: 2499,
    annualPriceInr: 24990,
    aiQueryLimitPerMonth: 100,
    maxAmcContracts: 25,
    enabledModules: {
      catalogue: true,
      basicTools: true,
      aiAdvisor: true,
      aiFaultTriage: true,
      amcTracking: true,
      pdfCertificates: true,
      priorityDispatch: true,
      marketingTools: false,
    },
    highlights: [
      '100 AI Biomedical Advisor & Fault Triage queries / month',
      'Signed NABL Calibration & AMC Agreement PDF exports',
      'Up to 25 active AMC contracts & asset lifecycles',
      'Priority <4-hour emergency field dispatch tracking',
    ],
  },
  {
    id: 'enterprise',
    name: 'Enterprise',
    audience: 'For hospital chains & white-label brand owners',
    tagline: 'Unlimited AI diagnostics, full white-label control & marketing automation',
    monthlyPriceInr: 7999,
    annualPriceInr: 79990,
    aiQueryLimitPerMonth: -1,
    maxAmcContracts: -1,
    enabledModules: {
      catalogue: true,
      basicTools: true,
      aiAdvisor: true,
      aiFaultTriage: true,
      amcTracking: true,
      pdfCertificates: true,
      priorityDispatch: true,
      marketingTools: true,
    },
    highlights: [
      'Unlimited AI Biomedical Hub & Fault Triage queries',
      'Full single-brand white-label studio & custom domain',
      'Unlimited AMC contracts, asset histories & GST invoices',
      'Email Marketing & Social Media Manager suite unlocked',
    ],
  },
];

export function getCurrentMonthKey(): string {
  return new Date().toISOString().slice(0, 7);
}

export function resolveUserPlan(
  plans: SubscriptionPlan[],
  planId?: string | null
): SubscriptionPlan {
  const source = plans.length > 0 ? plans : DEFAULT_SUBSCRIPTION_PLANS;
  const normalized = (planId || 'free').toLowerCase() as SubscriptionTierId;
  return source.find((p) => p.id === normalized) || source[0] || DEFAULT_SUBSCRIPTION_PLANS[0];
}

export function hasModuleAccess(
  plan: SubscriptionPlan | undefined,
  moduleKey: PlanModuleKey
): boolean {
  if (!plan) return false;
  return Boolean(plan.enabledModules?.[moduleKey]);
}

export function getEffectiveAiUsage(
  aiQueriesUsed?: number,
  aiQuotaResetMonth?: string
): number {
  const currentMonth = getCurrentMonthKey();
  if (aiQuotaResetMonth && aiQuotaResetMonth !== currentMonth) {
    return 0;
  }
  return Math.max(0, Number(aiQueriesUsed || 0));
}
