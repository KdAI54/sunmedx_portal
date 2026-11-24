export interface Testimonial {
  id?: string;
  name: string;
  role: string;
  hospital: string;
  comment: string;
  rating: number;
}

export interface Service {
  id?: string;
  icon: string;
  title: string;
  description: string;
  priceRange: string;
  minPrice: number;
}

export interface Product {
  id?: string;
  name: string;
  price: number | null; // null represents Price on Request
  category: string;
  badge: string;
  description: string;
  image: string;
  features: string[];
  hsnSac?: string;
}

export interface Tool {
  id?: string;
  name: string;
  icon: string;
  category: string;
  color: string;
  isFree: boolean;
  url: string | null;  // null opens inline or a fallback
  order?: number;
}

export interface Course {
  id?: string;
  title: string;
  level: string;
  duration: string;
  language: string;
  price: number;
  isFree?: boolean;
  featured: boolean;
  graphyUrl: string;
}

export interface AcademyTestimonial {
  id?: string;
  name: string;
  collegeOrHospital: string;
  comment: string;
}

export interface AcademyFAQ {
  id?: string;
  question: string;
  answer: string;
}

export interface ValidationTemplate {
  id?: string;
  name: string;
  parameters: ValidationParameter[];
}

export interface ValidationParameter {
  name: string;
  observedValue: string;
  referenceValue: string;
  unit: string;
  tolerance: string;
  passed: boolean;
}

export interface ValidationRecord {
  id?: string;
  userId: string;
  userEmail: string;
  deviceName: string;
  model: string;
  serialNumber: string;
  hospital: string;
  department: string;
  testDate: string;
  validationType: string;
  parameters: ValidationParameter[];
  overallResult: 'PASS' | 'FAIL';
  observations: string;
  recommendations: string;
  photoUrl?: string; // Stored as local base64/mock for compliance and standalone robustness
  createdAt: string;
}

export interface ChatbotQA {
  id?: string;
  question: string;
  answer: string;
}

export interface Announcement {
  id?: string;
  text: string;
  active: boolean;
}

export interface PaymentGatewayConfig {
  enabled: boolean;
  provider: 'razorpay' | 'stripe' | 'upi_manual' | 'sandbox';
  mode: 'test' | 'live';
  publicKeyId: string;
  merchantName: string;
  currency: 'INR' | 'USD';
  companyGstin: string;
  upiVpa: string;
  bankDetails: string;
  acceptedMethods: {
    upi: boolean;
    cards: boolean;
    netbanking: boolean;
    wallet: boolean;
  };
  webhookEndpoint: string;
  lastTestedAt?: string;
  lastTestStatus?: 'passed' | 'simulated' | 'pending';
}

export interface SiteSettings {
  seeded: boolean;
  siteName: string;
  tagline: string;
  phone: string;
  email: string;
  address: string;
  whatsapp: string;
  hours: string;
  academyUrl: string;
  currency: string;
  gstPercent: number;
  chatbotEnabled: boolean;
  paymentKeyId: string;
  paymentGateway?: PaymentGatewayConfig;
  // CMS & Single-Owner White-Label Styling Settings
  logoUrl?: string;
  ownerName?: string;
  ownerEmail?: string;
  ownerPlanId?: SubscriptionTierId;
  customDomain?: string;
  poweredByVisible?: boolean;
  whiteLabelEnabled?: boolean;
  socialAccounts?: {
    linkedin?: string;
    instagram?: string;
    x?: string;
    whatsappChannel?: string;
    youtube?: string;
  };
  themeVariables: {
    colorNavy: string;
    colorCrimson: string;
    colorAmber: string;
    colorGolden: string;
    colorDarkBg: string;
  };
  homepageOrder: string[]; // Order of sections on home page
}

export interface ServiceRequest {
  id?: string;
  userId: string;
  userEmail: string;
  name: string;
  email: string;
  phone: string;
  hospital: string;
  equipment: string;
  serviceType: string;
  date: string;
  city: string;
  notes: string;
  status: 'Pending' | 'In Progress' | 'Completed' | 'Cancelled';
  createdAt: string;
}

