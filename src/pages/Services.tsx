import React, { useState, useEffect } from 'react';
import { Send, X, RefreshCw } from 'lucide-react';
import { getDb } from '../services/dataClient';
import { Service, ServiceRequest } from '../types';

interface ServicesProps {
  userId: string;
  userEmail: string;
}

export default function Services({ userId, userEmail }: ServicesProps) {
  const [services, setServices] = useState<Service[]>([]);
  const [activeBookingService, setActiveBookingService] = useState<Service | null>(null);

  const [clientName, setClientName] = useState('');
  const [clientEmail, setClientEmail] = useState(userEmail || '');
  const [clientPhone, setClientPhone] = useState('');
  const [hospitalUnit, setHospitalUnit] = useState('');
  const [equipmentType, setEquipmentType] = useState('');
  const [scheduledDate, setScheduledDate] = useState('');
  const [requestedCity, setRequestedCity] = useState('Mumbai');
  const [bookingNotes, setBookingNotes] = useState('');

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showSuccessToast, setShowSuccessToast] = useState(false);

  useEffect(() => {
    const db = getDb();
    const unsub = db.collection('services').onSnapshot((snap: any) => {
      const list: Service[] = [];
      snap.forEach((doc: any) => {
        list.push({ id: doc.id, ...doc.data() });
      });
      setServices(list);
    });
    return () => unsub();
  }, []);

  const handleOpenBooking = (service: Service) => {
    setActiveBookingService(service);
    setEquipmentType(service.title.split(' Calibration')[0]);
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    setScheduledDate(tomorrow.toISOString().split('T')[0]);
  };

  const handleBookService = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!clientName || !clientEmail || !clientPhone || !hospitalUnit || !scheduledDate) {
      alert('Please fill in all required scheduling inputs.');
      return;
    }

    setIsSubmitting(true);
    try {
      const db = getDb();
      const payload: Omit<ServiceRequest, 'id'> = {
        userId: userId || 'anonymous',
        userEmail: clientEmail,
        name: clientName,
        email: clientEmail,
        phone: clientPhone,
        hospital: hospitalUnit,
        equipment: equipmentType,
        serviceType: activeBookingService?.title || 'Biomedical Support',
        date: scheduledDate,
        city: requestedCity,
        notes: bookingNotes,
        status: 'Pending',
        createdAt: new Date().toISOString(),
      };

      await db.collection('service_requests').add(payload);

      setShowSuccessToast(true);
      setActiveBookingService(null);
      setClientName('');
      setClientPhone('');
      setHospitalUnit('');
      setBookingNotes('');

      setTimeout(() => setShowSuccessToast(false), 5000);
    } catch (err: any) {
      alert('Booking failed: ' + err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="bg-white text-[#404041] page-fade-in">
      {showSuccessToast && (
        <div className="fixed bottom-4 left-4 right-4 sm:right-auto sm:bottom-6 sm:left-6 z-[1000] bg-[#211D70] border-2 border-[#F8C72E] text-white px-4 py-3.5 sm:px-5 sm:py-4 rounded-xl shadow-2xl flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-[#F8C72E] text-[#211D70] flex items-center justify-center font-bold">
            ✓
          </div>
          <div>
            <h4 className="font-syne font-bold text-sm">AMC Service Booked</h4>
            <p className="text-xs text-[#F8C72E] font-mono mt-0.5">
              Scheduler sent. Ref SMC-X9. Mumbai Dispatch active.
            </p>
          </div>
        </div>
      )}

      {/* Institutional Banner Header */}
      <section className="bg-[#EAEAEA] py-12 px-6 border-b border-[#D4D6E2]">
        <div className="max-w-7xl mx-auto text-center space-y-3">
          <div className="bits-section-banner">
            <h1 className="font-syne font-bold text-2xl sm:text-3xl tracking-tight">
              Calibration &amp; Engineering Services
            </h1>
          </div>
          <p className="text-sm sm:text-base text-[#211D70] max-w-2xl mx-auto leading-relaxed pt-1">
            NABL-aligned diagnostic sweeps and preventive maintenance across Maharashtra, with verified PDF validation reports delivered within 24 hours.
          </p>
        </div>
      </section>

      {/* Services Grid */}
      <section className="max-w-7xl mx-auto px-6 py-12">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {services.map(s => (
            <div
              key={s.id}
              className="bits-lead-card p-6 sm:p-7 flex flex-col justify-between transition-transform hover:-translate-y-0.5"
            >
              <div className="space-y-4">
                <div className="w-12 h-12 rounded-xl bg-[#211D70] flex items-center justify-center text-[#F8C72E]">
                  <i className={`${s.icon || 'fa-solid fa-screwdriver-wrench'} text-xl`} />
                </div>
                <h3 className="font-syne font-bold text-[#211D70] text-lg leading-snug">{s.title}</h3>
                <p className="text-sm text-[#404041] leading-relaxed">{s.description}</p>
              </div>

              <div className="mt-6 pt-5 border-t border-[#E6E7EE] flex items-center justify-between gap-3">
                <div className="space-y-0.5">
                  <span className="text-xs text-[#505050] block font-medium">Standard Fee</span>
                  <div className="font-mono text-sm font-bold text-[#211D70] tabular-nums">{s.priceRange}</div>
                </div>
                <button
                  onClick={() => handleOpenBooking(s)}
                  className="py-2.5 px-5 rounded-md bg-[#F8C72E] hover:bg-[#211D70] hover:text-white text-[#211D70] font-bold text-xs transition-colors whitespace-nowrap"
                >
                  Book Service
                </button>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Booking Modal */}
      {activeBookingService && (
        <div className="fixed inset-0 z-[1000] bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-6">
          <div className="bg-white w-full max-w-xl rounded-xl border-2 border-[#211D70] overflow-y-auto max-h-[92vh] shadow-2xl relative">
            <div className="bg-[#211D70] p-5 flex justify-between items-center text-white">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-[#F8C72E] flex items-center justify-center text-[#211D70]">
                  <i className={`${activeBookingService.icon || 'fa-solid fa-wrench'} text-base`} />
                </div>
                <div>
                  <h3 className="font-syne font-bold text-white text-base">Book Calibration Service</h3>
                  <p className="text-xs text-[#F8C72E] font-mono">{activeBookingService.title}</p>
                </div>
              </div>
              <button
                onClick={() => setActiveBookingService(null)}
                aria-label="Close booking dialog"
                className="w-8 h-8 rounded-lg bg-white/10 text-white hover:bg-white/20 flex items-center justify-center transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleBookService} className="p-6 space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-[#211D70] mb-1.5">Lead Contact Name *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Dr. Rohan Patil"
                    value={clientName}
                    onChange={e => setClientName(e.target.value)}
                    className="w-full bg-white border border-[#D4D6E2] text-[#211D70] rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:border-[#F26522]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-[#211D70] mb-1.5">Official Email *</label>
                  <input
                    type="email"
                    required
                    value={clientEmail}
                    onChange={e => !userEmail && setClientEmail(e.target.value)}
                    disabled={!!userEmail}
                    className="w-full bg-white border border-[#D4D6E2] text-[#211D70] rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:border-[#F26522] disabled:bg-[#F4F5FA]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-[#211D70] mb-1.5">Phone Number *</label>
                  <input
                    type="tel"
                    required
                    placeholder="e.g. +91 98XXX XXXXX"
                    value={clientPhone}
                    onChange={e => setClientPhone(e.target.value)}
                    className="w-full bg-white border border-[#D4D6E2] text-[#211D70] rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:border-[#F26522]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-[#211D70] mb-1.5">Hospital / Clinic Name *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Lilavati Hospital, Bandra"
                    value={hospitalUnit}
                    onChange={e => setHospitalUnit(e.target.value)}
                    className="w-full bg-white border border-[#D4D6E2] text-[#211D70] rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:border-[#F26522]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="sm:col-span-2">
                  <label className="block text-xs font-semibold text-[#211D70] mb-1.5">Equipment Model / Type</label>
                  <input
                    type="text"
                    value={equipmentType}
                    onChange={e => setEquipmentType(e.target.value)}
                    placeholder="e.g. ICU Ventilator Circuit & Sensors"
                    className="w-full bg-white border border-[#D4D6E2] text-[#211D70] rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:border-[#F26522]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-[#211D70] mb-1.5">Scheduled Date *</label>
                  <input
                    type="date"
                    required
                    value={scheduledDate}
                    onChange={e => setScheduledDate(e.target.value)}
                    className="w-full bg-white border border-[#D4D6E2] text-[#211D70] rounded-lg px-3.5 py-2.5 text-xs focus:outline-none focus:border-[#F26522] font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#211D70] mb-1.5">Service Region</label>
                <select
                  value={requestedCity}
                  onChange={e => setRequestedCity(e.target.value)}
                  className="w-full bg-white border border-[#D4D6E2] text-[#211D70] rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:border-[#F26522]"
                >
                  <option value="Mumbai">Mumbai Metro</option>
                  <option value="Thane">Thane District</option>
                  <option value="Navi Mumbai">Navi Mumbai</option>
                  <option value="Pune">Pune Center</option>
                  <option value="Nashik">Nashik Region</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#211D70] mb-1.5">Diagnostic Symptoms / Notes</label>
                <textarea
                  placeholder="Describe error logs, alarm issues, sensor replacements, or last AMC dates..."
                  value={bookingNotes}
                  onChange={e => setBookingNotes(e.target.value)}
                  rows={2}
                  className="w-full bg-white border border-[#D4D6E2] text-[#211D70] rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:border-[#F26522]"
                />
              </div>

              <div className="flex gap-3 justify-end pt-3 border-t border-[#E6E7EE]">
                <button
                  type="button"
                  onClick={() => setActiveBookingService(null)}
                  className="px-4 py-2.5 rounded-md border border-[#D4D6E2] text-[#404041] text-xs font-semibold hover:bg-[#F4F5FA]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-6 py-2.5 rounded-md bg-[#211D70] hover:bg-black text-[#F8C72E] text-xs font-bold flex items-center justify-center gap-1.5 transition-colors"
                >
                  {isSubmitting ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                  <span>Confirm Booking</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
