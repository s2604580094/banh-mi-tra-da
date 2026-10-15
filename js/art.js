/* art.js — toàn bộ hình vẽ của game, vẽ bằng SVG nên không cần file ảnh */
const ART = (() => {
  // màu bánh mì theo trạng thái: [ruột vỏ, viền, vệt rạch]
  const BREAD = {
    raw:   ['#F2DDB0', '#C29A5E', '#FAEFD4'],
    toast: ['#DE9440', '#9A581B', '#F4C47C'],
    burnt: ['#4B392C', '#241911', '#6C5646'],
  };
  const CLOSED = 'M5 27C5 12 22 6 50 6C78 6 95 12 95 27C95 42 78 48 50 48C22 48 5 42 5 27Z';
  const TOP = 'M5 24C5 10 22 4 50 4C78 4 95 10 95 24C78 27 22 27 5 24Z';
  const BOTTOM = 'M7 32C24 30 76 30 93 32C93 44 78 50 50 50C22 50 7 44 7 32Z';

  // các lớp nhân kẹp giữa ổ bánh
  function fillings(ings) {
    const has = k => ings.includes(k);
    let s = '';
    if (has('pate')) s += '<path d="M11 31.5Q50 28.5 89 31.5L88 34Q50 32 12 34Z" fill="#7A4A2E"/>';
    if (has('cha')) s += [22, 40, 58, 76].map(x => `<ellipse cx="${x}" cy="29" rx="9" ry="3.4" fill="#F5C9B6" stroke="#D69683"/>`).join('');
    if (has('trung')) s += '<path d="M28 29Q31 22 44 23.5Q57 21 64 26Q71 30 62 31H33Q25 31 28 29Z" fill="#FFF9EE" stroke="#E2D3B8" stroke-width=".8"/><ellipse cx="47" cy="26.5" rx="5.5" ry="3.4" fill="#F5AE16"/>';
    if (has('dua')) s += '<g stroke-linecap="round" stroke-width="2.4"><path d="M6 27.5L19 26" stroke="#F0862A"/><path d="M8 31L21 29.5" stroke="#FFF2D8"/><path d="M81 26L94 27.5" stroke="#F0862A"/><path d="M79 29.5L92 31" stroke="#FFF2D8"/></g>';
    if (has('rau')) s += '<g fill="#3C9A47"><circle cx="30" cy="24" r="3.4"/><circle cx="34.5" cy="22" r="2.8"/><circle cx="54" cy="22.5" r="3"/><circle cx="68" cy="23" r="3.4"/><circle cx="72" cy="25" r="2.6"/></g>';
    if (has('ot')) s += '<g fill="#D8261E" stroke="#9E140E" stroke-width=".6"><circle cx="25" cy="26" r="2.3"/><circle cx="60" cy="25" r="2.3"/><circle cx="80" cy="25.5" r="2.3"/></g>';
    return s;
  }

  // ổ bánh mì nhìn ngang; có nhân thì tách đôi
  function bread(state = 'toast', ings = []) {
    const [f, e, l] = BREAD[state];
    const open = '<svg class="bread" viewBox="0 0 100 54" aria-hidden="true">';
    if (!ings.length) {
      return open + `<path d="${CLOSED}" fill="${f}" stroke="${e}" stroke-width="2.5"/>` +
        `<path d="M27 15l9 8M45 13l9 8M63 15l9 8" stroke="${l}" stroke-width="3" stroke-linecap="round"/></svg>`;
    }
    return open + '<path d="M9 23H91V34H9Z" fill="#FBE7BF"/>' +
      `<path d="${BOTTOM}" fill="${f}" stroke="${e}" stroke-width="2.5"/>` +
      '<path d="M11 32.5C30 31 70 31 89 32.5" stroke="#FFF0CF" stroke-width="2.5" fill="none"/>' +
      `<path d="${TOP}" fill="${f}" stroke="${e}" stroke-width="2.5"/>` +
      `<path d="M27 11l8 7M45 9l8 7M63 11l8 7" stroke="${l}" stroke-width="2.6" stroke-linecap="round"/>` +
      fillings(ings) + '</svg>';
  }

  // biểu tượng khay nguyên liệu (40×40)
  const ICONS = {
    pate: '<rect x="8" y="14" width="24" height="19" rx="3" fill="#C9CFD6" stroke="#8E98A3"/><rect x="8" y="19" width="24" height="8" fill="#C8352B"/><path d="M13 23h14" stroke="#FFD447" stroke-width="1.6"/><ellipse cx="20" cy="14" rx="12" ry="4.6" fill="#AEB6BF" stroke="#8E98A3"/><ellipse cx="20" cy="14" rx="9.4" ry="3.2" fill="#7A4A2E"/>',
    cha: '<rect x="4" y="12" width="26" height="18" rx="5" fill="#4F8B3B" stroke="#355F28"/><path d="M10 12v18M16 12v18M22 12v18" stroke="#77B25B" stroke-width="1.2"/><ellipse cx="30" cy="21" rx="6.5" ry="9" fill="#F5C9B6" stroke="#D69683"/><circle cx="29" cy="18" r=".9" fill="#D69683"/><circle cx="31.5" cy="23" r=".9" fill="#D69683"/>',
    trung: '<ellipse cx="20" cy="22" rx="10.5" ry="13" fill="#F0D2A4" stroke="#C9A06A"/><ellipse cx="16" cy="16" rx="3" ry="4.4" fill="#FBEBD0"/>',
    dua: '<g stroke-linecap="round" stroke-width="2.6"><path d="M12 22L16 8" stroke="#F0862A"/><path d="M18 22L20 7" stroke="#FFF2D8"/><path d="M24 22L27 9" stroke="#F0862A"/><path d="M15 22L11 11" stroke="#FFF2D8"/><path d="M28 22L31 12" stroke="#FFF2D8"/></g><path d="M5 20H35Q34 34 20 34Q6 34 5 20Z" fill="#EAF0F4" stroke="#A9B6C1"/><path d="M8 24H32" stroke="#2F74B5" stroke-width="1.6"/>',
    rau: '<g stroke="#2E7A37" stroke-width="1.6" fill="none"><path d="M20 36V18M20 26L12 16M20 24L28 14"/></g><g fill="#43A34E"><circle cx="20" cy="14" r="5"/><circle cx="11" cy="14" r="4.4"/><circle cx="29" cy="12" r="4.4"/><circle cx="15" cy="9" r="3.6"/><circle cx="25" cy="7" r="3.6"/></g>',
    ot: '<path d="M9 31Q13 15 28 9Q22 20 13 33Z" fill="#D8261E" stroke="#9E140E"/><path d="M14 34Q22 22 34 20Q28 30 17 36Z" fill="#E8432B" stroke="#9E140E"/><path d="M28 9l4-4M34 20l3-3" stroke="#3C8A3A" stroke-width="2.4" stroke-linecap="round"/>',
    chanh: '<circle cx="20" cy="20" r="14" fill="#5FB236" stroke="#3E7F22"/><circle cx="20" cy="20" r="11" fill="#D8F0A2"/><g stroke="#A8D46A" stroke-width="1.4"><path d="M20 9v22M9 20h22M12.2 12.2l15.6 15.6M27.8 12.2L12.2 27.8"/></g><circle cx="20" cy="20" r="2" fill="#EFFAD0"/>',
  };
  const ing = k => `<svg viewBox="0 0 40 40" aria-hidden="true">${ICONS[k]}</svg>`;

  // trứng ốp trên chảo: cooking / ready / warn / burnt
  function egg(state) {
    const white = state === 'burnt' ? '#5A4636' : state === 'cooking' ? 'rgba(255,255,255,.72)' : '#FFFBF2';
    const yolk = state === 'burnt' ? '#2E2219' : state === 'cooking' ? '#FFC94A' : '#F5AE16';
    const blob = 'M8 21Q8 9 20 9Q33 8 33 20Q34 32 21 32Q8 33 8 21Z';
    const crisp = state === 'ready' || state === 'warn' ? `<path d="${blob}" fill="none" stroke="#E7B565" stroke-width="1.6"/>` : '';
    return `<svg viewBox="0 0 40 40" aria-hidden="true"><path d="${blob}" fill="${white}"/>${crisp}<circle cx="20" cy="20" r="6" fill="${yolk}"/><circle cx="18" cy="18" r="1.6" fill="rgba(255,255,255,.6)"/></svg>`;
  }

  // cốc thủy tinh có đá; fill 0→1, lemon = có lát chanh
  function cup(fill = 1, lemon = false) {
    const y = 52 - 42 * fill;
    const lx = 6 + 3 * (y - 8) / 44, rx = 34 - 3 * (y - 8) / 44;
    const tea = fill > 0 ? `<path d="M${lx.toFixed(1)} ${y.toFixed(1)}H${rx.toFixed(1)}L31 52H9Z" fill="#B8641C" opacity=".9"/>` : '';
    const ice = '<g fill="rgba(255,255,255,.55)" stroke="rgba(255,255,255,.85)" stroke-width=".6"><rect x="11" y="24" width="8" height="8" rx="1.5" transform="rotate(-12 15 28)"/><rect x="21" y="30" width="8" height="8" rx="1.5" transform="rotate(10 25 34)"/><rect x="13" y="38" width="7" height="7" rx="1.5"/></g>';
    const lime = lemon ? '<circle cx="31" cy="11" r="7" fill="#5FB236"/><circle cx="31" cy="11" r="5.4" fill="#D8F0A2"/><path d="M31 6v10M26 11h10" stroke="#A8D46A"/>' : '';
    return `<svg viewBox="0 0 40 56" aria-hidden="true">${tea}${ice}<path d="M6 8H34L31 52H9Z" fill="rgba(255,255,255,.28)" stroke="#8FA6B5" stroke-width="2"/><path d="M10 12L12 48" stroke="rgba(255,255,255,.7)" stroke-width="2" stroke-linecap="round"/>${lime}</svg>`;
  }

  // bình trà đá nhựa có vòi
  const jug = () => '<svg viewBox="0 0 80 84" aria-hidden="true"><rect x="16" y="16" width="50" height="62" rx="10" fill="#2F74B5" stroke="#22578A" stroke-width="2"/><path d="M22 24V70" stroke="#5B98D1" stroke-width="4" stroke-linecap="round"/><rect x="20" y="6" width="42" height="14" rx="5" fill="#F4F1EA" stroke="#C9C2B2" stroke-width="2"/><path d="M66 30h6a4 4 0 0 1 4 4v22a4 4 0 0 1-4 4h-6" fill="none" stroke="#22578A" stroke-width="4"/><rect x="26" y="34" width="34" height="20" rx="3" fill="#FFF7E2"/><text x="43" y="48" text-anchor="middle" font-family="Bungee, Arial Black, sans-serif" font-size="9" fill="#C8352B">TRÀ ĐÁ</text><rect x="6" y="62" width="12" height="8" rx="2" fill="#D8261E"/><path d="M8 70v5" stroke="#D8261E" stroke-width="3" stroke-linecap="round"/></svg>';

  // giỏ mây đựng bánh mì sống
  const basket = () => '<svg viewBox="0 0 60 60" aria-hidden="true"><rect x="12" y="8" width="40" height="11" rx="5.5" fill="#E7A957" stroke="#9A581B" stroke-width="1.6" transform="rotate(-18 30 26)"/><rect x="8" y="12" width="40" height="11" rx="5.5" fill="#DE9440" stroke="#9A581B" stroke-width="1.6" transform="rotate(14 30 22)"/><rect x="14" y="4" width="11" height="34" rx="5.5" fill="#E9A64E" stroke="#9A581B" stroke-width="1.6" transform="rotate(8 20 20)"/><path d="M5 28H55L49 54H11Z" fill="#B57B38" stroke="#7A4E1E" stroke-width="2"/><path d="M8 35H52M9.5 42H50.5M11 49H49M18 28L20 54M30 28V54M42 28L40 54" stroke="#8C5A26" stroke-width="1.4"/></svg>';

  const trash = () => '<svg viewBox="0 0 40 48" aria-hidden="true"><rect x="7" y="14" width="26" height="30" rx="3" fill="#3E9B48" stroke="#2A6E32" stroke-width="2"/><path d="M14 20v18M20 20v18M26 20v18" stroke="#2A6E32" stroke-width="2" stroke-linecap="round"/><rect x="4" y="8" width="32" height="6" rx="2" fill="#4FB15A" stroke="#2A6E32" stroke-width="2"/><rect x="15" y="4" width="10" height="5" rx="2" fill="#2A6E32"/></svg>';

  const lock = () => '<svg viewBox="0 0 20 20" aria-hidden="true"><rect x="4" y="9" width="12" height="9" rx="2" fill="currentColor"/><path d="M6.5 9V6.5a3.5 3.5 0 0 1 7 0V9" fill="none" stroke="currentColor" stroke-width="2"/></svg>';

  // khách hàng: mood = normal / worried / angry / happy
  function customer(lk, mood = 'normal') {
    const { skin, hair, shirt, style, helmet, glasses } = lk;
    const hairCap = `<path d="M19 46C18 28 28 23 40 23C52 23 62 28 61 46C57 36 49 32 40 32C31 32 23 36 19 46Z" fill="${hair}"/>`;
    let back = '', top = hairCap;
    if (style === 'long') back = `<path d="M19 42Q15 66 23 76H31Q24 60 24 44Z M61 42Q65 66 57 76H49Q56 60 56 44Z" fill="${hair}"/>`;
    if (style === 'bun') top += `<circle cx="40" cy="20" r="8" fill="${hair}"/>`;
    if (style === 'nonla') top += '<path d="M3 38L40 6L77 38Q40 45 3 38Z" fill="#E9D49A" stroke="#B89A55" stroke-width="1.5"/><path d="M40 6L20 40M40 6L60 40M40 6V43" stroke="#CCB070" stroke-width="1"/>';
    if (style === 'helmet') top = `<path d="M17 44C17 24 28 17 40 17C52 17 63 24 63 44Z" fill="${helmet}" stroke="rgba(0,0,0,.25)" stroke-width="1.5"/><path d="M26 23Q40 17 54 23" stroke="rgba(255,255,255,.55)" stroke-width="3" fill="none" stroke-linecap="round"/><rect x="15" y="41" width="50" height="5" rx="2.5" fill="rgba(0,0,0,.3)"/><path d="M21 47L29 66M59 47L51 66" stroke="#2B2118" stroke-width="1.5"/>`;
    if (style === 'cap') top = `<path d="M19 42C19 25 29 21 40 21C51 21 61 25 61 42Z" fill="${shirt}" stroke="rgba(0,0,0,.25)" stroke-width="1.5"/><path d="M40 39Q60 36 72 42Q57 46 40 43Z" fill="${shirt}" stroke="rgba(0,0,0,.3)" stroke-width="1.5"/>`;

    const line = 'stroke="#2B2118" stroke-linecap="round" fill="none"';
    const eyes = mood === 'happy'
      ? `<path d="M29 49Q32.5 45 36 49M44 49Q47.5 45 51 49" ${line} stroke-width="2"/>`
      : '<circle cx="32.5" cy="48" r="2.3" fill="#2B2118"/><circle cx="47.5" cy="48" r="2.3" fill="#2B2118"/>';
    const brows = mood === 'angry' ? `<path d="M28 41L36 44M52 41L44 44" ${line} stroke-width="2.2"/>`
      : mood === 'worried' ? `<path d="M29 43L36 41M51 43L44 41" ${line} stroke-width="1.8"/>` : '';
    const mouth = {
      normal: '<path d="M35 57Q40 60 45 57" stroke="#7A3B2A" stroke-width="2" fill="none" stroke-linecap="round"/>',
      worried: '<path d="M35 59Q40 56.5 45 59" stroke="#7A3B2A" stroke-width="2" fill="none" stroke-linecap="round"/>',
      angry: '<path d="M34 61Q40 54 46 61Z" fill="#7A2B1E"/>',
      happy: '<path d="M33 55Q40 64 47 55Z" fill="#8B2E22"/>',
    }[mood];
    const flush = mood === 'angry' ? '<circle cx="40" cy="46" r="20" fill="#E5402F" opacity=".22"/>' : '';
    const specs = glasses ? '<g fill="none" stroke="#2B2118" stroke-width="1.6"><circle cx="32.5" cy="48" r="5.2"/><circle cx="47.5" cy="48" r="5.2"/><path d="M37.7 48H42.3"/></g>' : '';

    return `<svg viewBox="0 0 80 110" aria-hidden="true">${back}` +
      `<path d="M8 110C8 84 21 72 40 72C59 72 72 84 72 110Z" fill="${shirt}"/>` +
      '<path d="M31 73L40 84L49 73" fill="none" stroke="rgba(0,0,0,.18)" stroke-width="2"/>' +
      `<rect x="34" y="60" width="12" height="14" rx="4" fill="${skin}"/>` +
      `<circle cx="20" cy="49" r="4.5" fill="${skin}"/><circle cx="60" cy="49" r="4.5" fill="${skin}"/>` +
      `<circle cx="40" cy="46" r="20" fill="${skin}"/>${flush}` +
      '<circle cx="27" cy="55" r="3.2" fill="#EE8A78" opacity=".45"/><circle cx="53" cy="55" r="3.2" fill="#EE8A78" opacity=".45"/>' +
      `${brows}${eyes}${specs}${mouth}${top}</svg>`;
  }

  return { bread, ing, egg, cup, jug, basket, trash, lock, customer };
})();
