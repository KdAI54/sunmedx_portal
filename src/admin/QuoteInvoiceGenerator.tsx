import React, { useEffect, useMemo, useState } from 'react';
import { jsPDF } from 'jspdf';
import {
  FileText, Plus, Trash2, Download, CheckCircle2, ArrowRightCircle,
  RefreshCw, Copy, Search, Sparkles, Building2, Receipt, Save, ChevronDown, ChevronUp
} from 'lucide-react';
import { DEFAULT_PAYMENT_GATEWAY } from '../config/seed';
import { getDb } from '../services/dataClient';
import {
  InvoiceDocument,
  InvoiceLineItem,
  Order,
  Product,
  QuotationRequest,
  Service,
  SiteSettings,
  UserProfile,
} from '../types';

interface QuoteInvoiceGeneratorProps {
  adminEmail: string;
  siteSettings: SiteSettings | null;
  onUpdateSettings: (newSettings: Partial<SiteSettings>) => Promise<void>;
  usersList: UserProfile[];
  catalogue: Product[];
  quotations: QuotationRequest[];
  orders: Order[];
  logAdminAction: (action: string, details: string) => Promise<void>;
}

const makeLineItem = (partial?: Partial<InvoiceLineItem>): InvoiceLineItem => ({
  id: 'li_' + Math.random().toString(36).substring(2, 9),
  description: '',
  hsnSac: '9018',
  quantity: 1,
  unitPrice: 0,
  discountPercent: 0,
  ...partial,
});

const generateDocNumber = (type: 'Quotation' | 'Tax Invoice') => {
  const now = new Date();
  const y = now.getFullYear().toString().slice(-2);
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  const suffix = String(Math.floor(100 + Math.random() * 900));
  return `${type === 'Quotation' ? 'SMX-QT' : 'SMX-INV'}-${y}${m}${d}-${suffix}`;
};

const addDaysIso = (days: number) => {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d.toISOString().split('T')[0];
};

function numberToIndianWords(amount: number): string {
  const whole = Math.round(amount);
  if (whole <= 0) return 'Zero Rupees Only';

  const ones = [
    '', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine',
    'Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen',
    'Seventeen', 'Eighteen', 'Nineteen',
  ];
  const tens = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];

  const twoDigits = (n: number): string => {
    if (n === 0) return '';
    if (n < 20) return ones[n];
    return `${tens[Math.floor(n / 10)]}${n % 10 ? ' ' + ones[n % 10] : ''}`.trim();
  };

  const threeDigits = (n: number): string => {
    const h = Math.floor(n / 100);
    const rem = n % 100;
    return `${h ? ones[h] + ' Hundred' : ''}${h && rem ? ' ' : ''}${rem ? twoDigits(rem) : ''}`.trim();
  };

  let remaining = whole;
  const crore = Math.floor(remaining / 10000000);
  remaining %= 10000000;
  const lakh = Math.floor(remaining / 100000);
  remaining %= 100000;
  const thousand = Math.floor(remaining / 1000);
  remaining %= 1000;

  const parts: string[] = [];
  if (crore) parts.push(`${twoDigits(crore)} Crore`);
  if (lakh) parts.push(`${twoDigits(lakh)} Lakh`);
  if (thousand) parts.push(`${twoDigits(thousand)} Thousand`);
  if (remaining) parts.push(threeDigits(remaining));

  return `Rupees ${parts.join(' ')} Only`;
}

