/* ═══════════════════════════════════════════════════════════════
   EL NINO Studio — Premium Vanilla JS
   Architecture: Utilities → Preloader → Cursor → Nav
                 → Scroll → Reveals → Counters → Magnetic
                 → Parallax → Noise → Init
═══════════════════════════════════════════════════════════════ */

'use strict';

/* ─── UTILITIES ──────────────────────────────────────────────── */

const qs  = (sel, ctx = document) => ctx.querySelector(sel);
const qsa = (sel, ctx = document) => [...ctx.querySelectorAll(sel)];

function lerp(a, b, t) { return a + (b - a) * t; }

function clamp(val, min, max) { return Math.min(Math.max(val, min), max); }

function debounce(fn, delay) {
  let timer;
  return (...args) => { clearTimeout(timer); timer = setTimeout(() => fn(...args), delay); };
}

function onReady(fn) {
  if (document.readyState !== 'loading') fn();
  else document.addEventListener('DOMContentLoaded', fn);
}

/* ─── PRELOADER ──────────────────────────────────────────────── */

function initPreloader() {
  const preloader = qs('#preloader');
  const fill      = qs('.preloader-fill');
  if (!preloader || !fill) return;

  let progress = 0;
  const duration = 1600; // ms
  const start    = performance.now();

  function step(now) {
    const elapsed = now - start;
    progress = clamp(elapsed / duration, 0, 1);

    // Ease out cubic
    const eased = 1 - Math.pow(1 - progress, 3);
    fill.style.width = `${eased * 100}%`;

    if (progress < 1) {
      requestAnimationFrame(step);
    } else {
      finishPreloader();
    }
  }

  requestAnimationFrame(step);

  function finishPreloader() {
    setTimeout(() => {
      preloader.classList.add('is-hidden');
      document.body.classList.remove('is-loading');

      preloader.addEventListener('transitionend', () => {
        preloader.remove();
      }, { once: true });
    }, 200);
  }
}

/* ─── NOISE TEXTURE ──────────────────────────────────────────── */

function initNoise() {
  const overlay = qs('.noise-overlay');
  if (!overlay) return;

  const canvas = document.createElement('canvas');
  canvas.width  = 200;
  canvas.height = 200;
  const ctx = canvas.getContext('2d');
  const img = ctx.createImageData(200, 200);

  for (let i = 0; i < img.data.length; i += 4) {
    const v = Math.random() * 255 | 0;
    img.data[i]     = v;
    img.data[i + 1] = v;
    img.data[i + 2] = v;
    img.data[i + 3] = 255;
  }

  ctx.putImageData(img, 0, 0);
  overlay.style.backgroundImage  = `url(${canvas.toDataURL()})`;
  overlay.style.backgroundSize   = '160px 160px';
  overlay.style.backgroundRepeat = 'repeat';
}

/* ─── CUSTOM CURSOR ──────────────────────────────────────────── */

function initCursor() {
  const outer = qs('#cursor-outer');
  const inner = qs('#cursor-inner');
  if (!outer || !inner) return;

  // Skip on touch devices
  if (!window.matchMedia('(hover: hover)').matches) return;

  let mx = -100, my = -100; // mouse
  let ox = -100, oy = -100; // outer (lerped)
  let rafId = null;

  function moveCursor() {
    // Inner follows mouse exactly
    inner.style.left = `${mx}px`;
    inner.style.top  = `${my}px`;

    // Outer follows with inertia
    ox = lerp(ox, mx, 0.12);
    oy = lerp(oy, my, 0.12);
    outer.style.left = `${ox}px`;
    outer.style.top  = `${oy}px`;

    rafId = requestAnimationFrame(moveCursor);
  }

  document.addEventListener('mousemove', (e) => {
    mx = e.clientX;
    my = e.clientY;

    if (!rafId) {
      outer.style.opacity = '1';
      inner.style.opacity = '1';
      rafId = requestAnimationFrame(moveCursor);
    }
  }, { passive: true });

  document.addEventListener('mouseleave', () => {
    outer.style.opacity = '0';
    inner.style.opacity = '0';
  });

  document.addEventListener('mouseenter', () => {
    outer.style.opacity = '1';
    inner.style.opacity = '1';
  });

  // State: hover on interactive elements
  const hoverTargets = 'a, button, .service-item, .case-item, .process-step, .why-item, .btn-primary, .btn-ghost, .contact-email, .nav-logo';
  const linkTargets  = 'a, button';

  document.addEventListener('mouseover', (e) => {
    const target = e.target.closest(hoverTargets);
    if (target) {
      document.body.classList.add('cursor-hover');
      if (e.target.closest(linkTargets)) document.body.classList.add('cursor-link');
    }
  });

  document.addEventListener('mouseout', (e) => {
    const target = e.target.closest(hoverTargets);
    if (target) {
      document.body.classList.remove('cursor-hover', 'cursor-link');
    }
  });
}

