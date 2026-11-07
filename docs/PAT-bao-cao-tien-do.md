# PAT — Báo cáo tiến độ triển khai

Cập nhật lần cuối: **2026-11-06**.

Mục đích: ghi lại việc đã rà soát/sửa, cách đã kiểm tra và phần còn chờ duyệt để bước tiếp theo không phải rà lại từ đầu. Cập nhật file này ngay sau mỗi đợt rà soát/sửa.

- Repo: `ai-website-cloner-template` (Next.js 16, React 19, TypeScript, Tailwind v4).
- Hợp đồng rà soát: workbook `G:/My Drive/Gia phả - Rà soát/PAT - Rà soát tầng 1.xlsx`. Cột I–K (Quyết định, Ghi chú/yêu cầu, Trạng thái) thuộc quyền người dùng — chỉ đọc, không ghi đè.
- Dev server kiểm tra: `http://localhost:3000`, gia phả mẫu `mau-gia-pha` (hồ sơ trình duyệt dùng khi kiểm tra P05-06).
- Quy ước: mọi thay đổi phải kiểm tra bằng trình duyệt ngoài (desktop + mobile), không chỉ typecheck.

## 1. Trạng thái mã nguồn

- Commit gần nhất: `790b5a1` — tab Công cụ (niên hiệu, Âm–Dương), hoàn thiện phả đồ in ấn.
- **Chưa commit** (đang ở working tree):
  - `src/components/sites/PAT/chronicle-view.tsx` — P13-05.
  - `src/components/sites/PAT/home-view.tsx` — P03-07.
  - `src/components/sites/PAT/types.ts` — ba trường phả ký mới.
  - `src/components/sites/PAT/branch-view.ts` — module mới cho phả đồ chi (P05-06).
  - `src/components/sites/PAT/branches-view.tsx` — khối “Xem theo chi”.
  - `src/components/sites/PAT/tree-editor-view.tsx`, `diagram-editor-view.tsx`, `layout.ts`, `diagram-canvas.tsx` — chế độ xem chi.
  - `src/components/sites/PAT/types.ts`, `layout.ts`, `diagram-canvas.tsx`, `diagram-inspector.tsx`, `design-view.tsx`, `diagram-editor-view.tsx` — khung viền hoa văn 4 mô-đun cố định (P12-05), vị trí dọc hoành phi mặc định 6% chiều cao giấy, hàng thẻ đầu ở 26% và rồng kéo đối xứng.
  - `public/sites/PAT/decor/khung/` — bốn ảnh khung do bạn cung cấp: `goc.png`, `ngang-giua.png`, `doc-giua.png`, `noi.png`.
- `npx tsc --noEmit` và `npx eslint` trên các file đã sửa: sạch.

## 2. Việc đã hoàn thành gần đây

### 2026-11-06 — P12-05: khung viền hoa văn dựng từ 4 mô-đun ảnh

Đã dựng đúng bản đặc tả 4 mô-đun bạn gửi, dùng bốn ảnh gốc trong `public/sites/PAT/decor/khung/` (không cắt, không vẽ lại):

| Mô-đun | Ảnh | Tỉ lệ gốc | Cách dùng |
| --- | --- | --- | --- |
| Khối góc | `goc.png` | 180 × 180 | Bốn góc: phải-dưới giữ nguyên, trái-dưới lật ngang, phải-trên lật dọc, trái-trên xoay 180°. |
| Dải ngang giữa | `ngang-giua.png` | 182 × 94 | Cạnh trên xoay 180°, cạnh dưới giữ nguyên. |
| Dải dọc giữa | `doc-giua.png` | 92 × 180 | Cạnh phải giữ nguyên, cạnh trái lật ngang. |
| Thân nối | `noi.png` | 90 × 92 | Cạnh trên lật dọc, cạnh dưới giữ nguyên; cạnh trái/phải xoay ±90° sao cho **chỉ đỏ luôn hướng vào trong**. |

Nguyên tắc kỹ thuật:

- **Tự khớp khổ giấy:** khung vẽ theo `viewBox` của trang in; dày viền `frameS = max(24, round(min(88, width × 0,0283) × cỡ viền))` tính lại mỗi khi đổi khổ hoặc đổi chiều ngang/dọc. Hệ số phụ thuộc bề rộng giấy nên khổ nhỏ có nét mảnh hơn; khổ lớn dừng ở mức trần 88 để khung không lấn nội dung.
- **Lát đều, không hở:** số lát mỗi cạnh `N = round(cạnh / bước)`, mỗi lát co giãn đúng bằng bước (`preserveAspectRatio="none"`), nên các mối nối trùng khít 0 đơn vị. Dải giữa được đặt chính giữa và thay đúng một bước ở giữa cạnh.
- **Chỉ đỏ liên tục phía trong:** ảnh gốc có phần trong suốt; đặt theo toàn bộ khung vẽ và lật/xoay từng mô-đun đúng bảng trên để đường chỉ đỏ của mọi mô-đun nối thành một vòng liền, hoa văn nâu nằm phía ngoài.
- **Nội dung né khung:** khối góc rộng 172/92 lần dày viền, nên lề nội dung và nhãn đời chừa theo `FRAME_CORNER_CLEARANCE = 172 × cỡ viền` thay vì chỉ chừa dày viền. Thẻ thành viên, nhãn đời và trang trí không đè lên hoa văn.
- **Nhãn đời hai bên:** canh giữa đúng tâm hàng thẻ (không phải tâm đời), lùi thêm 34 đơn vị so với mép khung góc, màu mặc định là tông đậm của bảng màu (`#6a100c`); có ô “Màu nhãn đời” để chọn màu khác. Thanh “Cỡ viền” 0,5–2×.
- **Cố định một loại khung:** bỏ lựa chọn “Sơn mài / Gỗ / Hoa văn” trong bảng chỉnh và bỏ “Khung viền: Không / Đơn giản / Hoa văn” ở trang Thiết kế bản in. Khung hoa văn luôn được vẽ; `frameStyle` và `borderStyle` được gỡ khỏi mô hình dữ liệu, dữ liệu cũ còn hai khoá này vẫn đọc được (bỏ qua khoá lạ). Chỉ còn điều chỉnh “Cỡ viền”.

Bằng chứng đo trên trình duyệt (`/gia-pha/mau-gia-pha/ve-pha-do`):

