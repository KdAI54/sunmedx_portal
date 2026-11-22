import React, { useState, useEffect } from 'react';
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
} from 'lucide-react';
import { getDb } from '../services/dataClient';
import { PRODUCT_ASSET_FALLBACKS } from '../config/seed';
import { Testimonial, Service, Course, Tool, SiteSettings } from '../types';

interface HomeProps {
  onNavigate: (hash: string) => void;
  siteSettings: SiteSettings | null;
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

export default function Home({ onNavigate, siteSettings }: HomeProps) {
  const [testimonials, setTestimonials] = useState<Testimonial[]>([]);
  const [services, setServices] = useState<Service[]>([]);
  const [courses, setCourses] = useState<Course[]>([]);
  const [tools, setTools] = useState<Tool[]>([]);
  const [activeTestimonialIdx, setActiveTestimonialIdx] = useState(0);
  const [openModuleIdx, setOpenModuleIdx] = useState<number | null>(0);
  const [heroImgFailed, setHeroImgFailed] = useState(false);

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
        notes: 'Submitted via SunMedX Institutional Service Enquiry card.',
        status: 'Pending',
        createdAt: new Date().toISOString(),
      });

      setLeadFeedback({
        type: 'success',
        msg: 'Enquiry registered. Our Mumbai calibration desk will reach out within 2 business hours.',
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
                24×7 Emergency Support Across Mumbai &amp; Maharashtra
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

          {/* Right Embedded Navy Enquiry Card (Mirroring .brochure-form) */}
          <div className="lg:col-span-5">
            <div className="bg-[#211D70] border border-white/20 p-6 sm:p-8 shadow-2xl rounded-sm">
              <h2 className="font-syne font-extrabold text-[#F9CB2F] text-xl uppercase tracking-wide mb-1">
                Service Enquiry
              </h2>
              <p className="text-xs text-white/80 mb-4">
                Request an NABL calibration visit, AMC quote, or Academy batch schedule.
              </p>

              {leadFeedback && (
                <div
                  role="alert"
                  className={`mb-3 text-xs font-semibold px-3 py-2.5 rounded-sm ${
                    leadFeedback.type === 'success'
                      ? 'bg-[#F8C72E]/15 text-[#F8C72E] border border-[#F8C72E]/40'
                      : 'bg-[#EA2227]/20 text-white border border-[#EA2227]'
                  }`}
                >
                  {leadFeedback.msg}
                </div>
              )}

              <form onSubmit={handleHeroEnquirySubmit} className="space-y-2.5">
                <input
                  type="text"
                  required
                  placeholder="Full Name *"
                  value={leadName}
                  onChange={e => setLeadName(e.target.value)}
                  className="w-full bg-white text-[#211D70] placeholder-[#211D70]/75 border border-[#DFDFDF] px-3.5 py-2.5 text-sm focus:outline-none focus:border-[#F26522]"
                />
                <input
                  type="email"
                  required
                  placeholder="Official Email *"
                  value={leadEmail}
                  onChange={e => setLeadEmail(e.target.value)}
                  className="w-full bg-white text-[#211D70] placeholder-[#211D70]/75 border border-[#DFDFDF] px-3.5 py-2.5 text-sm focus:outline-none focus:border-[#F26522]"
                />
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  <input
                    type="tel"
                    required
                    placeholder="Phone Number *"
                    value={leadPhone}
                    onChange={e => setLeadPhone(e.target.value)}
                    className="w-full bg-white text-[#211D70] placeholder-[#211D70]/75 border border-[#DFDFDF] px-3.5 py-2.5 text-sm focus:outline-none focus:border-[#F26522]"
                  />
                  <select
                    value={leadCity}
                    onChange={e => setLeadCity(e.target.value)}
                    aria-label="City"
                    className="w-full bg-white text-[#211D70] border border-[#DFDFDF] px-3 py-2.5 text-sm focus:outline-none focus:border-[#F26522]"
                  >
                    <option value="Mumbai">Mumbai</option>
                    <option value="Thane">Thane</option>
                    <option value="Navi Mumbai">Navi Mumbai</option>
                    <option value="Pune">Pune</option>
                    <option value="Other Maharashtra">Maharashtra</option>
                  </select>
                </div>
                <input
                  type="text"
                  required
                  placeholder="Hospital / Clinic / Organization *"
                  value={leadHospital}
                  onChange={e => setLeadHospital(e.target.value)}
                  className="w-full bg-white text-[#211D70] placeholder-[#211D70]/75 border border-[#DFDFDF] px-3.5 py-2.5 text-sm focus:outline-none focus:border-[#F26522]"
                />
                <select
                  value={leadService}
                  onChange={e => setLeadService(e.target.value)}
                  aria-label="Select Service Track"
                  className="w-full bg-white text-[#211D70] border border-[#DFDFDF] px-3 py-2.5 text-sm focus:outline-none focus:border-[#F26522]"
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

                <button
                  type="submit"
                  disabled={leadSubmitting}
                  className="w-full mt-2 py-3 px-6 bg-[#F8C72E] hover:bg-black hover:text-white text-[#211D70] font-bold text-sm uppercase tracking-wide transition-colors flex items-center justify-center gap-2"
                >
                  {leadSubmitting ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                  <span>Submit Enquiry</span>
                </button>
              </form>
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
              text: 'Certified training via SunMedX Academy',
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
              SUNMEDX BIOMEDICAL IMPACT
            </p>
            <h2 className="font-syne font-bold text-2xl sm:text-3xl text-[#211D70]">
              Trusted Biomedical Engineering Across Maharashtra
            </h2>
            <p className="text-sm sm:text-base text-[#404041] leading-relaxed">
              SunMedX partners with multi-specialty hospitals, cardiac institutes, and diagnostic clinics to maintain medical device accuracy, regulatory audit readiness, and clinical staff safety.
            </p>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 bg-white border border-[#D4D6E2] rounded-2xl p-6 sm:p-8 shadow-xs">
            {[
              { metric: '500+', label: 'Hospitals & Clinics Served' },
              { metric: '10+ Years', label: 'Biomedical Field Expertise' },
              { metric: '1,000+', label: 'Critical Devices Validated' },
              { metric: '24 × 7', label: 'Emergency Mumbai Dispatch' },
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
              <h2 className="font-syne font-bold text-xl sm:text-2xl">Overview of SunMedX Capabilities</h2>
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

          {/* Who Benefits Split Block */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center bg-[#F4F5FA] border border-[#D4D6E2] rounded-2xl overflow-hidden">
            <div className="lg:col-span-5 h-64 lg:h-full bg-[#211D70]">
              <img
                src={PRODUCT_ASSET_FALLBACKS.trainingBench}
                alt="Biomedical engineers calibrating critical care equipment"
                referrerPolicy="no-referrer"
                className="w-full h-full object-cover"
              />
            </div>
            <div className="lg:col-span-7 p-6 sm:p-8 space-y-4">
              <div className="bits-section-banner">
                <h3 className="font-syne font-bold text-lg sm:text-xl">Who Can Benefit?</h3>
              </div>
              <ul className="space-y-2.5 text-sm text-[#211D70] pt-1">
                {[
                  'Multi-specialty Hospitals & Critical Care ICUs preparing for NABH / NABL inspections.',
                  'Diagnostic Centers requiring verified calibration certificates for imaging & patient monitors.',
                  'Biomedical Engineers & Clinical Technicians seeking structured hands-on certification.',
                  'Nursing Superintendents & Ward Staff training on ventilator and defibrillator safety.',
                ].map((point, idx) => (
                  <li key={idx} className="flex items-start gap-2.5">
                    <CheckCircle2 className="w-4 h-4 text-[#F26522] shrink-0 mt-0.5" />
                    <span className="leading-relaxed">{point}</span>
                  </li>
                ))}
              </ul>
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
              Comprehensive equipment protocols paired with practical SunMedX Academy engineering tracks.
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
                  SunMedX Academy Courses
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
                onClick={() => onNavigate('#customer-portal')}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full border-2 border-[#211D70] text-[#211D70] hover:bg-[#211D70] hover:text-white font-bold text-xs transition-colors"
              >
                <span>Access Client Hub</span>
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
    </div>
  );
}
