export type Gender = "male" | "female";

export type PaperSize = "A4" | "A3" | "A2" | "A1" | "A0";

export type DiagramTheme = "borderless" | "tree" | "generations";

export type BackgroundPattern = "none" | "clouds" | "dragon" | "lotus" | "scroll";

export type PaletteName = "classic" | "gold" | "ink" | "jade";

export type CardOrientation = "horizontal" | "vertical";

export type ExtraFieldKey =
  | "hometown"
  | "occupation"
  | "address"
  | "tabooName"
  | "education"
  | "deathAnniversary"
  | "age"
  | "generation";

export type GenerationBandLabel = "ordinal" | "ordinalName" | "generation";

export interface GenerationStyle {
  orientation?: CardOrientation;
  showAvatar?: boolean;
  showTitle?: boolean;
  showName?: boolean;
  showDates?: boolean;
  showDeathAnniversary?: boolean;
  fontSize?: number;
  fontFamily?: string;
  lineCount?: number;
  extraFields?: ExtraFieldKey[];
  cardColor?: string;
}

export interface PersonStyle {
  hideDates?: boolean;
  color?: string;
  lineColor?: string;
}

export interface DiagramTuning {
  generationGap: number;
  siblingGap: number;
  branchGap: number;
  marginTop: number;
  marginBottom: number;
  marginLeft: number;
  marginRight: number;
  connectorWidth: number;
  connectorColor?: string;
  connectorDash: boolean;
  tintByLevel: boolean;
  generationBandLabel: GenerationBandLabel;
  generationBandColor?: string;
  frameStyle: "none" | "wood";
  fontFamily: string;
  fontSize: number;
  lineCount: number;
  extraFields: ExtraFieldKey[];
  generationStyles?: Record<string, GenerationStyle>;
  personStyles?: Record<string, PersonStyle>;
}

export interface CustomPaper {
  widthMm: number;
  heightMm: number;
  ratio: "1:1" | "3:2" | "custom";
}

export interface Person {
  id: string;
  name: string;
  gender: Gender;
  birthDate?: string;
  deathDate?: string;
  alive: boolean;
  title?: string;
  generationNote?: string;
  tabooName?: string;
  courtesyName?: string;
  styleName?: string;
  posthumousName?: string;
  officeTitle?: string;
  mandarinRank?: string;
  honors?: string;
  birthOrder: number;
  fatherId?: string;
  motherId?: string;
  spouseIds: string[];
  branchId?: string;
  hometown?: string;
  occupation?: string;
  maritalStatus?: string;
  biography?: string;
  deathAnniversary?: string;
  restingPlace?: string;
  graveAddress?: string;
  worshipPlace?: string;
  phone?: string;
  address?: string;
  education?: string;
  avatar?: string;
  photos?: string[];
  notes?: string;
}

export interface Branch {
  id: string;
  name: string;
  description?: string;
  headId?: string;
  color: string;
}

export interface Decoration {
  id: string;
  type: "text" | "image";
  content: string;
  x: number;
  y: number;
  width?: number;
  height?: number;
  fontSize?: number;
  color?: string;
  rotate?: number;
  flip?: boolean;
}

export interface DesignSettings {
  paper: PaperSize;
  orientation: "portrait" | "landscape";
  autoRotate: boolean;
  theme: DiagramTheme;
  background: BackgroundPattern;
  palette: PaletteName;
  bannerText: string;
  showBanner: boolean;
  showCouplets: boolean;
  showGenerationLabels: boolean;
  cardOrientation: CardOrientation;
  cardOrientations?: Record<string, CardOrientation>;
  showTitle: boolean;
  showName: boolean;
  showDates: boolean;
  showDeathAnniversary: boolean;
  showAvatar: boolean;
  borderStyle: "none" | "simple" | "ornate";
  customPaper?: CustomPaper | null;
  tuning?: DiagramTuning;
}

