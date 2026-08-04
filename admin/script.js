/* ═══════════════════════════════════════════
   SOPTOSUR ENTERPRISE ADMIN — Script v3
   Features: Search, Gallery Manager, Submissions, Backup/Restore, Preview
═══════════════════════════════════════════ */

const S = { token:'', repo:'', content:null, sha:'', logs:[], saveCb:null };
const $ = id => document.getElementById(id);
const titles = {
  dashboard:'Dashboard', preview:'Live Preview', backup:'Backup & Restore',
  site:'Site Settings', theme:'Theme & Colors', 'nav-edit':'Navigation',
  admins:'Admin Users & Access Control', hero:'Hero Section', about:'About',
  gallery:'Photo Gallery', news:'সংবাদ', events:'অনুষ্ঠান', initiatives:'উদ্যোগ',
  join:'Join Form Settings', submissions:'Form Submissions', contact:'যোগাযোগ & Footer'
};

/* UTF-8 safe base64 */
function b64decode(str) {
  const bin = atob(str.replace(/\n/g,''));
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return new TextDecoder('utf-8').decode(bytes);
}
function b64encode(str) {
  const bytes = new TextEncoder().encode(str);
  let bin = '';
  bytes.forEach(b => bin += String.fromCharCode(b));
  return btoa(bin);
}

/* ══════════════════════════════════════════
   GOOGLE AUTH & ACCESS CONTROL
══════════════════════════════════════════ */
function parseJwt(token) {
  try {
    const base64Url = token.split('.')[1];
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    const jsonPayload = decodeURIComponent(atob(base64).split('').map(c => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2)).join(''));
    return JSON.parse(jsonPayload);
  } catch (e) { return null; }
}

function switchLoginTab(mode) {
  document.querySelectorAll('.login-tab').forEach(t => t.classList.remove('active'));
  document.querySelectorAll('.login-sec').forEach(s => s.style.display = 'none');
  const activeTab = $(`tab-${mode}`);
  const activeSec = $(`login-sec-${mode}`);
  if (activeTab) activeTab.classList.add('active');
  if (activeSec) activeSec.style.display = 'block';
}

async function verifyGoogleUser(googleProfile) {
  const errEl = $('login-error');
  errEl.textContent = '';
  if (!googleProfile || !googleProfile.email) {
    errEl.textContent = 'Google সাইন-ইন থেকে কোনো ইমেইল পাওয়া যায়নি।';
    return;
  }
  const email = googleProfile.email.trim().toLowerCase();

  // Load content.json if not already in state
  if (!S.content) {
    try {
      let r = await fetch('../content.json?v=' + Date.now());
      if (!r.ok) r = await fetch('./content.json?v=' + Date.now());
      if (r.ok) S.content = await r.json();
    } catch(e) {}
  }

  const admins = S.content?.admins || [
    { email: 'rezwanahmed399@gmail.com', role: 'Super Admin', status: 'active' }
  ];

  const adminAcc = admins.find(a => a.email.toLowerCase() === email);
  if (!adminAcc) {
    errEl.textContent = `অ্যাক্সেস প্রত্যাখ্যান করা হয়েছে: (${email}) অ্যাকাউন্টটি অ্যাডমিন তালিকায় অনুমোদিত নয়।`;
    return;
  }
  if (adminAcc.status === 'blocked') {
    errEl.textContent = `অ্যাক্সেস ব্লক করা হয়েছে: (${email}) অ্যাকাউন্টটি ব্লক অবস্থায় আছে।`;
    return;
  }

  S.user = googleProfile;
  localStorage.setItem('adm_google_user', JSON.stringify(googleProfile));

  const rep = localStorage.getItem('adm_rep') || 'rezwanahmed399/soptosur';
  const tok = localStorage.getItem('adm_tok') || '';
  S.repo = rep;
  S.token = tok;

  if (tok) {
    try { await tryLogin(tok, rep); } catch(e) {}
  }
  bootApp();
  toast(`স্বাগতম ${googleProfile.name || email}!`, 'ok');
}

function handleCredentialResponse(response) {
  const payload = parseJwt(response.credential);
  if (payload) {
    verifyGoogleUser(payload);
  }
}

function triggerGoogleSignIn() {
  const errEl = $('login-error');
  errEl.textContent = '';

  const clientId = S.content?.google_client_id;
  const isValidClientId = clientId &&
    clientId.includes('.apps.googleusercontent.com') &&
    !clientId.includes('vj7s9j5g6k3l2p1o4n8b7v6c5x4z3a2s');

  if (!isValidClientId) {
    // No Client ID configured — show setup instructions, BLOCK all access
    errEl.innerHTML = `
      <strong>Google Sign-In সেটআপ প্রয়োজন</strong><br>
      Token Login দিয়ে অ্যাডমিন প্যানেলে ঢুকুন → <em>"অ্যাডমিন অ্যাক্সেস"</em> সেকশনে গিয়ে
      <a href="https://console.cloud.google.com/apis/credentials" target="_blank" style="color:var(--accent)">Google Cloud Console</a>
      থেকে OAuth Client ID যুক্ত করুন।`;
    return;
  }

  // Real Google OAuth popup
  if (window.google?.accounts?.oauth2) {
    requestGoogleOAuthToken(clientId);
    return;
  }

  errEl.textContent = 'Google SDK লোড হয়নি। পেজ রিফ্রেশ করে আবার চেষ্টা করুন।';
}

