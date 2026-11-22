import React, { useState, useEffect, useReducer, useRef } from 'react';
import {
  Activity,
  LogIn,
  Menu,
  X as CloseIcon,
  LogOut,
  Calculator,
  FileWarning,
  ChevronDown,
  BookOpen,
  Phone,
  Mail,
  FileDown,
} from 'lucide-react';
import { getDb } from './services/dataClient';
import { getAuth, AuthUser } from './services/authService';
import { checkAndSeedDatabase, SITE_NAME } from './config/seed';
import { CartItem, Product, SiteSettings } from './types';

// Decoupled Page imports
import Home from './pages/Home';
import Services from './pages/Services';
import Catalogue from './pages/Catalogue';
import Academy from './pages/Academy';
import CustomerPortal from './pages/CustomerPortal';
import AboutContact from './pages/AboutContact';
import AdminPanel from './admin/AdminPanel';
import PublicEquipment from './pages/PublicEquipment';
import TechnicianDashboard from './pages/TechnicianDashboard';
import AuthPage from './pages/AuthPage';
import LegalPolicies from './pages/LegalPolicies';
import AIChatbot from './components/AIChatbot';

// Cart Reducer definition
type CartAction =
  | { type: 'ADD'; payload: Product }
  | { type: 'REMOVE'; payload: string }
  | { type: 'CLEAR' };

function cartReducer(state: CartItem[], action: CartAction): CartItem[] {
  switch (action.type) {
    case 'ADD': {
      const existing = state.find(item => item.product.id === action.payload.id);
      if (existing) {
        return state.map(item =>
          item.product.id === action.payload.id ? { ...item, quantity: item.quantity + 1 } : item
        );
      }
      return [...state, { product: action.payload, quantity: 1 }];
    }
    case 'REMOVE':
      return state.filter(item => item.product.id !== action.payload);
    case 'CLEAR':
      return [];
    default:
      return state;
  }
}

