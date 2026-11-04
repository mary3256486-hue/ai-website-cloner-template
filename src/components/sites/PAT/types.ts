export type Gender = "male" | "female";

export type PaperSize = "A4" | "A3" | "A2" | "A1" | "A0";

export type DiagramTheme = "borderless" | "tree" | "generations" | "ink";

export type BackgroundPattern = "none" | "clouds" | "dragon" | "lotus" | "scroll" | "ornament";

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

export type LinkConfidence = "certain" | "probable" | "oral" | "unknown";

export const LINK_CONFIDENCE_LABELS: Record<LinkConfidence, string> = {
  certain: "Chắc chắn",
  probable: "Có thể",
  oral: "Truyền miệng",
  unknown: "Chưa rõ",
};

/** Tình trạng của một thành viên. `alive` cũ vẫn được giữ để đọc dữ liệu đã lưu. */
export type LifeStatus = "alive" | "deceased" | "missing" | "unknown";

export const LIFE_STATUS_LABELS: Record<LifeStatus, string> = {
  alive: "Còn sống",
  deceased: "Đã mất",
  missing: "Mất tích",
  unknown: "Chưa rõ",
};

export type SpouseRank = "chinh" | "ke" | "thu" | "khac";

export const SPOUSE_RANK_LABELS: Record<SpouseRank, string> = {
  chinh: "Chánh thất",
  ke: "Kế thất",
  thu: "Thứ thất",
  khac: "Khác",
};

export type CalendarKind = "duong" | "am" | "unknown";

export const CALENDAR_LABELS: Record<CalendarKind, string> = {
  duong: "Dương lịch",
  am: "Âm lịch",
  unknown: "Chưa rõ lịch",
};

export type ReferenceDocumentKind = "link" | "file" | "image" | "note";

export const REFERENCE_DOCUMENT_LABELS: Record<ReferenceDocumentKind, string> = {
  link: "Liên kết",
  file: "Tệp tài liệu",
  image: "Hình ảnh",
  note: "Ghi chú",
};

export interface ReferenceDocument {
  id: string;
  title: string;
  kind: ReferenceDocumentKind;
  url?: string;
  note?: string;
  addedAt: string;
}

export const FAMILY_TREE_SCHEMA_VERSION = 5;

/** Giá trị đời dành cho người chưa đủ dữ liệu để xác định đời. */
export const UNKNOWN_GENERATION = -999;

export function lifeStatusOf(person: Pick<Person, "alive" | "lifeStatus">): LifeStatus {
  return person.lifeStatus ?? (person.alive ? "alive" : "deceased");
}

export function lifeStatusLabel(person: Pick<Person, "alive" | "lifeStatus">): string {
  return LIFE_STATUS_LABELS[lifeStatusOf(person)];
}

export function isDeceasedStatus(status: LifeStatus): boolean {
  return status === "deceased" || status === "missing";
}

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
  showLinkGap: boolean;
  /** Thứ tự trình bày anh chị em trên phả đồ: 1→n hoặc n→1. */
  siblingOrder: "asc" | "desc";
  generationBandLabel: GenerationBandLabel;
  generationBandColor?: string;
  frameStyle: "none" | "wood" | "meander";
  frameScale: number;
  fontFamily: string;
  fontSize: number;
  lineCount: number;
  extraFields: ExtraFieldKey[];
  /** Độ đậm hoa văn nền (1 = mặc định, thấp hơn để tiết kiệm mực). */
  patternOpacity?: number;
  /** Cỡ hoa văn nền (1 = mặc định). */
  patternScale?: number;
  /** Phóng to/thu nhỏ toàn bộ thẻ thành viên (1 = mặc định). */
  cardScale?: number;
  generationStyles?: Record<string, GenerationStyle>;
  personStyles?: Record<string, PersonStyle>;
}

export interface CustomPaper {
  widthMm: number;
  heightMm: number;
  ratio: "1:1" | "3:2" | "custom";
}

export interface BannerSettings {
  enabled: boolean;
  src: string;
  width: number;
  text: string;
  textSize: number;
  textColor: string;
  textOffsetY: number;
  showDragons: boolean;
  dragonScale: number;
}

export interface BackgroundImageSettings {
  src: string;
  color: string;
  opacity: number;
  scale: number;
}

