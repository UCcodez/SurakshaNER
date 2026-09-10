const translations = {
  en: {
    navHome: 'Home',
    navCitizen: 'Citizen Portal',
    navRescue: 'Rescue & Authority',
    heroTitle: 'Keeping India Safe',
    heroSub: 'Real-time sensor and weather data, AI-scored risk zones, and direct alerts to villages and authorities across NER.',
    ctaEmergency: 'Emergency Services',
    severityLow: 'Low',
    severityMedium: 'Medium',
    severityHigh: 'High',
    alertLabel: 'ALERT',
    tickerHigh: 'HIGH RISK — Sohra Ridge: soil moisture and tilt rising, avoid NH-6 near Mawsynram, rescue teams on standby',
    tickerMedium: 'MEDIUM RISK — Dawki zone: rainfall trending up, road connectivity normal',
    heroEyebrow: 'GOVERNMENT OF INDIA · NORTH EASTERN REGION',
    ctaInDanger: 'IN DANGER',
    statHighestZone: 'HIGHEST RISK ZONE',
    statRiskLevel: 'RISK LEVEL',
    statZonesMonitored: 'ZONES MONITORED'
  },
  hi: {
    navHome: 'होम',
    navCitizen: 'नागरिक पोर्टल',
    navRescue: 'बचाव एवं प्राधिकरण',
    heroTitle: 'भारत को सुरक्षित रखना',
    heroSub: 'वास्तविक समय सेंसर और मौसम डेटा, एआई-स्कोर जोखिम क्षेत्र, और एनईआर भर के गांवों और अधिकारियों को सीधी चेतावनी।',
    ctaEmergency: 'आपातकालीन सेवाएं',
    severityLow: 'कम',
    severityMedium: 'मध्यम',
    severityHigh: 'उच्च',
    alertLabel: 'चेतावनी',
    tickerHigh: 'उच्च जोखिम — सोहरा रिज: मिट्टी की नमी और झुकाव बढ़ रहा है, मावसिनराम के पास एनएच-6 से बचें, बचाव दल तैयार',
    tickerMedium: 'मध्यम जोखिम — दावकी क्षेत्र: वर्षा बढ़ रही है, सड़क संपर्क सामान्य',
    heroEyebrow: 'भारत सरकार · पूर्वोत्तर क्षेत्र',
    ctaInDanger: 'खतरे में',
    statHighestZone: 'सर्वाधिक जोखिम क्षेत्र',
    statRiskLevel: 'जोखिम स्तर',
    statZonesMonitored: 'निगरानी क्षेत्र'
  }
};

function applyLanguage(lang) {
  const dict = translations[lang] || translations.en;
  document.querySelectorAll('[data-i18n]').forEach(el => {
    const key = el.getAttribute('data-i18n');
    if (dict[key]) el.textContent = dict[key];
  });
  localStorage.setItem('lang', lang);
}

function initLanguage() {
  applyLanguage(localStorage.getItem('lang') || 'en');
}