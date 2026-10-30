# Quán Bánh Mì Trà Đá

Web game nấu ăn: bạn và tối đa 3 người bạn nhập vai chủ quán bánh mì – trà đá vỉa hè. Mỗi lượt chơi dài 3 phút. Có 2 chế độ:
- **Cùng bán:** cả nhóm chung một quán, nướng bánh, phục vụ khách mang về và khách ăn tại quán, rửa bát, tính chung điểm.
- **Bếp Chiến (2v2):** hai đội mở hai quán đối diện nhau, tranh khách và nguyên liệu hiếm ở chợ giữa, ném vỏ chuối, rung chuông VIP giả.

HTML, CSS, JavaScript thuần. Trên máy tính chơi bằng bàn phím, trên điện thoại / máy tính bảng chơi bằng điều khiển ảo (cầm ngang hay dọc đều được). Có 2 ngôn ngữ: tiếng Nhật (mặc định) và tiếng Việt.

## Điều khiển
| Phím | Việc |
|---|---|
| `W A S D` hoặc phím mũi tên | Di chuyển |
| `Space` hoặc `J` | Nhặt / Thả: cầm, đặt, dùng khu đang đứng gần (khu đó có viền vàng) |
| `E` hoặc `K` | Tương tác / Ném (Bếp Chiến): giữ ở thớt để cắt thái, rung chuông, ném đồ đang cầm. Ở chế độ Cùng bán, phím này giống `Space` |
| Giữ `Space` ở bồn rửa | Rửa bát |
| `Esc` | Tạm dừng (chơi 1 mình) |

**Trên điện thoại:**
- Kéo **cần điều khiển** bên trái để đi. Đẩy nhẹ thì đi chậm, đẩy hết thì đi nhanh.
- Bấm **nút đỏ** bên phải để cầm / đặt / dùng. Giữ nút đỏ ở bồn rửa để rửa bát.
- Bếp Chiến có thêm **nút cam**: Tương tác / Ném (giữ ở thớt để thái).
- Nút 🔍 (kính lúp) để chuyển giữa **phóng to** (camera đi theo nhân vật) và **xem toàn cảnh**. Nút ⏸ để tạm dừng, nút ⛶ để chơi toàn màn hình (Android).

**Điện thoại và iPad:** game tự chọn cách xếp màn hình cho cảnh quán to nhất.
- Điện thoại cầm ngang: thẻ và nút điều khiển ở 2 bên cảnh quán.
- iPad cầm ngang: thẻ và nút điều khiển ở dải phía dưới, cảnh quán to gần hết màn hình.
- Cầm dọc: cảnh ở trên, thẻ ở giữa, nút ở dưới.
- Khi màn hình nhỏ, cảnh được phóng to và camera đi theo nhân vật (cả ngang lẫn dọc). Mũi tên ở mép màn hình (ví dụ `1 ▶`, `▲ 2`) báo có khách đang chờ ở phần quán ngoài khung; màu xanh / vàng / đỏ là độ kiên nhẫn còn lại.
- Trên iPhone, chơi trong Safari bị thanh địa chỉ chiếm chỗ: nên **Thêm vào MH chính** (xem dưới) để cảnh to hơn.
- Game tránh tai thỏ và thanh home của iPhone.

**Chơi toàn màn hình như ứng dụng (nên làm trên điện thoại / iPad):**
- iPhone / iPad (Safari): mở link game → nút Chia sẻ (hình vuông có mũi tên lên) → **Thêm vào MH chính** (Add to Home Screen) → Thêm. Mở game từ biểu tượng mới trên màn hình chính: không còn thanh địa chỉ.
- Android (Chrome): mở link game → menu ⋮ → **Thêm vào màn hình chính** hoặc **Cài đặt ứng dụng**.

**Hai thẻ chữ to (máy tính và điện thoại):**
- **Đang cầm:** bánh đã kẹp những gì, đã lên đĩa hay gói giấy chưa, đủ món chưa, còn thiếu nguyên liệu gì; cốc có trà, có chanh chưa.
- **Trước mặt:** khu bạn đang đứng sát. Nếu có khách ở đó, thẻ hiện đơn của khách thật to: tên món, từng nguyên liệu, ăn tại quán hay mang về, thanh kiên nhẫn.