export interface FamilyTree {
  id: string;
  name: string;
  address?: string;
  description?: string;
  ownerName?: string;
  createdAt: string;
  updatedAt: string;
  members: Person[];
  branches: Branch[];
  history: string;
  design: DesignSettings;
  positions: Record<string, { x: number; y: number }>;
  decorations: Decoration[];
  sample?: boolean;
}

export interface TreeNode {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
  generation: number;
  person: Person;
  isSpouse: boolean;
  unitId: string;
}

export interface TreeEdge {
  id: string;
  type: "spouse" | "child";
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  generation?: number;
  subjectId?: string;
}

export interface TreeLayout {
  nodes: TreeNode[];
  edges: TreeEdge[];
  generations: { generation: number; count: number; y: number }[];
  width: number;
  height: number;
}

export const CARD_W = 168;
export const CARD_H = 74;
export const CARD_VERTICAL_W = 75;
export const CARD_VERTICAL_H = 150;
export const SPOUSE_GAP = 12;
export const UNIT_GAP = 26;
export const ROW_GAP = 58;
export const PADDING = 48;

export function cardOrientationFor(
  design: Partial<DesignSettings> | null | undefined,
  generation: number,
): CardOrientation {
  const tuned = design?.tuning?.generationStyles?.[String(generation)]?.orientation;
  if (tuned) return tuned;
  const override = design?.cardOrientations?.[String(generation)];
  if (override) return override;
  return design?.cardOrientation === "vertical" ? "vertical" : "horizontal";
}

export function cardDimsFor(design: Partial<DesignSettings> | null | undefined, generation: number) {
  return cardOrientationFor(design, generation) === "vertical"
    ? { width: CARD_VERTICAL_W, height: CARD_VERTICAL_H }
    : { width: CARD_W, height: CARD_H };
}

export const ANCESTOR_TITLES = [
  "Thủy tổ",
  "Khởi tổ",
  "Viễn tổ",
  "Triệu tổ",
  "Thái tổ",
  "Cao tổ",
  "Tằng tổ",
  "Tổ phụ",
  "Tổ mẫu",
  "Hiển khảo",
  "Hiển tỷ",
  "Cụ tổ",
  "Ông tổ",
  "Bà tổ",
];

export const NOBLE_TITLES = [
  "Quận công",
  "Công",
  "Hầu",
  "Bá",
  "Tử",
  "Nam",
  "Thượng thư",
  "Tổng đốc",
  "Tuần phủ",
  "Tri phủ",
  "Tri huyện",
  "Huấn đạo",
  "Giáo thụ",
  "Chánh tổng",
  "Lý trưởng",
  "Hương trưởng",
  "Bang tá",
  "Phó lý",
];

export const MANDARIN_RANKS = [
  "Chánh nhất phẩm",
  "Tòng nhất phẩm",
  "Chánh nhị phẩm",
  "Tòng nhị phẩm",
  "Chánh tam phẩm",
  "Tòng tam phẩm",
  "Chánh tứ phẩm",
  "Tòng tứ phẩm",
  "Chánh ngũ phẩm",
  "Tòng ngũ phẩm",
  "Chánh lục phẩm",
  "Tòng lục phẩm",
  "Chánh thất phẩm",
  "Tòng thất phẩm",
  "Chánh bát phẩm",
  "Tòng bát phẩm",
  "Chánh cửu phẩm",
  "Tòng cửu phẩm",
];

export const HONORS = [
  "Trạng nguyên",
  "Bảng nhãn",
  "Thám hoa",
  "Hoàng giáp",
  "Tiến sĩ",
  "Phó bảng",
  "Cử nhân",
  "Hương cống",
  "Tú tài",
  "Sinh đồ",
  "Nho sinh",
];

export const PAPER_MM: Record<PaperSize, [number, number]> = {
  A4: [210, 297],
  A3: [297, 420],
  A2: [420, 594],
  A1: [594, 841],
  A0: [841, 1189],
};