export default function App() {
  const [currentHash, setCurrentHash] = useState(window.location.hash || '#home');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const [isInitializing, setIsInitializing] = useState(true);
  const [initStatus, setInitStatus] = useState('Syncing records...');
  const [siteSettings, setSiteSettings] = useState<SiteSettings | null>(null);

  const [cart, dispatchCart] = useReducer(cartReducer, []);

  const [userEmail, setUserEmail] = useState<string>('');
  const [userId, setUserId] = useState<string>('');
  const [isAdmin, setIsAdmin] = useState(false);
  const [userRole, setUserRole] = useState<string>('customer');

  const [tools, setTools] = useState<any[]>([]);
  const [toolsDropdownOpen, setToolsDropdownOpen] = useState(false);
  const toolsDropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const db = getDb();
    const unsub = db.collection('tools').onSnapshot(
      (snap: any) => {
        const list: any[] = [];
        snap.forEach((doc: any) => {
          list.push({ id: doc.id, ...doc.data() });
        });
        list.sort((a, b) => (a.order || 99) - (b.order || 99));
        setTools(list);
      },
      (error: any) => {
        console.error('Tools subscription error:', error);
      }
    );
    return () => unsub();
  }, []);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (toolsDropdownRef.current && !toolsDropdownRef.current.contains(event.target as Node)) {
        setToolsDropdownOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    const unsub = getAuth().onAuthStateChanged((user: any) => {
      if (user) {
        const email = (user.email || '').toLowerCase().trim();
        const role = user.role || 'customer';
        setUserEmail(email);
        setUserId(user.uid || '');
        setUserRole(role);
        if (role === 'admin' || role === 'superadmin' || email === 'admin@sunmedx.in' || email === 'krishnadigitalai@gmail.com') {
          setIsAdmin(true);
        } else {
          setIsAdmin(false);
        }
      } else {
        setUserEmail('');
        setUserId('');
        setIsAdmin(false);
        setUserRole('customer');
      }
    });
    return () => {
      if (unsub && typeof unsub === 'function') unsub();
    };
  }, []);

  useEffect(() => {
    if (!userEmail) {
      setUserRole('customer');
      return;
    }
    const db = getDb();
    const unsub = db
      .collection('users')
      .where('email', '==', userEmail)
      .onSnapshot(
        (snap: any) => {
          if (!snap.empty) {
            let foundRole = 'customer';
            snap.forEach((doc: any) => {
              const data = doc.data();
              if (data && data.role) foundRole = data.role;
            });
            setUserRole(foundRole);
            setIsAdmin(foundRole === 'admin' || foundRole === 'superadmin');
          } else {
            if (userEmail === 'admin@sunmedx.in') {
              setUserRole('admin');
              setIsAdmin(true);
            } else if (userEmail === 'krishnadigitalai@gmail.com' || userEmail === 'superadmin@sunmedx.in') {
              setUserRole('superadmin');
              setIsAdmin(true);
            } else if (userEmail === 'tech@sunmedx.in') {
              setUserRole('technician');
              setIsAdmin(false);
            } else {
              setUserRole('customer');
              setIsAdmin(false);
            }
          }
        },
        (error: any) => console.error('User profile subscription error:', error)
      );
    return () => unsub();
  }, [userEmail]);

  const [postAuthHash, setPostAuthHash] = useState<string>('');

  // Diagnostic Calculators States (Tools View)
  const [calcTab, setCalcTab] = useState<'vent' | 'gas' | 'deviation' | 'diagnose'>('vent');
  const [tidalVolume, setTidalVolume] = useState('450');
  const [respRate, setRespRate] = useState('14');
  const [psiPressure, setPsiPressure] = useState('1800');
  const [cylinderFactor, setCylinderFactor] = useState('0.28');
  const [gasFlowRate, setGasFlowRate] = useState('6');
  const [standardValue, setStandardValue] = useState('5.0');
  const [measuredValue, setMeasuredValue] = useState('5.08');

  // Public AI Fault Diagnosis States (/api/diagnose)
  const [diagEquipmentType, setDiagEquipmentType] = useState('Multi-Parameter ICU Patient Monitor');
  const [diagProblemDesc, setDiagProblemDesc] = useState('');
  const [diagLoading, setDiagLoading] = useState(false);
  const [diagError, setDiagError] = useState<string | null>(null);
  const [diagResult, setDiagResult] = useState<{
    causes: string[];
    severity: string;
    checks: string[];
    recommendation: string;
    onsiteRequired: boolean;
  } | null>(null);

  const handleRunPublicDiagnosis = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!diagEquipmentType.trim() || !diagProblemDesc.trim() || diagLoading) return;
    setDiagLoading(true);
    setDiagError(null);
    try {
      const res = await fetch('/api/diagnose', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          equipmentType: diagEquipmentType.trim(),
          problemDescription: diagProblemDesc.trim(),
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data?.error || `Diagnosis request failed (${res.status})`);
      }
      setDiagResult(data);
    } catch (err: any) {
      setDiagError(err?.message || 'Unable to run AI fault diagnosis right now.');
    } finally {
      setDiagLoading(false);
    }
  };

  useEffect(() => {
    const handleHashChange = () => {
      const hash = window.location.hash || '#home';
      setCurrentHash(hash);
      setMobileMenuOpen(false);
      window.scrollTo(0, 0);

      if (hash === '#admin' && !isAdmin) {
        setPostAuthHash('#admin');
        window.location.hash = '#auth';
      } else if (hash === '#customer-portal' && !userEmail) {
        setPostAuthHash('#customer-portal');
        window.location.hash = '#auth';
      } else if ((hash === '#auth' || hash === '#signin' || hash === '#signup') && userEmail) {
        window.location.hash = isAdmin ? '#admin' : '#customer-portal';
      }
    };

    window.addEventListener('hashchange', handleHashChange);
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, [userEmail, isAdmin]);

  useEffect(() => {
    async function setupApp() {
      try {
        await checkAndSeedDatabase(msg => setInitStatus(msg));
        const db = getDb();
        db.collection('site_settings')
          .doc('global')
          .onSnapshot((doc: any) => {
            if (doc.exists) setSiteSettings(doc.data());
          });
      } catch (e: any) {
        console.error('Initiation fault: ', e);
      } finally {
        setIsInitializing(false);
      }
    }
    setupApp();
  }, []);

  useEffect(() => {
    if (siteSettings?.themeVariables) {
      const root = document.documentElement;
      const theme = siteSettings.themeVariables;
      if (theme.colorNavy) {
        root.style.setProperty('--color-navy', theme.colorNavy);
        root.style.setProperty('--navy', theme.colorNavy);
      }
      if (theme.colorCrimson) root.style.setProperty('--color-crimson', theme.colorCrimson);
      if (theme.colorAmber) root.style.setProperty('--color-amber', theme.colorAmber);
      if (theme.colorGolden) root.style.setProperty('--color-golden', theme.colorGolden);
      if (theme.colorDarkBg) root.style.setProperty('--color-dark-bg', theme.colorDarkBg);
    }
  }, [siteSettings]);

  const handleAuthSuccess = (user: AuthUser) => {
    const normalizedEmail = (user.email || '').trim().toLowerCase();
    const role = user.role || 'customer';
    const adminAccess =
      role === 'admin' ||
      role === 'superadmin' ||
      normalizedEmail === 'admin@sunmedx.in' ||
      normalizedEmail === 'krishnadigitalai@gmail.com';

    setUserEmail(normalizedEmail);
    setUserId(user.uid);
    setUserRole(role);
    setIsAdmin(adminAccess);

    if (postAuthHash === '#admin' && adminAccess) {
      setPostAuthHash('');
      window.location.hash = '#admin';
    } else if (adminAccess && !postAuthHash) {
      window.location.hash = '#admin';
    } else if (role === 'technician') {
      setPostAuthHash('');
      window.location.hash = '#home';
    } else {
      setPostAuthHash('');
      window.location.hash = '#customer-portal';
    }
  };

  const handleUpdateSettings = async (newSettings: Partial<SiteSettings>) => {
    try {
      const db = getDb();
      await db.collection('site_settings').doc('global').update(newSettings);
    } catch (e: any) {
      alert('Failed updating CMS: ' + e.message);
    }
  };

  const handleLogout = async () => {
    try {
      await getAuth().signOut();
    } catch (e) {
      console.warn('Signout failure ignored on reset:', e);
    }
    setUserEmail('');
    setUserId('');
    setIsAdmin(false);
    setUserRole('customer');
    window.location.hash = '#home';
  };

  const handleNavigateTo = (hash: string) => {
    window.location.hash = hash;
  };

  if (isInitializing) {
    return (
      <div className="min-h-screen bg-white flex flex-col items-center justify-center space-y-4">
        <div className="w-12 h-12 rounded-xl bg-[#211D70] flex items-center justify-center shadow-md">
          <Activity className="w-6 h-6 text-[#F8C72E]" />
        </div>
        <div className="space-y-1 text-center">
          <h2 className="font-syne font-bold text-[#211D70] text-lg tracking-tight">{SITE_NAME || 'SunMedX'}</h2>
          <p className="text-xs font-mono text-[#505050]">{initStatus}</p>
        </div>
      </div>
    );
  }

  const computedMinuteVolume = ((Number(tidalVolume) || 0) * (Number(respRate) || 0)) / 1000;
  const factor = Number(cylinderFactor) || 0.28;
  const flow = Number(gasFlowRate) || 1;
  const prs = Number(psiPressure) || 0;
  const computedMinutes = (prs * factor) / flow;
  const gasHours = Math.floor(computedMinutes / 60);
  const gasMins = Math.round(computedMinutes % 60);

  const stdVal = Number(standardValue) || 1.0;
  const measVal = Number(measuredValue) || 1.0;
  const computedDeviation = (Math.abs(measVal - stdVal) / stdVal) * 100;
  const isWithinTolerance = computedDeviation <= 2.0;

  if (userEmail && userRole === 'technician') {
    return (
      <div className="min-h-screen bg-[#0B1120] text-slate-100 font-sans antialiased text-sm">
        <TechnicianDashboard technicianEmail={userEmail} onLogout={handleLogout} />
      </div>
    );
  }

  const navLinkClass = (active: boolean) =>
    `px-3 py-1.5 rounded-md text-sm font-semibold whitespace-nowrap shrink-0 transition-colors ${
      active
        ? 'text-[#211D70] bg-[#EAEAEA]'
        : 'text-[#404041] hover:text-[#211D70] hover:bg-[#F5F6FA]'
    }`;

  return (
    <div className="min-h-screen bg-white text-[#404041] font-sans antialiased text-sm relative overflow-x-clip flex flex-col">
      {/* FLOATING VOICE AI CHATBOT (Public/Client views only — Admin uses Biomedical AI Worker) */}
      {currentHash !== '#admin' && (
        <AIChatbot userEmail={userEmail} chatbotEnabled={siteSettings?.chatbotEnabled ?? true} />
      )}

      {/* INSTITUTIONAL TOP NAVIGATION BAR (3-Zone Single-Line Contract) */}
      <header className="sticky top-0 z-[800] bg-white border-b-2 border-[#211D70] shadow-xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-4">
          {/* Zone 1: Clean Institutional Brand Mark */}
          <button
            type="button"
            onClick={() => handleNavigateTo('#home')}
            className="flex items-center gap-2.5 shrink-0 text-left focus:outline-none group"
          >
            <div className="w-9 h-9 rounded-lg bg-[#211D70] flex items-center justify-center text-[#F8C72E] shadow-xs">
              <Activity className="w-5 h-5 stroke-[2.25]" />
            </div>
            <span className="font-syne font-extrabold text-[#211D70] text-lg tracking-tight whitespace-nowrap">
              {siteSettings?.siteName || 'SunMedX'}
            </span>
          </button>

          {/* Zone 2: Concise Single-Line Navigation Links */}
          <nav aria-label="Primary" className="hidden lg:flex items-center gap-1">
            <button onClick={() => handleNavigateTo('#home')} className={navLinkClass(currentHash === '#home')}>
              Home
            </button>
            <button onClick={() => handleNavigateTo('#services')} className={navLinkClass(currentHash === '#services')}>
              Services
            </button>
            <button onClick={() => handleNavigateTo('#catalogue')} className={navLinkClass(currentHash === '#catalogue')}>
              Catalogue
            </button>
            <button onClick={() => handleNavigateTo('#academy')} className={navLinkClass(currentHash === '#academy')}>
              Academy
            </button>

            <div className="relative" ref={toolsDropdownRef}>
              <button
                type="button"
                onClick={() => setToolsDropdownOpen(!toolsDropdownOpen)}
                className={`flex items-center gap-1 ${navLinkClass(currentHash === '#tools' || toolsDropdownOpen)}`}
              >
                <span>Tools</span>
                <ChevronDown className={`w-3.5 h-3.5 transition-transform duration-200 ${toolsDropdownOpen ? 'rotate-180 text-[#211D70]' : ''}`} />
              </button>

              {toolsDropdownOpen && (
                <div className="absolute left-0 mt-2.5 w-72 bg-white border border-[#D4D6E2] rounded-xl shadow-xl p-2 z-[999]">
                  <button
                    onClick={() => {
                      setToolsDropdownOpen(false);
                      handleNavigateTo('#tools');
                    }}
                    className="w-full text-left flex items-center gap-3 p-2.5 rounded-lg hover:bg-[#F4F5FA] transition-colors group"
                  >
                    <div className="w-8 h-8 rounded-lg bg-[#211D70] flex items-center justify-center text-[#F8C72E] shrink-0">
                      <Calculator className="w-4 h-4" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-bold text-[#211D70]">Smart Calculators</p>
                      <p className="text-xs text-[#505050] truncate">Ventilator, O2 &amp; NABL checks</p>
                    </div>
                  </button>

                  <a
                    href={siteSettings?.academyUrl || 'https://sunmedxacademy.graphy.com'}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={() => setToolsDropdownOpen(false)}
                    className="flex items-center gap-3 p-2.5 rounded-lg hover:bg-[#F4F5FA] transition-colors group"
                  >
                    <div className="w-8 h-8 rounded-lg bg-[#F8C72E]/25 border border-[#F8BE15] flex items-center justify-center text-[#211D70] shrink-0">
                      <BookOpen className="w-4 h-4" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-bold text-[#211D70]">Academy Portal</p>
                      <p className="text-xs text-[#505050] truncate">External Graphy classroom</p>
                    </div>
                  </a>

                  {tools.length > 0 && <div className="border-t border-[#E6E7EE] my-1.5" />}

                  <div className="max-h-56 overflow-y-auto space-y-0.5">
                    {tools.map(t => (
                      <button
                        key={t.id}
                        onClick={() => {
                          setToolsDropdownOpen(false);
                          if (t.url) {
                            window.open(t.url, '_blank', 'noopener,noreferrer');
                          } else {
                            handleNavigateTo('#tools');
                          }
                        }}
                        className="w-full text-left flex items-center gap-3 p-2 rounded-lg hover:bg-[#F4F5FA] transition-colors"
                      >
                        <div
                          className="w-7 h-7 rounded-md bg-[#F4F5FA] flex items-center justify-center shrink-0"
                          style={{ color: t.color || '#211D70' }}
                        >
                          <i className={`${t.icon || 'fa-solid fa-calculator'} text-xs`} />
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="text-xs font-semibold text-[#404041] truncate">{t.name}</p>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <button onClick={() => handleNavigateTo('#about')} className={navLinkClass(currentHash === '#about')}>
              About
            </button>

            {userEmail && (
              <button onClick={() => handleNavigateTo('#customer-portal')} className={navLinkClass(currentHash === '#customer-portal')}>
                Client Hub
              </button>
            )}
            {isAdmin && (
              <button
                onClick={() => handleNavigateTo('#admin')}
                className={`px-3 py-1.5 rounded-md text-sm font-semibold whitespace-nowrap shrink-0 transition-colors border ${
                  currentHash === '#admin'
                    ? 'bg-[#211D70] text-white border-[#211D70]'
                    : 'text-[#211D70] border-[#211D70]/30 hover:bg-[#EAEAEA]'
                }`}
              >
                Admin
              </button>
            )}
          </nav>

          {/* Zone 3: Primary Account Action */}
          <div className="hidden lg:flex items-center gap-3 shrink-0">
            {userEmail ? (
              <div className="flex items-center gap-2.5 bg-[#F4F5FA] border border-[#D4D6E2] px-3 py-1.5 rounded-lg">
                <span className="text-xs text-[#211D70] font-mono font-semibold truncate max-w-[150px]">{userEmail}</span>
                <button
                  onClick={handleLogout}
                  title="Sign out"
                  aria-label="Sign out"
                  className="text-[#505050] hover:text-[#EA2227] transition-colors p-0.5"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <button
                onClick={() => handleNavigateTo('#auth')}
                className="py-2 px-4 rounded-md bg-[#211D70] hover:bg-[#272F78] text-[#F8C72E] text-xs font-bold transition-colors flex items-center gap-1.5 whitespace-nowrap shrink-0 shadow-xs"
              >
                <LogIn className="w-3.5 h-3.5" />
                <span>Sign In</span>
              </button>
            )}
          </div>

          {/* Mobile Hamburger Toggle */}
          <button
            type="button"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            aria-label={mobileMenuOpen ? 'Close navigation menu' : 'Open navigation menu'}
            className="lg:hidden p-2 rounded-lg text-[#211D70] hover:bg-[#EAEAEA] transition-colors"
          >
            {mobileMenuOpen ? <CloseIcon className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>

        {/* Collapsible Mobile Menu Drawer */}
        {mobileMenuOpen && (
          <div className="lg:hidden border-t border-[#E6E7EE] bg-white px-4 sm:px-6 py-4 space-y-2 flex flex-col text-sm font-semibold text-[#211D70] max-h-[calc(100vh-4rem)] overflow-y-auto shadow-lg">
            <button onClick={() => handleNavigateTo('#home')} className="text-left py-2 hover:text-[#F26522]">Home</button>
            <button onClick={() => handleNavigateTo('#services')} className="text-left py-2 hover:text-[#F26522]">Services</button>
            <button onClick={() => handleNavigateTo('#catalogue')} className="text-left py-2 hover:text-[#F26522]">Catalogue</button>
            <button onClick={() => handleNavigateTo('#academy')} className="text-left py-2 hover:text-[#F26522]">Academy</button>
            <button onClick={() => handleNavigateTo('#tools')} className="text-left py-2 hover:text-[#F26522]">Smart Calculators</button>
            <button onClick={() => handleNavigateTo('#about')} className="text-left py-2 hover:text-[#F26522]">About &amp; Contact</button>

            {userEmail && (
              <button onClick={() => handleNavigateTo('#customer-portal')} className="text-left py-2 text-[#272F78]">
                Client Hub
              </button>
            )}
            {isAdmin && (
              <button onClick={() => handleNavigateTo('#admin')} className="text-left py-2 text-[#EA2227]">
                Admin Panel
              </button>
            )}

            <div className="pt-3 mt-2 border-t border-[#E6E7EE]">
              {userEmail ? (
                <div className="flex items-center justify-between bg-[#F4F5FA] px-3 py-2.5 rounded-lg">
                  <span className="font-mono text-xs text-[#211D70] truncate max-w-[200px]">{userEmail}</span>
                  <button onClick={handleLogout} className="text-[#EA2227] text-xs font-semibold">Sign out</button>
                </div>
              ) : (
                <button
                  onClick={() => {
                    setMobileMenuOpen(false);
                    handleNavigateTo('#auth');
                  }}
                  className="w-full py-2.5 rounded-md bg-[#211D70] text-[#F8C72E] text-xs font-bold text-center"
                >
                  Sign In
                </button>
              )}
            </div>
          </div>
        )}
      </header>

      {/* CORE ROUTING RENDER LOGIC */}
      <main className="flex-1 relative z-10">
        {currentHash === '#home' && <Home onNavigate={handleNavigateTo} siteSettings={siteSettings} />}

        {currentHash === '#services' && <Services userId={userId} userEmail={userEmail} />}

        {currentHash === '#catalogue' && (
          <Catalogue
            userId={userId}
            userEmail={userEmail}
            cart={cart}
            dispatchCart={dispatchCart}
            siteSettings={siteSettings}
          />
        )}

        {currentHash === '#academy' && <Academy />}

        {currentHash === '#about' && <AboutContact />}

        {(currentHash === '#privacy-policy' ||
          currentHash === '#terms' ||
          currentHash === '#refund-policy' ||
          currentHash === '#calibration-policy') && (
          <LegalPolicies
            initialSection={
              currentHash === '#terms'
                ? 'terms'
                : currentHash === '#refund-policy'
                ? 'refund'
                : currentHash === '#calibration-policy'
                ? 'calibration'
                : 'privacy'
            }
            siteSettings={siteSettings}
            onNavigate={handleNavigateTo}
          />
        )}

        {/* AUTH PROTECTED CUSTOMER PORTAL (Dark Operational Console Wrapper) */}
        {currentHash === '#customer-portal' && userEmail && (
          <div className="bg-[#0B1120] text-slate-100 min-h-[75vh] py-4">
            <CustomerPortal userId={userId} userEmail={userEmail} siteSettings={siteSettings} />
          </div>
        )}

        {/* PUBLIC EQUIPMENT PAGE (NO AUTH REQUIRED) */}
        {currentHash.startsWith('#equipment/') && (
          <div className="bg-[#0B1120] text-slate-100 min-h-[75vh] py-4">
            <PublicEquipment equipmentId={currentHash.split('/')[1] || ''} />
          </div>
        )}

        {/* SIGN IN / SIGN UP PAGE */}
        {(currentHash === '#auth' ||
          currentHash === '#signin' ||
          currentHash === '#signup' ||
          (currentHash === '#customer-portal' && !userEmail) ||
          (currentHash === '#admin' && !isAdmin)) && (
          <AuthPage
            initialMode={currentHash === '#signup' ? 'signup' : 'signin'}
            onSuccess={handleAuthSuccess}
            onCancel={() => handleNavigateTo('#home')}
          />
        )}

        {/* AUTH PROTECTED ADMIN WORKSPACE BACKOFFICE (Dark Operational Console Wrapper) */}
        {currentHash === '#admin' && isAdmin && (
          <div className="bg-[#0B1120] text-slate-100 min-h-[75vh] py-4">
            <AdminPanel
              adminEmail={userEmail}
              onLogout={handleLogout}
              siteSettings={siteSettings}
              onUpdateSettings={handleUpdateSettings}
            />
          </div>
        )}

        {/* INTERACTIVE DIGITAL CALCULATORS - CLINICAL TOOLS */}
        {currentHash === '#tools' && (
          <div className="bg-[#EAEAEA]/60 py-12 px-6 page-fade-in">
            <div className="max-w-4xl mx-auto space-y-8">
              <div className="text-center space-y-3">
                <div className="bits-section-banner rounded-sm">
                  <h1 className="font-syne font-bold text-xl sm:text-2xl tracking-tight">
                    Clinical Engineering Calculators
                  </h1>
                </div>
                <p className="text-sm text-[#404041] max-w-xl mx-auto">
                  Quick diagnostic checks supporting biomedical validation and hospital compliance workflows.
                </p>
              </div>

              <div className="flex flex-wrap gap-2.5 justify-center">
                {[
                  { id: 'vent', label: 'Ventilator Minute Volume' },
                  { id: 'gas', label: 'Gas Cylinder Duration' },
                  { id: 'deviation', label: 'NABL Deviation Check' },
                  { id: 'diagnose', label: 'AI Fault Diagnosis' },
                ].map(tab => (
                  <button
                    key={tab.id}
                    onClick={() => setCalcTab(tab.id as any)}
                    className={`px-5 py-2.5 rounded-full text-xs font-bold border transition-all ${
                      calcTab === tab.id
                        ? 'bg-[#211D70] border-[#211D70] text-[#F8C72E]'
                        : 'bg-white border-[#211D70]/30 text-[#211D70] hover:bg-[#211D70]/5'
                    }`}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>

              <div className="bg-white bits-labs-border p-6 sm:p-8 shadow-md max-w-xl mx-auto space-y-6">
                {calcTab === 'vent' && (
                  <div className="space-y-5">
                    <div className="space-y-1 border-b border-[#E6E7EE] pb-3">
                      <h3 className="font-syne font-bold text-[#211D70] text-lg">Ventilator Minute Volume</h3>
                      <p className="text-xs text-[#505050] font-mono">
                        Minute Volume (L/min) = (Tidal Volume × Resp Rate) / 1000
                      </p>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-semibold text-[#211D70] mb-1.5">Tidal Volume (mL)</label>
                        <input
                          type="number"
                          value={tidalVolume}
                          onChange={e => setTidalVolume(e.target.value)}
                          className="w-full bg-white border border-[#D4D6E2] text-[#211D70] rounded-lg px-4 py-2.5 text-sm font-mono focus:outline-none focus:border-[#F26522]"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-semibold text-[#211D70] mb-1.5">Respiratory Rate (bpm)</label>
                        <input
                          type="number"
                          value={respRate}
                          onChange={e => setRespRate(e.target.value)}
                          className="w-full bg-white border border-[#D4D6E2] text-[#211D70] rounded-lg px-4 py-2.5 text-sm font-mono focus:outline-none focus:border-[#F26522]"
                        />
                      </div>
                    </div>

                    <div className="p-4 bg-[#EAEAEA]/60 border border-[#D4D6E2] rounded-xl flex items-center justify-between">
                      <span className="text-sm font-semibold text-[#211D70]">Target Minute Volume</span>
                      <span className="font-mono text-lg font-bold text-[#211D70] tabular-nums">
                        {computedMinuteVolume.toFixed(2)} L/min
                      </span>
                    </div>
                  </div>
                )}

                {calcTab === 'gas' && (
                  <div className="space-y-5">
                    <div className="space-y-1 border-b border-[#E6E7EE] pb-3">
                      <h3 className="font-syne font-bold text-[#211D70] text-lg">Cylinder Remaining Duration</h3>
                      <p className="text-xs text-[#505050] font-mono">
                        Minutes Left = (Pressure psi × Factor) / Flow L/min
                      </p>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      <div>
                        <label className="block text-xs font-semibold text-[#211D70] mb-1.5">Pressure (psi)</label>
                        <input
                          type="number"
                          value={psiPressure}
                          onChange={e => setPsiPressure(e.target.value)}
                          className="w-full bg-white border border-[#D4D6E2] text-[#211D70] rounded-lg px-3.5 py-2.5 text-sm font-mono focus:outline-none focus:border-[#F26522]"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-semibold text-[#211D70] mb-1.5">Cylinder Type</label>
                        <select
                          value={cylinderFactor}
                          onChange={e => setCylinderFactor(e.target.value)}
                          className="w-full bg-white border border-[#D4D6E2] text-[#211D70] rounded-lg px-3 py-2.5 text-xs font-mono focus:outline-none focus:border-[#F26522]"
                        >
                          <option value="0.16">D Cylinder (0.16)</option>
                          <option value="0.28">E Cylinder (0.28)</option>
                          <option value="1.56">M Cylinder (1.56)</option>
                          <option value="3.14">G/H Cylinder (3.14)</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-xs font-semibold text-[#211D70] mb-1.5">O2 Flow (L/min)</label>
                        <input
                          type="number"
                          value={gasFlowRate}
                          onChange={e => setGasFlowRate(e.target.value)}
                          className="w-full bg-white border border-[#D4D6E2] text-[#211D70] rounded-lg px-3.5 py-2.5 text-sm font-mono focus:outline-none focus:border-[#F26522]"
                        />
                      </div>
                    </div>

                    <div className="p-4 bg-[#EAEAEA]/60 border border-[#D4D6E2] rounded-xl flex items-center justify-between">
                      <span className="text-sm font-semibold text-[#211D70]">Estimated Time Remaining</span>
                      <span className="font-mono text-lg font-bold text-[#211D70] tabular-nums">
                        {gasHours > 0 ? `${gasHours}h ` : ''}
                        {gasMins}m
                      </span>
                    </div>
                    {computedMinutes <= 45 && (
                      <div className="flex items-start gap-2.5 bg-[#EA2227]/10 text-[#EA2227] border border-[#EA2227]/25 rounded-xl p-3.5 text-xs leading-relaxed font-semibold">
                        <FileWarning className="w-4 h-4 shrink-0 mt-0.5" />
                        <span>Cylinder reserve is below the 45-minute safety threshold. Schedule an immediate swap.</span>
                      </div>
                    )}
                  </div>
                )}

                {calcTab === 'deviation' && (
                  <div className="space-y-5">
                    <div className="space-y-1 border-b border-[#E6E7EE] pb-3">
                      <h3 className="font-syne font-bold text-[#211D70] text-lg">NABL Calibration Deviation</h3>
                      <p className="text-xs text-[#505050] font-mono">
                        Deviation % = (|Measured − Standard| / Standard) × 100
                      </p>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-semibold text-[#211D70] mb-1.5">Reference Standard</label>
                        <input
                          type="number"
                          step="0.01"
                          value={standardValue}
                          onChange={e => setStandardValue(e.target.value)}
                          className="w-full bg-white border border-[#D4D6E2] text-[#211D70] rounded-lg px-4 py-2.5 text-sm font-mono focus:outline-none focus:border-[#F26522]"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-semibold text-[#211D70] mb-1.5">Measured Reading</label>
                        <input
                          type="number"
                          step="0.01"
                          value={measuredValue}
                          onChange={e => setMeasuredValue(e.target.value)}
                          className="w-full bg-white border border-[#D4D6E2] text-[#211D70] rounded-lg px-4 py-2.5 text-sm font-mono focus:outline-none focus:border-[#F26522]"
                        />
                      </div>
                    </div>

                    <div className="p-4 bg-[#EAEAEA]/60 border border-[#D4D6E2] rounded-xl space-y-3 text-sm">
                      <div className="flex justify-between items-center">
                        <span className="font-semibold text-[#211D70]">Computed Deviation</span>
                        <span className="font-mono text-[#211D70] font-bold tabular-nums">
                          {computedDeviation.toFixed(3)}%
                        </span>
                      </div>

                      <div className="flex justify-between pt-3 border-t border-[#D4D6E2] items-center">
                        <span className="font-semibold text-[#211D70]">NABL Tolerance Status</span>
                        <span
                          className={`font-mono text-xs font-bold px-3 py-1 rounded-md ${
                            isWithinTolerance
                              ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                              : 'bg-rose-100 text-rose-800 border border-rose-300'
                          }`}
                        >
                          {isWithinTolerance ? 'PASS (< 2%)' : 'FAIL (Recalibrate)'}
                        </span>
                      </div>
                    </div>
                  </div>
                )}

                {calcTab === 'diagnose' && (
                  <form onSubmit={handleRunPublicDiagnosis} className="space-y-4">
                    <div className="space-y-1 border-b border-[#E6E7EE] pb-3">
                      <h3 className="font-syne font-bold text-[#211D70] text-lg">AI Biomedical Fault Diagnosis</h3>
                      <p className="text-xs text-[#505050]">
                        Public equipment troubleshooting assistant powered securely through the portal&apos;s server AI proxy.
                      </p>
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-[#211D70] mb-1.5">Equipment Type</label>
                      <input
                        type="text"
                        required
                        value={diagEquipmentType}
                        onChange={e => setDiagEquipmentType(e.target.value)}
                        placeholder="e.g. ICU Ventilator, Biphasic Defibrillator, Syringe Pump"
                        className="w-full bg-white border border-[#D4D6E2] text-[#211D70] rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:border-[#F26522]"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-[#211D70] mb-1.5">Fault Symptom / Error Code</label>
                      <textarea
                        rows={3}
                        required
                        value={diagProblemDesc}
                        onChange={e => setDiagProblemDesc(e.target.value)}
                        placeholder="Describe alarm message, sensor drift, SpO2 dropout, power fault, or pressure leak..."
                        className="w-full bg-white border border-[#D4D6E2] text-[#211D70] rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:border-[#F26522]"
                      />
                    </div>

                    <button
                      type="submit"
                      disabled={diagLoading || !diagEquipmentType.trim() || !diagProblemDesc.trim()}
                      className="w-full py-3 rounded-xl bg-[#211D70] hover:bg-[#272F78] text-[#F8C72E] font-syne font-bold text-xs uppercase tracking-wider disabled:opacity-50 transition-colors"
                    >
                      {diagLoading ? 'Analyzing Equipment Fault...' : 'Run AI Fault Diagnosis'}
                    </button>

                    {diagError && (
                      <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs font-mono">
                        {diagError}
                      </div>
                    )}

                    {diagResult && (
                      <div className="bg-[#EAEAEA]/60 border border-[#D4D6E2] rounded-xl p-4 space-y-3 text-xs text-[#211D70]">
                        <div className="flex items-center justify-between border-b border-[#D4D6E2] pb-2">
                          <span className="font-bold uppercase tracking-wide">Diagnostic Report</span>
                          <span
                            className={`px-2.5 py-0.5 rounded font-mono font-bold ${
                              diagResult.severity === 'High'
                                ? 'bg-rose-100 text-rose-800'
                                : diagResult.severity === 'Medium'
                                ? 'bg-amber-100 text-amber-900'
                                : 'bg-emerald-100 text-emerald-800'
                            }`}
                          >
                            Severity: {diagResult.severity}
                          </span>
                        </div>

                        {Array.isArray(diagResult.causes) && diagResult.causes.length > 0 && (
                          <div>
                            <p className="font-bold mb-1">Probable Root Causes:</p>
                            <ul className="list-disc list-inside space-y-0.5 text-[#404041]">
                              {diagResult.causes.map((c, i) => (
                                <li key={i}>{c}</li>
                              ))}
                            </ul>
                          </div>
                        )}

                        {Array.isArray(diagResult.checks) && diagResult.checks.length > 0 && (
                          <div>
                            <p className="font-bold mb-1">Recommended Safety &amp; Inspection Checks:</p>
                            <ul className="list-decimal list-inside space-y-0.5 text-[#404041]">
                              {diagResult.checks.map((ch, i) => (
                                <li key={i}>{ch}</li>
                              ))}
                            </ul>
                          </div>
                        )}

                        <p className="text-[#404041] leading-relaxed">
                          <strong className="text-[#211D70]">Resolution:</strong> {diagResult.recommendation}
                        </p>

                        {diagResult.onsiteRequired && (
                          <button
                            type="button"
                            onClick={() => handleNavigateTo('#services')}
                            className="w-full py-2.5 rounded-lg bg-[#EA2227] hover:bg-[#c81c20] text-white font-bold uppercase text-[11px] tracking-wider"
                          >
                            Onsite Engineer Recommended — Book Calibration / Repair
                          </button>
                        )}
                      </div>
                    )}
                  </form>
                )}
              </div>
            </div>
          </div>
        )}
      </main>

      {/* SIGNATURE GOLD CALLOUT STRIP (Matching .download-brochure #F9C82E) */}
      <section className="bg-[#F9C82E] py-6 px-6 border-t border-[#E5B41C]">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-center gap-4">
          <button
            onClick={() => handleNavigateTo('#services')}
            className="bg-[#211D70] hover:bg-black text-[#F9C82D] font-syne font-bold text-base sm:text-lg px-7 py-3 rounded-full flex items-center gap-2.5 transition-colors shadow-sm"
          >
            <FileDown className="w-5 h-5" />
            <span>Book Service / Request Quote</span>
          </button>
          <a
            href={`tel:${(siteSettings?.phone || '+919876543210').replace(/\s+/g, '')}`}
            className="text-[#211D70] font-bold text-sm sm:text-base underline hover:no-underline flex items-center gap-1.5"
          >
            <Phone className="w-4 h-4" />
            <span>Call Dispatch: {siteSettings?.phone || '+91 98765 43210'}</span>
          </a>
        </div>
      </section>

      {/* DEEP NAVY INSTITUTIONAL FOOTER (Matching #211C70 .footer) */}
      <footer className="bg-[#211C70] text-white py-10 px-6 text-xs">
        <div className="max-w-7xl mx-auto space-y-6">
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6 border-b border-white/15 pb-6">
            <div className="space-y-1.5">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-[#F8C72E] flex items-center justify-center text-[#211D70]">
                  <Activity className="w-4 h-4 stroke-[2.5]" />
                </div>
                <h4 className="font-syne font-bold text-white text-base tracking-tight">
                  {siteSettings?.siteName || 'SunMedX'}
                </h4>
              </div>
              <p className="text-xs text-white/80 max-w-md leading-relaxed">
                Accredited biomedical calibration, ICU equipment AMC validation, and clinical engineering education across Mumbai &amp; Maharashtra.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-5 text-xs font-semibold text-white">
              <button onClick={() => handleNavigateTo('#services')} className="hover:text-[#F8C72E] transition-colors">
                Services
              </button>
              <button onClick={() => handleNavigateTo('#catalogue')} className="hover:text-[#F8C72E] transition-colors">
                Equipment Catalogue
              </button>
              <button onClick={() => handleNavigateTo('#academy')} className="hover:text-[#F8C72E] transition-colors">
                Training Academy
              </button>
              <button onClick={() => handleNavigateTo('#tools')} className="hover:text-[#F8C72E] transition-colors">
                Calculators
              </button>
              <button onClick={() => handleNavigateTo('#privacy-policy')} className="hover:text-[#F8C72E] transition-colors">
                Privacy Policy
              </button>
              <button onClick={() => handleNavigateTo('#terms')} className="hover:text-[#F8C72E] transition-colors">
                Terms &amp; Conditions
              </button>
              <button onClick={() => handleNavigateTo('#refund-policy')} className="hover:text-[#F8C72E] transition-colors">
                Refund Policy
              </button>
              <button onClick={() => handleNavigateTo('#calibration-policy')} className="hover:text-[#F8C72E] transition-colors">
                Warranty &amp; NABL
              </button>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 text-white/80">
            <p className="text-center sm:text-left">
              © {new Date().getFullYear()} {siteSettings?.siteName || 'SunMedX'} • Mumbai, Maharashtra • ISO 17025 / NABL Aligned
            </p>
            <div className="flex flex-wrap items-center justify-center gap-4">
              <span className="flex items-center gap-1.5">
                <Phone className="w-3.5 h-3.5 text-[#F8C72E]" />
                {siteSettings?.phone || '+91 98765 43210'}
              </span>
              <span className="flex items-center gap-1.5">
                <Mail className="w-3.5 h-3.5 text-[#F8C72E]" />
                {siteSettings?.email || 'info@sunmedx.in'}
              </span>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
