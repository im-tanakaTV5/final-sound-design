'use strict';

document.addEventListener('DOMContentLoaded', () => {
  try {
    initHeader();
    initMobileNav();
    initHeroVideo();
    initScrollReveal();
    initServiceTabs();
    initReservationForm();
    initCopyrightYear();
  } catch (err) {
    // ここで拾って握りつぶす。JSが動かなくてもUI自体は崩れない作り
  }
});

function initHeroVideo() {
  const video = document.getElementById('hero-video');
  const placeholder = document.getElementById('hero-video-placeholder');
  if (!video || !placeholder) return;

  // src が設定されていない場合はプレースホルダーを表示したまま終了
  if (!video.src || video.src === window.location.href) return;

  video.addEventListener('playing', () => {
    video.classList.add('is-playing');
    placeholder.classList.add('is-hidden');
  });

  video.addEventListener('error', () => {
    video.classList.remove('is-playing');
    placeholder.classList.remove('is-hidden');
  });

  video.play().catch(() => {
    // 自動再生がブロックされた場合はここに来る。動画は非表示のまま、プレースホルダー表示を維持
  });
}

function initHeader() {
  const header = document.querySelector('.site-header');
  if (!header) return;

  const onScroll = () => {
    header.classList.toggle('scrolled', window.scrollY > 40);
  };

  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();
}

function initMobileNav() {
  const toggle = document.querySelector('.nav-toggle');
  const nav = document.getElementById('global-nav');
  if (!toggle || !nav) return;

  toggle.addEventListener('click', () => {
    const isOpen = nav.classList.toggle('is-open');
    toggle.setAttribute('aria-expanded', String(isOpen));
    toggle.setAttribute('aria-label', isOpen ? 'メニューを閉じる' : 'メニューを開く');
    document.body.style.overflow = isOpen ? 'hidden' : '';
  });

  nav.querySelectorAll('.nav-link').forEach(link => {
    link.addEventListener('click', () => {
      nav.classList.remove('is-open');
      toggle.setAttribute('aria-expanded', 'false');
      toggle.setAttribute('aria-label', 'メニューを開く');
      document.body.style.overflow = '';
    });
  });

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && nav.classList.contains('is-open')) {
      nav.classList.remove('is-open');
      toggle.setAttribute('aria-expanded', 'false');
      toggle.setAttribute('aria-label', 'メニューを開く');
      document.body.style.overflow = '';
      toggle.focus();
    }
  });
}

function initScrollReveal() {
  // ブロックごと一括で出すと文章がまとめてパッと現れて味気ないので、
  // 段落単位で拾って順に立ち上がるようにしている
  const elements = document.querySelectorAll([
    '.about-message > p',
    '.about-features',
    '.feature-card',
    '.service-block-desc',
    '.service-block-body > p',
    '.service-item',
    '.license-box',
    '.event-box',
    '.flow-item',
    '.info-row'
  ].join(', '));

  if (!elements.length) return;

  elements.forEach(el => el.classList.add('reveal'));

  // 同じ親の中で連番の遅延を振っておく。並んだ要素が同時に入ってきても順に出る
  const order = new Map();
  elements.forEach(el => {
    const parent = el.parentElement;
    const i = order.get(parent) || 0;
    order.set(parent, i + 1);
    const delay = Math.min(i, 5) * 70;
    if (delay) el.style.transitionDelay = delay + 'ms';
  });

  if (!('IntersectionObserver' in window)) {
    elements.forEach(el => el.classList.add('is-visible'));
    return;
  }

  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('is-visible');
        observer.unobserve(entry.target);
      }
    });
  }, { threshold: 0.12 });

  elements.forEach(el => observer.observe(el));
}

function initServiceTabs() {
  const tablist = document.querySelector('.service-tabs');
  if (!tablist) return;

  const tabs = Array.from(tablist.querySelectorAll('.service-tab'));
  if (!tabs.length) return;

  const panels = tabs.map(tab => document.getElementById(tab.getAttribute('aria-controls')));

  function activate(index, moveFocus) {
    tabs.forEach((tab, i) => {
      const selected = i === index;
      tab.setAttribute('aria-selected', String(selected));
      tab.tabIndex = selected ? 0 : -1;
      const panel = panels[i];
      if (panel) panel.hidden = !selected;
    });

    // 隠れていたパネルは scroll-reveal が発火しないまま。開いた瞬間に中身を出す
    const shown = panels[index];
    if (shown) {
      shown.querySelectorAll('.reveal').forEach(el => el.classList.add('is-visible'));
    }

    if (moveFocus) tabs[index].focus();
  }

  tabs.forEach((tab, i) => {
    tab.addEventListener('click', () => activate(i, false));

    tab.addEventListener('keydown', (e) => {
      let next = null;
      if (e.key === 'ArrowRight' || e.key === 'ArrowDown') next = (i + 1) % tabs.length;
      else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') next = (i - 1 + tabs.length) % tabs.length;
      else if (e.key === 'Home') next = 0;
      else if (e.key === 'End') next = tabs.length - 1;

      if (next !== null) {
        e.preventDefault();
        activate(next, true);
      }
    });
  });
}

