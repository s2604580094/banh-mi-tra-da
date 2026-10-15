/* ui.js — các màn hình (menu, giới thiệu, kết quả, tạm dừng), tạo nhân vật, điều khiển và khởi động game */
'use strict';

const show = id => $$('.overlay').forEach(o => { o.hidden = o.id !== id; });
const hideOverlays = () => $$('.overlay').forEach(o => { o.hidden = true; });
const fmtTime = t => Math.floor(t / 60) + ':' + String(t % 60).padStart(2, '0');

/* ---------- Nhân vật chủ quán ---------- */
const charCfg = () => ({ ...VENDOR.DEF, ...(prog.char || {}) });
const charName = () => (prog.char && prog.char.name) || T('defName');

function renderVendor() {
  el.vendor.innerHTML = VENDOR.draw(charCfg(), 'gv');
  el.vName.textContent = charName();
  el.vRank.textContent = T('rank' + VENDOR.rank(prog.best)) + '\n' + T('plateBest', { n: prog.best });
}

let draft = null;   // bản nháp khi đang chỉnh nhân vật
function openCreator() {
  draft = { ...charCfg(), name: charName() };
  $('#charName').value = draft.name;
  renderCreator();
  show('creator');
}
function chip(field, id, label, need) {
  const locked = need > prog.best;
  return `<button type="button" class="chip${locked ? ' lockd' : ''}" data-ui="opt" data-f="${field}" data-v="${id}" data-need="${need}" aria-pressed="${draft[field] === id}">` +
    `${label}${locked ? `<small>${need}</small>` : ''}</button>`;
}
function swatch(field, col) {
  return `<button type="button" class="sw" data-ui="opt" data-f="${field}" data-v="${col}" data-need="0" style="--sw:${col}" aria-pressed="${draft[field] === col}" aria-label="${col}"></button>`;
}
const optRow = (label, items) => `<div class="cr-row"><span>${label}</span><div class="cr-items">${items.join('')}</div></div>`;
function renderCreator() {
  const O = VENDOR.OPTS;
  $('#charPreview').innerHTML = VENDOR.draw(draft, 'pv');
  $('#charStars').textContent = T('bestHave', { n: prog.best });
  $('#charOpts').innerHTML =
    optRow(T('optHair'), O.hairs.map(h => chip('hair', h, T('hair_' + h), 0))) +
    optRow(T('optHairColor'), O.hairColors.map(c => swatch('hairColor', c))) +
    optRow(T('optSkin'), O.skins.map(c => swatch('skin', c))) +
    optRow(T('optOutfit'), O.outfits.map(o => chip('outfit', o.id, T('outfit_' + o.id), o.need))) +
    optRow(T('optColor'), O.colors.map(c => swatch('color', c))) +
    optRow(T('optHat'), O.hats.map(o => chip('hat', o.id, T('hat_' + o.id), o.need)));
}
function pickOpt(b) {
  const need = Number(b.dataset.need);
  if (need > prog.best) { shake(b); toast(T('needScore', { n: need })); return; }
  draft[b.dataset.f] = b.dataset.v;
  renderCreator();
  pose('wave', $('#charPreview'));
}
function saveChar() {
  const name = $('#charName').value.trim().slice(0, 12);
  prog.char = { ...draft, name: name || T('defName') };
  save();
  renderVendor();
  toMenu();
}

/* ---------- Menu ---------- */
function renderMenu() {
  $('#menuBest').textContent = T('bestLine', { n: prog.best });
  $('#btnSound').textContent = T(prog.muted ? 'soundOff' : 'soundOn');
  $$('[data-lang]').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.lang === Lang.get())));
}
function toMenu() {
  G = null;
  clearBoard();
  applyLocks(Object.keys(RECIPES));
  el.hudLevel.textContent = T('hudLevel', { n: 1 });
  el.score.textContent = T('hudScore', { s: 0, b: prog.best });
  el.bar.style.width = '0%';
  el.timer.textContent = fmtTime(GAME.duration);
  el.timer.classList.remove('hurry');
  renderMenu();
  show('menu');
}
// tên khay nguyên liệu lấy từ data.js nên cập nhật riêng khi đổi ngôn ngữ
function relabel() {
  $$('.tray[data-k]').forEach(t => { t.querySelector('.lb').textContent = N(INGS[t.dataset.k].name); });
}
function setLang(l) {
  prog.lang = l;
  save();
  Lang.set(l);
  relabel();
  renderVendor();
  toMenu();
}

