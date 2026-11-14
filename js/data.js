/* data.js — dữ liệu game: nguyên liệu, thực đơn, bản đồ quán, thời gian nấu, độ khó.
   Muốn đổi giá, thêm món hay chỉnh độ khó thì sửa ở file này. */

// Nguyên liệu: khóa dùng trong code → tên hiển thị (vi = tiếng Việt, ja = tiếng Nhật)
const INGS = {
  pate:  { name: { vi: 'Pate',     ja: 'パテ' } },
  cha:   { name: { vi: 'Chả lụa',  ja: 'ハム' } },
  trung: { name: { vi: 'Trứng ốp', ja: '目玉焼き' } },
  dua:   { name: { vi: 'Đồ chua',  ja: 'なます' } },
  rau:   { name: { vi: 'Rau mùi',  ja: 'パクチー' } },
  ot:    { name: { vi: 'Ớt',       ja: '唐辛子' } },
  chanh: { name: { vi: 'Chanh',    ja: 'レモン' } },
  // nguyên liệu hiếm ở chợ (chế độ Bếp Chiến)
  bo:    { name: { vi: 'Bò thượng hạng', ja: '極上牛肉' } },
  nam:   { name: { vi: 'Nấm cục',        ja: 'トリュフ' } },
  // xe xôi (Bếp Chiến)
  ruoc:    { name: { vi: 'Ruốc',          ja: '肉でんぶ' } },
  dauxanh: { name: { vi: 'Đậu xanh',      ja: '緑豆あん' } },
  hanh:    { name: { vi: 'Hành phi',      ja: '揚げエシャロット' } },
  lap:     { name: { vi: 'Lạp xưởng',     ja: '腸詰め' } },
  ga:      { name: { vi: 'Gà ta',         ja: '地鶏' } },
  xaxiu:   { name: { vi: 'Xá xíu',        ja: 'チャーシュー' } },
  // xe bún chả (Bếp Chiến)
  bun:     { name: { vi: 'Bún',           ja: 'ブン（米麺）' } },
  rausong: { name: { vi: 'Rau sống',      ja: '生ハーブ' } },
  toiot:   { name: { vi: 'Tỏi ớt',        ja: 'にんにく唐辛子' } },
  dudu:    { name: { vi: 'Đu đủ xanh',    ja: '青パパイヤ' } },
  nem:     { name: { vi: 'Nem rán',       ja: '揚げ春巻き' } },
  nemcua:  { name: { vi: 'Nem cua bể',    ja: '蟹の揚げ春巻き' } },
  bachi:   { name: { vi: 'Ba chỉ heo đen', ja: '黒豚バラ肉' } },
};

