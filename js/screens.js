/* screens.js — các màn hình: menu, hướng dẫn, phòng chờ, tạo nhân vật, tạm dừng, kết quả; khởi động game */
'use strict';

let lobbyCode = '';
const show = id => $$('.overlay').forEach(o => { o.hidden = o.id !== id; });
const hideOverlays = () => $$('.overlay').forEach(o => { o.hidden = true; });

/* ---------- Menu ---------- */
function toMenu() {
  mode = null; playing = false; paused = false; finished = false; local = null; me = 'h';
  menuBackdrop();
  renderMenu();
  show('menu');
}
// nền menu / phòng chờ: quán còn trống (bản đồ của chế độ đang chọn), nhân vật của mình đứng giữa bếp
function menuBackdrop() {
  applyMode(GMODE);
  ENG.create([{ pid: 'h', name: charName(), cfg: charCfg(), slot: 0, team: 0 }]);
  V = ENG.S;
  Object.assign(V.players.h, { x: 5.5, y: 6.6, dir: 0 });
  disp = {};
}
const neg = n => n ? '−' + n : '0';   // điểm bị trừ: 0 thì không ghi dấu trừ

function setGMode(m) {
  prog.gmode = m === 'versus' ? 'versus' : 'coop'; save();
  if (mode === 'host') { GMODE = prog.gmode; menuBackdrop(); sendLobby(); renderLobby(); return; }
  GMODE = prog.gmode;
  toMenu();
}
function renderMenu() {
  $$('[data-gm]').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.gm === GMODE)));
  $('#modeDesc').textContent = T(GMODE === 'versus' ? 'modeVsDesc' : 'modeCoopDesc');
  $('#btnSolo').textContent = T(GMODE === 'versus' ? 'soloVs' : 'solo');
  $('#menuBest').textContent = GMODE === 'versus' ? T('vsWinsLine', { n: prog.vsWins }) : T('bestLine', { n: prog.best });
  $('#btnSound').textContent = T(prog.muted ? 'soundOff' : 'soundOn');
  $$('[data-lang]').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.lang === Lang.get())));
}
function setLang(l) {
  prog.lang = l; save();
  Lang.set(l);
  if (mode === null) toMenu(); else renderLobby();
}
function showMsg(text, busy) {
  $('#msgText').textContent = text;
  $('#msgOk').hidden = !!busy;
  show('msg');
}

/* ---------- Chơi 1 mình: màn giới thiệu luật ---------- */
const kbd = k => `<kbd>${k}</kbd>`;
const krow = (keysHTML, label) => `<div class="krow"><span>${keysHTML}</span><em>${label}</em></div>`;
function rulesVS() {
  const P = VS.penalty, pen = (k, n) => `<li><span>${T(k)}</span><b>−${n}</b></li>`;
  const feat = (icon, k) => `<li><span class="fi">${icon}</span><span>${T(k)}</span></li>`;
  return `<p class="sub">${T('vsIntroSub')}</p>` +
    `<div class="keys"><p class="eyebrow">${T('ctrlTitle')}</p>` +
    krow(`${kbd('W')}${kbd('A')}${kbd('S')}${kbd('D')} / ${kbd('↑')}${kbd('←')}${kbd('↓')}${kbd('→')}`, T('ctrlMove')) +
    krow(`${kbd('Space')} / ${kbd('J')}`, T('ctrlPick')) +
    krow(`${kbd('E')} / ${kbd('K')}`, T('ctrlUse')) +
    krow(T('ctrlChop'), kbd('E')) +
    `<p class="sub">${T('ctrlTouchVs')}</p></div>` +
    `<p class="eyebrow">${T('vsFeatures')}</p><ul class="feat-list">` +
    feat(ART.ing('bo'), 'featMarket') + feat(ART.board(), 'featChop') + feat(ART.peel(), 'featPeel') +
    feat(ART.bell(true), 'featBell') + feat('<b class="rush">!</b>', 'featRush') + '</ul>' +
    `<p class="eyebrow">${T('penaltyTitle')}</p><ul class="pen-list">` +
    pen('penWrong', P.wrong) + pen('penBurnt', P.burnt) + pen('penWaste', P.waste) + '</ul>';
}
function rulesHTML() {
  if (GMODE === 'versus') return rulesVS();
  const P = GAME.penalty, pen = (k, n) => `<li><span>${T(k)}</span><b>−${n}</b></li>`;
  return `<p class="sub">${T('introSub')}</p>` +
    `<div class="keys"><p class="eyebrow">${T('ctrlTitle')}</p>` +
    `<div class="krow"><span><kbd>W</kbd><kbd>A</kbd><kbd>S</kbd><kbd>D</kbd> / <kbd>↑</kbd><kbd>←</kbd><kbd>↓</kbd><kbd>→</kbd></span><em>${T('ctrlMove')}</em></div>` +
    `<div class="krow"><span><kbd>Space</kbd> / <kbd>E</kbd></span><em>${T('ctrlAct')}</em></div>` +
    `<div class="krow"><span>${T('ctrlWash')}</span><em><kbd>Space</kbd> / <kbd>E</kbd></em></div>` +
    `<div class="krow"><span><kbd>Esc</kbd></span><em>${T('ctrlPause')}</em></div>` +
    `<p class="sub">${T('ctrlTouch')}</p></div>` +
    `<p class="eyebrow">${T('penaltyTitle')}</p><ul class="pen-list">` +
    pen('penLeave', P.leave) + pen('penWrong', P.wrong) + pen('penBurnt', P.burnt) + pen('penWaste', P.waste) + '</ul>';
}
function startSolo() {
  mode = 'solo'; me = 'h';
  roster = [{ pid: 'h', name: charName(), cfg: cleanCfg(charCfg()), slot: 0, team: 0 }];
  $('#introBody').innerHTML = `<h2>${T(GMODE === 'versus' ? 'vsPracticeTitle' : 'introTitle')}</h2>` + rulesHTML();
  show('intro');
}

