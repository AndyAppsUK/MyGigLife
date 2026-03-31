/**
 * MyGigLife - Main Application
 * Pure vanilla JavaScript PWA for music gig management
 */

'use strict';

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
    tickets: { bookingRef: '', price: null, quantity: 1, bookedVia: '', presaleCode: '', onSaleDate: '' },
    people: { goingWith: [] },
    supportActs: [],
    transport: '',
    notes: '',
    rating: 0,
    scrapbook: { photos: [] },
    documents: [],
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
  const upcoming = App.filteredGigs
    .filter(g => {
      const [y,m,d] = g.date.split('-').map(Number);
      return new Date(y,m-1,d) >= today;
    })
    .sort((a, b) => a.date.localeCompare(b.date));

  const past = App.filteredGigs
    .filter(g => {
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
      price: document.getElementById('field-price').value ? parseFloat(document.getElementById('field-price').value) : null,
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

function renderAttachmentsGrid(gig) {
  const docs = gig.documents || [];
  if (docs.length === 0) {
    return `<div class="attachments-empty">No attachments yet</div>`;
  }
  return docs.map(doc => {
    const isImage = doc.type && doc.type.startsWith('image/');
    const thumb = isImage
      ? `<img class="attach-thumb" src="${doc.data}" alt="${escHtml(doc.name)}">`
      : `<div class="attach-file-icon">📄</div>`;
    return `<div class="attach-item" data-doc-id="${doc.id}">
      ${thumb}
      <div class="attach-name">${escHtml(doc.name)}</div>
      <button class="attach-remove-btn" data-doc-id="${doc.id}" title="Remove">✕</button>
    </div>`;
  }).join('');
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

  // Ticket total
  const ticketTotal = tickets.price && tickets.quantity ? (tickets.price * tickets.quantity).toFixed(2) : null;

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
      <div class="dossier-card" id="card-when">
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
      <div class="dossier-card" id="card-venue">
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
            <a href="https://www.google.com/maps/search/hotels+near+${encodeURIComponent(venue.name)}" target="_blank" class="venue-action-btn">🏨 Hotels</a>
            <a href="https://www.google.com/maps/search/restaurants+near+${encodeURIComponent(venue.name)}" target="_blank" class="venue-action-btn">🍽 Restaurants</a>
          </div>` : ''}
        </div>
      </div>

      <!-- Tickets card -->
      <div class="dossier-card" id="card-tickets">
        <div class="dossier-card-header">
          <span class="dossier-card-icon">🎫</span>
          <span class="dossier-card-title">Tickets</span>
          <span class="dossier-card-chevron">⌄</span>
        </div>
        <div class="dossier-card-body">
          <div class="dossier-row">
            <span class="dossier-row-label">Booking Ref</span>
            ${isEditing
              ? `<input type="text" class="dossier-row-value editable" id="edit-bookingref" value="${escHtml(tickets.bookingRef||'')}">`
              : `<span class="dossier-row-value">${tickets.bookingRef || '—'}</span>`
            }
          </div>
          <div class="dossier-row">
            <span class="dossier-row-label">Price</span>
            ${isEditing
              ? `<input type="number" class="dossier-row-value editable" id="edit-price" value="${tickets.price||''}" placeholder="0.00" step="0.01">`
              : `<span class="dossier-row-value">${tickets.price ? `£${tickets.price}` : '—'}</span>`
            }
          </div>
          <div class="dossier-row">
            <span class="dossier-row-label">Quantity</span>
            ${isEditing
              ? `<input type="number" class="dossier-row-value editable" id="edit-qty" value="${tickets.quantity||1}" min="1">`
              : `<span class="dossier-row-value">${tickets.quantity || 1}</span>`
            }
          </div>
          ${ticketTotal ? `
          <div class="dossier-row">
            <span class="dossier-row-label">Total</span>
            <span class="dossier-row-value" style="font-weight:700">£${ticketTotal}</span>
          </div>` : ''}
          <div class="dossier-row">
            <span class="dossier-row-label">Booked Via</span>
            ${isEditing
              ? `<input type="text" class="dossier-row-value editable" id="edit-bookedvia" value="${escHtml(tickets.bookedVia||'')}">`
              : `<span class="dossier-row-value">${tickets.bookedVia || '—'}</span>`
            }
          </div>
          ${gig.status === 'wishlist' && tickets.presaleCode ? `
          <div class="dossier-row">
            <span class="dossier-row-label">Pre-sale</span>
            <div class="presale-code" id="presale-copy" title="Tap to copy">${escHtml(tickets.presaleCode)}</div>
          </div>` : ''}
          ${gig.status === 'wishlist' && tickets.onSaleDate ? `
          <div class="dossier-row">
            <span class="dossier-row-label">On Sale</span>
            <span class="dossier-row-value">${formatDateShort(tickets.onSaleDate)}</span>
          </div>` : ''}
        </div>
      </div>

      <!-- Going With card -->
      <div class="dossier-card" id="card-going">
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
      <div class="dossier-card" id="card-lineup">
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
      <div class="dossier-card" id="card-support">
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
      <div class="dossier-card" id="card-transport">
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
      <div class="dossier-card" id="card-notes">
        <div class="dossier-card-header">
          <span class="dossier-card-icon">📝</span>
          <span class="dossier-card-title">Notes</span>
          <span class="dossier-card-chevron">⌄</span>
        </div>
        <div class="dossier-card-body">
          <div class="sticky-note" ${isEditing ? 'contenteditable="true" id="edit-notes"' : ''}>${escHtml(gig.notes || (isEditing ? '' : 'No notes yet..'))}</div>
        </div>
      </div>

      <!-- Documents / Attachments card (always visible) -->
      <div class="dossier-card" id="card-documents">
        <div class="dossier-card-header">
          <span class="dossier-card-icon">📎</span>
          <span class="dossier-card-title">Attachments</span>
          <span class="dossier-card-chevron">⌄</span>
        </div>
        <div class="dossier-card-body">
          <div class="attachments-hint">Hotel bookings, tickets, rail tickets, flight confirmations, anything you need on the day.</div>
          <div class="attachments-grid" id="attachments-grid">
            ${renderAttachmentsGrid(gig)}
          </div>
          <label class="attach-add-btn" for="doc-upload-input">＋ Add Attachment</label>
          <input type="file" id="doc-upload-input" accept="image/*,application/pdf,.pdf,.doc,.docx,.txt,.png,.jpg,.jpeg" multiple style="display:none">
        </div>
      </div>

      ${gig.status === 'attended' ? `
      <!-- Rating card -->
      <div class="dossier-card" id="card-rating">
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

  // Document attachments upload
  const docInput = document.getElementById('doc-upload-input');
  if (docInput) {
    docInput.addEventListener('change', async (e) => {
      const files = Array.from(e.target.files);
      if (!files.length) return;

      showToast('Adding attachments...');
      if (!gig.documents) gig.documents = [];

      const quality = App.settings.photos.quality === 'high' ? 0.9 : 0.7;
      const maxDim = App.settings.photos.quality === 'high' ? 1600 : 1200;

      for (const file of files) {
        let data;
        if (file.type.startsWith('image/')) {
          data = await compressImage(file, maxDim, quality);
        } else {
          data = await fileToBase64(file);
        }
        if (data) {
          gig.documents.push({
            id: crypto.randomUUID ? crypto.randomUUID() : Date.now() + Math.random().toString(36),
            name: file.name,
            type: file.type,
            data,
            addedAt: new Date().toISOString()
          });
        }
      }

      await DB.saveGig(gig);
      App.allGigs = await DB.getAllGigs();
      const grid = document.getElementById('attachments-grid');
      if (grid) grid.innerHTML = renderAttachmentsGrid(gig);
      attachDocumentRemoveListeners(gig);
      showToast(`${files.length} attachment${files.length > 1 ? 's' : ''} added!`);
      docInput.value = '';
    });
  }
  attachDocumentRemoveListeners(gig);

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
  if (priceEl) gig.tickets.price = priceEl.value ? parseFloat(priceEl.value) : null;

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
        <img class="viewer-main-photo" id="viewer-main-photo" src="${currentPhoto.data}" alt="Gig photo">
        ${dotsHTML}
        ${photos.length > 1 ? `
        <div class="viewer-photo-grid" id="viewer-photo-grid">
          ${photos.map((p, i) => `<img class="viewer-thumb ${i === idx ? 'active' : ''}" src="${p.data}" data-index="${i}" loading="lazy">`).join('')}
        </div>` : ''}
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
  `;

  // Thumbnail clicks
  const grid = document.getElementById('viewer-photo-grid');
  if (grid) {
    grid.querySelectorAll('.viewer-thumb').forEach(thumb => {
      thumb.addEventListener('click', () => {
        App.currentPhotoIndex = parseInt(thumb.dataset.index);
        renderScrapbookViewer(gig);
      });
    });
  }

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

  const totalSpent = attended.reduce((sum, g) => {
    const price = g.tickets && g.tickets.price ? g.tickets.price : 0;
    const qty = g.tickets && g.tickets.quantity ? g.tickets.quantity : 1;
    return sum + (price * qty);
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
  const budgetPct = annualBudget > 0 ? Math.min(100, Math.round((totalSpent / annualBudget) * 100)) : 0;

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
        <div class="stat-number">£${totalSpent.toFixed(0)}</div>
        <div class="stat-label">Total Spent</div>
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
        <span>Spent: <span class="budget-spent">£${totalSpent.toFixed(2)}</span></span>
        <span>Budget: £${annualBudget}</span>
      </div>
      <div class="budget-progress-wrap">
        <div class="budget-progress-bar ${budgetPct >= 100 ? 'over-budget' : ''}" style="width:${budgetPct}%"></div>
      </div>
      <div class="budget-remaining">${budgetPct < 100
        ? `£${(annualBudget - totalSpent).toFixed(2)} remaining (${budgetPct}% used)`
        : `Over budget by £${(totalSpent - annualBudget).toFixed(2)}`
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
          <a href="https://www.ticketmaster.co.uk" target="_blank" class="ticket-link-btn">🎟 Ticketmaster</a>
          <a href="https://www.seetickets.com" target="_blank" class="ticket-link-btn">🎟 See Tickets</a>
          <a href="https://dice.fm" target="_blank" class="ticket-link-btn">🎲 DICE</a>
          <a href="https://www.gigantic.com" target="_blank" class="ticket-link-btn">🎸 Gigantic</a>
          <a href="https://www.skiddle.com" target="_blank" class="ticket-link-btn">🎵 Skiddle</a>
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
        <span class="nav-icon">📅</span>
        <span class="nav-label">Calendar</span>
      </button>
      <button class="nav-item" data-screen="gigs">
        <span class="nav-icon">🎸</span>
        <span class="nav-label">My Gigs</span>
      </button>
      <button class="nav-item nav-item-add" id="nav-add-btn">
        <div class="nav-add-circle">
          <span class="nav-add-icon">＋</span>
        </div>
        <span class="nav-label">Add</span>
      </button>
      <button class="nav-item" data-screen="scrapbook">
        <span class="nav-icon">📸</span>
        <span class="nav-label">Scrapbook</span>
      </button>
      <button class="nav-item" data-screen="stats">
        <span class="nav-icon">📊</span>
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
              <label class="form-label">Ticket Price (£)</label>
              <div class="price-field-wrap">
                <span class="price-prefix">£</span>
                <input type="number" class="form-input" id="field-price" placeholder="0.00" min="0" step="0.01">
              </div>
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
