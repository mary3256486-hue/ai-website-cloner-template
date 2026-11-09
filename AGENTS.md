<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

# Tiểu Phạm — Gia Phả (PAT)

## What This Is
Genealogy web app for Khối Đình Tiểu Phạm: build, present and print Vietnamese family trees. Fully client-side (localStorage + IndexedDB) — no auth, no payments. Static export packaged for Web, Electron (Windows) and Capacitor (Android).

## Tech Stack
- **Framework:** Next.js 16 (App Router, React 19, TypeScript strict, static export with query-based routing)
- **UI:** shadcn/ui (Base UI primitives, Tailwind CSS v4, `cn()` utility)
- **Icons:** Lucide React
- **Packaging:** Electron 45 (Windows NSIS/portable), Capacitor 8 (Android), `xlsx` for Excel

## Commands
- `npm run dev` — Dev server at http://localhost:3000 (source of truth for UI verification; other ports are stale)
- `npm run build` — Production static export to `out/`
- `npm run lint` / `npm run typecheck` / `npm run check` (all three)
- `npm run electron:dev` / `npm run electron:build` — PC shell / exe
- `npm run cap:sync` / `npm run android:apk` — Android shell / APK

## Code Style
- TypeScript strict mode, no `any`
- Named exports, PascalCase components, camelCase utils
- Tailwind utilities or scoped CSS; avoid inline styles unless behavior needs dynamic values
- 2-space indentation, responsive: mobile-first
- All user-facing copy in Vietnamese

## Project Structure
```
src/
  app/                  # /, /gia-pha, /gia-pha/thanh-vien (static query routing)
  components/sites/PAT/ # The entire genealogy app (store, layout, canvas, views)
  components/ui/        # shadcn/ui primitives
public/sites/PAT/
  decor/                # Decorations — open-licensed or user-supplied only (see SOURCES.md)
  fonts/                # Hải Yến calligraphy (bản 1), Dancing Script (OFL)
  images/               # Hán characters for titles/watermark
android/ electron/      # Native shells
scripts/                # build-android.mjs, make-icons.mjs
docs/
  PAT-bao-cao-tien-do.md # Tier-by-tier review/fix log — update after every verified change
```

## Diagram Principles (do not regress)
- Founder → Generation 1 rows centered on the page, for every layout mode and every tree (sample or user-created).
- Full siblings always stay in one contiguous cluster; saved positions must never interleave families.
- Father's main connector is independent of the mother-line toggle; toggling it must not move any card or main line.
- Each mother's dashed connector touches only her own children; different mothers' bars are staggered by x-overlap and may cross the main bar.
- Horizontal bars between generations stack by x-conflict and widen the band automatically when needed.

## Working Rules
- Every change must be verified in a real browser (desktop + mobile) at http://localhost:3000, not just typecheck.
- Clean up test trees, drafts and temporary localStorage keys after verification.
- Never use artwork from app.phatue.vn; only open-licensed or user-supplied art, credited in `public/sites/PAT/decor/SOURCES.md`.
- After each verified change, add a newest-first subsection to `docs/PAT-bao-cao-tien-do.md`.
