import type { Branch, FamilyTree, Gender, LinkConfidence, Person } from "./types";
import { DEFAULT_DESIGN } from "./types";

export const SAMPLE_HOMETOWN = "Hà Nội";

interface SeedPerson {
  id: string;
  name: string;
  gender: Gender;
  birth?: string;
  death?: string;
  alive?: boolean;
  father?: string;
  mother?: string;
  spouses?: string[];
  order: number;
  title?: string;
  generation?: number;
  ancestorOrder?: number;
  generationNote?: string;
  linkToId?: string;
  linkRelation?: string;
  linkGap?: number;
  linkConfidence?: LinkConfidence;
  linkNote?: string;
  occupation?: string;
  hometown?: string;
  address?: string;
  worshipPlace?: string;
  graveAddress?: string;
  biography?: string;
  note?: string;
}

const seedPeople: SeedPerson[] = [
  {
    id: "t01",
    name: "Phạm Đại Tổ",
    gender: "male",
    order: 1,
    ancestorOrder: 1,
    title: "Đại Tổ",
    hometown: "Bắc Ninh",
    address: "Bắc Ninh",
    note: "Người được xác định có liên quan đến dòng họ, được lựa chọn làm Đại Tổ.",
  },
  {
    id: "t02",
    name: "Phạm Thủy Tổ",
    gender: "male",
    order: 1,
    ancestorOrder: 2,
    title: "Thủy Tổ",
    linkToId: "t01",
    linkRelation: "hậu duệ",
    linkGap: 1,
    linkConfidence: "oral",
    linkNote: "Chỉ xác định được là hậu duệ của Đại Tổ, chưa rõ các đời nối tiếp.",
    hometown: "Bắc Ninh",
    address: "Bắc Ninh",
    worshipPlace: "Từ đường chính dòng họ",
    graveAddress: `Nghĩa trang dòng họ, ${SAMPLE_HOMETOWN}`,
    biography:
      "Theo truyền thuyết dòng họ, cụ là người khai cơ lập nghiệp, vốn tính hiếu học, mở lớp dạy chữ cho trẻ trong vùng và được dân làng kính trọng, tôn làm Thủy tổ của dòng họ.",
  },
  {
    id: "p00",
    name: "Phạm Khởi Tổ",
    gender: "male",
    order: 1,
    generation: 0,
    title: "Khởi Tổ",
    generationNote: "Cháu đời thứ 2 của Thủy Tổ",
    linkToId: "t02",
    linkRelation: "cháu đời thứ 2",
    linkGap: 2,
    linkConfidence: "oral",
    linkNote:
      "Khi lập phả chỉ biết tên Thủy Tổ, không xác định được thành viên các đời trước. Đây là đời đầu tiên nối liền mạch với các đời sau.",
    hometown: "Bắc Ninh",
    address: "Bắc Ninh",
    spouses: ["p00s1"],
  },
  {
    id: "p00s1",
    name: "Trịnh Phu Nhân",
    gender: "female",
    order: 1,
    generation: 0,
    title: "Vợ Khởi Tổ",
    spouses: ["p00"],
    address: "Hà Nội",
  },
  {
    id: "p01",
    name: "Phạm Quý Công",
    gender: "male",
    birth: "1850",
    death: "1920",
    order: 1,
    father: "p00",
    mother: "p00s1",
    spouses: ["p02", "p03"],
  },
  { id: "p02", name: "Bùi Thị 1", gender: "female", birth: "1855", death: "1930", order: 1, spouses: ["p01"] },
  { id: "p03", name: "Phùng Thị 2", gender: "female", birth: "1860", death: "1945", order: 2, spouses: ["p01"] },
  { id: "p04", name: "Phạm Văn 1", gender: "male", birth: "1886", death: "1960", order: 1, generationNote: "Đích tôn chi trưởng", father: "p01", mother: "p02", spouses: ["p05"] },
  { id: "p05", name: "Trần Thị 1", gender: "female", birth: "1890", death: "1975", order: 1, spouses: ["p04"] },
  { id: "p06", name: "Phạm Văn 2", gender: "male", birth: "1890", death: "1968", order: 2, generationNote: "Thứ nam", father: "p01", mother: "p02", spouses: ["p07"] },
  { id: "p07", name: "Hồ Thị 2", gender: "female", birth: "1895", death: "1980", order: 1, spouses: ["p06"] },
  { id: "p08", name: "Phạm Văn 3", gender: "male", birth: "1895", death: "1971", order: 3, generationNote: "Thứ nam", father: "p01", mother: "p02", spouses: ["p09"] },
  { id: "p09", name: "Từ Thị 3", gender: "female", birth: "1900", death: "1988", order: 1, spouses: ["p08"] },
  { id: "p10", name: "Phạm Thị 1", gender: "female", birth: "1902", death: "1990", order: 4, generationNote: "Trưởng nữ", father: "p01", mother: "p03", spouses: ["p11"] },
  { id: "p11", name: "Nguyễn Văn 1", gender: "male", birth: "1898", death: "1985", order: 1, spouses: ["p10"] },

  { id: "p12", name: "Phạm Văn 4", gender: "male", birth: "1915", death: "1990", order: 1, father: "p04", mother: "p05", spouses: ["p13"], occupation: "Cán bộ nhà nước" },
  { id: "p13", name: "Dương Thị 4", gender: "female", birth: "1920", death: "2005", order: 1, spouses: ["p12"] },
  { id: "p14", name: "Phạm Thị 2", gender: "female", birth: "1920", death: "2001", order: 2, father: "p04", mother: "p05", spouses: ["p15"] },
  { id: "p15", name: "Trần Văn 2", gender: "male", birth: "1918", death: "1995", order: 1, spouses: ["p14"] },
  { id: "p16", name: "Phạm Văn 5", gender: "male", birth: "1925", death: "2010", order: 3, father: "p04", mother: "p05", spouses: ["p17"], occupation: "Kỹ sư" },
  { id: "p17", name: "Trịnh Thị 5", gender: "female", birth: "1930", death: "2018", order: 1, spouses: ["p16"] },
  { id: "p18", name: "Phạm Văn 6", gender: "male", birth: "1922", death: "2000", order: 1, father: "p06", mother: "p07", spouses: ["p19"], occupation: "Bộ đội" },
  { id: "p19", name: "Lâm Thị 6", gender: "female", birth: "1925", death: "2012", order: 1, spouses: ["p18"] },
  { id: "p20", name: "Phạm Thị 3", gender: "female", birth: "1928", death: "2015", order: 2, father: "p06", mother: "p07", spouses: ["p21"] },
  { id: "p21", name: "Lê Văn 3", gender: "male", birth: "1926", death: "2008", order: 1, spouses: ["p20"] },
  { id: "p22", name: "Phạm Văn 7", gender: "male", birth: "1935", death: "2018", order: 3, father: "p06", mother: "p07", spouses: ["p23"], occupation: "Thợ cơ khí" },
  { id: "p23", name: "Đỗ Thị 7", gender: "female", birth: "1938", death: "2020", order: 1, spouses: ["p22"] },
  { id: "p24", name: "Phạm Văn 8", gender: "male", birth: "1930", death: "2005", order: 1, father: "p08", mother: "p09", spouses: ["p25"], occupation: "Bác sĩ" },
  { id: "p25", name: "Tô Thị 8", gender: "female", birth: "1932", death: "2020", order: 1, spouses: ["p24"] },
  { id: "p26", name: "Phạm Văn 9", gender: "male", birth: "1938", death: "2020", order: 2, father: "p08", mother: "p09", spouses: ["p27"], occupation: "Kinh doanh" },
  { id: "p27", name: "Đoàn Thị 9", gender: "female", birth: "1940", death: "2022", order: 1, spouses: ["p26"] },
  { id: "p28", name: "Phạm Thị 4", gender: "female", birth: "1942", alive: true, order: 3, father: "p08", mother: "p09", spouses: ["p29"] },
  { id: "p29", name: "Trịnh Văn 4", gender: "male", birth: "1940", death: "2015", order: 1, spouses: ["p28"] },
  { id: "p30", name: "Phạm Thị 5", gender: "female", birth: "1928", death: "2010", order: 1, father: "p11", mother: "p10", spouses: ["p31"] },
  { id: "p31", name: "Đỗ Văn 5", gender: "male", birth: "1925", death: "2000", order: 1, spouses: ["p30"] },

  { id: "p32", name: "Phạm Văn 10", gender: "male", birth: "1948", alive: true, order: 1, father: "p12", mother: "p13", spouses: ["p33"], occupation: "Giáo viên" },
  { id: "p33", name: "Lưu Thị 10", gender: "female", birth: "1950", alive: true, order: 1, spouses: ["p32"] },
  { id: "p34", name: "Phạm Thị 6", gender: "female", birth: "1952", alive: true, order: 2, father: "p12", mother: "p13", spouses: ["p35"] },
  { id: "p35", name: "Đặng Văn 6", gender: "male", birth: "1950", alive: true, order: 1, spouses: ["p34"] },
  { id: "p36", name: "Phạm Văn 11", gender: "male", birth: "1958", alive: true, order: 3, father: "p12", mother: "p13", spouses: ["p37"], occupation: "Kỹ sư xây dựng" },
  { id: "p37", name: "Cao Thị 11", gender: "female", birth: "1960", alive: true, order: 1, spouses: ["p36"] },
  { id: "p38", name: "Phạm Thị 7", gender: "female", birth: "1950", alive: true, order: 1, father: "p15", mother: "p14", spouses: ["p39"] },
  { id: "p39", name: "Vũ Văn 7", gender: "male", birth: "1948", alive: true, order: 1, spouses: ["p38"] },
  { id: "p40", name: "Phạm Văn 12", gender: "male", birth: "1955", alive: true, order: 2, father: "p15", mother: "p14", spouses: ["p41"] },
  { id: "p41", name: "Bùi Thị 12", gender: "female", birth: "1958", alive: true, order: 1, spouses: ["p40"] },
  { id: "p42", name: "Phạm Văn 13", gender: "male", birth: "1950", alive: true, order: 1, father: "p16", mother: "p17", spouses: ["p43"], occupation: "Doanh nhân" },
  { id: "p43", name: "Phùng Thị 13", gender: "female", birth: "1955", alive: true, order: 1, spouses: ["p42"] },
  { id: "p44", name: "Phạm Thị 8", gender: "female", birth: "1960", alive: true, order: 2, father: "p16", mother: "p17" },
  { id: "p45", name: "Phạm Văn 14", gender: "male", birth: "1955", death: "2022", order: 1, father: "p18", mother: "p19", spouses: ["p46"], occupation: "Bộ đội" },
  { id: "p46", name: "Hồ Thị 14", gender: "female", birth: "1958", alive: true, order: 1, spouses: ["p45"] },
  { id: "p47", name: "Phạm Thị 9", gender: "female", birth: "1960", alive: true, order: 2, father: "p18", mother: "p19", spouses: ["p48"] },
  { id: "p48", name: "Bùi Văn 8", gender: "male", birth: "1956", alive: true, order: 1, spouses: ["p47"] },
  { id: "p49", name: "Phạm Văn 15", gender: "male", birth: "1958", alive: true, order: 1, father: "p21", mother: "p20", spouses: ["p50"] },
  { id: "p50", name: "Lê Thị 15", gender: "female", birth: "1960", alive: true, order: 1, spouses: ["p49"] },
  { id: "p51", name: "Phạm Văn 16", gender: "male", birth: "1965", alive: true, order: 1, father: "p22", mother: "p23", spouses: ["p52"], occupation: "Kinh doanh" },
  { id: "p52", name: "Dương Thị 16", gender: "female", birth: "1968", alive: true, order: 1, spouses: ["p51"] },
  { id: "p53", name: "Phạm Văn 17", gender: "male", birth: "1962", alive: true, order: 1, father: "p24", mother: "p25", spouses: ["p54"], occupation: "Bác sĩ" },
  { id: "p54", name: "Vương Thị 17", gender: "female", birth: "1965", alive: true, order: 1, spouses: ["p53"] },
  { id: "p55", name: "Phạm Thị 10", gender: "female", birth: "1968", alive: true, order: 2, father: "p24", mother: "p25" },
  { id: "p56", name: "Phạm Văn 18", gender: "male", birth: "1968", alive: true, order: 1, father: "p26", mother: "p27", spouses: ["p57"], occupation: "Giáo viên" },
  { id: "p57", name: "Lâm Thị 18", gender: "female", birth: "1970", alive: true, order: 1, spouses: ["p56"] },
  { id: "p58", name: "Phạm Văn 19", gender: "male", birth: "1965", alive: true, order: 1, father: "p29", mother: "p28", spouses: ["p59"], occupation: "Kỹ sư" },
  { id: "p59", name: "Ngô Thị 19", gender: "female", birth: "1968", alive: true, order: 1, spouses: ["p58"] },
  { id: "p60", name: "Phạm Văn 20", gender: "male", birth: "1952", alive: true, order: 1, father: "p31", mother: "p30", spouses: ["p61"], occupation: "Thợ điện" },
  { id: "p61", name: "Đỗ Thị 20", gender: "female", birth: "1955", alive: true, order: 1, spouses: ["p60"] },
  { id: "p62", name: "Phạm Thị 11", gender: "female", birth: "1958", alive: true, order: 2, father: "p31", mother: "p30" },
];