export interface QuotationRequest {
  id?: string;
  userId: string;
  userEmail: string;
  hospital: string;
  department: string;
  contact: string;
  phone: string;
  email: string;
  city: string;
  quantity: number;
  deviceModel: string;
  urgency: 'Low' | 'Medium' | 'High';
  notes: string;
  status: 'Pending' | 'Answered' | 'Closed';
  adminResponse?: {
    price: number;
    notes: string;
    respondedAt: string;
  };
  createdAt: string;
}

export interface Order {
  id?: string;
  userId: string;
  userEmail: string;
  items: CartItem[];
  subtotal: number;
  gstAmount: number;
  total: number;
  razorpayPaymentId: string;
  paymentProvider?: string;
  paymentMethod?: string;
  status: 'Paid' | 'Processing' | 'Shipped' | 'Completed';
  createdAt: string;
}

export interface InvoiceLineItem {
  id: string;
  description: string;
  hsnSac: string;
  quantity: number;
  unitPrice: number;
  discountPercent: number;
}

export interface InvoiceDocument {
  id?: string;
  docNumber: string;
  docType: 'Quotation' | 'Tax Invoice';
  issueDate: string;
  dueOrValidDate: string;
  status: 'Draft' | 'Sent' | 'Paid' | 'Overdue';
  clientName: string;
  clientEmail: string;
  clientPhone: string;
  clientOrganization: string;
  clientAddress: string;
  clientGstin?: string;
  issuerName?: string;
  issuerGstin?: string;
  issuerAddress?: string;
  issuerPhone?: string;
  issuerEmail?: string;
  issuerUpiVpa?: string;
  issuerBankDetails?: string;
  sourceRefId?: string;
  sourceType?: 'RFQ' | 'Order' | 'Manual';
  items: InvoiceLineItem[];
  taxMode: 'CGST_SGST' | 'IGST';
  gstPercent: number;
  subtotal: number;
  discountTotal: number;
  taxableAmount: number;
  cgstAmount: number;
  sgstAmount: number;
  igstAmount: number;
  grandTotal: number;
  notes: string;
  terms: string;
  paymentReference?: string;
  createdBy: string;
  createdAt: string;
  updatedAt?: string;
}

export interface CartItem {
  product: Product;
  quantity: number;
}

export interface Message {
  id?: string;
  name: string;
  email: string;
  phone: string;
  subject: string;
  message: string;
  createdAt: string;
}

export interface UserProfile {
  uid: string;
  email: string;
  name: string;
  phone: string;
  hospital: string;
  role: 'customer' | 'client' | 'owner' | 'admin' | 'technician' | 'superadmin';
  accountStatus?: 'active' | 'paused';
  pausedAt?: string;
  pausedReason?: string;
  pausedBy?: string;
  planId?: SubscriptionTierId;
  planStatus?: 'active' | 'expired' | 'trial';
  aiQueriesUsed?: number;
  aiQuotaResetMonth?: string;
  subscriptionExpiresAt?: string;
  createdAt: string;
}

export interface ChangeLog {
  id?: string;
  action: string;
  adminEmail: string;
  details: string;
  timestamp: string;
}

export interface AMCPlan {
  id?: string;
  name: string;
  coveredServices: string[];
  equipmentTypes: string[];
  responseTime: string;
  visitFrequency: string;
  annualPrice: number;
  gstPercent?: number;
}

export interface AMCRequest {
  id?: string;
  hospitalName: string;
  contactPerson: string;
  phone: string;
  email: string;
  equipmentList: string;
  city: string;
  planSelected: string;
  notes: string;
  status: 'Pending' | 'Active' | 'Declined';
  userEmail?: string;
  userId?: string;
  createdAt: string;
}

export interface AMCContract {
  id?: string;
  contractNumber: string;
  userEmail: string;
  userId: string;
  hospitalName: string;
  contactPerson: string;
  phone: string;
  email: string;
  equipmentList: string;
  city: string;
  coveredServices: string[];
  planSelected: string;
  startDate: string;
  endDate: string;
  nextVisitDate: string;
  annualValue: number;
  baseAnnualValue?: number;
  gstPercent?: number;
  gstAmount?: number;
  totalWithGst?: number;
  lastEmailedAt?: string;
  notes?: string;
  status: 'Active' | 'Expired';
  signatureUrl?: string; // base64 customer sign
  createdAt: string;
}