- **A0 ngang (1189 × 841 mm):** `viewBox 3454 × 2443,1`; 120 ảnh khung; bốn khối góc phủ đúng bốn góc giấy (0–172,2 và 3281,8–3454; 0–172,2 và 2357–2529,2); bước lát 86,34, chỉ có một khe giữa rộng 174,09 đúng bằng dải ngang giữa; nhãn đời ở `x = 206` và `3162`, lệch tâm hàng thẻ **0**.
- **A4 dọc (210 × 297 mm):** `viewBox 3454 × 4884,9` (đúng tỉ lệ 210:297); dày viền và khối góc giữ 88 / 172,17; lát ngang 34 chiếc + lát dọc 50 chiếc, không hở; nhãn đời vẫn ở `x = 206 / 3162`, lệch tâm hàng thẻ **0**.
- **Cỡ viền 2×:** khối góc 344 × 344, lề nội dung 344, nhãn lùi còn `x = 378`, các lát vẫn khít; đã trả cỡ viền về 1×.
- `npx tsc --noEmit` và `npx eslint` trên bốn file đã sửa: sạch.

Lưu ý hiển thị: do ảnh gốc có viền trong suốt, dải thẳng nằm thụt vào khoảng 49 đơn vị so với mép giấy còn khối góc chạm mép — đúng thiết kế của bộ ảnh; đường chỉ đỏ phía trong vẫn liền mạch.

Chờ bạn duyệt trên giao diện; khi bạn xác nhận mới ghi “Hoàn tất” cho P12-05.

### 2026-11-06 — Hoành phi: vị trí mặc định 6% chiều cao giấy, dịch lên/xuống có giới hạn

- `banner.offsetRatio` là **vị trí mép trên hoành phi** tính theo chiều cao giấy, mặc định `0,06`; thanh trượt trong bảng chỉnh tên “Vị trí dọc”, phạm vi 0–13%, bước 0,5%.
- Khi vẽ, mép trên hoành phi bị chặn trong `[frameS, 0,13 × height]`: kéo lên dừng sát khung trên, kéo xuống dừng ở 13% chiều cao giấy. Hoành phi dịch độc lập, nội dung phả đồ không xê dịch; khổ giấy và bố cục giữ nguyên.
- Đo trên `/gia-pha/mau-gia-pha/ve-pha-do` (A0 ngang, `viewBox 3454 × 2443,1`): mặc định `y = 147` (6,0% chiều cao); 0% → `y = 88` = dày khung; 13% → `y = 318` (13,0%). Thẻ “ĐẠI TỔ” giữ nguyên ở mọi mức vì hoành phi dịch độc lập.

### 2026-11-06 — Hàng thẻ đầu ở 26% chiều cao giấy; rồng kéo đối xứng

- **Hàng thẻ đầu tiên:** khối nội dung (thẻ, đường nối, nhãn đời, trang trí) được đặt sao cho **mép trên thẻ thành viên đầu tiên = 26% chiều cao giấy**. Gốc dọc `treeTop = 0,26 × height − min(node.y)`, chặn dưới để nội dung không tràn mép giấy. Áp dụng cho cả phả đồ đầy đủ, phả đồ chi và bản xem trước ở trang Thiết kế bản in; lề an toàn kéo–thả trang trí tính lại theo gốc mới.
- **Rồng kéo tự do, đối xứng:** mỗi bên rồng kéo được trong khoảng **từ cạnh hoành phi đến cạnh giấy** theo chiều ngang và trong lòng giấy theo chiều dọc; kéo một bên thì bên kia tự đối xứng qua trục giữa. Vị trí lưu vào `banner.dragonOffsetX` (độ dịch ra ngoài, ≥ 0) và `banner.dragonOffsetY`; giá trị được chặn lại theo khổ giấy hiện tại mỗi lần vẽ.
- Trong bảng chỉnh, ghi chú dưới ô “Cỡ rồng” hướng dẫn kéo trực tiếp rồng trên phả đồ.

Bằng chứng đo trên trình duyệt (`/gia-pha/mau-gia-pha/ve-pha-do`, A0 ngang `viewBox 3454 × 2443,07`):

- Gốc khối nội dung `translate(0, 415,199)`; thẻ đầu tiên `y = 220` trong hệ khối → mép trên thẻ **`635,199` = 26,00%** chiều cao giấy; hoành phi ở `y = 147` (6,02%), cách thẻ đầu **99,1** đơn vị.
- Kéo rồng phải vào sát hoành phi: hai rồng dừng ở `x = ±380` (mép hoành phi), đối xứng tuyệt đối.
- Kéo rồng trái ra xa: hai rồng dừng khi mép ngoài chạm mép giấy, `x = −1727` và `x = 1405` (mép ngoài `±1727`); kéo lên quá mép trên: `y = −147` trong hệ hoành phi = mép trên giấy, hiệu toạ độ hai bên vẫn cân.
- `npx tsc --noEmit`, `npx eslint` và `npm run build`: sạch.


### 2026-11-06 — P05-06: “Phả đồ chi” — xem và in theo trưởng chi

Đã triển khai theo đúng 5 điểm chốt. Toàn bộ lựa chọn nằm trên URL, **không ghi vào gia phả**.

| Lựa chọn | Tham số URL | Mặc định | Ghi chú |
| --- | --- | --- | --- |
| Trưởng chi | `chi` | — | Bắt buộc người đó là nội tộc (`role === "clan"`) |
| Số đời trực hệ phía trên | `tren` | 3 | 0–12 đời, chỉ nối chuỗi trực hệ, kèm vợ/chồng |
| Giới hạn số đời | `gioihan` | 3 | 0 = tất cả; đếm từ trưởng chi (trưởng chi là đời thứ nhất) |
| Kiểu thẻ | `the` | `gon` | `gon` = tên + đời; `du` = thêm năm sinh/mất |
| Chữ hoành phi | `hoanhphi` | “Chi <tên trưởng chi>” | Sửa trực tiếp trên đầu phả đồ chi |

Quy tắc tính chi (`branch-view.ts`):

- Chi = **toàn bộ hậu duệ** của người được chọn, cả nam và nữ nội tộc; dâu/rể hiện cạnh người hôn phối.
- Con của con gái hiện **một đời** như phả đồ chung nhưng **không tính** vào số lượng chi.
- Tiền tổ phía trên chỉ thêm đúng chuỗi trực hệ, không kéo theo anh chị em của các bậc đó.
- Giới hạn số đời chỉ ảnh hưởng phần **hiển thị**; số lượng thành viên luôn đếm đủ toàn chi.

