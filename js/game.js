/* game.js — lõi game: lượt chơi 3 phút, độ khó tăng dần không giới hạn, khách, bếp, tính điểm và trừ điểm.
   Các con số chỉnh độ khó nằm trong GAME (data.js). Màn hình, nhân vật và điều khiển nằm trong ui.js. */
'use strict';

const W = 360, H = 720;
const SLOT_X = { 2: [110, 250], 3: [70, 180, 290], 4: [45, 135, 225, 315] }; // tâm chỗ đứng của khách

const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const rand = (a, b) => a + Math.random() * (b - a);
const pick = a => a[Math.floor(Math.random() * a.length)];
const T = (k, v) => Lang.t(k, v);          // câu theo ngôn ngữ đang chọn (i18n.js)
const N = o => Lang.name(o);               // tên món / nguyên liệu theo ngôn ngữ
const reduceMotion = !!(window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches);

/* ---------- Lưu: kỷ lục, ngôn ngữ, âm thanh, nhân vật ---------- */
const SAVE_KEY = 'banhmi-trada-v2';
const prog = (() => {
  try {
    const d = JSON.parse(localStorage.getItem(SAVE_KEY));
    if (d && typeof d === 'object') return d;
  } catch (e) { /* trình duyệt chặn lưu trữ: vẫn chơi được, chỉ không nhớ */ }
  return {};
})();
prog.best = prog.best || 0;
prog.lang = prog.lang || 'ja';             // mặc định tiếng Nhật
prog.muted = !!prog.muted;
const save = () => { try { localStorage.setItem(SAVE_KEY, JSON.stringify(prog)); } catch (e) { /* bỏ qua */ } };

/* ---------- Âm thanh (Web Audio, không cần file mp3) ---------- */
const Sound = (() => {
  let ctx = null;
  function ac() {
    if (!ctx) {
      const C = window.AudioContext || window.webkitAudioContext;
      if (!C) return null;
      ctx = new C();
    }
    if (ctx.state === 'suspended') ctx.resume();
    return ctx;
  }
  function tone(f, d, type, v, slide, delay) {
    if (prog.muted) return;
    const c = ac(); if (!c) return;
    const t = c.currentTime + (delay || 0), o = c.createOscillator(), g = c.createGain();
    o.type = type || 'sine';
    o.frequency.setValueAtTime(f, t);
    if (slide) o.frequency.linearRampToValueAtTime(f + slide, t + d);
    g.gain.setValueAtTime(v || .12, t);
    g.gain.exponentialRampToValueAtTime(.001, t + d);
    o.connect(g); g.connect(c.destination);
    o.start(t); o.stop(t + d + .03);
  }
  return {
    unlock: () => { if (!prog.muted) ac(); },
    tap:   () => tone(520, .05, 'triangle', .1),
    place: () => tone(330, .08, 'triangle', .14, 90),
    bell:  () => { tone(1568, .12, 'sine', .07); tone(2093, .22, 'sine', .05, 0, .09); },
    coin:  () => { tone(988, .08, 'square', .06); tone(1318, .16, 'square', .06, 0, .07); },
    bad:   () => tone(170, .14, 'sawtooth', .08, -40),
    pour:  () => tone(320, .6, 'sine', .05, 300),
    burn:  () => tone(120, .35, 'sawtooth', .07, -50),
    trash: () => tone(260, .12, 'triangle', .1, -140),
    angry: () => { tone(220, .12, 'square', .07); tone(165, .22, 'square', .07, 0, .12); },
    level: () => [659, 784, 988].forEach((f, i) => tone(f, .14, 'triangle', .11, 0, i * .09)),
    win:   () => [523, 659, 784, 1046].forEach((f, i) => tone(f, .18, 'triangle', .12, 0, i * .12)),
  };
})();

/* ---------- Sân khấu 360×720, phóng to vừa màn hình ---------- */
const app = $('#app'), wrap = $('#wrap'), stage = $('#stage');
let scale = 1;
function fit() {
  const cs = getComputedStyle(app);
  const aw = app.clientWidth - parseFloat(cs.paddingLeft) - parseFloat(cs.paddingRight);
  const ah = app.clientHeight - parseFloat(cs.paddingTop) - parseFloat(cs.paddingBottom);
  scale = Math.max(.4, Math.min(aw / W, ah / H, 1.6));
  wrap.style.width = W * scale + 'px';
  wrap.style.height = H * scale + 'px';
  stage.style.transform = `scale(${scale})`;
}

