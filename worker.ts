import { onRequestGet as healthGet } from './functions/api/health';
import { onRequestGet as paymentsStatusGet } from './functions/api/payments/status';
import { onRequestPost as adminAgentPost } from './functions/api/admin-agent';
import { onRequestPost as diagnosePost } from './functions/api/diagnose';
import { onRequestPost as suggestQuotePost } from './functions/api/suggest-quote';
import { onRequestPost as clientAiPost } from './functions/api/client-ai';
import { onRequestPost as sendEmailPost } from './functions/api/send-email';
import { onRequestPost as loginPost } from './functions/api/auth/login';
import { onRequestPost as registerPost } from './functions/api/auth/register';
import {
  onRequestGet as collectionGet,
  onRequestPost as collectionPost,
} from './functions/api/collections/[collection]';
import {
  onRequestGet as docGet,
  onRequestPut as docPut,
  onRequestPatch as docPatch,
  onRequestDelete as docDelete,
} from './functions/api/collections/[collection]/[id]';

interface WorkerEnv {
  ASSETS?: {
    fetch(request: Request): Promise<Response>;
  };
  DB?: any;
  GEMINI_API_KEY?: string;
  AUTH_SECRET?: string;
  RAZORPAY_KEY_SECRET?: string;
  STRIPE_SECRET_KEY?: string;
  PAYMENT_WEBHOOK_SECRET?: string;
  RESEND_API_KEY?: string;
  EMAIL_FROM?: string;
  VITE_DATA_SOURCE?: string;
  [key: string]: any;
}

export default {
  async fetch(request: Request, env: WorkerEnv): Promise<Response> {
    const url = new URL(request.url);
    const pathname = url.pathname.replace(/\/+$/, '') || '/';
    const method = request.method.toUpperCase();

    if (pathname === '/api/health' && method === 'GET') {
      return healthGet({ request, env });
    }

    if (pathname === '/api/payments/status' && method === 'GET') {
      return paymentsStatusGet({ request, env });
    }

    if (pathname === '/api/admin-agent' && method === 'POST') {
      return adminAgentPost({ request, env });
    }

    if (pathname === '/api/diagnose' && method === 'POST') {
      return diagnosePost({ request, env });
    }

    if (pathname === '/api/suggest-quote' && method === 'POST') {
      return suggestQuotePost({ request, env });
    }

    if (pathname === '/api/client-ai' && method === 'POST') {
      return clientAiPost({ request, env });
    }

    if (pathname === '/api/send-email' && method === 'POST') {
      return sendEmailPost({ request, env });
    }

    if (pathname === '/api/auth/login' && method === 'POST') {
      return loginPost({ request, env });
    }

    if (pathname === '/api/auth/register' && method === 'POST') {
      return registerPost({ request, env });
    }

    // Dynamic collection routes: /api/collections/:collection and /api/collections/:collection/:id
    if (pathname.startsWith('/api/collections/')) {
      const segments = pathname.slice('/api/collections/'.length).split('/').filter(Boolean);

      if (segments.length === 1) {
        const collection = decodeURIComponent(segments[0]);
        if (method === 'GET') return collectionGet({ request, params: { collection }, env });
        if (method === 'POST') return collectionPost({ request, params: { collection }, env });
      }

      if (segments.length === 2) {
        const collection = decodeURIComponent(segments[0]);
        const id = decodeURIComponent(segments[1]);
        if (method === 'GET') return docGet({ request, params: { collection, id }, env });
        if (method === 'PUT') return docPut({ request, params: { collection, id }, env });
        if (method === 'PATCH') return docPatch({ request, params: { collection, id }, env });
        if (method === 'DELETE') return docDelete({ request, params: { collection, id }, env });
      }

      return Response.json({ error: 'Method not allowed or invalid collection path.' }, { status: 405 });
    }

    if (pathname.startsWith('/api/')) {
      return Response.json({ error: `API route not found: ${pathname}` }, { status: 404 });
    }

    if (env.ASSETS) {
      return env.ASSETS.fetch(request);
    }

    return new Response('Static assets binding (ASSETS) not configured.', { status: 500 });
  },
};
