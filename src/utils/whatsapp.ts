import { getDb } from '../services/dataClient';
import { WhatsAppLog } from '../types';

export async function sendWhatsAppAlert(
  triggerEvent: string,
  recipientPhone: string,
  placeholders: Record<string, string>
) {
  const db = getDb();
  console.log(`[WhatsApp Alert Trigger] Event: ${triggerEvent} to ${recipientPhone}`);

  try {
    // 1. Fetch site settings for keys
    const settingsDoc = await db.collection('site_settings').doc('global').get();
    const settings = settingsDoc.exists ? settingsDoc.data() : null;
    const whatsappApiKey = settings?.whatsappApiKey || 'MOCK_WHATSAPP_API_KEY';
    const systemPhone = settings?.whatsappNumber || '+91 98765 43210';

    // 2. Fetch template
    const templatesSnap = await db.collection('whatsapp_templates')
      .where('name', '==', triggerEvent)
      .get();

    let templateContent = '';
    if (!templatesSnap.empty) {
      templatesSnap.forEach((doc: any) => {
        templateContent = doc.data().content;
      });
    } else {
      // Fallback default templates
      const fallbacks: Record<string, string> = {
        'order_placed': "Hello {customer_name}, your order #{order_id} of Rs {amount} has been successfully placed. Thank you for choosing SunMedX!",
        'quote_response_ready': "Hello {customer_name}, the quote request for your equipment {equipment} is ready with estimate Rs {amount}. Please review details in Client Hub.",
        'technician_assigned': "Hello {customer_name}, Field Engineer {tech_name} ({tech_phone}) has been dispatched for your service request #{request_id}. Track live on portal.",
        'job_completed': "Hello {customer_name}, validation/repair job on equipment {equipment} has been completed by {tech_name}. Report and invoice are ready for download.",
        'amc_renewal_due': "Hello {customer_name}, your AMC contract is expiring in 30 days. Please accept renewal to avoid downtime.",
        'invoice_generated': "Hello {customer_name}, an invoice of Rs {amount} is generated for order/contract #{ref_id}. Paid via Razorpay successfully."
      };
      templateContent = fallbacks[triggerEvent] || "SunMedX Notification: Action required on your biomedical account.";
    }

    // 3. Inject placeholders
    let message = templateContent;
    Object.entries(placeholders).forEach(([key, value]) => {
      message = message.replaceAll(`{${key}}`, value);
    });

    // 4. API Request Simulation / Real payload log
    console.log(`[WhatsApp API Call Mock] URL: https://graph.facebook.com/v16.0/${systemPhone}/messages`);
    console.log(`[WhatsApp API Header] "Authorization: Bearer ${whatsappApiKey}"`);
    console.log(`[WhatsApp SMS Content] "${message}"`);

    const status: 'Sent' | 'Failed' = recipientPhone ? 'Sent' : 'Failed';

    // Log to Firebase
    const logItem: WhatsAppLog = {
      recipient: recipientPhone || 'N/A',
      message,
      status,
      timestamp: new Date().toISOString(),
      triggerEvent
    };

    await db.collection('whatsapp_logs').add(logItem);

    // Show beautiful toast notification mock in document view if possible
    try {
      const toastDiv = document.createElement('div');
      toastDiv.className = 'fixed bottom-6 left-6 z-[9999] bg-gradient-to-r from-amber to-crimson p-4 rounded-2xl shadow-2xl border border-white/10 max-w-sm text-navy animate-bounce duration-1000';
      toastDiv.innerHTML = `
        <div class="flex items-start gap-2.5">
          <i class="fa-brands fa-whatsapp text-lg shrink-0"></i>
          <div>
            <p class="text-[10px] font-mono tracking-widest font-black uppercase text-navy/60">WhatsApp Alert Triggered</p>
            <p class="text-xs font-bold leading-snug">${message}</p>
            <p class="text-[9px] font-mono mt-1 text-navy/70">To: ${recipientPhone}</p>
          </div>
        </div>
      `;
      document.body.appendChild(toastDiv);
      setTimeout(() => {
        toastDiv.classList.add('opacity-0', 'transition-opacity', 'duration-500');
        setTimeout(() => toastDiv.remove(), 500);
      }, 5000);
    } catch (err) {
      // In non-browser threads, ignore DOM errors
    }

    return true;
  } catch (error) {
    console.error("WhatsApp notification dispatch failed:", error);
    return false;
  }
}