const el = {
  hudLevel: $('#hudLevel'), score: $('#hudMoney'), bar: $('#hudBar i'), timer: $('#hudTime'),
  customers: $('#customers'), custSlots: [],
  plates: $$('.plate'), cups: $$('.cup'), grill: $$('.gslot'), pan: $$('.pslot'), panBox: $('#pan'),
  trash: $('#trash'), board: $('#board'), fx: $('#fx'), toast: $('#toast'),
  vendor: $('#vendor'), vName: $('#vName'), vRank: $('#vRank'),
};

let G = null;   // trạng thái lượt chơi hiện tại

/* ---------- Hiệu ứng nhỏ ---------- */
function posIn(node) {
  const r = node.getBoundingClientRect(), s = stage.getBoundingClientRect();
  return { x: (r.left + r.width / 2 - s.left) / scale, y: (r.top + r.height / 2 - s.top) / scale };
}
function fly(from, to, html) {
  if (reduceMotion || !from || !to) return;
  const a = posIn(from), b = posIn(to), f = document.createElement('div');
  f.className = 'fly'; f.innerHTML = html;
  f.style.left = a.x + 'px'; f.style.top = a.y + 'px';
  el.fx.appendChild(f);
  requestAnimationFrame(() => requestAnimationFrame(() => {
    f.style.transform = `translate(${b.x - a.x}px, ${b.y - a.y}px) scale(.55)`;
    f.style.opacity = '0.3';
  }));
  setTimeout(() => f.remove(), 420);
}
function floatText(node, text, cls) {
  const p = posIn(node), f = document.createElement('div');
  f.className = 'float ' + (cls || '');
  f.textContent = text;
  f.style.left = p.x + 'px'; f.style.top = p.y + 'px';
  el.fx.appendChild(f);
  setTimeout(() => f.remove(), 1000);
}
function banner(text) {
  const b = document.createElement('div');
  b.className = 'banner'; b.textContent = text;
  el.fx.appendChild(b);
  setTimeout(() => b.remove(), 1100);
}
let toastTimer = 0;
function toast(msg) {
  el.toast.textContent = msg;
  el.toast.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => el.toast.classList.remove('show'), 1500);
}
function shake(node) { if (!node) return; node.classList.remove('shake'); void node.offsetWidth; node.classList.add('shake'); }

// động tác của chủ quán (CSS .pose-* trong style.css)
const POSES = ['grill', 'ing', 'pour', 'serve', 'happy', 'sad', 'oops', 'trash', 'wave'];
const POSE_MS = { happy: 700, sad: 800, wave: 900, pour: 550 };
function pose(p, node = el.vendor) {
  if (!node) return;
  POSES.forEach(x => node.classList.remove('pose-' + x));
  void node.getBoundingClientRect();
  node.classList.add('pose-' + p);
  clearTimeout(node._poseT);
  node._poseT = setTimeout(() => node.classList.remove('pose-' + p), POSE_MS[p] || 450);
}
function nope(node, msg) { shake(node); Sound.bad(); pose('oops'); if (msg) toast(msg); }

/* ---------- Quy tắc món ---------- */
const stateOf = (t, a, b, c) => (t < a ? 'cooking' : t < b ? 'ready' : t < c ? 'warn' : 'burnt');
const breadSt = g => stateOf(g.t, COOK.bread, COOK.breadWarn, COOK.breadBurn);
const eggSt = p => stateOf(p.t, COOK.egg, COOK.eggWarn, COOK.eggBurn);
const ringP = (t, a, b, c, st) => (st === 'cooking' ? t / a : st === 'warn' ? (t - b) / (c - b) : 0).toFixed(3);
const sameSet = (a, b) => a.length === b.length && a.every(x => b.includes(x));
const foodsOf = ids => ids.filter(id => RECIPES[id].type === 'food');
const fits = (ings, ids) => foodsOf(ids).some(id => ings.every(x => RECIPES[id].ings.includes(x)));

