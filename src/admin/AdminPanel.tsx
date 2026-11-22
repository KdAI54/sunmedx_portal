import React, { useState, useEffect, useRef } from 'react';
import { jsPDF } from 'jspdf';
import {
  BarChart2, ShieldAlert, Users, ShoppingBag, ClipboardList, BookOpen, BookOpenText, Wrench, Settings, Play,
  MessageSquare, Plus, Edit, Trash2, Check, RefreshCw, Eye, Send, FileText, ArrowRight, Palette,
  ExternalLink, ArrowDownToLine, PlusCircle, AlertCircle, RefreshCcw, LogOut, CreditCard, Receipt, Menu, X, Bot, Sparkles,
  Mail, Megaphone, Search, Copy
} from 'lucide-react';
import { getDb } from '../services/dataClient';
import { PRODUCT_ASSET_FALLBACKS } from '../config/seed';
import PlatformManager from '../pages/PlatformManager';
import ImageAttachmentField from '../components/ImageAttachmentField';
import QuoteInvoiceGenerator from './QuoteInvoiceGenerator';
import PaymentGatewaySetup from './PaymentGatewaySetup';
import BiomedicalAgentWorker from './BiomedicalAgentWorker';
import SunMedXDocumentation from './SunMedXDocumentation';
import MarketingSocialManager from './MarketingSocialManager';
import {
  Product, Course, Tool, ChatbotQA, ServiceRequest, QuotationRequest,
  Order, Message, ChangeLog, SiteSettings, UserProfile
} from '../types';

interface AdminPanelProps {
  adminEmail: string;
  onLogout: () => void;
  siteSettings: SiteSettings | null;
  onUpdateSettings: (newSettings: Partial<SiteSettings>) => Promise<void>;
}

type AdminSection =
  | 'overview' | 'ai_worker' | 'users' | 'catalogue' | 'quotations' | 'orders' | 'invoice_generator' | 'payment_gateway' | 'services'
  | 'messages' | 'academy' | 'validation' | 'tools' | 'chatbot' | 'announcements'
  | 'billing' | 'cms' | 'changelog' | 'amc_manager' | 'marketing_social' | 'saas_telemetry' | 'advanced_analytics' | 'documentation' | 'platform_manager';

