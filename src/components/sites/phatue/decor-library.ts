export type DecorSlot = "left" | "right";

export interface DecorItem {
  id: string;
  label: string;
  category: string;
  slot: DecorSlot;
  width: number;
  height: number;
  nativeWidth: number;
  nativeHeight: number;
  src: string;
  flip?: boolean;
  credit?: string;
}

export const DECOR_CATEGORIES = [
  { id: "rong", label: "Rồng chầu" },
  { id: "may", label: "Mây lành" },
  { id: "sen", label: "Hoa sen" },
  { id: "hac", label: "Hạc" },
  { id: "phuong", label: "Phượng" },
  { id: "cuon-thu", label: "Cuốn thư" },
] as const;

const C = {
  gold: "#b8912f",
  goldDeep: "#8a5a0f",
  goldLight: "#e3c778",
  cream: "#fdf6e4",
  creamShade: "#f3e6c9",
  red: "#a3271d",
  redDeep: "#7d1a13",
  teal: "#2f6b7c",
  green: "#5f8f6a",
  greenDeep: "#2f5e46",
  ink: "#241f1b",
  white: "#fffdf6",
};

const svg = (inner: string, frameWidth = 180, frameHeight = 220) =>
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${frameWidth} ${frameHeight}">${inner}</svg>`;

const mirrored = (inner: string, frameWidth = 180) =>
  `<g transform="translate(${frameWidth} 0) scale(-1 1)">${inner}</g>`;

const uri = (markup: string) => `data:image/svg+xml;charset=utf-8,${encodeURIComponent(markup)}`;

const ink = (d: string, stroke = C.gold, width = 1.6, opacity = 1) =>
  `<path d="${d}" fill="none" stroke="${stroke}" stroke-width="${width}" stroke-linecap="round" stroke-linejoin="round" opacity="${opacity}"/>`;

const band = (d: string, outer: number, inner: number, outerColor = C.goldDeep, innerColor = C.cream) =>
  `<path d="${d}" fill="none" stroke="${outerColor}" stroke-width="${outer}" stroke-linecap="round" stroke-linejoin="round"/>` +
  `<path d="${d}" fill="none" stroke="${innerColor}" stroke-width="${inner}" stroke-linecap="round" stroke-linejoin="round"/>`;

const ruyi = (cx: number, cy: number, s: number, flip = false, plain = false) => `
<g transform="translate(${cx} ${cy}) scale(${flip ? -s : s} ${s})">
  <path d="M-36 12c-6-7-4-18 4-23-2-10 7-19 18-17 3-9 14-13 22-8 6-8 18-6 23 2 10 0 19 8 18 18 9 5 11 16 4 23-4 4-11 5-16 2-5 8-16 9-23 3-5 7-16 7-22 1-8 6-19 3-24-3-2 1-3 1-4 2Z"
    fill="${C.cream}" stroke="${C.gold}" stroke-width="2.2"/>
  ${
    plain
      ? ink("M-18 10c10 2 22 2 34-2", C.goldLight, 1.5)
      : ink("M-2 4c-7 0-12-5-12-12s5-13 13-13c7 0 13 6 13 13 0 8-6 15-15 16", C.goldLight, 1.5) +
        `<circle cx="20" cy="-9" r="1.8" fill="${C.gold}"/>`
  }
  ${ink("M-26 12c-4 0-7-3-7-7", C.goldLight, 1.5)}
  ${ink("M30 10c4-1 6-4 6-8", C.goldLight, 1.5)}
</g>`;

const DRAGON_SPINE =
  "M52 76C60 52 96 44 112 62C126 80 114 98 94 108C72 120 62 138 76 154C90 170 118 170 132 154";

