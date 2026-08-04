/* ============================================
   SOPTOSUR ADMIN PANEL — JavaScript
   GitHub API Integration + Full CRUD
   ============================================ */

let state = {
  token: '',
  repo: '',
  content: null,
  sha: '',
  currentSection: 'dashboard',
  editingItem: null,
  editingType: null,
  editingIndex: null,
  deployLog: []
};

// ============================================
// LOGIN & AUTH
// ============================================
document.getElementById('login-btn').addEventListener('click', login);
document.getElementById('token-input').addEventListener('keypress', e => {
  if (e.key === 'Enter') login();
});

async function login() {
  const token = document.getElementById('token-input').value.trim();
  const repo = document.getElementById('repo-input').value.trim();
  const errEl = document.getElementById('login-error');
  errEl.textContent = '';

  if (!token) { errEl.textContent = 'Token দিন'; return; }
  if (!repo || !repo.includes('/')) { errEl.textContent = 'Repo সঠিকভাবে লিখুন (owner/repo)'; return; }

  document.getElementById('login-btn').textContent = 'যাচাই করছি...';
  document.getElementById('login-btn').disabled = true;

  try {
    // Test token & fetch content.json
    const res = await githubGet(`contents/content.json`, token, repo);
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.message || 'Token বা Repo সঠিক নয়');
    }
    const data = await res.json();
    state.token = token;
    state.repo = repo;
    state.sha = data.sha;
    state.content = JSON.parse(atob(data.content.replace(/\n/g, '')));

    // Save to localStorage
    localStorage.setItem('admin_token', token);
    localStorage.setItem('admin_repo', repo);

    showApp();
  } catch (err) {
    errEl.textContent = '❌ ' + err.message;
    document.getElementById('login-btn').textContent = 'Login করুন';
    document.getElementById('login-btn').disabled = false;
  }
}

function showApp() {
  document.getElementById('login-screen').classList.add('hidden');
  document.getElementById('admin-app').classList.remove('hidden');
  populateAll();
  switchSection('dashboard');
}

document.getElementById('logout-btn').addEventListener('click', () => {
  localStorage.removeItem('admin_token');
  localStorage.removeItem('admin_repo');
  state = { token: '', repo: '', content: null, sha: '', currentSection: 'dashboard', deployLog: [] };
  document.getElementById('admin-app').classList.add('hidden');
  document.getElementById('login-screen').classList.remove('hidden');
  document.getElementById('token-input').value = '';
});

// Auto-login from localStorage
window.addEventListener('DOMContentLoaded', async () => {
  const savedToken = localStorage.getItem('admin_token');
  const savedRepo = localStorage.getItem('admin_repo');
  if (savedToken && savedRepo) {
    document.getElementById('token-input').value = savedToken;
    document.getElementById('repo-input').value = savedRepo;
    document.getElementById('login-btn').textContent = 'Auto-login...';
    document.getElementById('login-btn').disabled = true;
    try {
      const res = await githubGet(`contents/content.json`, savedToken, savedRepo);
      if (res.ok) {
        const data = await res.json();
        state.token = savedToken;
        state.repo = savedRepo;
        state.sha = data.sha;
        state.content = JSON.parse(atob(data.content.replace(/\n/g, '')));
        showApp();
        return;
      }
    } catch(e) {}
    document.getElementById('login-btn').textContent = 'Login করুন';
    document.getElementById('login-btn').disabled = false;
  }
});

// ============================================
// GITHUB API HELPERS
// ============================================
function githubGet(path, token, repo) {
  return fetch(`https://api.github.com/repos/${repo}/${path}`, {
    headers: {
      'Authorization': `token ${token}`,
      'Accept': 'application/vnd.github.v3+json'
    }
  });
}

