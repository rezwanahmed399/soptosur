/* ============================================
   নীহারিকা JavaScript
   ============================================ */

(function () {
  'use strict';

  /* ---- NAV SCROLL EFFECT ---- */
  const header = document.getElementById('site-header');
  window.addEventListener('scroll', () => {
    header.classList.toggle('scrolled', window.scrollY > 20);
  }, { passive: true });


  /* ---- MOBILE NAV TOGGLE ---- */
  const navToggle = document.getElementById('nav-toggle');
  const navLinks  = document.getElementById('nav-links');

  navToggle.addEventListener('click', () => {
    const open = navLinks.classList.toggle('open');
    navToggle.classList.toggle('active', open);
    navToggle.setAttribute('aria-label', open ? 'মেনু বন্ধ করুন' : 'মেনু খুলুন');
  });

  // Close mobile menu on link click
  navLinks.querySelectorAll('.nav-link').forEach(link => {
    link.addEventListener('click', () => {
      navLinks.classList.remove('open');
      navToggle.classList.remove('active');
    });
  });


  /* ---- ACTIVE NAV LINK ON SCROLL ---- */
  const sections = document.querySelectorAll('section[id]');
  const navItems = document.querySelectorAll('.nav-link:not(.nav-cta)');

  const observerOptions = {
    root: null,
    rootMargin: '-40% 0px -55% 0px',
    threshold: 0,
  };

  const sectionObserver = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        navItems.forEach(link => {
          link.style.color = '';
          link.style.fontWeight = '';
        });
        const activeLink = document.querySelector(`.nav-link[href="#${entry.target.id}"]`);
        if (activeLink) {
          activeLink.style.color = 'var(--brown)';
          activeLink.style.fontWeight = '600';
        }
      }
    });
  }, observerOptions);

  sections.forEach(section => sectionObserver.observe(section));


  /* ---- REVEAL ON SCROLL ---- */
  const revealEls = document.querySelectorAll(
    '.news-card, .initiative-card, .event-item, .stat-card, .about-text, .about-stats, .section-header'
  );

  revealEls.forEach(el => el.classList.add('reveal'));

  const revealObserver = new IntersectionObserver((entries) => {
    entries.forEach((entry, i) => {
      if (entry.isIntersecting) {
        // Stagger within parent
        const siblings = Array.from(entry.target.parentElement.children);
        const idx = siblings.indexOf(entry.target);
        setTimeout(() => {
          entry.target.classList.add('visible');
        }, idx * 80);
        revealObserver.unobserve(entry.target);
      }
    });
  }, { rootMargin: '0px 0px -60px 0px', threshold: 0.1 });

  revealEls.forEach(el => revealObserver.observe(el));


  /* ---- COUNTER ANIMATION ---- */
  const statNumbers = document.querySelectorAll('.stat-number');
  const banglaDigits = ['০', '১', '২', '৩', '৪', '৫', '৬', '৭', '৮', '৯'];

  function toBangla(num) {
    return String(num).replace(/\d/g, d => banglaDigits[d]);
  }

  function animateCounter(el) {
    const rawText = el.textContent;
    const match   = rawText.match(/[\d]+/g);
    if (!match) return;

    const target   = parseInt(match[0]);
    const suffix   = rawText.replace(/[\d]+/, '').trim();
    const duration = 1600;
    const steps    = 50;
    const step     = duration / steps;
    let   current  = 0;

    const timer = setInterval(() => {
      current += target / steps;
      if (current >= target) {
        current = target;
        clearInterval(timer);
      }
      el.textContent = toBangla(Math.floor(current)) + suffix;
    }, step);
  }

  const counterObserver = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        animateCounter(entry.target);
        counterObserver.unobserve(entry.target);
      }
    });
  }, { threshold: 0.5 });

  statNumbers.forEach(el => counterObserver.observe(el));


  /* ---- JOIN FORM SUBMIT ---- */
  const joinForm    = document.getElementById('join-form');
  const joinSuccess = document.getElementById('join-success');

  if (joinForm) {
    joinForm.addEventListener('submit', (e) => {
      e.preventDefault();

      const name  = document.getElementById('fullname').value.trim();
      const email = document.getElementById('email').value.trim();

      if (!name || !email) {
        // Simple shake animation
        joinForm.style.animation = 'shake 0.4s ease';
        setTimeout(() => { joinForm.style.animation = ''; }, 400);
        return;
      }

      // Simulate send
      const submitBtn = document.getElementById('join-submit-btn');
      submitBtn.textContent = 'পাঠানো হচ্ছে...';
      submitBtn.disabled = true;

      setTimeout(() => {
        joinForm.style.display = 'none';
        joinSuccess.classList.add('visible');
      }, 1000);
    });
  }


  /* ---- SMOOTH PARALLAX ON HERO BOTANICAL ---- */
  const botLeft  = document.querySelector('.hero-botanical-left');
  const botRight = document.querySelector('.hero-botanical-right');

  if (botLeft && botRight) {
    window.addEventListener('scroll', () => {
      const y = window.scrollY * 0.15;
      botLeft.style.transform  = `translateY(calc(-50% + ${y}px))`;
      botRight.style.transform = `translateY(calc(-50% + ${y}px))`;
    }, { passive: true });
  }


  /* ---- CURSOR TRAIL (subtle) ---- */
  const trail = document.createElement('div');
  trail.style.cssText = `
    position:fixed; width:8px; height:8px;
    border-radius:50%; pointer-events:none; z-index:9999;
    background: rgba(139,94,60,0.35);
    transition: transform 0.1s ease, opacity 0.3s ease;
    opacity:0;
  `;
  document.body.appendChild(trail);

  let mouseX = 0, mouseY = 0, trailX = 0, trailY = 0;

  document.addEventListener('mousemove', (e) => {
    mouseX = e.clientX;
    mouseY = e.clientY;
    trail.style.opacity = '1';
  });

  document.addEventListener('mouseleave', () => { trail.style.opacity = '0'; });

  function animateTrail() {
    trailX += (mouseX - trailX) * 0.2;
    trailY += (mouseY - trailY) * 0.2;
    trail.style.left = (trailX - 4) + 'px';
    trail.style.top  = (trailY - 4) + 'px';
    requestAnimationFrame(animateTrail);
  }
  animateTrail();

  /* ============================================
     CLIENT-SIDE NEWS ROUTER & PAGES
     ============================================ */
  function handleRoute() {
    const hash = window.location.hash || '#';
    const mainSections = document.querySelectorAll('section:not(#all-news-section):not(#single-article-section)');
    const allNewsSec = document.getElementById('all-news-section');
    const singleArticleSec = document.getElementById('single-article-section');

    if (hash.startsWith('#news/') && hash.length > 6) {
      const articleId = hash.replace('#news/', '');
      showSingleArticle(articleId);
    } else if (hash === '#news-all') {
      showAllNews();
    } else {
      // Main homepage view
      if (allNewsSec) allNewsSec.style.display = 'none';
      if (singleArticleSec) singleArticleSec.style.display = 'none';
      mainSections.forEach(sec => sec.style.display = '');

      // Smooth scroll if anchor on main page
      if (hash.length > 1) {
        const target = document.querySelector(hash);
        if (target) {
          setTimeout(() => target.scrollIntoView({ behavior: 'smooth' }), 50);
        }
      }
    }
  }

  function getNewsData() {
    return window.siteContent?.news || [];
  }

  function showSingleArticle(articleId) {
    const mainSections = document.querySelectorAll('section:not(#all-news-section):not(#single-article-section)');
    const allNewsSec = document.getElementById('all-news-section');
    const singleArticleSec = document.getElementById('single-article-section');
    const articleContainer = document.getElementById('article-full-content');

    if (!singleArticleSec || !articleContainer) return;

    const newsList = getNewsData();
    const article = newsList.find(n => n.id === articleId || n.id === `news-${articleId}`);

    if (allNewsSec) allNewsSec.style.display = 'none';
    mainSections.forEach(sec => sec.style.display = 'none');
    singleArticleSec.style.display = 'block';

    if (!article) {
      articleContainer.innerHTML = `
        <div class="article-not-found">
          <h2>সংবাদটি পাওয়া যায়নি</h2>
          <p>আপনি যে তথ্যটি খুঁজছেন তা মুছে ফেলা হয়ে থাকতে পারে।</p>
          <a href="#news-all" class="btn btn-outline">সকল সংবাদ দেখুন</a>
        </div>`;
      window.scrollTo(0, 0);
      return;
    }

    // Format paragraphs from article content
    const rawContent = article.content || article.excerpt || '';
    const paragraphs = rawContent.split('\n').filter(p => p.trim().length > 0);
    const bodyHtml = paragraphs.map(p => `<p class="article-para">${escapeHtml(p)}</p>`).join('');

    const imgHtml = article.image ? `
      <div class="article-hero-img-wrap">
        <img src="${article.image}" alt="${escapeHtml(article.title)}" class="article-hero-img" />
      </div>` : `
      <div class="article-hero-placeholder">
        <div class="placeholder-botanical">
          <svg viewBox="0 0 120 80" fill="none" xmlns="http://www.w3.org/2000/svg">
            <circle cx="60" cy="40" r="35" fill="none" stroke="#8B5E3C" stroke-width="0.8" stroke-dasharray="4 3"/>
            <path d="M60 70 C50 55 30 48 20 30" stroke="#8B5E3C" stroke-width="1.2" fill="none" stroke-linecap="round"/>
            <path d="M60 70 C70 55 90 48 100 30" stroke="#8B5E3C" stroke-width="1.2" fill="none" stroke-linecap="round"/>
          </svg>
        </div>
      </div>`;

    articleContainer.innerHTML = `
      <div class="article-header-meta">
        <span class="news-category">${escapeHtml(article.category || 'সংবাদ')}</span>
        <time class="news-date">🗓️ ${escapeHtml(article.date || '')}</time>
        ${article.author ? `<span class="article-author">✍️ ${escapeHtml(article.author)}</span>` : ''}
      </div>
      <h1 class="article-main-title">${escapeHtml(article.title)}</h1>
      <div class="article-divider"></div>
      ${imgHtml}
      <div class="article-body-content">
        ${bodyHtml}
      </div>
      <div class="article-footer-actions">
        <button class="btn btn-sm btn-outline" id="article-share-btn">🔗 লিংক কপি করুন</button>
        <a href="#news-all" class="btn btn-sm btn-primary">সকল সংবাদ দেখুন →</a>
      </div>`;

    const shareBtn = document.getElementById('article-share-btn');
    if (shareBtn) {
      shareBtn.addEventListener('click', () => {
        navigator.clipboard.writeText(window.location.href);
        shareBtn.textContent = '✓ কপি হয়েছে!';
        setTimeout(() => shareBtn.textContent = '🔗 লিংক কপি করুন', 2500);
      });
    }

    window.scrollTo(0, 0);
  }

  function showAllNews() {
    const mainSections = document.querySelectorAll('section:not(#all-news-section):not(#single-article-section)');
    const allNewsSec = document.getElementById('all-news-section');
    const singleArticleSec = document.getElementById('single-article-section');
    const grid = document.getElementById('all-news-grid');

    if (!allNewsSec || !grid) return;

    if (singleArticleSec) singleArticleSec.style.display = 'none';
    mainSections.forEach(sec => sec.style.display = 'none');
    allNewsSec.style.display = 'block';

    renderAllNewsGrid();
    window.scrollTo(0, 0);
  }

  function renderAllNewsGrid(filterCat = 'all', searchQuery = '') {
    const grid = document.getElementById('all-news-grid');
    if (!grid) return;

    let items = getNewsData();

    if (filterCat !== 'all') {
      items = items.filter(n => n.category === filterCat);
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      items = items.filter(n =>
        (n.title && n.title.toLowerCase().includes(q)) ||
        (n.excerpt && n.excerpt.toLowerCase().includes(q)) ||
        (n.content && n.content.toLowerCase().includes(q))
      );
    }

    if (!items.length) {
      grid.innerHTML = `
        <div class="no-news-found">
          <p>কোনো সংবাদ পাওয়া যায়নি।</p>
        </div>`;
      return;
    }

    grid.innerHTML = items.map(item => `
      <article class="news-card">
        <div class="news-card-body">
          <div class="news-meta">
            <span class="news-category">${escapeHtml(item.category)}</span>
            <time class="news-date">${escapeHtml(item.date)}</time>
          </div>
          <h3 class="news-title"><a href="#news/${item.id}">${escapeHtml(item.title)}</a></h3>
          <p class="news-excerpt">${escapeHtml(item.excerpt)}</p>
          <a href="#news/${item.id}" class="news-read-more">বিস্তারিত পড়ুন <span class="arrow">→</span></a>
        </div>
      </article>`).join('');
  }

  // Filter & Search events for All News page
  let activeCat = 'all';
  const searchInput = document.getElementById('all-news-search');
  const catChips = document.getElementById('news-cat-chips');

  if (searchInput) {
    searchInput.addEventListener('input', (e) => {
      renderAllNewsGrid(activeCat, e.target.value);
    });
  }

  if (catChips) {
    catChips.addEventListener('click', (e) => {
      const btn = e.target.closest('.chip');
      if (!btn) return;
      catChips.querySelectorAll('.chip').forEach(c => c.classList.remove('active'));
      btn.classList.add('active');
      activeCat = btn.dataset.cat || 'all';
      renderAllNewsGrid(activeCat, searchInput ? searchInput.value : '');
    });
  }

  function escapeHtml(str) {
    return String(str || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }

  window.addEventListener('hashchange', handleRoute);
  document.addEventListener('contentLoaded', handleRoute);
  document.addEventListener('DOMContentLoaded', () => {
    setTimeout(handleRoute, 100);
  });

})();
