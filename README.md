# Quán Bánh Mì Trà Đá

Web game bán bánh mì – trà đá vỉa hè, lấy cảm hứng từ Cooking Marina. Bạn nhập vai chủ quán, có 3 phút để kiếm điểm cao nhất. Viết bằng HTML, CSS, JavaScript thuần, không cần cài thư viện.

- Hai ngôn ngữ: **tiếng Nhật** (mặc định) và **tiếng Việt**, đổi ở menu chính.
- Nhân vật chủ quán 2.5D: đặt tên, chọn tóc, màu da, trang phục, mũ. Nhân vật làm động tác theo từng thao tác của bạn.
- Game nhớ kỷ lục, nhân vật và ngôn ngữ trong trình duyệt.

## Cách chơi
- Chạm **giỏ bánh mì** → bánh lên lò than. Bánh vàng thì chạm để đặt lên đĩa.
- Chạm **khay nguyên liệu** để kẹp nhân. Trứng phải rán trên chảo trước.
- Chạm **bình trà** để rót, thêm **chanh** nếu khách gọi trà chanh.
- Chạm đĩa / cốc đã xong để đưa khách. Phục vụ nhanh được thêm điểm, phục vụ liên tục được combo.

**Một lượt = 3 phút.** Quán lên cấp mỗi 30 giây, hoặc sớm hơn khi điểm vượt ngưỡng (60, 160, 300, 480, 700…). Không giới hạn cấp: càng lên cao khách đến càng dày, chờ càng ít, gọi nhiều món hơn. Món mới mở dần theo cấp: thịt (cấp 2), trứng (cấp 3), trà chanh (cấp 4), đặc biệt (cấp 5).

**Bị trừ điểm khi:** khách chờ lâu bỏ về (−10), kẹp sai món (−8), để bánh / trứng cháy (−3), vứt đồ ăn vào thùng rác (−3).

**Mở khóa trang phục bằng kỷ lục:** khăn rằn 120 · đầu bếp, mũ lưỡi trai 250 · mũ đầu bếp 400 · áo dài 500 · hachimaki 650 · yukata 800.

## Chạy trong VS Code
1. **File → Open Folder…** chọn thư mục `banh-mi-tra-da`.
2. VS Code sẽ gợi ý cài extension **Live Server**. Bấm cài.
3. Chuột phải `index.html` → **Open with Live Server**. Game mở trên trình duyệt, sửa code là tự tải lại.

## Đưa lên GitHub (từ VS Code)
Cần cài [Git](https://git-scm.com/downloads) và có tài khoản GitHub.

1. Mở thư mục project trong VS Code, bấm biểu tượng **Source Control** ở thanh bên trái (hoặc `Ctrl+Shift+G`, Mac: `Cmd+Shift+G`).
2. Bấm **Publish to GitHub**, đăng nhập GitHub khi được hỏi.
3. Chọn **public** (công khai) hoặc **private** (riêng tư), giữ tên repo `banh-mi-tra-da`.
4. Khi VS Code hỏi chọn file, để nguyên tất cả và bấm OK. VS Code tự tạo repo, commit và đẩy code lên.

Sau này mỗi lần sửa code: vào **Source Control** → gõ ghi chú thay đổi → **Commit** → **Sync Changes**.

### Chơi online bằng GitHub Pages
1. Trên trang repo: **Settings → Pages**.
2. Ở **Build and deployment**, chọn **Deploy from a branch**, branch `main`, thư mục `/ (root)` → **Save**.
3. Đợi 1–2 phút, game có ở `https://<tên-tài-khoản>.github.io/banh-mi-tra-da/`.

Tài khoản GitHub miễn phí chỉ bật được Pages cho repo **public**.

## Cấu trúc
```
banh-mi-tra-da/
├── index.html     khung trang: phố, xe bánh mì, bếp, góc chủ quán, các màn hình
├── style.css      giao diện, bố cục, động tác nhân vật
└── js/
    ├── data.js    món, giá (= điểm), thời gian nấu, độ khó GAME  ← chỉnh game ở đây
    ├── i18n.js    toàn bộ chữ tiếng Việt / tiếng Nhật              ← sửa câu chữ ở đây
    ├── vendor.js  vẽ nhân vật chủ quán 2.5D + lựa chọn ngoại hình, mốc mở khóa
    ├── art.js     hình vẽ SVG: bánh mì, nguyên liệu, khách, cốc trà…
    ├── game.js    lõi game: 3 phút, lên cấp, khách, nấu, tính điểm, trừ điểm
    └── ui.js      menu, tạo nhân vật, giới thiệu, kết quả, điều khiển, khởi động
```

## Gợi ý chỉnh
- Độ khó: `GAME` trong `data.js` (`duration`, `levelEvery`, `scoreStep`, `penalty`, `spawn`, `patience`…).
- Thêm món: thêm vào `RECIPES` (tên ghi cả `vi` và `ja`), rồi thêm vào `GAME.unlocks` ở cấp muốn mở.
- Mốc mở khóa trang phục: `need` trong `OPTS` của `vendor.js`.
- Ngôn ngữ mặc định: `prog.lang = prog.lang || 'ja'` trong `game.js`.
- Dữ liệu lưu trong `localStorage` của trình duyệt (khóa `banhmi-trada-v2`).
