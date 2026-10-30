# Phả Tuệ — page brief

Source: https://app.phatue.vn/ (Flutter web). Captured 2026-10-30 at 663×680 mobile viewport.

## Scope requested

- All genealogy-building features (tree, members, relationships, branches, diagram, family history).
- Print/export file.
- Skip login/registration, coins/paid unlocks, community, events, games, worship hall, AI.

## Routes observed

| Source route | Screen |
| --- | --- |
| `/` | Tree list + sample tree card, create tree |
| `/gia-pha/:id/trang-chu` | Tree dashboard (feature grid) |
| `/gia-pha/:id/danh-sach-thanh-vien` | Member list, generation rail, search, filter, export |
| `/gia-pha/:id/danh-sach-nhanh` | Branch management |
| `/gia-pha/:id/chinh-sua-voi-cay-gia-pha` | Family tree editor (pan/zoom) |
| `/gia-pha/:id/ve-pha-do` | Advanced diagram editor, drag/drop, PDF export |
| `/gia-pha/:id/giao-dien` | Print design: paper size, themes, decorations |
| `/gia-pha/:id/pha-ky` | Family chronicle book |
| `/minified:adK` | Member detail |
| `/minified:aaI` | Family chronicle reader |

## Visual language

- Deep lacquer red `#8a1c15` → `#6e140f`, cream paper `#fdf6e7`, gold `#c9a227`, ink `#3d2a1e`.
- Serif display headings, clean sans body (Be Vietnam Pro-like).
- Rounded cream cards on a warm paper background, gold hairline borders.
- Mobile: red app bar with back/actions, bottom tab bar (Gia phả, Sự kiện, Phả Tuệ, Cộng đồng, Tài khoản).
- Family diagram: yellow member boxes, red connectors, ornate frame, banner "Gia Phả 4.0", dragon/lotus ornaments.

## Features

### Tree list
- Create tree (login-gated at source; clone is open).
- Sample tree card: name, address, generations, members, date, owner.
- Sample hides after first own tree.

### Member list
- Header: Phả hệ, tree name + member count.
- Search by name/birth year/branch.
- Actions: export data (Excel, backup file), more (view diagram, kinship lookup).
- Stats: members, male, female.
- Generation rail with per-generation male/female/total counts.
- Member cards: avatar, name, gender, spouse count, children count.
- Filter sheet: gender, living status, sort (genealogy order, A→Z, birth year).
- Expand toggle.

### Member detail
- Hero: avatar, title (Cụ tổ / Thủy tổ), name, counts (spouses, children, grandchildren, photos).
- Personal: gender, birth–death + age, lunar death anniversary, hometown, occupation, marital status, biography.
- Photos, relations (parents, spouses, children), worship (death date, anniversary, place, caretaker, grave), contact (phone, address, map), education.
- Actions: view on diagram, kinship.

### Branch management
- Branch overview diagram.
- Empty state: “chưa có nhánh, chi cành nào… [+ Tách nhánh]”.
- Branch: name, head, members.

### Family tree editor
- Full-screen pan/zoom tree, member nodes, guidance sheet, search, menu.
- Warning for members without a father.
- Tap member → view/edit/add child/add spouse/delete.

### Advanced diagram (phả đồ)
- Toolbar: undo, redo, grid, auto-arrange, export PDF, save.
- Paper: 84.1 × 118.9 cm (A0), auto orientation.
- Decorations: hoành phi, rồng chầu, câu đối, hoa văn nền, khung & mẫu, images, text.
- Sidebar: generation filters with member counts, search member.
- Drag member boxes, edit one or whole diagram.
- PDF export warns 1 coin per member (clone: free).

### Print design
- Paper size selector, auto rotate.
- Layout themes: borderless, family tree, generations.
- Backgrounds, banner styles, dragon 01/02, banner text, couplet 01/02.

### Kinship lookup
- Pick two members, swap, North/South dialect.
- Vietnamese kinship follows branch seniority, not age.

### Chronicle (phả ký)
- Ornate book pages, gratitude/introduction text, family history.

## Clone decisions

- Next.js routes preserve source pathnames, member detail at `/gia-pha/:id/thanh-vien/:memberId`.
- localStorage persistence, sample tree seeded, no auth.
- Diagram layout computed from father/mother/spouse relations.
- Print → browser “Save as PDF” at chosen paper size; PNG download; CSV (Excel) + JSON backup.
- Out-of-scope tabs remain visible but show a scope notice, preserving navigation shape.