/* ─── NAVIGATION ─────────────────────────────────────────────── */

function initNavbar() {
  const navbar = qs('#navbar');
  if (!navbar) return;

  const scrollThreshold = 60;

  function onScroll() {
    const scrolled = window.scrollY > scrollThreshold;
    navbar.classList.toggle('scrolled', scrolled);
  }

  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll(); // initial state
}

function initActiveNav() {
  const navLinks = qsa('.nav-link');
  const sections = qsa('section[id]');
  if (!navLinks.length || !sections.length) return;

  const navH = parseInt(getComputedStyle(document.documentElement).getPropertyValue('--nav-h')) || 72;

  function updateActive() {
    const scrollY = window.scrollY + navH + 40;

    let current = '';
    sections.forEach(section => {
      if (section.offsetTop <= scrollY) {
        current = section.id;
      }
    });

    navLinks.forEach(link => {
      const href = link.getAttribute('href')?.replace('#', '');
      link.classList.toggle('is-active', href === current);
    });
  }

  window.addEventListener('scroll', debounce(updateActive, 50), { passive: true });
  updateActive();
}

/* ─── MOBILE MENU ────────────────────────────────────────────── */

function initMobileMenu() {
  const hamburger  = qs('#hamburger');
  const mobileMenu = qs('#mobile-menu');
  const mobileLinks = qsa('.mobile-nav-link');
  if (!hamburger || !mobileMenu) return;

  function openMenu() {
    mobileMenu.classList.add('is-open');
    mobileMenu.setAttribute('aria-hidden', 'false');
    hamburger.classList.add('is-active');
    hamburger.setAttribute('aria-expanded', 'true');
    document.body.classList.add('menu-open');
  }

  function closeMenu() {
    mobileMenu.classList.remove('is-open');
    mobileMenu.setAttribute('aria-hidden', 'true');
    hamburger.classList.remove('is-active');
    hamburger.setAttribute('aria-expanded', 'false');
    document.body.classList.remove('menu-open');
  }

  hamburger.addEventListener('click', () => {
    const isOpen = mobileMenu.classList.contains('is-open');
    isOpen ? closeMenu() : openMenu();
  });

  mobileLinks.forEach(link => {
    link.addEventListener('click', closeMenu);
  });

  // Close on escape
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') closeMenu();
  });
}

/* ─── SMOOTH SCROLL ──────────────────────────────────────────── */

function initSmoothScroll() {
  const navH = 72;

  document.addEventListener('click', (e) => {
    const anchor = e.target.closest('a[href^="#"]');
    if (!anchor) return;

    const id = anchor.getAttribute('href');
    if (id === '#') {
      e.preventDefault();
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }

    const target = qs(id);
    if (!target) return;

    e.preventDefault();
    const top = target.getBoundingClientRect().top + window.scrollY - navH;
    window.scrollTo({ top, behavior: 'smooth' });
  });
}

/* ─── INTERSECTION OBSERVER — REVEALS ───────────────────────── */