export interface Person {
  id: string;
  /** Mã thành viên, dùng làm khóa ổn định khi nhập/xuất và cập nhật từ Excel. */
  code?: string;
  name: string;
  gender: Gender;
  birthDate?: string;
  deathDate?: string;
  alive: boolean;
  /** Tình trạng đầy đủ: còn sống, đã mất, mất tích, chưa rõ. */
  lifeStatus?: LifeStatus;
  birthCalendar?: CalendarKind;
  deathCalendar?: CalendarKind;
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
  /** Đời nội bộ: 0 = Khởi Tổ, 1.. = các đời sau, -1.. = bậc tiền tổ (gần nhất = -1). */
  generation?: number;
  /** Thứ tự bậc tiền tổ: 1 = xa nhất, tăng dần về phía Khởi Tổ. */
  ancestorOrder?: number;
  /** Nối bậc tiền tổ này xuống bậc kế tiếp khi thiếu cha/mẹ ruột. */
  ancestorLinkId?: string;
  ancestorLinkRelation?: string;
  ancestorLinkGap?: number;
  ancestorLinkConfidence?: LinkConfidence;
  ancestorLinkNote?: string;
  /**
   * Hồ sơ tham khảo: thường là cha/mẹ của dâu/rể. Chỉ để tra cứu,
   * không hiện trên phả đồ và không tham gia tính đời của dòng họ.
   */
  reference?: boolean;
  /** Tên đang dùng là tên quy ước/tạm, chưa phải tên thật. */
  nameIsConventional?: boolean;
  /** Nguồn hoặc lý do tên đang dùng là tên quy ước. */
  nameNote?: string;
  fatherId?: string;
  motherId?: string;
  spouseIds: string[];
  /** Thứ bậc của từng người phối ngẫu, khóa theo id người phối ngẫu. */
  spouseRank?: Record<string, SpouseRank>;
  /** Thứ tự hiển thị vợ/chồng; nếu trống thì dùng thứ tự trong spouseIds. */
  spouseOrder?: string[];
  branchId?: string;
  hometown?: string;
  occupation?: string;
  maritalStatus?: string;
  biography?: string;
  deathAnniversary?: string;
  restingPlace?: string;
  graveAddress?: string;
  /** Liên kết bản đồ tới phần mộ. */
  graveMapUrl?: string;
  worshipPlace?: string;
  /** Liên kết bản đồ tới nhà thờ họ / nơi thờ tự. */
  worshipMapUrl?: string;
  phone?: string;
  address?: string;
  education?: string;
  avatar?: string;
  notes?: string;
}

export interface Branch {
  id: string;
  name: string;
  description?: string;
  headId?: string;
  color: string;
  /** Mã ngắn in kèm trên phả đồ, ví dụ C1, C2 (dùng được cả bản in đen trắng). */
  code?: string;
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
  /** Khoá vị trí để tránh kéo nhầm khi đang căn bố cục. */
  locked?: boolean;
}

export interface DesignSettings {
  paper: PaperSize;
  orientation: "portrait" | "landscape";
  autoRotate: boolean;
  theme: DiagramTheme;
  background: BackgroundPattern;
  backgroundImage?: BackgroundImageSettings | null;
  palette: PaletteName;
  showGenerationLabels: boolean;
  cardOrientation: CardOrientation | "auto";
  cardOrientations?: Record<string, CardOrientation>;
  showTitle: boolean;
  showName: boolean;
  showDates: boolean;
  showDeathAnniversary: boolean;
  showAvatar: boolean;
  borderStyle: "none" | "simple" | "ornate";
  banner?: BannerSettings;
  customPaper?: CustomPaper | null;
  /** Hiện thứ tự con (Con thứ n) trên thẻ thành viên. */
  showBirthOrder?: boolean;
  /** Hiện ký hiệu giới tính (♂/♀) trên thẻ thành viên. */
  showGenderSymbol?: boolean;
  /** Lề an toàn quanh bản in, tính bằng mm. */
  printSafeMarginMm?: number;
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
  /** Phiên bản mô hình dữ liệu, dùng để nâng cấp tệp sao lưu cũ. */
  schemaVersion?: number;
  /** Người duy nhất được đánh dấu là Khởi Tổ của dòng đang soạn. */
  founderId?: string;
  /** Kho tư liệu tham khảo của cả gia phả. */
  documents?: ReferenceDocument[];
  sample?: boolean;
  /** Năm hoàn thành in trên trang bìa và lời bạt; mặc định là năm hiện tại. */
  completedYear?: number;
  /** Nơi viết ghi trên lời tựa và lời bạt. */
  writtenPlace?: string;
  /** Cỡ chữ và giãn dòng nội dung phả ký khi in. */
  chronicleStyle?: { fontSize: number; lineHeight: number };
  /** Lời bạt tự soạn, đoạn cách nhau một dòng trống; để trống thì dùng mẫu mặc định. */
  colophon?: string;
  /** Ẩn trang lời bạt khi in; mặc định vẫn in. */
  showColophon?: boolean;
  /** Ngày ghi trên lời bạt: ngày in hay năm hoàn thành. */
  colophonDate?: "print" | "completed";
  /** Hoa văn chữ Hán trên trang bìa phả ký. */
  coverEmblem?: "none" | "jiapu" | "pham";
  /** Khổ giấy in phả ký. */
  chronicleFormat?: "a4" | "a5";
  /** Lề trang in phả ký (mm): trên · phải · dưới · trái; mặc định 25 · 20 · 25 · 25. */
  chronicleMargins?: { top: number; right: number; bottom: number; left: number };
  /** Tuỳ chỉnh các dòng chữ mẫu trong sách phả ký; để trống thì dùng mặc định. */
  chronicleTexts?: {
    coverEyebrow?: string;
    tocTitle?: string;
    prefaceEyebrow?: string;
    prefaceTitle?: string;
    originsEyebrow?: string;
    originsTitle?: string;
    colophonEyebrow?: string;
    colophonTitle?: string;
  };
  /** Chế độ riêng tư khi in và xuất dữ liệu. */
  privacy?: PrivacySettings;
  /** Thành viên đã xoá, giữ 30 ngày để hoàn tác. */
  trashMembers?: TrashedMember[];
  /** Chi phái đã xoá, giữ 30 ngày để hoàn tác. */
  trashBranches?: TrashedBranch[];
}