export default function QuoteInvoiceGenerator({
  adminEmail,
  siteSettings,
  onUpdateSettings,
  usersList,
  catalogue,
  quotations,
  orders,
  logAdminAction,
}: QuoteInvoiceGeneratorProps) {
  const [documents, setDocuments] = useState<InvoiceDocument[]>([]);
  const [catalogServices, setCatalogServices] = useState<Service[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [filterType, setFilterType] = useState<'All' | 'Quotation' | 'Tax Invoice'>('All');
  const [searchTerm, setSearchTerm] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [isSavingDefaults, setIsSavingDefaults] = useState(false);
  const [isIssuerPanelOpen, setIsIssuerPanelOpen] = useState(true);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const defaultGst = siteSettings?.gstPercent || 18;
  const gateway = siteSettings?.paymentGateway;

  // Editable SunMedX Issuer Profile (GSTIN, Address, Contacts, Bank)
  const [issuerName, setIssuerName] = useState(
    gateway?.merchantName || siteSettings?.siteName || 'SunMedX Biomedical India Pvt Ltd'
  );
  const [issuerGstin, setIssuerGstin] = useState(
    gateway?.companyGstin || DEFAULT_PAYMENT_GATEWAY.companyGstin
  );
  const [issuerAddress, setIssuerAddress] = useState(
    siteSettings?.address || 'Mumbai, Maharashtra, India'
  );
  const [issuerPhone, setIssuerPhone] = useState(
    siteSettings?.phone || '+91 98765 43210'
  );
  const [issuerEmail, setIssuerEmail] = useState(
    siteSettings?.email || 'info@sunmedx.in'
  );
  const [issuerUpiVpa, setIssuerUpiVpa] = useState(
    gateway?.upiVpa || DEFAULT_PAYMENT_GATEWAY.upiVpa
  );
  const [issuerBankDetails, setIssuerBankDetails] = useState(
    gateway?.bankDetails || DEFAULT_PAYMENT_GATEWAY.bankDetails
  );

  // Sync defaults when siteSettings loads and no existing saved document is currently loaded
  useEffect(() => {
    if (!editingId && siteSettings) {
      setIssuerName(siteSettings.paymentGateway?.merchantName || siteSettings.siteName || 'SunMedX Biomedical India Pvt Ltd');
      setIssuerGstin(siteSettings.paymentGateway?.companyGstin || DEFAULT_PAYMENT_GATEWAY.companyGstin);
      setIssuerAddress(siteSettings.address || 'Mumbai, Maharashtra, India');
      setIssuerPhone(siteSettings.phone || '+91 98765 43210');
      setIssuerEmail(siteSettings.email || 'info@sunmedx.in');
      setIssuerUpiVpa(siteSettings.paymentGateway?.upiVpa || DEFAULT_PAYMENT_GATEWAY.upiVpa);
      setIssuerBankDetails(siteSettings.paymentGateway?.bankDetails || DEFAULT_PAYMENT_GATEWAY.bankDetails);
    }
  }, [siteSettings, editingId]);

  // Document Editor State
  const [docType, setDocType] = useState<'Quotation' | 'Tax Invoice'>('Tax Invoice');
  const [docNumber, setDocNumber] = useState<string>(() => generateDocNumber('Tax Invoice'));
  const [issueDate, setIssueDate] = useState<string>(() => new Date().toISOString().split('T')[0]);
  const [dueOrValidDate, setDueOrValidDate] = useState<string>(() => addDaysIso(15));
  const [status, setStatus] = useState<InvoiceDocument['status']>('Draft');

  const [clientName, setClientName] = useState('');
  const [clientEmail, setClientEmail] = useState('');
  const [clientPhone, setClientPhone] = useState('');
  const [clientOrganization, setClientOrganization] = useState('');
  const [clientAddress, setClientAddress] = useState('');
  const [clientGstin, setClientGstin] = useState('');
  const [sourceRefId, setSourceRefId] = useState('');
  const [sourceType, setSourceType] = useState<'RFQ' | 'Order' | 'Manual'>('Manual');

  const [items, setItems] = useState<InvoiceLineItem[]>([
    makeLineItem({ description: 'NABL Traceable Multi-Para Monitor Calibration', hsnSac: '9987', quantity: 1, unitPrice: 4500 }),
  ]);
  const [taxMode, setTaxMode] = useState<'CGST_SGST' | 'IGST'>('CGST_SGST');
  const [gstPercent, setGstPercent] = useState<number>(defaultGst);
  const [paymentReference, setPaymentReference] = useState('');
  const [notes, setNotes] = useState(
    'NABL ISO/IEC 17025 calibration traceability certificate will be issued upon equipment validation completion.'
  );
  const [terms, setTerms] = useState(
    '1. Payment due within 15 days from invoice date.\n2. All equipment services include 90-day workmanship warranty.\n3. Subject to Mumbai jurisdiction.'
  );

  useEffect(() => {
    const db = getDb();
    const unsubDocs = db.collection('invoices_quotes').onSnapshot((snap: any) => {
      const list: InvoiceDocument[] = [];
      snap.forEach((d: any) => list.push({ id: d.id, ...d.data() }));
      list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      setDocuments(list);
    });

    const unsubServices = db.collection('services').onSnapshot((snap: any) => {
      const list: Service[] = [];
      snap.forEach((d: any) => list.push({ id: d.id, ...d.data() }));
      setCatalogServices(list);
    });

    return () => {
      unsubDocs();
      unsubServices();
    };
  }, []);

  const showToast = (type: 'success' | 'error', message: string) => {
    setFeedback({ type, message });
    setTimeout(() => {
      setFeedback((prev) => (prev?.message === message ? null : prev));
    }, 5000);
  };

  // Calculations
  const financials = useMemo(() => {
    let grossSubtotal = 0;
    let totalDiscount = 0;

    items.forEach((item) => {
      const qty = Math.max(0, Number(item.quantity) || 0);
      const rate = Math.max(0, Number(item.unitPrice) || 0);
      const discPct = Math.min(100, Math.max(0, Number(item.discountPercent) || 0));
      const rowGross = qty * rate;
      const rowDisc = rowGross * (discPct / 100);
      grossSubtotal += rowGross;
      totalDiscount += rowDisc;
    });

    const taxableAmount = Math.max(0, Math.round(grossSubtotal - totalDiscount));
    const totalGst = Math.round(taxableAmount * ((Number(gstPercent) || 0) / 100));
    const cgstAmount = taxMode === 'CGST_SGST' ? Math.round(totalGst / 2) : 0;
    const sgstAmount = taxMode === 'CGST_SGST' ? totalGst - cgstAmount : 0;
    const igstAmount = taxMode === 'IGST' ? totalGst : 0;
    const grandTotal = taxableAmount + cgstAmount + sgstAmount + igstAmount;

    return {
      subtotal: Math.round(grossSubtotal),
      discountTotal: Math.round(totalDiscount),
      taxableAmount,
      cgstAmount,
      sgstAmount,
      igstAmount,
      grandTotal,
    };
  }, [items, gstPercent, taxMode]);

  const handleNewDocument = (newType: 'Quotation' | 'Tax Invoice') => {
    setEditingId(null);
    setDocType(newType);
    setDocNumber(generateDocNumber(newType));
    setIssueDate(new Date().toISOString().split('T')[0]);
    setDueOrValidDate(addDaysIso(newType === 'Quotation' ? 30 : 15));
    setStatus('Draft');
    setIssuerName(siteSettings?.paymentGateway?.merchantName || siteSettings?.siteName || 'SunMedX Biomedical India Pvt Ltd');
    setIssuerGstin(siteSettings?.paymentGateway?.companyGstin || DEFAULT_PAYMENT_GATEWAY.companyGstin);
    setIssuerAddress(siteSettings?.address || 'Mumbai, Maharashtra, India');
    setIssuerPhone(siteSettings?.phone || '+91 98765 43210');
    setIssuerEmail(siteSettings?.email || 'info@sunmedx.in');
    setIssuerUpiVpa(siteSettings?.paymentGateway?.upiVpa || DEFAULT_PAYMENT_GATEWAY.upiVpa);
    setIssuerBankDetails(siteSettings?.paymentGateway?.bankDetails || DEFAULT_PAYMENT_GATEWAY.bankDetails);
    setClientName('');
    setClientEmail('');
    setClientPhone('');
    setClientOrganization('');
    setClientAddress('');
    setClientGstin('');
    setSourceRefId('');
    setSourceType('Manual');
    setPaymentReference('');
    setItems([makeLineItem()]);
  };

  const handleSaveIssuerAsDefault = async () => {
    setIsSavingDefaults(true);
    try {
      const currentGw = {
        ...DEFAULT_PAYMENT_GATEWAY,
        ...(siteSettings?.paymentGateway || {}),
      };
      await onUpdateSettings({
        address: issuerAddress.trim(),
        phone: issuerPhone.trim(),
        email: issuerEmail.trim(),
        paymentGateway: {
          ...currentGw,
          merchantName: issuerName.trim(),
          companyGstin: issuerGstin.trim().toUpperCase(),
          upiVpa: issuerUpiVpa.trim(),
          bankDetails: issuerBankDetails.trim(),
        },
      });
      await logAdminAction(
        'ISSUER_BILLING_DEFAULTS_SAVED',
        `Updated default SunMedX billing profile: ${issuerName.trim()} (GSTIN: ${issuerGstin.trim().toUpperCase()})`
      );
      showToast('success', 'Saved SunMedX GSTIN, Address & Remittance details as site-wide defaults.');
    } catch (err: any) {
      showToast('error', err?.message || 'Failed saving SunMedX billing defaults.');
    } finally {
      setIsSavingDefaults(false);
    }
  };

  const handleImportFromRfq = (rfqId: string) => {
    const rfq = quotations.find((q) => q.id === rfqId);
    if (!rfq) return;
    setEditingId(null);
    setDocType('Quotation');
    setDocNumber(generateDocNumber('Quotation'));
    setStatus('Draft');
    setClientName(rfq.contact || '');
    setClientEmail(rfq.email || rfq.userEmail || '');
    setClientPhone(rfq.phone || '');
    setClientOrganization(rfq.hospital || '');
    setClientAddress(`${rfq.department ? rfq.department + ', ' : ''}${rfq.city || ''}`);
    setSourceRefId(rfq.id || '');
    setSourceType('RFQ');
    const unitRate = rfq.adminResponse?.price
      ? Math.round(rfq.adminResponse.price / Math.max(1, rfq.quantity || 1))
      : 15000;
    setItems([
      makeLineItem({
        description: `${rfq.deviceModel} (Urgency: ${rfq.urgency})`,
        hsnSac: '9018',
        quantity: rfq.quantity || 1,
        unitPrice: unitRate,
        discountPercent: 0,
      }),
    ]);
    if (rfq.adminResponse?.notes) {
      setNotes(rfq.adminResponse.notes);
    }
    showToast('success', `Imported RFQ details for ${rfq.hospital || rfq.contact}.`);
  };

  const handleImportFromOrder = (orderId: string) => {
    const ord = orders.find((o) => o.id === orderId);
    if (!ord) return;
    const matchedUser = usersList.find((u) => u.email.toLowerCase() === (ord.userEmail || '').toLowerCase());
    setEditingId(null);
    setDocType('Tax Invoice');
    setDocNumber(generateDocNumber('Tax Invoice'));
    setStatus(ord.status === 'Paid' || ord.status === 'Completed' ? 'Paid' : 'Sent');
    setClientName(matchedUser?.name || ord.userEmail.split('@')[0]);
    setClientEmail(ord.userEmail || '');
    setClientPhone(matchedUser?.phone || '');
    setClientOrganization(matchedUser?.hospital || 'Hospital Client');
    setClientAddress('India');
    setSourceRefId(ord.id || '');
    setSourceType('Order');
    setPaymentReference(ord.razorpayPaymentId || '');
    setItems(
      ord.items.map((item) =>
        makeLineItem({
          description: item.product.name,
          hsnSac: '9018',
          quantity: item.quantity || 1,
          unitPrice: item.product.price || 0,
          discountPercent: 0,
        })
      )
    );
    showToast('success', `Imported Order ${ord.razorpayPaymentId || ord.id} into Tax Invoice.`);
  };

  const handleImportClient = (uid: string) => {
    const user = usersList.find((u) => u.uid === uid);
    if (!user) return;
    setClientName(user.name || '');
    setClientEmail(user.email || '');
    setClientPhone(user.phone || '');
    setClientOrganization(user.hospital || '');
  };

  const handleQuickAddProduct = (prodId: string) => {
    const p = catalogue.find((c) => c.id === prodId);
    if (!p) return;
    setItems((prev) => [
      ...prev,
      makeLineItem({
        description: `${p.name} (${p.category})`,
        hsnSac: '9018',
        quantity: 1,
        unitPrice: p.price || 0,
      }),
    ]);
  };

  const handleQuickAddService = (srvId: string) => {
    const s = catalogServices.find((c) => c.id === srvId);
    if (!s) return;
    setItems((prev) => [
      ...prev,
      makeLineItem({
        description: s.title,
        hsnSac: '9987',
        quantity: 1,
        unitPrice: s.minPrice || 2500,
      }),
    ]);
  };

  const updateItem = (id: string, patch: Partial<InvoiceLineItem>) => {
    setItems((prev) => prev.map((row) => (row.id === id ? { ...row, ...patch } : row)));
  };

  const removeItem = (id: string) => {
    setItems((prev) => (prev.length > 1 ? prev.filter((row) => row.id !== id) : prev));
  };

  const buildDocumentPayload = (overrideStatus?: InvoiceDocument['status']): Omit<InvoiceDocument, 'id'> => ({
    docNumber: docNumber.trim() || generateDocNumber(docType),
    docType,
    issueDate,
    dueOrValidDate,
    status: overrideStatus || status,
    clientName: clientName.trim() || 'Authorized Representative',
    clientEmail: clientEmail.trim(),
    clientPhone: clientPhone.trim(),
    clientOrganization: clientOrganization.trim() || 'Healthcare Client',
    clientAddress: clientAddress.trim() || 'Maharashtra, India',
    clientGstin: clientGstin.trim().toUpperCase(),
    issuerName: issuerName.trim() || 'SunMedX Biomedical Services',
    issuerGstin: issuerGstin.trim().toUpperCase(),
    issuerAddress: issuerAddress.trim() || 'Mumbai, Maharashtra, India',
    issuerPhone: issuerPhone.trim(),
    issuerEmail: issuerEmail.trim(),
    issuerUpiVpa: issuerUpiVpa.trim(),
    issuerBankDetails: issuerBankDetails.trim(),
    sourceRefId: sourceRefId || undefined,
    sourceType,
    items,
    taxMode,
    gstPercent: Number(gstPercent) || 0,
    subtotal: financials.subtotal,
    discountTotal: financials.discountTotal,
    taxableAmount: financials.taxableAmount,
    cgstAmount: financials.cgstAmount,
    sgstAmount: financials.sgstAmount,
    igstAmount: financials.igstAmount,
    grandTotal: financials.grandTotal,
    notes,
    terms,
    paymentReference: paymentReference.trim() || undefined,
    createdBy: adminEmail,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  });

  const handleSaveDocument = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!clientOrganization.trim() && !clientName.trim()) {
      showToast('error', 'Please enter Client Name or Hospital/Organization before saving.');
      return;
    }
    setIsSaving(true);
    try {
      const db = getDb();
      const payload = buildDocumentPayload();
      if (editingId) {
        const { createdAt: _ignore, ...updateFields } = payload;
        await db.collection('invoices_quotes').doc(editingId).update(updateFields);
        await logAdminAction('INVOICE_UPDATED', `Updated ${docType} ${payload.docNumber} for ${payload.clientOrganization}`);
        showToast('success', `${docType} ${payload.docNumber} updated.`);
      } else {
        const ref = await db.collection('invoices_quotes').add(payload);
        setEditingId(ref?.id || null);
        await logAdminAction('INVOICE_CREATED', `Created ${docType} ${payload.docNumber} (Rs ${payload.grandTotal.toLocaleString()})`);
        showToast('success', `${docType} ${payload.docNumber} saved to database.`);
      }
    } catch (err: any) {
      showToast('error', err?.message || 'Failed saving document.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleLoadDocument = (doc: InvoiceDocument) => {
    setEditingId(doc.id || null);
    setDocType(doc.docType);
    setDocNumber(doc.docNumber);
    setIssueDate(doc.issueDate);
    setDueOrValidDate(doc.dueOrValidDate);
    setStatus(doc.status);
    setClientName(doc.clientName || '');
    setClientEmail(doc.clientEmail || '');
    setClientPhone(doc.clientPhone || '');
    setClientOrganization(doc.clientOrganization || '');
    setClientAddress(doc.clientAddress || '');
    setClientGstin(doc.clientGstin || '');
    setIssuerName(doc.issuerName || gateway?.merchantName || siteSettings?.siteName || 'SunMedX Biomedical India Pvt Ltd');
    setIssuerGstin(doc.issuerGstin || gateway?.companyGstin || DEFAULT_PAYMENT_GATEWAY.companyGstin);
    setIssuerAddress(doc.issuerAddress || siteSettings?.address || 'Mumbai, Maharashtra, India');
    setIssuerPhone(doc.issuerPhone || siteSettings?.phone || '+91 98765 43210');
    setIssuerEmail(doc.issuerEmail || siteSettings?.email || 'info@sunmedx.in');
    setIssuerUpiVpa(doc.issuerUpiVpa || gateway?.upiVpa || DEFAULT_PAYMENT_GATEWAY.upiVpa);
    setIssuerBankDetails(doc.issuerBankDetails || gateway?.bankDetails || DEFAULT_PAYMENT_GATEWAY.bankDetails);
    setSourceRefId(doc.sourceRefId || '');
    setSourceType(doc.sourceType || 'Manual');
    setItems(doc.items?.length ? doc.items : [makeLineItem()]);
    setTaxMode(doc.taxMode || 'CGST_SGST');
    setGstPercent(doc.gstPercent ?? 18);
    setPaymentReference(doc.paymentReference || '');
    setNotes(doc.notes || '');
    setTerms(doc.terms || '');
    showToast('success', `Loaded ${doc.docNumber} for editing.`);
  };

  const handleConvertToInvoice = async (docData?: InvoiceDocument) => {
    const source = docData || buildDocumentPayload();
    setIsSaving(true);
    try {
      const db = getDb();
      const newInvNumber = generateDocNumber('Tax Invoice');
      const invoicePayload: Omit<InvoiceDocument, 'id'> = {
        ...source,
        docType: 'Tax Invoice',
        docNumber: newInvNumber,
        issueDate: new Date().toISOString().split('T')[0],
        dueOrValidDate: addDaysIso(15),
        status: 'Sent',
        createdBy: adminEmail,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      const ref = await db.collection('invoices_quotes').add(invoicePayload);
      handleLoadDocument({ id: ref?.id, ...invoicePayload });
      await logAdminAction('QUOTE_CONVERTED_TO_INVOICE', `Converted ${source.docNumber} -> ${newInvNumber}`);
      showToast('success', `Converted Quotation to Tax Invoice ${newInvNumber}.`);
    } catch (err: any) {
      showToast('error', err?.message || 'Conversion failed.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleUpdateDocStatus = async (docId: string, newStatus: InvoiceDocument['status'], docNum: string) => {
    try {
      const db = getDb();
      await db.collection('invoices_quotes').doc(docId).update({
        status: newStatus,
        updatedAt: new Date().toISOString(),
      });
      if (editingId === docId) setStatus(newStatus);
      await logAdminAction('INVOICE_STATUS_CHANGE', `Marked ${docNum} as ${newStatus}`);
      showToast('success', `${docNum} marked ${newStatus}.`);
    } catch (err: any) {
      showToast('error', err?.message || 'Failed updating status.');
    }
  };

  const handleDeleteDocument = async (docId: string, docNum: string) => {
    try {
      const db = getDb();
      await db.collection('invoices_quotes').doc(docId).delete();
      if (editingId === docId) handleNewDocument('Tax Invoice');
      await logAdminAction('INVOICE_DELETED', `Deleted ${docNum}`);
      showToast('success', `Removed ${docNum}.`);
    } catch (err: any) {
      showToast('error', err?.message || 'Failed removing document.');
    }
  };

  const generatePdf = (targetDoc?: InvoiceDocument) => {
    try {
      const d = targetDoc || buildDocumentPayload();
      const pdf = new jsPDF({ unit: 'mm', format: 'a4' });
      const merchantName = d.issuerName || issuerName || gateway?.merchantName || siteSettings?.siteName || 'SunMedX Biomedical Services';
      const companyGstin = d.issuerGstin || issuerGstin || gateway?.companyGstin || '27AABCS1429B1Z5';
      const companyAddress = d.issuerAddress || issuerAddress || siteSettings?.address || 'Mumbai, Maharashtra, India';
      const companyPhone = d.issuerPhone || issuerPhone || siteSettings?.phone || '+91 98765 43210';
      const companyEmail = d.issuerEmail || issuerEmail || siteSettings?.email || 'info@sunmedx.in';
      const pdfUpiVpa = d.issuerUpiVpa || issuerUpiVpa || gateway?.upiVpa || '';
      const pdfBankDetails = d.issuerBankDetails || issuerBankDetails || gateway?.bankDetails || '';

      // Top Institutional Navy Header
      pdf.setFillColor(33, 29, 112); // #211D70
      pdf.rect(0, 0, 210, 38, 'F');
      pdf.setFillColor(248, 199, 46); // #F8C72E accent strip
      pdf.rect(0, 38, 210, 2.5, 'F');

      pdf.setTextColor(255, 255, 255);
      pdf.setFont('Helvetica', 'bold');
      pdf.setFontSize(17);
      pdf.text(merchantName.toUpperCase(), 14, 15);

      pdf.setFontSize(8.5);
      pdf.setFont('Helvetica', 'normal');
      pdf.text(`${companyAddress} | Ph: ${companyPhone} | ${companyEmail}`, 14, 22);
      pdf.text(`GSTIN: ${companyGstin} | NABL ISO/IEC 17025 Traceable Calibration Desk`, 14, 28);

      // Document Type Badge on right
      pdf.setFont('Helvetica', 'bold');
      pdf.setFontSize(13);
      pdf.setTextColor(248, 199, 46);
      pdf.text(d.docType.toUpperCase(), 196, 15, { align: 'right' });
      pdf.setFontSize(9.5);
      pdf.setTextColor(255, 255, 255);
      pdf.text(`# ${d.docNumber}`, 196, 22, { align: 'right' });
      pdf.setFontSize(8.5);
      pdf.text(`Status: ${d.status.toUpperCase()}`, 196, 28, { align: 'right' });

      // Client & Metadata Boxes
      pdf.setFillColor(246, 247, 251);
      pdf.rect(14, 46, 108, 36, 'F');
      pdf.rect(126, 46, 70, 36, 'F');

      pdf.setTextColor(33, 29, 112);
      pdf.setFont('Helvetica', 'bold');
      pdf.setFontSize(9);
      pdf.text('BILL TO / CLIENT DETAILS:', 18, 52);

      pdf.setTextColor(40, 40, 45);
      pdf.setFontSize(9.5);
      pdf.text(d.clientOrganization || d.clientName, 18, 58);
      pdf.setFont('Helvetica', 'normal');
      pdf.setFontSize(8.5);
      pdf.text(`Attn: ${d.clientName}${d.clientPhone ? ' | ' + d.clientPhone : ''}`, 18, 63);
      if (d.clientEmail) pdf.text(`Email: ${d.clientEmail}`, 18, 68);
      const addrLines = pdf.splitTextToSize(`${d.clientAddress}${d.clientGstin ? ' | GSTIN: ' + d.clientGstin : ''}`, 98);
      pdf.text(addrLines, 18, 73);

      pdf.setTextColor(33, 29, 112);
      pdf.setFont('Helvetica', 'bold');
      pdf.setFontSize(9);
      pdf.text('DOCUMENT METADATA:', 130, 52);
      pdf.setTextColor(40, 40, 45);
      pdf.setFont('Helvetica', 'normal');
      pdf.setFontSize(8.5);
      pdf.text(`Issue Date: ${d.issueDate}`, 130, 58);
      pdf.text(`${d.docType === 'Quotation' ? 'Valid Until' : 'Due Date'}: ${d.dueOrValidDate}`, 130, 63);
      pdf.text(`Tax Regime: ${d.taxMode === 'CGST_SGST' ? 'CGST + SGST' : 'IGST'} (${d.gstPercent}%)`, 130, 68);
      if (d.paymentReference) {
        pdf.text(`Pay Ref: ${d.paymentReference.slice(0, 22)}`, 130, 73);
      }

      // Items Table Header
      let y = 90;
      pdf.setFillColor(33, 29, 112);
      pdf.rect(14, y, 182, 8, 'F');
      pdf.setTextColor(255, 255, 255);
      pdf.setFont('Helvetica', 'bold');
      pdf.setFontSize(8.5);
      pdf.text('#', 17, y + 5.5);
      pdf.text('Description', 25, y + 5.5);
      pdf.text('HSN/SAC', 108, y + 5.5);
      pdf.text('Qty', 130, y + 5.5, { align: 'right' });
      pdf.text('Rate (INR)', 154, y + 5.5, { align: 'right' });
      pdf.text('Disc%', 170, y + 5.5, { align: 'right' });
      pdf.text('Amount', 193, y + 5.5, { align: 'right' });
      y += 10;

      pdf.setTextColor(40, 40, 45);
      pdf.setFont('Helvetica', 'normal');
      pdf.setFontSize(8.5);

      d.items.forEach((item, idx) => {
        if (y > 240) {
          pdf.addPage();
          y = 20;
        }
        const qty = Number(item.quantity) || 0;
        const rate = Number(item.unitPrice) || 0;
        const disc = Number(item.discountPercent) || 0;
        const lineTotal = Math.round(qty * rate * (1 - disc / 100));
        const descLines = pdf.splitTextToSize(item.description || 'Biomedical Service / Item', 78);

        pdf.text(String(idx + 1), 17, y + 4);
        pdf.text(descLines, 25, y + 4);
        pdf.text(item.hsnSac || '-', 108, y + 4);
        pdf.text(String(qty), 130, y + 4, { align: 'right' });
        pdf.text(rate.toLocaleString('en-IN'), 154, y + 4, { align: 'right' });
        pdf.text(`${disc}%`, 170, y + 4, { align: 'right' });
        pdf.text(lineTotal.toLocaleString('en-IN'), 193, y + 4, { align: 'right' });

        const rowHeight = Math.max(7, descLines.length * 4.5 + 2);
        pdf.setDrawColor(225, 227, 235);
        pdf.line(14, y + rowHeight, 196, y + rowHeight);
        y += rowHeight + 1;
      });

      y += 6;
      if (y > 220) {
        pdf.addPage();
        y = 20;
      }

      // Totals Summary Box (Right) & Amount in Words (Left)
      pdf.setFont('Helvetica', 'bold');
      pdf.setFontSize(8.5);
      pdf.setTextColor(33, 29, 112);
      pdf.text('AMOUNT IN WORDS:', 14, y + 4);
      pdf.setFont('Helvetica', 'normal');
      pdf.setTextColor(50, 50, 55);
      const wordsLines = pdf.splitTextToSize(numberToIndianWords(d.grandTotal), 95);
      pdf.text(wordsLines, 14, y + 9);

      if (pdfUpiVpa || pdfBankDetails) {
        pdf.setFillColor(246, 247, 251);
        pdf.rect(14, y + 18, 102, 24, 'F');
        pdf.setFont('Helvetica', 'bold');
        pdf.setTextColor(33, 29, 112);
        pdf.text('REMITTANCE & PAYMENT INSTRUCTIONS:', 17, y + 23);
        pdf.setFont('Helvetica', 'normal');
        pdf.setFontSize(7.8);
        pdf.setTextColor(55, 55, 60);
        if (pdfUpiVpa) pdf.text(`UPI VPA: ${pdfUpiVpa}`, 17, y + 28.5);
        if (pdfBankDetails) {
          const bankLines = pdf.splitTextToSize(pdfBankDetails, 96);
          pdf.text(bankLines, 17, y + 33.5);
        }
      }

      // Financial Totals Right Column
      const totX = 122;
      let ty = y;
      pdf.setFontSize(8.8);
      pdf.setFont('Helvetica', 'normal');
      pdf.setTextColor(60, 60, 65);
      pdf.text('Gross Subtotal:', totX, ty + 4);
      pdf.text(`Rs ${d.subtotal.toLocaleString('en-IN')}`, 195, ty + 4, { align: 'right' });
      ty += 6;

      if (d.discountTotal > 0) {
        pdf.text('Discount Allowed:', totX, ty + 4);
        pdf.text(`- Rs ${d.discountTotal.toLocaleString('en-IN')}`, 195, ty + 4, { align: 'right' });
        ty += 6;
      }

      pdf.text('Taxable Value:', totX, ty + 4);
      pdf.text(`Rs ${d.taxableAmount.toLocaleString('en-IN')}`, 195, ty + 4, { align: 'right' });
      ty += 6;

      if (d.taxMode === 'CGST_SGST') {
        const halfRate = (d.gstPercent / 2).toFixed(1).replace(/\.0$/, '');
        pdf.text(`CGST (${halfRate}%):`, totX, ty + 4);
        pdf.text(`Rs ${d.cgstAmount.toLocaleString('en-IN')}`, 195, ty + 4, { align: 'right' });
        ty += 6;
        pdf.text(`SGST (${halfRate}%):`, totX, ty + 4);
        pdf.text(`Rs ${d.sgstAmount.toLocaleString('en-IN')}`, 195, ty + 4, { align: 'right' });
        ty += 7;
      } else {
        pdf.text(`IGST (${d.gstPercent}%):`, totX, ty + 4);
        pdf.text(`Rs ${d.igstAmount.toLocaleString('en-IN')}`, 195, ty + 4, { align: 'right' });
        ty += 7;
      }

      pdf.setFillColor(33, 29, 112);
      pdf.rect(totX - 2, ty, 76, 9, 'F');
      pdf.setTextColor(248, 199, 46);
      pdf.setFont('Helvetica', 'bold');
      pdf.setFontSize(10);
      pdf.text('GRAND TOTAL:', totX + 1, ty + 6);
      pdf.text(`Rs ${d.grandTotal.toLocaleString('en-IN')}`, 194, ty + 6, { align: 'right' });

      // Notes & Terms
      const bottomY = Math.max(y + 46, ty + 16);
      pdf.setTextColor(33, 29, 112);
      pdf.setFont('Helvetica', 'bold');
      pdf.setFontSize(8.5);
      if (d.notes) {
        pdf.text('Technical Notes:', 14, bottomY);
        pdf.setFont('Helvetica', 'normal');
        pdf.setTextColor(65, 65, 70);
        pdf.text(pdf.splitTextToSize(d.notes, 180), 14, bottomY + 4.5);
      }

      if (d.terms) {
        pdf.setFont('Helvetica', 'bold');
        pdf.setTextColor(33, 29, 112);
        pdf.text('Terms & Conditions:', 14, bottomY + 18);
        pdf.setFont('Helvetica', 'normal');
        pdf.setFontSize(7.8);
        pdf.setTextColor(75, 75, 80);
        pdf.text(pdf.splitTextToSize(d.terms, 125), 14, bottomY + 22.5);
      }

      // Signatory block
      pdf.setFont('Helvetica', 'bold');
      pdf.setFontSize(8.5);
      pdf.setTextColor(33, 29, 112);
      pdf.text(`For ${merchantName}`, 195, bottomY + 22, { align: 'right' });
      pdf.line(148, bottomY + 34, 195, bottomY + 34);
      pdf.setFont('Helvetica', 'normal');
      pdf.setFontSize(7.5);
      pdf.text('Authorized Signatory', 195, bottomY + 38, { align: 'right' });

      pdf.save(`${d.docNumber}.pdf`);
      showToast('success', `Downloaded ${d.docNumber}.pdf`);
    } catch (err: any) {
      showToast('error', `PDF export failed: ${err?.message || 'Unknown error'}`);
    }
  };

  const filteredDocuments = documents.filter((d) => {
    const typeMatch = filterType === 'All' || d.docType === filterType;
    const q = searchTerm.trim().toLowerCase();
    const searchMatch =
      !q ||
      d.docNumber.toLowerCase().includes(q) ||
      (d.clientOrganization || '').toLowerCase().includes(q) ||
      (d.clientName || '').toLowerCase().includes(q) ||
      (d.clientEmail || '').toLowerCase().includes(q);
    return typeMatch && searchMatch;
  });

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* Header & Mode Switcher */}
      <div className="bg-navy border border-white/10 rounded-2xl p-5 flex flex-col lg:flex-row lg:items-center justify-between gap-4 shadow-xl">
        <div>
          <div className="flex items-center gap-2 text-amber text-xs font-mono uppercase tracking-wider font-bold">
            <Receipt className="w-4 h-4" />
            <span>GST Billing & Quotation Studio</span>
          </div>
          <h2 className="font-syne font-black text-xl text-white tracking-tight mt-0.5">
            Quote &amp; Tax Invoice Generator
          </h2>
          <p className="text-xs text-gray-400">
            Generate NABL-ready quotations or GST tax invoices from RFQs, orders, or custom items and export official PDFs.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <button
            type="button"
            onClick={() => handleNewDocument('Quotation')}
            className="px-4 py-2 rounded-xl bg-[#10101e] hover:bg-white/10 text-amber border border-amber/30 text-xs font-bold font-syne uppercase flex items-center gap-1.5"
          >
            <Plus className="w-4 h-4" />
            <span>New Quotation</span>
          </button>
          <button
            type="button"
            onClick={() => handleNewDocument('Tax Invoice')}
            className="px-4 py-2 rounded-xl bg-gradient-to-r from-crimson to-amber text-navy text-xs font-bold font-syne uppercase flex items-center gap-1.5 shadow-lg shadow-crimson/20"
          >
            <Plus className="w-4 h-4" />
            <span>New Tax Invoice</span>
          </button>
        </div>
      </div>

      {/* Inline Toast Feedback */}
      {feedback && (
        <div
          className={`p-3.5 rounded-xl border text-xs font-medium flex items-center justify-between ${
            feedback.type === 'success'
              ? 'bg-green-500/10 border-green-500/30 text-green-300'
              : 'bg-red-500/10 border-red-500/30 text-red-300'
          }`}
        >
          <span>{feedback.message}</span>
          <button type="button" onClick={() => setFeedback(null)} className="text-xs opacity-70 hover:opacity-100">
            Dismiss
          </button>
        </div>
      )}

      {/* Main Workspace: Builder (7 cols) + Live Paper Preview (5 cols) */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 items-start">
        {/* LEFT BUILDER FORM */}
        <form onSubmit={handleSaveDocument} className="xl:col-span-7 space-y-5 bg-navy border border-white/10 rounded-2xl p-5 shadow-xl">
          {/* Editable SunMedX Issuer Details Panel */}
          <div className="bg-[#10101e] border border-amber/20 rounded-xl p-4 space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <button
                type="button"
                onClick={() => setIsIssuerPanelOpen((prev) => !prev)}
                className="flex items-center gap-2 text-[11px] font-mono uppercase text-amber font-bold hover:text-white transition-colors"
              >
                <Building2 className="w-3.5 h-3.5" />
                <span>SunMedX Issuer Details (GSTIN, Address &amp; Bank)</span>
                {isIssuerPanelOpen ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
              </button>

              <button
                type="button"
                onClick={handleSaveIssuerAsDefault}
                disabled={isSavingDefaults}
                className="px-3 py-1.5 rounded-lg bg-amber/15 hover:bg-amber text-amber hover:text-navy border border-amber/30 text-[10px] font-mono font-bold uppercase flex items-center gap-1.5 transition-colors disabled:opacity-50"
              >
                {isSavingDefaults ? <RefreshCw className="w-3 h-3 animate-spin" /> : <Save className="w-3 h-3" />}
                <span>Save as SunMedX Default</span>
              </button>
            </div>

            {!isIssuerPanelOpen ? (
              <div className="text-[11px] text-gray-300 flex flex-wrap gap-x-4 gap-y-1">
                <span className="font-semibold text-white">{issuerName}</span>
                <span className="font-mono text-amber">GSTIN: {issuerGstin || 'Not set'}</span>
                <span className="text-gray-400">{issuerAddress}</span>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-1">
                <div>
                  <label className="block text-[10px] font-mono uppercase text-gray-400 mb-1">SunMedX Legal / Entity Name</label>
                  <input
                    type="text"
                    value={issuerName}
                    onChange={(e) => setIssuerName(e.target.value)}
                    placeholder="SunMedX Biomedical India Pvt Ltd"
                    className="w-full bg-navy border border-white/10 rounded-lg px-3 py-2 text-xs text-white"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-mono uppercase text-gray-400 mb-1">SunMedX GST Number (GSTIN)</label>
                  <input
                    type="text"
                    value={issuerGstin}
                    onChange={(e) => setIssuerGstin(e.target.value.toUpperCase())}
                    placeholder="27AABCS1429B1Z5"
                    className="w-full bg-navy border border-white/10 rounded-lg px-3 py-2 text-xs text-amber font-mono font-bold"
                  />
                </div>
                <div className="md:col-span-2">
                  <label className="block text-[10px] font-mono uppercase text-gray-400 mb-1">Registered Office / Lab Address</label>
                  <input
                    type="text"
                    value={issuerAddress}
                    onChange={(e) => setIssuerAddress(e.target.value)}
                    placeholder="Full office address, city, state & PIN"
                    className="w-full bg-navy border border-white/10 rounded-lg px-3 py-2 text-xs text-white"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-mono uppercase text-gray-400 mb-1">Contact Phone</label>
                  <input
                    type="text"
                    value={issuerPhone}
                    onChange={(e) => setIssuerPhone(e.target.value)}
                    placeholder="+91 98765 43210"
                    className="w-full bg-navy border border-white/10 rounded-lg px-3 py-2 text-xs text-white font-mono"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-mono uppercase text-gray-400 mb-1">Billing Email</label>
                  <input
                    type="email"
                    value={issuerEmail}
                    onChange={(e) => setIssuerEmail(e.target.value)}
                    placeholder="info@sunmedx.in"
                    className="w-full bg-navy border border-white/10 rounded-lg px-3 py-2 text-xs text-white"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-mono uppercase text-gray-400 mb-1">UPI VPA for Remittance</label>
                  <input
                    type="text"
                    value={issuerUpiVpa}
                    onChange={(e) => setIssuerUpiVpa(e.target.value)}
                    placeholder="sunmedx.biomed@okicici"
                    className="w-full bg-navy border border-white/10 rounded-lg px-3 py-2 text-xs text-white font-mono"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-mono uppercase text-gray-400 mb-1">Bank Account / NEFT Details</label>
                  <input
                    type="text"
                    value={issuerBankDetails}
                    onChange={(e) => setIssuerBankDetails(e.target.value)}
                    placeholder="Bank Name • A/C No • IFSC"
                    className="w-full bg-navy border border-white/10 rounded-lg px-3 py-2 text-xs text-white"
                  />
                </div>
              </div>
            )}
          </div>

          {/* Pre-fill Importer Row */}
          <div className="bg-[#10101e] border border-white/5 rounded-xl p-4 space-y-3">
            <div className="flex items-center gap-2 text-[11px] font-mono uppercase text-amber font-bold">
              <Sparkles className="w-3.5 h-3.5" />
              <span>Quick Pre-fill From Existing Records</span>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-2.5">
              <select
                value=""
                onChange={(e) => handleImportFromRfq(e.target.value)}
                className="bg-navy border border-white/10 rounded-lg px-3 py-2 text-xs text-gray-200 focus:outline-none focus:border-amber"
              >
                <option value="">Import from Client RFQ...</option>
                {quotations.map((q) => (
                  <option key={q.id} value={q.id}>
                    {q.hospital} — {q.deviceModel} ({q.status})
                  </option>
                ))}
              </select>

              <select
                value=""
                onChange={(e) => handleImportFromOrder(e.target.value)}
                className="bg-navy border border-white/10 rounded-lg px-3 py-2 text-xs text-gray-200 focus:outline-none focus:border-amber"
              >
                <option value="">Import from Client Order...</option>
                {orders.map((o) => (
                  <option key={o.id} value={o.id}>
                    {o.razorpayPaymentId || o.id?.slice(0, 8)} — Rs {o.total?.toLocaleString()}
                  </option>
                ))}
              </select>

              <select
                value=""
                onChange={(e) => handleImportClient(e.target.value)}
                className="bg-navy border border-white/10 rounded-lg px-3 py-2 text-xs text-gray-200 focus:outline-none focus:border-amber"
              >
                <option value="">Fill Registered Client...</option>
                {usersList.map((u) => (
                  <option key={u.uid} value={u.uid}>
                    {u.hospital || u.name} ({u.email})
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Document Type & Metadata */}
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
            <div>
              <label className="block text-[10px] font-mono uppercase text-gray-400 mb-1">Document Type</label>
              <select
                value={docType}
                onChange={(e) => {
                  const nextType = e.target.value as 'Quotation' | 'Tax Invoice';
                  setDocType(nextType);
                  if (!editingId) setDocNumber(generateDocNumber(nextType));
                }}
                className="w-full bg-[#10101e] border border-white/10 rounded-xl px-3 py-2.5 text-xs text-white font-semibold"
              >
                <option value="Quotation">Quotation</option>
                <option value="Tax Invoice">Tax Invoice</option>
              </select>
            </div>

            <div>
              <label className="block text-[10px] font-mono uppercase text-gray-400 mb-1">Document Number</label>
              <input
                type="text"
                required
                value={docNumber}
                onChange={(e) => setDocNumber(e.target.value)}
                className="w-full bg-[#10101e] border border-white/10 rounded-xl px-3 py-2.5 text-xs text-amber font-mono font-bold"
              />
            </div>

            <div>
              <label className="block text-[10px] font-mono uppercase text-gray-400 mb-1">Issue Date</label>
              <input
                type="date"
                value={issueDate}
                onChange={(e) => setIssueDate(e.target.value)}
                className="w-full bg-[#10101e] border border-white/10 rounded-xl px-3 py-2.5 text-xs text-white font-mono"
              />
            </div>

            <div>
              <label className="block text-[10px] font-mono uppercase text-gray-400 mb-1">
                {docType === 'Quotation' ? 'Valid Until' : 'Due Date'}
              </label>
              <input
                type="date"
                value={dueOrValidDate}
                onChange={(e) => setDueOrValidDate(e.target.value)}
                className="w-full bg-[#10101e] border border-white/10 rounded-xl px-3 py-2.5 text-xs text-white font-mono"
              />
            </div>
          </div>

          {/* Client Billing Info */}
          <div className="space-y-3 border-t border-white/5 pt-4">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-mono uppercase text-gray-400 font-bold flex items-center gap-1.5">
                <Building2 className="w-3.5 h-3.5 text-amber" />
                Client Billing Details
              </span>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-mono text-gray-400">Status:</span>
                <select
                  value={status}
                  onChange={(e) => setStatus(e.target.value as InvoiceDocument['status'])}
                  className="bg-[#10101e] border border-white/10 rounded-lg px-2.5 py-1 text-xs text-white font-semibold"
                >
                  <option value="Draft">Draft</option>
                  <option value="Sent">Sent</option>
                  <option value="Paid">Paid</option>
                  <option value="Overdue">Overdue</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <input
                type="text"
                required
                placeholder="Hospital / Organization Name *"
                value={clientOrganization}
                onChange={(e) => setClientOrganization(e.target.value)}
                className="bg-[#10101e] border border-white/10 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder:text-gray-500"
              />
              <input
                type="text"
                placeholder="Contact Person Name"
                value={clientName}
                onChange={(e) => setClientName(e.target.value)}
                className="bg-[#10101e] border border-white/10 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder:text-gray-500"
              />
              <input
                type="email"
                placeholder="Client Billing Email"
                value={clientEmail}
                onChange={(e) => setClientEmail(e.target.value)}
                className="bg-[#10101e] border border-white/10 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder:text-gray-500"
              />
              <input
                type="text"
                placeholder="Phone Number"
                value={clientPhone}
                onChange={(e) => setClientPhone(e.target.value)}
                className="bg-[#10101e] border border-white/10 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder:text-gray-500"
              />
              <input
                type="text"
                placeholder="Client GSTIN (Optional, e.g. 27AABCU9603R1ZM)"
                value={clientGstin}
                onChange={(e) => setClientGstin(e.target.value.toUpperCase())}
                className="bg-[#10101e] border border-white/10 rounded-xl px-3.5 py-2.5 text-xs text-white font-mono placeholder:text-gray-500"
              />
              <input
                type="text"
                placeholder="Payment Reference / UTR / Gateway Tx ID"
                value={paymentReference}
                onChange={(e) => setPaymentReference(e.target.value)}
                className="bg-[#10101e] border border-white/10 rounded-xl px-3.5 py-2.5 text-xs text-white font-mono placeholder:text-gray-500"
              />
            </div>
            <input
              type="text"
              placeholder="Client Billing Address (City, State, PIN)"
              value={clientAddress}
              onChange={(e) => setClientAddress(e.target.value)}
              className="w-full bg-[#10101e] border border-white/10 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder:text-gray-500"
            />
          </div>

          {/* Line Items Builder */}
          <div className="space-y-3 border-t border-white/5 pt-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="text-[11px] font-mono uppercase text-gray-400 font-bold">
                Itemized Services &amp; Equipment
              </span>

              <div className="flex flex-wrap items-center gap-2">
                <select
                  value=""
                  onChange={(e) => handleQuickAddProduct(e.target.value)}
                  className="bg-[#10101e] border border-white/10 rounded-lg px-2.5 py-1.5 text-[11px] text-gray-200"
                >
                  <option value="">+ Add Catalogue Item...</option>
                  {catalogue.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name} ({p.price ? `Rs ${p.price.toLocaleString()}` : 'POR'})
                    </option>
                  ))}
                </select>

                <select
                  value=""
                  onChange={(e) => handleQuickAddService(e.target.value)}
                  className="bg-[#10101e] border border-white/10 rounded-lg px-2.5 py-1.5 text-[11px] text-gray-200"
                >
                  <option value="">+ Add Calibration Service...</option>
                  {catalogServices.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.title} (from Rs {s.minPrice?.toLocaleString()})
                    </option>
                  ))}
                </select>

                <button
                  type="button"
                  onClick={() => setItems((prev) => [...prev, makeLineItem()])}
                  className="px-3 py-1.5 rounded-lg bg-amber/15 hover:bg-amber/25 text-amber border border-amber/30 text-[11px] font-bold flex items-center gap-1"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Blank Row</span>
                </button>
              </div>
            </div>

            <div className="space-y-2.5">
              {items.map((item, idx) => {
                const rowNet = Math.round(
                  (Number(item.quantity) || 0) *
                    (Number(item.unitPrice) || 0) *
                    (1 - Math.min(100, Math.max(0, Number(item.discountPercent) || 0)) / 100)
                );
                return (
                  <div
                    key={item.id}
                    className="grid grid-cols-12 gap-2 bg-[#10101e] p-3 rounded-xl border border-white/5 items-end"
                  >
                    <div className="col-span-12 sm:col-span-5">
                      <label className="block text-[9px] font-mono text-gray-500 mb-1">#{idx + 1} Description</label>
                      <input
                        type="text"
                        required
                        placeholder="Equipment / Calibration Scope"
                        value={item.description}
                        onChange={(e) => updateItem(item.id, { description: e.target.value })}
                        className="w-full bg-navy border border-white/10 rounded-lg px-2.5 py-2 text-xs text-white"
                      />
                    </div>
                    <div className="col-span-4 sm:col-span-2">
                      <label className="block text-[9px] font-mono text-gray-500 mb-1">HSN/SAC</label>
                      <input
                        type="text"
                        value={item.hsnSac}
                        onChange={(e) => updateItem(item.id, { hsnSac: e.target.value })}
                        className="w-full bg-navy border border-white/10 rounded-lg px-2 py-2 text-xs text-white font-mono"
                      />
                    </div>
                    <div className="col-span-3 sm:col-span-1">
                      <label className="block text-[9px] font-mono text-gray-500 mb-1">Qty</label>
                      <input
                        type="number"
                        min={1}
                        value={item.quantity}
                        onChange={(e) => updateItem(item.id, { quantity: Number(e.target.value) })}
                        className="w-full bg-navy border border-white/10 rounded-lg px-2 py-2 text-xs text-white font-mono tabular-nums"
                      />
                    </div>
                    <div className="col-span-5 sm:col-span-2">
                      <label className="block text-[9px] font-mono text-gray-500 mb-1">Rate (Rs)</label>
                      <input
                        type="number"
                        min={0}
                        value={item.unitPrice}
                        onChange={(e) => updateItem(item.id, { unitPrice: Number(e.target.value) })}
                        className="w-full bg-navy border border-white/10 rounded-lg px-2 py-2 text-xs text-white font-mono tabular-nums"
                      />
                    </div>
                    <div className="col-span-6 sm:col-span-1">
                      <label className="block text-[9px] font-mono text-gray-500 mb-1">Disc%</label>
                      <input
                        type="number"
                        min={0}
                        max={100}
                        value={item.discountPercent}
                        onChange={(e) => updateItem(item.id, { discountPercent: Number(e.target.value) })}
                        className="w-full bg-navy border border-white/10 rounded-lg px-2 py-2 text-xs text-white font-mono tabular-nums"
                      />
                    </div>
                    <div className="col-span-6 sm:col-span-1 flex items-center justify-between sm:justify-end gap-1 pb-1">
                      <span className="text-[11px] font-mono text-amber font-bold sm:hidden tabular-nums">
                        Rs {rowNet.toLocaleString('en-IN')}
                      </span>
                      <button
                        type="button"
                        onClick={() => removeItem(item.id)}
                        disabled={items.length === 1}
                        title="Remove line item"
                        className="p-2 rounded-lg text-gray-500 hover:text-red-400 hover:bg-red-500/10 disabled:opacity-30"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Tax Mode & Notes */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 border-t border-white/5 pt-4">
            <div>
              <label className="block text-[10px] font-mono uppercase text-gray-400 mb-1">GST Tax Regime</label>
              <select
                value={taxMode}
                onChange={(e) => setTaxMode(e.target.value as 'CGST_SGST' | 'IGST')}
                className="w-full bg-[#10101e] border border-white/10 rounded-xl px-3 py-2.5 text-xs text-white"
              >
                <option value="CGST_SGST">CGST + SGST (Intra-State Split)</option>
                <option value="IGST">IGST (Inter-State Supply)</option>
              </select>
            </div>
            <div>
              <label className="block text-[10px] font-mono uppercase text-gray-400 mb-1">GST Rate (%)</label>
              <input
                type="number"
                min={0}
                max={28}
                value={gstPercent}
                onChange={(e) => setGstPercent(Number(e.target.value))}
                className="w-full bg-[#10101e] border border-white/10 rounded-xl px-3 py-2.5 text-xs text-white font-mono tabular-nums"
              />
            </div>
            <div className="bg-[#10101e] rounded-xl border border-white/5 px-3.5 py-2 flex flex-col justify-center">
              <span className="text-[10px] font-mono text-gray-400 uppercase">Grand Total</span>
              <span className="text-base font-mono font-black text-amber tabular-nums">
                Rs {financials.grandTotal.toLocaleString('en-IN')}
              </span>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <label className="block text-[10px] font-mono uppercase text-gray-400 mb-1">Compliance / Technical Notes</label>
              <textarea
                rows={2}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="w-full bg-[#10101e] border border-white/10 rounded-xl p-3 text-xs text-white"
              />
            </div>
            <div>
              <label className="block text-[10px] font-mono uppercase text-gray-400 mb-1">Terms &amp; Payment Conditions</label>
              <textarea
                rows={2}
                value={terms}
                onChange={(e) => setTerms(e.target.value)}
                className="w-full bg-[#10101e] border border-white/10 rounded-xl p-3 text-xs text-white"
              />
            </div>
          </div>

          {/* Primary Actions */}
          <div className="flex flex-wrap items-center gap-3 pt-2 border-t border-white/5">
            <button
              type="submit"
              disabled={isSaving}
              className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-crimson to-amber text-navy font-syne font-bold text-xs uppercase tracking-wider flex items-center gap-2 shadow-lg shadow-crimson/20 disabled:opacity-50"
            >
              {isSaving ? <RefreshCw className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
              <span>{editingId ? `Update ${docType}` : `Save ${docType}`}</span>
            </button>

            <button
              type="button"
              onClick={() => generatePdf()}
              className="px-4 py-2.5 rounded-xl bg-white text-[#211D70] hover:bg-amber hover:text-[#211D70] font-syne font-bold text-xs uppercase tracking-wider flex items-center gap-1.5 transition-colors"
            >
              <Download className="w-4 h-4" />
              <span>Export PDF</span>
            </button>

            {docType === 'Quotation' && (
              <button
                type="button"
                disabled={isSaving}
                onClick={() => handleConvertToInvoice()}
                className="px-4 py-2.5 rounded-xl bg-green-500/15 hover:bg-green-500/25 text-green-300 border border-green-500/30 font-syne font-bold text-xs uppercase tracking-wider flex items-center gap-1.5"
              >
                <ArrowRightCircle className="w-4 h-4" />
                <span>Convert to Tax Invoice</span>
              </button>
            )}
          </div>
        </form>

        {/* RIGHT LIVE WHITE PAPER PREVIEW */}
        <div className="xl:col-span-5 bg-white text-[#211D70] rounded-2xl border-2 border-[#211D70] shadow-2xl overflow-hidden xl:sticky xl:top-6 min-w-0">
          {/* Paper Header */}
          <div className="bg-[#211D70] text-white p-5 border-b-4 border-[#F8C72E] flex justify-between items-start gap-4">
            <div>
              <h3 className="font-syne font-black text-base tracking-tight text-white">
                {issuerName || 'SunMedX Biomedical'}
              </h3>
              <p className="text-[10px] text-white/85 mt-0.5">{issuerAddress || 'Mumbai, Maharashtra'}</p>
              <p className="text-[10px] text-white/75 mt-0.5">
                {[issuerPhone, issuerEmail].filter(Boolean).join(' • ')}
              </p>
              <p className="text-[10px] text-[#F8C72E] font-mono mt-1">
                GSTIN: {issuerGstin || '27AABCS1429B1Z5'}
              </p>
            </div>
            <div className="text-right">
              <span className="inline-block px-2 py-0.5 rounded bg-[#F8C72E] text-[#211D70] font-bold text-[10px] uppercase">
                {docType}
              </span>
              <div className="font-mono font-bold text-xs mt-1 text-white">{docNumber}</div>
              <div className="text-[10px] text-white/75 font-mono">{issueDate}</div>
            </div>
          </div>

          <div className="p-5 space-y-4 text-xs">
            {/* Client Snapshot */}
            <div className="bg-[#F4F5FA] p-3.5 rounded-xl border border-[#D4D6E2] flex justify-between gap-3">
              <div className="space-y-0.5">
                <span className="text-[10px] font-bold uppercase text-[#EA2227]">Billed To</span>
                <div className="font-bold text-[#211D70] text-sm">{clientOrganization || 'Client Hospital / Clinic'}</div>
                <div className="text-[#404041]">{clientName || 'Authorized Signatory'}</div>
                {clientEmail && <div className="text-[#505050] text-[11px]">{clientEmail}</div>}
                {clientGstin && <div className="font-mono text-[10px] text-[#211D70]">GSTIN: {clientGstin}</div>}
              </div>
              <div className="text-right space-y-1 shrink-0">
                <span className="inline-block px-2 py-0.5 rounded bg-[#211D70]/10 text-[#211D70] font-mono font-bold text-[10px] uppercase">
                  {status}
                </span>
                <div className="text-[10px] text-[#505050] font-mono">
                  {docType === 'Quotation' ? 'Valid:' : 'Due:'} {dueOrValidDate}
                </div>
              </div>
            </div>

            {/* Line Items Table */}
            <div className="border border-[#D4D6E2] rounded-xl overflow-hidden">
              <table className="w-full text-[11px]">
                <thead className="bg-[#EAEAEA] text-[#211D70] font-bold">
                  <tr>
                    <th className="p-2 text-left">Item</th>
                    <th className="p-2 text-right">Qty</th>
                    <th className="p-2 text-right">Rate</th>
                    <th className="p-2 text-right">Total</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E6E7EE]">
                  {items.map((it) => {
                    const rowAmt = Math.round(
                      (Number(it.quantity) || 0) *
                        (Number(it.unitPrice) || 0) *
                        (1 - Math.min(100, Math.max(0, Number(it.discountPercent) || 0)) / 100)
                    );
                    return (
                      <tr key={it.id}>
                        <td className="p-2 text-[#404041]">
                          <div className="font-semibold text-[#211D70]">{it.description || 'Line item'}</div>
                          <div className="text-[9px] font-mono text-[#505050]">HSN/SAC: {it.hsnSac || '9018'}</div>
                        </td>
                        <td className="p-2 text-right font-mono tabular-nums">{it.quantity}</td>
                        <td className="p-2 text-right font-mono tabular-nums">
                          {Number(it.unitPrice || 0).toLocaleString('en-IN')}
                        </td>
                        <td className="p-2 text-right font-mono font-bold text-[#211D70] tabular-nums">
                          {rowAmt.toLocaleString('en-IN')}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Totals Breakup */}
            <div className="bg-[#F4F5FA] p-3.5 rounded-xl border border-[#D4D6E2] space-y-1.5">
              <div className="flex justify-between text-[#505050]">
                <span>Subtotal</span>
                <span className="font-mono tabular-nums">Rs {financials.subtotal.toLocaleString('en-IN')}</span>
              </div>
              {financials.discountTotal > 0 && (
                <div className="flex justify-between text-green-700">
                  <span>Discount</span>
                  <span className="font-mono tabular-nums">- Rs {financials.discountTotal.toLocaleString('en-IN')}</span>
                </div>
              )}
              {taxMode === 'CGST_SGST' ? (
                <>
                  <div className="flex justify-between text-[#505050]">
                    <span>CGST ({(gstPercent / 2).toFixed(1).replace(/\.0$/, '')}%)</span>
                    <span className="font-mono tabular-nums">Rs {financials.cgstAmount.toLocaleString('en-IN')}</span>
                  </div>
                  <div className="flex justify-between text-[#505050]">
                    <span>SGST ({(gstPercent / 2).toFixed(1).replace(/\.0$/, '')}%)</span>
                    <span className="font-mono tabular-nums">Rs {financials.sgstAmount.toLocaleString('en-IN')}</span>
                  </div>
                </>
              ) : (
                <div className="flex justify-between text-[#505050]">
                  <span>IGST ({gstPercent}%)</span>
                  <span className="font-mono tabular-nums">Rs {financials.igstAmount.toLocaleString('en-IN')}</span>
                </div>
              )}
              <div className="flex justify-between pt-2 border-t border-[#D4D6E2] font-bold text-sm text-[#211D70]">
                <span>Grand Total</span>
                <span className="font-mono tabular-nums">Rs {financials.grandTotal.toLocaleString('en-IN')}</span>
              </div>
              <p className="text-[10px] text-[#505050] italic pt-1">{numberToIndianWords(financials.grandTotal)}</p>
            </div>

            {/* Remittance Snapshot */}
            {(issuerUpiVpa || issuerBankDetails) && (
              <div className="text-[10px] text-[#404041] bg-[#EAEAEA]/60 p-3 rounded-lg space-y-0.5">
                <div className="font-bold text-[#211D70] uppercase">Payment Details</div>
                {issuerUpiVpa && <div className="font-mono">UPI VPA: {issuerUpiVpa}</div>}
                {issuerBankDetails && <div>{issuerBankDetails}</div>}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Saved Quotations & Invoices Registry */}
      <div className="bg-navy border border-white/10 rounded-2xl p-5 shadow-xl space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div>
            <h3 className="font-syne font-black text-sm uppercase text-white tracking-wider flex items-center gap-2">
              <FileText className="w-4 h-4 text-amber" />
              <span>Saved Quotations &amp; Invoices ({documents.length})</span>
            </h3>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {(['All', 'Quotation', 'Tax Invoice'] as const).map((tab) => (
              <button
                key={tab}
                type="button"
                onClick={() => setFilterType(tab)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-colors ${
                  filterType === tab
                    ? 'bg-amber text-navy border-amber font-bold'
                    : 'bg-[#10101e] text-gray-300 border-white/10 hover:text-white'
                }`}
              >
                {tab}
              </button>
            ))}

            <div className="relative">
              <input
                type="text"
                placeholder="Search doc # or client..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="bg-[#10101e] border border-white/10 rounded-lg pl-8 pr-3 py-1.5 text-xs text-white placeholder:text-gray-500"
              />
              <Search className="w-3.5 h-3.5 text-gray-400 absolute left-2.5 top-2" />
            </div>
          </div>
        </div>

        {filteredDocuments.length === 0 ? (
          <div className="py-10 text-center text-xs text-gray-400 bg-[#10101e] rounded-xl border border-white/5">
            No saved quotations or tax invoices yet. Use the builder above to create and save one.
          </div>
        ) : (
          <div className="overflow-x-auto border border-white/5 rounded-xl bg-[#10101e]">
            <table className="w-full text-xs text-left divide-y divide-white/5 text-gray-300">
              <thead>
                <tr className="bg-navy text-gray-400 font-mono text-[11px]">
                  <th className="p-3.5">Ref #</th>
                  <th className="p-3.5">Type</th>
                  <th className="p-3.5">Client / Hospital</th>
                  <th className="p-3.5">Issue Date</th>
                  <th className="p-3.5 text-right">Grand Total</th>
                  <th className="p-3.5">Status</th>
                  <th className="p-3.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {filteredDocuments.map((d) => (
                  <tr key={d.id} className="hover:bg-white/[0.03]">
                    <td className="p-3.5 font-mono font-bold text-amber">{d.docNumber}</td>
                    <td className="p-3.5">
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                          d.docType === 'Tax Invoice'
                            ? 'bg-blue-500/15 text-blue-300 border border-blue-500/20'
                            : 'bg-amber/15 text-amber border border-amber/20'
                        }`}
                      >
                        {d.docType}
                      </span>
                    </td>
                    <td className="p-3.5">
                      <div className="font-semibold text-white">{d.clientOrganization}</div>
                      <div className="text-[11px] text-gray-400">{d.clientEmail || d.clientName}</div>
                    </td>
                    <td className="p-3.5 font-mono text-[11px]">{d.issueDate}</td>
                    <td className="p-3.5 text-right font-mono font-bold text-white tabular-nums">
                      Rs {d.grandTotal?.toLocaleString('en-IN')}
                    </td>
                    <td className="p-3.5">
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold uppercase ${
                          d.status === 'Paid'
                            ? 'bg-green-500/15 text-green-300 border border-green-500/25'
                            : d.status === 'Overdue'
                            ? 'bg-red-500/15 text-red-300 border border-red-500/25'
                            : d.status === 'Sent'
                            ? 'bg-amber/15 text-amber border border-amber/25'
                            : 'bg-white/10 text-gray-300'
                        }`}
                      >
                        {d.status}
                      </span>
                    </td>
                    <td className="p-3.5 text-right space-x-1.5 whitespace-nowrap">
                      <button
                        type="button"
                        onClick={() => handleLoadDocument(d)}
                        className="px-2.5 py-1 rounded bg-white/5 hover:bg-white/15 text-white text-[11px] font-semibold"
                      >
                        Edit
                      </button>
                      <button
                        type="button"
                        onClick={() => generatePdf(d)}
                        title="Download PDF"
                        className="p-1.5 rounded bg-white/5 hover:bg-amber hover:text-navy text-amber inline-flex items-center"
                      >
                        <Download className="w-3.5 h-3.5" />
                      </button>
                      {d.docType === 'Quotation' && (
                        <button
                          type="button"
                          onClick={() => handleConvertToInvoice(d)}
                          title="Convert Quotation to Tax Invoice"
                          className="p-1.5 rounded bg-green-500/15 hover:bg-green-500/30 text-green-300 inline-flex items-center"
                        >
                          <Copy className="w-3.5 h-3.5" />
                        </button>
                      )}
                      {d.status !== 'Paid' && d.id && (
                        <button
                          type="button"
                          onClick={() => handleUpdateDocStatus(d.id!, 'Paid', d.docNumber)}
                          title="Mark as Paid"
                          className="p-1.5 rounded bg-green-500/15 hover:bg-green-500/30 text-green-300 inline-flex items-center"
                        >
                          <CheckCircle2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                      {d.id && (
                        <button
                          type="button"
                          onClick={() => handleDeleteDocument(d.id!, d.docNumber)}
                          title="Delete document"
                          className="p-1.5 rounded bg-red-500/10 hover:bg-red-500/25 text-red-400 inline-flex items-center"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