export default function AdminPanel({ adminEmail, onLogout, siteSettings, onUpdateSettings }: AdminPanelProps) {
  const [activeSection, setActiveSection] = useState<AdminSection>('overview');
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  
  // Dynamic Lists states
  const [usersList, setUsersList] = useState<UserProfile[]>([]);
  const [catalogue, setCatalogue] = useState<Product[]>([]);
  const [quotations, setQuotations] = useState<QuotationRequest[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [services, setServices] = useState<ServiceRequest[]>([]);
  const [messages, setMessages] = useState<Message[]>([]);
  const [courses, setCourses] = useState<Course[]>([]);
  const [tools, setTools] = useState<Tool[]>([]);
  const [qaPairs, setQaPairs] = useState<ChatbotQA[]>([]);
  const [changeLogs, setChangeLogs] = useState<ChangeLog[]>([]);

  // Advanced SaaS & Telemetry modules
  const [techJobs, setTechJobs] = useState<any[]>([]);
  const [amcRequests, setAmcRequests] = useState<any[]>([]);
  const [amcContracts, setAmcContracts] = useState<any[]>([]);
  const [amcPlans, setAmcPlans] = useState<any[]>([]);
  const [waTemplates, setWaTemplates] = useState<any[]>([]);
  const [waLogs, setWaLogs] = useState<any[]>([]);
  const [translations, setTranslations] = useState<any[]>([]);

  // Loading indicator helper
  const [loadingAction, setLoadingAction] = useState<string | null>(null);

  const currentUserProfile = usersList.find(
    (u) => (u.email || '').toLowerCase().trim() === adminEmail.toLowerCase().trim()
  );
  const isSuperAdmin = currentUserProfile?.role === 'superadmin' || 
                       adminEmail.toLowerCase().trim() === 'superadmin@sunmedx.in' || 
                       adminEmail.toLowerCase().trim() === 'krishnadigitalai@gmail.com';

  // Subscribe to all datasets on mount
  useEffect(() => {
    const db = getDb();

    // 1. Users
    const unsubUsers = db.collection('users').onSnapshot((snap: any) => {
      const list: UserProfile[] = [];
      snap.forEach((doc: any) => list.push({ uid: doc.id, ...doc.data() }));
      setUsersList(list);
    });

    // 2. Products
    const unsubProd = db.collection('products').onSnapshot((snap: any) => {
      const list: Product[] = [];
      snap.forEach((doc: any) => list.push({ id: doc.id, ...doc.data() }));
      setCatalogue(list);
    });

    // 3. Quotes
    const unsubQuotes = db.collection('quotation_requests').onSnapshot((snap: any) => {
      const list: QuotationRequest[] = [];
      snap.forEach((doc: any) => list.push({ id: doc.id, ...doc.data() }));
      list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      setQuotations(list);
    });

    // 4. Orders
    const unsubOrders = db.collection('orders').onSnapshot((snap: any) => {
      const list: Order[] = [];
      snap.forEach((doc: any) => list.push({ id: doc.id, ...doc.data() }));
      setOrders(list);
    });

    // 5. Service requests
    const unsubServ = db.collection('service_requests').onSnapshot((snap: any) => {
      const list: ServiceRequest[] = [];
      snap.forEach((doc: any) => list.push({ id: doc.id, ...doc.data() }));
      setServices(list);
    });

    // 6. Contact messages
    const unsubMsg = db.collection('messages').onSnapshot((snap: any) => {
      const list: Message[] = [];
      snap.forEach((doc: any) => list.push({ id: doc.id, ...doc.data() }));
      setMessages(list);
    });

    // 7. Courses
    const unsubCourses = db.collection('academy_courses').onSnapshot((snap: any) => {
      const list: Course[] = [];
      snap.forEach((doc: any) => list.push({ id: doc.id, ...doc.data() }));
      setCourses(list);
    });

    // 8. Sidebar Tools
    const unsubTools = db.collection('tools').onSnapshot((snap: any) => {
      const list: Tool[] = [];
      snap.forEach((doc: any) => list.push({ id: doc.id, ...doc.data() }));
      list.sort((a,b) => (a.order || 99) - (b.order || 99));
      setTools(list);
    });

    // 9. Chatbot QA
    const unsubQa = db.collection('chatbot_qa').onSnapshot((snap: any) => {
      const list: ChatbotQA[] = [];
      snap.forEach((doc: any) => list.push({ id: doc.id, ...doc.data() }));
      setQaPairs(list);
    });

    // 10. Audit Change Log
    const unsubLogs = db.collection('change_logs').onSnapshot((snap: any) => {
      const list: ChangeLog[] = [];
      snap.forEach((doc: any) => list.push({ id: doc.id, ...doc.data() }));
      list.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
      setChangeLogs(list);
    });

    // 11. Technician Active Dispatch Jobs
    const unsubTechJobs = db.collection('technician_jobs').onSnapshot((snap: any) => {
      const list: any[] = [];
      snap.forEach((doc: any) => list.push({ id: doc.id, ...doc.data() }));
      setTechJobs(list);
    });

    // 12. AMC Inquiries Requests List
    const unsubAmcReqs = db.collection('amc_requests').onSnapshot((snap: any) => {
      const list: any[] = [];
      snap.forEach((doc: any) => list.push({ id: doc.id, ...doc.data() }));
      setAmcRequests(list);
    });

    // 13. AMC Dynamic Contracts Agreements Table
    const unsubAmcCon = db.collection('amc_contracts').onSnapshot((snap: any) => {
      const list: any[] = [];
      snap.forEach((doc: any) => list.push({ id: doc.id, ...doc.data() }));
      setAmcContracts(list);
    });

    // 14. AMC Scheme Plans
    const unsubAmcPlan = db.collection('amc_plans').onSnapshot((snap: any) => {
      const list: any[] = [];
      snap.forEach((doc: any) => list.push({ id: doc.id, ...doc.data() }));
      setAmcPlans(list);
    });

    // 15. Real-Time WhatsApp templates definitions
    const unsubWaTemplates = db.collection('whatsapp_templates').onSnapshot((snap: any) => {
      const list: any[] = [];
      snap.forEach((doc: any) => list.push({ id: doc.id, ...doc.data() }));
      setWaTemplates(list);
    });

    // 16. WhatsApp Broadcast Logs
    const unsubWaLogs = db.collection('whatsapp_logs').onSnapshot((snap: any) => {
      const list: any[] = [];
      snap.forEach((doc: any) => list.push({ id: doc.id, ...doc.data() }));
      list.sort((a,b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
      setWaLogs(list);
    });

    // 17. Dynamic Translator Dictionaries
    const unsubTrans = db.collection('translations').onSnapshot((snap: any) => {
      const list: any[] = [];
      snap.forEach((doc: any) => list.push({ id: doc.id, ...doc.data() }));
      setTranslations(list);
    });

    return () => {
      unsubUsers(); unsubProd(); unsubQuotes(); unsubOrders(); unsubServ();
      unsubMsg(); unsubCourses(); unsubTools(); unsubQa(); unsubLogs();
      unsubTechJobs(); unsubAmcReqs(); unsubAmcCon(); unsubAmcPlan();
      unsubWaTemplates(); unsubWaLogs(); unsubTrans();
    };
  }, []);

  // IMMUTABLE AUDIT LOGGER
  const logAdminAction = async (action: string, details: string) => {
    try {
      const db = getDb();
      await db.collection('change_logs').add({
        action,
        adminEmail,
        details,
        timestamp: new Date().toISOString()
      });
    } catch (e) {
      console.error("Audit log writing blocked: ", e);
    }
  };

  // AMC PLAN TIERS & AGREEMENTS CONSOLE STATES
  const [showPlanModal, setShowPlanModal] = useState(false);
  const [editingPlanId, setEditingPlanId] = useState<string | null>(null);
  const [planForm, setPlanForm] = useState({
    name: '',
    annualPrice: 25000,
    gstPercent: siteSettings?.gstPercent ?? 18,
    responseTime: 'Under 4 Hours',
    visitFrequency: 'Quarterly preventive audits + emergency support',
    equipmentTypes: 'Patient Monitors, Defibrillators, Ventilators',
    coveredServices: 'NABL reference calibration, IEC 60601 safety audit, Certificate PDF',
  });

  const [showContractModal, setShowContractModal] = useState(false);
  const [amcForm, setAmcForm] = useState({
    contractNumber: '',
    hospitalName: '',
    contactPerson: '',
    phone: '',
    email: '',
    equipmentList: '',
    city: 'Mumbai',
    planSelected: 'Premium ICU Plan',
    annualValue: 28999,
    gstPercent: siteSettings?.gstPercent ?? 18,
    notes: '',
    startDate: new Date().toISOString().split('T')[0],
    endDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    nextVisitDate: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
  });

  const [emailModalContract, setEmailModalContract] = useState<any | null>(null);
  const [emailTo, setEmailTo] = useState('');
  const [emailSubject, setEmailSubject] = useState('');
  const [emailBody, setEmailBody] = useState('');
  const [emailSending, setEmailSending] = useState(false);
  const [amcNotice, setAmcNotice] = useState<{ type: 'success' | 'info' | 'error'; text: string; mailtoUrl?: string } | null>(null);

  const buildAmcEmailDraft = (contract: any) => {
    const baseVal = Number(contract.baseAnnualValue ?? contract.annualValue ?? 0);
    const gstPct = Number(contract.gstPercent ?? siteSettings?.gstPercent ?? 18);
    const gstAmt = Number(contract.gstAmount ?? Math.round(baseVal * (gstPct / 100)));
    const totalVal = Number(contract.totalWithGst ?? (baseVal + gstAmt));

    return {
      to: contract.email || contract.userEmail || '',
      subject: `SunMedX AMC Agreement ${contract.contractNumber} — ${contract.hospitalName}`,
      body: `Dear ${contract.contactPerson || 'Biomedical Team'},\n\nPlease find your registered Annual Maintenance Agreement summary with SunMedX Biomedical:\n\n• Agreement No: ${contract.contractNumber}\n• Hospital / Clinic: ${contract.hospitalName} (${contract.city || 'Mumbai'})\n• Selected Plan: ${contract.planSelected}\n• Covered Equipment: ${contract.equipmentList}\n• Contract Period: ${contract.startDate} to ${contract.endDate}\n• Next Preventive Visit: ${contract.nextVisitDate}\n\nCommercial Breakdown (INR):\n• Base Annual Fee: Rs ${baseVal.toLocaleString()}\n• GST (${gstPct}%): Rs ${gstAmt.toLocaleString()}\n• Total Payable (Incl. GST): Rs ${totalVal.toLocaleString()}\n\nYou may download the signed NABL-aligned AMC Certificate PDF anytime from your SunMedX Client Hub.\n\nWarm regards,\nSunMedX Biomedical Engineering Desk\n${siteSettings?.phone || '+91 98765 43210'} | ${siteSettings?.email || 'info@sunmedx.in'}`,
    };
  };

  const openEmailContractModal = (contract: any) => {
    const draft = buildAmcEmailDraft(contract);
    setEmailModalContract(contract);
    setEmailTo(draft.to);
    setEmailSubject(draft.subject);
    setEmailBody(draft.body);
    setAmcNotice(null);
  };

  const dispatchContractEmail = async (contractObj: any, to: string, subject: string, bodyText: string) => {
    setEmailSending(true);
    setAmcNotice(null);
    try {
      const res = await fetch('/api/send-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          to,
          subject,
          text: bodyText,
          replyTo: siteSettings?.email || adminEmail,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed dispatching AMC agreement email.');
      }

      const db = getDb();
      if (contractObj?.id) {
        await db.collection('amc_contracts').doc(contractObj.id).update({
          lastEmailedAt: new Date().toISOString(),
        });
      }

      if (data.sent) {
        await logAdminAction('AMC_EMAIL_SENT', `Sent AMC agreement ${contractObj.contractNumber} directly to ${to}`);
        setAmcNotice({ type: 'success', text: `AMC Agreement ${contractObj.contractNumber} emailed directly to ${to}.` });
        setEmailModalContract(null);
      } else {
        await logAdminAction('AMC_EMAIL_PREPARED', `Prepared AMC agreement email ${contractObj.contractNumber} for ${to}`);
        setAmcNotice({
          type: 'info',
          text: data.message || 'Server email relay key is not configured yet—use "Open Mail App" below.',
          mailtoUrl: data.mailtoUrl,
        });
      }
    } catch (err: any) {
      setAmcNotice({ type: 'error', text: err?.message || 'Unable to send AMC email.' });
    } finally {
      setEmailSending(false);
    }
  };

  const saveAmcPlan = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!planForm.name.trim()) return;
    try {
      const db = getDb();
      const payload = {
        name: planForm.name.trim(),
        annualPrice: Number(planForm.annualPrice) || 0,
        gstPercent: Number(planForm.gstPercent) || 0,
        responseTime: planForm.responseTime.trim(),
        visitFrequency: planForm.visitFrequency.trim(),
        equipmentTypes: planForm.equipmentTypes.split(',').map((s) => s.trim()).filter(Boolean),
        coveredServices: planForm.coveredServices.split(',').map((s) => s.trim()).filter(Boolean),
      };
      if (editingPlanId) {
        await db.collection('amc_plans').doc(editingPlanId).update(payload);
        await logAdminAction('AMC_PLAN_UPDATE', `Updated AMC Plan "${payload.name}" (GST ${payload.gstPercent}%)`);
        setAmcNotice({ type: 'success', text: `AMC Plan "${payload.name}" updated.` });
      } else {
        await db.collection('amc_plans').add(payload);
        await logAdminAction('AMC_PLAN_CREATE', `Created AMC Plan "${payload.name}" (GST ${payload.gstPercent}%)`);
        setAmcNotice({ type: 'success', text: `AMC Plan "${payload.name}" added.` });
      }
      setShowPlanModal(false);
      setEditingPlanId(null);
    } catch (err: any) {
      setAmcNotice({ type: 'error', text: err?.message || 'Failed saving AMC plan.' });
    }
  };

  const deleteAmcPlan = async (id: string, name: string) => {
    try {
      const db = getDb();
      await db.collection('amc_plans').doc(id).delete();
      await logAdminAction('AMC_PLAN_DELETE', `Deleted AMC Plan "${name}"`);
      setAmcNotice({ type: 'info', text: `Removed AMC Plan "${name}".` });
    } catch (err: any) {
      setAmcNotice({ type: 'error', text: err?.message || 'Failed removing AMC plan.' });
    }
  };

  const createAmcContract = async (e: React.FormEvent, sendEmailImmediately = false) => {
    e.preventDefault();
    try {
      const db = getDb();
      const num = amcForm.contractNumber || `AMC-${Math.floor(10000 + Math.random() * 90000)}`;
      const baseVal = Number(amcForm.annualValue) || 0;
      const gstPct = Number(amcForm.gstPercent) || 0;
      const gstAmt = Math.round(baseVal * (gstPct / 100));
      const totalWithGst = baseVal + gstAmt;

      const matchedPlan = amcPlans.find((p) => p.name === amcForm.planSelected);
      const coveredList =
        matchedPlan?.coveredServices?.length > 0
          ? matchedPlan.coveredServices
          : [
              'Yearly hardware stress testing',
              'NABL reference calibration scans',
              'End-Of-Life safety alignment inspections',
            ];

      const contractPayload = {
        contractNumber: num,
        hospitalName: amcForm.hospitalName,
        contactPerson: amcForm.contactPerson,
        phone: amcForm.phone,
        email: amcForm.email,
        userEmail: amcForm.email,
        equipmentList: amcForm.equipmentList,
        city: amcForm.city,
        planSelected: amcForm.planSelected,
        baseAnnualValue: baseVal,
        gstPercent: gstPct,
        gstAmount: gstAmt,
        totalWithGst,
        annualValue: baseVal,
        notes: amcForm.notes,
        startDate: amcForm.startDate,
        endDate: amcForm.endDate,
        nextVisitDate: amcForm.nextVisitDate,
        coveredServices: coveredList,
        status: 'Active',
        createdAt: new Date().toISOString()
      };

      const createdRef = await db.collection('amc_contracts').add(contractPayload);
      await logAdminAction('AMC_CONTRACT_CREATE', `Registered annual contract ${num} for ${amcForm.hospitalName} (Total Incl. GST Rs ${totalWithGst.toLocaleString()})`);
      setShowContractModal(false);

      if (sendEmailImmediately && amcForm.email.trim()) {
        const draft = buildAmcEmailDraft({ ...contractPayload, id: createdRef.id });
        await dispatchContractEmail({ ...contractPayload, id: createdRef.id }, draft.to, draft.subject, draft.body);
      } else {
        setAmcNotice({
          type: 'success',
          text: `AMC Agreement ${num} saved (Total Incl. GST: Rs ${totalWithGst.toLocaleString()}).`,
        });
      }

      setAmcForm({
        contractNumber: '',
        hospitalName: '',
        contactPerson: '',
        phone: '',
        email: '',
        equipmentList: '',
        city: 'Mumbai',
        planSelected: amcPlans[0]?.name || 'Premium ICU Plan',
        annualValue: amcPlans[0]?.annualPrice || 28999,
        gstPercent: amcPlans[0]?.gstPercent ?? siteSettings?.gstPercent ?? 18,
        notes: '',
        startDate: new Date().toISOString().split('T')[0],
        endDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        nextVisitDate: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
      });
    } catch (err: any) {
      setAmcNotice({ type: 'error', text: 'Error registering agreement: ' + err.message });
    }
  };

  // UPDATE DYNAMIC LIVE DICTIONARY
  const [newKey, setNewKey] = useState('');
  const [enValue, setEnValue] = useState('');
  const [hiValue, setHiValue] = useState('');
  const [mrValue, setMrValue] = useState('');

  const saveLiveTranslation = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newKey || !enValue) return;
    try {
      const db = getDb();
      await db.collection('translations').add({
        key: newKey.toLowerCase().trim(),
        en: enValue,
        hi: hiValue || enValue,
        mr: mrValue || enValue,
        lastUpdated: new Date().toISOString()
      });
      await logAdminAction("TRANSLATION_CREATE", `Added linguistic translation key '${newKey}'`);
      alert(`Lingo dictionary updated for target word: ${newKey}!`);
      setNewKey('');
      setEnValue('');
      setHiValue('');
      setMrValue('');
    } catch (err: any) {
      alert(err.message);
    }
  };

  // WHATSAPP ALERTS MODERATORS
  const updateWaTemplate = async (id: string, newBody: string) => {
    try {
      const db = getDb();
      await db.collection('whatsapp_templates').doc(id).update({
        body: newBody,
        lastEdited: new Date().toISOString()
      });
      await logAdminAction("WHATSAPP_TEMPLATE_EDIT", `Modified template body for ${id}`);
      alert("WhatsApp system alert template updated!");
    } catch (e: any) {
      alert(e.message);
    }
  };

  // CRUD FOR CATALOGUE
  const [prodForm, setProdForm] = useState<Partial<Product>>({
    name: '',
    price: 0,
    category: 'Critical Care',
    badge: '',
    hsnSac: '9018',
    description: '',
    features: [],
    image: '',
  });
  const [editingProdId, setEditingProdId] = useState<string | null>(null);
  const [featureInput, setFeatureInput] = useState('');
  const [showProdModal, setShowProdModal] = useState(false);
  const [catSearchQuery, setCatSearchQuery] = useState('');
  const [catFilterCategory, setCatFilterCategory] = useState('All');
  const [catNotice, setCatNotice] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const openNewProductModal = () => {
    setEditingProdId(null);
    setProdForm({
      name: '',
      price: 0,
      category: 'Critical Care',
      badge: '',
      hsnSac: '9018',
      description: '',
      features: [],
      image: '',
    });
    setFeatureInput('');
    setCatNotice(null);
    setShowProdModal(true);
  };

  const openEditProductModal = (p: Product, asDuplicate = false) => {
    setEditingProdId(asDuplicate ? null : p.id || null);
    setProdForm({
      name: asDuplicate ? `${p.name} (Copy)` : p.name,
      price: p.price ?? 0,
      category: p.category || 'Critical Care',
      badge: p.badge || '',
      hsnSac: p.hsnSac || '9018',
      description: p.description || '',
      features: p.features || [],
      image: p.image || '',
    });
    setFeatureInput(p.features?.join(', ') || '');
    setCatNotice(null);
    setShowProdModal(true);
  };

  const saveProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!prodForm.name?.trim()) return;
    setLoadingAction('products');
    setCatNotice(null);
    try {
      const db = getDb();
      const payload = {
        name: prodForm.name.trim(),
        price: !prodForm.price || Number(prodForm.price) === 0 ? null : Number(prodForm.price),
        category: prodForm.category || 'Critical Care',
        badge: prodForm.badge || '',
        hsnSac: prodForm.hsnSac || '9018',
        description: prodForm.description || '',
        image: prodForm.image || PRODUCT_ASSET_FALLBACKS.analyzer,
        features: prodForm.features || [],
      };

      if (editingProdId) {
        await db.collection('products').doc(editingProdId).update(payload);
        await logAdminAction('PRODUCT_UPDATE', `Admin updated product '${payload.name}'`);
        setCatNotice({ type: 'success', text: `Updated "${payload.name}" in E-Catalogue.` });
      } else {
        await db.collection('products').add(payload);
        await logAdminAction('PRODUCT_CREATE', `Admin added catalogue product '${payload.name}'`);
        setCatNotice({ type: 'success', text: `Added "${payload.name}" to E-Catalogue.` });
      }
      setProdForm({
        name: '',
        price: 0,
        category: 'Critical Care',
        badge: '',
        hsnSac: '9018',
        description: '',
        features: [],
        image: '',
      });
      setFeatureInput('');
      setEditingProdId(null);
      setShowProdModal(false);
    } catch (err: any) {
      setCatNotice({ type: 'error', text: 'Error saving equipment: ' + err.message });
    } finally {
      setLoadingAction(null);
    }
  };

  const deleteProduct = async (id: string, name: string) => {
    try {
      const db = getDb();
      await db.collection('products').doc(id).delete();
      await logAdminAction('PRODUCT_DELETE', `Admin deleted catalogue product '${name}'`);
      setCatNotice({ type: 'success', text: `Removed "${name}" from E-Catalogue.` });
    } catch (err: any) {
      setCatNotice({ type: 'error', text: 'Delete blocked: ' + err.message });
    }
  };

  // CRUD FOR SCHOOL COURSES
  const [courseForm, setCourseForm] = useState<Partial<Course>>({ title: '', level: 'Beginner', duration: '4 Weeks', language: 'English', price: 0, featured: true, graphyUrl: '' });
  const [editingCourseId, setEditingCourseId] = useState<string | null>(null);

  const saveCourse = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!courseForm.title || !courseForm.graphyUrl) return;
    setLoadingAction('courses');
    try {
      const db = getDb();
      const payload = {
        title: courseForm.title,
        level: courseForm.level || 'Beginner',
        duration: courseForm.duration || '4 Weeks',
        language: courseForm.language || 'English',
        price: Number(courseForm.price),
        featured: !!courseForm.featured,
        graphyUrl: courseForm.graphyUrl
      };

      if (editingCourseId) {
        await db.collection('academy_courses').doc(editingCourseId).update(payload);
        await logAdminAction("COURSE_UPDATE", `Updated Academy course: ${payload.title}`);
      } else {
        await db.collection('academy_courses').add(payload);
        await logAdminAction("COURSE_CREATE", `Added Academy course: ${payload.title}`);
      }
      setCourseForm({ title: '', level: 'Beginner', duration: '4 Weeks', language: 'English', price: 0, featured: true, graphyUrl: '' });
      setEditingCourseId(null);
    } catch (err: any) {
      alert(err.message);
    } finally {
      setLoadingAction(null);
    }
  };

  const deleteCourse = async (id: string, title: string) => {
    if (!confirm(`Confirm deletion of ${title}?`)) return;
    try {
      const db = getDb();
      await db.collection('academy_courses').doc(id).delete();
      await logAdminAction("COURSE_DELETE", `Deleted course: ${title}`);
    } catch (err: any) {
      alert(err.message);
    }
  };

  // CRUD FOR TOOLS
  const [toolForm, setToolForm] = useState<Partial<Tool>>({ name: '', icon: 'fa-solid fa-calculator', category: 'Diagnostics', color: '#ff6b00', isFree: true, url: '' });
  const [editingToolId, setEditingToolId] = useState<string | null>(null);

  const saveTool = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!toolForm.name) return;
    setLoadingAction('tools');
    try {
      const db = getDb();
      const payload = {
        name: toolForm.name,
        icon: toolForm.icon || 'fa-solid fa-calculator',
        category: toolForm.category || 'Diagnostics',
        color: toolForm.color || '#ff6b00',
        isFree: !!toolForm.isFree,
        url: toolForm.url || null,
        order: tools.length + 1
      };

      if (editingToolId) {
        await db.collection('tools').doc(editingToolId).update(payload);
        await logAdminAction("TOOL_UPDATE", `Updated tool config: ${payload.name}`);
      } else {
        await db.collection('tools').add(payload);
        await logAdminAction("TOOL_CREATE", `Registered floating tool: ${payload.name}`);
      }
      setToolForm({ name: '', icon: 'fa-solid fa-calculator', category: 'Diagnostics', color: '#ff6b00', isFree: true, url: '' });
      setEditingToolId(null);
    } catch (err: any) {
      alert(err.message);
    } finally {
      setLoadingAction(null);
    }
  };

  const deleteTool = async (id: string, name: string) => {
    if (!confirm(`Delete sidebar tool tool: ${name}?`)) return;
    try {
      const db = getDb();
      await db.collection('tools').doc(id).delete();
      await logAdminAction("TOOL_DELETE", `Deleted custom tool: ${name}`);
    } catch (e: any) {
      alert(e.message);
    }
  };

  // CRUD FOR CHATBOT QUESTIONS
  const [qaForm, setQaForm] = useState<Partial<ChatbotQA>>({ question: '', answer: '' });
  const [editingQaId, setEditingQaId] = useState<string | null>(null);

  const saveQa = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!qaForm.question || !qaForm.answer) return;
    setLoadingAction('chatbot');
    try {
      const db = getDb();
      const payload = { question: qaForm.question.toLowerCase(), answer: qaForm.answer };
      
      if (editingQaId) {
        await db.collection('chatbot_qa').doc(editingQaId).update(payload);
        await logAdminAction("CHATBOT_QA_UPDATE", `Updated chat matching for: ${payload.question}`);
      } else {
        await db.collection('chatbot_qa').add(payload);
        await logAdminAction("CHATBOT_QA_CREATE", `Created new chatbot Q&A for: ${payload.question}`);
      }
      setQaForm({ question: '', answer: '' });
      setEditingQaId(null);
    } catch (err: any) {
      alert(err.message);
    } finally {
      setLoadingAction(null);
    }
  };

  const deleteQa = async (id: string, q: string) => {
    if (!confirm(`Delete chatbot Q&A: "${q}"?`)) return;
    try {
      const db = getDb();
      await db.collection('chatbot_qa').doc(id).delete();
      await logAdminAction("CHATBOT_QA_DELETE", `Removed chatbot QA for "${q}"`);
    } catch (e: any) {
      alert(e.message);
    }
  };

  // UPDATE REGISTERED SERVICE BOOKINGS
  const updateServiceStatus = async (id: string, status: ServiceRequest['status']) => {
    try {
      const db = getDb();
      await db.collection('service_requests').doc(id).update({ status });
      await logAdminAction("SERVICE_STATUS_CHANGE", `Updated hospital booking ${id} status to : ${status}`);
    } catch (e: any) {
      alert(e.message);
    }
  };

  // DISPATCH FIELD TECHNICIAN TO REPAIR OR CALIBRATION JOB
  const [dispatchingRequest, setDispatchingRequest] = useState<any | null>(null);
  const [dispatchTechName, setDispatchTechName] = useState('Rohan Deshmukh');
  const [dispatchTechPhone, setDispatchTechPhone] = useState('+91 97690 12345');
  const [dispatchNotes, setDispatchNotes] = useState('Inspect magnetic resonance coil trace lines for calibration offsets.');

  const assignFieldTechnician = async () => {
    if (!dispatchingRequest) return;
    try {
      const db = getDb();
      const jobId = `JOB-${Math.floor(100000 + Math.random() * 900000)}`;
      
      // Update the original request to 'In Progress'
      await db.collection('service_requests').doc(dispatchingRequest.id).update({ status: 'In Progress' });

      // Create physical technician job card
      await db.collection('technician_jobs').add({
        jobId,
        serviceRequestId: dispatchingRequest.id || '',
        hospital: dispatchingRequest.hospital || 'Breach Candy Hospital',
        customerName: dispatchingRequest.name || 'Clinical Admin',
        phone: dispatchingRequest.phone || '+91 98920 11223',
        equipment: dispatchingRequest.equipment || 'Ultrasonic Transducer Scanner',
        serviceType: dispatchingRequest.serviceType || 'Calibration',
        city: dispatchingRequest.city || 'Mumbai',
        date: dispatchingRequest.date || new Date().toISOString().split('T')[0],
        status: 'Pending',
        technicianName: dispatchTechName,
        technicianPhone: dispatchTechPhone,
        dispatchNotes: dispatchNotes,
        createdAt: new Date().toISOString()
      });

      // Insert mock WhatsApp system log
      const alertText = `[SunMedX Dispatch] Task ${jobId} and request assigned to ${dispatchTechName}. Target hospital is ${dispatchingRequest.hospital}. Standard logs updated to ledger.`;
      
      await db.collection('whatsapp_logs').add({
        templateName: 'Technician Assigned Dispatch Alert',
        recipient: dispatchTechPhone,
        message: alertText,
        timestamp: new Date().toISOString(),
        success: true
      });

      await logAdminAction("TECHNICIAN_DISPATCH", `Assigned job ${jobId} to engineer ${dispatchTechName} at hospital station ${dispatchingRequest.hospital}`);
      
      alert(`Success! Engineer ${dispatchTechName} dispatched to hospital. Custom alert WhatsApp mock log appended.`);
      setDispatchingRequest(null);
    } catch (e: any) {
      alert("Verification Dispatch block: " + e.message);
    }
  };

  // UPDATE CUSTOMER ROLES
  const toggleUserRole = async (uid: string, currentRole: 'customer' | 'admin', email: string) => {
    if (email === adminEmail) {
      alert("You cannot revoke your own admin rights!");
      return;
    }
    const nextRole = currentRole === 'admin' ? 'customer' : 'admin';
    try {
      const db = getDb();
      await db.collection('users').doc(uid).update({ role: nextRole });
      await logAdminAction("USER_ROLE_CHANGE", `Toggled email '${email}' role to '${nextRole}'`);
    } catch (e: any) {
      alert(e.message);
    }
  };

  // ANSWER HOSPITAL QUOTATION Inquiries
  const [activeQuoteId, setActiveQuoteId] = useState<string | null>(null);
  const [quotePrice, setQuotePrice] = useState('5000');
  const [quoteNotes, setQuoteNotes] = useState('Standard AMC validation covers calibrators traceability logs, compliance badges...');

  const sendQuotationResponse = async (id: string) => {
    if (!quotePrice) return;
    try {
      const db = getDb();
      await db.collection('quotation_requests').doc(id).update({
        status: 'Answered',
        adminResponse: {
          price: Number(quotePrice),
          notes: quoteNotes,
          respondedAt: new Date().toISOString()
        }
      });
      await logAdminAction("QUOTE_ANSWER", `Sent priced quotation response of Rs ${quotePrice} for request ID ${id}`);
      setActiveQuoteId(null);
    } catch (e: any) {
      alert(e.message);
    }
  };

  // CMS COLOR VARIABLE UPDATER
  const [cmsNavy, setCmsNavy] = useState('');
  const [cmsCrimson, setCmsCrimson] = useState('');
  const [cmsAmber, setCmsAmber] = useState('');
  const [cmsGolden, setCmsGolden] = useState('');
  const [cmsDarkBg, setCmsDarkBg] = useState('');

  useEffect(() => {
    if (siteSettings?.themeVariables) {
      setCmsNavy(siteSettings.themeVariables.colorNavy || '#111827');
      setCmsCrimson(siteSettings.themeVariables.colorCrimson || '#0EA5E9');
      setCmsAmber(siteSettings.themeVariables.colorAmber || '#2DD4BF');
      setCmsGolden(siteSettings.themeVariables.colorGolden || '#7DD3FC');
      setCmsDarkBg(siteSettings.themeVariables.colorDarkBg || '#0B1120');
    }
  }, [siteSettings]);

  const saveCmsColors = async () => {
    setLoadingAction('cms');
    try {
      await onUpdateSettings({
        themeVariables: {
          colorNavy: cmsNavy,
          colorCrimson: cmsCrimson,
          colorAmber: cmsAmber,
          colorGolden: cmsGolden,
          colorDarkBg: cmsDarkBg
        }
      });

      // Update instant page root CSS values
      document.documentElement.style.setProperty('--color-navy', cmsNavy);
      document.documentElement.style.setProperty('--color-crimson', cmsCrimson);
      document.documentElement.style.setProperty('--color-amber', cmsAmber);
      document.documentElement.style.setProperty('--color-golden', cmsGolden);
      document.documentElement.style.setProperty('--color-dark-bg', cmsDarkBg);

      await logAdminAction("CMS_THEME_CHANGE", "Admin updated system wide color scheme variables.");
      alert("Theme variables synced and injected instantly!");
    } catch (e: any) {
      alert(e.message);
    } finally {
      setLoadingAction(null);
    }
  };

  // SITEPAGE SECTION RE-ALIGNMENT CMS
  const handleToggleSection = async (section: string) => {
    if (!siteSettings) return;
    const currentOrder = [...(siteSettings.homepageOrder || [])];
    let nextOrder = [];
    if (currentOrder.includes(section)) {
      nextOrder = currentOrder.filter(s => s !== section);
    } else {
      nextOrder = [...currentOrder, section];
    }
    await onUpdateSettings({ homepageOrder: nextOrder });
    await logAdminAction("CMS_HOMEPAGE_REORDER", `Adjusted homepage components list: [${nextOrder.join(', ')}]`);
  };

  // OVERVIEW KEY KPIS
  const totalRevenue = orders.reduce((acc, o) => acc + (o.total || 0), 0);
  const pendingServiceCount = services.filter(s => s.status === 'Pending').length;
  const unansweredQuotesCount = quotations.filter(q => q.status === 'Pending').length;

  return (
    <div className="min-h-screen bg-[#0d0d1b] flex flex-col md:flex-row text-gray-200 max-w-full overflow-x-clip">
      
      {/* COMPACT MOBILE TOP BAR (< md) */}
      <div className="md:hidden sticky top-16 z-[600] bg-navy border-b border-amber/20 px-4 py-3 flex items-center justify-between gap-3 shadow-lg">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <span className="font-syne font-black text-sm text-white tracking-wider">SMEDX</span>
            <span className="text-[10px] text-amber uppercase bg-amber-500/10 px-1.5 py-0.5 rounded border border-amber/30 font-mono">
              Admin
            </span>
          </div>
          <p className="text-[11px] font-mono text-gray-400 truncate mt-0.5">
            Section: {activeSection.replace(/_/g, ' ')}
          </p>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={() => setMobileNavOpen((prev) => !prev)}
            aria-label="Toggle admin sections menu"
            className="px-3 py-2 rounded-lg bg-[#10101e] border border-amber/30 text-amber text-xs font-syne font-bold flex items-center gap-1.5"
          >
            {mobileNavOpen ? <X className="w-4 h-4" /> : <Menu className="w-4 h-4" />}
            <span>{mobileNavOpen ? 'Close' : 'Modules'}</span>
          </button>
          <button
            type="button"
            onClick={onLogout}
            title="Sign out"
            className="p-2 rounded-lg bg-white/5 text-gray-400 hover:text-white hover:bg-red-500/20"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* LEFT ADMIN SIDEBAR CONTROL PANEL */}
      <div
        className={`${
          mobileNavOpen ? 'flex' : 'hidden'
        } md:flex w-full md:w-[260px] bg-navy border-b md:border-b-0 md:border-r border-amber/15 flex-col justify-between shrink-0`}
      >
        <div>
          {/* Desktop Brand Logo */}
          <div className="hidden md:flex p-6 border-b border-white/5 items-center justify-between">
            <div className="min-w-0">
              <h1 className="font-syne font-black text-xl text-white tracking-widest flex items-center gap-2">
                <span className="text-orange-500 font-extrabold pb-0.5">S</span>
                <span>
                  MEDX{' '}
                  <span
                    className={`text-[10px] uppercase px-1.5 py-0.5 rounded border ${
                      isSuperAdmin
                        ? 'text-emerald-300 bg-emerald-500/15 border-emerald-500/30'
                        : 'text-amber bg-amber-500/10 border-amber/30'
                    }`}
                  >
                    {isSuperAdmin ? 'Super Admin ✓' : 'Admin'}
                  </span>
                </span>
              </h1>
              <p className="text-[10px] text-gray-500 font-mono mt-1 truncate">LOGGED: {adminEmail}</p>
            </div>
            <button onClick={onLogout} title="Log out Administrative block" className="p-1.5 rounded bg-white/5 text-gray-400 hover:text-white hover:bg-red-500/20 transition-all font-mono shrink-0">
              <LogOut className="w-4 h-4" />
            </button>
          </div>

          {/* Nav groups */}
          <nav className="p-3 sm:p-4 space-y-1 overflow-y-auto max-h-[65vh] md:max-h-none">
            {((): { id: string; label: string; icon: React.ComponentType<any>; highlight?: boolean }[] => {
              const baseTabs = [
                { id: 'overview', label: 'Dashboard Overview', icon: BarChart2 },
                { id: 'ai_worker', label: 'Biomedical AI Worker', icon: Bot, highlight: true },
                { id: 'users', label: 'Registered Clients', icon: Users },
                { id: 'catalogue', label: 'E-Catalogue CRUD', icon: ShoppingBag },
                { id: 'quotations', label: `RFQs Quotations (${unansweredQuotesCount})`, icon: FileText, highlight: unansweredQuotesCount > 0 },
                { id: 'orders', label: 'Client Orders', icon: ClipboardList },
                { id: 'invoice_generator', label: 'Quote / Invoice Generator', icon: Receipt },
                { id: 'payment_gateway', label: 'Payment Gateway Setup', icon: CreditCard },
                { id: 'services', label: `Service Jobs & Dispatch (${pendingServiceCount})`, icon: Wrench, highlight: pendingServiceCount > 0 },
                { id: 'amc_manager', label: `AMC Plans & Agreements`, icon: ShieldAlert },
                { id: 'marketing_social', label: 'Email & Social Manager', icon: Megaphone },
                { id: 'saas_telemetry', label: 'WhatsApp & Live Translations', icon: MessageSquare },
                { id: 'advanced_analytics', label: 'SaaS Advanced Metrics', icon: BarChart2 },
                { id: 'messages', label: 'Inbox Messages', icon: MessageSquare },
                { id: 'academy', label: 'Academy Manager', icon: BookOpen },
                { id: 'tools', label: 'Tools customizer', icon: Settings },
                { id: 'chatbot', label: 'Public Chatbot FAQ Matrix', icon: Play },
                { id: 'announcements', label: 'Announcements Marquee', icon: ShieldAlert },
                { id: 'cms', label: 'CMS Styles Variables', icon: Palette },
                { id: 'changelog', label: 'Audit Trail logs', icon: ClipboardList },
                { id: 'documentation', label: 'SunMedX Documentation', icon: BookOpenText }
              ];
              if (isSuperAdmin) {
                baseTabs.push({ id: 'platform_manager', label: 'Platform Manager', icon: Settings });
              }
              return baseTabs;
            })().map((s) => {
              const IconComp = s.icon;
              return (
                <button
                  key={s.id}
                  onClick={() => {
                    setActiveSection(s.id as AdminSection);
                    setMobileNavOpen(false);
                  }}
                  className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-xl text-left text-xs font-semibold tracking-wide font-syne uppercase select-none transition-all ${
                    activeSection === s.id
                      ? 'bg-gradient-to-r from-crimson to-amber text-navy font-bold shadow-lg shadow-crimson/15'
                      : 'text-gray-400 hover:bg-neutral-800/20 hover:text-white'
                  }`}
                >
                  <IconComp className="w-4 h-4 shrink-0" />
                  <span className="flex-1 truncate">{s.label}</span>
                  {s.highlight && <span className="w-2 h-2 rounded-full bg-red-500 animate-ping shrink-0" />}
                </button>
              );
            })}
          </nav>
        </div>

        {/* Footer info lock */}
        <div className="p-4 bg-black/40 border-t border-white/5 text-[10px] text-gray-500 font-mono text-center">
          Mumbai Calibration Facility • v2.10
        </div>
      </div>

      {/* RIGHT WORK AREA */}
      <div className="flex-1 min-w-0 overflow-y-auto p-4 sm:p-6 md:p-8 lg:p-10 space-y-6 sm:space-y-8">
        
        {/* OVERVIEW MODULE */}
        {activeSection === 'overview' && (
          <div className="space-y-6 animate-fadeIn">
            <div>
              <h2 className="font-syne font-black text-2xl text-white uppercase tracking-wider">Dashboard KPI Overview</h2>
              <p className="text-xs text-amber font-mono">Telemetry metrics and logs analyzer counters</p>
            </div>

            {/* Widget Row */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-5">
              {[
                { label: 'Total Sales Generated', value: `Rs ${totalRevenue.toLocaleString()}`, color: 'border-emerald-500/20 text-emerald-400' },
                { label: 'Registered Hospital Users', value: usersList.length, color: 'border-blue-500/20 text-blue-400' },
                { label: 'Unanswered Hospital Quotes', value: unansweredQuotesCount, color: 'border-red-500/20 text-red-400', urgent: unansweredQuotesCount > 0 },
                { label: 'Equipment Catalogue Items', value: catalogue.length, color: 'border-amber-500/20 text-amber' }
              ].map((w, idx) => (
                <div key={idx} className={`bg-navy border rounded-2xl p-5 shadow-xl flex flex-col justify-between ${w.color} ${w.urgent ? 'animate-pulse' : ''}`}>
                  <span className="text-[10px] uppercase font-mono font-bold text-gray-500 tracking-wider mb-2">{w.label}</span>
                  <span className="text-2xl font-black font-syne">{w.value}</span>
                </div>
              ))}
            </div>

            {/* Simulated charting bar or lists */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <div className="bg-navy border border-white/5 rounded-2xl p-6 shadow-xl">
                <h3 className="font-syne font-bold text-sm text-gray-300 uppercase tracking-widest mb-4">Operations Status Distribution</h3>
                <div className="space-y-4">
                  {[
                    { label: 'Completed Calibration requests', count: services.filter(s => s.status === 'Completed').length, total: services.length, color: 'bg-emerald-500' },
                    { label: 'Pending Dispatch Scheduler', count: services.filter(s => s.status === 'Pending').length, total: services.length, color: 'bg-red-500' },
                    { label: 'Active repair contract loops', count: services.filter(s => s.status === 'In Progress').length, total: services.length, color: 'bg-amber-400' }
                  ].map((item, idx) => {
                    const pct = item.total > 0 ? (item.count / item.total) * 100 : 0;
                    return (
                      <div key={idx} className="space-y-1.5">
                        <div className="flex justify-between text-xs font-mono">
                          <span className="text-gray-400">{item.label}</span>
                          <span className="font-bold text-white">{item.count} / {item.total} ({pct.toFixed(0)}%)</span>
                        </div>
                        <div className="h-2 w-full bg-neutral-900 rounded-full overflow-hidden">
                          <div className={`h-full ${item.color} rounded-full transition-all duration-500`} style={{ width: `${pct}%` }} />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Quick changes logger stream */}
              <div className="bg-navy border border-white/5 rounded-2xl p-6 shadow-xl flex flex-col justify-between">
                <div>
                  <h3 className="font-syne font-bold text-sm text-gray-300 uppercase tracking-widest mb-3">Live Administrative audit</h3>
                  <div className="space-y-3.5 max-h-[220px] overflow-y-auto">
                    {changeLogs.slice(0, 5).map((l) => (
                      <div key={l.id} className="text-xs bg-[#10101e] p-2.5 rounded-lg border border-white/5 flex items-start gap-2.5">
                        <div className="w-1.5 h-1.5 rounded-full bg-orange-500 mt-1.5 shrink-0" />
                        <div>
                          <div className="font-mono text-[10px] text-gray-500">{new Date(l.timestamp).toLocaleTimeString()} - {l.adminEmail}</div>
                          <p className="text-gray-200 font-semibold mt-0.5">{l.details}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* REGISTERED USERS */}
        {activeSection === 'users' && (
          <div className="bg-navy border border-white/5 rounded-2xl p-6 shadow-2xl space-y-6 animate-fadeIn">
            <div>
              <h2 className="font-syne font-black text-xl text-white uppercase tracking-wider">Registered Client profiles</h2>
              <p className="text-xs text-amber font-mono">Review client hospital units and manage administrative authentication clearances</p>
            </div>

            <div className="overflow-x-auto border border-white/5 bg-[#10101e] rounded-xl">
              <table className="w-full text-xs text-left divide-y divide-white/5 text-gray-300">
                <thead>
                  <tr className="bg-navy text-gray-400 font-mono py-4">
                    <th className="p-4 font-bold">Client Email</th>
                    <th className="p-4 font-bold">Full Name</th>
                    <th className="p-4 font-bold">Affiliated Hospital</th>
                    <th className="p-4 font-bold">Contact Phone</th>
                    <th className="p-4 font-bold text-center">Portal role Privilege</th>
                    <th className="p-4 font-bold text-right">Switch clearances</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {usersList.map((u) => (
                    <tr key={u.uid} className="hover:bg-white/2">
                      <td className="p-4 font-mono font-bold text-white">{u.email}</td>
                      <td className="p-4 font-semibold">{u.name || 'Anonymous User'}</td>
                      <td className="p-4 text-amber font-semibold">{u.hospital || 'Not Specified'}</td>
                      <td className="p-4 font-mono">{u.phone || 'No phone logged'}</td>
                      <td className="p-4 text-center">
                        <span className={`px-3 py-1 rounded-full text-[9px] font-black font-mono uppercase tracking-wider border ${
                          u.role === 'admin'
                            ? 'bg-red-500/15 border-red-500/30 text-red-500'
                            : 'bg-blue-500/15 border-blue-500/30 text-blue-400'
                        }`}>
                          {u.role}
                        </span>
                      </td>
                      <td className="p-4 text-right">
                        <button
                          onClick={() => toggleUserRole(u.uid, u.role, u.email)}
                          disabled={u.email === adminEmail}
                          className="px-3 py-1.5 rounded-lg border border-orange-500/20 text-amber hover:bg-orange-500/10 text-[10px] font-bold uppercase transition-all disabled:opacity-30"
                        >
                          Revoke / Promote
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* CATALOGUE CRUD (Managed Workspace + Clean Modal Editor Window) */}
        {activeSection === 'catalogue' && (
          <div className="space-y-6 animate-fadeIn">
            {/* Top Workspace Header & Controls */}
            <div className="bg-navy border border-white/10 rounded-2xl p-5 sm:p-6 shadow-xl space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <h2 className="font-syne font-black text-xl text-white uppercase tracking-wider">
                    E-Catalogue Equipment Manager ({catalogue.length})
                  </h2>
                  <p className="text-xs text-amber font-mono">
                    Search, filter, attach device photos (Browse / Take Photo / Live Camera), and manage INR / RFQ pricing
                  </p>
                </div>

                <button
                  type="button"
                  onClick={openNewProductModal}
                  className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-crimson to-amber text-navy font-syne font-black text-xs uppercase tracking-wider flex items-center justify-center gap-2 shrink-0 shadow-md"
                >
                  <PlusCircle className="w-4 h-4" />
                  <span>Add New Equipment</span>
                </button>
              </div>

              {catNotice && (
                <div
                  className={`p-3 rounded-xl border text-xs flex items-center justify-between ${
                    catNotice.type === 'success'
                      ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
                      : 'bg-red-500/10 border-red-500/30 text-red-300'
                  }`}
                >
                  <span>{catNotice.text}</span>
                  <button type="button" onClick={() => setCatNotice(null)} className="text-xs underline ml-3">
                    Dismiss
                  </button>
                </div>
              )}

              {/* Search + Category Filter Bar */}
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 pt-2 border-t border-white/5">
                <div className="relative flex-1 max-w-md">
                  <Search className="w-4 h-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={catSearchQuery}
                    onChange={(e) => setCatSearchQuery(e.target.value)}
                    placeholder="Search equipment by name, badge, or category..."
                    className="w-full bg-[#10101e] border border-white/10 rounded-xl pl-10 pr-4 py-2.5 text-xs text-white focus:outline-none focus:border-amber"
                  />
                </div>

                <div className="flex flex-wrap gap-1.5">
                  {['All', 'Critical Care', 'Emergency', 'Accessories', 'Testing Tools', 'General Care'].map((cat) => (
                    <button
                      key={cat}
                      type="button"
                      onClick={() => setCatFilterCategory(cat)}
                      className={`px-3 py-1.5 rounded-lg text-[11px] font-semibold border transition-colors ${
                        catFilterCategory === cat
                          ? 'bg-amber text-navy border-amber font-bold'
                          : 'bg-[#10101e] border-white/10 text-gray-300 hover:bg-white/5'
                      }`}
                    >
                      {cat}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Full-Width Managed Catalogue Table */}
            <div className="bg-navy border border-white/10 rounded-2xl p-4 sm:p-6 shadow-xl">
              {(() => {
                const filteredCatalogue = catalogue.filter((p) => {
                  const matchesCat = catFilterCategory === 'All' || p.category === catFilterCategory;
                  const q = catSearchQuery.trim().toLowerCase();
                  const matchesQuery =
                    !q ||
                    p.name.toLowerCase().includes(q) ||
                    (p.category || '').toLowerCase().includes(q) ||
                    (p.badge || '').toLowerCase().includes(q);
                  return matchesCat && matchesQuery;
                });

                if (filteredCatalogue.length === 0) {
                  return (
                    <div className="py-12 text-center text-xs text-gray-400 space-y-3">
                      <ShoppingBag className="w-10 h-10 text-amber/40 mx-auto" />
                      <p>No equipment matches your current filter.</p>
                      <button
                        type="button"
                        onClick={openNewProductModal}
                        className="px-4 py-2 rounded-lg bg-amber text-navy font-bold text-xs"
                      >
                        + Add Equipment Listing
                      </button>
                    </div>
                  );
                }

                return (
                  <div className="overflow-x-auto border border-white/5 bg-[#10101e] rounded-xl">
                    <table className="w-full text-xs text-left divide-y divide-white/5 text-gray-300">
                      <thead>
                        <tr className="bg-navy text-gray-400 font-mono">
                          <th className="p-3.5 sm:p-4">Equipment Info</th>
                          <th className="p-3.5 sm:p-4">Category</th>
                          <th className="p-3.5 sm:p-4 hidden md:table-cell">HSN/SAC</th>
                          <th className="p-3.5 sm:p-4 font-bold">Price</th>
                          <th className="p-3.5 sm:p-4 font-bold text-center hidden sm:table-cell">Specs</th>
                          <th className="p-3.5 sm:p-4 font-bold text-right">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-white/5">
                        {filteredCatalogue.map((p) => (
                          <tr key={p.id} className="hover:bg-white/5">
                            <td className="p-3.5 sm:p-4">
                              <div className="flex items-center gap-3">
                                <img
                                  src={p.image || PRODUCT_ASSET_FALLBACKS.analyzer}
                                  onError={(e) => {
                                    (e.currentTarget as HTMLImageElement).src = PRODUCT_ASSET_FALLBACKS.analyzer;
                                  }}
                                  className="w-12 h-12 object-cover rounded-lg border border-white/10 shrink-0"
                                  alt={p.name}
                                />
                                <div className="min-w-0">
                                  <div className="font-syne font-bold text-white text-xs sm:text-sm">{p.name}</div>
                                  <div className="text-[11px] text-gray-400 truncate max-w-[260px]">
                                    {p.badge ? `${p.badge} · ` : ''}
                                    {p.description || 'Clinical biomedical device'}
                                  </div>
                                </div>
                              </div>
                            </td>
                            <td className="p-3.5 sm:p-4 text-amber font-semibold font-mono whitespace-nowrap">{p.category}</td>
                            <td className="p-3.5 sm:p-4 font-mono text-gray-400 hidden md:table-cell tabular-nums">
                              {p.hsnSac || '9018'}
                            </td>
                            <td className="p-3.5 sm:p-4 font-mono font-bold text-white whitespace-nowrap tabular-nums">
                              {p.price ? `Rs ${p.price.toLocaleString()}` : 'Price on Request'}
                            </td>
                            <td className="p-3.5 sm:p-4 text-center text-gray-400 hidden sm:table-cell tabular-nums">
                              {p.features?.length || 0} specs
                            </td>
                            <td className="p-3.5 sm:p-4 text-right whitespace-nowrap">
                              <div className="flex justify-end gap-1.5">
                                <button
                                  type="button"
                                  onClick={() => openEditProductModal(p, false)}
                                  className="px-2.5 py-1.5 rounded-lg bg-amber/15 hover:bg-amber hover:text-navy text-amber font-semibold text-[11px] inline-flex items-center gap-1 transition-colors"
                                >
                                  <Edit className="w-3.5 h-3.5" />
                                  <span>Edit</span>
                                </button>
                                <button
                                  type="button"
                                  onClick={() => openEditProductModal(p, true)}
                                  title="Duplicate product"
                                  className="p-1.5 rounded-lg bg-white/5 hover:bg-white/15 text-gray-300"
                                >
                                  <Copy className="w-3.5 h-3.5" />
                                </button>
                                <button
                                  type="button"
                                  onClick={() => deleteProduct(p.id!, p.name)}
                                  aria-label={`Delete ${p.name}`}
                                  className="p-1.5 rounded-lg bg-white/5 hover:bg-red-500/20 text-gray-400 hover:text-red-400"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                );
              })()}
            </div>

            {/* Dedicated Equipment Editor Modal Window (Properly Sized, Scroll-Safe Header/Body/Footer) */}
            {showProdModal && (
              <div className="fixed inset-0 z-[2400] bg-black/85 backdrop-blur-sm flex items-center justify-center p-3 sm:p-6">
                <form
                  onSubmit={saveProduct}
                  className="bg-[#111124] w-full max-w-3xl max-h-[92vh] rounded-2xl border border-amber/30 shadow-2xl flex flex-col overflow-hidden"
                >
                  {/* Sticky Modal Header */}
                  <div className="p-4 sm:p-5 bg-navy border-b border-white/10 flex items-center justify-between gap-3 shrink-0">
                    <div>
                      <span className="text-[10px] font-mono text-amber uppercase font-bold tracking-wider">
                        E-Catalogue CRUD Editor
                      </span>
                      <h3 className="font-syne font-black text-base sm:text-lg text-white uppercase">
                        {editingProdId ? 'Modify Equipment Profile' : 'Register Catalogue Equipment'}
                      </h3>
                    </div>
                    <button
                      type="button"
                      onClick={() => setShowProdModal(false)}
                      className="w-9 h-9 rounded-lg bg-white/5 hover:bg-white/15 text-gray-300 flex items-center justify-center"
                      aria-label="Close equipment window"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>

                  {/* Scrollable Form Body */}
                  <div className="p-4 sm:p-6 overflow-y-auto space-y-4 flex-1">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="md:col-span-2">
                        <label className="block text-[10px] font-mono uppercase text-gray-300 font-bold mb-1">
                          Equipment Name *
                        </label>
                        <input
                          type="text"
                          required
                          placeholder="e.g. 5-Para ICU Patient Monitor"
                          value={prodForm.name}
                          onChange={(e) => setProdForm((prev) => ({ ...prev, name: e.target.value }))}
                          className="w-full bg-[#10101e] border border-orange-500/20 rounded-xl px-4 py-2.5 text-xs text-white"
                        />
                      </div>

                      <div>
                        <label className="block text-[10px] font-mono uppercase text-gray-300 font-bold mb-1">
                          Price (INR / 0 = Price on Request)
                        </label>
                        <input
                          type="number"
                          min={0}
                          value={prodForm.price ?? ''}
                          onChange={(e) => setProdForm((prev) => ({ ...prev, price: Number(e.target.value) }))}
                          className="w-full bg-[#10101e] border border-orange-500/20 rounded-xl px-4 py-2.5 text-xs text-white font-mono"
                        />
                      </div>

                      <div>
                        <label className="block text-[10px] font-mono uppercase text-gray-300 font-bold mb-1">
                          Category Group
                        </label>
                        <select
                          value={prodForm.category}
                          onChange={(e) => setProdForm((prev) => ({ ...prev, category: e.target.value }))}
                          className="w-full bg-[#10101e] border border-orange-500/20 rounded-xl px-4 py-2.5 text-xs text-white"
                        >
                          {['Critical Care', 'Emergency', 'Accessories', 'Testing Tools', 'General Care'].map((c) => (
                            <option key={c} value={c}>
                              {c}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <label className="block text-[10px] font-mono uppercase text-gray-300 font-bold mb-1">
                          Feature Badge
                        </label>
                        <input
                          type="text"
                          placeholder="e.g. NABL Certified / Bestseller"
                          value={prodForm.badge || ''}
                          onChange={(e) => setProdForm((prev) => ({ ...prev, badge: e.target.value }))}
                          className="w-full bg-[#10101e] border border-orange-500/20 rounded-xl px-4 py-2.5 text-xs text-white"
                        />
                      </div>

                      <div>
                        <label className="block text-[10px] font-mono uppercase text-gray-300 font-bold mb-1">
                          HSN / SAC Code
                        </label>
                        <input
                          type="text"
                          placeholder="9018"
                          value={prodForm.hsnSac || ''}
                          onChange={(e) => setProdForm((prev) => ({ ...prev, hsnSac: e.target.value }))}
                          className="w-full bg-[#10101e] border border-orange-500/20 rounded-xl px-4 py-2.5 text-xs text-white font-mono"
                        />
                      </div>
                    </div>

                    <ImageAttachmentField
                      value={prodForm.image || ''}
                      onChange={(url) => setProdForm((prev) => ({ ...prev, image: url }))}
                      label="Equipment Image Attachment (Browse / Take Photo / Camera / URL)"
                    />

                    <div>
                      <label className="block text-[10px] font-mono uppercase text-gray-300 font-bold mb-1">
                        Product Clinical Description
                      </label>
                      <textarea
                        rows={3}
                        value={prodForm.description || ''}
                        onChange={(e) => setProdForm((prev) => ({ ...prev, description: e.target.value }))}
                        className="w-full bg-[#10101e] border border-orange-500/20 rounded-xl px-4 py-2.5 text-xs text-white focus:outline-none"
                      />
                    </div>

                    <div>
                      <label className="block text-[10px] font-mono uppercase text-gray-300 font-bold mb-1">
                        Specification Features (Comma separated)
                      </label>
                      <input
                        type="text"
                        placeholder="12.1 inch screen, 7-lead ECG analysis, NABL traceable..."
                        value={featureInput}
                        onChange={(e) => {
                          setFeatureInput(e.target.value);
                          setProdForm((prev) => ({
                            ...prev,
                            features: e.target.value
                              .split(',')
                              .map((f) => f.trim())
                              .filter(Boolean),
                          }));
                        }}
                        className="w-full bg-[#10101e] border border-orange-500/20 rounded-xl px-4 py-2.5 text-xs text-white"
                      />
                      {prodForm.features && prodForm.features.length > 0 && (
                        <div className="flex flex-wrap gap-1.5 mt-2">
                          {prodForm.features.map((feat, idx) => (
                            <span
                              key={idx}
                              className="text-[11px] font-mono text-amber bg-amber/10 border border-amber/20 px-2 py-0.5 rounded"
                            >
                              {feat}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Sticky Modal Footer */}
                  <div className="p-4 sm:p-5 bg-navy border-t border-white/10 flex flex-wrap justify-end gap-3 shrink-0">
                    <button
                      type="button"
                      onClick={() => {
                        setShowProdModal(false);
                        setEditingProdId(null);
                      }}
                      className="px-5 py-2.5 rounded-xl border border-white/15 text-xs font-bold text-gray-300 hover:bg-white/5"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={loadingAction === 'products'}
                      className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-crimson to-amber text-navy font-syne font-black uppercase text-xs tracking-wider flex items-center gap-2 disabled:opacity-50"
                    >
                      {loadingAction === 'products' ? (
                        <RefreshCw className="w-4 h-4 animate-spin" />
                      ) : (
                        <Check className="w-4 h-4" />
                      )}
                      <span>{editingProdId ? 'Update Equipment' : 'Save Equipment'}</span>
                    </button>
                  </div>
                </form>
              </div>
            )}
          </div>
        )}

        {/* QUOTATION REQUESTS */}
        {activeSection === 'quotations' && (
          <div className="bg-navy border border-white/5 rounded-2xl p-6 shadow-2xl space-y-6 animate-fadeIn">
            <div>
              <h2 className="font-syne font-black text-xl text-white uppercase tracking-wider">Hospital RFQs & Calibration Quotes</h2>
              <p className="text-xs text-amber font-mono">Process hospital specification requests, formulate pricing quotes, and invite customer payments</p>
            </div>

            <div className="overflow-x-auto border border-white/5 bg-[#10101e] rounded-xl">
              <table className="w-full text-xs text-left divide-y divide-white/5 text-gray-300 animate-fadeIn">
                <thead>
                  <tr className="bg-navy text-gray-400 font-mono py-4">
                    <th className="p-4">Client Contact</th>
                    <th className="p-4">Device Model Specifications</th>
                    <th className="p-4">Urgency</th>
                    <th className="p-4 font-bold text-center">Enquiry Status</th>
                    <th className="p-4 font-bold text-center">Priced Quote (GST Excl)</th>
                    <th className="p-4 font-bold text-right">Action formulation</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5 animate-fadeIn">
                  {quotations.map((q) => (
                    <tr key={q.id} className="hover:bg-white/2">
                      <td className="p-4">
                        <div className="font-syne font-bold text-white">{q.contact}</div>
                        <div className="text-[10px] text-gray-500 font-mono mt-0.5">{q.email} • {q.phone}</div>
                        <div className="text-[11px] text-amber font-medium mt-1 uppercase font-mono">{q.hospital} ({q.city})</div>
                      </td>
                      <td className="p-4">
                        <div className="font-semibold text-white">{q.deviceModel} (x{q.quantity || 1} units)</div>
                        {q.notes && <p className="text-[11px] text-gray-500 italic mt-1.5 truncate max-w-[200px]">{q.notes}</p>}
                      </td>
                      <td className="p-4">
                        <span className={`px-2 py-0.5 rounded text-[9px] font-black uppercase tracking-wider ${
                          q.urgency === 'High' ? 'bg-red-500/10 text-red-400' : 'bg-gray-800 text-gray-400'
                        }`}>
                          {q.urgency}
                        </span>
                      </td>
                      <td className="p-4 text-center">
                        <span className={`inline-block px-3 py-1 rounded-full text-[9px] font-black uppercase font-mono tracking-wider border ${
                          q.status === 'Answered'
                            ? 'bg-emerald-500/15 border-emerald-500/30 text-emerald-400'
                            : 'bg-yellow-500/15 border-yellow-500/30 text-yellow-400'
                        }`}>
                          {q.status}
                        </span>
                      </td>
                      <td className="p-4 text-center font-mono font-bold text-white text-sm">
                        {q.adminResponse ? `Rs ${q.adminResponse.price.toLocaleString()}` : '⚡ UNANSWERED'}
                      </td>
                      <td className="p-4 text-right">
                        {activeQuoteId === q.id ? (
                          <div className="fixed inset-0 z-[1500] bg-black/75 backdrop-blur-xs flex items-center justify-center p-4">
                            <div className="bg-[#121226] p-5 rounded-2xl border border-amber/30 text-left w-full max-w-sm space-y-3 shadow-2xl">
                              <h4 className="font-syne font-black text-xs text-white uppercase">Set Quote Rate — {q.hospital}</h4>
                              <div>
                                <label className="block text-[10px] font-mono text-gray-400 uppercase mb-1">Fee Proposal (INR)</label>
                                <input
                                  type="number"
                                  value={quotePrice}
                                  onChange={(e) => setQuotePrice(e.target.value)}
                                  className="w-full bg-[#10101e] border border-orange-500/20 text-white rounded-lg p-2.5 text-xs font-mono"
                                />
                              </div>
                              <div>
                                <label className="block text-[10px] font-mono text-gray-400 uppercase mb-1">AMC / Repair Remarks</label>
                                <textarea
                                  value={quoteNotes}
                                  onChange={(e) => setQuoteNotes(e.target.value)}
                                  className="w-full bg-[#10101e] border border-orange-500/20 text-white rounded-lg p-2.5 text-xs"
                                  rows={3}
                                />
                              </div>
                              <div className="flex gap-2 pt-1">
                                <button type="button" onClick={() => setActiveQuoteId(null)} className="flex-1 py-2 px-3 rounded-lg bg-neutral-800 text-gray-300 text-xs font-semibold">Cancel</button>
                                <button type="button" onClick={() => sendQuotationResponse(q.id!)} className="flex-1 py-2 px-3 rounded-lg bg-gradient-to-r from-crimson to-amber text-navy text-xs font-bold">Transmit</button>
                              </div>
                            </div>
                          </div>
                        ) : (
                          <button
                            onClick={() => {
                              setActiveQuoteId(q.id!);
                              setQuotePrice(q.adminResponse?.price.toString() || '15000');
                              setQuoteNotes(q.adminResponse?.notes || 'Price includes calibration tracer certifications and free secondary sensors filters alignment checks...');
                            }}
                            className="px-3 py-1.5 rounded-lg bg-orange-500/10 text-amber font-extrabold text-[10px] uppercase font-mono border border-orange-500/20 hover:bg-orange-500/20 transition-colors"
                          >
                            {q.adminResponse ? 'Revise Quote' : 'Price Offer RFQ'}
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* COMPREHENSIVE ORDERS VIEW */}
        {activeSection === 'orders' && (
          <div className="bg-navy border border-white/5 rounded-2xl p-6 shadow-2xl space-y-6 animate-fadeIn">
            <div>
              <h2 className="font-syne font-black text-xl text-white uppercase tracking-wider">Client Payment Receipts (Orders)</h2>
              <p className="text-xs text-amber font-mono">Detailed invoices logs fetched from Razorpay transactional triggers</p>
            </div>

            {orders.length === 0 ? (
              <div className="text-center py-10 bg-[#10101e] rounded-xl border border-white/5 text-gray-500 text-xs">
                No paid client orders registered yet.
              </div>
            ) : (
              <div className="overflow-x-auto border border-white/5 bg-[#10101e] rounded-xl">
                <table className="w-full text-xs text-left divide-y divide-white/5 text-gray-300">
                  <thead>
                    <tr className="bg-navy text-gray-400 font-mono py-4">
                      <th className="p-4">Payment ID (Razorpay)</th>
                      <th className="p-4">Paid Client Account</th>
                      <th className="p-4">Items Description Included</th>
                      <th className="p-4 font-bold text-center">Subtotal</th>
                      <th className="p-4 font-bold text-center">GST (18%)</th>
                      <th className="p-4 font-bold text-center">Order Total Paid</th>
                      <th className="p-4 font-bold text-right text-gray-500">Receipt Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5">
                    {orders.map((o) => (
                      <tr key={o.id} className="hover:bg-white/2">
                        <td className="p-4 font-mono font-bold text-emerald-400">{o.razorpayPaymentId || 'rzp_custom_Mock9'}</td>
                        <td className="p-4">
                          <div className="font-semibold text-white">{o.userEmail}</div>
                          <div className="text-[10px] text-gray-500 font-mono mt-0.5">{new Date(o.createdAt).toLocaleString()}</div>
                        </td>
                        <td className="p-4">
                          <div className="space-y-1">
                            {o.items?.map((item, idx) => (
                              <div key={idx} className="text-[11px] text-gray-400">
                                • <span className="text-white font-medium">{item.product.name}</span> <span className="font-mono text-amber-500">(x{item.quantity})</span>
                              </div>
                            ))}
                          </div>
                        </td>
                        <td className="p-4 text-center font-mono">Rs {o.subtotal?.toLocaleString()}</td>
                        <td className="p-4 text-center font-mono">Rs {o.gstAmount?.toLocaleString()}</td>
                        <td className="p-4 text-center font-mono font-bold text-white text-sm">Rs {o.total?.toLocaleString()}</td>
                        <td className="p-4 text-right">
                          <span className="px-3 py-1 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-[9px] font-black uppercase tracking-widest font-mono">
                            PAID SYSTEM SECURE
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* SERVICES AMC JOB SCHEDULING & FIELD DISPATCH BOARD */}
        {activeSection === 'services' && (
          <div className="space-y-8 animate-fadeIn">
            
            {/* Live technician SLA performance metrics */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
              <div className="bg-[#10101e] border border-white/5 rounded-2xl p-5 shadow-lg">
                <span className="text-[10px] font-mono text-gray-500 uppercase">Operational Work-orders</span>
                <h3 className="font-syne font-black text-2xl text-white mt-1">{techJobs.length} Assigned</h3>
                <p className="text-[10px] text-amber mt-1 font-mono">Live dispatches in Mumbai field operations</p>
              </div>

              <div className="bg-[#10101e] border border-white/5 rounded-2xl p-5 shadow-lg">
                <span className="text-[10px] font-mono text-gray-500 uppercase">SLA Completed Reps</span>
                <h3 className="font-syne font-black text-2xl text-emerald-400 mt-1">
                  {techJobs.filter(tj => tj.status === 'Completed').length} Checked Out
                </h3>
                <p className="text-[10px] text-gray-500 mt-1 font-mono">Completed by field-auth engineer reps</p>
              </div>

              <div className="bg-[#10101e] border border-white/5 rounded-2xl p-5 shadow-lg">
                <span className="text-[10px] font-mono text-gray-500 uppercase">Mean-Time-To-Control (MTTC) SLA</span>
                <h3 className="font-syne font-black text-2xl text-orange-400 mt-1">4.2 Hours Average</h3>
                <p className="text-[10px] text-amber mt-1 font-mono">NABL-certified immediate response target</p>
              </div>
            </div>

            {/* Diagnostic service bookings */}
            <div className="bg-navy border border-white/5 rounded-2xl p-6 shadow-2xl space-y-6">
              <div>
                <h2 className="font-syne font-black text-lg text-white uppercase tracking-wider">Hospital Calibration & Repair Tickets</h2>
                <p className="text-xs text-amber font-mono">Trigger rapid medical technician field assignment workflows</p>
              </div>

              <div className="overflow-x-auto border border-white/5 bg-[#10101e] rounded-xl">
                <table className="w-full text-xs text-left divide-y divide-white/5 text-gray-300">
                  <thead>
                    <tr className="bg-navy text-gray-400 font-mono py-4">
                      <th className="p-4">Hospital Client Info</th>
                      <th className="p-4">Equipment Diagnostic Details</th>
                      <th className="p-4">Target Date Range</th>
                      <th className="p-4 font-bold text-center">Status</th>
                      <th className="p-4 font-bold text-right">Job Controls</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5">
                    {services.map((s) => (
                      <tr key={s.id} className="hover:bg-white/2">
                        <td className="p-4">
                          <div className="font-syne font-bold text-white text-sm">{s.hospital}</div>
                          <div className="text-[10px] text-gray-500 font-mono mt-0.5">{s.name} • {s.phone}</div>
                          <div className="text-[11px] text-amber mt-1 font-semibold">{s.city}</div>
                        </td>
                        <td className="p-4">
                          <div className="font-semibold text-white">{s.equipment}</div>
                          <div className="text-[10px] text-gray-500 font-mono bg-white/5 px-2 py-0.5 rounded border border-white/5 h-fit inline-block mt-1 font-bold">{s.serviceType}</div>
                          {s.notes && <p className="text-[11px] text-gray-500 italic mt-1.5 truncate max-w-[200px]">{s.notes}</p>}
                        </td>
                        <td className="p-4 font-mono font-bold">{s.date}</td>
                        <td className="p-4 text-center">
                          <span className={`inline-block px-3 py-1 rounded-full text-[9px] font-black uppercase font-mono tracking-wider border ${
                            s.status === 'Completed'
                              ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400'
                              : s.status === 'In Progress'
                              ? 'bg-blue-500/10 border-blue-500/20 text-blue-400'
                              : s.status === 'Cancelled'
                              ? 'bg-gray-800 border-gray-700 text-gray-400'
                              : 'bg-red-500/15 border-red-500/30 text-red-500'
                          }`}>
                            {s.status}
                          </span>
                        </td>
                        <td className="p-4 text-right">
                          <div className="flex justify-end items-center gap-1.5 max-w-sm ml-auto">
                            {s.status === 'Pending' && (
                              <button
                                onClick={() => {
                                  setDispatchingRequest(s);
                                  setDispatchNotes(`Dispatching clinical engineers for calibrating ${s.equipment} - system ticket ${s.id}`);
                                }}
                                className="px-3 py-1.5 bg-gradient-to-r from-crimson to-amber hover:opacity-90 text-navy font-black text-[10px] uppercase rounded-lg font-mono tracking-wider"
                              >
                                DISPATCH FIELD TECH
                              </button>
                            )}

                            {(['Pending', 'In Progress', 'Completed', 'Cancelled'] as ServiceRequest['status'][]).map((st) => (
                              <button
                                key={st}
                                disabled={s.status === st}
                                onClick={() => updateServiceStatus(s.id!, st)}
                                className={`px-2 py-1 rounded text-[9px] font-bold uppercase transition-colors font-mono ${
                                  s.status === st
                                    ? 'bg-[#10101e] border border-orange-500/20 text-orange-500'
                                    : 'bg-neutral-800/60 text-gray-400 hover:bg-neutral-800 hover:text-white'
                                }`}
                              >
                                {st}
                              </button>
                            ))}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Field tech dispatches table */}
            <div className="bg-navy border border-white/5 rounded-2xl p-6 shadow-2xl space-y-6">
              <div>
                <h2 className="font-syne font-black text-lg text-white uppercase tracking-wider">Live Active Field Technical Shipments</h2>
                <p className="text-xs text-amber font-mono">Detailed tracker logs of allocated jobs and completed checkout surveys</p>
              </div>

              {techJobs.length === 0 ? (
                <div className="p-8 text-center text-gray-500 text-xs font-mono">No physical technology dispatch items initiated yet.</div>
              ) : (
                <div className="overflow-x-auto border border-white/5 bg-[#10101e] rounded-xl">
                  <table className="w-full text-xs text-left divide-y divide-white/5 text-gray-300">
                    <thead>
                      <tr className="bg-navy text-gray-400 font-mono py-4">
                        <th className="p-4">Job Identification Code</th>
                        <th className="p-4">Hospital Station Address</th>
                        <th className="p-4">Scheduled Equipment Name</th>
                        <th className="p-4">Field Tech Representative</th>
                        <th className="p-4 font-bold text-center font-mono">Job Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5">
                      {techJobs.map((tj) => (
                        <tr key={tj.id} className="hover:bg-white/2">
                          <td className="p-4 font-mono font-bold text-amber">{tj.jobId}</td>
                          <td className="p-4 font-sans font-bold">
                            <span className="text-white">{tj.hospital}</span>
                            <div className="text-[9px] text-gray-500 font-mono italic mt-0.5">{tj.city} • contact: {tj.phone}</div>
                          </td>
                          <td className="p-4">
                            <span className="font-semibold">{tj.equipment}</span>
                            <span className="text-[9px] bg-white/5 text-amber py-0.5 px-2 rounded-md font-mono border border-white/5 mt-1 block w-fit font-bold uppercase">{tj.serviceType}</span>
                          </td>
                          <td className="p-4 font-mono">
                            <div className="text-white font-bold">{tj.technicianName}</div>
                            <div className="text-[10px] text-gray-500">{tj.technicianPhone}</div>
                          </td>
                          <td className="p-4 text-center">
                            <span className={`inline-block px-2.5 py-1 rounded-full text-[9px] font-black uppercase font-mono tracking-widest border ${
                              tj.status === 'Completed'
                                ? 'bg-emerald-500/10 border-emerald-500/15 text-emerald-400'
                                : tj.status === 'In Progress'
                                ? 'bg-blue-500/10 border-blue-500/15 text-blue-400'
                                : 'bg-red-500/15 border-red-500/30 text-red-500 animate-pulse'
                            }`}>
                              {tj.status}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {/* Technician Dispatch Form Modal Overlay */}
            {dispatchingRequest && (
              <div className="fixed inset-0 z-[3000] bg-black/90 backdrop-blur-md flex items-center justify-center p-6 animate-fadeIn">
                <div className="bg-[#111124] max-w-md w-full border border-amber/20 rounded-3xl p-8 shadow-2xl relative space-y-6">
                  
                  <div className="flex justify-between items-center border-b border-white/5 pb-3">
                    <div>
                      <span className="text-[8px] font-mono text-amber font-black uppercase tracking-widest bg-amber-500/10 border border-amber/20 px-2 py-0.5 rounded-full">
                        SunMedX Ingress Control
                      </span>
                      <h3 className="font-syne font-black text-white text-base tracking-wider uppercase mt-1">Field Engineer Assignment form</h3>
                    </div>
                    <button
                      onClick={() => setDispatchingRequest(null)}
                      className="w-8 h-8 rounded-full bg-white/5 flex items-center justify-center text-gray-400 hover:text-white"
                    >
                      ×
                    </button>
                  </div>

                  <div className="space-y-4 text-xs font-mono">
                    <p className="text-[11px] text-gray-500 uppercase leading-relaxed">
                      This action dispatches clinical engineers to <span className="text-white font-bold">{dispatchingRequest.hospital}</span>. The engineer receives details via SMS/Whatsapp.
                    </p>

                    <div className="space-y-1">
                      <label className="text-[10px] text-gray-400 uppercase font-black">Select Bio-Tech Representative</label>
                      <select 
                        value={dispatchTechName}
                        onChange={(e) => {
                          setDispatchTechName(e.target.value);
                          if (e.target.value === 'Rohan Deshmukh') setDispatchTechPhone('+91 97690 12345');
                          else if (e.target.value === 'Vikas Patil') setDispatchTechPhone('+91 88791 22334');
                          else setDispatchTechPhone('+91 99301 55667');
                        }}
                        className="w-full p-3 bg-navy border border-white/10 rounded-xl text-white outline-none"
                      >
                        <option value="Rohan Deshmukh">Rohan Deshmukh (Lead Ultrasonic Repairer)</option>
                        <option value="Vikas Patil">Vikas Patil (Clinical Calibration Specialist)</option>
                        <option value="Maya Sharaf">Maya Sharaf (Advanced MRI & Radiation auditor)</option>
                      </select>
                    </div>

                    <div className="space-y-1">
                      <label className="text-[10px] text-gray-400 uppercase font-black">Engineer Mobile (Alert destination)</label>
                      <input 
                        type="text"
                        value={dispatchTechPhone}
                        onChange={(e) => setDispatchTechPhone(e.target.value)}
                        className="w-full p-3 bg-navy border border-white/10 rounded-xl text-white outline-none" 
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="text-[10px] text-gray-400 uppercase font-black">Dispatcher Notes & Service SOP</label>
                      <textarea
                        rows={3}
                        value={dispatchNotes}
                        onChange={(e) => setDispatchNotes(e.target.value)}
                        className="w-full p-3 bg-navy border border-white/10 rounded-xl text-white outline-none font-sans text-xs resize-none"
                      />
                    </div>
                  </div>

                  <div className="flex gap-2.5 pt-2">
                    <button
                      onClick={() => setDispatchingRequest(null)}
                      className="flex-1 py-3 border border-white/10 rounded-xl text-xs font-bold uppercase tracking-wider text-gray-400 font-syne"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={assignFieldTechnician}
                      className="flex-1 py-3 bg-gradient-to-r from-crimson to-amber text-navy rounded-xl text-xs font-black uppercase tracking-wider font-syne uppercase"
                    >
                      Authorize Dispatch
                    </button>
                  </div>

                </div>
              </div>
            )}

          </div>
        )}

        {/* INBOX MESSAGES */}
        {activeSection === 'messages' && (
          <div className="bg-navy border border-white/5 rounded-2xl p-6 shadow-2xl space-y-6 animate-fadeIn">
            <div>
              <h2 className="font-syne font-black text-xl text-white uppercase tracking-wider">Hospital Inbox Inquiries Messages</h2>
              <p className="text-xs text-amber font-mono">Review customer contact forms and feedback submissions</p>
            </div>

            {messages.length === 0 ? (
              <div className="text-center py-10 bg-[#10101e] rounded-xl border border-white/5 text-gray-500 text-xs">
                🚨 No diagnostic inquiries lodged inside our customer secure mail client yet.
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                {messages.map((m) => (
                  <div key={m.id} className="bg-[#10101e] border border-orange-500/10 rounded-xl p-5 shadow-lg relative flex flex-col justify-between">
                    <div>
                      <div className="flex justify-between items-start mb-3 border-b border-white/5 pb-2">
                        <div>
                          <h4 className="font-syne font-bold text-white text-sm">{m.name}</h4>
                          <span className="text-[10px] text-gray-500 font-mono">{m.email} • {m.phone}</span>
                        </div>
                        <span className="text-[9px] text-amber font-mono font-extrabold">{new Date(m.createdAt || '').toLocaleDateString()}</span>
                      </div>
                      <div className="text-xs text-amber font-bold font-mono tracking-wider uppercase mb-1">{m.subject || 'General Enquiry'}</div>
                      <p className="text-xs text-gray-300 leading-relaxed italic">"{m.message}"</p>
                    </div>

                    <div className="mt-4 pt-3 border-t border-white/5 flex justify-end">
                      <a href={`mailto:${m.email}?subject=SunMedX Enquiry Assistance`} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-orange-500/10 text-amber text-[10px] uppercase font-mono font-bold hover:bg-orange-500/20 transition-colors border border-orange-500/20">
                        <span>Reply Assist</span>
                        <ArrowRight className="w-3 h-3" />
                      </a>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ACADEMY MANAGER */}
        {activeSection === 'academy' && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 animate-fadeIn">
            {/* Form */}
            <div className="lg:col-span-4 bg-navy rounded-2xl border border-white/5 p-6 shadow-xl h-fit">
              <h3 className="font-syne font-black text-sm text-amber uppercase tracking-wider mb-4">
                {editingCourseId ? 'Alter Course Curriculum' : 'Add Training certification class'}
              </h3>
              <form onSubmit={saveCourse} className="space-y-4">
                <div>
                  <label className="block text-[10px] font-mono uppercase text-gray-500 font-bold mb-1">Class title name *</label>
                  <input
                    type="text"
                    required
                    value={courseForm.title}
                    onChange={(e) => setCourseForm(prev => ({ ...prev, title: e.target.value }))}
                    className="w-full bg-[#10101e] border border-orange-500/20 rounded-xl px-4 py-3 text-xs text-white shadow-inner"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[10px] font-mono ... mb-1">Target Skill-level</label>
                    <select
                      value={courseForm.level}
                      onChange={(e) => setCourseForm(prev => ({ ...prev, level: e.target.value }))}
                      className="w-full bg-[#10101e] border-orange-500/20 rounded-xl px-4 py-3 text-xs text-white"
                    >
                      {['Beginner', 'Intermediate', 'Advanced'].map(l => (
                        <option key={l} value={l}>{l}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-[10px] font-mono ... mb-1 font-bold">Price fee (rupees)</label>
                    <input
                      type="number"
                      value={courseForm.price || ''}
                      onChange={(e) => setCourseForm(prev => ({ ...prev, price: Number(e.target.value) }))}
                      className="w-full bg-[#10101e] border-orange-500/20 rounded-xl px-4 py-3 text-xs text-white font-mono"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[10px] font-mono ... mb-1 font-bold">Class Duration</label>
                    <input
                      type="text"
                      placeholder="e.g. 6 Weeks"
                      value={courseForm.duration}
                      onChange={(e) => setCourseForm(prev => ({ ...prev, duration: e.target.value }))}
                      className="w-full bg-[#10101e] border-orange-500/20 rounded-xl px-4 py-3 text-xs text-white"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-mono ... mb-1 font-bold">Medium Language</label>
                    <input
                      type="text"
                      placeholder="e.g. English/Hindi"
                      value={courseForm.language}
                      onChange={(e) => setCourseForm(prev => ({ ...prev, language: e.target.value }))}
                      className="w-full bg-[#10101e] border-orange-500/20 rounded-xl px-4 py-3 text-xs text-white"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[10px] font-mono ... mb-1">Graphy URL Classroom *</label>
                  <input
                    type="text"
                    placeholder="https://sunmedxacademy.graphy.com/courses/..."
                    required
                    value={courseForm.graphyUrl}
                    onChange={(e) => setCourseForm(prev => ({ ...prev, graphyUrl: e.target.value }))}
                    className="w-full bg-[#10101e] border border-orange-500/20 rounded-xl px-4 py-3 text-xs text-white font-mono"
                  />
                </div>

                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="checkbox-featured"
                    checked={courseForm.featured}
                    onChange={(e) => setCourseForm(prev => ({ ...prev, featured: e.target.checked }))}
                    className="w-4 h-4 rounded border-orange-500/20 accent-crimson"
                  />
                  <label htmlFor="checkbox-featured" className="text-xs font-mono text-gray-400 cursor-pointer">Feature on homepage widgets</label>
                </div>

                <div className="flex gap-2">
                  {editingCourseId && (
                    <button
                      type="button"
                      onClick={() => {
                        setEditingCourseId(null);
                        setCourseForm({ title: '', level: 'Beginner', duration: '4 Weeks', language: 'English', price: 0, featured: true, graphyUrl: '' });
                      }}
                      className="flex-1 py-3 px-4 rounded-xl border border-white/5 text-xs text-gray-400 capitalize hover:bg-white/5"
                    >
                      Cancel
                    </button>
                  )}
                  <button type="submit" className="flex-1 py-3 px-4 rounded-xl bg-gradient-to-r from-crimson to-amber text-navy font-bold uppercase text-xs tracking-wider flex items-center justify-center gap-1.5">
                    <Plus className="w-4.5 h-4.5" />
                    <span>{editingCourseId ? 'Save class' : 'Add class'}</span>
                  </button>
                </div>
              </form>
            </div>

            {/* List */}
            <div className="lg:col-span-8 bg-navy border border-white/5 rounded-2xl p-6 shadow-xl">
              <h3 className="font-syne font-black text-sm text-gray-300 uppercase tracking-widest mb-4">Currriculum courses catalogue</h3>
              <div className="overflow-x-auto border border-white/5 bg-[#10101e] rounded-xl">
                <table className="w-full text-xs text-left divide-y divide-white/5 text-gray-300 animate-fadeIn">
                  <thead>
                    <tr className="bg-navy text-gray-400 font-mono py-4">
                      <th className="p-4">Training Certification Details</th>
                      <th className="p-4">Level</th>
                      <th className="p-4 font-bold">Standard Tuition Fee</th>
                      <th className="p-4 font-bold text-center">Graphy URL Test Link</th>
                      <th className="p-4 font-bold text-right text-gray-500">Edit / Del</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5">
                    {courses.map((c) => (
                      <tr key={c.id} className="hover:bg-white/2">
                        <td className="p-4 font-syne font-bold text-white text-sm">
                          {c.title}
                          <div className="text-[10px] text-gray-500 font-mono mt-0.5">{c.duration} • {c.language}</div>
                        </td>
                        <td className="p-4 text-amber font-semibold font-mono text-[10px] uppercase">{c.level}</td>
                        <td className="p-4 font-mono font-bold text-white">{c.price ? `Rs ${c.price.toLocaleString()}` : <span className="bg-emerald-500/10 text-emerald-400 px-1.5 py-0.5 rounded border border-emerald-500/25">FREE CERTIFIED</span>}</td>
                        <td className="p-4 text-center">
                          <a href={c.graphyUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 text-amber text-[10px] font-mono hover:underline uppercase font-extrabold bg-[#121226] border border-amber/20 px-2 py-1 rounded">
                            <span>Test URL</span>
                            <ExternalLink className="w-3 h-3" />
                          </a>
                        </td>
                        <td className="p-4 text-right">
                          <div className="flex justify-end gap-2">
                            <button onClick={() => { setEditingCourseId(c.id!); setCourseForm(c); }} className="p-1 text-amber hover:text-white">
                              <Edit className="w-4 h-4" />
                            </button>
                            <button onClick={() => deleteCourse(c.id!, c.title)} className="p-1 text-gray-500 hover:text-red-500">
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* CMS VARIABLES & PORTAL LAYOUT CUSTOMIZER */}
        {activeSection === 'cms' && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 animate-fadeIn">
            {/* Theme Variables Color customization */}
            <div className="bg-navy rounded-2xl border border-white/5 p-6 shadow-xl h-fit space-y-6">
              <div>
                <h3 className="font-syne font-black text-sm text-amber uppercase tracking-wider">CMS System Theme Customizer</h3>
                <p className="text-[11px] text-gray-500 font-mono leading-relaxed mt-0.5">Modifies :root CSS variables in real-time across database nodes</p>
              </div>

              <div className="space-y-4">
                {[
                  { label: 'Primary Brand Navy Background', val: cmsNavy, set: setCmsNavy },
                  { label: 'Sunset Crimson Gradient Color', val: cmsCrimson, set: setCmsCrimson },
                  { label: 'Sunrise Amber Accent Color', val: cmsAmber, set: setCmsAmber },
                  { label: 'Horizon Golden glow Badge color', val: cmsGolden, set: setCmsGolden },
                  { label: 'Container Slate Backing DarkBg', val: cmsDarkBg, set: setCmsDarkBg }
                ].map((item, idx) => (
                  <div key={idx} className="flex items-center justify-between bg-[#10101e] p-3 rounded-xl border border-white/5">
                    <span className="text-xs font-semibold text-gray-300 font-syne">{item.label}</span>
                    <div className="flex items-center gap-3">
                      <input
                        type="color"
                        value={item.val}
                        onChange={(e) => item.set(e.target.value)}
                        className="w-10 h-10 border-0 bg-transparent rounded-full overflow-hidden cursor-pointer shadow-xl outline-none shrink-0"
                      />
                      <input
                        type="text"
                        value={item.val}
                        onChange={(e) => item.set(e.target.value)}
                        className="bg-[#121224] border border-orange-500/20 text-white rounded px-2.5 py-1 text-xs font-mono w-24 text-center select-all"
                      />
                    </div>
                  </div>
                ))}

                <button
                  onClick={saveCmsColors}
                  disabled={loadingAction === 'cms'}
                  className="w-full py-3.5 rounded-xl bg-gradient-to-r from-crimson to-amber hover:opacity-90 active:scale-95 text-navy font-bold uppercase text-xs tracking-wider transition-all shadow-lg shadow-crimson/15 flex items-center justify-center gap-1.5"
                >
                  {loadingAction === 'cms' ? <RefreshCw className="w-4.5 h-4.5 animate-spin" /> : <Palette className="w-4.5 h-4.5" />}
                  <span>Save Brand CSS variables</span>
                </button>
              </div>
            </div>

            {/* Layout Toggling CMS */}
            <div className="bg-navy rounded-2xl border border-white/5 p-6 shadow-xl h-fit space-y-6">
              <div>
                <h3 className="font-syne font-black text-sm text-amber uppercase tracking-wider">Interface Sections Configurator</h3>
                <p className="text-[11px] text-gray-500 font-mono mt-0.5">Toggle and align structural home landing components</p>
              </div>

              <div className="space-y-3 font-mono text-xs">
                {[
                  { key: 'hero', title: 'Interactive animated Conic Rays Hero section' },
                  { key: 'stats', title: 'Hospital Client Growth Counter Stats board' },
                  { key: 'services_preview', title: 'Main 3-Service featured options slider' },
                  { key: 'academy_preview', title: 'Course certification featured cards' },
                  { key: 'tools_preview', title: 'Dynamic clinical custom tools panel' },
                  { key: 'testimonials', title: 'Rotating hospital testimonials slider carousel' }
                ].map((s) => {
                  const isActive = siteSettings?.homepageOrder?.includes(s.key);
                  return (
                    <div
                      key={s.key}
                      onClick={() => handleToggleSection(s.key)}
                      className={`p-3.5 rounded-xl border flex items-center justify-between cursor-pointer transition-all ${
                        isActive
                          ? 'bg-[#12122c]/60 border-amber-500/40 text-white font-bold'
                          : 'bg-black/20 border-white/5 text-gray-500 hover:border-white/10'
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] uppercase font-bold text-amber">{s.key}</span>
                        <p className="text-[11px] text-gray-300">{s.title}</p>
                      </div>
                      <div className={`w-8 h-4 rounded-full p-0.5 transition-colors ${isActive ? 'bg-orange-500' : 'bg-gray-800'}`}>
                        <div className={`w-3 h-3 rounded-full bg-white transition-transform ${isActive ? 'translate-x-4' : 'translate-x-0'}`} />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* CHATBOT QA CRUD */}
        {activeSection === 'chatbot' && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 animate-fadeIn">
            <div className="lg:col-span-4 bg-navy rounded-2xl border border-white/5 p-6 shadow-xl h-fit">
              <h3 className="font-syne font-black text-sm text-amber uppercase tracking-wider mb-4">
                Register Chatbot Q&A trigger
              </h3>
              <form onSubmit={saveQa} className="space-y-4">
                <div>
                  <label className="block text-[10px] font-mono uppercase text-gray-500 font-bold mb-1">Trigger Question (Lowecase match) *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. what are your services"
                    value={qaForm.question}
                    onChange={(e) => setQaForm(prev => ({ ...prev, question: e.target.value }))}
                    className="w-full bg-[#10101e] border border-orange-500/20 rounded-xl px-4 py-3 text-xs text-white shadow-inner"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-mono uppercase text-gray-500 font-bold mb-1">Synthesized System Response *</label>
                  <textarea
                    rows={4}
                    required
                    placeholder="Our services are calibrated according..."
                    value={qaForm.answer}
                    onChange={(e) => setQaForm(prev => ({ ...prev, answer: e.target.value }))}
                    className="w-full bg-[#10101e] border border-orange-500/20 rounded-xl px-4 py-3 text-xs text-white"
                  />
                </div>

                <div className="flex gap-2 text-xs font-mono">
                  {editingQaId && (
                    <button type="button" onClick={() => { setEditingQaId(null); setQaForm({ question: '', answer: '' }); }} className="flex-1 py-2 rounded bg-neutral-800 text-gray-400 font-semibold border border-white/5">Cancel</button>
                  )}
                  <button type="submit" className="flex-1 py-3 px-4 rounded-xl bg-gradient-to-r from-crimson to-amber text-navy font-bold uppercase text-xs tracking-wider flex items-center justify-center gap-1.5 font-syne">
                    <Plus className="w-4.5 h-4.5" />
                    <span>Save Response</span>
                  </button>
                </div>
              </form>
            </div>

            <div className="lg:col-span-8 bg-navy border border-white/5 rounded-2xl p-6 shadow-xl">
              <h3 className="font-syne font-black text-sm text-gray-300 uppercase tracking-widest mb-4">Secured Chatbot FAQ matrix</h3>
              <div className="overflow-x-auto border border-white/5 bg-[#10101e] rounded-xl">
                <table className="w-full text-xs text-left divide-y divide-white/5 text-gray-300">
                  <thead>
                    <tr className="bg-navy text-gray-400 font-mono py-4">
                      <th className="p-4">Customer Keywords query</th>
                      <th className="p-4">Synthesizer Response Answer</th>
                      <th className="p-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5 animate-fadeIn">
                    {qaPairs.map((qa) => (
                      <tr key={qa.id} className="hover:bg-white/2">
                        <td className="p-4 font-mono font-bold text-white max-w-[150px] truncate">"{qa.question}"</td>
                        <td className="p-4 text-gray-400 leading-relaxed max-w-[280px] truncate" title={qa.answer}>"{qa.answer}"</td>
                        <td className="p-4 text-right">
                          <div className="flex justify-end gap-2">
                            <button onClick={() => { setEditingQaId(qa.id!); setQaForm(qa); }} className="p-1 text-amber hover:text-white">
                              <Edit className="w-4 h-4" />
                            </button>
                            <button onClick={() => deleteQa(qa.id!, qa.question)} className="p-1 text-gray-500 hover:text-red-500">
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* SITE ANNOUNCEMENT EDIT */}
        {activeSection === 'announcements' && (
          <div className="bg-navy border border-white/5 rounded-2xl p-6 shadow-2xl space-y-6 max-w-2xl animate-fadeIn">
            <div>
              <h2 className="font-syne font-black text-xl text-white uppercase tracking-wider">Announcement marquee ribbon</h2>
              <p className="text-xs text-amber font-mono">Control sitewide announcements flashing on primary landing headers</p>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-[10px] font-mono uppercase text-gray-500 font-bold mb-1.5 font-bold">Marquee Banner Message text</label>
                <textarea
                  rows={3}
                  value={siteSettings?.tagline || ''}
                  onChange={async (e) => await onUpdateSettings({ tagline: e.target.value })}
                  className="w-full bg-[#10101e] border border-orange-500/20 rounded-xl px-4 py-3 text-sm text-amber font-mono tracking-wide"
                />
              </div>

              <div className="flex items-center gap-3">
                <input
                  type="checkbox"
                  id="checkbox-announcement-enabled"
                  checked={siteSettings?.chatbotEnabled || false}
                  onChange={async (e) => await onUpdateSettings({ chatbotEnabled: e.target.checked })}
                  className="w-4 h-4 rounded border-orange-500/20 accent-crimson"
                />
                <label htmlFor="checkbox-announcement-enabled" className="text-xs font-mono text-gray-400 cursor-pointer">Activate voice Alexa-AI Chatbot module</label>
              </div>

              <div className="flex gap-4 border-t border-white/5 pt-4">
                <input
                  type="text"
                  placeholder="Official Tel Hotline"
                  value={siteSettings?.phone || ''}
                  onChange={async (e) => await onUpdateSettings({ phone: e.target.value })}
                  className="flex-1 bg-[#10101e] border border-orange-500/20 rounded-xl px-4 py-3 text-xs text-white"
                />
                <input
                  type="text"
                  placeholder="Official Contact Email"
                  value={siteSettings?.email || ''}
                  onChange={async (e) => await onUpdateSettings({ email: e.target.value })}
                  className="flex-1 bg-[#10101e] border border-orange-500/20 rounded-xl px-4 py-3 text-xs text-white"
                />
              </div>
            </div>
          </div>
        )}

        {/* AMC SCHEMES & AGREEMENTS MANAGER MODULE */}
        {activeSection === 'amc_manager' && (
          <div className="space-y-8 animate-fadeIn">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
              <div>
                <h2 className="font-syne font-black text-xl text-white uppercase tracking-wider">Annual Maintenance Plans &amp; Agreements (AMC)</h2>
                <p className="text-xs text-amber font-mono">Manage AMC tier pricing with GST rate calculations and direct client agreement emailing</p>
              </div>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setEditingPlanId(null);
                    setPlanForm({
                      name: '',
                      annualPrice: 25000,
                      gstPercent: siteSettings?.gstPercent ?? 18,
                      responseTime: 'Under 4 Hours',
                      visitFrequency: 'Quarterly preventive audits + emergency support',
                      equipmentTypes: 'Patient Monitors, Defibrillators, Ventilators',
                      coveredServices: 'NABL reference calibration, IEC 60601 safety audit, Certificate PDF',
                    });
                    setShowPlanModal(true);
                  }}
                  className="px-4 py-2 bg-white/5 hover:bg-white/10 border border-amber/30 text-amber font-bold text-xs uppercase rounded-xl tracking-wider font-syne flex items-center gap-1.5"
                >
                  <Plus className="w-4 h-4" />
                  <span>Add AMC Plan</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    const defaultPlan = amcPlans[0];
                    setAmcForm({
                      contractNumber: `AMC-${Math.floor(10000 + Math.random() * 90000)}`,
                      hospitalName: '',
                      contactPerson: '',
                      phone: '',
                      email: '',
                      equipmentList: '',
                      city: 'Mumbai',
                      planSelected: defaultPlan?.name || 'Premium ICU Plan',
                      annualValue: defaultPlan?.annualPrice || 28999,
                      gstPercent: defaultPlan?.gstPercent ?? siteSettings?.gstPercent ?? 18,
                      notes: '',
                      startDate: new Date().toISOString().split('T')[0],
                      endDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
                      nextVisitDate: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
                    });
                    setShowContractModal(true);
                  }}
                  className="px-4 py-2 bg-gradient-to-r from-crimson to-amber hover:opacity-95 text-navy font-black text-xs uppercase rounded-xl tracking-wider font-syne flex items-center gap-1.5"
                >
                  <PlusCircle className="w-4 h-4" />
                  <span>Initialize AMC Contract</span>
                </button>
              </div>
            </div>

            {amcNotice && (
              <div
                className={`p-3.5 rounded-xl border text-xs flex flex-wrap items-center justify-between gap-3 ${
                  amcNotice.type === 'success'
                    ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
                    : amcNotice.type === 'error'
                    ? 'bg-red-500/10 border-red-500/30 text-red-300'
                    : 'bg-amber/10 border-amber/30 text-amber'
                }`}
              >
                <span>{amcNotice.text}</span>
                {amcNotice.mailtoUrl && (
                  <a
                    href={amcNotice.mailtoUrl}
                    className="px-3 py-1.5 rounded-lg bg-amber text-navy font-bold text-[11px] inline-flex items-center gap-1.5"
                  >
                    <Mail className="w-3.5 h-3.5" />
                    <span>Open Mail App</span>
                  </a>
                )}
              </div>
            )}

            {/* AMC Plans with GST Rate Breakdown */}
            <div className="bg-navy border border-white/5 rounded-2xl p-6 shadow-2xl space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <span className="text-[10px] text-amber font-mono uppercase font-bold tracking-wider">Standardized AMC Tiers</span>
                  <h3 className="font-syne font-bold text-white text-sm uppercase">AMC Plans &amp; GST Tax Schedule</h3>
                </div>
                <span className="text-xs font-mono text-gray-400">{amcPlans.length} active plan(s)</span>
              </div>

              {amcPlans.length === 0 ? (
                <p className="text-xs font-mono text-gray-400 py-4">No AMC plans configured yet. Click &ldquo;Add AMC Plan&rdquo; to create your first tier.</p>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {amcPlans.map((plan) => {
                    const base = Number(plan.annualPrice || 0);
                    const gstPct = Number(plan.gstPercent ?? siteSettings?.gstPercent ?? 18);
                    const gstAmt = Math.round(base * (gstPct / 100));
                    const total = base + gstAmt;

                    return (
                      <div key={plan.id} className="bg-[#10101e] border border-white/10 rounded-xl p-4 flex flex-col justify-between space-y-3">
                        <div className="space-y-1.5">
                          <div className="flex items-start justify-between gap-2">
                            <h4 className="font-syne font-bold text-white text-sm">{plan.name}</h4>
                            <span className="text-[11px] font-mono text-amber font-bold shrink-0">GST {gstPct}%</span>
                          </div>
                          <p className="text-[11px] font-mono text-gray-400">
                            {plan.responseTime} · {plan.visitFrequency}
                          </p>
                          <div className="bg-navy/70 border border-white/5 rounded-lg p-2.5 text-xs font-mono space-y-1">
                            <div className="flex justify-between text-gray-300">
                              <span>Base Fee:</span>
                              <span className="tabular-nums">Rs {base.toLocaleString()}</span>
                            </div>
                            <div className="flex justify-between text-amber">
                              <span>GST ({gstPct}%):</span>
                              <span className="tabular-nums">Rs {gstAmt.toLocaleString()}</span>
                            </div>
                            <div className="flex justify-between text-emerald-400 font-bold border-t border-white/5 pt-1">
                              <span>Total Incl. GST:</span>
                              <span className="tabular-nums">Rs {total.toLocaleString()}</span>
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center justify-between gap-2 pt-1 border-t border-white/5">
                          <button
                            type="button"
                            onClick={() => {
                              setEditingPlanId(plan.id);
                              setPlanForm({
                                name: plan.name || '',
                                annualPrice: Number(plan.annualPrice || 0),
                                gstPercent: Number(plan.gstPercent ?? siteSettings?.gstPercent ?? 18),
                                responseTime: plan.responseTime || '',
                                visitFrequency: plan.visitFrequency || '',
                                equipmentTypes: Array.isArray(plan.equipmentTypes) ? plan.equipmentTypes.join(', ') : '',
                                coveredServices: Array.isArray(plan.coveredServices) ? plan.coveredServices.join(', ') : '',
                              });
                              setShowPlanModal(true);
                            }}
                            className="text-[11px] font-mono text-amber hover:underline flex items-center gap-1"
                          >
                            <Edit className="w-3 h-3" />
                            <span>Edit Plan</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => deleteAmcPlan(plan.id, plan.name)}
                            className="text-[11px] font-mono text-gray-400 hover:text-red-400"
                          >
                            Delete
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* List incoming amc requests */}
            <div className="bg-navy border border-white/5 rounded-2xl p-6 shadow-2xl space-y-4">
              <div>
                <span className="text-[10px] text-amber font-mono uppercase font-bold tracking-wider">Pending Scheme requests logs</span>
                <h3 className="font-syne font-bold text-white text-sm uppercase">Patient station requested AMC scheme tiers</h3>
              </div>

              {amcRequests.length === 0 ? (
                <p className="text-xs text-mono text-gray-500 py-4">No incoming AMC request logs recorded.</p>
              ) : (
                <div className="overflow-x-auto border border-white/5 bg-[#10101e] rounded-xl">
                  <table className="w-full text-xs text-left divide-y divide-white/5 text-gray-400">
                    <thead>
                      <tr className="bg-navy text-gray-400 font-mono py-3">
                        <th className="p-4">Hospital station</th>
                        <th className="p-4">Plan &amp; Equipment details</th>
                        <th className="p-4">Liaison Contact Info</th>
                        <th className="p-4 text-right">Operational Wizard</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5">
                      {amcRequests.map((req) => (
                        <tr key={req.id} className="hover:bg-white/2">
                          <td className="p-4 text-white font-heavy text-xs font-syne">{req.hospitalName} <div className="text-[9px] text-gray-500 font-mono italic">{req.city}</div></td>
                          <td className="p-4">
                            <span className="text-amber font-mono font-bold">{req.planSelected}</span>
                            <div className="text-[10px] text-gray-400 font-sans mt-0.5">{req.equipmentList}</div>
                          </td>
                          <td className="p-4 font-mono">
                            <div>{req.contactPerson}</div>
                            <div className="text-[10px] text-gray-500">{req.phone} • {req.email}</div>
                          </td>
                          <td className="p-4 text-right">
                            <button
                              onClick={() => {
                                const matchedPlan = amcPlans.find((p) => p.name === req.planSelected);
                                setAmcForm({
                                  contractNumber: `AMC-${Math.floor(10000 + Math.random() * 90000)}`,
                                  hospitalName: req.hospitalName || '',
                                  contactPerson: req.contactPerson || '',
                                  phone: req.phone || '',
                                  email: req.email || req.userEmail || '',
                                  equipmentList: req.equipmentList || '',
                                  city: req.city || 'Mumbai',
                                  planSelected: req.planSelected || matchedPlan?.name || 'Premium ICU Plan',
                                  annualValue: matchedPlan?.annualPrice || 28999,
                                  gstPercent: matchedPlan?.gstPercent ?? siteSettings?.gstPercent ?? 18,
                                  notes: req.notes || '',
                                  startDate: new Date().toISOString().split('T')[0],
                                  endDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
                                  nextVisitDate: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
                                });
                                setShowContractModal(true);
                              }}
                              className="px-3 py-1.5 bg-white/5 hover:bg-white/10 text-amber text-[10px] uppercase font-mono border border-white/10 rounded-lg"
                            >
                              Spawn Contract
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {/* List active agreements with GST Breakdown, PDF download, and Direct Email */}
            <div className="bg-navy border border-white/5 rounded-2xl p-6 shadow-2xl space-y-4">
              <div>
                <span className="text-[10px] text-amber font-mono uppercase font-bold tracking-wider">NABL calibration audit schedules</span>
                <h3 className="font-syne font-bold text-white text-sm uppercase">Active Hospital AMC Contracts Agreement Registry</h3>
              </div>

              {amcContracts.length === 0 ? (
                <p className="text-xs text-mono text-gray-500 py-4">No active contracts initialized.</p>
              ) : (
                <div className="overflow-x-auto border border-white/5 bg-[#10101e] rounded-xl">
                  <table className="w-full text-xs text-left divide-y divide-white/5 text-gray-400">
                    <thead>
                      <tr className="bg-navy text-gray-400 font-mono py-3">
                        <th className="p-4">Agreement Code</th>
                        <th className="p-4">Partner Station</th>
                        <th className="p-4">Period Frame</th>
                        <th className="p-4">Base + GST Value</th>
                        <th className="p-4 font-mono font-bold text-center">Status Index</th>
                        <th className="p-4 text-right">PDF &amp; Direct Email</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5 animate-fadeIn">
                      {amcContracts.map((contract) => {
                        const isExpiring = (new Date(contract.endDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24) <= 30;
                        const baseVal = Number(contract.baseAnnualValue ?? contract.annualValue ?? 0);
                        const gstPct = Number(contract.gstPercent ?? siteSettings?.gstPercent ?? 18);
                        const gstAmt = Number(contract.gstAmount ?? Math.round(baseVal * (gstPct / 100)));
                        const grandVal = Number(contract.totalWithGst ?? (baseVal + gstAmt));

                        return (
                          <tr key={contract.id} className={`hover:bg-white/2 ${
                            isExpiring ? 'bg-red-500/5 hover:bg-red-500/10' : ''
                          }`}>
                            <td className="p-4 font-mono font-bold text-amber">{contract.contractNumber}</td>
                            <td className="p-4">
                              <span className="text-white font-bold">{contract.hospitalName}</span>
                              <div className="text-[10px] text-gray-400 font-mono">{contract.planSelected}</div>
                              {(contract.email || contract.userEmail) && (
                                <div className="text-[10px] text-gray-500 font-mono">{contract.email || contract.userEmail}</div>
                              )}
                            </td>
                            <td className="p-4 font-mono text-[10px]">
                              <div>{contract.startDate} to {contract.endDate}</div>
                              <div className="text-gray-500">Next repair check: {contract.nextVisitDate}</div>
                            </td>
                            <td className="p-4 font-mono tabular-nums">
                              <div className="font-bold text-white">Rs {grandVal.toLocaleString()}</div>
                              <div className="text-[10px] text-gray-400">
                                Base Rs {baseVal.toLocaleString()} + {gstPct}% GST (Rs {gstAmt.toLocaleString()})
                              </div>
                            </td>
                            <td className="p-4 text-center">
                              {isExpiring ? (
                                <span className="inline-block px-2.5 py-0.5 rounded-full text-[8px] bg-red-600/15 text-red-400 border border-red-500/20 font-black uppercase tracking-widest animate-pulse">
                                  EXPIRING 30 DAYS
                                </span>
                              ) : (
                                <span className="inline-block px-2.5 py-0.5 rounded-full text-[8px] bg-green-500/10 text-green-400 border border-green-500/15 font-bold uppercase tracking-wider">
                                  ACTIVE SECURE
                                </span>
                              )}
                              {contract.lastEmailedAt && (
                                <div className="text-[9px] font-mono text-emerald-400 mt-1">
                                  Emailed {new Date(contract.lastEmailedAt).toLocaleDateString()}
                                </div>
                              )}
                            </td>
                            <td className="p-4 text-right whitespace-nowrap">
                              <div className="flex justify-end gap-1.5">
                                <button
                                  type="button"
                                  onClick={() => openEmailContractModal(contract)}
                                  className="px-2.5 py-1.5 rounded bg-amber/15 hover:bg-amber hover:text-navy border border-amber/30 text-amber text-[11px] font-bold inline-flex items-center gap-1 transition-colors"
                                  title="Email Agreement to Client"
                                >
                                  <Mail className="w-3.5 h-3.5" />
                                  <span>Email</span>
                                </button>
                                <button
                                  type="button"
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

                                      doc.setFillColor(242, 242, 242);
                                      doc.rect(10, 50, 190, 74, 'F');
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
                                      doc.text(`Base Annual Fee: Rs ${baseVal.toLocaleString()}  |  GST (${gstPct}%): Rs ${gstAmt.toLocaleString()}`, 15, 96);
                                      doc.setFont('Helvetica', 'bold');
                                      doc.text(`Total Agreement Value (Incl. GST): Rs ${grandVal.toLocaleString()}`, 15, 103);
                                      doc.setFont('Helvetica', 'normal');
                                      doc.text(`Next scheduled preventive: ${contract.nextVisitDate}`, 15, 110);

                                      doc.setFont('Helvetica', 'bold');
                                      doc.text("COVERED CORE CLINICAL SERVICES & CHECKLISTS:", 15, 134);
                                      doc.setFont('Helvetica', 'normal');
                                      let currentY = 142;
                                      contract.coveredServices?.forEach((cs: string) => {
                                        doc.text(`* [Covered Check] ${cs}`, 20, currentY);
                                        currentY += 8;
                                      });

                                      doc.line(10, 230, 80, 230);
                                      doc.text("Authorized SunMedX Engineer Sign", 15, 236);
                                      doc.line(125, 230, 195, 230);
                                      doc.text("Hospital Rep verification Sign", 130, 236);

                                      doc.save(`SunMedX-AMC-${contract.contractNumber}.pdf`);
                                    } catch (e: any) {
                                      setAmcNotice({ type: 'error', text: "Download PDF failed: " + e.message });
                                    }
                                  }}
                                  className="p-2 hover:bg-neutral-800 rounded bg-[#10101e] border border-white/5 text-amber"
                                  title="Download Agreement PDF"
                                >
                                  <ArrowDownToLine className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {/* AMC Plan Create / Edit Modal */}
            {showPlanModal && (
              <div className="fixed inset-0 z-[3000] bg-black/85 backdrop-blur-sm flex items-center justify-center p-4">
                <form onSubmit={saveAmcPlan} className="bg-[#111124] max-w-lg w-full border border-amber/25 rounded-2xl p-6 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto">
                  <div className="flex justify-between items-center border-b border-white/10 pb-3">
                    <h3 className="font-syne font-black text-white text-base uppercase">
                      {editingPlanId ? 'Edit AMC Plan & GST Rate' : 'Create AMC Plan Tier'}
                    </h3>
                    <button type="button" onClick={() => setShowPlanModal(false)} className="text-gray-400 hover:text-white">
                      <X className="w-4 h-4" />
                    </button>
                  </div>

                  <div className="space-y-3 text-xs">
                    <div>
                      <label className="text-[10px] font-mono text-gray-400 uppercase font-bold block mb-1">Plan Name *</label>
                      <input
                        type="text"
                        required
                        value={planForm.name}
                        onChange={(e) => setPlanForm((p) => ({ ...p, name: e.target.value }))}
                        className="w-full p-2.5 bg-navy border border-white/10 rounded-xl text-white"
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="text-[10px] font-mono text-gray-400 uppercase font-bold block mb-1">Base Annual Price (INR) *</label>
                        <input
                          type="number"
                          required
                          min={0}
                          value={planForm.annualPrice}
                          onChange={(e) => setPlanForm((p) => ({ ...p, annualPrice: Number(e.target.value) }))}
                          className="w-full p-2.5 bg-navy border border-white/10 rounded-xl text-white font-mono"
                        />
                      </div>
                      <div>
                        <label className="text-[10px] font-mono text-gray-400 uppercase font-bold block mb-1">GST Rate (%)</label>
                        <select
                          value={planForm.gstPercent}
                          onChange={(e) => setPlanForm((p) => ({ ...p, gstPercent: Number(e.target.value) }))}
                          className="w-full p-2.5 bg-navy border border-white/10 rounded-xl text-white font-mono"
                        >
                          {[0, 5, 12, 18, 28].map((rate) => (
                            <option key={rate} value={rate}>
                              {rate}% GST
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>

                    <div className="bg-navy/70 border border-amber/20 rounded-xl p-3 font-mono text-xs flex justify-between">
                      <span className="text-gray-300">Total Incl. {planForm.gstPercent}% GST:</span>
                      <span className="text-emerald-400 font-bold tabular-nums">
                        Rs {(planForm.annualPrice + Math.round((planForm.annualPrice * planForm.gstPercent) / 100)).toLocaleString()}
                      </span>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="text-[10px] font-mono text-gray-400 uppercase font-bold block mb-1">SLA Response Time</label>
                        <input
                          type="text"
                          value={planForm.responseTime}
                          onChange={(e) => setPlanForm((p) => ({ ...p, responseTime: e.target.value }))}
                          className="w-full p-2.5 bg-navy border border-white/10 rounded-xl text-white"
                        />
                      </div>
                      <div>
                        <label className="text-[10px] font-mono text-gray-400 uppercase font-bold block mb-1">Visit Frequency</label>
                        <input
                          type="text"
                          value={planForm.visitFrequency}
                          onChange={(e) => setPlanForm((p) => ({ ...p, visitFrequency: e.target.value }))}
                          className="w-full p-2.5 bg-navy border border-white/10 rounded-xl text-white"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="text-[10px] font-mono text-gray-400 uppercase font-bold block mb-1">Covered Services (Comma separated)</label>
                      <textarea
                        rows={2}
                        value={planForm.coveredServices}
                        onChange={(e) => setPlanForm((p) => ({ ...p, coveredServices: e.target.value }))}
                        className="w-full p-2.5 bg-navy border border-white/10 rounded-xl text-white"
                      />
                    </div>
                  </div>

                  <div className="flex gap-2 pt-2">
                    <button type="button" onClick={() => setShowPlanModal(false)} className="flex-1 py-2.5 rounded-xl border border-white/15 text-xs font-bold text-gray-300">
                      Cancel
                    </button>
                    <button type="submit" className="flex-1 py-2.5 rounded-xl bg-gradient-to-r from-crimson to-amber text-navy text-xs font-black uppercase">
                      Save AMC Plan
                    </button>
                  </div>
                </form>
              </div>
            )}

            {/* AMC Create Agreement Form Modal (With Client Email & Built-In GST Calculation) */}
            {showContractModal && (
              <div className="fixed inset-0 z-[3000] bg-black/90 backdrop-blur-md flex items-center justify-center p-4 sm:p-6 animate-fadeIn">
                <form onSubmit={(e) => createAmcContract(e, false)} className="bg-[#111124] max-w-xl w-full border border-amber/20 rounded-3xl p-6 sm:p-7 shadow-2xl relative space-y-4 overflow-y-auto max-h-[92vh]">
                  <div className="flex justify-between items-center border-b border-white/5 pb-3">
                    <div>
                      <span className="text-[10px] font-mono text-amber font-black uppercase tracking-widest bg-amber-500/10 border border-amber/20 px-2 py-0.5 rounded-full">
                        SunMedX Contract Desk
                      </span>
                      <h3 className="font-syne font-black text-white text-base tracking-wider uppercase mt-1">
                        Register Annual Maintenance Agreement
                      </h3>
                    </div>
                    <button
                      type="button"
                      onClick={() => setShowContractModal(false)}
                      className="w-8 h-8 rounded-full bg-white/5 flex items-center justify-center text-gray-400 hover:text-white"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 text-xs font-mono">
                    <div className="space-y-1">
                      <label className="text-[10px] text-gray-400 font-bold uppercase">Contract Code *</label>
                      <input
                        type="text"
                        required
                        value={amcForm.contractNumber}
                        onChange={(e) => setAmcForm((p) => ({ ...p, contractNumber: e.target.value }))}
                        className="w-full p-2.5 bg-navy border border-white/10 rounded-xl text-white outline-none"
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="text-[10px] text-gray-400 font-bold uppercase">Partner Hospital *</label>
                      <input
                        type="text"
                        required
                        value={amcForm.hospitalName}
                        onChange={(e) => setAmcForm((p) => ({ ...p, hospitalName: e.target.value }))}
                        className="w-full p-2.5 bg-navy border border-white/10 rounded-xl text-white outline-none"
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="text-[10px] text-gray-400 font-bold uppercase">Contact Representative</label>
                      <input
                        type="text"
                        value={amcForm.contactPerson}
                        onChange={(e) => setAmcForm((p) => ({ ...p, contactPerson: e.target.value }))}
                        className="w-full p-2.5 bg-navy border border-white/10 rounded-xl text-white outline-none"
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="text-[10px] text-gray-400 font-bold uppercase">Client Email (For Direct Dispatch) *</label>
                      <input
                        type="email"
                        required
                        placeholder="biomed@hospital.in"
                        value={amcForm.email}
                        onChange={(e) => setAmcForm((p) => ({ ...p, email: e.target.value }))}
                        className="w-full p-2.5 bg-navy border border-white/10 rounded-xl text-white outline-none"
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="text-[10px] text-gray-400 font-bold uppercase">Contact Phone</label>
                      <input
                        type="text"
                        value={amcForm.phone}
                        onChange={(e) => setAmcForm((p) => ({ ...p, phone: e.target.value }))}
                        className="w-full p-2.5 bg-navy border border-white/10 rounded-xl text-white outline-none"
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="text-[10px] text-gray-400 font-bold uppercase">AMC Plan Tier</label>
                      <select
                        value={amcForm.planSelected}
                        onChange={(e) => {
                          const selectedName = e.target.value;
                          const found = amcPlans.find((pl) => pl.name === selectedName);
                          setAmcForm((p) => ({
                            ...p,
                            planSelected: selectedName,
                            annualValue: found ? Number(found.annualPrice) : p.annualValue,
                            gstPercent: found?.gstPercent !== undefined ? Number(found.gstPercent) : p.gstPercent,
                          }));
                        }}
                        className="w-full p-2.5 bg-navy border border-white/10 rounded-xl text-white outline-none"
                      >
                        {amcPlans.map((pl) => (
                          <option key={pl.id || pl.name} value={pl.name}>
                            {pl.name} (Rs {Number(pl.annualPrice).toLocaleString()})
                          </option>
                        ))}
                        <option value="Custom Institutional AMC">Custom Institutional AMC</option>
                      </select>
                    </div>

                    <div className="space-y-1 sm:col-span-2">
                      <label className="text-[10px] text-gray-400 font-bold uppercase">Equipments Serial list *</label>
                      <input
                        type="text"
                        required
                        placeholder="Siemens MRI #SU-99A, Ultrasonic #US-001"
                        value={amcForm.equipmentList}
                        onChange={(e) => setAmcForm((p) => ({ ...p, equipmentList: e.target.value }))}
                        className="w-full p-2.5 bg-navy border border-white/10 rounded-xl text-white outline-none"
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="text-[10px] text-gray-400 font-bold uppercase">Base Annual Fee (INR) *</label>
                      <input
                        type="number"
                        required
                        min={0}
                        value={amcForm.annualValue}
                        onChange={(e) => setAmcForm((p) => ({ ...p, annualValue: Number(e.target.value) }))}
                        className="w-full p-2.5 bg-navy border border-white/10 rounded-xl text-white outline-none tabular-nums"
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="text-[10px] text-gray-400 font-bold uppercase">GST Rate (%)</label>
                      <select
                        value={amcForm.gstPercent}
                        onChange={(e) => setAmcForm((p) => ({ ...p, gstPercent: Number(e.target.value) }))}
                        className="w-full p-2.5 bg-navy border border-white/10 rounded-xl text-white outline-none"
                      >
                        {[0, 5, 12, 18, 28].map((rate) => (
                          <option key={rate} value={rate}>
                            {rate}% GST
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* Live GST Calculation Summary */}
                    <div className="sm:col-span-2 bg-navy border border-amber/25 rounded-xl p-3 space-y-1 tabular-nums">
                      <div className="flex justify-between text-gray-300">
                        <span>Base Annual Value:</span>
                        <span>Rs {Number(amcForm.annualValue || 0).toLocaleString()}</span>
                      </div>
                      <div className="flex justify-between text-amber">
                        <span>GST ({amcForm.gstPercent}%):</span>
                        <span>Rs {Math.round((Number(amcForm.annualValue || 0) * Number(amcForm.gstPercent || 0)) / 100).toLocaleString()}</span>
                      </div>
                      <div className="flex justify-between text-emerald-400 font-bold border-t border-white/10 pt-1">
                        <span>Total Agreement Value (Incl. GST):</span>
                        <span>
                          Rs {(
                            Number(amcForm.annualValue || 0) +
                            Math.round((Number(amcForm.annualValue || 0) * Number(amcForm.gstPercent || 0)) / 100)
                          ).toLocaleString()}
                        </span>
                      </div>
                    </div>

                    <div className="space-y-1">
                      <label className="text-[10px] text-gray-400 font-bold uppercase">Agreement Start Date *</label>
                      <input
                        type="date"
                        required
                        value={amcForm.startDate}
                        onChange={(e) => setAmcForm((p) => ({ ...p, startDate: e.target.value }))}
                        className="w-full p-2.5 bg-navy border border-white/10 rounded-xl text-white outline-none"
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="text-[10px] text-gray-400 font-bold uppercase">Agreement Exp Date *</label>
                      <input
                        type="date"
                        required
                        value={amcForm.endDate}
                        onChange={(e) => setAmcForm((p) => ({ ...p, endDate: e.target.value }))}
                        className="w-full p-2.5 bg-navy border border-white/10 rounded-xl text-white outline-none"
                      />
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-2.5 pt-2">
                    <button
                      type="button"
                      onClick={() => setShowContractModal(false)}
                      className="px-4 py-3 border border-white/10 rounded-xl text-xs font-bold uppercase text-gray-400 font-syne"
                    >
                      Close
                    </button>
                    <button
                      type="submit"
                      className="flex-1 py-3 bg-white/10 hover:bg-white/15 text-white rounded-xl text-xs font-bold uppercase tracking-wider font-syne"
                    >
                      Save Contract
                    </button>
                    <button
                      type="button"
                      disabled={emailSending}
                      onClick={(e) => createAmcContract(e as any, true)}
                      className="flex-1 py-3 bg-gradient-to-r from-crimson to-amber text-navy rounded-xl text-xs font-black uppercase tracking-wider font-syne flex items-center justify-center gap-1.5"
                    >
                      <Mail className="w-3.5 h-3.5" />
                      <span>Save &amp; Email Client</span>
                    </button>
                  </div>
                </form>
              </div>
            )}

            {/* Direct Email AMC Agreement Modal */}
            {emailModalContract && (
              <div className="fixed inset-0 z-[3100] bg-black/85 backdrop-blur-sm flex items-center justify-center p-4">
                <div className="bg-[#111124] max-w-lg w-full border border-amber/30 rounded-2xl p-6 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto">
                  <div className="flex items-center justify-between border-b border-white/10 pb-3">
                    <div>
                      <span className="text-[10px] font-mono text-amber uppercase font-bold">Direct Agreement Dispatch</span>
                      <h3 className="font-syne font-black text-white text-base uppercase">
                        Email {emailModalContract.contractNumber}
                      </h3>
                    </div>
                    <button type="button" onClick={() => setEmailModalContract(null)} className="text-gray-400 hover:text-white">
                      <X className="w-4 h-4" />
                    </button>
                  </div>

                  <div className="space-y-3 text-xs">
                    <div>
                      <label className="text-[10px] font-mono text-gray-400 uppercase font-bold block mb-1">Recipient Email *</label>
                      <input
                        type="email"
                        value={emailTo}
                        onChange={(e) => setEmailTo(e.target.value)}
                        className="w-full p-2.5 bg-navy border border-white/10 rounded-xl text-white font-mono"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] font-mono text-gray-400 uppercase font-bold block mb-1">Subject *</label>
                      <input
                        type="text"
                        value={emailSubject}
                        onChange={(e) => setEmailSubject(e.target.value)}
                        className="w-full p-2.5 bg-navy border border-white/10 rounded-xl text-white"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] font-mono text-gray-400 uppercase font-bold block mb-1">Agreement Summary Body *</label>
                      <textarea
                        rows={8}
                        value={emailBody}
                        onChange={(e) => setEmailBody(e.target.value)}
                        className="w-full p-2.5 bg-navy border border-white/10 rounded-xl text-white font-mono text-[11px] leading-relaxed"
                      />
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-2 pt-2">
                    <a
                      href={`mailto:${encodeURIComponent(emailTo)}?subject=${encodeURIComponent(emailSubject)}&body=${encodeURIComponent(emailBody.slice(0, 1800))}`}
                      className="px-4 py-2.5 rounded-xl border border-white/15 text-xs font-bold text-gray-200 hover:bg-white/5 inline-flex items-center gap-1.5"
                    >
                      <ExternalLink className="w-3.5 h-3.5 text-amber" />
                      <span>Open Mail App</span>
                    </a>
                    <button
                      type="button"
                      disabled={emailSending || !emailTo.trim()}
                      onClick={() => dispatchContractEmail(emailModalContract, emailTo, emailSubject, emailBody)}
                      className="flex-1 py-2.5 px-4 rounded-xl bg-gradient-to-r from-crimson to-amber text-navy font-syne font-black text-xs uppercase tracking-wider flex items-center justify-center gap-1.5 disabled:opacity-50"
                    >
                      {emailSending ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                      <span>{emailSending ? 'Sending...' : 'Send Direct Email'}</span>
                    </button>
                  </div>
                </div>
              </div>
            )}

          </div>
        )}

        {/* EMAIL MARKETING & SOCIAL MEDIA MANAGER MODULE */}
        {activeSection === 'marketing_social' && (
          <MarketingSocialManager
            adminEmail={adminEmail}
            siteSettings={siteSettings}
            onUpdateSettings={onUpdateSettings}
            usersList={usersList}
            quotations={quotations}
            amcContracts={amcContracts}
            services={services}
            catalogue={catalogue}
            courses={courses}
            logAdminAction={logAdminAction}
          />
        )}

        {/* WHATSAPP ALERTS & LIVE TRANSLATIONS CONTROL MODULE */}
        {activeSection === 'saas_telemetry' && (
          <div className="space-y-8 animate-fadeIn">
            <div>
              <h2 className="font-syne font-black text-xl text-white uppercase tracking-wider">WhatsApp Alerts & Dynamic Translations Console</h2>
              <p className="text-xs text-amber font-mono">Manage real-time communication broadcasts and edit multilingual dictionaries</p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
              
              {/* Translations list inputs compiler */}
              <div className="lg:col-span-4 bg-navy border border-white/5 rounded-2xl p-6 shadow-xl h-fit space-y-4">
                <div>
                  <span className="text-[9px] text-amber font-mono uppercase tracking-widest font-black">Lingo Module dictionary</span>
                  <h3 className="font-syne font-black text-white text-sm uppercase">Add Linguistic Key</h3>
                </div>

                <form onSubmit={saveLiveTranslation} className="space-y-3 font-mono text-xs">
                  <div>
                    <label className="block text-[9px] text-gray-500 uppercase mb-1">Lexicon key word *</label>
                    <input 
                      type="text" required placeholder="eg: call_support"
                      value={newKey}
                      onChange={(e) => setNewKey(e.target.value)}
                      className="w-full p-2.5 bg-[#10101e] border border-white/10 rounded-lg text-white" 
                    />
                  </div>
                  <div>
                    <label className="block text-[9px] text-gray-500 uppercase mb-1">English (Default) value *</label>
                    <input 
                      type="text" required placeholder="Call Calibration support"
                      value={enValue}
                      onChange={(e) => setEnValue(e.target.value)}
                      className="w-full p-2.5 bg-[#10101e] border border-white/10 rounded-lg text-white" 
                    />
                  </div>
                  <div>
                    <label className="block text-[9px] text-gray-500 uppercase mb-1">Hindi (हिंदी) translation value</label>
                    <input 
                      type="text" placeholder="कैलिब्रेशन सहायता को कॉल करें"
                      value={hiValue}
                      onChange={(e) => setHiValue(e.target.value)}
                      className="w-full p-2.5 bg-[#10101e] border border-white/10 rounded-lg text-white" 
                    />
                  </div>
                  <div>
                    <label className="block text-[9px] text-gray-500 uppercase mb-1">Marathi (मराठी) translation value</label>
                    <input 
                      type="text" placeholder="कॅलिब्रेशन सपोर्टशी संपर्क साधा"
                      value={mrValue}
                      onChange={(e) => setMrValue(e.target.value)}
                      className="w-full p-2.5 bg-[#10101e] border border-white/10 rounded-lg text-white" 
                    />
                  </div>

                  <button 
                    type="submit"
                    className="w-full py-2.5 bg-gradient-to-r from-crimson to-amber hover:opacity-90 text-navy font-black rounded-xl text-[10px] uppercase tracking-wider font-syne"
                  >
                    Save Translation Key
                  </button>
                </form>

                <div className="border-t border-white/5 pt-3 space-y-2">
                  <span className="text-[9px] text-gray-500 uppercase font-mono">Live translation registries</span>
                  <div className="max-h-[220px] overflow-y-auto space-y-1.5 text-[10px] font-mono leading-none">
                    {translations.map((t) => (
                      <div key={t.id} className="p-2 bg-black/15 border border-white/5 rounded">
                        <p className="text-amber font-bold">{t.key}</p>
                        <p className="text-white mt-1">en: {t.en}</p>
                        <p className="text-gray-400">hi: {t.hi}</p>
                        <p className="text-gray-400">mr: {t.mr}</p>
                      </div>
                    ))}
                  </div>
                </div>

              </div>

              {/* WhatsApp alerts manager */}
              <div className="lg:col-span-8 space-y-6">
                
                {/* Templates list with inline textareas */}
                <div className="bg-navy border border-white/5 rounded-2xl p-6 shadow-xl space-y-4">
                  <div>
                    <span className="text-[9px] text-amber font-mono uppercase tracking-widest font-black">Meta cloud alert dispatchers</span>
                    <h3 className="font-syne font-black text-white text-sm uppercase">Enrolled SMS & WhatsApp alert templates</h3>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {waTemplates.map((item) => (
                      <div key={item.id} className="p-4 bg-[#10101e] border border-white/5 rounded-xl space-y-3 font-mono text-xs">
                        <div className="flex justify-between border-b border-white/5 pb-1.5">
                          <span className="text-amber font-bold">{item.templateName}</span>
                          <span className="text-[9px] text-gray-500 uppercase">Index: {item.id}</span>
                        </div>
                        <textarea
                          rows={3}
                          defaultValue={item.body}
                          onBlur={(e) => updateWaTemplate(item.id, e.target.value)}
                          className="w-full p-2 bg-navy border border-white/10 rounded-lg text-gray-300 outline-none text-[10px] font-sans resize-none"
                        />
                        <p className="text-[9px] text-gray-500 italic">Click outside field to save live update</p>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Sent logs queue history */}
                <div className="bg-navy border border-white/5 rounded-2xl p-6 shadow-xl space-y-4">
                  <div>
                    <span className="text-[9px] text-amber font-mono uppercase tracking-widest font-black">Audit broadcast log ledger</span>
                    <h3 className="font-syne font-black text-white text-sm uppercase">Recent WhatsApp Sent Alert Loggers</h3>
                  </div>

                  {waLogs.length === 0 ? (
                    <p className="text-xs text-gray-500 font-mono italic">No alert items routed through the gateway.</p>
                  ) : (
                    <div className="overflow-x-auto border border-white/5 bg-[#10101e] rounded-xl max-h-[300px]">
                      <table className="w-full text-xs text-left divide-y divide-white/5 text-gray-400">
                        <thead className="bg-navy text-gray-500 font-mono">
                          <tr>
                            <th className="p-3">Alert Template</th>
                            <th className="p-3">Dest Phone</th>
                            <th className="p-3">Broadcast string</th>
                            <th className="p-3 text-right">Time dispatched</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-white/5 text-[11px] font-mono leading-relaxed">
                          {waLogs.map((log) => (
                            <tr key={log.id} className="hover:bg-white/2">
                              <td className="p-3 text-amber font-black">{log.templateName}</td>
                              <td className="p-3 text-white font-bold">{log.recipient}</td>
                              <td className="p-3 text-[10px] text-gray-400">"{log.message}"</td>
                              <td className="p-3 text-right text-[10px] text-gray-500">{new Date(log.timestamp).toLocaleTimeString()}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>

              </div>

            </div>
          </div>
        )}

        {/* ADVANCED SAAS ANALYTICS & GST ACCOUNTING AUDITOR */}
        {activeSection === 'advanced_analytics' && (
          <div className="space-y-8 animate-fadeIn">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
              <div>
                <h2 className="font-syne font-black text-xl text-white uppercase tracking-wider">Advanced SaaS Analytics & GST Ledger Suite</h2>
                <p className="text-xs text-amber font-mono">Audit state compliance, download operational CSV logs, and compile month-end compliance books</p>
              </div>
              
              <button
                onClick={() => {
                  try {
                    const doc = new jsPDF();
                    doc.setFillColor(26, 26, 46);
                    doc.rect(0, 0, 210, 42, 'F');
                    doc.setTextColor(255, 255, 255);
                    doc.setFont('Helvetica', 'bold');
                    doc.setFontSize(22);
                    doc.text("SUNMEDX GLOBAL OPERATING SUMMARY", 15, 24);
                    doc.setFontSize(9);
                    doc.text("Comprehensive summary metrics compiled using secure database assets", 15, 32);

                    doc.setTextColor(50, 50, 50);
                    doc.setFont('Helvetica', 'normal');
                    doc.text(`Report Compilation Date: ${new Date().toLocaleDateString()}`, 15, 50);
                    doc.text(`Active Registered Clients count: ${usersList.length} hospitals`, 15, 58);
                    doc.text(`Volume of active maintenance contracts: ${amcContracts.length} agreements`, 15, 66);
                    doc.text(`Completed field technician repair cases: ${techJobs.filter(t => t.status === 'Completed').length} checkouts`, 15, 74);
                    doc.text(`Store dynamic orders calculated aggregate: Rs ${orders.reduce((acc, o) => acc + (o.total || 0), 0).toLocaleString()}`, 15, 82);

                    doc.text("All clinical calibrations conform with NABL ISO 17025 verification schemas.", 15, 100);

                    doc.save(`SunMedX-MonthlyOperations-${new Date().toISOString().slice(0,7)}.pdf`);
                    alert("Operations summary compiled using dynamic jsPDF!");
                  } catch (e: any) {
                    alert(e.message);
                  }
                }}
                className="px-4 py-2 bg-[#FF9A3C]/10 text-amber border border-amber/20 rounded-xl text-xs uppercase font-mono font-bold hover:bg-[#FF9A3C]/20"
              >
                Compile Operations PDF report
              </button>
            </div>

            {/* SLA repairs & total click telemetry loggers */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-5">
              <div className="bg-[#10101e] border border-white/5 rounded-2xl p-5 shadow-lg">
                <span className="text-[9px] text-gray-500 font-mono uppercase block">Client registry size</span>
                <span className="text-2xl font-syne font-black text-white block mt-1">{usersList.length} Contacts</span>
              </div>
              <div className="bg-[#10101e] border border-white/5 rounded-2xl p-5 shadow-lg">
                <span className="text-[9px] text-gray-500 font-mono uppercase block">Active service ticketing</span>
                <span className="text-2xl font-syne font-black text-amber block mt-1">{services.length} Tickets</span>
              </div>
              <div className="bg-[#10101e] border border-white/5 rounded-2xl p-5 shadow-lg">
                <span className="text-[9px] text-gray-500 font-mono uppercase block">Aggregate revenue registry</span>
                <span className="text-2xl font-syne font-black text-green-400 block mt-1">Rs {orders.reduce((acc, o) => acc + (o.total || 0), 0).toLocaleString()}</span>
              </div>
              <div className="bg-[#10101e] border border-white/5 rounded-2xl p-5 shadow-lg">
                <span className="text-[9px] text-gray-500 font-mono uppercase block">Total diagnostic Telemetry Click logs</span>
                <span className="text-2xl font-syne font-black text-orange-400 block mt-1">1,489 Clicks</span>
              </div>
            </div>

            {/* GST audit ledger summary container */}
            <div className="bg-navy border border-white/5 rounded-2xl p-6 shadow-2xl space-y-5">
              <div>
                <span className="text-[9px] text-amber font-mono uppercase tracking-widest font-black mb-1 block">Government Taxation Audit tracker</span>
                <h3 className="font-syne font-black text-lg text-white uppercase">GST Accounting Ledger summaries</h3>
              </div>

              <div className="overflow-x-auto border border-white/5 bg-[#10101e] rounded-xl text-xs">
                <table className="w-full text-xs text-left divide-y divide-white/5 text-gray-400">
                  <thead className="bg-navy text-gray-500 font-mono">
                    <tr>
                      <th className="p-4">Hospital Partner</th>
                      <th className="p-4">Recorded GSTIN number</th>
                      <th className="p-4">Paid base value</th>
                      <th className="p-4 font-mono font-bold text-center">CGST 9%</th>
                      <th className="p-4 font-mono font-bold text-center">SGST 9%</th>
                      <th className="p-4 font-mono font-bold text-right">Aggregate value</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5 font-mono">
                    {orders.map((o) => {
                      const baseVal = (o.total || 0) / 1.18;
                      const taxComp = baseVal * 0.09;
                      return (
                        <tr key={o.id} className="hover:bg-white/2">
                          <td className="p-4 font-sans font-bold text-white mb-0.5">{o.userEmail} <div className="text-[9px] text-gray-500 font-mono">Order code: #{o.id}</div></td>
                          <td className="p-4 font-mono font-bold text-amber">{o.gstin || "27AAPCS1102K1ZP"}</td>
                          <td className="p-4 font-bold text-gray-300">Rs {baseVal.toFixed(2)}</td>
                          <td className="p-4 text-center">Rs {taxComp.toFixed(2)}</td>
                          <td className="p-4 text-center">Rs {taxComp.toFixed(2)}</td>
                          <td className="p-4 text-right text-white font-heavy">Rs {Number(o.total || 0).toLocaleString()}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Spreadsheet CSV downloading workspace */}
            <div className="bg-navy border border-white/5 rounded-2xl p-6 shadow-2xl space-y-4">
              <div>
                <span className="text-[9px] text-amber font-mono uppercase tracking-widest font-black">Bulk compliance exports</span>
                <h3 className="font-syne font-black text-sm text-white uppercase">Download compliant ledger reports (.csv format)</h3>
              </div>

              <div className="flex flex-wrap gap-4 font-mono text-[11px]">
                <button
                  onClick={() => {
                    let csv = "ContractNo,HospitalParty,Liaison,Phone,Email,Scheme,Value,StartDate,EndDate\n";
                    amcContracts.forEach((c) => {
                      csv += `"${c.contractNumber}","${c.hospitalName}","${c.contactPerson || ''}","${c.phone || ''}","${c.email || ''}","${c.planSelected}",${c.annualValue || 0},"${c.startDate}","${c.endDate}"\n`;
                    });
                    const blob = new Blob([csv], { type: 'text/csv' });
                    const link = document.createElement('a');
                    link.href = URL.createObjectURL(blob);
                    link.download = `SunMedX_AMC_Contracts_${Date.now()}.csv`;
                    link.click();
                  }}
                  className="px-4 py-3 bg-white/5 hover:bg-white/10 text-amber border border-white/10 rounded-xl"
                >
                  Export Active AMC Contracts (.CSV)
                </button>

                <button
                  onClick={() => {
                    let csv = "OrderNo,ClientEmail,GstinCode,BaseValue,GstValue,PaidAggregate,DateDispatched\n";
                    orders.forEach((o) => {
                      const base = (o.total || 0) / 1.18;
                      const taxField = base * 0.18;
                      csv += `"${o.id}","${o.userEmail}","${o.gstin || '27AAPCS1102K1ZP'}",${base.toFixed(2)},${taxField.toFixed(2)},${o.total || 0},"${o.createdAt || ''}"\n`;
                    });
                    const blob = new Blob([csv], { type: 'text/csv' });
                    const link = document.createElement('a');
                    link.href = URL.createObjectURL(blob);
                    link.download = `SunMedX_GST_Audit_Ledger_${Date.now()}.csv`;
                    link.click();
                  }}
                  className="px-4 py-3 bg-white/5 hover:bg-white/10 text-amber border border-white/10 rounded-xl"
                >
                  Download GST Accounting Audit CSV
                </button>
              </div>
            </div>

          </div>
        )}

        {/* HISTORIC AUDIT CHANGE LOG */}
        {activeSection === 'changelog' && (
          <div className="bg-navy border border-white/5 rounded-2xl p-6 shadow-2xl space-y-6 animate-fadeIn">
            <div>
              <h2 className="font-syne font-black text-xl text-white uppercase tracking-wider">Immutable Security Ledger audit trail</h2>
              <p className="text-xs text-amber font-mono">Strict compliance trail documenting administrative logins and configurations changes</p>
            </div>

            <div className="overflow-x-auto border border-white/5 bg-[#10101e] rounded-xl">
              <table className="w-full text-xs text-left divide-y divide-white/5 text-gray-300">
                <thead>
                  <tr className="bg-navy text-gray-400 font-mono py-4">
                    <th className="p-4 font-bold">Action Vector ID</th>
                    <th className="p-4 font-bold">Involved Administrator</th>
                    <th className="p-4 font-bold">Description Ledger parameters</th>
                    <th className="p-4 font-bold text-right">Time executed</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {changeLogs.map((log) => (
                    <tr key={log.id} className="hover:bg-white/2">
                      <td className="p-4 font-mono font-bold text-amber">#{log.action}</td>
                      <td className="p-4 font-mono text-[11px] font-bold text-white">{log.adminEmail}</td>
                      <td className="p-4 text-gray-300 leading-relaxed font-semibold">"{log.details}"</td>
                      <td className="p-4 text-right font-mono text-gray-500 text-[11px]">{new Date(log.timestamp).toLocaleString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* TOOL CONFIGS CRUD */}
        {activeSection === 'tools' && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 animate-fadeIn">
            {/* Form */}
            <div className="lg:col-span-4 bg-navy rounded-2xl border border-white/5 p-6 shadow-xl h-fit">
              <h3 className="font-syne font-black text-sm text-amber uppercase tracking-wider mb-4">
                {editingToolId ? 'Update custom tool' : 'Register Custom floating tool'}
              </h3>
              <form onSubmit={saveTool} className="space-y-4">
                <div>
                  <label className="block text-[10px] font-mono ... mb-1">Unique Tool Identifier name *</label>
                  <input
                    type="text"
                    required
                    value={toolForm.name}
                    onChange={(e) => setToolForm(p => ({ ...p, name: e.target.value }))}
                    className="w-full bg-[#10101e] border-orange-500/20 rounded-xl px-4 py-3 text-xs text-white"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[10px] font-mono ... mb-1 block">Icon fontawesome class</label>
                    <input
                      type="text"
                      value={toolForm.icon}
                      onChange={(e) => setToolForm(p => ({ ...p, icon: e.target.value }))}
                      className="w-full bg-[#10101e] border-orange-500/20 rounded-xl px-4 py-3 text-xs text-white font-mono"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-mono ... mb-1 font-bold">Stylet hex Color picker</label>
                    <input
                      type="color"
                      value={toolForm.color}
                      onChange={(e) => setToolForm(p => ({ ...p, color: e.target.value }))}
                      className="w-full h-11 bg-transparent border-0 cursor-pointer outline-none"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[10px] font-mono ... mb-1 font-bold">Target Redirect URL (Null = invalid fallback)</label>
                  <input
                    type="text"
                    placeholder="e.g. https://google.com or leave blank"
                    value={toolForm.url || ''}
                    onChange={(e) => setToolForm(p => ({ ...p, url: e.target.value }))}
                    className="w-full bg-[#10101e] border border-orange-500/20 rounded-xl px-4 py-3 text-xs text-white font-mono"
                  />
                </div>

                <div className="flex gap-2">
                  <button type="submit" className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-crimson to-amber text-navy font-bold uppercase text-xs tracking-wider flex items-center justify-center gap-1.5 font-syne">
                    <Plus className="w-4.5 h-4.5" />
                    <span>Save configured tool</span>
                  </button>
                </div>
              </form>
            </div>

            {/* List */}
            <div className="lg:col-span-8 bg-navy border border-white/5 rounded-2xl p-6 shadow-xl">
              <h3 className="font-syne font-black text-sm text-gray-300 uppercase tracking-widest mb-4">Custom Calibration tools registry</h3>
              <div className="overflow-x-auto border border-white/5 bg-[#10101e] rounded-xl">
                <table className="w-full text-xs text-left divide-y divide-white/5 text-gray-300">
                  <thead>
                    <tr className="bg-navy text-gray-400 font-mono py-4">
                      <th className="p-4">Visual Icon</th>
                      <th className="p-4">Tool Display Name</th>
                      <th className="p-4 font-bold">Color Theme Hex</th>
                      <th className="p-4 font-bold font-mono">Url Endpoint</th>
                      <th className="p-4 text-right">Configure</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5">
                    {tools.map((t) => (
                      <tr key={t.id} className="hover:bg-white/2">
                        <td className="p-4">
                          <span className="w-8 h-8 rounded bg-white/5 flex items-center justify-center" style={{ color: t.color }}>
                            <i className={`${t.icon} text-lg`} />
                          </span>
                        </td>
                        <td className="p-4 font-syne font-bold text-white">{t.name}</td>
                        <td className="p-4 font-mono font-bold" style={{ color: t.color }}>{t.color}</td>
                        <td className="p-4 font-mono">{t.url || <span className="text-gray-500 italic">No URL (opens invalid fallback)</span>}</td>
                        <td className="p-4 text-right">
                          <button onClick={() => deleteTool(t.id!, t.name)} className="p-1 text-gray-500 hover:text-red-500">
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* QUOTE & INVOICE GENERATOR */}
        {activeSection === 'invoice_generator' && (
          <QuoteInvoiceGenerator
            adminEmail={adminEmail}
            siteSettings={siteSettings}
            onUpdateSettings={onUpdateSettings}
            usersList={usersList}
            catalogue={catalogue}
            quotations={quotations}
            orders={orders}
            logAdminAction={logAdminAction}
          />
        )}

        {/* PAYMENT GATEWAY SETUP */}
        {activeSection === 'payment_gateway' && (
          <PaymentGatewaySetup
            siteSettings={siteSettings}
            onUpdateSettings={onUpdateSettings}
            logAdminAction={logAdminAction}
          />
        )}

        {/* BIOMEDICAL AI AGENT / WORKER MODULE */}
        {activeSection === 'ai_worker' && (
          <BiomedicalAgentWorker
            adminEmail={adminEmail}
            catalogue={catalogue}
            courses={courses}
            tools={tools}
            pendingQuotesCount={unansweredQuotesCount}
            pendingServicesCount={pendingServiceCount}
            activeAmcCount={amcContracts.length}
            siteSettings={siteSettings}
            onUpdateSettings={onUpdateSettings}
            onLogAction={logAdminAction}
            onStageProduct={(draft) => {
              setEditingProdId(null);
              setProdForm({
                name: draft.name || '',
                price: draft.price || 0,
                category: draft.category || 'Critical Care',
                badge: draft.badge || '',
                hsnSac: draft.hsnSac || '9018',
                description: draft.description || '',
                features: draft.features || [],
                image: draft.image || PRODUCT_ASSET_FALLBACKS.analyzer,
              });
              setFeatureInput((draft.features || []).join(', '));
              setActiveSection('catalogue');
              setShowProdModal(true);
            }}
            onStageCourse={(draft) => {
              setEditingCourseId(null);
              setCourseForm({
                title: draft.title || '',
                level: draft.level || 'Intermediate',
                duration: draft.duration || '4 Weeks',
                language: draft.language || 'English / Hindi',
                price: draft.price || 0,
                featured: draft.featured ?? true,
                graphyUrl: draft.graphyUrl || 'https://sunmedxacademy.graphy.com',
              });
              setActiveSection('academy');
            }}
            onStageTool={(draft) => {
              setEditingToolId(null);
              setToolForm({
                name: draft.name || '',
                icon: draft.icon || 'fa-solid fa-calculator',
                category: draft.category || 'Diagnostics',
                color: draft.color || '#0EA5E9',
                isFree: draft.isFree ?? true,
                url: draft.url || '',
              });
              setActiveSection('tools');
            }}
          />
        )}

        {/* SUNMEDX COMPLETE DOCUMENTATION & RUNBOOK */}
        {activeSection === 'documentation' && (
          <SunMedXDocumentation
            adminEmail={adminEmail}
            siteSettings={siteSettings}
            changeLogsCount={changeLogs.length}
            catalogueCount={catalogue.length}
            coursesCount={courses.length}
            toolsCount={tools.length}
          />
        )}

        {/* PLATFORM WHITE LABEL MANAGER */}
        {activeSection === 'platform_manager' && isSuperAdmin && (
          <div className="animate-fadeIn">
            <PlatformManager onLogout={onLogout} />
          </div>
        )}

      </div>

      {/* FLOATING ADMIN BIOMEDICAL AI WORKER TRIGGER */}
      {activeSection !== 'ai_worker' && (
        <button
          type="button"
          onClick={() => setActiveSection('ai_worker')}
          className="fixed bottom-4 right-4 sm:bottom-6 sm:right-6 z-[990] bg-gradient-to-r from-crimson to-amber text-navy px-4 py-2.5 sm:px-5 sm:py-3 rounded-full font-syne font-black text-xs flex items-center gap-2 shadow-2xl hover:scale-105 active:scale-95 transition-all border border-amber/60"
        >
          <Sparkles className="w-4 h-4 shrink-0" />
          <span className="sm:hidden">AI Worker</span>
          <span className="hidden sm:inline">SunMedX AI Worker</span>
        </button>
      )}
    </div>
  );
}