## Cách chơi
- **Bánh mì:** lấy bánh ở thùng bánh → đặt lên lò than → đợi bánh vàng thì lấy ra → cầm bánh tới khay nguyên liệu để kẹp nhân. Trứng phải rán trên chảo trước.
- **Khách ăn tại quán** ngồi ở bàn: cần bánh để trên **đĩa** (kệ đĩa) và trà rót trong **cốc thủy tinh** (kệ cốc). Ăn xong, khách để lại bát bẩn.
- **Khách mang về** đứng ngoài quầy: cần bánh **gói giấy** (bàn gói) và trà trong **cốc nhựa**. Bong bóng gọi món của họ hiện bên dưới, trên lòng đường.
- Bong bóng gọi món hiện hình món và **từng nguyên liệu** cần kẹp.
- **Rửa bát:** dọn bát bẩn trên bàn → mang tới bồn rửa → giữ `Space`. Hết đĩa hoặc cốc sạch thì không phục vụ được khách ngồi bàn.
- **Quầy trống:** đặt đồ lên đó để đồng đội cầm tiếp, hoặc để ghép trứng vào bánh.
- **Lên cấp:** quán lên cấp mỗi 30 giây, hoặc sớm hơn khi điểm vượt ngưỡng. Không giới hạn cấp. Món mới mở dần: thịt (cấp 2), trứng (cấp 3), trà chanh (cấp 4), đặc biệt (cấp 5).
- **Trừ điểm:**
  - Khách bỏ về: −10
  - Đưa sai món: −8
  - Để đồ cháy: −3
  - Vứt đồ ăn vào thùng rác: −3
- **Nhân vật:** đặt tên, chọn tóc, màu da, trang phục, mũ. Một số trang phục và mũ chỉ mở khi đạt đủ kỷ lục điểm.

## Bếp Chiến Hỗn Loạn (2v2)
Ở menu chọn tab **Bếp Chiến**. Đội nhiều điểm hơn sau 3 phút thắng.
- **Đội:** Đội Đỏ (bếp trái) và Đội Xanh (bếp phải), mỗi đội 1–2 người. Trong phòng chờ bấm **Đổi đội**. Chơi được 2v2, 2v1, 1v1; đội ít người hơn nấu và thái nhanh hơn 35%. Chơi 1 mình là luyện tập.
- **Khách chung:** khách ngồi ở vỉa hè giữa, đội nào mang đúng món tới trước thì được điểm.
- **Cửa bếp:** mỗi bếp có 2 cửa rộng 2 ô (khung gỗ, đèn lồng và thảm màu đội) thông ra vỉa hè. Lúc mất điện, đèn lồng ở cửa vẫn sáng.
- **Chợ giữa map:** cứ 13–19 giây một sạp đếm ngược 3 giây rồi bày **bò thượng hạng** hoặc **nấm cục**. Ai nhặt trước là của đội đó. Khách **VIP** (vương miện vàng) gọi món dùng các nguyên liệu này: 45 điểm + 15 thưởng.
- **Thớt:** chả lụa, bò, nấm phải đặt lên thớt rồi giữ `E` (nút cam) khoảng 1,6 giây để thái.
- **Vỏ chuối:** lấy ở nải chuối, ném (`E`) sang cửa bếp đội bạn hoặc thả xuống sàn. Ai giẫm phải trượt chân và đánh rơi đồ đang cầm. Mỗi đội tối đa 2 vỏ.
- **Chuông VIP giả:** rung chuông trong bếp mình (hồi 20 giây). Đội bạn mang món tới khách giả thì mất món, đội rung chuông +10.
- **Giờ cao điểm (30 giây cuối):** khách đến dồn dập, mất điện 2 lần, sàn bếp trôi như băng chuyền khoảng 7 giây (giữa chừng đổi chiều), khay nguyên liệu trong cả hai bếp bị đảo chỗ.
- **Trừ điểm:** sai món −8, đồ cháy −3, vứt đồ ăn −3.

## Chơi online 2–4 người
1. Một người chọn chế độ (Cùng bán hoặc Bếp Chiến), bấm **Tạo phòng online** và gửi **mã phòng** (5 ký tự) cho bạn bè. Chủ phòng vẫn đổi được chế độ trong phòng chờ.
2. Những người còn lại nhập mã rồi bấm **Vào phòng**.
3. Chủ phòng bấm **Bắt đầu**.

Các máy kết nối trực tiếp với nhau bằng WebRTC qua thư viện PeerJS (máy ghép phòng miễn phí của PeerJS), nên không cần tạo tài khoản máy chủ nào. Game phải chạy qua `https` (GitHub Pages) hoặc `localhost`.