/* ---------- Phòng chờ ---------- */
function showLobby() { show('lobby'); renderLobby(); }
function renderLobby() {
  if ($('#lobby').hidden) return;
  const code = mode === 'host' && room ? room.code : lobbyCode;
  $('#lobbyCode').textContent = code || '·····';
  const tags = r => (r.pid === me ? `<em>${T('you')}</em>` : '') + (r.pid === 'h' ? `<em class="host">${T('hostTag')}</em>` : '');
  $$('[data-rm]').forEach(b => { b.setAttribute('aria-pressed', String(b.dataset.rm === GMODE)); b.disabled = mode !== 'host'; });
  if (GMODE === 'versus') {
    // chia 2 đội, mỗi đội tối đa 2 người
    $('#lobbyList').innerHTML = [0, 1].map(tm => {
      const list = roster.filter(r => r.team === tm);
      const rows = [0, 1].map(i => {
        const r = list[i];
        if (!r) return `<li class="empty"><i style="--pc:${TEAMCOL[tm]}"></i><span>—</span></li>`;
        return `<li><i style="--pc:${TEAMCOL[tm]}"></i><span>${esc(r.name)}</span>${tags(r)}</li>`;
      }).join('');
      return `<li class="team-head" style="--pc:${TEAMCOL[tm]}">${T('team' + tm)}</li>${rows}`;
    }).join('');
    const mine = roster.find(r => r.pid === me);
    $('#btnTeam').hidden = !mine;
    const n0 = roster.filter(r => r.team === 0).length, n1 = roster.filter(r => r.team === 1).length;
    $('#lobbyNote').textContent = !n0 || !n1 ? T('vsPracticeNote') : n0 !== n1 ? T('vsBoostNote') : '';
  } else {
    $('#lobbyList').innerHTML = [0, 1, 2, 3].map(s => {
      const r = roster.find(x => x.slot === s);
      if (!r) return `<li class="empty"><i style="--pc:${PCOL[s]}"></i><span>—</span></li>`;
      return `<li><i style="--pc:${PCOL[s]}"></i><span>${esc(r.name)}</span>${tags(r)}</li>`;
    }).join('');
    $('#btnTeam').hidden = true;
    $('#lobbyNote').textContent = '';
  }
  $('#lobbyRules').innerHTML = rulesHTML();
  $('#btnStartRoom').hidden = mode !== 'host';
  $('#lobbyWait').hidden = mode === 'host';
}
function requestTeamSwitch() {
  if (mode === 'host') switchTeam('h');
  else if (room) room.send({ t: 'team' });
}
function copyCode() {
  const code = $('#lobbyCode').textContent;
  const done = () => toast(T('copied'));
  if (navigator.clipboard) navigator.clipboard.writeText(code).then(done, () => selectCode());
  else selectCode();
}
function selectCode() {
  const r = document.createRange(); r.selectNodeContents($('#lobbyCode'));
  const s = getSelection(); s.removeAllRanges(); s.addRange(r);
}