/** Riêng tư khi in/xuất: ẩn thông tin nhạy cảm của thành viên còn sống. */
export interface PrivacySettings {
  /** Ẩn ngày sinh và thông tin liên hệ của thành viên còn sống khi in phả đồ, phả ký và xuất CSV/Excel/GEDCOM. */
  hideLivingDetails?: boolean;
  /** Với thành viên đã khuất chỉ ghi năm mất, không ghi năm sinh. */
  deathYearOnly?: boolean;
}

/** Thành viên trong thùng rác: giữ nguyên hồ sơ kèm danh sách liên kết bị gỡ để khôi phục nguyên trạng. */
export interface TrashedMember {
  person: Person;
  deletedAt: string;
  /** Người từng liệt kê hồ sơ này trong spouseIds. */
  spouseOf: string[];
  /** Con có cha/mẹ là hồ sơ này. */
  children: string[];
  /** Người liên kết tiền tổ qua hồ sơ này. */
  ancestorLinks: string[];
  /** Người có spouseRank với hồ sơ này. */
  spouseRankOf: string[];
  /** Người có spouseOrder chứa hồ sơ này. */
  spouseOrderOf: string[];
  /** Chi phái do hồ sơ này làm trưởng chi. */
  branchHeadOf: string[];
  /** Hồ sơ từng là Khởi Tổ của dòng đang soạn. */
  wasFounder: boolean;
}

/** Chi phái trong thùng rác, kèm thành viên từng gắn chi để khôi phục nguyên trạng. */
export interface TrashedBranch {
  branch: Branch;
  deletedAt: string;
  /** Thành viên từng mang mã chi này. */
  memberIds: string[];
  /** Vị trí trong danh sách chi phái lúc xoá. */
  index: number;
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
  /** Dâu/rể của dòng họ, hiển thị cạnh người hôn phối. */
  inLaw?: boolean;
  /** Con của con gái: chỉ hiển thị một đời, không mở các đời tiếp theo. */
  maternal?: boolean;
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
  fromId?: string;
  toId?: string;
  indirect?: boolean;
  /** Nối xuống con của con gái (ngoại tộc, chỉ một đời). */
  maternal?: boolean;
  label?: string;
}

