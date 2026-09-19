(function () {

  const container = document.getElementById('announcements');
  const pager = document.getElementById('announcementsPagination');
  const prevBtn = document.getElementById('announcementsPrev');
  const nextBtn = document.getElementById('announcementsNext');
  const status = document.getElementById('announcementsPageStatus');

  if (!container || !pager || !prevBtn || !nextBtn || !status) return;

  const PAGE_SIZE = 3;
  let page = 0;

  function paginate() {
    const items = Array.from(container.children).filter((el) =>
      el.classList.contains('announcement')
    );

    if (items.length === 0) {
      pager.hidden = true;
      return;
    }

    const pageCount = Math.max(1, Math.ceil(items.length / PAGE_SIZE));

    if (page >= pageCount) page = pageCount - 1;
    if (page < 0) page = 0;

    items.forEach((item, index) => {
      const itemPage = Math.floor(index / PAGE_SIZE);
      item.style.display = itemPage === page ? '' : 'none';
    });

    status.textContent = `${page + 1} / ${pageCount}`;
    prevBtn.disabled = page === 0;
    nextBtn.disabled = page === pageCount - 1;
    pager.hidden = pageCount <= 1;
  }

  prevBtn.addEventListener('click', () => {
    page -= 1;
    paginate();
  });

  nextBtn.addEventListener('click', () => {
    page += 1;
    paginate();
  });

  // Re-paginate (from page 1) whenever citizen.js replaces the
  // announcements list — e.g. on load, or on the socket-driven
  // `newAnnouncement` refresh.
  const observer = new MutationObserver(() => {
    page = 0;
    paginate();
  });

  observer.observe(container, { childList: true });

  paginate();

})();