// Thực đơn. price = điểm nhận được (cũng là giá, nghìn đồng). short = tên ngắn
const RECIPES = {
  pate:     { name: { vi: 'Bánh mì pate', ja: 'パテのバインミー' }, short: { vi: 'BM pate', ja: 'パテ' }, type: 'food', food: 'banhmi', ings: ['pate', 'dua'], price: 15 },
  trung:    { name: { vi: 'Bánh mì trứng', ja: '目玉焼きバインミー' }, short: { vi: 'BM trứng', ja: '目玉焼き' }, type: 'food', food: 'banhmi', ings: ['trung', 'ot'], price: 18 },
  thit:     { name: { vi: 'Bánh mì thịt', ja: '肉のバインミー' }, short: { vi: 'BM thịt', ja: '肉入り' }, type: 'food', food: 'banhmi', ings: ['pate', 'cha', 'dua', 'rau'], price: 25 },
  dacbiet:  { name: { vi: 'Bánh mì đặc biệt', ja: 'スペシャル・バインミー' }, short: { vi: 'BM đặc biệt', ja: 'スペシャル' }, type: 'food', food: 'banhmi', ings: ['pate', 'cha', 'trung', 'dua', 'rau', 'ot'], price: 35 },
  trada:    { name: { vi: 'Trà đá', ja: 'チャーダー（氷茶）' }, short: { vi: 'Trà đá', ja: '氷茶' }, type: 'drink', lemon: false, price: 5 },
  trachanh: { name: { vi: 'Trà chanh', ja: 'レモン茶' }, short: { vi: 'Trà chanh', ja: 'レモン茶' }, type: 'drink', lemon: true, price: 10 },
  // món của khách VIP (chỉ có trong Bếp Chiến, nguyên liệu lấy ở chợ giữa bản đồ)
  bo:       { name: { vi: 'Bánh mì bò thượng hạng', ja: '極上牛のバインミー' }, short: { vi: 'BM bò', ja: '極上牛' }, type: 'food', food: 'banhmi', ings: ['bo', 'dua', 'rau'], price: 45, vip: true },
  nam:      { name: { vi: 'Bánh mì nấm cục', ja: 'トリュフのバインミー' }, short: { vi: 'BM nấm cục', ja: 'トリュフ' }, type: 'food', food: 'banhmi', ings: ['nam', 'pate', 'rau'], price: 45, vip: true },
  // xe xôi (Bếp Chiến). Món VIP có mã trùng tên nguyên liệu hiếm (ga, xaxiu)
  xoixeo:   { name: { vi: 'Xôi xéo', ja: 'ソイセオ（緑豆おこわ）' }, short: { vi: 'Xôi xéo', ja: '緑豆おこわ' }, type: 'food', food: 'xoi', ings: ['dauxanh', 'hanh'], price: 15 },
  xoitrung: { name: { vi: 'Xôi trứng', ja: '目玉焼きおこわ' }, short: { vi: 'Xôi trứng', ja: '目玉焼き' }, type: 'food', food: 'xoi', ings: ['trung', 'ruoc'], price: 18 },
  xoilap:   { name: { vi: 'Xôi lạp xưởng', ja: '腸詰めおこわ' }, short: { vi: 'Xôi lạp', ja: '腸詰め' }, type: 'food', food: 'xoi', ings: ['lap', 'ruoc', 'hanh', 'pate'], price: 25 },
  ga:       { name: { vi: 'Xôi gà ta', ja: '地鶏おこわ' }, short: { vi: 'Xôi gà', ja: '地鶏' }, type: 'food', food: 'xoi', ings: ['ga', 'hanh', 'ruoc'], price: 45, vip: true },
  xaxiu:    { name: { vi: 'Xôi xá xíu', ja: 'チャーシューおこわ' }, short: { vi: 'Xôi xá xíu', ja: 'チャーシュー' }, type: 'food', food: 'xoi', ings: ['xaxiu', 'pate', 'hanh'], price: 45, vip: true },
  // xe bún chả (Bếp Chiến)
  buncha:   { name: { vi: 'Bún chả', ja: 'ブンチャー' }, short: { vi: 'Bún chả', ja: 'ブンチャー' }, type: 'food', food: 'buncha', ings: ['bun', 'dua'], price: 15 },
  bunnem:   { name: { vi: 'Bún chả nem', ja: '揚げ春巻きブンチャー' }, short: { vi: 'Bún nem', ja: '春巻き' }, type: 'food', food: 'buncha', ings: ['nem', 'bun'], price: 18 },
  bunfull:  { name: { vi: 'Bún chả đầy đủ', ja: '全部のせブンチャー' }, short: { vi: 'Bún đủ', ja: '全部のせ' }, type: 'food', food: 'buncha', ings: ['bun', 'dudu', 'rausong', 'toiot'], price: 25 },
  nemcua:   { name: { vi: 'Bún chả nem cua bể', ja: '蟹春巻きブンチャー' }, short: { vi: 'Nem cua', ja: '蟹春巻き' }, type: 'food', food: 'buncha', ings: ['nemcua', 'bun', 'rausong'], price: 45, vip: true },
  bachi:    { name: { vi: 'Bún chả heo đen', ja: '黒豚ブンチャー' }, short: { vi: 'Heo đen', ja: '黒豚' }, type: 'food', food: 'buncha', ings: ['bachi', 'bun', 'toiot'], price: 45, vip: true },
};

// Các loại xe trong Bếp Chiến, mỗi đội chọn 1. Khu bếp giống nhau nhưng mỗi xe hiểu khác nhau:
// B lấy nguyên liệu chính (nướng/hấp trên G), E lấy đồ chiên (rán trên P), Z lấy đồ cần thái trên thớt,
// khay p u r o lấy 4 loại nhân. rare = nguyên liệu hiếm ở chợ (cũng là mã món VIP).
const FOODS = {
  banhmi: { bins: { p: 'pate', q: 'cha', u: 'dua', r: 'rau', o: 'ot' }, roll: 'cha', fry: 'trung', rare: ['bo', 'nam'],
            menu: ['pate', 'thit', 'trung'], rawKey: 'braw' },
  xoi:    { bins: { p: 'ruoc', q: 'lap', u: 'dauxanh', r: 'hanh', o: 'pate' }, roll: 'lap', fry: 'trung', rare: ['ga', 'xaxiu'],
            menu: ['xoixeo', 'xoilap', 'xoitrung'], rawKey: 'f:xoi:raw:' },
  buncha: { bins: { p: 'bun', q: 'dudu', u: 'rausong', r: 'toiot', o: 'dua' }, roll: 'dudu', fry: 'nem', rare: ['nemcua', 'bachi'],
            menu: ['buncha', 'bunfull', 'bunnem'], rawKey: 'f:buncha:raw:' },
};
const FOOD_IDS = ['banhmi', 'xoi', 'buncha'];