function initReveal() {
  const elements = qsa('.reveal');
  if (!elements.length) return;

  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('is-visible');
        observer.unobserve(entry.target);
      }
    });
  }, {
    threshold: 0.12,
    rootMargin: '0px 0px -40px 0px',
  });

  elements.forEach(el => observer.observe(el));
}

/* ─── COUNTER ANIMATION ──────────────────────────────────────── */

function initCounters() {
  const counters = qsa('.counter');
  if (!counters.length) return;

  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (!entry.isIntersecting) return;

      const el     = entry.target;
      const target = parseInt(el.dataset.target, 10);
      const duration = 1800;
      const start    = performance.now();

      function update(now) {
        const elapsed  = now - start;
        const progress = clamp(elapsed / duration, 0, 1);
        // Ease out expo
        const eased    = progress === 1 ? 1 : 1 - Math.pow(2, -10 * progress);
        const value    = Math.round(eased * target);

        el.textContent = value.toLocaleString();

        if (progress < 1) requestAnimationFrame(update);
        else el.textContent = target.toLocaleString();
      }

      requestAnimationFrame(update);
      observer.unobserve(el);
    });
  }, { threshold: 0.6 });

  counters.forEach(el => observer.observe(el));
}

/* ─── HERO PARALLAX ──────────────────────────────────────────── */

function initHeroParallax() {
  const glows = qsa('.hero-glow');
  const heroContent = qs('.hero-content');
  if (!glows.length) return;

  // Only on desktop
  if (!window.matchMedia('(min-width: 860px)').matches) return;

  let ticking = false;

  function onScroll() {
    if (!ticking) {
      requestAnimationFrame(() => {
        const scrollY = window.scrollY;
        const hero    = qs('#hero');
        if (!hero) return;

        const heroH = hero.offsetHeight;
        const pct   = clamp(scrollY / heroH, 0, 1);

        glows.forEach((glow, i) => {
          const speed  = 0.3 + i * 0.15;
          const offset = scrollY * speed;
          glow.style.transform = `translateY(${offset}px)`;
        });

        if (heroContent) {
          heroContent.style.transform = `translateY(${scrollY * 0.15}px)`;
          heroContent.style.opacity   = `${1 - pct * 1.4}`;
        }

        ticking = false;
      });
      ticking = true;
    }
  }

  window.addEventListener('scroll', onScroll, { passive: true });
}

/* ─── MAGNETIC BUTTONS ───────────────────────────────────────── */

function initMagnetic() {
  const magnets = qsa('.magnetic');
  if (!magnets.length) return;
  if (!window.matchMedia('(hover: hover)').matches) return;

  magnets.forEach(magnet => {
    magnet.addEventListener('mousemove', (e) => {
      const rect   = magnet.getBoundingClientRect();
      const cx     = rect.left + rect.width  / 2;
      const cy     = rect.top  + rect.height / 2;
      const dx     = (e.clientX - cx) * 0.35;
      const dy     = (e.clientY - cy) * 0.35;

      magnet.style.transform = `translate(${dx}px, ${dy}px)`;
    });

    magnet.addEventListener('mouseleave', () => {
      magnet.style.transform = 'translate(0, 0)';
      magnet.style.transition = 'transform 0.5s cubic-bezier(0.16, 1, 0.3, 1)';
      setTimeout(() => { magnet.style.transition = ''; }, 500);
    });
  });
}

/* ─── SERVICE ITEM HOVER LINES ───────────────────────────────── */

function initServiceHover() {
  const items = qsa('.service-item');
  items.forEach(item => {
    item.addEventListener('mouseenter', () => {
      const arrow = qs('.service-arrow', item);
      if (arrow) arrow.style.opacity = '1';
    });
    item.addEventListener('mouseleave', () => {
      const arrow = qs('.service-arrow', item);
      if (arrow) arrow.style.opacity = '';
    });
  });
}

