import { env } from '../config/env';
import { getDb, safeStorage } from './dataClient';

export type UserRole = 'customer' | 'client' | 'owner' | 'admin' | 'technician' | 'superadmin';

export interface AuthUser {
  uid: string;
  email: string;
  name?: string;
  hospital?: string;
  role?: UserRole;
  planId?: 'free' | 'pro' | 'enterprise';
  accountStatus?: 'active' | 'paused';
}

export interface SignUpInput {
  name: string;
  hospital: string;
  email: string;
  password: string;
}

export interface AuthAdapter {
  getSession(): AuthUser | null;
  signIn(email: string, password: string): Promise<{ user: AuthUser }>;
  signUp(input: SignUpInput): Promise<{ user: AuthUser }>;
  signOut(): Promise<void>;
  onAuthStateChanged(callback: (user: AuthUser | null) => void): () => void;
}

const SESSION_KEY = 'sunmedx_auth_session';
const ACCOUNTS_KEY = 'sunmedx_auth_accounts';
const TOKEN_KEY = 'sunmedx_auth_token';

const SUPERADMIN_EMAIL = 'krishnadigitalai@gmail.com';

interface StoredAccount {
  uid: string;
  email: string;
  password: string;
  name: string;
  hospital: string;
  role: UserRole;
  accountStatus?: 'active' | 'paused';
  verified?: boolean;
  createdAt: string;
}

function resolveVerifiedRole(email: string, existingRole?: UserRole): UserRole {
  return email.trim().toLowerCase() === SUPERADMIN_EMAIL ? 'superadmin' : existingRole || 'customer';
}

function notifyAuthChange(user: AuthUser | null) {
  try {
    window.dispatchEvent(new CustomEvent('sunmedx_auth_change', { detail: user }));
  } catch {
    // Ignore non-browser environments
  }
}