function openOrders() {
  const out = [];
  G.customers.forEach(c => { if (c && !c.leaving) c.items.forEach(it => { if (!it.done) out.push(it.id); }); });
  return out;
}
function plateRecipe(p) {
  return p ? foodsOf(G.recipes).find(id => sameSet(RECIPES[id].ings, p.ings)) || null : null;
}
function cupRecipe(c) {
  if (!c || c.fill < 1) return null;
  const id = c.lemon ? 'trachanh' : 'trada';
  return G.recipes.includes(id) ? id : null;
}
// chọn đĩa để kẹp k: đĩa đang chọn → đĩa hợp món khách đang gọi → đĩa hợp món có trong thực đơn → đĩa có bánh bất kỳ
// (trường hợp cuối sẽ thành sai món và bị trừ điểm)
function targetPlate(k) {
  const P = G.plates, ok = p => p && !p.ings.includes(k);
  if (G.sel && G.sel.type === 'plate' && ok(P[G.sel.i])) return G.sel.i;
  const want = openOrders();
  const finished = p => { const r = plateRecipe(p); return r && want.includes(r); };
  let j = P.findIndex(p => ok(p) && !finished(p) && fits([...p.ings, k], want));
  if (j < 0) j = P.findIndex(p => ok(p) && !finished(p) && fits([...p.ings, k], G.recipes));
  if (j < 0) j = P.findIndex(p => ok(p) && !finished(p));
  if (j < 0) j = P.findIndex(ok);
  return j;
}

/* ---------- Điểm, trừ điểm, cấp độ ---------- */
// cấp theo điểm: bậc đầu scoreStep[0], mỗi bậc sau dài thêm scoreStep[1]
function scoreLevel(score) {
  let lv = 1, from = 0, step = GAME.scoreStep[0];
  while (score >= from + step) { from += step; step += GAME.scoreStep[1]; lv++; }
  return { lv, from, to: from + step };
}
const recipesFor = lv => Object.keys(GAME.unlocks).filter(k => Number(k) <= lv).flatMap(k => GAME.unlocks[k]);

function addScore(d) {
  G.score = Math.max(0, G.score + d);
  drawScore();
  checkLevel();
}
function penalty(kind, node) {
  const n = GAME.penalty[kind];
  G.penalties += n;
  G.score = Math.max(0, G.score - n);
  floatText(node, T('p' + kind[0].toUpperCase() + kind.slice(1), { n }), 'loss');
  drawScore();
}
function checkLevel() {
  const elapsed = GAME.duration - G.time;
  const lv = Math.max(G.level, 1 + Math.floor(elapsed / GAME.levelEvery), scoreLevel(G.score).lv);
  if (lv > G.level) levelUp(lv);
}
function levelUp(lv) {
  const before = G.recipes;
  G.level = lv;
  G.recipes = recipesFor(lv);
  const fresh = G.recipes.filter(r => !before.includes(r));
  if (fresh.length) { G.fresh = fresh; G.freshUntil = G.time - 25; }
  const n = GAME.slots(lv);
  if (n !== G.slots) { G.slots = n; layoutSlots(); }
  applyLocks(G.recipes);
  el.hudLevel.textContent = T('hudLevel', { n: lv });
  banner(T('levelUp', { n: lv }));
  toast(fresh.length ? T('newDish', { dish: fresh.map(r => N(RECIPES[r].name)).join(', ') }) : T('busier'));
  Sound.level();
  pose('happy');
}