const DRAGON = `
<g stroke-linecap="round" stroke-linejoin="round">
  <path d="M133 156c10 4 17 11 20 20-8-1-14-5-18-11" fill="${C.red}" stroke="${C.goldDeep}" stroke-width="1.4"/>
  ${ink("M137 164c6 2 11 7 13 12", C.goldLight, 1.3)}
  ${band(DRAGON_SPINE, 16, 11)}
  ${ink(DRAGON_SPINE, C.creamShade, 7, 0.7)}
  ${ink("M52 76C60 52 96 44 112 62", C.red, 2.8, 0.8)}
  ${ink("M94 108C72 120 62 138 76 154C90 170 118 170 132 154", C.red, 2, 0.45)}
  <g fill="none" stroke="${C.goldDeep}" stroke-width="9">
    <path d="M90 70c-5 12-6 23-1 32"/>
    <path d="M87 150c-2 12-6 20-13 27"/>
  </g>
  <g fill="none" stroke="${C.cream}" stroke-width="5.6">
    <path d="M90 70c-5 12-6 23-1 32"/>
    <path d="M87 150c-2 12-6 20-13 27"/>
  </g>
  <g stroke="${C.goldDeep}" stroke-width="1.7" fill="none">
    <path d="M84 104l-8 2M86 108l-7 4M89 112l-6 5"/>
    <path d="M70 180l-1 7M74 182l2 7M78 181l5 6"/>
  </g>
  <g stroke="${C.gold}" stroke-width="2.2" fill="none">
    <path d="M57 52c-3-9-1-17 4-23"/>
    <path d="M66 50c1-9 6-16 13-20"/>
  </g>
  <g fill="${C.red}" stroke="${C.goldDeep}" stroke-width="1.2">
    <path d="M60 58c3-7 9-12 16-15-2 7-6 12-11 15Z"/>
    <path d="M68 51c5-6 12-9 20-9-3 7-8 11-15 13Z"/>
  </g>
  <path d="M16 72c8-7 19-10 30-9 7 1 12 4 15 10 3 5 2 10-2 14 5 4 8 9 8 15-7 1-14-1-19-6-3-3-5-7-4-12-7 2-15 1-22-2-8-3-15-8-20-14Z" fill="${C.cream}" stroke="${C.gold}" stroke-width="2"/>
  ${ink("M16 75c9 4 17 5 25 3", C.redDeep, 1.6)}
  ${ink("M47 60c5-3 11-2 14 1", C.goldDeep, 1.8)}
  <circle cx="44" cy="70" r="2" fill="${C.ink}"/>
  <circle cx="23" cy="74" r="1.1" fill="${C.goldDeep}"/>
  ${ink("M22 82c-8 2-15 1-21-3 6-1 11-2 16-4", C.gold, 1.3)}
  ${ink("M24 68c-8-4-13-11-13-20 5 4 9 9 11 15", C.gold, 1.3)}
</g>`;

const CLOUD = `
<g stroke-linecap="round" stroke-linejoin="round">
  ${ruyi(84, 58, 1.08)}
  ${ruyi(50, 124, 0.78, false, true)}
  ${ruyi(128, 140, 0.7, false, true)}
  ${ink("M64 100c-10 3-17 10-19 20", C.gold, 1.9)}
  ${ink("M110 96c10 6 16 16 16 28", C.gold, 1.9)}
  ${ink("M42 162c-8 5-12 14-11 24", C.gold, 1.6)}
  ${ink("M118 174c6 4 10 10 11 17", C.gold, 1.6)}
  ${ink("M86 94c-4 10-3 18 3 25", C.goldLight, 1.5)}
  ${ink("M54 146c5 1 9 4 11 8", C.goldLight, 1.4)}
</g>`;

const LOTUS_DEFS = `<defs>
  <linearGradient id="petal" x1="0" y1="1" x2="0" y2="0">
    <stop offset="0.1" stop-color="#fdf6e4"/>
    <stop offset="0.72" stop-color="#fae3dc"/>
    <stop offset="1" stop-color="#e39a90"/>
  </linearGradient>
  <linearGradient id="leaf" x1="0" y1="0" x2="1" y2="1">
    <stop offset="0" stop-color="#7fa987"/>
    <stop offset="1" stop-color="#47714f"/>
  </linearGradient>
</defs>`;

