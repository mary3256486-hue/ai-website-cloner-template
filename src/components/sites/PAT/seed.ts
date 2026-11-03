import type { Branch, FamilyTree, Gender, LinkConfidence, Person } from "./types";
import { DEFAULT_DESIGN } from "./types";
import { classifyClan } from "./clan";

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
  ancestorLinkId?: string;
  ancestorLinkRelation?: string;
  ancestorLinkGap?: number;
  ancestorLinkConfidence?: LinkConfidence;
  ancestorLinkNote?: string;
  reference?: boolean;
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
    name: "Phạm Văn Đạo",
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
    name: "Phạm Văn Huấn",
    gender: "male",
    order: 1,
    ancestorOrder: 2,
    title: "Thủy Tổ",
    ancestorLinkId: "t01",
    ancestorLinkRelation: "hậu duệ",
    ancestorLinkGap: 1,
    ancestorLinkConfidence: "oral",
    ancestorLinkNote: "Chỉ xác định được là hậu duệ của Đại Tổ, chưa rõ các đời nối tiếp.",
    hometown: "Bắc Ninh",
    address: "Bắc Ninh",
    worshipPlace: "Từ đường chính dòng họ",
    graveAddress: `Nghĩa trang dòng họ, ${SAMPLE_HOMETOWN}`,
    biography:
      "Theo truyền thuyết dòng họ, cụ là người khai cơ lập nghiệp, vốn tính hiếu học, mở lớp dạy chữ cho trẻ trong vùng và được dân làng kính trọng, tôn làm Thủy tổ của dòng họ.",
  },
  {
    id: "p00",
    name: "Phạm Văn Lập",
    gender: "male",
    order: 1,
    generation: 0,
    title: "Khởi Tổ",
    generationNote: "Cháu đời thứ 2 của Thủy Tổ",
    ancestorLinkId: "t02",
    ancestorLinkRelation: "cháu đời thứ 2",
    ancestorLinkGap: 2,
    ancestorLinkConfidence: "oral",
    ancestorLinkNote:
      "Khi lập phả chỉ biết tên Thủy Tổ, không xác định được thành viên các đời trước. Đây là đời đầu tiên nối liền mạch với các đời sau.",
    hometown: "Bắc Ninh",
    address: "Bắc Ninh",
    spouses: ["p00s1"],
  },
  {
    id: "p00s1",
    name: "Trịnh Thị Hạnh",
    gender: "female",
    order: 1,
    generation: 0,
    title: "Vợ Khởi Tổ",
    spouses: ["p00"],
    address: "Hà Nội",
  },
  {
    id: "p01",
    name: "Phạm Văn Cảnh",
    gender: "male",
    birth: "1850",
    death: "1920",
    order: 1,
    father: "p00",
    mother: "p00s1",
    spouses: ["p02", "p03"],
  },
  { id: "p02", name: "Bùi Thị Nụ", gender: "female", birth: "1855", death: "1930", order: 1, father: "r01", mother: "r02", spouses: ["p01"] },
  { id: "p03", name: "Phùng Thị Mơ", gender: "female", birth: "1860", death: "1945", order: 2, spouses: ["p01"] },
  { id: "p04", name: "Phạm Văn Trọng", gender: "male", birth: "1886", death: "1960", order: 1, generationNote: "Đích tôn chi trưởng", father: "p01", mother: "p02", spouses: ["p05"] },
  { id: "p05", name: "Trần Thị Khuê", gender: "female", birth: "1890", death: "1975", order: 1, spouses: ["p04"] },
  { id: "p06", name: "Phạm Văn Sâm", gender: "male", birth: "1890", death: "1968", order: 2, generationNote: "Thứ nam", father: "p01", mother: "p02", spouses: ["p07"] },
  { id: "p07", name: "Hồ Thị Lụa", gender: "female", birth: "1895", death: "1980", order: 1, spouses: ["p06"] },
  { id: "p08", name: "Phạm Văn Thao", gender: "male", birth: "1895", death: "1971", order: 3, generationNote: "Thứ nam", father: "p01", mother: "p02", spouses: ["p09"] },
  { id: "p09", name: "Từ Thị Rạng", gender: "female", birth: "1900", death: "1988", order: 1, spouses: ["p08"] },
  { id: "p10", name: "Phạm Thị Nguyệt", gender: "female", birth: "1902", death: "1990", order: 4, generationNote: "Trưởng nữ", father: "p01", mother: "p03", spouses: ["p11"] },
  { id: "p11", name: "Nguyễn Văn Tấn", gender: "male", birth: "1898", death: "1985", order: 1, spouses: ["p10"] },

  { id: "p12", name: "Phạm Văn Kỳ", gender: "male", birth: "1915", death: "1990", order: 1, father: "p04", mother: "p05", spouses: ["p13"], occupation: "Cán bộ nhà nước" },
  { id: "p13", name: "Dương Thị Bích", gender: "female", birth: "1920", death: "2005", order: 1, spouses: ["p12"] },
  { id: "p14", name: "Phạm Thị Thu", gender: "female", birth: "1920", death: "2001", order: 2, father: "p04", mother: "p05", spouses: ["p15"] },
  { id: "p15", name: "Trần Văn Đắc", gender: "male", birth: "1918", death: "1995", order: 1, spouses: ["p14"] },
  { id: "p16", name: "Phạm Văn Sơn", gender: "male", birth: "1925", death: "2010", order: 3, father: "p04", mother: "p05", spouses: ["p17"], occupation: "Kỹ sư" },
  { id: "p17", name: "Trịnh Thị Lệ", gender: "female", birth: "1930", death: "2018", order: 1, spouses: ["p16"] },
  { id: "p18", name: "Phạm Văn Cường", gender: "male", birth: "1922", death: "2000", order: 1, father: "p06", mother: "p07", spouses: ["p19"], occupation: "Bộ đội" },
  { id: "p19", name: "Lâm Thị Hoa", gender: "female", birth: "1925", death: "2012", order: 1, spouses: ["p18"] },
  { id: "p20", name: "Phạm Thị Mai", gender: "female", birth: "1928", death: "2015", order: 2, father: "p06", mother: "p07", spouses: ["p21"] },
  { id: "p21", name: "Lê Văn Phúc", gender: "male", birth: "1926", death: "2008", order: 1, spouses: ["p20"] },
  { id: "p22", name: "Phạm Văn Tùng", gender: "male", birth: "1935", death: "2018", order: 3, father: "p06", mother: "p07", spouses: ["p23"], occupation: "Thợ cơ khí" },
  { id: "p23", name: "Đỗ Thị Yến", gender: "female", birth: "1938", death: "2020", order: 1, spouses: ["p22"] },
  { id: "p24", name: "Phạm Văn Hưng", gender: "male", birth: "1930", death: "2005", order: 1, father: "p08", mother: "p09", spouses: ["p25"], occupation: "Bác sĩ" },
  { id: "p25", name: "Tô Thị Cẩm", gender: "female", birth: "1932", death: "2020", order: 1, spouses: ["p24"] },
  { id: "p26", name: "Phạm Văn Phong", gender: "male", birth: "1938", death: "2020", order: 2, father: "p08", mother: "p09", spouses: ["p27"], occupation: "Kinh doanh" },
  { id: "p27", name: "Đoàn Thị Thắm", gender: "female", birth: "1940", death: "2022", order: 1, spouses: ["p26"] },
  { id: "p28", name: "Phạm Thị Hồng", gender: "female", birth: "1942", alive: true, order: 3, father: "p08", mother: "p09", spouses: ["p29"] },
  { id: "p29", name: "Trịnh Văn Bắc", gender: "male", birth: "1940", death: "2015", order: 1, spouses: ["p28"] },
  // Con của con gái dòng họ (ngoại tộc) ghi theo họ cha; chỉ hiển thị một đời (n+1).
  { id: "p30", name: "Nguyễn Thị Lan", gender: "female", birth: "1928", death: "2010", order: 1, father: "p11", mother: "p10", note: "Con của cụ Phạm Thị Nguyệt, theo họ cha (Nguyễn Văn Tấn); ngoại tộc, chỉ ghi một đời." },

  { id: "p32", name: "Phạm Văn Minh", gender: "male", birth: "1948", alive: true, order: 1, father: "p12", mother: "p13", spouses: ["p33"], occupation: "Giáo viên" },
  { id: "p33", name: "Lưu Thị Hà", gender: "female", birth: "1950", alive: true, order: 1, spouses: ["p32"] },
  { id: "p34", name: "Phạm Thị Nga", gender: "female", birth: "1952", alive: true, order: 2, father: "p12", mother: "p13", spouses: ["p35"] },
  { id: "p35", name: "Đặng Văn Tú", gender: "male", birth: "1950", alive: true, order: 1, spouses: ["p34"] },
  { id: "p36", name: "Phạm Văn Kiên", gender: "male", birth: "1958", alive: true, order: 3, father: "p12", mother: "p13", spouses: ["p37"], occupation: "Kỹ sư xây dựng" },
  { id: "p37", name: "Cao Thị Phương", gender: "female", birth: "1960", alive: true, order: 1, spouses: ["p36"] },
  { id: "p38", name: "Trần Thị Linh", gender: "female", birth: "1950", alive: true, order: 1, father: "p15", mother: "p14", note: "Con của cụ Phạm Thị Thu, theo họ cha (Trần Văn Đắc); ngoại tộc, chỉ ghi một đời." },
  { id: "p40", name: "Trần Văn Tuấn", gender: "male", birth: "1955", alive: true, order: 2, father: "p15", mother: "p14", note: "Con của cụ Phạm Thị Thu, theo họ cha (Trần Văn Đắc); ngoại tộc, chỉ ghi một đời." },
  { id: "p42", name: "Phạm Văn Duy", gender: "male", birth: "1950", alive: true, order: 1, father: "p16", mother: "p17", spouses: ["p43"], occupation: "Doanh nhân" },
  { id: "p43", name: "Phùng Thị Trang", gender: "female", birth: "1955", alive: true, order: 1, spouses: ["p42"] },
  { id: "p44", name: "Phạm Thị Quỳnh", gender: "female", birth: "1960", alive: true, order: 2, father: "p16", mother: "p17" },
  { id: "p45", name: "Phạm Văn Hùng", gender: "male", birth: "1955", death: "2022", order: 1, father: "p18", mother: "p19", spouses: ["p46"], occupation: "Bộ đội" },
  { id: "p46", name: "Hồ Thị Nhung", gender: "female", birth: "1958", alive: true, order: 1, spouses: ["p45"] },
  { id: "p47", name: "Phạm Thị Hương", gender: "female", birth: "1960", alive: true, order: 2, father: "p18", mother: "p19", spouses: ["p48"] },
  { id: "p48", name: "Bùi Văn Thịnh", gender: "male", birth: "1956", alive: true, order: 1, spouses: ["p47"] },
  { id: "p49", name: "Lê Văn Đức", gender: "male", birth: "1958", alive: true, order: 1, father: "p21", mother: "p20", note: "Con của cụ Phạm Thị Mai, theo họ cha (Lê Văn Phúc); ngoại tộc, chỉ ghi một đời." },
  { id: "p51", name: "Phạm Văn Khánh", gender: "male", birth: "1965", alive: true, order: 1, father: "p22", mother: "p23", spouses: ["p52"], occupation: "Kinh doanh" },
  { id: "p52", name: "Dương Thị Thủy", gender: "female", birth: "1968", alive: true, order: 1, spouses: ["p51"] },
  { id: "p53", name: "Phạm Văn Trung", gender: "male", birth: "1962", alive: true, order: 1, father: "p24", mother: "p25", spouses: ["p54"], occupation: "Bác sĩ" },
  { id: "p54", name: "Vương Thị Ánh", gender: "female", birth: "1965", alive: true, order: 1, spouses: ["p53"] },
  { id: "p55", name: "Phạm Thị Hạ", gender: "female", birth: "1968", alive: true, order: 2, father: "p24", mother: "p25" },
  { id: "p56", name: "Phạm Văn Quang", gender: "male", birth: "1968", alive: true, order: 1, father: "p26", mother: "p27", spouses: ["p57"], occupation: "Giáo viên" },
  { id: "p57", name: "Lâm Thị Vân", gender: "female", birth: "1970", alive: true, order: 1, spouses: ["p56"] },
  { id: "p58", name: "Trịnh Văn Long", gender: "male", birth: "1965", alive: true, order: 1, father: "p29", mother: "p28", occupation: "Kỹ sư", note: "Con của cụ Phạm Thị Hồng, theo họ cha (Trịnh Văn Bắc); ngoại tộc, chỉ ghi một đời." },

  // Cha/mẹ của dâu: hồ sơ tham khảo, không lên phả đồ và không tính đời dòng họ.
  {
    id: "r01",
    name: "Bùi Văn Thành",
    gender: "male",
    order: 1,
    reference: true,
    hometown: "Hà Nam",
    note: "Thân phụ của cụ Bùi Thị Nụ; chỉ ghi để tra cứu thông tin dâu.",
  },
  {
    id: "r02",
    name: "Nguyễn Thị Hòa",
    gender: "female",
    order: 1,
    reference: true,
    hometown: "Hà Nam",
    note: "Thân mẫu của cụ Bùi Thị Nụ; chỉ ghi để tra cứu thông tin dâu.",
  },
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
      ancestorLinkId: s.ancestorLinkId,
      ancestorLinkRelation: s.ancestorLinkRelation,
      ancestorLinkGap: s.ancestorLinkGap,
      ancestorLinkConfidence: s.ancestorLinkConfidence,
      ancestorLinkNote: s.ancestorLinkNote,
      reference: s.reference,
      nameIsConventional: false,
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

function assignBranches(people: Person[], branches: Branch[], founderId: string): void {
  const clan = classifyClan(people, founderId);
  const childrenBy = new Map<string, Person[]>();
  for (const person of people) {
    const parent = clan.lineParent(person);
    if (!parent) continue;
    const list = childrenBy.get(parent) ?? [];
    list.push(person);
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
      const person = people.find((entry) => entry.id === id);
      if (!person || !clan.clanIds.has(person.id)) continue;
      person.branchId = branch.id;
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
  ];
  assignBranches(members, branches, "p00");
  const now = new Date().toISOString();
  return {
    id: "mau-gia-pha",
    name: "GIA PHẢ HỌ PHẠM HÀ NỘI (MẪU)",
    address: SAMPLE_HOMETOWN,
    description:
      "Gia phả mẫu gồm 2 bậc tiền tổ và 5 đời (Đời 0–4), minh hoạ cách ghi chép thành viên, quan hệ vợ chồng, con cái, các chi phái trong dòng họ. Con của con gái chỉ ghi một đời (ngoại tộc, theo họ cha); cha/mẹ của dâu/rể là hồ sơ tham khảo, không lên phả đồ.",
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
    founderId: "p00",
    sample: true,
  };
}
