/**
 * MyGigLife - Main Application
 * Pure vanilla JavaScript PWA for music gig management
 */

'use strict';

// ============================================================
// Resource Types
// ============================================================
const RESOURCE_TYPES = [
  { key: 'gigticket',  label: 'Gig Ticket',      icon: '🎟' },
  { key: 'eticket',    label: 'E-Ticket',        icon: '🎫' },
  { key: 'hotel',      label: 'Hotel',            icon: '🏨' },
  { key: 'train',      label: 'Train / Coach',    icon: '🚂' },
  { key: 'flight',     label: 'Flight',           icon: '✈️' },
  { key: 'parking',    label: 'Car Park',         icon: '🚗' },
  { key: 'restaurant', label: 'Restaurant',       icon: '🍽' },
  { key: 'other',      label: 'Other',            icon: '📄' },
];

function getResourceType(key) {
  return RESOURCE_TYPES.find(t => t.key === key) || RESOURCE_TYPES[RESOURCE_TYPES.length - 1];
}

// ============================================================
// Affiliate & Monetisation Config
// Replace placeholder IDs with your actual affiliate IDs before deploying
// ============================================================
const AFFILIATE = {
  // Skiddle: replace with your affiliate tracking URL from skiddle.com/affiliates
  skiddle: 'https://www.skiddle.com',            // TODO: replace with affiliate URL

  // See Tickets: replace with your Awin deep link (programme ID: search "See Tickets" on awin.com)
  seetickets: 'https://www.seetickets.com',      // TODO: replace with Awin affiliate URL

  // Ticketmaster: replace with your Impact tracking link
  ticketmaster: 'https://www.ticketmaster.co.uk', // TODO: replace with Impact affiliate URL

  // Gigantic: contact gigantic.com/work-with-us to arrange direct affiliate deal
  gigantic: 'https://www.gigantic.com',           // TODO: replace with direct affiliate URL once arranged

  // Booking.com: replace YOUR_AFFILIATE_ID with your aid= parameter from booking.com/affiliate-program
  bookingComAffiliateId: 'YOUR_AFFILIATE_ID',     // TODO: replace with your Booking.com affiliate ID

  // Ko-fi tip jar: replace with your Ko-fi username URL
  kofi: 'https://ko-fi.com/andyapps',            // TODO: replace with your Ko-fi URL
};

// Ticket platform affiliate URL lookup (used in Gig Dossier "Booked Via" link)
const TICKET_PLATFORM_URLS = {
  'ticketmaster': AFFILIATE.ticketmaster,
  'see tickets': AFFILIATE.seetickets,
  'seetickets': AFFILIATE.seetickets,
  'skiddle': AFFILIATE.skiddle,
  'dice': 'https://dice.fm',
  'gigantic': AFFILIATE.gigantic,
  'axs': 'https://www.axs.com',
  'ents24': 'https://www.ents24.com',
  'songkick': 'https://www.songkick.com',
  'venue direct': null,
};

// ============================================================
// App State
// ============================================================
const App = {
  currentScreen: 'calendar',
  currentMonth: new Date().getMonth(),
  currentYear: new Date().getFullYear(),
  allGigs: [],
  filteredGigs: [],
  currentFilter: 'all',
  searchQuery: '',
  statsPeriod: 'year',
  currentDossierId: null,
  currentScrapbookId: null,
  currentPhotoIndex: 0,
  currentViewerTab: 'photos',
  pendingPhotoCategory: 'photo',
  isEditingDossier: false,
  settings: loadSettings()
};

// ============================================================
// Settings Helpers
// ============================================================
function loadSettings() {
  try {
    const saved = localStorage.getItem('mygiglife-settings');
    if (saved) {
      const s = JSON.parse(saved);
      // Ensure new fields exist
      if (!s.user) s.user = {};
      if (s.user.homeLatitude === undefined) s.user.homeLatitude = null;
      if (s.user.homeLongitude === undefined) s.user.homeLongitude = null;
      return s;
    }
  } catch (e) { /* ignore */ }
  return {
    user: { name: '', homePostcode: '', homeLatitude: null, homeLongitude: null },
    budget: { annual: 0 },
    photos: { quality: 'standard' },
    notifications: { onSaleReminders: true, gigTomorrow: true, rateYourGig: true }
  };
}

function saveSettings() {
  localStorage.setItem('mygiglife-settings', JSON.stringify(App.settings));
}

// ============================================================
// Utility Functions
// ============================================================
function formatDate(dateStr) {
  if (!dateStr) return '';
  const [y, m, d] = dateStr.split('-').map(Number);
  const date = new Date(y, m - 1, d);
  return date.toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
}

function formatDateShort(dateStr) {
  if (!dateStr) return '';
  const [y, m, d] = dateStr.split('-').map(Number);
  const date = new Date(y, m - 1, d);
  return date.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
}

function formatDateMedium(dateStr) {
  if (!dateStr) return '';
  const [y, m, d] = dateStr.split('-').map(Number);
  const date = new Date(y, m - 1, d);
  return date.toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });
}

function getCountdown(dateStr) {
  if (!dateStr) return null;
  const [y, m, d] = dateStr.split('-').map(Number);
  const gigDate = new Date(y, m - 1, d);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  gigDate.setHours(0, 0, 0, 0);
  const diff = Math.round((gigDate - today) / (1000 * 60 * 60 * 24));
  if (diff < 0) return null;
  if (diff === 0) return 'Tonight!';
  if (diff === 1) return 'Tomorrow!';
  if (diff < 7) return `${diff} days`;
  if (diff < 30) return `${Math.floor(diff / 7)}w`;
  if (diff < 365) return `${Math.floor(diff / 30)}mo`;
  return `${Math.floor(diff / 365)}yr`;
}

function isPast(dateStr) {
  if (!dateStr) return false;
  const [y, m, d] = dateStr.split('-').map(Number);
  const gigDate = new Date(y, m - 1, d);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return gigDate < today;
}

function isToday(dateStr) {
  if (!dateStr) return false;
  const today = new Date();
  const todayStr = `${today.getFullYear()}-${String(today.getMonth()+1).padStart(2,'0')}-${String(today.getDate()).padStart(2,'0')}`;
  return dateStr === todayStr;
}

function starString(rating) {
  if (!rating) return '';
  return '★'.repeat(rating) + '☆'.repeat(5 - rating);
}

function statusLabel(status) {
  const labels = { wishlist: '★ Wishlist', booked: '✓ Booked', attended: '♪ Attended', dna: '✗ DNA' };
  return labels[status] || status;
}

function showToast(message) {
  // Remove any existing toast
  document.querySelectorAll('.toast').forEach(t => t.remove());
  const t = document.createElement('div');
  t.className = 'toast';
  t.textContent = message;
  document.body.appendChild(t);
  requestAnimationFrame(() => {
    requestAnimationFrame(() => t.classList.add('show'));
  });
  setTimeout(() => {
    t.classList.remove('show');
    setTimeout(() => t.remove(), 300);
  }, 3000);
}

function showConfirm(title, message, confirmText, onConfirm, isDanger = false) {
  const overlay = document.createElement('div');
  overlay.className = 'confirm-overlay';
  overlay.innerHTML = `
    <div class="confirm-sheet">
      <div class="confirm-title">${title}</div>
      <div class="confirm-message">${message}</div>
      <div class="confirm-btns">
        <button class="confirm-btn cancel">Cancel</button>
        <button class="confirm-btn ${isDanger ? 'danger' : 'confirm'}">${confirmText}</button>
      </div>
    </div>
  `;
  document.body.appendChild(overlay);
  requestAnimationFrame(() => {
    requestAnimationFrame(() => overlay.classList.add('visible'));
  });

  overlay.querySelector('.cancel').addEventListener('click', () => {
    overlay.classList.remove('visible');
    setTimeout(() => overlay.remove(), 300);
  });
  overlay.querySelector(`.${isDanger ? 'danger' : 'confirm'}`).addEventListener('click', () => {
    overlay.classList.remove('visible');
    setTimeout(() => overlay.remove(), 300);
    onConfirm();
  });
  overlay.addEventListener('click', (e) => {
    if (e.target === overlay) {
      overlay.classList.remove('visible');
      setTimeout(() => overlay.remove(), 300);
    }
  });
}

function createGigTemplate(overrides = {}) {
  return {
    id: null,
    artist: '',
    subtitle: '',
    date: '',
    endDate: '',
    isFestival: false,
    lineup: [],
    status: 'wishlist',
    venue: { name: '', address: '', postcode: '', website: '', latitude: null, longitude: null },
    times: { doors: '', stage: '' },
    tickets: { bookingRef: '', approxPrice: '', quantity: 1, bookedVia: '', presaleCode: '', onSaleDate: '' },
    people: { goingWith: [] },
    supportActs: [],
    transport: '',
    notes: '',
    rating: 0,
    scrapbook: { photos: [] },
    resources: [],
    createdAt: '',
    updatedAt: '',
    ...overrides
  };
}

// ============================================================
// Navigation
// ============================================================
function navigateTo(screenId) {
  // Hide all screens
  document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
  // Show target
  const target = document.getElementById(`screen-${screenId}`);
  if (target) target.classList.add('active');

  // Update nav
  document.querySelectorAll('.nav-item[data-screen]').forEach(item => {
    item.classList.toggle('active', item.dataset.screen === screenId);
  });

  App.currentScreen = screenId;

  // Render the screen
  switch (screenId) {
    case 'calendar': renderCalendar(); break;
    case 'gigs': renderGigsList(); break;
    case 'stats': renderStats(); break;
    case 'scrapbook': renderScrapbook(); break;
    case 'settings': renderSettings(); break;
  }
}

function openSubScreen(screenId) {
  const screen = document.getElementById(`screen-${screenId}`);
  if (screen) {
    screen.classList.add('active');
    // Small delay to trigger transition
    requestAnimationFrame(() => {
      requestAnimationFrame(() => screen.classList.add('active'));
    });
  }
}

function closeSubScreen(screenId) {
  const screen = document.getElementById(`screen-${screenId}`);
  if (screen) screen.classList.remove('active');
}

// ============================================================
// Calendar Screen
// ============================================================
function renderCalendar() {
  const container = document.getElementById('calendar-container');
  if (!container) return;

  const now = new Date();
  const year = App.currentYear;
  const month = App.currentMonth;

  // Month display
  const monthNames = ['January','February','March','April','May','June',
    'July','August','September','October','November','December'];
  document.getElementById('cal-month-name').textContent = `${monthNames[month]} ${year}`;

  // Build calendar grid
  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);
  const startDow = firstDay.getDay(); // 0=Sun
  // Shift so Mon=0
  const startOffset = (startDow === 0 ? 6 : startDow - 1);

  // Group gigs by date (for single-day gigs)
  const gigsByDate = {};
  App.allGigs.forEach(gig => {
    if (!gigsByDate[gig.date]) gigsByDate[gig.date] = [];
    gigsByDate[gig.date].push(gig);
  });

  // Build festival range map: dateStr -> [{gig, status}]
  const festivalByDate = {};
  App.allGigs.filter(g => g.isFestival && g.date && g.endDate).forEach(gig => {
    const [sy, sm, sd] = gig.date.split('-').map(Number);
    const [ey, em, ed] = gig.endDate.split('-').map(Number);
    let cur = new Date(sy, sm - 1, sd);
    const end = new Date(ey, em - 1, ed);
    while (cur <= end) {
      const ds = `${cur.getFullYear()}-${String(cur.getMonth()+1).padStart(2,'0')}-${String(cur.getDate()).padStart(2,'0')}`;
      if (!festivalByDate[ds]) festivalByDate[ds] = [];
      festivalByDate[ds].push(gig);
      cur.setDate(cur.getDate() + 1);
    }
  });

  let gridHTML = '';
  // Previous month filler
  const prevMonthLast = new Date(year, month, 0).getDate();
  for (let i = startOffset - 1; i >= 0; i--) {
    const dayNum = prevMonthLast - i;
    const prevMonth = month === 0 ? 11 : month - 1;
    const prevYear = month === 0 ? year - 1 : year;
    const dateStr = `${prevYear}-${String(prevMonth+1).padStart(2,'0')}-${String(dayNum).padStart(2,'0')}`;
    gridHTML += buildCalCell(dayNum, dateStr, gigsByDate[dateStr] || [], true, false, festivalByDate[dateStr] || []);
  }

  // Current month days
  for (let d = 1; d <= lastDay.getDate(); d++) {
    const dateStr = `${year}-${String(month+1).padStart(2,'0')}-${String(d).padStart(2,'0')}`;
    const todayCheck = isToday(dateStr);
    gridHTML += buildCalCell(d, dateStr, gigsByDate[dateStr] || [], false, todayCheck, festivalByDate[dateStr] || []);
  }

  // Next month filler
  const totalCells = startOffset + lastDay.getDate();
  const remainingCells = totalCells % 7 === 0 ? 0 : 7 - (totalCells % 7);
  for (let d = 1; d <= remainingCells; d++) {
    const nextMonth = month === 11 ? 0 : month + 1;
    const nextYear = month === 11 ? year + 1 : year;
    const dateStr = `${nextYear}-${String(nextMonth+1).padStart(2,'0')}-${String(d).padStart(2,'0')}`;
    gridHTML += buildCalCell(d, dateStr, gigsByDate[dateStr] || [], true, false, festivalByDate[dateStr] || []);
  }

  document.getElementById('calendar-grid').innerHTML = gridHTML;

  // Attach click handlers to cells with gigs or festivals
  document.querySelectorAll('.cal-cell[data-date]').forEach(cell => {
    const date = cell.dataset.date;
    const gigs = gigsByDate[date] || [];
    const festivals = festivalByDate[date] || [];
    // Combine: gigs not already in festivals list
    const festivalIds = new Set(festivals.map(f => f.id));
    const standaloneGigs = gigs.filter(g => !festivalIds.has(g.id));
    const allItems = [...standaloneGigs, ...festivals.filter(f => !gigs.find(g => g.id === f.id))];
    // also include festival gigs that appear in gigsByDate (start date)
    const combined = gigs.length > 0 ? gigs : festivals;
    if (combined.length > 0) {
      cell.addEventListener('click', () => {
        // All items for this date (deduplicated)
        const seen = new Set();
        const unique = [...gigs, ...festivals].filter(g => {
          if (seen.has(g.id)) return false;
          seen.add(g.id);
          return true;
        });
        if (unique.length === 1) {
          openDossier(unique[0].id);
        } else {
          showCalDatePicker(date, unique);
        }
      });
    }
  });

  // Coming up section
  renderComingUp();
}

function showCalDatePicker(date, gigs) {
  const existing = document.getElementById('cal-date-picker');
  if (existing) existing.remove();

  const overlay = document.createElement('div');
  overlay.id = 'cal-date-picker';
  overlay.className = 'confirm-overlay';
  overlay.innerHTML = `
    <div class="confirm-sheet">
      <div class="confirm-title">${formatDateShort(date)}</div>
      <div style="margin-bottom:12px">
        ${gigs.map(g => `
          <div class="cal-picker-item" data-id="${g.id}" style="padding:12px 0;border-bottom:1px solid var(--bg-kraft);cursor:pointer;display:flex;align-items:center;gap:10px">
            <div class="legend-dot" style="background:var(--${g.status}-border);width:12px;height:12px;border-radius:50%;flex-shrink:0"></div>
            <div>
              <div style="font-size:16px;font-weight:600;color:var(--text-primary)">${escHtml(g.artist)}</div>
              <div style="font-size:14px;color:var(--text-secondary)">${g.isFestival ? '🎪 Festival' : (g.venue && g.venue.name ? g.venue.name : '')}</div>
            </div>
          </div>`).join('')}
      </div>
      <div class="confirm-btns">
        <button class="confirm-btn cancel">Cancel</button>
      </div>
    </div>
  `;
  document.body.appendChild(overlay);
  requestAnimationFrame(() => requestAnimationFrame(() => overlay.classList.add('visible')));

  overlay.querySelector('.cancel').addEventListener('click', () => {
    overlay.classList.remove('visible');
    setTimeout(() => overlay.remove(), 300);
  });
  overlay.querySelectorAll('.cal-picker-item').forEach(item => {
    item.addEventListener('click', () => {
      overlay.remove();
      openDossier(item.dataset.id);
    });
  });
}

function buildCalCell(day, dateStr, gigs, isOtherMonth, isCurrentDay) {
  const hasClash = gigs.length >= 2;
  const hasGigs = gigs.length > 0;

  // Use a colored circle around the date number based on status
  // Today always gets the dark "today" circle; gig circles only apply to non-today cells
  let statusClass = '';
  if (hasGigs && !isCurrentDay) {
    statusClass = hasClash ? 'multi-gig' : gigs[0].status;
  }

  const clashHTML = hasClash ? `<div class="cal-clash">CLASH!</div>` : '';
  const titleAttr = hasGigs ? `title="${gigs.map(g => g.artist).join(' / ')}"` : '';

  return `<div class="cal-cell ${isOtherMonth ? 'other-month' : ''} ${isCurrentDay ? 'today' : ''} ${hasGigs ? 'has-gigs' : ''}" ${hasGigs ? `data-date="${dateStr}"` : ''}>
    <div class="cal-date ${statusClass}" ${titleAttr}>${day}</div>
    ${clashHTML}
  </div>`;
}

function renderComingUp() {
  const container = document.getElementById('coming-up-list');
  if (!container) return;

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const upcoming = App.allGigs
    .filter(g => {
      const [y,m,d] = g.date.split('-').map(Number);
      const gd = new Date(y, m-1, d);
      return gd >= today && (g.status === 'booked' || g.status === 'wishlist');
    })
    .sort((a, b) => a.date.localeCompare(b.date))
    .slice(0, 5);

  if (upcoming.length === 0) {
    container.innerHTML = `<div class="coming-up-empty">No upcoming gigs — add some! 🎸</div>`;
    return;
  }

  container.innerHTML = upcoming.map(gig => {
    const countdown = getCountdown(gig.date);
    const venue = gig.venue && gig.venue.name ? gig.venue.name : 'Venue TBC';
    return `<div class="mini-gig-card" data-id="${gig.id}">
      <div class="mini-card-strip ${gig.status}"></div>
      <div class="mini-card-info">
        <div class="mini-card-artist">${escHtml(gig.artist)}</div>
        <div class="mini-card-detail">${formatDateShort(gig.date)} · ${escHtml(venue)}</div>
      </div>
      ${countdown ? `<div class="mini-card-countdown ${gig.status}">${countdown}</div>` : ''}
    </div>`;
  }).join('');

  container.querySelectorAll('.mini-gig-card').forEach(card => {
    card.addEventListener('click', () => openDossier(card.dataset.id));
  });
}

// ============================================================
// My Gigs Screen
// ============================================================
function renderGigsList() {
  applyGigsFilters();
  updateGigsListDOM();
}