const LOTUS = `
<g stroke-linecap="round" stroke-linejoin="round">
  ${LOTUS_DEFS}
  <path d="M90 132c-16-18-24-42-22-68 20 10 32 34 34 62" fill="url(#petal)" stroke="${C.gold}" stroke-width="1.7"/>
  <path d="M90 132c16-18 24-42 22-68-20 10-32 34-34 62" fill="url(#petal)" stroke="${C.gold}" stroke-width="1.7"/>
  <path d="M90 130c-10-24-10-48 0-72 10 24 10 48 0 72" fill="url(#petal)" stroke="${C.gold}" stroke-width="1.7"/>
  <path d="M90 138c-22-8-38-26-44-52 22 4 38 24 44 52" fill="url(#petal)" stroke="${C.gold}" stroke-width="1.7"/>
  <path d="M90 138c22-8 38-26 44-52-22 4-38 24-44 52" fill="url(#petal)" stroke="${C.gold}" stroke-width="1.7"/>
  <path d="M90 144c-18-4-31-15-38-31 17-1 32 12 38 31" fill="url(#petal)" stroke="${C.gold}" stroke-width="1.7"/>
  <path d="M90 144c18-4 31-15 38-31-17-1-32 12-38 31" fill="url(#petal)" stroke="${C.gold}" stroke-width="1.7"/>
  <g fill="none" stroke="${C.red}" stroke-width="1.3" opacity="0.5">
    <path d="M68 64c6 8 10 16 13 24"/>
    <path d="M112 64c-6 8-10 16-13 24"/>
    <path d="M90 58v22"/>
    <path d="M46 86c10 10 19 21 26 34"/>
    <path d="M134 86c-10 10-19 21-26 34"/>
    <path d="M52 113c8 4 15 9 21 16"/>
    <path d="M128 113c-8 4-15 9-21 16"/>
  </g>
  <g fill="${C.goldLight}" stroke="${C.gold}" stroke-width="0.9">
    <circle cx="90" cy="138" r="2.6"/>
    <circle cx="82" cy="143" r="2.1"/>
    <circle cx="98" cy="143" r="2.1"/>
    <circle cx="86" cy="149" r="1.8"/>
    <circle cx="94" cy="149" r="1.8"/>
    <circle cx="90" cy="153" r="1.6"/>
  </g>
  <path d="M90 154v40" stroke="${C.gold}" stroke-width="2.4"/>
  <path d="M90 172c-16-6-30 1-38 15 15 8 32 4 41-8" fill="url(#leaf)" stroke="${C.greenDeep}" stroke-width="1.7"/>
  <path d="M55 186c10-2 20 1 27 7" fill="none" stroke="${C.cream}" stroke-width="1.2" opacity="0.7"/>
  <path d="M90 198c3-9 10-15 20-17-1 10-7 16-16 19" fill="url(#leaf)" stroke="${C.greenDeep}" stroke-width="1.5"/>
  ${ink("M90 200c-5 4-8 9-9 15", C.gold, 1.4)}
</g>`;

const LOTUS_BUD = `
<g stroke-linecap="round" stroke-linejoin="round">
  ${LOTUS_DEFS}
  <path d="M90 46c-15 22-23 50-17 76 2 7 5 13 9 17-11-3-19-13-21-27-3-24 8-49 29-66Z" fill="url(#petal)" stroke="${C.gold}" stroke-width="1.8"/>
  <path d="M90 46c15 22 23 50 17 76-2 7-5 13-9 17 11-3 19-13 21-27 3-24-8-49-29-66Z" fill="url(#petal)" stroke="${C.gold}" stroke-width="1.8"/>
  <path d="M90 40c10 22 14 46 12 68-1 14-6 25-12 31-6-6-11-17-12-31-2-22 2-46 12-68Z" fill="url(#petal)" stroke="${C.gold}" stroke-width="1.9"/>
  <g fill="none" stroke="${C.red}" stroke-width="1.3" opacity="0.5">
    <path d="M90 60v50"/>
    <path d="M78 72c-3 18-1 34 5 46"/>
    <path d="M102 72c3 18 1 34-5 46"/>
  </g>
  <path d="M78 140c-8 4-12 10-12 18 8 1 15-3 19-10" fill="url(#leaf)" stroke="${C.greenDeep}" stroke-width="1.5"/>
  <path d="M102 140c8 4 12 10 12 18-8 1-15-3-19-10" fill="url(#leaf)" stroke="${C.greenDeep}" stroke-width="1.5"/>
  <path d="M90 144v44" stroke="${C.gold}" stroke-width="2.4"/>
  <path d="M90 170c-16-6-30 1-38 15 15 8 32 4 41-8" fill="url(#leaf)" stroke="${C.greenDeep}" stroke-width="1.7"/>
  <path d="M55 184c10-2 20 1 27 7" fill="none" stroke="${C.cream}" stroke-width="1.2" opacity="0.7"/>
  ${ink("M90 204c-5 2-9 6-11 11", C.gold, 1.4)}
</g>`;