async function saveToGitHub() {
  const btn = document.getElementById('global-save-btn');
  const statusEl = document.getElementById('save-status');
  btn.disabled = true;
  btn.textContent = '⏳ Saving...';
  statusEl.textContent = 'GitHub এ পাঠাচ্ছি...';
  statusEl.className = 'save-status saving';

  // Collect all form data into state.content
  collectAllFormData();

  try {
    const contentStr = JSON.stringify(state.content, null, 2);
    const encoded = btoa(unescape(encodeURIComponent(contentStr)));

    const res = await fetch(`https://api.github.com/repos/${state.repo}/contents/content.json`, {
      method: 'PUT',
      headers: {
        'Authorization': `token ${state.token}`,
        'Accept': 'application/vnd.github.v3+json',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        message: `Admin: content update ${new Date().toLocaleString('bn-BD')}`,
        content: encoded,
        sha: state.sha
      })
    });

    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.message);
    }

    const data = await res.json();
    state.sha = data.content.sha;

    statusEl.textContent = '✅ সফলভাবে Deploy হয়েছে!';
    statusEl.className = 'save-status saved';
    btn.textContent = '💾 Save & Deploy';
    btn.disabled = false;

    showToast('✅ সফল! ৩০ সেকেন্ডে ওয়েবসাইট আপডেট হবে।', 'success');
    addDeployLog('সফল', new Date().toLocaleTimeString('bn-BD'));

    setTimeout(() => { statusEl.textContent = ''; statusEl.className = 'save-status'; }, 5000);

  } catch (err) {
    statusEl.textContent = '❌ সমস্যা হয়েছে';
    statusEl.className = 'save-status error';
    btn.textContent = '💾 Save & Deploy';
    btn.disabled = false;
    showToast('❌ সমস্যা: ' + err.message, 'error');
    addDeployLog('ব্যর্থ: ' + err.message, new Date().toLocaleTimeString('bn-BD'));
  }
}

// ============================================
// NAVIGATION
// ============================================
document.querySelectorAll('.nav-item').forEach(item => {
  item.addEventListener('click', e => {
    e.preventDefault();
    switchSection(item.dataset.section);
    // Close sidebar on mobile
    document.getElementById('sidebar').classList.remove('open');
  });
});

document.getElementById('menu-toggle').addEventListener('click', () => {
  document.getElementById('sidebar').classList.toggle('open');
});

const sectionTitles = {
  dashboard: 'Dashboard',
  hero: 'Hero Section',
  about: 'About',
  news: 'সংবাদ',
  events: 'অনুষ্ঠান',
  initiatives: 'উদ্যোগ',
  contact: 'যোগাযোগ'
};

function switchSection(name) {
  state.currentSection = name;
  document.querySelectorAll('.nav-item').forEach(i => {
    i.classList.toggle('active', i.dataset.section === name);
  });
  document.querySelectorAll('.section-panel').forEach(p => {
    p.classList.toggle('active', p.id === `panel-${name}`);
  });
  document.getElementById('topbar-title').textContent = sectionTitles[name] || name;
}

// ============================================
// POPULATE FORMS FROM STATE
// ============================================
function populateAll() {
  if (!state.content) return;
  populateHero();
  populateAbout();
  populateNews();
  populateEvents();
  populateInitiatives();
  populateContact();
  updateDashboard();
}

function populateHero() {
  const h = state.content.hero;
  document.getElementById('hero-tagline').value = h.tagline || '';
  document.getElementById('hero-description').value = h.description || '';
  document.getElementById('hero-btn-primary').value = h.btn_primary || '';
  document.getElementById('hero-btn-primary-href').value = h.btn_primary_href || '';
  document.getElementById('hero-btn-ghost').value = h.btn_ghost || '';
  document.getElementById('hero-btn-ghost-href').value = h.btn_ghost_href || '';
}

function populateAbout() {
  const a = state.content.about;
  document.getElementById('about-lead').value = a.lead || '';
  document.getElementById('about-body').value = a.body || '';

  const statsEl = document.getElementById('stats-editor');
  statsEl.innerHTML = '';
  (a.stats || []).forEach((s, i) => {
    statsEl.innerHTML += `
      <div class="stat-editor">
        <div class="field-group">
          <label>সংখ্যা</label>
          <input type="text" class="stat-number" data-idx="${i}" value="${s.number}" />
        </div>
        <div class="field-group">
          <label>Label</label>
          <input type="text" class="stat-label-input" data-idx="${i}" value="${s.label}" />
        </div>
      </div>`;
  });
}

