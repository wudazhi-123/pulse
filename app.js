(() => {
  'use strict';

  const KEYS = {
    posts: 'pulse.posts.v1',
    profile: 'pulse.profile.v1',
  };

  const MAX_LENGTH = 280;
  const DEFAULT_PROFILE = { name: 'Pulse 用户', handle: 'me' };

  const el = {
    feed: document.getElementById('feed'),
    empty: document.getElementById('empty'),
    postCount: document.getElementById('postCount'),
    input: document.getElementById('composerInput'),
    publishBtn: document.getElementById('publishBtn'),
    counter: document.getElementById('counter'),
    counterRing: document.getElementById('counterRing'),
    counterText: document.getElementById('counterText'),
    composeAvatar: document.getElementById('composeAvatar'),
    headerAvatar: document.getElementById('headerAvatar'),
    headerName: document.getElementById('headerName'),
    headerHandle: document.getElementById('headerHandle'),
    profileBtn: document.getElementById('profileBtn'),
    profileDialog: document.getElementById('profileDialog'),
    profileForm: document.getElementById('profileForm'),
    profileName: document.getElementById('profileName'),
    profileHandle: document.getElementById('profileHandle'),
    profileCancel: document.getElementById('profileCancel'),
    toast: document.getElementById('toast'),
  };

  /* ---------------- storage ---------------- */

  function readJSON(key, fallback) {
    try {
      const raw = localStorage.getItem(key);
      if (!raw) return fallback;
      const parsed = JSON.parse(raw);
      return parsed == null ? fallback : parsed;
    } catch (err) {
      console.warn(`[pulse] 无法读取 ${key}`, err);
      return fallback;
    }
  }

  function writeJSON(key, value) {
    try {
      localStorage.setItem(key, JSON.stringify(value));
      return true;
    } catch (err) {
      console.warn(`[pulse] 无法写入 ${key}`, err);
      toast('本地存储写入失败，数据可能无法保存');
      return false;
    }
  }

  const state = {
    posts: normalizePosts(readJSON(KEYS.posts, [])),
    profile: normalizeProfile(readJSON(KEYS.profile, DEFAULT_PROFILE)),
  };

  function normalizePosts(list) {
    if (!Array.isArray(list)) return [];
    return list
      .filter((p) => p && typeof p.text === 'string' && p.text.trim())
      .map((p) => ({
        id: typeof p.id === 'string' ? p.id : uid(),
        name: typeof p.name === 'string' && p.name.trim() ? p.name : DEFAULT_PROFILE.name,
        handle: typeof p.handle === 'string' && p.handle.trim() ? p.handle : DEFAULT_PROFILE.handle,
        text: p.text,
        createdAt: Number.isFinite(p.createdAt) ? p.createdAt : Date.now(),
        likes: Number.isFinite(p.likes) && p.likes >= 0 ? Math.floor(p.likes) : 0,
        liked: Boolean(p.liked),
      }))
      .sort((a, b) => b.createdAt - a.createdAt);
  }

  function normalizeProfile(p) {
    if (!p || typeof p !== 'object') return { ...DEFAULT_PROFILE };
    const name = typeof p.name === 'string' && p.name.trim() ? p.name.trim() : DEFAULT_PROFILE.name;
    const handle = typeof p.handle === 'string' && p.handle.trim()
      ? p.handle.trim().replace(/^@/, '')
      : DEFAULT_PROFILE.handle;
    return { name, handle };
  }

  function savePosts() {
    writeJSON(KEYS.posts, state.posts);
  }

  /* ---------------- helpers ---------------- */

  function uid() {
    return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
  }

  const AVATAR_COLORS = [
    ['#6366f1', '#4338ca'],
    ['#0ea5e9', '#0369a1'],
    ['#f97316', '#c2410c'],
    ['#10b981', '#047857'],
    ['#ec4899', '#be185d'],
    ['#8b5cf6', '#6d28d9'],
    ['#14b8a6', '#0f766e'],
    ['#f59e0b', '#b45309'],
  ];

  function hash(str) {
    let h = 0;
    for (let i = 0; i < str.length; i += 1) {
      h = (h * 31 + str.charCodeAt(i)) >>> 0;
    }
    return h;
  }

  function paintAvatar(node, name) {
    const digits = Array.from((name || 'P').trim())[0] || 'P';
    const [from, to] = AVATAR_COLORS[hash(name || 'P') % AVATAR_COLORS.length];
    node.textContent = digits.toUpperCase();
    node.style.background = `linear-gradient(140deg, ${from}, ${to})`;
  }

  function formatTime(ts) {
    const diff = Date.now() - ts;
    if (diff < 0) return '刚刚';
    const min = Math.floor(diff / 60000);
    if (min < 1) return '刚刚';
    if (min < 60) return `${min} 分钟前`;
    const hour = Math.floor(min / 60);
    if (hour < 24) return `${hour} 小时前`;
    const day = Math.floor(hour / 24);
    if (day === 1) return '昨天';
    if (day < 7) return `${day} 天前`;

    const d = new Date(ts);
    const sameYear = d.getFullYear() === new Date().getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    return sameYear ? `${mm}-${dd}` : `${d.getFullYear()}-${mm}-${dd}`;
  }

  const URL_RE = /(https?:\/\/[^\s<>"']+|www\.[^\s<>"']+)/gi;

  function appendRichText(parent, text) {
    let last = 0;
    let match;
    URL_RE.lastIndex = 0;
    while ((match = URL_RE.exec(text)) !== null) {
      if (match.index > last) {
        parent.appendChild(document.createTextNode(text.slice(last, match.index)));
      }
      const raw = match[0];
      const href = raw.startsWith('www.') ? `https://${raw}` : raw;
      const link = document.createElement('a');
      link.href = href;
      link.textContent = raw;
      link.target = '_blank';
      link.rel = 'noopener noreferrer';
      parent.appendChild(link);
      last = match.index + raw.length;
    }
    if (last < text.length) {
      parent.appendChild(document.createTextNode(text.slice(last)));
    }
    if (!parent.childNodes.length) {
      parent.textContent = text;
    }
  }

  let toastTimer = 0;
  function toast(message) {
    el.toast.textContent = message;
    el.toast.classList.add('is-visible');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => el.toast.classList.remove('is-visible'), 2000);
  }

  /* ---------------- rendering ---------------- */

  const ICONS = {
    like: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round" aria-hidden="true"><path d="M12 20s-7.5-4.6-7.5-9.6A4.4 4.4 0 0 1 12 7.3a4.4 4.4 0 0 1 7.5 3.1C19.5 15.4 12 20 12 20Z"/></svg>',
    trash: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 7h16M9 7V4.8h6V7M6.5 7l.8 12.2A1.8 1.8 0 0 0 9.1 21h5.8a1.8 1.8 0 0 0 1.8-1.8L17.5 7"/></svg>',
  };

  function buildPost(post) {
    const article = document.createElement('article');
    article.className = 'post';
    article.dataset.id = post.id;

    const avatar = document.createElement('span');
    avatar.className = 'avatar avatar--sm';
    avatar.setAttribute('aria-hidden', 'true');
    paintAvatar(avatar, post.name);

    const body = document.createElement('div');
    body.className = 'post__body';

    const head = document.createElement('div');
    head.className = 'post__head';

    const name = document.createElement('span');
    name.className = 'post__name';
    name.textContent = post.name;

    const handle = document.createElement('span');
    handle.className = 'post__handle';
    handle.textContent = `@${post.handle}`;

    const time = document.createElement('time');
    time.className = 'post__time';
    time.dateTime = new Date(post.createdAt).toISOString();
    time.textContent = formatTime(post.createdAt);
    time.title = new Date(post.createdAt).toLocaleString('zh-CN');

    head.append(name, handle, time);

    const text = document.createElement('p');
    text.className = 'post__text';
    appendRichText(text, post.text);

    const actions = document.createElement('div');
    actions.className = 'post__actions';

    const likeBtn = document.createElement('button');
    likeBtn.type = 'button';
    likeBtn.className = `action${post.liked ? ' is-liked' : ''}`;
    likeBtn.dataset.action = 'like';
    likeBtn.setAttribute('aria-pressed', String(post.liked));
    likeBtn.setAttribute('aria-label', post.liked ? '取消喜欢' : '喜欢');
    likeBtn.innerHTML = `${ICONS.like}<span>${post.likes || '喜欢'}</span>`;

    const delBtn = document.createElement('button');
    delBtn.type = 'button';
    delBtn.className = 'action action--danger action--push';
    delBtn.dataset.action = 'delete';
    delBtn.setAttribute('aria-label', '删除这条动态');
    delBtn.innerHTML = `${ICONS.trash}<span>删除</span>`;

    actions.append(likeBtn, delBtn);
    body.append(head, text, actions);
    article.append(avatar, body);
    return article;
  }

  function render() {
    el.feed.textContent = '';
    const fragment = document.createDocumentFragment();
    state.posts.forEach((post) => fragment.appendChild(buildPost(post)));
    el.feed.appendChild(fragment);

    const count = state.posts.length;
    el.postCount.textContent = `${count} 条`;
    el.empty.hidden = count > 0;
  }

  function renderProfile() {
    el.headerName.textContent = state.profile.name;
    el.headerHandle.textContent = `@${state.profile.handle}`;
    paintAvatar(el.headerAvatar, state.profile.name);
    paintAvatar(el.composeAvatar, state.profile.name);
  }

  /* ---------------- composer ---------------- */

  function autoGrow() {
    el.input.style.height = 'auto';
    el.input.style.height = `${Math.min(el.input.scrollHeight, 260)}px`;
  }

  function updateCounter() {
    const used = Array.from(el.input.value).length;
    const left = MAX_LENGTH - used;
    const pct = Math.min(used / MAX_LENGTH, 1) * 100;

    el.counterText.textContent = left;
    el.counterRing.style.setProperty('--pct', `${pct}%`);
    el.counter.classList.toggle('is-warning', left <= 40 && left > 10);
    el.counter.classList.toggle('is-danger', left <= 10);
    el.publishBtn.disabled = el.input.value.trim().length === 0;
  }

  function resetComposer() {
    el.input.value = '';
    el.input.style.height = 'auto';
    updateCounter();
  }

  function publish() {
    const text = el.input.value.replace(/\s+$/u, '').replace(/^\s+/u, '');
    if (!text) {
      toast('先写点什么吧');
      el.input.focus();
      return;
    }

    const post = {
      id: uid(),
      name: state.profile.name,
      handle: state.profile.handle,
      text,
      createdAt: Date.now(),
      likes: 0,
      liked: false,
    };

    state.posts.unshift(post);
    savePosts();
    resetComposer();
    render();

    const node = el.feed.querySelector(`[data-id="${post.id}"]`);
    if (node) {
      node.classList.add('is-fresh');
      setTimeout(() => node.classList.remove('is-fresh'), 1400);
    }

    toast('已发布');
    el.postCount.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }

  /* ---------------- interactions ---------------- */

  el.input.addEventListener('input', () => {
    autoGrow();
    updateCounter();
  });

  el.input.addEventListener('keydown', (event) => {
    if ((event.ctrlKey || event.metaKey) && event.key === 'Enter') {
      event.preventDefault();
      publish();
    }
  });

  el.publishBtn.addEventListener('click', publish);

  el.feed.addEventListener('click', (event) => {
    const button = event.target.closest('button[data-action]');
    if (!button) return;

    const article = button.closest('.post');
    const post = state.posts.find((p) => p.id === article.dataset.id);
    if (!post) return;

    if (button.dataset.action === 'like') {
      post.liked = !post.liked;
      post.likes = Math.max(0, post.likes + (post.liked ? 1 : -1));
      savePosts();
      render();
      return;
    }

    if (button.dataset.action === 'delete') {
      if (!window.confirm('确定删除这条动态吗？此操作不可撤销。')) return;
      state.posts = state.posts.filter((p) => p.id !== post.id);
      savePosts();
      render();
      toast('已删除');
    }
  });

  el.profileBtn.addEventListener('click', () => {
    el.profileName.value = state.profile.name;
    el.profileHandle.value = state.profile.handle;
    if (typeof el.profileDialog.showModal === 'function') {
      el.profileDialog.showModal();
    } else {
      el.profileDialog.setAttribute('open', '');
    }
    el.profileName.focus();
  });

  el.profileCancel.addEventListener('click', () => el.profileDialog.close());

  el.profileForm.addEventListener('submit', (event) => {
    event.preventDefault();
    const name = el.profileName.value.trim();
    const handle = el.profileHandle.value.trim().replace(/^@/, '').replace(/\s+/g, '');

    if (!name) {
      toast('昵称不能为空');
      el.profileName.focus();
      return;
    }

    state.profile = normalizeProfile({
      name,
      handle: handle || state.profile.handle,
    });
    writeJSON(KEYS.profile, state.profile);
    renderProfile();
    el.profileDialog.close();
    toast('资料已更新');
  });

  // 跨标签页同步
  window.addEventListener('storage', (event) => {
    if (event.key === KEYS.posts) {
      state.posts = normalizePosts(readJSON(KEYS.posts, []));
      render();
    }
    if (event.key === KEYS.profile) {
      state.profile = normalizeProfile(readJSON(KEYS.profile, DEFAULT_PROFILE));
      renderProfile();
    }
  });

  // 每分钟刷新相对时间
  setInterval(render, 60000);

  renderProfile();
  render();
  autoGrow();
  updateCounter();
})();