const CRANE = `
<g stroke-linecap="round" stroke-linejoin="round">
  ${ruyi(100, 206, 0.7)}
  <g fill="none" stroke="${C.gold}" stroke-width="2.1">
    <path d="M98 142v48M114 140v48"/>
    <path d="M98 190l-8 6M98 190l0 7M98 190l8 5"/>
    <path d="M114 188l-8 6M114 188l0 7M114 188l8 5"/>
  </g>
  <path d="M120 126c12-2 22 2 28 11-8 5-18 5-26 0Z" fill="${C.ink}" stroke="${C.goldDeep}" stroke-width="1.2"/>
  <path d="M88 112c2-8 10-14 20-15 13-2 25 3 31 12 5 8 3 17-5 22-10 7-24 8-34 2-8-5-13-13-11-21Z" fill="${C.cream}" stroke="${C.gold}" stroke-width="1.9"/>
  <path d="M96 108c8-10 22-13 34-7 2 8-2 16-10 20" fill="${C.creamShade}" stroke="${C.gold}" stroke-width="1.6"/>
  <g fill="none" stroke="${C.gold}" stroke-width="1.2" opacity="0.85">
    <path d="M106 108c8 1 14 4 19 9"/>
    <path d="M104 114c8 1 14 4 19 9"/>
    <path d="M102 120c8 1 14 4 19 9"/>
  </g>
  <g fill="none" stroke-linecap="round">
    <path d="M84 112c-10-13-13-28-9-42 3-9 8-16 15-21" stroke="${C.gold}" stroke-width="10"/>
    <path d="M84 112c-10-13-13-28-9-42 3-9 8-16 15-21" stroke="${C.cream}" stroke-width="6.5"/>
  </g>
  <circle cx="90" cy="47" r="8" fill="${C.cream}" stroke="${C.gold}" stroke-width="1.9"/>
  <path d="M82 41c2-4 6-6 11-5 3 0 5 2 7 4-6 3-12 4-18 1Z" fill="${C.red}" stroke="${C.redDeep}" stroke-width="1.1"/>
  <path d="M82 46L66 50l16 5Z" fill="${C.gold}" stroke="${C.goldDeep}" stroke-width="1.1"/>
  <circle cx="87" cy="45" r="1.7" fill="${C.ink}"/>
  ${ink("M71 58c4 4 9 6 14 6", C.gold, 1.3)}
  <g stroke="${C.gold}" stroke-width="1.3" opacity="0.9">
    <path d="M76 55c-6 4-12 6-18 6"/>
    <path d="M74 59c-5 5-10 8-16 10"/>
  </g>
</g>`;

