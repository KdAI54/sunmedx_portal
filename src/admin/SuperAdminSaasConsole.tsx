import React, { useEffect, useMemo, useState } from 'react';
import {
  Check,
  CreditCard,
  Crown,
  Layers,
  PauseCircle,
  PlayCircle,
  RefreshCw,
  Save,
  ShieldCheck,
  Sliders,
  ToggleLeft,
  ToggleRight,
  Trash2,
  UserCheck,
  Users,
} from 'lucide-react';
import { getDb } from '../services/dataClient';
import { syncLocalAuthAccount, UserRole } from '../services/authService';
import {
  DEFAULT_SUBSCRIPTION_PLANS,
  getCurrentMonthKey,
  getEffectiveAiUsage,
  PLAN_MODULE_LABELS,
} from '../config/plans';
import { ASSIGNABLE_ROLES, getRoleMeta, isSuperAdminEmail } from '../config/roles';
import {
  PlanModuleKey,
  SiteSettings,
  SubscriptionOrder,
  SubscriptionPlan,
  SubscriptionTierId,
  UserProfile,
} from '../types';

interface SuperAdminSaasConsoleProps {
  adminEmail: string;
  siteSettings: SiteSettings | null;
  onUpdateSettings: (newSettings: Partial<SiteSettings>) => Promise<void>;
  usersList: UserProfile[];
  subscriptionPlans: SubscriptionPlan[];
  logAdminAction: (action: string, details: string) => Promise<void>;
}

const MODULE_KEYS = Object.keys(PLAN_MODULE_LABELS) as PlanModuleKey[];