function requestGoogleOAuthToken(clientId) {
  if (!window.google?.accounts?.oauth2) return;
  const client = google.accounts.oauth2.initTokenClient({
    client_id: clientId,
    scope: 'https://www.googleapis.com/auth/userinfo.email https://www.googleapis.com/auth/userinfo.profile openid',
    callback: async (tokenResponse) => {
      if (tokenResponse.access_token) {
        try {
          const res = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
            headers: { Authorization: `Bearer ${tokenResponse.access_token}` }
          });
          const profile = await res.json();
          if (!profile.email_verified) {
            $('login-error').textContent = 'Google অ্যাকাউন্টটি ভেরিফাইড নয়।';
            return;
          }
          verifyGoogleUser(profile);
        } catch(e) {
          $('login-error').textContent = 'Google অ্যাকাউন্ট যাচাই করতে ব্যর্থ হয়েছে।';
        }
      }
    },
    error_callback: (err) => {
      const errEl = $('login-error');
      if (err?.type === 'popup_failed_to_open') {
        errEl.textContent = 'পপআপ ব্লক করা হয়েছে। ব্রাউজারে পপআপ অনুমোদন করুন।';
      } else {
        errEl.innerHTML = 'Google OAuth Client ID টি আপনার ডোমেইনের (soptosur.vercel.app) জন্য রেজিস্টার্ড হতে হবে।<br><small style="color:var(--text2)">Google Cloud Console থেকে পাওয়া Client ID টি "অ্যাডমিন অ্যাক্সেস" সেকশনে যোগ করুন।</small>';
      }
    }
  });
  client.requestAccessToken();
}

/* ══════════════════════════════════════════
   TOKEN AUTH & SESSION
══════════════════════════════════════════ */
async function tryLogin(token, repo) {
  const r = await fetch(`https://api.github.com/repos/${repo}/contents/content.json`, {
    headers: { Authorization: `token ${token}`, Accept: 'application/vnd.github.v3+json' }
  });
  if (!r.ok) { const e = await r.json(); throw new Error(e.message || 'Login failed'); }
  const d = await r.json();
  S.token = token; S.repo = repo; S.sha = d.sha;
  S.content = JSON.parse(b64decode(d.content));
}

$('login-btn').onclick = async () => {
  const token = $('token-input').value.trim();
  const repo  = ($('repo-input')?.value || 'rezwanahmed399/soptosur').trim();
  const errEl = $('login-error');
  errEl.textContent = '';
  if (!token) { errEl.textContent = 'Token দিন'; return; }
  setLoginLoading(true);
  try {
    await tryLogin(token, repo);
    localStorage.setItem('adm_tok', token);
    localStorage.setItem('adm_rep', repo);
    bootApp();
  } catch(e) { errEl.textContent = e.message; setLoginLoading(false); }
};

$('token-input').addEventListener('keypress', e => { if(e.key==='Enter') $('login-btn').click(); });
$('repo-input').addEventListener('keypress', e => { if(e.key==='Enter') $('login-btn').click(); });

function setLoginLoading(on) {
  $('login-btn').disabled = on;
  $('login-btn').textContent = on ? 'যাচাই করছি...' : 'Login করুন';
}

$('logout-btn').onclick = () => {
  localStorage.removeItem('adm_tok'); localStorage.removeItem('adm_rep'); localStorage.removeItem('adm_google_user');
  Object.assign(S, {token:'', repo:'', content:null, sha:'', logs:[], user:null});
  $('admin-app').style.display = 'none';
  $('login-screen').style.display = '';
  setLoginLoading(false);
};

window.addEventListener('DOMContentLoaded', async () => {
  const tok = localStorage.getItem('adm_tok');
  const rep = localStorage.getItem('adm_rep');
  if (tok && rep) {
    $('login-btn').textContent = 'Reconnecting...';
    $('login-btn').disabled = true;
    $('repo-input').value = rep;
    try { await tryLogin(tok, rep); bootApp(); return; } catch(e) {}
    setLoginLoading(false);
  }
});

function bootApp() {
  $('login-screen').style.display = 'none';
  $('admin-app').style.display = 'flex';
  fillAll();
  switchSection('dashboard');
}

/* ══════════════════════════════════════════
   NAVIGATION & SECTIONS
══════════════════════════════════════════ */
document.querySelectorAll('.nav-link').forEach(el => {
  el.addEventListener('click', e => { e.preventDefault(); switchSection(el.dataset.section); closeSidebar(); });
});

$('menu-toggle').onclick = () => { $('sidebar').classList.toggle('open'); $('sidebar-overlay').classList.toggle('open'); };
$('sidebar-overlay').onclick = closeSidebar;
function closeSidebar() { $('sidebar').classList.remove('open'); $('sidebar-overlay').classList.remove('open'); }

function switchSection(name) {
  document.querySelectorAll('.nav-link').forEach(el => el.classList.toggle('active', el.dataset.section===name));
  document.querySelectorAll('.panel').forEach(el => el.classList.toggle('active', el.id===`panel-${name}`));
  $('topbar-title').textContent = titles[name] || name;
}

