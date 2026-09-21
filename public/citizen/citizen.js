(function () {

  const listEl = document.getElementById('lostFoundList');
  const searchEl = document.getElementById('lfSearch');
  const searchBtn = document.getElementById('lfSearchBtn');
  const filtersEl = document.getElementById('lfFilters');
  const pager = document.getElementById('lfPagination');
  const prevBtn = document.getElementById('lfPrev');
  const nextBtn = document.getElementById('lfNext');
  const statusEl = document.getElementById('lfPageStatus');

  if (!listEl || !pager || !prevBtn || !nextBtn || !statusEl) return;

  const PAGE_SIZE = 4;

  let allEntries = [];
  let page = 0;
  let activeFilter = 'all';

  /*
   * DEMO FALLBACK — shown only if /api/lost-found returns nothing
   * (empty array, missing endpoint, or a failed request). This
   * exists purely so the browse/search/filter UI has real-looking
   * content to demonstrate before the backend is wired up. Every
   * entry is clearly synthetic; none of this is real user data.
   */
  const DEMO_FALLBACK_ENTRIES = [
    {
      id: 1001,
      report_type: 'person',
      name: 'Ananya Bora',
      description: 'Age 9. Speaks Assamese and Hindi. Distinct birthmark on left wrist. Last seen near the Dhemaji embankment evacuation point, wearing a red kurta.',
      contact_info: 'Mridul Bora (Father), 98640-XXXXX',
      status: 'active',
      photo_url: null,
      created_at: new Date(Date.now() - 3 * 60 * 60 * 1000).toISOString()
    },
    {
      id: 1002,
      report_type: 'person',
      name: 'Unidentified elderly man',
      description: "Approx. 70s, hard of hearing, carrying a brass walking stick. Rescued by boat from Salmara, currently sheltered at Sarusajai Relief Camp.",
      contact_info: 'Sarusajai Relief Camp desk',
      status: 'found',
      photo_url: null,
      created_at: new Date(Date.now() - 7 * 60 * 60 * 1000).toISOString()
    },
    {
      id: 1003,
      report_type: 'item',
      name: 'Waterproof pouch with land documents',
      description: "Brown leather pouch containing land patta and NRC documents, name tag reads 'N. Islam'. Deposited at the Cachar DC office relief desk.",
      contact_info: 'Cachar DC Relief Desk',
      status: 'found',
      photo_url: null,
      created_at: new Date(Date.now() - 26 * 60 * 60 * 1000).toISOString()
    },
    {
      id: 1004,
      report_type: 'person',
      name: 'Gaurav Kalita',
      description: 'Age 6. Separated from his mother during evacuation. Reunited safely at Majuli College shelter following a volunteer photo match.',
      contact_info: 'Runu Kalita (Mother)',
      status: 'found',
      photo_url: null,
      created_at: new Date(Date.now() - 32 * 60 * 60 * 1000).toISOString()
    }
  ];


  function statusMeta(entry) {

    const resolved = entry.status === 'found';

    if (entry.report_type === 'item') {
      return { label: resolved ? 'CLAIMED' : 'LOST', resolved };
    }

    return { label: resolved ? 'REUNITED' : 'MISSING', resolved };
  }


  function initial(entry) {

    return (entry.name || '?').trim().charAt(0).toUpperCase();
  }


  function idCode(entry) {

    return `LF-${String(entry.id).padStart(4, '0')}`;
  }


  function phoneDigits(contact) {

    if (!contact) return null;

    const digits = contact.replace(/[^\d+]/g, '');

    return digits.length >= 6 ? digits : null;
  }


  function renderEntry(entry) {

    const meta = statusMeta(entry);

    const avatar = entry.photo_url
      ? `<img src="${entry.photo_url}" alt="" class="lf-avatar-img">`
      : initial(entry);

    const tel = phoneDigits(entry.contact_info);

    return `
      <div class="lf-entry${meta.resolved ? ' is-found' : ''}">

        <div class="lf-entry-top">
          <span class="lf-badge${meta.resolved ? ' is-resolved' : ''}">${meta.label}</span>
          <span class="lf-id">${idCode(entry)}</span>
        </div>

        <div class="lf-entry-main">

          <div class="lf-avatar">${avatar}</div>

          <div class="lf-entry-body">

            <strong class="lf-name">${entry.name || 'Unnamed report'}</strong>

            ${entry.description ? `<div class="lf-callout">${entry.description}</div>` : ''}

            <div class="lf-footer">
              <span>
                ${entry.contact_info ? `Contact: ${entry.contact_info}` : ''}
                ${tel ? ` &middot; <a class="lf-call" href="tel:${tel}">Call</a>` : ''}
              </span>
              <span class="lf-time">${new Date(entry.created_at).toLocaleDateString()}</span>
            </div>

          </div>

        </div>

      </div>
    `;
  }


  function currentQuery() {

    return (searchEl?.value || '').trim().toLowerCase();
  }


  function applyFilters(entries) {

    const query = currentQuery();

    return entries.filter((entry) => {

      const matchesQuery = query
        ? (entry.name || '').toLowerCase().includes(query)
        : true;

      const matchesStatus =
        activeFilter === 'all'
          ? true
          : activeFilter === 'found'
            ? entry.status === 'found'
            : entry.status !== 'found';

      return matchesQuery && matchesStatus;
    });
  }


  function render() {

    const filtered = applyFilters(allEntries);

    if (filtered.length === 0) {

      listEl.innerHTML = currentQuery()
        ? '<p class="lf-empty">No entries match that search.</p>'
        : '<p class="lf-empty">No entries in this view yet.</p>';

      pager.hidden = true;

      return;
    }

    const pageCount = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));

    if (page >= pageCount) page = pageCount - 1;
    if (page < 0) page = 0;

    const start = page * PAGE_SIZE;
    const items = filtered.slice(start, start + PAGE_SIZE);

    listEl.innerHTML = items.map(renderEntry).join('');

    statusEl.textContent = `${page + 1} / ${pageCount}`;
    prevBtn.disabled = page === 0;
    nextBtn.disabled = page === pageCount - 1;
    pager.hidden = pageCount <= 1;
  }


  async function loadEntries() {

    try {

      const res = await fetch('/api/lost-found');
      const data = await res.json();

      allEntries = Array.isArray(data) && data.length > 0
        ? data
        : DEMO_FALLBACK_ENTRIES;

    } catch (err) {

      allEntries = DEMO_FALLBACK_ENTRIES;
    }

    page = 0;
    render();
  }


  function runSearch() {
    page = 0;
    render();
  }


  searchEl?.addEventListener('input', runSearch);
  searchBtn?.addEventListener('click', runSearch);

  searchEl?.addEventListener('keydown', (event) => {
    if (event.key === 'Enter') {
      event.preventDefault();
      runSearch();
    }
  });

  filtersEl?.querySelectorAll('.lf-filter').forEach((btn) => {
    btn.addEventListener('click', () => {

      filtersEl.querySelectorAll('.lf-filter').forEach((b) =>
        b.classList.remove('active')
      );

      btn.classList.add('active');
      activeFilter = btn.dataset.filter;
      page = 0;
      render();
    });
  });

  prevBtn.addEventListener('click', () => {
    page -= 1;
    render();
  });

  nextBtn.addEventListener('click', () => {
    page += 1;
    render();
  });

  // citizen.js declares `citizenSocket` with `const` at the top level of
  // a classic (non-module) script, which — per how browsers share global
  // scope across classic scripts — is still reachable here as a bare
  // identifier, just not as `window.citizenSocket`.
  if (typeof citizenSocket !== 'undefined') {

    citizenSocket.on('newLostFound', loadEntries);
    citizenSocket.on('lostFoundStatusUpdate', loadEntries);
  }

  loadEntries();

})();