function buildPeople(): Person[] {
  const map = new Map<string, Person>();
  for (const s of seedPeople) {
    map.set(s.id, {
      id: s.id,
      name: s.name,
      gender: s.gender,
      birthDate: s.birth,
      deathDate: s.death,
      alive: s.alive ?? false,
      title: s.title,
      generation: s.generation,
      ancestorOrder: s.ancestorOrder,
      generationNote: s.generationNote,
      linkToId: s.linkToId,
      linkRelation: s.linkRelation,
      linkGap: s.linkGap,
      linkConfidence: s.linkConfidence,
      linkNote: s.linkNote,
      nameIsConventional: true,
      birthOrder: s.order,
      fatherId: s.father,
      motherId: s.mother,
      spouseIds: [],
      hometown: s.hometown ?? SAMPLE_HOMETOWN,
      occupation: s.occupation ?? "Không có",
      maritalStatus: s.spouses?.length ? "Đã kết hôn" : "Không có",
      worshipPlace: s.worshipPlace,
      graveAddress: s.graveAddress,
      address: s.address ?? SAMPLE_HOMETOWN,
      biography: s.biography,
      notes: s.note,
      photos: [],
    });
  }
  for (const s of seedPeople) {
    for (const spouseId of s.spouses ?? []) {
      const person = map.get(s.id);
      const spouse = map.get(spouseId);
      if (!person || !spouse) continue;
      if (!person.spouseIds.includes(spouseId)) person.spouseIds.push(spouseId);
      if (!spouse.spouseIds.includes(s.id)) spouse.spouseIds.push(s.id);
    }
  }
  return Array.from(map.values());
}