/* ─── HERO GRID MOUSE INTERACTION ────────────────────────────── */

function initHeroGrid() {
  const grid = qs('.hero-grid');
  const hero = qs('#hero');
  if (!grid || !hero) return;
  if (!window.matchMedia('(hover: hover)').matches) return;

  hero.addEventListener('mousemove', (e) => {
    const rect = hero.getBoundingClientRect();
    const x    = ((e.clientX - rect.left) / rect.width  - 0.5) * 20;
    const y    = ((e.clientY - rect.top)  / rect.height - 0.5) * 20;

    grid.style.transform = `translate(${x}px, ${y}px)`;
  }, { passive: true });

  hero.addEventListener('mouseleave', () => {
    grid.style.transform = 'translate(0, 0)';
    grid.style.transition = 'transform 1s cubic-bezier(0.16, 1, 0.3, 1)';
    setTimeout(() => { grid.style.transition = ''; }, 1000);
  });
}

/* ─── MANIFESTO PARALLAX ─────────────────────────────────────── */

function initManifestoParallax() {
  const glow = qs('.manifesto-glow');
  const section = qs('#manifesto');
  if (!glow || !section) return;
  if (!window.matchMedia('(hover: hover)').matches) return;

  section.addEventListener('mousemove', (e) => {
    const rect = section.getBoundingClientRect();
    const x    = ((e.clientX - rect.left) / rect.width  - 0.5) * 30;
    const y    = ((e.clientY - rect.top)  / rect.height - 0.5) * 30;

    glow.style.transform = `translate(calc(-50% + ${x}px), calc(-50% + ${y}px))`;
  }, { passive: true });

  section.addEventListener('mouseleave', () => {
    glow.style.transform = 'translate(-50%, -50%)';
    glow.style.transition = 'transform 1.2s cubic-bezier(0.16, 1, 0.3, 1)';
    setTimeout(() => { glow.style.transition = ''; }, 1200);
  });
}

/* ─── CASE ITEMS — EXPAND ────────────────────────────────────── */

function initCaseItems() {
  const cases = qsa('.case-item');
  cases.forEach(caseEl => {
    const description = qs('.case-description', caseEl);
    if (!description) return;

    // Description starts visible on desktop — just ensure transitions work
    caseEl.style.cursor = 'default';
  });
}

/* ─── NAV LOGO WAVE ANIMATION ────────────────────────────────── */

function initNavLogoWave() {
  const navLogo = qs('.nav-logo');
  if (!navLogo) return;

  const paths = qsa('path', navLogo);

  navLogo.addEventListener('mouseenter', () => {
    paths.forEach((path, i) => {
      path.style.transition = `stroke-dashoffset 0.5s cubic-bezier(0.16, 1, 0.3, 1) ${i * 0.08}s, opacity 0.3s ease`;
      path.style.strokeDasharray  = '200';
      path.style.strokeDashoffset = '200';

      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          path.style.strokeDashoffset = '0';
        });
      });
    });
  });

  navLogo.addEventListener('mouseleave', () => {
    paths.forEach(path => {
      path.style.strokeDasharray  = '';
      path.style.strokeDashoffset = '';
      path.style.transition       = '';
    });
  });
}

/* ─── MARQUEE PAUSE ON HOVER ─────────────────────────────────── */

function initMarquee() {
  const marquee = qs('.contact-marquee');
  if (!marquee) return;

  const wrap = marquee.closest('.contact-marquee-wrap');
  if (!wrap) return;

  wrap.addEventListener('mouseenter', () => {
    marquee.style.animationPlayState = 'paused';
  });

  wrap.addEventListener('mouseleave', () => {
    marquee.style.animationPlayState = 'running';
  });
}

/* ─── SCROLL PROGRESS ────────────────────────────────────────── */