/* ══════════════════════════════════════════
   FILL ALL FORMS
══════════════════════════════════════════ */
function fillAll() {
  const c = S.content;

  c.site        = c.site        || {};
  c.nav         = c.nav         || { links: [] };
  c.gallery     = c.gallery     || [];
  c.submissions = c.submissions || [];
  c.join        = c.join        || {};
  c.footer      = c.footer      || {};
  c.about       = c.about       || {};

  // SITE
  $('site-name').value    = c.site.name    || '';
  $('site-founded').value = c.site.founded || '';
  $('site-title').value   = c.site.title   || '';
  $('site-desc').value    = c.site.description || '';

  // THEME
  const p = c.site.theme_primary || '#8B5E3C';
  const a = c.site.theme_accent  || '#C17A3A';
  const cr= c.site.theme_cream   || '#FAF7F2';
  $('theme-primary').value = p; $('prev-primary').style.background = p;
  $('theme-accent').value  = a; $('prev-accent').style.background  = a;
  $('theme-cream').value   = cr;$('prev-cream').style.background   = cr;
  ['primary','accent','cream'].forEach(k => {
    $(`theme-${k}`).addEventListener('input', function() {
      $(`prev-${k}`).style.background = this.value;
    });
  });

  // NAV
  buildNavList();

  // HERO
  $('hero-tagline').value    = c.hero?.tagline    || '';
  $('hero-desc').value       = c.hero?.description|| '';
  $('hero-btn1-label').value = c.hero?.btn_primary || '';
  $('hero-btn1-href').value  = c.hero?.btn_primary_href || '';
  $('hero-btn2-label').value = c.hero?.btn_ghost   || '';
  $('hero-btn2-href').value  = c.hero?.btn_ghost_href  || '';

  // ABOUT
  $('about-label').value = c.about.label || '';
  $('about-title').value = c.about.title || '';
  $('about-lead').value  = c.about.lead  || '';
  $('about-body').value  = c.about.body  || '';
  buildStatsEditor(c.about.stats || []);

  // LISTS
  buildGalleryList();
  buildNewsList();
  buildEventsList();
  buildInitsList();
  buildSubmissionsList();
  buildAdminsList();

  if ($('cfg-google-client-id')) $('cfg-google-client-id').value = c.google_client_id || '';

  // JOIN
  $('join-label').value   = c.join.label    || '';
  $('join-title').value   = c.join.title    || '';
  $('join-desc').value    = c.join.desc     || '';
  $('join-btn').value     = c.join.btn_label|| '';
  $('join-success').value = c.join.success_msg|| '';

  // CONTACT
  $('contact-email').value    = c.contact?.email    || '';
  $('contact-phone').value    = c.contact?.phone    || '';
  $('contact-address').value  = c.contact?.address  || '';
  $('contact-facebook').value = c.contact?.facebook || '';
  $('contact-instagram').value= c.contact?.instagram|| '';
  $('contact-youtube').value  = c.contact?.youtube  || '';
  $('footer-tagline').value   = c.footer.tagline    || '';
  $('footer-copyright').value = c.footer.copyright  || '';

  updateDash();
}

/* ── Admins Manager ── */
function buildAdminsList() {
  const admins = S.content.admins || [];
  const container = $('admins-list');
  if (!container) return;
  container.innerHTML = admins.map((a, i) => `
    <div class="admin-card">
      <div class="admin-user-info">
        <div class="admin-avatar">${esc((a.name||a.email||'A')[0].toUpperCase())}</div>
        <div>
          <div class="admin-email">${esc(a.email)}</div>
          <div class="admin-role-badge">${esc(a.name || 'Admin')} • <span style="color:var(--accent)">${esc(a.role || 'Admin')}</span></div>
        </div>
      </div>
      <div class="item-actions">
        <span class="${a.status==='blocked'?'badge-blocked':'badge-active'}">${a.status==='blocked'?'Blocked':'Active'}</span>
        <button class="btn-block-toggle ${a.status==='blocked'?'unblock':'block'}" onclick="toggleBlockAdmin(${i})">
          <svg style="width:14px;height:14px;"><use href="${a.status==='blocked'?'#ic-check':'#ic-block'}"/></svg>
          <span>${a.status==='blocked'?'Unblock':'Block'}</span>
        </button>
        ${a.role !== 'Super Admin' ? `<button class="btn-icon del" onclick="delAdmin(${i})"><svg><use href="#ic-trash"/></svg></button>` : ''}
      </div>
    </div>`).join('') || '<p class="empty-msg" style="padding:1rem">কোনো অ্যাডমিন অ্যাকাউন্ট তালিকায় নেই</p>';
}

