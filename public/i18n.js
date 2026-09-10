const translations = {
  en: {
    navHome: 'Home',
    navCitizen: 'Citizen Portal',
    navRescue: 'Rescue & Authority',
    emergencyBtn: 'Emergency Services',
    heroTitle: 'Keeping India Safe',
    heroSubtitle: 'Real-time sensor and weather data, AI-scored risk zones, and direct alerts to villages and authorities across NER.',
    ctaEmergency: 'Emergency Services'
  },
  hi: {
    navHome: 'होम',
    navCitizen: 'नागरिक पोर्टल',
    navRescue: 'बचाव एवं प्राधिकरण',
    emergencyBtn: 'आपातकालीन सेवाएं',
    heroTitle: 'खिसकने से पहले ढलान को जानें।',
    heroSubtitle: 'रीयल-टाइम सेंसर और मौसम डेटा, AI-स्कोर जोखिम क्षेत्र, और NER भर के गांवों और अधिकारियों को सीधी चेतावनी।',
    ctaEmergency: 'आपातकालीन सेवाएं'
  }
};

function setLanguage(lang) {
  localStorage.setItem('siteLang', lang);
  applyTranslations(lang);
}

function applyTranslations(lang) {
  const dict = translations[lang] || translations.en;
  document.querySelectorAll('[data-i18n]').forEach(el => {
    const key = el.getAttribute('data-i18n');
    if (dict[key]) el.textContent = dict[key];
  });
}

function initLanguage() {
  const saved = localStorage.getItem('siteLang') || 'en';
  applyTranslations(saved);
}