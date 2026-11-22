import React, { useEffect, useState } from 'react';
import { jsPDF } from 'jspdf';
import {
  ArrowLeft,
  Download,
  FileText,
  Lock,
  RefreshCcw,
  ShieldCheck,
} from 'lucide-react';
import { SiteSettings } from '../types';

export type PolicySectionId = 'privacy' | 'terms' | 'refund' | 'calibration';

interface LegalPoliciesProps {
  initialSection?: PolicySectionId;
  siteSettings: SiteSettings | null;
  onNavigate: (hash: string) => void;
}

const POLICY_TABS: Array<{
  id: PolicySectionId;
  hash: string;
  label: string;
  icon: React.ComponentType<any>;
  updated: string;
}> = [
  {
    id: 'privacy',
    hash: '#privacy-policy',
    label: 'Privacy Policy',
    icon: Lock,
    updated: 'Effective November 2026',
  },
  {
    id: 'terms',
    hash: '#terms',
    label: 'Terms & Conditions',
    icon: FileText,
    updated: 'Effective November 2026',
  },
  {
    id: 'refund',
    hash: '#refund-policy',
    label: 'Refund & Cancellation',
    icon: RefreshCcw,
    updated: 'Effective November 2026',
  },
  {
    id: 'calibration',
    hash: '#calibration-policy',
    label: 'Calibration & Warranty',
    icon: ShieldCheck,
    updated: 'ISO/IEC 17025 Scope',
  },
];