/* ---------- Khách hàng ---------- */
function layoutSlots() {
  el.custSlots.forEach((box, i) => { box.style.left = ((SLOT_X[G.slots][i] ?? SLOT_X[4][i]) - 40) + 'px'; });
}
function makeOrder() {
  const foods = foodsOf(G.recipes), drinks = G.recipes.filter(r => RECIPES[r].type === 'drink');
  const fresh = G.time > G.freshUntil ? G.fresh : [];
  const choose = list => { const f = fresh.filter(r => list.includes(r)); return f.length && Math.random() < .4 ? pick(f) : pick(list); };
  if (drinks.length && Math.random() < GAME.double(G.level)) return [choose(foods), choose(drinks)];
  return [Math.random() < .72 || !drinks.length ? choose(foods) : choose(drinks)];
}
function spawnCustomer() {
  const free = [];
  for (let i = 0; i < G.slots; i++) if (!G.customers[i]) free.push(i);
  if (!free.length) return false;
  const i = pick(free), items = makeOrder().map(id => ({ id, done: false }));
  const max = GAME.patience(G.level) + (items.length - 1) * 6;
  const look = {
    skin: pick(LOOKS.skin), hair: pick(LOOKS.hair), shirt: pick(LOOKS.shirt),
    style: pick(LOOKS.style), helmet: pick(LOOKS.helmet), glasses: Math.random() < .2,
  };
  G.customers[i] = { look, items, pat: max, max, mood: 'normal', leaving: false };
  renderCustomer(i, 'enter');
  if (Math.random() < .55) greet(i);
  Sound.bell();
  return true;
}
// khách gọi tên chủ quán khi tới
function greet(i) {
  const chip = document.createElement('span');
  chip.className = 'greet';
  chip.textContent = T('greet', { name: charName() });
  el.custSlots[i].appendChild(chip);
}
function orderItemHTML(it) {
  const R = RECIPES[it.id], food = R.type === 'food';
  const icon = food ? ART.bread('toast', R.ings) : ART.cup(1, R.lemon);
  const chips = (food ? R.ings : R.lemon ? ['chanh'] : []).map(k => `<i>${ART.ing(k)}</i>`).join('');
  return `<div class="oi ${R.type}${it.done ? ' done' : ''}">${icon}${chips ? `<span class="chips">${chips}</span>` : ''}</div>`;
}
function renderCustomer(i, anim) {
  const box = el.custSlots[i], c = G && G.customers[i];
  if (!box) return;
  if (!c) { box.hidden = true; box.innerHTML = ''; box.className = 'cust'; return; }
  box.hidden = false;
  box.className = 'cust' + (anim ? ' ' + anim : '') + (c.leaving ? ' ' + c.mood : '');
  box.innerHTML = `<div class="bubble">${c.items.map(orderItemHTML).join('')}<span class="pbar"><i></i></span></div>` +
    `<div class="body">${ART.customer(c.look, c.mood)}</div>`;
}
function leave(i, happy) {
  const c = G.customers[i];
  if (!c || c.leaving) return;
  c.leaving = true;
  if (!happy) {
    c.mood = 'angry'; G.lost++; G.combo = 0;
    Sound.angry();
    penalty('leave', el.custSlots[i]);
    pose('sad');
  }
  renderCustomer(i, 'leave');
  const tok = G.token;
  setTimeout(() => {
    if (G && G.token === tok && G.customers[i] === c) { G.customers[i] = null; renderCustomer(i); }
  }, 650);
}
function serve(rid, from) {
  let best = -1, low = 2;   // ưu tiên khách sắp hết kiên nhẫn
  G.customers.forEach((c, i) => {
    if (!c || c.leaving || !c.items.some(it => !it.done && it.id === rid)) return;
    const r = c.pat / c.max;
    if (r < low) { low = r; best = i; }
  });
  if (best < 0) return false;
  const c = G.customers[best], k = c.items.findIndex(it => !it.done && it.id === rid);
  c.items[k].done = true;
  const box = el.custSlots[best], oi = box.querySelectorAll('.oi')[k];
  const R = RECIPES[rid];
  fly(from, oi || box, R.type === 'food' ? ART.bread('toast', R.ings) : ART.cup(1, R.lemon));
  if (oi) oi.classList.add('done');
  Sound.place();
  pose('serve');
  if (c.items.every(it => it.done)) pay(best);
  return true;
}
function pay(i) {
  const c = G.customers[i], box = el.custSlots[i];
  const base = c.items.reduce((s, it) => s + RECIPES[it.id].price, 0);
  const tip = Math.round(base * .3 * Math.max(0, c.pat / c.max));
  G.combo++;
  G.comboMax = Math.max(G.comboMax, G.combo);
  const bonus = G.combo >= 2 ? Math.min(5, G.combo - 1) : 0;
  const total = base + tip + bonus;
  G.served++;
  floatText(box.querySelector('.body') || box, '+' + total, 'gain');
  if (bonus) banner(T('combo', { n: G.combo }));
  Sound.coin();
  pose('happy');
  c.mood = 'happy';
  leave(i, true);
  addScore(total);
}

