function renderNavbar() {
  const base = window.NAV_BASE || '';
  const current = window.NAV_CURRENT || '';

  const navHTML = `
    <div class="tricolor-strip"></div>
    <header class="site-header">
      <div class="brand-block">
        <a href="${base}index.html" class="nav-brand">SurakshaNER</a>
        <div class="nav-tagline">भूस्खलन पूर्व चेतावनी प्रणाली &middot; Disaster Management, NER</div>
      </div>
      <div class="nav-right">
        <div class="nav-links">
          <a href="${base}index.html" data-i18n="navHome" class="${current === 'home' ? 'active' : ''}" >Home</a>
          <a href="${base}citizen/citizen.html" data-i18n="navCitizen" class="${current === 'citizen' ? 'active' : ''}" data-i18n="navCitizen">Citizen Portal</a>
          <a href="${base}rescue/rescue.html" data-i18n="navRescue" class="${current === 'rescue' ? 'active' : ''}" data-i18n="navRescue" >Rescue &amp; Authority</a>
        </div>
        <div id="weather-chip" class="weather-chip">Loading weather…</div>
        <button id="emergency-btn" class="emergency-btn open-emergency-modal">Emergency Services</button>
        <div class="lang-toggle" id="lang-toggle">EN&nbsp;|&nbsp;हिं
          
        </div>
      </div>
    </header>

    <div id="emergency-modal" class="modal-overlay hidden">
      <div class="modal-box">
        <div class="modal-header">
          <h2>Emergency Services</h2>
          <button id="emergency-close" class="modal-close">&times;</button>
        </div>
        <div class="modal-actions">
          <a href="${base}citizen/citizen.html" class="modal-action-btn modal-action-primary">
            <span class="modal-action-title">SOS Alert</span>
            <span class="modal-action-desc">Send an emergency alert with your location</span>
          </a>
          <a href="${base}citizen/citizen.html#reportHazardSection" class="modal-action-btn">
            <span class="modal-action-title">Report a Hazard</span>
            <span class="modal-action-desc">Upload a photo of cracks, slope movement, or blocked roads</span>
          </a>
            <div class="modal-action-btn"  id="find-shelter-btn" style="cursor:pointer;">
              <span class="modal-action-title">Find Shelter</span>
              <span class="modal-action-desc">See nearest relief points and capacity</span>
            </div>
          <!--<a href="${base}citizen/citizen.html#lostFoundSection" class="modal-action-btn">
            <span class="modal-action-title">Lost &amp; Found</span>
            <span class="modal-action-desc">Report or search for missing people.</span>
          </a>-->
        </div> 
      </div>
    </div>
  `;

  const placeholder = document.getElementById('site-navbar');
  if (placeholder) placeholder.innerHTML = navHTML;

  wireEmergencyModal();
  loadWeatherChip();
    initLanguage();
  const langBtn = document.getElementById('lang-toggle');
  if (langBtn) {
    langBtn.addEventListener('click', () => {
      const current = localStorage.getItem('lang') || 'en';
      applyLanguage(current === 'en' ? 'hi' : 'en');
    });
  }
}

  wireInDangerButton();

  function wireInDangerButton() {
  const btn = document.getElementById('in-danger-btn');
  if (!btn) return;

  let countdownActive = false;
  let countdownTimer = null;
  let secondsLeft = 3;

  btn.addEventListener('click', () => {
    if (countdownActive) {
      clearInterval(countdownTimer);
      countdownActive = false;
      btn.textContent = 'IN DANGER';
      return;
    }

    countdownActive = true;
    secondsLeft = 3;
    btn.textContent = `Sending in ${secondsLeft}... (tap to cancel)`;

    countdownTimer = setInterval(() => {
      secondsLeft--;
      if (secondsLeft <= 0) {
        clearInterval(countdownTimer);
        countdownActive = false;
        btn.textContent = 'Sending...';
        sendInDangerAlert(btn);
      } else {
        btn.textContent = `Sending in ${secondsLeft}... (tap to cancel)`;
      }
    }, 1000);
  });
}

function sendInDangerAlert(btn) {
  if (!navigator.geolocation) {
    btn.textContent = 'Location not supported';
    return;
  }

  navigator.geolocation.getCurrentPosition(async (position) => {
    try {
      await fetch('/api/in-danger', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ lat: position.coords.latitude, lng: position.coords.longitude })
      });
      btn.textContent = 'Alert sent';
      setTimeout(() => { btn.textContent = 'IN DANGER'; }, 3000);
    } catch (err) {
      btn.textContent = 'Failed — tap to retry';
    }
  }, () => {
    btn.textContent = 'Location denied';
  });
}

function wireEmergencyModal() {
  const modal = document.getElementById('emergency-modal');
  const closeBtn = document.getElementById('emergency-close');
  const triggers = document.querySelectorAll('.open-emergency-modal');

  const shelterBtn = document.getElementById('find-shelter-btn');
  if (shelterBtn) {
    shelterBtn.addEventListener('click', async () => {
      const res = await fetch('/api/shelters');
      const shelters = await res.json();
      const list = shelters.map(s =>
        `${s.name}: ${s.current_occupancy}/${s.capacity} occupied`
      ).join('\n');
      alert('Nearest Relief Points:\n\n' + list);
    });
  }
  
  if (!modal || !closeBtn) return;

  triggers.forEach(btn => {
    btn.addEventListener('click', () => modal.classList.remove('hidden'));
  });
  closeBtn.addEventListener('click', () => modal.classList.add('hidden'));
  modal.addEventListener('click', (e) => {
    if (e.target === modal) modal.classList.add('hidden');
  });
}



function loadWeatherChip() {
  const chip = document.getElementById('weather-chip');
  if (!chip) return;

  fetch('/api/weather')
    .then(res => res.json())
    .then(zones => {
      if (!zones || zones.length === 0) {
        chip.textContent = 'No weather data';
        return;
      }
      const wettest = zones.reduce((a, b) => (b.rainfall_mm > a.rainfall_mm ? b : a));
      chip.textContent = wettest.rainfall_mm > 0
        ? `${wettest.rainfall_mm}mm rain — ${wettest.name}`
        : 'No rainfall detected';
    })
    .catch(() => {
      chip.textContent = 'Weather unavailable';
    });
}

renderNavbar();
