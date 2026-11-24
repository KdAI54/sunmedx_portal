import React, { useState, useEffect, useRef } from 'react';
import {
  Star,
  ArrowRight,
  CheckCircle2,
  Award,
  ShieldCheck,
  ChevronDown,
  ChevronUp,
  Wrench,
  Cpu,
  Clock,
  GraduationCap,
  Send,
  RefreshCw,
  Check,
  X as XIcon,
  Sparkles,
} from 'lucide-react';
import { getDb } from '../services/dataClient';
import { PRODUCT_ASSET_FALLBACKS } from '../config/seed';
import { DEFAULT_SUBSCRIPTION_PLANS, PLAN_MODULE_LABELS } from '../config/plans';
import { Testimonial, Service, Course, Tool, SiteSettings, SubscriptionPlan, PlanModuleKey } from '../types';

interface HomeProps {
  onNavigate: (hash: string) => void;
  siteSettings: SiteSettings | null;
  subscriptionPlans?: SubscriptionPlan[];
  userEmail?: string;
  scrollToPlans?: boolean;
}

const VALIDATION_MODULES = [
  {
    track: 'Critical Care Validation',
    subtitle: 'ICU Monitors & Telemetry',
    items: [
      '12-Lead ECG Waveform Simulation',
      'SpO2 Optical Curve Verification',
      'NIBP Oscillometric Tolerance Audit',
      'Bedside Temperature Probe Check',
    ],
  },
  {
    track: 'Respiratory & Anesthesia',
    subtitle: 'Ventilators & Gas Systems',
    items: [
      'Delivered Tidal Volume (Vt) Sweep',
      'PIP & PEEP Pneumatic Calibration',
      'FiO2 Oxygen Concentration Cell Audit',
      'Multi-Gas Vaporizer Accuracy Check',
    ],
  },
  {
    track: 'Emergency & Safety',
    subtitle: 'Defibrillators & Electricals',
    items: [
      'Biphasic Energy Discharge (50J–360J)',
      'Charge-Ready Response Time Test',
      'IEC 60601 Leakage Current Audit',
      'Infusion Occlusion Pressure Check',
    ],
  },
  {
    track: 'Biomedical Academy',
    subtitle: 'Staff & Engineer Certification',
    items: [
      'ISO 17025 Calibration Documentation',
      'ICU Ventilator Fault Diagnostics',
      'Hands-On Analyzer Bench Practice',
      'QR-Verified Completion Certificate',
    ],
  },
];

