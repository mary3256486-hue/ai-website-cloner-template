# PAT — Báo cáo tiến độ triển khai

Cập nhật lần cuối: **2026-11-09**.

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
- **In/PNG** (`export.ts`): nhúng font thư pháp (từ mục 6.6 là hai bản Hải Yến, kèm Dancing Script dự phòng) dưới dạng data URI vào bản sao SVG trước khi in/xuất, nên câu đối giữ nét thư pháp trong cửa sổ in và ảnh PNG. Tuỳ chọn “font serif hệ thống” chỉ đổi chữ thường, giữ nguyên `text.pat-couplet`.

Bằng chứng kiểm tra trên trình duyệt ngoài (`http://localhost:3001/gia-pha/mau-gia-pha/ve-pha-do`, bản production dựng sạch, `BUILD_ID 35lfp-G_ybPrV7mTgauGG`):

- **Câu đối:** có đúng 2 `text.pat-couplet`, font `"Thu Phap Viet", "Dancing Script", cursive`, `document.fonts.check` = true; mặc định 7 tiếng mỗi vế, cỡ 32, khối `52,8 × 291,2` đơn vị; tâm hai khối cộng lại **3486 = đúng bề rộng giấy** (đối xứng tuyệt đối). Kéo vế trái ra ngoài 14 px thì vế trái dịch −14 px, vế phải +14 px; kéo vào trong bị chặn ở 0 (sát cạnh rồng). Đổi “Vế trái” thành 4 tiếng → vế trái còn 4 dòng, vế phải vẫn 7 dòng; đổi cỡ 32 → 44 thì bước dòng 57,2 và bề rộng khối 72,6, hai vế vẫn đối xứng. Đã trả nội dung và cỡ về mặc định.
- **Cỡ thẻ theo đời:** chọn thẻ Đời 1 rồi kéo tay nắm 3 px → **cả 3 thẻ Đời 1** thành 202×89 (các đời khác vẫn 168×74), hiện thông báo đổi cỡ cho cả đời; thanh “Cỡ thẻ” trong bảng đời đọc đúng giá trị. Đặt thanh trượt 1,25 → cả 3 thẻ thành 210×93. “Bỏ ghi đè của đời này” trả về 168×74.
- **Nhãn đời A0 ngang (`viewBox 3486 × 2465,7`):** nhãn trái `x = 161`, rộng 86, cao 20; mép trong khung trái `x = 88` → khe **73 đơn vị = 24,9 mm**; thẻ bắt đầu `x = 320` → khe nhãn–thẻ **73 đơn vị = 24,9 mm**. Nhãn phải `x = 3239` (rộng 86) cách mép trong khung phải `3398` đúng 73 đơn vị.
- **Nhãn co theo thẻ:** Đời 1 tăng 1,25× → nhãn `107,5 × 25` (đúng 86×1,25 và 20×1,25), nhãn trái vẫn `x = 161`, thẻ bắt đầu `x = 342` (320 + 21,5), khe nhãn–thẻ vẫn 73,5 đơn vị. Thanh “Cỡ nhãn đời” 1,2× → nhãn `103,2 × 24`, `x = 161`, thẻ bắt đầu 337; trả về 1× thì nhãn lại 86×20.
- **Kiểm tra mã:** `npm run typecheck` và `npm run lint` không lỗi; build production sạch; trang tải không còn cảnh báo/404 trong console.

Lưu ý: các số đo nhãn ở mục 6.2 (`x = 206 / 3162`) là **trước** thay đổi này; số hiện hành là `x = 161 / 3239` như trên. Khổ giấy được cố định theo mục 6.4 nên đổi cỡ thẻ/cỡ nhãn không còn nới `viewBox`; hai nhãn vẫn giữ khe 2,5 cm ở cả hai phía.

### 6.17. Tình trạng thành viên còn 2 lựa chọn + thẻ chữ mới trên Cây gia phả / Vẽ phả đồ / Thiết kế bản in — ngày 2026-11-09

Theo yêu cầu chốt lại của bạn: (1) phần thông tin thành viên chỉ giữ hai tình trạng **Còn sống / Đã mất**; (2) trong **thẻ thành viên** ở cả ba khu vực Cây gia phả, Vẽ phả đồ, Thiết kế bản in: xóa mọi avatar và xóa hiển thị đời bên trong thẻ (thủy tổ, đời 1…) — **nhãn đời bên ngoài thẻ vẫn giữ**; (3) mặc định thẻ hiển thị Họ tên **IN HOA** + năm sinh–năm mất (thiếu thì ghi "?") + ngày giỗ dạng **"dd/MM ÂL"**; người còn sống chỉ hiển thị tên, không kèm năm/ngày giỗ; cỡ chữ tên đủ lớn, vừa khung.

1. **Tình trạng thành viên:** `LifeStatus` thu về `"alive" | "deceased"`; chuẩn hoá dữ liệu cũ thiếu/khác về "đã mất" trong `store.normalizeTree`. Form thành viên chỉ còn 2 nút chọn (lưới 2 cột); hồ sơ và bảng in hiển thị "Còn sống" hoặc ngày mất tương ứng.
2. **Helper dùng chung** (`utils.ts:430`, `utils.ts:437`): `cardLifeYears(person)` trả `"năm sinh – năm mất"`, thiếu phía nào ghi `"?"` phía đó; `deathAnniversaryText(person)` chuẩn hoá trường nhập tự do ("10/01 âm lịch", "12 tháng 3") thành `"dd/MM ÂL"`, không đủ ngày/tháng hợp lệ thì ẩn.
3. **Thẻ chữ mới:** cả ba khu vực bỏ khối avatar và bỏ nhãn đời bên trong thẻ; tên vẽ IN HOA, đậm, cỡ = cỡ chữ thẻ × 1,16, tự xuống dòng vừa bề rộng khung; người đã mất kèm năm sinh–năm mất và "Giỗ dd/MM ÂL"; người còn sống chỉ tên. `DEFAULT_DESIGN` đặt `showAvatar:false`, `showTitle:false`; bỏ hai công tắc "Biểu trưng chữ Phạm" và "Danh xưng" ở bảng chỉnh và trang Thiết kế bản in; bỏ trường thừa "generation"/"deathAnniversary" khỏi chip trường thêm (ngày giỗ đã là mặc định).
4. **Giữ nhãn đời:** nhãn hàng bên trái Cây gia phả và dải nhãn hai bên phả đồ (ĐẠI TỔ / THỦY TỔ / SƠ TỔ / ĐỜI n) cùng công tắc "Nhãn đời" vẫn nguyên vẹn — chỉ phần đời **trong thẻ** bị gỡ.

**Bằng chứng kiểm tra trên trình duyệt ngoài** (bản production `http://localhost:3001`, desktop 1440×1000 và mobile 390×844, gia phả mẫu `mau-gia-pha`):

- **Cây gia phả:** 58 thẻ, **0 avatar**; 34 thẻ đã mất có dòng năm (ví dụ "PHẠM VĂN ĐẠO ? – ?", "PHÙNG THỊ MƠ 1860 – 1945"), 24 thẻ còn sống **chỉ tên** (ví dụ "LƯU THỊ HÀ"); không còn chữ đời trong thẻ; nhãn hàng ĐẠI TỔ…ĐỜI 4 vẫn hiển thị.
- **Ngày giỗ end-to-end:** mở thẻ một thành viên đã mất → "Sửa thông tin" → tab "Thờ tự & tiểu sử" → nhập "12 tháng 3" → lưu; thẻ Cây gia phả thành **"PHẠM VĂN ĐẠO ? – ? Giỗ 12/03 ÂL"**, và đúng chuỗi "Giỗ 12/03 ÂL" xuất hiện trong svg của **Vẽ phả đồ** lẫn khối xem trước **Thiết kế bản in**.
- **Vẽ phả đồ + Thiết kế bản in:** 0 `img`/`use` avatar; tên IN HOA; dải nhãn đời hai bên giữ nguyên; bố cục khung hoa văn không đổi.
- **Mobile 390:** cả ba khu vực không avatar, nhãn đời giữ, khung xem trước vừa màn hình, không vỡ bố cục.
- **Kiểm tra mã:** `npm run lint`, `npm run typecheck`, `npm run build` sạch (4 route static: `/`, `/_not-found`, `/gia-pha`, `/gia-pha/thanh-vien`).

### 6.16. Dựng vỏ app PC (Electron) + Android (Capacitor) quanh `out/`, cầu nối in/tải file — ngày 2026-11-08