function applyGigsFilters() {
  let gigs = [...App.allGigs];

  // Filter by status
  if (App.currentFilter !== 'all') {
    if (App.currentFilter === 'past') {
      gigs = gigs.filter(g => g.status === 'attended' || (g.status !== 'wishlist' && isPast(g.date)));
    } else {
      gigs = gigs.filter(g => g.status === App.currentFilter);
    }
  }

  // Search
  if (App.searchQuery) {
    const q = App.searchQuery.toLowerCase();
    gigs = gigs.filter(g =>
      g.artist.toLowerCase().includes(q) ||
      (g.venue && g.venue.name && g.venue.name.toLowerCase().includes(q)) ||
      (g.notes && g.notes.toLowerCase().includes(q))
    );
  }

  App.filteredGigs = gigs;
}

function updateGigsListDOM() {
  const container = document.getElementById('gigs-list-container');
  if (!container) return;

  if (App.filteredGigs.length === 0) {
    container.innerHTML = `
      <div class="gigs-empty-state">
        <div class="gigs-empty-icon">🎸</div>
        <div class="gigs-empty-title">No gigs found</div>
        <div class="gigs-empty-sub">${App.currentFilter !== 'all' || App.searchQuery ? 'Try a different filter or search' : 'Tap + to add your first gig!'}</div>
      </div>`;
    return;
  }

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  // Sort: upcoming first (by date asc), then past (by date desc)
  // Status takes priority: attended/dna are always Past regardless of date
  const upcoming = App.filteredGigs
    .filter(g => {
      if (g.status === 'attended' || g.status === 'dna') return false;
      const [y,m,d] = g.date.split('-').map(Number);
      return new Date(y,m-1,d) >= today;
    })
    .sort((a, b) => a.date.localeCompare(b.date));

  const past = App.filteredGigs
    .filter(g => {
      if (g.status === 'attended' || g.status === 'dna') return true;
      const [y,m,d] = g.date.split('-').map(Number);
      return new Date(y,m-1,d) < today;
    })
    .sort((a, b) => b.date.localeCompare(a.date));

  let html = '';
  if (upcoming.length > 0) {
    html += `<div class="gigs-section-header">Upcoming</div>`;
    html += upcoming.map(gig => buildGigCard(gig)).join('');
  }
  if (past.length > 0) {
    html += `<div class="gigs-section-header">Past Gigs</div>`;
    html += past.map(gig => buildGigCard(gig)).join('');
  }

  container.innerHTML = html;

  container.querySelectorAll('.gig-card').forEach(card => {
    card.addEventListener('click', () => openDossier(card.dataset.id));
  });
}

function buildGigCard(gig) {
  const countdown = getCountdown(gig.date);
  const venue = gig.venue && gig.venue.name ? gig.venue.name : 'Venue TBC';
  const times = [];
  if (gig.times && gig.times.doors) times.push(`Doors ${gig.times.doors}`);
  if (gig.times && gig.times.stage) times.push(`Stage ${gig.times.stage}`);

  return `<div class="gig-card" data-id="${gig.id}">
    <div class="gig-card-strip ${gig.status}"></div>
    <div class="gig-card-body">
      <div class="gig-card-artist">${escHtml(gig.artist)}</div>
      <div class="gig-card-date-venue">${formatDateShort(gig.date)} · ${escHtml(venue)}</div>
      ${times.length ? `<div class="gig-card-times">${times.join(' · ')}</div>` : ''}
      <div class="gig-card-footer">
        <span class="status-badge ${gig.status}">${statusLabel(gig.status)}</span>
        ${countdown && gig.status === 'booked' ? `<span class="countdown-pill">${countdown}</span>` : ''}
        ${gig.rating ? `<span class="star-rating-display">${'★'.repeat(gig.rating)}</span>` : ''}
      </div>
    </div>
    <div class="gig-card-chevron">›</div>
  </div>`;
}

// ============================================================
// Add Gig Modal
// ============================================================
function openAddGigModal(prefillDate = null) {
  const modal = document.getElementById('modal-add-gig');
  modal.classList.add('open');

  // Reset form
  document.getElementById('add-gig-form').reset();
  document.getElementById('field-onsale-wrap').style.display = 'none';
  document.getElementById('field-enddate-wrap').style.display = 'none';
  document.getElementById('more-details-content').classList.remove('expanded');
  document.getElementById('clash-warning').classList.remove('visible');

  // Set status toggle defaults
  setAddGigStatus('wishlist');

  // Prefill date if provided
  if (prefillDate) {
    document.getElementById('field-date').value = prefillDate;
  }

  // Check for clashes on date change
  document.getElementById('field-date').addEventListener('change', checkAddGigClash);
}

function closeAddGigModal() {
  const modal = document.getElementById('modal-add-gig');
  modal.classList.remove('open');
}

function setAddGigStatus(status) {
  document.querySelectorAll('.status-toggle-btn').forEach(btn => {
    btn.classList.remove('active-wishlist', 'active-booked');
  });
  const activeBtn = document.querySelector(`.status-toggle-btn[data-status="${status}"]`);
  if (activeBtn) activeBtn.classList.add(`active-${status}`);

  // Show/hide on-sale date field
  const onsaleWrap = document.getElementById('field-onsale-wrap');
  if (onsaleWrap) onsaleWrap.style.display = status === 'wishlist' ? 'flex' : 'none';
}

function checkAddGigClash() {
  const dateVal = document.getElementById('field-date').value;
  const clashEl = document.getElementById('clash-warning');
  if (!dateVal) { clashEl.classList.remove('visible'); return; }

  const existingOnDate = App.allGigs.filter(g => g.date === dateVal);
  if (existingOnDate.length > 0) {
    clashEl.textContent = `⚠️ Clash! You already have ${existingOnDate.map(g => g.artist).join(', ')} on this date.`;
    clashEl.classList.add('visible');
  } else {
    clashEl.classList.remove('visible');
  }
}

async function saveAddGigForm() {
  const artist = document.getElementById('field-artist').value.trim();
  const date = document.getElementById('field-date').value;

  if (!artist) { showToast('Please enter an artist or event name'); return; }
  if (!date) { showToast('Please select a date'); return; }

  const statusBtns = document.querySelectorAll('.status-toggle-btn');
  let status = 'wishlist';
  statusBtns.forEach(btn => {
    if (btn.classList.contains('active-wishlist')) status = 'wishlist';
    if (btn.classList.contains('active-booked')) status = 'booked';
  });

  const isFestival = document.getElementById('field-festival').checked;
  const endDate = isFestival ? (document.getElementById('field-enddate').value || '') : '';

  const gig = createGigTemplate({
    artist,
    date,
    endDate,
    isFestival,
    status,
    venue: {
      name: document.getElementById('field-venue').value.trim(),
      address: '',
      postcode: '',
      website: ''
    },
    tickets: {
      bookingRef: document.getElementById('field-bookingref').value.trim(),
      approxPrice: document.getElementById('field-price').value.trim(),
      quantity: parseInt(document.getElementById('field-qty').value) || 1,
      bookedVia: document.getElementById('field-bookedvia').value,
      presaleCode: document.getElementById('field-presale').value.trim(),
      onSaleDate: document.getElementById('field-onsale').value
    },
    times: {
      doors: document.getElementById('field-doors').value,
      stage: document.getElementById('field-stage').value
    },
    supportActs: isFestival ? [] : document.getElementById('field-support').value.split(',').map(s => s.trim()).filter(Boolean),
    people: {
      goingWith: document.getElementById('field-goingwith').value.split(',').map(s => s.trim()).filter(Boolean)
    },
    transport: document.getElementById('field-transport').value.trim(),
    notes: document.getElementById('field-notes').value.trim()
  });

  try {
    await DB.saveGig(gig);
    App.allGigs = await DB.getAllGigs();
    closeAddGigModal();
    showToast(`${gig.artist} added to MyGigLife!`);

    // Refresh current screen
    if (App.currentScreen === 'calendar') renderCalendar();
    if (App.currentScreen === 'gigs') renderGigsList();
    if (App.currentScreen === 'stats') renderStats();

    // If saved as booked or attended and no gig ticket resource exists, open dossier
    // then prompt to add ticket details via the resource sheet
    if (status === 'booked' || status === 'attended') {
      const hasTicket = (gig.resources || []).some(r => r.type === 'gigticket' || r.type === 'eticket');
      if (!hasTicket) {
        setTimeout(async () => {
          await openDossier(gig.id);
          setTimeout(() => {
            const freshGig = App.allGigs.find(g => g.id === gig.id);
            if (freshGig) openAddResourceSheet(freshGig, 'gigticket');
          }, 300);
        }, 400);
      }
    }
  } catch (e) {
    console.error('Save error:', e);
    showToast('Failed to save gig. Please try again.');
  }
}

// ============================================================
// Gig Dossier
// ============================================================
async function openDossier(gigId) {
  App.currentDossierId = gigId;
  App.isEditingDossier = false;

  const gig = App.allGigs.find(g => g.id === gigId) || await DB.getGig(gigId);
  if (!gig) { showToast('Gig not found'); return; }

  renderDossier(gig);
  document.getElementById('screen-dossier').classList.add('active');
  // Scroll to top
  document.getElementById('screen-dossier').querySelector('.sub-screen-content').scrollTop = 0;
}

function closeDossier() {
  document.getElementById('screen-dossier').classList.remove('active');
  App.currentDossierId = null;
  App.isEditingDossier = false;
  // Refresh underlying screen
  if (App.currentScreen === 'calendar') renderCalendar();
  if (App.currentScreen === 'gigs') renderGigsList();
  if (App.currentScreen === 'stats') renderStats();
  if (App.currentScreen === 'scrapbook') renderScrapbook();
}

function renderLineupSection(gig) {
  const lineup = gig.lineup || [];
  if (lineup.length === 0) {
    return `<div class="festival-lineup-note">No acts added yet. Tap "+ Add Act" to build the line-up.</div>`;
  }

  // Group acts by day
  const byDay = {};
  lineup.forEach(act => {
    const day = act.day || 'TBC';
    if (!byDay[day]) byDay[day] = [];
    byDay[day].push(act);
  });

  const statusIcon = (status) => {
    if (status === 'plan_to_see') return '★';
    if (status === 'seen') return '✅';
    if (status === 'missed') return '❌';
    return '☐';
  };

  return Object.entries(byDay).sort(([a], [b]) => a.localeCompare(b)).map(([day, acts]) => {
    const dayLabel = acts[0].dayLabel || (day !== 'TBC' ? formatDateShort(day) : 'TBC');
    const actRows = acts.sort((a, b) => (a.time || '').localeCompare(b.time || '')).map(act => {
      const starsHTML = act.status === 'seen'
        ? `<div class="lineup-act-stars">${[1,2,3,4,5].map(n =>
            `<button class="lineup-star ${(act.rating||0) >= n ? 'filled' : ''}" data-act-id="${act.id}" data-star="${n}">★</button>`
          ).join('')}</div>`
        : '';
      return `
        <div class="lineup-act-row ${act.status || ''}" data-act-id="${act.id}" title="Tap to change status">
          <span class="lineup-act-status-icon">${statusIcon(act.status)}</span>
          <div class="lineup-act-info">
            <div class="lineup-act-name">${escHtml(act.artist)}</div>
            <div class="lineup-act-detail">${[act.stage, act.time].filter(Boolean).join(' · ')}</div>
          </div>
          ${starsHTML}
        </div>`;
    }).join('');
    return `<div class="lineup-day-header">${dayLabel}</div>${actRows}`;
  }).join('');
}

function renderAddActForm(gig) {
  // Build day options from festival date range
  const dayOptions = [];
  if (gig.date) {
    const start = new Date(gig.date);
    const end = gig.endDate ? new Date(gig.endDate) : start;
    for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
      const ds = d.toISOString().slice(0, 10);
      const label = d.toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' });
      dayOptions.push(`<option value="${ds}">${label}</option>`);
    }
  }
  dayOptions.push('<option value="TBC">TBC</option>');

  return `
    <div class="add-act-form">
      <div class="dossier-row" style="margin-bottom:8px">
        <input type="text" class="dossier-row-value editable" id="new-act-artist" placeholder="Artist name" style="flex:1">
      </div>
      <div class="dossier-row" style="margin-bottom:8px;gap:8px">
        <select class="dossier-row-value editable" id="new-act-day" style="flex:1">${dayOptions.join('')}</select>
        <input type="text" class="dossier-row-value editable" id="new-act-stage" placeholder="Stage" style="flex:1">
        <input type="time" class="dossier-row-value editable" id="new-act-time" style="flex:1">
      </div>
      <div style="display:flex;gap:8px;margin-top:4px">
        <button class="dossier-action-btn booked-action" id="btn-save-act" style="flex:1;padding:10px">Save Act</button>
        <button class="dossier-action-btn" id="btn-cancel-act" style="flex:1;padding:10px;background:var(--bg-kraft)">Cancel</button>
      </div>
    </div>`;
}

function renderResourcesSection(gig) {
  migrateDocumentsToResources(gig);
  const resources = gig.resources || [];
  const cards = resources.length > 0
    ? resources.map(r => renderResourceCard(r)).join('')
    : `<div class="resources-empty">No resources yet — add tickets, hotel bookings, train tickets and more.</div>`;
  return `<div id="resources-list">${cards}</div>
    <button class="add-resource-btn" id="btn-add-resource">＋ Add Resource</button>`;
}

function renderResourceCard(resource) {
  const type = getResourceType(resource.type);
  const attachments = resource.attachments || [];
  const attachCount = attachments.length;

  const attachHTML = attachments.map(att => {
    const isImage = att.fileType && att.fileType.startsWith('image/');
    const thumb = isImage
      ? `<img class="rattach-thumb" src="${att.data}" alt="${escHtml(att.label || att.fileName)}">`
      : `<div class="rattach-file-icon">📄</div>`;
    return `<div class="rattach-item" data-attach-id="${att.id}" data-resource-id="${resource.id}">
      ${thumb}
      <div class="rattach-label">${escHtml(att.label || att.fileName)}</div>
      <button class="rattach-remove-btn" data-attach-id="${att.id}" data-resource-id="${resource.id}" title="Remove">✕</button>
    </div>`;
  }).join('');

  return `<div class="resource-card" data-resource-id="${resource.id}">
    <div class="resource-card-header">
      <span class="resource-card-icon">${type.icon}</span>
      <div class="resource-card-title-wrap">
        <span class="resource-card-title">${escHtml(resource.title)}</span>
        <span class="resource-type-badge">${type.label}</span>
      </div>
      ${attachCount > 0 ? `<span class="resource-attach-count">📎 ${attachCount}</span>` : ''}
      <button class="resource-delete-btn" data-resource-id="${resource.id}" title="Delete">🗑</button>
      <span class="resource-chevron">›</span>
    </div>
    <div class="resource-card-body">
      ${resource.ticketDetails ? `<div class="dossier-row"><span class="dossier-row-label">Details</span><span class="dossier-row-value">${escHtml(resource.ticketDetails)}</span></div>` : ''}
      ${resource.bookingRef ? `<div class="dossier-row"><span class="dossier-row-label">Booking Ref</span><span class="dossier-row-value">${escHtml(resource.bookingRef)}</span></div>` : ''}
      ${resource.flightNo ? `<div class="dossier-row"><span class="dossier-row-label">Flight No</span><span class="dossier-row-value">${escHtml(resource.flightNo)}</span></div>` : ''}
      ${resource.from || resource.to ? `<div class="dossier-row"><span class="dossier-row-label">From / To</span><span class="dossier-row-value">${escHtml(resource.from || '—')} → ${escHtml(resource.to || '—')}</span></div>` : ''}
      ${resource.depDate ? `<div class="dossier-row"><span class="dossier-row-label">Departure</span><span class="dossier-row-value">${formatDateShort(resource.depDate)}${resource.depTime ? ' at ' + resource.depTime : ''}</span></div>` : ''}
      ${resource.checkin ? `<div class="dossier-row"><span class="dossier-row-label">Check-in</span><span class="dossier-row-value">${formatDateShort(resource.checkin)}${resource.checkinTime ? ' at ' + resource.checkinTime : ''}</span></div>` : ''}
      ${resource.checkout ? `<div class="dossier-row"><span class="dossier-row-label">Check-out</span><span class="dossier-row-value">${formatDateShort(resource.checkout)}</span></div>` : ''}
      ${resource.location ? `<div class="dossier-row"><span class="dossier-row-label">Location</span><span class="dossier-row-value">${escHtml(resource.location)}</span></div>` : ''}
      ${resource.arrDate ? `<div class="dossier-row"><span class="dossier-row-label">Arrival</span><span class="dossier-row-value">${formatDateShort(resource.arrDate)}${resource.arrTime ? ' at ' + resource.arrTime : ''}</span></div>` : ''}
      ${resource.resDate ? `<div class="dossier-row"><span class="dossier-row-label">Reservation</span><span class="dossier-row-value">${formatDateShort(resource.resDate)}${resource.resTime ? ' at ' + resource.resTime : ''}</span></div>` : ''}
      ${resource.covers ? `<div class="dossier-row"><span class="dossier-row-label">Covers</span><span class="dossier-row-value">${resource.covers}</span></div>` : ''}
      ${resource.price ? `<div class="dossier-row"><span class="dossier-row-label">Price</span><span class="dossier-row-value">${resource.quantity && resource.quantity > 1 ? `£${resource.price} × ${resource.quantity} = <strong>£${(resource.price * resource.quantity).toFixed(2)}</strong>` : `£${resource.price}`}</span></div>` : ''}
      ${resource.bookedVia ? `<div class="dossier-row"><span class="dossier-row-label">Booked Via</span><span class="dossier-row-value">${buildBookedViaLink(resource.bookedVia)}</span></div>` : ''}
      ${resource.presaleCode ? `<div class="dossier-row"><span class="dossier-row-label">Pre-sale Code</span><div class="presale-code">${escHtml(resource.presaleCode)}</div></div>` : ''}
      ${resource.onSaleDate ? `<div class="dossier-row"><span class="dossier-row-label">On Sale</span><span class="dossier-row-value">${formatDateShort(resource.onSaleDate)}</span></div>` : ''}
      ${resource.dateBooked ? `<div class="dossier-row"><span class="dossier-row-label">Date Booked</span><span class="dossier-row-value">${formatDateShort(resource.dateBooked)}</span></div>` : ''}
      ${resource.notes ? `<div class="resource-notes">${escHtml(resource.notes)}</div>` : ''}
      ${attachCount > 0 ? `<div class="rattach-grid">${attachHTML}</div>` : ''}
      <div class="resource-add-more">
        <label class="resource-attach-btn" for="res-file-${resource.id}">📎 Add File</label>
        <input type="file" id="res-file-${resource.id}" accept="image/*,application/pdf,.pdf,.doc,.docx,.txt,.png,.jpg,.jpeg" multiple style="display:none" data-resource-id="${resource.id}">
        <label class="resource-attach-btn" for="res-cam-${resource.id}">📷 Take Photo</label>
        <input type="file" id="res-cam-${resource.id}" accept="image/*" capture="environment" style="display:none" data-resource-id="${resource.id}">
      </div>
    </div>
  </div>`;
}

