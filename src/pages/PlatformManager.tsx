import React, { useState, useEffect } from 'react';
import { getDb } from '../services/dataClient';
import { Layers, Briefcase, PlusCircle, CreditCard, ChevronRight, CheckCircle2, ShieldCheck, PieChart, Sparkles, Database, X } from 'lucide-react';
import { ClientSite } from '../types';

interface PlatformManagerProps {
  onLogout: () => void;
}

export default function PlatformManager({ onLogout }: PlatformManagerProps) {
  const [sites, setSites] = useState<ClientSite[]>([]);
  const [loading, setLoading] = useState(true);
  const [step, setStep] = useState(1);
  const [notification, setNotification] = useState<{ message: string; type: 'success' | 'info' | 'error' } | null>(null);

  // Auto-dismiss notifications
  useEffect(() => {
    if (notification) {
      const timer = setTimeout(() => setNotification(null), 5000);
      return () => clearTimeout(timer);
    }
  }, [notification]);

  // Form Wizard states
  const [clientName, setClientName] = useState('');
  const [contactEmail, setContactEmail] = useState('');
  const [contactPhone, setContactPhone] = useState('');
  const [city, setCity] = useState('Mumbai');

  const [domain, setDomain] = useState('');
  const [dbId, setDbId] = useState('');
  const [dbRegion, setDbRegion] = useState('asia-south1');

  const [monthlyRetainer, setMonthlyRetainer] = useState(15000);
  const [setupFee, setSetupFee] = useState(45000);
  const [planType, setPlanType] = useState<'Basic' | 'Professional' | 'Enterprise'>('Professional');

  const [niche, setNiche] = useState<'Biomedical' | 'Dental' | 'Pharma' | 'Lab' | 'Fitness' | 'Optical'>('Biomedical');
  const [modules, setModules] = useState({
    billing: true,
    academy: true,
    translation: true,
    liveMap: true,
    whatsappAlerts: true
  });

  const [showWizard, setShowWizard] = useState(false);

  useEffect(() => {
    const db = getDb();
    const unsubSites = db.collection('platform_clients').onSnapshot((snap: any) => {
      const list: ClientSite[] = [];
      snap.forEach((doc: any) => {
        list.push({ id: doc.id, ...doc.data() });
      });

      if (list.length === 0) {
        // Mock seed if empty inside the client ledger
        const defaults: ClientSite[] = [
          {
            id: 'site-dental-01',
            name: "ToothCure Dental Group",
            niche: "Dental",
            domain: "toothcure.denta-shield.in",
            databaseId: "toothcure-db99a",
            deploymentDate: "2026-01-10",
            planType: "Professional",
            monthlyFee: 15000,
            status: "Active",
            billingSetupFee: 45000,
            billingRetainer: 15000,
            paymentHistory: [
              { date: "2026-03-01", amount: 15000, status: "Paid" },
              { date: "2026-02-01", amount: 15000, status: "Paid" }
            ],
            nextInvoiceDue: "2026-04-01",
            totalRevenue: 75000
          },
          {
            id: 'site-pharma-02',
            name: "PharmaCold Logistics Services",
            niche: "Pharma",
            domain: "coldtrack.pharma-cold.in",
            databaseId: "pharma-cold-4a2",
            deploymentDate: "2026-02-15",
            planType: "Enterprise",
            monthlyFee: 35000,
            status: "Active",
            billingSetupFee: 85000,
            billingRetainer: 35000,
            paymentHistory: [
              { date: "2026-03-01", amount: 35000, status: "Paid" }
            ],
            nextInvoiceDue: "2026-04-01",
            totalRevenue: 120000
          }
        ];
        defaults.forEach(async (d: any) => {
          await db.collection('platform_clients').doc(d.id).set(d);
        });
        setSites(defaults);
      } else {
        setSites(list);
      }
      setLoading(false);
    });

    return () => unsubSites();
  }, []);

  // Compute Platform Retainer metrics
  const totalMRR = sites.reduce((sum, item) => sum + (item.status === 'Active' ? item.monthlyFee : 0), 0);
  const aggregateRevenue = sites.reduce((sum, item) => sum + (item.totalRevenue || 0), 0);
  const activeCount = sites.filter(s => s.status === 'Active').length;

  const handleStepNext = () => {
    setStep(step + 1);
  };
  const handleStepBack = () => {
    setStep(step - 1);
  };

  const handleCreateClient = async () => {
    const db = getDb();
    
    const clientRecord: ClientSite = {
      name: clientName,
      niche,
      domain: domain || `${clientName.toLowerCase().replace(/\s+/g, '-')}.sunmedx.in`,
      databaseId: dbId || `db-${clientName.toLowerCase().replace(/\s+/g, '-')}`,
      deploymentDate: new Date().toISOString().split('T')[0],
      planType,
      monthlyFee: monthlyRetainer,
      status: 'Active',
      billingSetupFee: setupFee,
      billingRetainer: monthlyRetainer,
      paymentHistory: [
        { date: new Date().toISOString().split('T')[0], amount: setupFee, status: 'Paid' }
      ],
      nextInvoiceDue: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      totalRevenue: setupFee
    };

    try {
      await db.collection('platform_clients').add(clientRecord);
      
      // Auto success log
      await db.collection('changelogs').add({
        action: "WHITE LABEL CREATE",
        adminEmail: "superadmin@sunmedx.in",
        details: `Bootstrapped white label tenant site: ${clientName} (${niche})`,
        timestamp: new Date().toISOString()
      });

      // Clear wizard form state
      setShowWizard(false);
      setStep(1);
      setClientName('');
      setContactEmail('');
      setContactPhone('');
      setDomain('');
      setDbId('');
      setNotification({
        message: `Client site "${clientName}" successfully provisioned with ${niche} template schema!`,
        type: 'success'
      });
    } catch (err: any) {
      setNotification({
        message: "Failed creating client site: " + err.message,
        type: 'error'
      });
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-6 py-12 space-y-10 page-fade-in relative">
      
      {/* Toast Notification Banner */}
      {notification && (
        <div className={`fixed top-6 right-6 z-[9999] max-w-md p-4 rounded-2xl border backdrop-blur-lg shadow-2xl transition-all duration-300 animate-fadeIn flex items-start gap-3 ${
          notification.type === 'success' 
            ? 'bg-emerald-500/15 border-emerald-500/35 text-emerald-300' 
            : notification.type === 'error'
            ? 'bg-rose-500/15 border-rose-500/35 text-rose-300'
            : 'bg-amber-500/15 border-amber-500/35 text-amber-300'
        }`}>
          <div className="mt-0.5">
            {notification.type === 'success' ? (
              <CheckCircle2 className="w-5 h-5 text-emerald-400" />
            ) : notification.type === 'error' ? (
              <X className="w-5 h-5 text-rose-400" />
            ) : (
              <Sparkles className="w-5 h-5 text-amber-400" />
            )}
          </div>
          <div className="flex-1">
            <h4 className="font-syne font-black text-xs uppercase tracking-wider">System Broadcast</h4>
            <p className="text-xs font-mono mt-1 opacity-90">{notification.message}</p>
          </div>
          <button onClick={() => setNotification(null)} className="opacity-60 hover:opacity-100 transition-opacity">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Top Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 border-b border-white/5 pb-8">
        <div>
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-mono uppercase bg-amber-500/10 text-amber border border-amber/20 tracking-widest font-black mb-3">
            <ShieldCheck className="w-3.5 h-3.5" />
            Platform Master Central (SaaS SuperAdmin)
          </span>
          <h1 className="font-syne font-black text-4xl uppercase text-white tracking-tight leading-none">
            White Label Clone Manager
          </h1>
          <p className="text-xs text-gray-400 font-mono mt-2 uppercase tracking-wide">
            Manage multi-tenant subdomains, track active client subscriptions, and spawn custom templates.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => setShowWizard(true)}
            className="py-2.5 px-5 rounded-xl bg-sky-500 hover:bg-sky-400 text-slate-950 text-xs font-semibold transition-colors flex items-center gap-2"
          >
            <PlusCircle className="w-4 h-4" />
            <span>Provision Client Tenant</span>
          </button>
          
          <button 
            onClick={onLogout} 
            className="px-4 py-3 rounded-xl border border-white/10 hover:border-white/20 text-xs font-mono uppercase font-bold text-gray-400 hover:text-white transition-all"
          >
            Exit Panel
          </button>
        </div>
      </div>

      {/* Analytics Overviews */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-[#16162a]/80 backdrop-blur border border-white/5 hover:border-amber/20 p-6 rounded-3xl space-y-3 relative overflow-hidden transition-all duration-300 hover:scale-[1.01] group">
          <div className="absolute top-4 right-4 text-white/5 group-hover:text-amber/10 transition-colors duration-300">
            <Layers className="w-12 h-12" />
          </div>
          <p className="text-[10px] font-mono uppercase tracking-widest text-gray-500 font-black">Active Tenant Clones</p>
          <h3 className="font-syne font-black text-3xl text-white tracking-tight">{activeCount} / {sites.length}</h3>
          <p className="text-xs font-mono text-emerald-400">
            99.9% Latency Uptime
          </p>
        </div>

        <div className="bg-[#16162a]/80 backdrop-blur border border-white/5 hover:border-amber/20 p-6 rounded-3xl space-y-3 relative overflow-hidden transition-all duration-300 hover:scale-[1.01] group">
          <div className="absolute top-4 right-4 text-white/5 group-hover:text-amber/10 transition-colors duration-300">
            <CreditCard className="w-12 h-12" />
          </div>
          <p className="text-[10px] font-mono uppercase tracking-widest text-gray-500 font-black">Monthly Recurring Revenue</p>
          <h3 className="font-syne font-black text-3xl text-amber tracking-tight">Rs {totalMRR.toLocaleString()}</h3>
          <p className="text-[10px] font-mono text-gray-400 uppercase tracking-wider">RETAINER SUBSCRIPTIONS ACTIVE</p>
        </div>

        <div className="bg-[#16162a]/80 backdrop-blur border border-white/5 hover:border-amber/20 p-6 rounded-3xl space-y-3 relative overflow-hidden transition-all duration-300 hover:scale-[1.01] group">
          <div className="absolute top-4 right-4 text-white/5 group-hover:text-amber/10 transition-colors duration-300">
            <Sparkles className="w-12 h-12" />
          </div>
          <p className="text-[10px] font-mono uppercase tracking-widest text-gray-500 font-black">Lifetime Platform Earnings</p>
          <h3 className="font-syne font-black text-3xl text-transparent bg-clip-text bg-gradient-to-r from-amber to-amber-200 tracking-tight">
            Rs {aggregateRevenue.toLocaleString()}
          </h3>
          <p className="text-[10px] font-mono text-emerald-400 uppercase tracking-wider">COMBINED SETUP & MONTHLY FEES</p>
        </div>
      </div>

      {sites.length === 0 ? (
        <p className="text-xs font-mono text-gray-500">Syncing platform indices...</p>
      ) : (
        <div className="bg-navy border border-white/5 p-8 rounded-3xl shadow-xl space-y-6">
          <h2 className="font-syne font-black text-sm uppercase text-gray-400">Registered SaaS Tenants & Retainer Ledgers</h2>
          
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs font-mono">
              <thead>
                <tr className="border-b border-white/10 text-gray-500 pb-3">
                  <th className="py-3 uppercase font-black">Client Name</th>
                  <th className="py-3 uppercase font-black">Niche / Plan</th>
                  <th className="py-3 uppercase font-black">Subdomain URL</th>
                  <th className="py-3 uppercase font-black">Database Connection</th>
                  <th className="py-3 uppercase font-black">Monthly Fee</th>
                  <th className="py-3 uppercase font-black">SaaS Revenue</th>
                  <th className="py-3 uppercase font-black">Bypass Access</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {sites.map((site) => (
                  <tr key={site.id} className="hover:bg-white/5">
                    <td className="py-3.5 font-bold text-white uppercase">{site.name}</td>
                    <td className="py-3.5">
                      <span className="px-2 py-0.5 rounded bg-indigo-500/10 text-indigo-300 font-bold uppercase text-[9px] mr-1.5">{site.niche}</span>
                      <span className="text-gray-400">{site.planType}</span>
                    </td>
                    <td className="py-3.5 text-blue-400 underline">{site.domain}</td>
                    <td className="py-3.5 text-gray-400">{site.databaseId || 'default'}</td>
                    <td className="py-3.5 text-gray-300">Rs {site.monthlyFee?.toLocaleString()}/mo</td>
                    <td className="py-3.5 text-amber font-bold">Rs {site.totalRevenue?.toLocaleString()}</td>
                    <td className="py-3.5">
                      <button
                        onClick={() => {
                          // Silent superadmin token login bypass simulation
                          setNotification({
                            message: `Simulating superadmin silent access bypass into sub-tenant "${site.name}". Overriding auth rules and synchronizing schemas.`,
                            type: 'info'
                          });
                          window.location.hash = '#admin';
                        }}
                        className="text-xs font-medium bg-white/5 hover:bg-sky-500 hover:text-slate-950 transition-colors text-sky-400 border border-white/10 px-3 py-1.5 rounded-lg"
                      >
                        Bypass Log
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Cloud Provision Step Wizard modal */}
      {showWizard && (
        <div className="fixed inset-0 z-[3000] bg-black/90 backdrop-blur-md flex items-center justify-center p-6 animate-fadeIn">
          <div className="bg-[#121226] w-full max-w-xl rounded-3xl border-2 border-indigo-600/35 overflow-hidden shadow-2xl relative space-y-6">
            
            {/* Wizard Heading */}
            <div className="bg-navy p-6 border-b border-indigo-600/35 flex justify-between items-center">
              <div>
                <h3 className="font-syne font-black text-base uppercase text-white tracking-wider">Tenant Provision System</h3>
                <p className="text-[10px] text-gray-500 font-mono uppercase">Setup wizard Step {step} of 7</p>
              </div>
              <button onClick={() => { setShowWizard(false); setStep(1); }} className="w-8 h-8 rounded-full bg-white/5 hover:bg-white/10 text-gray-400 flex items-center justify-center">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-8 space-y-6 max-h-[70vh] overflow-y-auto">
              
              {/* Wizard Steps indicator bar */}
              <div className="flex justify-between items-center text-[10px] font-mono text-gray-500 border-b border-white/5 pb-4">
                {Array.from({ length: 7 }).map((_, i) => (
                  <span key={i} className={`px-2 py-1 rounded-full ${step === i + 1 ? 'bg-indigo-600 text-white font-bold' : step > i + 1 ? 'bg-green-600/20 text-green-400' : ''}`}>
                    U{i + 1}
                  </span>
                ))}
              </div>

              {/* STEP 1: Client Bio Info */}
              {step === 1 && (
                <div className="space-y-4">
                  <h4 className="font-syne font-bold uppercase text-xs text-white">Step 1: Hospital Client Authority Info</h4>
                  <div>
                    <label className="block text-[10px] font-mono text-gray-500 uppercase mb-1.5">Client Name / Corporate Hospital</label>
                    <input
                      type="text"
                      value={clientName}
                      onChange={(e) => setClientName(e.target.value)}
                      placeholder="e.g. Apex Multispeciality Hospital"
                      className="w-full bg-navy border border-white/10 text-white rounded-xl px-4 py-3 text-xs focus:outline-none"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-[10px] font-mono text-gray-500 uppercase mb-1.5">Primary Contact Email</label>
                      <input
                        type="email"
                        value={contactEmail}
                        onChange={(e) => setContactEmail(e.target.value)}
                        placeholder="e.g. info@apex.in"
                        className="w-full bg-navy border border-white/10 text-white rounded-xl px-4 py-3 text-xs focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-mono text-gray-500 uppercase mb-1.5">Authorized Phone Number</label>
                      <input
                        type="text"
                        value={contactPhone}
                        onChange={(e) => setContactPhone(e.target.value)}
                        placeholder="e.g. +91 97777 55555"
                        className="w-full bg-navy border border-white/10 text-white rounded-xl px-4 py-3 text-xs focus:outline-none"
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* STEP 2: Subdomain / Custom Domain mapping */}
              {step === 2 && (
                <div className="space-y-4">
                  <h4 className="font-syne font-bold uppercase text-xs text-white">Step 2: Subdomain Mapping & Routing</h4>
                  <div>
                    <label className="block text-[10px] font-mono text-gray-500 uppercase mb-1.5">Configure Target Domain URL Mapping</label>
                    <input
                      type="text"
                      value={domain}
                      onChange={(e) => setDomain(e.target.value)}
                      placeholder="e.g. apex.sunmedx.in"
                      className="w-full bg-navy border border-white/10 text-white rounded-xl px-4 py-3 text-xs focus:outline-none focus:border-indigo-500"
                    />
                    <p className="text-[9px] text-gray-600 mt-1 uppercase leading-normal">Allows clients to connect seamlessly via their designated white-label routing alias. Internal DNS masks will route requests.</p>
                  </div>
                </div>
              )}

              {/* STEP 3: Relational database config */}
              {step === 3 && (
                <div className="space-y-4">
                  <h4 className="font-syne font-bold uppercase text-xs text-white">Step 3: Database Schema Config</h4>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-[10px] font-mono text-gray-500 uppercase mb-1.5">External Database ID</label>
                      <input
                        type="text"
                        value={dbId}
                        onChange={(e) => setDbId(e.target.value)}
                        placeholder="e.g. db-apex-multispec"
                        className="w-full bg-navy border border-white/10 text-white rounded-xl px-4 py-3 text-xs focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-mono text-gray-500 uppercase mb-1.5">Region Deployment Zone</label>
                      <select
                        value={dbRegion}
                        onChange={(e) => setDbRegion(e.target.value)}
                        className="w-full bg-navy border border-white/10 text-white rounded-xl px-4 py-3 text-xs focus:outline-none"
                      >
                        <option value="asia-south1">Mumbai (asia-south1)</option>
                        <option value="asia-south2">Delhi (asia-south2)</option>
                        <option value="us-east1">N. Virginia (us-east1)</option>
                      </select>
                    </div>
                  </div>
                </div>
              )}

              {/* STEP 4: Retainer Billing setup */}
              {step === 4 && (
                <div className="space-y-4">
                  <h4 className="font-syne font-bold uppercase text-xs text-white">Step 4: Platform Retainer Config</h4>
                  <div className="grid grid-cols-3 gap-3">
                    <div>
                      <label className="block text-[10px] font-mono text-gray-500 uppercase mb-1.5">Subscription Plan</label>
                      <select
                        value={planType}
                        onChange={(e) => setPlanType(e.target.value as any)}
                        className="w-full bg-navy border border-white/10 text-white rounded-xl py-3 px-2 text-xs focus:outline-none"
                      >
                        <option value="Basic">Basic Plan</option>
                        <option value="Professional">Professional Plan</option>
                        <option value="Enterprise">Enterprise Plan</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-[10px] font-mono text-gray-500 uppercase mb-1.5">Setup Fee (Rs)</label>
                      <input
                        type="number"
                        value={setupFee}
                        onChange={(e) => setSetupFee(Number(e.target.value))}
                        className="w-full bg-navy border border-white/10 text-white rounded-xl px-4 py-3 text-xs focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-mono text-gray-500 uppercase mb-1.5">Retainer (Rs/mo)</label>
                      <input
                        type="number"
                        value={monthlyRetainer}
                        onChange={(e) => setMonthlyRetainer(Number(e.target.value))}
                        className="w-full bg-navy border border-white/10 text-white rounded-xl px-4 py-3 text-xs focus:outline-none"
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* STEP 5: White label niche customization */}
              {step === 5 && (
                <div className="space-y-4">
                  <h4 className="font-syne font-bold uppercase text-xs text-white">Step 5: White Label Niche Themes Selection</h4>
                  <div className="grid grid-cols-2 gap-3">
                    {[
                      { value: 'Biomedical', label: 'Biomedical Service Focus' },
                      { value: 'Dental', label: 'Dental Clinic Autoclaves' },
                      { value: 'Pharma', label: 'Pharma cold vaccine tracking' },
                      { value: 'Lab', label: 'Lab Centrifuge verification' },
                      { value: 'Fitness', label: 'Fitness Treadmill load tests' },
                      { value: 'Optical', label: 'Optical Keratometer servicing' }
                    ].map((item) => (
                      <button
                        key={item.value}
                        type="button"
                        onClick={() => setNiche(item.value as any)}
                        className={`p-4 rounded-xl text-left border transition-all ${
                          niche === item.value
                            ? 'bg-indigo-600/10 border-indigo-500 text-indigo-400'
                            : 'bg-navy border-white/5 text-gray-400 hover:text-white'
                        }`}
                      >
                        <span className="font-syne font-black text-xs uppercase block">{item.value} Niche</span>
                        <span className="text-[10px] font-mono mt-0.5 block">{item.label}</span>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* STEP 6: Module toggle toggles */}
              {step === 6 && (
                <div className="space-y-4">
                  <h4 className="font-syne font-bold uppercase text-xs text-white">Step 6: Module Permissions Toggles</h4>
                  <div className="space-y-3.5">
                    {Object.entries(modules).map(([moduleKey, isEnabled]) => (
                      <div key={moduleKey} className="flex justify-between items-center bg-navy p-3.5 rounded-2xl border border-white/5">
                        <span className="font-mono text-xs uppercase text-gray-300">Enable {moduleKey} services</span>
                        <input
                          type="checkbox"
                          checked={isEnabled}
                          onChange={() => setModules({ ...modules, [moduleKey]: !isEnabled })}
                          className="w-4 h-4 accent-indigo-600 cursor-pointer"
                        />
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* STEP 7: Check & Bootstrap */}
              {step === 7 && (
                <div className="space-y-6 text-center py-4">
                  <Database className="w-16 h-16 text-indigo-400 mx-auto animate-pulse" />
                  <div>
                    <h4 className="font-syne font-black text-white text-base uppercase">Confirm Client Bootstrapping Configuration</h4>
                    <p className="text-xs text-gray-500 font-mono mt-2 leading-relaxed max-w-sm mx-auto uppercase">The system is ready to spawn client clone database records, seed structural models, and allocate subdomain masks. All operations are safe and fully traceable.</p>
                  </div>
                </div>
              )}

              {/* Buttons controls */}
              <div className="flex gap-3 justify-end pt-5 border-t border-white/5">
                {step > 1 && (
                  <button onClick={handleStepBack} className="px-4 py-2 bg-navy border border-white/10 rounded-xl text-xs uppercase font-mono text-white">
                    Back Step
                  </button>
                )}
                
                {step < 7 ? (
                  <button onClick={handleStepNext} disabled={!clientName && step === 1} className="px-4 py-2 bg-indigo-600 rounded-xl text-xs uppercase text-white font-heavy flex items-center gap-1">
                    <span>Next step</span>
                    <ChevronRight className="w-4 h-4" />
                  </button>
                ) : (
                  <button onClick={handleCreateClient} className="px-5 py-2.5 bg-green-600 rounded-xl text-xs uppercase text-white font-black flex items-center gap-1.5">
                    <CheckCircle2 className="w-4.5 h-4.5" />
                    <span>Bootstrap Clone Site</span>
                  </button>
                )}
              </div>

            </div>

          </div>
        </div>
      )}

    </div>
  );
}
