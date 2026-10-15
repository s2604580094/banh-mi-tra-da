/* vendor.js — nhân vật chủ quán vẽ kiểu 2.5D: SVG nhiều lớp, đổ bóng, quay nghiêng 3/4 sang phải.
   OPTS = các lựa chọn ngoại hình; need = kỷ lục điểm cần đạt để mở khóa. */
const VENDOR = (() => {
  const OPTS = {
    skins: ['#F6D7BC', '#EBC09A', '#D29E74', '#A8754F'],
    hairColors: ['#1E1A18', '#4A2E20', '#8A5A32', '#6B2238'],
    colors: ['#D9443A', '#2F74B5', '#3E9B48', '#F2A516', '#7A5BA6'],
    hairs: ['short', 'pony', 'bun', 'long'],
    outfits: [
      { id: 'apron', need: 0 }, { id: 'baba', need: 0 }, { id: 'chef', need: 250 },
      { id: 'aodai', need: 500 }, { id: 'yukata', need: 800 },
    ],
    hats: [
      { id: 'none', need: 0 }, { id: 'nonla', need: 0 }, { id: 'khan', need: 120 },
      { id: 'cap', need: 250 }, { id: 'toque', need: 400 }, { id: 'hachi', need: 650 },
    ],
    ranks: [0, 200, 450, 750],      // mốc kỷ lục cho danh hiệu chủ quán
  };
  const DEF = { name: '', hair: 'pony', hairColor: '#1E1A18', skin: '#EBC09A', outfit: 'apron', color: '#D9443A', hat: 'nonla' };

  // làm sáng (p > 0) hoặc tối (p < 0) một màu hex
  function shade(hex, p) {
    const n = parseInt(hex.slice(1), 16), t = p < 0 ? 0 : 255, a = Math.abs(p);
    const ch = v => Math.round(v + (t - v) * a);
    return '#' + ((1 << 24) | (ch(n >> 16) << 16) | (ch((n >> 8) & 255) << 8) | ch(n & 255)).toString(16).slice(1);
  }

  // c = cấu hình nhân vật, u = tiền tố id duy nhất cho mỗi lần vẽ (gradient không bị trùng)
  function draw(cfg, u) {
    const c = { ...DEF, ...cfg };
    const skin = c.skin, hair = c.hairColor, main = c.color;
    const skD = shade(skin, -.16);
    const id = k => `${u}-${k}`, url = k => `url(#${id(k)})`;
    const st = col => `stroke="${shade(col, -.42)}" stroke-width="1.5" stroke-linejoin="round"`;
    const lin = (k, a, b, h) => `<linearGradient id="${id(k)}" x1="0" y1="0" x2="${h ? 1 : .35}" y2="${h ? 0 : 1}"><stop offset="0" stop-color="${a}"/><stop offset="1" stop-color="${b}"/></linearGradient>`;

    const OUT = {
      apron:  { top: '#F2EEE6', sl: 14, pants: '#3B4F6B' },
      baba:   { top: main, sl: 30, pants: '#2B2B2E' },
      chef:   { top: '#F7F6F2', sl: 30, pants: '#3A3A3A' },
      aodai:  { top: main, sl: 33, pants: '#F4F1EA' },
      yukata: { top: main, sl: 26, pants: '#2B2B2E', wide: true },
    }[c.outfit] || { top: '#F2EEE6', sl: 14, pants: '#3B4F6B' };
    const pants = OUT.pants, obi = main === '#F2A516' ? '#2F74B5' : '#F2C14E';

    const defs = '<defs>' +
      `<radialGradient id="${id('sk')}" cx=".4" cy=".35" r=".75"><stop offset="0" stop-color="${shade(skin, .16)}"/><stop offset=".65" stop-color="${skin}"/><stop offset="1" stop-color="${skD}"/></radialGradient>` +
      lin('hr', shade(hair, .28), shade(hair, -.2)) +
      lin('tp', shade(OUT.top, .16), shade(OUT.top, -.2), true) +
      lin('ac', shade(main, .18), shade(main, -.22), true) +
      lin('pn', shade(pants, .14), shade(pants, -.2), true) +
      lin('st', '#F6E7B6', '#C7AB66') +
      `<radialGradient id="${id('sh')}"><stop offset="0" stop-color="#000" stop-opacity=".34"/><stop offset="1" stop-color="#000" stop-opacity="0"/></radialGradient>` +
      `<pattern id="${id('ck')}" width="6" height="6" patternUnits="userSpaceOnUse"><rect width="6" height="6" fill="#F4F1EA"/><rect width="3" height="3" fill="#232323"/><rect x="3" y="3" width="3" height="3" fill="#232323"/></pattern>` +
      `<pattern id="${id('dt')}" width="10" height="10" patternUnits="userSpaceOnUse"><rect width="10" height="10" fill="${main}"/><circle cx="3" cy="3" r="1.6" fill="#FFF7E2" opacity=".85"/><circle cx="8" cy="8" r="1.1" fill="#FFF7E2" opacity=".6"/></pattern>` +
      '</defs>';

    // tóc phía sau (đuôi ngựa, tóc dài) nằm sau thân
    const hairTail = {
      pony: `<path d="M31 38C14 44 11 72 17 94C19 102 26 106 30 101C26 86 26 64 37 48Z" fill="${url('hr')}" ${st(hair)}/><circle cx="32" cy="42" r="4.2" fill="${main}" ${st(main)}/>`,
      long: `<path d="M30 40C17 62 17 104 24 130L52 128C43 102 40 80 45 60Z" fill="${url('hr')}" ${st(hair)}/><path d="M88 50C95 72 93 98 86 114L76 110C82 94 84 74 82 58Z" fill="${url('hr')}" ${st(hair)}/>`,
    }[c.hair] || '';

    // tay sau (xa) — tối hơn để tạo chiều sâu
    const sl = OUT.sl, w = OUT.wide;
    const armB = `<g class="v-armB">` +
      (sl < 33 ? `<rect x="74.5" y="${88 + sl}" width="11" height="${37 - sl}" rx="5.5" fill="${skD}" ${st(skin)}/>` : '') +
      `<rect x="${w ? 70 : 73.5}" y="90" width="${w ? 20 : 13}" height="${sl}" rx="6.5" fill="${shade(OUT.top, -.18)}" ${st(OUT.top)}/>` +
      `<circle cx="80" cy="128" r="6.2" fill="${skD}" ${st(skin)}/></g>`;

    // chân + giày (yukata: guốc geta)
    const legs = c.outfit === 'yukata'
      ? '<ellipse cx="70" cy="181" rx="9" ry="3.6" fill="#E9E4D8"/><ellipse cx="52" cy="182" rx="10" ry="4" fill="#F4F1EA"/>' +
        '<rect x="60" y="183" width="21" height="5" rx="1.5" fill="#A07745"/><rect x="40" y="184" width="24" height="5" rx="1.5" fill="#B88A55"/>'
      : `<path d="M61 136H75V181Q68 183 61 181Z" fill="${shade(pants, -.15)}" ${st(pants)}/>` +
        `<path d="M44 136H58V182Q51 184 44 182Z" fill="${url('pn')}" ${st(pants)}/>` +
        '<rect x="59" y="178" width="22" height="8" rx="4" fill="#4A3020"/>' +
        '<rect x="40" y="179" width="25" height="9" rx="4.5" fill="#5A3A24"/><path d="M45 181.5H58" stroke="#7A5638" stroke-width="1.5" stroke-linecap="round"/>';

    // thân + trang phục
    const TORSO = 'M36 98Q37 88 50 87H72Q84 88 86 99L88 140Q62 146 34 140Z';
    const turnShade = '<path d="M74 88Q84 89 86 99L88 140Q81 142 75 142Z" fill="#000" opacity=".1"/>';
    const buttons = (xs, ys, col, r) => ys.map(y => xs.map(x => `<circle cx="${x}" cy="${y}" r="${r}" fill="${col}"/>`).join('')).join('');
    let torso;
    switch (c.outfit) {
      case 'baba':
        torso = `<path d="${TORSO}" fill="${url('tp')}" ${st(main)}/>${turnShade}` +
          `<path d="M52 88Q61 95 70 88M61 93V140" fill="none" stroke="${shade(main, -.35)}" stroke-width="1.3"/>` +
          buttons([61], [104, 116, 128], '#F4F1EA', 1.7) +
          `<path d="M41 124H54V133H41ZM68 124H81V133H68Z" fill="none" stroke="${shade(main, -.3)}" stroke-width="1.2"/>`;
        break;
      case 'chef':
        torso = `<path d="${TORSO}" fill="${url('tp')}" ${st('#C9C9C2')}/>${turnShade}` +
          buttons([53, 69], [102, 113, 124], '#3A3A3A', 1.8) +
          `<path d="M51 87H71L61 99Z" fill="${url('ac')}" ${st(main)}/>`;
        break;
      case 'aodai':
        torso = `<path d="${TORSO}" fill="${url('tp')}" ${st(main)}/>${turnShade}` +
          `<path d="M52 82H70V90H52Z" fill="${shade(main, -.12)}" ${st(main)}/>` +
          `<path d="M64 90Q76 95 84 104" fill="none" stroke="${shade(main, -.35)}" stroke-width="1.2"/>` +
          `<path d="M42 134Q62 139 82 134L88 176Q64 182 38 176Z" fill="${url('ac')}" ${st(main)}/>` +
          `<path d="M58 140L56 176M70 139L73 175" stroke="${shade(main, -.2)}" stroke-width="1" opacity=".6"/>`;
        break;
      case 'yukata':
        torso = `<path d="M35 98Q36 88 50 87H72Q84 88 86 99L90 182Q62 188 32 182Z" fill="${url('dt')}" ${st(main)}/>` +
          '<path d="M74 88Q84 89 86 99L90 182Q83 185 76 185Z" fill="#000" opacity=".12"/>' +
          `<path d="M58 124L54 183" stroke="${shade(main, -.4)}" stroke-width="1.3"/>` +
          `<path d="M51 88L66 116M73 88L58 108" stroke="${shade(main, -.5)}" stroke-width="3.2" stroke-linecap="round"/>` +
          `<path d="M34 110Q62 116 88 110L88 124Q62 130 34 124Z" fill="${obi}" ${st(obi)}/>`;
        break;
      default: // tạp dề
        torso = `<path d="${TORSO}" fill="${url('tp')}" ${st('#C9C2B4')}/>${turnShade}` +
          `<path d="M48 101L51 88M74 101L71 88" stroke="${shade(main, -.1)}" stroke-width="2.6" stroke-linecap="round"/>` +
          `<path d="M46 101H76L80 142Q62 147 42 142Z" fill="${url('ac')}" ${st(main)}/>` +
          `<path d="M53 118H71V128H53Z" fill="${shade(main, .12)}" ${st(main)}/>`;
    }

    // mặt: bình thường / vui / buồn (CSS bật tắt theo động tác)
    const ink = '#2B2118', brow = shade(hair, -.1);
    const eyesOpen = `<ellipse cx="58" cy="56" rx="3.6" ry="4.8" fill="${ink}"/><ellipse cx="76" cy="55.5" rx="3" ry="4.5" fill="${ink}"/>` +
      '<circle cx="59.3" cy="54" r="1.3" fill="#fff"/><circle cx="77" cy="53.6" r="1.1" fill="#fff"/>';
    const line = (d, col, sw) => `<path d="${d}" stroke="${col}" stroke-width="${sw}" fill="none" stroke-linecap="round"/>`;
    const faces =
      `<g class="fx-normal"><g class="v-eyes">${eyesOpen}</g>${line('M53 47.5Q57.5 45 62 47M72 46.5Q76 44.5 80 46.5', brow, 1.8)}${line('M67 69Q72 72.5 77 68.5', '#7A3B2A', 2)}</g>` +
      `<g class="fx-happy">${line('M54 57Q58 51.5 62 57M72.5 56.5Q76 51.5 79.5 56.5', ink, 2.2)}${line('M53 46.5Q57.5 44 62 46M72 45.5Q76 43.5 80 45.5', brow, 1.8)}` +
        '<path d="M66 66.5Q72 76 78 66Z" fill="#8B2E22"/><path d="M68.5 70Q72 73.5 75.5 70Z" fill="#E8776A"/></g>' +
      `<g class="fx-sad">${eyesOpen}${line('M53 48Q58 44.5 62 45M72 45Q76 44.5 80 48', brow, 1.8)}${line('M67 71.5Q72 67.5 77 71.5', '#7A3B2A', 2)}</g>`;

    // tóc: lớp sau đầu + mái phía trước
    const hairCap = `<path d="M25 56C22 30 40 13 60 13C83 13 96 28 94 52L92 58C89 38 80 28 60 27C40 28 29 44 30 64Z" fill="${url('hr')}" ${st(hair)}/>`;
    const bun = c.hair === 'bun' ? `<circle cx="38" cy="18" r="12" fill="${url('hr')}" ${st(hair)}/><path d="M31 13Q37 9 43 12" stroke="#fff" stroke-opacity=".3" stroke-width="2.5" fill="none" stroke-linecap="round"/>` : '';
    const bangs = `<path d="M28 50C26 28 42 16 60 16C80 16 93 28 92 46C86 38 80 34 72 33C70 40 62 44 52 42C46 46 40 50 36 58C32 56 29 54 28 50Z" fill="${url('hr')}" ${st(hair)}/>` +
      '<path d="M44 25Q58 18 75 22" stroke="#fff" stroke-opacity=".3" stroke-width="3" fill="none" stroke-linecap="round"/>';

    // mũ / khăn
    const hats = {
      nonla: '<ellipse cx="62" cy="36" rx="34" ry="6" fill="#000" opacity=".16"/>' +
        `<path d="M2 34Q60 52 116 30L64 -14Z" fill="${url('st')}" stroke="#A88A48" stroke-width="1.5" stroke-linejoin="round"/>` +
        '<path d="M64 -14L22 40M64 -14L46 44M64 -14L72 44M64 -14L96 38" stroke="#B89A55" stroke-width=".9" opacity=".7"/>' +
        '<path d="M34 44Q44 80 66 84" stroke="#8B6B3A" stroke-width="1.2" fill="none"/>',
      khan: `<path d="M27 40Q60 26 93 38L92 47Q60 36 28 50Z" fill="${url('ck')}" stroke="#222" stroke-width=".8"/>` +
        `<path d="M30 44L13 55L20 60ZM30 46L18 67L25 68Z" fill="${url('ck')}" stroke="#222" stroke-width=".8"/>`,
      cap: '<ellipse cx="66" cy="38" rx="26" ry="4" fill="#000" opacity=".14"/>' +
        `<path d="M28 42C26 22 42 12 60 12C80 12 94 24 93 40Q60 30 28 42Z" fill="${url('ac')}" ${st(main)}/>` +
        `<path d="M74 36Q98 32 110 40Q96 46 74 42Z" fill="${shade(main, -.2)}" ${st(main)}/><circle cx="60" cy="13" r="2.5" fill="${shade(main, -.25)}"/>`,
      toque: '<circle cx="42" cy="10" r="14" fill="#F2F1EC" stroke="#BDBDB4" stroke-width="1.2"/><circle cx="78" cy="10" r="14" fill="#E9E8E2" stroke="#BDBDB4" stroke-width="1.2"/>' +
        '<circle cx="60" cy="2" r="17" fill="#FAFAF7" stroke="#BDBDB4" stroke-width="1.2"/>' +
        '<path d="M30 30Q60 22 90 30L90 42Q60 34 30 42Z" fill="#F4F3EE" stroke="#BDBDB4" stroke-width="1.2"/>',
      hachi: '<path d="M27 42Q60 30 93 40L93 47Q60 37 28 49Z" fill="#FAFAF7" stroke="#BDBDB4" stroke-width="1"/>' +
        '<circle cx="82" cy="41.5" r="3.6" fill="#D8261E"/>' +
        '<path d="M30 45L15 52L18 58ZM30 47L20 64L26 65Z" fill="#FAFAF7" stroke="#BDBDB4" stroke-width="1"/>',
    };

    const head = '<g class="v-head">' + hairCap + bun +
      `<path d="M26 52C26 28 44 18 60 18C78 18 92 30 92 52C92 72 80 86 62 86C42 86 26 74 26 52Z" fill="${url('sk')}" ${st(skin)}/>` +
      `<ellipse cx="32" cy="58" rx="5" ry="7" fill="${skin}" ${st(skin)}/>` + line('M31 54Q34 58 31 62', skD, 1.3) +
      line('M84 59Q87 62 84 64.5', skD, 1.5) +
      '<ellipse cx="52" cy="65" rx="4.5" ry="2.6" fill="#F08A7A" opacity=".45"/><ellipse cx="80" cy="64.5" rx="3.4" ry="2.2" fill="#F08A7A" opacity=".45"/>' +
      faces + bangs + (hats[c.hat] || '') +
      '<path class="v-sweat" d="M91 34Q95 40 93 44Q89 46 88 42Q88 38 91 34Z" fill="#7CC4F0" stroke="#3E8CC4" stroke-width=".8"/></g>';

    // tay trước (gần) + đồ cầm tay hiện theo động tác
    const armF = '<g class="v-armF">' +
      (sl < 33 ? `<rect x="36.5" y="${89 + sl}" width="11" height="${38 - sl}" rx="5.5" fill="${url('sk')}" ${st(skin)}/>` : '') +
      `<rect x="${w ? 31 : 35.5}" y="92" width="${w ? 21 : 13.5}" height="${sl}" rx="6.7" fill="${url('tp')}" ${st(c.outfit === 'apron' || c.outfit === 'chef' ? '#C9C2B4' : main)}/>` +
      `<circle cx="42" cy="131" r="6.8" fill="${url('sk')}" ${st(skin)}/>` +
      '<g class="prop p-tongs" transform="rotate(72 42 131)"><path d="M39.5 131L37 160M44.5 131L47 160" stroke="#8A9199" stroke-width="2.4" stroke-linecap="round"/></g>' +
      '<g class="prop p-jug" transform="rotate(80 42 131)"><rect x="33" y="123" width="18" height="22" rx="4" fill="#2F74B5" stroke="#22578A"/><rect x="34" y="119" width="16" height="5" rx="2" fill="#F4F1EA"/><rect x="36" y="129" width="12" height="7" rx="1" fill="#FFF7E2"/><path d="M51 127h3v4h-3Z" fill="#D8261E"/></g>' +
      '<g class="prop p-plate" transform="rotate(100 42 131)"><ellipse cx="42" cy="125" rx="17" ry="4.5" fill="#fff" stroke="#2F74B5" stroke-width="2"/><path d="M30 122Q42 112 54 122Q42 126 30 122Z" fill="#DE9440" stroke="#9A581B"/></g>' +
      '</g>';

    return `<svg class="vendor-svg" viewBox="0 -18 120 218" aria-hidden="true">${defs}` +
      `<ellipse cx="60" cy="187" rx="40" ry="8" fill="${url('sh')}"/>` +
      '<g class="v-bob"><g class="v-lean">' + hairTail + armB + legs +
      `<rect x="53" y="80" width="14" height="13" rx="4" fill="${skD}"/>` + torso +
      '<ellipse cx="62" cy="90" rx="17" ry="4.5" fill="#000" opacity=".16"/>' + head + armF +
      '</g></g></svg>';
  }

  const rank = best => OPTS.ranks.filter(v => best >= v).length - 1;
  return { OPTS, DEF, draw, rank, shade };
})();