function populateNews() {
  const el = document.getElementById('news-list');
  el.innerHTML = '';
  (state.content.news || []).forEach((item, i) => {
    el.innerHTML += `
      <div class="item-card">
        <div class="item-info">
          <span class="item-badge">${item.category}</span>
          ${item.featured ? '<span class="item-badge" style="background:rgba(76,175,125,0.15);color:#4CAF7D;margin-left:4px;">Featured</span>' : ''}
          <div class="item-title">${item.title}</div>
          <div class="item-meta">${item.date}</div>
        </div>
        <div class="item-actions">
          <button class="btn-edit" onclick="editNews(${i})">সম্পাদনা</button>
          <button class="btn-delete" onclick="deleteItem('news', ${i})">🗑</button>
        </div>
      </div>`;
  });
}

function populateEvents() {
  const el = document.getElementById('events-list');
  el.innerHTML = '';
  (state.content.events || []).forEach((item, i) => {
    el.innerHTML += `
      <div class="item-card">
        <div class="item-info">
          <span class="item-badge">${item.day} ${item.month}</span>
          <div class="item-title">${item.title}</div>
          <div class="item-meta">📍 ${item.location}</div>
        </div>
        <div class="item-actions">
          <button class="btn-edit" onclick="editEvent(${i})">সম্পাদনা</button>
          <button class="btn-delete" onclick="deleteItem('events', ${i})">🗑</button>
        </div>
      </div>`;
  });
}

function populateInitiatives() {
  const el = document.getElementById('initiatives-list');
  el.innerHTML = '';
  (state.content.initiatives || []).forEach((item, i) => {
    el.innerHTML += `
      <div class="item-card">
        <div class="item-info">
          <div class="item-title">${item.title}</div>
          <div class="item-meta">${item.desc.substring(0, 80)}...</div>
        </div>
        <div class="item-actions">
          <button class="btn-edit" onclick="editInitiative(${i})">সম্পাদনা</button>
          <button class="btn-delete" onclick="deleteItem('initiatives', ${i})">🗑</button>
        </div>
      </div>`;
  });
}

function populateContact() {
  const c = state.content.contact;
  document.getElementById('contact-email').value = c.email || '';
  document.getElementById('contact-phone').value = c.phone || '';
  document.getElementById('contact-address').value = c.address || '';
  document.getElementById('contact-facebook').value = c.facebook || '';
  document.getElementById('contact-instagram').value = c.instagram || '';
  document.getElementById('contact-youtube').value = c.youtube || '';
  document.getElementById('footer-tagline').value = state.content.footer?.tagline || '';
}

function updateDashboard() {
  document.getElementById('dash-news-count').textContent = state.content.news?.length || 0;
  document.getElementById('dash-events-count').textContent = state.content.events?.length || 0;
  document.getElementById('dash-init-count').textContent = state.content.initiatives?.length || 0;
}

// ============================================
// COLLECT FORM DATA INTO STATE
// ============================================
function collectAllFormData() {
  // Hero
  state.content.hero.tagline = document.getElementById('hero-tagline').value;
  state.content.hero.description = document.getElementById('hero-description').value;
  state.content.hero.btn_primary = document.getElementById('hero-btn-primary').value;
  state.content.hero.btn_primary_href = document.getElementById('hero-btn-primary-href').value;
  state.content.hero.btn_ghost = document.getElementById('hero-btn-ghost').value;
  state.content.hero.btn_ghost_href = document.getElementById('hero-btn-ghost-href').value;

  // About
  state.content.about.lead = document.getElementById('about-lead').value;
  state.content.about.body = document.getElementById('about-body').value;
  document.querySelectorAll('.stat-number').forEach(el => {
    state.content.about.stats[el.dataset.idx].number = el.value;
  });
  document.querySelectorAll('.stat-label-input').forEach(el => {
    state.content.about.stats[el.dataset.idx].label = el.value;
  });

  // Contact
  state.content.contact.email = document.getElementById('contact-email').value;
  state.content.contact.phone = document.getElementById('contact-phone').value;
  state.content.contact.address = document.getElementById('contact-address').value;
  state.content.contact.facebook = document.getElementById('contact-facebook').value;
  state.content.contact.instagram = document.getElementById('contact-instagram').value;
  state.content.contact.youtube = document.getElementById('contact-youtube').value;
  state.content.footer.tagline = document.getElementById('footer-tagline').value;
}

// ============================================
// NEWS CRUD
// ============================================
function addNews() {
  openModal('নতুন সংবাদ', newsForm({}), () => {
    const item = collectNewsForm();
    item.id = 'news-' + Date.now();
    state.content.news.unshift(item);
    populateNews();
    updateDashboard();
    closeModal();
    showToast('✅ সংবাদ যোগ হয়েছে। Save & Deploy করুন।');
  });
}