export interface TechnicianJob {
  id?: string;
  serviceRequestId: string;
  technicianId: string;
  technicianName: string;
  technicianEmail: string;
  customerName: string;
  hospital: string;
  equipment: string;
  serviceType: string;
  address: string;
  priority: 'Low' | 'Medium' | 'High';
  status: 'Pending' | 'Travelling' | 'Arrived' | 'In Progress' | 'Completed';
  location?: { lat: number; lng: number };
  report?: {
    workDone: string;
    partsUsed: string;
    observations: string;
    recommendations: string;
    timeTaken: string;
    signature: string; // base64 canvas sign
    photos: string[]; // base64 image array
  };
  createdAt: string;
  lastUpdated: string;
}

export interface WhatsAppTemplate {
  id?: string;
  name: string;
  content: string;
  placeholders: string[];
}

export interface WhatsAppLog {
  id?: string;
  recipient: string;
  message: string;
  status: 'Sent' | 'Failed';
  timestamp: string;
  triggerEvent: string;
}

export interface TranslationSet {
  id?: string;
  language: string; // 'en' | 'hi' | 'mr'
  keys: Record<string, string>;
}

export interface ClientSite {
  id?: string;
  name: string;
  niche: 'Biomedical' | 'Dental' | 'Pharma' | 'Lab' | 'Fitness' | 'Optical';
  domain: string;
  databaseId: string;
  deploymentDate: string;
  planType: 'Basic' | 'Professional' | 'Enterprise';
  monthlyFee: number;
  status: 'Active' | 'Suspended' | 'Pending';
  billingSetupFee: number;
  billingRetainer: number;
  paymentHistory: {
    date: string;
    amount: number;
    status: 'Paid' | 'Unpaid';
  }[];
  nextInvoiceDue: string;
  totalRevenue: number;
}

export interface EquipmentLifecycle {
  id?: string;
  serialNumber: string;
  name: string;
  model: string;
  purchaseDate: string;
  hospital: string;
  totalServicesNum: number;
  maintenanceCost: number;
  calibrationsCompleted: number;
  currentStatus: 'active' | 'decommissioned' | 'under repair';
  estimatedEndOfLife: string;
  lifecycleRecords: {
    date: string;
    type: string;
    notes: string;
    cost: number;
  }[];
}

export interface EmailCampaign {
  id?: string;
  name: string;
  category: string;
  segment: 'all_users' | 'rfq_leads' | 'amc_holders' | 'service_contacts' | 'custom';
  subject: string;
  preheader?: string;
  body: string;
  ctaLabel?: string;
  ctaHash?: string;
  recipients: string[];
  recipientCount: number;
  status: 'Draft' | 'Sent' | 'Prepared';
  deliveryProvider?: string;
  sentAt?: string;
  createdBy: string;
  createdAt: string;
}

export interface SocialPost {
  id?: string;
  platform: 'LinkedIn' | 'Instagram' | 'X' | 'WhatsApp Channel' | 'YouTube';
  title: string;
  caption: string;
  hashtags: string;
  mediaUrl?: string;
  linkedItem?: string;
  scheduledFor?: string;
  status: 'Draft' | 'Scheduled' | 'Published';
  createdBy: string;
  createdAt: string;
}

export type SubscriptionTierId = 'free' | 'pro' | 'enterprise';

export type PlanModuleKey =
  | 'catalogue'
  | 'basicTools'
  | 'aiAdvisor'
  | 'aiFaultTriage'
  | 'amcTracking'
  | 'pdfCertificates'
  | 'priorityDispatch'
  | 'marketingTools';

export interface SubscriptionPlan {
  id: SubscriptionTierId;
  name: string;
  audience: string;
  tagline: string;
  monthlyPriceInr: number;
  annualPriceInr: number;
  aiQueryLimitPerMonth: number; // -1 = unlimited
  maxAmcContracts: number; // -1 = unlimited
  enabledModules: Record<PlanModuleKey, boolean>;
  highlights: string[];
  updatedAt?: string;
}

export interface SubscriptionOrder {
  id?: string;
  userId: string;
  userEmail: string;
  hospitalName: string;
  planId: SubscriptionTierId;
  planName: string;
  billingCycle: 'monthly' | 'annual';
  baseAmount: number;
  gstPercent: number;
  gstAmount: number;
  totalAmount: number;
  paymentProvider: string;
  paymentReference: string;
  status: 'Paid' | 'Pending Verification' | 'Activated By SuperAdmin';
  createdAt: string;
}
