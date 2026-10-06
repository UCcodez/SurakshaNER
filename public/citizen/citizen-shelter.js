(function () {

  const listEl = document.getElementById('shelterList');
  const searchEl = document.getElementById('shelterSearch');

  if (!listEl) return;

   
  const ICON_PIN =
    '<svg viewBox="0 0 384 512" xmlns="http://www.w3.org/2000/svg" fill="currentColor"><path d="M215.7 499.2C267 435 384 279.4 384 192 384 86 298 0 192 0S0 86 0 192c0 87.4 117 243 168.3 307.2 12.3 15.3 35.1 15.3 47.4 0zM192 128a64 64 0 1 1 0 128 64 64 0 1 1 0-128z"/></svg>';

  const ICON_PHONE =
    '<svg viewBox="0 0 512 512" xmlns="http://www.w3.org/2000/svg" fill="currentColor"><path d="M164.9 24.6c-7.7-18.6-28-28.5-47.4-23.2l-88 24C12.1 30.2 0 46 0 64 0 300.6 191.4 492 428 492c18 0 33.8-12.1 38.6-29.5l24-88c5.3-19.4-4.6-39.7-23.2-47.4l-96-40c-16.3-6.8-35.2-2.1-46.3 11.6l-40.4 49.3c-70.4-33.3-127.4-90.3-160.7-160.7l49.3-40.4c13.7-11.2 18.4-30 11.6-46.3l-40-96z"/></svg>';


  /*
   * DEMO FALLBACK 
   */
  const DEMO_FALLBACK_SHELTERS = [
    {
      id: 2001,
      name: 'Majuli College Elevated Flood Relief Campus',
      district: 'Majuli, Assam',
      capacity: 600,
      occupied: 380,
      water_status: 'Safe & Chlorinated',
      doctor_on_site: true,
      rations_status: 'Adequate (3+ days)',
      incharge: 'Dr. Hemen Gogoi (Camp Incharge)',
      contact: '94350-XXXXX',
      certified: true
    },
    {
      id: 2002,
      name: 'Sarusajai Indoor Stadium Multi-purpose Shelter',
      district: 'Kamrup Metro, Assam',
      capacity: 1200,
      occupied: 520,
      water_status: 'Safe & Chlorinated',
      doctor_on_site: true,
      rations_status: 'Restocked Today',
      incharge: 'Pranab Sarma (ADM Relief)',
      contact: '98640-XXXXX',
      certified: true
    },
    {
      id: 2003,
      name: 'Silchar Girls\u2019 High School Relief Camp',
      district: 'Cachar, Assam',
      capacity: 300,
      occupied: 274,
      water_status: 'Boil Before Use',
      doctor_on_site: false,
      rations_status: 'Low — resupply requested',
      incharge: 'Nirmali Deb (Relief Coordinator)',
      contact: '90850-XXXXX',
      certified: true
    },
    {
      id: 2004,
      name: 'Dhemaji Community Hall',
      district: 'Dhemaji, Assam',
      capacity: 180,
      occupied: 176,
      water_status: 'Safe & Chlorinated',
      doctor_on_site: true,
      rations_status: 'Adequate (3+ days)',
      incharge: 'Bipul Payeng (Camp Incharge)',
      contact: '87650-XXXXX',
      certified: false
    },
    {
      id: 2005,
      name: 'Jorhat Engineering College Shelter',
      district: 'Jorhat, Assam',
      capacity: 450,
      occupied: 140,
      water_status: 'Safe & Chlorinated',
      doctor_on_site: true,
      rations_status: 'Adequate (3+ days)',
      incharge: 'Rina Hazarika (Camp Incharge)',
      contact: '96780-XXXXX',
      certified: true
    }
  ];


  let allShelters = [];


  function occupancyLevel(entry) {

    const ratio = entry.capacity > 0
      ? entry.occupied / entry.capacity
      : 0;

    if (ratio >= 0.9) return 'full';
    if (ratio >= 0.7) return 'caution';
    return 'safe';
  }


  function phoneDigits(contact) {

    if (!contact) return null;

    const digits = contact.replace(/[^\d+]/g, '');

    return digits.length >= 6 ? digits : null;
  }


  function renderEntry(entry) {

    const level = occupancyLevel(entry);
    const ratio = entry.capacity > 0
      ? Math.min(100, Math.round((entry.occupied / entry.capacity) * 100))
      : 0;

     
    const levelClass = level === 'safe' ? '' : ` ${level}`;

    const tel = phoneDigits(entry.contact);

    return `
      <div class="shelter-card">

        <div class="shelter-card-top">

          <div>
            <strong class="shelter-name">${entry.name}</strong>
            <div class="shelter-location">
              <span class="ui-icon" aria-hidden="true">${ICON_PIN}</span>
              <span>${entry.district}</span>
            </div>
          </div>

          <span class="shelter-capacity-badge${levelClass}">${entry.occupied} / ${entry.capacity} beds</span>

        </div>

        <div class="shelter-bar${levelClass}">
          <span style="width:${ratio}%"></span>
        </div>

        <div class="shelter-details">

          <div class="shelter-detail">
            <span>Water</span>
            <strong>${entry.water_status}</strong>
          </div>

          <div class="shelter-detail">
            <span>Doctor</span>
            <strong>${entry.doctor_on_site ? 'Yes (On-site)' : 'Not on-site'}</strong>
          </div>

          <div class="shelter-detail">
            <span>Rations</span>
            <strong>${entry.rations_status}</strong>
          </div>

          <div class="shelter-detail">
            <span>Incharge</span>
            <strong>${entry.incharge}</strong>
          </div>

        </div>

        <div class="shelter-footer">

          ${tel
            ? `<a class="shelter-call" href="tel:${tel}"><span class="ui-icon" aria-hidden="true">${ICON_PHONE}</span>Call Camp Desk</a>`
            : '<span></span>'}

          <span class="shelter-tag">${entry.certified ? 'Govt Certified Shelter' : 'Community-run Shelter'}</span>

        </div>

      </div>
    `;
  }


  function currentQuery() {

    return (searchEl?.value || '').trim().toLowerCase();
  }


  function applyFilters(entries) {

    const query = currentQuery();

    if (!query) return entries;

    return entries.filter((entry) =>
      (entry.name || '').toLowerCase().includes(query) ||
      (entry.district || '').toLowerCase().includes(query)
    );
  }


  function render() {

    const filtered = applyFilters(allShelters);

    if (filtered.length === 0) {

      listEl.innerHTML = currentQuery()
        ? '<p class="shelter-empty">No shelters match that search.</p>'
        : '<p class="shelter-empty">No shelter data available yet.</p>';

      return;
    }

     
    const sorted = [...filtered].sort((a, b) => {

      const ratioA = a.capacity > 0 ? a.occupied / a.capacity : 0;
      const ratioB = b.capacity > 0 ? b.occupied / b.capacity : 0;

      return ratioA - ratioB;
    });

    listEl.innerHTML = sorted.map(renderEntry).join('');
  }


  async function loadShelters() {

    try {

      const res = await fetch('/api/shelters');
      const data = await res.json();

      allShelters = Array.isArray(data) && data.length > 0
        ? data
        : DEMO_FALLBACK_SHELTERS;

    } catch (err) {

      allShelters = DEMO_FALLBACK_SHELTERS;
    }

    render();
  }


  searchEl?.addEventListener('input', render);

  searchEl?.addEventListener('keydown', (event) => {
    if (event.key === 'Enter') {
      event.preventDefault();
    }
  });

   
  if (typeof citizenSocket !== 'undefined') {

    citizenSocket.on('shelterStatusUpdate', loadShelters);
  }

  loadShelters();

})();