export const DEFAULT_DESIGN: DesignSettings = {
  paper: "A0",
  orientation: "portrait",
  autoRotate: true,
  theme: "tree",
  background: "clouds",
  palette: "classic",
  bannerText: "GIA PHẢ",
  showBanner: true,
  showCouplets: true,
  showGenerationLabels: true,
  cardOrientation: "horizontal",
  showTitle: true,
  showName: true,
  showDates: true,
  showDeathAnniversary: false,
  showAvatar: true,
  borderStyle: "ornate",
};

export const DEFAULT_TUNING: DiagramTuning = {
  generationGap: 58,
  siblingGap: 26,
  branchGap: 52,
  marginTop: 48,
  marginBottom: 48,
  marginLeft: 48,
  marginRight: 48,
  connectorWidth: 1.6,
  connectorColor: "",
  connectorDash: false,
  tintByLevel: false,
  generationBandLabel: "ordinal",
  generationBandColor: "",
  frameStyle: "none",
  fontFamily: "'Be Vietnam Pro', sans-serif",
  fontSize: 10.5,
  lineCount: 2,
  extraFields: [],
  generationStyles: {},
  personStyles: {},
};

function clampNumber(value: number | undefined, fallback: number, min: number, max: number) {
  if (value === undefined || Number.isNaN(value)) return fallback;
  return Math.min(max, Math.max(min, value));
}

export function normalizeTuning(tuning?: Partial<DiagramTuning> | null): DiagramTuning {
  return {
    ...DEFAULT_TUNING,
    ...tuning,
    generationGap: clampNumber(tuning?.generationGap, DEFAULT_TUNING.generationGap, 20, 240),
    siblingGap: clampNumber(tuning?.siblingGap, DEFAULT_TUNING.siblingGap, 8, 120),
    branchGap: clampNumber(tuning?.branchGap, DEFAULT_TUNING.branchGap, 12, 200),
    marginTop: clampNumber(tuning?.marginTop, DEFAULT_TUNING.marginTop, 20, 240),
    marginBottom: clampNumber(tuning?.marginBottom, DEFAULT_TUNING.marginBottom, 20, 240),
    marginLeft: clampNumber(tuning?.marginLeft, DEFAULT_TUNING.marginLeft, 20, 240),
    marginRight: clampNumber(tuning?.marginRight, DEFAULT_TUNING.marginRight, 20, 240),
    connectorWidth: clampNumber(tuning?.connectorWidth, DEFAULT_TUNING.connectorWidth, 1, 20),
    fontSize: clampNumber(tuning?.fontSize, DEFAULT_TUNING.fontSize, 7, 24),
    lineCount: Math.round(clampNumber(tuning?.lineCount, DEFAULT_TUNING.lineCount, 1, 5)),
    extraFields: Array.isArray(tuning?.extraFields) ? tuning.extraFields : [],
    generationStyles: tuning?.generationStyles ?? {},
    personStyles: tuning?.personStyles ?? {},
  };
}

export function normalizeCustomPaper(paper?: CustomPaper | null): CustomPaper | null {
  if (!paper) return null;
  return {
    widthMm: Math.round(clampNumber(paper.widthMm, 1189, 200, 5000)),
    heightMm: Math.round(clampNumber(paper.heightMm, 841, 200, 5000)),
    ratio: paper.ratio === "1:1" || paper.ratio === "3:2" ? paper.ratio : "custom",
  };
}

export const EXTRA_FIELD_LABELS: Record<ExtraFieldKey, string> = {
  hometown: "Quê quán",
  occupation: "Nghề nghiệp",
  address: "Nơi ở",
  tabooName: "Tên húy",
  education: "Học vấn",
  deathAnniversary: "Ngày giỗ",
  age: "Hưởng thọ",
  generation: "Đời thứ",
};

export const BAND_LABELS: Record<GenerationBandLabel, string> = {
  ordinal: "Đời n",
  ordinalName: "Đời thứ n",
  generation: "Thế hệ n",
};

export function bandLabelFor(style: GenerationBandLabel, generation: number) {
  switch (style) {
    case "ordinalName":
      return `ĐỜI THỨ ${generation}`;
    case "generation":
      return `THẾ HỆ ${generation}`;
    default:
      return `ĐỜI ${generation}`;
  }
}