Tiếp nối 6.15 (đã chốt “chốt”): dựng vỏ native chạy offline từ một lõi build tĩnh `out/`, kèm cầu nối in và tải file hoạt động cả trong WebView lẫn trình duyệt. PC chọn **Electron** ( chỉ cần Node, Chromium bảo đảm `window.print`/`window.open`/tải file); Android dùng **Capacitor 8** + JDK 21 + Android SDK cài cục bộ để build APK thật.

1. **Cầu nối native** (`src/components/sites/PAT/native.ts`):
   - `printCurrentPage(title)`: Android → `NativePrint.printCurrent` (PrintManager trên WebView thật, giữ CSS `@media print`); còn lại → `window.print()`.
   - `printSvgDiagram` (trong `export.ts`): Android → `NativePrint.printHtml` (WebView ngoại tuyến dựng từ HTML tự chứa); còn lại → `window.open` rồi `print`.
   - `saveBlob`/`downloadBlob`: Android → `@capacitor/filesystem` ghi `Directory.Cache` rồi `@capacitor/share` mở hộp thoại lưu/chia sẻ hệ điều hành; còn lại → thẻ `a[download]` + `URL.createObjectURL`.
   - **Font in cho bản in phả đồ:** `export.ts` nhúng toàn bộ `@font-face` của Be Vietnam Pro + Playfair Display thành **data-uri base64** (26 face), dò `url(...)` theo `sheet.href` (không theo base trang) để lấy đúng woff2 self-host; **bỏ link Google Fonts** remote → bản in chạy offline và trong WebView in của Android.
   - Các điểm xuất đã nối cầu nối: `members-view.tsx` (in danh sách), `member-detail-view.tsx` (in hồ sơ/PDF), `documents-view.tsx` (tải tư liệu), `gedcom.ts`, `import.ts` (Excel/CSV), `import-history.ts` (snapshot).
2. **Vỏ Android** (`capacitor.config.ts`, `android/`): appId `vn.tieupham.giapha`, appName “Tiểu Phạm”, `webDir "out"`, `androidScheme "https"`. Plugin Java cục bộ `NativePrintPlugin.java` (`printCurrent` + `printHtml`); `MainActivity` gọi `registerPlugin(NativePrintPlugin.class)` **trước** `super.onCreate()` (Capacitor 8 bỏ `add()`, `onCreate` kết thúc bằng `this.load()`). Icon/splash sinh từ `assets/logo.png` + `assets/splash.png` (bộ mipmap adaptive + drawable port/land/night đầy đủ). compileSdk/targetSdk 36, minSdk 24.
3. **Vỏ PC** (`electron/main.mjs` ESM, `electron-builder.yml`): server http nội bộ `127.0.0.1:0` serve `out/` (MIME đúng, chặn path traversal, fallback 404.html); cửa sổ 1440×900, `contextIsolation` + `sandbox`; `setWindowOpenHandler` cho `about:blank` (cửa sổ in) + same-origin, còn lại mở ngoài; `will-download` đặt hộp thoại lưu vào thư mục Downloads; menu tiếng Việt (Tệp/Xem/Trợ giúp, Ctrl+P → `webContents.print`). Đóng gói NSIS (setup) + portable, icon `build/icon.png`, chưa ký số.
4. **Script/công cụ:** `scripts/make-icons.mjs` (sharp ghép logo nền `#8a1c15` → assets + build/icon.png), `scripts/build-android.mjs` (tự dò JDK 21 + SDK, chạy `gradlew assembleDebug`); package.json thêm `icons`, `electron:dev`, `electron:build`, `cap:sync`, `android:apk`. Toolchain cục bộ: JDK 21 Temurin, Android SDK platforms 35+36 / build-tools 35+36, Gradle 8.14.3 (seed zip vào cache wrapper để khỏi tải lại).
5. **ESLint:** thêm `android/**`, `dist-electron/**`, `dist/**` vào `globalIgnores` (cap sync chép `out/` vào assets android sinh JS minified, không phải mã nguồn).

**Bằng chứng kiểm tra:**

- `npm run lint`, `npm run typecheck`, `npm run build` sạch (4 route static). `npx cap sync android` chép `out/` mới + nhận 2 plugin filesystem/share.
- **Cầu nối trên web** (`http://localhost:3001`, bản export tĩnh) — **8/8 PASS**: cửa sổ in phả đồ mở + gọi print; **26/26 font nhúng base64**; không còn Google Fonts; SVG phả đồ **58 `<use>`**; `document.fonts.load` nạp đủ Be Vietnam + Playfair; in danh sách qua `printCurrentPage`; CSV blob đúng tên tệp **22.200 bytes**; **BOM UTF-8 + 61 dòng**.
- **App Electron đã đóng gói** chạy qua CDP (Chrome/156.0.8078.80, server nội bộ cổng ngẫu nhiên) — **4/4 PASS**: nạp trang chủ “Tiểu Phạm — Gia Phả”; mở gia phả mẫu + phả đồ; cửa sổ in phả đồ **26 face / 26 data-uri / 58 use**; CSV blob **BOM + 61 dòng**. `app.asar` chứa `/out/gia-pha/index.html`, `/electron/main.mjs`, 200 mục `out/`, **16 woff2** self-host.
- **APK:** `android/app/build/outputs/apk/debug/app-debug.apk` **20.932.740 bytes**, BUILD SUCCESSFUL (đã nhúng `out/` sửa font).
- **Artifact PC:** `dist-electron/TieuPham-GiaPha-setup-0.6.1.exe` (**206.350.089**) và `...-portable-0.6.1.exe` (**170.807.778**); bản unpacked chạy được ở `dist-electron-build/win-unpacked/`. Ảnh: `pat-audit/electron-home.png`, `electron-diagram.png`, `electron-members.png`, `bridge-print-design.png`, `bridge-members.png`.

**Lưu ý môi trường (không phải lỗi app):**

- Headless Chrome 156 **huỷ tải blob ở bước ghi đĩa** (nhận đủ bytes rồi `canceled`) → kiểm tra tải file bằng cách đọc thẳng blob app tạo ra (đúng bytes sẽ ghi đĩa), không dựa vào đĩa headless.
- Windows Defender khoá `default_app.asar` lúc electron-builder đổi tên thư mục (`EBUSY`/`EPERM`) → build bằng `electronDist` trỏ tới bản Electron giải nén sẵn (`copyDir`, không rename atomic). Vài thư mục `win-unpacked` cũ còn khoá chưa xoá được ngay; bản phân phối là các exe trong `dist-electron/`.
- **Chưa commit/push** (chờ yêu cầu riêng).

### 6.15. Chuyển static export: nền chung đóng gói app PC (Tauri/Electron) và Android (Capacitor) — ngày 2026-11-08

Hướng đã chốt với bạn: đóng gói app cho cả Android lẫn PC bằng **một lõi build tĩnh** (`output: "export"`), thay vì giữ server Next.

1. **Cấu hình** (`next.config.ts`): `output: "export"`, `trailingSlash: true` (mỗi route thành thư mục có `index.html`, server cục bộ của Capacitor/Tauri mở được), `images: { unoptimized: true }` (không cần server optimizer của `next/image`).
2. **Routing tĩnh + query**: bỏ toàn cây route động `gia-pha/[id]/…` (4 page), thay bằng hai route tĩnh:
   - `/gia-pha/?tree=<id>&section=<slug>` — tổng quan và 7 section (`src/app/gia-pha/tree-screen.tsx`);
   - `/gia-pha/thanh-vien/?tree=<id>&member=<id>` — hồ sơ thành viên (`src/app/gia-pha/thanh-vien/member-screen.tsx`).
   Hai page bọc screen trong `<Suspense>` theo yêu cầu của `useSearchParams` khi export tĩnh. Helper mới `routes.ts` (`treePath`, `memberPath`) là chỗ duy nhất dựng URL; khoảng 40 điểm điều hướng ở 11 file đã đổi theo (trang chủ, shell, danh sách/hồ sơ/biểu mẫu thành viên, cây, chi phái, editor phả đồ, thiết kế bản in). `branchViewHref` giờ **ghép** query chi (`chi`, `tren`, `gioihan`, `the`, `hoanhphi`) vào query có sẵn thay vì ghi đè. `useTreeFromRoute` đọc `tree` từ query; tab active của shell dựa vào prop `section` (bỏ `usePathname`); thêm cuộn lên đầu trang khi đổi section/thành viên để giữ cảm giác chuyển trang như cũ.
3. **Viewport** (`layout.tsx`): thêm `viewport-fit=cover` để `env(safe-area-inset-bottom)` của thanh nav dưới hoạt động trên màn hình tai thỏ khi vào vỏ app.
4. **Giữ nguyên**: dữ liệu vẫn localStorage/IndexedDB; in/xuất, font thư pháp, trang trí không đổi. Cầu nối in/tải file cho Android WebView sẽ làm ở bước dựng vỏ Capacitor, không thuộc thay đổi này.