class LocalAuthAdapter implements AuthAdapter {
  private getAccounts(): StoredAccount[] {
    const raw = safeStorage.getItem(ACCOUNTS_KEY);
    if (!raw) {
      return [];
    }
    try {
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }

  private saveAccounts(accounts: StoredAccount[]) {
    safeStorage.setItem(ACCOUNTS_KEY, JSON.stringify(accounts));
  }

  getSession(): AuthUser | null {
    const raw = safeStorage.getItem(SESSION_KEY);
    if (!raw) return null;
    try {
      return JSON.parse(raw);
    } catch {
      return null;
    }
  }

  async signIn(email: string, password: string): Promise<{ user: AuthUser }> {
    const normalized = email.trim().toLowerCase();
    if (!normalized || !password) {
      throw new Error('Please enter both your email and password.');
    }

    const accounts = this.getAccounts();
    const account = accounts.find((a) => a.email.toLowerCase() === normalized);

    if (!account) {
      throw new Error('No account found with this email. Please create an account first.');
    }

    if (account.password !== password) {
      throw new Error('Incorrect password. Please try again.');
    }

    // Check latest users collection status & role
    let dbProfile: any = null;
    try {
      const snap = await getDb().collection('users').where('email', '==', normalized).get();
      if (!snap.empty && snap.docs[0]) {
        dbProfile = snap.docs[0].data();
      }
    } catch {
      // Fallback to stored account if query fails
    }

    const effectiveStatus = dbProfile?.accountStatus || account.accountStatus || 'active';
    if (effectiveStatus === 'paused' && normalized !== SUPERADMIN_EMAIL) {
      throw new Error('Your account has been paused by the Super Admin. Please contact support to restore access.');
    }

    const verifiedRole = resolveVerifiedRole(account.email, dbProfile?.role || account.role);
    const user: AuthUser = {
      uid: account.uid,
      email: account.email,
      name: dbProfile?.name || account.name,
      hospital: dbProfile?.hospital || account.hospital,
      role: verifiedRole,
      planId: dbProfile?.planId,
      accountStatus: effectiveStatus,
    };

    safeStorage.setItem(SESSION_KEY, JSON.stringify(user));
    notifyAuthChange(user);
    return { user };
  }

  async signUp(input: SignUpInput): Promise<{ user: AuthUser }> {
    const normalized = input.email.trim().toLowerCase();
    if (!input.name.trim()) {
      throw new Error('Please enter your full name.');
    }
    if (!normalized || !normalized.includes('@')) {
      throw new Error('Please enter a valid email address.');
    }
    if (input.password.length < 6) {
      throw new Error('Password must be at least 6 characters.');
    }

    const accounts = this.getAccounts();
    if (accounts.some((a) => a.email.toLowerCase() === normalized)) {
      throw new Error('An account with this email already exists. Please sign in.');
    }

    const uid = `sm-user-${Math.random().toString(36).slice(2, 10)}`;
    const now = new Date().toISOString();
    const isSuperAdminAccount = normalized === SUPERADMIN_EMAIL;
    const role: UserRole = isSuperAdminAccount ? 'superadmin' : 'customer';

    const newAccount: StoredAccount = {
      uid,
      email: normalized,
      password: input.password,
      name: input.name.trim(),
      hospital: input.hospital.trim() || 'Independent Clinic',
      role,
      accountStatus: 'active',
      verified: isSuperAdminAccount,
      createdAt: now,
    };

    this.saveAccounts([...accounts, newAccount]);

    const currentMonth = new Date().toISOString().slice(0, 7);
    const defaultPlan = isSuperAdminAccount ? 'enterprise' : 'free';

    // Sync profile to users collection
    await getDb().collection('users').doc(uid).set({
      uid,
      email: normalized,
      name: newAccount.name,
      phone: '',
      hospital: newAccount.hospital,
      role,
      accountStatus: 'active',
      planId: defaultPlan,
      planStatus: 'active',
      aiQueriesUsed: 0,
      aiQuotaResetMonth: currentMonth,
      verified: isSuperAdminAccount,
      createdAt: now,
    });

    const user: AuthUser = {
      uid,
      email: normalized,
      name: newAccount.name,
      hospital: newAccount.hospital,
      role,
      planId: defaultPlan,
      accountStatus: 'active',
    };

    safeStorage.setItem(SESSION_KEY, JSON.stringify(user));
    notifyAuthChange(user);
    return { user };
  }

  async signOut(): Promise<void> {
    safeStorage.removeItem(SESSION_KEY);
    safeStorage.removeItem(TOKEN_KEY);
    notifyAuthChange(null);
  }

  onAuthStateChanged(callback: (user: AuthUser | null) => void): () => void {
    callback(this.getSession());
    const handler = (e: Event) => {
      const custom = e as CustomEvent<AuthUser | null>;
      callback(custom.detail ?? this.getSession());
    };
    window.addEventListener('sunmedx_auth_change', handler);
    return () => window.removeEventListener('sunmedx_auth_change', handler);
  }
}

/**
 * External REST Auth Adapter (e.g., Cloudflare Workers Auth, Supabase Auth, Custom JWT API).
 * Activate by setting VITE_AUTH_ENDPOINT=https://api.yourdomain.com/auth
 */
class RestAuthAdapter implements AuthAdapter {
  constructor(private endpoint: string) {}

  getSession(): AuthUser | null {
    const raw = safeStorage.getItem(SESSION_KEY);
    if (!raw) return null;
    try {
      return JSON.parse(raw);
    } catch {
      return null;
    }
  }