// Thời gian (giây)
const COOK = {
  bread: 3, breadWarn: 9, breadBurn: 12,   // bánh trên lò than: giòn → bắt đầu khét → cháy
  egg: 2.5, eggWarn: 8, eggBurn: 11,       // trứng trên chảo
  wash: 1.6,                               // rửa xong 1 cái đĩa / cốc
  eat: 6,                                  // khách ăn tại quán ngồi ăn bao lâu
};

// Bản đồ quán 20 cột × 12 hàng (nhìn chéo từ trên xuống). Mỗi ký tự là 1 ô:
//  #  tường        .  sàn bếp     ,  sàn lối đi   c  ghế nhựa (khách ngồi)   _  vỉa hè   D  cửa   g  tường kính
//  B  thùng bánh mì     G  lò than (1 ô = 1 vỉ)   E  khay trứng   P  chảo (1 ô = 1 chảo)
//  J  bình trà đá       L  chanh      C  cốc nhựa mang về     S  bồn rửa bát
//  R  kệ đĩa sạch       V  kệ cốc thủy tinh sạch              X  thùng rác
//  W  bàn gói giấy      m  quầy mang về (khách đứng ngoài)     =  quầy trống (đặt đồ)
//  T  bàn ăn            p q u r o  khay pate, chả, đồ chua, rau mùi, ớt
const MAP = [
  '####################',
  '#BGGEPPJLC##########',
  '#.........#........#',
  'S.........#.Tc..Tc.#',
  'R.=pquro=.#........#',
  'V.........,........#',
  'X.........,........#',
  '#.........,.Tc..Tc.#',
  '#.........,........#',
  '#WmmmmmggggggggggDg#',
  '____________________',
  '____________________',
];

// ---------- Chế độ BẾP CHIẾN (2 đội đối kháng) ----------
// Bản đồ 25 cột × 13 hàng: bếp Đội Đỏ (trái), vỉa hè chung + chợ (giữa), bếp Đội Xanh (phải, đối xứng).
// Ký tự mới:  K thớt (cắt thái)   Z khoanh chả (phải thái)   N nải chuối (lấy vỏ chuối)   Q chuông gọi khách VIP giả
//             M sạp chợ (nguyên liệu hiếm xuất hiện)          :  cửa bếp (mỗi cửa rộng 2 ô)   T bàn trên vỉa hè (khách ngồi ghế c phía trên)
const VS_LEFT = [
  '##########',
  '#BGGEPPJL#',
  'X........:',
  'C........:',
  'K.=pZuro.#',
  'K........#',
  'N........#',
  'Q..====..#',
  '#........:',
  '#........:',
  '##########',
];
const VS_MID = ['#####', '#MMM#', ',,,,,', ',,,,,', ',c,c,', ',T,T,', ',,,,,', ',,,,,', ',c,c,', ',T,T,', '#,,,#'];
const MAP_VS = VS_LEFT.map((row, y) => row + VS_MID[y] + [...row].reverse().join('')).concat(['_'.repeat(25), '_'.repeat(25)]);
// Bản đồ PHỐ CỔ (Bếp Chiến): mỗi đội một xe đẩy bánh mì trên vỉa hè, hai vỉa hè đối diện nhau, giữa là phố đi bộ.
// Cột 0 là mặt tiền nhà ống; cột 9 là mép vỉa hè (xe máy đỗ, chậu cây), ':' là lối xuống phố.
// Xe đẩy = khối 2 hàng ở giữa vỉa hè: hàng trên tủ kính bánh mì B, 2 lò than G, 2 chảo P; hàng dưới quầy + khay nhân.
// Sát nhà: rổ trứng E, bình trà J, chanh L, cốc C, ghế kê đồ '='; dọc mặt tiền: thùng rác, 2 thớt, nải chuối, chuông.
const PHO_LEFT = [
  '##########',
  '#E.J.L.C=#',
  'X........:',
  'K.BGGPP=.:',
  'K.=pZuro.#',
  'N........#',
  'Q........#',
  '#..====..#',
  '#........:',
  '#........:',
  '##########',
];
const MAP_PHO = PHO_LEFT.map((row, y) => row + VS_MID[y] + [...row].reverse().join('')).concat(['_'.repeat(25), '_'.repeat(25)]);

