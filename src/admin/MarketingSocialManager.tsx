import React, { useEffect, useMemo, useState } from 'react';
import {
  Calendar,
  CheckCircle2,
  Copy,
  ExternalLink,
  Eye,
  Link2,
  Mail,
  Megaphone,
  Plus,
  RefreshCw,
  Save,
  Send,
  Share2,
  Sparkles,
  Trash2,
  Upload,
  Users,
} from 'lucide-react';
import { getDb } from '../services/dataClient';
import ImageAttachmentField from '../components/ImageAttachmentField';
import {
  AMCContract,
  Course,
  EmailCampaign,
  Product,
  QuotationRequest,
  ServiceRequest,
  SiteSettings,
  SocialPost,
  UserProfile,
} from '../types';

interface MarketingSocialManagerProps {
  adminEmail: string;
  siteSettings: SiteSettings | null;
  onUpdateSettings?: (newSettings: Partial<SiteSettings>) => Promise<void>;
  usersList: UserProfile[];
  quotations: QuotationRequest[];
  amcContracts: AMCContract[];
  services: ServiceRequest[];
  catalogue: Product[];
  courses: Course[];
  logAdminAction: (action: string, details: string) => Promise<void>;
}

const SOCIAL_PLATFORMS: Array<{
  id: SocialPost['platform'];
  label: string;
  aspectHint: string;
  maxLength: number;
}> = [
  { id: 'LinkedIn', label: 'LinkedIn B2B', aspectHint: 'Hospital HODs & Procurement', maxLength: 1800 },
  { id: 'Instagram', label: 'Instagram', aspectHint: 'Visual Carousel / Reels', maxLength: 1200 },
  { id: 'X', label: 'X / Twitter', aspectHint: 'Quick Alert / Announcement', maxLength: 280 },
  { id: 'WhatsApp Channel', label: 'WhatsApp Channel', aspectHint: 'Direct Client Broadcast', maxLength: 900 },
  { id: 'YouTube', label: 'YouTube Community', aspectHint: 'Academy & Lab Demos', maxLength: 1500 },
];

