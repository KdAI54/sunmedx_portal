import React, { useState, useEffect } from 'react';
import { Plus, Trash2, FileDown, Eye, Check, RefreshCw, AlertTriangle, Upload, EyeOff, CheckCircle2 } from 'lucide-react';
import { getDb } from '../services/dataClient';
import { ValidationTemplate, ValidationParameter, ValidationRecord } from '../types';
import { jsPDF } from 'jspdf';

interface ValidationSectionProps {
  userId: string;
  userEmail: string;
}

export default function ValidationSection({ userId, userEmail }: ValidationSectionProps) {
  const [templates, setTemplates] = useState<ValidationTemplate[]>([]);
  const [selectedTemplateId, setSelectedTemplateId] = useState('');
  
  // Form States
  const [deviceName, setDeviceName] = useState('');
  const [model, setModel] = useState('');
  const [serialNumber, setSerialNumber] = useState('');
  const [hospital, setHospital] = useState('');
  const [department, setDepartment] = useState('');
  const [testDate, setTestDate] = useState(new Date().toISOString().split('T')[0]);
  const [validationType, setValidationType] = useState('NABL Calibrations Check');
  const [observations, setObservations] = useState('');
  const [recommendations, setRecommendations] = useState('');
  const [recordPhoto, setRecordPhoto] = useState<string | null>(null);

  // Parameter Rows
  const [parameters, setParameters] = useState<ValidationParameter[]>([]);
  
  // History list
  const [records, setRecords] = useState<ValidationRecord[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [activeViewRecord, setActiveViewRecord] = useState<ValidationRecord | null>(null);

  useEffect(() => {
    const db = getDb();
    
    // Subscribe to templates
    const unsubTemplates = db.collection('validation_templates').onSnapshot((snap: any) => {
      const list: ValidationTemplate[] = [];
      snap.forEach((doc: any) => {
        list.push({ id: doc.id, ...doc.data() });
      });
      setTemplates(list);
    });

    // Subscribe to user validation records
    const unsubRecords = db.collection('validation_records')
      .where('userId', '==', userId)
      .onSnapshot((snap: any) => {
        const list: ValidationRecord[] = [];
        snap.forEach((doc: any) => {
          list.push({ id: doc.id, ...doc.data() });
        });
        // Sort newest first
        list.sort((a, b) => new Date(b.testDate).getTime() - new Date(a.testDate).getTime());
        setRecords(list);
      });

    return () => {
      unsubTemplates();
      unsubRecords();
    };
  }, [userId]);

  // Load Parameters when Template is selected
  const handleTemplateChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const templateId = e.target.value;
    setSelectedTemplateId(templateId);
    
    const found = templates.find(t => t.id === templateId);
    if (found) {
      setParameters(found.parameters.map(p => ({ ...p, observedValue: '', passed: true })));
    }
  };

  const handleAddParameterRow = () => {
    setParameters(prev => [...prev, {
      name: 'Custom Parameter',
      observedValue: '',
      referenceValue: 'N/A',
      unit: '',
      tolerance: '± 0%',
      passed: true
    }]);
  };

  const handleParamChange = (index: number, key: keyof ValidationParameter, value: any) => {
    setParameters(prev => {
      const copy = [...prev];
      copy[index] = { ...copy[index], [key]: value };
      return copy;
    });
  };

  const handleRemoveParameterRow = (index: number) => {
    setParameters(prev => prev.filter((_, idx) => idx !== index));
  };

  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        // base64 compress image
        setRecordPhoto(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  // Determine overall PASS/FAIL based on either explicit switch or any parameter failing
  const overallResult = parameters.length > 0 && parameters.every(p => p.passed) ? 'PASS' : 'FAIL';

  const resetForm = () => {
    setDeviceName('');
    setModel('');
    setSerialNumber('');
    setHospital('');
    setDepartment('');
    setObservations('');
    setRecommendations('');
    setParameters([]);
    setSelectedTemplateId('');
    setRecordPhoto(null);
  };

  const handleSaveRecord = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!deviceName || !model || !serialNumber || !hospital) {
      alert("Please fill in all mandatory equipment registration fields.");
      return;
    }
    if (parameters.length === 0) {
      alert("Please configure or load at least 1 testing parameter row.");
      return;
    }

    setIsLoading(true);
    try {
      const db = getDb();
      const record: Omit<ValidationRecord, 'id'> = {
        userId,
        userEmail,
        deviceName,
        model,
        serialNumber,
        hospital,
        department,
        testDate,
        validationType,
        parameters,
        overallResult,
        observations,
        recommendations,
        photoUrl: recordPhoto || '',
        createdAt: new Date().toISOString()
      };
      
      await db.collection('validation_records').add(record);
      alert("Clinical Validation report logged successfully to database!");
      resetForm();
    } catch (err: any) {
      console.error(err);
      alert("Failed to save report: " + err.message);
    } finally {
      setIsLoading(false);
    }
  };

  // PDF Download Utility using jsPDF
  const downloadPdf = (r: ValidationRecord) => {
    const doc = new jsPDF();
    
    // Stylized Medical Calibration Certificate Layout
    doc.setFillColor(26, 26, 46); // Navy header
    doc.rect(0, 0, 210, 30, 'F');
    
    // Header brand
    doc.setFont("Helvetica", "bold");
    doc.setFontSize(20);
    doc.setTextColor(255, 107, 0); // Orange
    doc.text("SUNMEDX BIOMEDICAL", 15, 20);
    
    doc.setFontSize(9);
    doc.setTextColor(255, 208, 138); // Amber
    doc.text("Calibrations, Testing & Hospital AMC Assets", 120, 15);
    doc.text("Mumbai, Maharashtra | info@sunmedx.in", 120, 22);

    // Document Title
    doc.setFontSize(14);
    doc.setTextColor(26, 26, 46);
    doc.text("BIOMEDICAL EQUIPMENT VALIDATION REPORT", 15, 45);

    // Horizontal Rule
    doc.setDrawColor(255, 107, 0);
    doc.setLineWidth(1);
    doc.line(15, 49, 195, 49);

    // Left Column Meta
    doc.setFontSize(10);
    doc.setTextColor(50, 50, 50);
    doc.text(`Equipment Name: ${r.deviceName}`, 15, 59);
    doc.text(`Model Number: ${r.model}`, 15, 66);
    doc.text(`Serial Number: ${r.serialNumber}`, 15, 73);
    doc.text(`Testing Type: ${r.validationType}`, 15, 80);

    // Right Column Meta
    doc.text(`Hospital Unit: ${r.hospital}`, 115, 59);
    doc.text(`Department: ${r.department || 'General ward'}`, 115, 66);
    doc.text(`Test Date: ${r.testDate}`, 115, 73);
    doc.text(`Generated For: ${r.userEmail}`, 115, 80);

    // Parameter Table Headers
    const tableTop = 92;
    doc.setFillColor(245, 246, 250);
    doc.rect(15, tableTop, 180, 8, 'F');
    doc.setFont("Helvetica", "bold");
    doc.setTextColor(26, 26, 46);
    doc.text("Test Parameter Detail", 18, tableTop + 5);
    doc.text("Ref Limit", 75, tableTop + 5);
    doc.text("Observed", 110, tableTop + 5);
    doc.text("Tolerance", 145, tableTop + 5);
    doc.text("Status", 180, tableTop + 5);

    // Parameter rows
    doc.setFont("Helvetica", "normal");
    doc.setTextColor(80, 80, 80);
    let currentY = tableTop + 10;
    
    r.parameters.forEach((p, idx) => {
      // Background shading on alternate rows
      if (idx % 2 === 1) {
        doc.setFillColor(250, 250, 252);
        doc.rect(15, currentY - 4, 180, 7, 'F');
      }
      
      doc.text(p.name, 18, currentY + 1);
      doc.text(`${p.referenceValue} ${p.unit}`, 75, currentY + 1);
      doc.text(`${p.observedValue || 'N/A'} ${p.unit}`, 110, currentY + 1);
      doc.text(p.tolerance, 145, currentY + 1);
      
      if (p.passed) {
        doc.setTextColor(16, 185, 129); // green
        doc.text("PASSED", 180, currentY + 1);
      } else {
        doc.setTextColor(239, 68, 68); // red
        doc.text("FAILED", 180, currentY + 1);
      }
      doc.setTextColor(80, 80, 80); // reset
      currentY += 7;
    });

    // Spacer
    currentY += 5;
    doc.setDrawColor(220, 220, 220);
    doc.line(15, currentY, 195, currentY);
    currentY += 8;

    // Result and comments
    doc.setFont("Helvetica", "bold");
    doc.setTextColor(26, 26, 46);
    doc.text("OVERALL CALIBRATION RESULT:", 15, currentY);
    
    if (r.overallResult === 'PASS') {
      doc.setFillColor(16, 185, 129);
      doc.rect(80, currentY - 5, 25, 7, 'F');
      doc.setTextColor(255, 255, 255);
      doc.text("  PASSED", 80, currentY);
    } else {
      doc.setFillColor(239, 68, 68);
      doc.rect(80, currentY - 5, 25, 7, 'F');
      doc.setTextColor(255, 255, 255);
      doc.text("  FAILED", 80, currentY);
    }

    doc.setTextColor(50, 50, 50);
    doc.setFont("Helvetica", "normal");
    currentY += 10;
    doc.text(`Observations: ${r.observations || 'Device satisfies operational limits.'}`, 15, currentY);
    currentY += 7;
    doc.text(`Recommendations: ${r.recommendations || 'Recommended for clinical use. Re-validation due in 12 months.'}`, 15, currentY);

    // QR Codes and signatures at footer
    currentY = 240;
    doc.setDrawColor(255, 107, 0);
    doc.line(15, currentY, 195, currentY);
    currentY += 10;

    doc.setFont("Helvetica", "bold");
    doc.text("Authorized Lead Inspector", 15, currentY);
    doc.setFont("Helvetica", "normal");
    doc.text("SunMedX Biomedical Mumbai", 15, currentY + 5);
    doc.text("NABL ISO-Level Calibrator Stamp", 15, currentY + 10);

    // Right-side badge
    doc.setFillColor(26, 26, 46);
    doc.rect(130, currentY - 5, 65, 18);
    doc.setTextColor(255, 208, 138);
    doc.setFontSize(9);
    doc.text("DIGITAL CERTIFIED CALIBRATION", 134, currentY);
    doc.text("Track ID: " + r.id?.substring(0, 15), 134, currentY + 5);
    doc.text("Traceability Code: SMC-MUM-92", 134, currentY + 10);

    // Output and save PDF
    doc.save(`SunMedX_Calibration_${r.deviceName.replace(/\s+/g, '_')}_${r.testDate}.pdf`);
  };

  return (
    <div className="space-y-12">
      {/* Upper Panel Card: Register New Record */}
      <div className="bg-navy rounded-2xl border border-amber/15 shadow-2xl p-6 md:p-8 animate-fadeIn">
        <div className="flex items-center gap-3 border-b border-white/5 pb-4 mb-6">
          <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-crimson to-amber flex items-center justify-center text-navy">
            <CheckCircle2 className="w-5 h-5 stroke-[2.5]" />
          </div>
          <div>
            <h2 className="font-syne font-bold text-xl text-white">NABL Calibration Record Creator</h2>
            <p className="text-xs text-amber font-mono uppercase tracking-wider">Log machine parameters and export official validation certificates</p>
          </div>
        </div>

        <form onSubmit={handleSaveRecord} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            <div>
              <label className="block text-xs font-semibold text-gray-400 font-mono tracking-wider mb-2 uppercase">Template Auto-Fill</label>
              <select
                value={selectedTemplateId}
                onChange={handleTemplateChange}
                className="w-full bg-[#10101e] border border-orange-500/20 text-white rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-amber/50"
              >
                <option value="">-- Choose Preset Template (Optional) --</option>
                {templates.map(t => (
                  <option key={t.id} value={t.id}>{t.name}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-400 font-mono tracking-wider mb-2 uppercase">Diagnostic Valve / Type</label>
              <input
                type="text"
                value={validationType}
                onChange={(e) => setValidationType(e.target.value)}
                className="w-full bg-[#10101e] border border-orange-500/20 text-white rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-amber/50"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-400 font-mono tracking-wider mb-2 uppercase">Test Date</label>
              <input
                type="date"
                value={testDate}
                onChange={(e) => setTestDate(e.target.value)}
                className="w-full bg-[#10101e] border border-orange-500/20 text-white rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-amber/50"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-5">
            <div>
              <label className="block text-xs font-semibold text-gray-400 font-mono tracking-wider mb-2 uppercase">Equipment Name *</label>
              <input
                type="text"
                placeholder="e.g. ICU Defibrillator Standard"
                value={deviceName}
                onChange={(e) => setDeviceName(e.target.value)}
                className="w-full bg-[#10101e] border border-orange-500/20 text-white rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-amber/50"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-400 font-mono tracking-wider mb-2 uppercase">Model Number *</label>
              <input
                type="text"
                placeholder="e.g. Philips HeartStart XL"
                value={model}
                onChange={(e) => setModel(e.target.value)}
                className="w-full bg-[#10101e] border border-orange-500/20 text-white rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-amber/50"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-400 font-mono tracking-wider mb-2 uppercase">Serial Number *</label>
              <input
                type="text"
                placeholder="e.g. SN-98745-PH"
                value={serialNumber}
                onChange={(e) => setSerialNumber(e.target.value)}
                className="w-full bg-[#10101e] border border-orange-500/20 text-white rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-amber/50"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-400 font-mono tracking-wider mb-2 uppercase">Hospital / Clinic *</label>
              <input
                type="text"
                placeholder="e.g. Kokilaben Hospital"
                value={hospital}
                onChange={(e) => setHospital(e.target.value)}
                className="w-full bg-[#10101e] border border-orange-500/20 text-white rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-amber/50"
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div>
              <label className="block text-xs font-semibold text-gray-400 font-mono tracking-wider mb-2 uppercase">Hospital Department</label>
              <input
                type="text"
                placeholder="e.g. Cardiology Unit"
                value={department}
                onChange={(e) => setDepartment(e.target.value)}
                className="w-full bg-[#10101e] border border-orange-500/20 text-white rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-amber/50"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-400 font-mono tracking-wider mb-2 uppercase">Device Photo Upload (Simulated base64)</label>
              <div className="flex items-center gap-3">
                <input
                  type="file"
                  accept="image/*"
                  onChange={handlePhotoUpload}
                  id="record-photo-file"
                  className="hidden"
                />
                <label
                  htmlFor="record-photo-file"
                  className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-dashed border-amber/30 text-amber text-xs font-bold hover:bg-amber/5 cursor-pointer select-none transition-all"
                >
                  <Upload className="w-4 h-4" />
                  <span>Choose Snapshot File</span>
                </label>
                {recordPhoto && (
                  <div className="flex items-center gap-2 text-xs text-emerald-400 font-mono font-bold">
                    <Check className="w-4 h-4" /> Uploaded (Base64 Safe)
                    <button type="button" onClick={() => setRecordPhoto(null)} className="text-red-400 hover:underline">Clear</button>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* PARAMETERS TABLE */}
          <div className="border border-white/5 bg-[#10101e] rounded-xl overflow-hidden p-4">
            <div className="flex items-center justify-between border-b border-white/5 pb-3 mb-4">
              <h3 className="font-syne font-bold text-sm text-amber uppercase tracking-wider">Calibration Test Parameters</h3>
              <button
                type="button"
                onClick={handleAddParameterRow}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-orange-500/10 hover:bg-orange-500/20 text-amber text-xs font-bold font-mono transition-all border border-orange-500/20"
              >
                <Plus className="w-3.5 h-3.5" /> Add Test Row
              </button>
            </div>

            {parameters.length === 0 ? (
              <div className="text-center py-6 text-gray-500 text-xs">
                🚨 No test rows configured. Select a Template block or click "Add Test Row" to build customized parameters.
              </div>
            ) : (
              <div className="space-y-3">
                <div className="hidden md:grid grid-cols-12 gap-3 pb-2 text-[10px] uppercase font-mono font-bold text-gray-500">
                  <span className="col-span-3">Parameter Description</span>
                  <span className="col-span-2">Standard / Ref Value</span>
                  <span className="col-span-2">Observed reading</span>
                  <span className="col-span-1">Unit</span>
                  <span className="col-span-2">Tolerance Limit</span>
                  <span className="col-span-1 text-center">Status</span>
                  <span className="col-span-1 text-center">Delete</span>
                </div>

                {parameters.map((p, idx) => (
                  <div key={idx} className="grid grid-cols-1 md:grid-cols-12 gap-3 items-center bg-navy p-3 rounded-lg border border-white/5 relative">
                    {/* Description */}
                    <div className="col-span-1 md:col-span-3">
                      <input
                        type="text"
                        value={p.name}
                        onChange={(e) => handleParamChange(idx, 'name', e.target.value)}
                        placeholder="Parameter Name"
                        className="w-full bg-[#10101e] border border-white/10 rounded-lg px-3 py-1.5 text-xs text-white"
                      />
                    </div>
                    {/* Ref Value */}
                    <div className="col-span-1 md:col-span-2">
                      <input
                        type="text"
                        value={p.referenceValue}
                        onChange={(e) => handleParamChange(idx, 'referenceValue', e.target.value)}
                        placeholder="Reference Value"
                        className="w-full bg-[#10101e] border border-white/10 rounded-lg px-3 py-1.5 text-xs text-white"
                      />
                    </div>
                    {/* Observed Value */}
                    <div className="col-span-1 md:col-span-2">
                      <input
                        type="text"
                        value={p.observedValue}
                        onChange={(e) => handleParamChange(idx, 'observedValue', e.target.value)}
                        placeholder="Observed Value"
                        className="w-full bg-amber/5 border border-amber/30 rounded-lg px-3 py-1.5 text-xs text-white font-bold focus:border-amber"
                        required
                      />
                    </div>
                    {/* Unit */}
                    <div className="col-span-1 md:col-span-1">
                      <input
                        type="text"
                        value={p.unit}
                        onChange={(e) => handleParamChange(idx, 'unit', e.target.value)}
                        placeholder="e.g. Joules"
                        className="w-full bg-[#10101e] border border-white/10 rounded-lg px-3 py-1.5 text-xs text-white"
                      />
                    </div>
                    {/* Tolerance */}
                    <div className="col-span-1 md:col-span-2">
                      <input
                        type="text"
                        value={p.tolerance}
                        onChange={(e) => handleParamChange(idx, 'tolerance', e.target.value)}
                        placeholder="e.g. ± 10%"
                        className="w-full bg-[#10101e] border border-white/10 rounded-lg px-3 py-1.5 text-xs text-white"
                      />
                    </div>
                    {/* passed toggle */}
                    <div className="col-span-1 md:col-span-1 flex justify-center">
                      <button
                        type="button"
                        onClick={() => handleParamChange(idx, 'passed', !p.passed)}
                        className={`w-full py-1.5 text-[10px] font-bold font-mono rounded-lg border transition-all ${
                          p.passed
                            ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
                            : 'bg-red-500/10 border-red-500/30 text-red-500'
                        }`}
                      >
                        {p.passed ? 'PASS' : 'FAIL'}
                      </button>
                    </div>
                    {/* Delete button */}
                    <div className="col-span-1 md:col-span-1 flex justify-center">
                      <button
                        type="button"
                        onClick={() => handleRemoveParameterRow(idx)}
                        className="p-1.5 text-gray-500 hover:text-red-500 transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div>
              <label className="block text-xs font-semibold text-gray-400 font-mono tracking-wider mb-2 uppercase">Lead Inspector Observations</label>
              <textarea
                rows={2}
                placeholder="Operational performance parameters meet criteria, traces aligned..."
                value={observations}
                onChange={(e) => setObservations(e.target.value)}
                className="w-full bg-[#10101e] border border-orange-500/20 text-white rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-amber/50 placeholder:text-gray-700"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-400 font-mono tracking-wider mb-2 uppercase">Official Calibration Recommendations</label>
              <textarea
                rows={2}
                placeholder="Declare device safe for hospital usage; routine testing due next year..."
                value={recommendations}
                onChange={(e) => setRecommendations(e.target.value)}
                className="w-full bg-[#10101e] border border-orange-500/20 text-white rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-amber/50 placeholder:text-gray-700"
              />
            </div>
          </div>

          {/* Action Row */}
          <div className="flex flex-col md:flex-row items-center justify-between border-t border-white/5 pt-5 gap-4">
            <div className="flex items-center gap-3">
              <span className="text-xs text-gray-400 font-mono uppercase font-bold">Overall Automated Evaluation Matrix:</span>
              <span className={`px-4 py-1.5 rounded-full text-xs font-black tracking-widest font-mono border ${
                overallResult === 'PASS'
                  ? 'bg-emerald-500/20 border-emerald-500/40 text-emerald-400 shadow-md shadow-emerald-500/5'
                  : 'bg-red-500/20 border-red-500/40 text-red-500 shadow-md shadow-red-500/5'
              }`}>
                {overallResult}ED
              </span>
            </div>

            <div className="flex gap-3 w-full md:w-auto">
              <button
                type="button"
                onClick={resetForm}
                className="flex-1 md:flex-none px-5 py-3 rounded-xl border border-white/10 text-gray-400 text-xs font-bold uppercase tracking-wider hover:bg-white/5 font-syne transition-all"
              >
                Reset Fields
              </button>
              <button
                type="submit"
                disabled={isLoading}
                className="flex-1 md:flex-none px-8 py-3 rounded-xl bg-gradient-to-r from-crimson to-amber hover:opacity-90 active:scale-95 text-navy text-xs font-bold uppercase tracking-wider font-syne shadow-lg shadow-crimson/20 flex items-center justify-center gap-2 disabled:opacity-50 transition-all"
              >
                {isLoading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4 text-navy" />}
                <span>Save Validation Log</span>
              </button>
            </div>
          </div>
        </form>
      </div>

      {/* History Archive Panel */}
      <div className="bg-navy rounded-2xl border border-white/5 shadow-2xl p-6 md:p-8 animate-fadeIn">
        <h3 className="font-syne font-bold text-lg text-white mb-2 uppercase tracking-wide">Validation Records Archive</h3>
        <p className="text-xs text-gray-400 mb-6 font-mono font-bold">View history of previously recorded tests and export authorized NABL PDFs</p>

        {records.length === 0 ? (
          <div className="text-center py-10 bg-[#10101e] rounded-xl border border-white/5 text-gray-500 text-xs">
            📢 No calibration records registered under user profile `{userEmail}` yet. Fill the creator above to launch your first ledger.
          </div>
        ) : (
          <div className="overflow-x-auto border border-white/5 bg-[#10101e] rounded-xl">
            <table className="w-full border-collapse text-left text-xs text-gray-300">
              <thead>
                <tr className="border-b border-white/5 bg-navy text-gray-400 uppercase font-mono py-4">
                  <th className="p-4 font-bold">Equipment details</th>
                  <th className="p-4 font-bold">Client / Hospital</th>
                  <th className="p-4 font-bold">Date Checked</th>
                  <th className="p-4 font-bold">Parameters Count</th>
                  <th className="p-4 font-bold text-center">Ledger status</th>
                  <th className="p-4 font-bold text-right">Certificate actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {records.map((r) => (
                  <tr key={r.id} className="hover:bg-white/2 transition-colors">
                    <td className="p-4">
                      <div className="font-syne font-bold text-white text-sm">{r.deviceName}</div>
                      <div className="text-[11px] text-amber font-mono mt-0.5">{r.model} • SN:{r.serialNumber}</div>
                    </td>
                    <td className="p-4">
                      <div className="font-semibold">{r.hospital}</div>
                      <div className="text-[11px] text-gray-500">{r.department}</div>
                    </td>
                    <td className="p-4 font-mono text-[11px] font-bold">{r.testDate}</td>
                    <td className="p-4 font-mono text-center">{r.parameters.length} factors</td>
                    <td className="p-4 text-center">
                      <span className={`inline-block px-3 py-1 rounded-full text-[10px] font-black font-mono border ${
                        r.overallResult === 'PASS'
                          ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400'
                          : 'bg-red-500/10 border-red-500/20 text-red-500'
                      }`}>
                        {r.overallResult}
                      </span>
                    </td>
                    <td className="p-4 text-right">
                      <div className="flex justify-end gap-2">
                        {/* View summary toggle */}
                        <button
                          onClick={() => {
                            if (activeViewRecord?.id === r.id) {
                              setActiveViewRecord(null);
                            } else {
                              setActiveViewRecord(r);
                            }
                          }}
                          className="px-3 py-2 rounded-lg bg-neutral-800/40 hover:bg-neutral-800 text-amber font-bold text-[10px] font-mono flex items-center gap-1 uppercase transition-colors"
                        >
                          <Eye className="w-3.5 h-3.5" />
                          <span>{activeViewRecord?.id === r.id ? 'Collapse' : 'Inspect'}</span>
                        </button>
                        
                        {/* PDF Downloader */}
                        <button
                          onClick={() => downloadPdf(r)}
                          className="px-3 py-2 rounded-lg bg-gradient-to-r from-crimson to-amber text-navy font-bold text-[10px] font-mono flex items-center gap-1 uppercase hover:opacity-90 active:scale-95 transition-all"
                        >
                          <FileDown className="w-3.5 h-3.5 text-navy stroke-[2.5]" />
                          <span>PDF</span>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Extended summary inspection card */}
        {activeViewRecord && (
          <div className="mt-6 p-6 rounded-xl border border-amber/30 bg-[#121224] animate-fadeIn space-y-4">
            <div className="flex justify-between items-center border-b border-white/5 pb-2">
              <h4 className="font-syne font-bold text-sm text-white uppercase tracking-wider">Calibration Review Pane: {activeViewRecord.deviceName}</h4>
              <button onClick={() => setActiveViewRecord(null)} className="text-gray-500 hover:text-white"><EyeOff className="w-4 h-4" /></button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-12 gap-5">
              <div className="md:col-span-8 space-y-3">
                <div className="grid grid-cols-2 gap-4 text-xs">
                  <div><span className="text-gray-500 font-mono">MODEL:</span> <span className="text-white font-bold">{activeViewRecord.model}</span></div>
                  <div><span className="text-gray-500 font-mono">SERIAL:</span> <span className="text-white font-bold">{activeViewRecord.serialNumber}</span></div>
                  <div><span className="text-gray-500 font-mono">CLIENT HOSPITAL:</span> <span className="text-white font-semibold">{activeViewRecord.hospital} ({activeViewRecord.department})</span></div>
                  <div><span className="text-gray-500 font-mono">CALIBRATION TYPE:</span> <span className="text-amber font-semibold font-mono">{activeViewRecord.validationType}</span></div>
                </div>

                <div className="bg-[#10101e] rounded-lg p-3">
                  <h5 className="text-[10px] font-bold text-amber font-mono uppercase mb-2">Observations Ledger</h5>
                  <p className="text-xs text-gray-300 italic">{activeViewRecord.observations || 'N/A'}</p>
                </div>

                <div className="bg-[#10101e] rounded-lg p-3">
                  <h5 className="text-[10px] font-bold text-amber font-mono uppercase mb-2">Lead Recommendations</h5>
                  <p className="text-xs text-gray-300 italic">{activeViewRecord.recommendations || 'N/A'}</p>
                </div>
              </div>

              <div className="md:col-span-4 flex flex-col justify-between h-full bg-[#10101e] p-4 rounded-xl border border-white/5">
                <div>
                  <h5 className="text-xs font-bold text-gray-400 font-mono uppercase tracking-wider mb-2 text-center">Safety Sticker Stamp</h5>
                  <div className="flex flex-col items-center justify-center p-3 border-2 border-dashed border-gray-800 rounded-lg bg-neutral-900/40">
                    <div className={`font-syne font-black text-xl mb-1 ${
                      activeViewRecord.overallResult === 'PASS' ? 'text-emerald-500' : 'text-red-500'
                    }`}>
                      {activeViewRecord.overallResult === 'PASS' ? 'CALIBRATED' : 'REJECTED'}
                    </div>
                    <div className="text-[10px] font-mono text-gray-600">Mumbai Calibration Lab</div>
                    <div className="text-[9px] font-mono text-amber mt-1">Traceability ID: SMC-{activeViewRecord.id?.substring(0, 8).toUpperCase()}</div>
                  </div>
                </div>
                {activeViewRecord.photoUrl && (
                  <div className="mt-3">
                    <div className="text-[9px] font-mono text-gray-600 text-center mb-1">Attached Inspection Media</div>
                    <img src={activeViewRecord.photoUrl} alt="Device Snapshot" className="max-h-[100px] mx-auto rounded object-contain border border-white/10" />
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