Điểm vào và cách dùng:

- Trang **Chi phái** có khối “Xem theo chi”: chọn chi phái để gợi ý trưởng chi, hoặc chọn tay bất kỳ người nội tộc nào; đặt số đời trên, giới hạn đời, kiểu thẻ, hoành phi; xem nhanh số thành viên và số người hiển thị; hai nút mở **Cây gia phả** hoặc **Vẽ phả đồ** ở chế độ xem chi.
- Trang **Cây gia phả**: banner chi (tên, trưởng chi, số thành viên, số người hiển thị, số đời trên/giới hạn), nút “Xem phả đồ chi” và “Xem toàn bộ”; ẩn nút Thêm/Sửa, kéo thả, tìm ngoài phạm vi.
- Trang **Vẽ phả đồ**: chỉ hiện canvas + thanh xem chi, không inspector/kéo thả/trang trí; hoành phi hiển thị chữ đã sửa; nút “Xuất / In” mở sheet chỉ có PNG và In/Lưu PDF, kèm dòng “Chi … · n thành viên nội tộc · m người hiển thị”. Không cho lưu bố cục khi đang xem chi.
- Bỏ hoàn toàn nhánh “người chưa xếp chi” khỏi phả đồ chi.

Kiểm tra đã chạy trên trình duyệt ngoài (gia phả mẫu `mau-gia-pha`):

- Vào từ Chi phái → chọn C1 tự chọn trưởng chi Phạm Văn Trọng → “Xem trong Vẽ phả đồ” mở đúng `?chi=p04&tren=3&gioihan=3&the=gon&hoanhphi=Chi+Phạm+Văn+Trọng`.
- Phả đồ chi: **25 thẻ** (9 thành viên nội tộc + dâu/rể + tiền tổ), không còn 58 thẻ toàn dòng họ.
- `gioihan=3` + `tren=4`: banner “9 thành viên nội tộc · 26 người hiển thị · 4 đời trên · giới hạn 3 đời”; số thẻ 26 (52 clipPath = 2/thẻ), đúng 3 hàng hậu duệ.
- `the=gon`: không còn chuỗi năm sinh; `the=du`: hiện năm sinh/mất (ví dụ “1860 — 1945”).
- Sửa chữ hoành phi trên đầu phả đồ đổi ngay chữ trên hoành phi; không lưu vào dữ liệu.
- “Xuất / In” ở chế độ chi: sheet “Xuất phả đồ chi”, chỉ PNG + In/Lưu PDF, không có CSV/JSON/Thiết kế bản in.
- “Xem toàn bộ” trả URL về không tham số và khôi phục đủ **58 thẻ** / 58 nút ở Cây gia phả; banner chi biến mất.
- `npx tsc --noEmit` và `npx eslint` trên 6 file PAT đã sửa: sạch.

Chờ bạn duyệt trên giao diện; khi bạn xác nhận mới ghi “Hoàn tất” cho P05-06.

### 2026-11-06 — P13-05: tuỳ chọn danh sách thế thứ trong Phả ký

Đã thêm vào nhóm tuỳ chọn của chế độ “Soạn nội dung”:

| Tuỳ chọn | Giá trị | Mặc định | Lưu vào |
| --- | --- | --- | --- |
| Bố cục danh sách thế thứ | 1 cột / 2 cột | 2 cột | `chronicleColumns` |
| Số thứ tự trong danh sách | Không / Đánh số | Không | `chronicleChildNumbers` |
| Năm sinh người còn sống | Hiện / Ẩn | Hiện (đã chốt) | `chronicleHideLivingBirth` |

Chi tiết triển khai:

- `MemberLine` nhận `ordinal` và `hideLivingBirth`; khi ẩn, người còn sống hiện “Còn sống” thay cho chuỗi “năm sinh —”.
- `GenerationPages` nhận `columns`, `numbering`, `hideLivingBirth`; danh sách đo (ẩn) và danh sách in dùng cùng class cột để phân trang chính xác. Thêm `columns` vào dependency của hiệu ứng đo để đổi cột là phân trang lại ngay.
- Số thứ tự tính theo vị trí trong từng đời (1, 2, 3…), nối tiếp qua các trang, không đánh lại từ đầu mỗi trang.
- Mã chính: `chronicle-view.tsx:128` (MemberLine), `chronicle-view.tsx:215` (GenerationPages), `chronicle-view.tsx:863` (ba ô tuỳ chọn), `types.ts:341` (trường dữ liệu).

Kiểm tra đã chạy:

- 17/17 kiểm tra CDP: mặc định đúng, đổi 1/2 cột đổi bố cục thật, đánh số tuần tự, người còn sống không còn năm sinh, lưu qua tải lại, mobile không tràn ngang.
- 36/36 smoke test toàn bộ 8 mục desktop + 6 trang mobile: tiêu đề, điều hướng, console sạch, không tràn ngang.
- Ảnh xác nhận: `pat-chronicle-book-2col.png`, `pat-chronicle-book-1col.png`, `pat-chronicle-book-living.png` (thư mục Temp).

### 2026-11-06 — P03-07: nhắc sao lưu ngay sau khi nhập

- Báo cáo nhập dữ liệu có thêm khối “Nên sao lưu ngay sau khi nhập” với nút “Sao lưu ngay” tải JSON đầy đủ của đúng gia phả vừa nhập; nút gọi `exportBackup` nên cũng cập nhật mốc `phatue.lastBackupAt.v1`.
- Khối chỉ hiện với lần nhập mới (`report.result`), không hiện khi mở lại lịch sử nhập.
- Kiểm tra: 9/9 (banner đúng, blob JSON đúng tên/3 thành viên, mobile không tràn, khôi phục localStorage sau test).
- **Giới hạn đã biết:** trình duyệt không cho tự ghi tệp mà không có thao tác người dùng, nên đây là nhắc + tải một chạm, không phải tự sao lưu ngầm. Trên mobile, nhắc nằm trong sheet báo cáo (sheet mở tự động) thay vì toast dễ bị che.

### Trước đó (đã kiểm tra, đã commit trong `790b5a1` và các commit trước)

