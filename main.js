(() => {
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];

  // Заголовок обложки: разбиваем на слова, чтобы они выезжали по очереди
  $$('[data-split]').forEach(el => {
    // &nbsp; склеивает слова в одну группу, чтобы предлог не отрывался
    const words = el.innerHTML.trim().split(/\s+/);
    el.innerHTML = words.map((w, i) => `<span class="w"><span style="--i:${i}">${w}</span></span>`).join(' ');
  });
  $$('.tag').forEach((t, i) => t.style.setProperty('--i', i));
  setTimeout(() => document.body.classList.add('is-loaded'), 60);

  // Шапка: стекло после скролла, прячется при прокрутке вниз
  const header = $('.header');
  let lastY = scrollY;
  const onScroll = () => {
    const y = scrollY;
    header.classList.toggle('is-scrolled', y > 24);
    header.classList.toggle('is-hidden', y > 600 && y > lastY + 4 && !header.classList.contains('menu-open'));
    if (y < lastY - 4) header.classList.remove('is-hidden');
    lastY = y;
  };
  addEventListener('scroll', onScroll, { passive: true });
  onScroll();

  // Мобильное меню
  const burger = $('.burger');
  const setMenu = open => {
    header.classList.toggle('menu-open', open);
    burger.setAttribute('aria-expanded', String(open));
  };
  burger.addEventListener('click', () => setMenu(!header.classList.contains('menu-open')));
  $$('.nav a').forEach(a => a.addEventListener('click', () => setMenu(false)));
  addEventListener('keydown', e => { if (e.key === 'Escape') setMenu(false); });

  // Появление блоков при скролле + счётчики
  const fmt = n => n.toLocaleString('ru-RU').replace(/ /g, ' ');
  const countUp = el => {
    const target = +el.dataset.count, suffix = el.dataset.suffix || '', plain = 'plain' in el.dataset;
    if (reduce) return;
    const from = plain ? target - 25 : 0, dur = 1400, t0 = performance.now();
    const tick = t => {
      const p = Math.min(1, (t - t0) / dur), e = 1 - Math.pow(1 - p, 4);
      const v = Math.round(from + (target - from) * e);
      el.textContent = (plain ? v : fmt(v)) + suffix;
      if (p < 1) requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  };
  const io = new IntersectionObserver(entries => {
    entries.forEach(e => {
      if (!e.isIntersecting) return;
      e.target.classList.add('is-in');
      $$('[data-count]', e.target).forEach(countUp);
      io.unobserve(e.target);
    });
  }, { threshold: .15, rootMargin: '0px 0px -60px 0px' });
  $$('.reveal').forEach(el => io.observe(el));

  // Запасной путь: если наблюдатель не сработал (старый Safari, фоновая вкладка),
  // показываем всё, что уже попало в экран
  const fallback = () => {
    $$('.reveal:not(.is-in)').forEach(el => {
      if (el.getBoundingClientRect().top < innerHeight) {
        el.classList.add('is-in');
        $$('[data-count]', el).forEach(countUp);
        io.unobserve(el);
      }
    });
  };
  addEventListener('scroll', fallback, { passive: true });
  addEventListener('load', () => setTimeout(fallback, 400));

  // Параллакс иллюстрации в блоке пожертвований
  const par = $$('[data-parallax]');
  if (!reduce && par.length) {
    const upd = () => par.forEach(el => {
      const r = el.getBoundingClientRect();
      const k = +el.dataset.parallax;
      el.style.translate = `0 ${(r.top + r.height / 2 - innerHeight / 2) * -k}px`;
    });
    addEventListener('scroll', upd, { passive: true });
    upd();
  }

  // Виджет пожертвования
  const seg = $('.segmented'), pill = $('.segmented__pill', seg);
  const sumEl = $('[data-sum]'), periodEl = $('[data-period-label]');
  const amounts = $('.amounts'), ring = $('.amounts__ring', amounts), custom = $('[data-custom]');

  const movePill = btn => {
    pill.style.width = btn.offsetWidth + 'px';
    pill.style.transform = `translateX(${btn.offsetLeft - 4}px)`;
  };
  const moveRing = btn => {
    ring.style.opacity = btn ? 1 : 0;
    if (!btn) return;
    ring.style.width = btn.offsetWidth + 'px';
    ring.style.transform = `translate(${btn.offsetLeft}px, ${btn.offsetTop}px)`;
  };
  const setSum = v => {
    sumEl.textContent = fmt(v);
    sumEl.classList.remove('bump'); void sumEl.offsetWidth; sumEl.classList.add('bump');
  };

  $$('button', seg).forEach(b => b.addEventListener('click', () => {
    $$('button', seg).forEach(x => x.classList.toggle('is-active', x === b));
    movePill(b);
    periodEl.textContent = b.dataset.period === 'month' ? ' в месяц' : '';
  }));
  $$('button', amounts).forEach(b => b.addEventListener('click', () => {
    $$('button', amounts).forEach(x => x.classList.toggle('is-active', x === b));
    custom.value = '';
    moveRing(b);
    setSum(+b.dataset.amount);
  }));
  custom.addEventListener('input', () => {
    custom.value = custom.value.replace(/\D/g, '').slice(0, 7);
    const v = +custom.value;
    $$('button', amounts).forEach(x => x.classList.remove('is-active'));
    moveRing(null);
    if (v) setSum(v);
  });
  $$('.method').forEach(m => m.addEventListener('click', () => $$('.method').forEach(x => x.classList.toggle('is-active', x === m))));

  const layoutWidget = () => {
    movePill($('button.is-active', seg));
    moveRing($('button.is-active', amounts));
  };
  addEventListener('resize', layoutWidget);
  document.fonts ? document.fonts.ready.then(layoutWidget) : layoutWidget();
  layoutWidget();

  // FAQ: плавное раскрытие поверх <details>
  $$('.qa').forEach(d => {
    if (d.open) d.classList.add('is-open');
    $('summary', d).addEventListener('click', e => {
      e.preventDefault();
      if (d.classList.contains('is-open')) {
        d.classList.remove('is-open');
        setTimeout(() => { if (!d.classList.contains('is-open')) d.open = false; }, reduce ? 0 : 450);
      } else {
        d.open = true;
        void d.offsetHeight; // фиксируем закрытое состояние, чтобы сработал переход
        d.classList.add('is-open');
      }
    });
  });
})();