export default function MarketingSocialManager({
  adminEmail,
  siteSettings,
  onUpdateSettings,
  usersList,
  quotations,
  amcContracts,
  services,
  catalogue,
  courses,
  logAdminAction,
}: MarketingSocialManagerProps) {
  const [subTab, setSubTab] = useState<'email' | 'social'>('email');
  const [campaigns, setCampaigns] = useState<EmailCampaign[]>([]);
  const [socialPosts, setSocialPosts] = useState<SocialPost[]>([]);
  const [notice, setNotice] = useState<{ type: 'success' | 'info' | 'error'; text: string; mailtoUrl?: string } | null>(null);

  // Email Composer State
  const [campName, setCampName] = useState('Q4 ICU Preventive Calibration & AMC Renewal');
  const [campCategory, setCampCategory] = useState('AMC Renewal Offer');
  const [campSegment, setCampSegment] = useState<EmailCampaign['segment']>('all_users');
  const [customEmailsInput, setCustomEmailsInput] = useState('');
  const [campSubject, setCampSubject] = useState('Schedule Your NABL-Traceable ICU Calibration Audit with SunMedX');
  const [campPreheader, setCampPreheader] = useState('Priority Mumbai engineering slots open for multi-parameter monitors & ventilators');
  const [campBody, setCampBody] = useState(
    'Dear Biomedical & Hospital Operations Team,\n\nEnsure uninterrupted NABH/NABL audit readiness across your ICU monitors, biphasic defibrillators, and ventilators. Book your preventive calibration sweep or upgrade to a SunMedX Annual Maintenance Plan with GST-compliant digital certificates.\n\nWarm regards,\nSunMedX Biomedical Engineering Desk\nMumbai, Maharashtra'
  );
  const [campCtaLabel, setCampCtaLabel] = useState('Book Calibration Audit');
  const [campCtaHash, setCampCtaHash] = useState('#services');
  const [showEmailPreview, setShowEmailPreview] = useState(false);
  const [isSendingEmail, setIsSendingEmail] = useState(false);
  const [isGeneratingEmailAi, setIsGeneratingEmailAi] = useState(false);

  // Social Post Composer State
  const [postPlatform, setPostPlatform] = useState<SocialPost['platform']>('LinkedIn');
  const [postTitle, setPostTitle] = useState('NABL-Traceable ICU Equipment Validation');
  const [postCaption, setPostCaption] = useState(
    'Zero ICU downtime starts with traceable preventive calibration. Our Mumbai field engineers verify multi-parameter monitors, biphasic defibrillators, and ventilators against ISO/IEC 17025 standards with instant PDF reporting in Client Hub.'
  );
  const [postHashtags, setPostHashtags] = useState('#SunMedX #BiomedicalEngineering #NABL #HospitalSafety #ICUCalibration');
  const [postMediaUrl, setPostMediaUrl] = useState('');
  const [postLinkedItem, setPostLinkedItem] = useState('');
  const [postScheduleDate, setPostScheduleDate] = useState(
    new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString().slice(0, 16)
  );
  const [postStatus, setPostStatus] = useState<SocialPost['status']>('Scheduled');
  const [isSavingPost, setIsSavingPost] = useState(false);
  const [isGeneratingSocialAi, setIsGeneratingSocialAi] = useState(false);

  // Connected Social Accounts state (persisted to SiteSettings)
  const [showSocialAccounts, setShowSocialAccounts] = useState(false);
  const [isSavingSocialAccounts, setIsSavingSocialAccounts] = useState(false);
  const [socialAccountsForm, setSocialAccountsForm] = useState({
    linkedin: siteSettings?.socialAccounts?.linkedin || '',
    instagram: siteSettings?.socialAccounts?.instagram || '',
    x: siteSettings?.socialAccounts?.x || '',
    whatsappChannel: siteSettings?.socialAccounts?.whatsappChannel || '',
    youtube: siteSettings?.socialAccounts?.youtube || '',
  });

  useEffect(() => {
    if (siteSettings?.socialAccounts) {
      setSocialAccountsForm({
        linkedin: siteSettings.socialAccounts.linkedin || '',
        instagram: siteSettings.socialAccounts.instagram || '',
        x: siteSettings.socialAccounts.x || '',
        whatsappChannel: siteSettings.socialAccounts.whatsappChannel || '',
        youtube: siteSettings.socialAccounts.youtube || '',
      });
    }
  }, [siteSettings?.socialAccounts]);

  useEffect(() => {
    const db = getDb();
    const unsubCamp = db.collection('email_campaigns').onSnapshot((snap: any) => {
      const list: EmailCampaign[] = [];
      snap.forEach((doc: any) => list.push({ id: doc.id, ...doc.data() }));
      list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      setCampaigns(list);
    });

    const unsubSocial = db.collection('social_posts').onSnapshot((snap: any) => {
      const list: SocialPost[] = [];
      snap.forEach((doc: any) => list.push({ id: doc.id, ...doc.data() }));
      list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      setSocialPosts(list);
    });

    return () => {
      unsubCamp();
      unsubSocial();
    };
  }, []);

  const resolvedRecipients = useMemo(() => {
    const valid = (e?: string) => (e && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e.trim()) ? e.trim().toLowerCase() : '');
    let list: string[] = [];

    if (campSegment === 'all_users') {
      list = usersList.map((u) => valid(u.email)).filter(Boolean);
    } else if (campSegment === 'rfq_leads') {
      list = quotations.map((q) => valid(q.email || q.userEmail)).filter(Boolean);
    } else if (campSegment === 'amc_holders') {
      list = amcContracts.map((c) => valid(c.email || c.userEmail)).filter(Boolean);
    } else if (campSegment === 'service_contacts') {
      list = services.map((s) => valid(s.email || s.userEmail)).filter(Boolean);
    } else {
      list = customEmailsInput
        .split(/[\s,;]+/)
        .map((e) => valid(e))
        .filter(Boolean);
    }

    return Array.from(new Set(list));
  }, [campSegment, usersList, quotations, amcContracts, services, customEmailsInput]);

  const handleRecipientFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const content = await file.text();
      const extracted = content.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g) || [];
      const cleanedNew = extracted.map((addr) => addr.trim().toLowerCase());
      const existing = customEmailsInput
        .split(/[\s,;]+/)
        .map((addr) => addr.trim().toLowerCase())
        .filter((addr) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(addr));
      const merged = Array.from(new Set([...existing, ...cleanedNew]));
      setCampSegment('custom');
      setCustomEmailsInput(merged.join(', '));
      setNotice({
        type: merged.length > 0 ? 'success' : 'error',
        text:
          merged.length > 0
            ? `Attached ${merged.length} unique email address(es) from ${file.name}.`
            : `No valid email addresses found in ${file.name}.`,
      });
    } catch {
      setNotice({ type: 'error', text: 'Unable to read the uploaded recipient file.' });
    } finally {
      e.target.value = '';
    }
  };

  const sanitizeHttpsUrl = (raw: string): string => {
    const trimmed = raw.trim();
    if (!trimmed) return '';
    try {
      const parsed = new URL(trimmed.startsWith('http') ? trimmed : `https://${trimmed}`);
      if (parsed.protocol === 'https:' || parsed.protocol === 'http:') {
        return parsed.toString();
      }
      return '';
    } catch {
      return '';
    }
  };

  const handleSaveSocialAccounts = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!onUpdateSettings) return;
    setIsSavingSocialAccounts(true);
    setNotice(null);
    try {
      const sanitized = {
        linkedin: sanitizeHttpsUrl(socialAccountsForm.linkedin),
        instagram: sanitizeHttpsUrl(socialAccountsForm.instagram),
        x: sanitizeHttpsUrl(socialAccountsForm.x),
        whatsappChannel: sanitizeHttpsUrl(socialAccountsForm.whatsappChannel),
        youtube: sanitizeHttpsUrl(socialAccountsForm.youtube),
      };
      await onUpdateSettings({ socialAccounts: sanitized });
      await logAdminAction('SOCIAL_ACCOUNTS_UPDATE', 'Updated connected social media account URLs');
      setNotice({ type: 'success', text: 'Social media account links saved to Site Settings.' });
      setShowSocialAccounts(false);
    } catch (err: any) {
      setNotice({ type: 'error', text: err?.message || 'Failed saving social media accounts.' });
    } finally {
      setIsSavingSocialAccounts(false);
    }
  };

  const getConnectedAccountUrl = (platform: SocialPost['platform']): string => {
    const map: Record<SocialPost['platform'], string> = {
      LinkedIn: socialAccountsForm.linkedin,
      Instagram: socialAccountsForm.instagram,
      X: socialAccountsForm.x,
      'WhatsApp Channel': socialAccountsForm.whatsappChannel,
      YouTube: socialAccountsForm.youtube,
    };
    return sanitizeHttpsUrl(map[platform] || '');
  };

  const brandName = siteSettings?.siteName || 'SunMedX Biomedical';
  const supportPhone = siteSettings?.phone || '+91 98765 43210';
  const supportEmail = siteSettings?.email || 'info@sunmedx.in';

  const buildCampaignHtml = () => {
    const origin = typeof window !== 'undefined' ? window.location.origin : 'https://sunmedx.in';
    const targetUrl = `${origin}/${campCtaHash || '#services'}`;
    const safeParagraphs = campBody
      .split(/\n{2,}/)
      .map((p) => `<p style="margin:0 0 14px;line-height:1.6;color:#334155;font-size:14px;">${p.replace(/\n/g, '<br/>')}</p>`)
      .join('');

    return `<!doctype html><html><body style="margin:0;padding:24px;background:#f1f5f9;font-family:Arial,sans-serif;">
<div style="max-width:600px;margin:0 auto;background:#ffffff;border-radius:12px;overflow:hidden;border:1px solid #cbd5e1;">
  <div style="background:#211D70;color:#ffffff;padding:24px;">
    <div style="font-size:11px;letter-spacing:1.5px;color:#F8C72E;font-weight:bold;text-transform:uppercase;">${brandName} • ${campCategory}</div>
    <h1 style="margin:8px 0 0;font-size:20px;line-height:1.3;">${campSubject}</h1>
  </div>
  <div style="padding:24px;">
    ${safeParagraphs}
    ${
      campCtaLabel
        ? `<div style="margin-top:20px;"><a href="${targetUrl}" style="display:inline-block;background:#211D70;color:#F8C72E;text-decoration:none;padding:12px 22px;border-radius:8px;font-weight:bold;font-size:13px;">${campCtaLabel}</a></div>`
        : ''
    }
  </div>
  <div style="background:#f8fafc;padding:16px 24px;border-top:1px solid #e2e8f0;font-size:12px;color:#64748b;">
    ${brandName} • Mumbai, Maharashtra • ${supportPhone} • ${supportEmail}
  </div>
</div></body></html>`;
  };

  const handleDraftEmailWithAi = async () => {
    setIsGeneratingEmailAi(true);
    setNotice(null);
    try {
      const res = await fetch('/api/admin-agent', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          mode: 'ops_worker',
          prompt: `Draft a concise, high-converting B2B hospital email campaign for ${brandName} in category "${campCategory}" targeting audience segment "${campSegment}". Include a strong subject line and structured email body in quoteDraft.notes / checklist. Topic context: ${campName}`,
          workspaceContext: { brandName, category: campCategory, segment: campSegment },
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'AI campaign draft failed.');
      }
      const del = data.deliverables || {};
      if (del.title) setCampSubject(del.title);
      const generatedBody = [
        data.summary || '',
        Array.isArray(del.checklist) && del.checklist.length > 0
          ? '\nKey Highlights:\n' + del.checklist.map((item: string) => `• ${item}`).join('\n')
          : '',
        del.quoteDraft?.notes ? `\n${del.quoteDraft.notes}` : '',
        `\nRegards,\n${brandName} Desk (${supportPhone})`,
      ]
        .filter(Boolean)
        .join('\n');
      if (generatedBody.trim()) setCampBody(generatedBody.trim());
      setNotice({ type: 'success', text: 'AI campaign copy drafted and loaded into the composer.' });
    } catch (err: any) {
      setNotice({ type: 'error', text: err?.message || 'Unable to generate AI email draft.' });
    } finally {
      setIsGeneratingEmailAi(false);
    }
  };

  const handleSendCampaign = async (mode: 'send' | 'draft') => {
    setNotice(null);
    if (!campName.trim() || !campSubject.trim() || !campBody.trim()) {
      setNotice({ type: 'error', text: 'Campaign name, subject, and body are required.' });
      return;
    }

    if (mode === 'send' && resolvedRecipients.length === 0) {
      setNotice({ type: 'error', text: 'No valid recipient email addresses found in this segment.' });
      return;
    }

    setIsSendingEmail(true);
    try {
      const db = getDb();
      let deliveryStatus: EmailCampaign['status'] = 'Draft';
      let deliveryProvider = 'saved_draft';
      let mailtoUrl: string | undefined;

      if (mode === 'send') {
        const res = await fetch('/api/send-email', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            to: resolvedRecipients,
            subject: campSubject.trim(),
            text: campBody.trim(),
            html: buildCampaignHtml(),
            replyTo: supportEmail,
          }),
        });
        const data = await res.json();
        mailtoUrl = data.mailtoUrl;

        if (!res.ok && res.status !== 200) {
          throw new Error(data.error || 'Failed dispatching email campaign.');
        }

        if (data.sent) {
          deliveryStatus = 'Sent';
          deliveryProvider = data.provider || 'resend';
          setNotice({
            type: 'success',
            text: `Campaign dispatched to ${resolvedRecipients.length} recipient(s) via server relay.`,
          });
        } else {
          deliveryStatus = 'Prepared';
          deliveryProvider = 'mailto_fallback';
          setNotice({
            type: 'info',
            text:
              data.message ||
              'Server email relay (RESEND_API_KEY) is not configured yet. Campaign logged as Prepared—use "Open Mail Draft" below.',
            mailtoUrl: data.mailtoUrl,
          });
        }
      } else {
        setNotice({ type: 'success', text: `Campaign "${campName}" saved as draft.` });
      }

      await db.collection('email_campaigns').add({
        name: campName.trim(),
        category: campCategory,
        segment: campSegment,
        subject: campSubject.trim(),
        preheader: campPreheader.trim(),
        body: campBody.trim(),
        ctaLabel: campCtaLabel.trim(),
        ctaHash: campCtaHash,
        recipients: resolvedRecipients,
        recipientCount: resolvedRecipients.length,
        status: deliveryStatus,
        deliveryProvider,
        sentAt: mode === 'send' ? new Date().toISOString() : undefined,
        createdBy: adminEmail,
        createdAt: new Date().toISOString(),
      });

      await logAdminAction(
        'EMAIL_CAMPAIGN',
        `${deliveryStatus} email campaign "${campName}" (${resolvedRecipients.length} recipients)`
      );
    } catch (err: any) {
      setNotice({ type: 'error', text: err?.message || 'Campaign action failed.' });
    } finally {
      setIsSendingEmail(false);
    }
  };

  const handleGenerateSocialAi = async () => {
    setIsGeneratingSocialAi(true);
    setNotice(null);
    try {
      const res = await fetch('/api/admin-agent', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          mode: 'ops_worker',
          prompt: `Write a ${postPlatform} social media post for ${brandName} about "${postTitle || 'NABL Biomedical Calibration'}"${
            postLinkedItem ? ` featuring "${postLinkedItem}"` : ''
          }. Respect platform style and length (${
            SOCIAL_PLATFORMS.find((p) => p.id === postPlatform)?.maxLength || 1200
          } chars max). Include engaging post copy in summary and 5 relevant Indian healthcare/biomedical hashtags inside checklist.`,
          workspaceContext: { platform: postPlatform, brandName, linkedItem: postLinkedItem },
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'AI social post generation failed.');
      if (data.summary) setPostCaption(String(data.summary).trim());
      if (Array.isArray(data.deliverables?.checklist) && data.deliverables.checklist.length > 0) {
        const tags = data.deliverables.checklist
          .map((item: string) => (item.startsWith('#') ? item.split(' ')[0] : `#${item.replace(/[^a-zA-Z0-9]/g, '')}`))
          .slice(0, 6)
          .join(' ');
        if (tags) setPostHashtags(tags);
      }
      setNotice({ type: 'success', text: `Generated ${postPlatform} social post copy & hashtags.` });
    } catch (err: any) {
      setNotice({ type: 'error', text: err?.message || 'Unable to generate social copy.' });
    } finally {
      setIsGeneratingSocialAi(false);
    }
  };

  const handleSaveSocialPost = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!postTitle.trim() || !postCaption.trim()) {
      setNotice({ type: 'error', text: 'Post title and caption are required.' });
      return;
    }
    setIsSavingPost(true);
    setNotice(null);
    try {
      const db = getDb();
      await db.collection('social_posts').add({
        platform: postPlatform,
        title: postTitle.trim(),
        caption: postCaption.trim(),
        hashtags: postHashtags.trim(),
        mediaUrl: postMediaUrl || undefined,
        linkedItem: postLinkedItem || undefined,
        scheduledFor: postScheduleDate,
        status: postStatus,
        createdBy: adminEmail,
        createdAt: new Date().toISOString(),
      });
      await logAdminAction('SOCIAL_POST_CREATE', `Saved ${postStatus} ${postPlatform} post "${postTitle}"`);
      setNotice({ type: 'success', text: `${postPlatform} post saved to queue (${postStatus}).` });
    } catch (err: any) {
      setNotice({ type: 'error', text: err?.message || 'Failed saving social post.' });
    } finally {
      setIsSavingPost(false);
    }
  };

  const updateSocialStatus = async (id: string, nextStatus: SocialPost['status']) => {
    try {
      const db = getDb();
      await db.collection('social_posts').doc(id).update({ status: nextStatus });
      await logAdminAction('SOCIAL_POST_STATUS', `Updated social post ${id} status to ${nextStatus}`);
    } catch (err: any) {
      setNotice({ type: 'error', text: err?.message || 'Failed updating post status.' });
    }
  };

  const deleteSocialPost = async (id: string, title: string) => {
    try {
      const db = getDb();
      await db.collection('social_posts').doc(id).delete();
      await logAdminAction('SOCIAL_POST_DELETE', `Removed social post "${title}"`);
    } catch (err: any) {
      setNotice({ type: 'error', text: err?.message || 'Failed deleting post.' });
    }
  };

  const copyTextToClipboard = async (text: string, label: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setNotice({ type: 'success', text: `${label} copied to clipboard.` });
    } catch {
      setNotice({ type: 'error', text: 'Clipboard copy unavailable in this browser.' });
    }
  };

  const buildShareUrl = (post: SocialPost) => {
    const combined = `${post.caption}\n\n${post.hashtags}`.trim();
    const pageUrl = typeof window !== 'undefined' ? window.location.origin : 'https://sunmedx.in';
    if (post.platform === 'X') {
      return `https://twitter.com/intent/tweet?text=${encodeURIComponent(combined.slice(0, 260))}&url=${encodeURIComponent(pageUrl)}`;
    }
    if (post.platform === 'LinkedIn') {
      return `https://www.linkedin.com/feed/?shareActive=true&text=${encodeURIComponent(combined)}`;
    }
    if (post.platform === 'WhatsApp Channel') {
      return `https://wa.me/?text=${encodeURIComponent(combined)}`;
    }
    return '';
  };

  const activePlatformMeta = SOCIAL_PLATFORMS.find((p) => p.id === postPlatform)!;

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* Header + Sub-Tab Navigation */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-white/10 pb-5">
        <div>
          <h2 className="font-syne font-black text-xl text-white uppercase tracking-wider">
            Email Marketing &amp; Social Media Manager
          </h2>
          <p className="text-xs text-amber font-mono">
            Targeted hospital email campaigns, AI-assisted copywriting &amp; multi-platform social publishing queue
          </p>
        </div>

        <div className="flex items-center gap-1.5 bg-navy p-1 rounded-xl border border-white/10 self-start">
          <button
            type="button"
            onClick={() => setSubTab('email')}
            className={`px-4 py-2 rounded-lg text-xs font-syne font-bold uppercase flex items-center gap-2 transition-colors whitespace-nowrap ${
              subTab === 'email'
                ? 'bg-gradient-to-r from-crimson to-amber text-navy font-black'
                : 'text-gray-300 hover:text-white hover:bg-white/5'
            }`}
          >
            <Mail className="w-3.5 h-3.5" />
            <span>Email Marketing ({campaigns.length})</span>
          </button>

          <button
            type="button"
            onClick={() => setSubTab('social')}
            className={`px-4 py-2 rounded-lg text-xs font-syne font-bold uppercase flex items-center gap-2 transition-colors whitespace-nowrap ${
              subTab === 'social'
                ? 'bg-gradient-to-r from-crimson to-amber text-navy font-black'
                : 'text-gray-300 hover:text-white hover:bg-white/5'
            }`}
          >
            <Megaphone className="w-3.5 h-3.5" />
            <span>Social Media Manager ({socialPosts.length})</span>
          </button>
        </div>
      </div>

      {/* Inline Feedback Banner */}
      {notice && (
        <div
          className={`p-3.5 rounded-xl border text-xs flex flex-wrap items-center justify-between gap-3 ${
            notice.type === 'success'
              ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
              : notice.type === 'error'
              ? 'bg-red-500/10 border-red-500/30 text-red-300'
              : 'bg-amber/10 border-amber/30 text-amber'
          }`}
        >
          <span>{notice.text}</span>
          {notice.mailtoUrl && (
            <a
              href={notice.mailtoUrl}
              className="px-3 py-1.5 rounded-lg bg-amber text-navy font-bold text-[11px] inline-flex items-center gap-1.5"
            >
              <Mail className="w-3.5 h-3.5" />
              <span>Open Mail Draft</span>
            </a>
          )}
        </div>
      )}

      {/* EMAIL MARKETING WORKSPACE */}
      {subTab === 'email' && (
        <div className="grid grid-cols-1 xl:grid-cols-12 gap-6">
          {/* Left Composer */}
          <div className="xl:col-span-7 bg-navy border border-white/10 rounded-2xl p-5 sm:p-6 space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/5 pb-3">
              <h3 className="font-syne font-bold text-sm text-amber uppercase tracking-wider">
                Campaign Composer
              </h3>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setShowEmailPreview((p) => !p)}
                  className="px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 text-xs text-gray-200 flex items-center gap-1.5"
                >
                  <Eye className="w-3.5 h-3.5 text-amber" />
                  <span>{showEmailPreview ? 'Edit Copy' : 'HTML Preview'}</span>
                </button>
                <button
                  type="button"
                  disabled={isGeneratingEmailAi}
                  onClick={handleDraftEmailWithAi}
                  className="px-3 py-1.5 rounded-lg bg-amber/15 hover:bg-amber hover:text-navy border border-amber/30 text-amber text-xs font-bold flex items-center gap-1.5 disabled:opacity-50"
                >
                  {isGeneratingEmailAi ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5" />}
                  <span>AI Draft Copy</span>
                </button>
              </div>
            </div>

            {showEmailPreview ? (
              <div className="space-y-3">
                <div className="bg-white rounded-xl overflow-hidden border border-white/10 p-4 text-slate-800 space-y-3">
                  <div className="bg-[#211D70] text-white p-5 rounded-lg">
                    <p className="text-[11px] font-mono text-[#F8C72E] uppercase tracking-wider">
                      {brandName} · {campCategory}
                    </p>
                    <h4 className="text-lg font-bold mt-1">{campSubject}</h4>
                    {campPreheader && <p className="text-xs text-white/80 mt-1">{campPreheader}</p>}
                  </div>
                  <div className="p-2 whitespace-pre-wrap text-sm leading-relaxed text-slate-700">
                    {campBody}
                  </div>
                  {campCtaLabel && (
                    <div className="pt-2">
                      <span className="inline-block px-5 py-2.5 rounded-lg bg-[#211D70] text-[#F8C72E] text-xs font-bold">
                        {campCtaLabel} ({campCtaHash})
                      </span>
                    </div>
                  )}
                </div>
                <button
                  type="button"
                  onClick={() => copyTextToClipboard(buildCampaignHtml(), 'Campaign HTML')}
                  className="px-3.5 py-2 rounded-lg bg-white/5 border border-white/10 text-xs text-gray-200 inline-flex items-center gap-1.5"
                >
                  <Copy className="w-3.5 h-3.5 text-amber" />
                  <span>Copy HTML Template</span>
                </button>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[10px] font-mono uppercase text-gray-400 font-bold mb-1">Campaign Title *</label>
                    <input
                      type="text"
                      value={campName}
                      onChange={(e) => setCampName(e.target.value)}
                      className="w-full bg-[#10101e] border border-white/10 rounded-xl px-3.5 py-2.5 text-xs text-white"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-mono uppercase text-gray-400 font-bold mb-1">Campaign Category</label>
                    <select
                      value={campCategory}
                      onChange={(e) => setCampCategory(e.target.value)}
                      className="w-full bg-[#10101e] border border-white/10 rounded-xl px-3.5 py-2.5 text-xs text-white"
                    >
                      <option value="AMC Renewal Offer">AMC Renewal Offer</option>
                      <option value="NABL Compliance Alert">NABL Compliance Alert</option>
                      <option value="New Equipment Launch">New Equipment Launch</option>
                      <option value="Academy Workshop Invite">Academy Workshop Invite</option>
                      <option value="Preventive Calibration Reminder">Preventive Calibration Reminder</option>
                    </select>
                  </div>
                </div>

                {/* Audience Segment */}
                <div className="bg-[#10101e] border border-white/10 rounded-xl p-3.5 space-y-2.5">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <label className="text-[10px] font-mono uppercase text-gray-400 font-bold flex items-center gap-1.5">
                      <Users className="w-3.5 h-3.5 text-amber" />
                      <span>Target Audience Segment</span>
                    </label>
                    <span className="text-xs font-mono font-bold text-emerald-400 tabular-nums">
                      {resolvedRecipients.length} verified email(s)
                    </span>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-5 gap-1.5">
                    {[
                      { id: 'all_users', label: 'All Clients' },
                      { id: 'amc_holders', label: 'AMC Holders' },
                      { id: 'rfq_leads', label: 'RFQ Leads' },
                      { id: 'service_contacts', label: 'Service Contacts' },
                      { id: 'custom', label: 'Custom List' },
                    ].map((seg) => (
                      <button
                        key={seg.id}
                        type="button"
                        onClick={() => setCampSegment(seg.id as EmailCampaign['segment'])}
                        className={`px-2.5 py-2 rounded-lg text-[11px] font-semibold border transition-colors ${
                          campSegment === seg.id
                            ? 'bg-amber text-navy border-amber font-bold'
                            : 'bg-navy border-white/10 text-gray-300 hover:bg-white/5'
                        }`}
                      >
                        {seg.label}
                      </button>
                    ))}
                  </div>

                  {campSegment === 'custom' && (
                    <div className="space-y-2.5 pt-1">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <label className="cursor-pointer px-3 py-1.5 rounded-lg bg-amber/15 hover:bg-amber hover:text-navy border border-amber/30 text-amber text-[11px] font-bold inline-flex items-center gap-1.5 transition-colors">
                          <Upload className="w-3.5 h-3.5" />
                          <span>Attach CSV / TXT List</span>
                          <input
                            type="file"
                            accept=".csv,.txt,text/csv,text/plain"
                            onChange={handleRecipientFileUpload}
                            className="hidden"
                          />
                        </label>
                        {customEmailsInput && (
                          <button
                            type="button"
                            onClick={() => setCustomEmailsInput('')}
                            className="text-[11px] font-mono text-gray-400 hover:text-red-300"
                          >
                            Clear List
                          </button>
                        )}
                      </div>
                      <textarea
                        rows={3}
                        placeholder="Paste comma, semicolon, or line-separated emails OR attach a .csv / .txt file above..."
                        value={customEmailsInput}
                        onChange={(e) => setCustomEmailsInput(e.target.value)}
                        className="w-full bg-navy border border-white/15 rounded-lg px-3 py-2 text-xs font-mono text-white"
                      />
                    </div>
                  )}

                  {resolvedRecipients.length > 0 && (
                    <p className="text-[11px] font-mono text-gray-400 truncate">
                      Recipients: {resolvedRecipients.join(', ')}
                    </p>
                  )}
                </div>

                <div>
                  <label className="block text-[10px] font-mono uppercase text-gray-400 font-bold mb-1">Subject Line *</label>
                  <input
                    type="text"
                    value={campSubject}
                    onChange={(e) => setCampSubject(e.target.value)}
                    className="w-full bg-[#10101e] border border-white/10 rounded-xl px-3.5 py-2.5 text-xs text-white"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-mono uppercase text-gray-400 font-bold mb-1">Preview Preheader</label>
                  <input
                    type="text"
                    value={campPreheader}
                    onChange={(e) => setCampPreheader(e.target.value)}
                    className="w-full bg-[#10101e] border border-white/10 rounded-xl px-3.5 py-2.5 text-xs text-white"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-mono uppercase text-gray-400 font-bold mb-1">Email Body Content *</label>
                  <textarea
                    rows={6}
                    value={campBody}
                    onChange={(e) => setCampBody(e.target.value)}
                    className="w-full bg-[#10101e] border border-white/10 rounded-xl px-3.5 py-2.5 text-xs text-white leading-relaxed"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[10px] font-mono uppercase text-gray-400 font-bold mb-1">CTA Button Text</label>
                    <input
                      type="text"
                      value={campCtaLabel}
                      onChange={(e) => setCampCtaLabel(e.target.value)}
                      className="w-full bg-[#10101e] border border-white/10 rounded-xl px-3.5 py-2.5 text-xs text-white"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-mono uppercase text-gray-400 font-bold mb-1">CTA Portal Destination</label>
                    <select
                      value={campCtaHash}
                      onChange={(e) => setCampCtaHash(e.target.value)}
                      className="w-full bg-[#10101e] border border-white/10 rounded-xl px-3.5 py-2.5 text-xs text-white"
                    >
                      <option value="#services">Calibration &amp; AMC Services (#services)</option>
                      <option value="#catalogue">Equipment E-Catalogue (#catalogue)</option>
                      <option value="#academy">SunMedX Academy (#academy)</option>
                      <option value="#tools">Smart Calculators &amp; AI (#tools)</option>
                    </select>
                  </div>
                </div>
              </div>
            )}

            <div className="flex flex-wrap gap-2.5 pt-2 border-t border-white/5">
              <button
                type="button"
                disabled={isSendingEmail}
                onClick={() => handleSendCampaign('draft')}
                className="px-4 py-2.5 rounded-xl border border-white/15 text-xs font-bold text-gray-200 hover:bg-white/5"
              >
                Save Draft
              </button>
              <button
                type="button"
                disabled={isSendingEmail}
                onClick={() => copyTextToClipboard(`${campSubject}\n\n${campBody}`, 'Email text')}
                className="px-4 py-2.5 rounded-xl border border-white/15 text-xs font-bold text-gray-200 hover:bg-white/5 inline-flex items-center gap-1.5"
              >
                <Copy className="w-3.5 h-3.5" />
                <span>Copy Text</span>
              </button>
              <button
                type="button"
                disabled={isSendingEmail}
                onClick={() => handleSendCampaign('send')}
                className="flex-1 min-w-[180px] py-2.5 px-5 rounded-xl bg-gradient-to-r from-crimson to-amber text-navy font-syne font-black text-xs uppercase tracking-wider flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {isSendingEmail ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                <span>Dispatch Campaign ({resolvedRecipients.length})</span>
              </button>
            </div>
          </div>

          {/* Right Campaign History */}
          <div className="xl:col-span-5 bg-navy border border-white/10 rounded-2xl p-5 sm:p-6 space-y-4">
            <div>
              <h3 className="font-syne font-bold text-sm text-white uppercase tracking-wider">
                Campaign Dispatch Ledger
              </h3>
              <p className="text-[11px] font-mono text-gray-400">
                Server relay sends via RESEND_API_KEY when configured, with automatic mailto fallback.
              </p>
            </div>

            {campaigns.length === 0 ? (
              <div className="py-10 text-center text-xs text-gray-400 bg-[#10101e] rounded-xl border border-white/5">
                No email campaigns logged yet. Create and dispatch your first campaign from the composer.
              </div>
            ) : (
              <div className="space-y-3 max-h-[560px] overflow-y-auto pr-1">
                {campaigns.map((c) => (
                  <div key={c.id} className="bg-[#10101e] border border-white/10 rounded-xl p-4 space-y-2">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <h4 className="font-syne font-bold text-xs text-white truncate">{c.name}</h4>
                        <p className="text-[11px] text-amber font-mono truncate">{c.subject}</p>
                      </div>
                      <span
                        className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded uppercase shrink-0 ${
                          c.status === 'Sent'
                            ? 'bg-emerald-500/15 text-emerald-300 border border-emerald-500/30'
                            : c.status === 'Prepared'
                            ? 'bg-amber/15 text-amber border border-amber/30'
                            : 'bg-white/10 text-gray-300'
                        }`}
                      >
                        {c.status}
                      </span>
                    </div>
                    <div className="flex flex-wrap items-center justify-between gap-2 text-[11px] font-mono text-gray-400 pt-1 border-t border-white/5">
                      <span>{c.recipientCount} recipient(s) · {c.category}</span>
                      <span>{new Date(c.createdAt).toLocaleDateString()}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* SOCIAL MEDIA MANAGER WORKSPACE */}
      {subTab === 'social' && (
        <div className="grid grid-cols-1 xl:grid-cols-12 gap-6">
          {/* Post Builder */}
          <form onSubmit={handleSaveSocialPost} className="xl:col-span-6 bg-navy border border-white/10 rounded-2xl p-5 sm:p-6 space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-white/5 pb-3">
              <h3 className="font-syne font-bold text-sm text-amber uppercase tracking-wider">
                Social Post Studio
              </h3>
              <button
                type="button"
                disabled={isGeneratingSocialAi}
                onClick={handleGenerateSocialAi}
                className="px-3 py-1.5 rounded-lg bg-amber/15 hover:bg-amber hover:text-navy border border-amber/30 text-amber text-xs font-bold flex items-center gap-1.5 disabled:opacity-50"
              >
                {isGeneratingSocialAi ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5" />}
                <span>AI Write Caption</span>
              </button>
            </div>

            {/* Platform Selector */}
            <div className="space-y-1.5">
              <label className="block text-[10px] font-mono uppercase text-gray-400 font-bold">Channel</label>
              <div className="flex flex-wrap gap-1.5">
                {SOCIAL_PLATFORMS.map((pl) => (
                  <button
                    key={pl.id}
                    type="button"
                    onClick={() => setPostPlatform(pl.id)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-colors ${
                      postPlatform === pl.id
                        ? 'bg-amber text-navy border-amber font-bold'
                        : 'bg-[#10101e] border-white/10 text-gray-300 hover:bg-white/5'
                    }`}
                  >
                    {pl.label}
                  </button>
                ))}
              </div>
              <p className="text-[11px] font-mono text-gray-400">
                Format guide: {activePlatformMeta.aspectHint} · Max {activePlatformMeta.maxLength} chars
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-[10px] font-mono uppercase text-gray-400 font-bold mb-1">Campaign Headline *</label>
                <input
                  type="text"
                  required
                  value={postTitle}
                  onChange={(e) => setPostTitle(e.target.value)}
                  className="w-full bg-[#10101e] border border-white/10 rounded-xl px-3.5 py-2.5 text-xs text-white"
                />
              </div>
              <div>
                <label className="block text-[10px] font-mono uppercase text-gray-400 font-bold mb-1">Attach Catalogue / Course Context</label>
                <select
                  value={postLinkedItem}
                  onChange={(e) => {
                    const val = e.target.value;
                    setPostLinkedItem(val);
                    const matchedProd = catalogue.find((p) => p.name === val);
                    if (matchedProd?.image) setPostMediaUrl(matchedProd.image);
                  }}
                  className="w-full bg-[#10101e] border border-white/10 rounded-xl px-3.5 py-2.5 text-xs text-white"
                >
                  <option value="">General Brand Update</option>
                  {catalogue.map((p) => (
                    <option key={p.id || p.name} value={p.name}>
                      Product: {p.name}
                    </option>
                  ))}
                  {courses.map((c) => (
                    <option key={c.id || c.title} value={c.title}>
                      Course: {c.title}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <div className="flex justify-between items-center mb-1">
                <label className="text-[10px] font-mono uppercase text-gray-400 font-bold">Post Caption *</label>
                <span className="text-[10px] font-mono text-gray-400 tabular-nums">
                  {postCaption.length} / {activePlatformMeta.maxLength}
                </span>
              </div>
              <textarea
                rows={4}
                required
                value={postCaption}
                onChange={(e) => setPostCaption(e.target.value)}
                className="w-full bg-[#10101e] border border-white/10 rounded-xl px-3.5 py-2.5 text-xs text-white leading-relaxed"
              />
            </div>

            <div>
              <label className="block text-[10px] font-mono uppercase text-gray-400 font-bold mb-1">Hashtags</label>
              <input
                type="text"
                value={postHashtags}
                onChange={(e) => setPostHashtags(e.target.value)}
                className="w-full bg-[#10101e] border border-white/10 rounded-xl px-3.5 py-2.5 text-xs text-amber font-mono"
              />
            </div>

            <ImageAttachmentField
              value={postMediaUrl}
              onChange={setPostMediaUrl}
              label="Creative / Post Graphic"
            />

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-[10px] font-mono uppercase text-gray-400 font-bold mb-1">Schedule Date &amp; Time</label>
                <input
                  type="datetime-local"
                  value={postScheduleDate}
                  onChange={(e) => setPostScheduleDate(e.target.value)}
                  className="w-full bg-[#10101e] border border-white/10 rounded-xl px-3.5 py-2.5 text-xs text-white font-mono"
                />
              </div>
              <div>
                <label className="block text-[10px] font-mono uppercase text-gray-400 font-bold mb-1">Queue Status</label>
                <select
                  value={postStatus}
                  onChange={(e) => setPostStatus(e.target.value as SocialPost['status'])}
                  className="w-full bg-[#10101e] border border-white/10 rounded-xl px-3.5 py-2.5 text-xs text-white"
                >
                  <option value="Scheduled">Scheduled</option>
                  <option value="Draft">Draft</option>
                  <option value="Published">Published</option>
                </select>
              </div>
            </div>

            <button
              type="submit"
              disabled={isSavingPost}
              className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-crimson to-amber text-navy font-syne font-black text-xs uppercase tracking-wider flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {isSavingPost ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
              <span>Save to Social Calendar</span>
            </button>
          </form>

          {/* Scheduled & Published Queue + Connected Accounts */}
          <div className="xl:col-span-6 space-y-5">
            {/* Connected Social Accounts Panel */}
            <div className="bg-navy border border-white/10 rounded-2xl p-5 space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <h3 className="font-syne font-bold text-sm text-white uppercase tracking-wider flex items-center gap-2">
                    <Link2 className="w-4 h-4 text-amber" />
                    <span>Connected Social Accounts</span>
                  </h3>
                  <p className="text-[11px] font-mono text-gray-400">
                    Link your official hospital/brand social profiles for direct portal publishing.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setShowSocialAccounts((prev) => !prev)}
                  className="px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 text-xs font-bold text-amber"
                >
                  {showSocialAccounts ? 'Hide Setup' : 'Configure Accounts'}
                </button>
              </div>

              <div className="flex flex-wrap gap-1.5">
                {SOCIAL_PLATFORMS.map((pl) => {
                  const connected = Boolean(getConnectedAccountUrl(pl.id));
                  return (
                    <span
                      key={pl.id}
                      className={`px-2.5 py-1 rounded-lg text-[11px] font-mono border ${
                        connected
                          ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
                          : 'bg-[#10101e] border-white/10 text-gray-400'
                      }`}
                    >
                      {pl.id}: {connected ? 'Linked' : 'Not linked'}
                    </span>
                  );
                })}
              </div>

              {showSocialAccounts && (
                <form onSubmit={handleSaveSocialAccounts} className="space-y-3 pt-3 border-t border-white/10">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[10px] font-mono uppercase text-gray-400 font-bold mb-1">LinkedIn Company Page URL</label>
                      <input
                        type="text"
                        placeholder="https://www.linkedin.com/company/sunmedx"
                        value={socialAccountsForm.linkedin}
                        onChange={(e) => setSocialAccountsForm({ ...socialAccountsForm, linkedin: e.target.value })}
                        className="w-full bg-[#10101e] border border-white/10 rounded-lg px-3 py-2 text-xs text-white font-mono"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-mono uppercase text-gray-400 font-bold mb-1">Instagram Profile URL</label>
                      <input
                        type="text"
                        placeholder="https://www.instagram.com/sunmedx.biomed"
                        value={socialAccountsForm.instagram}
                        onChange={(e) => setSocialAccountsForm({ ...socialAccountsForm, instagram: e.target.value })}
                        className="w-full bg-[#10101e] border border-white/10 rounded-lg px-3 py-2 text-xs text-white font-mono"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-mono uppercase text-gray-400 font-bold mb-1">X (Twitter) Profile URL</label>
                      <input
                        type="text"
                        placeholder="https://x.com/sunmedx"
                        value={socialAccountsForm.x}
                        onChange={(e) => setSocialAccountsForm({ ...socialAccountsForm, x: e.target.value })}
                        className="w-full bg-[#10101e] border border-white/10 rounded-lg px-3 py-2 text-xs text-white font-mono"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-mono uppercase text-gray-400 font-bold mb-1">WhatsApp Channel Invite URL</label>
                      <input
                        type="text"
                        placeholder="https://whatsapp.com/channel/..."
                        value={socialAccountsForm.whatsappChannel}
                        onChange={(e) => setSocialAccountsForm({ ...socialAccountsForm, whatsappChannel: e.target.value })}
                        className="w-full bg-[#10101e] border border-white/10 rounded-lg px-3 py-2 text-xs text-white font-mono"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-[10px] font-mono uppercase text-gray-400 font-bold mb-1">YouTube Channel URL</label>
                    <input
                      type="text"
                      placeholder="https://www.youtube.com/@sunmedx"
                      value={socialAccountsForm.youtube}
                      onChange={(e) => setSocialAccountsForm({ ...socialAccountsForm, youtube: e.target.value })}
                      className="w-full bg-[#10101e] border border-white/10 rounded-lg px-3 py-2 text-xs text-white font-mono"
                    />
                  </div>
                  <button
                    type="submit"
                    disabled={isSavingSocialAccounts}
                    className="px-4 py-2 rounded-xl bg-amber text-navy font-syne font-black text-xs uppercase inline-flex items-center gap-1.5 disabled:opacity-50"
                  >
                    <Save className="w-3.5 h-3.5" />
                    <span>{isSavingSocialAccounts ? 'Saving...' : 'Save Connected Accounts'}</span>
                  </button>
                </form>
              )}
            </div>

            <div className="bg-navy border border-white/10 rounded-2xl p-5 sm:p-6 space-y-4">
              <div>
                <h3 className="font-syne font-bold text-sm text-white uppercase tracking-wider">
                  Social Content Queue &amp; Quick Publishers
                </h3>
                <p className="text-[11px] font-mono text-gray-400">
                  Copy captions, launch LinkedIn / X / WhatsApp share windows, open connected pages, or mark posts published.
                </p>
              </div>

            {socialPosts.length === 0 ? (
              <div className="py-12 text-center text-xs text-gray-400 bg-[#10101e] rounded-xl border border-white/5">
                <Share2 className="w-10 h-10 text-amber/40 mx-auto mb-2" />
                <p>No social media posts queued yet. Build a LinkedIn, Instagram, or WhatsApp Channel post on the left.</p>
              </div>
            ) : (
              <div className="space-y-3 max-h-[680px] overflow-y-auto pr-1">
                {socialPosts.map((post) => {
                  const shareUrl = buildShareUrl(post);
                  return (
                    <div key={post.id} className="bg-[#10101e] border border-white/10 rounded-xl p-4 space-y-3">
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-center gap-3 min-w-0">
                          {post.mediaUrl && (
                            <img
                              src={post.mediaUrl}
                              alt={post.title}
                              className="w-12 h-12 rounded-lg object-cover border border-white/10 shrink-0"
                            />
                          )}
                          <div className="min-w-0">
                            <div className="flex items-center gap-2 text-[11px] font-mono">
                              <span className="text-amber font-bold">{post.platform}</span>
                              {post.scheduledFor && (
                                <span className="text-gray-400 flex items-center gap-1">
                                  <Calendar className="w-3 h-3" />
                                  {post.scheduledFor.replace('T', ' ')}
                                </span>
                              )}
                            </div>
                            <h4 className="font-syne font-bold text-sm text-white truncate">{post.title}</h4>
                          </div>
                        </div>

                        <span
                          className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded uppercase shrink-0 ${
                            post.status === 'Published'
                              ? 'bg-emerald-500/15 text-emerald-300 border border-emerald-500/30'
                              : post.status === 'Scheduled'
                              ? 'bg-sky-500/15 text-sky-300 border border-sky-500/30'
                              : 'bg-white/10 text-gray-300'
                          }`}
                        >
                          {post.status}
                        </span>
                      </div>

                      <p className="text-xs text-gray-300 leading-relaxed whitespace-pre-wrap">{post.caption}</p>
                      {post.hashtags && <p className="text-[11px] font-mono text-amber">{post.hashtags}</p>}

                      <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-white/5">
                        <button
                          type="button"
                          onClick={() => copyTextToClipboard(`${post.caption}\n\n${post.hashtags}`, 'Post caption')}
                          className="px-2.5 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-[11px] text-gray-200 inline-flex items-center gap-1"
                        >
                          <Copy className="w-3 h-3 text-amber" />
                          <span>Copy</span>
                        </button>

                        {shareUrl && (
                          <a
                            href={shareUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="px-2.5 py-1.5 rounded-lg bg-amber/15 hover:bg-amber hover:text-navy text-amber text-[11px] font-bold inline-flex items-center gap-1 transition-colors"
                          >
                            <ExternalLink className="w-3 h-3" />
                            <span>Share to {post.platform}</span>
                          </a>
                        )}

                        {getConnectedAccountUrl(post.platform) && (
                          <a
                            href={getConnectedAccountUrl(post.platform)}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="px-2.5 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-sky-300 text-[11px] font-semibold inline-flex items-center gap-1"
                          >
                            <Link2 className="w-3 h-3" />
                            <span>Open Account</span>
                          </a>
                        )}

                        {post.status !== 'Published' && post.id && (
                          <button
                            type="button"
                            onClick={() => updateSocialStatus(post.id!, 'Published')}
                            className="px-2.5 py-1.5 rounded-lg bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-300 text-[11px] font-semibold inline-flex items-center gap-1"
                          >
                            <CheckCircle2 className="w-3 h-3" />
                            <span>Mark Published</span>
                          </button>
                        )}

                        {post.id && (
                          <button
                            type="button"
                            onClick={() => deleteSocialPost(post.id!, post.title)}
                            className="ml-auto p-1.5 rounded-lg bg-white/5 hover:bg-red-500/20 text-gray-400 hover:text-red-300"
                            aria-label={`Delete ${post.title}`}
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
