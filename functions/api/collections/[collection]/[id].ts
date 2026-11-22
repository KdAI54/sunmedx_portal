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
  params: { collection?: string; id?: string };
  env: { DB?: D1Database };
}

const VALID_COLLECTION = /^[a-zA-Z0-9_]{1,64}$/;

export async function onRequestGet({ params, env }: FunctionContext): Promise<Response> {
  if (!env.DB) {
    return Response.json({ error: 'Cloudflare D1 binding (DB) is not configured.' }, { status: 503 });
  }
  const collection = params.collection || '';
  const id = params.id || '';
  if (!VALID_COLLECTION.test(collection) || !id) {
    return Response.json({ error: 'Invalid collection or document ID.' }, { status: 400 });
  }

  const row = await env.DB.prepare(
    'SELECT id, data FROM documents WHERE collection = ? AND id = ?'
  )
    .bind(collection, id)
    .first<{ id: string; data: string }>();

  if (!row) {
    return Response.json(null, { status: 404 });
  }
  return Response.json({ ...JSON.parse(row.data), id: row.id });
}

export async function onRequestPut({ request, params, env }: FunctionContext): Promise<Response> {
  if (!env.DB) {
    return Response.json({ error: 'Cloudflare D1 binding (DB) is not configured.' }, { status: 503 });
  }
  const collection = params.collection || '';
  const id = params.id || '';
  if (!VALID_COLLECTION.test(collection) || !id) {
    return Response.json({ error: 'Invalid collection or document ID.' }, { status: 400 });
  }

  const body = (await request.json()) as { data?: Record<string, any>; merge?: boolean };
  let nextData = { ...(body.data || body), id };

  if (body.merge) {
    const existing = await env.DB.prepare(
      'SELECT data FROM documents WHERE collection = ? AND id = ?'
    )
      .bind(collection, id)
      .first<{ data: string }>();
    if (existing) {
      nextData = { ...JSON.parse(existing.data), ...nextData, id };
    }
  }

  await env.DB.prepare(
    'INSERT OR REPLACE INTO documents (collection, id, data, updated_at) VALUES (?, ?, ?, ?)'
  )
    .bind(collection, id, JSON.stringify(nextData), new Date().toISOString())
    .run();

  return Response.json({ id });
}

export async function onRequestPatch({ request, params, env }: FunctionContext): Promise<Response> {
  if (!env.DB) {
    return Response.json({ error: 'Cloudflare D1 binding (DB) is not configured.' }, { status: 503 });
  }
  const collection = params.collection || '';
  const id = params.id || '';
  if (!VALID_COLLECTION.test(collection) || !id) {
    return Response.json({ error: 'Invalid collection or document ID.' }, { status: 400 });
  }

  const patch = (await request.json()) as Record<string, any>;
  const existing = await env.DB.prepare(
    'SELECT data FROM documents WHERE collection = ? AND id = ?'
  )
    .bind(collection, id)
    .first<{ data: string }>();

  const merged = existing ? { ...JSON.parse(existing.data), ...patch, id } : { ...patch, id };

  await env.DB.prepare(
    'INSERT OR REPLACE INTO documents (collection, id, data, updated_at) VALUES (?, ?, ?, ?)'
  )
    .bind(collection, id, JSON.stringify(merged), new Date().toISOString())
    .run();

  return Response.json({ id });
}

export async function onRequestDelete({ params, env }: FunctionContext): Promise<Response> {
  if (!env.DB) {
    return Response.json({ error: 'Cloudflare D1 binding (DB) is not configured.' }, { status: 503 });
  }
  const collection = params.collection || '';
  const id = params.id || '';
  if (!VALID_COLLECTION.test(collection) || !id) {
    return Response.json({ error: 'Invalid collection or document ID.' }, { status: 400 });
  }

  await env.DB.prepare('DELETE FROM documents WHERE collection = ? AND id = ?')
    .bind(collection, id)
    .run();

  return new Response(null, { status: 204 });
}