- Tab “Công cụ”: đổi ngày Âm–Dương tự chứa 1700–2199, hiển thị Can Chi dạng “ngày 3 tháng 2 năm Bính Ngọ”, cờ tháng nhuận, tra niên hiệu.
- Bỏ ô thống kê “Còn sống” ở Tổng quan (còn 3 ô: đời, thành viên, chi phái).
- Xử lý hết cảnh báo ESLint; build production và smoke test đạt trước khi commit.
- Các nhóm rà soát tầng 1 đã triển khai trước đó: khung ứng dụng/thuật ngữ, phả đồ kéo thả, chi phái, hồ sơ/biểu mẫu, nhập–xuất, phả ký, an toàn dữ liệu/quyền riêng tư. Chi tiết theo mã nằm trong workbook.

## 3. Cách kiểm tra lại nhanh (không cần rà từ đầu)

1. `npx tsc --noEmit` và `npx eslint src/components/sites/PAT`.
2. Mở `http://localhost:3000/gia-pha/g_pmx56uc3cs/pha-ky`:
   - “Soạn nội dung” → nhóm tuỳ chọn có 3 mục mới; đổi cột/số thứ tự/ẩn năm sinh thấy thay đổi ngay trong sách bên dưới.
   - Đời 3 của dữ liệu mẫu: đánh số 1–19; dòng 19 là “Đời 3 · Còn sống” khi chọn Ẩn.
3. Mở `http://localhost:3000/` → nhập một CSV 3 dòng → sheet “Báo cáo nhập dữ liệu” có khối nhắc sao lưu; bấm “Sao lưu ngay” tải JSON.
4. Phả đồ chi: `http://localhost:3000/gia-pha/mau-gia-pha/danh-sach-nhanh` → khối “Xem theo chi” → chọn C1 → xem trước → “Xem trong Vẽ phả đồ”; thử đổi giới hạn đời, kiểu thẻ, sửa hoành phi, “Xuất / In”, cuối cùng “Xem toàn bộ”.
5. Kiểm tra mobile 390×844 cho cả hai màn hình: không tràn ngang.
6. Nhớ khôi phục `localStorage` sau khi thử nhập liệu (các script kiểm tra trước đây đã làm việc này).

## 4. Đã đối chiếu mã nguồn — không cần làm lại

Rà ngày 2026-11-06, các mục từng bị coi là “chờ duyệt” nhưng thực tế đã có trong mã:

| Mã | Kết luận | Bằng chứng |
| --- | --- | --- |
| P03-05 | Đã làm đủ: chọn cây đích, hiện số người, cảnh báo “Bạn đang cập nhật…”, sheet xác nhận riêng | `home-view.tsx:1175`, `home-view.tsx:1355` |
| P03-08 | Đã làm: “Tiểu sử vị tổ” nằm ngay sau tên/giới tính/năm sinh, trước các trường nâng cao | `home-view.tsx:2096` |
| P05-07 | Đã làm: thẻ Sơ Tổ có ảnh, danh xưng, quê quán, nút Hồ sơ/Sửa | `tree-home-view.tsx:500` |
| P07-02 | Đã làm: nút “Đọc tiểu sử” ở đầu hồ sơ, mở sheet riêng | `member-detail-view.tsx:544`, `member-detail-view.tsx:1194` |
| P09-01 | Đã làm: tỷ lệ % đã xếp chi, bấm ô “Nam chưa xếp chi” để lọc | `branches-view.tsx:167`, `branches-view.tsx:177` |
| P09-04 | Đã làm: tìm trưởng chi theo tên, cảnh báo người làm trưởng hai chi | `branches-view.tsx:804`, `branches-view.tsx:828` |
| P09-06 | Đã làm: danh sách “Nam chưa xếp chi”, gán nhanh từng người và hàng loạt | `branches-view.tsx:407`, `branches-view.tsx:504` |
| P09-07 | Đã làm: xoá chi chỉ gỡ liên kết, có Hoàn tác và Thùng rác 30 ngày | `branches-view.tsx:562`, `branches-view.tsx:602` |
| P12-05 | Phần lớn đã làm: kéo thả trang trí, đổi độ đậm nền, chỉnh khung viền; vị trí dọc hoành phi (mặc định 6%, lên tới khung, xuống tối đa 13%); hàng thẻ đầu ở 26% chiều cao giấy; rồng kéo đối xứng từ cạnh hoành phi đến cạnh giấy; chặn trang trí trong lề an toàn | `diagram-editor-view.tsx:950`, `design-view.tsx:807`, `diagram-canvas.tsx`, `diagram-inspector.tsx` |
| P13-04 | Phần lớn đã làm: khối Sơ Tổ co giãn, danh sách đời tự ngắt trang; chưa có ảnh chân dung và giới hạn tiểu sử dài | `chronicle-view.tsx:1077`, `GenerationPages` |
| P14-06 | Một phần: nhãn đã đúng 52 cột, chọn “toàn bộ/thiết yếu”; **chưa** chọn cột tuỳ ý và khoảng dòng | `members-view.tsx:735`, `export.ts:150` |
| P02-05/06 | Đã đủ: bản mẫu tự hoàn nguyên khi mở lại, có “Tạo bản sao từ mẫu”; bạn đã xác nhận OK ngày 2026-11-06 | `store.tsx:312`, `home-view.tsx:939` |
| P01-08 | Đã làm: tour 3 bước tự hiện một lần, có “Bỏ qua” | `home-view.tsx:80`, `home-view.tsx:304`, `home-view.tsx:2540` |
| P02-07 | Đã làm: kiểm tra bản mẫu khi mở app, tự nạp lại nếu thiếu | `store.tsx:288`, `store.tsx:312`, `store.tsx:360` |
| P14-08 | Đã làm: giới hạn 10 MB / số dòng, huỷ giữa chừng, lỗi kèm dòng–cột | `import.ts:565`, `import.ts:689`, `import.ts:694`, `import.ts:805` |
| P15-08 | Đã làm: chặn tệp có schema mới hơn kèm thông báo rõ | `export.ts:270` |

## 5. Trạng thái sau khi chốt ngày 2026-11-06

