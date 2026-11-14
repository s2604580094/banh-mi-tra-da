/* bots.js — BOT LUYỆN TẬP cho cả 2 chế độ (Cùng bán và Bếp Chiến, cả 2 bản đồ, cả 3 món).
   Bot là nhân vật do máy điều khiển. Bot chạy trên máy chủ phòng (hoặc khi chơi 1 mình) và thao tác bằng đúng các hàm
   người chơi dùng: ENG.interact (Nhặt/Thả), ENG.use (Tương tác/Ném), giữ nút để thái hoặc rửa bát. Luật như nhau, không ăn gian.
   Mỗi lúc rảnh, bot "nghĩ" ra 1 việc: đi tới đứng cạnh 1 khu, quay mặt vào khu đó rồi bấm nút.
   Bot chỉ đụng vào đồ do chính nó lấy ra (đồ có nhãn bot = mã bot), không lấy đồ của người chơi.
   3 mức: Dễ (đi chậm, nghĩ lâu), Vừa, Khó (nhanh, giành đồ hiếm ở chợ, rung chuông giả, ném vỏ chuối, không bị khách giả lừa). */
const BOTS = (() => {
  const LV = {
    //        tốc độ đi  nghỉ giữa 2 thao tác  kiểm tra lại  chợ    chuông  vỏ chuối  nhận ra khách giả  tránh vỏ chuối
    easy:   { speed: .62, react: [.7, 1.2],   think: .5,  market: 0,  bell: 0,   peel: 0,   fake: 0,  avoid: false },
    normal: { speed: .8,  react: [.32, .55],  think: .3,  market: .6, bell: .3,  peel: .15, fake: .5, avoid: true },
    hard:   { speed: .95, react: [.12, .24],  think: .15, market: 1,  bell: .75, peel: .45, fake: 1,  avoid: true },
  };
  const LEVELS = ['easy', 'normal', 'hard'];
  const NAMES = ['Mai', 'Tùng', 'Lan', 'Khoa', 'Hà', 'Phúc', 'Ngọc', 'Bảo'];
  const rand = (a, b) => a + Math.random() * (b - a);
  const pick = a => a[Math.floor(Math.random() * a.length)];
  const sameSet = (a, b) => a.length === b.length && a.every(x => b.includes(x));
  const isToast = it => !!it && it.k === 'b' && it.s === 'toast';
  const xy = key => key.split(',').map(Number);
  let bots = [], trace = null;                     // trace: mảng ghi lại việc bot làm (chỉ dùng khi kiểm tra)

  /* ---------- Tạo bot (phòng chờ / luyện tập) ---------- */
  // mã bot không trùng người trong phòng; tên lấy theo số thứ tự
  function make(roster, team, slot) {
    let i = 0;
    while (roster.some(r => r.pid === 'bot' + i)) i++;
    const O = CHAR.OPTS;
    const cfg = {
      body: pick(O.bodies), hair: pick(O.hairs), hairColor: pick(O.hairColors), skin: pick(O.skins),
      outfit: pick(['apron', 'baba']), color: pick(O.colors), hat: pick(['none', 'none', 'nonla']),
    };
    return { pid: 'bot' + i, name: 'Bot ' + NAMES[i % NAMES.length], cfg, slot, team, bot: true };
  }

  /* ---------- Bắt đầu / dừng ---------- */
  function start(roster, lv) {
    const L = LV[lv] || LV.normal, S = ENG.S;
    bots = roster.filter(r => r.bot && S && S.players[r.pid]).map(r => {
      const P = S.players[r.pid];
      return {
        pid: r.pid, L, loc: { x: P.x, y: P.y, dir: P.dir, mv: 0 }, goal: null, path: null,
        wait: rand(.5, 1.1), chk: 0, stuck: 0, job: null, chore: null, seen: {}, trick: null, trickT: rand(10, 16), idleHold: 0,
      };
    });
  }
  function stop() { bots = []; }

  /* ---------- Bản đồ: ô đứng, tìm đường ---------- */
  // các ô đứng cạnh khu (x, y), kèm hướng quay mặt vào khu
  function standsOf(x, y) {
    const out = [];
    for (let d = 0; d < 4; d++) {
      const nx = x - DIRV[d][0], ny = y - DIRV[d][1];
      if (isWalk(nx, ny) && canStand(nx + .5, ny + .5)) out.push([nx, ny, d]);
    }
    return out;
  }
  // tìm đường theo ô (BFS). avoid: né ô có vỏ chuối
  function bfs(S, sx, sy, avoid) {
    const W = COLS, N = COLS * ROWS, dist = new Int16Array(N).fill(-1), prev = new Int32Array(N).fill(-1);
    const block = new Set();
    if (avoid && S.floor) S.floor.forEach(f => { if (f.it.k === 'peel') block.add(Math.floor(f.y) * W + Math.floor(f.x)); });
    if (sx < 0 || sy < 0 || sx >= W || sy >= ROWS) return { dist, prev };
    const s0 = sy * W + sx; dist[s0] = 0;
    const q = [s0];
    for (let qi = 0; qi < q.length; qi++) {
      const c = q[qi], cx = c % W, cy = (c - cx) / W;
      for (const [dx, dy] of DIRV) {
        const nx = cx + dx, ny = cy + dy;
        if (nx < 0 || ny < 0 || nx >= W || ny >= ROWS) continue;
        const ni = ny * W + nx;
        if (dist[ni] >= 0 || block.has(ni) || !isWalk(nx, ny)) continue;
        dist[ni] = dist[c] + 1; prev[ni] = c; q.push(ni);
      }
    }
    return { dist, prev };
  }
  function bestStand(R, stands) {
    let best = null, bd = 1e9;
    for (const s of stands) { const d = R.dist[s[1] * COLS + s[0]]; if (d >= 0 && d < bd) { bd = d; best = s; } }
    return best ? { s: best, d: bd } : null;
  }
  // đặt đường đi tới chỗ đứng gần nhất của mục tiêu
  function route(b, S) {
    const g = b.goal, sx = Math.floor(b.loc.x), sy = Math.floor(b.loc.y);
    let R = bfs(S, sx, sy, b.L.avoid), bs = bestStand(R, g.stands);
    if (!bs && b.L.avoid) { R = bfs(S, sx, sy, false); bs = bestStand(R, g.stands); }
    if (!bs) return false;
    const path = [];
    for (let i = bs.s[1] * COLS + bs.s[0]; i >= 0; i = R.prev[i]) path.push([i % COLS, Math.floor(i / COLS)]);
    b.path = path.reverse();
    g.dir = bs.s[2];
    return true;
  }
  function walk(b, dt, mult) {
    const [tx, ty] = b.path[0], cx = tx + .5, cy = ty + .5;
    const dx = cx - b.loc.x, dy = cy - b.loc.y, d = Math.hypot(dx, dy), step = GAME.speed * b.L.speed * mult * dt;
    if (d <= step + 1e-3) {
      b.loc.x = cx; b.loc.y = cy; b.path.shift(); b.stuck = 0;
      b.loc.mv = b.path.length ? 1 : 0;
      return;
    }
    const ox = b.loc.x, oy = b.loc.y;
    movePlayer(b.loc, dx / d, dy / d, dt * b.L.speed * mult);
    if (Math.hypot(b.loc.x - ox, b.loc.y - oy) < step * .3 && (b.stuck += dt) > .6) {
      b.stuck = 0;
      if (!route(b, ENG.S)) b.goal = null;
    }
  }

  /* ---------- Vòng lặp ---------- */
  function update(dt) {
    const S = ENG.S;
    if (!bots.length || !S || S.phase !== 'play') return;
    const vs = S.mode === 'versus';
    for (const b of bots) {
      const P = S.players[b.pid];
      if (!P) continue;
      if (vs && P.stun > 0) {           // trượt vỏ chuối: máy chủ đẩy nhân vật, bot nghĩ lại từ đầu
        b.loc.x = P.x; b.loc.y = P.y; b.path = null; b.goal = null; P.hold = false;
        b.wait = rand(...b.L.react);
        continue;
      }
      if (vs && (b.trickT -= dt) <= 0) {
        b.trickT = rand(12, 20);
        if (S.n[1 - P.team] > 0) b.trick = Math.random() < b.L.bell ? 'bell' : Math.random() < b.L.peel ? 'peel' : null;
      }
      tick(b, P, S, vs, dt);
      P.x = b.loc.x; P.y = b.loc.y; P.dir = b.loc.dir; P.mv = b.loc.mv;
    }
  }
  function tick(b, P, S, vs, dt) {
    if (vs && S.slide) driftBy(b.loc, S.slide, dt);
    const g0 = b.goal;
    // đang giữ nút: thái trên thớt / rửa bát
    if (g0 && g0.holding) {
      b.loc.mv = 0; b.loc.dir = g0.dir; b.loc.x = g0.px; b.loc.y = g0.py;   // đứng yên tại chỗ (kể cả lúc sàn trôi)
      if (!g0.hold() || (g0.t -= dt) <= 0) { P.hold = false; b.goal = null; b.wait = rand(...b.L.react) * .6; }
      else P.hold = true;
      return;
    }
    if (b.wait > 0) { b.wait -= dt; b.loc.mv = 0; return; }
    if (g0 && (b.chk -= dt) <= 0) { b.chk = b.L.think; if (!g0.ok()) b.goal = null; }
    if (!b.goal) {
      b.chore = null; b.side = null;
      const held = P.held;
      b.goal = (vs ? thinkVS : thinkCoop)(b, P, S);
      if (!b.goal) { b.wait = rand(.25, .5); if (trace) trace.push([+(ENG.S.time).toFixed(1), b.pid, 'none', held && (held.k + (held.s || '') + (held.i ? held.i.join('+') : ''))]); return; }
      if (trace) trace.push([+(ENG.S.time).toFixed(1), b.pid, b.goal.act, b.goal.key && tileAt(...xy(b.goal.key)), b.goal.key, held && (held.k + (held.s || '') + (held.i ? held.i.join('+') : '') + (held.w || '')), b.job]);
      b.idleHold = b.goal.act === 'idle' && held ? b.idleHold : 0;
      b.chk = b.L.think;
      if (!route(b, S)) { b.goal = null; b.wait = .4; return; }
    }
    if (b.path && b.path.length) {
      walk(b, dt, vs && S.dark > .5 && b.L !== LV.hard ? .8 : 1);   // mất điện: bot Dễ/Vừa đi chậm lại
      return;
    }
    // tới nơi: quay mặt vào khu rồi thao tác
    const g = b.goal;
    b.loc.mv = 0; b.loc.dir = g.dir;
    P.x = b.loc.x; P.y = b.loc.y; P.dir = g.dir;
    if (!g.ok()) { b.goal = null; return; }
    if (g.act === 'idle') {
      b.goal = null; b.wait = rand(.35, .7);
      if (P.held) b.idleHold += b.wait;
      return;
    }
    if (g.act === 'hold') { g.holding = true; g.t = g.max || 6; g.px = b.loc.x; g.py = b.loc.y; P.hold = true; return; }
    if (g.act === 'use') ENG.use(b.pid, g.key);
    else ENG.interact(b.pid, g.key);
    if (P.held && P.held.bot == null) P.held.bot = b.pid;     // nhãn: đồ này do bot lấy ra
    b.goal = null; b.wait = rand(...b.L.react);
  }

  /* ---------- Công cụ chung khi nghĩ ---------- */
  // các ô có ký tự trong `chars` (đọc qua tileAt nên tính cả khay bị đảo giờ cao điểm); area(x) lọc theo đội
  function scan(test, area) {
    const out = [];
    for (let y = 0; y < ROWS; y++) for (let x = 0; x < COLS; x++) {
      if ((!area || area(x)) && test(tileAt(x, y), x, y)) out.push(keyOf(x, y));
    }
    return out;
  }
  function kit(b, P, S, area) {
    const R = bfs(S, Math.floor(b.loc.x), Math.floor(b.loc.y), false);
    const goal = (key, act, ok, extra) => Object.assign({ key, act: act || 'act', ok: ok || (() => true), stands: standsOf(...xy(key)) }, extra);
    const nearest = gs => {
      let best = null, bd = 1e9;
      gs.forEach(g => { if (!g) return; const s = bestStand(R, g.stands); if (s && s.d < bd) { bd = s.d; best = g; } });
      return best;
    };
    const tiles = chars => scan(ch => chars.includes(ch), area);
    const T = k => S.tiles[k];
    const own = it => !!it && it.bot === b.pid;
    const h = P.held, holding = () => P.held === h;
    const near1 = (chars, ok, act) => nearest(tiles(chars).map(k => goal(k, act, ok)));
    const idleAt = k => (k ? { key: k, act: 'idle', ok: () => true, stands: standsOf(...xy(k)) } : null);
    const emptyOf = chars => nearest(tiles(chars).filter(k => T(k) && !T(k).item).map(k => goal(k, 'act', () => holding() && !T(k).item)));
    const park = () => emptyOf('=');
    const trash = () => near1('X', holding);
    const takenBy = (key, field) => bots.some(o => o !== b && (field ? o[field] === key : o.job === key || o.side === key) &&
      ENG.S.players[o.pid] && ENG.S.players[o.pid].team === P.team);
    // đồ của mình trên lò / chảo đang sắp cháy (bánh đã giòn, đồ đã rán)
    const urgent = () => tiles('GP').filter(k => { const t = T(k); return own(t.item) && t.item.s !== 'burnt' && t.item.s !== 'raw' && t.phase === 'warn'; });
    // ước lượng thời gian đi qua các khu (theo ô, cộng thời gian bấm nút) — để biết có kịp làm thêm việc khác không
    const trip = keys => {
      let [px, py] = [b.loc.x, b.loc.y], n = 0;
      keys.forEach(k => { if (!k) return; const [x, y] = xy(k); n += Math.abs(x + .5 - px) + Math.abs(y + .5 - py); px = x + .5; py = y + .5; });
      return n / (GAME.speed * b.L.speed) + keys.length * (b.L.react[0] + b.L.react[1]) / 2;
    };
    // bánh đang nướng trên lò của mình: còn bao lâu thì bắt đầu khét
    const grillLeft = () => {
      const ts = tiles('G').map(k => T(k)).filter(t => own(t.item) && t.item.s !== 'burnt');
      return ts.length ? Math.min(...ts.map(t => COOK.breadWarn - t.t)) : Infinity;
    };
    return { R, goal, nearest, tiles, T, own, h, holding, near1, idleAt, emptyOf, park, trash, takenBy, urgent, trip, grillLeft };
  }
  // chọn đơn: giữ đơn đang làm nếu còn hợp, không thì lấy đơn tốt nhất chưa bot khác nhận
  function jobFor(b, orders, K, pred, rank) {
    const cur = orders.find(o => o.ck === b.job && pred(o));
    if (cur) return cur;
    const list = orders.filter(o => pred(o) && !K.takenBy(o.ck));
    if (!list.length) return null;
    list.sort((a, c) => rank(c) - rank(a));
    b.job = list[0].ck;
    return list[0];
  }
  const estOf = R => (R.type === 'drink' ? 5 : 8 + R.ings.length * 2.4);
  // điểm ưu tiên 1 món: khách nào đã được mang 1 phần thì làm nốt (Cùng bán: khách đủ món mới trả tiền),
  // món nhanh mà giá trị cao trước, khách sắp hết kiên nhẫn được cộng thêm, không kịp làm thì bỏ
  const baseRank = o => {
    const left = o.c.items.filter(i => !i.done), remT = left.reduce((t, i) => t + estOf(RECIPES[i.id]), 0);
    const value = o.c.items.reduce((v, i) => v + RECIPES[i.id].price, 0) + (o.R.vip ? 25 : 0);
    return value / remT * 10 + (left.length < o.c.items.length ? 30 : 0) + (o.c.pat < 20 ? 5 : 0) - (o.c.pat < remT ? 80 : 0);
  };

  /* ---------- Bếp Chiến ---------- */
  function thinkVS(b, P, S) {
    const team = P.team, f = S.food[team] || 'banhmi', F = FOODS[f], L = b.L;
    const K = kit(b, P, S, x => teamOfX(x) === team);
    const { goal, nearest, tiles, T, own, h, holding, near1, idleAt, emptyOf, park, trash } = K;
    const isCut = g => g === F.roll || F.rare.includes(g);
    const myItems = pred => tiles('GPK=').map(k => T(k) && T(k).item).filter(it => own(it) && pred(it));

    // đơn của khách còn đợi mà đội mình làm được (món cùng loại xe, hoặc đồ uống)
    const orders = [];
    S.custs.forEach(c => {
      if (c.state !== 'wait') return;
      if (c.fake != null) {               // khách giả: của đội mình thì bỏ qua; của đội bạn thì tuỳ bot có nhận ra không
        if (c.fake === team) return;
        if (b.seen[c.id] == null) b.seen[c.id] = Math.random() < L.fake;
        if (b.seen[c.id]) return;
      }
      c.items.forEach((it, i) => {
        if (it.done) return;
        const R = RECIPES[it.id];
        if (R.type === 'food' && (R.food || 'banhmi') !== f) return;
        orders.push({ c, i, id: it.id, R, ck: c.id + ':' + i });
      });
    });
    const live = o => { const c = S.custs.find(k => k.id === o.c.id); return !!c && c.state === 'wait' && !c.items[o.i].done; };
    const dish = it => (isToast(it) ? Object.keys(RECIPES).find(id => S.recipes.includes(id) && RECIPES[id].type === 'food' &&
      (RECIPES[id].food || 'banhmi') === (it.f || 'banhmi') && sameSet(RECIPES[id].ings, it.i)) || null : it && it.k === 'c' && it.f ? (it.l ? 'trachanh' : 'trada') : null);
    const serveTo = o => goal(keyOf(TABLES[o.c.table].x, TABLES[o.c.table].y), 'act', () => live(o) && holding() && dish(P.held) === o.id);
    const atDoor = () => { const dx = team === 0 ? 9 : 15; for (let y = 0; y < ROWS; y++) if (tileAt(dx, y) === ':') return idleAt(keyOf(dx - (team === 0 ? 1 : -1), y)); return null; };
    // nguyên liệu có sẵn ngay: khay nhân, đồ rán đã chín, đồ đã thái
    const binsFor = g => tiles('pquro').filter(k => { const [x, y] = xy(k); return binIng(tileAt(x, y), x) === g; });
    const availNow = g => binsFor(g).length > 0 ||
      (g === F.fry && myItems(it => it.k === 'e' && it.s === 'fried').length > 0) ||
      (isCut(g) && myItems(it => it.k === 'i' && it.g === g && it.cut).length > 0);
    const marketWith = g => Object.keys(S.market).filter(k => S.market[k].it && S.market[k].it.g === g);
    const rareOk = o => !o.R.vip || myItems(it => it.k === 'i' && it.g === o.id).length > 0 || (L.market > 0 && marketWith(o.id).length > 0);
    const rank = o => baseRank(o) + (o.R.type === 'food' && o.R.ings.every(availNow) ? 4 : 0);

    /* ----- đang cầm đồ ----- */
    if (h) {
      if (b.idleHold > 8 && h.k !== 'c') return trash();       // cầm mãi không ai gọi: bỏ đi
      if (h.k === 'peel') {
        if (L.peel > 0 && S.n[1 - team] > 0) {                 // ném vỏ chuối từ cửa mình sang cửa đội bạn
          const dx = team === 0 ? 9 : 15, dir = team === 0 ? 2 : 1, st = [];
          for (let y = 0; y < ROWS; y++) if (tileAt(dx, y) === ':') st.push([dx, y, dir]);
          if (st.length) return { key: null, act: 'use', stands: st, ok: () => !!P.held && P.held.k === 'peel' };
        }
        return trash();
      }
      if (h.s === 'burnt') return trash();
      if (h.k === 'b' && h.s === 'raw') return emptyOf('G') || idleAt(tiles('G')[0]);
      if (h.k === 'e' && h.s === 'raw') return emptyOf('P') || idleAt(tiles('P')[0]);
      if (h.k === 'i' && !h.cut) return emptyOf('K') || park() || idleAt(tiles('K')[0]);
      if (h.k === 'e' || h.k === 'i') {                       // đồ rán / đồ đã thái: ghép vào bánh của mình trên quầy, không thì đặt xuống
        const g = h.k === 'e' ? FOODS[h.f || 'banhmi'].fry : h.g;
        const ks = tiles('=').filter(k => { const it = T(k).item; return own(it) && isToast(it) && !it.i.includes(g) && orders.some(o => o.R.type === 'food' && [...it.i, g].every(x => o.R.ings.includes(x))); });
        return nearest(ks.map(k => goal(k, 'act', () => holding() && isToast(T(k).item) && !T(k).item.i.includes(g)))) || park() || trash();
      }
      const hot0 = (h.k === 'c' || isToast(h)) ? K.urgent() : [];
      if (hot0.length) {                                         // đồ trên lò / chảo sắp cháy: mang bánh tới chảo, hoặc đặt đồ đang cầm xuống để cứu
        const fk = isToast(h) && !h.i.includes(F.fry) && hot0.find(k => T(k).item.k === 'e' && orders.some(o => o.R.type === 'food' && [...h.i, F.fry].every(g => o.R.ings.includes(g))));
        if (fk) return goal(fk, 'act', () => holding() && !!T(fk).item && T(fk).item.s === 'fried');
        const pk = park(); if (pk) return pk;
      }
      if (h.k === 'c') {
        const o = jobFor(b, orders, K, x => x.R.type === 'drink' && (!h.l || x.id === 'trachanh'), baseRank);
        if (!o) return h.f ? park() || atDoor() : trash();
        if (!h.f) return near1('J', () => holding() && !h.f);
        if (o.id === 'trachanh' && !h.l) return near1('L', () => holding() && !h.l);
        return serveTo(o);
      }
      if (isToast(h)) {
        const o = jobFor(b, orders, K, x => x.R.type === 'food' && h.i.every(g => x.R.ings.includes(g)) && rareOk(x),
          x => rank(x) + (x.R.ings.filter(g => !h.i.includes(g)).every(availNow) ? 20 : 0));
        if (!o) return park() || atDoor();
        const miss = o.R.ings.filter(g => !h.i.includes(g));
        if (!miss.length) return serveTo(o);
        // khay nhân
        const gb = nearest(miss.flatMap(g => binsFor(g).map(k => goal(k, 'act', () => {
          const [x, y] = xy(k); return holding() && !h.i.includes(g) && binIng(tileAt(x, y), x) === g;
        }))));
        if (gb) return gb;
        // đồ rán (trứng / nem) đã chín: trên chảo hoặc trên quầy
        if (miss.includes(F.fry)) {
          const ks = tiles('P=').filter(k => { const it = T(k).item; return own(it) && it.k === 'e' && it.s === 'fried'; });
          const gg = nearest(ks.map(k => goal(k, 'act', () => holding() && !!T(k).item && T(k).item.k === 'e' && T(k).item.s === 'fried' && !h.i.includes(F.fry))));
          if (gg) return gg;
        }
        // đồ đã thái: trên thớt hoặc trên quầy
        const cutGoals = miss.filter(isCut).flatMap(g => tiles('K=').filter(k => { const it = T(k).item; return own(it) && it.k === 'i' && it.g === g && it.cut; })
          .map(k => goal(k, 'act', () => holding() && !!T(k).item && T(k).item.g === g && T(k).item.cut && !h.i.includes(g))));
        const gc = nearest(cutGoals);
        if (gc) return gc;
        // chỉ còn chờ đồ đang rán: đứng chờ ở chảo
        const pan = tiles('P').find(k => own(T(k).item) && T(k).item.s === 'raw');
        if (pan && miss.every(g => g === F.fry)) return idleAt(pan);
        // còn phải thái / rán / ra chợ: đặt bánh lên quầy cho rảnh tay
        return park() || idleAt(tiles('G')[0]);
      }
      return trash();
    }

    /* ----- tay trống ----- */
    // 0) đồ cháy nằm trên lò / chảo: nhấc ra vứt (không bị trừ điểm) để lò trống
    const burnt = tiles('GP').filter(k => T(k).item && T(k).item.s === 'burnt');
    if (burnt.length) return nearest(burnt.map(k => goal(k, 'act', () => !P.held && !!T(k).item && T(k).item.s === 'burnt')));
    // 1) bánh của mình đã chín trên lò: lấy ngay kẻo cháy
    const toasts = tiles('G').filter(k => own(T(k).item) && T(k).item.s === 'toast');
    if (toasts.length) return nearest(toasts.map(k => goal(k, 'act', () => !P.held && own(T(k).item) && T(k).item.s === 'toast')));
    // 2) đồ rán sắp cháy: nhấc ra
    const hot = tiles('P').filter(k => own(T(k).item) && T(k).item.s === 'fried' && T(k).phase === 'warn');
    if (hot.length) return nearest(hot.map(k => goal(k, 'act', () => !P.held && own(T(k).item) && T(k).item.s === 'fried')));
    // 3) đồ của mình đang nằm trên thớt chưa thái: giữ nút để thái
    const uncut = tiles('K').filter(k => own(T(k).item) && !T(k).item.cut);
    if (uncut.length) {
      return nearest(uncut.map(k => goal(k, 'hold', () => !P.held && own(T(k).item) && !T(k).item.cut,
        { hold: () => !P.held && !!T(k).item && !T(k).item.cut, max: 5 })));
    }
    // 4) bánh / cốc đã đặt trên quầy, giờ làm tiếp được
    const parked = tiles('=').filter(k => {
      const it = T(k).item;
      if (!own(it)) return false;
      if (isToast(it)) return orders.some(o => o.R.type === 'food' && it.i.every(g => o.R.ings.includes(g)) && o.R.ings.filter(g => !it.i.includes(g)).every(availNow));
      if (it.k === 'c') return orders.some(o => o.R.type === 'drink' && (!it.l || o.id === 'trachanh'));
      return false;
    });
    if (parked.length) return nearest(parked.map(k => goal(k, 'act', () => !P.held && own(T(k).item))));
    // 5) mẹo: rung chuông gọi khách giả cho đội bạn / lấy vỏ chuối
    if (b.trick) {
      const tr = b.trick; b.trick = null;
      if (tr === 'bell' && S.bellCd[team] <= 0 && S.tables.some(t => t.cust == null)) {
        const q = near1('Q', () => !P.held && S.bellCd[team] <= 0, 'use');
        if (q) return q;
      }
      const peels = S.floor.filter(x => x.it.k === 'peel' && x.it.team === team).length + S.fly.filter(x => x.it.k === 'peel' && x.it.team === team).length;
      if (tr === 'peel' && S.peelCd[team] <= 0 && peels < VS.maxPeels) {
        const n = near1('N', () => !P.held && S.peelCd[team] <= 0);
        if (n) return n;
      }
    }
    // 6) chợ: đồ hiếm của xe mình (Vừa: khi có khách VIP cần; Khó: luôn giành)
    if (L.market > 0 && !K.takenBy('mk', 'chore')) {
      const stalls = Object.keys(S.market).filter(k => {
        const m = S.market[k], g = m.it && m.it.g;
        if (!g || !F.rare.includes(g) || myItems(it => it.k === 'i' && it.g === g).length) return false;
        return orders.some(o => o.id === g) ? Math.random() < L.market + .3 : L.market >= 1;
      });
      const mg = nearest(stalls.map(k => goal(k, 'act', () => !P.held && !!S.market[k].it && F.rare.includes(S.market[k].it.g))));
      if (mg) { b.chore = 'mk'; return mg; }
      // bot Khó: hàng sắp bày thì đứng chờ sẵn
      if (L.market >= 1) {
        const soon = Object.keys(S.market).find(k => { const m = S.market[k]; return m.warn > 0 && m.warn < 2.6 && F.rare.includes(m.pend); });
        if (soon) { b.chore = 'mk'; return idleAt(soon); }
      }
    }
    // 7) làm theo đơn
    const okOrder = x => rareOk(x) && (x.R.type === 'drink' || x.c.pat > 7);
    const o = jobFor(b, orders, K, okOrder, rank);
    if (!o) return idleAt(tiles('G')[0]);
    if (o.R.type === 'drink') return near1('C', () => !P.held);
    const freeG = tiles('G').some(k => !T(k).item);
    const prep = foodPrep(o);
    if (prep) return prep;
    // 8) trong lúc chờ bánh chín: pha thêm 1 cốc nếu kịp quay lại trước khi bánh khét
    const left = K.grillLeft(), gHome = tiles('G')[0];
    if (left < Infinity && !myItems(it => it.k === 'e').length) {
      const o2 = orders.filter(x => x.ck !== b.job && x.R.type === 'drink' && !K.takenBy(x.ck)).sort((a, c) => rank(c) - rank(a))
        .find(x => K.trip([tiles('C')[0], tiles('J')[0], x.id === 'trachanh' ? tiles('L')[0] : null, keyOf(TABLES[x.c.table].x, TABLES[x.c.table].y), gHome]) < left + 1);
      if (o2) { b.side = o2.ck; return near1('C', () => !P.held); }
    }
    const gk = tiles('G').find(k => own(T(k).item));
    return idleAt(gk || tiles('G')[0]);

    // việc chuẩn bị cho 1 đơn món ăn: đồ phải thái (lâu nhất) → bánh lên lò → đồ rán
    function foodPrep(o) {
      const need = o.R.ings;
      const bases = myItems(it => it.k === 'b' && (it.s === 'raw' || (isToast(it) && it.i.every(g => need.includes(g)))));
      const baseHas = g => bases.some(it => it.i.includes(g));
      for (const g of need.filter(isCut)) {
        if (baseHas(g) || myItems(it => it.k === 'i' && it.g === g).length) continue;
        if (g === F.roll) {
          if (tiles('K').some(k => !T(k).item)) { const z = near1('Z', () => !P.held); if (z) return z; }
        } else {
          const mg = nearest(marketWith(g).map(k => goal(k, 'act', () => !P.held && !!S.market[k].it && S.market[k].it.g === g)));
          if (mg) return mg;
          b.job = null; return idleAt(tiles('G')[0]);          // đồ hiếm không còn: bỏ đơn này
        }
      }
      if (!bases.length && freeG) { const g = near1('B', () => !P.held); if (g) return g; }
      if (need.includes(F.fry) && !baseHas(F.fry) && !myItems(it => it.k === 'e').length && tiles('P').some(k => !T(k).item)) {
        const g = near1('E', () => !P.held); if (g) return g;
      }
      return null;
    }
  }

  /* ---------- Cùng bán ---------- */
  function thinkCoop(b, P, S) {
    const L = b.L;
    const K = kit(b, P, S, null);
    const { goal, nearest, tiles, T, own, h, holding, near1, idleAt, emptyOf, park, trash, takenBy } = K;
    const sink = tiles('S')[0];
    const myItems = pred => tiles('GP=').map(k => T(k) && T(k).item).filter(it => own(it) && pred(it));
    const orders = [];
    S.custs.forEach(c => {
      if (c.state !== 'wait') return;
      c.items.forEach((it, i) => { if (!it.done) orders.push({ c, i, id: it.id, R: RECIPES[it.id], mode: c.type, ck: c.id + ':' + i }); });
    });
    const live = o => { const c = S.custs.find(k => k.id === o.c.id); return !!c && c.state === 'wait' && !c.items[o.i].done; };
    const dish = it => {
      if (isToast(it) && it.w) {
        const id = S.recipes.find(r => RECIPES[r].type === 'food' && sameSet(RECIPES[r].ings, it.i));
        return id ? { id, mode: it.w === 'plate' ? 'dine' : 'take' } : null;
      }
      if (it && it.k === 'c' && it.f) return { id: it.l ? 'trachanh' : 'trada', mode: it.g === 'glass' ? 'dine' : 'take' };
      return null;
    };
    const servKey = o => (o.mode === 'dine' ? keyOf(TABLES[o.c.table].x, TABLES[o.c.table].y) : keyOf(WINDOW_COLS[o.c.win], 9));
    const serveTo = o => goal(servKey(o), 'act', () => { const d = live(o) && holding() && dish(P.held); return !!d && d.id === o.id && d.mode === o.mode; });
    const binsFor = g => tiles('pquro').filter(k => { const [x, y] = xy(k); return binIng(tileAt(x, y), x) === g; });
    const availNow = g => binsFor(g).length > 0 || (g === 'trung' && myItems(it => it.k === 'e' && it.s === 'fried').length > 0);
    const rank = o => baseRank(o) + (o.R.type === 'food' && o.R.ings.every(availNow) ? 4 : 0);
    const idle = () => idleAt(tiles('G')[0]);
    const washGoal = () => (sink && S.sink.dirty.length && !takenBy('wash', 'chore')
      ? Object.assign(goal(sink, 'hold', () => !P.held && S.sink.dirty.length > 0, { hold: () => !P.held && S.sink.dirty.length > 0, max: 8 }), { chore: 'wash' }) : null);
    const dirtyGoal = () => nearest(S.tables.map((t, i) => (t.dirty.length && !takenBy('dirty' + i, 'chore')
      ? Object.assign(goal(keyOf(TABLES[i].x, TABLES[i].y), 'act', () => (!P.held || P.held.k === 'x') && S.tables[i].dirty.length > 0), { chore: 'dirty' + i }) : null)));
    const withChore = g => { if (g && g.chore) b.chore = g.chore; return g; };

    /* ----- đang cầm đồ ----- */
    if (h) {
      if (b.idleHold > 8 && h.k !== 'x' && !(h.k === 'c' && h.g === 'glass')) return trash();
      if (h.k === 'x') return near1('S', holding);                       // bát bẩn → bồn rửa
      if (h.s === 'burnt') return trash();
      if (h.k === 'b' && h.s === 'raw') return emptyOf('G') || idle();
      if (h.k === 'e' && h.s === 'raw') return emptyOf('P') || idleAt(tiles('P')[0]);
      if (h.k === 'e') {                                                // trứng đã rán: ghép vào bánh của mình trên quầy
        const ks = tiles('=').filter(k => { const it = T(k).item; return own(it) && isToast(it) && !it.i.includes('trung') && orders.some(o => o.R.type === 'food' && [...it.i, 'trung'].every(x => o.R.ings.includes(x))); });
        return nearest(ks.map(k => goal(k, 'act', () => holding() && isToast(T(k).item) && !T(k).item.i.includes('trung')))) || park() || trash();
      }
      const hot0 = (h.k === 'c' || isToast(h)) ? K.urgent() : [];
      if (hot0.length) {
        const fk = isToast(h) && !h.i.includes('trung') && hot0.find(k => T(k).item.k === 'e' && orders.some(o => o.R.type === 'food' && [...h.i, 'trung'].every(g => o.R.ings.includes(g))));
        if (fk) return goal(fk, 'act', () => holding() && !!T(fk).item && T(fk).item.s === 'fried');
        const pk = park(); if (pk) return pk;
      }
      if (h.k === 'c') {
        const mode = h.g === 'glass' ? 'dine' : 'take';
        const o = jobFor(b, orders, K, x => x.R.type === 'drink' && x.mode === mode && (!h.l || x.id === 'trachanh'), baseRank);
        if (!o) return h.f || h.g === 'glass' ? park() || idle() : trash();
        if (!h.f) return near1('J', () => holding() && !h.f);
        if (o.id === 'trachanh' && !h.l) return near1('L', () => holding() && !h.l);
        return serveTo(o);
      }
      if (isToast(h)) {
        const wm = h.w ? (h.w === 'plate' ? 'dine' : 'take') : null;
        const o = jobFor(b, orders, K, x => x.R.type === 'food' && h.i.every(g => x.R.ings.includes(g)) && (!wm || x.mode === wm),
          x => rank(x) + (x.R.ings.filter(g => !h.i.includes(g)).every(availNow) ? 20 : 0) + (x.mode === 'dine' && !S.plates && !h.w ? -30 : 0));
        if (!o) return park() || idle();
        const miss = o.R.ings.filter(g => !h.i.includes(g));
        if (miss.length) {
          const gb = nearest(miss.flatMap(g => binsFor(g).map(k => goal(k, 'act', () => holding() && !h.i.includes(g)))));
          if (gb) return gb;
          if (miss.includes('trung')) {
            const ks = tiles('P=').filter(k => { const it = T(k).item; return own(it) && it.k === 'e' && it.s === 'fried'; });
            const gg = nearest(ks.map(k => goal(k, 'act', () => holding() && !!T(k).item && T(k).item.k === 'e' && T(k).item.s === 'fried' && !h.i.includes('trung'))));
            if (gg) return gg;
            const pan = tiles('P').find(k => own(T(k).item) && T(k).item.s === 'raw');
            if (pan) return idleAt(pan);
          }
          return park() || idle();
        }
        if (!h.w) {
          if (o.mode === 'dine') {
            if (S.plates > 0) return near1('R', () => holding() && !h.w && S.plates > 0);
            return park() || idle();                                   // hết đĩa: đặt bánh xuống, đi rửa
          }
          return near1('W', () => holding() && !h.w);
        }
        return serveTo(o);
      }
      return trash();
    }

    /* ----- tay trống ----- */
    const burnt = tiles('GP').filter(k => T(k).item && T(k).item.s === 'burnt');
    if (burnt.length) return nearest(burnt.map(k => goal(k, 'act', () => !P.held && !!T(k).item && T(k).item.s === 'burnt')));
    const toasts = tiles('G').filter(k => own(T(k).item) && T(k).item.s === 'toast');
    if (toasts.length) return nearest(toasts.map(k => goal(k, 'act', () => !P.held && own(T(k).item) && T(k).item.s === 'toast')));
    const hot = tiles('P').filter(k => own(T(k).item) && T(k).item.s === 'fried' && T(k).phase === 'warn');
    if (hot.length) return nearest(hot.map(k => goal(k, 'act', () => !P.held && own(T(k).item) && T(k).item.s === 'fried')));
    // hết đĩa / cốc mà khách ngồi đang chờ: dọn bàn, rửa bát trước
    const needDine = orders.some(o => o.mode === 'dine' && ((o.R.type === 'food' && !S.plates) || (o.R.type === 'drink' && !S.glasses)));
    if (needDine || S.sink.dirty.length >= 4) { const g = withChore(washGoal() || dirtyGoal()); if (g) return g; }
    // bánh / cốc đặt trên quầy, giờ làm tiếp được
    const parked = tiles('=').filter(k => {
      const it = T(k).item;
      if (!own(it)) return false;
      if (isToast(it)) return orders.some(o => o.R.type === 'food' && it.i.every(g => o.R.ings.includes(g)) && o.R.ings.filter(g => !it.i.includes(g)).every(availNow) &&
        (o.mode === 'take' || S.plates > 0 || it.w === 'plate'));
      if (it.k === 'c') return orders.some(o => o.R.type === 'drink' && o.mode === (it.g === 'glass' ? 'dine' : 'take') && (!it.l || o.id === 'trachanh'));
      return false;
    });
    if (parked.length) return nearest(parked.map(k => goal(k, 'act', () => !P.held && own(T(k).item))));
    // làm theo đơn: tối đa 2 bánh trên lò cùng lúc; lúc chờ bánh chín thì pha đồ uống
    const okOrder = x => (x.R.type === 'drink' || x.c.pat > 7) && !(x.mode === 'dine' && x.R.type === 'drink' && !S.glasses);
    const cup = x => near1(x.mode === 'dine' ? 'V' : 'C', () => !P.held && (x.mode !== 'dine' || S.glasses > 0));
    const freeG = tiles('G').some(k => !T(k).item);
    const o = jobFor(b, orders, K, okOrder, rank);
    if (o) {
      if (o.R.type === 'drink') return cup(o);
      const need = o.R.ings;
      const bases = myItems(it => it.k === 'b' && (it.s === 'raw' || (isToast(it) && it.i.every(g => need.includes(g)))));
      if (!bases.length && freeG) { const g = near1('B', () => !P.held); if (g) return g; }
      if (need.includes('trung') && !bases.some(it => it.i.includes('trung')) && !myItems(it => it.k === 'e').length && tiles('P').some(k => !T(k).item)) {
        const g = near1('E', () => !P.held); if (g) return g;
      }
      // trong lúc chờ bánh chín: pha thêm 1 cốc nếu kịp quay lại trước khi bánh khét
      const left = K.grillLeft();
      if (left < Infinity && !myItems(it => it.k === 'e').length) {
        const o2 = orders.filter(x => x.ck !== b.job && okOrder(x) && x.R.type === 'drink' && !takenBy(x.ck)).sort((a, c) => rank(c) - rank(a))
          .find(x => K.trip([tiles(x.mode === 'dine' ? 'V' : 'C')[0], tiles('J')[0], x.id === 'trachanh' ? tiles('L')[0] : null, servKey(x), tiles('G')[0]]) < left + 1);
        if (o2) { b.side = o2.ck; return cup(o2); }
      }
    }
    // rảnh: dọn bàn, rửa bát, đứng chờ ở lò
    const g = withChore(dirtyGoal() || washGoal());
    if (g) return g;
    const gk = tiles('G').find(k => own(T(k).item));
    return idleAt(gk || tiles('G')[0]);
  }

  return { LEVELS, make, start, stop, update, setTrace: t => { trace = t; }, get list() { return bots; } };
})();
