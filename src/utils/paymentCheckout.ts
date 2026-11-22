import { DEFAULT_PAYMENT_GATEWAY } from '../config/seed';
import { PaymentGatewayConfig, SiteSettings } from '../types';

export function getEffectiveGatewayConfig(siteSettings: SiteSettings | null): PaymentGatewayConfig {
  const gw = siteSettings?.paymentGateway;
  return {
    ...DEFAULT_PAYMENT_GATEWAY,
    ...(gw || {}),
    publicKeyId: gw?.publicKeyId || siteSettings?.paymentKeyId || DEFAULT_PAYMENT_GATEWAY.publicKeyId,
    acceptedMethods: {
      ...DEFAULT_PAYMENT_GATEWAY.acceptedMethods,
      ...(gw?.acceptedMethods || {}),
    },
  };
}

export function isLiveGatewayKeyConfigured(gw: PaymentGatewayConfig): boolean {
  const key = (gw.publicKeyId || '').trim();
  return (
    gw.provider === 'razorpay' &&
    key.startsWith('rzp_') &&
    !key.includes('GCPKeyHolder')
  );
}

export async function launchRazorpayCheckout(options: {
  keyId: string;
  amountInr: number;
  currency?: string;
  merchantName: string;
  description: string;
  prefillEmail?: string;
  onSuccess: (paymentId: string) => void;
  onError: (message: string) => void;
}): Promise<void> {
  try {
    const loaded = await new Promise<boolean>((resolve) => {
      if ((window as any).Razorpay) return resolve(true);
      const script = document.createElement('script');
      script.src = 'https://checkout.razorpay.com/v1/checkout.js';
      script.async = true;
      script.onload = () => resolve(true);
      script.onerror = () => resolve(false);
      document.body.appendChild(script);
    });

    if (!loaded || !(window as any).Razorpay) {
      options.onError('Unable to load Razorpay Checkout SDK. Use UPI/NEFT or Sandbox authorization.');
      return;
    }

    const rzp = new (window as any).Razorpay({
      key: options.keyId,
      amount: Math.max(100, Math.round(options.amountInr * 100)),
      currency: options.currency || 'INR',
      name: options.merchantName || 'SunMedX Biomedical',
      description: options.description,
      prefill: {
        email: options.prefillEmail || '',
      },
      theme: {
        color: '#211D70',
      },
      handler: (response: any) => {
        options.onSuccess(response?.razorpay_payment_id || 'rzp_' + Date.now());
      },
    });
    rzp.on('payment.failed', (resp: any) => {
      options.onError(resp?.error?.description || 'Gateway declined the payment attempt.');
    });
    rzp.open();
  } catch (err: any) {
    options.onError(err?.message || 'Failed initializing Razorpay Checkout.');
  }
}