function initReservationForm() {
  const form = document.getElementById('reserve-form');
  if (!form) return;

  const statusEl = document.getElementById('form-status');
  const submitBtn = document.getElementById('submit-btn');
  const btnText = submitBtn ? submitBtn.querySelector('.btn-text') : null;
  const btnLoading = submitBtn ? submitBtn.querySelector('.btn-loading') : null;

  const FIELDS = [
    { id: 'name',         msg: 'お名前を入力してください。' },
    { id: 'email',        msg: 'メールアドレスを入力してください。', extra: validateEmail },
    { id: 'instrument',   msg: '楽器の種類を選択してください。' },
    { id: 'service-type', msg: 'サービスを選択してください。' },
    { id: 'message',      msg: '楽器の状態・ご要望を入力してください。' },
  ];

  const privacyInput = form.querySelector('#privacy');
  const privacyError = form.querySelector('#privacy-error');

  function validateEmail(val) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(val) ? '' : '正しいメールアドレスを入力してください。';
  }

  function setFieldError(id, message) {
    const input = form.querySelector(`#${id}`);
    const error = form.querySelector(`#${id}-error`);
    if (!input || !error) return;
    if (message) {
      input.classList.add('is-invalid');
      error.textContent = message;
    } else {
      input.classList.remove('is-invalid');
      error.textContent = '';
    }
  }

  function validateField(field) {
    const input = form.querySelector(`#${field.id}`);
    if (!input) return true;
    const val = input.value.trim();
    if (!val) {
      setFieldError(field.id, field.msg);
      return false;
    }
    if (field.extra) {
      const extraMsg = field.extra(val);
      if (extraMsg) {
        setFieldError(field.id, extraMsg);
        return false;
      }
    }
    setFieldError(field.id, '');
    return true;
  }

  FIELDS.forEach(field => {
    const input = form.querySelector(`#${field.id}`);
    if (!input) return;
    input.addEventListener('blur', () => validateField(field));
    input.addEventListener('input', () => {
      if (input.classList.contains('is-invalid')) validateField(field);
    });
  });

  form.addEventListener('submit', (e) => {
    e.preventDefault();

    let valid = true;
    FIELDS.forEach(field => {
      if (!validateField(field)) valid = false;
    });

    if (privacyInput && !privacyInput.checked) {
      if (privacyError) privacyError.textContent = 'プライバシーポリシーへの同意が必要です。';
      valid = false;
    } else if (privacyError) {
      privacyError.textContent = '';
    }

    if (!valid) {
      const firstInvalid = form.querySelector('.is-invalid, input:invalid, select:invalid, textarea:invalid');
      if (firstInvalid) firstInvalid.focus();
      return;
    }

    if (submitBtn) submitBtn.disabled = true;
    if (btnText) btnText.hidden = true;
    if (btnLoading) btnLoading.hidden = false;
    if (statusEl) {
      statusEl.className = 'form-status';
      statusEl.textContent = '';
    }

    fetch('https://formspree.io/f/xykaynvb', {
      method: 'POST',
      body: new FormData(form),
      headers: { 'Accept': 'application/json' }
    })
      .then(res => {
        if (res.ok) {
          if (statusEl) {
            statusEl.className = 'form-status success';
            statusEl.textContent = 'ご予約を承りました。2営業日以内にご連絡いたします。';
            statusEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
          }
          form.reset();
        } else {
          return res.json().then(data => { throw new Error(data.error || 'error'); });
        }
      })
      .catch(() => {
        if (statusEl) {
          statusEl.className = 'form-status error';
          statusEl.textContent = '送信に失敗しました。時間をおいて再度お試しください。';
          statusEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
      })
      .finally(() => {
        if (submitBtn) submitBtn.disabled = false;
        if (btnText) btnText.hidden = false;
        if (btnLoading) btnLoading.hidden = true;
      });
  });
}

function initCopyrightYear() {
  const el = document.getElementById('copyright-year');
  if (el) el.textContent = String(new Date().getFullYear());
}