/* ---------- Thao tác của người chơi ---------- */
function setTrash(on) {
  if (!G) return;
  G.trash = on;
  el.trash.classList.toggle('armed', on);
  stage.classList.toggle('trashing', on);
  if (on) toast(T('tTrash'));
}
// bỏ đi: kind = 'waste' (vứt đồ ăn), 'wrong' (sai món) hoặc null (đồ cháy đã bị trừ lúc cháy)
function dump(node, kind) {
  setTrash(false);
  Sound.trash();
  pose('trash');
  if (kind) penalty(kind, node);
  if (kind === 'wrong') G.wrong++;
}
function toggleSel(type, i) {
  G.sel = G.sel && G.sel.type === type && G.sel.i === i ? null : { type, i };
  Sound.tap();
}
function clearSel(type, i) { if (G.sel && G.sel.type === type && G.sel.i === i) G.sel = null; }
// kẹp nguyên liệu k vào đĩa j; nếu thành món không có trong thực đơn → sai món, bỏ đĩa, trừ điểm
function putOnPlate(j, k, from, art) {
  G.plates[j].ings.push(k);
  fly(from, el.plates[j], art);
  Sound.place();
  pose('ing');
  if (!fits(G.plates[j].ings, G.recipes)) {
    G.plates[j] = null;
    clearSel('plate', j);
    shake(el.plates[j]);
    Sound.angry();
    pose('oops');
    dump(el.plates[j], 'wrong');
  }
}

function tapGrill(i, node) {
  const g = G.grill[i];
  if (!g) return setTrash(false);
  const st = breadSt(g);
  if (st === 'burnt') { G.grill[i] = null; return dump(node, null); }
  if (G.trash) { G.grill[i] = null; return dump(node, st === 'cooking' ? null : 'waste'); }
  if (st === 'cooking') return nope(node, T('tBreadRaw'));
  const s = G.sel && G.sel.type === 'plate' && !G.plates[G.sel.i] ? G.sel.i : G.plates.findIndex(p => !p);
  if (s < 0) return nope(node, T('tNoPlate'));
  G.plates[s] = { ings: [] };
  G.grill[i] = null;
  fly(node, el.plates[s], ART.bread('toast'));
  Sound.place();
  pose('ing');
}
function tapPan(i, node) {
  const p = G.pan[i];
  if (!p) return setTrash(false);
  const st = eggSt(p);
  if (st === 'burnt') { G.pan[i] = null; return dump(node, null); }
  if (G.trash) { G.pan[i] = null; return dump(node, st === 'cooking' ? null : 'waste'); }
  if (st === 'cooking') return nope(node, T('tEggRaw'));
  const j = targetPlate('trung');
  if (j < 0) return nope(node, G.plates.some(Boolean) ? T('tNoFit', { ing: N(INGS.trung.name).toLowerCase() }) : T('tBakeFirst'));
  G.pan[i] = null;
  putOnPlate(j, 'trung', node, ART.egg('ready'));
}
function addIng(k, node) {
  const j = targetPlate(k);
  if (j < 0) return nope(node, G.plates.some(Boolean) ? T('tNoFit', { ing: N(INGS[k].name).toLowerCase() }) : T('tBakeFirst'));
  putOnPlate(j, k, node, ART.ing(k));
}
function addLemon(node) {
  const C = G.cups, ok = c => c && c.fill >= 1 && !c.lemon;
  const j = G.sel && G.sel.type === 'cup' && ok(C[G.sel.i]) ? G.sel.i : C.findIndex(ok);
  if (j < 0) return nope(node, T('tPourFirst'));
  C[j].lemon = true;
  fly(node, el.cups[j], ART.ing('chanh'));
  Sound.place();
  pose('ing');
}
function pourTea(node) {
  const j = G.cups.findIndex(c => !c);
  if (j < 0) return nope(node, T('tNoCupSpot'));
  G.cups[j] = { fill: 0, lemon: false };
  Sound.pour();
  pose('pour');
}
function tapPlate(i, node) {
  const p = G.plates[i];
  if (G.trash) { if (p) { G.plates[i] = null; clearSel('plate', i); dump(node, 'waste'); } else setTrash(false); return; }
  const rid = plateRecipe(p);
  if (rid && serve(rid, node)) { G.plates[i] = null; clearSel('plate', i); return; }
  if (rid) toast(T('tNoOrder', { dish: N(RECIPES[rid].name).toLowerCase() }));
  toggleSel('plate', i);
}
function tapCup(i, node) {
  const c = G.cups[i];
  if (G.trash) { if (c) { G.cups[i] = null; clearSel('cup', i); dump(node, 'waste'); } else setTrash(false); return; }
  if (!c) return;
  if (c.fill < 1) return nope(node, T('tPouring'));
  const rid = cupRecipe(c);
  if (rid && serve(rid, node)) { G.cups[i] = null; clearSel('cup', i); return; }
  if (rid) toast(T('tNoOrder', { dish: N(RECIPES[rid].name).toLowerCase() }));
  toggleSel('cup', i);
}
function act(a, i, k, node) {
  if (!G || !G.running || G.paused) return;
  if (G.trash && !['plate', 'cup', 'grill', 'pan', 'trash'].includes(a)) setTrash(false);
  switch (a) {
    case 'trash': setTrash(!G.trash); Sound.tap(); break;
    case 'basket': {
      const j = G.grill.findIndex(g => !g);
      if (j < 0) return nope(node, T('tGrillFull'));
      G.grill[j] = { t: 0 }; Sound.place(); pose('grill'); break;
    }
    case 'egg': {
      const j = G.pan.findIndex(p => !p);
      if (j < 0) return nope(node, T('tPanFull'));
      G.pan[j] = { t: 0 }; Sound.place(); pose('grill'); break;
    }
    case 'grill': tapGrill(i, node); break;
    case 'pan': tapPan(i, node); break;
    case 'ing': addIng(k, node); break;
    case 'chanh': addLemon(node); break;
    case 'jug': pourTea(node); break;
    case 'plate': tapPlate(i, node); break;
    case 'cup': tapCup(i, node); break;
  }
}