function addAdminModal() {
  openModal('নতুন Admin Gmail যুক্ত করুন', fields([
    { id:'f-email', label:'Gmail Address', val:'', type:'text', ph:'user@gmail.com' },
    { id:'f-name',  label:'অ্যাডমিনের নাম', val:'', type:'text', ph:'আরিফুল ইসলাম' },
    { id:'f-role',  label:'Role', val:'Admin', type:'select', opts:[['Admin','Admin'],['Super Admin','Super Admin']] },
    { id:'f-status',label:'Status', val:'active', type:'select', opts:[['active','Active'],['blocked','Blocked']] }
  ]), () => {
    const email = $('f-email').value.trim();
    if (!email || !email.includes('@')) { toast('সঠিক ইমেইল লিখুন', 'err'); return; }
    S.content.admins = S.content.admins || [];
    S.content.admins.push({
      id: 'adm-' + Date.now(),
      email: email,
      name: $('f-name').value.trim() || email.split('@')[0],
      role: $('f-role').value,
      status: $('f-status').value,
      added: new Date().toISOString().split('T')[0]
    });
    buildAdminsList(); closeModal(); toast('নতুন অ্যাডমিন যোগ হয়েছে — Save করুন');
  });
}

function toggleBlockAdmin(i) {
  const adm = S.content.admins[i];
  adm.status = (adm.status === 'blocked') ? 'active' : 'blocked';
  buildAdminsList();
  toast(`${adm.email} এখন ${adm.status === 'blocked' ? 'ব্লকড' : 'অ্যাক্টিভ'} — Save করুন`);
}

function delAdmin(i) {
  const adm = S.content.admins[i];
  if (adm.role === 'Super Admin') { toast('Super Admin মোছা যাবে না', 'err'); return; }
  if (!confirm(`${adm.email} কে অ্যাডমিন তালিকা থেকে মুছে ফেলবেন?`)) return;
  S.content.admins.splice(i, 1);
  buildAdminsList();
  toast('অ্যাডমিন মুছে ফেলা হয়েছে — Save করুন');
}

/* ── Stats Editor ── */
function buildStatsEditor(stats) {
  $('stats-grid').innerHTML = stats.map((s,i) => `
    <div class="stat-editor-card">
      <div class="field"><label>সংখ্যা</label><input type="text" class="s-num" data-i="${i}" value="${esc(s.number)}"/></div>
      <div class="field"><label>Label</label><input type="text" class="s-lbl" data-i="${i}" value="${esc(s.label)}"/></div>
    </div>`).join('');
}

/* ── Nav Editor ── */
function buildNavList() {
  const links = S.content.nav?.links || [];
  $('nav-list').innerHTML = links.map((lk, i) => `
    <div class="nav-item-row" data-i="${i}">
      <div class="nav-drag-handle">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="9" cy="5" r="1" fill="currentColor"/><circle cx="15" cy="5" r="1" fill="currentColor"/><circle cx="9" cy="12" r="1" fill="currentColor"/><circle cx="15" cy="12" r="1" fill="currentColor"/><circle cx="9" cy="19" r="1" fill="currentColor"/><circle cx="15" cy="19" r="1" fill="currentColor"/></svg>
      </div>
      <div class="field" style="margin:0"><input type="text" class="nl-label" data-i="${i}" value="${esc(lk.label)}" placeholder="Label"/></div>
      <div class="field" style="margin:0"><input type="text" class="nl-href" data-i="${i}" value="${esc(lk.href)}" placeholder="#section"/></div>
      <label class="nav-cta-toggle" title="CTA Button style">
        <input type="checkbox" class="nl-cta" data-i="${i}" ${lk.cta?'checked':''}/>CTA
      </label>
      <button class="btn-order" onclick="moveNav(${i},-1)" title="উপরে"><svg><use href="#ic-up"/></svg></button>
      <button class="btn-icon del" onclick="delNav(${i})" title="মুছুন"><svg><use href="#ic-trash"/></svg></button>
    </div>`).join('');
}

function moveNav(i, dir) {
  const links = S.content.nav.links;
  const ni = i + dir;
  if (ni < 0 || ni >= links.length) return;
  [links[i], links[ni]] = [links[ni], links[i]];
  buildNavList();
  toast('Order পরিবর্তন হয়েছে — Save করুন');
}

function addNavLink() {
  S.content.nav.links.push({ id:'nav-'+Date.now(), label:'নতুন Link', href:'#', cta:false });
  buildNavList();
  toast('Nav link যোগ হয়েছে — Save করুন');
}

function delNav(i) {
  if (!confirm('এই nav link মুছে ফেলবেন?')) return;
  S.content.nav.links.splice(i, 1);
  buildNavList();
  toast('Nav link মুছে ফেলা হয়েছে — Save করুন');
}

/* ── Gallery Manager ── */
function buildGalleryList() {
  $('gallery-list').innerHTML = (S.content.gallery || []).map((it,i) => `
    <div class="item-row">
      <div class="item-info">
        <div class="item-title">${esc(it.title)}</div>
        <div class="item-sub">${esc(it.url)}</div>
      </div>
      <div class="item-actions">
        <button class="btn-icon edit" onclick="editGallery(${i})"><svg><use href="#ic-edit"/></svg></button>
        <button class="btn-icon del" onclick="delGallery(${i})"><svg><use href="#ic-trash"/></svg></button>
      </div>
    </div>`).join('') || '<p class="empty-msg" style="padding:1rem">কোনো ছবি নেই</p>';
}