export default function Home({
  onNavigate,
  siteSettings,
  subscriptionPlans = DEFAULT_SUBSCRIPTION_PLANS,
  userEmail = '',
  scrollToPlans = false,
}: HomeProps) {
  const brandName = siteSettings?.siteName?.trim() || 'SunMedX';
  const brandAddress = siteSettings?.address?.trim() || 'Mumbai & Maharashtra';
  const showPlansSection =
    !siteSettings?.homepageOrder || siteSettings.homepageOrder.includes('plans_preview');
  const plansSectionRef = useRef<HTMLElement>(null);

  const [testimonials, setTestimonials] = useState<Testimonial[]>([]);
  const [services, setServices] = useState<Service[]>([]);
  const [courses, setCourses] = useState<Course[]>([]);
  const [tools, setTools] = useState<Tool[]>([]);
  const [activeTestimonialIdx, setActiveTestimonialIdx] = useState(0);
  const [openModuleIdx, setOpenModuleIdx] = useState<number | null>(0);
  const [heroImgFailed, setHeroImgFailed] = useState(false);
  const [benefitImgFailed, setBenefitImgFailed] = useState(false);
  const [enquiryImgFailed, setEnquiryImgFailed] = useState(false);
  const [billingCycle, setBillingCycle] = useState<'monthly' | 'annual'>('monthly');

  // Hero Right-Side Service Enquiry Form State (matching .brochure-form)
  const [leadName, setLeadName] = useState('');
  const [leadEmail, setLeadEmail] = useState('');
  const [leadPhone, setLeadPhone] = useState('');
  const [leadHospital, setLeadHospital] = useState('');
  const [leadService, setLeadService] = useState('Medical Device Calibration & NABL Validation');
  const [leadCity, setLeadCity] = useState('Mumbai');
  const [leadSubmitting, setLeadSubmitting] = useState(false);
  const [leadFeedback, setLeadFeedback] = useState<{ type: 'error' | 'success'; msg: string } | null>(null);

  useEffect(() => {
    if (scrollToPlans && plansSectionRef.current) {
      setTimeout(() => {
        plansSectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }, 120);
    }
  }, [scrollToPlans]);

  useEffect(() => {
    const db = getDb();

    const unsubT = db.collection('testimonials').onSnapshot((snap: any) => {
      const list: Testimonial[] = [];
      snap.forEach((doc: any) => list.push(doc.data()));
      setTestimonials(list);
    });

    const unsubS = db.collection('services').onSnapshot((snap: any) => {
      const list: Service[] = [];
      snap.forEach((doc: any) => list.push(doc.data()));
      setServices(list.slice(0, 3));
    });

    const unsubC = db
      .collection('academy_courses')
      .where('featured', '==', true)
      .onSnapshot((snap: any) => {
        const list: Course[] = [];
        snap.forEach((doc: any) => list.push(doc.data()));
        setCourses(list);
      });

    const unsubTools = db.collection('tools').onSnapshot((snap: any) => {
      const list: Tool[] = [];
      snap.forEach((doc: any) => list.push(doc.data()));
      setTools(list.slice(0, 6));
    });

    return () => {
      unsubT();
      unsubS();
      unsubC();
      unsubTools();
    };
  }, []);

  useEffect(() => {
    if (testimonials.length <= 1) return;
    const timer = setInterval(() => {
      setActiveTestimonialIdx(prev => (prev + 1) % testimonials.length);
    }, 6000);
    return () => clearInterval(timer);
  }, [testimonials]);

  const handleHeroEnquirySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLeadFeedback(null);

    const emailOk = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(leadEmail.trim());
    const phoneDigits = leadPhone.replace(/\D/g, '');
    if (!leadName.trim() || !emailOk || phoneDigits.length < 10 || !leadHospital.trim()) {
      setLeadFeedback({
        type: 'error',
        msg: 'Please enter a valid name, email, 10-digit phone number, and hospital name.',
      });
      return;
    }

    setLeadSubmitting(true);
    try {
      const db = getDb();
      await db.collection('service_requests').add({
        userId: 'hero-enquiry',
        userEmail: leadEmail.trim(),
        name: leadName.trim(),
        email: leadEmail.trim(),
        phone: leadPhone.trim(),
        hospital: leadHospital.trim(),
        equipment: leadService,
        serviceType: leadService,
        date: new Date(Date.now() + 86400000).toISOString().split('T')[0],
        city: leadCity,
        notes: `Submitted via ${brandName} Institutional Service Enquiry card.`,
        status: 'Pending',
        createdAt: new Date().toISOString(),
      });

      setLeadFeedback({
        type: 'success',
        msg: `Enquiry registered. Our ${brandName} calibration desk will reach out within 2 business hours.`,
      });
      setLeadName('');
      setLeadEmail('');
      setLeadPhone('');
      setLeadHospital('');
    } catch (err: any) {
      setLeadFeedback({
        type: 'error',
        msg: err?.message || 'Unable to submit enquiry. Please try again.',
      });
    } finally {
      setLeadSubmitting(false);
    }
  };

  const activeTestimonial = testimonials[activeTestimonialIdx];

  return (
    <div className="bg-white text-[#404041]">
      {/* 1. SPLIT HERO BANNER + DEEP NAVY ENQUIRY FORM CARD (BITS Pilani WILP Hero Pattern) */}
      <section className="relative overflow-hidden bg-[#181457]">
        {!heroImgFailed && (
          <img
            src={PRODUCT_ASSET_FALLBACKS.heroLab}
            alt="Biomedical engineering calibration workstation"
            referrerPolicy="no-referrer"
            onError={() => setHeroImgFailed(true)}
            className="absolute inset-0 w-full h-full object-cover opacity-30"
          />
        )}
        <div className="absolute inset-0 bg-gradient-to-r from-[#171352]/95 via-[#211D70]/88 to-[#211D70]/75" />

        <div className="relative z-10 max-w-7xl mx-auto px-6 py-12 lg:py-16 grid grid-cols-1 lg:grid-cols-12 gap-10 items-center page-fade-in">
          {/* Left Hero Editorial Block */}
          <div className="lg:col-span-7 space-y-5 text-white">
            <div className="inline-flex items-center gap-2 text-xs font-mono font-semibold text-[#F8C72E]">
              <ShieldCheck className="w-4 h-4 shrink-0" />
              <span>ISO 17025 Traceable • NABL Aligned Calibration</span>
            </div>

            <div className="space-y-1.5">
              <h1 className="font-syne font-extrabold text-3xl sm:text-5xl text-white tracking-tight leading-[1.1]">
                Biomedical Engineering
              </h1>
              <h2 className="font-syne font-bold text-xl sm:text-3xl text-[#F8C72E] leading-snug">
                Calibration, Validation &amp; Training
              </h2>
              <p className="font-serif italic text-base sm:text-lg text-white/90 pt-1">
                for Hospitals, ICUs &amp; Clinical Teams
              </p>
            </div>

            <div className="pt-2">
              <h3 className="text-xs uppercase tracking-wider font-bold text-[#F8C72E] mb-2.5">
                Core Specializations
              </h3>
              <ul className="space-y-2 text-sm text-white/95">
                {[
                  'NABL-Aligned ICU Ventilator & Monitor Calibration',
                  'Preventive Maintenance Contracts (AMC / CMC)',
                  'Clinical Staff Certification & Biomedical Academy',
                ].map((item, i) => (
                  <li key={i} className="flex items-center gap-2.5">
                    <span className="w-2 h-2 rounded-full bg-[#F8C72E] shrink-0" />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>

            <div className="inline-block border-l-4 border-[#F8C72E] bg-white/10 px-4 py-2.5 rounded-r-lg">
              <p className="text-xs font-semibold text-[#F8C72E] uppercase tracking-wider">
                Active Service Dispatch
              </p>
              <p className="text-sm font-bold text-white mt-0.5">
                24×7 Emergency Support Across {brandAddress}
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-3 pt-2">
              <button
                onClick={() => onNavigate('#services')}
                className="px-6 py-3 rounded-md bg-[#F8C72E] hover:bg-[#e5b520] text-[#211D70] font-bold text-sm transition-colors shadow-md"
              >
                Explore Calibration Services
              </button>
              <button
                onClick={() => onNavigate('#catalogue')}
                className="px-6 py-3 rounded-md border-2 border-white text-white hover:bg-white hover:text-[#211D70] font-bold text-sm transition-colors flex items-center gap-2"
              >
                <span>Equipment Catalogue</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Right Embedded Navy Card: Who Can Benefit? (with Biomedical Facility Visual) */}
          <div className="lg:col-span-5">
            <div className="bg-[#211D70] border border-white/20 shadow-2xl rounded-2xl overflow-hidden">
              <div className="relative aspect-[16/9] bg-[#171352] overflow-hidden">
                {!benefitImgFailed ? (
                  <img
                    src={PRODUCT_ASSET_FALLBACKS.trainingBench}
                    alt="Biomedical engineers calibrating critical care equipment"
                    referrerPolicy="no-referrer"
                    onError={() => setBenefitImgFailed(true)}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-[#211D70] to-[#171352] text-[#F8C72E]">
                    <ShieldCheck className="w-10 h-10" />
                  </div>
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-[#211D70] via-[#211D70]/25 to-transparent" />
              </div>

              <div className="p-6 sm:p-7 space-y-4">
                <div>
                  <h2 className="font-syne font-extrabold text-[#F9CB2F] text-xl uppercase tracking-wide">
                    Who Can Benefit?
                  </h2>
                  <p className="text-xs text-white/80 mt-1">
                    Built for hospital biomedical teams, clinical departments, and diagnostic hubs.
                  </p>
                </div>

                <ul className="space-y-2.5 text-sm text-white/95">
                  {[
                    'Multi-specialty Hospitals & Critical Care ICUs preparing for NABH / NABL inspections.',
                    'Diagnostic Centers requiring verified calibration certificates for imaging & patient monitors.',
                    'Biomedical Engineers & Clinical Technicians seeking structured hands-on certification.',
                    'Nursing Superintendents & Ward Staff training on ventilator and defibrillator safety.',
                  ].map((point, idx) => (
                    <li key={idx} className="flex items-start gap-2.5">
                      <CheckCircle2 className="w-4 h-4 text-[#F8C72E] shrink-0 mt-0.5" />
                      <span className="leading-relaxed text-xs sm:text-sm">{point}</span>
                    </li>
                  ))}
                </ul>

                <div className="pt-2">
                  <button
                    type="button"
                    onClick={() => {
                      document
                        .getElementById('service-enquiry-section')
                        ?.scrollIntoView({ behavior: 'smooth', block: 'center' });
                    }}
                    className="w-full py-2.5 px-5 rounded-lg border border-[#F8C72E]/60 text-[#F8C72E] hover:bg-[#F8C72E] hover:text-[#211D70] font-bold text-xs uppercase tracking-wider transition-colors flex items-center justify-center gap-2 whitespace-nowrap"
                  >
                    <span>Request Service Enquiry</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 2. 5-CARD HIGHLIGHT STRIP (Mirroring .become-leading with offset #DDD shadow) */}
      <section className="max-w-7xl mx-auto px-6 py-10">
        <h2 className="text-center font-syne font-bold text-xl sm:text-2xl text-[#211D70] mb-7">
          Become a Benchmark in Clinical Equipment Safety
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-5">
          {[
            {
              icon: ShieldCheck,
              text: 'NABL ISO 17025 traceable calibration reports',
            },
            {
              icon: Wrench,
              text: 'On-site ICU & OT preventive maintenance',
            },
            {
              icon: Clock,
              text: 'Under 2-hour Mumbai emergency response',
            },
            {
              icon: Cpu,
              text: 'Digital QR traceability & signature logs',
            },
            {
              icon: GraduationCap,
              text: `Certified training via ${brandName} Academy`,
            },
          ].map((card, idx) => (
            <div key={idx} className="bits-lead-card p-5 flex flex-col items-center text-center justify-center gap-3">
              <div className="w-11 h-11 rounded-full bg-[#211D70]/8 text-[#211D70] flex items-center justify-center">
                <card.icon className="w-6 h-6" />
              </div>
              <p className="text-sm font-semibold text-[#211D70] leading-snug">{card.text}</p>
            </div>
          ))}
        </div>
      </section>

      {/* 3. INSTITUTIONAL CREDENTIALS & 4-METRIC IMPACT BAR (Mirroring .institute-eminence bg-[#EAEAEA]) */}
      <section className="bg-[#EAEAEA] py-12 px-6">
        <div className="max-w-7xl mx-auto space-y-8">
          <div className="max-w-4xl mx-auto text-center space-y-3">
            <p className="text-xs font-bold uppercase tracking-widest text-[#EA2227]">
              {brandName.toUpperCase()} BIOMEDICAL IMPACT
            </p>
            <h2 className="font-syne font-bold text-2xl sm:text-3xl text-[#211D70]">
              Trusted Biomedical Engineering Across Healthcare Facilities
            </h2>
            <p className="text-sm sm:text-base text-[#404041] leading-relaxed">
              {brandName} partners with multi-specialty hospitals, cardiac institutes, and diagnostic clinics to maintain medical device accuracy, regulatory audit readiness, and clinical staff safety.
            </p>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 bg-white border border-[#D4D6E2] rounded-2xl p-6 sm:p-8 shadow-xs">
            {[
              { metric: '500+', label: 'Hospitals & Clinics Served' },
              { metric: '10+ Years', label: 'Biomedical Field Expertise' },
              { metric: '1,000+', label: 'Critical Devices Validated' },
              { metric: '24 × 7', label: 'Emergency Field Dispatch' },
            ].map((stat, idx) => (
              <div
                key={idx}
                className={`text-center space-y-1 ${idx < 3 ? 'md:border-r md:border-[#E2E4EC]' : ''}`}
              >
                <div className="text-2xl sm:text-3xl font-syne font-extrabold text-[#211D70] tabular-nums">
                  {stat.metric}
                </div>
                <div className="text-xs sm:text-sm font-semibold text-[#505050]">{stat.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 4. OVERVIEW OF SERVICES + WHO CAN BENEFIT (Mirroring .verview-of-the-Programme & .benefit-programme) */}
      <section className="bg-white py-14 px-6">
        <div className="max-w-7xl mx-auto space-y-12">
          <div className="text-center space-y-3">
            <div className="bits-section-banner">
              <h2 className="font-syne font-bold text-xl sm:text-2xl">Overview of {brandName} Capabilities</h2>
            </div>
            <p className="max-w-3xl mx-auto text-sm sm:text-base text-[#211D70] leading-relaxed pt-2">
              Designed for clinical engineering departments and healthcare administrators seeking audit-ready precision, rapid breakdown recovery, and certified technical education.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {services.map((s, idx) => (
              <div
                key={idx}
                className="bg-white border border-[#211D70]/25 rounded-2xl p-6 flex flex-col justify-between hover:border-[#211D70] shadow-xs transition-colors"
              >
                <div className="space-y-3">
                  <div className="w-11 h-11 rounded-xl bg-[#211D70] flex items-center justify-center text-[#F8C72E]">
                    <i className={`${s.icon || 'fa-solid fa-stethoscope'} text-base`} />
                  </div>
                  <h3 className="font-syne font-bold text-[#211D70] text-base leading-snug">{s.title}</h3>
                  <p className="text-sm text-[#404041] leading-relaxed">{s.description}</p>
                </div>
                <div className="mt-6 pt-4 border-t border-[#E6E7EE] flex items-center justify-between text-xs">
                  <span className="text-[#211D70] font-mono font-bold tabular-nums">{s.priceRange}</span>
                  <button
                    onClick={() => onNavigate('#services')}
                    className="flex items-center gap-1 font-bold text-[#211D70] hover:text-[#F26522] transition-colors"
                  >
                    <span>Book now</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>

          {/* Service Enquiry Split Block (with Critical-Care Calibration Image) */}
          <div
            id="service-enquiry-section"
            className="grid grid-cols-1 lg:grid-cols-12 items-stretch bg-[#211D70] border border-[#D4D6E2] rounded-2xl overflow-hidden shadow-lg"
          >
            <div className="lg:col-span-5 relative min-h-[260px] lg:h-full bg-[#171352]">
              {!enquiryImgFailed ? (
                <img
                  src={PRODUCT_ASSET_FALLBACKS.ventilator}
                  alt="Critical care ventilator and biomedical calibration diagnostics"
                  referrerPolicy="no-referrer"
                  onError={() => setEnquiryImgFailed(true)}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-[#211D70] to-[#171352] text-[#F8C72E]">
                  <Wrench className="w-12 h-12" />
                </div>
              )}
              <div className="absolute inset-0 bg-gradient-to-t from-[#171352]/90 via-[#171352]/25 to-transparent flex flex-col justify-end p-6 sm:p-8 text-white">
                <div className="text-xs font-mono font-semibold text-[#F8C72E] uppercase tracking-wider">
                  2-Hour Dispatch Response
                </div>
                <p className="font-syne font-bold text-lg sm:text-xl leading-snug mt-1">
                  On-Site NABL Calibration &amp; AMC Desk
                </p>
                <p className="text-xs text-white/80 mt-1.5 leading-relaxed">
                  Share your hospital department and equipment count for a traceable visit schedule or GST-ready AMC quote.
                </p>
              </div>
            </div>

            <div className="lg:col-span-7 p-6 sm:p-8 flex flex-col justify-center">
              <div className="mb-4">
                <h3 className="font-syne font-extrabold text-[#F9CB2F] text-xl uppercase tracking-wide">
                  Service Enquiry
                </h3>
                <p className="text-xs text-white/80 mt-1">
                  Request an NABL calibration visit, AMC quote, or Academy batch schedule.
                </p>
              </div>

              {leadFeedback && (
                <div
                  role="alert"
                  className={`mb-4 text-xs font-semibold px-3.5 py-2.5 rounded-lg ${
                    leadFeedback.type === 'success'
                      ? 'bg-[#F8C72E]/15 text-[#F8C72E] border border-[#F8C72E]/40'
                      : 'bg-[#EA2227]/20 text-white border border-[#EA2227]'
                  }`}
                >
                  {leadFeedback.msg}
                </div>
              )}

              <form onSubmit={handleHeroEnquirySubmit} className="space-y-3">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <input
                    type="text"
                    required
                    placeholder="Full Name *"
                    value={leadName}
                    onChange={e => setLeadName(e.target.value)}
                    className="w-full bg-white text-[#211D70] placeholder-[#211D70]/75 border border-[#DFDFDF] rounded-lg px-3.5 py-2.5 text-sm focus:outline-none focus:border-[#F26522]"
                  />
                  <input
                    type="email"
                    required
                    placeholder="Official Email *"
                    value={leadEmail}
                    onChange={e => setLeadEmail(e.target.value)}
                    className="w-full bg-white text-[#211D70] placeholder-[#211D70]/75 border border-[#DFDFDF] rounded-lg px-3.5 py-2.5 text-sm focus:outline-none focus:border-[#F26522]"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <input
                    type="tel"
                    required
                    placeholder="Phone Number *"
                    value={leadPhone}
                    onChange={e => setLeadPhone(e.target.value)}
                    className="w-full bg-white text-[#211D70] placeholder-[#211D70]/75 border border-[#DFDFDF] rounded-lg px-3.5 py-2.5 text-sm focus:outline-none focus:border-[#F26522]"
                  />
                  <select
                    value={leadCity}
                    onChange={e => setLeadCity(e.target.value)}
                    aria-label="City"
                    className="w-full bg-white text-[#211D70] border border-[#DFDFDF] rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-[#F26522]"
                  >
                    <option value="Mumbai">Mumbai</option>
                    <option value="Thane">Thane</option>
                    <option value="Navi Mumbai">Navi Mumbai</option>
                    <option value="Pune">Pune</option>
                    <option value="Other Maharashtra">Maharashtra</option>
                  </select>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <input
                    type="text"
                    required
                    placeholder="Hospital / Clinic / Organization *"
                    value={leadHospital}
                    onChange={e => setLeadHospital(e.target.value)}
                    className="w-full bg-white text-[#211D70] placeholder-[#211D70]/75 border border-[#DFDFDF] rounded-lg px-3.5 py-2.5 text-sm focus:outline-none focus:border-[#F26522]"
                  />
                  <select
                    value={leadService}
                    onChange={e => setLeadService(e.target.value)}
                    aria-label="Select Service Track"
                    className="w-full bg-white text-[#211D70] border border-[#DFDFDF] rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-[#F26522]"
                  >
                    <option value="Medical Device Calibration & NABL Validation">
                      NABL Equipment Calibration
                    </option>
                    <option value="Comprehensive Preventive Maintenance (AMC/CMC)">
                      Hospital AMC / CMC Contract
                    </option>
                    <option value="Emergency Diagnostic Repair Support">
                      Emergency Breakdown Repair
                    </option>
                    <option value="Clinical Staff Training & Machine Safety Academy">
                      Biomedical Academy Training
                    </option>
                  </select>
                </div>

                <button
                  type="submit"
                  disabled={leadSubmitting}
                  className="w-full mt-1 py-3 px-6 rounded-lg bg-[#F8C72E] hover:bg-white text-[#211D70] font-bold text-sm uppercase tracking-wide transition-colors flex items-center justify-center gap-2 whitespace-nowrap"
                >
                  {leadSubmitting ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                  <span>Submit Enquiry</span>
                </button>
              </form>
            </div>
          </div>
        </div>
      </section>

      {/* 5. GOLD-FRAMED VALIDATION & CURRICULUM MATRIX (Mirroring .unique-programme .tablec .ulrow) */}
      <section className="bg-white pb-14 px-6">
        <div className="max-w-7xl mx-auto space-y-8">
          <div className="text-center space-y-3">
            <div className="bits-section-banner">
              <h2 className="font-syne font-bold text-xl sm:text-2xl">
                Structured Calibration &amp; Training Tracks
              </h2>
            </div>
            <p className="max-w-2xl mx-auto text-sm text-[#404041]">
              Comprehensive equipment protocols paired with practical {brandName} Academy engineering tracks.
            </p>
          </div>

          <div className="bits-labs-border p-4 sm:p-6 bg-white">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {VALIDATION_MODULES.map((mod, idx) => {
                const isExpanded = openModuleIdx === idx;
                return (
                  <div
                    key={idx}
                    className={`flex flex-col ${
                      idx < 3 ? 'lg:border-r lg:border-[#DCDCDC] lg:pr-4' : ''
                    }`}
                  >
                    <button
                      type="button"
                      onClick={() => setOpenModuleIdx(isExpanded ? null : idx)}
                      className="w-full bg-[#211D70] text-white px-4 py-3.5 rounded-t-[16px] text-center flex items-center justify-between gap-2 transition-colors hover:bg-[#272F78]"
                    >
                      <div className="text-left">
                        <div className="font-syne font-bold text-sm">{mod.track}</div>
                        <div className="text-[11px] text-[#F8C72E] font-medium">{mod.subtitle}</div>
                      </div>
                      {isExpanded ? (
                        <ChevronUp className="w-4 h-4 text-[#F8C72E] shrink-0" />
                      ) : (
                        <ChevronDown className="w-4 h-4 text-[#F8C72E] shrink-0" />
                      )}
                    </button>

                    <div className={`p-4 bg-[#FAFBFD] border border-t-0 border-[#E2E4EC] rounded-b-xl flex-1 ${isExpanded ? 'block' : 'hidden md:block'}`}>
                      <ul className="space-y-2.5 text-xs text-[#211D70]">
                        {mod.items.map((item, iIdx) => (
                          <li key={iIdx} className="flex items-start gap-2">
                            <span className="w-1.5 h-1.5 rounded-full bg-[#F8C72D] mt-1.5 shrink-0" />
                            <span className="leading-snug font-medium">{item}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </section>

      {/* 6. GOLD-BORDERED TWO-CARD LAB INFRASTRUCTURE SHOWCASE (Mirroring .labs-border) */}
      <section className="bg-white pb-14 px-6">
        <div className="max-w-7xl mx-auto space-y-6">
          <div className="text-center">
            <div className="bits-section-banner">
              <h2 className="font-syne font-bold text-xl sm:text-2xl">Calibration Labs &amp; Field Infrastructure</h2>
            </div>
          </div>

          <div className="bits-labs-border p-6 sm:p-8 bg-white grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="space-y-4 md:border-r md:border-[#DCDCDC] md:pr-8">
              <div className="aspect-[16/9] rounded-xl overflow-hidden bg-[#EAEAEA] border border-[#E2E4EC]">
                <img
                  src={PRODUCT_ASSET_FALLBACKS.analyzer}
                  alt="NABL biomedical analyzer instrumentation"
                  referrerPolicy="no-referrer"
                  className="w-full h-full object-cover"
                />
              </div>
              <h3 className="font-syne font-bold text-[#211D70] text-lg">Lab Infrastructure</h3>
              <p className="text-sm text-[#404041] leading-relaxed">
                Dedicated precision test benches equipped with NIST/NABL-traceable gas flow analyzers, multiparameter ECG simulators, defibrillator energy meters, and electrical safety rigs.
              </p>
            </div>

            <div className="space-y-4">
              <div className="aspect-[16/9] rounded-xl overflow-hidden bg-[#EAEAEA] border border-[#E2E4EC]">
                <img
                  src={PRODUCT_ASSET_FALLBACKS.monitor}
                  alt="Hands-on ICU monitor validation"
                  referrerPolicy="no-referrer"
                  className="w-full h-full object-cover"
                />
              </div>
              <h3 className="font-syne font-bold text-[#211D70] text-lg">Hands-on Field &amp; Signature Workflow</h3>
              <p className="text-sm text-[#404041] leading-relaxed">
                On-site calibration across Mumbai ICUs with instant on-device customer signature capture, digital traceability records, and downloadable authorized PDF compliance certificates.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* 7. 4-COLUMN STRUCTURED METHODOLOGY GRID (Mirroring .working-professionals bg-[#EAEAEA] + vertical borders + hr) */}
      <section className="bg-[#EAEAEA] py-14 px-6">
        <div className="max-w-7xl mx-auto space-y-10">
          <div className="text-center space-y-3">
            <div className="bits-section-banner">
              <h2 className="font-syne font-bold text-xl sm:text-2xl">
                Engineering Methodology Built for Critical Care
              </h2>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
            {[
              {
                icon: ShieldCheck,
                title: 'NABL Traceable Checks',
                lead: 'Reference calibrated analyzers.',
                desc: 'Every ventilator, infusion pump, and patient monitor test follows documented ISO 17025 tolerance limits.',
              },
              {
                icon: Wrench,
                title: 'Scheduled AMC Sweeps',
                lead: 'Zero surprise ICU downtime.',
                desc: 'Automated preventive visit alerts, replacement parts logs, and emergency breakdown dispatch under 2 hours.',
              },
              {
                icon: GraduationCap,
                title: 'Practical Staff Academy',
                lead: 'Graphy online + lab drills.',
                desc: 'Train nurses and biomedical engineers on equipment alarms, pneumatic checks, and safety protocols.',
              },
              {
                icon: Award,
                title: 'Instant PDF Certificates',
                lead: 'On-device customer sign-off.',
                desc: 'Engineers collect verified digital signatures on site and publish downloadable reports to Client Hub.',
              },
            ].map((col, idx) => (
              <div
                key={idx}
                className={`text-center px-4 flex flex-col items-center space-y-4 ${
                  idx < 3 ? 'lg:border-r lg:border-[#CDCDCD]' : ''
                }`}
              >
                <div className="w-16 h-16 rounded-full bg-white border-2 border-[#211D70] flex items-center justify-center text-[#211D70] shadow-xs">
                  <col.icon className="w-7 h-7" />
                </div>
                <h3 className="font-syne font-bold text-[#211D70] text-lg leading-snug">{col.title}</h3>
                <hr className="w-32 border-t-2 border-[#211D70]/25" />
                <div className="space-y-1.5 text-sm">
                  <p className="font-bold text-[#211D70]">{col.lead}</p>
                  <p className="text-[#404041] leading-relaxed">{col.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 8. ACADEMY COURSES & CLINICAL CALCULATORS PREVIEW (bg-white) */}
      <section className="bg-white py-14 px-6">
        <div className="max-w-7xl mx-auto space-y-12">
          {/* Featured Courses */}
          <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 border-b border-[#E2E4EC] pb-4">
              <div>
                <h2 className="font-syne font-bold text-xl sm:text-2xl text-[#211D70]">
                  {brandName} Academy Courses
                </h2>
                <p className="text-sm text-[#505050]">
                  Practical certification tracks hosted on our Graphy learning platform.
                </p>
              </div>
              <button
                onClick={() => onNavigate('#academy')}
                className="text-sm font-bold text-[#211D70] hover:text-[#F26522] flex items-center gap-1.5 self-start sm:self-auto"
              >
                <span>View all courses</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {courses.slice(0, 3).map((c, idx) => (
                <div
                  key={idx}
                  className="bg-white border border-[#D4D6E2] rounded-2xl p-5 flex flex-col justify-between hover:border-[#211D70] transition-colors shadow-xs"
                >
                  <div className="space-y-2.5">
                    <span className="inline-block bg-[#211D70] text-[#F8C72E] text-xs font-mono font-bold px-2.5 py-0.5 rounded-sm">
                      {c.level}
                    </span>
                    <h3 className="font-syne font-bold text-[#211D70] text-base leading-snug">{c.title}</h3>
                    <div className="text-xs text-[#505050] font-mono flex items-center gap-2">
                      <span>{c.duration}</span>
                      <span>•</span>
                      <span>{c.language}</span>
                    </div>
                  </div>
                  <div className="mt-5 pt-4 border-t border-[#E6E7EE] flex items-center justify-between">
                    <span className="font-mono text-sm font-bold text-[#211D70] tabular-nums">
                      {c.price ? `Rs ${c.price.toLocaleString()}` : 'Free'}
                    </span>
                    <a
                      href={c.graphyUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="py-2 px-4 rounded-md bg-[#F8C72E] hover:bg-[#211D70] hover:text-white text-[#211D70] font-bold text-xs flex items-center gap-1.5 transition-colors"
                    >
                      <span>Enroll</span>
                      <i className="fa-solid fa-arrow-up-right-from-square text-[10px]" />
                    </a>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Clinical Calculators Strip */}
          <div className="space-y-5">
            <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
              <div>
                <h2 className="font-syne font-bold text-xl sm:text-2xl text-[#211D70]">
                  Diagnostic Engineering Tools
                </h2>
                <p className="text-sm text-[#505050]">Quick calculators for ICU teams and biomedical field engineers.</p>
              </div>
              <button
                onClick={() => onNavigate('#tools')}
                className="text-sm font-bold text-[#211D70] hover:text-[#F26522] flex items-center gap-1.5"
              >
                <span>Open Calculators</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
              {tools.map((t, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => onNavigate('#tools')}
                  className="bg-[#FAFBFD] border border-[#D4D6E2] hover:border-[#211D70] rounded-xl p-4 flex flex-col items-center text-center transition-colors"
                >
                  <div
                    className="w-10 h-10 rounded-lg flex items-center justify-center bg-white border border-[#E2E4EC] mb-2.5"
                    style={{ color: t.color || '#211D70' }}
                  >
                    <i className={`${t.icon || 'fa-solid fa-calculator'} text-base`} />
                  </div>
                  <h3 className="font-syne font-bold text-xs text-[#211D70] leading-snug line-clamp-2">{t.name}</h3>
                  <span className="text-[11px] font-mono text-[#505050] mt-1">{t.category}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* 9. TESTIMONIALS CAROUSEL + DOUBLE GOLD CREDENTIAL SHOWCASE (Mirroring .learners-to-leaders & .certificate-container) */}
      <section className="bg-[#EAEAEA] py-14 px-6">
        <div className="max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-10 items-center">
          {/* Testimonial Carousel */}
          <div className="lg:col-span-7 space-y-5">
            <div className="bits-section-banner">
              <h2 className="font-syne font-bold text-lg sm:text-xl">From Clinics to Leaders</h2>
            </div>

            {activeTestimonial && (
              <div className="bg-white border border-[#D4D6E2] rounded-2xl p-6 sm:p-8 shadow-sm space-y-5">
                <div className="flex gap-1">
                  {[1, 2, 3, 4, 5].map(star => (
                    <Star key={star} className="w-4 h-4 fill-[#F8BE15] text-[#F8BE15]" />
                  ))}
                </div>
                <blockquote className="font-serif italic text-base sm:text-lg text-[#404041] leading-relaxed">
                  &ldquo;{activeTestimonial.comment}&rdquo;
                </blockquote>
                <div className="border-t border-[#5D5779]/30 pt-3">
                  <cite className="not-italic font-syne font-bold text-lg text-[#211D70] block">
                    {activeTestimonial.name}
                  </cite>
                  <div className="text-xs font-medium text-[#505050]">
                    {activeTestimonial.role} • {activeTestimonial.hospital}
                  </div>
                </div>

                <div className="flex items-center gap-2 pt-1">
                  {testimonials.map((_, idx) => (
                    <button
                      key={idx}
                      aria-label={`View testimonial ${idx + 1}`}
                      onClick={() => setActiveTestimonialIdx(idx)}
                      className={`w-3.5 h-3.5 rounded-full transition-all ${
                        activeTestimonialIdx === idx
                          ? 'bg-[#F5841F] border-2 border-[#211D70] scale-110'
                          : 'bg-[#211D70]/40 hover:bg-[#211D70]'
                      }`}
                    />
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Double Gold Border Credential Card */}
          <div className="lg:col-span-5">
            <div className="bits-double-gold-frame p-6 sm:p-8 text-center space-y-4 shadow-lg">
              <div className="w-12 h-12 rounded-full bg-[#211D70] text-[#F8C72E] flex items-center justify-center mx-auto">
                <Award className="w-6 h-6" />
              </div>
              <p className="text-xs font-bold uppercase tracking-widest text-[#EA2227]">
                Official Audit Verification
              </p>
              <h3 className="font-syne font-extrabold text-xl text-[#211D70]">
                Signed Calibration &amp; AMC Certificates
              </h3>
              <p className="text-sm text-[#404041] leading-relaxed">
                Every completed validation generates an ISO-compliant PDF record carrying on-site customer signature verification inside Client Hub.
              </p>
              <button
                onClick={() => onNavigate(userEmail ? '#customer-portal' : '#auth')}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full border-2 border-[#211D70] text-[#211D70] hover:bg-[#211D70] hover:text-white font-bold text-xs transition-colors whitespace-nowrap"
              >
                <span>{userEmail ? 'Open Client Hub' : 'Sign In to Portal'}</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* 10. HOW TO BOOK & TRANSPARENT PROCESS (Mirroring .how-to-apply) */}
      <section className="bg-white py-14 px-6">
        <div className="max-w-5xl mx-auto text-center space-y-8">
          <div className="space-y-2">
            <div className="bits-section-banner">
              <h2 className="font-syne font-bold text-xl sm:text-2xl">How to Book Calibration &amp; AMC</h2>
            </div>
            <p className="text-sm text-[#505050] pt-2">
              Simple 3-step digital dispatch and audit verification workflow.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-left">
            {[
              {
                step: 'Step 01',
                title: 'Submit Service Request',
                desc: 'Pick your calibration module or AMC tier and share hospital location & equipment list.',
              },
              {
                step: 'Step 02',
                title: 'Engineer On-Site Check',
                desc: 'Our Mumbai field engineer tests devices against traceable reference standards & captures sign-off.',
              },
              {
                step: 'Step 03',
                title: 'Download Signed Report',
                desc: 'Review validation metrics, pay seamlessly, and archive compliant PDF reports in Client Hub.',
              },
            ].map((item, idx) => (
              <div key={idx} className="border border-[#D4D6E2] rounded-xl p-5 bg-[#FAFBFD] space-y-2">
                <span className="inline-block text-xs font-mono font-bold text-[#EA2227] uppercase">
                  {item.step}
                </span>
                <h3 className="font-syne font-bold text-base text-[#211D70]">{item.title}</h3>
                <p className="text-xs sm:text-sm text-[#404041] leading-relaxed">{item.desc}</p>
              </div>
            ))}
          </div>

          <div>
            <button
              onClick={() => onNavigate('#services')}
              className="px-8 py-3 rounded-full border-2 border-[#211D70] text-[#211D70] hover:bg-[#211D70] hover:text-white font-bold text-sm transition-colors"
            >
              Schedule Calibration Visit
            </button>
          </div>
        </div>
      </section>

      {/* 10.2 DIGITAL SOLUTION FEATURES SHOWCASE (Asymmetric Bento Grid) */}
      <section className="bg-white border-t border-[#E2E4EC] py-14 px-6">
        <div className="max-w-7xl mx-auto space-y-8">
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 border-b border-[#E2E4EC] pb-5">
            <div className="space-y-1.5 max-w-2xl">
              <div className="text-xs font-mono font-semibold text-[#EA2227] uppercase tracking-wider">
                {brandName} Digital Platform
              </div>
              <h2 className="font-syne font-bold text-2xl sm:text-3xl text-[#211D70] tracking-tight">
                Digital Solution Features Built for Healthcare Operations
              </h2>
              <p className="text-sm text-[#505050] leading-relaxed">
                From bedside fault diagnostics to GST-compliant AMC billing and white-label partner portals, every clinical workflow runs in one unified system.
              </p>
            </div>
            <button
              type="button"
              onClick={() => onNavigate(userEmail ? '#customer-portal' : '#auth')}
              className="px-5 py-2.5 rounded-lg bg-[#211D70] hover:bg-[#1a1658] text-white text-xs font-bold inline-flex items-center gap-2 shrink-0 self-start md:self-auto whitespace-nowrap"
            >
              <span>{userEmail ? 'Open Client Hub' : 'Sign In to Portal'}</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {/* 01 Lead Bento Card (2 Columns) */}
            <div className="md:col-span-2 bg-[#FAFBFD] border border-[#D4D6E2] rounded-2xl p-6 sm:p-7 flex flex-col justify-between gap-5">
              <div className="space-y-2.5">
                <div className="text-xs font-mono text-[#505050]">
                  <span>01.</span>
                  <span aria-hidden="true" className="mx-1.5">·</span>
                  <span>Biomedical Intelligence</span>
                </div>
                <h3 className="font-syne font-bold text-xl text-[#211D70]">
                  AI Biomedical Fault Diagnostics &amp; Field Dispatch Triage
                </h3>
                <p className="text-sm text-[#404041] leading-relaxed max-w-2xl">
                  Enter ventilator, ICU monitor, or defibrillator symptoms to receive probable root causes, electrical safety checks, and immediate engineer dispatch guidance inside Client Hub and Smart Tools.
                </p>
              </div>
              <div className="flex flex-wrap items-center justify-between gap-3 pt-4 border-t border-[#E2E4EC]">
                <span className="text-xs font-mono text-[#505050] tabular-nums">
                  Included in Free, Pro &amp; Enterprise tiers
                </span>
                <button
                  type="button"
                  onClick={() => onNavigate('#tools')}
                  className="text-xs font-bold text-[#211D70] hover:text-[#F26522] inline-flex items-center gap-1.5 whitespace-nowrap"
                >
                  <span>Try Diagnostic Tools</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            {/* 02 Card */}
            <div className="bg-white border border-[#D4D6E2] rounded-2xl p-6 flex flex-col justify-between gap-5">
              <div className="space-y-2">
                <div className="text-xs font-mono text-[#505050]">
                  <span>02.</span>
                  <span aria-hidden="true" className="mx-1.5">·</span>
                  <span>Audit Verification</span>
                </div>
                <h3 className="font-syne font-bold text-lg text-[#211D70]">
                  Digital Sign-Off &amp; Traceable PDFs
                </h3>
                <p className="text-sm text-[#404041] leading-relaxed">
                  Engineers capture live hospital signatures on site and publish NABL-aligned PDF calibration reports directly to Client Hub.
                </p>
              </div>
              <button
                type="button"
                onClick={() => onNavigate('#customer-portal')}
                className="text-xs font-bold text-[#211D70] hover:text-[#F26522] inline-flex items-center gap-1.5 pt-3 border-t border-[#E2E4EC] whitespace-nowrap"
              >
                <span>View Reports Portal</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* 03 Card */}
            <div className="bg-white border border-[#D4D6E2] rounded-2xl p-6 flex flex-col justify-between gap-5">
              <div className="space-y-2">
                <div className="text-xs font-mono text-[#505050]">
                  <span>03.</span>
                  <span aria-hidden="true" className="mx-1.5">·</span>
                  <span>Contract Lifecycle</span>
                </div>
                <h3 className="font-syne font-bold text-lg text-[#211D70]">
                  AMC Agreements &amp; Automated GST Billing
                </h3>
                <p className="text-sm text-[#404041] leading-relaxed">
                  Manage annual maintenance plans, GST rates, HSN/SAC itemized quotes, and one-click agreement emails to hospital leads.
                </p>
              </div>
              <button
                type="button"
                onClick={() => onNavigate('#services')}
                className="text-xs font-bold text-[#211D70] hover:text-[#F26522] inline-flex items-center gap-1.5 pt-3 border-t border-[#E2E4EC] whitespace-nowrap"
              >
                <span>Explore AMC Contracts</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* 04 Card */}
            <div className="bg-white border border-[#D4D6E2] rounded-2xl p-6 flex flex-col justify-between gap-5">
              <div className="space-y-2">
                <div className="text-xs font-mono text-[#505050]">
                  <span>04.</span>
                  <span aria-hidden="true" className="mx-1.5">·</span>
                  <span>Procurement &amp; RFQs</span>
                </div>
                <h3 className="font-syne font-bold text-lg text-[#211D70]">
                  Medical E-Catalogue &amp; Instant RFQs
                </h3>
                <p className="text-sm text-[#404041] leading-relaxed">
                  Browse critical-care equipment with direct INR checkout or custom multi-unit hospital RFQ pricing workflows.
                </p>
              </div>
              <button
                type="button"
                onClick={() => onNavigate('#catalogue')}
                className="text-xs font-bold text-[#211D70] hover:text-[#F26522] inline-flex items-center gap-1.5 pt-3 border-t border-[#E2E4EC] whitespace-nowrap"
              >
                <span>Browse Equipment Catalogue</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* 05 Card */}
            <div className="bg-[#FAFBFD] border border-[#D4D6E2] rounded-2xl p-6 flex flex-col justify-between gap-5">
              <div className="space-y-2">
                <div className="text-xs font-mono text-[#505050]">
                  <span>05.</span>
                  <span aria-hidden="true" className="mx-1.5">·</span>
                  <span>White-Label SaaS</span>
                </div>
                <h3 className="font-syne font-bold text-lg text-[#211D70]">
                  Brand Partner Studio &amp; Tier Controls
                </h3>
                <p className="text-sm text-[#404041] leading-relaxed">
                  Customize portal branding, visual themes, and Free / Pro / Enterprise access levels with backend role management.
                </p>
              </div>
              <button
                type="button"
                onClick={() => onNavigate('#plans')}
                className="text-xs font-bold text-[#211D70] hover:text-[#F26522] inline-flex items-center gap-1.5 pt-3 border-t border-[#E2E4EC] whitespace-nowrap"
              >
                <span>Compare Platform Plans</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* 10.5 SUBSCRIPTION PLANS COMPARISON SECTION (Free, Pro, Enterprise) */}
      {showPlansSection && (
        <section id="plans-section" ref={plansSectionRef} className="bg-[#FAFBFD] border-t border-[#E2E4EC] py-14 px-6">
          <div className="max-w-7xl mx-auto space-y-9">
            <div className="text-center space-y-3">
              <div className="bits-section-banner">
                <h2 className="font-syne font-bold text-xl sm:text-2xl">
                  Hospital &amp; Clinic Platform Plans
                </h2>
              </div>
              <p className="max-w-2xl mx-auto text-sm text-[#404041] pt-1">
                Start free with full equipment catalogue access, biomedical calculators &amp; starter AI diagnostics — upgrade anytime for NABL PDF certificates &amp; unlimited capacity.
              </p>

              <div className="inline-flex items-center bg-white border border-[#D4D6E2] rounded-xl p-1 gap-1 shadow-xs">
                <button
                  type="button"
                  onClick={() => setBillingCycle('monthly')}
                  className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-colors ${
                    billingCycle === 'monthly'
                      ? 'bg-[#211D70] text-[#F8C72E]'
                      : 'text-[#404041] hover:text-[#211D70]'
                  }`}
                >
                  Monthly Billing
                </button>
                <button
                  type="button"
                  onClick={() => setBillingCycle('annual')}
                  className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-colors ${
                    billingCycle === 'annual'
                      ? 'bg-[#211D70] text-[#F8C72E]'
                      : 'text-[#404041] hover:text-[#211D70]'
                  }`}
                >
                  Annual (2 Months Free)
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-stretch">
              {subscriptionPlans.map((plan) => {
                const isPro = plan.id === 'pro';
                const isEnterprise = plan.id === 'enterprise';
                const priceInr = billingCycle === 'annual' ? plan.annualPriceInr : plan.monthlyPriceInr;
                const moduleKeys = Object.keys(PLAN_MODULE_LABELS) as PlanModuleKey[];

                return (
                  <div
                    key={plan.id}
                    className={`rounded-2xl p-6 sm:p-7 flex flex-col justify-between transition-all ${
                      isPro
                        ? 'bg-[#211D70] text-white border-2 border-[#F8C72E] shadow-xl'
                        : 'bg-white text-[#211D70] border border-[#D4D6E2] shadow-xs'
                    }`}
                  >
                    <div className="space-y-5">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <h3 className={`font-syne font-extrabold text-xl ${isPro ? 'text-[#F8C72E]' : 'text-[#211D70]'}`}>
                            {plan.name}
                          </h3>
                          <p className={`text-xs mt-0.5 ${isPro ? 'text-white/80' : 'text-[#505050]'}`}>
                            {plan.audience}
                          </p>
                        </div>
                        {isPro && (
                          <span className="text-[10px] font-mono font-bold uppercase px-2.5 py-1 rounded bg-[#F8C72E] text-[#211D70] shrink-0">
                            Most Popular
                          </span>
                        )}
                        {isEnterprise && (
                          <span className="text-[10px] font-mono font-bold uppercase px-2.5 py-1 rounded bg-[#EA2227]/10 text-[#EA2227] border border-[#EA2227]/25 shrink-0">
                            White-Label
                          </span>
                        )}
                      </div>

                      <div className={`pb-4 border-b ${isPro ? 'border-white/15' : 'border-[#E6E7EE]'}`}>
                        <div className="flex items-baseline gap-1.5">
                          <span className={`font-syne font-extrabold text-3xl tabular-nums ${isPro ? 'text-white' : 'text-[#211D70]'}`}>
                            {priceInr === 0 ? 'Free' : `Rs ${priceInr.toLocaleString()}`}
                          </span>
                          {priceInr > 0 && (
                            <span className={`text-xs font-mono ${isPro ? 'text-white/75' : 'text-[#505050]'}`}>
                              /{billingCycle === 'annual' ? 'year' : 'month'} + GST
                            </span>
                          )}
                        </div>
                        <p className={`text-xs mt-1.5 leading-relaxed ${isPro ? 'text-white/85' : 'text-[#404041]'}`}>
                          {plan.tagline}
                        </p>
                      </div>

                      <div className={`grid grid-cols-2 gap-2.5 text-xs p-3 rounded-xl ${isPro ? 'bg-white/10' : 'bg-[#F4F5FA]'}`}>
                        <div>
                          <div className={`text-[10px] font-mono uppercase ${isPro ? 'text-[#F8C72E]' : 'text-[#505050]'}`}>
                            AI Queries / Mo
                          </div>
                          <div className="font-mono font-bold tabular-nums mt-0.5">
                            {plan.aiQueryLimitPerMonth < 0 ? 'Unlimited' : `${plan.aiQueryLimitPerMonth} Queries`}
                          </div>
                        </div>
                        <div>
                          <div className={`text-[10px] font-mono uppercase ${isPro ? 'text-[#F8C72E]' : 'text-[#505050]'}`}>
                            AMC Contracts
                          </div>
                          <div className="font-mono font-bold tabular-nums mt-0.5">
                            {plan.maxAmcContracts < 0 ? 'Unlimited' : `Up to ${plan.maxAmcContracts}`}
                          </div>
                        </div>
                      </div>

                      <ul className="space-y-2 text-xs">
                        {moduleKeys.map((modKey) => {
                          const enabled = Boolean(plan.enabledModules?.[modKey]);
                          return (
                            <li
                              key={modKey}
                              className={`flex items-center gap-2 ${
                                enabled
                                  ? isPro
                                    ? 'text-white'
                                    : 'text-[#211D70]'
                                  : isPro
                                  ? 'text-white/40 line-through'
                                  : 'text-[#505050]/55 line-through'
                              }`}
                            >
                              {enabled ? (
                                <Check className={`w-4 h-4 shrink-0 ${isPro ? 'text-[#F8C72E]' : 'text-emerald-600'}`} />
                              ) : (
                                <XIcon className="w-4 h-4 shrink-0 opacity-50" />
                              )}
                              <span>{PLAN_MODULE_LABELS[modKey]}</span>
                            </li>
                          );
                        })}
                      </ul>
                    </div>

                    <div className="pt-6 mt-6 border-t border-current/10">
                      <button
                        type="button"
                        onClick={() => onNavigate(userEmail ? '#customer-portal' : plan.id === 'free' ? '#signup' : '#auth')}
                        className={`w-full py-3 px-4 rounded-xl font-syne font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-2 transition-colors ${
                          isPro
                            ? 'bg-[#F8C72E] hover:bg-[#e5b520] text-[#211D70]'
                            : 'bg-[#211D70] hover:bg-[#272F78] text-[#F8C72E]'
                        }`}
                      >
                        {plan.id === 'free' ? (
                          <span>{userEmail ? 'Open Free Client Hub' : 'Start Free Account'}</span>
                        ) : (
                          <>
                            <Sparkles className="w-3.5 h-3.5" />
                            <span>{userEmail ? `Upgrade to ${plan.name}` : `Choose ${plan.name}`}</span>
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </section>
      )}

      {/* 11. POLICIES, TERMS & REGULATORY COMPLIANCE LINKS */}
      <section className="bg-[#F5F6FA] border-t border-[#E2E4EC] py-8 px-6">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="text-center md:text-left">
            <h3 className="font-syne font-bold text-sm text-[#211D70]">
              Policies, Terms &amp; Regulatory Disclosures
            </h3>
            <p className="text-xs text-[#505050]">
              Review {brandName} privacy terms, hospital service agreements, refund policy &amp; ISO/IEC 17025 calibration scope.
            </p>
          </div>
          <div className="flex flex-wrap items-center justify-center gap-4 text-xs font-bold text-[#211D70]">
            <button
              type="button"
              onClick={() => onNavigate('#privacy-policy')}
              className="hover:text-[#EA2227] underline underline-offset-4 transition-colors"
            >
              Privacy Policy
            </button>
            <span aria-hidden="true" className="text-[#505050]/40">·</span>
            <button
              type="button"
              onClick={() => onNavigate('#terms')}
              className="hover:text-[#EA2227] underline underline-offset-4 transition-colors"
            >
              Terms &amp; Conditions
            </button>
            <span aria-hidden="true" className="text-[#505050]/40">·</span>
            <button
              type="button"
              onClick={() => onNavigate('#refund-policy')}
              className="hover:text-[#EA2227] underline underline-offset-4 transition-colors"
            >
              Refund &amp; Cancellation
            </button>
            <span aria-hidden="true" className="text-[#505050]/40">·</span>
            <button
              type="button"
              onClick={() => onNavigate('#calibration-policy')}
              className="hover:text-[#EA2227] underline underline-offset-4 transition-colors"
            >
              Calibration &amp; Warranty
            </button>
          </div>
        </div>
      </section>
    </div>
  );
}