function assignBranches(people: Person[], branches: Branch[]): void {
  const byId = new Map(people.map((p) => [p.id, p]));
  const bloodline = new Set<string>();
  for (const p of people) {
    if ((p.fatherId && byId.has(p.fatherId)) || (p.motherId && byId.has(p.motherId))) bloodline.add(p.id);
    if (p.linkToId && byId.has(p.linkToId)) bloodline.add(p.id);
  }
  const lineParent = (p: Person): string | undefined => {
    if (p.fatherId && bloodline.has(p.fatherId)) return p.fatherId;
    if (p.motherId && bloodline.has(p.motherId)) return p.motherId;
    if (p.linkToId && bloodline.has(p.linkToId)) return p.linkToId;
    return p.fatherId ?? p.motherId;
  };
  const childrenBy = new Map<string, Person[]>();
  for (const p of people) {
    const parent = lineParent(p);
    if (!parent) continue;
    const list = childrenBy.get(parent) ?? [];
    list.push(p);
    childrenBy.set(parent, list);
  }

  for (const branch of branches) {
    if (!branch.headId) continue;
    const queue = [branch.headId];
    const seen = new Set<string>();
    while (queue.length) {
      const id = queue.shift();
      if (!id || seen.has(id)) continue;
      seen.add(id);
      const person = byId.get(id);
      if (!person) continue;
      person.branchId = branch.id;
      for (const spouseId of person.spouseIds) {
        const spouse = byId.get(spouseId);
        if (spouse && !spouse.branchId) spouse.branchId = branch.id;
      }
      for (const child of childrenBy.get(id) ?? []) queue.push(child.id);
    }
  }
}

