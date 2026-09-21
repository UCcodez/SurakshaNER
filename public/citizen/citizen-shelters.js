(function () {

  const listEl = document.getElementById('shelterList');
  const searchEl = document.getElementById('shelterSearch');

  if (!listEl) return;

  /*
   * DEMO FALLBACK — shown only if /api/shelters returns nothing
   * (empty array, missing endpoint, or a failed request). Exists
   * purely so the search/browse UI has real-looking content to
   * demonstrate before the backend is wired up. Every entry is
   * clearly synthetic; none of this is real user data.
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

    const badgeClass = level === 'safe' ? '' : ` ${level}`;
    const entryClass = level === 'safe' ? '' : ` is-${level}`;

    const tel = phoneDigits(entry.contact);

    return `
      <div class="shelter-entry${entryClass}">

        <div class="shelter-entry-top">

          <div>
            <strong class="shelter-name">${entry.name}</strong>
            <div class="shelter-location">
              <span class="ui-icon" aria-hidden="true"><!-- icon: pin --></span>
              <span>${entry.district}</span>
            </div>
          </div>

          <span class="shelter-occupancy-badge${badgeClass}">${entry.occupied} / ${entry.capacity} beds</span>

        </div>

        <div class="shelter-progress">
          <div class="shelter-progress-fill" style="width:${ratio}%"></div>
        </div>

        <div class="shelter-info-grid">

          <div class="shelter-info-item">
            <span class="shelter-info-label">Water</span>
            <span class="shelter-info-value">${entry.water_status}</span>
          </div>

          <div class="shelter-info-item">
            <span class="shelter-info-label">Doctor</span>
            <span class="shelter-info-value">${entry.doctor_on_site ? 'Yes (On-site)' : 'Not on-site'}</span>
          </div>

          <div class="shelter-info-item">
            <span class="shelter-info-label">Rations</span>
            <span class="shelter-info-value">${entry.rations_status}</span>
          </div>

          <div class="shelter-info-item">
            <span class="shelter-info-label">Incharge</span>
            <span class="shelter-info-value">${entry.incharge}</span>
          </div>

        </div>

        <div class="shelter-footer">

          ${tel
            ? `<a class="shelter-call" href="tel:${tel}"><span class="ui-icon" aria-hidden="true"><!-- icon: phone --></span>Call Camp Desk</a>`
            : '<span></span>'}

          <span class="shelter-certified">${entry.certified ? 'Govt Certified Shelter' : 'Community-run Shelter'}</span>

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

    // Nearest-to-full first, so the shelters that most need attention
    // (or that a citizen should avoid) surface without extra taps.
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

  // citizen.js declares `citizenSocket` with `const` at the top level of
  // a classic (non-module) script, so it's reachable here as a bare
  // identifier (see the matching note in citizen-lostfound.js).
  if (typeof citizenSocket !== 'undefined') {

    citizenSocket.on('shelterStatusUpdate', loadShelters);
  }

  loadShelters();

})();