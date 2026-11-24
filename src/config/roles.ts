import { UserProfile } from '../types';

export type CanonicalRole = UserProfile['role'];

export interface RoleMeta {
  id: CanonicalRole;
  label: string;
  shortLabel: string;
  badgeClass: string;
  audience: string;
  accessSummary: string;
}

export const SUPER_ADMIN_EMAIL = 'krishnadigitalai@gmail.com';
export const SECONDARY_SUPER_ADMIN_EMAIL = 'superadmin@sunmedx.in';

export const ROLE_DEFINITIONS: Record<CanonicalRole, RoleMeta> = {
  customer: {
    id: 'customer',
    label: 'Customer (Hospital / Clinic)',
    shortLabel: 'Customer',
    badgeClass: 'bg-sky-500/15 text-sky-300 border-sky-500/30',
    audience: 'Hospitals, diagnostic labs, and clinic buyers',
    accessSummary: 'Client Hub (#customer-portal): E-Catalogue orders, RFQs, calibration tracking, AMC & AI Hub.',
  },
  client: {
    id: 'client',
    label: 'Client (Brand Partner)',
    shortLabel: 'Client',
    badgeClass: 'bg-amber/15 text-amber border-amber/30',
    audience: 'White-label brand owners & partner organizations',
    accessSummary: 'White-Label Studio + Operations Admin (#admin) & Client Hub, without Super Admin SaaS governance.',
  },
  owner: {
    id: 'owner',
    label: 'Client (Brand Owner)',
    shortLabel: 'Client',
    badgeClass: 'bg-amber/15 text-amber border-amber/30',
    audience: 'White-label brand owner operating the portal',
    accessSummary: 'White-Label Studio + Operations Admin (#admin) & Client Hub, without Super Admin SaaS governance.',
  },
  technician: {
    id: 'technician',
    label: 'Technician (Field Engineer)',
    shortLabel: 'Technician',
    badgeClass: 'bg-violet-500/15 text-violet-300 border-violet-500/30',
    audience: 'On-site biomedical service & calibration engineers',
    accessSummary: 'Field Dispatch Console: assigned hospital jobs, calibration checks & digital sign-off PDFs.',
  },
  admin: {
    id: 'admin',
    label: 'Admin (Operations Manager)',
    shortLabel: 'Admin',
    badgeClass: 'bg-orange-500/15 text-orange-300 border-orange-500/30',
    audience: 'Internal operations, dispatch & finance administrators',
    accessSummary: 'Full operational Admin Studio (#admin): RFQs, orders, invoices, AMC, marketing & catalog.',
  },
  superadmin: {
    id: 'superadmin',
    label: 'Super Admin (SunMedX Master)',
    shortLabel: 'Super Admin',
    badgeClass: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30',
    audience: 'SunMedX platform owner & SaaS governor',
    accessSummary: 'Full platform control: SaaS plans, module toggles, pause/delete any role & clone export.',
  },
};

export const ASSIGNABLE_ROLES: CanonicalRole[] = [
  'customer',
  'client',
  'technician',
  'admin',
];

export function isSuperAdminEmail(email?: string | null): boolean {
  const normalized = (email || '').trim().toLowerCase();
  return normalized === SUPER_ADMIN_EMAIL || normalized === SECONDARY_SUPER_ADMIN_EMAIL;
}

export function isClientBrandRole(role?: string | null): boolean {
  const normalized = (role || '').trim().toLowerCase();
  return normalized === 'client' || normalized === 'owner';
}

export function isAdminWorkspaceRole(role?: string | null): boolean {
  const normalized = (role || '').trim().toLowerCase();
  return (
    normalized === 'superadmin' ||
    normalized === 'admin' ||
    normalized === 'client' ||
    normalized === 'owner'
  );
}

export function getRoleMeta(role?: string | null): RoleMeta {
  const normalized = ((role || 'customer').trim().toLowerCase() as CanonicalRole);
  return ROLE_DEFINITIONS[normalized] || ROLE_DEFINITIONS.customer;
}