export function createDemoTree(): FamilyTree {
  const members = buildPeople();
  const nameOf = (id: string | undefined) => members.find((m) => m.id === id)?.name ?? "";
  const branches: Branch[] = [
    { id: "b1", name: "Chi trưởng", description: `Dòng trưởng, con cháu cụ ${nameOf("p04")}`, headId: "p04", color: "#8a1c15" },
    { id: "b2", name: "Chi thứ", description: `Con cháu cụ ${nameOf("p06")}`, headId: "p06", color: "#b7791f" },
    { id: "b3", name: "Chi ba", description: `Con cháu cụ ${nameOf("p08")}`, headId: "p08", color: "#2f6f5e" },
    { id: "b4", name: "Chi tư", description: `Con cháu cụ ${nameOf("p10")}`, headId: "p10", color: "#6b4c9a" },
  ];
  assignBranches(members, branches);
  const now = new Date().toISOString();
  return {
    id: "mau-gia-pha",
    name: "MẪU GIA PHẢ",
    address: SAMPLE_HOMETOWN,
    description:
      "Gia phả mẫu gồm 2 bậc tiền tổ và 5 đời (Đời 0–4), minh hoạ cách ghi chép thành viên, quan hệ vợ chồng, con cái, các nhánh trong dòng họ và liên kết khi thiếu thông tin các đời trước.",
    ownerName: "Quản trị viên",
    createdAt: now,
    updatedAt: now,
    members,
    branches,
    history:
      "Dòng họ Phạm vốn gốc ở Bắc Ninh. Cụ Đại Tổ là người được dòng họ lựa chọn ghi nhận ở bậc tiền tổ xa nhất; cụ Thủy Tổ được xác định là hậu duệ của Đại Tổ và là người khai cơ lập nghiệp.\n\n" +
      "Khi lập phả chỉ còn biết tên Thủy Tổ, không xác định được các đời nối tiếp, nên cụ Khởi Tổ được ghi là cháu đời thứ 2 của Thủy Tổ và là đời đầu tiên nối liền mạch với các đời sau. Từ Đời 1 trở đi, con cháu dòng họ giữ nếp gia phong hiếu học, cần kiệm; nhiều người thành đạt trong giáo dục, y tế, kỹ thuật và kinh doanh.\n\n" +
      "Gia phả này được số hoá để con cháu muôn đời ghi nhớ cội nguồn.",
    design: { ...DEFAULT_DESIGN },
    positions: {},
    decorations: [],
    sample: true,
  };
}