**Bằng chứng kiểm tra** trên bản export tĩnh serve từ `out/` tại `http://localhost:3001`, `BUILD_ID 07WXIl9yLQIqeXoiblVnd`:

- `npm run lint`, `npm run typecheck`, `npm run build` sạch; bảng build gồm 4 route đều ○ (static): `/`, `/_not-found`, `/gia-pha`, `/gia-pha/thanh-vien`.
- Bộ kiểm tra trình duyệt tự động **14/14 PASS**: trang chủ (tiêu đề Khối Đình Tiểu Phạm, tên mẫu mới), mở mẫu → URL query, tổng quan 58 thành viên, hồ sơ Sơ Tổ → URL query, nav Phả hệ, deep link `ve-pha-do` + reload giữ đúng trang, branch view giữ đồng thời `tree` + `chi` (“Phả đồ chi”, 26 thành viên nội tộc), MissingTree/EmptyState với id không tồn tại, **0 request ra ngoài localhost** (font self-host), 0 lỗi JS.
- Mobile 390×844: thanh nav dưới cố định sát đáy (bottom = 844 = chiều cao viewport), bấm Phả hệ điều hướng đúng. Ảnh: `pat-audit/static-home.png`, `static-tree-home.png`, `static-members.png`, `static-member-detail.png`, `static-diagram.png`, `static-branch.png`, `static-mobile-tree.png`, `static-mobile-members.png`.
- Dev server :3000 tự nạp cấu hình mới và vẫn trả 200 cho URL query.

Lưu ý: URL cũ dạng `/gia-pha/<id>/<section>` không còn (app cục bộ, không có liên kết công khai cần giữ); `next start` không tương thích `output: "export"` nên server thử nghiệm :3001 đã thay bằng static server serve `out/`.

### 6.14. Tiêu đề trang chủ, tên bản mẫu và biểu trưng chữ Phạm trên phả đồ — ngày 2026-11-08

Ba yêu cầu của bạn:

1. **Trang chủ:** tiêu đề đầu trang đổi từ “Tiểu Phạm” thành **“Khối Đình Tiểu Phạm”** (`home-view.tsx`).
2. **Bản mẫu:** tên đổi từ “GIA PHẢ HỌ PHẠM HÀ NỘI (MẪU)” thành **“GIA PHẢ HỌ PHẠM (MẪU)”** (`seed.ts`). Bản mẫu không lưu xuống localStorage nên mọi phiên nạp lại đều nhận tên mới; bản sao tạo từ mẫu cũng mang tên mới.
3. **Phả đồ:** mọi avatar thành viên (ảnh riêng hoặc chữ tắt) thay bằng **biểu trưng chữ Phạm vàng trên nền đỏ như logo trang chủ** (`diagram-canvas.tsx`). Ảnh `han-pham.png` đặt một lần trong `<defs>` rồi mỗi thẻ tham chiếu bằng `<use>` — bản in/PNG chỉ nhúng ảnh một lần thay vì 58 bản sao. Nền đỏ `#8a1c15` đúng màu logo; chế độ tiết kiệm mực giảm độ đậm nền như cũ. Công tắc ở Thiết kế bản in và inspector đổi nhãn thành “Biểu trưng chữ Phạm”; thẻ mẫu trong inspector hiện đúng biểu trưng. Ảnh chân dung vẫn giữ ở danh sách, hồ sơ và biểu mẫu thành viên (ngoài phạm vi phả đồ).

**Bằng chứng kiểm tra** trên bản production `http://localhost:3001`, `BUILD_ID _Fl6IQUjOljX3jT5RX4Sf`:

- **Trang chủ** 1440×900 và 420×900: tiêu đề mới hiện một dòng (cao 24 px, rộng 284 px ở khổ mobile), không tràn ngang; thẻ bản mẫu mang tên mới. Ảnh: `pat-audit/pham-home-desktop.png`, `pham-home-mobile.png`.
- **Phả đồ** (`ve-pha-do`): đúng **58 `<use>`** tham chiếu biểu trưng, **1** ảnh trong defs, 58 nền đỏ; không còn chữ tắt. Cắt vùng thẻ ở toàn khổ 3572 px cho thấy chữ Phạm vàng rõ nét trong tròn đỏ (`pat-audit/pham-crop-cards.png`).
- **Công tắc** (`giao-dien`): bấm “Biểu trưng chữ Phạm” tắt → 0 use; bật lại → 58 use.
- **Đường xuất PNG:** dựng thử đúng cách export (nhúng ảnh thành data URI rồi raster bằng canvas) cho ảnh đủ biểu trưng trên mọi thẻ (`pat-audit/pham-export-raster.png`, `pham-full-res.png`).
- **Bản in thành viên:** PDF khổ A4 như mục 6.13, dòng đầu đúng “GIA PHẢ HỌ PHẠM (MẪU)”, không còn “HÀ NỘI” (`pat-audit/pham-member-print.pdf`).
- **Kiểm tra mã:** `npm run lint`, `npm run typecheck`, `npm run build` sạch; console 0 lỗi trên cả năm trang đã mở.

### 6.13. Review commit fdc517b và sửa bốn điểm sót — ngày 2026-11-07

Rà soát toàn bộ thay đổi của commit `fdc517b` (tab Tư liệu thay Phả ký + bốn mặc định phả đồ). Phần lớn sạch; bốn điểm cần chỉnh đã sửa:

1. **Quy tắc `@page` toàn cục bị xóa nhầm** (`src/app/globals.css`): khi gỡ CSS phả ký, commit xóa luôn `@page { size: A4 portrait; margin: 0; }` — quy tắc này đỡ bản in danh sách/chi tiết thành viên (in bằng `window.print()` ngay trên trang). Đã khôi phục. Hai đường in phả đồ không bị ảnh hưởng: `printSvgDiagram` mở cửa sổ riêng có `@page` riêng, `printDiagram` chèn thẻ style sau stylesheet nên vẫn đè được quy tắc toàn cục.
2. **Xoá tư liệu an toàn khi bộ nhớ đầy** (`document-store.ts` + `documents-view.tsx`): trước đây `removeTreeDocument` xóa blob trong IndexedDB ngay cả khi ghi metadata thất bại (bộ nhớ đầy) → danh mục còn nhưng tệp mất, và `confirmDelete` không báo lỗi. Nay hàm trả `boolean`, chỉ xóa blob khi ghi metadata thành công; khi trả `false`, trang hiện banner “Bộ nhớ trình duyệt đã đầy, chưa xoá được tư liệu.” và giữ nguyên tư liệu trong danh sách.
3. **`openDb` cache lỗi vĩnh viễn** (`document-store.ts`): promise mở IndexedDB bị từ chối một lần được giữ mãi, mọi lần thử sau đều thất bại theo. Nay reset `dbPromise = null` khi lỗi để lần sau mở lại.
4. **Trường phả ký chết trong model** (`types.ts`): gỡ `completedYear`, `writtenPlace`, `chronicleStyle`, `colophon`, `showColophon`, `colophonDate`, `coverEmblem`, `chronicleFormat`, `chronicleColumns`, `chronicleChildNumbers`, `chronicleHideLivingBirth`, `chronicleMargins`, `chronicleTexts` — không còn nơi nào dùng sau khi gỡ tab Phả ký. Nhập bản sao lưu cũ vẫn an toàn vì `import.ts` spread toàn bộ đối tượng, không mất dữ liệu cũ.

**Bằng chứng kiểm tra** trên bản production dựng lại tại `http://localhost:3001`, `BUILD_ID 3u79StLbkyiAWxk_K0E0l`:

- **Tư liệu** (`/gia-pha/mau-gia-pha/tu-lieu`, 1440×900): tải PNG 40×30 → metadata + blob + thumbnail đủ trong IndexedDB; xem trước hiện ảnh; sửa tên/ghi chú lưu đúng; **giả lập bộ nhớ đầy** (chặn `localStorage.setItem` riêng khoá danh mục) rồi bấm xoá → banner lỗi hiện, tư liệu và cả hai blob còn nguyên; bỏ chặn rồi xoá thường → metadata và blob biến mất. Console 0 lỗi. Ảnh: `pat-audit/review-docs-1-uploaded.png`, `review-docs-2-delete-blocked.png`, `review-docs-3-deleted.png`.
- **In thành viên** (`/gia-pha/mau-gia-pha/danh-sach-thanh-vien`): `Page.printToPDF` với `preferCSSPageSize` cho 2 trang **594,96 × 841,92 pt = A4 dọc**, lề 0; khối `print-only` hiện đủ bảng 58 thành viên (STT · Họ tên · Giới tính · Đời · Sinh · Mất · Cha · Mẹ · Phạm vi · Chi phái). Tệp: `pat-audit/review-member-print.pdf`.
- **Editor phả đồ** (`giao-dien`): tải sạch, 58 thẻ, console 0 lỗi — mặc định mục 6.12 không đổi.
- **Kiểm tra mã:** `npm run lint`, `npm run typecheck`, `npm run build` đều sạch.