// Migrate old gig.documents[] to the new gig.resources[] format (one-time, on open)
function migrateDocumentsToResources(gig) {
  if (gig.resources) return; // already migrated
  if (gig.documents && gig.documents.length > 0) {
    gig.resources = [{
      id: crypto.randomUUID ? crypto.randomUUID() : Date.now() + '-migrated',
      title: 'Documents',
      type: 'other',
      notes: '',
      addToScrapbook: false,
      attachments: gig.documents.map(doc => ({
        id: doc.id,
        label: doc.name,
        fileName: doc.name,
        fileType: doc.type,
        data: doc.data,
        addedAt: doc.addedAt
      })),
      createdAt: new Date().toISOString()
    }];
  } else {
    gig.resources = [];
  }
}

// Build Booking.com affiliate hotel search URL pre-filled with venue area and gig date
function buildBookingComUrl(venue, gigDate) {
  const area = encodeURIComponent(venue.postcode || venue.name || '');
  const checkin = gigDate || '';
  const checkoutDate = checkin ? new Date(checkin) : null;
  if (checkoutDate) checkoutDate.setDate(checkoutDate.getDate() + 1);
  const checkout = checkoutDate ? checkoutDate.toISOString().slice(0, 10) : '';
  const aid = AFFILIATE.bookingComAffiliateId;
  if (aid && aid !== 'YOUR_AFFILIATE_ID') {
    return `https://www.booking.com/searchresults.html?ss=${area}&checkin=${checkin}&checkout=${checkout}&aid=${aid}`;
  }
  return `https://www.booking.com/searchresults.html?ss=${area}&checkin=${checkin}&checkout=${checkout}`;
}

// Build a tappable affiliate link for a "Booked Via" platform name
function buildBookedViaLink(platform) {
  const key = (platform || '').toLowerCase().trim();
  const url = TICKET_PLATFORM_URLS[key];
  if (url) {
    return `<a href="${escHtml(url)}" target="_blank" class="booked-via-link">${escHtml(platform)}</a>`;
  }
  return escHtml(platform);
}

function renderDossier(gig) {
  const content = document.getElementById('dossier-content');
  if (!content) return;

  const countdown = getCountdown(gig.date);
  const venue = gig.venue || {};
  const times = gig.times || {};
  const tickets = gig.tickets || {};
  const people = gig.people || {};
  const isEditing = App.isEditingDossier;

  // Update sub-header edit button
  const editBtn = document.getElementById('dossier-edit-btn');
  if (editBtn) editBtn.textContent = isEditing ? 'Done' : 'Edit';

  // Build status progression button
  let progressBtn = '';
  if (gig.status === 'wishlist') {
    progressBtn = `<button class="dossier-action-btn booked-action" id="progress-btn">Mark as Booked ✓</button>`;
  } else if (gig.status === 'booked') {
    progressBtn = `<button class="dossier-action-btn attended-action" id="progress-btn">Mark as Attended ✓</button>`;
  }

  // Approx ticket price (text note only, not used in calculations)
  const approxPriceNote = tickets.approxPrice || null;

  // Support acts
  const supportsHTML = gig.supportActs && gig.supportActs.length
    ? gig.supportActs.map(s => `<div class="dossier-row-value">${escHtml(s)}</div>`).join('')
    : `<div class="dossier-row-value" style="color:var(--text-secondary)">Not set</div>`;

  // Going with
  const goingWithHTML = people.goingWith && people.goingWith.length
    ? people.goingWith.map(p => `<div class="dossier-row-value">${escHtml(p)}</div>`).join('')
    : `<div class="dossier-row-value" style="color:var(--text-secondary)">Just me!</div>`;

  const venueMapsUrl = venue.name ? `https://www.google.com/maps/search/${encodeURIComponent(venue.name + ' ' + (venue.address || ''))}` : '';

  // Date display for festivals (range) vs single gigs
  const dateDisplay = gig.isFestival && gig.endDate
    ? `${formatDateMedium(gig.date)} – ${formatDateMedium(gig.endDate)}`
    : formatDateMedium(gig.date);

  content.innerHTML = `
    <!-- Hero -->
    <div class="dossier-hero">
      <div class="washi-tape-label ${gig.status}">${gig.isFestival ? '🎪 ' : ''}${statusLabel(gig.status)}</div>
      <div class="dossier-artist" ${isEditing ? `contenteditable="true" id="edit-artist"` : ''}>${escHtml(gig.artist)}</div>
      ${gig.subtitle ? `<div style="font-size:16px;color:var(--text-secondary);font-style:italic;margin-top:4px">${escHtml(gig.subtitle)}</div>` : ''}
      ${countdown && (gig.status === 'booked' || gig.status === 'wishlist') ? `<div class="dossier-countdown">${countdown}</div>` : ''}
      ${gig.status === 'attended' && gig.rating ? `<div style="font-size:22px;color:var(--accent-gold)">${'★'.repeat(gig.rating)}</div>` : ''}
    </div>

    <div class="dossier-cards">

      <!-- When card -->
      <div class="dossier-card collapsed" id="card-when">
        <div class="dossier-card-header">
          <span class="dossier-card-icon">📅</span>
          <span class="dossier-card-title">When</span>
          <span class="dossier-card-chevron">⌄</span>
        </div>
        <div class="dossier-card-body">
          <div class="dossier-row">
            <span class="dossier-row-label">${gig.isFestival ? 'Start' : 'Date'}</span>
            ${isEditing
              ? `<input type="date" class="dossier-row-value editable" id="edit-date" value="${gig.date}">`
              : `<span class="dossier-row-value">${formatDateMedium(gig.date)}</span>`
            }
          </div>
          ${gig.isFestival ? `
          <div class="dossier-row">
            <span class="dossier-row-label">End</span>
            ${isEditing
              ? `<input type="date" class="dossier-row-value editable" id="edit-enddate" value="${gig.endDate || ''}">`
              : `<span class="dossier-row-value">${gig.endDate ? formatDateMedium(gig.endDate) : '—'}</span>`
            }
          </div>` : ''}
          <div class="dossier-row">
            <span class="dossier-row-label">Doors</span>
            ${isEditing
              ? `<input type="time" class="dossier-row-value editable" id="edit-doors" value="${times.doors || ''}">`
              : `<span class="dossier-row-value">${times.doors || '—'}</span>`
            }
          </div>
          <div class="dossier-row">
            <span class="dossier-row-label">Stage</span>
            ${isEditing
              ? `<input type="time" class="dossier-row-value editable" id="edit-stage" value="${times.stage || ''}">`
              : `<span class="dossier-row-value">${times.stage || '—'}</span>`
            }
          </div>
          <button class="add-to-cal-btn" id="btn-add-cal">📆 Add to Calendar</button>
        </div>
      </div>

      <!-- Venue card -->
      <div class="dossier-card collapsed" id="card-venue">
        <div class="dossier-card-header">
          <span class="dossier-card-icon">📍</span>
          <span class="dossier-card-title">Venue</span>
          <span class="dossier-card-chevron">⌄</span>
        </div>
        <div class="dossier-card-body">
          <div class="dossier-row">
            <span class="dossier-row-label">Name</span>
            ${isEditing
              ? `<input type="text" class="dossier-row-value editable" id="edit-venue-name" value="${escHtml(venue.name||'')}" placeholder="Venue name">`
              : `<span class="dossier-row-value">${venue.name || '—'}</span>`
            }
          </div>
          <div class="dossier-row">
            <span class="dossier-row-label">Address</span>
            ${isEditing
              ? `<input type="text" class="dossier-row-value editable" id="edit-venue-address" value="${escHtml(venue.address||'')}" placeholder="Address">`
              : `<span class="dossier-row-value">${venue.address || '—'}</span>`
            }
          </div>
          ${venue.website ? `
          <div class="dossier-row">
            <span class="dossier-row-label">Website</span>
            <a href="${escHtml(venue.website)}" target="_blank" class="dossier-row-value" style="color:var(--accent-blue)">${venue.website}</a>
          </div>` : ''}
          ${isEditing ? `
          <div class="dossier-row">
            <span class="dossier-row-label">Website</span>
            <input type="url" class="dossier-row-value editable" id="edit-venue-website" value="${escHtml(venue.website||'')}" placeholder="https://...">
          </div>` : ''}
          ${venue.name ? `
          <div class="venue-action-btns">
            <a href="${venueMapsUrl}" target="_blank" class="venue-action-btn">🗺 Map</a>
            <a href="${buildBookingComUrl(venue, gig.date)}" target="_blank" class="venue-action-btn">🏨 Hotels</a>
            <a href="https://www.google.com/maps/search/restaurants+near+${encodeURIComponent(venue.name)}" target="_blank" class="venue-action-btn">🍽 Restaurants</a>
          </div>` : ''}
        </div>
      </div>

      <!-- Tickets & Bookings card -->
      <div class="dossier-card collapsed" id="card-resources">
        <div class="dossier-card-header">
          <span class="dossier-card-icon">🎫</span>
          <span class="dossier-card-title">Tickets &amp; Bookings</span>
          <span class="dossier-card-chevron">⌄</span>
        </div>
        <div class="dossier-card-body">
          ${renderResourcesSection(gig)}
        </div>
      </div>

      <!-- Going With card -->
      <div class="dossier-card collapsed" id="card-going">
        <div class="dossier-card-header">
          <span class="dossier-card-icon">👥</span>
          <span class="dossier-card-title">Going With</span>
          <span class="dossier-card-chevron">⌄</span>
        </div>
        <div class="dossier-card-body">
          ${isEditing
            ? `<input type="text" class="dossier-row-value editable" id="edit-goingwith" value="${(people.goingWith||[]).join(', ')}" placeholder="Names, comma-separated">`
            : goingWithHTML
          }
        </div>
      </div>

      ${gig.isFestival ? `
      <!-- Line-Up card (festivals) -->
      <div class="dossier-card collapsed" id="card-lineup">
        <div class="dossier-card-header">
          <span class="dossier-card-icon">🎶</span>
          <span class="dossier-card-title">Line-Up</span>
          <button class="sub-header-action" id="btn-add-act" style="margin-left:auto;font-size:14px;padding:4px 10px">+ Add Act</button>
          <span class="dossier-card-chevron">⌄</span>
        </div>
        <div class="dossier-card-body">
          <div class="lineup-section" id="lineup-list">
            ${renderLineupSection(gig)}
          </div>
          <div id="add-act-form-wrap" style="display:none">
            ${renderAddActForm(gig)}
          </div>
        </div>
      </div>` : `
      <!-- Support Acts (non-festivals) -->
      <div class="dossier-card collapsed" id="card-support">
        <div class="dossier-card-header">
          <span class="dossier-card-icon">🎵</span>
          <span class="dossier-card-title">Support Acts</span>
          <span class="dossier-card-chevron">⌄</span>
        </div>
        <div class="dossier-card-body">
          ${isEditing
            ? `<input type="text" class="dossier-row-value editable" id="edit-support" value="${(gig.supportActs||[]).join(', ')}" placeholder="Support acts, comma-separated">`
            : supportsHTML
          }
        </div>
      </div>`}

      <!-- Transport card -->
      <div class="dossier-card collapsed" id="card-transport">
        <div class="dossier-card-header">
          <span class="dossier-card-icon">🚗</span>
          <span class="dossier-card-title">Transport & Parking</span>
          <span class="dossier-card-chevron">⌄</span>
        </div>
        <div class="dossier-card-body">
          ${isEditing
            ? `<textarea class="dossier-row-value editable" id="edit-transport" rows="3" placeholder="Transport notes...">${escHtml(gig.transport||'')}</textarea>`
            : `<span class="dossier-row-value">${gig.transport || '—'}</span>`
          }
        </div>
      </div>

      <!-- Notes card -->
      <div class="dossier-card collapsed" id="card-notes">
        <div class="dossier-card-header">
          <span class="dossier-card-icon">📝</span>
          <span class="dossier-card-title">Notes</span>
          <span class="dossier-card-chevron">⌄</span>
        </div>
        <div class="dossier-card-body">
          <div class="sticky-note" ${isEditing ? 'contenteditable="true" id="edit-notes"' : ''}>${escHtml(gig.notes || (isEditing ? '' : 'No notes yet..'))}</div>
        </div>
      </div>

      ${gig.status === 'attended' ? `
      <!-- Rating card -->
      <div class="dossier-card collapsed" id="card-rating">
        <div class="dossier-card-header">
          <span class="dossier-card-icon">⭐</span>
          <span class="dossier-card-title">Your Rating</span>
          <span class="dossier-card-chevron">⌄</span>
        </div>
        <div class="dossier-card-body">
          <div class="star-rating-input" id="star-rating-input">
            ${[1,2,3,4,5].map(n => `<button class="star-btn ${(gig.rating||0) >= n ? 'filled' : ''}" data-star="${n}">★</button>`).join('')}
          </div>
        </div>
      </div>` : ''}

      <!-- Scrapbook link (attended only) -->
      ${gig.status === 'attended' ? `
      <button class="dossier-action-btn share-action" id="btn-scrapbook" style="background:var(--attended-bg);color:var(--attended-text);border-color:var(--attended-border)">
        📸 Open Scrapbook
      </button>` : ''}

      <!-- Action buttons -->
      ${progressBtn}
      <button class="dossier-action-btn share-action" id="btn-share">Share 📤</button>
      ${gig.status !== 'dna' ? `<div class="dossier-dna-link" id="btn-dna">Mark as DNA</div>` : ''}
      <button class="dossier-action-btn" id="btn-delete" style="background:var(--dna-bg);color:var(--dna-text);border-color:var(--dna-border);margin-top:4px">
        🗑 Delete Gig
      </button>

    </div>
  `;

  // Attach event listeners
  attachDossierListeners(gig);
}

function attachDossierListeners(gig) {
  // Collapsible cards
  document.querySelectorAll('.dossier-card-header').forEach(header => {
    header.addEventListener('click', () => {
      header.closest('.dossier-card').classList.toggle('collapsed');
    });
  });

  // Add to calendar
  const calBtn = document.getElementById('btn-add-cal');
  if (calBtn) calBtn.addEventListener('click', () => downloadICS(gig));

  // Presale copy
  const presaleCopy = document.getElementById('presale-copy');
  if (presaleCopy) {
    presaleCopy.addEventListener('click', () => {
      navigator.clipboard.writeText(gig.tickets.presaleCode).then(() => {
        showToast('Pre-sale code copied!');
      }).catch(() => {
        showToast(gig.tickets.presaleCode);
      });
    });
  }

  // Status progression
  const progressBtn = document.getElementById('progress-btn');
  if (progressBtn) {
    progressBtn.addEventListener('click', async () => {
      const newStatus = gig.status === 'wishlist' ? 'booked' : 'attended';
      await updateGigStatus(gig.id, newStatus);
    });
  }

  // Share
  const shareBtn = document.getElementById('btn-share');
  if (shareBtn) {
    shareBtn.addEventListener('click', () => shareGig(gig));
  }

  // DNA
  const dnaBtn = document.getElementById('btn-dna');
  if (dnaBtn) {
    dnaBtn.addEventListener('click', () => {
      showConfirm(
        'Mark as DNA?',
        `Mark "${gig.artist}" as Did Not Attend?`,
        'Mark DNA',
        async () => {
          await updateGigStatus(gig.id, 'dna');
        },
        true
      );
    });
  }

  // Delete
  const deleteBtn = document.getElementById('btn-delete');
  if (deleteBtn) {
    deleteBtn.addEventListener('click', () => {
      showConfirm(
        'Delete Gig',
        `Permanently delete "${gig.artist}"? This cannot be undone.`,
        'Delete',
        async () => {
          await DB.deleteGig(gig.id);
          App.allGigs = await DB.getAllGigs();
          closeDossier();
          showToast('Gig deleted');
        },
        true
      );
    });
  }

  // Scrapbook button
  const scrapbookBtn = document.getElementById('btn-scrapbook');
  if (scrapbookBtn) {
    scrapbookBtn.addEventListener('click', () => openScrapbookViewer(gig.id));
  }

  // Resources listeners
  attachResourceListeners(gig);

  // Star rating
  const starInput = document.getElementById('star-rating-input');
  if (starInput) {
    starInput.querySelectorAll('.star-btn').forEach(btn => {
      btn.addEventListener('click', async () => {
        const rating = parseInt(btn.dataset.star);
        gig.rating = rating;
        await DB.saveGig(gig);
        App.allGigs = await DB.getAllGigs();
        // Re-render stars
        starInput.querySelectorAll('.star-btn').forEach(s => {
          s.classList.toggle('filled', parseInt(s.dataset.star) <= rating);
        });
        showToast(`Rated ${rating} star${rating !== 1 ? 's' : ''}!`);
      });
    });
  }

  // Festival lineup: + Add Act button
  if (gig.isFestival) {
    const addActBtn = document.getElementById('btn-add-act');
    if (addActBtn) {
      addActBtn.addEventListener('click', (e) => {
        e.stopPropagation(); // prevent card collapse
        const formWrap = document.getElementById('add-act-form-wrap');
        if (formWrap) formWrap.style.display = formWrap.style.display === 'none' ? '' : 'none';
      });
    }

    // Save new act
    const saveActBtn = document.getElementById('btn-save-act');
    if (saveActBtn) {
      saveActBtn.addEventListener('click', async () => {
        const artist = document.getElementById('new-act-artist').value.trim();
        if (!artist) { showToast('Please enter an artist name'); return; }
        const dayEl = document.getElementById('new-act-day');
        const day = dayEl ? dayEl.value : 'TBC';
        const dayLabel = dayEl ? dayEl.options[dayEl.selectedIndex].text : 'TBC';
        const stage = document.getElementById('new-act-stage').value.trim();
        const time = document.getElementById('new-act-time').value;
        if (!gig.lineup) gig.lineup = [];
        gig.lineup.push({
          id: crypto.randomUUID ? crypto.randomUUID() : Date.now() + Math.random().toString(36),
          artist, day, dayLabel, stage, time,
          status: null, seen: false, rating: null
        });
        await DB.saveGig(gig);
        App.allGigs = await DB.getAllGigs();
        const lineupList = document.getElementById('lineup-list');
        if (lineupList) lineupList.innerHTML = renderLineupSection(gig);
        document.getElementById('add-act-form-wrap').style.display = 'none';
        // Re-attach lineup listeners
        attachLineupListeners(gig);
        showToast(`${artist} added to line-up!`);
      });
    }

    // Cancel add act
    const cancelActBtn = document.getElementById('btn-cancel-act');
    if (cancelActBtn) {
      cancelActBtn.addEventListener('click', () => {
        document.getElementById('add-act-form-wrap').style.display = 'none';
      });
    }

    attachLineupListeners(gig);
  }
}