export default function LegalPolicies({
  initialSection = 'privacy',
  siteSettings,
  onNavigate,
}: LegalPoliciesProps) {
  const [activeTab, setActiveTab] = useState<PolicySectionId>(initialSection);

  useEffect(() => {
    setActiveTab(initialSection);
  }, [initialSection]);

  const brandName = siteSettings?.siteName || 'SunMedX Biomedical';
  const contactEmail = siteSettings?.email || 'info@sunmedx.in';
  const contactPhone = siteSettings?.phone || '+91 98765 43210';
  const officeAddress = siteSettings?.address || 'Mumbai, Maharashtra, India';

  const handleDownloadPolicyPdf = () => {
    const doc = new jsPDF();
    doc.setFillColor(33, 29, 112);
    doc.rect(0, 0, 210, 34, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFont('Helvetica', 'bold');
    doc.setFontSize(16);
    doc.text(`${brandName.toUpperCase()} — POLICIES & COMPLIANCE`, 14, 18);
    doc.setFontSize(9);
    doc.setFont('Helvetica', 'normal');
    doc.text(`${officeAddress} | ${contactEmail} | ${contactPhone}`, 14, 26);

    doc.setTextColor(35, 35, 35);
    doc.setFontSize(11);
    doc.setFont('Helvetica', 'bold');
    const selectedLabel = POLICY_TABS.find((t) => t.id === activeTab)?.label || 'Policy Document';
    doc.text(selectedLabel, 14, 46);

    doc.setFont('Helvetica', 'normal');
    doc.setFontSize(9.5);
    const summaryText =
      activeTab === 'privacy'
        ? `1. Data Collection: We collect only institutional contact details, equipment serial logs, calibration readings, and billing GST information required to deliver biomedical services.\n2. DPDP Act 2023 Compliance: Client records are used strictly for AMC scheduling, NABL certificate issuance, and order fulfillment.\n3. Security & Confidentiality: Patient health information (PHI) is never requested or stored on the service portal; device logs contain asset telemetry only.`
        : activeTab === 'terms'
        ? `1. Service Scope: All onsite biomedical calibration, validation, and repair dispatches follow agreed hospital work orders and RFQ pricing.\n2. Commercial & GST Terms: Prices quoted in INR are subject to applicable Indian GST (18% standard unless notified) as per HSN/SAC codes.\n3. Academy & Digital Tools: Diagnostic calculators provide engineering reference estimates; final clinical verification rests with authorized biomedical personnel.\n4. Governing Law: Disputes are subject to exclusive jurisdiction of courts in Mumbai, Maharashtra.`
        : activeTab === 'refund'
        ? `1. Service Dispatch Rescheduling: Hospital calibration visits may be rescheduled free of charge up to 24 hours prior to engineer dispatch.\n2. Equipment & Spares Orders: Unused sealed analyzers or accessories returned within 7 days of delivery with original packaging qualify for replacement or refund after QA check.\n3. Annual Maintenance Contracts (AMC): Pro-rata refunds apply on unexpired full quarters subject to a 10% administrative closure fee.`
        : `1. NABL ISO/IEC 17025 Alignment: All electrical safety (IEC 60601) and functional tests are conducted against traceable reference analyzers calibrated annually.\n2. Pre-Inspection Condition: Devices with pre-existing internal board failure or physical fluid damage are documented prior to service.\n3. Calibration Validity: Certificates remain valid for the specified cycle (typically 12 months) unless the unit undergoes physical shock, opening, or part replacement.`;

    const lines = doc.splitTextToSize(summaryText, 180);
    doc.text(lines, 14, 56);
    doc.save(`SunMedX-${activeTab}-policy.pdf`);
  };

  return (
    <div className="bg-[#F5F6FA] min-h-[75vh] py-10 px-4 sm:px-6 page-fade-in">
      <div className="max-w-5xl mx-auto space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <button
            type="button"
            onClick={() => onNavigate('#home')}
            className="inline-flex items-center gap-2 text-xs font-bold text-[#211D70] hover:text-[#EA2227] transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Back to Home</span>
          </button>

          <button
            type="button"
            onClick={handleDownloadPolicyPdf}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-[#211D70] hover:bg-[#272F78] text-[#F8C72E] text-xs font-bold transition-colors"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Download Policy PDF</span>
          </button>
        </div>

        <div className="bg-white border border-[#D4D6E2] rounded-2xl p-6 sm:p-8 shadow-xs space-y-6">
          <div className="border-b border-[#E6E7EE] pb-5 space-y-2">
            <p className="text-xs font-mono font-bold text-[#EA2227] uppercase tracking-wider">
              {brandName} Governance &amp; Legal Compliance
            </p>
            <h1 className="font-syne font-extrabold text-2xl sm:text-3xl text-[#211D70]">
              Policies, Terms &amp; Regulatory Disclosures
            </h1>
            <p className="text-sm text-[#505050] max-w-2xl">
              Transparent commercial, data privacy, GST billing, and NABL-aligned biomedical service policies governing hospital engagements and portal orders.
            </p>
          </div>

          {/* Policy Section Switcher */}
          <div className="flex flex-wrap gap-2 bg-[#F4F5FA] p-1.5 rounded-xl border border-[#E2E4EC]">
            {POLICY_TABS.map((tab) => {
              const IconComp = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => {
                    setActiveTab(tab.id);
                    onNavigate(tab.hash);
                  }}
                  className={`px-3.5 py-2 rounded-lg text-xs font-bold flex items-center gap-2 transition-colors whitespace-nowrap ${
                    isActive
                      ? 'bg-[#211D70] text-[#F8C72E] shadow-xs'
                      : 'text-[#404041] hover:text-[#211D70] hover:bg-white'
                  }`}
                >
                  <IconComp className="w-3.5 h-3.5 shrink-0" />
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </div>

          {activeTab === 'privacy' && (
            <article className="space-y-5 text-sm text-[#404041] leading-relaxed">
              <div className="flex items-center justify-between border-b border-[#E6E7EE] pb-3">
                <h2 className="font-syne font-bold text-xl text-[#211D70]">Privacy Policy &amp; Clinical Data Stewardship</h2>
                <span className="text-xs font-mono text-[#505050]">DPDP Act 2023 Aligned</span>
              </div>

              <section className="space-y-2">
                <h3 className="font-bold text-[#211D70] text-base">1. Information We Collect</h3>
                <p>
                  {brandName} collects only business and operational information voluntarily provided through service bookings, RFQ submissions, Client Hub accounts, and e-catalogue purchases—including hospital/clinic name, authorized biomedical contact person, business email, phone number, billing GSTIN, equipment serial numbers, and site validation records.
                </p>
              </section>

              <section className="space-y-2">
                <h3 className="font-bold text-[#211D70] text-base">2. Zero Patient Health Record Storage</h3>
                <p>
                  Our biomedical management portal is built strictly for medical equipment asset lifecycle, calibration measurements, and commercial invoicing. Users must not upload identifiable patient clinical records (PHI) into repair notes or diagnostic fault forms.
                </p>
              </section>

              <section className="space-y-2">
                <h3 className="font-bold text-[#211D70] text-base">3. How Data Is Used &amp; Protected</h3>
                <ul className="list-disc list-inside space-y-1">
                  <li>Issuing traceable NABL-aligned calibration PDFs, GST tax invoices, and AMC agreements.</li>
                  <li>Dispatching certified biomedical engineers and sending critical AMC renewal reminders.</li>
                  <li>Processing payments via authorized gateway providers without storing raw card/banking secrets on portal servers.</li>
                  <li>We never sell, rent, or trade hospital client lists to external marketing brokers.</li>
                </ul>
              </section>

              <section className="space-y-2">
                <h3 className="font-bold text-[#211D70] text-base">4. Data Access &amp; Grievance Officer</h3>
                <p>
                  Hospitals and registered account holders may request account updates, export of calibration records, or account deletion by writing to{' '}
                  <a href={`mailto:${contactEmail}`} className="text-[#211D70] font-bold underline">
                    {contactEmail}
                  </a>{' '}
                  or calling {contactPhone}.
                </p>
              </section>
            </article>
          )}

          {activeTab === 'terms' && (
            <article className="space-y-5 text-sm text-[#404041] leading-relaxed">
              <div className="flex items-center justify-between border-b border-[#E6E7EE] pb-3">
                <h2 className="font-syne font-bold text-xl text-[#211D70]">Terms &amp; Conditions of Service &amp; Procurement</h2>
                <span className="text-xs font-mono text-[#505050]">Mumbai, Maharashtra Jurisdiction</span>
              </div>

              <section className="space-y-2">
                <h3 className="font-bold text-[#211D70] text-base">1. Scope of Engineering &amp; Portal Services</h3>
                <p>
                  By accessing {brandName} or submitting a calibration booking, quotation request, AMC agreement, or equipment order, you confirm that you act on behalf of a healthcare institution, laboratory, distributor, or qualified engineering trainee.
                </p>
              </section>

              <section className="space-y-2">
                <h3 className="font-bold text-[#211D70] text-base">2. Quotations, Pricing &amp; GST</h3>
                <p>
                  All listed INR prices exclude Indian Goods &amp; Services Tax (standard 18% GST unless specified otherwise by HSN/SAC category) unless explicitly labeled GST-inclusive. Approved RFQs are valid for 15 calendar days from issue.
                </p>
              </section>

              <section className="space-y-2">
                <h3 className="font-bold text-[#211D70] text-base">3. AMC Agreements &amp; Access Obligations</h3>
                <p>
                  Under active Annual Maintenance Contracts, the client institution shall provide safe clinical floor access to equipment during scheduled preventive visits and maintain clean AC mains power with standard earthing (&lt; 2V N-E).
                </p>
              </section>

              <section className="space-y-2">
                <h3 className="font-bold text-[#211D70] text-base">4. Smart Calculators &amp; AI Troubleshooting Advisory</h3>
                <p>
                  Digital calculators (ventilator minute volume, gas cylinder endurance, NABL deviation check) and AI fault triage outputs serve as clinical engineering decision-support tools and do not replace manufacturer service manuals or OEM safety sign-off.
                </p>
              </section>
            </article>
          )}

          {activeTab === 'refund' && (
            <article className="space-y-5 text-sm text-[#404041] leading-relaxed">
              <div className="flex items-center justify-between border-b border-[#E6E7EE] pb-3">
                <h2 className="font-syne font-bold text-xl text-[#211D70]">Refund, Rescheduling &amp; Cancellation Policy</h2>
                <span className="text-xs font-mono text-[#505050]">Transparent Commercial Desk</span>
              </div>

              <section className="space-y-2">
                <h3 className="font-bold text-[#211D70] text-base">1. Calibration &amp; Field Visit Bookings</h3>
                <p>
                  Onsite service visits may be cancelled or rescheduled at zero fee up to 24 hours prior to the scheduled dispatch slot. Same-day cancellations after field engineer dispatch may attract standard local conveyance charges.
                </p>
              </section>

              <section className="space-y-2">
                <h3 className="font-bold text-[#211D70] text-base">2. E-Catalogue Equipment &amp; Spare Accessories</h3>
                <p>
                  Devices damaged in transit or showing manufacturing defects on arrival must be reported within 48 hours with unboxing evidence for priority replacement. Unopened consumables or standard accessories are eligible for return within 7 days subject to QA inspection.
                </p>
              </section>

              <section className="space-y-2">
                <h3 className="font-bold text-[#211D70] text-base">3. AMC Agreements &amp; Academy Courses</h3>
                <p>
                  Annual Maintenance Agreements cancelled in writing qualify for a pro-rata refund of unused full quarters minus completed preventive audit costs and a 10% administrative processing fee. Refunds are credited to the original payment source within 7–10 business days.
                </p>
              </section>
            </article>
          )}

          {activeTab === 'calibration' && (
            <article className="space-y-5 text-sm text-[#404041] leading-relaxed">
              <div className="flex items-center justify-between border-b border-[#E6E7EE] pb-3">
                <h2 className="font-syne font-bold text-xl text-[#211D70]">Calibration Traceability &amp; Service Warranty Policy</h2>
                <span className="text-xs font-mono text-[#505050]">ISO/IEC 17025 &amp; IEC 60601</span>
              </div>

              <section className="space-y-2">
                <h3 className="font-bold text-[#211D70] text-base">1. Reference Standard Traceability</h3>
                <p>
                  Every {brandName} calibration and safety audit utilizes reference analyzers calibrated against master standards traceable to NABL / national metrology labs. Deviation tolerance is evaluated against OEM and clinical NABH/ISO thresholds.
                </p>
              </section>

              <section className="space-y-2">
                <h3 className="font-bold text-[#211D70] text-base">2. Repair Workmanship Warranty</h3>
                <p>
                  Completed corrective repairs carry a 90-day workmanship warranty covering the specific subsystem serviced. Consumable sensors (O2 cells, SpO2 finger probes, batteries, ECG cables) carry OEM manufacturer replacement warranty where applicable.
                </p>
              </section>

              <section className="space-y-2">
                <h3 className="font-bold text-[#211D70] text-base">3. Certificate Integrity</h3>
                <p>
                  Calibration certificates and digital sign-off reports stored inside Client Hub remain valid for the stated periodicity unless the unit suffers physical impact, unauthorized tampering, fluid ingress, or sensor swap after issuance.
                </p>
              </section>
            </article>
          )}

          <div className="pt-5 border-t border-[#E6E7EE] flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs text-[#505050]">
            <span>
              Published by <strong className="text-[#211D70]">{brandName}</strong> • {officeAddress}
            </span>
            <span>
              Compliance Desk: <strong className="text-[#211D70]">{contactEmail}</strong> • {contactPhone}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
