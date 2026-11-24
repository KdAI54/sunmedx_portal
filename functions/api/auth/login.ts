interface D1Database {
  prepare(query: string): {
    bind(...values: any[]): {
      first<T = any>(): Promise<T | null>;
    };
  };
}

interface FunctionContext {
  request: Request;
  env: {
    DB?: D1Database;
    AUTH_SECRET?: string;
  };
}

async function hashPassword(password: string, salt: string): Promise<string> {
  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey('raw', enc.encode(password), 'PBKDF2', false, ['deriveBits']);
  const bits = await crypto.subtle.deriveBits(
    { name: 'PBKDF2', salt: enc.encode(salt), iterations: 100000, hash: 'SHA-256' },
    key,
    256
  );
  return Array.from(new Uint8Array(bits))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

async function signToken(payload: Record<string, any>, secret: string): Promise<string> {
  const header = btoa(JSON.stringify({ alg: 'HS256', typ: 'JWT' }));
  const body = btoa(JSON.stringify({ ...payload, iat: Math.floor(Date.now() / 1000) }));
  const data = `${header}.${body}`;
  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );
  const sig = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(data));
  const sigHex = Array.from(new Uint8Array(sig))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
  return `${data}.${sigHex}`;
}

export async function onRequestPost({ request, env }: FunctionContext): Promise<Response> {
  if (!env.DB) {
    return Response.json({ error: 'Cloudflare D1 binding (DB) is not configured.' }, { status: 503 });
  }

  const { email, password } = (await request.json()) as { email?: string; password?: string };
  const normalized = (email || '').trim().toLowerCase();

  if (!normalized || !password) {
    return Response.json({ error: 'Email and password are required.' }, { status: 400 });
  }

  const account = await env.DB.prepare(
    'SELECT uid, email, password_hash, salt, name, hospital, role FROM auth_accounts WHERE email = ?'
  )
    .bind(normalized)
    .first<{
      uid: string;
      email: string;
      password_hash: string;
      salt: string;
      name: string;
      hospital: string;
      role: string;
    }>();

  if (!account) {
    return Response.json({ error: 'Invalid email or password.' }, { status: 401 });
  }

  const computedHash = await hashPassword(password, account.salt);
  if (computedHash !== account.password_hash) {
    return Response.json({ error: 'Invalid email or password.' }, { status: 401 });
  }

  const userDocRow = await env.DB.prepare(
    'SELECT data FROM documents WHERE collection = ? AND id = ?'
  )
    .bind('users', account.uid)
    .first<{ data: string }>()
    .catch(() => null);

  let userDoc: Record<string, any> | null = null;
  if (userDocRow?.data) {
    try {
      userDoc = JSON.parse(userDocRow.data);
    } catch {
      userDoc = null;
    }
  }

  const isMasterSuperAdmin = account.email.toLowerCase().trim() === 'krishnadigitalai@gmail.com';
  if (!isMasterSuperAdmin && userDoc?.accountStatus === 'paused') {
    return Response.json(
      { error: 'Your account has been paused by the Super Admin. Contact support to restore access.' },
      { status: 403 }
    );
  }

  const verifiedRole = isMasterSuperAdmin ? 'superadmin' : userDoc?.role || account.role;

  const user = {
    uid: account.uid,
    email: account.email,
    name: userDoc?.name || account.name,
    hospital: userDoc?.hospital || account.hospital,
    role: verifiedRole,
    planId: userDoc?.planId || (isMasterSuperAdmin ? 'enterprise' : 'free'),
    accountStatus: userDoc?.accountStatus || 'active',
  };

  const token = env.AUTH_SECRET ? await signToken(user, env.AUTH_SECRET) : undefined;
  return Response.json({ user, token });
}