function attachLineupListeners(gig) {
  const lineupList = document.getElementById('lineup-list');
  if (!lineupList) return;

  // Act row tap → cycle status
  lineupList.querySelectorAll('.lineup-act-row').forEach(row => {
    row.addEventListener('click', async (e) => {
      // Don't trigger if clicking a star
      if (e.target.classList.contains('lineup-star')) return;
      const actId = row.dataset.actId;
      const act = (gig.lineup || []).find(a => a.id === actId);
      if (!act) return;
      const cycle = [null, 'plan_to_see', 'seen', 'missed'];
      const currentIdx = cycle.indexOf(act.status);
      act.status = cycle[(currentIdx + 1) % cycle.length];
      if (act.status !== 'seen') { act.seen = false; act.rating = null; }
      else { act.seen = true; }
      await DB.saveGig(gig);
      App.allGigs = await DB.getAllGigs();
      const lineupListEl = document.getElementById('lineup-list');
      if (lineupListEl) lineupListEl.innerHTML = renderLineupSection(gig);
      attachLineupListeners(gig);
    });
  });

  // Lineup star rating
  lineupList.querySelectorAll('.lineup-star').forEach(btn => {
    btn.addEventListener('click', async (e) => {
      e.stopPropagation();
      const actId = btn.dataset.actId;
      const star = parseInt(btn.dataset.star);
      const act = (gig.lineup || []).find(a => a.id === actId);
      if (!act) return;
      act.rating = star;
      await DB.saveGig(gig);
      App.allGigs = await DB.getAllGigs();
      const lineupListEl = document.getElementById('lineup-list');
      if (lineupListEl) lineupListEl.innerHTML = renderLineupSection(gig);
      attachLineupListeners(gig);
    });
  });
}

async function updateGigStatus(gigId, newStatus) {
  const gig = App.allGigs.find(g => g.id === gigId);
  if (!gig) return;
  gig.status = newStatus;
  await DB.saveGig(gig);
  App.allGigs = await DB.getAllGigs();
  const updated = App.allGigs.find(g => g.id === gigId);
  renderDossier(updated);
  showToast(`Marked as ${statusLabel(newStatus)}`);

  // If newly booked or attended, prompt to add gig ticket resource if none exists
  if (newStatus === 'booked' || newStatus === 'attended') {
    const hasTicket = (updated.resources || []).some(r => r.type === 'gigticket' || r.type === 'eticket');
    if (!hasTicket) {
      setTimeout(() => openAddResourceSheet(updated, 'gigticket'), 350);
    }
  }
}

async function saveDossierEdits(gigId) {
  const gig = App.allGigs.find(g => g.id === gigId);
  if (!gig) return;

  // Read edited fields
  const artistEl = document.getElementById('edit-artist');
  if (artistEl) gig.artist = artistEl.textContent.trim();

  const dateEl = document.getElementById('edit-date');
  if (dateEl) gig.date = dateEl.value;

  const endDateEl = document.getElementById('edit-enddate');
  if (endDateEl) gig.endDate = endDateEl.value;

  const doorsEl = document.getElementById('edit-doors');
  if (doorsEl) gig.times.doors = doorsEl.value;

  const stageEl = document.getElementById('edit-stage');
  if (stageEl) gig.times.stage = stageEl.value;

  const venueNameEl = document.getElementById('edit-venue-name');
  if (venueNameEl) gig.venue.name = venueNameEl.value.trim();

  const venueAddrEl = document.getElementById('edit-venue-address');
  if (venueAddrEl) gig.venue.address = venueAddrEl.value.trim();

  const venueWebEl = document.getElementById('edit-venue-website');
  if (venueWebEl) gig.venue.website = venueWebEl.value.trim();

  const bookingRefEl = document.getElementById('edit-bookingref');
  if (bookingRefEl) gig.tickets.bookingRef = bookingRefEl.value.trim();

  const priceEl = document.getElementById('edit-price');
  if (priceEl) gig.tickets.approxPrice = priceEl.value.trim();

  const qtyEl = document.getElementById('edit-qty');
  if (qtyEl) gig.tickets.quantity = parseInt(qtyEl.value) || 1;

  const bookedViaEl = document.getElementById('edit-bookedvia');
  if (bookedViaEl) gig.tickets.bookedVia = bookedViaEl.value.trim();

  const goingWithEl = document.getElementById('edit-goingwith');
  if (goingWithEl) gig.people.goingWith = goingWithEl.value.split(',').map(s => s.trim()).filter(Boolean);

  const supportEl = document.getElementById('edit-support');
  if (supportEl) gig.supportActs = supportEl.value.split(',').map(s => s.trim()).filter(Boolean);

  const transportEl = document.getElementById('edit-transport');
  if (transportEl) gig.transport = transportEl.value.trim();

  const notesEl = document.getElementById('edit-notes');
  if (notesEl) gig.notes = notesEl.innerText.trim();

  await DB.saveGig(gig);
  App.allGigs = await DB.getAllGigs();
  App.isEditingDossier = false;
  const updated = App.allGigs.find(g => g.id === gigId);
  renderDossier(updated);
  showToast('Saved!');
}