| Mục | Quyết định của bạn | Việc còn lại |
| --- | --- | --- |
| P03-07 (phần auto) | Không làm | Giữ nguyên phần nhắc + tải JSON một chạm đã có; không thêm snapshot tự động. |
| P14-06 (phần chọn cột/khoảng) | Không làm | Giữ nguyên xuất “toàn bộ / thiết yếu”. |
| P05-06 | Đã chốt và đã triển khai: chi linh hoạt từ người được chọn làm trưởng chi | Chờ bạn duyệt trên giao diện; sau đó mới ghi “Hoàn tất”. Chi tiết ở mục 2 và 6.1. |
| P13-04 (phần mở rộng) | Tạm bỏ | Sẽ đề cập trong góp ý khác. |
| P12-05 | Đã chốt 3 nguyên tắc; đã code hoành phi + chặn trang trí + khung viền hoa văn 4 mô-đun theo đặc tả | Chờ bạn duyệt khung và nhãn đời trên giao diện; sau đó ghi “Hoàn tất”. Chi tiết ở mục 2 và 6.2. |
| P02-05/06 | Đã xác nhận OK | Không còn việc. |
| Xuất PDF | Cần so sánh để chọn | Xem mục 7. |
| Workbook (cột K) | Cho phép ghi nhận “Hoàn tất” cho mục đã xong | Lớp an toàn của công cụ đang chặn vì cột K thuộc quyền bạn; cần bạn xác nhận rõ “cho phép ghi cột K” trước khi tôi cập nhật. |
| Tầng 2 | Chờ hoàn tất tầng 1 rồi mới lập | Chưa có danh mục. |
| Phi chức năng | Làm vào thời điểm hợp lý | Hiệu năng cây lớn, bàn phím/focus, độ tương phản. |

## 6. Hai nội dung cần thống nhất (P05-06 và P12-05 đã xong phần mã, chờ duyệt giao diện)

### 6.1 Nguyên tắc xác định “Chi” (P05-06) — đã chốt hướng 2026-11-06

Yêu cầu đã chốt:

1. **Linh hoạt theo người được chọn.** Chọn một người làm “trưởng chi” thì “chi” = toàn bộ hậu duệ của người đó; xem được danh sách và số lượng thành viên.
2. **Hiển thị trên trang Phả đồ và xuất/in phả đồ chi.** Có tuỳ chọn hiện các vị trực hệ phía trên (cha, ông, cụ, kỵ…), ví dụ 4 đời trên.
3. **Thành viên:** toàn bộ nội tộc **nam + nữ**; dâu/rể hiện cạnh như phả đồ toàn dòng họ.
4. **Bỏ** phần “người chưa xếp chi” khỏi sơ đồ chi (không vẽ nhánh đứt nét, không cảnh báo trong sơ đồ).

Hệ quả kỹ thuật: “chi” trở thành **tập hợp suy ra từ người được chọn**, không phụ thuộc `branchId` đã gán tay. Cần giữ nguyên trang Chi phái hiện có (tên, màu, mã, trưởng chi) để quản lý, nhưng sơ đồ chi dùng phép duyệt hậu duệ từ người được chọn.

Ba điểm từng cần làm rõ — **đã chốt và đã code** ngày 2026-11-06:

1. **Vị trí hiển thị:** bộ chọn đặt ở trang **Chi phái**; kết quả xem được ở **cả** Cây gia phả và Vẽ phả đồ (mỗi trang có nút “Xem toàn bộ” để thoát).
2. **Số đời và kiểu thẻ:** mặc định giới hạn **3 đời** (0 = tất cả), đổi được 1–10 ngay trên khối “Xem theo chi”; kiểu thẻ **Gọn** mặc định, chọn được **Đầy đủ** (thêm năm sinh/mất).
3. **Con của con gái:** hiện một đời như phả đồ chung nhưng **không tính** vào số lượng chi.
4. **Chỉ để xem:** toàn bộ lựa chọn nằm trên URL, không ghi vào chi phái hay hồ sơ thành viên.

#### 6.1a Giải thích “số đời in ra” và “thông tin trên thẻ”

Đây là hai lựa chọn độc lập:

- **Số đời in ra:** một chi có thể sâu 5–7 đời. Nếu in tất cả trên một trang A4, thẻ phải thu nhỏ và chữ có thể khó đọc. Ba cách:
  - **In tất cả, tự co vừa trang** — đủ dữ liệu nhưng chữ nhỏ khi chi đông.
  - **Mặc định N đời dưới trưởng chi** (ví dụ 4), có nút “Hiện thêm đời” — dễ đọc, nhưng phải thao tác thêm.
  - **In tất cả + cho chọn giới hạn số đời** — mặc định đủ, ai cần gọn thì giảm. **Đề xuất cách này**; mặc định “tất cả”, có ô “Giới hạn số đời” (0 = tất cả).
- **Thông tin trên thẻ:**
  - **Gọn: tên + đời** — chữ to, vừa nhiều người, phù hợp treo tường.
  - **Đầy đủ: tên + đời + năm sinh/mất** — nhiều thông tin hơn nhưng thẻ phải rộng hơn.
  - **Cho chọn kiểu thẻ** — thêm một tuỳ chọn “Gọn / Đầy đủ”. **Đã chọn cách này**, mặc định “Gọn” cho phả đồ chi.

Kết quả chốt: **có ô “Giới hạn số đời” (mặc định 3, 0 = tất cả)** + **cho chọn kiểu thẻ (mặc định Gọn)**; con của con gái hiện một đời và không tính vào số lượng; bộ chọn đặt ở trang Chi phái, xem được ở cả Cây gia phả và Vẽ phả đồ.

### 6.2 Hoành phi, trang trí và khung viền (P12-05) — đã chốt ngày 2026-11-06

Ba nguyên tắc bạn chốt:

1. **Hoành phi:** canh giữa trên, vị trí mặc định mép trên ở **6% chiều cao giấy**; chỉ dịch chuyển **dọc**, dịch lên không vượt quá khung phía trên, dịch xuống không quá **13% chiều cao giấy** tính từ mép trên.
2. **Khung viền:** dùng cố định bộ 4 ảnh mô-đun bạn gửi (đã bỏ các kiểu khung khác); khung tự khớp khổ giấy, dày nét co giãn theo khổ, chỉ đỏ luôn hướng vào trong; nhãn đời hai bên canh giữa thẻ và dùng màu đậm hơn (chọn được màu).
3. **Trang trí:** chặn trong **lề an toàn in**.
4. **Hàng thẻ đầu & rồng (bổ sung 2026-11-06):** mép trên thẻ thành viên đầu tiên ở **26% chiều cao giấy**; rồng kéo tự do từ cạnh hoành phi đến cạnh giấy, một bên kéo thì bên kia đối xứng qua trục giữa.

