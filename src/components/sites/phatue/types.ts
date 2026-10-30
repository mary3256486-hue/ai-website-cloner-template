export type Gender = "male" | "female";

export type PaperSize = "A4" | "A3" | "A2" | "A1" | "A0";

export type DiagramTheme = "borderless" | "tree" | "generations";

export type BackgroundPattern = "none" | "clouds" | "dragon" | "lotus" | "scroll";

export type PaletteName = "classic" | "gold" | "ink" | "jade";

export interface Person {
  id: string;
  name: string;
  gender: Gender;
  birthDate?: string;
  deathDate?: string;
  alive: boolean;
  title?: string;
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
  showDates: boolean;
  showAvatar: boolean;
  borderStyle: "none" | "simple" | "ornate";
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
}

export interface TreeLayout {
  nodes: TreeNode[];
  edges: TreeEdge[];
  generations: { generation: number; count: number; y: number }[];
  width: number;
  height: number;
}

export const CARD_W = 168;
export const CARD_H = 66;
export const SPOUSE_GAP = 12;
export const UNIT_GAP = 26;
export const ROW_GAP = 58;
export const PADDING = 48;

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
  showDates: true,
  showAvatar: true,
  borderStyle: "ornate",
};
