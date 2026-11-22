interface D1Database {
  prepare(query: string): {
    bind(...values: any[]): {
      first<T = any>(): Promise<T | null>;
      run(): Promise<any>;
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

  const body = (await request.json()) as {
    name?: string;
    hospital?: string;
    email?: string;
    password?: string;
  };

  const name = (body.name || '').trim();
  const hospital = (body.hospital || '').trim() || 'Independent Clinic';
  const email = (body.email || '').trim().toLowerCase();
  const password = body.password || '';

  if (!name || !email.includes('@') || password.length < 6) {
    return Response.json(
      { error: 'Valid name, email, and password (6+ characters) are required.' },
      { status: 400 }
    );
  }

  const existing = await env.DB.prepare('SELECT uid FROM auth_accounts WHERE email = ?')
    .bind(email)
    .first();

  if (existing) {
    return Response.json({ error: 'An account with this email already exists.' }, { status: 409 });
  }

  const uid = `sm-user-${crypto.randomUUID().slice(0, 10)}`;
  const salt = crypto.randomUUID();
  const passwordHash = await hashPassword(password, salt);
  const now = new Date().toISOString();
  const role = 'customer';

  await env.DB.prepare(
    'INSERT INTO auth_accounts (uid, email, password_hash, salt, name, hospital, role, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)'
  )
    .bind(uid, email, passwordHash, salt, name, hospital, role, now)
    .run();

  await env.DB.prepare(
    'INSERT OR REPLACE INTO documents (collection, id, data, updated_at) VALUES (?, ?, ?, ?)'
  )
    .bind(
      'users',
      uid,
      JSON.stringify({ uid, email, name, phone: '', hospital, role, createdAt: now }),
      now
    )
    .run();

  const user = { uid, email, name, hospital, role };
  const token = env.AUTH_SECRET ? await signToken(user, env.AUTH_SECRET) : undefined;
  return Response.json({ user, token }, { status: 201 });
}