const PHOENIX = `
<g stroke-linecap="round" stroke-linejoin="round">
  ${ruyi(94, 206, 0.68)}
  <g fill="none" stroke-linecap="round">
    <path d="M120 132c22 4 38 18 45 38" stroke="${C.goldDeep}" stroke-width="6.5"/>
    <path d="M122 138c26 2 46 14 56 33" stroke="${C.teal}" stroke-width="6"/>
    <path d="M116 126c20-12 40-12 55 0" stroke="${C.red}" stroke-width="5.5"/>
  </g>
  <g fill="none" stroke-linecap="round" stroke-width="2.6">
    <path d="M120 132c22 4 38 18 45 38" stroke="${C.gold}"/>
    <path d="M122 138c26 2 46 14 56 33" stroke="${C.goldLight}"/>
    <path d="M116 126c20-12 40-12 55 0" stroke="${C.creamShade}"/>
  </g>
  <g fill="${C.cream}" stroke="${C.gold}" stroke-width="1.3">
    <path d="M162 168c8 5 13 12 15 21-8-3-14-8-18-15Z"/>
    <path d="M175 169c6 6 9 13 9 21-6-4-11-9-14-15Z"/>
    <path d="M168 123c0 8-2 14-6 19 8-2 13-7 15-14Z"/>
  </g>
  <path d="M96 112c8-18 26-28 46-24-2 16-14 30-30 36" fill="${C.gold}" stroke="${C.goldDeep}" stroke-width="1.8"/>
  <g fill="none" stroke="${C.goldDeep}" stroke-width="1.2" opacity="0.75">
    <path d="M108 104c8-6 18-9 28-9"/>
    <path d="M106 112c8-6 18-9 28-9"/>
    <path d="M104 120c8-5 16-8 25-8"/>
  </g>
  <ellipse cx="98" cy="126" rx="26" ry="18" fill="${C.red}" stroke="${C.redDeep}" stroke-width="1.8" transform="rotate(-12 98 126)"/>
  <ellipse cx="104" cy="129" rx="16" ry="10" fill="${C.creamShade}" stroke="${C.gold}" stroke-width="1.2" transform="rotate(-12 104 129)"/>
  <g fill="none" stroke="${C.gold}" stroke-width="2.2">
    <path d="M110 142v37M94 146v35"/>
    <path d="M110 178l-8 5M110 178l0 7M110 178l7 5"/>
    <path d="M94 180l-8 5M94 180l0 7M94 180l7 5"/>
  </g>
  <g fill="none" stroke-linecap="round">
    <path d="M88 118c-7-12-9-25-4-37 3-7 7-12 12-16" stroke="${C.redDeep}" stroke-width="11"/>
    <path d="M88 118c-7-12-9-25-4-37 3-7 7-12 12-16" stroke="${C.red}" stroke-width="7"/>
  </g>
  <circle cx="97" cy="60" r="8.5" fill="${C.red}" stroke="${C.redDeep}" stroke-width="1.7"/>
  <path d="M89 56L73 61l16 5Z" fill="${C.gold}" stroke="${C.goldDeep}" stroke-width="1.1"/>
  <circle cx="95" cy="58" r="1.7" fill="${C.ink}"/>
  <g fill="none" stroke="${C.gold}" stroke-width="2.2">
    <path d="M97 52c1-9 5-15 11-20"/>
    <path d="M103 54c5-7 11-12 18-14"/>
    <path d="M90 53c-2-8 0-15 4-20"/>
  </g>
</g>`;

const SCROLL_CORNER = `
<g>
  <path d="M45 37c5-4 11-6 17-5-3 5-8 9-14 10Z" fill="${C.goldLight}" stroke="${C.goldDeep}" stroke-width="0.8"/>
  <path d="M45 37c-3 4-4 9-2 13 4-2 7-6 7-11" fill="none" stroke="${C.gold}" stroke-width="1.2"/>
  ${ink("M48 50c4 1 8 0 11-3", C.gold, 1)}
</g>`;

