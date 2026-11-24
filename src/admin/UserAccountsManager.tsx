import React, { useMemo, useState } from 'react';
import {
  Check,
  Crown,
  Download,
  PauseCircle,
  PlayCircle,
  Plus,
  RefreshCw,
  Search,
  ShieldCheck,
  Trash2,
  UserPlus,
  Users,
  X,
} from 'lucide-react';
import { getDb } from '../services/dataClient';
import { syncLocalAuthAccount, UserRole } from '../services/authService';
import { getCurrentMonthKey, getEffectiveAiUsage } from '../config/plans';
import {
  ASSIGNABLE_ROLES,
  getRoleMeta,
  isClientBrandRole,
  isSuperAdminEmail,
  ROLE_DEFINITIONS,
} from '../config/roles';
import { SubscriptionTierId, UserProfile } from '../types';

interface UserAccountsManagerProps {
  adminEmail: string;
  isSuperAdmin: boolean;
  usersList: UserProfile[];
  logAdminAction: (action: string, details: string) => Promise<void>;
  onOpenSaasConsole?: () => void;
}

type RoleFilter = 'all' | 'customer' | 'client' | 'technician' | 'admin' | 'superadmin';
type StatusFilter = 'all' | 'active' | 'paused';

export default function UserAccountsManager({
  adminEmail,
  isSuperAdmin,
  usersList,
  logAdminAction,
  onOpenSaasConsole,
}: UserAccountsManagerProps) {
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState<RoleFilter>('all');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [selectedUids, setSelectedUids] = useState<string[]>([]);
  const [notice, setNotice] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [busyUid, setBusyUid] = useState<string | null>(null);

  // Inline confirmation states (avoid window.alert / window.confirm)
  const [confirmDeleteUser, setConfirmDeleteUser] = useState<UserProfile | null>(null);
  const [confirmBulkDelete, setConfirmBulkDelete] = useState(false);
  const [pauseTargetUser, setPauseTargetUser] = useState<UserProfile | null>(null);
  const [pauseReason, setPauseReason] = useState('Account paused by Super Admin');

  // Quick Add Account Modal state
  const [showAddModal, setShowAddModal] = useState(false);
  const [creatingAccount, setCreatingAccount] = useState(false);
  const [newUserForm, setNewUserForm] = useState({
    name: '',
    email: '',
    hospital: '',
    phone: '',
    role: 'customer' as UserRole,
    planId: 'free' as SubscriptionTierId,
    password: '',
  });

  const stats = useMemo(() => {
    const activeCount = usersList.filter((u) => (u.accountStatus || 'active') !== 'paused').length;
    const pausedCount = usersList.filter((u) => u.accountStatus === 'paused').length;
    const customersCount = usersList.filter((u) => u.role === 'customer').length;
    const clientsCount = usersList.filter((u) => isClientBrandRole(u.role)).length;
    const staffCount = usersList.filter((u) => u.role === 'admin' || u.role === 'technician').length;
    const superAdminCount = usersList.filter((u) => u.role === 'superadmin').length;
    return {
      total: usersList.length,
      activeCount,
      pausedCount,
      customersCount,
      clientsCount,
      staffCount,
      superAdminCount,
    };
  }, [usersList]);

  const filteredUsers = useMemo(() => {
    const q = search.trim().toLowerCase();
    return usersList.filter((u) => {
      const normalizedRole = (u.role || 'customer').toLowerCase();
      const status = u.accountStatus || 'active';

      if (roleFilter === 'client') {
        if (!isClientBrandRole(normalizedRole)) return false;
      } else if (roleFilter !== 'all') {
        if (normalizedRole !== roleFilter) return false;
      }

      if (statusFilter !== 'all' && status !== statusFilter) return false;

      if (!q) return true;
      return (
        (u.email || '').toLowerCase().includes(q) ||
        (u.name || '').toLowerCase().includes(q) ||
        (u.hospital || '').toLowerCase().includes(q) ||
        (u.phone || '').toLowerCase().includes(q)
      );
    });
  }, [usersList, search, roleFilter, statusFilter]);

  const selectableFilteredUids = useMemo(
    () =>
      filteredUsers
        .filter((u) => !isSuperAdminEmail(u.email) && u.email.toLowerCase() !== adminEmail.toLowerCase())
        .map((u) => u.uid),
    [filteredUsers, adminEmail]
  );

  const toggleSelectAll = () => {
    if (selectedUids.length === selectableFilteredUids.length && selectableFilteredUids.length > 0) {
      setSelectedUids([]);
    } else {
      setSelectedUids(selectableFilteredUids);
    }
  };

  const toggleSelectOne = (uid: string) => {
    setSelectedUids((prev) => (prev.includes(uid) ? prev.filter((id) => id !== uid) : [...prev, uid]));
  };

  const handleRoleChange = async (user: UserProfile, nextRole: UserRole) => {
    if (!isSuperAdmin) {
      setNotice({ type: 'error', text: 'Only the SunMedX Super Admin can reassign account roles.' });
      return;
    }
    if (isSuperAdminEmail(user.email)) {
      setNotice({ type: 'error', text: 'Primary Super Admin role cannot be modified.' });
      return;
    }

    setBusyUid(user.uid);
    setNotice(null);
    try {
      await getDb().collection('users').doc(user.uid).update({ role: nextRole });
      syncLocalAuthAccount(user.email, 'update_role', { role: nextRole });
      await logAdminAction(
        'USER_ROLE_CHANGE',
        `Changed ${user.email} role from '${user.role}' to '${nextRole}'`
      );
      setNotice({
        type: 'success',
        text: `Updated ${user.email} to ${getRoleMeta(nextRole).label}.`,
      });
    } catch (err: any) {
      setNotice({ type: 'error', text: err?.message || 'Unable to update role.' });
    } finally {
      setBusyUid(null);
    }
  };

  const handlePlanChange = async (user: UserProfile, nextPlan: SubscriptionTierId) => {
    if (!isSuperAdmin) return;
    setBusyUid(user.uid);
    setNotice(null);
    try {
      await getDb().collection('users').doc(user.uid).update({
        planId: nextPlan,
        planStatus: 'active',
      });
      await logAdminAction('USER_PLAN_CHANGE', `Set ${user.email} subscription tier to ${nextPlan.toUpperCase()}`);
      setNotice({ type: 'success', text: `${user.email} plan updated to ${nextPlan.toUpperCase()}.` });
    } catch (err: any) {
      setNotice({ type: 'error', text: err?.message || 'Unable to update plan.' });
    } finally {
      setBusyUid(null);
    }
  };

  const handleResetAiQuota = async (user: UserProfile) => {
    setBusyUid(user.uid);
    try {
      await getDb().collection('users').doc(user.uid).update({
        aiQueriesUsed: 0,
        aiQuotaResetMonth: getCurrentMonthKey(),
      });
      await logAdminAction('USER_AI_QUOTA_RESET', `Reset monthly AI queries for ${user.email}`);
      setNotice({ type: 'success', text: `Reset monthly AI query counter for ${user.email}.` });
    } catch (err: any) {
      setNotice({ type: 'error', text: err?.message || 'Unable to reset AI quota.' });
    } finally {
      setBusyUid(null);
    }
  };

  const executePauseOrResume = async (user: UserProfile, nextStatus: 'paused' | 'active', reason?: string) => {
    if (!isSuperAdmin) {
      setNotice({ type: 'error', text: 'Only the Super Admin can pause or resume accounts.' });
      return;
    }
    if (isSuperAdminEmail(user.email)) {
      setNotice({ type: 'error', text: 'Master Super Admin account cannot be paused.' });
      return;
    }

    setBusyUid(user.uid);
    setNotice(null);
    try {
      const updates: Partial<UserProfile> =
        nextStatus === 'paused'
          ? {
              accountStatus: 'paused',
              pausedAt: new Date().toISOString(),
              pausedReason: reason?.trim() || 'Paused by Super Admin',
              pausedBy: adminEmail,
            }
          : {
              accountStatus: 'active',
              pausedAt: '',
              pausedReason: '',
              pausedBy: '',
            };

      await getDb().collection('users').doc(user.uid).update(updates);
      syncLocalAuthAccount(user.email, nextStatus === 'paused' ? 'pause' : 'activate');
      await logAdminAction(
        nextStatus === 'paused' ? 'USER_PAUSED' : 'USER_RESUMED',
        `${nextStatus === 'paused' ? 'Paused' : 'Resumed'} ${user.role} account ${user.email}${
          reason ? ` (${reason})` : ''
        }`
      );
      setPauseTargetUser(null);
      setNotice({
        type: 'success',
        text:
          nextStatus === 'paused'
            ? `Paused ${user.email}. Access is blocked until resumed.`
            : `Resumed ${user.email}. Account access restored.`,
      });
    } catch (err: any) {
      setNotice({ type: 'error', text: err?.message || 'Failed updating account status.' });
    } finally {
      setBusyUid(null);
    }
  };

  const executeDeleteUser = async (user: UserProfile) => {
    if (!isSuperAdmin) {
      setNotice({ type: 'error', text: 'Only the Super Admin can delete accounts.' });
      return;
    }
    if (isSuperAdminEmail(user.email)) {
      setNotice({ type: 'error', text: 'Master Super Admin account cannot be deleted.' });
      return;
    }

    setBusyUid(user.uid);
    setNotice(null);
    try {
      await getDb().collection('users').doc(user.uid).delete();
      syncLocalAuthAccount(user.email, 'delete');
      setSelectedUids((prev) => prev.filter((id) => id !== user.uid));
      setConfirmDeleteUser(null);
      await logAdminAction('USER_DELETED', `Deleted ${user.role} account ${user.email}`);
      setNotice({ type: 'success', text: `Permanently removed ${user.email} (${user.role}).` });
    } catch (err: any) {
      setNotice({ type: 'error', text: err?.message || 'Failed deleting account.' });
    } finally {
      setBusyUid(null);
    }
  };

  const handleBulkAction = async (action: 'pause' | 'activate' | 'delete') => {
    if (!isSuperAdmin || selectedUids.length === 0) return;
    setNotice(null);
    const targets = usersList.filter((u) => selectedUids.includes(u.uid) && !isSuperAdminEmail(u.email));
    try {
      const db = getDb();
      for (const target of targets) {
        if (action === 'delete') {
          await db.collection('users').doc(target.uid).delete();
          syncLocalAuthAccount(target.email, 'delete');
        } else if (action === 'pause') {
          await db.collection('users').doc(target.uid).update({
            accountStatus: 'paused',
            pausedAt: new Date().toISOString(),
            pausedReason: 'Bulk paused by Super Admin',
            pausedBy: adminEmail,
          });
          syncLocalAuthAccount(target.email, 'pause');
        } else {
          await db.collection('users').doc(target.uid).update({
            accountStatus: 'active',
            pausedAt: '',
            pausedReason: '',
            pausedBy: '',
          });
          syncLocalAuthAccount(target.email, 'activate');
        }
      }
      await logAdminAction(
        `BULK_USER_${action.toUpperCase()}`,
        `Applied '${action}' to ${targets.length} account(s): ${targets.map((t) => t.email).join(', ')}`
      );
      setSelectedUids([]);
      setConfirmBulkDelete(false);
      setNotice({
        type: 'success',
        text: `Applied "${action}" across ${targets.length} selected account(s).`,
      });
    } catch (err: any) {
      setNotice({ type: 'error', text: err?.message || 'Bulk operation failed.' });
    }
  };

  const handleCreateAccount = async (e: React.FormEvent) => {
    e.preventDefault();
    const email = newUserForm.email.trim().toLowerCase();
    if (!email || !email.includes('@') || !newUserForm.name.trim()) {
      setNotice({ type: 'error', text: 'Provide a valid full name and email address.' });
      return;
    }
    if (usersList.some((u) => u.email.toLowerCase().trim() === email)) {
      setNotice({ type: 'error', text: 'An account with this email already exists.' });
      return;
    }
    if (!isSuperAdmin && (newUserForm.role === 'admin' || newUserForm.role === 'client' || newUserForm.role === 'owner')) {
      setNotice({ type: 'error', text: 'Only Super Admin can create Client or Admin accounts.' });
      return;
    }

    setCreatingAccount(true);
    setNotice(null);
    try {
      const uid = `sm-user-${Math.random().toString(36).slice(2, 10)}`;
      const now = new Date().toISOString();
      const profile: UserProfile = {
        uid,
        email,
        name: newUserForm.name.trim(),
        phone: newUserForm.phone.trim(),
        hospital: newUserForm.hospital.trim() || 'Hospital Organization',
        role: newUserForm.role,
        accountStatus: 'active',
        planId: newUserForm.planId,
        planStatus: 'active',
        aiQueriesUsed: 0,
        aiQuotaResetMonth: getCurrentMonthKey(),
        createdAt: now,
      };
      await getDb().collection('users').doc(uid).set(profile);

      if (newUserForm.password.trim().length >= 6) {
        syncLocalAuthAccount(email, 'upsert', {
          uid,
          password: newUserForm.password.trim(),
          name: profile.name,
          hospital: profile.hospital,
          role: profile.role,
        });
      }

      await logAdminAction(
        'USER_CREATED_BY_ADMIN',
        `Created ${profile.role} account for ${email} (${profile.planId?.toUpperCase()} tier)`
      );
      setNewUserForm({
        name: '',
        email: '',
        hospital: '',
        phone: '',
        role: 'customer',
        planId: 'free',
        password: '',
      });
      setShowAddModal(false);
      setNotice({ type: 'success', text: `Created ${getRoleMeta(profile.role).shortLabel} account for ${email}.` });
    } catch (err: any) {
      setNotice({ type: 'error', text: err?.message || 'Unable to create account.' });
    } finally {
      setCreatingAccount(false);
    }
  };

  const exportFilteredCsv = () => {
    const header = ['Name', 'Email', 'Phone', 'Organization', 'Role', 'Plan', 'Status', 'AI Queries Used', 'Created At'];
    const rows = filteredUsers.map((u) => [
      `"${(u.name || '').replace(/"/g, '""')}"`,
      `"${(u.email || '').replace(/"/g, '""')}"`,
      `"${(u.phone || '').replace(/"/g, '""')}"`,
      `"${(u.hospital || '').replace(/"/g, '""')}"`,
      getRoleMeta(u.role).shortLabel,
      u.planId || 'free',
      u.accountStatus || 'active',
      String(getEffectiveAiUsage(u.aiQueriesUsed, u.aiQuotaResetMonth)),
      u.createdAt || '',
    ]);
    const csv = [header.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `sunmedx-accounts-${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* Header Bar */}
      <div className="bg-navy border border-white/10 rounded-2xl p-5 sm:p-6 shadow-xl space-y-5">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div>
            <h2 className="font-syne font-black text-xl text-white uppercase tracking-wider flex items-center gap-2">
              <Users className="w-5 h-5 text-amber" />
              <span>Account, Client &amp; Role Governance</span>
            </h2>
            <p className="text-xs text-amber font-mono mt-0.5">
              Clear separation across Customers, White-Label Clients, Technicians &amp; Admins — Super Admin can pause or delete any role
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={exportFilteredCsv}
              className="px-3.5 py-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-xs font-semibold text-gray-200 inline-flex items-center gap-1.5"
            >
              <Download className="w-3.5 h-3.5 text-amber" />
              <span>Export CSV</span>
            </button>

            <button
              type="button"
              onClick={() => setShowAddModal(true)}
              className="px-3.5 py-2 rounded-xl bg-gradient-to-r from-crimson to-amber text-navy font-syne font-black text-xs uppercase tracking-wider inline-flex items-center gap-1.5"
            >
              <UserPlus className="w-3.5 h-3.5" />
              <span>Add Account</span>
            </button>

            {isSuperAdmin && onOpenSaasConsole && (
              <button
                type="button"
                onClick={onOpenSaasConsole}
                className="px-3.5 py-2 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 text-xs font-bold inline-flex items-center gap-1.5 hover:bg-emerald-500/25"
              >
                <Crown className="w-3.5 h-3.5" />
                <span>SaaS Plans Console</span>
              </button>
            )}
          </div>
        </div>

        {/* Clear Role Definitions Guide */}
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3 pt-1">
          {(['customer', 'client', 'technician', 'admin'] as const).map((rKey) => {
            const meta = ROLE_DEFINITIONS[rKey];
            return (
              <div
                key={rKey}
                className="bg-[#10101e] border border-white/10 rounded-xl p-3.5 space-y-1.5"
              >
                <div className="flex items-center justify-between gap-2">
                  <span className={`text-[10px] font-mono font-bold uppercase px-2 py-0.5 rounded border ${meta.badgeClass}`}>
                    {meta.shortLabel}
                  </span>
                  <span className="text-[11px] font-mono text-gray-400 tabular-nums">
                    {rKey === 'customer'
                      ? stats.customersCount
                      : rKey === 'client'
                      ? stats.clientsCount
                      : usersList.filter((u) => u.role === rKey).length}{' '}
                    users
                  </span>
                </div>
                <p className="text-xs font-bold text-white">{meta.audience}</p>
                <p className="text-[11px] text-gray-400 leading-relaxed">{meta.accessSummary}</p>
              </div>
            );
          })}
        </div>

        {/* KPI Bar */}
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-3 pt-1">
          {[
            { label: 'Total Accounts', value: stats.total, tone: 'text-white' },
            { label: 'Active', value: stats.activeCount, tone: 'text-emerald-300' },
            { label: 'Paused', value: stats.pausedCount, tone: 'text-rose-400' },
            { label: 'Customers', value: stats.customersCount, tone: 'text-sky-300' },
            { label: 'Clients (Brand)', value: stats.clientsCount, tone: 'text-amber' },
            { label: 'Admins & Techs', value: stats.staffCount + stats.superAdminCount, tone: 'text-violet-300' },
          ].map((k) => (
            <div key={k.label} className="bg-[#10101e] border border-white/10 rounded-xl px-3.5 py-2.5">
              <div className="text-[10px] font-mono uppercase text-gray-400">{k.label}</div>
              <div className={`text-lg font-syne font-black tabular-nums ${k.tone}`}>{k.value}</div>
            </div>
          ))}
        </div>
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

      {/* Search & Filter Toolbar */}
      <div className="bg-navy border border-white/10 rounded-2xl p-4 sm:p-5 space-y-4">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-1.5">
            {(
              [
                { id: 'all', label: `All (${stats.total})` },
                { id: 'customer', label: `Customers (${stats.customersCount})` },
                { id: 'client', label: `Clients (${stats.clientsCount})` },
                { id: 'technician', label: `Technicians (${usersList.filter((u) => u.role === 'technician').length})` },
                { id: 'admin', label: `Admins (${usersList.filter((u) => u.role === 'admin').length})` },
                { id: 'superadmin', label: `Super Admin (${stats.superAdminCount})` },
              ] as const
            ).map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => {
                  setRoleFilter(tab.id);
                  setSelectedUids([]);
                }}
                className={`px-3 py-1.5 rounded-lg text-[11px] font-mono font-bold transition-colors whitespace-nowrap ${
                  roleFilter === tab.id
                    ? 'bg-amber text-navy'
                    : 'bg-[#10101e] text-gray-300 border border-white/10 hover:text-white'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as StatusFilter)}
              aria-label="Filter by account status"
              className="bg-[#10101e] border border-white/10 rounded-xl px-3 py-2 text-xs font-mono text-white"
            >
              <option value="all">All Statuses</option>
              <option value="active">Active Only</option>
              <option value="paused">Paused Only</option>
            </select>

            <div className="relative min-w-[220px] flex-1 sm:flex-initial">
              <Search className="w-3.5 h-3.5 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search name, email, hospital..."
                className="w-full bg-[#10101e] border border-white/10 rounded-xl pl-8 pr-3 py-2 text-xs text-white font-mono"
              />
            </div>
          </div>
        </div>

        {/* Super Admin Bulk Actions Bar */}
        {isSuperAdmin && selectedUids.length > 0 && (
          <div className="bg-[#10101e] border border-amber/30 rounded-xl px-4 py-2.5 flex flex-wrap items-center justify-between gap-3">
            <span className="text-xs font-mono text-amber font-bold tabular-nums">
              {selectedUids.length} account(s) selected
            </span>
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => handleBulkAction('pause')}
                className="px-3 py-1.5 rounded-lg bg-amber/15 hover:bg-amber/25 border border-amber/30 text-amber text-[11px] font-bold inline-flex items-center gap-1"
              >
                <PauseCircle className="w-3.5 h-3.5" />
                <span>Pause Selected</span>
              </button>
              <button
                type="button"
                onClick={() => handleBulkAction('activate')}
                className="px-3 py-1.5 rounded-lg bg-emerald-500/15 hover:bg-emerald-500/25 border border-emerald-500/30 text-emerald-300 text-[11px] font-bold inline-flex items-center gap-1"
              >
                <PlayCircle className="w-3.5 h-3.5" />
                <span>Resume Selected</span>
              </button>
              {!confirmBulkDelete ? (
                <button
                  type="button"
                  onClick={() => setConfirmBulkDelete(true)}
                  className="px-3 py-1.5 rounded-lg bg-red-500/15 hover:bg-red-500/25 border border-red-500/30 text-red-300 text-[11px] font-bold inline-flex items-center gap-1"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Delete Selected</span>
                </button>
              ) : (
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => handleBulkAction('delete')}
                    className="px-3 py-1.5 rounded-lg bg-red-600 text-white text-[11px] font-bold"
                  >
                    Confirm Delete ({selectedUids.length})
                  </button>
                  <button
                    type="button"
                    onClick={() => setConfirmBulkDelete(false)}
                    className="px-2.5 py-1.5 rounded-lg bg-white/10 text-gray-300 text-[11px]"
                  >
                    Cancel
                  </button>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Accounts Table */}
        <div className="overflow-x-auto border border-white/10 bg-[#10101e] rounded-xl">
          <table className="w-full text-xs text-left divide-y divide-white/5 text-gray-200">
            <thead>
              <tr className="bg-navy text-gray-400 font-mono text-[11px]">
                {isSuperAdmin && (
                  <th className="p-3.5 w-10">
                    <input
                      type="checkbox"
                      aria-label="Select all visible accounts"
                      checked={
                        selectableFilteredUids.length > 0 &&
                        selectedUids.length === selectableFilteredUids.length
                      }
                      onChange={toggleSelectAll}
                      className="accent-amber"
                    />
                  </th>
                )}
                <th className="p-3.5 font-bold">Account &amp; Organization</th>
                <th className="p-3.5 font-bold">Role</th>
                <th className="p-3.5 font-bold">Plan &amp; AI Quota</th>
                <th className="p-3.5 font-bold">Status</th>
                <th className="p-3.5 font-bold text-right">Governance Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {filteredUsers.length === 0 ? (
                <tr>
                  <td colSpan={isSuperAdmin ? 6 : 5} className="p-8 text-center text-gray-400 font-mono">
                    No matching accounts found for the selected filter.
                  </td>
                </tr>
              ) : (
                filteredUsers.map((u) => {
                  const isMaster = isSuperAdminEmail(u.email);
                  const isSelf = u.email.toLowerCase() === adminEmail.toLowerCase();
                  const status = u.accountStatus || 'active';
                  const isPaused = status === 'paused';
                  const roleMeta = getRoleMeta(u.role);
                  const aiUsed = getEffectiveAiUsage(u.aiQueriesUsed, u.aiQuotaResetMonth);
                  const isBusy = busyUid === u.uid;

                  return (
                    <tr
                      key={u.uid}
                      className={`hover:bg-white/[0.03] ${isPaused ? 'opacity-75 bg-rose-950/10' : ''}`}
                    >
                      {isSuperAdmin && (
                        <td className="p-3.5">
                          <input
                            type="checkbox"
                            disabled={isMaster || isSelf}
                            checked={selectedUids.includes(u.uid)}
                            onChange={() => toggleSelectOne(u.uid)}
                            aria-label={`Select ${u.email}`}
                            className="accent-amber disabled:opacity-30"
                          />
                        </td>
                      )}

                      <td className="p-3.5 min-w-[210px]">
                        <div className="font-semibold text-white">{u.name || 'Registered User'}</div>
                        <div className="font-mono text-[11px] text-amber truncate max-w-[240px]">{u.email}</div>
                        <div className="text-[11px] text-gray-400 truncate max-w-[240px]">
                          {u.hospital || 'Clinic / Facility'}{u.phone ? ` · ${u.phone}` : ''}
                        </div>
                      </td>

                      <td className="p-3.5 min-w-[170px]">
                        {isMaster ? (
                          <span className={`inline-flex items-center gap-1 text-[10px] font-mono font-bold uppercase px-2.5 py-1 rounded border ${roleMeta.badgeClass}`}>
                            <ShieldCheck className="w-3 h-3" />
                            <span>{roleMeta.shortLabel}</span>
                          </span>
                        ) : isSuperAdmin ? (
                          <div className="space-y-1">
                            <select
                              value={u.role === 'owner' ? 'client' : u.role}
                              disabled={isBusy}
                              onChange={(e) => handleRoleChange(u, e.target.value as UserRole)}
                              className="bg-navy border border-white/15 rounded-lg px-2.5 py-1.5 text-[11px] font-mono text-white"
                            >
                              {ASSIGNABLE_ROLES.map((r) => (
                                <option key={r} value={r}>
                                  {ROLE_DEFINITIONS[r].label}
                                </option>
                              ))}
                              {u.role === 'superadmin' && <option value="superadmin">Super Admin</option>}
                            </select>
                            <div className="text-[10px] text-gray-400">{roleMeta.shortLabel}</div>
                          </div>
                        ) : (
                          <span className={`inline-block text-[10px] font-mono font-bold uppercase px-2.5 py-1 rounded border ${roleMeta.badgeClass}`}>
                            {roleMeta.shortLabel}
                          </span>
                        )}
                      </td>

                      <td className="p-3.5 min-w-[165px]">
                        <div className="flex items-center gap-2">
                          {isSuperAdmin && !isMaster ? (
                            <select
                              value={u.planId || 'free'}
                              disabled={isBusy}
                              onChange={(e) => handlePlanChange(u, e.target.value as SubscriptionTierId)}
                              className="bg-navy border border-white/15 rounded-lg px-2 py-1 text-[11px] font-mono text-emerald-300"
                            >
                              <option value="free">Free</option>
                              <option value="pro">Pro</option>
                              <option value="enterprise">Enterprise</option>
                            </select>
                          ) : (
                            <span className="font-mono font-bold uppercase text-emerald-300 text-[11px]">
                              {u.planId || (isMaster ? 'enterprise' : 'free')}
                            </span>
                          )}
                          <span className="text-[11px] font-mono text-gray-300 tabular-nums">
                            · {aiUsed} AI
                          </span>
                          {aiUsed > 0 && isSuperAdmin && (
                            <button
                              type="button"
                              onClick={() => handleResetAiQuota(u)}
                              title="Reset monthly AI counter"
                              className="text-[10px] font-mono text-amber hover:underline"
                            >
                              Reset
                            </button>
                          )}
                        </div>
                      </td>

                      <td className="p-3.5 min-w-[120px]">
                        {isPaused ? (
                          <div className="space-y-0.5">
                            <span className="inline-flex items-center gap-1 text-[10px] font-mono font-bold uppercase px-2 py-0.5 rounded bg-rose-500/15 text-rose-300 border border-rose-500/30">
                              Paused
                            </span>
                            {u.pausedReason && (
                              <div className="text-[10px] text-gray-400 truncate max-w-[140px]" title={u.pausedReason}>
                                {u.pausedReason}
                              </div>
                            )}
                          </div>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-[10px] font-mono font-bold uppercase px-2 py-0.5 rounded bg-emerald-500/15 text-emerald-300 border border-emerald-500/30">
                            Active
                          </span>
                        )}
                      </td>

                      <td className="p-3.5 text-right whitespace-nowrap">
                        {!isSuperAdmin ? (
                          <span className="text-[11px] font-mono text-gray-500">
                            Super Admin required
                          </span>
                        ) : isMaster ? (
                          <span className="text-[11px] font-mono text-emerald-300/80">
                            Protected Master
                          </span>
                        ) : confirmDeleteUser?.uid === u.uid ? (
                          <div className="inline-flex items-center gap-1.5">
                            <button
                              type="button"
                              disabled={isBusy}
                              onClick={() => executeDeleteUser(u)}
                              className="px-2.5 py-1.5 rounded-lg bg-red-600 hover:bg-red-500 text-white text-[11px] font-bold"
                            >
                              Confirm Delete
                            </button>
                            <button
                              type="button"
                              onClick={() => setConfirmDeleteUser(null)}
                              className="px-2 py-1.5 rounded-lg bg-white/10 text-gray-300 text-[11px]"
                            >
                              Cancel
                            </button>
                          </div>
                        ) : (
                          <div className="inline-flex items-center gap-1.5">
                            {isPaused ? (
                              <button
                                type="button"
                                disabled={isBusy}
                                onClick={() => executePauseOrResume(u, 'active')}
                                className="px-2.5 py-1.5 rounded-lg bg-emerald-500/15 hover:bg-emerald-500/25 border border-emerald-500/30 text-emerald-300 text-[11px] font-bold inline-flex items-center gap-1"
                              >
                                <PlayCircle className="w-3.5 h-3.5" />
                                <span>Resume</span>
                              </button>
                            ) : (
                              <button
                                type="button"
                                disabled={isBusy || isSelf}
                                onClick={() => {
                                  setPauseReason('Paused by Super Admin');
                                  setPauseTargetUser(u);
                                }}
                                className="px-2.5 py-1.5 rounded-lg bg-amber/15 hover:bg-amber/25 border border-amber/30 text-amber text-[11px] font-bold inline-flex items-center gap-1 disabled:opacity-40"
                              >
                                <PauseCircle className="w-3.5 h-3.5" />
                                <span>Pause</span>
                              </button>
                            )}

                            <button
                              type="button"
                              disabled={isBusy || isSelf}
                              onClick={() => setConfirmDeleteUser(u)}
                              title="Delete account permanently"
                              className="px-2.5 py-1.5 rounded-lg bg-red-500/15 hover:bg-red-500/25 border border-red-500/30 text-red-300 text-[11px] font-bold inline-flex items-center gap-1 disabled:opacity-40"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                              <span>Delete</span>
                            </button>
                          </div>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Pause Reason Confirmation Modal */}
      {pauseTargetUser && (
        <div className="fixed inset-0 z-[2200] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-navy border border-amber/30 rounded-2xl w-full max-w-md p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <h3 className="font-syne font-bold text-white text-sm uppercase tracking-wider flex items-center gap-2">
                <PauseCircle className="w-4 h-4 text-amber" />
                <span>Pause Account Access</span>
              </h3>
              <button
                type="button"
                onClick={() => setPauseTargetUser(null)}
                className="text-gray-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <p className="text-xs text-gray-300 leading-relaxed">
              Pausing <span className="font-mono text-amber">{pauseTargetUser.email}</span> ({getRoleMeta(pauseTargetUser.role).shortLabel}) blocks sign-in and disconnects any active session until resumed.
            </p>
            <div>
              <label className="block text-[10px] font-mono uppercase text-gray-400 font-bold mb-1">
                Pause Reason (Optional)
              </label>
              <input
                type="text"
                value={pauseReason}
                onChange={(e) => setPauseReason(e.target.value)}
                placeholder="e.g. Subscription renewal pending / Verification hold"
                className="w-full bg-[#10101e] border border-white/15 rounded-xl px-3.5 py-2 text-xs text-white"
              />
            </div>
            <div className="flex gap-2.5 pt-1">
              <button
                type="button"
                onClick={() => setPauseTargetUser(null)}
                className="flex-1 py-2.5 rounded-xl border border-white/10 text-gray-300 text-xs font-bold"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={busyUid === pauseTargetUser.uid}
                onClick={() => executePauseOrResume(pauseTargetUser, 'paused', pauseReason)}
                className="flex-1 py-2.5 rounded-xl bg-amber text-navy text-xs font-black uppercase font-syne flex items-center justify-center gap-1.5"
              >
                <Check className="w-3.5 h-3.5" />
                <span>Pause Account</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add Account Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-[2200] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <form
            onSubmit={handleCreateAccount}
            className="bg-navy border border-white/15 rounded-2xl w-full max-w-lg p-6 space-y-4 shadow-2xl max-h-[92vh] overflow-y-auto"
          >
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <h3 className="font-syne font-bold text-white text-sm uppercase tracking-wider flex items-center gap-2">
                <Plus className="w-4 h-4 text-amber" />
                <span>Add Customer, Client, Technician or Admin</span>
              </h3>
              <button
                type="button"
                onClick={() => setShowAddModal(false)}
                className="text-gray-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-[10px] font-mono uppercase text-gray-400 font-bold mb-1">
                  Full Name *
                </label>
                <input
                  type="text"
                  required
                  value={newUserForm.name}
                  onChange={(e) => setNewUserForm({ ...newUserForm, name: e.target.value })}
                  placeholder="Dr. Meera Kulkarni"
                  className="w-full bg-[#10101e] border border-white/10 rounded-xl px-3 py-2 text-xs text-white"
                />
              </div>
              <div>
                <label className="block text-[10px] font-mono uppercase text-gray-400 font-bold mb-1">
                  Email Address *
                </label>
                <input
                  type="email"
                  required
                  value={newUserForm.email}
                  onChange={(e) => setNewUserForm({ ...newUserForm, email: e.target.value })}
                  placeholder="user@hospital.in"
                  className="w-full bg-[#10101e] border border-white/10 rounded-xl px-3 py-2 text-xs font-mono text-white"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-[10px] font-mono uppercase text-gray-400 font-bold mb-1">
                  Hospital / Brand Organization
                </label>
                <input
                  type="text"
                  value={newUserForm.hospital}
                  onChange={(e) => setNewUserForm({ ...newUserForm, hospital: e.target.value })}
                  placeholder="Lifeline Critical Care"
                  className="w-full bg-[#10101e] border border-white/10 rounded-xl px-3 py-2 text-xs text-white"
                />
              </div>
              <div>
                <label className="block text-[10px] font-mono uppercase text-gray-400 font-bold mb-1">
                  Phone Number
                </label>
                <input
                  type="tel"
                  value={newUserForm.phone}
                  onChange={(e) => setNewUserForm({ ...newUserForm, phone: e.target.value })}
                  placeholder="+91 98200 00000"
                  className="w-full bg-[#10101e] border border-white/10 rounded-xl px-3 py-2 text-xs text-white"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-[10px] font-mono uppercase text-gray-400 font-bold mb-1">
                  Account Role
                </label>
                <select
                  value={newUserForm.role}
                  onChange={(e) => setNewUserForm({ ...newUserForm, role: e.target.value as UserRole })}
                  className="w-full bg-[#10101e] border border-white/10 rounded-xl px-3 py-2 text-xs text-white"
                >
                  <option value="customer">Customer (Hospital / Clinic)</option>
                  <option value="technician">Technician (Field Engineer)</option>
                  {isSuperAdmin && <option value="client">Client (White-Label Brand Partner)</option>}
                  {isSuperAdmin && <option value="admin">Admin (Operations Manager)</option>}
                </select>
              </div>
              <div>
                <label className="block text-[10px] font-mono uppercase text-gray-400 font-bold mb-1">
                  Initial Plan Tier
                </label>
                <select
                  value={newUserForm.planId}
                  onChange={(e) => setNewUserForm({ ...newUserForm, planId: e.target.value as SubscriptionTierId })}
                  className="w-full bg-[#10101e] border border-white/10 rounded-xl px-3 py-2 text-xs text-white"
                >
                  <option value="free">Free</option>
                  <option value="pro">Pro</option>
                  <option value="enterprise">Enterprise</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-[10px] font-mono uppercase text-gray-400 font-bold mb-1">
                Initial Sign-In Password (Optional, 6+ chars)
              </label>
              <input
                type="password"
                minLength={6}
                value={newUserForm.password}
                onChange={(e) => setNewUserForm({ ...newUserForm, password: e.target.value })}
                placeholder="Leave blank if registering via Create Account"
                className="w-full bg-[#10101e] border border-white/10 rounded-xl px-3 py-2 text-xs text-white"
              />
            </div>

            <div className="flex gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => setShowAddModal(false)}
                className="flex-1 py-2.5 rounded-xl border border-white/10 text-gray-300 text-xs font-bold"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={creatingAccount}
                className="flex-1 py-2.5 rounded-xl bg-gradient-to-r from-crimson to-amber text-navy text-xs font-black uppercase font-syne flex items-center justify-center gap-1.5"
              >
                {creatingAccount && <RefreshCw className="w-3.5 h-3.5 animate-spin" />}
                <span>Create Account</span>
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