Đã triển khai:

- **Vị trí dọc hoành phi:** `banner.offsetRatio` (0–0,13) là vị trí **mép trên hoành phi** theo tỉ lệ chiều cao giấy, mặc định `0,06`. Thanh trượt “Vị trí dọc” 0–13%, bước 0,5%. Khi vẽ, mép trên bị chặn trong khoảng `[dày khung, 13% × chiều cao giấy]`: kéo lên sát mép trong khung trên, kéo xuống tối đa 13%. Hoành phi canh giữa ngang và dịch chuyển độc lập, không làm xê dịch nội dung phả đồ (`types.ts`, `diagram-canvas.tsx`, `diagram-inspector.tsx`).
- **Hàng thẻ đầu ở 26%:** `treeTop()` trong `diagram-canvas.tsx` đặt gốc khối nội dung theo `0,26 × chiều cao giấy − min(node.y)`, chặn dưới để không tràn mép; `diagram-editor-view.tsx` dùng cùng gốc cho hộp an toàn và cuộn tới thành viên. Không đổi khổ giấy hay toạ độ thẻ đã lưu.
- **Rồng kéo đối xứng:** `dragonBounds()`/`dragonOffsets()` tính giới hạn ngang `[cạnh hoành phi, cạnh giấy]` và dọc `[mép trên, mép dưới giấy]`; kéo bên trái/phải đều cập nhật `banner.dragonOffsetX` (độ dịch ra ngoài) nên hai bên luôn đối xứng. `banner.dragonOffsetY` cho phép dịch dọc. Khi kéo chỉ cập nhật bản xem trước, thả chuột mới ghi vào thiết kế.
- **Chặn trang trí trong lề an toàn:** hộp an toàn suy ra từ `printSafeMarginMm` nhân với tỉ lệ mm → đơn vị canvas của khổ giấy hiện tại (đổi khổ/khổ ngang–dọc vẫn đúng). Áp dụng cho **kéo, đổi kích thước và thêm mới** trang trí; khi đổi kích thước, ảnh co theo đúng tỉ lệ và dừng ở mép lề. Rồng chầu có giới hạn riêng theo cạnh hoành phi/cạnh giấy, không dùng hộp lề an toàn của trang trí (`diagram-editor-view.tsx`).
- **Khung viền hoa văn 4 mô-đun:** dựng trong `diagram-canvas.tsx` theo bảng mô-đun ở mục 2 — khối góc bám đúng 4 góc giấy, dải ngang/dọc giữa đặt chính giữa cạnh, thân nối lát đều với `N = round(cạnh / bước)` và co giãn đúng bằng bước nên không hở/không chồng; mỗi mô-đun lật/xoay để **chỉ đỏ hướng vào trong**. Dày viền `frameS = max(24, round(min(88, width × 0,0283) × cỡ viền))` tự tính lại khi đổi khổ giấy. Lề nội dung chừa theo khối góc (`FRAME_CORNER_CLEARANCE = 172 × cỡ viền`) nên thẻ, nhãn đời và trang trí không đè lên khung. Thanh “Cỡ viền” 0,5–2×.
- **Nhãn đời hai bên:** nhãn canh giữa theo tâm hàng thẻ, lùi 34 đơn vị tính từ mép khung góc, màu mặc định là tông đậm của bảng màu (`#6a100c`) và có ô “Màu nhãn đời” để đổi. Ghi chú dưới ô màu: “Nhãn hai bên được canh giữa thẻ thành viên…”.

Bằng chứng kiểm tra trên trình duyệt (`/gia-pha/mau-gia-pha/ve-pha-do`):

- Hoành phi A0 ngang: mặc định mép trên `y = 147` = **6,0%** chiều cao giấy 2443,1; đặt 0% → chặn ở `y = 88` đúng dày khung trên; đặt 13% → `y = 318` = **13,0%** chiều cao giấy; `x` tâm giữ 1727.
- Hàng thẻ đầu A0 ngang: gốc nội dung `y = 415,199`, thẻ đầu `y = 220` trong hệ khối → mép trên `635,199` = **26,00%** chiều cao giấy; hoành phi cách thẻ đầu 99,1 đơn vị. Hoành phi dịch lên/xuống không làm thẻ xê dịch.
- Rồng A0 ngang: mặc định `x = −713,5` / `391,4`. Kéo vào sát hoành phi → `±380`; kéo ra xa → mép ngoài chạm mép giấy `±1727`; kéo lên → mép trên giấy `y = −147` (hệ hoành phi). Hai bên luôn đối xứng qua trục giữa.
- Kéo chữ trang trí vượt mép phải/dưới: dừng đúng tại `x=2996`, `y=1240` = mép giấy trừ lề 10 mm trừ kích thước món trang trí.
- Kéo núm đổi kích thước ảnh rồng (170×78, đặt tại `x=2884`) ra xa: chiều rộng dừng ở **199** = mép phải vùng an toàn − `x`, chiều cao co theo tỉ lệ (91).
- Khung A0 ngang: `viewBox 3454 × 2443,1`; khối góc phủ đúng bốn góc (0–172,2; 3281,8–3454); bước lát 86,34; chỉ một khe giữa 174,09 đúng bằng dải ngang giữa; nhãn `x = 206 / 3162`, lệch tâm hàng thẻ 0.
- Khung A4 dọc: `viewBox 3454 × 4884,9`; khối góc và dày viền vẫn 172,17 / 88; 34 lát ngang + 50 lát dọc, không hở; nhãn giữ `x = 206 / 3162`, lệch tâm hàng thẻ 0.
- Cỡ viền 2×: khối góc 344 × 344, lề 344, nhãn `x = 378`, lát vẫn khít; đã trả về 1×.
- Mở lại trang: dữ liệu mẫu tự hoàn nguyên (chỉnh sửa trên bản mẫu không ghi xuống `localStorage`), hoành phi trở về `y = 147`, không còn trang trí thử.

Còn lại: bạn duyệt trực tiếp khung và nhãn đời trên giao diện (mở trang vẽ, thử “Cỡ viền”, kéo “Vị trí dọc” của hoành phi, kéo thử một bên rồng và đổi khổ A4 dọc/ngang); sau khi bạn xác nhận mới ghi “Hoàn tất” cho P12-05.

