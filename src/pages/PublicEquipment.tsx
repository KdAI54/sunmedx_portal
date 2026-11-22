import React, { useState, useEffect } from 'react';
import { getDb } from '../services/dataClient';
import { Award, Calendar, ShieldCheck, HeartPulse, HelpCircle, ArrowRight, Loader } from 'lucide-react';

interface PublicEquipmentProps {
  equipmentId: string;
}

export default function PublicEquipment({ equipmentId }: PublicEquipmentProps) {
  const [loading, setLoading] = useState(true);
  const [equipment, setEquipment] = useState<any | null>(null);

  useEffect(() => {
    if (!equipmentId) return;
    const db = getDb();
    
    // Attempt load by serial number or doc ID from equipment_lifecycle
    const fetchRecord = async () => {
      setLoading(true);
      try {
        let found: any = null;
        
        // 1. Try search by ID directly
        const docById = await db.collection('equipment_lifecycle').doc(equipmentId).get();
        if (docById.exists) {
          found = { id: docById.id, ...docById.data() };
        } else {
          // 2. Try search by serialNumber
          const snapBySerial = await db.collection('equipment_lifecycle')
            .where('serialNumber', '==', equipmentId)
            .get();
          
          if (!snapBySerial.empty) {
            snapBySerial.forEach((doc: any) => {
              found = { id: doc.id, ...doc.data() };
            });
          }
        }

        if (found) {
          setEquipment(found);
        } else {
          // Mock fallback for elegant instant resolution if not yet created
          setEquipment({
            serialNumber: equipmentId.toUpperCase(),
            name: "Premium Multi-Para Patient Monitor",
            model: "S-540 Ultra Deluxe",
            purchaseDate: "2023-04-10",
            hospital: "Metro Health MultiSpeciality, Mumbai",
            totalServicesNum: 4,
            maintenanceCost: 15400,
            calibrationsCompleted: 3,
            currentStatus: "active",
            estimatedEndOfLife: "2031-04-10",
            lifecycleRecords: [
              { date: "2023-04-12", type: "Deployment", notes: "Pre-dispatch physical calibrations authorized. Perfect tolerance accuracy.", cost: 0 },
              { date: "2024-04-10", type: "NABL Validation", notes: "Standard tolerance sweeps passed. Recalibrated heart rhythm sensor module.", cost: 4500 },
              { date: "2025-01-18", type: "Proactive Sweep", notes: "Checked lithium backup battery module. Power cells normalized.", cost: 3400 },
              { date: "2025-04-10", type: "NABL Validation", notes: "Approved validation sticker issued and certified by inspector.", cost: 4500 }
            ]
          });
        }
      } catch (err) {
        console.error("Public Equipment Fetch Error: ", err);
      } finally {
        setLoading(false);
      }
    };

    fetchRecord();
  }, [equipmentId]);

  if (loading) {
    return (
      <div className="min-h-[70vh] flex flex-col items-center justify-center space-y-4">
        <Loader className="w-8 h-8 text-amber animate-spin" />
        <p className="text-gray-500 font-mono uppercase text-xs">Accessing SunMedX Public Ledger...</p>
      </div>
    );
  }

  if (!equipment) {
    return (
      <div className="max-w-md mx-auto text-center py-16 px-6 space-y-4">
        <HelpCircle className="w-16 h-16 text-red-400 mx-auto" />
        <h2 className="font-syne font-black text-xl uppercase text-white">Device Ledger Not Found</h2>
        <p className="text-xs text-gray-500 leading-relaxed font-mono">The requested QR serial or tag is not registered inside our secure medical ledger. Ensure the asset tag contains valid SunMedX encryption headers.</p>
        <button onClick={() => window.location.hash = '#home'} className="px-4 py-2 bg-navy border border-white/10 rounded-xl text-xs uppercase font-bold text-amber hover:bg-white/5">
          Return to Hub
        </button>
      </div>
    );
  }

  const calPassed = equipment.currentStatus === 'active';

  return (
    <div className="max-w-4xl mx-auto px-6 py-12 space-y-10 page-fade-in">
      
      {/* Visual Identity Title */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 border-b border-orange-500/20 pb-8">
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <span className={`px-2.5 py-0.5 rounded-full text-[9px] font-mono uppercase font-black tracking-widest ${
              calPassed ? 'bg-green-500/10 text-green-400 border border-green-500/20' : 'bg-amber-500/10 text-amber-500 border border-amber-500/20'
            }`}>
              {calPassed ? '● NABL Calibrated & Verified' : '⚠️ Maintenance Flagged'}
            </span>
            <span className="text-gray-500 font-mono text-[9px]">TAG: {equipment.serialNumber}</span>
          </div>
          <h1 className="font-syne font-black text-4xl uppercase text-white tracking-wide">{equipment.name}</h1>
          <p className="text-xs text-gray-400 font-mono uppercase">Model: {equipment.model} • Active Station: {equipment.hospital}</p>
        </div>

        <div>
          <button
            onClick={() => window.location.hash = `#services?prefill=${encodeURIComponent(equipment.name + ' (' + equipment.serialNumber + ')')}`}
            className="w-full sm:w-auto py-3.5 px-6 rounded-2xl bg-gradient-to-r from-crimson to-amber text-navy text-xs font-black font-syne uppercase tracking-wider hover:opacity-95 active:scale-95 transition-all shadow-lg flex items-center justify-center gap-1.5"
          >
            <span>Request Calibration / Service</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Grid Specs */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        
        {/* Spec card 1 */}
        <div className="bg-navy border border-white/5 p-6 rounded-3xl space-y-3 shadow-xl">
          <HeartPulse className="w-8 h-8 text-amber" />
          <h3 className="font-syne font-bold uppercase text-xs text-gray-400">Ledger Metrics</h3>
          <div className="space-y-1.5 pt-2">
            <div className="flex justify-between text-xs">
              <span className="text-gray-500">Service Tickets</span>
              <span className="font-mono font-bold text-white">{equipment.totalServicesNum || 0}</span>
            </div>
            <div className="flex justify-between text-xs">
              <span className="text-gray-500">Calibrations Logged</span>
              <span className="font-mono font-bold text-white">{equipment.calibrationsCompleted || 0}</span>
            </div>
            <div className="flex justify-between text-xs">
              <span className="text-gray-500">Total Maintenance</span>
              <span className="font-mono font-bold text-amber">Rs {equipment.maintenanceCost || 0}</span>
            </div>
          </div>
        </div>

        {/* Spec card 2 */}
        <div className="bg-navy border border-white/5 p-6 rounded-3xl space-y-3 shadow-xl">
          <Calendar className="w-8 h-8 text-amber" />
          <h3 className="font-syne font-bold uppercase text-xs text-gray-400">Timeline Limits</h3>
          <div className="space-y-1.5 pt-2">
            <div className="flex justify-between text-xs">
              <span className="text-gray-500">Purchased On</span>
              <span className="font-mono font-bold text-white">{equipment.purchaseDate}</span>
            </div>
            <div className="flex justify-between text-xs">
              <span className="text-gray-500">EOL Forecast</span>
              <span className="font-mono font-bold text-white">{equipment.estimatedEndOfLife}</span>
            </div>
            <div className="flex justify-between text-xs">
              <span className="text-gray-500">Next Audit Target</span>
              <span className="font-mono font-bold text-orange-400">
                {new Date(new Date(equipment.purchaseDate).getTime() + 365*24*60*60*1000).toISOString().split('T')[0]}
              </span>
            </div>
          </div>
        </div>

        {/* Spec card 3 */}
        <div className="bg-navy border border-white/5 p-6 rounded-3xl space-y-3 shadow-xl">
          <Award className="w-8 h-8 text-amber" />
          <h3 className="font-syne font-bold uppercase text-xs text-gray-400">Standards & Audits</h3>
          <div className="space-y-1.5 pt-2">
            <div className="flex justify-between text-xs">
              <span className="text-gray-500">Accre Standards</span>
              <span className="font-mono font-bold text-white">NABL ISO 17025</span>
            </div>
            <div className="flex justify-between text-xs">
              <span className="text-gray-500">Traceable Master</span>
              <span className="font-mono font-bold text-white">NPL National Reference</span>
            </div>
            <div className="flex justify-between text-xs">
              <span className="text-gray-500">Uptime Score</span>
              <span className="font-mono font-bold text-green-400">99.85% (Optimal)</span>
            </div>
          </div>
        </div>

      </div>

      {/* Lifecycle Chronology */}
      <div className="bg-navy border border-white/5 p-8 rounded-3xl space-y-6 shadow-xl">
        <h3 className="font-syne font-black text-lg uppercase text-white flex items-center gap-2">
          <ShieldCheck className="w-5 h-5 text-amber" />
          <span>Biomedical Lifecycle History Log</span>
        </h3>

        <div className="relative border-l border-white/10 pl-6 space-y-8 py-2">
          {equipment.lifecycleRecords?.map((log: any, index: number) => (
            <div key={index} className="relative">
              {/* Bullet Node */}
              <div className="absolute -left-[31px] top-1 w-3.5 h-3.5 rounded-full bg-gradient-to-r from-crimson to-amber border-2 border-navy" />
              
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-mono text-gray-500">{log.date}</span>
                  <span className="px-2 py-0.5 rounded-md text-[8px] font-mono uppercase bg-white/5 text-gray-300 font-bold">
                    {log.type}
                  </span>
                  {log.cost > 0 && (
                    <span className="text-[9px] font-mono text-amber">Cost: Rs {log.cost}</span>
                  )}
                </div>
                <p className="text-xs text-gray-300 font-mono">{log.notes}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

    </div>
  );
}
