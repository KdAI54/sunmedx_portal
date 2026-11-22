import { getDb } from "../services/dataClient";
import patientMonitorImg from "../assets/images/biomed_patient_monitor_1795323353440.jpg";
import defibrillatorImg from "../assets/images/biomed_defibrillator_1795323353568.jpg";
import ventilatorKitImg from "../assets/images/biomed_ventilator_kit_1795323353608.jpg";
import calibrationAnalyzerImg from "../assets/images/biomed_calibration_analyzer_1795323353494.jpg";
import heroLabImg from "../assets/images/biomed_hero_lab_1795325220383.jpg";
import trainingBenchImg from "../assets/images/biomed_training_bench_1795325220178.jpg";

export const PRODUCT_ASSET_FALLBACKS = {
  monitor: patientMonitorImg,
  defibrillator: defibrillatorImg,
  ventilator: ventilatorKitImg,
  analyzer: calibrationAnalyzerImg,
  heroLab: heroLabImg,
  trainingBench: trainingBenchImg,
};

// System Constants
export const SITE_NAME = "SunMedX";
export const TAGLINE = "Biomedical Services, Equipment Training & Digital Solutions";
export const PHONE = "+91 98765 43210";
export const EMAIL = "info@sunmedx.in";
export const ADDRESS = "Mumbai, Maharashtra, India";
export const WHATSAPP = "+91 98765 43210";
export const HOURS = "Monday to Saturday 9AM to 6PM IST";
export const ACADEMY_URL = "https://sunmedxacademy.graphy.com";
export const CURRENCY = "Rs";
export const GST = 18;

// Institutional Navy, Gold & Light Editorial Palette
export const DEFAULT_NAVY = "#211D70";
export const DEFAULT_CRIMSON = "#EA2227";
export const DEFAULT_AMBER = "#F8C72E";
export const DEFAULT_GOLDEN = "#F8BE15";
export const DEFAULT_DARK_BG = "#211C70";

export const DEFAULT_PAYMENT_GATEWAY = {
  enabled: true,
  provider: 'razorpay' as const,
  mode: 'test' as const,
  publicKeyId: 'rzp_test_GCPKeyHolder99',
  merchantName: 'SunMedX Biomedical India Pvt Ltd',
  currency: 'INR' as const,
  companyGstin: '27AABCS1429B1Z5',
  upiVpa: 'sunmedx.biomed@okicici',
  bankDetails: 'HDFC Bank • Mumbai Andheri West • A/C: 50200048192014 • IFSC: HDFC0000143',
  acceptedMethods: {
    upi: true,
    cards: true,
    netbanking: true,
    wallet: true,
  },
  webhookEndpoint: '/api/payments/webhook',
  lastTestStatus: 'pending' as const,
};

