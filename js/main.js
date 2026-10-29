/* main.js — phần chạy chung: lưu dữ liệu, âm thanh, bàn phím, vòng lặp, vẽ HUD, kết nối phòng chơi.
   Màn hình (menu, phòng chờ, tạo nhân vật, kết quả) nằm trong screens.js. */
'use strict';

const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const T = (k, v) => Lang.t(k, v);
const esc = s => String(s).replace(/[&<>"']/g, ch => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[ch]));
const signFont = () => (Lang.get() === 'ja' ? "'Dela Gothic One', 'Bungee', sans-serif" : "'Bungee', 'Dela Gothic One', sans-serif");

/* ---------- Lưu: kỷ lục, ngôn ngữ, âm thanh, nhân vật ---------- */
const SAVE_KEY = 'banhmi-trada-v3';
const prog = (() => {
  for (const k of [SAVE_KEY, 'banhmi-trada-v2']) {
    try { const d = JSON.parse(localStorage.getItem(k)); if (d && typeof d === 'object') return d; } catch (e) { /* bỏ qua */ }
  }
  return {};
})();
prog.best = prog.best || 0;
prog.lang = prog.lang || 'ja';
prog.muted = !!prog.muted;
const save = () => { try { localStorage.setItem(SAVE_KEY, JSON.stringify(prog)); } catch (e) { /* trình duyệt chặn lưu */ } };
const charCfg = () => ({ ...CHAR.DEF, ...(prog.char || {}) });
const charName = () => (prog.char && prog.char.name) || T('defName');

/* ---------- Âm thanh (Web Audio, không cần file) ---------- */
const Sound = (() => {
  let ctx = null;
  function ac() {
    if (!ctx) { const C = window.AudioContext || window.webkitAudioContext; if (!C) return null; ctx = new C(); }
    if (ctx.state === 'suspended') ctx.resume();
    return ctx;
  }
  function tone(f, d, type, v, slide, delay) {
    if (prog.muted) return;
    const c = ac(); if (!c) return;
    const t = c.currentTime + (delay || 0), o = c.createOscillator(), g = c.createGain();
    o.type = type || 'sine'; o.frequency.setValueAtTime(f, t);
    if (slide) o.frequency.linearRampToValueAtTime(f + slide, t + d);
    g.gain.setValueAtTime(v || .1, t); g.gain.exponentialRampToValueAtTime(.001, t + d);
    o.connect(g); g.connect(c.destination); o.start(t); o.stop(t + d + .03);
  }
  return {
    unlock: () => { if (!prog.muted) ac(); },
    tap:   () => tone(520, .05, 'triangle', .08),
    place: () => tone(330, .07, 'triangle', .1, 90),
    bell:  () => { tone(1568, .1, 'sine', .05); tone(2093, .18, 'sine', .04, 0, .08); },
    coin:  () => { tone(988, .08, 'square', .05); tone(1318, .15, 'square', .05, 0, .07); },
    bad:   () => tone(170, .12, 'sawtooth', .06, -40),
    pour:  () => tone(320, .45, 'sine', .05, 300),
    burn:  () => tone(120, .3, 'sawtooth', .06, -50),
    trash: () => tone(260, .1, 'triangle', .08, -140),
    wash:  () => { tone(700, .06, 'sine', .05, 200); tone(900, .08, 'sine', .04, -200, .06); },
    angry: () => { tone(220, .1, 'square', .05); tone(165, .18, 'square', .05, 0, .1); },
    level: () => [659, 784, 988].forEach((f, i) => tone(f, .12, 'triangle', .08, 0, i * .09)),
    win:   () => [523, 659, 784, 1046].forEach((f, i) => tone(f, .16, 'triangle', .1, 0, i * .12)),
  };
})();

/* ---------- Canvas và bố cục theo màn hình ---------- */
const wrap = $('#wrap'), cv = $('#game'), ctx = cv.getContext('2d');
let cssScale = 1, dpr = 1;
let isTouch = !!(window.matchMedia && matchMedia('(pointer: coarse)').matches);
let portrait = false;
function fit() {
  const W = innerWidth, H = innerHeight;
  portrait = isTouch && H > W;
  $('#app').classList.toggle('pt', portrait);
  if (portrait) cssScale = Math.max(.25, (W - 16) / VW);
  else {
    const side = isTouch ? Math.max(130, Math.min(220, W * .19)) : 0;     // chừa 2 bên cho thẻ và nút điều khiển
    cssScale = Math.max(.3, Math.min((W - side * 2 - 16) / VW, (H - 16) / VH));
  }
  dpr = Math.min(2, window.devicePixelRatio || 1);
  wrap.style.width = VW * cssScale + 'px'; wrap.style.height = VH * cssScale + 'px';
  cv.width = Math.round(VW * cssScale * dpr); cv.height = Math.round(VH * cssScale * dpr);
  UIZ = Math.min(1.8, Math.max(1, .85 / cssScale));                        // chữ trên canvas to hơn khi màn hình nhỏ
  layoutPanels();
}

/* ---------- Trạng thái phía máy này ---------- */
let mode = null;        // 'solo' | 'host' | 'client' | null (ở menu)
let me = 'h';           // id người chơi trên máy này
let room = null;        // kết nối phòng
let roster = [];        // [{ pid, name, cfg, slot }]
let V = null;           // trạng thái đang vẽ
let local = null;       // nhân vật của mình (di chuyển ngay trên máy này)
let playing = false, paused = false, lastFx = 0, finished = false;
let disp = {};
const floats = [];

/* ---------- Bàn phím ---------- */
const keys = new Set();
const ACT_KEYS = ['Space', 'KeyE', 'KeyJ'];
addEventListener('keydown', e => {
  if (e.target && (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA')) return;
  if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space'].includes(e.code) && playing) e.preventDefault();
  if (e.repeat) return;
  keys.add(e.code);
  Sound.unlock();
  if (playing && !paused && ACT_KEYS.includes(e.code)) doAct();
  if (e.code === 'Escape' || e.code === 'KeyP') togglePause();
});
addEventListener('keyup', e => keys.delete(e.code));
addEventListener('blur', () => keys.clear());
const holding = () => TOUCH.hold || ACT_KEYS.some(k => keys.has(k));
function inputVec() {
  let x = 0, y = 0;
  if (keys.has('KeyA') || keys.has('ArrowLeft')) x--;
  if (keys.has('KeyD') || keys.has('ArrowRight')) x++;
  if (keys.has('KeyW') || keys.has('ArrowUp')) y--;
  if (keys.has('KeyS') || keys.has('ArrowDown')) y++;
  if (!x && !y && TOUCH.on) {                    // cần điều khiển ảo: đẩy nhẹ đi chậm, đẩy hết đi nhanh
    const m = Math.hypot(TOUCH.x, TOUCH.y);
    if (m < .2) return [0, 0];
    const k = Math.min(1, (m - .2) / .5) / m;
    return [TOUCH.x * k, TOUCH.y * k];
  }
  return [x, y];
}
function doAct() {
  if (!local || !V || V.phase !== 'play') return;
  const target = findTarget(local);
  if (!target) return;
  if (mode === 'client') {
    room.send({ t: 'pos', x: +local.x.toFixed(3), y: +local.y.toFixed(3), d: local.dir, m: local.mv });
    room.send({ t: 'act', k: target });
  } else {
    const p = SIM.S.players[me];
    if (p) { p.x = local.x; p.y = local.y; p.dir = local.dir; }
    SIM.interact(me, target);
  }
}

/* ---------- Sự kiện từ mô phỏng ---------- */
function resolveVars(v) {
  if (!v) return v;
  const out = {};
  for (const k in v) {
    const s = v[k];
    if (typeof s === 'string' && s.startsWith('@ing:')) out[k] = Lang.name(INGS[s.slice(5)].name).toLowerCase();
    else if (typeof s === 'string' && s.startsWith('@dishes:')) out[k] = s.slice(8).split(',').map(id => Lang.name(RECIPES[id].name)).join(', ');
    else out[k] = s;
  }
  return out;
}
function processFx(list) {
  for (const e of list) {
    if (e.id <= lastFx) continue;
    lastFx = e.id;
    if (e.k === 'sfx') { if (Sound[e.n]) Sound[e.n](); }
    else if (e.k === 'float') floats.push({ x: e.x, y: e.y, text: e.raw || T(e.key, resolveVars(e.vars)), cls: e.cls, t: 0 });
    else if (e.k === 'banner') showBanner(T(e.key, resolveVars(e.vars)));
    else if (e.k === 'toast' && (!e.to || e.to === me)) { toast(T(e.key, resolveVars(e.vars))); if (e.to) Sound.bad(); }
  }
}
let toastTimer = 0;
function toast(msg) {
  const el = $('#toast');
  el.textContent = msg; el.classList.add('show');
  clearTimeout(toastTimer); toastTimer = setTimeout(() => el.classList.remove('show'), 1600);
}
function showBanner(text) {
  const b = document.createElement('div');
  b.className = 'banner'; b.textContent = text;
  $('#fx').appendChild(b);
  setTimeout(() => b.remove(), 1200);
}

/* ---------- Bắt đầu / kết thúc lượt ---------- */
function resetView() { disp = {}; floats.length = 0; lastFx = 0; finished = false; paused = false; }
function startGame() {          // máy chủ phòng hoặc chơi 1 mình
  resetView();
  SIM.create(roster);
  V = SIM.S;
  const p = V.players[me];
  local = { x: p.x, y: p.y, dir: p.dir, mv: 0 };
  playing = true;
  hideOverlays();
  if (mode === 'host') room.broadcast({ t: 'start' });
}
function finish(result) {
  if (finished) return;
  finished = true; playing = false; paused = false;
  const oldBest = prog.best, record = result.score > oldBest;
  if (record) { prog.best = result.score; save(); }
  Sound.win();
  showResult(result, record, oldBest);
}

/* ---------- Kết nối phòng ---------- */
function cleanCfg(c) {
  const O = CHAR.OPTS, col = v => (/^#[0-9a-f]{6}$/i.test(v) ? v : null);
  c = c || {};
  return {
    hair: O.hairs.includes(c.hair) ? c.hair : 'short', hairColor: col(c.hairColor) || '#1E1A18', skin: col(c.skin) || '#EBC09A',
    outfit: O.outfits.some(o => o.id === c.outfit) ? c.outfit : 'apron', color: col(c.color) || '#2F74B5',
    hat: O.hats.some(o => o.id === c.hat) ? c.hat : 'none',
  };
}
async function createRoom() {
  showMsg(T('connecting'), true);
  try { room = await Net.host({ join: () => {}, leave: onLeave, msg: onHostMsg }); }
  catch (e) { room = null; return showMsg(T('errNet')); }
  mode = 'host'; me = 'h';
  roster = [{ pid: 'h', name: charName(), cfg: cleanCfg(charCfg()), slot: 0 }];
  showLobby();
}
function onHostMsg(id, m) {
  if (!m || typeof m !== 'object') return;
  if (m.t === 'hello') {
    if (playing) return room.send(id, { t: 'deny', why: 'errStarted' });
    if (roster.length >= 4) return room.send(id, { t: 'deny', why: 'errFull' });
    const slot = [0, 1, 2, 3].find(s => !roster.some(r => r.slot === s));
    roster.push({ pid: id, name: String(m.name || '?').slice(0, 12), cfg: cleanCfg(m.cfg), slot });
    sendLobby(); renderLobby();
  } else if (m.t === 'pos') SIM.setPos(id, m.x, m.y, m.d, m.m);
  else if (m.t === 'act') SIM.interact(id, String(m.k || ''));
  else if (m.t === 'hold') SIM.setHold(id, m.on);
}
function onLeave(id) {
  roster = roster.filter(r => r.pid !== id);
  if (playing) SIM.removePlayer(id);
  sendLobby(); renderLobby();
}
function sendLobby() { if (room) roster.forEach(r => { if (r.pid !== 'h') room.send(r.pid, { t: 'lobby', roster, you: r.pid, code: room.code }); }); }

async function joinRoom(code) {
  showMsg(T('connecting'), true);
  try { room = await Net.join(code, { msg: onClientMsg, close: onHostGone }); }
  catch (e) { room = null; return showMsg(e && e.type === 'peer-unavailable' ? T('errJoin') : T('errNet')); }
  mode = 'client';
  room.send({ t: 'hello', name: charName(), cfg: cleanCfg(charCfg()) });
}
function onClientMsg(m) {
  if (!m || typeof m !== 'object') return;
  switch (m.t) {
    case 'lobby':
      me = m.you; roster = m.roster; lobbyCode = m.code;
      if (!playing && !finished) showLobby();
      renderLobby();
      break;
    case 'deny': leaveRoom(); showMsg(T(m.why)); break;
    case 'start': resetView(); local = null; playing = true; hideOverlays(); break;
    case 'snap':
      if (!playing && !finished) break;
      V = m.s;
      if (!local && V.players[me]) { const p = V.players[me]; local = { x: p.x, y: p.y, dir: p.dir, mv: 0 }; }
      processFx(V.fx);
      break;
    case 'end': finish(m.r); break;
  }
}
function onHostGone() {
  if (mode !== 'client') return;
  leaveRoom();
  showMsg(T('errHostLeft'));
}
function leaveRoom() {
  if (room) { try { room.close(); } catch (e) { /* đã đóng */ } }
  room = null; mode = null; roster = []; playing = false; finished = false;
  toMenu();
}

/* ---------- Vòng lặp ---------- */
let lastT = performance.now(), sendT = 0, snapT = 0, lastHold = false;
function step(dt) {
  if (local && V && V.phase === 'play') { const [ix, iy] = inputVec(); movePlayer(local, ix, iy, dt); }
  const h = holding();
  if (mode === 'client') {
    if (!room || !local) return;
    sendT -= dt;
    if (sendT <= 0) { sendT = .05; room.send({ t: 'pos', x: +local.x.toFixed(3), y: +local.y.toFixed(3), d: local.dir, m: local.mv }); }
    if (h !== lastHold) { lastHold = h; room.send({ t: 'hold', on: h }); }
    return;
  }
  const S = SIM.S;
  if (!S || S.phase !== 'play') return;
  const p = S.players[me];
  if (p) { p.x = local.x; p.y = local.y; p.dir = local.dir; p.mv = local.mv; p.hold = h; }
  SIM.update(dt);
  V = S;
  processFx(S.fx);
  if (mode === 'host') {
    snapT -= dt;
    if (snapT <= 0 || S.phase === 'end') { snapT = 1 / 15; room.broadcast({ t: 'snap', s: SIM.snap() }); }
  }
  if (S.phase === 'end') {
    if (mode === 'host') room.broadcast({ t: 'end', r: S.result });
    finish(S.result);
  }
}
function updateDisp(dt) {
  const k = 1 - Math.exp(-dt * 14);
  for (const id in V.players) {
    const p = V.players[id];
    if (id === me && local && playing) { disp[id] = { x: local.x, y: local.y, dir: local.dir, mv: local.mv }; continue; }
    const d = disp[id] || (disp[id] = { x: p.x, y: p.y });
    if (mode === 'client') { d.x += (p.x - d.x) * k; d.y += (p.y - d.y) * k; } else { d.x = p.x; d.y = p.y; }
    d.dir = p.dir; d.mv = p.mv;
  }
  V.custs.forEach(c => {
    const id = 'c' + c.id, d = disp[id] || (disp[id] = { x: c.x, y: c.y });
    if (mode === 'client' && Math.hypot(c.x - d.x, c.y - d.y) < 3) { d.x += (c.x - d.x) * k; d.y += (c.y - d.y) * k; } else { d.x = c.x; d.y = c.y; }
    d.dir = c.dir; d.mv = c.mv;
  });
}
function drawFloats(dt) {
  for (let i = floats.length - 1; i >= 0; i--) {
    const f = floats[i];
    f.t += dt;
    if (f.t > 1.2) { floats.splice(i, 1); continue; }
    const sx = f.x * TW, sy = OY + f.y * TH - f.t * 30, a = Math.min(1, (1.2 - f.t) * 3);
    ctx.globalAlpha = a; ctx.textAlign = 'center';
    if (f.cls === 'greet') {
      ctx.font = `800 ${Math.round(12 * UIZ)}px ${Lang.font()}`;
      const w = ctx.measureText(f.text).width + 14;
      const gh = 12 * UIZ + 7;
      ctx.fillStyle = '#2B2118'; rr(ctx, sx - w / 2, sy - gh + 6, w, gh, gh / 2); ctx.fill();
      ctx.fillStyle = '#FFF7E2'; ctx.fillText(f.text, sx, sy + 1);
    } else {
      ctx.font = `400 ${Math.round((f.cls === 'gain' ? 22 : 16) * UIZ)}px ${signFont()}`;
      ctx.lineWidth = 4; ctx.strokeStyle = '#fff'; ctx.strokeText(f.text, sx, sy);
      ctx.fillStyle = f.cls === 'gain' ? '#3E9B48' : '#D9443A'; ctx.fillText(f.text, sx, sy);
    }
    ctx.globalAlpha = 1;
  }
}
function drawHud(t) {
  const S = V, z = UIZ, HW = VW / z;
  ctx.save(); ctx.scale(z, z);
  ctx.fillStyle = '#C8352B'; ctx.fillRect(0, 0, HW, 56);
  ctx.fillStyle = '#95231C'; ctx.fillRect(0, 52, HW, 4);
  ctx.textBaseline = 'middle';
  // cấp + thanh lên cấp
  ctx.font = `400 17px ${signFont()}`; ctx.textAlign = 'left'; ctx.fillStyle = '#FFD447';
  ctx.fillText(T('hudLevel', { n: S.level }), 14, 20);
  const L = SIM.scoreLevel(S.score);
  ctx.fillStyle = 'rgba(0,0,0,.3)'; rr(ctx, 14, 36, 96, 7, 3.5); ctx.fill();
  ctx.fillStyle = '#FFD447'; rr(ctx, 14, 36, 96 * Math.min(1, (S.score - L.from) / (L.to - L.from)), 7, 3.5); ctx.fill();
  // điểm
  ctx.font = `800 21px ${Lang.font()}`; ctx.fillStyle = '#FFF7E2';
  ctx.fillText(T('hudScore', { s: S.score }), 128, 21);
  ctx.font = `700 11px ${Lang.font()}`; ctx.fillStyle = '#FFD9A8';
  ctx.fillText(T('hudBest', { b: Math.max(prog.best, S.score) }), 128, 42);
  // đồng hồ
  const sec = Math.max(0, Math.ceil(S.time));
  ctx.font = `400 28px ${signFont()}`; ctx.textAlign = 'center';
  ctx.fillStyle = sec <= 15 && Math.floor(t * 2) % 2 ? '#FFFFFF' : '#FFD447';
  ctx.fillText(Math.floor(sec / 60) + ':' + String(sec % 60).padStart(2, '0'), HW / 2, 28);
  // đĩa, cốc sạch
  ctx.font = `800 12px ${Lang.font()}`; ctx.textAlign = 'left'; ctx.fillStyle = S.plates && S.glasses ? '#FFF7E2' : '#FFD447';
  const dishes = T('hudDishes', { p: S.plates, g: S.glasses }), dx = HW / 2 + 50;
  ctx.fillText(dishes, dx, 28);
  const dEnd = dx + ctx.measureText(dishes).width + 14;
  // người chơi (màn hình nhỏ: chỉ chấm màu)
  const compact = z > 1.15;
  let x = HW - 12;
  ctx.textAlign = 'right'; ctx.font = `800 11px ${Lang.font()}`;
  Object.values(S.players).sort((a, b) => b.slot - a.slot).forEach(p => {
    const label = compact ? '' : p.name, wName = label ? ctx.measureText(label).width : 0;
    if (x - wName - 14 < dEnd) return;
    if (label) { ctx.fillStyle = '#FFF7E2'; ctx.fillText(label, x, 28); }
    const cx = x - wName - (label ? 9 : 5);
    ctx.fillStyle = PCOL[p.slot % 4]; ctx.beginPath(); ctx.arc(cx, 28, 5, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = '#fff'; ctx.lineWidth = 1.5; ctx.stroke();
    x -= wName + (label ? 26 : 16);
  });
  ctx.restore();
  ctx.textBaseline = 'alphabetic';
}
function render(t, dt) {
  ctx.setTransform(cssScale * dpr, 0, 0, cssScale * dpr, 0, 0);
  if (!V) { ctx.fillStyle = '#1D4636'; ctx.fillRect(0, 0, VW, VH); return; }
  updateDisp(dt);
  const target = playing && local && V.phase === 'play' ? findTarget(local) : null;
  drawWorld(ctx, V, disp, me, target, t);
  drawFloats(dt);
  drawHud(t);
  updatePanels(target);
}
function frame(now) {
  const dt = Math.min(.05, (now - lastT) / 1000);
  lastT = now;
  if (playing && !(paused && mode === 'solo')) step(dt);
  render(now / 1000, dt);
  syncTouch();
  drawPreview(now / 1000);
  requestAnimationFrame(frame);
}