/* ---------- Vẽ mỗi khung hình ---------- */
function drawHud() {
  const t = Math.max(0, Math.ceil(G.time));
  const txt = Math.floor(t / 60) + ':' + String(t % 60).padStart(2, '0');
  if (el.timer.textContent !== txt) el.timer.textContent = txt;
  el.timer.classList.toggle('hurry', G.running && t <= 15);
}
function drawScore() {
  el.score.textContent = T('hudScore', { s: G.score, b: Math.max(prog.best, G.score) });
  const L = scoreLevel(G.score);
  el.bar.style.width = Math.min(100, (G.score - L.from) / (L.to - L.from) * 100) + '%';
}
function drawCustomers() {
  G.customers.forEach((c, i) => {
    if (!c || c.leaving) return;
    const r = Math.max(0, c.pat / c.max), box = el.custSlots[i];
    const bar = box.querySelector('.pbar i');
    if (bar) { bar.style.width = (r * 100).toFixed(1) + '%'; bar.className = r < .2 ? 'low' : r < .45 ? 'mid' : ''; }
    const mood = r < .2 ? 'angry' : r < .45 ? 'worried' : 'normal';
    if (mood !== c.mood) { c.mood = mood; box.querySelector('.body').innerHTML = ART.customer(c.look, mood); }
  });
}
function drawCookers(list, nodes, stFn, art, times) {
  list.forEach((item, i) => {
    const s = nodes[i], st = item ? stFn(item) : 'empty';
    if (item && st === 'burnt' && !item.burnt) {      // vừa cháy → trừ điểm 1 lần
      item.burnt = true;
      G.burnt++;
      Sound.burn();
      penalty('burnt', s);
      pose('sad');
    }
    if (s._k !== st) {
      s._k = st; s.dataset.state = st;
      s.innerHTML = st === 'empty' ? '' : art(st) + '<span class="ring"></span><span class="smoke"></span>';
    }
    if (item) s.style.setProperty('--p', ringP(item.t, times[0], times[1], times[2], st));
  });
}
const breadArt = st => ART.bread(st === 'cooking' ? 'raw' : st === 'burnt' ? 'burnt' : 'toast');
function drawCounter() {
  const want = openOrders();
  G.plates.forEach((p, i) => {
    const s = el.plates[i], k = p ? 'p' + p.ings.slice().sort().join(',') : 'e';
    if (s._k !== k) { s._k = k; s._food.innerHTML = p ? ART.bread('toast', p.ings) : ''; }
    const rid = plateRecipe(p);
    s.classList.toggle('ready', !!rid && want.includes(rid));
    s.classList.toggle('sel', !!G.sel && G.sel.type === 'plate' && G.sel.i === i);
  });
  G.cups.forEach((c, i) => {
    const s = el.cups[i], k = c ? Math.round(c.fill * 12) + (c.lemon ? 'L' : '') : 'e';
    if (s._k !== k) { s._k = k; s.innerHTML = c ? ART.cup(c.fill, c.lemon) : ''; }
    const rid = cupRecipe(c);
    s.classList.toggle('ready', !!rid && want.includes(rid));
    s.classList.toggle('sel', !!G.sel && G.sel.type === 'cup' && G.sel.i === i);
  });
}
function drawFrame() {
  drawHud();
  drawCustomers();
  drawCookers(G.grill, el.grill, breadSt, breadArt, [COOK.bread, COOK.breadWarn, COOK.breadBurn]);
  drawCookers(G.pan, el.pan, eggSt, ART.egg, [COOK.egg, COOK.eggWarn, COOK.eggBurn]);
  drawCounter();
}