export async function checkAndSeedDatabase(statusCallback?: (msg: string) => void) {
  const db = getDb();
  
  try {
    statusCallback?.("Checking database state...");
    const settingsDoc = await db.collection("site_settings").doc("global").get();
    
    if (settingsDoc.exists && settingsDoc.data()?.seeded) {
      const existingData = settingsDoc.data();
      if (!existingData?.themeVersion || existingData.themeVersion < 3 || !existingData?.paymentGateway) {
        await db.collection("site_settings").doc("global").update({
          themeVersion: 3,
          themeVariables: {
            colorNavy: DEFAULT_NAVY,
            colorCrimson: DEFAULT_CRIMSON,
            colorAmber: DEFAULT_AMBER,
            colorGolden: DEFAULT_GOLDEN,
            colorDarkBg: DEFAULT_DARK_BG,
          },
          ...(!existingData?.paymentGateway
            ? {
                paymentGateway: {
                  ...DEFAULT_PAYMENT_GATEWAY,
                  publicKeyId: existingData?.paymentKeyId || DEFAULT_PAYMENT_GATEWAY.publicKeyId,
                },
              }
            : {}),
        });
      }

      // Migrate legacy external unsplash product images to local bundled studio assets
      const prodSnap = await db.collection("products").get();
      for (const doc of prodSnap.docs || []) {
        const p = doc.data();
        if (typeof p?.image === "string" && p.image.includes("images.unsplash.com")) {
          const nameLower = (p.name || "").toLowerCase();
          let localImg = calibrationAnalyzerImg;
          if (nameLower.includes("monitor") || nameLower.includes("anesthesia")) {
            localImg = patientMonitorImg;
          } else if (nameLower.includes("defib")) {
            localImg = defibrillatorImg;
          } else if (nameLower.includes("ventilator")) {
            localImg = ventilatorKitImg;
          }
          await db.collection("products").doc(doc.id).update({ image: localImg });
        }
      }
      return;
    }
    
    statusCallback?.("Seeding initial medical services...");
    // 1. Services
    const services = [
      {
        icon: "fa-solid fa-gauge-high",
        title: "Medical Device Calibration & NABL Validation",
        description: "Accredited, precision tolerance checking for critical ICU and Operation Theatre equipment according to global NABL standards with instantly readable online report delivery.",
        priceRange: "Rs 2,500 - Rs 15,000",
        minPrice: 2500
      },
      {
        icon: "fa-solid fa-wrench",
        title: "Comprehensive Preventive Maintenance (AMC/CMC)",
        description: "Dedicated bio-tech engineers delivering contract scheduling, proactive component replacements, alignment sweeps, and emergency breakdowns support rounds.",
        priceRange: "Rs 5,000 - Rs 30,000",
        minPrice: 5000
      },
      {
        icon: "fa-solid fa-kit-medical",
        title: "Emergency Diagnostic Repair Support",
        description: "Swift on-site bio-medical service dispatch in Mumbai. Component repairs of high-value sensors, power boards, and mechanical assemblies with maximum uptime warranty.",
        priceRange: "Rs 4,000 - Rs 20,000",
        minPrice: 4000
      },
      {
        icon: "fa-solid fa-graduation-cap",
        title: "Clinical Staff Training & Machine Safety Academy",
        description: "Hands-on instruction certifications on equipment handling, safety safeguards, and vital parameter calibration audits for nurses, doctors, and laboratory assistants.",
        priceRange: "Rs 3,000 - Rs 8,000",
        minPrice: 3000
      },
      {
        icon: "fa-solid fa-hospital-user",
        title: "Hospital Asset Audit & Valuation Consulting",
        description: "Comprehensive audits mapping life cycle, depreciation value, parts availability, and strict compliance scoring matrices for medical regulatory agencies.",
        priceRange: "Rs 15,000 - Rs 50,000",
        minPrice: 15000
      },
      {
        icon: "fa-solid fa-network-wired",
        title: "Digital Biomedical IoT and PACS Integration",
        description: "Deploying medical grade terminal servers, network routers, HL7/DICOM bridges, and wireless telemetry linking bedside systems to centralized electronic records.",
        priceRange: "Rs 10,000 - Rs 45,000",
        minPrice: 10000
      }
    ];
    for (const service of services) {
      await db.collection("services").add(service);
    }

    statusCallback?.("Seeding product catalogue...");
    // 2. Products
    const products = [
      {
        name: "Premium Multi-Para Patient Monitor",
        price: 85000,
        category: "Critical Care",
        badge: "Hot Seller",
        description: "A professional-grade bedside physiological monitor providing high-fidelity tracing of ECG, SpO2, NIBP, Temperature, Respiration, and integrated central clinic networking card.",
        image: patientMonitorImg,
        features: ["12.1-inch High Definition TFT screen", "7-lead ECG synchronous analysis", "Advanced Arrhythmia detection algorithms", "2-hour backup rechargeable lithium battery"]
      },
      {
        name: "Biphasic Defibrillator Trainer Unit",
        price: 120000,
        category: "Emergency",
        badge: "Certified",
        description: "Interactive medical simulator and trainer showing biphasic therapeutic shock triggers, pacing waveforms, complete AED prompts, and customizable clinical scenarios.",
        image: defibrillatorImg,
        features: ["Voice prompts and status displays mimicking real units", "Biphasic charging waveform", "Integrated manual pacer mode controls", "Built-in ECG rhythm simulation keys"]
      },
      {
        name: "Ventilator Circuit Calibration Kit",
        price: 15000,
        category: "Accessories",
        badge: "Essential",
        description: "High-grade silicone tubing extensions, connector arrays, and test lungs for ventilator checking, leakage assessment, and pneumatic compliance validations.",
        image: ventilatorKitImg,
        features: ["Heat-resistant autoclave-safe silicone", "Standard ISO 22mm tapered cuffs", "Supplied with premium 1-Liter reusable test lung", "Compatibility with major clinical ventilator lines"]
      },
      {
        name: "Pulse Oximeter Validation Device",
        price: 45000,
        category: "Testing Tools",
        badge: "NABL Aligned",
        description: "State-of-the-art optical simulation tool generating precise SpO2 values and pulse profiles directly to client pulse oximeters to verify photoelectric calibration curves.",
        image: calibrationAnalyzerImg,
        features: ["Adjustable simulation curves 70% to 100%", "Dual wavelength LED feedback receptor", "Pulse frequency adjustments 30 to 250 bpm", "Sturdy protective silicon bumper frame"]
      },
      {
        name: "Infusion Pump Analyzer (Tester)",
        price: null, // Price on Request
        category: "Testing Tools",
        badge: "Enquire Now",
        description: "Single-channel high-accuracy liquid flow and occlusion pressure sensor for verifying infusion rate, droppage consistency, and alarm points inside medical pumps.",
        image: calibrationAnalyzerImg,
        features: ["Measures accurate flow rates from 0.1 to 1500 mL/h", "High-response internal pressure sensor", "Pre-programmed FDA/ISO testing sequences", "USB output for direct laptop calibration logs"]
      },
      {
        name: "Digital ECG Simulator",
        price: 28000,
        category: "Testing Tools",
        badge: "Compact",
        description: "Microprocessor-controlled 12-lead heart wave simulator outputting perfect normal sinus rhythm, diverse arrhythmias, noise waves, and clinical calibration curves.",
        image: calibrationAnalyzerImg,
        features: ["Full 12-lead simulated diagnostic outputs", "32 pre-set ECG arrhythmia waveforms", "Built-in battery with auto power-off system", "Universal standard snap-adapter button contacts"]
      },
      {
        name: "High-End Anesthesia Workstation",
        price: null, // Price on Request
        category: "Critical Care",
        badge: "Special Delivery",
        description: "Advanced surgical anesthetic agent ventilator system featuring integrated electronic vaporizers, gas flow mixing arrays, and respiratory loops analysis.",
        image: patientMonitorImg,
        features: ["Integrated modern micro-ventilator modes", "Multi-gas sensor array for N2O, O2, Air, and Agents", "Dual vaporizer cassette slot design", "Emergency safety mechanical oxygen override valve"]
      },
      {
        name: "Biomedical Digital Calibration Badge",
        price: 4500,
        category: "Accessories",
        badge: "New Arrival",
        description: "Ultra-small digital temperature and relative humidity tracking sensor logger for diagnostic tool kits, protecting reference instruments in extreme environments.",
        image: ventilatorKitImg,
        features: ["Internal high-capacity non-volatile flash", "Compact magnetic surface mount backing", "NIST traceable sensor verification report", "Wireless Bluetooth smartphone data extraction"]
      }
    ];
    for (const product of products) {
      await db.collection("products").add(product);
    }

    statusCallback?.("Seeding product categories...");
    // 3. Categories
    const categories = ["Critical Care", "Emergency", "Accessories", "Testing Tools", "General Care"];
    for (const cat of categories) {
      await db.collection("categories").add({ name: cat });
    }

    statusCallback?.("Seeding biomedical tools...");
    // 4. Tools (Unique colors)
    const tools = [
      {
        name: "Infusion Rate Calculator",
        icon: "fa-solid fa-business-time",
        category: "Pacing",
        color: "#10B981", // green
        isFree: true,
        url: null,
        order: 1
      },
      {
        name: "Defib Discharge Energy Calc",
        icon: "fa-solid fa-bolt",
        category: "Defib Diagnostics",
        color: "#EF4444", // red
        isFree: true,
        url: null,
        order: 2
      },
      {
        name: "Gas Flow Rate Converter",
        icon: "fa-solid fa-wind",
        category: "Pneumatics",
        color: "#F59E0B", // orange
        isFree: true,
        url: null,
        order: 3
      },
      {
        name: "Ventilator Compliance Calc",
        icon: "fa-solid fa-lungs",
        category: "Pneumatics",
        color: "#3B82F6", // blue
        isFree: true,
        url: null,
        order: 4
      },
      {
        name: "ECG Period to Heart Rate",
        icon: "fa-solid fa-heart-pulse",
        category: "Cardiology",
        color: "#8B5CF6", // purple
        isFree: true,
        url: null,
        order: 5
      },
      {
        name: "Electrical Safety Checklist",
        icon: "fa-solid fa-shield-halved",
        category: "Testing",
        color: "#6366F1", // indigo
        isFree: true,
        url: null,
        order: 6
      },
      {
        name: "Medical Battery Estimator",
        icon: "fa-solid fa-battery-half",
        category: "Diagnostics",
        color: "#F43F5E", // rose
        isFree: true,
        url: null,
        order: 7
      },
      {
        name: "Pressure Transducer Converter",
        icon: "fa-solid fa-clock-rotate-left",
        category: "Pneumatics",
        color: "#14B8A6", // teal
        isFree: true,
        url: null,
        order: 8
      },
      {
        name: "SunMedX Academy Portal",
        icon: "fa-solid fa-graduation-cap",
        category: "Academy",
        color: "#D97706", // gold
        isFree: false,
        url: ACADEMY_URL,
        order: 9
      },
      {
        name: "Oxygen Sensor Lifetime Estimator",
        icon: "fa-solid fa-circle-nodes",
        category: "Testing",
        color: "#059669", // emerald
        isFree: true,
        url: null,
        order: 10
      }
    ];
    for (const tool of tools) {
      await db.collection("tools").add(tool);
    }

    statusCallback?.("Seeding Academy courses...");
    // 5. Featured Academy Courses
    const courses = [
      {
        title: "Advanced Biomedical Equipment Calibration Protocols",
        level: "Intermediate",
        duration: "8 Weeks",
        language: "English",
        price: 4999,
        isFree: false,
        featured: true,
        graphyUrl: `${ACADEMY_URL}/courses/advanced-calibration`
      },
      {
        title: "ICU Ventilator Maintenance & Troubleshooting Masterclass",
        level: "Advanced",
        duration: "6 Weeks",
        language: "English/Hindi",
        price: 6499,
        isFree: false,
        featured: true,
        graphyUrl: `${ACADEMY_URL}/courses/ventilator-maintenance`
      },
      {
        title: "Patient Monitoring Security & Core Software Systems",
        level: "Beginner",
        duration: "4 Weeks",
        language: "English",
        price: 3500,
        isFree: false,
        featured: true,
        graphyUrl: `${ACADEMY_URL}/courses/monitor-security`
      },
      {
        title: "Essential Electrical Safety in Healthcare Setups",
        level: "Beginner",
        duration: "2 Weeks",
        language: "English/Hindi",
        price: 0,
        isFree: true,
        featured: false,
        graphyUrl: `${ACADEMY_URL}/courses/basic-electrical-safety`
      }
    ];
    for (const c of courses) {
      await db.collection("academy_courses").add(c);
    }

    statusCallback?.("Seeding testimonials and FAQs...");
    // 6. Testimonials (5 Mumbai references)
    const testimonials = [
      {
        name: "Dr. Rajesh Mehta",
        role: "Head of Cardiology",
        hospital: "Mumbai Heart Hospital, South Mumbai",
        comment: "SunMedX keeps our critical cardiac monitors and pacing trainers validated and configured perfectly. Their team responds instantly to high-alert requests.",
        rating: 5
      },
      {
        name: "Sister Teresa D'Souza",
        role: "Nursing Superintendent",
        hospital: "Holy Family Medical Center, Bandra",
        comment: "We enrolled our clinical assistants in SunMedX Academy's device handling course. The medical safety incident rate inside our wards dropped to nearly zero.",
        rating: 5
      },
      {
        name: "Ashwin Shah",
        role: "Biomedical Director",
        hospital: "Naman Diagnostics, Andheri East",
        comment: "Outstanding precision in calibrating our heavy diagnostic arrays. The PDF calibration certificates delivered instantly online are detailed and fully NABL aligned.",
        rating: 5
      },
      {
        name: "Dr. Priya Rao",
        role: "Chief Medical Officer",
        hospital: "Lilavati Care & Research Clinic",
        comment: "When our portable ICU ventilator glitched, SunMedX technicians were on-site under an hour. Outstanding response and transparent billing metrics.",
        rating: 5
      },
      {
        name: "Dr. Anil Deshmukh",
        role: "Lead Anaesthetist",
        hospital: "KEM Hospital Associate Clinic",
        comment: "Rigorous attention to detail on anesthesia gas calibrations. Their customized testing templates are exactly what modern healthcare audit standards demand.",
        rating: 5
      }
    ];
    for (const t of testimonials) {
      await db.collection("testimonials").add(t);
    }

    // 7. Academy Testimonials
    const academyTestimonials = [
      {
        name: "Rahul Patil",
        collegeOrHospital: "Biomedical Engineer, Reliance Foundation Hospital",
        comment: "The advanced ventilator validation module and hands-on drills gave me the confidence to handle high-risk cardiac ICU breakdowns."
      },
      {
        name: "Sanya Iyer",
        collegeOrHospital: "Final Year Student, IIT Bombay Biomedical Dept",
        comment: "Graphy portal curriculum was structured beautifully. The step-by-step videos on multi-para monitor diagnostics helped me clear my corporate recruitment."
      },
      {
        name: "Jayesh Salgaonkar",
        collegeOrHospital: "Freelance Calibration Specialist, Mumbai",
        comment: "A gold standard of teaching. I learned how to draft NABL-compliant validation checklists. My consulting clients grew exponentially after certification."
      }
    ];
    for (const at of academyTestimonials) {
      await db.collection("academy_testimonials").add(at);
    }

    // 8. Academy FAQs
    const faq = [
      {
        question: "Is SunMedX Academy affiliate with Graphy?",
        answer: "Yes! Our course content, student portal, video playback, and quiz assessments are securely hosted on Graphy, ensuring lag-free mobile streaming and instant digital certification."
      },
      {
        question: "How do I get my certification?",
        answer: "Upon finishing all class modules and passing the digital calibration scenario quiz (with minimum 70%), your certificate is instantly generated with a unique QR code verify link."
      },
      {
        question: "Are there practical worksheets provided?",
        answer: "Yes, every course comes with physical calibration templates, calibration tolerances checklists, and reference values sheets that you can print out for hospital visits."
      },
      {
        question: "Can I access courses if I'm in another city?",
        answer: "Totally! The courses are 100% online. You can stream lectures on-demand from any location in India on your computer or mobile device."
      },
      {
        question: "Is there discount pricing for hospital clinical teams?",
        answer: "Yes indeed! We offer bulk licenses for hospital groups wishing to train their complete nursing or biomedical engineering divisions. Reach out via the Contact Form."
      }
    ];
    for (const f of faq) {
      await db.collection("academy_faqs").add(f);
    }

    statusCallback?.("Seeding device validation templates...");
    // 9. Validation Templates
    const templates = [
      {
        name: "Defibrillator Standard Validation",
        parameters: [
          { name: "Surg-Charge Waveform Time", observedValue: "", referenceValue: "< 5.0", unit: "Seconds", tolerance: "Max 5s", passed: true },
          { name: "Energy Discharge Error @ 200J", observedValue: "", referenceValue: "200.0", unit: "Joules", tolerance: "± 4J", passed: true },
          { name: "Pacer Sync Target Rate", observedValue: "", referenceValue: "60.0", unit: "PPM", tolerance: "± 2ppm", passed: true },
          { name: "Chassis Leakage Current", observedValue: "", referenceValue: "< 100", unit: "µA", tolerance: "Max 100µA", passed: true }
        ]
      },
      {
        name: "ICU Ventilator Pneumatic Validation",
        parameters: [
          { name: "Deliver Tidal Volume (V_t) @ 500ml", observedValue: "", referenceValue: "500.0", unit: "mL", tolerance: "± 50mL", passed: true },
          { name: "Inspiratory Peak Pressure (PIP)", observedValue: "", referenceValue: "20.0", unit: "cmH2O", tolerance: "± 2 cmH2O", passed: true },
          { name: "PEEP Mechanical Stabilization", observedValue: "", referenceValue: "5.0", unit: "cmH2O", tolerance: "± 1 cmH2O", passed: true },
          { name: "Oxygen Delivery Concentration FiO2 @ 40%", observedValue: "", referenceValue: "40.0", unit: "%", tolerance: "± 3%", passed: true }
        ]
      },
      {
        name: "Base Multi-Para Monitor Validation",
        parameters: [
          { name: "ECG Heart Rate Simulation Test", observedValue: "", referenceValue: "60.0", unit: "BPM", tolerance: "± 2bpm", passed: true },
          { name: "Pulse Oximetry SpO2 Simulation @ 98%", observedValue: "", referenceValue: "98.0", unit: "%", tolerance: "± 2%", passed: true },
          { name: "NIBP Simulated Pressure (Sys/Dia) @ 120/80", observedValue: "", referenceValue: "120 / 80", unit: "mmHg", tolerance: "± 4mmHg", passed: true },
          { name: "Bedside Temperature Probe Test @ 37°C", observedValue: "", referenceValue: "37.0", unit: "°C", tolerance: "± 0.2°C", passed: true }
        ]
      }
    ];
    for (const t of templates) {
      await db.collection("validation_templates").add(t);
    }

    statusCallback?.("Seeding AI Chatbot Q&As...");
    // 10. 20 Chatbot Q&A Pairs
    const qaPairs = [
      { question: "hello", answer: "Greetings, Sir or Madam. I am the SunMedX AI Biomedical Assistant. How may I assist you with your equipment validation, calibration, or training questions today?" },
      { question: "hi", answer: "Greetings, Sir or Madam. I am the SunMedX AI Biomedical Assistant. How may I assist you with your equipment validation, calibration, or training questions today?" },
      { question: "who are you", answer: "I am SunMedX AI, a specialized biomedical services virtual advisor. I assist clients, doctors, and engineers with clinical equipment validation, AMC bookings, and course registrations." },
      { question: "what is sunmedx", answer: "SunMedX is a leading biomedical services brand based in Mumbai, India. We specialize in NABL-aligned medical device calibration, validation testing, hospital equipment asset management, and biomedical safety courses." },
      { question: "where are you located", answer: "Our main administrative office and medical calibration facilities are located in Mumbai, Maharashtra, India. We deliver on-site testing rounds across the state." },
      { question: "contact details", answer: `Our contact number is ${PHONE}, and email is ${EMAIL}. Feel free to contact us via WhatsApp at ${WHATSAPP}, Sir or Madam.` },
      { question: "phone number", answer: `You can call us directly at ${PHONE} or reach our emergency engineering desk, Sir/Madam.` },
      { question: "email address", answer: `Our official correspondence email is ${EMAIL} for corporate sales, RFPs, and academic support.` },
      { question: "whatsapp", answer: `Our real-time messaging link is active at ${WHATSAPP} for instant photo updates of error codes or quotes.` },
      { question: "service hours", answer: `Our operation desk runs ${HOURS}. Critical care AMC clients receive 24x7 emergency backup, Sir or Madam.` },
      { question: "gst", answer: `All services and equipment invoices carry standard ${GST}% GST. Clean tax invoices are provided for audit claims.` },
      { question: "calibration prices", answer: "Our professional on-site calibration services begin at Rs 2,500 upwards depending on the precision of standard logs and sensor types involved." },
      { question: "book service", answer: "To book a calibration or preventive sweep, please head over to the 'Services' tab, select your required option, and fill out our Book Service form. We will coordinate a visit schedule." },
      { question: "academy courses", answer: "Our courses are hosted on SunMedX Academy at https://sunmedxacademy.graphy.com. Topics include ventilator maintenance, multi-para monitors calibration, and clinical safety standards." },
      { question: "how to pay", answer: "We support secure payments via credit cards, net banking, UPI, and wallets powered by Razorpay. Admin-sent quotes can be accepted and paid right from your Customer Portal." },
      { question: "how to get calibration report", answer: "Once our engineer completes testing, your validation logs are compiled and saved. Logged-in customers can view and download authorized PDF reports in the 'My Validation Records' tab inside the Customer Portal." },
      { question: "nabl", answer: "We follow NABL (National Accreditation Board for Testing and Calibration Laboratories) ISO 17025 guidelines, utilizing master calibrators with valid national certificates of traceability." },
      { question: "what equipment do you validate", answer: "We validate a wide range of devices: ICU Ventilators, Biphasic Defibrillators, Patient Monitors, ECG machines, Infusion/Syringe Pumps, Anesthesia units, and baby warmers, Sir or Madam." },
      { question: "refund policy", answer: "For training academy classes, cancellations inside 48 hours receive a full refund. Equipment service payments can be re-routed to alternative repair logs if the machine is declared obsolete." },
      { question: "emergency help", answer: "For high-priority clinical breakdown emergencies, please telephone our dedicated Mumbai engineering helpline directly at +91 98765 43210 for immediate service dispatcher mobilization, Sir or Madam." }
    ];
    for (const q of qaPairs) {
      await db.collection("chatbot_qa").add(q);
    }

    statusCallback?.("Seeding site settings and announcement...");
    // 11. Custom site announcement
    await db.collection("announcements").doc("current").set({
      text: "📢 Special Monsoon Calibration Drive: Optimize your hospital's ICU ventilators with NABL-aligned accuracy. Enjoy 15% off on bulk AMC bookings in Maharashtra this month!",
      active: true
    });

    // 12. Default Site Settings & Theme (CMS config)
    const defaultSettings = {
      seeded: true,
      themeVersion: 3,
      siteName: SITE_NAME,
      tagline: TAGLINE,
      phone: PHONE,
      email: EMAIL,
      address: ADDRESS,
      whatsapp: WHATSAPP,
      hours: HOURS,
      academyUrl: ACADEMY_URL,
      currency: CURRENCY,
      gstPercent: GST,
      chatbotEnabled: true,
      paymentKeyId: "rzp_test_GCPKeyHolder99", // Public publishable key ID
      paymentGateway: DEFAULT_PAYMENT_GATEWAY,
      logoUrl: "",
      themeVariables: {
        colorNavy: DEFAULT_NAVY,
        colorCrimson: DEFAULT_CRIMSON,
        colorAmber: DEFAULT_AMBER,
        colorGolden: DEFAULT_GOLDEN,
        colorDarkBg: DEFAULT_DARK_BG
      },
      homepageOrder: ["hero", "stats", "services_preview", "academy_preview", "tools_preview", "testimonials"]
    };
    await db.collection("site_settings").doc("global").set(defaultSettings);

    statusCallback?.("Seeding AMC Plans...");
    const amcPlans = [
      {
        name: "Premium ICU Plan",
        coveredServices: ["Defibrillator Testing", "Ventilator Calibrations", "Multi-Para Bedside Monitors Sweep", "Electrical Safety Certification"],
        equipmentTypes: ["Critical ICU Care Monitors", "Ventilators", "Defibrillators"],
        responseTime: "Under 2 Hours in Mumbai",
        visitFrequency: "Monthly regular testing checks + 24/7 Breakdown emergency visits",
        annualPrice: 28999
      },
      {
        name: "Standard Diagnostics Plan",
        coveredServices: ["ECG Sine Wave Verification", "Infusion Pumps rates calibration", "Standard safety clearance certificate"],
        equipmentTypes: ["ECG Machines", "Infusion Pumps", "Oxygen Concentrators"],
        responseTime: "Under 6 Hours",
        visitFrequency: "Quarterly alignment sweeps + 3 Breakdown free calls",
        annualPrice: 14500
      },
      {
        name: "Clinic Care Plan",
        coveredServices: ["Digital Thermometer tolerance", "Relative Humidity sensor validation", "Basic calibration certificate"],
        equipmentTypes: ["BP Apparatus", "Pulse Oximeters", "Electronic Weighing Scales"],
        responseTime: "Under 12 Hours",
        visitFrequency: "Bi-annual audits + 1 Emergency breakdown call",
        annualPrice: 6500
      }
    ];
    for (const plan of amcPlans) {
      await db.collection("amc_plans").add(plan);
    }

    statusCallback?.("Seeding sample AMC requests and contracts...");
    // Future date helper
    const getFutureDateStr = (daysAhead: number) => {
      const d = new Date();
      d.setDate(d.getDate() + daysAhead);
      return d.toISOString().split('T')[0];
    };
    const getPastDateStr = (daysAgo: number) => {
      const d = new Date();
      d.setDate(d.getDate() - daysAgo);
      return d.toISOString().split('T')[0];
    };

    const sampleAMCRequest = {
      hospitalName: "Bandra Hope Clinic",
      contactPerson: "Dr. Sandeep Nair",
      phone: "+91 98888 77777",
      email: "client@sunmedx.in",
      equipmentList: "2 Ventilator Units, 1 Biphasic Defib Simulator",
      city: "Mumbai",
      planSelected: "Premium ICU Plan",
      notes: "Need immediate integration within the upcoming Monday cycle.",
      status: "Pending",
      userEmail: "client@sunmedx.in",
      userId: "sm-client-99abc",
      createdAt: new Date().toISOString()
    };
    await db.collection("amc_requests").add(sampleAMCRequest);

    const activeContracts = [
      {
        contractNumber: "AMC-2026-009A",
        userEmail: "client@sunmedx.in",
        userId: "sm-client-99abc",
        hospitalName: "Bandra Hope Clinic",
        contactPerson: "Dr. Sandeep Nair",
        phone: "+91 98888 77777",
        email: "client@sunmedx.in",
        equipmentList: "3 Multi-Para Patient Monitors, 1 Infusion Flow Tester",
        city: "Mumbai",
        coveredServices: ["Defibrillator Testing", "Ventilator Calibrations", "Multi-Para Bedside Monitors Sweep"],
        planSelected: "Premium ICU Plan",
        startDate: getPastDateStr(150),
        endDate: getFutureDateStr(215), // Safe long expiring
        nextVisitDate: getFutureDateStr(12),
        annualValue: 28999,
        status: "Active",
        createdAt: getPastDateStr(150)
      },
      {
        contractNumber: "AMC-2026-042B",
        userEmail: "client@sunmedx.in",
        userId: "sm-client-99abc",
        hospitalName: "Sion Medical Center",
        contactPerson: "Sister Rosy Paul",
        phone: "+91 91111 22222",
        email: "client@sunmedx.in",
        equipmentList: "2 Diagnostic ECG Recorders",
        city: "Mumbai",
        coveredServices: ["ECG Sine Wave Verification", "Standard safety clearance certificate"],
        planSelected: "Standard Diagnostics Plan",
        startDate: getPastDateStr(350),
        endDate: getFutureDateStr(15), // Expiring in 15 days (triggers 30-day overview flag)
        nextVisitDate: getFutureDateStr(6),
        annualValue: 14500,
        status: "Active",
        createdAt: getPastDateStr(350)
      }
    ];
    for (const contract of activeContracts) {
      await db.collection("amc_contracts").add(contract);
    }

    statusCallback?.("Seeding default WhatsApp Templates...");
    const waTemplates = [
      { name: "order_placed", content: "Hello {customer_name}, your order #{order_id} of Rs {amount} has been successfully placed. Thank you for choosing SunMedX!", placeholders: ["customer_name", "order_id", "amount"] },
      { name: "quote_response_ready", content: "Hello {customer_name}, the quote request for your equipment {equipment} is ready with estimate Rs {amount}. Please review details in Client Hub.", placeholders: ["customer_name", "equipment", "amount"] },
      { name: "technician_assigned", content: "Hello {customer_name}, Field Engineer {tech_name} ({tech_phone}) has been dispatched for your service request #{request_id}. Track live on portal.", placeholders: ["customer_name", "tech_name", "tech_phone", "request_id"] },
      { name: "job_completed", content: "Hello {customer_name}, validation/repair job on equipment {equipment} has been completed by {tech_name}. Report and invoice are ready for download.", placeholders: ["customer_name", "equipment", "tech_name"] },
      { name: "amc_renewal_due", content: "Hello {customer_name}, your AMC contract is expiring in 30 days. Please accept renewal to avoid downtime.", placeholders: ["customer_name"] },
      { name: "invoice_generated", content: "Hello {customer_name}, an invoice of Rs {amount} is generated for order/contract #{ref_id}. Paid via Razorpay successfully.", placeholders: ["customer_name", "amount", "ref_id"] }
    ];
    for (const temp of waTemplates) {
      await db.collection("whatsapp_templates").add(temp);
    }

    statusCallback?.("Seeding Equipment Lifecycles...");
    const lifecycles = [
      {
        serialNumber: "SN-VNT-9104",
        name: "Premium Multi-Para Patient Monitor",
        model: "S-540 Ultra",
        purchaseDate: "2023-01-15",
        hospital: "Bandra Hope Clinic",
        totalServicesNum: 4,
        maintenanceCost: 12500,
        calibrationsCompleted: 3,
        currentStatus: "active",
        estimatedEndOfLife: "2030-01-15",
        lifecycleRecords: [
          { date: "2023-01-15", type: "Installation", notes: "First-time setup completed by SunMedX Senior Engineer.", cost: 0 },
          { date: "2024-01-12", type: "Yearly Calibration", notes: "NABL traceable verification completed. Passed.", cost: 2500 },
          { date: "2025-01-15", type: "Pneumatic Repair", notes: "Pressure sensor alignment drift fixed during preventive round.", cost: 7500 },
          { date: "2026-01-10", type: "Yearly Calibration", notes: "Calibrated device successfully within toleration margins.", cost: 2500 }
        ]
      },
      {
        serialNumber: "SN-DEF-3342",
        name: "Biphasic Defibrillator Trainer Unit",
        model: "B-200X trainer",
        purchaseDate: "2024-08-20",
        hospital: "Sion Medical Center",
        totalServicesNum: 2,
        maintenanceCost: 4000,
        calibrationsCompleted: 1,
        currentStatus: "active",
        estimatedEndOfLife: "2029-08-20",
        lifecycleRecords: [
          { date: "2024-08-22", type: "Installation", notes: "Synchronized trainer and simulated AED voice lines. Handover completed.", cost: 0 },
          { date: "2025-08-20", type: "Yearly Calibration", notes: "Verified discharge waveforms @ 200J. Passed standard threshold tests.", cost: 4000 }
        ]
      }
    ];
    for (const cycle of lifecycles) {
      await db.collection("equipment_lifecycle").add(cycle);
    }

    statusCallback?.("Seeding White Label Templates...");
    const nicheTemplates = [
      { niche: "Biomedical", themeVariables: { colorNavy: "#111827", colorCrimson: "#0EA5E9", colorAmber: "#2DD4BF" }, siteName: "SunMedX Biomedical", tagline: "Biomedical Service, Calibration, & Clinical Engineering" },
      { niche: "Dental", themeVariables: { colorNavy: "#0B2447", colorCrimson: "#00D2FC", colorAmber: "#4E4F50" }, siteName: "DentaShield", tagline: "Precision Dental Autoclave & Chair Calibrations" },
      { niche: "Pharma", themeVariables: { colorNavy: "#1B4D3E", colorCrimson: "#E5F7F4", colorAmber: "#8EE4AF" }, siteName: "PharmaCold", tagline: "Traceable Vaccine Refrigerator Temperature Auditing" },
      { niche: "Lab", themeVariables: { colorNavy: "#2D1B4E", colorCrimson: "#FF007F", colorAmber: "#7F00FF" }, siteName: "LabGlow", tagline: "Centrifuge Speed and Optical Validation Systems" },
      { niche: "Fitness", themeVariables: { colorNavy: "#121212", colorCrimson: "#FF2E63", colorAmber: "#EAEAEA" }, siteName: "FitPhysio", tagline: "Dynamic Biomechanical Treadmill and Stress Load Calibrations" },
      { niche: "Optical", themeVariables: { colorNavy: "#0F2027", colorCrimson: "#203A43", colorAmber: "#2C5364" }, siteName: "OptiSweep", tagline: "Precision Keratometer & Lens Refractor Servicing" }
    ];
    for (const temp of nicheTemplates) {
      await db.collection("niche_templates").add(temp);
    }

    statusCallback?.("Seeding authorization seed profile users...");
    const defaultSecures = [
      { uid: "sm-admin-uid", email: "admin@sunmedx.in", name: "SunMedX Administrator", phone: "+91 99999 00000", hospital: "SunMedX Headquarters", role: "admin", createdAt: new Date().toISOString() },
      { uid: "sm-tech-uid", email: "tech@sunmedx.in", name: "Rohan Deshmukh", phone: "+91 98333 44444", hospital: "SunMedX Senior Engineer", role: "technician", createdAt: new Date().toISOString() },
      { uid: "sm-super-uid", email: "superadmin@sunmedx.in", name: "SuperAdmin Platform Manager", phone: "+91 99999 11111", hospital: "Platform Headquarters", role: "superadmin", createdAt: new Date().toISOString() },
      { uid: "sm-krishna-uid", email: "krishnadigitalai@gmail.com", name: "Krishna SuperAdmin", phone: "+91 99999 22222", hospital: "Platform Headquarters", role: "superadmin", createdAt: new Date().toISOString() },
      { uid: "sm-client-uid", email: "client@sunmedx.in", name: "Dr. Sandeep Nair", phone: "+91 98888 77777", hospital: "Bandra Hope Clinic", role: "customer", createdAt: new Date().toISOString() }
    ];
    for (const secUser of defaultSecures) {
      await db.collection("users").doc(secUser.uid).set(secUser);
    }

    statusCallback?.("Seeding completed successfully!");
  } catch (error) {
    console.error("Error seeding initial data:", error);
    statusCallback?.(`Seeding failed: ${error}`);
  }
}