function editNews(i) {
  const item = state.content.news[i];
  openModal('সংবাদ সম্পাদনা', newsForm(item), () => {
    state.content.news[i] = { ...item, ...collectNewsForm() };
    populateNews();
    closeModal();
    showToast('✅ সংবাদ আপডেট হয়েছে। Save & Deploy করুন।');
  });
}

function newsForm(item) {
  return `
    <div class="field-group">
      <label>Category</label>
      <input type="text" id="m-category" value="${item.category || ''}" placeholder="ঘোষণা / সাফল্য / কর্মশালা" />
    </div>
    <div class="field-group">
      <label>তারিখ</label>
      <input type="text" id="m-date" value="${item.date || ''}" placeholder="২৫ জুলাই, ২০২৬" />
    </div>
    <div class="field-group">
      <label>শিরোনাম</label>
      <input type="text" id="m-title" value="${item.title || ''}" />
    </div>
    <div class="field-group">
      <label>সংক্ষিপ্ত বর্ণনা</label>
      <textarea id="m-excerpt" rows="3">${item.excerpt || ''}</textarea>
    </div>
    <div class="field-group">
      <label>Link (URL)</label>
      <input type="text" id="m-link" value="${item.link || '#'}" />
    </div>
    <div class="field-group">
      <label>Featured? (প্রথম বড় কার্ড)</label>
      <select id="m-featured">
        <option value="false" ${!item.featured ? 'selected' : ''}>না</option>
        <option value="true" ${item.featured ? 'selected' : ''}>হ্যাঁ</option>
      </select>
    </div>`;
}

function collectNewsForm() {
  return {
    category: document.getElementById('m-category').value,
    date: document.getElementById('m-date').value,
    title: document.getElementById('m-title').value,
    excerpt: document.getElementById('m-excerpt').value,
    link: document.getElementById('m-link').value,
    featured: document.getElementById('m-featured').value === 'true'
  };
}

// ============================================
// EVENTS CRUD
// ============================================
function addEvent() {
  openModal('নতুন অনুষ্ঠান', eventForm({}), () => {
    const item = collectEventForm();
    item.id = 'event-' + Date.now();
    state.content.events.push(item);
    populateEvents();
    updateDashboard();
    closeModal();
    showToast('✅ অনুষ্ঠান যোগ হয়েছে। Save & Deploy করুন।');
  });
}

function editEvent(i) {
  const item = state.content.events[i];
  openModal('অনুষ্ঠান সম্পাদনা', eventForm(item), () => {
    state.content.events[i] = { ...item, ...collectEventForm() };
    populateEvents();
    closeModal();
    showToast('✅ অনুষ্ঠান আপডেট হয়েছে। Save & Deploy করুন।');
  });
}

function eventForm(item) {
  return `
    <div class="field-group">
      <label>দিন (বাংলায়)</label>
      <input type="text" id="m-day" value="${item.day || ''}" placeholder="০৫" />
    </div>
    <div class="field-group">
      <label>মাস (বাংলায়)</label>
      <input type="text" id="m-month" value="${item.month || ''}" placeholder="আগস্ট" />
    </div>
    <div class="field-group">
      <label>অনুষ্ঠানের নাম</label>
      <input type="text" id="m-title" value="${item.title || ''}" />
    </div>
    <div class="field-group">
      <label>সময়</label>
      <input type="text" id="m-time" value="${item.time || ''}" placeholder="সকাল ১০টা — রাত ১০টা" />
    </div>
    <div class="field-group">
      <label>স্থান</label>
      <input type="text" id="m-location" value="${item.location || ''}" />
    </div>
    <div class="field-group">
      <label>বর্ণনা</label>
      <textarea id="m-desc" rows="3">${item.desc || ''}</textarea>
    </div>
    <div class="field-group">
      <label>Button লেখা</label>
      <input type="text" id="m-btn-label" value="${item.btn_label || 'বিস্তারিত'}" />
    </div>
    <div class="field-group">
      <label>Button Style</label>
      <select id="m-btn-style">
        <option value="primary" ${item.btn_style === 'primary' ? 'selected' : ''}>Primary (রঙিন)</option>
        <option value="outline" ${item.btn_style === 'outline' ? 'selected' : ''}>Outline (খালি)</option>
      </select>
    </div>
    <div class="field-group">
      <label>Link (URL)</label>
      <input type="text" id="m-link" value="${item.link || '#'}" />
    </div>`;
}

