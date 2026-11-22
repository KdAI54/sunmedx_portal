interface FunctionContext {
  request: Request;
  env: Record<string, string | undefined>;
}

export async function onRequestGet({ env }: FunctionContext): Promise<Response> {
  return Response.json({
    status: 'ok',
    runtime: 'cloudflare-pages',
    dataSource: env.VITE_DATA_SOURCE || 'local',
  });
}
