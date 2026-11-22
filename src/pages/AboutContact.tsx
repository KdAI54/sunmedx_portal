import React, { useState } from 'react';
import { Send, MapPin, Phone, Mail, Clock, RefreshCw, Handshake, HeartHandshake, ShieldQuestion } from 'lucide-react';
import { getDb } from '../services/dataClient';

export default function AboutContact() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [hospital, setHospital] = useState('');
  const [message, setMessage] = useState('');

  const [isSending, setIsSending] = useState(false);
  const [showToast, setShowToast] = useState(false);

  const handleSubmitMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !email || !message) {
      alert('Please provide name, email, and description message.');
      return;
    }

    setIsSending(true);
    try {
      const db = getDb();
      await db.collection('messages').add({
        name,
        email,
        phone,
        hospital,
        message,
        status: 'Unread',
        createdAt: new Date().toISOString(),
      });

      setShowToast(true);
      setName('');
      setEmail('');
      setPhone('');
      setHospital('');
      setMessage('');

      setTimeout(() => setShowToast(false), 5000);
    } catch (err: any) {
      alert('Failed sending: ' + err.message);
    } finally {
      setIsSending(false);
    }
  };

  return (
    <div className="bg-white text-[#404041] page-fade-in">
      {showToast && (
        <div className="fixed bottom-6 left-6 z-[1000] bg-[#211D70] border-2 border-[#F8C72E] text-white px-5 py-4 rounded-xl shadow-2xl flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-[#F8C72E] text-[#211D70] flex items-center justify-center font-bold">
            ✓
          </div>
          <div>
            <h4 className="font-syne font-bold text-sm">Message Sent</h4>
            <p className="text-xs text-[#F8C72E] font-mono mt-0.5">
              Received by Mumbai biomedical engineering desk.
            </p>
          </div>
        </div>
      )}

      {/* Hero Overview */}
      <section className="bg-[#EAEAEA] py-12 px-6 border-b border-[#D4D6E2]">
        <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-10 items-center">
          <div className="space-y-4">
            <div className="bits-section-banner">
              <h1 className="font-syne font-bold text-2xl sm:text-3xl tracking-tight">
                Our Biomedical Engineering Heritage
              </h1>
            </div>
            <p className="text-sm sm:text-base text-[#211D70] leading-relaxed font-medium">
              Headquartered in Mumbai, Maharashtra, SunMedX delivers NABL-traceable diagnostic calibration, certified ventilator checks, and multi-parameter clinical support.
            </p>
            <p className="text-sm text-[#404041] leading-relaxed">
              Our mission is to safeguard healthcare delivery through accurate telemetry verification—bridging engineering compliance and bedside safety tolerances.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-4">
            {[
              { metric: 'NABL Traced', title: 'Accreditation' },
              { metric: 'Mumbai HQ', title: 'Local Response' },
              { metric: 'Expert Labs', title: 'Calibration' },
              { metric: '24hr Dispatch', title: 'Critical Care' },
            ].map((feat, idx) => (
              <div key={idx} className="bits-lead-card p-5 flex flex-col justify-between">
                <span className="text-lg sm:text-xl font-syne font-extrabold text-[#211D70] leading-snug">
                  {feat.metric}
                </span>
                <span className="text-xs font-mono font-semibold text-[#EA2227] mt-2">{feat.title}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Values Grid */}
      <section className="max-w-7xl mx-auto px-6 py-12 space-y-12">
        <div className="bits-labs-border p-6 sm:p-10 bg-white grid grid-cols-1 md:grid-cols-3 gap-8">
          {[
            {
              icon: HeartHandshake,
              title: 'Core Clinical Values',
              desc: 'Precision, patient safety, and mathematical validation fidelity across every calibrated medical parameter.',
            },
            {
              icon: Handshake,
              title: 'Transparent AMC Contracts',
              desc: 'Clear pricing models with zero hidden fees and traceable audit records stored securely.',
            },
            {
              icon: ShieldQuestion,
              title: 'Regulatory Readiness',
              desc: 'Aligned with NABH and NABL ISO 17025 traceability standards required by clinical audit teams.',
            },
          ].map((v, idx) => (
            <div key={idx} className={`space-y-3 ${idx < 2 ? 'md:border-r md:border-[#DCDCDC] md:pr-6' : ''}`}>
              <div className="w-11 h-11 rounded-xl bg-[#211D70] flex items-center justify-center text-[#F8C72E]">
                <v.icon className="w-5 h-5" />
              </div>
              <h3 className="font-syne font-bold text-[#211D70] text-base">{v.title}</h3>
              <p className="text-sm text-[#404041] leading-relaxed">{v.desc}</p>
            </div>
          ))}
        </div>

        {/* Main Form + Contact Details */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <div className="bg-[#211D70] p-6 sm:p-8 rounded-xl shadow-xl space-y-5 text-white">
            <div className="space-y-1">
              <h2 className="font-syne font-extrabold text-xl text-[#F9CB2F] uppercase">Send an Inquiry</h2>
              <p className="text-xs text-white/80">Direct routing to our Mumbai biomedical engineering desk.</p>
            </div>

            <form onSubmit={handleSubmitMessage} className="space-y-3.5">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div>
                  <label className="block text-xs font-semibold text-white/90 mb-1">Full Name *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Dr. Ananya Sharma"
                    value={name}
                    onChange={e => setName(e.target.value)}
                    className="w-full bg-white text-[#211D70] border border-[#DFDFDF] rounded-md px-3.5 py-2.5 text-sm focus:outline-none focus:border-[#F26522]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-white/90 mb-1">Email Address *</label>
                  <input
                    type="email"
                    required
                    placeholder="name@hospital.in"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    className="w-full bg-white text-[#211D70] border border-[#DFDFDF] rounded-md px-3.5 py-2.5 text-sm focus:outline-none focus:border-[#F26522]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div>
                  <label className="block text-xs font-semibold text-white/90 mb-1">Phone Number</label>
                  <input
                    type="tel"
                    placeholder="+91 98XXX XXXXX"
                    value={phone}
                    onChange={e => setPhone(e.target.value)}
                    className="w-full bg-white text-[#211D70] border border-[#DFDFDF] rounded-md px-3.5 py-2.5 text-sm focus:outline-none focus:border-[#F26522]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-white/90 mb-1">Hospital / Clinic</label>
                  <input
                    type="text"
                    placeholder="e.g. Mumbai General Hospital"
                    value={hospital}
                    onChange={e => setHospital(e.target.value)}
                    className="w-full bg-white text-[#211D70] border border-[#DFDFDF] rounded-md px-3.5 py-2.5 text-sm focus:outline-none focus:border-[#F26522]"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-white/90 mb-1">Inquiry Details *</label>
                <textarea
                  required
                  rows={3}
                  placeholder="Mention device models, AMC calibration visits requested, or training inquiries..."
                  value={message}
                  onChange={e => setMessage(e.target.value)}
                  className="w-full bg-white text-[#211D70] border border-[#DFDFDF] rounded-md px-3.5 py-2.5 text-sm focus:outline-none focus:border-[#F26522]"
                />
              </div>

              <button
                type="submit"
                disabled={isSending}
                className="w-full py-3 rounded-md bg-[#F8C72E] hover:bg-black hover:text-white text-[#211D70] font-bold text-sm flex items-center justify-center gap-2 transition-colors uppercase"
              >
                {isSending ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                <span>Send Inquiry</span>
              </button>
            </form>
          </div>

          <div className="space-y-6">
            <div className="bg-[#FAFBFD] border border-[#D4D6E2] rounded-xl p-6 sm:p-8 space-y-5">
              <h3 className="font-syne font-bold text-[#211D70] text-lg">Mumbai Dispatch Contacts</h3>

              <div className="space-y-4 text-sm">
                {[
                  { icon: MapPin, title: 'Corporate Office', value: 'Bandra West, Mumbai, Maharashtra 400050' },
                  { icon: Phone, title: 'Dispatch Phone', value: '+91 98765 43210 (Mon–Sat, 9 AM–6 PM)' },
                  { icon: Mail, title: 'Official Email', value: 'info@sunmedx.in' },
                  { icon: Clock, title: 'Operating Hours', value: 'Monday to Saturday, 9 AM to 6 PM IST' },
                ].map((c, idx) => (
                  <div key={idx} className="flex gap-3.5 items-start">
                    <div className="w-9 h-9 rounded-lg bg-[#211D70] text-[#F8C72E] flex items-center justify-center shrink-0">
                      <c.icon className="w-4 h-4" />
                    </div>
                    <div>
                      <h5 className="text-xs text-[#505050] font-semibold">{c.title}</h5>
                      <p className="text-[#211D70] font-medium mt-0.5 leading-relaxed">{c.value}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="h-44 w-full rounded-xl overflow-hidden border-2 border-[#211D70] relative bg-[#211D70] flex items-center justify-center">
              <div className="absolute inset-0 bg-[#211D70]/75 z-10 pointer-events-none flex flex-col justify-center items-center text-center p-4">
                <MapPin className="w-6 h-6 text-[#F8C72E] mb-1.5" />
                <h4 className="font-syne font-bold text-sm text-white">Mumbai Head Office</h4>
                <p className="text-xs text-[#F8C72E] mt-0.5">Maharashtra calibration operations</p>
              </div>

              <iframe
                title="Mumbai HQ Map"
                src="https://maps.google.com/maps?q=Bandra%20West,%20Mumbai,%20Maharashtra%20400050&t=&z=13&ie=UTF8&iwloc=&output=embed"
                className="w-full h-full border-0 opacity-35 select-none pointer-events-none"
              />
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