### 6.12. Sửa lại bốn mặc định phả đồ: cỡ thẻ tính từ thẻ trên cùng, nhãn cố định 1,5×, câu đối 67 px, vị trí theo ảnh tham chiếu — ngày 2026-11-07

Bốn yêu cầu của bạn:

1. **Bốn đời đầu tiên tính từ thẻ trên cùng (kể cả tiền tổ)** được phóng thẻ 1,8×.
2. **Cỡ nhãn đời cố định**, không đổi giữa các đời, tương ứng cỡ thẻ **1,5×**.
3. **Cỡ chữ câu đối mặc định 67**.
4. **Vị trí hoành phi, rồng, câu đối mặc định như trình duyệt bên ngoài** — bạn gửi ảnh tham khảo vì không có số chính xác.

**Về việc đọc số từ “trình duyệt bên ngoài”:** không đọc được trực tiếp. Chrome/Edge của bạn không mở cổng gỡ lỗi, và gia phả mẫu trên app.phatue.vn chỉ tồn tại trong phiên nên không có bản lưu `localStorage` để sao chép thông số. Vì vậy vị trí được căn theo ảnh chụp bạn gửi (đo tỉ lệ điểm mực trên ảnh) rồi đối chiếu trên bản dựng thật.

**Thay đổi mã**

- `types.ts` — bỏ cách gán cứng `cardScale: 1.8` cho các đời 0–3. Thêm `TOP_CARD_SCALE_GENERATIONS = 4`, `TOP_CARD_SCALE = 1.8`, `GENERATION_LABEL_CARD_SCALE = 1.5` và hàm `defaultGenerationCardScale(đời, topGenerations)`: chỉ bốn đời nằm trong danh sách đầu mới mặc định 1,8×. `DEFAULT_TUNING.generationStyles` trả về `{}`; `cardDimsFor` nhận thêm `topGenerations`; `normalizeTuning` không còn gộp mặc định theo đời.
- `layout.ts` — sau khi có thứ tự đời (`sortGenerations`, tiền tổ âm xếp trước), lấy **bốn đời hiển thị trên cùng** vào `layout.topGenerations` và truyền cho cả ba lượt đo thẻ (đo cây, chiều cao hàng, đặt thẻ). Nhờ vậy bố cục tính khoảng cách hàng theo đúng cỡ 1,8×, không còn trường hợp hàng đầu chồng lên nhau.
- `layout.ts` + `diagram-canvas.tsx` + `diagram-editor-view.tsx` — mọi nơi tính nhãn đời dùng `(generationLabelScale ?? 1) × 1,5`; bề rộng nhãn, cỡ chữ nhãn và lề tránh nhãn cũng theo cùng hệ số. Nhãn **không còn nhân theo cỡ thẻ của từng đời**.
- `diagram-editor-view.tsx` — bảng thuộc tính của một đời và tay nắm kéo cỡ thẻ đọc mặc định từ `defaultGenerationCardScale(đời, layout.topGenerations)`; nút “Bỏ ghi đè của đời này” trả về 1,8× ở bốn đời đầu, 1× ở các đời sau.
- `types.ts` — `DEFAULT_COUPLETS.fontSize` **67**; `DEFAULT_BANNER.offsetRatio` **0,10** (trước 0,06; giới hạn vẫn tối đa 0,13).
- `DEFAULT_COUPLETS.offsetX = 264`, `offsetY = 163` để hai vế ra sát mép trong khung như ảnh tham chiếu; rồng giữ 1×, dịch ngang/dọc 0.
- `diagram-inspector.tsx` — ghi chú mục cỡ nhãn đổi thành “Nhãn dùng chung một cỡ ở mọi đời (tương ứng cỡ thẻ 1,5×). Khổ A0: nhãn cách mép trong khung 2,5 cm và cách mép thẻ 2,5 cm.”

**Bằng chứng trên trình duyệt ngoài**, bản production dựng sạch tại `http://localhost:3001`, `BUILD_ID Ozq4A3JWWNQtn0aiSN0az` (trang `giao-dien` và `ve-pha-do`, cùng `viewBox 3572 × 2526,54`):

- **Cỡ thẻ:** 7 thẻ **302 × 133** = đúng 168×74 × 1,8, rơi đúng bốn hàng trên cùng: Đại Tổ 1 thẻ, Thủy Tổ 1, Sơ Tổ + vợ 2, Đời 1 3 thẻ. Từ Đời 2 trở xuống vẫn 168×74 (ngang) và 75×150 (dọc). Bảng thuộc tính: Đại Tổ 1,8 / Đời 1 1,8 / Đời 2 1. Đặt thử 1,2 → cả hàng Đời 1 thành 202×89; bấm “Bỏ ghi đè của đời này” trả lại 302×133 và thanh trượt đọc 1,8.
- **Nhãn đời:** tất cả nhãn dải (Đại Tổ → Đời 4) cùng `font-size 10,8` = 1,5 × 7,2, dù hàng Đời 1 có thẻ 1,8× còn Đời 2 là 1×. Bề rộng nhãn không đổi theo đời; nhãn trái ở 5,5–5,8%, nhãn phải ở 92,9–93,2% bề rộng giấy.
- **Câu đối:** đúng 2 `text.pat-couplet`, `font-size 67`; vế trái `x 19,20–22,20%`, vế phải `77,75–80,94%`, dải dọc `13,17–36,98%` chiều cao giấy. Không chạm hoành phi (39,36–60,64%) và không chạm rồng (30,02–39,04% và 60,96–69,98%); kiểm tra lại ở khung hẹp 420×900 cho cùng tỉ lệ, không tràn khung.
- **Hoành phi và rồng:** hoành phi cao `15,40%`, mép trên **10,01%** chiều cao giấy (ảnh tham chiếu đo được ≈ 10,1%); rồng cao `15,71%`, mép trên `10,63%`, hai bên đối xứng qua trục giữa.
- **Đối chiếu ảnh bạn gửi:** dải dọc điểm mực câu đối trong ảnh là 14,56–35,44% (bản dựng 13,17–36,98%); thứ tự và khoảng cách tương đối hoành phi – rồng – câu đối khớp. Khác biệt nhỏ còn lại do ảnh chụp bị cắt bớt phần dưới nên tỉ lệ chiều cao không cùng mẫu số.
- **Kiểm tra mã:** `npm run lint`, `npm run typecheck`, `npm run build` đều sạch; trang production không lỗi console.
- **In/PNG:** đường xuất dùng lại chính SVG đang vẽ (ảnh hoành phi/rồng và font thư pháp được nhúng vào bản sao trước khi in), nên bốn mặc định trên đi theo bản in/xuất; phần cơ chế in giữ nguyên như mục 6.3/6.11.

### 6.11. Chốt thông số mặc định phả đồ: hoành phi, rồng, câu đối và cỡ thẻ bốn đời đầu — ngày 2026-11-07

> Phần **cỡ thẻ bốn đời** và **nhãn đời co theo cỡ thẻ** trong mục này đã được thay thế bằng mục 6.12 (bốn đời tính từ thẻ trên cùng, nhãn cố định 1,5×). Các mục còn lại (nội dung câu đối, cơ chế ghi đè) vẫn đúng.


Theo yêu cầu chốt các thông số đang hiển thị ở trang Vẽ phả đồ làm mặc định, kèm nội dung câu đối mới và cỡ thẻ 1,8× cho bốn đời đầu.

**Đã kiểm tra thông số hiện tại** (đọc trực tiếp bảng “Hoành phi & câu đối” trên bản production):

- Hoành phi: rộng **760 px**, vị trí dọc **6%** mép trên giấy, chữ “GIA PHẢ” màu `#f7e3b5`, dịch chữ dọc 0, bật hoành phi.
- Rồng: bật, cỡ **1×**, dịch ngang/dọc 0.
- Câu đối: bật, font **Thư pháp Hải Yến** (`hai-yen-1`), cỡ **32 px**, màu `#8a1c15`, lệch 0.
- Các giá trị này vốn đã nằm trong `DEFAULT_BANNER` / `DEFAULT_COUPLETS` nên được giữ nguyên làm mặc định, không phải sửa số.

**Thay đổi mã**