export interface TreeLayout {
  nodes: TreeNode[];
  edges: TreeEdge[];
  generations: { generation: number; count: number; y: number; label?: string; isAncestor?: boolean }[];
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

export const AUTO_VERTICAL_FROM = 16;

export function cardOrientationFor(
  design: Partial<DesignSettings> | null | undefined,
  generation: number,
  memberCount?: number,
): CardOrientation {
  const tuned = design?.tuning?.generationStyles?.[String(generation)]?.orientation;
  if (tuned) return tuned;
  const override = design?.cardOrientations?.[String(generation)];
  if (override) return override;
  const choice = design?.cardOrientation;
  if (choice === "vertical" || choice === "horizontal") return choice;
  return (memberCount ?? 0) >= AUTO_VERTICAL_FROM ? "vertical" : "horizontal";
}

export function cardDimsFor(
  design: Partial<DesignSettings> | null | undefined,
  generation: number,
  memberCount?: number,
  scale = 1,
) {
  const base =
    cardOrientationFor(design, generation, memberCount) === "vertical"
      ? { width: CARD_VERTICAL_W, height: CARD_VERTICAL_H }
      : { width: CARD_W, height: CARD_H };
  const factor = Number.isFinite(scale) && scale > 0 ? scale : 1;
  return { width: Math.round(base.width * factor), height: Math.round(base.height * factor) };
}

export const ANCESTOR_TITLES = [
  "Đại tổ",
  "Thượng tổ",
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

export const DEFAULT_BANNER: BannerSettings = {
  enabled: true,
  src: "/sites/PAT/decor/user/hoanh-phi.png",
  width: 760,
  text: "GIA PHẢ",
  textSize: 34,
  textColor: "#f7e3b5",
  textOffsetY: 0,
  showDragons: true,
  dragonScale: 1,
};

export const DEFAULT_DESIGN: DesignSettings = {
  paper: "A0",
  orientation: "portrait",
  autoRotate: true,
  theme: "tree",
  background: "clouds",
  backgroundImage: {
    src: "/sites/PAT/decor/user/hoa-van-01.png",
    color: "#c9a227",
    opacity: 0.16,
    scale: 0.72,
  },
  palette: "classic",
  showGenerationLabels: true,
  cardOrientation: "auto",
  showTitle: true,
  showName: true,
  showDates: true,
  showDeathAnniversary: false,
  showAvatar: true,
  borderStyle: "ornate",
  banner: DEFAULT_BANNER,
  showBirthOrder: false,
  showGenderSymbol: false,
  printSafeMarginMm: 10,
};

export function normalizeBanner(banner?: Partial<BannerSettings> | null): BannerSettings {
  return {
    ...DEFAULT_BANNER,
    ...banner,
    src: banner?.src || DEFAULT_BANNER.src,
    width: clampNumber(banner?.width, DEFAULT_BANNER.width, 400, 2200),
    textSize: clampNumber(banner?.textSize, DEFAULT_BANNER.textSize, 12, 90),
    textOffsetY: clampNumber(banner?.textOffsetY, 0, -120, 120),
    dragonScale: clampNumber(banner?.dragonScale, DEFAULT_BANNER.dragonScale, 0.6, 1.8),
  };
}

export function normalizeBackgroundImage(
  backgroundImage?: Partial<BackgroundImageSettings> | null,
): BackgroundImageSettings {
  const fallback = DEFAULT_DESIGN.backgroundImage ?? {
    src: "/sites/PAT/decor/user/hoa-van-01.png",
    color: "#c9a227",
    opacity: 0.16,
    scale: 0.72,
  };
  return {
    src: backgroundImage?.src || fallback.src,
    color: backgroundImage?.color || fallback.color,
    opacity: clampNumber(backgroundImage?.opacity, fallback.opacity, 0.03, 0.6),
    scale: clampNumber(backgroundImage?.scale, fallback.scale, 0.2, 1.2),
  };
}

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
  showLinkGap: false,
  siblingOrder: "asc",
  generationBandLabel: "ordinal",
  generationBandColor: "",
  frameStyle: "none",
  frameScale: 1,
  fontFamily: "'Be Vietnam Pro', sans-serif",
  fontSize: 10.5,
  lineCount: 2,
  extraFields: [],
  patternOpacity: 1,
  patternScale: 1,
  cardScale: 1,
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
    showLinkGap: tuning?.showLinkGap ?? DEFAULT_TUNING.showLinkGap,
    siblingOrder: tuning?.siblingOrder === "desc" ? "desc" : "asc",
    frameScale: clampNumber(tuning?.frameScale, DEFAULT_TUNING.frameScale, 0.5, 2),
    fontSize: clampNumber(tuning?.fontSize, DEFAULT_TUNING.fontSize, 7, 24),
    lineCount: Math.round(clampNumber(tuning?.lineCount, DEFAULT_TUNING.lineCount, 1, 5)),
    extraFields: Array.isArray(tuning?.extraFields) ? tuning.extraFields : [],
    patternOpacity: clampNumber(tuning?.patternOpacity, DEFAULT_TUNING.patternOpacity ?? 1, 0.2, 2),
    patternScale: clampNumber(tuning?.patternScale, DEFAULT_TUNING.patternScale ?? 1, 0.5, 2.5),
    cardScale: clampNumber(tuning?.cardScale, DEFAULT_TUNING.cardScale ?? 1, 0.7, 1.5),
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

export function ancestorLabelFor(style: GenerationBandLabel, tier: number) {
  switch (style) {
    case "ordinalName":
      return `TIỀN TỔ THỨ ${tier}`;
    case "generation":
      return `BẬC TIỀN TỔ ${tier}`;
    default:
      return `TIỀN TỔ ${tier}`;
  }
}

/** Nhãn ngắn dùng trong danh sách, huy hiệu và biểu mẫu. */
export function generationTag(generation: number): string {
  if (generation === UNKNOWN_GENERATION) return "Chưa xác định đời";
  return generation < 0 ? `Tiền tổ ${-generation}` : `Đời ${generation}`;
}

