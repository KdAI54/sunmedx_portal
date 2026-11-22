import { getDb } from '../services/dataClient';

export type LanguageCode = 'en' | 'hi' | 'mr';

export const fallbackTranslations: Record<LanguageCode, Record<string, string>> = {
  en: {
    'nav_home': 'Home',
    'nav_services': 'Services',
    'nav_catalogue': 'Catalogue',
    'nav_academy': 'Academy',
    'nav_calculators': 'Smart Calculators',
    'nav_about': 'About',
    'nav_client_hub': 'Client Hub',
    'hero_title': 'Precision Biomedical Service & Calibration Excellence',
    'hero_subtitle': 'NABL Traceable Diagnostics, Hospital Asset Management and Training Academy in Mumbai.',
    'btn_request_service': 'Request Calibration / Repair Service',
    'btn_browse_catalogue': 'Browse Equipment Catalogue',
    'stats_trusted': 'Hospital Clients',
    'stats_calibrated': 'Systems Calibrated',
    'stats_experience': 'Response Frame',
    'stats_engineers': 'Certified Bio-Engineers',
    'diagnose_title': 'AI Fault Diagnosis Assistant',
    'diagnose_desc': 'Instantly query equipment issues, error codes, and get resolution checklists powered by Gemini AI.',
    'services_heading': 'Our Biomedical Engineering Care Systems',
    'services_subheading': 'NABL-traceable diagnostic solutions protecting critical OT & ICU infrastructure.',
    'amc_title': 'Annual Maintenance Contracts (AMC) Manager',
    'amc_desc': 'Ensure 100% equipment uptime with certified annual checklists, alignment rounds, and priority breakdown support.',
    'lifecycle_title': 'Medical Equipment Life Cycle Records Tracker',
    'lifecycle_desc': 'Trace maintenance summaries, purchase logs, total costs, and compliance scores by serial number.',
    'scan_qr_desc': 'Scan QR tags or enter custom serial numbers to view detailed public health sheets.'
  },
  hi: {
    'nav_home': 'मुख्य पृष्ठ',
    'nav_services': 'सेवाएं',
    'nav_catalogue': 'कैटलॉग',
    'nav_academy': 'अकादमी',
    'nav_calculators': 'स्मार्ट कैलकुलेटर',
    'nav_about': 'हमारे बारे में',
    'nav_client_hub': 'ग्राहक हब',
    'hero_title': 'सटीक बायोमेडिकल सेवा और अंशांकन उत्कृष्टता',
    'hero_subtitle': 'मुंबई में एनएबीएल ट्रैसेबल डायग्नोस्टिक्स, अस्पताल संपत्ति प्रबंधन और प्रशिक्षण अकादमी।',
    'btn_request_service': 'कैलिब्रेशन / मरम्मत सेवा का अनुरोध करें',
    'btn_browse_catalogue': 'उपकरण कैटलॉग ब्राउज़ करें',
    'stats_trusted': 'अस्पताल के ग्राहक',
    'stats_calibrated': 'सिस्टम कैलिब्रेटेड',
    'stats_experience': 'प्रतिक्रिया समय',
    'stats_engineers': 'प्रमाणित बायो-इंजीनियर',
    'diagnose_title': 'एआई दोष निदान सहायक',
    'diagnose_desc': 'जेमिनी एआई द्वारा संचालित उपकरण समस्याओं, त्रुटि कोडों और समाधान जांच सूची की तुरंत जांच करें।',
    'services_heading': 'बायोमेडिकल इंजीनियरिंग प्रणालियां',
    'services_subheading': 'महत्वपूर्ण ओटी और आईसीयू बुनियादी ढांचे की रक्षा करने वाले एनएबीएल-ट्रैसेबल समाधान।',
    'amc_title': 'वार्षिक रखरखाव अनुबंध (AMC) प्रबंधक',
    'amc_desc': 'प्रमाणित वार्षिक चेकलिस्ट, संरेखण दौर और प्राथमिकता ब्रेकडाउन समर्थन के साथ 100% उपकरण अपटाइम सुनिश्चित करें।',
    'lifecycle_title': 'चिकित्सा उपकरण जीवन चक्र रिकॉर्ड ट्रैकर',
    'lifecycle_desc': 'क्रम संख्या द्वारा रखरखाव सारांश, खरीद लॉग, कुल लागत और अनुपालन स्कोर को ट्रैक करें।',
    'scan_qr_desc': 'विस्तृत सार्वजनिक स्वास्थ्य पत्रक देखने के लिए क्यूआर टैग स्कैन करें या कस्टम क्रम संख्या दर्ज करें।'
  },
  mr: {
    'nav_home': 'मुख्य पृष्ठ',
    'nav_services': 'सेवा',
    'nav_catalogue': 'कॅटलॉग',
    'nav_academy': 'अकादमी',
    'nav_calculators': 'स्मार्ट कॅल्क्युलेटर',
    'nav_about': 'आमच्याबद्दल',
    'nav_client_hub': 'ग्राहक हब',
    'hero_title': 'अचूक बायोमेडिकल सेवा आणि कॅलिब्रेशन उत्कृष्टता',
    'hero_subtitle': 'मुंबईत एनएबीएल ट्रैसेबल डायग्नोस्टिक्स, हॉस्पिटल मालमत्ता व्यवस्थापन आणि प्रशिक्षण अकादमी।',
    'btn_request_service': 'कॅलिब्रेशन / दुरुस्ती सेवेची विनंती करा',
    'btn_browse_catalogue': 'उपकरणे कॅटलॉग ब्राउझ करा',
    'stats_trusted': 'रुग्णालय ग्राहक',
    'stats_calibrated': 'सिस्टम कॅलिब्रेटेड',
    'stats_experience': 'प्रतिसाद वेळ',
    'stats_engineers': 'प्रमाणित बायो-इंजिनिअर',
    'diagnose_title': 'एआय दोष निदान सहाय्यक',
    'diagnose_desc': 'जेमिनी एआय द्वारे समर्थित उपकरण समस्या, त्रुटी कोड आणि निराकरण चेकलिस्ट त्वरित तपासा।',
    'services_heading': 'बायोमेडिकल इंजिनिअरिंग केअर सिस्टम्स',
    'services_subheading': 'क्रिटिकल ओटी आणि आयसीयू इन्फ्रास्ट्रक्चरचे संरक्षण करणारे एनएबीएल-ट्रैसेबल सोल्यूशन्स।',
    'amc_title': 'वार्षिक देखभाल करार (AMC) व्यवस्थापक',
    'amc_desc': 'प्रमाणित वार्षिक चेकलिस्ट, अलाइनमेंट राउंड्स आणि प्राधान्य ब्रेकडाउन समर्थनासह 100% उपकरणे अपटाइम सुनिश्चित करा।',
    'lifecycle_title': 'वैद्यकीय उपकरणे जीवन चक्र रेकॉर्ड ट्रॅकर',
    'lifecycle_desc': 'अनुक्रमांकानुसार देखभाल सारांश, खरेदी लॉग, एकूण खर्च आणि अनुपालन गुण ट्रॅक करा।',
    'scan_qr_desc': 'तपशीलवार सार्वजनिक आरोग्य पत्रके पाहण्यासाठी क्यूआर टॅग स्कॅन करा किंवा कस्टम अनुक्रमांक प्रविष्ट करा।'
  }
};