  async signIn(email: string, password: string): Promise<{ user: AuthUser }> {
    const res = await fetch(`${this.endpoint.replace(/\/$/, '')}/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: email.trim().toLowerCase(), password }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Authentication failed.');

    const normalizedUser: AuthUser = {
      ...data.user,
      role: resolveVerifiedRole(data.user?.email || email, data.user?.role),
    };
    if (data.token) safeStorage.setItem(TOKEN_KEY, data.token);
    safeStorage.setItem(SESSION_KEY, JSON.stringify(normalizedUser));
    notifyAuthChange(normalizedUser);
    return { user: normalizedUser };
  }

  async signUp(input: SignUpInput): Promise<{ user: AuthUser }> {
    const res = await fetch(`${this.endpoint.replace(/\/$/, '')}/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ...input,
        email: input.email.trim().toLowerCase(),
      }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Registration failed.');

    const normalizedUser: AuthUser = {
      ...data.user,
      role: resolveVerifiedRole(data.user?.email || input.email, data.user?.role),
    };
    if (data.token) safeStorage.setItem(TOKEN_KEY, data.token);
    safeStorage.setItem(SESSION_KEY, JSON.stringify(normalizedUser));
    notifyAuthChange(normalizedUser);
    return { user: normalizedUser };
  }

  async signOut(): Promise<void> {
    safeStorage.removeItem(SESSION_KEY);
    safeStorage.removeItem(TOKEN_KEY);
    notifyAuthChange(null);
  }

  onAuthStateChanged(callback: (user: AuthUser | null) => void): () => void {
    callback(this.getSession());
    const handler = (e: Event) => {
      const custom = e as CustomEvent<AuthUser | null>;
      callback(custom.detail ?? this.getSession());
    };
    window.addEventListener('sunmedx_auth_change', handler);
    return () => window.removeEventListener('sunmedx_auth_change', handler);
  }
}

let activeAuthAdapter: AuthAdapter = env.authEndpoint
  ? new RestAuthAdapter(env.authEndpoint)
  : new LocalAuthAdapter();

export function registerAuthAdapter(adapter: AuthAdapter) {
  activeAuthAdapter = adapter;
}

export function getAuth(): AuthAdapter {
  return activeAuthAdapter;
}

export function syncLocalAuthAccount(
  email: string,
  action: 'pause' | 'activate' | 'delete' | 'update_role' | 'upsert',
  updates?: {
    uid?: string;
    password?: string;
    name?: string;
    hospital?: string;
    role?: UserRole;
  }
) {
  const normalized = email.trim().toLowerCase();
  if (!normalized || normalized === SUPERADMIN_EMAIL) return;
  try {
    const raw = safeStorage.getItem(ACCOUNTS_KEY);
    const parsed: StoredAccount[] = raw ? JSON.parse(raw) : [];
    if (!Array.isArray(parsed)) return;

    if (action === 'delete') {
      const next = parsed.filter((a) => a.email.toLowerCase() !== normalized);
      safeStorage.setItem(ACCOUNTS_KEY, JSON.stringify(next));
      return;
    }

    const idx = parsed.findIndex((a) => a.email.toLowerCase() === normalized);
    if (idx >= 0) {
      const current = parsed[idx];
      parsed[idx] = {
        ...current,
        ...(updates?.name ? { name: updates.name } : {}),
        ...(updates?.hospital ? { hospital: updates.hospital } : {}),
        ...(updates?.role ? { role: updates.role } : {}),
        ...(action === 'pause' ? { accountStatus: 'paused' } : {}),
        ...(action === 'activate' ? { accountStatus: 'active' } : {}),
      };
      safeStorage.setItem(ACCOUNTS_KEY, JSON.stringify(parsed));
    } else if (action === 'upsert' && updates?.password) {
      parsed.push({
        uid: updates.uid || `sm-user-${Math.random().toString(36).slice(2, 10)}`,
        email: normalized,
        password: updates.password,
        name: updates.name || 'Portal User',
        hospital: updates.hospital || 'Clinic',
        role: updates.role || 'customer',
        accountStatus: 'active',
        verified: true,
        createdAt: new Date().toISOString(),
      });
      safeStorage.setItem(ACCOUNTS_KEY, JSON.stringify(parsed));
    }
  } catch {
    // Ignore local auth sync errors
  }
}