// ============================================================
// ICS Export
// ============================================================
function downloadICS(gig) {
  const date = gig.date.replace(/-/g, '');
  const doorsTime = (gig.times && gig.times.doors) ? gig.times.doors.replace(':', '') + '00' : '190000';
  const venueName = (gig.venue && gig.venue.name) ? gig.venue.name : 'TBC';
  const venueAddr = (gig.venue && gig.venue.address) ? gig.venue.address : '';
  const doorsDisplay = (gig.times && gig.times.doors) ? gig.times.doors : 'TBC';
  const stageDisplay = (gig.times && gig.times.stage) ? gig.times.stage : 'TBC';

  const ics = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//MyGigLife//EN',
    'BEGIN:VEVENT',
    `DTSTART:${date}T${doorsTime}`,
    `DTEND:${date}T230000`,
    `SUMMARY:${gig.artist} at ${venueName}`,
    `LOCATION:${venueAddr}`,
    `DESCRIPTION:Doors: ${doorsDisplay} | Stage: ${stageDisplay}`,
    `UID:${gig.id}@mygiglife`,
    'END:VEVENT',
    'END:VCALENDAR'
  ].join('\r\n');

  const blob = new Blob([ics], { type: 'text/calendar;charset=utf-8' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = `${gig.artist.replace(/[^a-z0-9]/gi, '-')}-gig.ics`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(a.href);
}

// ============================================================
// Share
// ============================================================
function shareGig(gig) {
  const venue = gig.venue && gig.venue.name ? ` at ${gig.venue.name}` : '';
  const text = `I'm going to see ${gig.artist}${venue} on ${formatDateShort(gig.date)}! 🎸`;

  if (navigator.share) {
    navigator.share({ title: 'MyGigLife', text }).catch(() => {});
  } else {
    navigator.clipboard.writeText(text).then(() => {
      showToast('Copied to clipboard!');
    }).catch(() => {
      showToast(text);
    });
  }
}

// ============================================================
// Scrapbook
// ============================================================
function renderScrapbook() {
  const container = document.getElementById('scrapbook-grid');
  if (!container) return;

  const attendedGigs = App.allGigs
    .filter(g => g.status === 'attended')
    .sort((a, b) => b.date.localeCompare(a.date));

  if (attendedGigs.length === 0) {
    container.innerHTML = `
      <div class="scrapbook-empty">
        <div class="scrapbook-empty-icon">📸</div>
        <div class="scrapbook-empty-text">Your gig memories will appear here once you've attended some shows!</div>
      </div>`;
    return;
  }

  container.innerHTML = attendedGigs.map(gig => {
    const photos = gig.scrapbook && gig.scrapbook.photos ? gig.scrapbook.photos : [];
    const firstPhoto = photos.length > 0 ? photos[0] : null;
    const stars = gig.rating ? '★'.repeat(gig.rating) : '';

    return `<div class="scrapbook-card" data-id="${gig.id}">
      ${firstPhoto
        ? `<img class="scrapbook-card-photo" src="${firstPhoto.data}" alt="${escHtml(gig.artist)}" loading="lazy">`
        : `<div class="scrapbook-card-photo-placeholder">🎤</div>`
      }
      <div class="scrapbook-card-info">
        <div class="scrapbook-card-artist">${escHtml(gig.artist)}</div>
        <div class="scrapbook-card-date">${formatDateShort(gig.date)}</div>
        ${stars ? `<div class="scrapbook-card-stars">${stars}</div>` : ''}
      </div>
    </div>`;
  }).join('');

  container.querySelectorAll('.scrapbook-card').forEach(card => {
    card.addEventListener('click', () => openScrapbookViewer(card.dataset.id));
  });
}

// ============================================================
// Scrapbook Viewer
// ============================================================
async function openScrapbookViewer(gigId) {
  App.currentScrapbookId = gigId;
  App.currentPhotoIndex = 0;

  const gig = App.allGigs.find(g => g.id === gigId) || await DB.getGig(gigId);
  if (!gig) return;

  renderScrapbookViewer(gig);
  document.getElementById('screen-scrapbook-viewer').classList.add('active');
  document.getElementById('screen-scrapbook-viewer').querySelector('.sub-screen-content').scrollTop = 0;
}

function closeScrapbookViewer() {
  document.getElementById('screen-scrapbook-viewer').classList.remove('active');
  App.currentScrapbookId = null;
  App.currentPhotoIndex = 0;
  if (App.currentScreen === 'scrapbook') renderScrapbook();
}

function renderScrapbookViewer(gig) {
  const viewerBody = document.getElementById('scrapbook-viewer-body');
  if (!viewerBody) return;

  document.getElementById('viewer-artist-name').textContent = gig.artist;

  const photos = (gig.scrapbook && gig.scrapbook.photos) ? gig.scrapbook.photos : [];
  const idx = Math.min(App.currentPhotoIndex, Math.max(0, photos.length - 1));
  const currentPhoto = photos[idx] || null;

  const dotsHTML = photos.length > 1
    ? `<div class="viewer-dot-indicators">${photos.map((_, i) => `<div class="viewer-dot ${i === idx ? 'active' : ''}"></div>`).join('')}</div>`
    : '';

  viewerBody.innerHTML = `
    <div class="viewer-photos-area" id="viewer-photos-area">
      ${photos.length > 0 ? `
        <div class="viewer-photo-grid" id="viewer-photo-grid">
          ${photos.map((p, i) => `
            <div class="viewer-thumb-wrap" data-index="${i}">
              <img class="viewer-thumb" src="${p.data}" data-index="${i}" loading="lazy" alt="Photo ${i+1}">
              ${p.caption ? `<div class="viewer-thumb-caption">${escHtml(p.caption)}</div>` : ''}
            </div>
          `).join('')}
        </div>
      ` : `
        <div class="viewer-photo-placeholder" id="photo-upload-trigger">
          <div style="font-size:48px">📷</div>
          <div style="font-size:16px;margin-top:8px;color:#aaa">Add your first memory</div>
        </div>
      `}
      <label class="viewer-attach-btn" for="viewer-photo-input">📎 Attach Memory</label>
      <input type="file" accept="image/*" id="viewer-photo-input" style="display:none" multiple>
    </div>

    <div class="viewer-info">
      <div class="viewer-date-venue">${formatDateMedium(gig.date)}${gig.venue && gig.venue.name ? ` · ${gig.venue.name}` : ''}</div>
      <div class="viewer-star-rating" id="viewer-star-rating">
        ${[1,2,3,4,5].map(n => `<span class="viewer-star ${(gig.rating||0) >= n ? 'filled' : ''}" data-star="${n}">★</span>`).join('')}
      </div>
      <div class="viewer-notes" contenteditable="true" id="viewer-notes" placeholder="Add notes about this gig...">${escHtml(gig.notes || '')}</div>
    </div>

    <!-- Fullscreen photo lightbox -->
    <div class="photo-lightbox" id="photo-lightbox" style="display:none">
      <button class="lightbox-close" id="lightbox-close">✕</button>
      <button class="lightbox-nav lightbox-prev" id="lightbox-prev">‹</button>
      <div class="lightbox-img-wrap">
        <img class="lightbox-img" id="lightbox-img" src="" alt="">
        <div class="lightbox-counter" id="lightbox-counter"></div>
      </div>
      <button class="lightbox-nav lightbox-next" id="lightbox-next">›</button>
    </div>
  `;

  // Thumbnail → open lightbox
  const grid = document.getElementById('viewer-photo-grid');
  const lightbox = document.getElementById('photo-lightbox');
  const lightboxImg = document.getElementById('lightbox-img');
  const lightboxCounter = document.getElementById('lightbox-counter');

  function openLightbox(index) {
    App.currentPhotoIndex = index;
    lightboxImg.src = photos[index].data;
    lightboxCounter.textContent = `${index + 1} / ${photos.length}`;
    document.getElementById('lightbox-prev').style.display = index === 0 ? 'none' : '';
    document.getElementById('lightbox-next').style.display = index === photos.length - 1 ? 'none' : '';
    lightbox.style.display = 'flex';
  }

  if (grid) {
    grid.querySelectorAll('.viewer-thumb-wrap').forEach(wrap => {
      wrap.addEventListener('click', () => openLightbox(parseInt(wrap.dataset.index)));
    });
  }

  document.getElementById('lightbox-close')?.addEventListener('click', () => { lightbox.style.display = 'none'; });
  lightbox?.addEventListener('click', e => { if (e.target === lightbox) lightbox.style.display = 'none'; });

  document.getElementById('lightbox-prev')?.addEventListener('click', e => {
    e.stopPropagation();
    if (App.currentPhotoIndex > 0) openLightbox(App.currentPhotoIndex - 1);
  });
  document.getElementById('lightbox-next')?.addEventListener('click', e => {
    e.stopPropagation();
    if (App.currentPhotoIndex < photos.length - 1) openLightbox(App.currentPhotoIndex + 1);
  });

  // Photo upload
  const photoInput = document.getElementById('viewer-photo-input');
  const photoTrigger = document.getElementById('photo-upload-trigger');
  if (photoTrigger) {
    photoTrigger.addEventListener('click', () => photoInput && photoInput.click());
  }
  if (photoInput) {
    photoInput.addEventListener('change', async (e) => {
      const files = Array.from(e.target.files);
      if (!files.length) return;

      showToast('Adding memories...');
      const quality = App.settings.photos.quality === 'high' ? 0.9 : 0.7;
      const maxDim = App.settings.photos.quality === 'high' ? 1600 : 1200;

      for (const file of files) {
        const compressed = await compressImage(file, maxDim, quality);
        if (!gig.scrapbook) gig.scrapbook = { photos: [] };
        if (!gig.scrapbook.photos) gig.scrapbook.photos = [];
        gig.scrapbook.photos.push({ data: compressed, caption: '', addedAt: new Date().toISOString() });
      }

      await DB.saveGig(gig);
      App.allGigs = await DB.getAllGigs();
      App.currentPhotoIndex = gig.scrapbook.photos.length - 1;
      renderScrapbookViewer(gig);
      showToast(`${files.length} memor${files.length > 1 ? 'ies' : 'y'} added!`);
    });
  }

  // Star rating
  const starRating = document.getElementById('viewer-star-rating');
  if (starRating) {
    starRating.querySelectorAll('.viewer-star').forEach(star => {
      star.addEventListener('click', async () => {
        const rating = parseInt(star.dataset.star);
        gig.rating = rating;
        await DB.saveGig(gig);
        App.allGigs = await DB.getAllGigs();
        starRating.querySelectorAll('.viewer-star').forEach(s => {
          s.classList.toggle('filled', parseInt(s.dataset.star) <= rating);
        });
        showToast(`Rated ${rating} ★`);
      });
    });
  }

  // Notes save on blur
  const notesEl = document.getElementById('viewer-notes');
  if (notesEl) {
    notesEl.addEventListener('blur', async () => {
      gig.notes = notesEl.innerText.trim();
      await DB.saveGig(gig);
      App.allGigs = await DB.getAllGigs();
    });
  }
}

// Fields shown per resource type. Each entry is an array of field IDs to show.
// Notes and Attachments are always shown. Title and Type are always shown.
const RESOURCE_TYPE_FIELDS = {
  gigticket:  ['bookingref', 'price-qty', 'bookedvia', 'presale', 'onsale', 'date-booked'],
  eticket:    ['ticket-details', 'price-qty', 'date-booked'],
  hotel:      ['bookingref', 'checkin', 'checkout', 'price-qty', 'bookedvia', 'date-booked'],
  train:      ['bookingref', 'from-to', 'dep-datetime', 'price-qty', 'bookedvia', 'date-booked'],
  flight:     ['bookingref', 'flightno', 'from-to', 'dep-datetime', 'price-qty', 'bookedvia', 'date-booked'],
  parking:    ['bookingref', 'location', 'arr-datetime', 'price-qty', 'bookedvia', 'date-booked'],
  restaurant: ['bookingref', 'res-datetime', 'covers', 'price-qty', 'bookedvia', 'date-booked'],
  other:      ['ticket-details', 'price-qty', 'date-booked'],
};

// Label overrides per type for certain fields
const RESOURCE_FIELD_LABELS = {
  train:      { 'from-to': 'From / To', 'dep-datetime': 'Departure' },
  flight:     { 'from-to': 'Departure / Arrival Airport', 'dep-datetime': 'Departure' },
  parking:    { 'location': 'Car Park / Location', 'arr-datetime': 'Arrival Date & Time' },
  restaurant: { 'res-datetime': 'Reservation Date & Time' },
  other:      { 'ticket-details': 'Resource Details' },
};

function openAddResourceSheet(gig, preselectedType = null) {
  const existing = document.getElementById('add-resource-sheet');
  if (existing) existing.remove();

  const defaultType = preselectedType || RESOURCE_TYPES[0].key;
  const typeChips = RESOURCE_TYPES.map(t =>
    `<button class="resource-type-chip${t.key === defaultType ? ' active' : ''}" data-type="${t.key}">${t.icon} ${t.label}</button>`
  ).join('');

  const sheet = document.createElement('div');
  sheet.id = 'add-resource-sheet';
  sheet.className = 'add-resource-overlay';
  sheet.innerHTML = `
    <div class="add-resource-sheet">
      <div class="add-resource-handle"></div>
      <div class="add-resource-title">Add Resource</div>

      <div class="ares-field">
        <label class="ares-label">Title *</label>
        <input type="text" id="ares-title" class="ares-input" placeholder="e.g. Travelodge Birmingham, Virgin Train">
      </div>

      <div class="ares-field">
        <label class="ares-label">Type of Record</label>
        <div class="resource-type-chips" id="ares-type-chips">${typeChips}</div>
      </div>

      <div class="ares-field" data-field="ticket-details">
        <label class="ares-label" data-label="ticket-details">Ticket Details</label>
        <textarea id="ares-ticket-details" class="ares-textarea" rows="2" placeholder="Enter a brief description of the ticket — not for gig tickets!"></textarea>
      </div>

      <div class="ares-field" data-field="bookingref">
        <label class="ares-label" data-label="bookingref">Booking Ref</label>
        <input type="text" id="ares-bookingref" class="ares-input" placeholder="e.g. ABC123XYZ">
      </div>

      <div class="ares-field" data-field="flightno">
        <label class="ares-label">Flight Number</label>
        <input type="text" id="ares-flightno" class="ares-input" placeholder="e.g. BA2490">
      </div>

      <div class="ares-field" data-field="from-to">
        <label class="ares-label" data-label="from-to">From / To</label>
        <div style="display:flex;gap:8px">
          <input type="text" id="ares-from" class="ares-input" placeholder="From" style="flex:1">
          <input type="text" id="ares-to" class="ares-input" placeholder="To" style="flex:1">
        </div>
      </div>

      <div class="ares-field" data-field="dep-datetime">
        <label class="ares-label" data-label="dep-datetime">Departure Date &amp; Time</label>
        <div style="display:flex;gap:8px">
          <input type="date" id="ares-depdate" class="ares-input" style="flex:1">
          <input type="time" id="ares-deptime" class="ares-input" style="flex:0 0 110px">
        </div>
      </div>

      <div class="ares-field" data-field="checkin">
        <label class="ares-label" data-label="checkin">Check-in Date</label>
        <input type="date" id="ares-checkin" class="ares-input">
      </div>

      <div class="ares-field" data-field="checkout">
        <label class="ares-label">Check-out Date</label>
        <input type="date" id="ares-checkout" class="ares-input">
      </div>

      <div class="ares-field" data-field="checkin-time">
        <label class="ares-label" data-label="checkin-time">Check-in Time</label>
        <input type="time" id="ares-checkintime" class="ares-input">
      </div>

      <div class="ares-field" data-field="location">
        <label class="ares-label" data-label="location">Location</label>
        <input type="text" id="ares-location" class="ares-input" placeholder="Address or location name">
      </div>

      <div class="ares-field" data-field="arr-datetime">
        <label class="ares-label" data-label="arr-datetime">Arrival Date &amp; Time</label>
        <div style="display:flex;gap:8px">
          <input type="date" id="ares-arrdate" class="ares-input" style="flex:1">
          <input type="time" id="ares-arrtime" class="ares-input" style="flex:0 0 110px">
        </div>
      </div>

      <div class="ares-field" data-field="res-datetime">
        <label class="ares-label" data-label="res-datetime">Reservation Date &amp; Time</label>
        <div style="display:flex;gap:8px">
          <input type="date" id="ares-resdate" class="ares-input" style="flex:1">
          <input type="time" id="ares-restime" class="ares-input" style="flex:0 0 110px">
        </div>
      </div>

      <div class="ares-field" data-field="covers">
        <label class="ares-label">Number of Covers</label>
        <input type="number" id="ares-covers" class="ares-input" value="2" min="1">
      </div>

      <div class="ares-field ares-price-row" data-field="price-qty">
        <div class="ares-price-wrap">
          <label class="ares-label">Price (£)</label>
          <input type="number" id="ares-price" class="ares-input" placeholder="0.00" step="0.01" min="0">
        </div>
        <div class="ares-qty-wrap">
          <label class="ares-label">Qty</label>
          <input type="number" id="ares-qty" class="ares-input" value="1" min="1">
        </div>
      </div>

      <div class="ares-field" data-field="bookedvia">
        <label class="ares-label">Booked Via</label>
        <input type="text" id="ares-bookedvia" class="ares-input" placeholder="e.g. Ticketmaster, Skiddle">
      </div>

      <div class="ares-field" data-field="presale">
        <label class="ares-label">Pre-sale Code</label>
        <input type="text" id="ares-presale" class="ares-input" placeholder="Pre-sale code">
      </div>

      <div class="ares-field" data-field="onsale">
        <label class="ares-label">On Sale Date</label>
        <input type="date" id="ares-onsale" class="ares-input">
      </div>

      <div class="ares-field" data-field="date-booked">
        <label class="ares-label">Date Booked</label>
        <input type="date" id="ares-datebooked" class="ares-input">
      </div>

      <div class="ares-field">
        <label class="ares-label">Notes</label>
        <textarea id="ares-notes" class="ares-textarea" rows="3" placeholder="Any additional details..."></textarea>
      </div>

      <div class="ares-field">
        <label class="ares-label">Attachments</label>
        <div id="ares-pending-list" class="ares-pending-list"></div>
        <div class="ares-attach-btns">
          <label class="ares-attach-btn" for="ares-file-input">📎 Attach File</label>
          <input type="file" id="ares-file-input" accept="image/*,application/pdf,.pdf,.doc,.docx,.txt,.png,.jpg,.jpeg" multiple style="display:none">
          <label class="ares-attach-btn" for="ares-cam-input">📷 Take Photo</label>
          <input type="file" id="ares-cam-input" accept="image/*" capture="environment" style="display:none">
        </div>
      </div>

      <div class="ares-scrapbook-row">
        <span class="ares-scrapbook-label">📸 Add photos to Scrapbook</span>
        <label class="toggle-switch">
          <input type="checkbox" id="ares-scrapbook">
          <span class="toggle-slider"></span>
        </label>
      </div>

      <button class="save-btn" id="ares-save-btn">Save Resource ✓</button>
      <button class="ares-cancel-btn" id="ares-cancel-btn">Cancel</button>
    </div>
  `;
  document.body.appendChild(sheet);

  const pendingAttachments = [];
  let selectedType = defaultType;

  function updateFieldVisibility(type) {
    const visibleFields = RESOURCE_TYPE_FIELDS[type] || [];
    sheet.querySelectorAll('.add-resource-sheet [data-field]').forEach(el => {
      const field = el.dataset.field;
      el.style.display = visibleFields.includes(field) ? '' : 'none';
    });
    // Apply label overrides for this type
    const labelOverrides = RESOURCE_FIELD_LABELS[type] || {};
    sheet.querySelectorAll('[data-label]').forEach(el => {
      const key = el.dataset.label;
      if (labelOverrides[key]) {
        el.textContent = labelOverrides[key];
      } else {
        // Restore defaults
        const defaults = {
          'ticket-details': 'Ticket Details',
          'bookingref': 'Booking Ref', 'from-to': 'From / To',
          'dep-datetime': 'Departure Date & Time', 'checkin': 'Check-in Date',
          'checkin-time': 'Check-in Time', 'location': 'Location',
          'arr-datetime': 'Arrival Date & Time', 'res-datetime': 'Reservation Date & Time',
        };
        if (defaults[key]) el.textContent = defaults[key];
      }
    });
    // Update ticket-details placeholder based on type
    const tdEl = sheet.querySelector('#ares-ticket-details');
    if (tdEl) {
      tdEl.placeholder = type === 'other'
        ? 'Description of this resource'
        : 'Enter a brief description of the ticket — not for gig tickets!';
    }
  }

  // Apply initial field visibility
  updateFieldVisibility(selectedType);

  // Type chip selection
  sheet.querySelectorAll('.resource-type-chip').forEach(chip => {
    chip.addEventListener('click', () => {
      sheet.querySelectorAll('.resource-type-chip').forEach(c => c.classList.remove('active'));
      chip.classList.add('active');
      selectedType = chip.dataset.type;
      updateFieldVisibility(selectedType);
    });
  });

  function renderPending() {
    const container = document.getElementById('ares-pending-list');
    if (!container) return;
    if (!pendingAttachments.length) { container.innerHTML = ''; return; }
    container.innerHTML = pendingAttachments.map((att, i) => {
      const isImg = att.fileType && att.fileType.startsWith('image/');
      return `<div class="ares-pending-item">
        ${isImg ? `<img class="ares-pending-thumb" src="${att.data}" alt="">` : `<div class="ares-pending-icon">📄</div>`}
        <input class="ares-attach-label" type="text" value="${escHtml(att.label)}" placeholder="Label..." data-idx="${i}">
        <button class="ares-pending-remove" data-idx="${i}">✕</button>
      </div>`;
    }).join('');
    container.querySelectorAll('.ares-attach-label').forEach(inp => {
      inp.addEventListener('input', () => {
        const idx = parseInt(inp.dataset.idx);
        if (pendingAttachments[idx]) pendingAttachments[idx].label = inp.value;
      });
    });
    container.querySelectorAll('.ares-pending-remove').forEach(btn => {
      btn.addEventListener('click', () => { pendingAttachments.splice(parseInt(btn.dataset.idx), 1); renderPending(); });
    });
  }

  async function handleFiles(files) {
    const quality = App.settings.photos.quality === 'high' ? 0.9 : 0.7;
    const maxDim = App.settings.photos.quality === 'high' ? 1600 : 1200;
    for (const file of Array.from(files)) {
      const data = file.type.startsWith('image/')
        ? await compressImage(file, maxDim, quality)
        : await fileToBase64(file);
      if (data) {
        pendingAttachments.push({
          id: crypto.randomUUID ? crypto.randomUUID() : Date.now() + '-' + Math.random().toString(36),
          label: file.name.replace(/\.[^/.]+$/, ''),
          fileName: file.name, fileType: file.type, data,
          addedAt: new Date().toISOString()
        });
        renderPending();
      }
    }
  }

  document.getElementById('ares-file-input').addEventListener('change', async e => { await handleFiles(e.target.files); e.target.value = ''; });
  document.getElementById('ares-cam-input').addEventListener('change', async e => { await handleFiles(e.target.files); e.target.value = ''; });

  document.getElementById('ares-save-btn').addEventListener('click', async () => {
    const title = document.getElementById('ares-title').value.trim();
    if (!title) { showToast('Please enter a title'); return; }

    const addToScrapbook = document.getElementById('ares-scrapbook').checked;
    if (!gig.resources) gig.resources = [];

    const aresPrice = document.getElementById('ares-price').value;
    const aresQty = document.getElementById('ares-qty').value;
    const v = id => { const el = document.getElementById(id); return el ? el.value.trim() : ''; };
    const newResource = {
      id: crypto.randomUUID ? crypto.randomUUID() : Date.now() + '-' + Math.random().toString(36),
      title,
      type: selectedType,
      ticketDetails: v('ares-ticket-details') || null,
      bookingRef: v('ares-bookingref') || null,
      flightNo: v('ares-flightno') || null,
      from: v('ares-from') || null,
      to: v('ares-to') || null,
      depDate: v('ares-depdate') || null,
      depTime: v('ares-deptime') || null,
      checkin: v('ares-checkin') || null,
      checkout: v('ares-checkout') || null,
      checkinTime: v('ares-checkintime') || null,
      location: v('ares-location') || null,
      arrDate: v('ares-arrdate') || null,
      arrTime: v('ares-arrtime') || null,
      resDate: v('ares-resdate') || null,
      resTime: v('ares-restime') || null,
      covers: v('ares-covers') ? parseInt(v('ares-covers')) : null,
      price: aresPrice ? parseFloat(aresPrice) : null,
      quantity: parseInt(aresQty) || 1,
      bookedVia: v('ares-bookedvia') || null,
      presaleCode: v('ares-presale') || null,
      onSaleDate: v('ares-onsale') || null,
      dateBooked: v('ares-datebooked') || null,
      notes: v('ares-notes'),
      addToScrapbook,
      attachments: [...pendingAttachments],
      createdAt: new Date().toISOString()
    };
    gig.resources.push(newResource);

    if (addToScrapbook) {
      if (!gig.scrapbook) gig.scrapbook = { photos: [] };
      pendingAttachments.forEach(att => {
        if (att.fileType && att.fileType.startsWith('image/')) {
          gig.scrapbook.photos.push({
            id: crypto.randomUUID ? crypto.randomUUID() : Date.now() + '-sc',
            dataUrl: att.data,
            caption: att.label || title,
            category: 'photo',
            addedAt: att.addedAt
          });
        }
      });
    }

    await DB.saveGig(gig);
    App.allGigs = await DB.getAllGigs();
    sheet.remove();

    const list = document.getElementById('resources-list');
    if (list) list.innerHTML = (gig.resources || []).map(r => renderResourceCard(r)).join('') ||
      `<div class="resources-empty">No resources yet — add tickets, hotel bookings, train tickets and more.</div>`;
    attachResourceListeners(gig);
    showToast(`"${title}" added!`);
  });

  document.getElementById('ares-cancel-btn').addEventListener('click', () => sheet.remove());
  sheet.addEventListener('click', e => { if (e.target === sheet) sheet.remove(); });
  setTimeout(() => document.getElementById('ares-title')?.focus(), 150);
}

function attachResourceListeners(gig) {
  // Expand / collapse cards
  document.querySelectorAll('.resource-card-header').forEach(header => {
    header.addEventListener('click', e => {
      if (e.target.closest('.resource-delete-btn')) return;
      header.closest('.resource-card').classList.toggle('expanded');
    });
  });

  // Delete resource
  document.querySelectorAll('.resource-delete-btn').forEach(btn => {
    btn.addEventListener('click', async e => {
      e.stopPropagation();
      const rid = btn.dataset.resourceId;
      if (!confirm('Remove this resource?')) return;
      gig.resources = (gig.resources || []).filter(r => r.id !== rid);
      await DB.saveGig(gig);
      App.allGigs = await DB.getAllGigs();
      document.querySelector(`.resource-card[data-resource-id="${rid}"]`)?.remove();
      const list = document.getElementById('resources-list');
      if (list && !list.querySelector('.resource-card'))
        list.innerHTML = `<div class="resources-empty">No resources yet — add tickets, hotel bookings, train tickets and more.</div>`;
    });
  });

  // Add file/photo to existing resource
  document.querySelectorAll('input[id^="res-file-"], input[id^="res-cam-"]').forEach(input => {
    input.addEventListener('change', async e => {
      const files = Array.from(e.target.files);
      if (!files.length) return;
      const rid = input.dataset.resourceId;
      const resource = (gig.resources || []).find(r => r.id === rid);
      if (!resource) return;
      const quality = App.settings.photos.quality === 'high' ? 0.9 : 0.7;
      const maxDim = App.settings.photos.quality === 'high' ? 1600 : 1200;
      showToast('Adding...');
      for (const file of files) {
        const data = file.type.startsWith('image/')
          ? await compressImage(file, maxDim, quality)
          : await fileToBase64(file);
        if (data) {
          if (!resource.attachments) resource.attachments = [];
          resource.attachments.push({
            id: crypto.randomUUID ? crypto.randomUUID() : Date.now() + '-' + Math.random().toString(36),
            label: file.name.replace(/\.[^/.]+$/, ''),
            fileName: file.name, fileType: file.type, data,
            addedAt: new Date().toISOString()
          });
        }
      }
      await DB.saveGig(gig);
      App.allGigs = await DB.getAllGigs();
      const card = document.querySelector(`.resource-card[data-resource-id="${rid}"]`);
      if (card) {
        const wasExpanded = card.classList.contains('expanded');
        card.outerHTML = renderResourceCard(resource);
        if (wasExpanded) document.querySelector(`.resource-card[data-resource-id="${rid}"]`)?.classList.add('expanded');
      }
      attachResourceListeners(gig);
      input.value = '';
      showToast('Attachment added!');
    });
  });

  // Remove attachment from existing resource
  document.querySelectorAll('.rattach-remove-btn').forEach(btn => {
    btn.addEventListener('click', async e => {
      e.stopPropagation();
      const aid = btn.dataset.attachId;
      const rid = btn.dataset.resourceId;
      const resource = (gig.resources || []).find(r => r.id === rid);
      if (!resource) return;
      resource.attachments = (resource.attachments || []).filter(a => a.id !== aid);
      await DB.saveGig(gig);
      App.allGigs = await DB.getAllGigs();
      const card = document.querySelector(`.resource-card[data-resource-id="${rid}"]`);
      if (card) {
        card.outerHTML = renderResourceCard(resource);
        document.querySelector(`.resource-card[data-resource-id="${rid}"]`)?.classList.add('expanded');
      }
      attachResourceListeners(gig);
    });
  });

  // Tap image to preview full-size
  document.querySelectorAll('.rattach-item').forEach(item => {
    item.addEventListener('click', e => {
      if (e.target.closest('.rattach-remove-btn')) return;
      const rid = item.dataset.resourceId;
      const aid = item.dataset.attachId;
      const resource = (gig.resources || []).find(r => r.id === rid);
      const att = resource && (resource.attachments || []).find(a => a.id === aid);
      if (att && att.fileType && att.fileType.startsWith('image/')) {
        const overlay = document.createElement('div');
        overlay.className = 'attach-preview-overlay';
        overlay.innerHTML = `<img src="${att.data}" alt="${escHtml(att.label)}"><div class="attach-preview-close">✕</div>`;
        document.body.appendChild(overlay);
        overlay.addEventListener('click', () => overlay.remove());
      }
    });
  });

  // + Add Resource button
  document.getElementById('btn-add-resource')?.addEventListener('click', () => openAddResourceSheet(gig));
}

function attachDocumentRemoveListeners(gig) {
  document.querySelectorAll('.attach-remove-btn').forEach(btn => {
    btn.addEventListener('click', async (e) => {
      e.stopPropagation();
      const docId = btn.dataset.docId;
      gig.documents = (gig.documents || []).filter(d => d.id !== docId);
      await DB.saveGig(gig);
      App.allGigs = await DB.getAllGigs();
      const grid = document.getElementById('attachments-grid');
      if (grid) grid.innerHTML = renderAttachmentsGrid(gig);
      attachDocumentRemoveListeners(gig);
    });
  });

  // Tap image attachment to open full-size
  document.querySelectorAll('.attach-item').forEach(item => {
    item.addEventListener('click', (e) => {
      if (e.target.classList.contains('attach-remove-btn')) return;
      const docId = item.dataset.docId;
      const doc = (gig.documents || []).find(d => d.id === docId);
      if (doc && doc.type && doc.type.startsWith('image/')) {
        const overlay = document.createElement('div');
        overlay.className = 'attach-preview-overlay';
        overlay.innerHTML = `<img src="${doc.data}" alt="${escHtml(doc.name)}"><div class="attach-preview-close">✕</div>`;
        document.body.appendChild(overlay);
        overlay.addEventListener('click', () => overlay.remove());
      }
    });
  });
}

function fileToBase64(file) {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = (e) => resolve(e.target.result);
    reader.onerror = () => resolve(null);
    reader.readAsDataURL(file);
  });
}