function addGalleryItem() {
  openModal('নতুন গ্যালারি ছবি', galleryFields({}), () => {
    S.content.gallery.push({ id:'gal-'+Date.now(), ...pickGallery() });
    buildGalleryList(); closeModal(); toast('ছবি যোগ হয়েছে — Save করুন');
  });
}
function editGallery(i) {
  openModal('গ্যালারি তথ্য সম্পাদনা', galleryFields(S.content.gallery[i]), () => {
    S.content.gallery[i] = { ...S.content.gallery[i], ...pickGallery() };
    buildGalleryList(); closeModal(); toast('ছবি আপডেট হয়েছে — Save করুন');
  });
}
function delGallery(i) {
  if (!confirm('ছবিটি মুছে ফেলবেন?')) return;
  S.content.gallery.splice(i, 1);
  buildGalleryList(); toast('ছবি মুছে ফেলা হয়েছে');
}
function galleryFields(it) {
  return fields([
    {id:'f-title', label:'ফটো শিরোনাম', val:it.title||'', type:'text'},
    {id:'f-url',   label:'Image URL (path)', val:it.url||'assets/images/', type:'text'}
  ]);
}
function pickGallery() { return { title:$('f-title').value, url:$('f-url').value }; }

/* ── Form Submissions Viewer ── */
function buildSubmissionsList() {
  const subs = S.content.submissions || [];
  $('submissions-list').innerHTML = subs.map((s, i) => `
    <div class="submission-card">
      <div class="sub-meta">
        <span class="sub-name">${esc(s.name)}</span>
        <span>${esc(s.date || '')}</span>
      </div>
      <div class="sub-details">
        <span>📧 ${esc(s.email)}</span>
        <span>🏫 বিভাগ: ${esc(s.dept || 'N/A')}</span>
        <span class="sub-tag">সংগীত: ${esc(s.interest || 'N/A')}</span>
      </div>
    </div>`).join('') || '<p class="empty-msg" style="padding:1rem">কোনো আবেদনপত্র জমা হয়নি</p>';
}

function exportSubmissionsCSV() {
  const subs = S.content.submissions || [];
  if (!subs.length) { toast('কোনো জমা হওয়া আবেদনপত্র নেই', 'err'); return; }
  let csv = 'Name,Email,Department,Interest,Date\n';
  subs.forEach(s => {
    csv += `"${s.name}","${s.email}","${s.dept||''}","${s.interest||''}","${s.date||''}"\n`;
  });
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `saptasur_submissions_${Date.now()}.csv`;
  a.click();
  toast('CSV ফাইল এক্সপোর্ট হয়েছে!');
}

