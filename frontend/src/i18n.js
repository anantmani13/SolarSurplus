/**
 * Minimal dependency-free i18n for the UI chrome with an EN/HI toggle.
 * Uses localStorage + a tiny pub/sub so every component updates instantly
 * when the language is switched in the navbar.
 */

import { useState, useEffect } from 'react';

const DICT = {
  en: {
    'nav.dashboard': 'Dashboard',
    'nav.forecast': 'Forecast',
    'nav.alerts': 'Alerts',
    'nav.history': 'History',
    'nav.logout': 'Logout',
    'logout.confirm': 'Are you sure you want to log out?',
    'title.dashboard': 'Energy Dashboard',
    'title.forecast': 'Generate Forecast',
    'title.notifications': 'Energy Alerts',
    'title.history': 'Configuration History',
    'subtitle.dashboard': 'Solar surplus forecasting & battery optimization',
    'subtitle.forecast': 'Configure your system and generate a 7-day prediction',
    'subtitle.notifications': 'Stay informed about your energy production & usage',
    'subtitle.history': 'View and restore your past predictions',
    'signin.cta': 'Sign In to Save Data',
    'engine': 'Prediction Engine',
    'generated.ago': 'Generated',
    'regenerate': 'Regenerate',
    'download.csv': 'Download CSV',
    'print.report': 'Print Report',
    'fallback.banner': 'Physics engine fallback — ML backend unreachable. Showing theoretical estimates above.',
    'estimated.banner': 'Using estimated weather (no live weather fetched). Results approximate.',
    'dashboard.stale.hint': 'Showing last saved forecast',
    'empty.title': 'No Forecast Yet',
    'empty.text': 'Configure your solar system and generate a 7-day forecast to see your energy dashboard',
    'empty.cta': 'Go to Forecast',
    'footer.tagline': 'SolarSurplus — Sustainable Energy Forecasting System',
    'footer.tech': 'Powered by XGBoost + LSTM · Open-Meteo Weather API · Firebase',
    'savings.grid': 'Grid Export & Net Metering',
    'savings.surplus': 'Exportable Surplus',
    'savings.tariff': 'Export Tariff',
    'savings.monthly': 'Monthly Earnings',
    'savings.yearly': 'Yearly Earnings',
    'savings.title': 'Monthly Savings Estimate',
    'savings.onbill': 'Bill offset by solar generation',
    'savings.netexport': 'Net-metering export credit',
    'savings.payback': 'Estimated payback time',
    'savings.est': 'Estimated figures using assumed retail rate of ₹7.5/kWh and ₹70,000/kW installation cost.',
    'chart.gen48': '48h Generation vs Consumption Forecast',
    'search.placeholder': 'Search city or town (e.g. Prayagraj, Delhi, Mumbai, Bengaluru, London...)',
    'form.config': 'System Configuration',
    'form.config.sub': 'Enter your solar panel, battery, and location details',
    'form.tilt': 'Panel Tilt (°)',
    'form.tilt.helper': 'Roof slope from horizontal. 0 = flat roof, ~30 typical for India.',
    'form.azimuth': 'Panel Direction',
    'form.azimuth.helper': 'Which way the panels face. South is best in India.',
    'form.loading': 'Waking ML Engine & Generating Forecast...',
    'form.submit': 'Generate 7-Day Forecast',
    'loading.dashboard': 'Loading your dashboard...',
    'chart.forecast48': '48h Generation vs Consumption Forecast',
  },
  hi: {
    'nav.dashboard': 'डैशबोर्ड',
    'nav.forecast': 'पूर्वानुमान',
    'nav.alerts': 'अलर्ट',
    'nav.history': 'इतिहास',
    'nav.logout': 'लॉगआउट',
    'logout.confirm': 'क्या आप लॉगआउट करना चाहते हैं?',
    'title.dashboard': 'ऊर्जा डैशबोर्ड',
    'title.forecast': 'पूर्वानुमान बनाएं',
    'title.notifications': 'ऊर्जा अलर्ट',
    'title.history': 'कॉन्फ़िगरेशन इतिहास',
    'subtitle.dashboard': 'सौर अधिशेष पूर्वानुमान और बैटरी अनुकूलन',
    'subtitle.forecast': 'अपना सिस्टम कॉन्फ़िगर करें और 7-दिन का पूर्वानुमान बनाएं',
    'subtitle.notifications': 'अपने ऊर्जा उत्पादन और उपयोग के बारे में जानकारी रखें',
    'subtitle.history': 'अपने पिछले पूर्वानुमान देखें और पुनः लोड करें',
    'signin.cta': 'डेटा सहेजने के लिए साइन इन करें',
    'engine': 'पूर्वानुमान इंजन',
    'generated.ago': 'बनाया गया',
    'regenerate': 'फिर से बनाएं',
    'download.csv': 'CSV डाउनलोड करें',
    'print.report': 'रिपोर्ट प्रिंट करें',
    'fallback.banner': 'भौतिकी इंजन फ़ॉलबैक — ML बैकएंड अनुपलब्ध। ऊपर सैद्धांतिक अनुमान दिख रहे हैं।',
    'estimated.banner': 'अनुमानित मौसम उपयोग में है (लाइव मौसम नहीं मिला)। परिणाम अनुमानित हैं।',
    'dashboard.stale.hint': 'पिछला सहेजा गया पूर्वानुमान दिख रहा है',
    'empty.title': 'अभी कोई पूर्वानुमान नहीं',
    'empty.text': 'अपने सौर सिस्टम को कॉन्फ़िगर करें और डैशबोर्ड देखने के लिए 7-दिन का पूर्वानुमान बनाएं',
    'empty.cta': 'पूर्वानुमान पर जाएं',
    'footer.tagline': 'SolarSurplus — सतत ऊर्जा पूर्वानुमान प्रणाली',
    'footer.tech': 'XGBoost + LSTM · Open-Meteo Weather API · Firebase द्वारा संचालित',
    'savings.grid': 'ग्रिड निर्यात और नेट मीटरिंग',
    'savings.surplus': 'निर्यात योग्य अधिशेष',
    'savings.tariff': 'निर्यात शुल्क',
    'savings.monthly': 'मासिक कमाई',
    'savings.yearly': 'वार्षिक कमाई',
    'savings.title': 'मासिक बचत का अनुमान',
    'savings.onbill': 'सौर उत्पादन से बिल में कटौती',
    'savings.netexport': 'नेट-मीटरिंग निर्यात क्रेडिट',
    'savings.payback': 'अनुमानित पेबैक समय',
    'savings.est': 'अनुमानित आंकड़े: ₹7.5/kWh रेट और ₹70,000/kW लागत मानकर गणना की गई।',
    'chart.gen48': '48 घंटे उत्पादन बनाम खपत पूर्वानुमान',
    'search.placeholder': 'शहर या कस्बा खोजें (जैसे प्रयागराज, दिल्ली, मुंबई, बेंगलुरु...)',
    'form.config': 'सिस्टम कॉन्फ़िगरेशन',
    'form.config.sub': 'अपने सोलर पैनल, बैटरी और स्थान की जानकारी दर्ज करें',
    'form.tilt': 'पैनल झुकाव (°)',
    'form.tilt.helper': 'क्षैतिज से छत का झुकाव। 0 = सपाट छत, भारत के लिए ~30 सामान्य।',
    'form.azimuth': 'पैनल दिशा',
    'form.azimuth.helper': 'पैनल किस दिशा की ओर हैं। भारत में दक्षिण सबसे अच्छा है।',
    'form.loading': 'ML इंजन जाग रहा है और पूर्वानुमान बन रहा है...',
    'form.submit': '7-दिन का पूर्वानुमान बनाएं',
    'loading.dashboard': 'आपका डैशबोर्ड लोड हो रहा है...',
    'chart.forecast48': '48 घंटे उत्पादन बनाम खपत पूर्वानुमान',
  },
};

const KEY = 'solarsurplus_lang';
const listeners = new Set();

function readLang() {
  try {
    return localStorage.getItem(KEY) === 'hi' ? 'hi' : 'en';
  } catch (e) {
    return 'en';
  }
}

function setLangStore(lang) {
  try {
    localStorage.setItem(KEY, lang);
  } catch (e) {}
  listeners.forEach((fn) => fn(lang));
}

export function toggleLanguage() {
  setLangStore(readLang() === 'hi' ? 'en' : 'hi');
}

export function useI18n() {
  const [lang, setLang] = useState(readLang);
  useEffect(() => {
    const fn = (l) => setLang(l);
    listeners.add(fn);
    return () => listeners.delete(fn);
  }, []);
  const t = (key) => (DICT[lang] && DICT[lang][key]) || DICT.en[key] || key;
  return { lang, t };
}