/* ---------- Giới thiệu lượt chơi ---------- */
function recipeRow(r) {
  const R = RECIPES[r], food = R.type === 'food';
  const icon = food ? ART.bread('toast', R.ings) : ART.cup(1, R.lemon);
  const parts = food ? [T('toasted'), ...R.ings.map(k => N(INGS[k].name))]
    : R.lemon ? [N(RECIPES.trada.name), N(INGS.chanh.name)] : [T('pourFromJug')];
  return `<li><span class="ri ${R.type}">${icon}</span>` +
    `<span class="rt"><b>${N(R.name)}</b><small>${parts.join(' + ')}</small></span>` +
    `<span class="rp">+${R.price}</span></li>`;
}
function showIntro() {
  newGame();
  const P = GAME.penalty;
  const pen = (k, n) => `<li><span>${T(k)}</span><b>−${n}</b></li>`;
  $('#introBody').innerHTML =
    `<p class="eyebrow">${T('introEyebrow')}</p><h2>${T('introTitle')}</h2><p class="sub">${T('introSub')}</p>` +
    `<p class="eyebrow">${T('startMenu')}</p><ul class="menu-list">${G.recipes.map(recipeRow).join('')}</ul>` +
    `<p class="eyebrow">${T('penaltyTitle')}</p><ul class="pen-list">` +
    pen('penLeave', P.leave) + pen('penWrong', P.wrong) + pen('penBurnt', P.burnt) + pen('penWaste', P.waste) + '</ul>';
  show('intro');
}

/* ---------- Kết quả ---------- */
// trang phục / mũ vừa mở khóa khi kỷ lục tăng từ a lên b
function unlockedBetween(a, b) {
  const O = VENDOR.OPTS;
  return [...O.outfits.map(o => ({ ...o, k: 'outfit_' + o.id })), ...O.hats.map(o => ({ ...o, k: 'hat_' + o.id }))]
    .filter(o => o.need > a && o.need <= b).map(o => T(o.k));
}
function showResult(record, oldBest) {
  const items = record ? unlockedBetween(oldBest, prog.best) : [];
  const stat = (k, v) => `<dt>${T(k)}</dt><dd>${v}</dd>`;
  $('#resultBody').innerHTML =
    `<p class="eyebrow">${T('rEyebrow')}</p><h2>${T(record ? 'rRecord' : 'rDone')}</h2>` +
    `<p class="big-score">${T('rScore', { n: G.score })}</p>` +
    (items.length ? `<p class="unlock">${T('unlocked', { items: items.join(', ') })}</p>` : '') +
    '<dl class="stats">' +
    stat('sBest', prog.best) + stat('sLevel', G.level) + stat('sHappy', G.served) + stat('sLeft', G.lost) +
    stat('sWrong', G.wrong) + stat('sBurnt', G.burnt) + stat('sPenalty', '−' + G.penalties) + stat('sCombo', 'x' + G.comboMax) +
    '</dl>' +
    `<button type="button" class="btn" data-ui="retry">${T('retry')}</button>` +
    `<button type="button" class="btn ghost" data-ui="menu">${T('toMenu')}</button>`;
  show('result');
}

/* ---------- Tạm dừng ---------- */
function pause() {
  if (!G || !G.running || G.paused) return;
  G.paused = true;
  show('pause');
}
function resume() {
  if (!G) return;
  G.paused = false;
  hideOverlays();
  last = performance.now();
}

/* ---------- Điều khiển ---------- */
function onPress(e) {
  const t = e.target.closest('[data-act]');
  if (!t || t.disabled) return;
  if (e.type === 'click' && e.detail !== 0) return;        // chạm/chuột đã xử lý ở pointerdown
  if (e.type === 'pointerdown') { if (e.button > 0) return; e.preventDefault(); }
  Sound.unlock();
  t.classList.add('hit');
  setTimeout(() => t.classList.remove('hit'), 110);
  act(t.dataset.act, Number(t.dataset.i), t.dataset.k, t);
}
stage.addEventListener('pointerdown', onPress);
stage.addEventListener('click', onPress);                   // bàn phím: Enter / Space

stage.addEventListener('click', e => {
  const b = e.target.closest('[data-ui]');
  if (!b || b.disabled) return;
  Sound.unlock();
  Sound.tap();
  switch (b.dataset.ui) {
    case 'start': showIntro(); break;
    case 'go': begin(); break;
    case 'pause': pause(); break;
    case 'resume': resume(); break;
    case 'retry': newGame(); begin(); break;
    case 'menu': toMenu(); break;
    case 'help': show('help'); break;
    case 'sound': prog.muted = !prog.muted; save(); renderMenu(); break;
    case 'lang': setLang(b.dataset.lang); break;
    case 'creator': openCreator(); break;
    case 'opt': pickOpt(b); break;
    case 'wave': pose('wave', b); break;
    case 'saveChar': saveChar(); break;
  }
});
document.addEventListener('visibilitychange', () => { if (document.hidden) pause(); });
document.addEventListener('keydown', e => {
  if (e.key !== 'Escape') return;
  if (G && G.paused) resume(); else pause();
});
window.addEventListener('resize', fit);

/* ---------- Khởi động ---------- */
el.plates.forEach(p => { p._food = p.querySelector('.pfood'); });
$('#basket .ic').innerHTML = ART.basket();
$('#jug .ic').innerHTML = ART.jug();
$('#trash .ic').innerHTML = ART.trash();
$$('[data-k]', stage).forEach(t => { t.querySelector('.ic').innerHTML = ART.ing(t.dataset.k); });
[...$$('[data-k]', stage), el.panBox].forEach(t => t.insertAdjacentHTML('beforeend', `<span class="lockic">${ART.lock()}</span>`));

Lang.set(prog.lang);
relabel();
renderVendor();
fit();
toMenu();
if (!prog.char) openCreator();      // lần đầu chơi: tạo nhân vật trước
requestAnimationFrame(loop);
