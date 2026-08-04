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

})();