function initScrollProgress() {
  // Subtle: update the scrollbar accent based on scroll progress
  const scrollIndicator = qs('.scroll-line-inner');

  function onScroll() {
    const scrollTop = window.scrollY;
    const docH      = document.documentElement.scrollHeight - window.innerHeight;
    const pct       = docH > 0 ? (scrollTop / docH) * 100 : 0;
    document.documentElement.style.setProperty('--scroll-pct', `${pct}%`);
  }

  window.addEventListener('scroll', onScroll, { passive: true });
}

/* ─── FOCUS MANAGEMENT ───────────────────────────────────────── */

function initFocusVisible() {
  // Add focus-visible class only when navigating by keyboard
  let usingKeyboard = false;

  document.addEventListener('mousedown', () => { usingKeyboard = false; });
  document.addEventListener('keydown', (e) => {
    if (['Tab', 'ArrowUp', 'ArrowDown', 'Enter', ' '].includes(e.key)) {
      usingKeyboard = true;
    }
  });

  document.addEventListener('focusin', (e) => {
    if (usingKeyboard) e.target.classList.add('has-focus');
  });

  document.addEventListener('focusout', (e) => {
    e.target.classList.remove('has-focus');
  });
}

/* ─── PERFORMANCE: DISABLE PARALLAX ON MOBILE ───────────────── */

function shouldReduceMotion() {
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

/* ─── RESIZE HANDLER ─────────────────────────────────────────── */

function initResizeHandler() {
  const onResize = debounce(() => {
    // Recalculate any size-dependent values
    document.documentElement.style.setProperty(
      '--vh', `${window.innerHeight * 0.01}px`
    );
  }, 150);

  window.addEventListener('resize', onResize);
  onResize();
}

/* ─── INTERSECTION: SECTION GLOW ────────────────────────────── */

function initSectionGlow() {
  const manifesto = qs('#manifesto');
  if (!manifesto) return;

  const glow = qs('.manifesto-glow', manifesto);
  if (!glow) return;

  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        glow.style.opacity = '1';
        glow.style.transition = 'opacity 1.5s ease';
      } else {
        glow.style.opacity = '0';
      }
    });
  }, { threshold: 0.2 });

  observer.observe(manifesto);
}

/* ─── HERO TYPING EFFECT ─────────────────────────────────────── */

function initHeroWords() {
  // Subtle word-by-word stagger within hero subtext on larger screens
  const subtext = qs('.hero-subtext');
  if (!subtext || window.innerWidth < 860) return;

  const text  = subtext.innerHTML;
  const words = text.split(' ');

  // Only split if not already modified
  if (subtext.dataset.split) return;
  subtext.dataset.split = true;

  subtext.innerHTML = words.map((word, i) => {
    const delay = (2.0 + i * 0.04).toFixed(2);
    return `<span style="display:inline-block;opacity:0;transform:translateY(8px);animation:fadeUp 0.5s ${delay}s cubic-bezier(0.16,1,0.3,1) forwards">${word}&nbsp;</span>`;
  }).join('');
}

/* ─── INIT ───────────────────────────────────────────────────── */

function init() {
  if (shouldReduceMotion()) {
    // Still init non-motion features
    initNavbar();
    initActiveNav();
    initMobileMenu();
    initSmoothScroll();
    initReveal();
    initCounters();
    initFocusVisible();
    initResizeHandler();
    initMarquee();

    // Skip preloader on reduced motion
    const preloader = qs('#preloader');
    if (preloader) {
      preloader.classList.add('is-hidden');
      document.body.classList.remove('is-loading');
    }
    return;
  }

  initNoise();
  initPreloader();
  initCursor();
  initNavbar();
  initActiveNav();
  initMobileMenu();
  initSmoothScroll();
  initReveal();
  initCounters();
  initHeroParallax();
  initMagnetic();
  initServiceHover();
  initHeroGrid();
  initManifestoParallax();
  initCaseItems();
  initNavLogoWave();
  initMarquee();
  initScrollProgress();
  initFocusVisible();
  initSectionGlow();
  initResizeHandler();
  initHeroWords();
}

onReady(init);