const SCROLL = `
<g stroke-linecap="round" stroke-linejoin="round">
  <defs>
    <linearGradient id="scrollGold" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0" stop-color="#e3c778"/>
      <stop offset="0.5" stop-color="#b8912f"/>
      <stop offset="1" stop-color="#8a5a0f"/>
    </linearGradient>
    <linearGradient id="scrollSilk" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#b33226"/>
      <stop offset="1" stop-color="#8c1f16"/>
    </linearGradient>
    <linearGradient id="scrollPaper" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#fffdf6"/>
      <stop offset="0.6" stop-color="#fdf6e4"/>
      <stop offset="1" stop-color="#f3e6c9"/>
    </linearGradient>
  </defs>
  <ellipse cx="120" cy="101" rx="103" ry="4" fill="${C.ink}" opacity="0.08"/>
  <rect x="23" y="14" width="194" height="82" rx="5" fill="url(#scrollSilk)" stroke="${C.redDeep}" stroke-width="1.6"/>
  <path d="M34 16.5h172M34 93.5h172" fill="none" stroke="${C.goldLight}" stroke-width="0.9" stroke-dasharray="4 4" opacity="0.55"/>
  <rect x="31" y="19" width="178" height="72" rx="2" fill="url(#scrollPaper)" stroke="${C.gold}" stroke-width="1.4"/>
  <rect x="38" y="26" width="164" height="58" fill="none" stroke="${C.gold}" stroke-width="1.1"/>
  <rect x="41" y="29" width="158" height="52" fill="none" stroke="${C.goldLight}" stroke-width="0.8" opacity="0.9"/>
  <g stroke="${C.ink}" stroke-width="1.6" stroke-dasharray="2.5 5.5" opacity="0.18">
    <path d="M96 40v30"/>
    <path d="M110 40v30"/>
    <path d="M124 40v30"/>
    <path d="M138 40v30"/>
    <path d="M152 40v30"/>
  </g>
  <g fill="none" stroke="${C.gold}" stroke-width="1.2" opacity="0.85">
    <path d="M107 34c3-4 8-5 12-1 4-4 9-3 12 1"/>
    <path d="M111 37c3-2 6-2 8 0 2-2 5-2 8 0"/>
    <path d="M107 76c3 4 8 5 12 1 4 4 9 3 12-1"/>
    <path d="M111 73c3 2 6 2 8 0 2 2 5 2 8 0"/>
  </g>
  <g transform="translate(0 0)">${SCROLL_CORNER}</g>
  <g transform="translate(240 0) scale(-1 1)">${SCROLL_CORNER}</g>
  <g transform="translate(0 110) scale(1 -1)">${SCROLL_CORNER}</g>
  <g transform="translate(240 110) scale(-1 -1)">${SCROLL_CORNER}</g>
  <g>
    <rect x="184" y="66" width="16" height="16" rx="1.5" fill="${C.red}" stroke="${C.redDeep}" stroke-width="1"/>
    <rect x="187" y="69" width="10" height="10" fill="none" stroke="${C.cream}" stroke-width="0.9" opacity="0.8"/>
    <path d="M187 74h10M192 69v10" fill="none" stroke="${C.cream}" stroke-width="0.9" opacity="0.75"/>
  </g>
  <rect x="8" y="5" width="16" height="100" rx="8" fill="url(#scrollGold)" stroke="${C.goldDeep}" stroke-width="1.4"/>
  <rect x="216" y="5" width="16" height="100" rx="8" fill="url(#scrollGold)" stroke="${C.goldDeep}" stroke-width="1.4"/>
  <rect x="11.5" y="12" width="3.4" height="86" rx="1.7" fill="${C.goldLight}" opacity="0.7"/>
  <rect x="219.5" y="12" width="3.4" height="86" rx="1.7" fill="${C.goldLight}" opacity="0.7"/>
  <g fill="${C.goldDeep}" opacity="0.35">
    <circle cx="16" cy="14" r="2.2"/><circle cx="16" cy="96" r="2.2"/>
    <circle cx="224" cy="14" r="2.2"/><circle cx="224" cy="96" r="2.2"/>
  </g>
</g>`;

interface HandSize {
  width?: number;
  height?: number;
  frameWidth?: number;
  frameHeight?: number;
}