### 6.3 Câu đối dọc, cỡ thẻ theo đời và nhãn đời co theo thẻ — đã triển khai ngày 2026-11-07

Ba yêu cầu bạn chốt:

1. **Câu đối dọc hai bên rồng:** dùng font thư pháp Việt, sửa được nội dung vế trái/phải, đổi được cỡ chữ, kéo tự do trong khoảng từ cạnh rồng tới cạnh giấy; kéo một bên thì bên kia đối xứng qua trục giữa.
2. **Bấm một thẻ:** ngoài các chức năng cũ, thêm tay nắm ở góc dưới phải để đổi cỡ thẻ; cỡ mới áp dụng cho **toàn bộ thẻ cùng đời**.
3. **Nhãn đời co theo cỡ thẻ của đời:** với khổ A0, nhãn cách mép trong khung viền **2,5 cm** và cách mép thẻ thành viên **2,5 cm**.

Đã triển khai:

- **Mô hình dữ liệu** (`types.ts`): thêm `CoupletSettings` + `DEFAULT_COUPLETS` (bật sẵn, vế “Tổ đức lưu phương thiên niên thịnh” / “Tông công hiển hách vạn đại vinh”, cỡ 32, màu `#8a1c15`, lệch 0) và `normalizeCouplets`; thêm `GenerationStyle.cardScale` (0,6–1,8); `tuning.cardScale` toàn cục (0,7–1,5) và `tuning.generationLabelScale` (0,4–2). Hàm `cardScaleFor = cardScale toàn cục × cardScale của đời`; `cardDimsFor` nhân hệ số này vào kích thước gốc 168×74 (ngang) hoặc 75×150 (dọc); `generationBandMetrics` co cả khung nhãn, cỡ chữ và khoảng chữ theo cùng hệ số.
- **Câu đối** (`diagram-canvas.tsx`): mỗi vế xếp mỗi tiếng thành một dòng dọc; khối rộng `1,65 × cỡ chữ`, bước dòng `1,3 × cỡ chữ`; đặt ngoài mép ngoài rồng với khe `max(10, 2% bề rộng hoành phi)`. Cả hai vế vẽ từ **cùng một độ dịch ra ngoài** nên luôn đối xứng qua trục giữa. Kéo bị chặn trong khoảng từ cạnh rồng tới mép trong khung và trong mép trên/dưới giấy; khi kéo chỉ hiện bản xem trước, thả chuột mới ghi `couplets.offsetX/offsetY`.
- **Kéo đổi cỡ thẻ** (`diagram-editor-view.tsx` + canvas): thẻ đang chọn có tay nắm tròn ở góc dưới phải. Kéo theo hướng chéo, tỉ lệ tính từ cạnh lớn hơn rồi làm tròn bước 0,05; thay đổi ghi vào `generationStyles[đời].cardScale` nên **mọi thẻ cùng đời** đổi cùng lúc. Nội dung thẻ vẽ ở kích thước gốc rồi scale cả nhóm, nên chữ và ảnh không tràn khi thẻ to/nhỏ. Có thông báo “Đã đổi cỡ thẻ cho … và toàn bộ thẻ cùng đời”.
- **Nhãn đời** (`diagram-canvas.tsx` + `layout.ts`): cỡ nhãn = `generationLabelScale × cardScaleFor(đời)`. Khoảng cách dùng `labelGap = round(73 × cỡ viền)` đơn vị; ở A0 (`viewBox` rộng 3486, tỉ lệ `1189 mm / 3486 = 0,3411 mm/đơn vị`) tương đương **24,9 mm ≈ 2,5 cm**. Nhãn trái ở `frameS + labelGap`, nhãn phải ở `width − frameS − labelGap − bề rộng nhãn`; lề nội dung `bandGutter = dày khung dự kiến + labelGap + bề rộng nhãn lớn nhất + labelGap` nên thẻ bắt đầu đúng 2,5 cm sau nhãn.
- **Inspector** (`diagram-inspector.tsx`): mục “Banner” có công tắc “Câu đối dọc hai bên rồng”, hai ô “Vế trái”/“Vế phải”, thanh “Cỡ chữ câu đối” 12–90 px, ô màu và ghi chú kéo/đối xứng/font. Mục “Dải đời” có thanh “Cỡ nhãn đời” 0,4–2× kèm ghi chú A0 2,5 cm. Bảng của một đời có thanh “Cỡ thẻ” 0,6–1,8× và liệt kê thẻ trong đời kèm nút Sửa.
- **In/PNG** (`export.ts`): nhúng font `Thu Phap Viet` (Dancing Script bản tiếng Việt, SIL OFL 1.1, đã ghi nguồn trong `SOURCES.md`) dưới dạng data URI vào bản sao SVG trước khi in/xuất, nên câu đối giữ nét thư pháp trong cửa sổ in và ảnh PNG. Tuỳ chọn “font serif hệ thống” chỉ đổi chữ thường, giữ nguyên `text.pat-couplet`.

Bằng chứng kiểm tra trên trình duyệt ngoài (`http://localhost:3001/gia-pha/mau-gia-pha/ve-pha-do`, bản production dựng sạch, `BUILD_ID 35lfp-G_ybPrV7mTgauGG`):

