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

  const PAGE_SIZE = 5;

   
  const ICON_PHONE =
    '<svg viewBox="0 0 512 512" xmlns="http://www.w3.org/2000/svg" fill="currentColor"><path d="M164.9 24.6c-7.7-18.6-28-28.5-47.4-23.2l-88 24C12.1 30.2 0 46 0 64 0 300.6 191.4 492 428 492c18 0 33.8-12.1 38.6-29.5l24-88c5.3-19.4-4.6-39.7-23.2-47.4l-96-40c-16.3-6.8-35.2-2.1-46.3 11.6l-40.4 49.3c-70.4-33.3-127.4-90.3-160.7-160.7l49.3-40.4c13.7-11.2 18.4-30 11.6-46.3l-40-96z"/></svg>';

  let allEntries = [];
  let page = 0;
  let currentFilter = 'all';  


  /*  
     Labels
       */

  function badgeLabel(entry) {

    const isFound = entry.status === 'found';

    if (entry.report_type === 'person') {
      return isFound ? 'REUNITED' : 'SEARCHING';
    }

    return isFound ? 'RECOVERED' : 'LOST';
  }


  function metaLabel(entry) {

    const isFound = entry.status === 'found';

    if (entry.report_type === 'person') {
      return isFound ? 'Found Person' : 'Missing Person';
    }

    return isFound ? 'Recovered Item' : 'Lost Item';
  }


  function idLabel(entry) {

    const num = String(entry.id ?? '').padStart(3, '0');

    return `LF-${num}`;
  }


  function initial(entry) {

    return (entry.name || '?').trim().charAt(0).toUpperCase() || '?';
  }


  function phoneDigits(contact) {

    if (!contact) return null;

    const digits = contact.replace(/[^\d+]/g, '');

    return digits.length >= 6 ? digits : null;
  }


  /* 
     Rendering
       */

  function renderEntry(entry) {

    const isFound = entry.status === 'found';

    const avatar = entry.photo_url
      ? `<img src="${entry.photo_url}" alt="" class="lf-avatar-img">`
      : initial(entry);

    const tel = phoneDigits(entry.contact_info);

    return `
      <div class="lf-entry${isFound ? ' is-found' : ''}">

        <div class="lf-entry-top">
          <span class="lf-badge${isFound ? ' is-resolved' : ''}">${badgeLabel(entry)}</span>
          <span class="lf-id">${idLabel(entry)}</span>
        </div>

        <div class="lf-entry-main">

          <div class="lf-avatar">${avatar}</div>

          <div class="lf-entry-body">

            <strong class="lf-name">${entry.name || 'Unnamed report'}</strong>
            <span class="lf-meta">${metaLabel(entry)}</span>

            ${entry.description
              ? `<div class="lf-callout"><strong>Last seen:</strong> ${entry.description}</div>`
              : ''}

            <div class="lf-footer">
              <span>${entry.contact_info ? `Contact: ${entry.contact_info}` : ''}</span>

              ${tel
                ? `<a class="lf-call" href="tel:${tel}"><span class="ui-icon" aria-hidden="true">${ICON_PHONE}</span>Call</a>`
                : `<span class="lf-time">${new Date(entry.created_at).toLocaleDateString()}</span>`}
            </div>

          </div>

        </div>

      </div>
    `;
  }


  /* 
     Filtering + search
       */

  function currentQuery() {

    return (searchEl?.value || '').trim().toLowerCase();
  }


  function matchesFilter(entry) {

    if (currentFilter === 'active') return entry.status !== 'found';
    if (currentFilter === 'found') return entry.status === 'found';

    return true; // 'all'
  }


  function render() {

    const query = currentQuery();

    const filtered = allEntries
      .filter(matchesFilter)
      .filter((entry) =>
        !query || (entry.name || '').toLowerCase().includes(query)
      );

    if (filtered.length === 0) {

      listEl.innerHTML = query
        ? '<p class="lf-empty">No entries match that search.</p>'
        : '<p class="lf-empty">No entries yet.</p>';

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
      allEntries = await res.json();

      page = 0;
      render();

    } catch (err) {

      listEl.innerHTML = '<p class="lf-empty">Failed to load entries.</p>';
    }
  }


  /*  
     Wiring — search input, search button, filter chips
       */

  searchEl?.addEventListener('input', () => {
    page = 0;
    render();
  });

   
  searchBtn?.addEventListener('click', () => {
    page = 0;
    render();
    searchEl?.focus();
  });

   
  filtersEl?.addEventListener('click', (event) => {

    const btn = event.target.closest('.lf-filter');

    if (!btn) return;

    filtersEl.querySelectorAll('.lf-filter').forEach((b) => b.classList.remove('active'));
    btn.classList.add('active');

    currentFilter = btn.dataset.filter || 'all';
    page = 0;
    render();
  });

  prevBtn.addEventListener('click', () => {
    page -= 1;
    render();
  });

  nextBtn.addEventListener('click', () => {
    page += 1;
    render();
  });

   
  if (typeof citizenSocket !== 'undefined') {

    citizenSocket.on('newLostFound', loadEntries);
    citizenSocket.on('lostFoundStatusUpdate', loadEntries);
  }

  loadEntries();

})();