let dbTranslations: Record<string, Record<string, string>> = {};

export async function loadTranslationsFromDb(onUpdate?: (langs: Record<string, Record<string, string>>) => void) {
  const db = getDb();
  
  // Clean dynamic subscription to translations
  return db.collection('translations').onSnapshot((snap: any) => {
    const loaded: Record<string, Record<string, string>> = { en: { ...fallbackTranslations.en }, hi: { ...fallbackTranslations.hi }, mr: { ...fallbackTranslations.mr } };
    
    snap.forEach((doc: any) => {
      const data = doc.data();
      if (data.language && data.keys) {
        loaded[data.language as LanguageCode] = {
          ...loaded[data.language as LanguageCode],
          ...data.keys
        };
      }
    });

    dbTranslations = loaded;
    if (onUpdate) {
      onUpdate(loaded);
    }
  });
}

export function translate(key: string, lang: LanguageCode, customDb?: Record<string, Record<string, string>>) {
  const currentStore = customDb || dbTranslations;
  
  if (currentStore[lang] && currentStore[lang][key]) {
    return currentStore[lang][key];
  }
  
  if (fallbackTranslations[lang] && fallbackTranslations[lang][key]) {
    return fallbackTranslations[lang][key];
  }
  
  return fallbackTranslations['en'][key] || key;
}
