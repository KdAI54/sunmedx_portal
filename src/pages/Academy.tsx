import React, { useState, useEffect } from 'react';
import { Award, Video, Users, ChevronDown, ChevronUp } from 'lucide-react';
import { getDb } from '../services/dataClient';
import { Course, AcademyFAQ } from '../types';

export default function Academy() {
  const [courses, setCourses] = useState<Course[]>([]);
  const [faqs, setFaqs] = useState<AcademyFAQ[]>([]);
  const [activeFaqIdx, setActiveFaqIdx] = useState<number | null>(0);

  useEffect(() => {
    const db = getDb();

    const unsub = db.collection('academy_courses').onSnapshot((snap: any) => {
      const list: Course[] = [];
      snap.forEach((doc: any) => {
        list.push({ id: doc.id, ...doc.data() });
      });
      setCourses(list);
    });

    const unsubF = db.collection('academy_faqs').onSnapshot((snap: any) => {
      const list: AcademyFAQ[] = [];
      snap.forEach((doc: any) => {
        list.push({ id: doc.id, ...doc.data() });
      });
      setFaqs(list);
    });

    return () => {
      unsub();
      unsubF();
    };
  }, []);

  const handleToggleFaq = (idx: number) => {
    setActiveFaqIdx(prev => (prev === idx ? null : idx));
  };

  return (
    <div className="bg-white text-[#404041] page-fade-in">
      {/* Academy Intro */}
      <section className="bg-[#EAEAEA] py-12 px-6 border-b border-[#D4D6E2]">
        <div className="max-w-7xl mx-auto text-center space-y-4">
          <div className="bits-section-banner">
            <h1 className="font-syne font-bold text-2xl sm:text-3xl tracking-tight">
              SunMedX Biomedical Academy
            </h1>
          </div>
          <p className="text-sm sm:text-base text-[#211D70] max-w-2xl mx-auto leading-relaxed">
            Master diagnostics and calibration of ICU ventilators, multi-parameter patient monitors, and hospital electrical safety systems.
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-5 max-w-5xl mx-auto pt-4 text-left">
            {[
              { tag: 'NABL-Aligned Workflows', desc: 'Step-by-step calibration checklists and reference tolerances' },
              { tag: 'Graphy Video Sessions', desc: 'On-demand modules and recorded technical walkthroughs' },
              { tag: 'Verified Certificates', desc: 'QR-verifiable engineering completion certificates' },
              { tag: 'Mumbai Lab Practicum', desc: 'Hands-on exposure on clinical test analyzers' },
            ].map((benefit, idx) => (
              <div key={idx} className="bits-lead-card p-5 flex flex-col justify-between">
                <div className="w-7 h-7 rounded-full bg-[#211D70] text-[#F8C72E] flex items-center justify-center font-bold text-xs mb-2.5">
                  ✓
                </div>
                <div>
                  <h4 className="font-syne font-bold text-sm text-[#211D70] leading-snug">{benefit.tag}</h4>
                  <p className="text-xs text-[#404041] mt-1 leading-relaxed">{benefit.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Course Cards Grid */}
      <section className="max-w-7xl mx-auto px-6 py-12 space-y-8">
        <div className="text-center">
          <div className="bits-section-banner">
            <h2 className="font-syne font-bold text-xl sm:text-2xl">Available Certification Courses</h2>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {courses.map(c => (
            <div
              key={c.id}
              className="bg-white border border-[#211D70]/25 rounded-2xl p-6 flex flex-col justify-between hover:border-[#211D70] transition-colors shadow-xs"
            >
              <div className="space-y-3.5">
                <span className="inline-block bg-[#211D70] text-[#F8C72E] text-xs font-mono font-bold px-2.5 py-0.5 rounded-sm">
                  {c.level}
                </span>
                <h3 className="font-syne font-bold text-[#211D70] text-base leading-snug">{c.title}</h3>
                <p className="text-sm text-[#404041] leading-relaxed">
                  {c.summary ||
                    'Practical curriculum centered on clinical calibration tolerances, testing loops, and electrical safety metrics.'}
                </p>

                <div className="pt-3 flex flex-col gap-1.5 font-mono text-xs text-[#505050] border-t border-[#E6E7EE]">
                  <div className="flex items-center gap-2">
                    <Video className="w-3.5 h-3.5 text-[#211D70]" />
                    <span>Duration: {c.duration}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Users className="w-3.5 h-3.5 text-[#EA2227]" />
                    <span>Language: {c.language}</span>
                  </div>
                </div>
              </div>

              <div className="mt-6 pt-4 border-t border-[#E6E7EE] flex items-center justify-between">
                <span className="font-mono text-sm font-bold text-[#211D70] tabular-nums">
                  {c.price ? `Rs ${c.price.toLocaleString()}` : 'Free'}
                </span>

                <a
                  href={c.graphyUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="py-2 px-3.5 rounded-md bg-[#F8C72E] hover:bg-[#211D70] hover:text-white text-[#211D70] font-bold text-xs flex items-center gap-1.5 transition-colors shrink-0"
                >
                  <span>Enroll</span>
                  <Award className="w-3.5 h-3.5" />
                </a>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* BITS-Style Rounded Pill FAQ Accordion (.faq_question + .answer border #F8BE15) */}
      {faqs.length > 0 && (
        <section className="bg-[#EAEAEA]/60 py-12 px-6">
          <div className="max-w-4xl mx-auto space-y-6">
            <div className="text-center space-y-2">
              <div className="bits-section-banner">
                <h2 className="font-syne font-bold text-xl">Frequently Asked Questions</h2>
              </div>
              <p className="text-xs text-[#505050] pt-1">
                Details on certification verification, calibration templates, and Graphy access.
              </p>
            </div>

            <div className="space-y-3">
              {faqs.map((faq, idx) => {
                const isOpen = activeFaqIdx === idx;
                return (
                  <div key={faq.id || idx}>
                    <button
                      type="button"
                      onClick={() => handleToggleFaq(idx)}
                      className={`w-full flex items-center justify-between text-left px-6 py-3.5 rounded-full font-syne font-bold text-sm sm:text-base transition-colors ${
                        isOpen
                          ? 'bg-[#211D70] text-white'
                          : 'bg-white border border-[#D4D6E2] text-[#211D70] hover:border-[#211D70]'
                      }`}
                    >
                      <span>{faq.question}</span>
                      <span
                        className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ml-3 ${
                          isOpen ? 'bg-white text-[#211D70]' : 'bg-[#EAEAEA] text-[#211D70]'
                        }`}
                      >
                        {isOpen ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                      </span>
                    </button>

                    {isOpen && (
                      <div className="mt-2 bg-white border border-[#F8BE15] rounded-2xl px-6 py-4 text-sm text-[#211D70] leading-relaxed shadow-xs">
                        {faq.answer}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </section>
      )}
    </div>
  );
}