- `types.ts` — `DEFAULT_COUPLETS`: vế trái **“Tổ Công Tông Đức Thiên Niên Thịnh”**, vế phải **“Tử Hiếu Tôn Hiền Vạn Đại Xương”** (thay nội dung cũ “Tổ đức lưu phương…” / “Tông công hiển hách…”).
- `types.ts` — `DEFAULT_TUNING.generationStyles` đặt `cardScale: 1.8` cho các đời **0, 1, 2, 3** (Sơ Tổ và Đời 1–3); các đời sau vẫn 1×. Hai bậc tiền tổ (Đại Tổ, Thủy Tổ) có đời âm nên không đổi.
- Thêm `generationCardScale` dùng chung cho `cardScaleFor`/`cardDimsFor`: khi gia phả chưa tự đặt cỡ cho một đời thì lấy cỡ mặc định của đời đó, nên cả bản vẽ, bản in và bản xuất đều nhất quán.
- `mergeGenerationStyles` trong `normalizeTuning`: gộp mặc định theo từng đời rồi mới áp giá trị người dùng đã lưu, để bảng thuộc tính hiển thị đúng 1,8× và nút “Bỏ ghi đè của đời này” trả về đúng mặc định mới.

Bằng chứng trên trình duyệt ngoài, bản production dựng sạch (`http://localhost:3001/gia-pha/mau-gia-pha/ve-pha-do`, `BUILD_ID cx6vS23b9M_7S26lT9xZm`):

- **Câu đối:** đúng 2 `text.pat-couplet`, nội dung lần lượt “Tổ Công Tông Đức Thiên Niên Thịnh” và “Tử Hiếu Tôn Hiền Vạn Đại Xương”, cỡ 32, màu `#8a1c15`, font `hai-yen-1`; hai vế vẫn đối xứng qua trục giữa.
- **Cỡ thẻ theo đời:** bảng thuộc tính trả “Cỡ thẻ” = **1,8** cho SƠ TỔ, ĐỜI 1, ĐỜI 2, ĐỜI 3 và **1** cho ĐỜI 4, ĐỜI 5.
- **Kích thước thẻ đo trong SVG:** 13 thẻ ngang **302 × 133** và 19 thẻ dọc **135 × 270** (đúng 168×74 và 75×150 nhân 1,8) = 32 thẻ của bốn đời đầu (2 + 3 + 8 + 19 thành viên); phần còn lại vẫn 168×74 / 75×150.
- **Bố cục:** mọi thẻ hiển thị nằm trong khung giấy (`insidePaper: true`), `overflowX = 0`; trang “Thiết kế bản in” cho cùng nội dung câu đối và cùng bộ kích thước thẻ, 0 lỗi console.
- Kiểm tra mã: `npm run typecheck`, `eslint` tệp `types.ts` và `npm run build` đều sạch.

Lưu ý: gia phả đã lưu trên máy cũng nhận mặc định mới ở bốn đời đầu nếu trước đó chưa đặt cỡ riêng cho các đời này; đời nào đã có cỡ riêng thì giữ nguyên cỡ đã đặt. Bản mẫu tự làm mới mỗi lần tải nên thấy ngay.

### 6.10. Bỏ tab Phả ký, thay bằng tab Tư liệu — ngày 2026-11-07

Theo yêu cầu “Bỏ Tab Phả ký, thay bằng Tab Tư liệu để upload tư liệu”, tab Phả ký được gỡ khỏi toàn bộ điều hướng và thay bằng một kho tư liệu của dòng họ.

**Gỡ Phả ký**

- Thanh tab trên cùng (`app-shell.tsx`): mục “Phả ký” (biểu tượng `BookOpen`) đổi thành “Tư liệu” (`FolderOpen`), đường dẫn `tu-lieu`.
- Menu mobile: bỏ dòng Phả ký ở nhóm “Bản in”, thêm dòng “Tư liệu — Ảnh, giấy tờ, sắc phong của dòng họ” ở nhóm “Dữ liệu”.
- Trang chủ gia phả (`tree-home-view.tsx`): lối tắt nhanh “Phả ký” đổi thành “Tư liệu”, dòng trong sheet “Thêm” cũng đổi theo.
- Trang chủ danh sách (`home-view.tsx`): ô giới thiệu “Phả ký mẫu” đổi thành “Kho tư liệu”.
- Xoá hẳn `chronicle-view.tsx` và toàn bộ CSS in của phả ký trong `globals.css` (`.chronicle-pages`, `.chronicle-page`, `.chronicle-book-title`, `@page`/`@page chronicle`); các quy tắc in còn lại (`.no-print`, `.print-only`, `.print-area`) giữ nguyên.
- Đường dẫn cũ `/gia-pha/mau-gia-pha/pha-ky` không còn trang riêng, rơi về khung “Tính năng đang được dựng” với tiêu đề “Gia phả” — không lỗi 404.

**Kho tư liệu mới**

- **Lưu trữ tách hai tầng** (`document-store.ts`): danh mục (tên, tệp gốc, MIME, kích thước, loại, ghi chú, ngày thêm) nằm trong `localStorage` khoá `phatue.treeDocuments.v1`; tệp gốc nằm trong IndexedDB `phatue-documents` / object store `files`, khoá `${treeId}:${docId}`; ảnh còn có thêm bản thu nhỏ `${treeId}:${docId}:thumb` (JPEG cạnh dài 480 px, chất lượng 0,82) để lưới thẻ nhẹ. Cách chia này giúp kho tư liệu chạy được cả với gia phả mẫu (không ghi vào `localStorage` của cây) và không ăn hạn mức ~5 MB của `localStorage`.
- **Giới hạn và thông báo:** tối đa 25 MB mỗi tệp; sai loại/quá cỡ bị từ chối và liệt kê lý do theo từng tệp; thanh tiến trình “Đang lưu n/N tệp…”. Ghi danh mục thất bại (hết chỗ) thì xoá luôn blob vừa ghi để không mồ côi.
- **Trang Tư liệu** (`documents-view.tsx`): vùng kéo thả + nút “Chọn tệp từ máy”; tìm theo tên/tệp/ghi chú; chip lọc Tất cả / Hình ảnh / PDF / Word / Excel / Khác kèm số lượng; lưới thẻ 3 cột (2 cột ở tablet, 1 cột ở mobile) có ảnh thu nhỏ hoặc biểu tượng loại tệp.
- **Xem trước:** ảnh mở trong sheet bằng blob URL; PDF mở bằng `iframe`; các loại khác chỉ tải về. Sheet có sửa thông tin (tên + ghi chú, tên không được rỗng) và tải về máy.
- **Xoá:** xác nhận trong sheet, xoá cả metadata lẫn blob gốc + bản thu nhỏ.
- **Dọn theo gia phả:** `store.tsx` gọi `deleteTreeDocuments(treeId)` khi xoá vĩnh viễn một gia phả trong thùng rác và khi “Dọn tất cả”, nên không còn blob mồ côi.
- **Lưu ý hiển thị trong trang:** tư liệu chỉ nằm trong trình duyệt này và **không** nằm trong tệp sao lưu JSON; người dùng cần tải từng tệp về máy để lưu trữ lâu dài.

Bằng chứng đo trên trình duyệt ngoài, bản production dựng sạch (`http://localhost:3001/gia-pha/mau-gia-pha/tu-lieu`, `BUILD_ID wYH6n68tKqAYiAVf5K-zZ`):

- **Điều hướng:** 8 tab “Tổng quan, Phả hệ, Chi phái, Cây gia phả, Vẽ phả đồ, Thiết kế bản in, Tư liệu, Công cụ”; không còn chuỗi “Phả ký” trong trang. Ở 390 px vẫn đủ tab qua thanh dưới, `overflowX = 0`.
- **Tải lên:** thả 2 tệp (một PNG 640×400 và một PDF) → 2 thẻ đúng thứ tự mới nhất trước, ảnh có bản thu nhỏ `naturalWidth 480`, tiêu đề trang “2 tệp · 272.9 KB”, metadata ghi `kind` = `pdf`/`image` và kích thước `192`/`279266` byte.
- **Xem trước ảnh:** sheet mở đúng tên, ảnh blob `640×400`; PDF dùng khung nhúng riêng.
- **Sửa và ghi chú:** đổi tên “Bia ký đình làng” → “Bia ký đình làng Đông”, thêm ghi chú → thẻ và metadata đều cập nhật; tải lại toàn trang vẫn còn 2 thẻ, ảnh thu nhỏ tải được, ghi chú hiển thị.
- **Tải về:** CDP ghi nhận `Browser.downloadWillBegin` với `suggestedFilename: "Sắc phong 1952.pdf"` và chuyển đủ `192/192` byte. Chrome headless sau đó tự huỷ lượt lưu ra đĩa; thử nghiệm đối chứng với một blob `text/plain` thuần cũng bị huỷ y hệt, nên đây là hành vi của môi trường headless, không phải lỗi ứng dụng.
- **Xoá:** xác nhận trong sheet → còn 1 thẻ, metadata còn 1 mục, tên đã xoá không còn trong trang; IndexedDB chỉ còn khoá của tệp PDF (`mau-gia-pha:<id>`), blob gốc + thumb của ảnh đã bị xoá.
- **Đường dẫn cũ:** `/gia-pha/mau-gia-pha/pha-ky` trả khung “Tính năng đang được dựng”, `h1` = “Gia phả”.
- **Lỗi console:** 0 ở cả 3 lượt tải (desktop, mobile, đường dẫn cũ).
- Kiểm tra mã: `npm run typecheck`, `eslint` trên 8 tệp liên quan và `npm run build` đều sạch.