const make = (
  id: string,
  label: string,
  category: string,
  art: string,
  slot: DecorSlot,
  nativeWidth: number,
  nativeHeight: number,
  size: HandSize = {},
): DecorItem => {
  const { width = 94, height = 115, frameWidth = 180, frameHeight = 220 } = size;
  return {
    id,
    label,
    category,
    slot,
    width,
    height,
    nativeWidth,
    nativeHeight,
    src: uri(svg(art, frameWidth, frameHeight)),
  };
};

const pair = (
  id: string,
  label: string,
  category: string,
  art: string,
  nativeWidth: number,
  nativeHeight: number,
  size: HandSize = {},
): DecorItem[] => [
  make(`${id}-phai`, `${label} (phải)`, category, art, "right", nativeWidth, nativeHeight, size),
  make(
    `${id}-trai`,
    `${label} (trái)`,
    category,
    mirrored(art, size.frameWidth ?? 180),
    "left",
    nativeWidth,
    nativeHeight,
    size,
  ),
];

const webPair = (
  id: string,
  label: string,
  category: string,
  file: string,
  nativeWidth: number,
  nativeHeight: number,
  width: number,
  height: number,
  credit: string,
): DecorItem[] => [
  {
    id: `${id}-phai`,
    label: `${label} (phải)`,
    category,
    slot: "right",
    width,
    height,
    nativeWidth,
    nativeHeight,
    src: `/sites/phatue/decor/${file}`,
    credit,
  },
  {
    id: `${id}-trai`,
    label: `${label} (trái)`,
    category,
    slot: "left",
    width,
    height,
    nativeWidth,
    nativeHeight,
    src: `/sites/phatue/decor/${file}`,
    flip: true,
    credit,
  },
];

export const DECOR_ITEMS: DecorItem[] = [
  ...pair("rong", "Rồng 01", "rong", DRAGON, 1800, 2200),
  ...webPair("rong-viet", "Rồng vàng Việt", "rong", "rong-viet.svg", 805, 370, 170, 78, "Goran_tek-en · CC BY-SA 4.0 · Wikimedia Commons"),
  ...webPair("rong-do", "Rồng đỏ", "rong", "rong-do.svg", 472, 660, 86, 120, "Tsange · CC0 · Wikimedia Commons"),
  ...pair("may", "Mây 01", "may", CLOUD, 1200, 1500),
  ...pair("sen-no", "Sen nở", "sen", LOTUS, 1400, 1700),
  ...pair("sen-ngam", "Sen ngậm", "sen", LOTUS_BUD, 1400, 1700),
  ...webPair("sen-hong", "Sen hồng", "sen", "sen-hong.svg", 889, 728, 108, 88, "Openclipart · CC0"),
  ...webPair("sen-net", "Sen nét mực", "sen", "sen-net.svg", 56, 34, 120, 74, "Openclipart · CC0"),
  ...pair("hac", "Hạc chầu", "hac", CRANE, 1500, 1830),
  ...webPair("hac-net", "Hạc nét mực", "hac", "hac-net.svg", 998, 1501, 80, 120, "Openclipart · CC0"),
  ...pair("phuong", "Phượng", "phuong", PHOENIX, 1600, 1960),
  ...webPair("phuong-vang", "Phượng chạm vàng", "phuong", "phuong-vang.svg", 1524, 1600, 110, 115, "Openclipart · CC0"),
  ...webPair("phuong-huy", "Phượng huy vàng", "phuong", "phuong-huy.svg", 2429, 2429, 110, 110, "Openclipart · CC0"),
  ...pair("cuon-thu", "Cuốn thư 01", "cuon-thu", SCROLL, 2400, 1100, {
    width: 160,
    height: 73,
    frameWidth: 240,
    frameHeight: 110,
  }),
  ...webPair("cuon-niem", "Cuốn thư niêm ấn", "cuon-thu", "cuon-thu-niem.svg", 2128, 2616, 110, 135, "Openclipart · CC0"),
  ...webPair("cuon-bang", "Băng trục", "cuon-thu", "cuon-thu-bang.svg", 16106, 4499, 170, 48, "Wikimedia Commons · CC0"),
];