export default function SuperAdminSaasConsole({
  adminEmail,
  siteSettings,
  onUpdateSettings,
  usersList,
  subscriptionPlans,
  logAdminAction,
}: SuperAdminSaasConsoleProps) {
  const [subTab, setSubTab] = useState<'plans' | 'owner' | 'orders'>('plans');
  const [draftPlans, setDraftPlans] = useState<SubscriptionPlan[]>(DEFAULT_SUBSCRIPTION_PLANS);
  const [savingPlanId, setSavingPlanId] = useState<string | null>(null);
  const [notice, setNotice] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Brand Owner setup state
  const [ownerForm, setOwnerForm] = useState({
    ownerName: siteSettings?.ownerName || 'SunMedX Operations Owner',
    ownerEmail: siteSettings?.ownerEmail || 'admin@sunmedx.in',
    ownerPlanId: (siteSettings?.ownerPlanId || 'enterprise') as SubscriptionTierId,
    customDomain: siteSettings?.customDomain || 'portal.sunmedx.in',
    whiteLabelEnabled: siteSettings?.whiteLabelEnabled ?? true,
    poweredByVisible: siteSettings?.poweredByVisible ?? true,
  });
  const [savingOwner, setSavingOwner] = useState(false);
  const [userSearch, setUserSearch] = useState('');
  const [subscriptionOrders, setSubscriptionOrders] = useState<SubscriptionOrder[]>([]);
  const [confirmDeleteUid, setConfirmDeleteUid] = useState<string | null>(null);

  useEffect(() => {
    const source = subscriptionPlans.length > 0 ? subscriptionPlans : DEFAULT_SUBSCRIPTION_PLANS;
    const order: SubscriptionTierId[] = ['free', 'pro', 'enterprise'];
    const sorted = [...source].sort((a, b) => order.indexOf(a.id) - order.indexOf(b.id));
    setDraftPlans(sorted);
  }, [subscriptionPlans]);

  useEffect(() => {
    if (siteSettings) {
      setOwnerForm({
        ownerName: siteSettings.ownerName || 'SunMedX Operations Owner',
        ownerEmail: siteSettings.ownerEmail || 'admin@sunmedx.in',
        ownerPlanId: (siteSettings.ownerPlanId || 'enterprise') as SubscriptionTierId,
        customDomain: siteSettings.customDomain || 'portal.sunmedx.in',
        whiteLabelEnabled: siteSettings.whiteLabelEnabled ?? true,
        poweredByVisible: siteSettings.poweredByVisible ?? true,
      });
    }
  }, [siteSettings]);

  useEffect(() => {
    const db = getDb();
    const unsub = db.collection('subscription_orders').onSnapshot((snap: any) => {
      const list: SubscriptionOrder[] = [];
      snap.forEach((doc: any) => list.push({ id: doc.id, ...doc.data() }));
      list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      setSubscriptionOrders(list);
    });
    return () => unsub();
  }, []);

  const updatePlanField = <K extends keyof SubscriptionPlan>(
    planId: SubscriptionTierId,
    field: K,
    value: SubscriptionPlan[K]
  ) => {
    setDraftPlans((prev) =>
      prev.map((p) => (p.id === planId ? { ...p, [field]: value } : p))
    );
  };

  const togglePlanModule = (planId: SubscriptionTierId, modKey: PlanModuleKey) => {
    setDraftPlans((prev) =>
      prev.map((p) =>
        p.id === planId
          ? {
              ...p,
              enabledModules: {
                ...p.enabledModules,
                [modKey]: !p.enabledModules[modKey],
              },
            }
          : p
      )
    );
  };

  const savePlanConfig = async (plan: SubscriptionPlan) => {
    setSavingPlanId(plan.id);
    setNotice(null);
    try {
      const db = getDb();
      const cleanPlan: SubscriptionPlan = {
        ...plan,
        monthlyPriceInr: Math.max(0, Number(plan.monthlyPriceInr || 0)),
        annualPriceInr: Math.max(0, Number(plan.annualPriceInr || 0)),
        aiQueryLimitPerMonth: Number(plan.aiQueryLimitPerMonth),
        maxAmcContracts: Number(plan.maxAmcContracts),
        updatedAt: new Date().toISOString(),
      };
      await db.collection('subscription_plans').doc(plan.id).set(cleanPlan);
      await logAdminAction(
        'SAAS_PLAN_UPDATE',
        `Updated ${cleanPlan.name} plan (Rs ${cleanPlan.monthlyPriceInr}/mo, AI limit: ${cleanPlan.aiQueryLimitPerMonth})`
      );
      setNotice({ type: 'success', text: `${cleanPlan.name} tier configuration saved live.` });
    } catch (err: any) {
      setNotice({ type: 'error', text: err?.message || 'Failed saving subscription plan.' });
    } finally {
      setSavingPlanId(null);
    }
  };

  const saveOwnerAssignment = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingOwner(true);
    setNotice(null);
    try {
      await onUpdateSettings({
        ownerName: ownerForm.ownerName.trim(),
        ownerEmail: ownerForm.ownerEmail.trim().toLowerCase(),
        ownerPlanId: ownerForm.ownerPlanId,
        customDomain: ownerForm.customDomain.trim(),
        whiteLabelEnabled: ownerForm.whiteLabelEnabled,
        poweredByVisible: ownerForm.poweredByVisible,
      });

      // Automatically grant Client (Brand Owner) role & plan if matching user exists
      const matched = usersList.find(
        (u) => u.email.toLowerCase().trim() === ownerForm.ownerEmail.trim().toLowerCase()
      );
      if (matched && !isSuperAdminEmail(matched.email)) {
        const db = getDb();
        await db.collection('users').doc(matched.uid).update({
          role: 'client',
          planId: ownerForm.ownerPlanId,
          planStatus: 'active',
        });
        syncLocalAuthAccount(matched.email, 'update_role', { role: 'client' });
      }

      await logAdminAction(
        'BRAND_OWNER_ASSIGN',
        `Updated active Brand Owner (${ownerForm.ownerEmail}) · White-label ${
          ownerForm.whiteLabelEnabled ? 'enabled' : 'disabled'
        }`
      );
      setNotice({ type: 'success', text: 'Brand Owner & White-Label governance saved.' });
    } catch (err: any) {
      setNotice({ type: 'error', text: err?.message || 'Unable to save Brand Owner config.' });
    } finally {
      setSavingOwner(false);
    }
  };

  const updateUserGovernance = async (
    user: UserProfile,
    updates: Partial<UserProfile>,
    logLabel: string
  ) => {
    try {
      const db = getDb();
      await db.collection('users').doc(user.uid).update(updates);
      if (updates.role) {
        syncLocalAuthAccount(user.email, 'update_role', { role: updates.role as UserRole });
      }
      if (updates.accountStatus === 'paused') {
        syncLocalAuthAccount(user.email, 'pause');
      } else if (updates.accountStatus === 'active') {
        syncLocalAuthAccount(user.email, 'activate');
      }
      await logAdminAction('SUPERADMIN_USER_GOVERNANCE', `${logLabel} for ${user.email}`);
      setNotice({ type: 'success', text: `Updated ${user.email}: ${logLabel}` });
    } catch (err: any) {
      setNotice({ type: 'error', text: err?.message || 'Failed updating user governance.' });
    }
  };

  const handleDeleteAccount = async (user: UserProfile) => {
    if (isSuperAdminEmail(user.email)) {
      setNotice({ type: 'error', text: 'Primary Super Admin account cannot be deleted.' });
      return;
    }
    try {
      const db = getDb();
      await db.collection('users').doc(user.uid).delete();
      syncLocalAuthAccount(user.email, 'delete');
      await logAdminAction(
        'SUPERADMIN_USER_DELETE',
        `Deleted ${user.role} account ${user.email} (${user.hospital || 'No org'})`
      );
      setConfirmDeleteUid(null);
      setNotice({ type: 'success', text: `Deleted account ${user.email}.` });
    } catch (err: any) {
      setNotice({ type: 'error', text: err?.message || 'Failed deleting account.' });
    }
  };

  const approveSubscriptionOrder = async (order: SubscriptionOrder) => {
    try {
      const db = getDb();
      if (order.id) {
        await db.collection('subscription_orders').doc(order.id).update({ status: 'Paid' });
      }
      const matched = usersList.find(
        (u) => u.uid === order.userId || u.email.toLowerCase() === order.userEmail.toLowerCase()
      );
      if (matched) {
        const days = order.billingCycle === 'annual' ? 365 : 30;
        await db.collection('users').doc(matched.uid).update({
          planId: order.planId,
          planStatus: 'active',
          aiQueriesUsed: 0,
          aiQuotaResetMonth: getCurrentMonthKey(),
          subscriptionExpiresAt: new Date(Date.now() + days * 86400000).toISOString(),
        });
      }
      await logAdminAction(
        'SUBSCRIPTION_APPROVED',
        `Activated ${order.planName} (${order.billingCycle}) for ${order.userEmail}`
      );
      setNotice({ type: 'success', text: `Activated ${order.planName} subscription for ${order.userEmail}.` });
    } catch (err: any) {
      setNotice({ type: 'error', text: err?.message || 'Failed approving subscription.' });
    }
  };

  const filteredUsers = useMemo(() => {
    const q = userSearch.trim().toLowerCase();
    if (!q) return usersList;
    return usersList.filter(
      (u) =>
        u.email.toLowerCase().includes(q) ||
        (u.name || '').toLowerCase().includes(q) ||
        (u.hospital || '').toLowerCase().includes(q)
    );
  }, [usersList, userSearch]);

  const metrics = useMemo(() => {
    const paidUsers = usersList.filter((u) => u.planId === 'pro' || u.planId === 'enterprise').length;
    const freeUsers = usersList.filter((u) => !u.planId || u.planId === 'free').length;
    const mrr = usersList.reduce((sum, u) => {
      const p = draftPlans.find((pl) => pl.id === (u.planId || 'free'));
      return sum + (p?.monthlyPriceInr || 0);
    }, 0);
    const totalOrderRev = subscriptionOrders
      .filter((o) => o.status !== 'Pending Verification')
      .reduce((sum, o) => sum + (o.totalAmount || 0), 0);
    return { paidUsers, freeUsers, mrr, totalOrderRev };
  }, [usersList, draftPlans, subscriptionOrders]);

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-white/10 pb-5">
        <div>
          <div className="flex items-center gap-2 text-[11px] font-mono text-emerald-300 uppercase tracking-wider font-bold">
            <Crown className="w-3.5 h-3.5 text-amber" />
            <span>SunMedX Super Admin Exclusive Control Plane</span>
          </div>
          <h2 className="font-syne font-black text-xl sm:text-2xl text-white uppercase tracking-wider mt-1">
            SaaS Subscriptions, Module Toggles &amp; Brand Owner Governance
          </h2>
          <p className="text-xs text-gray-400 font-mono mt-0.5">
            Signed in as verified Super Admin ({adminEmail}) · Governs Free / Pro / Enterprise tiers and Brand Owner white-label rights
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-1.5 bg-navy p-1 rounded-xl border border-white/10 self-start">
          {[
            { id: 'plans', label: 'Plans & Modules', icon: Sliders },
            { id: 'owner', label: 'Brand Owner & Users', icon: Users },
            { id: 'orders', label: `Subscriptions (${subscriptionOrders.length})`, icon: CreditCard },
          ].map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setSubTab(tab.id as any)}
                className={`px-3.5 py-2 rounded-lg text-xs font-syne font-bold uppercase flex items-center gap-1.5 transition-colors whitespace-nowrap ${
                  subTab === tab.id
                    ? 'bg-gradient-to-r from-crimson to-amber text-navy font-black'
                    : 'text-gray-300 hover:text-white hover:bg-white/5'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* KPI Summary Strip */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Free Tier Users', value: metrics.freeUsers, accent: 'text-sky-300' },
          { label: 'Pro / Enterprise Users', value: metrics.paidUsers, accent: 'text-emerald-300' },
          { label: 'Estimated Monthly Plan Value', value: `Rs ${metrics.mrr.toLocaleString()}`, accent: 'text-amber' },
          { label: 'Recorded Plan Checkout Total', value: `Rs ${metrics.totalOrderRev.toLocaleString()}`, accent: 'text-white' },
        ].map((kpi) => (
          <div key={kpi.label} className="bg-navy border border-white/10 rounded-2xl p-4 space-y-1">
            <span className="text-[10px] font-mono uppercase text-gray-400 font-bold">{kpi.label}</span>
            <div className={`text-xl font-syne font-black tabular-nums ${kpi.accent}`}>{kpi.value}</div>
          </div>
        ))}
      </div>

      {notice && (
        <div
          className={`p-3.5 rounded-xl border text-xs flex items-center justify-between ${
            notice.type === 'success'
              ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
              : 'bg-red-500/10 border-red-500/30 text-red-300'
          }`}
        >
          <span>{notice.text}</span>
          <button type="button" onClick={() => setNotice(null)} className="underline text-[11px] ml-3">
            Dismiss
          </button>
        </div>
      )}

      {/* TAB 1: PLANS & MODULE TOGGLE MATRIX */}
      {subTab === 'plans' && (
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
          {draftPlans.map((plan) => (
            <div
              key={plan.id}
              className="bg-navy border border-white/10 rounded-2xl p-5 sm:p-6 flex flex-col justify-between space-y-5"
            >
              <div className="space-y-4">
                <div className="flex items-center justify-between border-b border-white/10 pb-3">
                  <div>
                    <span className="text-[10px] font-mono uppercase text-amber font-bold">
                      Tier ID · {plan.id.toUpperCase()}
                    </span>
                    <input
                      type="text"
                      value={plan.name}
                      onChange={(e) => updatePlanField(plan.id, 'name', e.target.value)}
                      className="block w-full bg-transparent text-lg font-syne font-black text-white focus:outline-none border-b border-transparent focus:border-amber/50"
                    />
                  </div>
                  <Layers className="w-5 h-5 text-amber/70 shrink-0" />
                </div>

                <div>
                  <label className="block text-[10px] font-mono uppercase text-gray-400 font-bold mb-1">
                    Target Audience Summary
                  </label>
                  <input
                    type="text"
                    value={plan.audience}
                    onChange={(e) => updatePlanField(plan.id, 'audience', e.target.value)}
                    className="w-full bg-[#10101e] border border-white/10 rounded-lg px-3 py-2 text-xs text-white"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[10px] font-mono uppercase text-gray-400 font-bold mb-1">
                      Monthly Price (Rs)
                    </label>
                    <input
                      type="number"
                      min={0}
                      value={plan.monthlyPriceInr}
                      onChange={(e) => updatePlanField(plan.id, 'monthlyPriceInr', Number(e.target.value))}
                      className="w-full bg-[#10101e] border border-white/10 rounded-lg px-3 py-2 text-xs font-mono text-white tabular-nums"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-mono uppercase text-gray-400 font-bold mb-1">
                      Annual Price (Rs)
                    </label>
                    <input
                      type="number"
                      min={0}
                      value={plan.annualPriceInr}
                      onChange={(e) => updatePlanField(plan.id, 'annualPriceInr', Number(e.target.value))}
                      className="w-full bg-[#10101e] border border-white/10 rounded-lg px-3 py-2 text-xs font-mono text-white tabular-nums"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[10px] font-mono uppercase text-gray-400 font-bold mb-1">
                      AI Queries / Mo (-1 = ∞)
                    </label>
                    <input
                      type="number"
                      min={-1}
                      value={plan.aiQueryLimitPerMonth}
                      onChange={(e) => updatePlanField(plan.id, 'aiQueryLimitPerMonth', Number(e.target.value))}
                      className="w-full bg-[#10101e] border border-white/10 rounded-lg px-3 py-2 text-xs font-mono text-amber tabular-nums"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-mono uppercase text-gray-400 font-bold mb-1">
                      Max AMC Units (-1 = ∞)
                    </label>
                    <input
                      type="number"
                      min={-1}
                      value={plan.maxAmcContracts}
                      onChange={(e) => updatePlanField(plan.id, 'maxAmcContracts', Number(e.target.value))}
                      className="w-full bg-[#10101e] border border-white/10 rounded-lg px-3 py-2 text-xs font-mono text-white tabular-nums"
                    />
                  </div>
                </div>

                {/* Module Toggles */}
                <div className="space-y-2 pt-2 border-t border-white/10">
                  <span className="block text-[10px] font-mono uppercase text-gray-400 font-bold">
                    Enabled Platform Modules
                  </span>
                  <div className="space-y-1.5">
                    {MODULE_KEYS.map((modKey) => {
                      const active = Boolean(plan.enabledModules?.[modKey]);
                      return (
                        <button
                          key={modKey}
                          type="button"
                          onClick={() => togglePlanModule(plan.id, modKey)}
                          className={`w-full flex items-center justify-between px-3 py-2 rounded-lg border text-xs transition-colors ${
                            active
                              ? 'bg-emerald-500/10 border-emerald-500/30 text-white'
                              : 'bg-[#10101e] border-white/10 text-gray-400'
                          }`}
                        >
                          <span className="truncate">{PLAN_MODULE_LABELS[modKey]}</span>
                          {active ? (
                            <ToggleRight className="w-4 h-4 text-emerald-400 shrink-0" />
                          ) : (
                            <ToggleLeft className="w-4 h-4 text-gray-500 shrink-0" />
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>

              <button
                type="button"
                disabled={savingPlanId === plan.id}
                onClick={() => savePlanConfig(plan)}
                className="w-full py-2.5 px-4 rounded-xl bg-gradient-to-r from-crimson to-amber text-navy font-syne font-black text-xs uppercase tracking-wider flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {savingPlanId === plan.id ? (
                  <RefreshCw className="w-4 h-4 animate-spin" />
                ) : (
                  <Save className="w-4 h-4" />
                )}
                <span>Save {plan.name} Tier</span>
              </button>
            </div>
          ))}
        </div>
      )}

      {/* TAB 2: BRAND OWNER GOVERNANCE & USER PLAN OVERRIDES */}
      {subTab === 'owner' && (
        <div className="grid grid-cols-1 xl:grid-cols-12 gap-6">
          {/* Active Single Brand Owner Card */}
          <form
            onSubmit={saveOwnerAssignment}
            className="xl:col-span-5 bg-navy border border-white/10 rounded-2xl p-5 sm:p-6 space-y-4 h-fit"
          >
            <div className="border-b border-white/10 pb-3">
              <h3 className="font-syne font-bold text-sm text-amber uppercase tracking-wider flex items-center gap-2">
                <ShieldCheck className="w-4 h-4" />
                <span>Single Brand Owner Assignment</span>
              </h3>
              <p className="text-[11px] font-mono text-gray-400 mt-0.5">
                Assign the authorized Brand Owner email, tier, and white-label rights for this portal instance.
              </p>
            </div>

            <div>
              <label className="block text-[10px] font-mono uppercase text-gray-400 font-bold mb-1">
                Brand Owner Full Name
              </label>
              <input
                type="text"
                required
                value={ownerForm.ownerName}
                onChange={(e) => setOwnerForm({ ...ownerForm, ownerName: e.target.value })}
                className="w-full bg-[#10101e] border border-white/10 rounded-xl px-3.5 py-2.5 text-xs text-white"
              />
            </div>

            <div>
              <label className="block text-[10px] font-mono uppercase text-gray-400 font-bold mb-1">
                Brand Owner Account Email *
              </label>
              <input
                type="email"
                required
                value={ownerForm.ownerEmail}
                onChange={(e) => setOwnerForm({ ...ownerForm, ownerEmail: e.target.value })}
                className="w-full bg-[#10101e] border border-white/10 rounded-xl px-3.5 py-2.5 text-xs font-mono text-white"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-[10px] font-mono uppercase text-gray-400 font-bold mb-1">
                  Owner License Tier
                </label>
                <select
                  value={ownerForm.ownerPlanId}
                  onChange={(e) => setOwnerForm({ ...ownerForm, ownerPlanId: e.target.value as SubscriptionTierId })}
                  className="w-full bg-[#10101e] border border-white/10 rounded-xl px-3.5 py-2.5 text-xs text-white"
                >
                  <option value="free">Free Starter</option>
                  <option value="pro">Pro License</option>
                  <option value="enterprise">Enterprise White-Label</option>
                </select>
              </div>
              <div>
                <label className="block text-[10px] font-mono uppercase text-gray-400 font-bold mb-1">
                  Custom Domain Label
                </label>
                <input
                  type="text"
                  value={ownerForm.customDomain}
                  onChange={(e) => setOwnerForm({ ...ownerForm, customDomain: e.target.value })}
                  placeholder="portal.clientbrand.in"
                  className="w-full bg-[#10101e] border border-white/10 rounded-xl px-3.5 py-2.5 text-xs font-mono text-white"
                />
              </div>
            </div>

            <div className="space-y-2 pt-2 border-t border-white/10">
              <label className="flex items-center justify-between text-xs text-gray-200 cursor-pointer bg-[#10101e] px-3.5 py-2.5 rounded-xl border border-white/10">
                <span>Allow Brand Owner White-Label Studio</span>
                <input
                  type="checkbox"
                  checked={ownerForm.whiteLabelEnabled}
                  onChange={(e) => setOwnerForm({ ...ownerForm, whiteLabelEnabled: e.target.checked })}
                  className="accent-amber"
                />
              </label>

              <label className="flex items-center justify-between text-xs text-gray-200 cursor-pointer bg-[#10101e] px-3.5 py-2.5 rounded-xl border border-white/10">
                <span>Show &ldquo;Powered by SunMedX&rdquo; Footer Badge</span>
                <input
                  type="checkbox"
                  checked={ownerForm.poweredByVisible}
                  onChange={(e) => setOwnerForm({ ...ownerForm, poweredByVisible: e.target.checked })}
                  className="accent-amber"
                />
              </label>
            </div>

            <button
              type="submit"
              disabled={savingOwner}
              className="w-full py-3 rounded-xl bg-gradient-to-r from-crimson to-amber text-navy font-syne font-black text-xs uppercase tracking-wider flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {savingOwner ? <RefreshCw className="w-4 h-4 animate-spin" /> : <UserCheck className="w-4 h-4" />}
              <span>Save Brand Owner Governance</span>
            </button>
          </form>

          {/* All Users Role & Subscription Switcher */}
          <div className="xl:col-span-7 bg-navy border border-white/10 rounded-2xl p-5 sm:p-6 space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/10 pb-3">
              <div>
                <h3 className="font-syne font-bold text-sm text-white uppercase tracking-wider">
                  User Roles &amp; Subscription Assignments ({usersList.length})
                </h3>
                <p className="text-[11px] font-mono text-gray-400">
                  Promote a user to Brand Owner, assign Free / Pro / Enterprise tier, or reset monthly AI usage.
                </p>
              </div>
              <input
                type="text"
                placeholder="Search email or hospital..."
                value={userSearch}
                onChange={(e) => setUserSearch(e.target.value)}
                className="bg-[#10101e] border border-white/10 rounded-lg px-3 py-1.5 text-xs text-white font-mono"
              />
            </div>

            <div className="overflow-x-auto border border-white/10 bg-[#10101e] rounded-xl">
              <table className="w-full text-xs text-left divide-y divide-white/5 text-gray-200">
                <thead>
                  <tr className="bg-navy text-gray-400 font-mono text-[11px]">
                    <th className="p-3">Account</th>
                    <th className="p-3">Role</th>
                    <th className="p-3">Status</th>
                    <th className="p-3">Plan Tier</th>
                    <th className="p-3 text-right">AI Used</th>
                    <th className="p-3 text-right">Governance Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {filteredUsers.map((u) => {
                    const isMaster = isSuperAdminEmail(u.email);
                    const used = getEffectiveAiUsage(u.aiQueriesUsed, u.aiQuotaResetMonth);
                    const isPaused = u.accountStatus === 'paused';
                    const roleOptionValue = u.role === 'owner' ? 'client' : u.role;

                    return (
                      <tr key={u.uid} className={`hover:bg-white/[0.03] ${isPaused ? 'opacity-75' : ''}`}>
                        <td className="p-3">
                          <div className="font-mono font-bold text-white truncate max-w-[190px]">{u.email}</div>
                          <div className="text-[11px] text-gray-400 truncate max-w-[190px]">
                            {u.name} · {u.hospital || 'Clinic'}
                          </div>
                        </td>
                        <td className="p-3">
                          {isMaster ? (
                            <span className="font-mono text-[11px] font-bold text-emerald-300">SUPER ADMIN</span>
                          ) : (
                            <select
                              value={roleOptionValue}
                              onChange={(e) =>
                                updateUserGovernance(
                                  u,
                                  { role: e.target.value as UserProfile['role'] },
                                  `Role changed to ${getRoleMeta(e.target.value).shortLabel}`
                                )
                              }
                              className="bg-navy border border-white/15 rounded-lg px-2 py-1 text-[11px] font-mono text-white"
                            >
                              {ASSIGNABLE_ROLES.map((r) => (
                                <option key={r} value={r}>
                                  {getRoleMeta(r).shortLabel}
                                </option>
                              ))}
                            </select>
                          )}
                        </td>
                        <td className="p-3">
                          <span
                            className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-mono font-bold uppercase border ${
                              isPaused
                                ? 'bg-red-500/15 text-red-300 border-red-500/30'
                                : 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30'
                            }`}
                          >
                            {isPaused ? 'Paused' : 'Active'}
                          </span>
                        </td>
                        <td className="p-3">
                          <select
                            value={u.planId || (isMaster ? 'enterprise' : 'free')}
                            disabled={isMaster}
                            onChange={(e) =>
                              updateUserGovernance(
                                u,
                                { planId: e.target.value as SubscriptionTierId, planStatus: 'active' },
                                `Plan changed to ${e.target.value.toUpperCase()}`
                              )
                            }
                            className="bg-navy border border-white/15 rounded-lg px-2 py-1 text-[11px] font-mono text-amber disabled:opacity-60"
                          >
                            <option value="free">Free</option>
                            <option value="pro">Pro</option>
                            <option value="enterprise">Enterprise</option>
                          </select>
                        </td>
                        <td className="p-3 text-right font-mono tabular-nums text-white">{used}</td>
                        <td className="p-3 text-right">
                          <div className="inline-flex items-center gap-1.5 flex-wrap justify-end">
                            <button
                              type="button"
                              onClick={() =>
                                updateUserGovernance(
                                  u,
                                  { aiQueriesUsed: 0, aiQuotaResetMonth: getCurrentMonthKey() },
                                  'Monthly AI counter reset'
                                )
                              }
                              className="px-2 py-1 rounded bg-white/5 hover:bg-amber/20 hover:text-amber text-[11px] font-mono"
                            >
                              Reset AI
                            </button>

                            {!isMaster && (
                              <>
                                <button
                                  type="button"
                                  title={isPaused ? 'Resume account' : 'Pause account'}
                                  onClick={() =>
                                    updateUserGovernance(
                                      u,
                                      isPaused
                                        ? { accountStatus: 'active', pausedAt: '', pausedReason: '', pausedBy: '' }
                                        : {
                                            accountStatus: 'paused',
                                            pausedAt: new Date().toISOString(),
                                            pausedReason: 'Paused by Super Admin',
                                            pausedBy: adminEmail,
                                          },
                                      isPaused ? 'Account resumed' : 'Account paused'
                                    )
                                  }
                                  className={`p-1.5 rounded-lg border text-[11px] transition-colors ${
                                    isPaused
                                      ? 'border-emerald-500/30 text-emerald-300 hover:bg-emerald-500/15'
                                      : 'border-amber/30 text-amber hover:bg-amber/15'
                                  }`}
                                >
                                  {isPaused ? <PlayCircle className="w-3.5 h-3.5" /> : <PauseCircle className="w-3.5 h-3.5" />}
                                </button>

                                {confirmDeleteUid === u.uid ? (
                                  <div className="inline-flex items-center gap-1 bg-red-500/15 border border-red-500/30 rounded-lg px-2 py-1">
                                    <button
                                      type="button"
                                      onClick={() => handleDeleteAccount(u)}
                                      className="text-[10px] font-bold text-red-300 hover:text-white uppercase"
                                    >
                                      Confirm
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => setConfirmDeleteUid(null)}
                                      className="text-[10px] text-gray-400 hover:text-white uppercase ml-1"
                                    >
                                      Cancel
                                    </button>
                                  </div>
                                ) : (
                                  <button
                                    type="button"
                                    title="Delete account"
                                    onClick={() => setConfirmDeleteUid(u.uid)}
                                    className="p-1.5 rounded-lg border border-red-500/30 text-red-300 hover:bg-red-500/15 transition-colors"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </button>
                                )}
                              </>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: SUBSCRIPTION CHECKOUT LEDGER */}
      {subTab === 'orders' && (
        <div className="bg-navy border border-white/10 rounded-2xl p-5 sm:p-6 space-y-4">
          <div>
            <h3 className="font-syne font-bold text-sm text-white uppercase tracking-wider">
              Subscription Upgrades &amp; Billing Receipts
            </h3>
            <p className="text-[11px] font-mono text-gray-400">
              Approve pending UPI/NEFT upgrades or audit completed Razorpay/Stripe subscription settlements.
            </p>
          </div>

          {subscriptionOrders.length === 0 ? (
            <div className="py-12 text-center text-xs text-gray-400 bg-[#10101e] rounded-xl border border-white/5">
              No subscription upgrade orders logged yet. Users can upgrade from Home (#plans) or Client Hub → Plan &amp; Billing.
            </div>
          ) : (
            <div className="overflow-x-auto border border-white/10 bg-[#10101e] rounded-xl">
              <table className="w-full text-xs text-left divide-y divide-white/5 text-gray-200">
                <thead>
                  <tr className="bg-navy text-gray-400 font-mono text-[11px]">
                    <th className="p-3.5">Subscriber</th>
                    <th className="p-3.5">Plan &amp; Cycle</th>
                    <th className="p-3.5">Reference</th>
                    <th className="p-3.5 text-right">Total (Incl. GST)</th>
                    <th className="p-3.5">Status</th>
                    <th className="p-3.5 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {subscriptionOrders.map((ord) => (
                    <tr key={ord.id} className="hover:bg-white/[0.03]">
                      <td className="p-3.5">
                        <div className="font-mono font-bold text-white">{ord.userEmail}</div>
                        <div className="text-[11px] text-gray-400">{ord.hospitalName}</div>
                      </td>
                      <td className="p-3.5">
                        <span className="font-bold text-amber">{ord.planName}</span> · {ord.billingCycle}
                      </td>
                      <td className="p-3.5 font-mono text-[11px]">
                        {ord.paymentProvider} · {ord.paymentReference}
                      </td>
                      <td className="p-3.5 text-right font-mono font-bold tabular-nums text-white">
                        Rs {(ord.totalAmount || 0).toLocaleString()}
                      </td>
                      <td className="p-3.5 font-mono text-[11px]">
                        <span
                          className={
                            ord.status === 'Pending Verification' ? 'text-amber font-bold' : 'text-emerald-300 font-bold'
                          }
                        >
                          {ord.status}
                        </span>
                      </td>
                      <td className="p-3.5 text-right">
                        {ord.status === 'Pending Verification' && (
                          <button
                            type="button"
                            onClick={() => approveSubscriptionOrder(ord)}
                            className="px-3 py-1.5 rounded-lg bg-emerald-500/20 hover:bg-emerald-500 text-emerald-300 hover:text-navy font-bold text-[11px] inline-flex items-center gap-1"
                          >
                            <Check className="w-3.5 h-3.5" />
                            <span>Activate Plan</span>
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
