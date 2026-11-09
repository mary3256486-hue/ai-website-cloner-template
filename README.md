# Tiểu Phạm — Gia Phả (PAT)

Ứng dụng web dựng, trình bày và in ấn gia phả dòng họ, xây dựng cho Khối Đình Tiểu Phạm. Chạy hoàn toàn phía client: mọi dữ liệu nằm trên máy người dùng (localStorage + IndexedDB), không có đăng nhập, không có hệ thống xu hay mua bán nội dung. Bản mẫu tham chiếu là ứng dụng Phả Tuệ (app.phatue.vn); dự án chỉ tái hiện các tính năng dựng phả và in/xuất, không dùng tài nguyên hình ảnh của bản mẫu.

## Tính năng chính

- **Gia phả & thành viên** — tạo nhiều gia phả, hồ sơ thành viên đầy đủ (tên húy, tên tách, thế hệ, tình trạng Còn sống/Đã mất, ngày dương/âm lịch, quê quán, vợ/chồng thứ bậc, cha mẹ nuôi…), thùng rác thành viên/chi phái 30 ngày.
- **Chi phái** — phân thành viên vào chi phái, chọn trưởng chi phái, xem phả đồ theo từng chi.
- **Cây phả hệ & phả đồ** — editor cây kéo thả 3 cột, canvas SVG với thẻ chữ IN HOA (năm sinh/giỗ), cụm vợ chồng dính liền, ràng buộc kéo trong cùng thế hệ, chọn nhiều thẻ căn hàng/cột.
- **Thiết kế bản in** — khổ A4→A0 dọc/ngang, khung viền hoa văn 4 mô-đun, hoành phi + rồng chầu + câu đối (font thư pháp Hải Yến), cỡ thẻ/nhãn theo đời, đồng bộ hai chiều giữa phả đồ và thiết kế bản in.
- **Tư liệu** — kho tài liệu dòng họ lưu bằng IndexedDB: tải lên, xem, tải về, xoá.
- **Phả ký** — sách phả in 1/2 cột, số thứ tự con, ẩn năm sinh người còn sống.
- **Công cụ** — đổi ngày Âm lịch ↔ Dương lịch (đầy đủ 1700–2199), tra niên hiệu triều đại Việt Nam 544–1945, cách xưng hô.
- **Nhập/xuất** — CSV/Excel (ghép theo cột Mã, xem trước dòng lỗi), GEDCOM xuất/nhập, xuất PDF/PNG và in phả đồ.
- **An toàn dữ liệu** — thùng rác gia phả 30 ngày, sao lưu nhiều bản định kỳ, chế độ riêng tư khi in/xuất, khôi phục sau xoá.

## Đóng gói

| Nền tảng | Cách dựng | Kết quả |
| --- | --- | --- |
| Web tĩnh | `npm run build` | `out/` (static export) |
| Windows | `npm run electron:build` | `dist-electron/` (NSIS + portable) |
| Android | `npm run android:apk` | APK qua Capacitor |

## Công nghệ

- Next.js 16 (App Router, static export, query tĩnh), React 19, TypeScript strict
- Tailwind CSS v4, shadcn/ui (Base UI), Lucide icons
- `xlsx` cho Excel, Electron 45 (vỏ PC + cầu nối in/tải file), Capacitor 8 (vỏ Android)

## Cấu trúc

```
src/
  app/                  # /, /gia-pha, /gia-pha/thanh-vien (routing query tĩnh)
  components/sites/PAT/ # Toàn bộ ứng dụng gia phả
    store.tsx           # Store + localStorage (phatue.familyTrees.v1, trash, snapshots)
    types.ts            # Mô hình dữ liệu (Person, Design, Tuning…)
    layout.ts           # Thuật toán bố cục & đường nối phả đồ
    diagram-canvas.tsx  # Canvas SVG phả đồ
    tree-editor-view.tsx / diagram-editor-view.tsx / diagram-inspector.tsx
    members-view.tsx / member-form-sheet.tsx / member-detail-view.tsx
    branches-view.tsx / branch-view.tsx
    design-view.tsx     # Thiết kế bản in
    documents-view.tsx / document-store.ts
    home-view.tsx / tree-home-view.tsx / tools-view.tsx / kinship-sheet.tsx
    lunar.ts / lunar-converter.tsx / eras.ts
    import.ts / import-history.ts / export.ts / gedcom.ts / seed.ts
    decor-library.ts / decor-library-store.ts / native.ts / routes.ts / ui.tsx
  components/ui/        # shadcn/ui primitives
public/sites/PAT/
  decor/                # Hoa văn, khung, rồng, cuốn thư (nguồn mở + do người dùng cung cấp; xem SOURCES.md)
  fonts/                # Hải Yến thư pháp (bản 1), Dancing Script (OFL)
  images/               # Chữ Hán tiêu đề, watermark
android/ electron/      # Vỏ Capacitor và Electron
scripts/                # build-android.mjs, make-icons.mjs
docs/
  PAT-bao-cao-tien-do.md  # Nhật ký rà soát/sửa theo tầng (cập nhật sau mỗi đợt kiểm tra)
```

## Nguyên tắc phả đồ (tóm tắt)

- Các đời tiền tổ → Đời 1 ưu tiên căn giữa trang, áp dụng chung cho mọi bố cục và mọi gia phả (kể cả do người dùng tạo mới).
- Con cùng cha mẹ luôn liền cụm; kéo thả không cho cụm khác xen vào.
- Nét chính của cha (thân dọc + ngang + rủ) không phụ thuộc tùy chọn nét mẹ; bật/tắt nét mẹ–con không làm thay đổi nét chính hay vị trí thẻ.
- Nét đứt mẹ–con vẽ độc lập, sát dưới nét chính và được phép cắt qua nét chính; các mẹ khác nhau xếp so le theo khoảng x để mỗi mẹ chỉ nối con của mình.
- Đường ngang giữa hai đời xếp lớp theo xung đột khoảng x, tự nới dải đời khi thiếu chỗ.

Chi tiết đầy đủ và số đo kiểm tra: `docs/PAT-bao-cao-tien-do.md`.

## Chạy dự án

```bash
npm install
npm run dev          # http://localhost:3000
npm run check        # lint + typecheck + build
npm run electron:dev # vỏ PC
npm run electron:build
npm run android:apk
```

Yêu cầu Node ≥ 24 (xem `.nvmrc`). Gia phả mẫu `mau-gia-pha` có sẵn để kiểm tra; dữ liệu người dùng chỉ nằm trong trình duyệt/máy của họ.

## Tài nguyên & bản quyền

- Hình trang trí trong `public/sites/PAT/decor/` chỉ dùng nguồn mở hoặc do người dùng cung cấp, ghi công trong `public/sites/PAT/decor/SOURCES.md`; tuyệt đối không dùng ảnh từ app.phatue.vn.
- Font câu đối: Hải Yến (do người dùng cung cấp, dùng bản 1), Dancing Script (OFL).
- Mã nguồn khởi đầu từ bộ khung Next.js + Tailwind + shadcn/ui (ai-website-cloner-template, MIT).