Chưa commit thay đổi này (chờ bạn duyệt giao diện kho tư liệu trước).

### 6.9. Sửa lỗi hiển thị còn lại trên toàn giao diện — ngày 2026-11-07

Rà soát bằng trình duyệt thật (360, 390, 768, 1024, 1440 px) trên toàn bộ trang: trang chủ, trang chủ mẫu, danh sách thành viên, danh sách nhanh, chỉnh sửa với cây gia phả, vẽ phả đồ, giao diện, phả ký, công cụ — kèm các trạng thái đang mở (bảng thuộc tính phả đồ, bảng xuất, chi tiết thành viên, menu thêm, cuối trang thiết kế, bảng hoành phi trên desktop). Không có tràn ngang cấp trang, không có ảnh lỗi, không có chữ bị cắt, console sạch. Ba lỗi hiển thị thật đã tìm thấy và sửa:

1. **Nhãn “Lề an toàn” bị ngắt dòng giữa cụm từ** (`design-view.tsx`): ở 390 px chữ vỡ thành 3 dòng “Lề” / “an” / “toàn”, ở 768–1440 px vỡ 2 dòng. Thêm `shrink-0 whitespace-nowrap` cho nhãn → còn đúng 1 dòng ở mọi khổ.
2. **Huy hiệu “Vùng an toàn” đè lên mép trên tờ giấy và hoa văn khung** (`design-view.tsx`): trước đây hai nhãn nằm ở hai vị trí tuyệt đối khác nhau, nhãn vùng an toàn đặt theo `top: safeY%` nên rơi vào giữa nội dung. Đã gộp cả hai huy hiệu vào **một hàng phía trên tờ giấy** (`inset-x-0 -top-1 … -translate-y-full`, có `flex-wrap`), khung lề an toàn nét đứt bên trong giữ nguyên; vùng cuộn nhận `pt-9` khi bật hướng dẫn và `pt-4` khi tắt để không bị cắt.
3. **Nhãn ô thống kê “Trong gia phả” bị treo chữ** (`ui.tsx`, thành phần `Stat` dùng chung cho trang chủ, danh sách thành viên, danh sách nhanh): ở 390 px nhãn xuống dòng thành “TRONG GIA” / “PHẢ” (một chữ lẻ). Thêm `text-balance` → chia đều “TRONG” / “GIA PHẢ”.

Đi kèm, tiêu đề trang trong thanh trên (`app-shell.tsx`) bị chèn ép ở màn hẹp khiến “Cây gia phả” xuống dòng dù còn chỗ: giảm khoảng cách và lề ngang trên mobile (`gap-2 px-3 … sm:gap-3 sm:px-4`).

Bằng chứng đo trên trình duyệt ngoài (`http://localhost:3001/gia-pha/mau-gia-pha/ve-pha-do`, production dựng sạch `BUILD_ID BaRv6W_hwFiwj1sYp0pI7`):

- **Huy hiệu hướng dẫn:** tại 360, 390, 768, 1024, 1440 px đều trả `safeOverPaper:false`, `labelsVisible:true`; nhãn “Lề an toàn” luôn 1 dòng (`marginLines:1`). Trước khi sửa, mép nhãn vùng an toàn là 287 / 299 / 199 / 201 px so với mép trên giấy 283 / 293 / 194 / 193 px (390 / 768 / 1024 / 1440).
- **Tắt/mở hướng dẫn:** bật → có nhãn, vùng cuộn `padding-top:36px`; tắt → không còn nhãn, `padding-top:16px`; bật lại → 36 px. Bề rộng tài liệu không đổi (1009 px ở khổ 1024).
- **Nhãn thống kê thành viên** (390 px): trước là hai dòng rộng 67 + 25 px trong ô 83 px; sau là 42 + 50 px — cân đối, không còn chữ treo.
- **Tiêu đề thanh trên** (390 px): ô tiêu đề từ 79 px lên 95 px, “Cây gia phả” cao 22 px (1 dòng). Ở 360 px vẫn xuống dòng như thiết kế `line-clamp-2`, chấp nhận.
- **Quét hồi quy cuối** (9 trang × 390 px và 1440 px, 18 lượt tải trên bản production): cả 18 lượt đều `overflowX = 0` (không tràn ngang), 0 ảnh lỗi, 0 lỗi console. Các chỗ còn cắt bằng dấu “…” đều là thiết kế có chủ đích: phụ đề thanh trên (`truncate`), gợi ý thanh công cụ phả đồ, và chữ trong thẻ phả đồ giữ cỡ thẻ cố định (86–87 phần tử mỗi khổ ở trang cây gia phả).
- Kiểm tra mã: `npm run typecheck`, `eslint` trên ba tệp sửa và build production không lỗi.

### 6.8. Hoành phi: bấm để mở bảng và kéo lên/xuống bằng chuột — ngày 2026-11-07

Bạn yêu cầu cho phép bấm và di chuyển (lên xuống) hoành phi bằng chuột. Đã bổ sung kéo dọc trực tiếp trên phả đồ, giữ nguyên phạm vi giới hạn cũ: mép trên không vượt khung hoa văn và không xuống quá 13% chiều cao giấy.

- **Canvas** (`diagram-canvas.tsx`): thêm prop `bannerDrag` (mép trên xem trước, toạ độ giấy) để khi kéo thì cả cụm hoành phi vẽ tại vị trí tạm; toạ độ được chặn trong `[độ dày khung, 13% chiều cao giấy]`. Con trỏ đổi từ `pointer` sang `grab`, kèm `touch-action: none` như rồng/câu đối.
- **Editor** (`diagram-editor-view.tsx`): thêm kiểu kéo `"banner"`. Bấm giữ hoành phi → chọn phạm vi “Hoành phi & câu đối” và ghi lại mép trên hiện tại; kéo dọc → xem trước vị trí mới theo đơn vị giấy (đã chia hệ số thu vừa khổ); thả chuột → chốt `banner.offsetRatio` (làm tròn 4 chữ số thập phân) vào thiết kế. Bấm mà không kéo chỉ mở bảng, không đổi vị trí.
- **Đi kèm:** rồng và câu đối nằm trong cùng nhóm hoành phi nên dịch theo khi kéo; ngược lại, kéo rồng/câu đối vẫn `stopPropagation` như cũ nên không vô tình kéo hoành phi. Đường in/PNG không đổi — chỉ đọc `offsetRatio` đã chốt, không đọc vị trí xem trước.
- **Inspector** (`diagram-inspector.tsx`): ghi chú dưới “Vị trí dọc” thêm “Kéo trực tiếp hoành phi trên phả đồ để chỉnh lên/xuống.”

Bằng chứng kiểm tra trên trình duyệt ngoài (`http://localhost:3001/gia-pha/mau-gia-pha/ve-pha-do?bannerdrag=3`, production dựng sạch `BUILD_ID hUDWX65iyzkLNqioP3Puc200`, `viewBox 3486 × 2465,7`):

- **Ban đầu:** nhóm hoành phi `transform="translate(1743, 148)"` = 6% chiều cao giấy (147,9 làm tròn 148); con trỏ `grab`.
- **Bấm không kéo:** panel phải mở đúng “Hoành phi & câu đối” (có ô “Chữ trên hoành phi”), thanh “Vị trí dọc” = 6%, hoành phi đứng yên.
- **Kéo xuống 40 px màn hình:** mép trên thành **299** (≈151 đơn vị giấy), thanh trượt **12%**; ảnh hoành phi và câu đối cùng dịch **+40,02 px**, giữ đúng khoảng cách tương đối.
- **Kéo xuống thật xa:** dừng ở mép trên **321** = đúng 13% chiều cao giấy; thanh trượt 13% — không tràn xuống thêm.
- **Kéo lên thật xa:** dừng ở mép trên **88** = độ dày khung hoa văn; thanh trượt 3,5% — không lọt ra ngoài khung trên.
- **Kéo về:** trả đúng `translate(1743, 148)`, thanh trượt 6% như ban đầu.
- **Bản in:** sau khi kéo chốt mép trên **254** (10,3%), mở “Xuất phả đồ → In / Lưu PDF": SVG trong cửa sổ in có nhóm hoành phi `translate(1743, 254)` — vị trí đã chốt, không dính vị trí xem trước. PNG dùng chung bản sao SVG này nên cũng theo `offsetRatio` đã lưu.
- Console sạch; `npm run typecheck`, `eslint` trên ba tệp sửa và build production không lỗi.