// ============================================================
// Photo Compression
// ============================================================
function compressImage(file, maxDim, quality) {
  return new Promise((resolve) => {
    const canvas = document.createElement('canvas');
    const img = new Image();
    img.onload = () => {
      let w = img.width;
      let h = img.height;
      if (w > maxDim || h > maxDim) {
        if (w > h) {
          h = Math.round(h * maxDim / w);
          w = maxDim;
        } else {
          w = Math.round(w * maxDim / h);
          h = maxDim;
        }
      }
      canvas.width = w;
      canvas.height = h;
      canvas.getContext('2d').drawImage(img, 0, 0, w, h);
      resolve(canvas.toDataURL('image/jpeg', quality));
    };
    img.onerror = () => resolve(null);
    img.src = URL.createObjectURL(file);
  });
}

// ============================================================
// Stats Screen
// ============================================================
function renderStats() {
  const container = document.getElementById('stats-container');
  if (!container) return;

  const period = App.statsPeriod;
  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth();

  // Filter gigs by period
  let gigs = App.allGigs;
  if (period === 'month') {
    gigs = gigs.filter(g => {
      if (!g.date) return false;
      const [y, m] = g.date.split('-').map(Number);
      return y === currentYear && m - 1 === currentMonth;
    });
  } else if (period === 'year') {
    gigs = gigs.filter(g => {
      if (!g.date) return false;
      const [y] = g.date.split('-').map(Number);
      return y === currentYear;
    });
  }

  // Stats calculations
  const attended = gigs.filter(g => g.status === 'attended');
  const booked = gigs.filter(g => g.status === 'booked');
  const wishlist = gigs.filter(g => g.status === 'wishlist');
  const dna = gigs.filter(g => g.status === 'dna');

  // Ticket spend: sum of gigticket and eticket resources for attended gigs
  const ticketSpend = attended.reduce((sum, g) => {
    return sum + (g.resources || [])
      .filter(r => r.type === 'gigticket' || r.type === 'eticket')
      .reduce((s, r) => s + ((parseFloat(r.price) || 0) * (parseInt(r.quantity) || 1)), 0);
  }, 0);

  // Total expenses: sum of ALL resource prices for attended gigs
  const totalExpenses = attended.reduce((sum, g) => {
    return sum + (g.resources || [])
      .reduce((s, r) => s + ((parseFloat(r.price) || 0) * (parseInt(r.quantity) || 1)), 0);
  }, 0);

  const uniqueArtists = new Set(attended.map(g => g.artist.toLowerCase())).size;

  // Top venues
  const venueCounts = {};
  attended.forEach(g => {
    const vname = g.venue && g.venue.name ? g.venue.name : null;
    if (vname) venueCounts[vname] = (venueCounts[vname] || 0) + 1;
  });
  const topVenues = Object.entries(venueCounts).sort((a,b) => b[1]-a[1]).slice(0, 5);

  // Most attended with
  const peopleCount = {};
  attended.forEach(g => {
    const ppl = g.people && g.people.goingWith ? g.people.goingWith : [];
    ppl.forEach(p => {
      if (p) peopleCount[p] = (peopleCount[p] || 0) + 1;
    });
  });
  const topPeople = Object.entries(peopleCount).sort((a,b) => b[1]-a[1]).slice(0, 5);

  // Budget
  const annualBudget = App.settings.budget ? App.settings.budget.annual : 0;
  const budgetPct = annualBudget > 0 ? Math.min(100, Math.round((totalExpenses / annualBudget) * 100)) : 0;

  // Year label text
  let yearLabelText = '';
  if (period === 'month') {
    const months = ['January','February','March','April','May','June','July','August','September','October','November','December'];
    yearLabelText = `${months[currentMonth]} ${currentYear} in Numbers`;
  } else if (period === 'year') {
    yearLabelText = `${currentYear} in Numbers`;
  } else {
    yearLabelText = 'All Time';
  }

  container.innerHTML = `
    <div class="stats-year-label">${yearLabelText}</div>

    <!-- Big stat grid -->
    <div class="stats-grid">
      <div class="stat-card">
        <div class="stat-number">${attended.length}</div>
        <div class="stat-label">Gigs Attended</div>
      </div>
      <div class="stat-card">
        <div class="stat-number">£${ticketSpend.toFixed(0)}</div>
        <div class="stat-label">Ticket Spend</div>
      </div>
      <div class="stat-card">
        <div class="stat-number">£${totalExpenses.toFixed(0)}</div>
        <div class="stat-label">Total Expenses</div>
      </div>
      <div class="stat-card">
        <div class="stat-number">${uniqueArtists}</div>
        <div class="stat-label">Bands Seen</div>
      </div>
      <div class="stat-card">
        <div class="stat-number">${booked.length}</div>
        <div class="stat-label">Gigs Booked</div>
      </div>
    </div>

    <!-- Budget -->
    ${annualBudget > 0 ? `
    <div class="stats-budget-card">
      <div class="stats-card-title">💰 Budget Tracker</div>
      <div class="budget-amounts">
        <span>Expenses: <span class="budget-spent">£${totalExpenses.toFixed(2)}</span></span>
        <span>Budget: £${annualBudget}</span>
      </div>
      <div class="budget-progress-wrap">
        <div class="budget-progress-bar ${budgetPct >= 100 ? 'over-budget' : ''}" style="width:${budgetPct}%"></div>
      </div>
      <div class="budget-remaining">${budgetPct < 100
        ? `£${(annualBudget - totalExpenses).toFixed(2)} remaining (${budgetPct}% used)`
        : `Over budget by £${(totalExpenses - annualBudget).toFixed(2)}`
      }</div>
    </div>` : ''}

    <!-- Top Venues -->
    <div class="stats-ranked-card">
      <div class="stats-card-title">🏟 Top Venues</div>
      ${topVenues.length > 0
        ? topVenues.map(([name, count], i) => `
          <div class="ranked-item">
            <span class="ranked-num">${i+1}</span>
            <span class="ranked-name">${escHtml(name)}</span>
            <span class="ranked-count">${count} visit${count !== 1 ? 's' : ''}</span>
          </div>`).join('')
        : `<div style="color:var(--text-secondary);font-size:14px;padding:8px 0">No venue data yet</div>`
      }
    </div>

    <!-- Most Attended With -->
    <div class="stats-ranked-card">
      <div class="stats-card-title">👥 Most Attended With</div>
      ${topPeople.length > 0
        ? topPeople.map(([name, count], i) => `
          <div class="ranked-item">
            <span class="ranked-num">${i+1}</span>
            <span class="ranked-name">${escHtml(name)}</span>
            <span class="ranked-count">${count} gig${count !== 1 ? 's' : ''}</span>
          </div>`).join('')
        : `<div style="color:var(--text-secondary);font-size:14px;padding:8px 0">No data yet</div>`
      }
    </div>

    <!-- DNA/Wishlist summary -->
    <div class="stats-summary-row">
      <div class="stats-small-card">
        <div class="stat-number" style="color:var(--dna-text)">${dna.length}</div>
        <div class="stat-label">DNA</div>
      </div>
      <div class="stats-small-card">
        <div class="stat-number" style="color:var(--wishlist-text)">${wishlist.length}</div>
        <div class="stat-label">On Wishlist</div>
      </div>
    </div>
  `;
}

// ============================================================
// Settings Screen
// ============================================================
// First Run Welcome
// ============================================================
function checkFirstRun() {
  const seen = localStorage.getItem('mygiglife-welcomed');
  if (seen) return;
  const overlay = document.getElementById('welcome-overlay');
  if (!overlay) return;
  overlay.style.display = 'flex';
  document.getElementById('welcome-get-started').addEventListener('click', () => {
    overlay.style.display = 'none';
    localStorage.setItem('mygiglife-welcomed', '1');
  });
}

// ============================================================
// Help Screen
// ============================================================
function openHelpScreen() {
  renderHelpScreen();
  document.getElementById('screen-help').classList.add('active');
  document.getElementById('screen-help').querySelector('.sub-screen-content').scrollTop = 0;
}

function closeHelpScreen() {
  document.getElementById('screen-help').classList.remove('active');
}

function renderHelpScreen() {
  const container = document.getElementById('help-content');
  if (!container) return;

  const topics = [
    {
      icon: '➕',
      q: 'Add a new gig',
      a: `Tap the <strong>gold + button</strong> in the middle of the bottom bar. Enter the artist name and date — everything else is optional and can be added later. Set the status to <em>Wishlist</em> if you haven't booked yet, or <em>Booked</em> if you have. When you save a Booked gig you'll be prompted to record your ticket details straight away.`
    },
    {
      icon: '🔄',
      q: 'Change a gig\'s status',
      a: `Open the gig (tap it in <em>My Gigs</em> or the <em>Calendar</em>). At the bottom of the Gig Dossier tap <strong>Mark as Booked</strong> or <strong>Mark as Attended</strong>. To mark a gig as <em>Did Not Attend (DNA)</em>, tap the DNA link near the bottom of the dossier.`
    },
    {
      icon: '🎫',
      q: 'Add ticket or booking details',
      a: `Open the gig dossier and tap <strong>Tickets &amp; Bookings</strong> to expand that section, then tap <strong>＋ Add Resource</strong>. Choose the type (Gig Ticket, Hotel, Train, etc.) and fill in the details. Ticket prices entered here are used in your Stats totals.`
    },
    {
      icon: '📝',
      q: 'Edit a gig\'s details',
      a: `Open the gig dossier and tap <strong>Edit</strong> in the top-right corner. All fields become editable. Tap <strong>Save</strong> when done. You can also tap directly on collapsible cards (When, Venue, Notes etc.) to expand them.`
    },
    {
      icon: '🗑',
      q: 'Delete a gig',
      a: `Open the gig dossier, scroll to the bottom and tap the red <strong>🗑 Delete Gig</strong> button. This permanently removes the gig and all its resources and photos.`
    },
    {
      icon: '📸',
      q: 'Add photos to the Scrapbook',
      a: `Open a gig dossier for an <em>Attended</em> gig and tap <strong>📸 Open Scrapbook</strong>. Tap the <strong>＋ Add Photo</strong> button to upload from your library or take a photo. You can also attach photos to resources (e.g. a photo of your ticket) by tapping the attachment icon inside a resource panel and toggling <em>Add to Scrapbook</em>.`
    },
    {
      icon: '📅',
      q: 'Use the Calendar',
      a: `The <strong>Calendar</strong> tab shows all your gigs as coloured dots. Tap any date to see what's on. Use the <strong>◀ ▶</strong> arrows to move between months. The <em>Coming Up</em> section below the calendar shows your next 5 upcoming gigs.`
    },
    {
      icon: '🔍',
      q: 'Search for a gig',
      a: `Go to the <strong>My Gigs</strong> tab and type in the search box at the top. It searches across artist names and venue names. Use the filter tabs (All / Wishlist / Booked / Past / DNA) to narrow the list.`
    },
    {
      icon: '📊',
      q: 'View my stats',
      a: `Tap the <strong>Stats</strong> tab. Use the <em>Month / Year / All Time</em> buttons at the top to change the period. Stats include gigs attended, ticket spend, total expenses (including hotels, travel etc.), and your most visited venues. Set an annual budget in <em>Settings</em> to see a budget tracker.`
    },
    {
      icon: '💾',
      q: 'Back up my data',
      a: `Go to <strong>Settings</strong> (⚙ icon top right) and tap <strong>Backup Now</strong>. This downloads a JSON file — save it to your cloud storage or email it to yourself. To restore, use the <em>Restore from Backup</em> option in the same section and select your saved file. <em>Back up regularly — your data is stored on your device only.</em>`
    },
    {
      icon: '📤',
      q: 'Share a gig',
      a: `Open the gig dossier and tap the <strong>Share 📤</strong> button. On mobile this opens your device's share sheet. On desktop it copies a summary to your clipboard.`
    },
    {
      icon: '📆',
      q: 'Add a gig to my phone calendar',
      a: `Open the gig dossier and expand the <strong>When</strong> card, then tap <strong>📆 Add to Calendar</strong>. This downloads an ICS file that you can open to add the event to your phone's built-in calendar app.`
    },
    {
      icon: '🎪',
      q: 'Add a festival with a line-up',
      a: `When adding a gig, tick <strong>🎪 This is a festival / multi-act event</strong>. You can set a start and end date. Once saved, open the dossier and expand the <strong>Line-Up</strong> card — tap <strong>+ Add Act</strong> to build out the full bill.`
    },
    {
      icon: '⚙',
      q: 'Change settings',
      a: `Tap the <strong>⚙</strong> icon in the top-right corner. From here you can set your name, home postcode, annual budget, photo quality, and notification preferences. You can also manage backups and import data from this screen.`
    },
    {
      icon: '📱',
      q: 'Move MyGigLife to a new phone',
      a: `<strong>Step 1 — Back up on your old phone:</strong> Go to <em>Settings</em> (⚙ top right) and tap <strong>Backup Now</strong>. Save the downloaded JSON file somewhere you can access from your new phone — your cloud storage (iCloud, Google Drive, Dropbox) or email it to yourself.<br><br>
<strong>Step 2 — Install on your new phone:</strong> Open your browser, navigate to the app URL, then tap <em>Share → Add to Home Screen</em> to install it.<br><br>
<strong>Step 3 — Restore your data:</strong> On the new phone, go to <em>Settings</em> and tap <strong>Restore from Backup</strong>. Select the JSON file you saved in Step 1. All your gigs, photos, and resources will be imported.<br><br>
<em>Note: because data is stored on-device, you must do this transfer manually — there is no automatic sync between phones.</em>`
    },
    {
      icon: '📣',
      q: 'Share MyGigLife with friends',
      a: `Tap the <strong>Share App 📣</strong> button below to send a link to MyGigLife to your friends.`,
    },
    {
      icon: '❤️',
      q: 'Support MyGigLife',
      a: `MyGigLife is free and always will be. If you'd like to say thanks, tap the <strong>❤️ Support MyGigLife</strong> banner at the bottom of the screen to visit the tip jar.`
    },
  ];

  container.innerHTML = `
    <div class="help-container">
      <p class="help-intro">Tap any question to see the answer.</p>
      ${topics.map((t, i) => `
        <div class="help-item" id="help-item-${i}">
          <div class="help-question" data-idx="${i}">
            <span class="help-icon">${t.icon}</span>
            <span class="help-q-text">${t.q}</span>
            <span class="help-chevron">⌄</span>
          </div>
          <div class="help-answer" id="help-ans-${i}">${t.a}</div>
        </div>
      `).join('')}
      <button class="help-share-btn" id="help-share-app-btn">📣 Share MyGigLife with a friend</button>
    </div>
  `;

  // Expand / collapse
  container.querySelectorAll('.help-question').forEach(q => {
    q.addEventListener('click', () => {
      const idx = q.dataset.idx;
      const item = document.getElementById(`help-item-${idx}`);
      const isOpen = item.classList.toggle('open');
      q.querySelector('.help-chevron').textContent = isOpen ? '⌃' : '⌄';
    });
  });

  document.getElementById('help-back-btn').addEventListener('click', closeHelpScreen);

  document.getElementById('help-share-app-btn')?.addEventListener('click', () => {
    const shareData = {
      title: 'MyGigLife',
      text: '🎸 Check out MyGigLife — a free app for tracking all your gigs, tickets, and memories!',
      url: 'https://mygiglife.uk'
    };
    if (navigator.share) {
      navigator.share(shareData).catch(() => {});
    } else {
      navigator.clipboard.writeText(`${shareData.text} ${shareData.url}`).then(() => {
        showToast('Link copied to clipboard!');
      });
    }
  });
}

// ============================================================
// Support Screen
// ============================================================
function openSupportScreen() {
  renderSupportScreen();
  document.getElementById('screen-support').classList.add('active');
  document.getElementById('screen-support').querySelector('.sub-screen-content').scrollTop = 0;
}

function closeSupportScreen() {
  document.getElementById('screen-support').classList.remove('active');
}

function renderSupportScreen() {
  const container = document.getElementById('support-content');
  if (!container) return;
  container.innerHTML = `
    <div class="settings-container" style="padding-bottom:32px">

      <!-- Support MyGigLife -->
      <div class="settings-section">
        <div class="settings-section-title">Support MyGigLife</div>
        <div class="settings-card">
          <p class="tip-jar-message">MyGigLife is free and always will be. If it's made your gig life easier, you can say thanks here!</p>
          <div class="tip-jar-grid">
            <a href="${AFFILIATE.kofi}?amount=4" target="_blank" class="tip-jar-btn">
              <span class="tip-jar-icon">🍺</span>
              <span class="tip-jar-label">Buy me a pint</span>
              <span class="tip-jar-amount">£4</span>
            </a>
            <a href="${AFFILIATE.kofi}?amount=10" target="_blank" class="tip-jar-btn">
              <span class="tip-jar-icon">🎫</span>
              <span class="tip-jar-label">Buy me a ticket</span>
              <span class="tip-jar-amount">£10</span>
            </a>
            <a href="${AFFILIATE.kofi}?amount=20" target="_blank" class="tip-jar-btn">
              <span class="tip-jar-icon">🎪</span>
              <span class="tip-jar-label">Buy me a festival pass</span>
              <span class="tip-jar-amount">£20</span>
            </a>
          </div>
        </div>
      </div>

      <!-- About -->
      <div class="settings-section">
        <div class="settings-section-title">About</div>
        <div class="settings-card">
          <p class="about-made-by">Made with 🎸 by <a href="https://andyapps.uk" target="_blank" class="about-link">Andy at andyapps.uk</a></p>
          <p class="about-disclosure">MyGigLife is free to use. Some links to ticket platforms and hotel booking sites are affiliate links, which means we earn a small commission if you make a purchase — at no extra cost to you. This helps keep the app free and supports future development.</p>
        </div>
      </div>

      <div class="coffee-ring" style="margin-top:16px"></div>
    </div>
  `;

  document.getElementById('support-back-btn').addEventListener('click', closeSupportScreen);
}

