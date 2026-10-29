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
};

// Thực đơn. price = điểm nhận được (cũng là giá, nghìn đồng). short = tên ngắn
const RECIPES = {
  pate:     { name: { vi: 'Bánh mì pate', ja: 'パテのバインミー' }, short: { vi: 'BM pate', ja: 'パテ' }, type: 'food', ings: ['pate', 'dua'], price: 15 },
  trung:    { name: { vi: 'Bánh mì trứng', ja: '目玉焼きバインミー' }, short: { vi: 'BM trứng', ja: '目玉焼き' }, type: 'food', ings: ['trung', 'ot'], price: 18 },
  thit:     { name: { vi: 'Bánh mì thịt', ja: '肉のバインミー' }, short: { vi: 'BM thịt', ja: '肉入り' }, type: 'food', ings: ['pate', 'cha', 'dua', 'rau'], price: 25 },
  dacbiet:  { name: { vi: 'Bánh mì đặc biệt', ja: 'スペシャル・バインミー' }, short: { vi: 'BM đặc biệt', ja: 'スペシャル' }, type: 'food', ings: ['pate', 'cha', 'trung', 'dua', 'rau', 'ot'], price: 35 },
  trada:    { name: { vi: 'Trà đá', ja: 'チャーダー（氷茶）' }, short: { vi: 'Trà đá', ja: '氷茶' }, type: 'drink', lemon: false, price: 5 },
  trachanh: { name: { vi: 'Trà chanh', ja: 'レモン茶' }, short: { vi: 'Trà chanh', ja: 'レモン茶' }, type: 'drink', lemon: true, price: 10 },
};

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
