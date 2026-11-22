import React, { useState, useEffect } from 'react';
import { Search, ShoppingCart, Trash2, X, RefreshCw, CreditCard, Layers, Activity } from 'lucide-react';
import { getDb } from '../services/dataClient';
import { getEffectiveGatewayConfig, isLiveGatewayKeyConfigured, launchRazorpayCheckout } from '../utils/paymentCheckout';
import { Product, CartItem, QuotationRequest, Order, SiteSettings } from '../types';

interface CatalogueProps {
  userId: string;
  userEmail: string;
  cart: CartItem[];
  dispatchCart: React.Dispatch<{ type: string; payload?: any }>;
  siteSettings: SiteSettings | null;
}

export default function Catalogue({ userId, userEmail, cart, dispatchCart, siteSettings }: CatalogueProps) {
  const [products, setProducts] = useState<Product[]>([]);
  const [categories] = useState<string[]>(['All', 'Critical Care', 'Emergency', 'Accessories', 'Testing Tools', 'General Care']);
  const [activeCategory, setActiveCategory] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [failedImages, setFailedImages] = useState<Record<string, boolean>>({});

  const [activeDetailProduct, setActiveDetailProduct] = useState<Product | null>(null);
  const [activeQuoteProduct, setActiveQuoteProduct] = useState<Product | null>(null);
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [showCheckoutModal, setShowCheckoutModal] = useState(false);

  const [hospitalName, setHospitalName] = useState('');
  const [departmentName, setDepartmentName] = useState('ICU / Critical Unit');
  const [contactPerson, setContactPerson] = useState('');
  const [clientPhone, setClientPhone] = useState('');
  const [clientEmail, setClientEmail] = useState(userEmail || '');
  const [requestedCity, setRequestedCity] = useState('Mumbai');
  const [neededQuantity, setNeededQuantity] = useState(1);
  const [urgencyLevel, setUrgencyLevel] = useState<'Low' | 'Medium' | 'High'>('Medium');
  const [quoteNotes, setQuoteNotes] = useState('');

  const [isSubmittingQuote, setIsSubmittingQuote] = useState(false);
  const [isCheckingOut, setIsCheckingOut] = useState(false);
  const [selectedPayMethod, setSelectedPayMethod] = useState<'gateway' | 'upi_neft'>('gateway');
  const [upiUtrRef, setUpiUtrRef] = useState('');
  const [checkoutError, setCheckoutError] = useState('');

  const gatewayConfig = getEffectiveGatewayConfig(siteSettings);

  useEffect(() => {
    const db = getDb();
    const unsub = db.collection('products').onSnapshot((snap: any) => {
      const list: Product[] = [];
      snap.forEach((doc: any) => {
        list.push({ id: doc.id, ...doc.data() });
      });
      setProducts(list);
    });
    return () => unsub();
  }, []);

  const handleOpenQuote = (product: Product) => {
    setActiveQuoteProduct(product);
    setHospitalName('');
    setContactPerson('');
    setQuoteNotes(
      `Hospital requires an official calibration / purchase quotation for ${product.name}, including traceability certifications.`
    );
  };

  const handleAddCartItem = (product: Product) => {
    dispatchCart({ type: 'ADD', payload: product });
    setIsCartOpen(true);
  };

  const handleSubmitQuoteRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!hospitalName || !contactPerson || !clientPhone || !clientEmail) {
      alert('Please fill in all mandatory quotation criteria.');
      return;
    }

    setIsSubmittingQuote(true);
    try {
      const db = getDb();
      const payload: Omit<QuotationRequest, 'id'> = {
        userId: userId || 'anonymous',
        userEmail: clientEmail,
        hospital: hospitalName,
        department: departmentName,
        contact: contactPerson,
        phone: clientPhone,
        email: clientEmail,
        city: requestedCity,
        quantity: Number(neededQuantity),
        deviceModel: activeQuoteProduct?.name || 'Diagnostic Equipment',
        urgency: urgencyLevel,
        notes: quoteNotes,
        status: 'Pending',
        createdAt: new Date().toISOString(),
      };

      await db.collection('quotation_requests').add(payload);
      alert(
        'RFQ Quote enquiry lodged. Our lead calibration engineering office in Mumbai will review model specs and reply within 1–2 hours.'
      );
      setActiveQuoteProduct(null);
    } catch (err: any) {
      alert('Failed to save quote query: ' + err.message);
    } finally {
      setIsSubmittingQuote(false);
    }
  };

  const subtotal = cart.reduce((acc, item) => acc + (item.product.price || 0) * item.quantity, 0);
  const gstPercent = siteSettings?.gstPercent || 18;
  const gstAmount = Math.round(subtotal * (gstPercent / 100));
  const orderTotal = subtotal + gstAmount;

  const handleLaunchRazorpay = async () => {
    if (cart.length === 0) return;
    if (!gatewayConfig.enabled) {
      alert('Online checkout is currently paused by administrator. Please submit an RFQ instead.');
      return;
    }
    setCheckoutError('');
    setSelectedPayMethod(gatewayConfig.provider === 'upi_manual' ? 'upi_neft' : 'gateway');
    setShowCheckoutModal(true);
  };

  const executeSuccessfulCheckout = async (txId: string, methodLabel: string) => {
    setIsCheckingOut(true);
    setCheckoutError('');
    try {
      const db = getDb();
      const orderPayload: Omit<Order, 'id'> = {
        userId: userId || 'anonymous-checkout',
        userEmail: userEmail || 'guest@sunmedx.in',
        items: cart,
        subtotal,
        gstAmount,
        total: orderTotal,
        razorpayPaymentId: txId,
        paymentProvider: gatewayConfig.provider,
        paymentMethod: methodLabel,
        status: 'Paid',
        createdAt: new Date().toISOString(),
      };

      await db.collection('orders').add(orderPayload);
      dispatchCart({ type: 'CLEAR' });
      setIsCartOpen(false);
      setShowCheckoutModal(false);
      setUpiUtrRef('');
    } catch (e: any) {
      setCheckoutError(e.message || 'Order persistence failed.');
    } finally {
      setIsCheckingOut(false);
    }
  };

  const handleConfirmCheckout = async () => {
    setCheckoutError('');
    if (selectedPayMethod === 'upi_neft') {
      const trimmedUtr = upiUtrRef.trim();
      if (!trimmedUtr || trimmedUtr.length < 6) {
        setCheckoutError('Please enter a valid UPI / NEFT UTR reference number (min 6 characters).');
        return;
      }
      await executeSuccessfulCheckout(`UTR-${trimmedUtr}`, 'UPI / Bank Transfer');
      return;
    }

    if (isLiveGatewayKeyConfigured(gatewayConfig)) {
      setIsCheckingOut(true);
      await launchRazorpayCheckout({
        keyId: gatewayConfig.publicKeyId,
        amountInr: orderTotal,
        currency: gatewayConfig.currency,
        merchantName: gatewayConfig.merchantName,
        description: `SunMedX Order (${cart.length} item${cart.length > 1 ? 's' : ''})`,
        prefillEmail: userEmail,
        onSuccess: (paymentId) => {
          executeSuccessfulCheckout(paymentId, 'Razorpay Checkout');
        },
        onError: (msg) => {
          setIsCheckingOut(false);
          setCheckoutError(msg);
        },
      });
      return;
    }

    await executeSuccessfulCheckout(
      `pay_${gatewayConfig.mode.toUpperCase()}_${Math.random().toString(36).substring(2, 9).toUpperCase()}`,
      `${gatewayConfig.provider.toUpperCase()} (${gatewayConfig.mode})`
    );
  };

  const filteredProducts = products.filter(p => {
    const matchesCat = activeCategory === 'All' || p.category === activeCategory;
    const matchesSearch =
      p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.category.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCat && matchesSearch;
  });

  const markImageFailed = (key: string) => {
    setFailedImages(prev => ({ ...prev, [key]: true }));
  };

  return (
    <div className="bg-white text-[#404041] relative page-fade-in">
      {/* Header Banner */}
      <section className="bg-[#EAEAEA] py-10 px-6 border-b border-[#D4D6E2]">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div className="space-y-1.5">
            <div className="bits-section-banner">
              <h1 className="font-syne font-bold text-xl sm:text-2xl tracking-tight">
                Biomedical Equipment Catalogue
              </h1>
            </div>
            <p className="text-sm text-[#211D70] font-medium pt-1">
              NABL-aligned calibration analyzers, monitors, and clinical diagnostic accessories.
            </p>
          </div>

          <div className="relative w-full md:w-80">
            <input
              type="text"
              placeholder="Search equipment or category..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="w-full bg-white border border-[#211D70]/35 text-[#211D70] rounded-lg pl-10 pr-4 py-2.5 text-sm focus:outline-none focus:border-[#F26522] placeholder:text-[#505050]/65"
            />
            <Search className="w-4 h-4 text-[#211D70] absolute left-3.5 top-3" />
          </div>
        </div>
      </section>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8 sm:py-10 space-y-6 sm:space-y-8">
        {/* Category Tabs */}
        <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-none">
          {categories.map(cat => (
            <button
              key={cat}
              onClick={() => setActiveCategory(cat)}
              className={`px-4 py-2 rounded-full text-xs font-bold whitespace-nowrap border transition-colors ${
                activeCategory === cat
                  ? 'bg-[#211D70] border-[#211D70] text-[#F8C72E]'
                  : 'bg-white border-[#D4D6E2] text-[#211D70] hover:border-[#211D70]'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>

        {/* Product Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-6">
          {filteredProducts.map(p => (
            <div
              key={p.id}
              className="bg-white border border-[#211D70]/25 rounded-2xl flex flex-col justify-between overflow-hidden shadow-xs hover:border-[#211D70] transition-colors group"
            >
              <div
                className="relative aspect-[4/3] overflow-hidden cursor-pointer bg-[#F4F5FA] flex items-center justify-center border-b border-[#E6E7EE]"
                onClick={() => setActiveDetailProduct(p)}
              >
                {p.image && !failedImages[p.id] ? (
                  <img
                    src={p.image}
                    alt={p.name}
                    referrerPolicy="no-referrer"
                    onError={() => markImageFailed(p.id)}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                  />
                ) : (
                  <div className="flex flex-col items-center justify-center text-[#505050] gap-1.5 p-4">
                    <Activity className="w-8 h-8 text-[#211D70]/50" />
                    <span className="text-xs font-mono">{p.category}</span>
                  </div>
                )}
                {p.badge && (
                  <span className="absolute top-3 left-3 bg-[#211D70] text-[#F8C72E] text-[11px] font-bold px-2.5 py-0.5 rounded-sm">
                    {p.badge}
                  </span>
                )}
              </div>

              <div className="p-5 flex-1 flex flex-col justify-between space-y-4">
                <div className="space-y-1 cursor-pointer" onClick={() => setActiveDetailProduct(p)}>
                  <span className="text-xs font-mono font-semibold text-[#EA2227]">{p.category}</span>
                  <h3 className="font-syne font-bold text-[#211D70] text-base leading-snug">{p.name}</h3>
                </div>

                <div className="pt-3 border-t border-[#E6E7EE] flex flex-col gap-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-[#505050] font-medium">Unit Price</span>
                    <span className="font-mono text-sm font-bold text-[#211D70] tabular-nums">
                      {p.price ? `Rs ${p.price.toLocaleString()}` : 'Price on Request'}
                    </span>
                  </div>

                  <div className="flex gap-2">
                    <button
                      onClick={() => handleOpenQuote(p)}
                      className="flex-1 py-2 rounded-md border border-[#211D70] text-[#211D70] hover:bg-[#211D70] hover:text-white text-xs font-bold transition-colors"
                    >
                      Request Quote
                    </button>
                    {p.price && (
                      <button
                        onClick={() => handleAddCartItem(p)}
                        aria-label={`Add ${p.name} to cart`}
                        className="py-2 px-3 rounded-md bg-[#F8C72E] hover:bg-[#211D70] hover:text-white text-[#211D70] font-bold text-xs flex items-center justify-center transition-colors"
                      >
                        <ShoppingCart className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Floating Cart Button */}
      {cart.length > 0 && (
        <button
          onClick={() => setIsCartOpen(true)}
          aria-label="Open shopping cart"
          className="fixed bottom-18 right-4 sm:bottom-24 sm:right-6 z-[900] bg-[#F8C72E] hover:bg-[#211D70] hover:text-[#F8C72E] border-2 border-[#211D70] text-[#211D70] p-3.5 rounded-full shadow-2xl flex items-center justify-center hover:scale-105 active:scale-95 transition-all"
        >
          <div className="relative">
            <ShoppingCart className="w-5 h-5 stroke-[2.2]" />
            <span className="absolute -top-2.5 -right-2.5 bg-[#EA2227] text-white text-[11px] font-bold w-5 h-5 rounded-full flex items-center justify-center font-mono tabular-nums">
              {cart.reduce((ct, i) => ct + i.quantity, 0)}
            </span>
          </div>
        </button>
      )}

      {/* Product Detail Modal */}
      {activeDetailProduct && (
        <div className="fixed inset-0 z-[1000] bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-6">
          <div className="bg-white w-full max-w-2xl rounded-xl border-2 border-[#211D70] overflow-y-auto max-h-[92vh] shadow-2xl relative grid grid-cols-1 md:grid-cols-2">
            <div className="h-60 md:h-full bg-[#F4F5FA] flex items-center justify-center">
              {activeDetailProduct.image && !failedImages[activeDetailProduct.id] ? (
                <img
                  src={activeDetailProduct.image}
                  alt={activeDetailProduct.name}
                  referrerPolicy="no-referrer"
                  onError={() => markImageFailed(activeDetailProduct.id)}
                  className="w-full h-full object-cover"
                />
              ) : (
                <Activity className="w-10 h-10 text-[#211D70]/50" />
              )}
            </div>

            <div className="p-6 flex flex-col justify-between space-y-5">
              <div className="space-y-4">
                <div className="flex justify-between items-start gap-3">
                  <div>
                    <span className="text-xs font-mono font-bold text-[#EA2227]">{activeDetailProduct.category}</span>
                    <h3 className="font-syne font-bold text-[#211D70] text-lg leading-snug mt-0.5">
                      {activeDetailProduct.name}
                    </h3>
                  </div>
                  <button
                    onClick={() => setActiveDetailProduct(null)}
                    aria-label="Close product details"
                    className="text-[#505050] hover:text-[#211D70] p-1"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                <p className="text-sm text-[#404041] leading-relaxed">{activeDetailProduct.description}</p>

                <div className="space-y-1.5">
                  <h5 className="text-xs text-[#211D70] font-mono font-bold uppercase">Key Specifications</h5>
                  <ul className="text-xs text-[#404041] space-y-1.5">
                    {activeDetailProduct.features?.map((f, idx) => (
                      <li key={idx} className="flex items-start gap-2">
                        <span className="text-[#F26522] font-bold">•</span>
                        <span>{f}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>

              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-t border-[#E6E7EE] pt-4">
                <span className="font-mono text-sm font-bold text-[#211D70] tabular-nums">
                  {activeDetailProduct.price ? `Rs ${activeDetailProduct.price.toLocaleString()}` : 'Price on Request'}
                </span>
                <div className="flex gap-2">
                  <button
                    onClick={() => {
                      setActiveDetailProduct(null);
                      handleOpenQuote(activeDetailProduct);
                    }}
                    className="flex-1 sm:flex-none py-2 px-3 text-xs border border-[#211D70] rounded-md text-[#211D70] font-bold hover:bg-[#211D70] hover:text-white transition-colors"
                  >
                    Request Quote
                  </button>
                  {activeDetailProduct.price && (
                    <button
                      onClick={() => {
                        setActiveDetailProduct(null);
                        handleAddCartItem(activeDetailProduct);
                      }}
                      className="flex-1 sm:flex-none py-2 px-4 rounded-md bg-[#F8C72E] hover:bg-[#211D70] hover:text-white text-[#211D70] text-xs font-bold transition-colors"
                    >
                      Add to Cart
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Request Quote Modal */}
      {activeQuoteProduct && (
        <div className="fixed inset-0 z-[1000] bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-6">
          <div className="bg-white w-full max-w-lg rounded-xl border-2 border-[#211D70] overflow-y-auto max-h-[92vh] shadow-2xl relative">
            <div className="bg-[#211D70] p-5 flex justify-between items-center text-white">
              <div>
                <h3 className="font-syne font-bold text-white text-base">Request Calibration / Purchase Quote</h3>
                <p className="text-xs text-[#F8C72E] font-mono mt-0.5">{activeQuoteProduct.name}</p>
              </div>
              <button onClick={() => setActiveQuoteProduct(null)} className="text-white/80 hover:text-white p-1">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmitQuoteRequest} className="p-6 space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-[#211D70] mb-1.5">Hospital / Clinic *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Bandra Cardiac Clinic"
                    value={hospitalName}
                    onChange={e => setHospitalName(e.target.value)}
                    className="w-full bg-white border border-[#D4D6E2] text-[#211D70] rounded-lg px-3.5 py-2.5 text-sm focus:outline-none focus:border-[#F26522]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-[#211D70] mb-1.5">Department</label>
                  <input
                    type="text"
                    value={departmentName}
                    onChange={e => setDepartmentName(e.target.value)}
                    className="w-full bg-white border border-[#D4D6E2] text-[#211D70] rounded-lg px-3.5 py-2.5 text-sm focus:outline-none focus:border-[#F26522]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-[#211D70] mb-1.5">Contact Person *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Engineer Ashwin"
                    value={contactPerson}
                    onChange={e => setContactPerson(e.target.value)}
                    className="w-full bg-white border border-[#D4D6E2] text-[#211D70] rounded-lg px-3.5 py-2.5 text-sm focus:outline-none focus:border-[#F26522]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-[#211D70] mb-1.5">Email Address *</label>
                  <input
                    type="email"
                    required
                    value={clientEmail}
                    onChange={e => setClientEmail(e.target.value)}
                    className="w-full bg-white border border-[#D4D6E2] text-[#211D70] rounded-lg px-3.5 py-2.5 text-sm focus:outline-none focus:border-[#F26522]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="sm:col-span-2">
                  <label className="block text-xs font-semibold text-[#211D70] mb-1.5">Phone Number *</label>
                  <input
                    type="tel"
                    required
                    placeholder="+91 9XXXX XXXXX"
                    value={clientPhone}
                    onChange={e => setClientPhone(e.target.value)}
                    className="w-full bg-white border border-[#D4D6E2] text-[#211D70] rounded-lg px-3.5 py-2.5 text-sm focus:outline-none focus:border-[#F26522]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-[#211D70] mb-1.5">Quantity</label>
                  <input
                    type="number"
                    min={1}
                    value={neededQuantity}
                    onChange={e => setNeededQuantity(Number(e.target.value))}
                    className="w-full bg-white border border-[#D4D6E2] text-[#211D70] rounded-lg px-3.5 py-2.5 text-sm font-mono focus:outline-none focus:border-[#F26522]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-[#211D70] mb-1.5">City</label>
                  <input
                    type="text"
                    value={requestedCity}
                    onChange={e => setRequestedCity(e.target.value)}
                    className="w-full bg-white border border-[#D4D6E2] text-[#211D70] rounded-lg px-3.5 py-2.5 text-sm focus:outline-none focus:border-[#F26522]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-[#211D70] mb-1.5">Priority</label>
                  <select
                    value={urgencyLevel}
                    onChange={e => setUrgencyLevel(e.target.value as any)}
                    className="w-full bg-white border border-[#D4D6E2] text-[#211D70] rounded-lg px-3.5 py-2.5 text-sm focus:outline-none focus:border-[#F26522]"
                  >
                    <option value="Low">Low (Routine AMC)</option>
                    <option value="Medium">Medium (Audit Prep)</option>
                    <option value="High">High (ICU Urgent)</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#211D70] mb-1.5">
                  Technical Specifications / Notes
                </label>
                <textarea
                  value={quoteNotes}
                  onChange={e => setQuoteNotes(e.target.value)}
                  rows={2}
                  className="w-full bg-white border border-[#D4D6E2] text-[#211D70] rounded-lg px-3.5 py-2.5 text-sm focus:outline-none focus:border-[#F26522]"
                />
              </div>

              <div className="flex gap-3 justify-end pt-3 border-t border-[#E6E7EE]">
                <button
                  type="button"
                  onClick={() => setActiveQuoteProduct(null)}
                  className="px-4 py-2 rounded-md text-[#404041] font-semibold text-xs hover:bg-[#F4F5FA] border border-[#D4D6E2]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingQuote}
                  className="px-5 py-2 rounded-md bg-[#211D70] hover:bg-black text-[#F8C72E] text-xs font-bold flex items-center gap-1.5"
                >
                  {isSubmittingQuote && <RefreshCw className="w-3.5 h-3.5 animate-spin" />}
                  <span>Submit Quote Request</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Shopping Cart Drawer */}
      {isCartOpen && (
        <div className="fixed inset-0 z-[1000] flex justify-end bg-black/55 backdrop-blur-xs">
          <div className="w-full max-w-md h-full bg-white border-l border-[#D4D6E2] flex flex-col shadow-2xl">
            <div className="p-4 bg-[#211D70] text-white flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <ShoppingCart className="w-5 h-5 text-[#F8C72E]" />
                <h3 className="font-syne font-bold text-white text-sm">Equipment Cart</h3>
              </div>
              <button onClick={() => setIsCartOpen(false)} className="text-white/80 hover:text-white p-1">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-[#F7F8FC]">
              {cart.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-center text-[#505050] text-sm">
                  <Layers className="w-10 h-10 text-[#211D70]/35 mb-3" />
                  <p>Your equipment cart is currently empty.</p>
                </div>
              ) : (
                cart.map(item => (
                  <div
                    key={item.product.id}
                    className="bg-white p-3 rounded-xl border border-[#D4D6E2] flex items-center justify-between gap-3"
                  >
                    {item.product.image && !failedImages[item.product.id] ? (
                      <img
                        src={item.product.image}
                        alt={item.product.name}
                        referrerPolicy="no-referrer"
                        onError={() => markImageFailed(item.product.id)}
                        className="w-12 h-12 object-cover rounded-lg"
                      />
                    ) : (
                      <div className="w-12 h-12 rounded-lg bg-[#EAEAEA] flex items-center justify-center text-[#211D70]">
                        <Activity className="w-5 h-5" />
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <h4 className="font-syne font-bold text-xs text-[#211D70] truncate">{item.product.name}</h4>
                      <span className="text-xs text-[#505050] font-mono font-semibold mt-1 block tabular-nums">
                        Rs {item.product.price?.toLocaleString()} • Qty {item.quantity}
                      </span>
                    </div>
                    <button
                      onClick={() => dispatchCart({ type: 'REMOVE', payload: item.product.id })}
                      aria-label={`Remove ${item.product.name}`}
                      className="text-[#505050] hover:text-[#EA2227] p-1.5 transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))
              )}
            </div>

            {cart.length > 0 && (
              <div className="p-4 bg-white border-t border-[#D4D6E2] space-y-3.5">
                <div className="space-y-1.5 text-xs text-[#505050]">
                  <div className="flex justify-between">
                    <span>Subtotal (excl. tax)</span>
                    <span className="font-mono font-semibold text-[#211D70] tabular-nums">
                      Rs {subtotal.toLocaleString()}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span>GST ({gstPercent}%)</span>
                    <span className="font-mono font-semibold text-[#211D70] tabular-nums">
                      Rs {gstAmount.toLocaleString()}
                    </span>
                  </div>
                  <div className="flex justify-between text-sm pt-2 border-t border-[#E6E7EE] font-bold">
                    <span className="text-[#211D70]">Total Payable</span>
                    <span className="font-mono text-[#211D70] tabular-nums">
                      Rs {orderTotal.toLocaleString()}
                    </span>
                  </div>
                </div>

                <button
                  onClick={handleLaunchRazorpay}
                  className="w-full py-3 rounded-md bg-[#211D70] hover:bg-black text-[#F8C72E] font-bold text-sm text-center transition-colors"
                >
                  Proceed to Checkout
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Checkout Modal */}
      {showCheckoutModal && (
        <div className="fixed inset-0 z-[2000] bg-black/70 backdrop-blur-xs flex items-center justify-center p-4 sm:p-6">
          <div className="bg-white w-full max-w-md rounded-xl border-2 border-[#211D70] p-5 sm:p-6 shadow-2xl space-y-5 text-center max-h-[92vh] overflow-y-auto">
            <div className="w-12 h-12 rounded-xl bg-[#211D70] flex items-center justify-center text-[#F8C72E] mx-auto">
              <CreditCard className="w-6 h-6" />
            </div>

            <div className="space-y-1">
              <h3 className="font-syne font-bold text-[#211D70] text-base">
                {gatewayConfig.merchantName || 'SunMedX Checkout'}
              </h3>
              <p className="text-xs text-[#505050]">
                {gatewayConfig.provider.toUpperCase()} ({gatewayConfig.mode.toUpperCase()}) Authorization
              </p>
              <div className="bg-[#EAEAEA] p-3 rounded-lg border border-[#D4D6E2] font-mono text-[#211D70] text-lg font-bold mt-2 tabular-nums">
                {gatewayConfig.currency === 'USD' ? '$' : 'Rs'} {orderTotal.toLocaleString()}
              </div>
            </div>

            {/* Method Selector */}
            <div className="grid grid-cols-2 gap-2 text-xs">
              <button
                type="button"
                onClick={() => {
                  setSelectedPayMethod('gateway');
                  setCheckoutError('');
                }}
                className={`py-2 px-3 rounded-md border font-semibold transition-colors ${
                  selectedPayMethod === 'gateway'
                    ? 'bg-[#211D70] text-[#F8C72E] border-[#211D70]'
                    : 'bg-white text-[#404041] border-[#D4D6E2]'
                }`}
              >
                Online Gateway
              </button>
              <button
                type="button"
                onClick={() => {
                  setSelectedPayMethod('upi_neft');
                  setCheckoutError('');
                }}
                className={`py-2 px-3 rounded-md border font-semibold transition-colors ${
                  selectedPayMethod === 'upi_neft'
                    ? 'bg-[#211D70] text-[#F8C72E] border-[#211D70]'
                    : 'bg-white text-[#404041] border-[#D4D6E2]'
                }`}
              >
                Direct UPI / NEFT
              </button>
            </div>

            {selectedPayMethod === 'upi_neft' && (
              <div className="text-left bg-[#F4F5FA] border border-[#D4D6E2] rounded-lg p-3.5 space-y-2 text-xs">
                {gatewayConfig.upiVpa && (
                  <div>
                    <span className="font-semibold text-[#211D70]">UPI VPA:</span>{' '}
                    <span className="font-mono text-[#404041]">{gatewayConfig.upiVpa}</span>
                  </div>
                )}
                {gatewayConfig.bankDetails && (
                  <div className="text-[11px] text-[#505050]">{gatewayConfig.bankDetails}</div>
                )}
                <input
                  type="text"
                  placeholder="Enter UPI / NEFT UTR Reference *"
                  value={upiUtrRef}
                  onChange={(e) => setUpiUtrRef(e.target.value)}
                  className="w-full bg-white border border-[#211D70]/30 rounded-md px-3 py-2 text-xs font-mono text-[#211D70]"
                />
              </div>
            )}

            {checkoutError && (
              <p className="text-xs text-[#EA2227] font-medium bg-[#EA2227]/10 border border-[#EA2227]/20 rounded-md p-2">
                {checkoutError}
              </p>
            )}

            <div className="flex gap-2.5">
              <button
                type="button"
                onClick={() => setShowCheckoutModal(false)}
                className="flex-1 py-2.5 border border-[#D4D6E2] text-[#404041] rounded-md text-xs font-semibold hover:bg-[#F4F5FA]"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isCheckingOut}
                onClick={handleConfirmCheckout}
                className="flex-1 py-2.5 bg-[#F8C72E] hover:bg-[#211D70] hover:text-white text-[#211D70] rounded-md text-xs font-bold transition-colors disabled:opacity-50"
              >
                {isCheckingOut ? 'Processing...' : selectedPayMethod === 'upi_neft' ? 'Verify UTR & Place Order' : 'Complete Payment'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