### 6.7. Sửa lỗi “font chữ câu đối không đúng”: bỏ bản Hải Yến 4 bị lỗi metric — ngày 2026-11-07

Bạn báo “hiển thị font chữ câu đối không đúng” sau khi câu đối chuyển sang font Hải Yến. Kiểm tra trên trình duyệt cho thấy bản 1 hiển thị đúng, còn **bản 4 hiện thành một cục nét chồng nhau, không đọc được**.

- **Nguyên nhân:** tệp `HY-Thu phap 4.otf` (upem 2048) có bề rộng ký tự (advance) nhỏ hơn nhiều so với khung nét vẽ. Ví dụ chữ `T` advance 304 đơn vị (0,148 em) nhưng nét rộng 1.433 đơn vị (0,70 em); `l` advance 142, `g` lệch trái −532. Trình duyệt xếp chữ theo advance nên mọi chữ vẽ đè lên nhau. Bản 1 cũng có nét vượt advance nhưng ở mức vừa phải, đúng kiểu thư pháp nên vẫn đọc được.
- **Đã thử:** dựng lại tệp font 4 bằng fontTools với advance tính theo khung nét (`gioi-han = bbox + 2×8 đơn vị`, dịch nét theo lề trái) — chữ tách ra nhưng hình chữ vẫn không đọc được nên **không dùng bản 4**. Tệp gốc vẫn để trong `public/sites/PAT/fonts/HY-ThuPhap4.otf` (không còn khai báo) để sau này thay bằng bản sửa đúng.
- **Sửa trong mã:** `CoupletFont = "hai-yen-1" | "thu-phap-viet"`; nhãn “Thư pháp Hải Yến” (mặc định) và “Thư pháp Việt (nét mềm)” (Dancing Script cũ); `normalizeCouplets` ánh xạ mọi giá trị khác — kể cả `"hai-yen-4"` đã lỡ lưu — về `hai-yen-1`; gỡ `@font-face` “HY Thu Phap 4” khỏi `globals.css`; gỡ bản 4 khỏi danh sách font nhúng khi in/xuất PNG (`export.ts`). Ghi chú trong inspector nói rõ bản 4 của bộ font bị lỗi khoảng cách chữ.
- **Ảnh hưởng dữ liệu:** không cần lưu lại thiết kế; cây mẫu vốn không có trường `font` nên nhận mặc định Hải Yến.

Bằng chứng kiểm tra trên trình duyệt ngoài (`http://localhost:3001/gia-pha/mau-gia-pha/ve-pha-do?fix=1`, production dựng sạch `BUILD_ID hlno7uktDjxL6To099hf7`):

- Vẫn đúng 2 `text.pat-couplet`, `font-family = "'HY Thu Phap 1', 'Thu Phap Viet', cursive"`, `font-weight 400`, `font-size 32`; `document.fonts.check` = true; danh sách font của trang chỉ còn `HY Thu Phap 1:loaded` (không còn mặt chữ Hải Yến 4).
- Ô “Kiểu chữ câu đối” còn đúng 2 lựa chọn: “Thư pháp Hải Yến” (đang chọn) và “Thư pháp Việt (nét mềm)”; ghi chú nêu rõ bản 4 bị lỗi. Đổi sang nét mềm → `font-family` thành `"Thu Phap Viet", "Dancing Script", cursive`, câu đối đọc rõ; đổi lại Hải Yến như cũ.
- Mạng chỉ tải **một** tệp font (`HY-ThuPhap1.otf`, 200), không còn 404 hay yêu cầu tới HY4; console không lỗi.
- Cửa sổ in thật (bấm Xuất phả đồ → In / Lưu PDF): `text.pat-couplet` vẫn là HY1, `document.fonts` chỉ có `HY Thu Phap 1:loaded`; CSS nhúng trong bản in chỉ có `@font-face` “HY Thu Phap 1” và “Thu Phap Viet”, không nhúng HY4.
- Ảnh PNG 1× tải về (3486 × 2466 px, 2,7 MB): cắt vùng câu đối cho thấy đúng nét thư pháp Hải Yến, đủ dấu, không chồng chữ.
- `npm run typecheck`, `eslint` và build production không lỗi.

### 6.6. Câu đối dùng font thư pháp Hải Yến — ngày 2026-11-07

Bạn gửi bộ `Font Thư Pháp - HẢI YẾN MTC` (HY-Thu Phap 1.otf và HY-Thu phap 4.otf) và yêu cầu câu đối dùng font này.

- **Nạp font:** chép nguyên hai tệp vào `public/sites/PAT/fonts/HY-ThuPhap1.otf` (664.688 byte) và `HY-ThuPhap4.otf` (218.996 byte); khai báo `@font-face` tên “HY Thu Phap 1” / “HY Thu Phap 4”, `format("opentype")`, `font-weight: 400` trong `globals.css`. Cả hai font đều có đủ bảng chữ tiếng Việt (đã kiểm tra cmap: 347 và 391 glyph, không thiếu dấu nào trong câu đối mặc định).
- **Mô hình** (`types.ts`): `CoupletSettings.font?: "hai-yen-1" | "hai-yen-4"`, mặc định `hai-yen-1`; `normalizeCouplets` chỉ nhận hai giá trị này; bảng `COUPLET_FONT_FAMILIES` gộp tên font và `COUPLET_FONT_LABELS` cho giao diện.
- **Canvas** (`diagram-canvas.tsx`): `text.pat-couplet` lấy `font-family` theo lựa chọn, kèm `Thu Phap Viet` dự phòng; đổi `font-weight` từ 600 xuống **400** vì hai font chỉ có một độ đậm — giữ 600 sẽ khiến trình duyệt tự bôi đậm, nét thư pháp bị dày giả.
- **Inspector** (`diagram-inspector.tsx`): thêm ô chọn “Kiểu chữ câu đối” với “Thư pháp Hải Yến 1” / “Thư pháp Hải Yến 4”; ghi chú trong mục cập nhật theo.
- **In/PNG** (`export.ts`): nhúng cả hai font Hải Yến và Dancing Script dự phòng dạng data URI vào bản sao SVG trước khi in/xuất PNG, nên bản in giữ đúng kiểu chữ đang chọn.

Bằng chứng kiểm tra trên trình duyệt (`http://localhost:3001/gia-pha/mau-gia-pha/ve-pha-do`, production `BUILD_ID 9uP90zxPSt9r04QsOvvMB`):

- Hai tệp font trả `200` từ `/sites/PAT/fonts/…` đúng dung lượng; `document.fonts` báo **HY Thu Phap 1 loaded**.
- `text.pat-couplet` có `font-family = "'HY Thu Phap 1', 'Thu Phap Viet', cursive"`, `font-weight = 400`; ảnh phóng 8× vùng câu đối cho thấy đúng nét thư pháp mảnh, các tiếng xếp dọc đủ dấu, không tràn khỏi khối.
- Mở “Hoành phi & câu đối”: ô chọn có đúng 2 lựa chọn, đang là “Thư pháp Hải Yến 1”; đổi sang “Thư pháp Hải Yến 4” → `font-family` đổi sang `'HY Thu Phap 4'`, `document.fonts` báo HY Thu Phap 4 đã nạp; đổi lại bản 1 như ban đầu.
- Cây mẫu không có trường `font` trong thiết kế đã lưu nên tự nhận mặc định Hải Yến 1, không phải lưu lại thiết kế; dữ liệu người dùng không bị đổi.
- Console sạch; `tsc`, `eslint` và build production không lỗi.
- Lưu ý: lần kiểm tra này chưa mở hộp thoại in thật; đường in/PNG đã nhúng cả hai font bằng data URI và hai tệp font tải được, nhưng bản in cần xem lại bằng mắt khi bạn in thử.
- **Cập nhật ở mục 6.7:** lựa chọn “Hải Yến 4” đã bị gỡ vì tệp font 4 hiển thị chồng chữ; các câu mô tả hai lựa chọn ở trên chỉ còn giá trị lịch sử.

### 6.5. Editor phải đồ dễ dùng hơn: bấm đâu sửa đó + dịch dọc dàn trang — ngày 2026-11-07

