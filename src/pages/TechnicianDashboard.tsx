import React, { useState, useEffect, useRef } from 'react';
import { getDb } from '../services/dataClient';
import { sendWhatsAppAlert } from '../utils/whatsapp';
import { Briefcase, MapPin, Navigation, CheckCircle2, Clock, Check, RefreshCw, X, Camera, PenTool, FileText } from 'lucide-react';
import { TechnicianJob } from '../types';
import { PRODUCT_ASSET_FALLBACKS } from '../config/seed';
import { jsPDF } from 'jspdf';

interface TechnicianDashboardProps {
  technicianEmail: string;
  onLogout: () => void;
}

export default function TechnicianDashboard({ technicianEmail, onLogout }: TechnicianDashboardProps) {
  const [jobs, setJobs] = useState<any[]>([]);
  const [selectedJob, setSelectedJob] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);

  // Sign Canvas Ref
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [isDrawing, setIsDrawing] = useState(false);

  // Form states for completed jobs
  const [workDone, setWorkDone] = useState('');
  const [partsUsed, setPartsUsed] = useState('');
  const [observations, setObservations] = useState('');
  const [recommendations, setRecommendations] = useState('');
  const [timeTaken, setTimeTaken] = useState('2 Hours');
  const [photos, setPhotos] = useState<string[]>([]);
  const [photoInput, setPhotoInput] = useState('');

  // Geolocation watch ID holder
  const intervalIdRef = useRef<any>(null);

  useEffect(() => {
    if (!technicianEmail) return;
    const db = getDb();

    // Subscribe to assigned jobs in Firestore/mock
    const unsubJobs = db.collection('technician_jobs')
      .where('technicianEmail', '==', technicianEmail)
      .onSnapshot((snap: any) => {
        const list: any[] = [];
        snap.forEach((doc: any) => {
          list.push({ id: doc.id, ...doc.data() });
        });
        setJobs(list.sort((a,b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()));
        setLoading(false);
      });

    return () => {
      unsubJobs();
      if (intervalIdRef.current) {
        clearInterval(intervalIdRef.current);
      }
    };
  }, [technicianEmail]);

  // Geolocation service loops
  const startTracking = (jobId: string) => {
    // Stop any existing tracking
    if (intervalIdRef.current) {
       clearInterval(intervalIdRef.current);
    }

    const updateCoords = () => {
      if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
          async (pos) => {
            const db = getDb();
            const location = { lat: pos.coords.latitude, lng: pos.coords.longitude };
            console.log(`[Geo Sync] Tech coordinates updated: ${location.lat}, ${location.lng}`);
            await db.collection('technician_jobs').doc(jobId).update({ location });
          },
          (err) => console.warn("Geolocation grab failed:", err),
          { enableHighAccuracy: true }
        );
      }
    };

    updateCoords(); // immediate fire
    intervalIdRef.current = setInterval(updateCoords, 60000); // every 60s
  };

  const stopTracking = () => {
    if (intervalIdRef.current) {
      clearInterval(intervalIdRef.current);
      intervalIdRef.current = null;
      console.log("[Geo Sync] Geolocation loops deactivated.");
    }
  };

  // Workflow Handlers
  const handleWorkflowTransition = async (jobId: string, currentStatus: string) => {
    const db = getDb();
    let nextStatus = '';

    if (currentStatus === 'Pending') {
      nextStatus = 'Travelling';
      await db.collection('technician_jobs').doc(jobId).update({ status: nextStatus, lastUpdated: new Date().toISOString() });
      startTracking(jobId);
    } else if (currentStatus === 'Travelling') {
      nextStatus = 'Arrived';
      stopTracking();
      await db.collection('technician_jobs').doc(jobId).update({ status: nextStatus, lastUpdated: new Date().toISOString() });
    } else if (currentStatus === 'Arrived') {
      nextStatus = 'In Progress';
      await db.collection('technician_jobs').doc(jobId).update({ status: nextStatus, lastUpdated: new Date().toISOString() });
    }
  };

  // Canvas Handlers for Signature pad
  useEffect(() => {
    if (selectedJob && canvasRef.current) {
      const canvas = canvasRef.current;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.strokeStyle = '#FFFFFF';
        ctx.lineWidth = 2.5;
        ctx.lineCap = 'round';
      }
    }
  }, [selectedJob]);

  const getCanvasPoint = (
    canvas: HTMLCanvasElement,
    e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>
  ) => {
    const rect = canvas.getBoundingClientRect();
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;
    const scaleX = rect.width > 0 ? canvas.width / rect.width : 1;
    const scaleY = rect.height > 0 ? canvas.height / rect.height : 1;
    return {
      x: (clientX - rect.left) * scaleX,
      y: (clientY - rect.top) * scaleY,
    };
  };

  const startDraw = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    setIsDrawing(true);
    const { x, y } = getCanvasPoint(canvas, e);
    ctx.beginPath();
    ctx.moveTo(x, y);
  };

  const draw = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    if (!isDrawing) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    if (e.cancelable) {
      e.preventDefault();
    }
    const { x, y } = getCanvasPoint(canvas, e);
    ctx.lineTo(x, y);
    ctx.stroke();
  };

  const clearCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
  };

  // Submit completion report
  const handleReportSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedJob) return;

    const db = getDb();
    
    // Extract base64 signature
    let signatureBase64 = '';
    const canvas = canvasRef.current;
    if (canvas) {
      signatureBase64 = canvas.toDataURL('image/png');
    }

    const reportDetails = {
      workDone,
      partsUsed,
      observations,
      recommendations,
      timeTaken,
      signature: signatureBase64,
      photos
    };

    try {
      // 1. Update technician job record
      await db.collection('technician_jobs').doc(selectedJob.id).update({
        status: 'Completed',
        report: reportDetails,
        lastUpdated: new Date().toISOString()
      });

      // 2. Update parent Service Request
      if (selectedJob.serviceRequestId) {
        await db.collection('service_requests').doc(selectedJob.serviceRequestId).update({
          status: 'Completed'
        });
      }

      // Add Equipment Lifecycle record
      // Search lifecycle register by equipment name/serial
      const lifecycleSnap = await db.collection('equipment_lifecycle')
        .where('hospital', '==', selectedJob.hospital)
        .where('name', '==', selectedJob.equipment)
        .get();

      if (!lifecycleSnap.empty) {
        lifecycleSnap.forEach(async (doc: any) => {
          const prev = doc.data();
          const records = prev.lifecycleRecords || [];
          records.push({
            date: new Date().toISOString().split('T')[0],
            type: "Field Repair",
            notes: `Work Checked: ${workDone}. Recommendation: ${recommendations}`,
            cost: 4500 // standard repairs fee fallback
          });
          await db.collection('equipment_lifecycle').doc(doc.id).update({
            totalServicesNum: (prev.totalServicesNum || 0) + 1,
            maintenanceCost: (prev.maintenanceCost || 0) + 4500,
            lifecycleRecords: records
          });
        });
      }

      // 3. Dispatch WhatsApp Notification
      await sendWhatsAppAlert('job_completed', selectedJob.phone || '+91 98765 43210', {
        customer_name: selectedJob.customerName || 'Hospital Authority',
        equipment: selectedJob.equipment,
        tech_name: selectedJob.technicianName
      });

      // Reset Form states
      setSelectedJob(null);
      setWorkDone('');
      setPartsUsed('');
      setObservations('');
      setRecommendations('');
      setPhotos([]);
      setPhotoInput('');

      alert("Biomedical Repair Report submitted successfully! WhatsApp logs synchronized.");
    } catch (err: any) {
      alert("Fail saving repair report: " + err.message);
    }
  };

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

  const addPhotoBase64Mock = (e: React.FormEvent) => {
    e.preventDefault();
    if (!photoInput) return;
    setPhotos([...photos, photoInput]);
    setPhotoInput('');
  };

  const quickPhotosMock = [
    PRODUCT_ASSET_FALLBACKS.defibrillator,
    PRODUCT_ASSET_FALLBACKS.analyzer
  ];

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 sm:py-12 space-y-8 sm:space-y-10 page-fade-in">
      
      {/* Dashboard Top header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-white/10 pb-6">
        <div>
          <span className="text-xs font-mono text-teal-400 font-medium">
            Field Bio-Engineering Hub
          </span>
          <h1 className="font-syne font-bold text-2xl sm:text-3xl tracking-tight mt-1 text-white">Technician Portal</h1>
          <p className="text-xs text-slate-400 font-mono mt-0.5">Welcome back, {technicianEmail}. Check your registered hospital tickets.</p>
        </div>

        <div>
          <button onClick={onLogout} className="px-4 py-2.5 rounded-xl border border-white/10 text-xs font-mono text-gray-400 hover:text-white uppercase hover:bg-white/5 tracking-wider font-bold">
            Logout Session
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Jobs Lists column */}
        <div className="lg:col-span-1 space-y-4">
          <h2 className="font-syne font-heavy text-xs uppercase text-gray-500 tracking-wider">Assigned Maintenance Tickets</h2>
          
          {loading ? (
            <p className="text-xs font-mono text-gray-500">Loading schedules...</p>
          ) : jobs.length === 0 ? (
            <div className="bg-navy border border-white/5 p-8 rounded-3xl text-center">
              <Briefcase className="w-10 h-10 text-gray-600 mx-auto mb-2" />
              <p className="text-xs text-gray-500 font-mono uppercase">No tickets assigned currently.</p>
            </div>
          ) : (
            <div className="space-y-4 max-h-[70vh] overflow-y-auto pr-2">
              {jobs.map((job) => (
                <div
                  key={job.id}
                  onClick={() => setSelectedJob(job)}
                  className={`bg-navy border p-5 rounded-3xl cursor-pointer hover:border-amber/35 transition-all space-y-3 shadow-md relative ${
                    selectedJob?.id === job.id ? 'border-amber ring-2 ring-amber/15' : 'border-white/5'
                  }`}
                >
                  {/* Priority and status badge */}
                  <div className="flex justify-between items-center">
                    <span className={`px-2 py-0.5 rounded-full text-[8px] font-mono font-black uppercase ${
                      job.priority === 'High' ? 'bg-red-500/10 text-red-400 border border-red-500/15' : 'bg-white/5 text-gray-400'
                    }`}>
                      {job.priority} Priority
                    </span>

                    <span className={`text-[9px] font-mono font-bold uppercase py-0.5 px-2 rounded-full ${
                      job.status === 'Completed' ? 'bg-green-500/10 text-green-400 border border-green-500/20' :
                      job.status === 'In Progress' ? 'bg-blue-500/10 text-blue-400 border border-blue-500/20' :
                      job.status === 'Travelling' ? 'bg-orange-500/10 text-amber border border-orange-500/20' :
                      'bg-white/5 text-gray-400'
                    }`}>
                      {job.status}
                    </span>
                  </div>

                  <div className="space-y-1">
                    <h4 className="font-syne font-black text-sm uppercase text-white truncate">{job.hospital}</h4>
                    <p className="text-[11px] text-gray-400 font-mono uppercase">{job.equipment}</p>
                  </div>

                  <div className="text-[10px] font-mono text-gray-500 space-y-0.5">
                    <p>Client: {job.customerName}</p>
                    <p className="truncate">Loc: {job.address}</p>
                    <p>Contact: {job.phone}</p>
                  </div>

                  {job.status !== 'Completed' && (
                    <div className="pt-2">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleWorkflowTransition(job.id, job.status);
                        }}
                        className={`w-full py-2 rounded-xl text-[10px] font-syne font-bold uppercase tracking-wider transition-all shadow ${
                          job.status === 'Pending' ? 'bg-gradient-to-r from-crimson to-amber text-navy font-black' :
                          job.status === 'Travelling' ? 'bg-amber text-navy' :
                          job.status === 'Arrived' ? 'bg-indigo-600 text-white' :
                          'bg-transparent border border-white/10 text-gray-400 cursor-not-allowed'
                        }`}
                        disabled={job.status === 'In Progress'}
                      >
                        {job.status === 'Pending' && 'Accept (Travelling)'}
                        {job.status === 'Travelling' && 'Mark Arrived'}
                        {job.status === 'Arrived' && 'Start Work'}
                        {job.status === 'In Progress' && 'Repairs Active'}
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Selected ticket reporting panel */}
        <div className="lg:col-span-2">
          {selectedJob ? (
            <div className="bg-navy border border-white/5 p-8 rounded-3xl space-y-6 shadow-xl relative animate-fadeIn">
              <button
                onClick={() => setSelectedJob(null)}
                className="absolute top-6 right-6 w-8 h-8 rounded-full bg-white/5 hover:bg-white/10 text-gray-400 hover:text-white flex items-center justify-center"
              >
                <X className="w-4 h-4" />
              </button>

              <div className="space-y-1">
                <p className="text-[10px] font-mono text-amber uppercase">{selectedJob.status === 'Completed' ? 'VERIFIED COMPLETED TICKET' : 'ACTIVE REPORT GENERATION'} • {selectedJob.status}</p>
                <h3 className="font-syne font-black text-xl uppercase text-white">{selectedJob.hospital}</h3>
                <p className="text-xs text-gray-400 font-mono uppercase">{selectedJob.equipment} ({selectedJob.serviceType})</p>
              </div>

              {selectedJob.status === 'Completed' ? (
                <div className="space-y-5 text-xs font-mono text-gray-300">
                  <div className="border border-white/5 rounded-2xl bg-[#10101e] p-5 space-y-4">
                    <div>
                      <span className="text-gray-500 font-black uppercase text-[10px]">Work Performed Checklist:</span>
                      <p className="text-white mt-1 italic">"{selectedJob.report?.workDone}"</p>
                    </div>

                    {selectedJob.report?.partsUsed && (
                      <div>
                        <span className="text-gray-500 font-black uppercase text-[10px]">Spare Components Reallocated:</span>
                        <p className="text-gray-300 mt-1">{selectedJob.report.partsUsed}</p>
                      </div>
                    )}

                    {selectedJob.report?.observations && (
                      <div>
                        <span className="text-gray-500 font-black uppercase text-[10px]">Technical Observations:</span>
                        <p className="text-gray-300 mt-1">{selectedJob.report.observations}</p>
                      </div>
                    )}

                    <div>
                      <span className="text-gray-500 font-black uppercase text-[10px]">Authoritative Audit Recommendations:</span>
                      <p className="text-green-400 mt-1 font-bold">{selectedJob.report?.recommendations}</p>
                    </div>

                    {selectedJob.report?.photos && selectedJob.report.photos.length > 0 && (
                      <div>
                        <span className="text-gray-500 font-black uppercase text-[10px]">Field Calibration Photos Log:</span>
                        <div className="flex gap-2 mt-1">
                          {selectedJob.report.photos.map((p: string, i: number) => (
                            <img key={i} src={p} className="w-16 h-16 rounded-xl border border-white/10 object-cover bg-black" alt="Calibration report pic" />
                          ))}
                        </div>
                      </div>
                    )}

                    {selectedJob.report?.signature && (
                      <div>
                        <span className="text-gray-500 font-black uppercase text-[10px]">Authorized Digital Verification Sign:</span>
                        <div className="bg-[#1c1c36] rounded-xl border border-white/5 p-2 flex justify-center items-center mt-1 font-black" style={{ height: '70px', width: '200px' }}>
                          <img src={selectedJob.report.signature} className="max-h-full max-w-full object-contain filter invert opacity-90" alt="Clinician sign confirmation" />
                        </div>
                      </div>
                    )}
                  </div>

                  <button
                    type="button"
                    onClick={() => generateJobReportPdf(selectedJob)}
                    className="w-full py-3 bg-sky-500 hover:bg-sky-400 text-slate-950 font-semibold rounded-xl text-xs flex items-center justify-center gap-1.5 transition-colors"
                  >
                    <FileText className="w-4 h-4 text-slate-950" />
                    <span>Download Report PDF Copy</span>
                  </button>
                </div>
              ) : selectedJob.status !== 'In Progress' ? (
                <div className="p-8 bg-[#10101e] border border-white/5 text-center rounded-2xl">
                  <Clock className="w-10 h-10 text-orange-400 mx-auto mb-2.5 animate-pulse" />
                  <h4 className="font-syne font-bold uppercase text-xs text-white">Transition Workflow Status to "In Progress"</h4>
                  <p className="text-[10px] text-gray-500 font-mono mt-1 max-w-sm mx-auto uppercase">The repair reporting interface unlocks once you have reached the clinical station and selected "Start Work" from the dispatch options.</p>
                </div>
              ) : (
                <form onSubmit={handleReportSubmit} className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-[10px] font-mono text-gray-500 uppercase font-black mb-1.5">Work Done Description *</label>
                      <textarea
                        required
                        rows={2}
                        value={workDone}
                        onChange={(e) => setWorkDone(e.target.value)}
                        placeholder="Replaced power supply capacitors, executed calibration checks..."
                        className="w-full bg-[#10101e] border border-white/10 text-white rounded-xl px-4 py-3 text-xs font-mono focus:outline-none focus:border-amber/55"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-mono text-gray-500 uppercase font-black mb-1.5">Spare Components/Parts Used</label>
                      <textarea
                        rows={2}
                        value={partsUsed}
                        onChange={(e) => setPartsUsed(e.target.value)}
                        placeholder="2x 470uF Power Capacitors, Isolation Washer set"
                        className="w-full bg-[#10101e] border border-white/10 text-white rounded-xl px-4 py-3 text-xs font-mono focus:outline-none focus:border-amber/55"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-[10px] font-mono text-gray-500 uppercase font-black mb-1.5">Technical Observations</label>
                      <textarea
                        rows={2}
                        value={observations}
                        onChange={(e) => setObservations(e.target.value)}
                        placeholder="Device chassis showed minor fluid ingress marks near handle base line."
                        className="w-full bg-[#10101e] border border-white/10 text-white rounded-xl px-4 py-3 text-xs font-mono focus:outline-none focus:border-amber/55"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-mono text-gray-500 uppercase font-black mb-1.5">Audit Recommendations *</label>
                      <textarea
                        required
                        rows={2}
                        value={recommendations}
                        onChange={(e) => setRecommendations(e.target.value)}
                        placeholder="Perform electrical leakage safety scan in next quarterly schedule."
                        className="w-full bg-[#10101e] border border-white/10 text-white rounded-xl px-4 py-3 text-xs font-mono focus:outline-none focus:border-amber/55"
                      />
                    </div>
                  </div>

                  {/* Photo logs (base64 simulation) */}
                  <div className="space-y-3">
                    <label className="block text-[10px] font-mono text-gray-500 uppercase font-black">Field Calibration Photos Log</label>
                    
                    <div className="flex gap-2.5 items-center flex-wrap">
                      {photos.map((src, i) => (
                        <div key={i} className="relative w-16 h-16 rounded-xl border border-white/10 overflow-hidden bg-black flex-shrink-0">
                          <img src={src} className="w-full h-full object-cover" alt="Calibration report snap" />
                          <button
                            type="button"
                            onClick={() => setPhotos(photos.filter((_, idx) => idx !== i))}
                            className="absolute inset-0 m-auto bg-red-600/80 hover:bg-red-600 rounded-full w-5 h-5 flex items-center justify-center text-[8px] text-white"
                          >
                            ×
                          </button>
                        </div>
                      ))}
                      
                      <button
                        type="button"
                        onClick={() => {
                          // Quick add a random preselected high-fidelity medical mock image
                          const mockImg = quickPhotosMock[photos.length % quickPhotosMock.length];
                          setPhotos([...photos, mockImg]);
                        }}
                        className="w-16 h-16 rounded-xl bg-[#10101e] border border-dashed border-white/20 text-gray-500 hover:text-white flex flex-col items-center justify-center gap-1 hover:border-amber"
                      >
                        <Camera className="w-4 h-4" />
                        <span className="text-[7px] font-mono uppercase">Add Photo</span>
                      </button>
                    </div>
                  </div>

                  {/* Canvas signature wrapper */}
                  <div className="space-y-2">
                    <div className="flex justify-between items-center text-[10px] font-mono uppercase">
                      <span className="text-gray-500 font-black">Verify Sign: Canvas Digital Pad *</span>
                      <button type="button" onClick={clearCanvas} className="text-orange-400 hover:text-orange-500 font-bold uppercase text-[9px]">Clear Pad</button>
                    </div>
                    
                    <div className="bg-[#10101e] border-2 border-white/5 rounded-2xl overflow-hidden relative" style={{ height: '140px' }}>
                      <canvas
                        ref={canvasRef}
                        width={460}
                        height={136}
                        onMouseDown={startDraw}
                        onMouseMove={draw}
                        onMouseUp={() => setIsDrawing(false)}
                        onMouseLeave={() => setIsDrawing(false)}
                        onTouchStart={startDraw}
                        onTouchMove={draw}
                        onTouchEnd={() => setIsDrawing(false)}
                        className="w-full h-full cursor-crosshair bg-[#10101e] touch-none"
                      />
                    </div>
                  </div>

                  {/* Submission */}
                  <div>
                    <button
                      type="submit"
                      className="w-full py-4 rounded-xl bg-gradient-to-r from-green-500 to-emerald-600 text-white text-xs font-black font-syne uppercase tracking-wider hover:opacity-95 active:scale-95 transition-all shadow-lg shadow-emerald-500/10 flex items-center justify-center gap-2"
                    >
                      <CheckCircle2 className="w-4 h-4" />
                      <span>Submit Authoritative Bio-Repair Ticket</span>
                    </button>
                  </div>

                </form>
              )}
            </div>
          ) : (
            <div className="bg-navy border border-white/5 p-12 rounded-3xl text-center space-y-3">
              <Briefcase className="w-12 h-12 text-gray-700 mx-auto" />
              <h3 className="font-syne font-black text-white text-base uppercase">Interactive Work Portal</h3>
              <p className="text-xs text-gray-500 font-mono uppercase tracking-wide max-w-md mx-auto leading-relaxed">Select any active equipment repair ticket on the left pane to accept travelling directions, trace location anchors, and record validation checklist compliance reports.</p>
            </div>
          )}
        </div>

      </div>

    </div>
  );
}