/* ---------- Vòng lặp ---------- */
let last = performance.now();
function update(dt) {
  G.time -= dt;
  checkLevel();
  if (G.time > 4) {                       // 4 giây cuối không có khách mới
    G.spawnT -= dt;
    if (G.spawnT <= 0) {
      const [a, b] = GAME.spawn(G.level);
      G.spawnT = spawnCustomer() ? rand(a, b) : .4;
    }
  }
  G.customers.forEach((c, i) => { if (c && !c.leaving && (c.pat -= dt) <= 0) leave(i, false); });
  G.grill.forEach(g => { if (g) g.t += dt; });
  G.pan.forEach(p => { if (p) p.t += dt; });
  G.cups.forEach(c => { if (c && c.fill < 1) c.fill = Math.min(1, c.fill + dt / COOK.pour); });
  drawFrame();
  if (G.time <= 0) endGame();
}
function loop(now) {
  const dt = Math.min(.05, (now - last) / 1000);
  last = now;
  if (G && G.running && !G.paused) update(dt);
  requestAnimationFrame(loop);
}

/* ---------- Bắt đầu / kết thúc lượt ---------- */
function applyLocks(recipes) {
  const used = new Set(foodsOf(recipes).flatMap(r => RECIPES[r].ings));
  if (recipes.includes('trachanh')) used.add('chanh');
  $$('[data-k]', stage).forEach(t => { const off = !used.has(t.dataset.k); t.classList.toggle('locked', off); t.disabled = off; });
  const egg = used.has('trung');
  el.panBox.classList.toggle('locked', !egg);
  el.pan.forEach(p => { p.disabled = !egg; });
  el.board.innerHTML = `<b>${T('board')}</b>` +
    recipes.map(r => `<span><i>${N(RECIPES[r].short)}</i><em>${RECIPES[r].price}</em></span>`).join('');
}
function clearBoard() {
  el.customers.innerHTML = '';
  el.custSlots = [];
  el.plates.forEach(p => { p._k = null; p._food.innerHTML = ''; p.classList.remove('ready', 'sel'); });
  [...el.cups, ...el.grill, ...el.pan].forEach(s => {
    s._k = null; s.innerHTML = ''; s.removeAttribute('data-state'); s.classList.remove('ready', 'sel');
  });
  el.fx.innerHTML = '';
  el.trash.classList.remove('armed');
  stage.classList.remove('trashing');
}
function newGame() {
  G = {
    time: GAME.duration, score: 0, level: 1, recipes: recipesFor(1), fresh: [], freshUntil: GAME.duration,
    slots: GAME.slots(1), served: 0, lost: 0, wrong: 0, burnt: 0, penalties: 0, combo: 0, comboMax: 0,
    customers: [null, null, null, null], plates: [null, null, null], cups: [null, null],
    grill: [null, null], pan: [null, null], sel: null, trash: false,
    spawnT: .6, running: false, paused: false, token: {},
  };
  clearBoard();
  el.customers.innerHTML = [0, 1, 2, 3].map(j => `<div class="cust" data-i="${j}" hidden></div>`).join('');
  el.custSlots = $$('.cust', el.customers);
  layoutSlots();
  applyLocks(G.recipes);
  el.hudLevel.textContent = T('hudLevel', { n: 1 });
  drawScore();
  drawFrame();
}
function begin() {
  if (!G) newGame();
  hideOverlays();
  G.running = true;
  G.paused = false;
  last = performance.now();
}
function endGame() {
  G.running = false;
  G.time = 0;
  drawHud();
  setTrash(false);
  clearTimeout(toastTimer);
  el.toast.classList.remove('show');
  const oldBest = prog.best, record = G.score > oldBest;
  if (record) prog.best = G.score;
  prog.games = (prog.games || 0) + 1;
  save();
  renderVendor();
  setTimeout(Sound.win, 200);
  showResult(record, oldBest);
}