function collectEventForm() {
  return {
    day: document.getElementById('m-day').value,
    month: document.getElementById('m-month').value,
    title: document.getElementById('m-title').value,
    time: document.getElementById('m-time').value,
    location: document.getElementById('m-location').value,
    desc: document.getElementById('m-desc').value,
    btn_label: document.getElementById('m-btn-label').value,
    btn_style: document.getElementById('m-btn-style').value,
    link: document.getElementById('m-link').value
  };
}

// ============================================
// INITIATIVES CRUD
// ============================================
function addInitiative() {
  openModal('নতুন উদ্যোগ', initiativeForm({}), () => {
    const item = collectInitiativeForm();
    item.id = 'init-' + Date.now();
    state.content.initiatives.push(item);
    populateInitiatives();
    updateDashboard();
    closeModal();
    showToast('✅ উদ্যোগ যোগ হয়েছে। Save & Deploy করুন।');
  });
}

function editInitiative(i) {
  const item = state.content.initiatives[i];
  openModal('উদ্যোগ সম্পাদনা', initiativeForm(item), () => {
    state.content.initiatives[i] = { ...item, ...collectInitiativeForm() };
    populateInitiatives();
    closeModal();
    showToast('✅ উদ্যোগ আপডেট হয়েছে। Save & Deploy করুন।');
  });
}

function initiativeForm(item) {
  return `
    <div class="field-group">
      <label>শিরোনাম</label>
      <input type="text" id="m-title" value="${item.title || ''}" />
    </div>
    <div class="field-group">
      <label>বর্ণনা</label>
      <textarea id="m-desc" rows="4">${item.desc || ''}</textarea>
    </div>`;
}

function collectInitiativeForm() {
  return {
    title: document.getElementById('m-title').value,
    desc: document.getElementById('m-desc').value
  };
}

// ============================================
// DELETE
// ============================================
function deleteItem(type, i) {
  const labels = { news: 'সংবাদ', events: 'অনুষ্ঠান', initiatives: 'উদ্যোগ' };
  if (!confirm(`এই ${labels[type]}টি মুছে ফেলবেন?`)) return;
  state.content[type].splice(i, 1);
  if (type === 'news') populateNews();
  if (type === 'events') populateEvents();
  if (type === 'initiatives') populateInitiatives();
  updateDashboard();
  showToast(`✅ ${labels[type]} মুছে ফেলা হয়েছে। Save & Deploy করুন।`);
}

// ============================================
// MODAL
// ============================================
let modalSaveCallback = null;

function openModal(title, bodyHtml, onSave) {
  document.getElementById('modal-title').textContent = title;
  document.getElementById('modal-body').innerHTML = bodyHtml;
  document.getElementById('modal-overlay').classList.remove('hidden');
  modalSaveCallback = onSave;
}

function closeModal() {
  document.getElementById('modal-overlay').classList.add('hidden');
  modalSaveCallback = null;
}

document.getElementById('modal-save-btn').addEventListener('click', () => {
  if (modalSaveCallback) modalSaveCallback();
});

document.getElementById('modal-overlay').addEventListener('click', e => {
  if (e.target === document.getElementById('modal-overlay')) closeModal();
});

// ============================================
// TOAST
// ============================================
function showToast(msg, type = '') {
  const toast = document.getElementById('toast');
  toast.textContent = msg;
  toast.className = `toast ${type}`;
  toast.classList.remove('hidden');
  setTimeout(() => toast.classList.add('hidden'), 4000);
}

// ============================================
// DEPLOY LOG
// ============================================
function addDeployLog(status, time) {
  state.deployLog.unshift({ status, time });
  if (state.deployLog.length > 5) state.deployLog.pop();
  const el = document.getElementById('deploy-log');
  el.innerHTML = '<h3>সর্বশেষ Deploy</h3>' +
    state.deployLog.map(l =>
      `<div class="log-entry">
        <span class="${l.status === 'সফল' ? 'log-success' : 'log-error'}">${l.status === 'সফল' ? '✅' : '❌'} ${l.status}</span>
        <span class="log-time">${l.time}</span>
      </div>`
    ).join('');
}