Bạn yêu cầu rà soát phần vẽ biểu đồ: bấm vào đối tượng trên màn hình (thẻ thành viên, hoành phi, …) thì menu bên phải phải hiện đúng tính năng sửa đổi của đối tượng đó, đồng thời bỏ các phần không tác dụng; bổ sung điều chỉnh dọc cho thẻ đầu tiên để dàn trang. Đã duyệt và triển khai gói A+B+C+D:

- **A — Phạm vi theo đối tượng bấm trên canvas:** bấm hoành phi/rồng/câu đối → panel phải chuyển sang phạm vi “Hoành phi & câu đối” (`BannerInspector`); bấm thẻ thành viên → phạm vi thành viên; bấm nhãn đời trên canvas → phạm vi đời; bấm nền trống → phạm vi cả phải đồ. Thanh bên trái có nút “Hoành phi & câu đối” để mở lại phạm vi này bất cứ lúc nào.
- **B — Gọn section “Vị trí trên phả đồ” của thẻ:** chỉ còn dòng trạng thái (“Thẻ đang lệch …”) kèm nút “Về vị trí gốc”; toàn bộ section ẩn khi thẻ chưa bị kéo. Đã gỡ hai ô nhập Dịch ngang/Dịch dọc và nút “Áp cho cả nhánh con” (không còn tác dụng vì kéo thẻ chỉ đổi ngang theo cụm vợ/chồng).
- **C — Panel “Cả phả đồ” gom 4 nhóm xếp:** “Giấy & bố cục” (mở sẵn), “Hoành phi & câu đối”, “Kiểu thẻ & chữ”, “Nền & khung”; mỗi nhóm thu gọn/mở được, giữ nguyên toàn bộ chức năng cũ.
- **D — Dịch dọc toàn khối phải đồ (dàn trang):** thêm `tuning.contentShiftY` (mặc định 0). Kéo thẻ ở **hàng trên cùng** (thẻ có tọa độ `y` nhỏ nhất — với cây mẫu là Đại Tổ, kể cả khi là tiền tổ) theo phương dọc thì cả khối phải đồ dịch theo, giúp đẩy cây lên/xuống trong lòng giấy. Hoành phi, rồng, câu đối và khung hoa văn **không** dịch theo. Thanh trượt “Dịch dọc toàn bộ” trong nhóm “Giấy & bố cục” đồng bộ hai chiều; biên độ tự tính từ `treeTop`: không đẩy thẻ đầu quá mép trên giấy, không để đáy nội dung tràn mép dưới; hai đầu slider làm tròn về bội của 10 để giá trị 0 nằm đúng bước nhảy (sửa lỗi slider hiển thị −1 thay vì 0 do `min` lệch lưới bước 10).
- **Sửa lỗi kèm theo:** điều kiện kích hoạt ban đầu dùng “đời nhỏ nhất” nên không ăn với tiền tổ (Đại Tổ mang đời âm nhưng `Math.min` theo số âm rơi vào đời khác); đã sửa thành so sánh `node.y === min(y)` — hàng trên cùng thật.

Bằng chứng kiểm tra trên trình duyệt ngoài (`http://localhost:3001/gia-pha/mau-gia-pha/ve-pha-do`, production `BUILD_ID QchydfgWhC9SRmbyxKfHT`):

- Bấm hoành phi/rồng/câu đối trên canvas → panel phải đổi sang phạm vi Hoành phi & câu đối; nút cùng tên trên thanh trái sáng khi đang ở phạm vi này.
- Thẻ chưa kéo: không thấy section “Vị trí trên phả đồ”; sau khi kéo ngang thẻ mới hiện dòng lệch + nút “Về vị trí gốc”, bấm về gốc thì section ẩn lại.
- Panel “Cả phả đồ”: đủ 4 nhóm, nhóm “Giấy & bố cục” mở sẵn, các nhóm kia đóng, bấm mở/thu từng nhóm được.
- **Kéo dọc Đại Tổ (thẻ trên cùng, y = 220):** kéo xuống 12 px → khối nội dung `translate(0, 421,08)` → `translate(0, 565,08)` (+144 đơn vị); kéo lên 12 px → về nguyên `421,08`. Hoành phi giữ nguyên `translate(1743, 148)` ở cả hai chiều; vị trí ngang của Đại Tổ không bị đè khi kéo dọc. Kéo dọc Thủy Tổ (hàng 2) thì **không** dịch khối — đúng thiết kế.
- Slider “Dịch dọc toàn bộ” đọc đúng giá trị tuning sau mỗi lần kéo; đưa slider về 0 trả bản vẽ về vị trí tự xếp.
- Console và mạng sạch; `tsc`, `eslint`, build production không lỗi.
- Dữ liệu người dùng (đã khôi phục): trong lúc kiểm thử, vị trí nháp của Đại Tổ (draft `t01`) bị kéo thử chạy về vị trí tự xếp; đã khôi phục lại đúng `t01 = (816, 220)` trong `phatue.diagramDraft.mau-gia-pha` và xác nhận thẻ vẽ lại ở x = 829.

Lưu ý dùng: với cây mẫu hiện tại (9 hàng thẻ trên A0), cây cao vừa khít khổ giấy nên biên độ dịch xuống còn ít/không còn — đó là ràng buộc vật lý của khổ giấy, không phải lỗi; cây nhỏ hơn hoặc khổ lớn hơn sẽ dàn trang thoải mái hơn.

### 6.4. Khổ giấy cố định khi chỉnh chi tiết

- **Mốc quy đổi:** `PAPER_UNITS_PER_MM = 3486 / 1189` (khổ A0 ngang: 1189 mm ↔ 3486 đơn vị, tương đương 0,3411 mm/đơn vị). Khổ A0 ngang vì vậy luôn là `viewBox 3486 × 2465,7` bất kể chi tiết đang chỉnh.
- **Khung giấy** (`paperUnitsFor` trong `diagram-canvas.tsx`): kích thước = `max(khổ mm × mốc, bố cục chuẩn)`; bố cục chuẩn dựng bằng `DEFAULT_DESIGN` (không vị trí kéo tay, cỡ thẻ 1×, cỡ nhãn 1×, khung 1×). Nhờ đó cây nhỏ trên khổ nhỏ vẫn vừa như trước, còn đổi chi tiết thì không làm giấy co giãn.
- **Chiều ngang/dọc** (`resolveOrientation` trong `export.ts`): khi bật tự xoay, chiều giấy xét theo bố cục chuẩn nói trên chứ không theo bố cục đang chỉnh, nên tăng cỡ thẻ không làm đảo khổ.
- **Nội dung rộng hơn giấy — tự thu vừa khổ** (`2026-11-07`): thay vì cắt mất thẻ, `diagramDimensions()` tính `fitScale = min(1, vùng đặt thẻ / bề rộng nội dung)` rồi `contentOrigin()` đặt khối nội dung bằng `translate(offsetX, treeTop + minY × (1 − fitScale)) scale(fitScale)`. Khổ giấy/`viewBox` giữ nguyên; nhãn đời **không** co mà vẫn neo theo giấy, nên khe khung–nhãn và nhãn–thẻ luôn ≥ 2,5 cm; mép trên thẻ đầu vẫn ở 26% chiều cao giấy. `offsetX` chừa đúng dải nhãn hai bên thay vì neo 0.
- **Bằng chứng đo** (production `BUILD_ID GKVZ2iWnY5_0UxpsqbXME`): mặc định `viewBox 3486 × 2465,707`, nhãn `86 × 20` tại `x = 161 / 3239`; đổi “Cỡ nhãn đời” 1,2× → nhãn `103,2` vẫn ở `x = 161`, `viewBox` **không đổi**; đổi “Cỡ viền” 1,4× và “Cỡ thẻ” Đời 1 1,45× (thẻ 168 → 244) → `viewBox` vẫn `3486 × 2465,707`, nhãn phải vẫn cách mép trong khung đúng `labelGap`. Trả hết về mặc định: thẻ 168×74, nhãn 86×20, `viewBox 3486 × 2465,707`.
- **Bằng chứng đo “Giãn ngang giữa anh em”** (production `BUILD_ID 1WmqVny1ItJncqo9EL_n4`, A0 ngang): giãn 26 → `translate(0, 421,08) scale(1)`, thẻ `[320, 3166]`, khe nhãn–thẻ `73 / 73`; giãn 60 → `scale(0,85551)`, thẻ bắt đầu `324`, mép phải vẫn `3166`; giãn 120 → `scale(0,67564)`, thẻ bắt đầu `354`, mép phải vẫn `3166`, mép trên thẻ đầu vẫn `641,1` (26%). `viewBox` không đổi ở mọi mức; console và mạng không có lỗi/404. Ghi chú dưới thanh trượt: “Nếu nội dung rộng quá khổ giấy, bản vẽ tự thu nhỏ để thẻ không tràn ra ngoài.”

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