/* ── Backup & Restore ── */
function downloadBackup() {
  collectForms();
  const jsonStr = JSON.stringify(S.content, null, 2);
  const blob = new Blob([jsonStr], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `saptasur_content_backup_${Date.now()}.json`;
  a.click();
  toast('ব্যাকআপ JSON ফাইল ডাউনলোড হয়েছে!');
}

function restoreBackup() {
  const input = $('backup-file-input');
  if (!input.files || !input.files[0]) { toast('দয়া করে একটি JSON ফাইল নির্বাচন করুন', 'err'); return; }
  const reader = new FileReader();
  reader.onload = function(e) {
    try {
      const parsed = JSON.parse(e.target.result);
      if (!parsed.site || !parsed.news) throw new Error('অবৈধ ব্যাকআপ ফাইল স্ট্রাকচার');
      S.content = parsed;
      fillAll();
      toast('ব্যাকআপ রিস্টোর হয়েছে! লাইভ করতে Save & Deploy ক্লিক করুন।', 'ok');
    } catch(err) {
      toast('ফাইল পড়তে ব্যর্থ: ' + err.message, 'err');
    }
  };
  reader.readAsText(input.files[0]);
}

/* ── Live Preview ── */
function refreshPreview() {
  const frame = $('preview-frame');
  if (frame) frame.src = 'https://soptosur.vercel.app?v=' + Date.now();
  toast('প্রিভিউ রিফ্রেশ হয়েছে');
}

/* ── Global Search ── */
function handleGlobalSearch() {
  const q = $('global-search').value.trim().toLowerCase();
  const resEl = $('search-results');
  if (!q) { resEl.style.display = 'none'; return; }

  const results = [];
  const c = S.content;

  (c.news || []).forEach(n => {
    if (n.title.toLowerCase().includes(q) || n.excerpt?.toLowerCase().includes(q)) {
      results.push({ title: n.title, sec: 'সংবাদ', act: () => switchSection('news') });
    }
  });
  (c.events || []).forEach(e => {
    if (e.title.toLowerCase().includes(q) || e.location?.toLowerCase().includes(q)) {
      results.push({ title: e.title, sec: 'অনুষ্ঠান', act: () => switchSection('events') });
    }
  });
  (c.initiatives || []).forEach(i => {
    if (i.title.toLowerCase().includes(q) || i.desc?.toLowerCase().includes(q)) {
      results.push({ title: i.title, sec: 'উদ্যোগ', act: () => switchSection('initiatives') });
    }
  });

  if (!results.length) {
    resEl.innerHTML = '<div class="search-item"><span class="search-item-title">কোনো ফলাফল পাওয়া যায়নি</span></div>';
  } else {
    resEl.innerHTML = results.map((r, i) => `
      <div class="search-item" onclick="execSearchResult(${i})">
        <span class="search-item-title">${esc(r.title)}</span>
        <span class="search-item-sec">${r.sec}</span>
      </div>`).join('');
    window._searchResults = results;
  }
  resEl.style.display = 'flex';
}

function execSearchResult(i) {
  if (window._searchResults && window._searchResults[i]) {
    window._searchResults[i].act();
    $('search-results').style.display = 'none';
    $('global-search').value = '';
  }
}

/* ── News List ── */
function buildNewsList() {
  $('news-list').innerHTML = (S.content.news || []).map((it,i) => `
    <div class="item-row">
      <div class="item-info">
        <span class="item-badge">${esc(it.category)}</span>
        ${it.featured ? '<span class="item-badge" style="background:rgba(82,201,122,0.1);color:#52C97A">Featured</span>' : ''}
        <div class="item-title">${esc(it.title)}</div>
        <div class="item-sub">${esc(it.date)}</div>
      </div>
      <div class="item-actions">
        <button class="btn-icon edit" onclick="editNews(${i})"><svg><use href="#ic-edit"/></svg></button>
        <button class="btn-icon del" onclick="delItem('news',${i})"><svg><use href="#ic-trash"/></svg></button>
      </div>
    </div>`).join('') || '<p class="empty-msg" style="padding:1rem">কোনো সংবাদ নেই</p>';
}

/* ── Events List ── */
function buildEventsList() {
  $('events-list').innerHTML = (S.content.events || []).map((it,i) => `
    <div class="item-row">
      <div class="item-info">
        <span class="item-badge">${esc(it.day)} ${esc(it.month)}</span>
        <div class="item-title">${esc(it.title)}</div>
        <div class="item-sub">${esc(it.location)}</div>
      </div>
      <div class="item-actions">
        <button class="btn-icon edit" onclick="editEvent(${i})"><svg><use href="#ic-edit"/></svg></button>
        <button class="btn-icon del" onclick="delItem('events',${i})"><svg><use href="#ic-trash"/></svg></button>
      </div>
    </div>`).join('') || '<p class="empty-msg" style="padding:1rem">কোনো অনুষ্ঠান নেই</p>';
}

/* ── Initiatives List ── */
function buildInitsList() {
  $('initiatives-list').innerHTML = (S.content.initiatives || []).map((it,i) => `
    <div class="item-row">
      <div class="item-info">
        <div class="item-title">${esc(it.title)}</div>
        <div class="item-sub">${esc((it.desc||'').slice(0,90))}…</div>
      </div>
      <div class="item-actions">
        <button class="btn-icon edit" onclick="editInit(${i})"><svg><use href="#ic-edit"/></svg></button>
        <button class="btn-icon del" onclick="delItem('initiatives',${i})"><svg><use href="#ic-trash"/></svg></button>
      </div>
    </div>`).join('') || '<p class="empty-msg" style="padding:1rem">কোনো উদ্যোগ নেই</p>';
}

function updateDash() {
  $('dash-news').textContent   = S.content.news?.length   || 0;
  $('dash-events').textContent = S.content.events?.length || 0;
  $('dash-init').textContent   = S.content.initiatives?.length || 0;
  $('dash-subs').textContent   = S.content.submissions?.length || 0;
}

/* ══════════════════════════════════════════
   COLLECT ALL FORMS
══════════════════════════════════════════ */
function collectForms() {
  const c = S.content;

  // Site
  c.site.name        = $('site-name').value;
  c.site.founded     = $('site-founded').value;
  c.site.title       = $('site-title').value;
  c.site.description = $('site-desc').value;
  if ($('cfg-google-client-id')) c.google_client_id = $('cfg-google-client-id').value.trim();

  // Theme
  c.site.theme_primary = $('theme-primary').value;
  c.site.theme_accent  = $('theme-accent').value;
  c.site.theme_cream   = $('theme-cream').value;

  // Nav
  document.querySelectorAll('.nl-label').forEach(el => { c.nav.links[+el.dataset.i].label = el.value; });
  document.querySelectorAll('.nl-href').forEach(el  => { c.nav.links[+el.dataset.i].href  = el.value; });
  document.querySelectorAll('.nl-cta').forEach(el   => { c.nav.links[+el.dataset.i].cta   = el.checked; });

  // Hero
  c.hero.tagline          = $('hero-tagline').value;
  c.hero.description      = $('hero-desc').value;
  c.hero.btn_primary      = $('hero-btn1-label').value;
  c.hero.btn_primary_href = $('hero-btn1-href').value;
  c.hero.btn_ghost        = $('hero-btn2-label').value;
  c.hero.btn_ghost_href   = $('hero-btn2-href').value;

  // About
  c.about.label = $('about-label').value;
  c.about.title = $('about-title').value;
  c.about.lead  = $('about-lead').value;
  c.about.body  = $('about-body').value;
  document.querySelectorAll('.s-num').forEach(el => { c.about.stats[+el.dataset.i].number = el.value; });
  document.querySelectorAll('.s-lbl').forEach(el => { c.about.stats[+el.dataset.i].label  = el.value; });

  // Join
  c.join.label      = $('join-label').value;
  c.join.title      = $('join-title').value;
  c.join.desc       = $('join-desc').value;
  c.join.btn_label  = $('join-btn').value;
  c.join.success_msg= $('join-success').value;

  // Contact
  c.contact.email    = $('contact-email').value;
  c.contact.phone    = $('contact-phone').value;
  c.contact.address  = $('contact-address').value;
  c.contact.facebook = $('contact-facebook').value;
  c.contact.instagram= $('contact-instagram').value;
  c.contact.youtube  = $('contact-youtube').value;
  c.footer.tagline   = $('footer-tagline').value;
  c.footer.copyright = $('footer-copyright').value;
}

/* ══════════════════════════════════════════
   THEME PRESETS
══════════════════════════════════════════ */
function applyPreset(primary, accent, cream) {
  $('theme-primary').value = primary; $('prev-primary').style.background = primary;
  $('theme-accent').value  = accent;  $('prev-accent').style.background  = accent;
  $('theme-cream').value   = cream;   $('prev-cream').style.background   = cream;
  toast('Preset প্রয়োগ হয়েছে — Save করুন');
}

/* ══════════════════════════════════════════
   SAVE TO GITHUB
══════════════════════════════════════════ */
async function saveToGitHub() {
  collectForms();
  const btn = $('save-btn'); const st = $('save-status');
  btn.disabled = true;
  st.textContent = 'Saving...'; st.className = 'save-status saving';
  try {
    const r = await fetch(`https://api.github.com/repos/${S.repo}/contents/content.json`, {
      method: 'PUT',
      headers: { Authorization:`token ${S.token}`, Accept:'application/vnd.github.v3+json', 'Content-Type':'application/json' },
      body: JSON.stringify({
        message: `Admin Enterprise Update — ${new Date().toLocaleString('bn-BD')}`,
        content: b64encode(JSON.stringify(S.content, null, 2)),
        sha: S.sha
      })
    });
    if (!r.ok) { const e = await r.json(); throw new Error(e.message); }
    const d = await r.json();
    S.sha = d.content.sha;
    st.textContent = 'Saved!'; st.className = 'save-status ok';
    toast('সফলভাবে save হয়েছে! ৩০ সেকেন্ডে ওয়েবসাইট আপডেট হবে।', 'ok');
    addLog('সফল');
    setTimeout(() => { st.textContent = ''; st.className = 'save-status'; }, 4000);
  } catch(e) {
    st.textContent = 'Failed'; st.className = 'save-status err';
    toast('সমস্যা: ' + e.message, 'err');
    addLog('ব্যর্থ');
  }
  btn.disabled = false;
}

/* ══════════════════════════════════════════
   NEWS CRUD
══════════════════════════════════════════ */
function addNews() {
  openModal('নতুন সংবাদ', newsFields({}), () => {
    S.content.news.unshift({ id:'news-'+Date.now(), ...pickNews() });
    buildNewsList(); updateDash(); closeModal();
    toast('সংবাদ যোগ হয়েছে — Save করুন');
  });
}
function editNews(i) {
  openModal('সংবাদ সম্পাদনা', newsFields(S.content.news[i]), () => {
    S.content.news[i] = { ...S.content.news[i], ...pickNews() };
    buildNewsList(); closeModal(); toast('আপডেট হয়েছে — Save করুন');
  });
}
function newsFields(it) {
  return fields([
    {id:'f-cat',   label:'Category',          val:it.category||'',  type:'text', ph:'ঘোষণা / সাফল্য'},
    {id:'f-date',  label:'তারিখ',             val:it.date||'',      type:'text', ph:'২৫ জুলাই, ২০২৬'},
    {id:'f-title', label:'শিরোনাম',           val:it.title||'',     type:'text'},
    {id:'f-exc',   label:'সংক্ষিপ্ত বর্ণনা', val:it.excerpt||'',   type:'textarea'},
    {id:'f-link',  label:'Link (URL)',         val:it.link||'#',     type:'text'},
    {id:'f-feat',  label:'Featured?',          val:it.featured||false, type:'select', opts:[['false','না'],['true','হ্যাঁ']]}
  ]);
}
function pickNews() {
  return { category:$('f-cat').value, date:$('f-date').value, title:$('f-title').value, excerpt:$('f-exc').value, link:$('f-link').value, featured:$('f-feat').value==='true' };
}

/* ══════════════════════════════════════════
   EVENTS CRUD
══════════════════════════════════════════ */
function addEvent() {
  openModal('নতুন অনুষ্ঠান', eventFields({}), () => {
    S.content.events.push({ id:'ev-'+Date.now(), ...pickEvent() });
    buildEventsList(); updateDash(); closeModal(); toast('যোগ হয়েছে — Save করুন');
  });
}
function editEvent(i) {
  openModal('অনুষ্ঠান সম্পাদনা', eventFields(S.content.events[i]), () => {
    S.content.events[i] = { ...S.content.events[i], ...pickEvent() };
    buildEventsList(); closeModal(); toast('আপডেট হয়েছে — Save করুন');
  });
}
function eventFields(it) {
  return fields([
    {id:'f-day',   label:'দিন',             val:it.day||'',     type:'text', ph:'০৫'},
    {id:'f-mon',   label:'মাস',             val:it.month||'',   type:'text', ph:'আগস্ট'},
    {id:'f-title', label:'অনুষ্ঠানের নাম', val:it.title||'',   type:'text'},
    {id:'f-time',  label:'সময়',            val:it.time||'',    type:'text', ph:'সকাল ১০টা — রাত ১০টা'},
    {id:'f-loc',   label:'স্থান',           val:it.location||'',type:'text'},
    {id:'f-desc',  label:'বর্ণনা',          val:it.desc||'',    type:'textarea'},
    {id:'f-btn',   label:'Button লেখা',    val:it.btn_label||'বিস্তারিত', type:'text'},
    {id:'f-sty',   label:'Button Style',   val:it.btn_style||'outline', type:'select', opts:[['primary','Primary'],['outline','Outline']]},
    {id:'f-link',  label:'Link (URL)',      val:it.link||'#',   type:'text'}
  ]);
}
function pickEvent() {
  return { day:$('f-day').value, month:$('f-mon').value, title:$('f-title').value, time:$('f-time').value, location:$('f-loc').value, desc:$('f-desc').value, btn_label:$('f-btn').value, btn_style:$('f-sty').value, link:$('f-link').value };
}

/* ══════════════════════════════════════════
   INITIATIVES CRUD
══════════════════════════════════════════ */
function addInitiative() {
  openModal('নতুন উদ্যোগ', initFields({}), () => {
    S.content.initiatives.push({ id:'init-'+Date.now(), ...pickInit() });
    buildInitsList(); updateDash(); closeModal(); toast('যোগ হয়েছে — Save করুন');
  });
}
function editInit(i) {
  openModal('উদ্যোগ সম্পাদনা', initFields(S.content.initiatives[i]), () => {
    S.content.initiatives[i] = { ...S.content.initiatives[i], ...pickInit() };
    buildInitsList(); closeModal(); toast('আপডেট হয়েছে — Save করুন');
  });
}
function initFields(it) {
  return fields([
    {id:'f-title', label:'শিরোনাম', val:it.title||'', type:'text'},
    {id:'f-desc',  label:'বর্ণনা',  val:it.desc||'',  type:'textarea'}
  ]);
}
function pickInit() { return { title:$('f-title').value, desc:$('f-desc').value }; }

/* ══════════════════════════════════════════
   DELETE HELPER
══════════════════════════════════════════ */
function delItem(type, i) {
  const names = {news:'সংবাদ', events:'অনুষ্ঠান', initiatives:'উদ্যোগ'};
  if (!confirm(`এই ${names[type]}টি মুছে ফেলবেন?`)) return;
  S.content[type].splice(i, 1);
  if (type==='news') buildNewsList();
  if (type==='events') buildEventsList();
  if (type==='initiatives') buildInitsList();
  updateDash();
  toast(`${names[type]} মুছে ফেলা হয়েছে — Save করুন`);
}

/* ══════════════════════════════════════════
   MODAL HELPERS
══════════════════════════════════════════ */
function fields(defs) {
  return defs.map(d => {
    if (d.type==='textarea') return `<div class="field full"><label>${d.label}</label><textarea id="${d.id}" rows="3">${esc(d.val||'')}</textarea></div>`;
    if (d.type==='select')   return `<div class="field"><label>${d.label}</label><select id="${d.id}">${d.opts.map(([v,l])=>`<option value="${v}" ${(d.val==v||d.val===true&&v==='true')?'selected':''}>${l}</option>`).join('')}</select></div>`;
    return `<div class="field"><label>${d.label}</label><input type="text" id="${d.id}" value="${esc(d.val||'')}" ${d.ph?`placeholder="${d.ph}"`:''}/></div>`;
  }).join('');
}

function openModal(title, body, onSave) {
  $('modal-title').textContent = title;
  $('modal-body').innerHTML = `<div class="form-grid">${body}</div>`;
  $('modal-overlay').style.display = 'flex';
  S.saveCb = onSave;
}
function closeModal() { $('modal-overlay').style.display = 'none'; S.saveCb = null; }
$('modal-confirm').onclick = () => { if(S.saveCb) S.saveCb(); };
$('modal-overlay').onclick = e => { if(e.target===$('modal-overlay')) closeModal(); };
document.addEventListener('keydown', e => { if(e.key==='Escape') closeModal(); });

/* ══════════════════════════════════════════
   TOAST & LOG
══════════════════════════════════════════ */
function toast(msg, type='') {
  const el = $('toast');
  el.textContent = msg; el.className = `toast ${type}`; el.style.display = 'block';
  clearTimeout(el._t);
  el._t = setTimeout(() => { el.style.display = 'none'; }, 4000);
}

function addLog(status) {
  const time = new Date().toLocaleTimeString('bn-BD');
  S.logs.unshift({status, time});
  if (S.logs.length > 6) S.logs.pop();
  $('deploy-log').innerHTML = `<h3>Deploy ইতিহাস</h3>
    ${S.logs.map(l => `<div class="log-row"><span class="${l.status==='সফল'?'log-ok':'log-fail'}">${l.status==='সফল'?'✓ সফল':'✗ ব্যর্থ'}</span><span class="log-time">${l.time}</span></div>`).join('')}`;
}

function esc(str) {
  return String(str).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}
