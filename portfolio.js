/* ---------------- Theme toggle (dark / light) ---------------- */
              (function () {
                     const STORAGE_KEY = 'akin-theme';
                     const root = document.documentElement;
                     const toggle = document.getElementById('themeToggle');

                     function apply(theme) {
                            if (theme === 'light') {
                                   root.setAttribute('data-theme', 'light');
                            } else {
                                   root.removeAttribute('data-theme');
                            }
                            if (toggle) {
                                   toggle.setAttribute('aria-pressed', theme === 'light' ? 'true' : 'false');
                                   toggle.setAttribute('aria-label', theme === 'light' ? 'Switch to dark theme' : 'Switch to light theme');
                            }
                            window.dispatchEvent(new CustomEvent('theme-change', { detail: { theme } }));
                     }

                     let saved = null;
                     try { saved = localStorage.getItem(STORAGE_KEY); } catch (e) {}
                     const initial = saved === 'light' ? 'light' : 'dark';
                     apply(initial);

                     if (toggle) {
                            toggle.addEventListener('click', () => {
                                   const current = root.getAttribute('data-theme') === 'light' ? 'light' : 'dark';
                                   const next = current === 'light' ? 'dark' : 'light';
                                   apply(next);
                                   try { localStorage.setItem(STORAGE_KEY, next); } catch (e) {}
                            });
                     }
              })();

              /* ---------------- Custom cursor + spotlight ---------------- */
              (function () {
                     if (window.matchMedia('(hover: none)').matches) return;

                     const dot = document.getElementById('cursorDot');
                     const ring = document.getElementById('cursorRing');
                     const spotlight = document.getElementById('cursorSpotlight');
                     let mouseX = 0, mouseY = 0;
                     let ringX = 0, ringY = 0;
                     let spotlightSet = false;

                     window.addEventListener('mousemove', (e) => {
                            mouseX = e.clientX;
                            mouseY = e.clientY;
                            dot.style.transform = `translate(${mouseX}px, ${mouseY}px) translate(-50%, -50%)`;
                            if (spotlight) {
                                   spotlight.style.transform = `translate(${mouseX - 310}px, ${mouseY - 310}px)`;
                                   if (!spotlightSet) {
                                          spotlight.classList.add('is-active');
                                          spotlightSet = true;
                                   }
                            }
                     }, { passive: true });

                     window.addEventListener('mouseout', (e) => {
                            if (!e.relatedTarget && spotlight) {
                                   spotlight.classList.remove('is-active');
                                   spotlightSet = false;
                            }
                     });

                     function animateRing() {
                            ringX += (mouseX - ringX) * 0.18;
                            ringY += (mouseY - ringY) * 0.18;
                            ring.style.transform = `translate(${ringX}px, ${ringY}px) translate(-50%, -50%)`;
                            requestAnimationFrame(animateRing);
                     }
                     animateRing();

                     document.querySelectorAll('[data-hover], a, button').forEach((el) => {
                            el.addEventListener('mouseenter', () => ring.classList.add('is-active'));
                            el.addEventListener('mouseleave', () => ring.classList.remove('is-active'));
                     });

                     document.addEventListener('mousedown', () => ring.style.transform += ' scale(0.85)');
                     document.addEventListener('mouseup', () => animateRing());
              })();

              /* ---------------- Pause off-screen preview animations (perf) ---------------- */
              (function () {
                     const frames = document.querySelectorAll('.preview-frame');
                     if (!frames.length) return;
                     const observer = new IntersectionObserver((entries) => {
                            entries.forEach((entry) => {
                                   entry.target.classList.toggle('is-in-view', entry.isIntersecting);
                            });
                     }, { threshold: 0.1 });
                     frames.forEach((f) => observer.observe(f));
              })();

              /* ---------------- Cinematic word-split reveal (vanilla, no dependency) ---------------- */
              (function () {
                     const el = document.getElementById('heroHeadline');
                     if (!el) return;
                     const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

                     function wrapWordsInNode(node) {
                            const frag = document.createDocumentFragment();
                            node.childNodes.forEach((child) => {
                                   if (child.nodeType === Node.TEXT_NODE) {
                                          const words = child.textContent.split(/(\s+)/);
                                          words.forEach((w) => {
                                                 if (w.trim() === '') {
                                                        frag.appendChild(document.createTextNode(w));
                                                 } else {
                                                        const outer = document.createElement('span');
                                                        outer.className = 'split-word';
                                                        const inner = document.createElement('span');
                                                        inner.textContent = w;
                                                        outer.appendChild(inner);
                                                        frag.appendChild(outer);
                                                 }
                                          });
                                   } else if (child.nodeType === Node.ELEMENT_NODE) {
                                          const outer = document.createElement('span');
                                          outer.className = 'split-word';
                                          const inner = document.createElement('span');
                                          inner.className = child.className;
                                          inner.textContent = child.textContent;
                                          outer.appendChild(inner);
                                          frag.appendChild(outer);
                                   }
                            });
                            return frag;
                     }

                     const fragment = wrapWordsInNode(el);
                     el.textContent = '';
                     el.appendChild(fragment);

                     if (!reduceMotion) {
                            const spans = el.querySelectorAll('.split-word > span');
                            spans.forEach((s, i) => {
                                   s.style.animationDelay = `${0.15 + i * 0.075}s`;
                            });
                     }
              })();

              /* ---------------- Hero parallax (cursor-driven, cheap) ---------------- */
              (function () {
                     if (window.matchMedia('(hover: none)').matches) return;
                     if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

                     const hero = document.querySelector('.hero');
                     const content = document.getElementById('heroParallax');
                     if (!hero || !content) return;

                     let pending = false;
                     let lastX = 0.5, lastY = 0.5;

                     hero.addEventListener('mousemove', (e) => {
                            const rect = hero.getBoundingClientRect();
                            lastX = (e.clientX - rect.left) / rect.width;
                            lastY = (e.clientY - rect.top) / rect.height;
                            if (pending) return;
                            pending = true;
                            requestAnimationFrame(() => {
                                   const ox = (lastX - 0.5) * 14;
                                   const oy = (lastY - 0.5) * 10;
                                   content.style.transform = `translate(${ox}px, ${oy}px)`;
                                   hero.style.setProperty('--glow-x', `${ox * -1.6}px`);
                                   hero.style.setProperty('--glow-y', `${oy * -1.6}px`);
                                   pending = false;
                            });
                     }, { passive: true });

                     hero.addEventListener('mouseleave', () => {
                            content.style.transform = '';
                     });
              })();

              /* ---------------- Scroll reveal ---------------- */
              (function () {
                     const items = document.querySelectorAll('.reveal');
                     const observer = new IntersectionObserver((entries) => {
                            entries.forEach((entry) => {
                                   if (entry.isIntersecting) {
                                          entry.target.classList.add('is-visible');
                                          observer.unobserve(entry.target);
                                   }
                            });
                     }, { threshold: 0.12, rootMargin: '0px 0px -60px 0px' });

                     items.forEach((item) => observer.observe(item));
              })();

              /* ---------------- Gesture preview: cursor glow ---------------- */
              (function () {
                     const frame = document.getElementById('gesturePreview');
                     const glow = document.getElementById('gestureCursorGlow');
                     if (!frame || !glow) return;
                     frame.addEventListener('mousemove', (e) => {
                            const rect = frame.getBoundingClientRect();
                            glow.style.left = `${e.clientX - rect.left}px`;
                            glow.style.top = `${e.clientY - rect.top}px`;
                     });
              })();

              /* ---------------- Jarvis waveform bars ---------------- */
              (function () {
                     const wf = document.getElementById('jarvisWaveform');
                     if (!wf) return;
                     const BAR_COUNT = 22;
                     for (let i = 0; i < BAR_COUNT; i++) {
                            const bar = document.createElement('span');
                            bar.style.animationDelay = `${(i * 0.06).toFixed(2)}s`;
                            bar.style.opacity = (0.5 + Math.random() * 0.5).toFixed(2);
                            wf.appendChild(bar);
                     }
              })();

              /* ---------------- Jarvis live clock ---------------- */
              (function () {
                     const clockEl = document.getElementById('jarvisClock');
                     if (!clockEl) return;
                     function update() {
                            const now = new Date();
                            const h = String(now.getHours()).padStart(2, '0');
                            const m = String(now.getMinutes()).padStart(2, '0');
                            clockEl.textContent = `${h}:${m}`;
                     }
                     update();
                     setInterval(update, 30000);
              })();

              /* ---------------- Jarvis auto-typing terminal ---------------- */
              (function () {
                     const term = document.getElementById('jarvisTerminal');
                     if (!term) return;
                     const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

                     const lines = [
                            { text: '> Opening GitHub...', cls: '' },
                            { text: '✓ Complete', cls: 'ok' },
                            { text: '> Creating React component...', cls: '' },
                            { text: '✓ Generated', cls: 'ok' },
                            { text: '> Launching VS Code...', cls: '' },
                            { text: '✓ Ready', cls: 'ok' },
                            { text: '> Searching documentation...', cls: '' },
                            { text: '✓ Complete', cls: 'ok' }
                     ];

                     if (reduceMotion) {
                            term.innerHTML = lines.map(l => `<div class="${l.cls}">${l.text}</div>`).join('');
                            return;
                     }

                     let lineIndex = 0;
                     let charIndex = 0;
                     let visibleLines = [];

                     function renderFrame(partial) {
                            const done = visibleLines.map(l => `<div class="${l.cls}">${l.text}</div>`).join('');
                            term.innerHTML = done + (partial !== undefined
                                   ? `<div class="${lines[lineIndex].cls}">${partial}<span class="type-cursor"></span></div>`
                                   : '');
                            term.scrollTop = term.scrollHeight;
                     }

                     function typeStep() {
                            if (lineIndex >= lines.length) {
                                   setTimeout(() => {
                                          visibleLines = [];
                                          lineIndex = 0;
                                          charIndex = 0;
                                          typeStep();
                                   }, 2200);
                                   return;
                            }
                            const current = lines[lineIndex];
                            charIndex++;
                            renderFrame(current.text.slice(0, charIndex));

                            if (charIndex >= current.text.length) {
                                   visibleLines.push(current);
                                   if (visibleLines.length > 5) visibleLines.shift();
                                   lineIndex++;
                                   charIndex = 0;
                                   setTimeout(typeStep, current.cls === 'ok' ? 420 : 260);
                            } else {
                                   setTimeout(typeStep, 22 + Math.random() * 30);
                            }
                     }
                     typeStep();
              })();

              /* ---------------- Lightweight drifting particles for preview frames ---------------- */
              (function () {
                     const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
                     if (reduceMotion) return;

                     function initParticleLayer(canvasId, color, count) {
                            const canvas = document.getElementById(canvasId);
                            if (!canvas) return;
                            const ctx = canvas.getContext('2d');
                            let w, h, particles = [];
                            let visible = false;
                            let rafId = null;

                            function resize() {
                                   const rect = canvas.parentElement.getBoundingClientRect();
                                   w = canvas.width = rect.width;
                                   h = canvas.height = rect.height;
                            }
                            resize();
                            window.addEventListener('resize', resize);

                            for (let i = 0; i < count; i++) {
                                   particles.push({
                                          x: Math.random() * w,
                                          y: Math.random() * h,
                                          r: Math.random() * 1.2 + 0.4,
                                          vx: (Math.random() - 0.5) * 0.12,
                                          vy: (Math.random() - 0.5) * 0.12,
                                          alpha: Math.random() * 0.5 + 0.2
                                   });
                            }

                            function step() {
                                   if (!visible || document.visibilityState !== 'visible') {
                                          rafId = null;
                                          return;
                                   }
                                   ctx.clearRect(0, 0, w, h);
                                   particles.forEach((p) => {
                                          p.x += p.vx;
                                          p.y += p.vy;
                                          if (p.x < 0) p.x = w;
                                          if (p.x > w) p.x = 0;
                                          if (p.y < 0) p.y = h;
                                          if (p.y > h) p.y = 0;
                                          ctx.beginPath();
                                          ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
                                          ctx.fillStyle = `rgba(${color}, ${p.alpha})`;
                                          ctx.fill();
                                   });
                                   rafId = requestAnimationFrame(step);
                            }

                            const observer = new IntersectionObserver((entries) => {
                                   entries.forEach((entry) => {
                                          visible = entry.isIntersecting;
                                          if (visible && rafId === null) rafId = requestAnimationFrame(step);
                                   });
                            }, { threshold: 0.05 });
                            observer.observe(canvas);

                            document.addEventListener('visibilitychange', () => {
                                   if (document.visibilityState === 'visible' && visible && rafId === null) {
                                          rafId = requestAnimationFrame(step);
                                   }
                            });
                     }

                     initParticleLayer('gestureParticles', '150, 195, 255', 18);
                     initParticleLayer('jarvisParticles', '182, 216, 0', 16);
              })();

              /* ---------------- Project card mouse-tracking glow + subtle 3D tilt ---------------- */
              (function () {
                     if (window.matchMedia('(hover: none)').matches) return;
                     const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
                     document.querySelectorAll('.project-card').forEach((card) => {
                            card.style.transition = card.style.transition
                                   ? card.style.transition + ', transform 0.3s ease-out'
                                   : 'transform 0.3s ease-out';
                            if (!reduceMotion) card.style.willChange = 'transform';

                            let pending = false;
                            let lastX = 0, lastY = 0;

                            card.addEventListener('mousemove', (e) => {
                                   const rect = card.getBoundingClientRect();
                                   lastX = e.clientX - rect.left;
                                   lastY = e.clientY - rect.top;
                                   if (pending) return;
                                   pending = true;
                                   requestAnimationFrame(() => {
                                          const r = card.getBoundingClientRect();
                                          card.style.setProperty('--mx', `${lastX}px`);
                                          card.style.setProperty('--my', `${lastY}px`);
                                          if (!reduceMotion) {
                                                 const rx = ((lastY / r.height) - 0.5) * -7;
                                                 const ry = ((lastX / r.width) - 0.5) * 7;
                                                 card.style.transform = `perspective(1200px) rotateX(${rx}deg) rotateY(${ry}deg) translateY(-3px)`;
                                          }
                                          pending = false;
                                   });
                            }, { passive: true });
                            card.addEventListener('mouseleave', () => {
                                   card.style.transform = '';
                            });
                     });
              })();

              /* ---------------- Active nav link on scroll ---------------- */
              (function () {
                     const sections = document.querySelectorAll('main section[id], .cta-section[id]');
                     const navLinks = document.querySelectorAll('.nav-links a');
                     if (!sections.length || !navLinks.length) return;

                     const navObserver = new IntersectionObserver((entries) => {
                            entries.forEach((entry) => {
                                   if (entry.isIntersecting) {
                                          const id = entry.target.getAttribute('id');
                                          navLinks.forEach((link) => {
                                                 link.classList.toggle('active', link.getAttribute('href') === `#${id}`);
                                          });
                                   }
                            });
                     }, { rootMargin: '-45% 0px -45% 0px', threshold: 0 });

                     sections.forEach((s) => navObserver.observe(s));
              })();

              /* ---------------- Lightweight starfield (perf-capped, single layer) ---------------- */
              (function () {
                     const canvas = document.getElementById('bg-canvas');
                     const ctx = canvas.getContext('2d', { alpha: true });
                     const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
                     const DPR = Math.min(window.devicePixelRatio || 1, 1.5);

                     let w, h, stars = [], links = [];
                     let mouseX = null, mouseY = null;
                     let running = true;
                     let starRGB = '182, 216, 0';

                     function readAccentRGB() {
                            const hex = getComputedStyle(document.documentElement).getPropertyValue('--accent').trim();
                            const m = hex.match(/^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i);
                            if (!m) return;
                            starRGB = `${parseInt(m[1], 16)}, ${parseInt(m[2], 16)}, ${parseInt(m[3], 16)}`;
                     }
                     readAccentRGB();
                     window.addEventListener('theme-change', readAccentRGB);

                     function resize() {
                            w = window.innerWidth;
                            h = window.innerHeight;
                            canvas.width = w * DPR;
                            canvas.height = h * DPR;
                            canvas.style.width = w + 'px';
                            canvas.style.height = h + 'px';
                            ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
                            buildStars();
                     }

                     function buildStars() {
                            const count = Math.min(46, Math.floor((w * h) / 28000));
                            stars = [];
                            for (let i = 0; i < count; i++) {
                                   stars.push({
                                          x: Math.random() * w,
                                          y: Math.random() * h,
                                          r: Math.random() * 1.3 + 0.4,
                                          vx: (Math.random() - 0.5) * 0.12,
                                          vy: (Math.random() - 0.5) * 0.12,
                                          alpha: Math.random() * 0.55 + 0.3
                                   });
                            }
                     }

                     let resizeTimer;
                     window.addEventListener('resize', () => {
                            clearTimeout(resizeTimer);
                            resizeTimer = setTimeout(resize, 150);
                     });
                     resize();

                     if (!window.matchMedia('(hover: none)').matches) {
                            window.addEventListener('mousemove', (e) => {
                                   mouseX = e.clientX;
                                   mouseY = e.clientY;
                            }, { passive: true });
                            window.addEventListener('mouseout', () => {
                                   mouseX = null;
                                   mouseY = null;
                            });
                     }

                     document.addEventListener('visibilitychange', () => {
                            running = document.visibilityState === 'visible';
                            if (running && !reduceMotion) requestAnimationFrame(step);
                     });

                     const LINK_DIST = 100;
                     const LINK_DIST_SQ = LINK_DIST * LINK_DIST;

                     function step() {
                            if (!running) return;
                            ctx.clearRect(0, 0, w, h);

                            for (let i = 0; i < stars.length; i++) {
                                   const p = stars[i];
                                   p.x += p.vx;
                                   p.y += p.vy;
                                   if (p.x < 0) p.x = w; else if (p.x > w) p.x = 0;
                                   if (p.y < 0) p.y = h; else if (p.y > h) p.y = 0;

                                   if (mouseX !== null) {
                                          const dx = p.x - mouseX;
                                          const dy = p.y - mouseY;
                                          const dSq = dx * dx + dy * dy;
                                          if (dSq < 19600 && dSq > 0) {
                                                 const dist = Math.sqrt(dSq);
                                                 const force = (140 - dist) / 140;
                                                 p.x += (dx / dist) * force * 2.4;
                                                 p.y += (dy / dist) * force * 2.4;
                                          }
                                   }

                                   ctx.beginPath();
                                   ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
                                   ctx.fillStyle = `rgba(${starRGB}, ${p.alpha})`;
                                   ctx.fill();
                            }

                            for (let i = 0; i < stars.length; i++) {
                                   for (let j = i + 1; j < stars.length; j++) {
                                          const dx = stars[i].x - stars[j].x;
                                          const dy = stars[i].y - stars[j].y;
                                          const dSq = dx * dx + dy * dy;
                                          if (dSq < LINK_DIST_SQ) {
                                                 const t = 1 - Math.sqrt(dSq) / LINK_DIST;
                                                 ctx.beginPath();
                                                 ctx.moveTo(stars[i].x, stars[i].y);
                                                 ctx.lineTo(stars[j].x, stars[j].y);
                                                 ctx.strokeStyle = `rgba(${starRGB}, ${0.05 * t})`;
                                                 ctx.lineWidth = 1;
                                                 ctx.stroke();
                                          }
                                   }
                            }

                            if (!reduceMotion) requestAnimationFrame(step);
                     }
                     if (!reduceMotion) requestAnimationFrame(step);
                     else buildStars();
              })();

              /* ---------------- Magnetic hover + ripple click on buttons ---------------- */
              (function () {
                     if (window.matchMedia('(hover: none)').matches) return;
                     const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
                     if (reduceMotion) return;

                     document.querySelectorAll('.btn').forEach((btn) => {
                            btn.style.position = btn.style.position || 'relative';
                            btn.style.overflow = 'hidden';

                            btn.addEventListener('mousemove', (e) => {
                                   const rect = btn.getBoundingClientRect();
                                   const relX = e.clientX - rect.left - rect.width / 2;
                                   const relY = e.clientY - rect.top - rect.height / 2;
                                   btn.style.transform = `translate(${relX * 0.18}px, ${relY * 0.28 - 2}px)`;
                            });
                            btn.addEventListener('mouseleave', () => {
                                   btn.style.transform = '';
                            });
                            btn.addEventListener('click', (e) => {
                                   const rect = btn.getBoundingClientRect();
                                   const ripple = document.createElement('span');
                                   const size = Math.max(rect.width, rect.height) * 2;
                                   ripple.style.cssText = `
                                          position:absolute;
                                          left:${e.clientX - rect.left - size / 2}px;
                                          top:${e.clientY - rect.top - size / 2}px;
                                          width:${size}px;
                                          height:${size}px;
                                          border-radius:50%;
                                          background:radial-gradient(circle, rgba(255,255,255,0.35), transparent 70%);
                                          pointer-events:none;
                                          transform:scale(0);
                                          animation:btn-ripple 0.65s ease-out forwards;
                                   `;
                                   btn.appendChild(ripple);
                                   setTimeout(() => ripple.remove(), 700);
                            });
                     });
              })();

              /* ---------------- Glass navbar on scroll + progress bar ---------------- */
              (function () {
                     const nav = document.querySelector('nav');
                     const progress = document.getElementById('scrollProgress');
                     if (!nav) return;
                     let ticking = false;
                     function update() {
                            nav.classList.toggle('nav-scrolled', window.scrollY > 40);
                            if (progress) {
                                   const doc = document.documentElement;
                                   const max = doc.scrollHeight - doc.clientHeight;
                                   const pct = max > 0 ? (window.scrollY / max) * 100 : 0;
                                   progress.style.width = `${pct}%`;
                            }
                            ticking = false;
                     }
                     window.addEventListener('scroll', () => {
                            if (!ticking) {
                                   requestAnimationFrame(update);
                                   ticking = true;
                            }
                     }, { passive: true });
                     update();
              })();

              /* ---------------- Mobile nav drawer ---------------- */
              (function () {
                     const burger = document.getElementById('navBurger');
                     const drawer = document.getElementById('navDrawer');
                     const backdrop = document.getElementById('navDrawerBackdrop');
                     if (!burger || !drawer || !backdrop) return;

                     function openDrawer() {
                            drawer.classList.add('is-open');
                            backdrop.classList.add('is-open');
                            drawer.setAttribute('aria-hidden', 'false');
                            burger.setAttribute('aria-expanded', 'true');
                            document.body.style.overflow = 'hidden';
                     }
                     function closeDrawer() {
                            drawer.classList.remove('is-open');
                            backdrop.classList.remove('is-open');
                            drawer.setAttribute('aria-hidden', 'true');
                            burger.setAttribute('aria-expanded', 'false');
                            document.body.style.overflow = '';
                     }

                     burger.addEventListener('click', () => {
                            const isOpen = drawer.classList.contains('is-open');
                            isOpen ? closeDrawer() : openDrawer();
                     });
                     backdrop.addEventListener('click', closeDrawer);
                     drawer.querySelectorAll('[data-drawer-link]').forEach((link) => {
                            link.addEventListener('click', closeDrawer);
                     });
                     document.addEventListener('keydown', (e) => {
                            if (e.key === 'Escape') closeDrawer();
                     });
              })();
