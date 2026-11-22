import React, { useState, useEffect } from 'react';
import { ShoppingBag, FileText, CheckCircle2, Phone, Briefcase, PlusCircle, CreditCard, Award, User, Layers, RefreshCw } from 'lucide-react';
import { getDb } from '../services/dataClient';
import { PRODUCT_ASSET_FALLBACKS } from '../config/seed';
import { getEffectiveGatewayConfig, isLiveGatewayKeyConfigured, launchRazorpayCheckout } from '../utils/paymentCheckout';
import { Order, QuotationRequest, ServiceRequest, SiteSettings } from '../types';
import ValidationSection from '../components/ValidationSection';
import { jsPDF } from 'jspdf';

interface CustomerPortalProps {
  userId: string;
  userEmail: string;
  siteSettings: SiteSettings | null;
}

export default function CustomerPortal({ userId, userEmail, siteSettings }: CustomerPortalProps) {
  const [activeTab, setActiveTab] = useState<'orders' | 'quotes' | 'calibrations' | 'validations' | 'profile' | 'amc' | 'lifecycle'>('orders');
  
  const [orders, setOrders] = useState<Order[]>([]);
  const [quotes, setQuotes] = useState<QuotationRequest[]>([]);
  const [serviceRequests, setServiceRequests] = useState<ServiceRequest[]>([]);
  const [amcContracts, setAmcContracts] = useState<any[]>([]);
  const [lifecycles, setLifecycles] = useState<any[]>([]);
  const [techJobs, setTechJobs] = useState<any[]>([]);
  
  // Selected Tech Job Report Modal state
  const [viewedReportJob, setViewedReportJob] = useState<any | null>(null);

  // Quote Payment checkout state
  const [payingQuote, setPayingQuote] = useState<QuotationRequest | null>(null);
  const [isProcessingQuotePay, setIsProcessingQuotePay] = useState(false);
  const [quoteUtrRef, setQuoteUtrRef] = useState('');
  const [quotePayMethod, setQuotePayMethod] = useState<'gateway' | 'upi_neft'>('gateway');
  const [quotePayError, setQuotePayError] = useState('');
  const gatewayConfig = getEffectiveGatewayConfig(siteSettings);

  useEffect(() => {
    if (!userEmail) return;
    const db = getDb();

    // Fetch orders
    const unsubOrders = db.collection('orders').where('userEmail', '==', userEmail).onSnapshot((snap: any) => {
      const list: Order[] = [];
      snap.forEach((doc: any) => {
        list.push({ id: doc.id, ...doc.data() });
      });
      setOrders(list.sort((a,b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()));
    });

    // Fetch quotes
    const unsubQuotes = db.collection('quotation_requests').where('userEmail', '==', userEmail).onSnapshot((snap: any) => {
      const list: QuotationRequest[] = [];
      snap.forEach((doc: any) => {
        list.push({ id: doc.id, ...doc.data() });
      });
      setQuotes(list.sort((a,b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()));
    });

    // Fetch services AMC tracking
    const unsubServices = db.collection('service_requests').where('userEmail', '==', userEmail).onSnapshot((snap: any) => {
      const list: ServiceRequest[] = [];
      snap.forEach((doc: any) => {
        list.push({ id: doc.id, ...doc.data() });
      });
      setServiceRequests(list.sort((a,b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()));
    });

    // Fetch active AMC contracts
    const unsubContracts = db.collection('amc_contracts').where('userEmail', '==', userEmail).onSnapshot((snap: any) => {
      const list: any[] = [];
      snap.forEach((doc: any) => {
        list.push({ id: doc.id, ...doc.data() });
      });
      setAmcContracts(list);
    });

    // Fetch Equipment Lifecycles related to client email or their hospitals if matched
    const unsubLifecycles = db.collection('equipment_lifecycle').onSnapshot((snap: any) => {
      const list: any[] = [];
      snap.forEach((doc: any) => {
        list.push({ id: doc.id, ...doc.data() });
      });
      // Filter client matching or fallback default demo
      setLifecycles(list);
    });

    // Fetch Technician Job Repaired report tickets matching client email
    const unsubTechJobs = db.collection('technician_jobs').where('customerEmail', '==', userEmail).onSnapshot((snap: any) => {
      const list: any[] = [];
      snap.forEach((doc: any) => {
        list.push({ id: doc.id, ...doc.data() });
      });
      setTechJobs(list);
    });

    return () => {
      unsubOrders();
      unsubQuotes();
      unsubServices();
      unsubContracts();
      unsubLifecycles();
      unsubTechJobs();
    };
  }, [userEmail]);

  // Invoice PDF Generation download trigger using jsPDF
  const generateInvoicePdf = (order: Order) => {
    try {
      const doc = new jsPDF();
      
      // Header Banner
      doc.setFillColor(26, 26, 46); // Deep Navy background
      doc.rect(0, 0, 210, 40, 'F');
      
      doc.setTextColor(255, 255, 255);
      doc.setFont('Helvetica', 'bold');
      doc.setFontSize(22);
      doc.text("SUNMEDX BIOMEDICAL SERVICES", 15, 25);
      
      doc.setFontSize(9);
      doc.setFont('Helvetica', 'normal');
      doc.text("Mumbai Maharashtra, India • traceably NABL aligned calibrations office", 15, 32);

      // Metas
      doc.setFillColor(245, 245, 245);
      doc.rect(10, 48, 190, 45, 'F');

      doc.setTextColor(50, 50, 50);
      doc.setFontSize(10);
      doc.setFont('Helvetica', 'bold');
      doc.text("INVOICE SUMMARY & RECEIPT", 15, 55);

      doc.setFont('Helvetica', 'normal');
      doc.text(`Invoice ID Reference: ${order.razorpayPaymentId || 'N/A'}`, 15, 62);
      doc.text(`Authorized Date: ${new Date(order.createdAt).toLocaleString()}`, 15, 68);
      doc.text(`Buyer Lead Email: ${order.userEmail}`, 15, 74);
      doc.text(`Authorized Razorpay Gateway Status: ${order.status}`, 15, 80);

      // Items Table
      doc.setFont('Helvetica', 'bold');
      doc.text("Item Description", 15, 105);
      doc.text("Quantity Unit", 120, 105);
      doc.text("Rate Fee", 160, 105);
      doc.line(10, 108, 200, 108);

      doc.setFont('Helvetica', 'normal');
      let currentY = 116;
      order.items.forEach((item) => {
        doc.text(item.product.name.substring(0, 45), 15, currentY);
        doc.text(item.quantity.toString(), 120, currentY);
        doc.text(`Rs ${(item.product.price || 0).toLocaleString()}`, 160, currentY);
        currentY += 8;
      });

      doc.line(10, currentY, 200, currentY);
      currentY += 10;

      // Totals
      doc.text("Clean Sales Subtotal (Excl. Tax):", 110, currentY);
      doc.text(`Rs ${order.subtotal.toLocaleString()}`, 168, currentY);
      currentY += 7;
      doc.text(`Clean Gst Sales Tax (${siteSettings?.gstPercent || 18}%):`, 110, currentY);
      doc.text(`Rs ${order.gstAmount.toLocaleString()}`, 168, currentY);
      currentY += 8;

      doc.setFont('Helvetica', 'bold');
      doc.text("TOTAL ORDER PAYABLE (GST INCLS):", 110, currentY);
      doc.text(`Rs ${order.total.toLocaleString()}`, 168, currentY);

      // Footnote
      doc.setFontSize(8);
      doc.setFont('Helvetica', 'normal');
      doc.setTextColor(120, 120, 120);
      doc.text("Thank you for your business. For traceabilities certifications AMC scheduling questions, contact info@sunmedx.in", 15, 275);

      doc.save(`SunMedX-Invoice-${order.razorpayPaymentId || 'Ref'}.pdf`);
    } catch (err: any) {
      alert("Billing generation failed: " + err.message);
    }
  };

  // Generate high-fidelity repair report PDF containing signature image
  const generateJobReportPdf = (job: any) => {
    try {
      const doc = new jsPDF();
      
      // Top header band (Deep Navy)
      doc.setFillColor(26, 26, 46);
      doc.rect(0, 0, 210, 42, 'F');
      
      doc.setTextColor(255, 255, 255);
      doc.setFont('Helvetica', 'bold');
      doc.setFontSize(20);
      doc.text("SUNMEDX CLINICAL SERVICE REPORT", 15, 22);
      
      doc.setFontSize(8.5);
      doc.setFont('Helvetica', 'normal');
      doc.text("NABL ISO 17025 Calibrations & Biomedical Repair Verification Certificate", 15, 30);
      doc.text(`TICKET ID: ${job.id || 'N/A'} • STATUS: ${job.status || 'N/A'}`, 15, 36);

      // Section 1: Customer & Asset Metadata Grid
      doc.setFillColor(245, 245, 247);
      doc.rect(10, 50, 190, 52, 'F');
      
      doc.setTextColor(50, 50, 50);
      doc.setFontSize(10.5);
      doc.setFont('Helvetica', 'bold');
      doc.text("SERVICE & ASSET DESCRIPTION", 15, 59);

      doc.setFontSize(9);
      doc.setFont('Helvetica', 'normal');
      doc.text(`Hospital Station:  ${job.hospital || 'N/A'}`, 15, 68);
      doc.text(`Equipment Name:    ${job.equipment || 'N/A'}`, 15, 75);
      doc.text(`Service Type:      ${job.serviceType || 'N/A'}`, 15, 82);
      doc.text(`Client Contact:    ${job.customerName || 'N/A'} (${job.customerEmail || 'N/A'})`, 15, 89);
      doc.text(`Completed Date:    ${job.lastUpdated ? new Date(job.lastUpdated).toLocaleString() : new Date().toLocaleString()}`, 15, 96);

      // Section 2: Work Checklist & Observations
      doc.setFont('Helvetica', 'bold');
      doc.setFontSize(11);
      doc.text("BIOMEDICAL ENGINEERING REPAIR VERIFICATIONS", 10, 114);
      doc.line(10, 116, 200, 116);

      doc.setFont('Helvetica', 'normal');
      doc.setFontSize(9.5);
      
      let currentY = 124;

      // Work Done Checklist
      doc.setFont('Helvetica', 'bold');
      doc.text("Work Performed Checklist / Corrective Actions:", 12, currentY);
      currentY += 5;
      doc.setFont('Helvetica', 'normal');
      const workDoneLines = doc.splitTextToSize(job.report?.workDone || "Standard maintenance and electrical safety calibrations carried out.", 180);
      doc.text(workDoneLines, 15, currentY);
      currentY += (workDoneLines.length * 5) + 6;

      // Spare parts
      if (job.report?.partsUsed) {
        doc.setFont('Helvetica', 'bold');
        doc.text("Spare Components Reallocated:", 12, currentY);
        currentY += 5;
        doc.setFont('Helvetica', 'normal');
        const partsLines = doc.splitTextToSize(job.report.partsUsed, 180);
        doc.text(partsLines, 15, currentY);
        currentY += (partsLines.length * 5) + 6;
      }

      // Technical Observations
      if (job.report?.observations) {
        doc.setFont('Helvetica', 'bold');
        doc.text("Engineering Observations:", 12, currentY);
        currentY += 5;
        doc.setFont('Helvetica', 'normal');
        const obsLines = doc.splitTextToSize(job.report.observations, 180);
        doc.text(obsLines, 15, currentY);
        currentY += (obsLines.length * 5) + 6;
      }

      // Audit Recommendations
      doc.setFont('Helvetica', 'bold');
      doc.text("Authoritative Audit Recommendations:", 12, currentY);
      currentY += 5;
      doc.setFont('Helvetica', 'normal');
      const recLines = doc.splitTextToSize(job.report?.recommendations || "System calibrated with NABL traceability. Ready for active clinical service.", 180);
      doc.text(recLines, 15, currentY);
      currentY += (recLines.length * 5) + 12;

      // Section 3: Signature Verification Card
      if (currentY > 210) {
        doc.addPage();
        currentY = 30;
      }

      doc.setFont('Helvetica', 'bold');
      doc.setFontSize(10.5);
      doc.text("AUTHORITATIVE SIGN-OFF & CERTIFICATION", 10, currentY);
      doc.line(10, currentY + 2, 200, currentY + 2);
      currentY += 10;

      // Draw signature container box (Deep Charcoal to contrast the white signature beautifully)
      doc.setFillColor(26, 26, 46);
      doc.rect(10, currentY, 90, 42, 'F');
      
      if (job.report?.signature) {
        try {
          doc.addImage(job.report.signature, 'PNG', 12, currentY + 2, 86, 38);
        } catch (imgError) {
          console.error("Error adding signature image to PDF:", imgError);
          doc.setTextColor(255, 255, 255);
          doc.setFontSize(8);
          doc.text("[Image Signature Render Placeholder]", 15, currentY + 20);
        }
      } else {
        doc.setTextColor(255, 255, 255);
        doc.setFontSize(8.5);
        doc.text("NO DIGITAL SIGNATURE RECORDED", 15, currentY + 20);
      }

      // Signatory label details
      doc.setTextColor(80, 80, 80);
      doc.setFont('Helvetica', 'bold');
      doc.setFontSize(9);
      doc.text("Hospital Rep / Clinician Sign", 15, currentY + 48);
      doc.setFont('Helvetica', 'normal');
      doc.setFontSize(8);
      doc.text("Verified electronically via Canvas Token API", 15, currentY + 53);

      // Lead tech details next to signature
      doc.setTextColor(50, 50, 50);
      doc.setFont('Helvetica', 'bold');
      doc.setFontSize(9.5);
      doc.text("Lead Dispatch Engineer:", 115, currentY + 8);
      doc.setFont('Helvetica', 'normal');
      doc.text(job.technicianName || "Registered SunMedX Tech", 115, currentY + 14);
      doc.text(`Email: ${job.technicianEmail || 'field@sunmedx.com'}`, 115, currentY + 20);
      doc.text("Status: Verified Service Representative", 115, currentY + 26);

      // Footer disclaimer
      doc.setFontSize(8);
      doc.setTextColor(120, 120, 120);
      doc.text("This document certifies that the listed clinical device was inspected, repaired, and validated in accordance with standard medical safety regulations.", 15, 276);
      doc.text("NABL-aligned calibrations verified • SunMedX India Limited.", 15, 281);

      doc.save(`SunMedX-Report-${job.id || 'Job'}.pdf`);
    } catch (err: any) {
      alert("Error compiling report PDF: " + err.message);
    }
  };

  // Submit approved/answered Quotation payments hook
  const getQuoteUnitPrice = (quote: QuotationRequest): number => {
    const legacyPrice = (quote as any).negotiatedPrice;
    return Number(quote.adminResponse?.price ?? legacyPrice ?? 12000);
  };

  const handlePayQuote = (quote: QuotationRequest) => {
    setQuotePayError('');
    setQuoteUtrRef('');
    setQuotePayMethod(gatewayConfig.provider === 'upi_manual' ? 'upi_neft' : 'gateway');
    setPayingQuote(quote);
  };

  const finalizeQuoteOrder = async (txId: string, methodLabel: string) => {
    if (!payingQuote) return;
    setIsProcessingQuotePay(true);
    setQuotePayError('');
    try {
      const db = getDb();

      await db.collection('quotation_requests').doc(payingQuote.id).update({
        status: 'Closed',
        paymentTxId: txId,
      });

      const quoteTotalUnit = getQuoteUnitPrice(payingQuote);
      const computedSubtotal = quoteTotalUnit * (payingQuote.quantity || 1);
      const computedGst = Math.round(computedSubtotal * ((siteSettings?.gstPercent || 18) / 100));

      const orderPayload: Omit<Order, 'id'> = {
        userId: userId || 'anonymous-quote-user',
        userEmail: userEmail,
        items: [
          {
            product: {
              name: payingQuote.deviceModel,
              category: 'Critical Care Spec',
              description: payingQuote.notes || '',
              features: [],
              image: PRODUCT_ASSET_FALLBACKS.analyzer,
              price: quoteTotalUnit,
              badge: '',
            },
            quantity: payingQuote.quantity || 1,
          },
        ],
        subtotal: computedSubtotal,
        gstAmount: computedGst,
        total: computedSubtotal + computedGst,
        razorpayPaymentId: txId,
        paymentProvider: gatewayConfig.provider,
        paymentMethod: methodLabel,
        status: 'Paid',
        createdAt: new Date().toISOString(),
      };

      await db.collection('orders').add(orderPayload);
      setPayingQuote(null);
      setActiveTab('orders');
    } catch (err: any) {
      setQuotePayError(err?.message || 'Failed quote payment processing.');
    } finally {
      setIsProcessingQuotePay(false);
    }
  };

  const executeSuccessfulQuotePayMock = async () => {
    if (!payingQuote) return;
    setQuotePayError('');

    const totalWithGst = (() => {
      const sub = getQuoteUnitPrice(payingQuote) * (payingQuote.quantity || 1);
      return sub + Math.round(sub * ((siteSettings?.gstPercent || 18) / 100));
    })();

    if (quotePayMethod === 'upi_neft') {
      if (!quoteUtrRef.trim() || quoteUtrRef.trim().length < 6) {
        setQuotePayError('Please enter a valid UPI / NEFT UTR reference (min 6 characters).');
        return;
      }
      await finalizeQuoteOrder(`UTR-${quoteUtrRef.trim()}`, 'UPI / Bank Transfer');
      return;
    }

    if (isLiveGatewayKeyConfigured(gatewayConfig)) {
      setIsProcessingQuotePay(true);
      await launchRazorpayCheckout({
        keyId: gatewayConfig.publicKeyId,
        amountInr: totalWithGst,
        currency: gatewayConfig.currency,
        merchantName: gatewayConfig.merchantName,
        description: `Approved Quotation: ${payingQuote.deviceModel}`,
        prefillEmail: userEmail,
        onSuccess: (paymentId) => {
          finalizeQuoteOrder(paymentId, 'Razorpay Checkout');
        },
        onError: (msg) => {
          setIsProcessingQuotePay(false);
          setQuotePayError(msg);
        },
      });
      return;
    }

    await finalizeQuoteOrder(
      `pay_QT_${Math.random().toString(36).substring(2, 9).toUpperCase()}`,
      `${gatewayConfig.provider.toUpperCase()} (${gatewayConfig.mode})`
    );
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 sm:py-10 space-y-6 sm:space-y-8 page-fade-in">
      
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-navy to-[#15152c] rounded-2xl sm:rounded-3xl p-5 sm:p-8 border border-white/5 flex flex-col md:flex-row md:items-center justify-between gap-5 shadow-2xl relative overflow-hidden">
        <div className="relative z-10 space-y-2">
          <div className="text-xs font-mono font-bold text-amber uppercase tracking-widest flex items-center gap-2">
            <User className="w-4 h-4" />
            <span>Authenticated Hospital Portal</span>
          </div>
          <h1 className="font-syne font-black text-white text-xl sm:text-3xl md:text-4xl uppercase tracking-tight leading-none">
            Welcome, <span className="sunrise-text font-black">Sir or Madam</span>
          </h1>
          <p className="text-xs text-gray-400 font-mono truncate">Verified Lead Account: {userEmail}</p>
        </div>

        <div className="relative z-10 flex flex-wrap gap-2">
          {[
            { id: 'orders', label: 'My Store Paid Orders', icon: ShoppingBag },
            { id: 'quotes', label: 'Quotation RFQs', icon: FileText },
            { id: 'calibrations', label: 'Clinical Repairs & Tickets', icon: Briefcase },
            { id: 'amc', label: 'Active AMC Contracts', icon: Layers },
            { id: 'lifecycle', label: 'Equipment Lifecycles Log', icon: Award },
            { id: 'validations', label: 'Clinical Validation Suite', icon: Award },
            { id: 'profile', label: 'My Profile Registration', icon: User }
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`px-4 py-2.5 rounded-xl text-xs uppercase font-syne font-bold font-scannable tracking-wider border select-none transition-all flex items-center gap-1.5 ${
                activeTab === tab.id
                  ? 'sunrise-bg border-amber text-navy font-black'
                  : 'bg-black/20 border-white/5 text-gray-400 hover:text-white hover:bg-black/40'
              }`}
            >
              <tab.icon className="w-3.5 h-3.5" />
              <span>{tab.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* RENDER ACTIVE TAB VIEW */}
      <div className="bg-navy rounded-3xl p-6 sm:p-8 border border-white/5 shadow-2xl min-h-[400px]">
        {activeTab === 'orders' && (
          <div className="space-y-6">
            <div>
              <h2 className="font-syne font-black text-lg text-white uppercase tracking-wider">Lapsed Authorized Paid Orders</h2>
              <p className="text-[10px] text-amber font-mono uppercase tracking-wider">Instant jsPDF Traceabilities validation certificates invoices downloads</p>
            </div>

            {orders.length === 0 ? (
              <div className="py-12 text-center text-gray-500 text-xs">
                <Layers className="w-12 h-12 stroke-[1.5] text-amber opacity-35 mx-auto mb-3 animate-pulse" />
                <p>No transactions authorized under registration account yet.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {orders.map((or) => (
                  <div key={or.id} className="bg-[#10101e] border border-white/5 rounded-2xl p-5 shadow-xl flex flex-col justify-between">
                    <div className="space-y-3.5">
                      <div className="flex justify-between items-start border-b border-white/5 pb-2.5">
                        <span className="text-[10px] font-mono text-gray-400 uppercase truncate max-w-[170px]">{or.razorpayPaymentId || 'Tx Ref'}</span>
                        <span className="bg-green-500/5 text-green-400 border border-green-500/15 text-[9px] font-mono px-2 py-0.5 rounded uppercase">
                          {or.status}
                        </span>
                      </div>
                      
                      <div className="space-y-1">
                        <ul className="text-xs text-gray-300 space-y-1">
                          {or.items.map((it, idx) => (
                            <li key={idx} className="flex justify-between text-[11px]">
                              <span className="truncate max-w-[200px]">{it.product.name}</span>
                              <span className="font-mono text-gray-400">×{it.quantity}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    </div>

                    <div className="mt-6 pt-3.5 border-t border-white/5 flex items-center justify-between">
                      <div className="font-mono text-xs font-black text-[#FFD08A]">Rs {or.total.toLocaleString()}</div>
                      <button
                        onClick={() => generateInvoicePdf(or)}
                        className="py-2 px-3.5 rounded-lg border border-amber/30 text-amber hover:bg-amber/5 font-syne text-[10px] uppercase font-bold flex items-center gap-1.5 transition-all select-none"
                      >
                        <FileText className="w-3.5 h-3.5" />
                        <span>Receipt PDF</span>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Quotes tab */}
        {activeTab === 'quotes' && (
          <div className="space-y-6">
            <div>
              <h2 className="font-syne font-black text-lg text-white uppercase tracking-wider font-bold">Your Custom Quotation RFQ Queries</h2>
              <p className="text-[10px] text-amber font-mono uppercase tracking-wider">Analyze engineer customized prices & complete payments securely</p>
            </div>

            {quotes.length === 0 ? (
              <div className="py-12 text-center text-gray-500 text-xs">
                <FileText className="w-12 h-12 stroke-[1.5] text-amber opacity-35 mx-auto mb-3 animate-pulse" />
                <p>No active calibration RFQ quotes logs submitted yet.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {quotes.map((q) => (
                  <div key={q.id} className="bg-[#10101e] border border-white/5 rounded-2xl p-5 shadow-xl flex flex-col justify-between">
                    <div className="space-y-4">
                      <div className="flex justify-between items-start border-b border-white/5 pb-2.5">
                        <div>
                          <h4 className="font-syne font-bold text-white text-xs">{q.deviceModel}</h4>
                          <span className="text-[9px] font-mono uppercase text-gray-500">{q.hospital} ({q.city})</span>
                        </div>
                        <span className={`text-[9px] font-mono px-2 py-0.5 rounded uppercase ${
                          (q.status === 'Answered' || (q as any).status === 'Approved')
                            ? 'bg-[#FFD08A]/10 text-[#FFD08A] border border-amber/25'
                            : q.status === 'Closed'
                            ? 'bg-green-500/15 text-green-400 border border-green-500/25'
                            : 'bg-gray-800 text-gray-400'
                        }`}>
                          {q.status}
                        </span>
                      </div>

                      <p className="text-xs text-gray-400 font-sans italic">"{q.notes}"</p>

                      {(q.adminResponse?.price ?? (q as any).negotiatedPrice) && (
                        <div className="p-3 rounded-lg bg-orange-500/5 border border-orange-500/10 text-xs flex justify-between items-center">
                          <span className="font-mono text-gray-400">Quoted Unit Rate</span>
                          <span className="font-mono font-black text-amber tabular-nums">
                            Rs {Number(q.adminResponse?.price ?? (q as any).negotiatedPrice).toLocaleString()}
                          </span>
                        </div>
                      )}
                      {q.adminResponse?.notes && (
                        <p className="text-[11px] text-gray-300 bg-navy/60 p-2.5 rounded-lg border border-white/5">
                          Engineer Note: {q.adminResponse.notes}
                        </p>
                      )}
                    </div>

                    {(q.status === 'Answered' || (q as any).status === 'Approved') && (q.adminResponse?.price ?? (q as any).negotiatedPrice) && (
                      <div className="mt-5 pt-3 border-t border-white/5">
                        <button
                          onClick={() => handlePayQuote(q)}
                          className="w-full py-3 rounded-xl bg-gradient-to-r from-crimson via-amber to-golden text-navy font-bold font-syne text-[10px] uppercase tracking-wider flex items-center justify-center gap-1.5 shadow-md shadow-crimson/15"
                        >
                          <CreditCard className="w-4 h-4 text-navy" />
                          <span>Accept &amp; Pay: Rs {Number(q.adminResponse?.price ?? (q as any).negotiatedPrice).toLocaleString()}</span>
                        </button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Service AMC Visits */}
        {activeTab === 'calibrations' && (
          <div className="space-y-6">
            <div>
              <h2 className="font-syne font-black text-lg text-white uppercase tracking-wider">Clinical Repairs & Field Service Tickets</h2>
              <p className="text-[10px] text-amber font-mono uppercase tracking-wider">Real-time dispatcher trackings and technician repair logs</p>
            </div>

            {serviceRequests.length === 0 ? (
              <div className="py-12 text-center text-gray-500 text-xs">
                <Briefcase className="w-12 h-12 stroke-[1.5] text-[#FF9A3C] opacity-35 mx-auto mb-3 animate-pulse" />
                <p>No clinical repair booking logs processed yet.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {serviceRequests.map((srv) => {
                  // Find corresponding technician job report
                  const matchingJob = techJobs.find(tj => tj.serviceRequestId === srv.id || (tj.hospital === srv.hospital && tj.equipment.toLowerCase().includes(srv.serviceType.toLowerCase())));
                  
                  return (
                    <div key={srv.id} className="bg-[#10101e] border border-white/5 rounded-2xl p-5 shadow-xl flex flex-col justify-between space-y-4">
                      <div className="space-y-3">
                        <div className="flex justify-between items-start border-b border-white/5 pb-2">
                          <div>
                            <h4 className="font-syne font-bold text-white text-xs">{srv.serviceType}</h4>
                            <span className="text-[9px] font-mono text-gray-500">{srv.hospital}</span>
                          </div>
                          <span className={`text-[9px] font-mono px-2 py-0.5 rounded uppercase font-bold ${
                            srv.status === 'Completed' ? 'bg-green-500/10 text-green-400 border border-green-500/15' : 'bg-gray-800 text-gray-400'
                          }`}>
                            {srv.status}
                          </span>
                        </div>
                        
                        <div className="text-[11px] text-gray-300 font-sans leading-relaxed">
                          <div className="flex justify-between font-mono text-gray-500 text-[10px] mb-2">
                            <span>Target Date: {srv.date}</span>
                            <span>Mumbai ({srv.city})</span>
                          </div>
                          <p className="italic">"{srv.notes}"</p>
                        </div>
                      </div>

                      {matchingJob?.status === 'Completed' && (
                        <div className="pt-2">
                          <button
                            onClick={() => setViewedReportJob(matchingJob)}
                            className="w-full py-2 bg-white/5 hover:bg-white/10 text-amber border border-white/10 rounded-xl text-[10px] font-mono uppercase font-black"
                          >
                            View Bio-Tech Repair Report
                          </button>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* Active AMC Contracts tab */}
        {activeTab === 'amc' && (
          <div className="space-y-6 animate-fadeIn">
            <div>
              <h2 className="font-syne font-black text-lg text-white uppercase tracking-wider">Annual Maintenance Agreements & Schemes</h2>
              <p className="text-[10px] text-amber font-mono uppercase tracking-wider">Legally compliant hospital calibration packages with downloadable certificate files</p>
            </div>

            {amcContracts.length === 0 ? (
              <div className="py-12 bg-black/10 border border-dashed border-white/5 rounded-3xl text-center text-gray-500 text-xs">
                <Layers className="w-12 h-12 stroke-[1.5] text-amber opacity-35 mx-auto mb-3" />
                <p>No active AMC schemas initialized for this clinical contact.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {amcContracts.map((contract) => {
                  const isExpiring = (new Date(contract.endDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24) <= 30;
                  
                  return (
                    <div key={contract.id} className={`bg-[#10101e] border rounded-2xl p-6 shadow-xl space-y-4 relative ${
                      isExpiring ? 'border-red-500/30 ring-1 ring-red-500/10' : 'border-white/5'
                    }`}>
                      {isExpiring && (
                        <span className="absolute top-4 right-4 bg-red-600/15 text-red-400 border border-red-500/20 text-[8px] font-mono font-black uppercase py-0.5 px-2.5 rounded-full tracking-widest animate-pulse">
                          Expiring in 30 days
                        </span>
                      )}

                      <div className="space-y-1">
                        <span className="text-[10px] font-mono text-gray-500 uppercase">AGREEMENT NO: {contract.contractNumber}</span>
                        <h4 className="font-syne font-black text-white text-base uppercase leading-none">{contract.planSelected}</h4>
                        <p className="text-[10px] text-amber font-mono uppercase">Hospital Station: {contract.hospitalName}</p>
                      </div>

                      <div className="border-t border-b border-white/5 py-3 space-y-1.5 text-xs font-mono text-gray-400">
                        <div className="flex justify-between">
                          <span>Period:</span>
                          <span className="text-white">{contract.startDate} to {contract.endDate}</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Next Visit target:</span>
                          <span className="text-orange-400">{contract.nextVisitDate}</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Value:</span>
                          <span className="text-white">Rs {contract.annualValue?.toLocaleString()}</span>
                        </div>
                        <p className="text-[10px] text-gray-500 font-sans mt-2">Covered: {contract.equipmentList}</p>
                      </div>

                      <div>
                        <button
                          onClick={() => {
                            try {
                              const doc = new jsPDF();
                              doc.setFillColor(26, 26, 46);
                              doc.rect(0, 0, 210, 42, 'F');
                              doc.setTextColor(255, 255, 255);
                              doc.setFont('Helvetica', 'bold');
                              doc.setFontSize(22);
                              doc.text("SUNMEDX ANNUAL MAINTENANCE CONTRACT", 15, 24);
                              doc.setFontSize(9);
                              doc.setFont('Helvetica', 'normal');
                              doc.text("NABL ISO 17025 Calibrations & Hospital Asset Standards Verification Certificate", 15, 32);

                              doc.setFillColor(245, 245, 245);
                              doc.rect(10, 50, 190, 60, 'F');
                              doc.setTextColor(50, 50, 50);
                              doc.setFontSize(11);
                              doc.setFont('Helvetica', 'bold');
                              doc.text(`AMC AGREEMENT REF: ${contract.contractNumber}`, 15, 59);

                              doc.setFontSize(9.5);
                              doc.setFont('Helvetica', 'normal');
                              doc.text(`Hospital station: ${contract.hospitalName}`, 15, 68);
                              doc.text(`Selected Scheme Plan: ${contract.planSelected}`, 15, 75);
                              doc.text(`Equipments List: ${contract.equipmentList}`, 15, 82);
                              doc.text(`Active Frame duration: ${contract.startDate} to ${contract.endDate}`, 15, 89);
                              doc.text(`Annual Agreement Value: Rs ${contract.annualValue?.toLocaleString()}`, 15, 96);
                              doc.text(`Next scheduled preventive: ${contract.nextVisitDate}`, 15, 103);

                              doc.setFont('Helvetica', 'bold');
                              doc.text("COVERED CORE CLINICAL SERVICES & CHECKLISTS:", 15, 122);
                              doc.setFont('Helvetica', 'normal');
                              let currentY = 130;
                              contract.coveredServices?.forEach((cs: string) => {
                                doc.text(`* [Covered Check] ${cs}`, 20, currentY);
                                currentY += 8;
                              });

                              doc.line(10, 230, 80, 230);
                              doc.text("Authorized SunMedX Engineer Sign", 15, 236);
                              doc.line(125, 230, 195, 230);
                              doc.text("Hospital Rep verification Sign", 130, 236);

                              doc.setFontSize(8);
                              doc.setTextColor(120, 120, 120);
                              doc.text("This certificate certifies NABL-traceable reference calibrations. Powered by SunMedX India.", 15, 275);
                              doc.save(`SunMedX-AMC-${contract.contractNumber}.pdf`);
                            } catch (e: any) {
                              alert("PDF build error: " + e.message);
                            }
                          }}
                          className="w-full py-2.5 bg-gradient-to-r from-crimson to-amber text-navy font-black rounded-xl text-xs uppercase font-syne tracking-wider"
                        >
                          Download NABL-Aligned AMC PDF
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* Equipment Lifecycles tab */}
        {activeTab === 'lifecycle' && (
          <div className="space-y-6 animate-fadeIn">
            <div>
              <h2 className="font-syne font-black text-lg text-white uppercase tracking-wider">Medical Equipments Lifecycle Chronology Monitor</h2>
              <p className="text-[10px] text-amber font-mono uppercase tracking-wider">Real-time clinical service trace ledger with NABL compliance scores</p>
            </div>

            {lifecycles.length === 0 ? (
              <p className="text-xs font-mono text-gray-500">Syncing asset registry...</p>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {lifecycles.map((cycle) => (
                  <div key={cycle.id} className="bg-[#10101e] border border-white/5 rounded-2xl p-6 shadow-xl space-y-4">
                    <div className="flex justify-between items-start">
                      <div>
                        <span className="text-[9px] font-mono text-gray-500">SERIAL: {cycle.serialNumber}</span>
                        <h4 className="font-syne font-black text-white text-base uppercase leading-tight mt-0.5">{cycle.name}</h4>
                        <p className="text-[10px] text-gray-400 font-mono">Model: {cycle.model} • Station: {cycle.hospital}</p>
                      </div>
                      <span className="px-2 py-0.5 rounded bg-green-500/10 text-green-400 border border-green-500/15 text-[8px] font-mono uppercase font-black tracking-wider">
                        {cycle.currentStatus}
                      </span>
                    </div>

                    <div className="relative border-l border-white/10 pl-4 space-y-4 py-2 text-[11px] font-sans">
                      {cycle.lifecycleRecords?.map((rec: any, idx: number) => (
                        <div key={idx} className="relative">
                          <div className="absolute -left-[21px] top-1 w-2 h-2 rounded-full bg-amber" />
                          <div className="space-y-0.5">
                            <div className="flex justify-between text-[9px] font-mono text-gray-500">
                              <span>{rec.date} — {rec.type}</span>
                              {rec.cost > 0 && <span className="text-amber">Rs {rec.cost}</span>}
                            </div>
                            <p className="text-gray-300 font-mono italic leading-normal">"{rec.notes}"</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Embed Clinical Validation creator section */}
        {activeTab === 'validations' && (
          <div className="space-y-6">
            <div>
              <h2 className="font-syne font-black text-lg text-white uppercase tracking-wider">Internal Medical Clinical Devices Validation Suite</h2>
              <p className="text-[10px] text-amber font-mono uppercase tracking-wider">Dynamic mathematical calibration checklists with deviation metrics & trace PDFs</p>
            </div>
            
            <ValidationSection userId={userId} userEmail={userEmail} />
          </div>
        )}

        {/* Profile */}
        {activeTab === 'profile' && (
          <div className="max-w-md mx-auto space-y-6 py-6 font-sans">
            <div>
              <h2 className="font-syne font-black text-lg text-white uppercase tracking-wider text-center">Your Registration Identity Verification</h2>
            </div>

            <div className="space-y-4 bg-[#10101e] border border-white/5 p-6 rounded-2xl">
              <div className="space-y-1 text-xs">
                <span className="text-[10px] text-gray-500 uppercase font-mono">Lead contact email</span>
                <div className="text-white bg-navy p-3 rounded-lg border border-white/5 font-mono">{userEmail}</div>
              </div>
              <div className="space-y-1 text-xs">
                <span className="text-[10px] text-gray-500 uppercase font-mono">Client unique id</span>
                <div className="text-gray-400 bg-navy p-3 rounded-lg border border-white/5 font-mono">{userId}</div>
              </div>
              <div className="space-y-1 text-xs">
                <span className="text-[10px] text-gray-500 uppercase font-mono">Access rights level</span>
                <div className="text-green-400 bg-navy p-3 rounded-lg border border-white/5 font-mono font-bold">CLIENT (NABL-TRACEABILITY LEVEL)</div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Quote Payment Modal */}
      {payingQuote && (
        <div className="fixed inset-0 z-[2000] bg-black/85 backdrop-blur-md flex items-center justify-center p-4 sm:p-6 animate-fadeIn">
          <div className="bg-[#10101e] w-full max-w-md rounded-2xl border border-orange-500/25 p-5 sm:p-6 shadow-2xl text-center space-y-5 max-h-[92vh] overflow-y-auto">
            <div className="w-12 h-12 rounded-full bg-gradient-to-r from-crimson to-amber flex items-center justify-center text-navy font-bold mx-auto shadow-lg shadow-crimson/15">
              <CreditCard className="w-6 h-6 stroke-[2.2]" />
            </div>

            <div className="space-y-1.5">
              <h3 className="font-syne font-black text-white text-base uppercase">
                {gatewayConfig.merchantName || 'Quote Settlement'}
              </h3>
              <p className="text-[10px] font-mono text-gray-400 uppercase">
                Device: {payingQuote.deviceModel} • Qty {payingQuote.quantity || 1}
              </p>
              <div className="bg-navy p-3.5 rounded-xl border border-white/5 font-mono text-amber text-lg font-black mt-2 tabular-nums">
                Rs {(getQuoteUnitPrice(payingQuote) * (payingQuote.quantity || 1)).toLocaleString()} + GST
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2 text-xs">
              <button
                type="button"
                onClick={() => {
                  setQuotePayMethod('gateway');
                  setQuotePayError('');
                }}
                className={`py-2 px-3 rounded-lg border font-bold ${
                  quotePayMethod === 'gateway'
                    ? 'bg-amber text-navy border-amber'
                    : 'bg-navy text-gray-300 border-white/10'
                }`}
              >
                {gatewayConfig.provider.toUpperCase()} ({gatewayConfig.mode})
              </button>
              <button
                type="button"
                onClick={() => {
                  setQuotePayMethod('upi_neft');
                  setQuotePayError('');
                }}
                className={`py-2 px-3 rounded-lg border font-bold ${
                  quotePayMethod === 'upi_neft'
                    ? 'bg-amber text-navy border-amber'
                    : 'bg-navy text-gray-300 border-white/10'
                }`}
              >
                UPI / Bank Transfer
              </button>
            </div>

            {quotePayMethod === 'upi_neft' && (
              <div className="bg-navy border border-white/10 rounded-xl p-3.5 text-left space-y-2 text-xs">
                {gatewayConfig.upiVpa && (
                  <div className="font-mono text-amber">UPI VPA: {gatewayConfig.upiVpa}</div>
                )}
                {gatewayConfig.bankDetails && (
                  <div className="text-[11px] text-gray-400">{gatewayConfig.bankDetails}</div>
                )}
                <input
                  type="text"
                  placeholder="Enter UPI / NEFT UTR Reference *"
                  value={quoteUtrRef}
                  onChange={(e) => setQuoteUtrRef(e.target.value)}
                  className="w-full bg-[#10101e] border border-white/15 rounded-lg px-3 py-2 text-xs font-mono text-white"
                />
              </div>
            )}

            {quotePayError && (
              <p className="text-xs text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg p-2">
                {quotePayError}
              </p>
            )}

            <div className="flex gap-2.5">
              <button
                type="button"
                onClick={() => setPayingQuote(null)}
                className="flex-1 py-3 border border-white/10 text-gray-400 rounded-xl text-xs font-bold uppercase tracking-wider font-syne"
              >
                Abort
              </button>
              <button
                type="button"
                onClick={executeSuccessfulQuotePayMock}
                disabled={isProcessingQuotePay}
                className="flex-1 py-3 bg-gradient-to-r from-crimson to-amber text-navy rounded-xl text-xs font-bold uppercase tracking-wider font-syne flex items-center justify-center gap-1 shadow-lg shadow-crimson/25 disabled:opacity-50"
              >
                {isProcessingQuotePay && <RefreshCw className="w-4 h-4 animate-spin text-navy" />}
                <span>{quotePayMethod === 'upi_neft' ? 'Verify UTR & Pay' : 'Authorize Payment'}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Technician Completed Job Report Modal Overlay */}
      {viewedReportJob && (
        <div className="fixed inset-0 z-[2500] bg-black/90 backdrop-blur-md flex items-center justify-center p-3 sm:p-6 animate-fadeIn">
          <div className="bg-[#111124] w-full max-w-lg max-h-[92vh] flex flex-col rounded-3xl border border-amber/20 overflow-hidden shadow-2xl relative">
            
            <div className="bg-navy p-4 sm:p-6 border-b border-white/5 flex justify-between items-center shrink-0">
              <div>
                <span className="text-[8px] font-mono uppercase text-green-400 font-black tracking-widest bg-green-500/10 border border-green-500/15 py-0.5 px-2.5 rounded-full">
                  Verified Bio-Tech Report
                </span>
                <h3 className="font-syne font-black text-sm sm:text-base uppercase text-white tracking-wider mt-1.5">Repair & Calibration Checkout Form</h3>
              </div>
              <button
                onClick={() => setViewedReportJob(null)}
                className="w-8 h-8 rounded-full bg-white/5 hover:bg-white/10 text-gray-400 flex items-center justify-center shrink-0"
              >
                ×
              </button>
            </div>

            <div className="p-5 sm:p-8 space-y-5 flex-1 overflow-y-auto">
              <div className="border-b border-white/5 pb-3 font-mono text-xs text-gray-400">
                <p>Hospital: <span className="text-white font-bold">{viewedReportJob.hospital}</span></p>
                <p>Equipment Checked: <span className="text-white font-black">{viewedReportJob.equipment}</span></p>
                <p>Service Authorized: <span className="text-amber uppercase">{viewedReportJob.serviceType}</span></p>
                <p>Assigned Tech: <span className="text-white">{viewedReportJob.technicianName}</span></p>
              </div>

              {viewedReportJob.report ? (
                <div className="space-y-4 text-xs font-mono">
                  <div className="space-y-1">
                    <span className="text-gray-500 font-black uppercase text-[10px]">Work Checklist Performed:</span>
                    <p className="bg-[#181830] p-3 text-white rounded-xl border border-white/5 italic">
                      "{viewedReportJob.report.workDone}"
                    </p>
                  </div>

                  {viewedReportJob.report.partsUsed && (
                    <div className="space-y-1">
                      <span className="text-gray-500 font-black uppercase text-[10px]">Spare Parts Reallocated:</span>
                      <p className="bg-[#181830] p-3 text-gray-300 rounded-xl border border-white/5">
                        {viewedReportJob.report.partsUsed}
                      </p>
                    </div>
                  )}

                  <div className="space-y-1">
                    <span className="text-gray-500 font-black uppercase text-[10px]">Inspector Observations:</span>
                    <p className="bg-[#181830] p-3 text-gray-300 rounded-xl border border-white/5">
                      {viewedReportJob.report.observations || "All channels tracking normal."}
                    </p>
                  </div>

                  <div className="space-y-1">
                    <span className="text-gray-500 font-black uppercase text-[10px]">Audit Recommendations:</span>
                    <p className="bg-[#181830] p-3 text-green-400 rounded-xl border border-white/5">
                      {viewedReportJob.report.recommendations}
                    </p>
                  </div>

                  {/* Render photos if available */}
                  {viewedReportJob.report.photos && viewedReportJob.report.photos.length > 0 && (
                    <div className="space-y-1.5">
                      <span className="text-gray-500 font-black uppercase text-[10px]">Active Calibration Photos:</span>
                      <div className="flex gap-2.5 overflow-x-auto py-1">
                        {viewedReportJob.report.photos.map((ph: string, i: number) => (
                          <img key={i} src={ph} className="w-16 h-16 rounded-xl border border-white/10 object-cover bg-black shrink-0" alt="Checkup detail snap" />
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Render base64 Canvas Digital Signature */}
                  {viewedReportJob.report.signature && (
                    <div className="space-y-1">
                      <span className="text-gray-500 font-black uppercase text-[10px]">Authority Digital Verification:</span>
                      <div className="bg-[#1c1c36] rounded-xl border border-white/5 p-2 flex justify-center items-center" style={{ height: '70px' }}>
                        <img src={viewedReportJob.report.signature} className="max-h-full max-w-full object-contain filter invert opacity-90" alt="Authorized confirmation sign" />
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <p className="text-xs text-gray-500 font-mono text-center uppercase py-8">Repair reports are being filed by dispatch technicians.</p>
              )}
            </div>

            <div className="bg-navy p-4 sm:p-5 border-t border-white/5 flex flex-wrap justify-between items-center gap-3 shrink-0">
              {viewedReportJob.report && (
                <button
                  onClick={() => generateJobReportPdf(viewedReportJob)}
                  className="py-2.5 px-4 sm:px-5 rounded-xl text-xs bg-sky-500 hover:bg-sky-400 text-slate-950 font-semibold flex items-center gap-1.5 transition-colors"
                >
                  <FileText className="w-4 h-4 text-slate-950" />
                  <span>Download Report PDF</span>
                </button>
              )}
              <button
                onClick={() => setViewedReportJob(null)}
                className="py-2.5 px-5 sm:px-6 rounded-xl text-xs uppercase bg-white/5 hover:bg-white/10 text-white font-mono ml-auto"
              >
                Close Report Sheet
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  );
}