// ============================================================
function renderSettings() {
  const container = document.getElementById('settings-container');
  if (!container) return;

  const s = App.settings;

  container.innerHTML = `
    <!-- Profile -->
    <div class="settings-section">
      <div class="settings-section-title">Your Profile</div>
      <div class="settings-card">
        <div class="settings-row">
          <span class="settings-row-label">Name</span>
          <input class="settings-input" type="text" id="settings-name" value="${escHtml(s.user.name)}" placeholder="Your name">
        </div>
        <div class="settings-row">
          <span class="settings-row-label">Home Postcode</span>
          <input class="settings-input" type="text" id="settings-postcode" value="${escHtml(s.user.homePostcode)}" placeholder="e.g. SW1A 1AA">
        </div>
      </div>
    </div>

    <!-- Budget -->
    <div class="settings-section">
      <div class="settings-section-title">Budget</div>
      <div class="settings-card">
        <div class="settings-row">
          <span class="settings-row-label">Annual Gig Budget</span>
          <div style="display:flex;align-items:center;gap:4px">
            <span style="color:var(--text-secondary);font-family:'Patrick Hand'">£</span>
            <input class="settings-input" type="number" id="settings-budget" value="${s.budget.annual || ''}" placeholder="0" min="0" style="width:100px">
          </div>
        </div>
      </div>
    </div>

    <!-- Photo Storage -->
    <div class="settings-section">
      <div class="settings-section-title">Photo Storage</div>
      <div class="settings-card">
        <div class="settings-row">
          <span class="settings-row-label">Quality</span>
          <div class="quality-toggle">
            <button class="quality-btn ${s.photos.quality === 'standard' ? 'active' : ''}" data-quality="standard">Standard</button>
            <button class="quality-btn ${s.photos.quality === 'high' ? 'active' : ''}" data-quality="high">High</button>
          </div>
        </div>
        <div class="settings-row">
          <span class="settings-row-label">Storage Used</span>
          <span class="settings-row-sub" id="storage-used">Calculating...</span>
        </div>
      </div>
    </div>

    <!-- Quick Ticket Links -->
    <div class="settings-section">
      <div class="settings-section-title">Quick Ticket Links</div>
      <div class="settings-card">
        <div class="ticket-links-grid">
          <a href="${AFFILIATE.ticketmaster}" target="_blank" class="ticket-link-btn">🎟 Ticketmaster</a>
          <a href="${AFFILIATE.seetickets}" target="_blank" class="ticket-link-btn">🎟 See Tickets</a>
          <a href="https://dice.fm" target="_blank" class="ticket-link-btn">🎲 DICE</a>
          <a href="${AFFILIATE.gigantic}" target="_blank" class="ticket-link-btn">🎸 Gigantic</a>
          <a href="${AFFILIATE.skiddle}" target="_blank" class="ticket-link-btn">🎵 Skiddle</a>
          <a href="https://www.songkick.com" target="_blank" class="ticket-link-btn">🎤 Songkick</a>
          <a href="https://www.axs.com" target="_blank" class="ticket-link-btn">🎪 AXS</a>
          <a href="https://www.ents24.com" target="_blank" class="ticket-link-btn">📅 Ents24</a>
        </div>
      </div>
    </div>

    <!-- Notifications -->
    <div class="settings-section">
      <div class="settings-section-title">Notifications</div>
      <div class="settings-card">
        <div class="settings-row">
          <span class="settings-row-label">On-sale reminders</span>
          <label class="toggle-switch">
            <input type="checkbox" id="notif-onsale" ${s.notifications.onSaleReminders ? 'checked' : ''}>
            <span class="toggle-slider"></span>
          </label>
        </div>
        <div class="settings-row">
          <span class="settings-row-label">Gig tomorrow reminder</span>
          <label class="toggle-switch">
            <input type="checkbox" id="notif-tomorrow" ${s.notifications.gigTomorrow ? 'checked' : ''}>
            <span class="toggle-slider"></span>
          </label>
        </div>
        <div class="settings-row">
          <span class="settings-row-label">Rate your gig</span>
          <label class="toggle-switch">
            <input type="checkbox" id="notif-rate" ${s.notifications.rateYourGig ? 'checked' : ''}>
            <span class="toggle-slider"></span>
          </label>
        </div>
      </div>
    </div>

    <!-- Your Data -->
    <div class="settings-section">
      <div class="settings-section-title">Your Data</div>
      <div class="settings-card">
        <div class="last-backup-info" id="last-backup-info">${getLastBackupText()}</div>
        <button class="data-action-btn" id="btn-backup">💾 Backup to JSON</button>
        <label class="data-action-btn" id="btn-restore-label" for="restore-input" style="cursor:pointer">
          📂 Restore from JSON
        </label>
        <input type="file" id="restore-input" accept=".json,application/json" style="display:none">
        <button class="data-action-btn danger" id="btn-clear-data">🗑 Clear All Data</button>
      </div>
    </div>

    <!-- Coffee ring easter egg -->
    <div class="coffee-ring"></div>
  `;

  // Attach listeners
  // Save settings on input change
  ['settings-name', 'settings-postcode', 'settings-budget'].forEach(id => {
    const el = document.getElementById(id);
    if (el) {
      el.addEventListener('change', () => {
        if (id === 'settings-name') s.user.name = el.value.trim();
        if (id === 'settings-postcode') s.user.homePostcode = el.value.trim();
        if (id === 'settings-budget') s.budget.annual = parseFloat(el.value) || 0;
        saveSettings();
      });
    }
  });

  // Quality toggle
  container.querySelectorAll('.quality-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      container.querySelectorAll('.quality-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      s.photos.quality = btn.dataset.quality;
      saveSettings();
    });
  });

  // Notification toggles
  const notifMap = {
    'notif-onsale': 'onSaleReminders',
    'notif-tomorrow': 'gigTomorrow',
    'notif-rate': 'rateYourGig'
  };
  Object.entries(notifMap).forEach(([id, key]) => {
    const el = document.getElementById(id);
    if (el) el.addEventListener('change', () => {
      s.notifications[key] = el.checked;
      saveSettings();
    });
  });

  // Backup
  const backupBtn = document.getElementById('btn-backup');
  if (backupBtn) {
    backupBtn.addEventListener('click', () => triggerBackup());
  }

  // Restore
  const restoreInput = document.getElementById('restore-input');
  if (restoreInput) {
    restoreInput.addEventListener('change', (e) => {
      const file = e.target.files[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = async (re) => {
        try {
          const count = await DB.importJSON(re.target.result);
          App.allGigs = await DB.getAllGigs();
          showToast(`${count} gigs imported!`);
          renderSettings();
        } catch (err) {
          showToast('Import failed: ' + err.message);
        }
      };
      reader.readAsText(file);
    });
  }

  // Clear all data
  const clearBtn = document.getElementById('btn-clear-data');
  if (clearBtn) {
    clearBtn.addEventListener('click', () => {
      showConfirm(
        'Clear All Data',
        'This will permanently delete all your gigs. This cannot be undone!',
        'Delete Everything',
        async () => {
          await DB.clearAll();
          App.allGigs = [];
          showToast('All data cleared');
          navigateTo('calendar');
        },
        true
      );
    });
  }

  // Storage estimate
  estimateStorage().then(used => {
    const el = document.getElementById('storage-used');
    if (el) el.textContent = used;
  });
}

async function estimateStorage() {
  try {
    if (navigator.storage && navigator.storage.estimate) {
      const { usage } = await navigator.storage.estimate();
      if (usage) {
        const mb = (usage / 1024 / 1024).toFixed(1);
        return `~${mb} MB used`;
      }
    }
  } catch (e) { /* ignore */ }
  // Fallback: count JSON length
  try {
    const json = await DB.exportJSON();
    const kb = (json.length / 1024).toFixed(0);
    return `~${kb} KB`;
  } catch (e) {
    return 'Unknown';
  }
}

// ============================================================
// HTML Escaping
// ============================================================
function escHtml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

