interface D1Database {
  prepare(query: string): {
    bind(...values: any[]): {
      all<T = any>(): Promise<{ results?: T[] }>;
      first<T = any>(): Promise<T | null>;
      run(): Promise<any>;
    };
  };
}

interface FunctionContext {
  request: Request;
  params: { collection?: string };
  env: { DB?: D1Database };
}

const VALID_COLLECTION = /^[a-zA-Z0-9_]{1,64}$/;

export async function onRequestGet({ params, env }: FunctionContext): Promise<Response> {
  if (!env.DB) {
    return Response.json({ error: 'Cloudflare D1 binding (DB) is not configured.' }, { status: 503 });
  }
  const collection = params.collection || '';
  if (!VALID_COLLECTION.test(collection)) {
    return Response.json({ error: 'Invalid collection name.' }, { status: 400 });
  }

  const { results } = await env.DB.prepare(
    'SELECT id, data FROM documents WHERE collection = ?'
  )
    .bind(collection)
    .all<{ id: string; data: string }>();

  const records = (results || []).map((row) => ({
    ...JSON.parse(row.data),
    id: row.id,
  }));

  return Response.json(records);
}

export async function onRequestPost({ request, params, env }: FunctionContext): Promise<Response> {
  if (!env.DB) {
    return Response.json({ error: 'Cloudflare D1 binding (DB) is not configured.' }, { status: 503 });
  }
  const collection = params.collection || '';
  if (!VALID_COLLECTION.test(collection)) {
    return Response.json({ error: 'Invalid collection name.' }, { status: 400 });
  }

  const body = (await request.json()) as Record<string, any>;
  const id = body.id || `rec_${crypto.randomUUID().slice(0, 12)}`;
  const payload = { ...body, id };
  const now = new Date().toISOString();

  await env.DB.prepare(
    'INSERT OR REPLACE INTO documents (collection, id, data, updated_at) VALUES (?, ?, ?, ?)'
  )
    .bind(collection, id, JSON.stringify(payload), now)
    .run();

  return Response.json({ id }, { status: 201 });
}