/* ---------- Tạm dừng ---------- */
function togglePause() {
  if (!playing) return;
  if (!$('#pause').hidden) { paused = false; hideOverlays(); return; }
  paused = mode === 'solo';
  $('#btnPauseRetry').hidden = mode !== 'solo';
  show('pause');
}

/* ---------- Kết quả ---------- */
function unlockedBetween(a, b) {
  const O = CHAR.OPTS;
  return [...O.outfits.map(o => ({ ...o, k: 'outfit_' + o.id })), ...O.hats.map(o => ({ ...o, k: 'hat_' + o.id }))]
    .filter(o => o.need > a && o.need <= b).map(o => T(o.k));
}
function showResult(r, record, oldBest) {
  const items = record ? unlockedBetween(oldBest, prog.best) : [];
  const stat = (k, v) => `<dt>${T(k)}</dt><dd>${v}</dd>`;
  let buttons;
  if (mode === 'host') buttons = `<button type="button" class="btn" data-ui="startRoom">${T('retryRoom')}</button><button type="button" class="btn ghost" data-ui="leave">${T('leave')}</button>`;
  else if (mode === 'client') buttons = `<p class="sub center">${T('waitHost')}</p><button type="button" class="btn ghost" data-ui="leave">${T('leave')}</button>`;
  else buttons = `<button type="button" class="btn" data-ui="go">${T('retry')}</button><button type="button" class="btn ghost" data-ui="menu">${T('toMenu')}</button>`;
  $('#resultBody').innerHTML =
    `<p class="eyebrow">${T('rEyebrow')}</p><h2>${T(record ? 'rRecord' : 'rDone')}</h2>` +
    `<p class="big-score">${T('rScore', { n: r.score })}</p>` +
    (items.length ? `<p class="unlock">${esc(T('unlocked', { items: items.join(', ') }))}</p>` : '') +
    '<dl class="stats">' +
    stat('sBest', prog.best) + stat('sLevel', r.level) + stat('sHappy', r.served) + stat('sLeft', r.lost) +
    stat('sWrong', r.wrong) + stat('sBurnt', r.burnt) + stat('sWashed', r.washed) + stat('sPenalty', neg(r.penalties)) + stat('sCombo', 'x' + r.comboMax) +
    '</dl>' + buttons;
  show('result');
}

// kết quả Bếp Chiến: đội thắng, điểm 2 đội, thống kê
function showResultVS(r, myTeam) {
  const A = r.teams[0], B = r.teams[1];
  const head = r.practice ? T('vsPracticeDone') : r.winner === -1 ? T('vsDraw') : T('vsWin', { team: T('team' + r.winner) });
  const sub = r.practice ? '' : r.winner === myTeam ? T('vsYouWin') : r.winner === -1 ? '' : T('vsYouLose');
  const row = (k, a, b) => `<tr><th>${T(k)}</th><td>${a}</td><td>${b}</td></tr>`;
  let buttons;
  if (mode === 'host') buttons = `<button type="button" class="btn" data-ui="startRoom">${T('retryRoom')}</button><button type="button" class="btn ghost" data-ui="leave">${T('leave')}</button>`;
  else if (mode === 'client') buttons = `<p class="sub center">${T('waitHost')}</p><button type="button" class="btn ghost" data-ui="leave">${T('leave')}</button>`;
  else buttons = `<button type="button" class="btn" data-ui="go">${T('retry')}</button><button type="button" class="btn ghost" data-ui="menu">${T('toMenu')}</button>`;
  $('#resultBody').innerHTML =
    `<p class="eyebrow">${T('rEyebrow')}</p><h2>${esc(head)}</h2>` + (sub ? `<p class="sub center">${esc(sub)}</p>` : '') +
    `<div class="vs-score"><span style="--pc:${TEAMCOL[0]}"><small>${T('team0')}</small><b>${A.score}</b></span><i>:</i>` +
    `<span style="--pc:${TEAMCOL[1]}"><small>${T('team1')}</small><b>${B.score}</b></span></div>` +
    `<table class="vs-stats"><thead><tr><th></th><td style="color:${TEAMCOL[0]}">●</td><td style="color:${TEAMCOL[1]}">●</td></tr></thead><tbody>` +
    row('sHappy', A.served, B.served) + row('sVip', A.vip, B.vip) + row('sRare', A.rare, B.rare) + row('sTricks', A.tricks, B.tricks) +
    row('sSlips', A.slips, B.slips) + row('sWrong', A.wrong, B.wrong) + row('sBurnt', A.burnt, B.burnt) + row('sPenalty', neg(A.penalties), neg(B.penalties)) +
    '</tbody></table>' + `<p class="sub center">${T('vsWinsLine', { n: prog.vsWins })}</p>` + buttons;
  show('result');
}