// Luật Bếp Chiến (giây / điểm)
const VS = {
  duration: 180,
  rush: 30,                       // giờ cao điểm: 30 giây cuối
  slideLen: 7, slideSpeed: 1.5,   // sàn bếp trôi: kéo dài 7 giây (đổi chiều giữa chừng), đẩy 1,5 ô/giây
  menu: ['pate', 'thit', 'trung', 'trada', 'trachanh'],
  vipMenu: ['bo', 'nam'],
  patience: 42, vipPatience: 55, fakeLife: 14,
  spawn: [3.5, 6], rushSpawn: [1.8, 3],
  vipEvery: [22, 30],             // khách VIP đến cách nhau (giây)
  marketEvery: [13, 19],          // chợ có hàng hiếm cách nhau (giây)
  marketWarn: 3,                  // báo trước khi hàng xuất hiện
  vipBonus: 15, finishBonus: 5, trickBonus: 10,
  penalty: { wrong: 8, burnt: 3, waste: 3 },
  chop: 1.6,                      // giây cắt xong 1 nguyên liệu
  bellCooldown: 20, peelCooldown: 5, peelLife: 20, maxPeels: 2,
  stun: 1.1,                      // trượt vỏ chuối: đứng hình bao lâu
  throwSpeed: 9, throwRange: 4.5,
  soloBoost: 1.35,                // đội ít người hơn: nấu và cắt nhanh hơn
};
const TEAMCOL = ['#D9443A', '#2F74B5'];

// Độ khó: mỗi lượt 3 phút, quán lên cấp theo thời gian HOẶC theo điểm (lấy mức cao hơn), không giới hạn cấp.
//  levelEvery = cứ bao nhiêu giây tự lên 1 cấp
//  scoreStep  = [bậc đầu, phần tăng thêm mỗi bậc] → ngưỡng điểm lên cấp: 60, 160, 300, 480, 700…
//  unlocks    = cấp nào có thêm món nào
//  penalty    = điểm bị trừ: khách bỏ về, đưa sai món, để cháy, vứt đồ ăn
//  plates / glasses = số đĩa, cốc thủy tinh sạch lúc mở hàng
//  spawn(lv, n)    = khoảng cách giữa 2 khách [ít nhất, nhiều nhất] giây, n = số người chơi
//  patience(lv)    = số giây khách chịu đợi; double(lv) = tỉ lệ khách gọi 2 món
const GAME = {
  duration: 180,
  levelEvery: 30,
  scoreStep: [60, 40],
  unlocks: { 1: ['pate', 'trada'], 2: ['thit'], 3: ['trung'], 4: ['trachanh'], 5: ['dacbiet'] },
  penalty: { leave: 10, wrong: 8, burnt: 3, waste: 3 },
  plates: 3,
  glasses: 3,
  dineShare: 0.5,
  speed: 4.2,
  spawn: (lv, n) => {
    const f = Math.pow(0.9, lv - 1) / (1 + 0.4 * (n - 1));
    return [Math.max(2, 7 * f), Math.max(3, 10 * f)];
  },
  patience: lv => Math.max(18, 48 * Math.pow(0.93, lv - 1)),
  double: lv => Math.min(0.6, 0.2 + 0.05 * lv),
};

// Ngoại hình khách (chọn ngẫu nhiên)
const LOOKS = {
  skin:   ['#F4D2B3', '#E7B88F', '#C98D62', '#F0C9A0'],
  hair:   ['#2B2118', '#3E2A1E', '#5A3A24', '#1C1C1C'],
  shirt:  ['#2F74B5', '#D9443A', '#3E9B48', '#F2A516', '#7A5BA6', '#E8E2D4', '#1F4E3A', '#E07A5F'],
  style:  ['short', 'long', 'bun', 'nonla', 'helmet', 'cap', 'short', 'helmet'],
  helmet: ['#D9443A', '#2F74B5', '#F2F2F2', '#F2A516', '#3E9B48'],
};