// ============================================================
// Backup System
// ============================================================
async function triggerBackup() {
  try {
    const json = await DB.exportJSON();
    const blob = new Blob([json], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `mygiglife-backup-${new Date().toISOString().slice(0,10)}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(a.href);
    localStorage.setItem('mygiglife-lastBackup', new Date().toISOString());
    showToast('Backup downloaded — keep it somewhere safe!');
    // Update settings display if visible
    const settingsEl = document.getElementById('last-backup-info');
    if (settingsEl) settingsEl.textContent = 'Last backed up: just now';
  } catch (e) {
    showToast('Backup failed: ' + e.message);
  }
}

function checkBackupReminder() {
  if (App.allGigs.length === 0) return;
  const lastBackup = localStorage.getItem('mygiglife-lastBackup');
  if (!lastBackup) {
    showBackupBanner();
    return;
  }
  const daysSince = (Date.now() - new Date(lastBackup).getTime()) / (1000 * 60 * 60 * 24);
  if (daysSince >= 7) showBackupBanner();
}

function showBackupBanner() {
  if (document.getElementById('backup-banner')) return;
  const banner = document.createElement('div');
  banner.id = 'backup-banner';
  banner.className = 'backup-banner';
  banner.innerHTML = `
    <span class="backup-banner-text">💾 Back up your gig data to keep it safe</span>
    <button class="backup-banner-btn" id="backup-banner-btn">Backup Now</button>
    <button class="backup-banner-dismiss" id="backup-banner-dismiss" aria-label="Dismiss">✕</button>
  `;
  // Insert before bottom nav
  const nav = document.getElementById('bottom-nav');
  if (nav) nav.parentNode.insertBefore(banner, nav);
  else document.body.appendChild(banner);

  document.getElementById('backup-banner-btn').addEventListener('click', () => {
    triggerBackup();
    banner.remove();
  });
  document.getElementById('backup-banner-dismiss').addEventListener('click', () => {
    // Snooze 3 days
    const snoozed = new Date(Date.now() - 4 * 24 * 60 * 60 * 1000).toISOString();
    localStorage.setItem('mygiglife-lastBackup', snoozed);
    banner.remove();
  });
}

function getLastBackupText() {
  const lastBackup = localStorage.getItem('mygiglife-lastBackup');
  if (!lastBackup) return 'Never backed up';
  const days = Math.floor((Date.now() - new Date(lastBackup).getTime()) / (1000 * 60 * 60 * 24));
  if (days === 0) return 'Last backed up: today';
  if (days === 1) return 'Last backed up: yesterday';
  return `Last backed up: ${days} days ago`;
}

// ============================================================
// Service Worker Registration
// ============================================================
function registerServiceWorker() {
  if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
      navigator.serviceWorker.register('/sw.js').then(reg => {
        reg.addEventListener('updatefound', () => {
          const newWorker = reg.installing;
          newWorker.addEventListener('statechange', () => {
            if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
              showToast('App updated! Refresh to get the latest version.');
            }
          });
        });
      }).catch(err => {
        console.warn('SW registration failed:', err);
      });
    });
  }
}

// ============================================================
// Demo Data
// ============================================================
async function loadDemoData() {
  const existing = await DB.getAllGigs();
  if (existing.length > 0) return; // Don't overwrite existing data

  const today = new Date();
  const fmt = (d) => d.toISOString().slice(0, 10);
  const addDays = (d, n) => { const r = new Date(d); r.setDate(r.getDate() + n); return r; };

  const demos = [
    createGigTemplate({
      artist: 'The Cure',
      date: fmt(addDays(today, 45)),
      status: 'booked',
      venue: { name: 'O2 Arena', address: 'Peninsula Square, London SE10 0DX', postcode: 'SE10 0DX', website: 'https://www.theo2.co.uk' },
      times: { doors: '18:30', stage: '20:00' },
      tickets: { bookingRef: 'TC2026-4891', price: 75.50, quantity: 2, bookedVia: 'Ticketmaster', presaleCode: '', onSaleDate: '' },
      people: { goingWith: ['Sarah', 'Mike'] },
      supportActs: ['Editors'],
      notes: 'Get there early for merch! Robert Smith is a legend.',
      rating: 0
    }),
    createGigTemplate({
      artist: 'Fontaines D.C.',
      date: fmt(addDays(today, 12)),
      status: 'wishlist',
      venue: { name: 'Brixton Academy', address: '211 Stockwell Road, London SW9 9SL', postcode: 'SW9 9SL', website: '' },
      times: { doors: '', stage: '' },
      tickets: { bookingRef: '', price: null, quantity: 1, bookedVia: '', presaleCode: 'FDCFAN26', onSaleDate: fmt(addDays(today, 3)) },
      people: { goingWith: [] },
      notes: 'Pre-sale on Friday morning!',
      rating: 0
    }),
    createGigTemplate({
      artist: 'Nick Cave & The Bad Seeds',
      date: fmt(addDays(today, -90)),
      status: 'attended',
      venue: { name: 'Royal Albert Hall', address: 'Kensington Gore, London SW7 2AP', postcode: 'SW7 2AP', website: 'https://www.royalalberthall.com' },
      times: { doors: '19:00', stage: '20:30' },
      tickets: { bookingRef: 'RAH-88234', price: 95.00, quantity: 2, bookedVia: 'See Tickets', presaleCode: '', onSaleDate: '' },
      people: { goingWith: ['Emma'] },
      supportActs: [],
      notes: 'Absolutely stunning. One of the best shows I have ever seen. The setlist was incredible — opened with Jubilee Street.',
      rating: 5,
      scrapbook: { photos: [] }
    }),
    createGigTemplate({
      artist: 'Radiohead',
      date: fmt(addDays(today, -180)),
      status: 'dna',
      venue: { name: 'Alexandra Palace', address: 'Alexandra Palace Way, London N22 7AY', postcode: 'N22 7AY', website: '' },
      times: { doors: '18:00', stage: '20:00' },
      tickets: { bookingRef: 'AXS-RH22', price: 65.00, quantity: 1, bookedVia: 'AXS', presaleCode: '', onSaleDate: '' },
      people: { goingWith: [] },
      notes: 'Couldn\'t make it — was sick. So gutted.',
      rating: 0
    }),
    createGigTemplate({
      artist: 'Idles',
      date: fmt(addDays(today, 78)),
      status: 'booked',
      venue: { name: 'Roundhouse', address: 'Chalk Farm Road, London NW1 8EH', postcode: 'NW1 8EH', website: '' },
      times: { doors: '19:00', stage: '20:30' },
      tickets: { bookingRef: 'RH-IDLES-99', price: 35.00, quantity: 3, bookedVia: 'DICE', presaleCode: '', onSaleDate: '' },
      people: { goingWith: ['Tom', 'Jess', 'Dan'] },
      supportActs: ['Sprints'],
      notes: 'Getting there by tube — Northern line to Chalk Farm.',
      rating: 0,
      transport: 'Northern line to Chalk Farm, 5 min walk'
    }),
    createGigTemplate({
      artist: 'Mogwai',
      date: fmt(addDays(today, -45)),
      status: 'attended',
      venue: { name: 'Barbican Centre', address: 'Silk Street, London EC2Y 8DS', postcode: 'EC2Y 8DS', website: 'https://www.barbican.org.uk' },
      times: { doors: '19:30', stage: '20:15' },
      tickets: { bookingRef: 'BAR-MG-2025', price: 42.50, quantity: 2, bookedVia: 'Barbican Box Office', presaleCode: '', onSaleDate: '' },
      people: { goingWith: ['Sarah'] },
      notes: 'Incredible post-rock set. The Barbican is such a perfect venue for them.',
      rating: 4,
      scrapbook: { photos: [] }
    })
  ];

  for (const gig of demos) {
    await DB.saveGig(gig);
  }
}

// ============================================================
// Festival Transfer Integration
// ============================================================
function checkFestivalImport() {
  const hash = window.location.hash;
  if (!hash.startsWith('#import=')) return;

  let data;
  try {
    const encoded = hash.slice('#import='.length);
    data = JSON.parse(atob(encoded));
  } catch (e) {
    console.warn('Festival import: invalid payload', e);
    return;
  }

  if (!data || data.type !== 'festival' || !data.name) return;

  // Clear the hash so it doesn't re-trigger on reload
  history.replaceState(null, '', window.location.pathname);

  showFestivalImportPreview(data);
}

function showFestivalImportPreview(data) {
  const lineup = data.lineup || [];
  const daySet = new Set(lineup.map(a => a.dayLabel || a.day));
  const dayLabels = [...daySet].join(', ');
  const preview = lineup.slice(0, 6).map(a => a.artist).join(', ') + (lineup.length > 6 ? `... +${lineup.length - 6} more` : '');

  const modal = document.createElement('div');
  modal.id = 'festival-import-modal';
  modal.style.cssText = `
    position:fixed;inset:0;background:rgba(0,0,0,0.6);z-index:9999;
    display:flex;align-items:center;justify-content:center;padding:20px;
  `;
  modal.innerHTML = `
    <div style="background:#fff;border-radius:16px;padding:24px;max-width:400px;width:100%;box-shadow:0 8px 32px rgba(0,0,0,0.3)">
      <div style="font-family:'Caveat',serif;font-size:24px;font-weight:700;color:var(--text-primary);margin-bottom:16px;text-align:center">
        Import Festival Data
      </div>
      <div style="background:var(--bg-kraft);border-radius:8px;padding:16px;margin-bottom:16px">
        <div style="font-size:18px;font-weight:600;color:var(--text-primary);margin-bottom:8px">🎪 ${escHtml(data.name)}</div>
        ${data.startDate ? `<div style="font-size:15px;color:var(--text-secondary)">📅 ${formatDateMedium(data.startDate)}${data.endDate ? ' – ' + formatDateMedium(data.endDate) : ''}</div>` : ''}
        ${data.venue ? `<div style="font-size:15px;color:var(--text-secondary)">📍 ${escHtml(data.venue.name)}${data.venue.address ? ', ' + escHtml(data.venue.address) : ''}</div>` : ''}
        <div style="font-size:15px;color:var(--text-secondary)">🎵 ${lineup.length} act${lineup.length !== 1 ? 's' : ''} across ${daySet.size} day${daySet.size !== 1 ? 's' : ''}</div>
      </div>
      ${preview ? `<div style="font-size:14px;color:var(--text-secondary);margin-bottom:16px;font-style:italic">${escHtml(preview)}</div>` : ''}
      <button id="btn-confirm-import" style="
        width:100%;padding:14px;background:var(--header-bg);color:#fff;
        border:none;border-radius:50px;font-size:16px;font-weight:600;
        font-family:'Source Sans 3',sans-serif;cursor:pointer;margin-bottom:10px
      ">Import to MyGigLife ✓</button>
      <button id="btn-cancel-import" style="
        width:100%;padding:10px;background:none;border:none;
        font-size:15px;color:var(--text-secondary);cursor:pointer;
        font-family:'Source Sans 3',sans-serif
      ">Cancel</button>
    </div>
  `;

  document.body.appendChild(modal);

  document.getElementById('btn-cancel-import').addEventListener('click', () => modal.remove());

  document.getElementById('btn-confirm-import').addEventListener('click', async () => {
    const actLineup = (data.lineup || []).map(act => ({
      id: crypto.randomUUID ? crypto.randomUUID() : Date.now() + Math.random().toString(36),
      artist: act.artist,
      day: act.day,
      dayLabel: act.dayLabel || '',
      stage: act.stage || '',
      time: act.time || '',
      status: null,
      seen: false,
      rating: null
    }));

    const gig = createGigTemplate({
      artist: data.name,
      date: data.startDate || '',
      endDate: data.endDate || '',
      isFestival: true,
      status: 'wishlist',
      venue: data.venue ? {
        name: data.venue.name || '',
        address: data.venue.address || '',
        postcode: data.venue.postcode || '',
        website: data.venue.website || ''
      } : {},
      lineup: actLineup
    });

    await DB.saveGig(gig);
    App.allGigs = await DB.getAllGigs();
    modal.remove();
    showToast(`${data.name} imported!`);
    openDossier(gig.id);
    if (App.currentScreen === 'calendar') renderCalendar();
  });
}

// ============================================================
// App Initialisation
// ============================================================
async function initApp() {
  try {
    // Init DB
    await DB.init();

    // Load demo data (only if DB is empty)
    await loadDemoData();

    // Load all gigs
    App.allGigs = await DB.getAllGigs();

    // Build the app shell HTML
    buildAppShell();

    // Attach global event listeners
    attachGlobalListeners();

    // Navigate to default screen
    navigateTo('calendar');

    // Register SW
    registerServiceWorker();

    // Check if a backup reminder is due
    checkBackupReminder();

    // Show first-run welcome if needed
    checkFirstRun();

    // Check for festival import via URL hash
    checkFestivalImport();

  } catch (err) {
    console.error('App init error:', err);
  }
}

// ============================================================
// App Shell Builder
// ============================================================
function buildAppShell() {
  document.getElementById('app').innerHTML = `
    <!-- Header -->
    <header id="app-header">
      <span id="app-title">MyGigLife</span>
      <div id="header-actions">
        <button class="header-help-btn" id="btn-help" aria-label="Help">How do I...</button>
        <button class="header-btn" id="btn-settings" aria-label="Settings">⚙</button>
      </div>
    </header>

    <!-- Main screens area -->
    <div id="main-content">

      <!-- Calendar Screen -->
      <div class="screen active" id="screen-calendar">
        <div class="calendar-month-nav">
          <button class="month-nav-btn" id="cal-prev">◀</button>
          <span class="month-name" id="cal-month-name"></span>
          <button class="month-nav-btn" id="cal-next">▶</button>
        </div>
        <div class="calendar-grid-wrap" id="calendar-container">
          <div class="calendar-day-headers">
            <div class="cal-day-header">Mon</div>
            <div class="cal-day-header">Tue</div>
            <div class="cal-day-header">Wed</div>
            <div class="cal-day-header">Thu</div>
            <div class="cal-day-header">Fri</div>
            <div class="cal-day-header">Sat</div>
            <div class="cal-day-header">Sun</div>
          </div>
          <div class="calendar-grid" id="calendar-grid"></div>
        </div>
        <div class="status-legend">
          <div class="legend-item"><div class="legend-dot" style="background:var(--wishlist-border)"></div><span class="legend-label">Wishlist</span></div>
          <div class="legend-item"><div class="legend-dot" style="background:var(--booked-border)"></div><span class="legend-label">Booked</span></div>
          <div class="legend-item"><div class="legend-dot" style="background:var(--attended-border)"></div><span class="legend-label">Attended</span></div>
          <div class="legend-item"><div class="legend-dot" style="background:var(--dna-border)"></div><span class="legend-label">DNA</span></div>
        </div>
        <div class="coming-up-section">
          <div class="section-title">Coming Up...</div>
          <div id="coming-up-list"></div>
        </div>
      </div>

      <!-- My Gigs Screen -->
      <div class="screen" id="screen-gigs">
        <div class="gigs-filter-bar">
          <div class="filter-tabs">
            <button class="filter-tab active-all" data-filter="all">All</button>
            <button class="filter-tab" data-filter="wishlist">★ Wishlist</button>
            <button class="filter-tab" data-filter="booked">✓ Booked</button>
            <button class="filter-tab" data-filter="past">Past</button>
            <button class="filter-tab" data-filter="dna">✗ DNA</button>
          </div>
        </div>
        <div class="gigs-search-wrap">
          <input type="search" class="gigs-search-input" id="gigs-search" placeholder="🔍 Search artists, venues...">
        </div>
        <div class="gigs-list-scroll">
          <div id="gigs-list-container"></div>
        </div>
      </div>

      <!-- Scrapbook Screen -->
      <div class="screen" id="screen-scrapbook">
        <div class="scrapbook-header-section">
          <div class="section-title" style="text-align:center">Scrapbook</div>
          <div class="scrapbook-intro">Your gig memories, all in one place</div>
        </div>
        <div class="scrapbook-grid" id="scrapbook-grid"></div>
      </div>

      <!-- Stats Screen -->
      <div class="screen" id="screen-stats">
        <div class="stats-period-toggle">
          <button class="period-btn" data-period="month">This Month</button>
          <button class="period-btn active" data-period="year">This Year</button>
          <button class="period-btn" data-period="all">All Time</button>
        </div>
        <div id="stats-container"></div>
      </div>

      <!-- Settings Screen -->
      <div class="screen" id="screen-settings">
        <div id="settings-container"></div>
      </div>

    </div>

    <!-- Bottom Navigation -->
    <nav id="bottom-nav">
      <button class="nav-item active" data-screen="calendar">
        <img class="nav-icon-img" src="nav-calendar.png" alt="Calendar">
        <span class="nav-label">Calendar</span>
      </button>
      <button class="nav-item" data-screen="gigs">
        <img class="nav-icon-img" src="nav-mygigs.png" alt="My Gigs">
        <span class="nav-label">My Gigs</span>
      </button>
      <button class="nav-item nav-item-add" id="nav-add-btn">
        <div class="nav-add-circle">
          <img class="nav-icon-img nav-add-img" src="nav-add.png" alt="Add">
        </div>
        <span class="nav-label">Add</span>
      </button>
      <button class="nav-item" data-screen="scrapbook">
        <img class="nav-icon-img" src="nav-scrapbook.png" alt="Scrapbook">
        <span class="nav-label">Scrapbook</span>
      </button>
      <button class="nav-item" data-screen="stats">
        <img class="nav-icon-img" src="nav-stats.png" alt="Stats">
        <span class="nav-label">Stats</span>
      </button>
    </nav>

    <!-- Add Gig Modal -->
    <div id="modal-add-gig">
      <div class="modal-header">
        <span class="modal-title">Add Gig</span>
        <button class="modal-close-btn" id="modal-close-btn">✕</button>
      </div>
      <div class="modal-scroll">
        <form id="add-gig-form" onsubmit="return false">
          <div class="notebook-form">
            <div class="notebook-intro">Just the basics — add details later!</div>

            <div class="form-field">
              <label class="form-label">Artist / Event *</label>
              <input type="text" class="form-input" id="field-artist" placeholder="e.g. The Cure" autocomplete="off">
            </div>

            <div class="form-field">
              <label class="form-label">Date *</label>
              <input type="date" class="form-input" id="field-date">
            </div>

            <div class="form-field">
              <label class="form-label">Venue</label>
              <input type="text" class="form-input" id="field-venue" placeholder="Venue name" autocomplete="off">
            </div>

            <div class="status-toggle-wrap">
              <button type="button" class="status-toggle-btn active-wishlist" data-status="wishlist">★ Wishlist</button>
              <button type="button" class="status-toggle-btn" data-status="booked">✓ Booked</button>
            </div>

            <label class="festival-toggle-label" id="festival-toggle-wrap">
              <input type="checkbox" id="field-festival" style="width:18px;height:18px;accent-color:var(--accent-gold)">
              <span>🎪 This is a festival / multi-act event</span>
            </label>

            <div class="form-field" id="field-enddate-wrap" style="display:none">
              <label class="form-label">End Date</label>
              <input type="date" class="form-input" id="field-enddate">
            </div>

            <div class="form-field" id="field-onsale-wrap" style="display:none">
              <label class="form-label">On-Sale Date</label>
              <input type="date" class="form-input" id="field-onsale">
            </div>

            <div class="form-field">
              <label class="form-label">Approx Ticket Price</label>
              <input type="text" class="form-input" id="field-price" placeholder="e.g. £45 or £45–£90">
            </div>

            <button type="button" class="more-details-toggle" id="more-details-btn">＋ Add more details</button>

            <div class="more-details-content" id="more-details-content">
              <div class="form-field">
                <label class="form-label">Door Time</label>
                <input type="time" class="form-input" id="field-doors">
              </div>
              <div class="form-field">
                <label class="form-label">Stage Time</label>
                <input type="time" class="form-input" id="field-stage">
              </div>
              <div class="form-field">
                <label class="form-label">Support Acts</label>
                <input type="text" class="form-input" id="field-support" placeholder="Names, comma-separated">
              </div>
              <div class="form-field">
                <label class="form-label">Booking Ref</label>
                <input type="text" class="form-input" id="field-bookingref" placeholder="e.g. TM-12345">
              </div>
              <div class="form-field">
                <label class="form-label">Booked Via</label>
                <select class="form-select" id="field-bookedvia">
                  <option value="">Select...</option>
                  <option value="Ticketmaster">Ticketmaster</option>
                  <option value="See Tickets">See Tickets</option>
                  <option value="DICE">DICE</option>
                  <option value="Gigantic">Gigantic</option>
                  <option value="Skiddle">Skiddle</option>
                  <option value="Songkick">Songkick</option>
                  <option value="AXS">AXS</option>
                  <option value="Ents24">Ents24</option>
                  <option value="Box Office">Box Office</option>
                  <option value="Other">Other</option>
                </select>
              </div>
              <div class="form-field">
                <label class="form-label">Number of Tickets</label>
                <input type="number" class="form-input" id="field-qty" value="1" min="1">
              </div>
              <div class="form-field">
                <label class="form-label">Going With</label>
                <input type="text" class="form-input" id="field-goingwith" placeholder="Names, comma-separated">
              </div>
              <div class="form-field">
                <label class="form-label">Pre-sale Code</label>
                <input type="text" class="form-input" id="field-presale" placeholder="Code">
              </div>
              <div class="form-field">
                <label class="form-label">Transport Notes</label>
                <input type="text" class="form-input" id="field-transport" placeholder="e.g. Train to Victoria">
              </div>
              <div class="form-field">
                <label class="form-label">Notes</label>
                <textarea class="form-textarea" id="field-notes" placeholder="Anything else..."></textarea>
              </div>
            </div>
          </div>

          <div class="clash-warning" id="clash-warning"></div>
        </form>
      </div>
      <div class="modal-footer">
        <button class="save-btn" id="btn-save-gig">Save to MyGigLife ✓</button>
      </div>
    </div>

    <!-- Support Banner -->
    <div id="support-banner" role="button" tabindex="0" aria-label="Support MyGigLife">
      <span class="support-banner-text">❤️ Support MyGigLife</span>
    </div>

    <!-- Gig Dossier Sub-screen -->
    <div class="sub-screen" id="screen-dossier">
      <div style="height:var(--header-height);background:var(--header-bg);color:var(--header-text);display:flex;align-items:center;padding:0 15px;gap:8px;flex-shrink:0;box-shadow:0 2px 8px rgba(0,0,0,0.2)">
        <button class="sub-header-back" id="dossier-back-btn">‹</button>
        <span class="sub-header-title">Gig Dossier</span>
        <button class="sub-header-action" id="dossier-edit-btn">Edit</button>
      </div>
      <div class="sub-screen-content" id="dossier-content"></div>
    </div>

    <!-- Scrapbook Viewer Sub-screen -->
    <div class="sub-screen" id="screen-scrapbook-viewer" style="background:#1a1a1a;color:#f0f0f0">
      <div style="height:var(--header-height);background:rgba(0,0,0,0.5);display:flex;align-items:center;padding:0 15px;gap:12px;flex-shrink:0;backdrop-filter:blur(10px)">
        <button class="viewer-back-btn" id="viewer-back-btn">‹</button>
        <span class="viewer-artist-name" id="viewer-artist-name"></span>
      </div>
      <div class="sub-screen-content" id="scrapbook-viewer-body"></div>
    </div>

    <!-- Help Sub-screen -->
    <div class="sub-screen" id="screen-help">
      <div style="height:var(--header-height);background:var(--header-bg);color:var(--header-text);display:flex;align-items:center;padding:0 15px;gap:8px;flex-shrink:0;box-shadow:0 2px 8px rgba(0,0,0,0.2)">
        <button class="sub-header-back" id="help-back-btn">‹</button>
        <span class="sub-header-title">How do I...</span>
      </div>
      <div class="sub-screen-content" id="help-content"></div>
    </div>

    <!-- Welcome / First Run Overlay -->
    <div id="welcome-overlay" style="display:none">
      <div class="welcome-card">
        <div class="welcome-icon">🎸</div>
        <h2 class="welcome-title">Welcome to MyGigLife</h2>
        <p class="welcome-intro">Your personal gig diary — all stored privately on your device.</p>
        <div class="welcome-points">
          <div class="welcome-point">
            <span class="welcome-point-icon">🔒</span>
            <div>
              <strong>Your data stays on your phone.</strong>
              <p>Nothing is sent to any server. No account needed. No one can see your gigs but you.</p>
            </div>
          </div>
          <div class="welcome-point">
            <span class="welcome-point-icon">💾</span>
            <div>
              <strong>Back up regularly.</strong>
              <p>Because your data lives on your device, if you lose your phone or clear your browser you'll lose your gigs. Use the Backup option in Settings to save a copy to your files or cloud storage.</p>
            </div>
          </div>
          <div class="welcome-point">
            <span class="welcome-point-icon">📲</span>
            <div>
              <strong>Install it to your home screen.</strong>
              <p>Tap Share → Add to Home Screen in your browser for the best experience.</p>
            </div>
          </div>
        </div>
        <button class="welcome-btn" id="welcome-get-started">Let's go! 🎶</button>
      </div>
    </div>

    <!-- Support Sub-screen -->
    <div class="sub-screen" id="screen-support">
      <div style="height:var(--header-height);background:var(--header-bg);color:var(--header-text);display:flex;align-items:center;padding:0 15px;gap:8px;flex-shrink:0;box-shadow:0 2px 8px rgba(0,0,0,0.2)">
        <button class="sub-header-back" id="support-back-btn">‹</button>
        <span class="sub-header-title">Support MyGigLife</span>
      </div>
      <div class="sub-screen-content" id="support-content"></div>
    </div>
  `;
}

// ============================================================
// Global Event Listeners
// ============================================================
function attachGlobalListeners() {

  // Bottom nav
  document.addEventListener('click', (e) => {
    const navItem = e.target.closest('.nav-item[data-screen]');
    if (navItem) {
      navigateTo(navItem.dataset.screen);
      return;
    }

    // Add gig button
    if (e.target.closest('#nav-add-btn')) {
      openAddGigModal();
      return;
    }

    // Settings from header
    if (e.target.closest('#btn-settings')) {
      navigateTo('settings');
      // Update nav to show settings is "active" — actually settings is not in nav
      document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
      return;
    }
  });

  // Calendar nav arrows
  document.addEventListener('click', (e) => {
    if (e.target.closest('#cal-prev')) {
      App.currentMonth--;
      if (App.currentMonth < 0) { App.currentMonth = 11; App.currentYear--; }
      renderCalendar();
    }
    if (e.target.closest('#cal-next')) {
      App.currentMonth++;
      if (App.currentMonth > 11) { App.currentMonth = 0; App.currentYear++; }
      renderCalendar();
    }
  });

  // Filter tabs in My Gigs
  document.addEventListener('click', (e) => {
    const tab = e.target.closest('.filter-tab');
    if (tab && tab.closest('#screen-gigs')) {
      document.querySelectorAll('.filter-tab').forEach(t => {
        t.className = 'filter-tab';
      });
      App.currentFilter = tab.dataset.filter;
      const activeClass = {
        all: 'active-all', wishlist: 'active-wishlist', booked: 'active-booked',
        past: 'active-all', dna: 'active-dna', attended: 'active-attended'
      }[App.currentFilter] || 'active-all';
      tab.classList.add(activeClass);
      applyGigsFilters();
      updateGigsListDOM();
    }
  });

  // Search
  document.addEventListener('input', (e) => {
    if (e.target.id === 'gigs-search') {
      App.searchQuery = e.target.value;
      applyGigsFilters();
      updateGigsListDOM();
    }
  });

  // Add gig modal controls
  document.addEventListener('click', (e) => {
    if (e.target.closest('#modal-close-btn')) { closeAddGigModal(); return; }
    if (e.target.closest('#btn-save-gig')) { saveAddGigForm(); return; }

    // Status toggles in add modal
    const statusBtn = e.target.closest('.status-toggle-btn');
    if (statusBtn) {
      setAddGigStatus(statusBtn.dataset.status);
      return;
    }

    // More details toggle
    if (e.target.closest('#more-details-btn')) {
      const content = document.getElementById('more-details-content');
      const btn = document.getElementById('more-details-btn');
      const isExpanded = content.classList.toggle('expanded');
      btn.textContent = isExpanded ? '− Less details' : '＋ Add more details';
      return;
    }
  });

  // Help button
  document.addEventListener('click', (e) => {
    if (e.target.closest('#btn-help')) openHelpScreen();
  });

  // Support banner
  document.addEventListener('click', (e) => {
    if (e.target.closest('#support-banner')) openSupportScreen();
  });

  // Festival toggle in Add Gig form
  document.addEventListener('change', (e) => {
    if (e.target.id === 'field-festival') {
      const isFestival = e.target.checked;
      document.getElementById('field-enddate-wrap').style.display = isFestival ? 'flex' : 'none';
      // Hide support acts for festivals
      const supportField = document.getElementById('field-support');
      if (supportField) {
        const supportWrap = supportField.closest('.form-field');
        if (supportWrap) supportWrap.style.display = isFestival ? 'none' : '';
      }
    }
  });

  // Dossier back/edit
  document.addEventListener('click', (e) => {
    if (e.target.closest('#dossier-back-btn')) {
      if (App.isEditingDossier) {
        saveDossierEdits(App.currentDossierId);
      } else {
        closeDossier();
      }
      return;
    }
    if (e.target.closest('#dossier-edit-btn')) {
      if (App.isEditingDossier) {
        saveDossierEdits(App.currentDossierId);
      } else {
        App.isEditingDossier = true;
        const gig = App.allGigs.find(g => g.id === App.currentDossierId);
        if (gig) renderDossier(gig);
      }
      return;
    }
  });

  // Scrapbook viewer back
  document.addEventListener('click', (e) => {
    if (e.target.closest('#viewer-back-btn')) {
      closeScrapbookViewer();
      return;
    }
  });

  // Stats period toggle
  document.addEventListener('click', (e) => {
    const periodBtn = e.target.closest('.period-btn');
    if (periodBtn) {
      document.querySelectorAll('.period-btn').forEach(b => b.classList.remove('active'));
      periodBtn.classList.add('active');
      App.statsPeriod = periodBtn.dataset.period;
      renderStats();
    }
  });

  // Close modal on backdrop tap (for mobile)
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      const modal = document.getElementById('modal-add-gig');
      if (modal && modal.classList.contains('open')) closeAddGigModal();
    }
  });
}

// ============================================================
// Bootstrap
// ============================================================
document.addEventListener('DOMContentLoaded', initApp);