/* ---------- Tạo nhân vật ---------- */
let draft = null, pvDir = 0;
const PV_DIRS = [0, 2, 3, 1];
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
const swatch = (field, col) => `<button type="button" class="sw" data-ui="opt" data-f="${field}" data-v="${col}" data-need="0" style="--sw:${col}" aria-pressed="${draft[field] === col}" aria-label="${col}"></button>`;
const optRow = (label, items) => `<div class="cr-row"><span>${label}</span><div class="cr-items">${items.join('')}</div></div>`;
function renderCreator() {
  const O = CHAR.OPTS;
  $('#charStars').textContent = T('bestHave', { n: prog.best });
  $('#charOpts').innerHTML =
    optRow(T('optBody'), O.bodies.map(b => chip('body', b, T('body_' + b), 0))) +
    optRow(T('optHair'), O.hairs.map(h => chip('hair', h, T('hair_' + h), 0))) +
    optRow(T('optHairColor'), O.hairColors.map(c => swatch('hairColor', c))) +
    optRow(T('optSkin'), O.skins.map(c => swatch('skin', c))) +
    optRow(T('optOutfit'), O.outfits.map(o => chip('outfit', o.id, T('outfit_' + o.id), o.need))) +
    optRow(T('optColor'), O.colors.map(c => swatch('color', c))) +
    optRow(T('optHat'), O.hats.map(o => chip('hat', o.id, T('hat_' + o.id), o.need)));
}
function pickOpt(b) {
  const need = Number(b.dataset.need);
  if (need > prog.best) { toast(T('needScore', { n: need })); return; }
  draft[b.dataset.f] = b.dataset.v;
  renderCreator();
}
function saveChar() {
  const name = $('#charName').value.trim().slice(0, 12);
  prog.char = { ...cleanCfg(draft), name: name || T('defName') };
  save();
  toMenu();
}
function drawPreview(t) {
  if (!draft || $('#creator').hidden) return;
  const c = $('#charPreview'), g = c.getContext('2d'), w = 140, h = 210, r = Math.min(2, window.devicePixelRatio || 1);
  if (c.width !== w * r) { c.width = w * r; c.height = h * r; }
  g.setTransform(r, 0, 0, r, 0, 0);
  g.clearRect(0, 0, w, h);
  CHAR.draw(g, draft, w / 2, h - 16, { dir: PV_DIRS[pvDir], walk: t * 6, t, scale: 2.1 });
}

/* ---------- Nút bấm ---------- */
document.addEventListener('click', e => {
  const b = e.target.closest('[data-ui]');
  if (!b || b.disabled) return;
  Sound.unlock(); Sound.tap();
  switch (b.dataset.ui) {
    case 'solo': startSolo(); break;
    case 'gmode': setGMode(b.dataset.gm); break;
    case 'roomMode': if (mode === 'host') setGMode(b.dataset.rm); break;
    case 'team': requestTeamSwitch(); break;
    case 'go': if (mode === 'solo' || mode === null) { mode = 'solo'; startGame(); } break;
    case 'create': createRoom(); break;
    case 'join': joinRoom($('#joinCode').value); break;
    case 'copy': copyCode(); break;
    case 'startRoom': if (mode === 'host') startGame(); break;
    case 'leave': leaveRoom(); break;
    case 'menu': if (room) leaveRoom(); else toMenu(); break;
    case 'resume': togglePause(); break;
    case 'help': show('help'); break;
    case 'sound': prog.muted = !prog.muted; save(); renderMenu(); break;
    case 'lang': setLang(b.dataset.lang); break;
    case 'creator': openCreator(); break;
    case 'opt': pickOpt(b); break;
    case 'turn': pvDir = (pvDir + 1) % 4; break;
    case 'saveChar': saveChar(); break;
    case 'msgOk': if (room) showLobby(); else toMenu(); break;
  }
});
$('#joinCode').addEventListener('keydown', e => { if (e.key === 'Enter') joinRoom(e.target.value); });
$('#joinCode').addEventListener('input', e => { e.target.value = e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 5); });
addEventListener('beforeunload', () => { if (room) { try { room.close(); } catch (e) { /* bỏ qua */ } } });

/* ---------- Khởi động ---------- */
Lang.set(prog.lang);
fit();
toMenu();
const linkCode = new URLSearchParams(location.search).get('room');
if (linkCode) $('#joinCode').value = linkCode.toUpperCase().slice(0, 5);
if (!prog.char) openCreator();
requestAnimationFrame(frame);
