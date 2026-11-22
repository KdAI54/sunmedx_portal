interface FunctionContext {
  request: Request;
  env: Record<string, string | undefined>;
}

export async function onRequestGet({ env }: FunctionContext): Promise<Response> {
  return Response.json({
    razorpaySecretConfigured: Boolean(env.RAZORPAY_KEY_SECRET && env.RAZORPAY_KEY_SECRET.trim().length > 0),
    stripeSecretConfigured: Boolean(env.STRIPE_SECRET_KEY && env.STRIPE_SECRET_KEY.trim().length > 0),
    webhookSecretConfigured: Boolean(env.PAYMENT_WEBHOOK_SECRET && env.PAYMENT_WEBHOOK_SECRET.trim().length > 0),
    runtime: 'cloudflare-pages',
  });
}
