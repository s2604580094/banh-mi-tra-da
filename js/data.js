/* data.js — dữ liệu game: nguyên liệu, thực đơn, thời gian nấu, màn chơi.
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

// Thực đơn. price tính bằng nghìn đồng (15 = 15.000đ). short = tên ngắn trên bảng giá
const RECIPES = {
  pate: {
    name: { vi: 'Bánh mì pate', ja: 'パテのバインミー' }, short: { vi: 'BM pate', ja: 'パテ' },
    type: 'food', ings: ['pate', 'dua'], price: 15,
  },
  trung: {
    name: { vi: 'Bánh mì trứng', ja: '目玉焼きバインミー' }, short: { vi: 'BM trứng', ja: '目玉焼き' },
    type: 'food', ings: ['trung', 'ot'], price: 18,
  },
  thit: {
    name: { vi: 'Bánh mì thịt', ja: '肉のバインミー' }, short: { vi: 'BM thịt', ja: '肉入り' },
    type: 'food', ings: ['pate', 'cha', 'dua', 'rau'], price: 25,
  },
  dacbiet: {
    name: { vi: 'Bánh mì đặc biệt', ja: 'スペシャル・バインミー' }, short: { vi: 'BM đặc biệt', ja: 'スペシャル' },
    type: 'food', ings: ['pate', 'cha', 'trung', 'dua', 'rau', 'ot'], price: 35,
  },
  trada: {
    name: { vi: 'Trà đá', ja: 'チャーダー（氷茶）' }, short: { vi: 'Trà đá', ja: '氷茶' },
    type: 'drink', lemon: false, price: 5,
  },
  trachanh: {
    name: { vi: 'Trà chanh', ja: 'レモン茶' }, short: { vi: 'Trà chanh', ja: 'レモン茶' },
    type: 'drink', lemon: true, price: 10,
  },
};

// Thời gian (giây): chín → bắt đầu khét → cháy hẳn; pour = thời gian rót 1 cốc trà
const COOK = { bread: 2.2, breadWarn: 7, breadBurn: 10, egg: 2.4, eggWarn: 7.5, eggBurn: 10.5, pour: 1.1 };

// Cách chơi: mỗi lượt 3 phút, quán lên cấp theo thời gian HOẶC theo điểm (lấy mức cao hơn), không giới hạn cấp.
//  duration   = số giây mỗi lượt
//  levelEvery = cứ bao nhiêu giây thì quán tự lên 1 cấp
//  scoreStep  = [bậc đầu, phần tăng thêm mỗi bậc] → ngưỡng điểm lên cấp: 60, 160, 300, 480, 700…
//  unlocks    = cấp nào thì có thêm món nào
//  penalty    = điểm bị trừ: khách bỏ về, làm sai món, để cháy, vứt đồ ăn
//  slots / spawn / patience / double = số khách cùng lúc, khoảng cách giữa 2 khách (giây),
//               số giây khách chịu đợi, tỉ lệ khách gọi 2 món — đều tính theo cấp lv
const GAME = {
  duration: 180,
  levelEvery: 30,
  scoreStep: [60, 40],
  unlocks: { 1: ['pate', 'trada'], 2: ['thit'], 3: ['trung'], 4: ['trachanh'], 5: ['dacbiet'] },
  penalty: { leave: 10, wrong: 8, burnt: 3, waste: 3 },
  slots: lv => (lv <= 1 ? 2 : lv <= 3 ? 3 : 4),
  spawn: lv => { const f = Math.pow(0.88, lv - 1); return [Math.max(1.4, 5 * f), Math.max(2.2, 8 * f)]; },
  patience: lv => Math.max(9, 30 * Math.pow(0.93, lv - 1)),
  double: lv => Math.min(0.65, 0.25 + 0.05 * lv),
};

// Ngoại hình khách (chọn ngẫu nhiên)
const LOOKS = {
  skin:   ['#F4D2B3', '#E7B88F', '#C98D62', '#F0C9A0'],
  hair:   ['#2B2118', '#3E2A1E', '#5A3A24', '#1C1C1C'],
  shirt:  ['#2F74B5', '#D9443A', '#3E9B48', '#F2A516', '#7A5BA6', '#E8E2D4', '#1F4E3A', '#E07A5F'],
  style:  ['short', 'long', 'bun', 'nonla', 'helmet', 'cap', 'short', 'helmet'],
  helmet: ['#D9443A', '#2F74B5', '#F2F2F2', '#F2A516', '#3E9B48'],
};