Một số mạng trường học hoặc công ty chặn kiểu kết nối này. Khi đó game sẽ báo không kết nối được.

**Thử nhiều người trên 1 máy:** thêm `?local` vào cuối địa chỉ (ví dụ `http://127.0.0.1:5500/index.html?local`), rồi mở 2 tab: một tab tạo phòng, tab còn lại nhập mã.

## Chạy trong VS Code
Mở thư mục bằng VS Code → chuột phải `index.html` → **Open with Live Server**.

## Cập nhật lên GitHub (cách tải file qua web)
1. Vào repo → **Add file → Upload files** → kéo **toàn bộ nội dung bên trong** thư mục `banh-mi-tra-da` vào → **Commit changes**. File trùng tên sẽ được thay bằng bản mới.
2. Kiểm tra thư mục `js` trên GitHub có đủ 13 file: `data.js`, `i18n.js`, `art.js`, `chars.js`, `world.js`, `sim.js`, `versus.js`, `net.js`, `main.js`, `panels.js`, `layout.js`, `touch.js`, `screens.js`; và có thư mục `icons` (4 ảnh) cùng file `manifest.webmanifest` ở trang chính.
3. (Nên làm) Xóa các file cũ không còn dùng nếu vẫn còn: `vendor.js`, `game.js`, `ui.js`. Cách xóa: bấm vào file → nút `…` → **Delete file** → **Commit changes**.

Sau 1–2 phút, link GitHub Pages sẽ chạy bản mới.

## Cấu trúc
```
banh-mi-tra-da/
├── index.html      khung trang và các màn hình (menu, phòng chờ, tạo nhân vật, kết quả)
├── style.css       giao diện các màn hình
├── manifest.webmanifest  thông tin để "Thêm vào màn hình chính" (tên, biểu tượng, toàn màn hình)
├── icons/          biểu tượng ứng dụng
└── js/
    ├── data.js     món, giá (= điểm), bản đồ quán, thời gian nấu, độ khó   ← chỉnh game ở đây
    ├── i18n.js     chữ tiếng Việt / tiếng Nhật                              ← sửa câu chữ ở đây
    ├── art.js      hình vẽ SVG đồ ăn (bánh mì, nguyên liệu, cốc, bình trà…)
    ├── chars.js    vẽ nhân vật 2.5D 4 hướng + lựa chọn ngoại hình, mốc mở khóa
    ├── world.js    bản đồ, va chạm, vẽ quán theo góc nhìn chéo
    ├── sim.js      luật chơi Cùng bán: khách, nấu, phục vụ, rửa bát, điểm, cấp độ
    ├── versus.js   luật chơi Bếp Chiến 2v2: chợ, thớt, vỏ chuối, chuông giả, giờ cao điểm
    ├── net.js      kết nối phòng online (PeerJS) và chế độ thử ?local
    ├── main.js     bàn phím, vòng lặp, HUD, đồng bộ giữa các máy, bố cục theo màn hình
    ├── panels.js   thẻ "Đang cầm" và "Trước mặt" (chữ to)
    ├── layout.js   bố cục theo màn hình (máy tính, điện thoại, iPad), vùng an toàn, camera
    ├── touch.js    điều khiển ảo trên điện thoại
    └── screens.js  các màn hình và khởi động game
```

## Gợi ý chỉnh
- **Bố cục quán:** sửa `MAP` trong `data.js`. Mỗi ký tự là một ô, ý nghĩa ký tự ghi ngay phía trên `MAP`. Bản đồ Bếp Chiến là `VS_LEFT` (bếp trái, bếp phải tự lật đối xứng) và `VS_MID` (chợ và vỉa hè).
- **Độ khó Bếp Chiến:** sửa `VS` trong `data.js` (thời gian, tốc độ khách, hồi chuông, số vỏ chuối, thưởng VIP…).
- **Độ khó:** sửa `GAME` và `COOK` trong `data.js`.
- **Thêm món:** thêm vào `RECIPES` (tên ghi cả `vi` và `ja`), rồi thêm món đó vào `GAME.unlocks`.
- **Dữ liệu lưu:** lưu trong `localStorage` của trình duyệt (khóa `banhmi-trada-v3`). Nhân vật và kỷ lục của bản cũ vẫn được giữ.