- **Câu đối:** có đúng 2 `text.pat-couplet`, font `"Thu Phap Viet", "Dancing Script", cursive`, `document.fonts.check` = true; mặc định 7 tiếng mỗi vế, cỡ 32, khối `52,8 × 291,2` đơn vị; tâm hai khối cộng lại **3486 = đúng bề rộng giấy** (đối xứng tuyệt đối). Kéo vế trái ra ngoài 14 px thì vế trái dịch −14 px, vế phải +14 px; kéo vào trong bị chặn ở 0 (sát cạnh rồng). Đổi “Vế trái” thành 4 tiếng → vế trái còn 4 dòng, vế phải vẫn 7 dòng; đổi cỡ 32 → 44 thì bước dòng 57,2 và bề rộng khối 72,6, hai vế vẫn đối xứng. Đã trả nội dung và cỡ về mặc định.
- **Cỡ thẻ theo đời:** chọn thẻ Đời 1 rồi kéo tay nắm 3 px → **cả 3 thẻ Đời 1** thành 202×89 (các đời khác vẫn 168×74), hiện thông báo đổi cỡ cho cả đời; thanh “Cỡ thẻ” trong bảng đời đọc đúng giá trị. Đặt thanh trượt 1,25 → cả 3 thẻ thành 210×93. “Bỏ ghi đè của đời này” trả về 168×74.
- **Nhãn đời A0 ngang (`viewBox 3486 × 2465,7`):** nhãn trái `x = 161`, rộng 86, cao 20; mép trong khung trái `x = 88` → khe **73 đơn vị = 24,9 mm**; thẻ bắt đầu `x = 320` → khe nhãn–thẻ **73 đơn vị = 24,9 mm**. Nhãn phải `x = 3239` (rộng 86) cách mép trong khung phải `3398` đúng 73 đơn vị.
- **Nhãn co theo thẻ:** Đời 1 tăng 1,25× → nhãn `107,5 × 25` (đúng 86×1,25 và 20×1,25), nhãn trái vẫn `x = 161`, thẻ bắt đầu `x = 342` (320 + 21,5), khe nhãn–thẻ vẫn 73,5 đơn vị. Thanh “Cỡ nhãn đời” 1,2× → nhãn `103,2 × 24`, `x = 161`, thẻ bắt đầu 337; trả về 1× thì nhãn lại 86×20.
- **Kiểm tra mã:** `npm run typecheck` và `npm run lint` không lỗi; build production sạch; trang tải không còn cảnh báo/404 trong console.

Lưu ý: các số đo nhãn ở mục 6.2 (`x = 206 / 3162`) là **trước** thay đổi này; số hiện hành là `x = 161 / 3239` như trên. Khổ giấy được cố định theo mục 6.4 nên đổi cỡ thẻ/cỡ nhãn không còn nới `viewBox`; hai nhãn vẫn giữ khe 2,5 cm ở cả hai phía.

### 6.4. Khổ giấy cố định khi chỉnh chi tiết

- **Mốc quy đổi:** `PAPER_UNITS_PER_MM = 3486 / 1189` (khổ A0 ngang: 1189 mm ↔ 3486 đơn vị, tương đương 0,3411 mm/đơn vị). Khổ A0 ngang vì vậy luôn là `viewBox 3486 × 2465,7` bất kể chi tiết đang chỉnh.
- **Khung giấy** (`paperUnitsFor` trong `diagram-canvas.tsx`): kích thước = `max(khổ mm × mốc, bố cục chuẩn)`; bố cục chuẩn dựng bằng `DEFAULT_DESIGN` (không vị trí kéo tay, cỡ thẻ 1×, cỡ nhãn 1×, khung 1×). Nhờ đó cây nhỏ trên khổ nhỏ vẫn vừa như trước, còn đổi chi tiết thì không làm giấy co giãn.
- **Chiều ngang/dọc** (`resolveOrientation` trong `export.ts`): khi bật tự xoay, chiều giấy xét theo bố cục chuẩn nói trên chứ không theo bố cục đang chỉnh, nên tăng cỡ thẻ không làm đảo khổ.
- **Nội dung rộng hơn giấy:** `offsetX` neo về 0 (không còn căn giữa âm) để nhãn đời vẫn đúng 2,5 cm tính từ mép trong khung; phần nội dung vượt khổ bị cắt theo giấy như bản in thật.
- **Bằng chứng đo** (production `BUILD_ID GKVZ2iWnY5_0UxpsqbXME`): mặc định `viewBox 3486 × 2465,707`, nhãn `86 × 20` tại `x = 161 / 3239`; đổi “Cỡ nhãn đời” 1,2× → nhãn `103,2` vẫn ở `x = 161`, `viewBox` **không đổi**; đổi “Cỡ viền” 1,4× và “Cỡ thẻ” Đời 1 1,45× (thẻ 168 → 244) → `viewBox` vẫn `3486 × 2465,707`, nhãn phải vẫn cách mép trong khung đúng `labelGap`. Trả hết về mặc định: thẻ 168×74, nhãn 86×20, `viewBox 3486 × 2465,707`.

## 7. Xuất PDF — so sánh nhanh

| Hướng | Ưu điểm | Nhược điểm |
| --- | --- | --- |
| **In qua hộp thoại trình duyệt (hiện tại)** | Không thêm thư viện; tôn trọng `@page`, khổ giấy, lề; người dùng chọn máy in hoặc “Lưu thành PDF”; font tiếng Việt ổn định | Bố cục phụ thuộc trình duyệt; người dùng phải tự chọn lề/tỉ lệ; mobile in không đều; không đảm bảo đúng số trang |
| **Xuất PDF trực tiếp trong app** | Kết quả nhất quán, đúng số trang, dễ lưu trữ/chia sẻ; in lại không cần mở trình duyệt | Thêm thư viện (~0,5–1 MB), phải nhúng font tiếng Việt; phả đồ lớn cần chia trang; công sức cao hơn, đặc biệt với phả ký nhiều trang |
| **Kết hợp (khuyến nghị)** | Giữ in trình duyệt làm mặc định; chỉ thêm “Tải PDF” cho **phả đồ** (ảnh vector/raster đóng gói PDF), phả ký vẫn in qua trình duyệt | Hai luồng cần ghi rõ trong giao diện để người dùng không nhầm |

## 8. Ghi nhận hoàn tất tầng 1

Theo mã nguồn và các đợt kiểm tra trình duyệt trước đó, **122/126 hạng mục** đủ điều kiện “Hoàn tất”, trong đó **P05-06 và P12-05 vừa triển khai xong, chờ bạn duyệt trên giao diện**. Giữ “Đã chốt” chờ quyết định cho 3 hạng mục: **P03-07, P13-04, P14-06**. P12-05 đã làm đủ hoành phi + chặn trang trí + khung viền hoa văn 4 mô-đun + nhãn đời canh giữa/dùng màu đậm (mục 2 và 6.2). P13-06 đã bỏ tính năng nên coi như đóng.

Workbook: cột K hiện vẫn toàn bộ “Đã chốt”. Lớp an toàn của công cụ chặn ghi vì cột K thuộc quyền bạn; khi bạn xác nhận rõ, tôi sẽ đổi K của 121 mã trên sang “Hoàn tất” và giữ nguyên 5 mã còn lại.

## 9. Quy trình khi được duyệt

Sửa → `tsc`/`eslint` → kiểm tra trình duyệt ngoài desktop/mobile → cập nhật mục 1–5 của file này.
