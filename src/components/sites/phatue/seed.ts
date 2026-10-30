import type { Branch, FamilyTree, Person } from "./types";
import { DEFAULT_DESIGN } from "./types";

interface SeedPerson {
  id: string;
  name: string;
  gender: "male" | "female";
  birth?: string;
  death?: string;
  alive?: boolean;
  father?: string;
  mother?: string;
  spouses?: string[];
  order: number;
  title?: string;
  generationNote?: string;
  tabooName?: string;
  courtesyName?: string;
  styleName?: string;
  posthumousName?: string;
  officeTitle?: string;
  mandarinRank?: string;
  honors?: string;
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
}

const seedPeople: SeedPerson[] = [
  {
    id: "p01",
    name: "Phạm Ngọc Bá",
    gender: "male",
    birth: "1850",
    death: "1920",
    order: 1,
    title: "Thủy tổ",
    generationNote: "Đích tôn, khai cơ lập nghiệp tại Mê Linh",
    tabooName: "Phạm Ngọc Bá",
    courtesyName: "Trung Phu",
    styleName: "Thanh Khê tiên sinh",
    posthumousName: "Đức Tổ Thuần Hậu",
    officeTitle: "Huấn đạo",
    mandarinRank: "Tòng bát phẩm",
    honors: "Nho sinh",
    spouses: ["p02", "p03"],
    hometown: "Hai Bà Trưng, Mê Linh, Hà Nội",
    occupation: "Nhà nho dạy học",
    maritalStatus: "Hai vợ",
    deathAnniversary: "10 tháng 10 năm Canh Thìn",
    restingPlace: "Từ đường chính",
    graveAddress: "Nghĩa trang dòng họ, xã Tráng Việt",
    worshipPlace: "Từ đường chính dòng họ",
    address: "Hai Bà Trưng, Mê Linh, Hà Nội",
    education: "Nho học",
    biography:
      "Theo truyền thuyết dòng họ, cụ Phạm Ngọc Bá là người khai cơ lập nghiệp tại vùng Mê Linh, mở ruộng, lập làng và đặt nền nếp gia phong cho con cháu. Cụ là người hiếu học, mở lớp dạy chữ Nho cho trẻ trong vùng và được dân làng kính trọng, tôn làm Thủy tổ của dòng họ.",
  },
  { id: "p02", name: "Lê Thị Hằng", gender: "female", birth: "1855", death: "1930", order: 1, spouses: ["p01"], hometown: "Mê Linh, Hà Nội" },
  { id: "p03", name: "Trần Thị Bắc", gender: "female", birth: "1860", death: "1945", order: 2, spouses: ["p01"], hometown: "Yên Lãng, Hà Nội" },
  { id: "p04", name: "Phạm Xuân Bằng", gender: "male", birth: "1886", death: "1960", order: 1, generationNote: "Đích tôn chi trưởng", officeTitle: "Hương trưởng", worshipPlace: "Từ đường chi trưởng", father: "p01", mother: "p02", spouses: ["p05"], occupation: "Nông nghiệp", address: "Mê Linh, Hà Nội" },
  { id: "p05", name: "Nguyễn Thị Hoa", gender: "female", birth: "1890", death: "1975", order: 1, spouses: ["p04"] },
  { id: "p06", name: "Hoàng Văn Thụ", gender: "male", birth: "1890", death: "1968", order: 2, generationNote: "Thứ nam", father: "p01", mother: "p02", spouses: ["p07"], occupation: "Thợ mộc" },
  { id: "p07", name: "Lê Thị Hải", gender: "female", birth: "1895", death: "1980", order: 1, spouses: ["p06"] },
  { id: "p08", name: "Phạm Thái Bình", gender: "male", birth: "1895", death: "1971", order: 3, generationNote: "Thứ nam", officeTitle: "Bang tá", tabooName: "Bình", father: "p01", mother: "p02", spouses: ["p09"], occupation: "Thương nhân" },
  { id: "p09", name: "Đỗ Thị Lan", gender: "female", birth: "1900", death: "1988", order: 1, spouses: ["p08"] },
  { id: "p10", name: "Phạm Thị Nga", gender: "female", birth: "1902", death: "1990", order: 4, generationNote: "Trưởng nữ", father: "p01", mother: "p03", spouses: ["p11"] },
  { id: "p11", name: "Nguyễn Văn Bình", gender: "male", birth: "1898", death: "1985", order: 1, spouses: ["p10"], occupation: "Giáo viên" },

  { id: "p12", name: "Phạm Văn An", gender: "male", birth: "1915", death: "1990", order: 1, father: "p04", mother: "p05", spouses: ["p13"], occupation: "Cán bộ nhà nước" },
  { id: "p13", name: "Trần Thị Minh", gender: "female", birth: "1920", death: "2005", order: 1, spouses: ["p12"] },
  { id: "p14", name: "Phạm Thị Bích", gender: "female", birth: "1920", death: "2001", order: 2, father: "p04", mother: "p05", spouses: ["p15"] },
  { id: "p15", name: "Nguyễn Đức Bình", gender: "male", birth: "1918", death: "1995", order: 1, spouses: ["p14"] },
  { id: "p16", name: "Phạm Văn Cường", gender: "male", birth: "1925", death: "2010", order: 3, father: "p04", mother: "p05", spouses: ["p17"], occupation: "Kỹ sư" },
  { id: "p17", name: "Lý Thị Phương", gender: "female", birth: "1930", death: "2018", order: 1, spouses: ["p16"] },
  { id: "p18", name: "Hoàng Đình Linh", gender: "male", birth: "1922", death: "2000", order: 1, father: "p06", mother: "p07", spouses: ["p19"], occupation: "Bộ đội" },
  { id: "p19", name: "Đặng Thị Kiều", gender: "female", birth: "1925", death: "2012", order: 1, spouses: ["p18"] },
  { id: "p20", name: "Hoàng Thị Kim", gender: "female", birth: "1928", death: "2015", order: 2, father: "p06", mother: "p07", spouses: ["p21"] },
  { id: "p21", name: "Nguyễn Thành Hưng", gender: "male", birth: "1926", death: "2008", order: 1, spouses: ["p20"] },
  { id: "p22", name: "Hoàng Việt Hải", gender: "male", birth: "1935", death: "2018", order: 3, father: "p06", mother: "p07", spouses: ["p23"], occupation: "Thợ cơ khí" },
  { id: "p23", name: "Nguyễn Thị Lan", gender: "female", birth: "1938", death: "2020", order: 1, spouses: ["p22"] },
  { id: "p24", name: "Phạm Đăng Khoa", gender: "male", birth: "1930", death: "2005", order: 1, father: "p08", mother: "p09", spouses: ["p25"], occupation: "Bác sĩ" },
  { id: "p25", name: "Vũ Thị Tâm", gender: "female", birth: "1932", death: "2020", order: 1, spouses: ["p24"] },
  { id: "p26", name: "Phạm Quốc Ninh", gender: "male", birth: "1938", death: "2020", order: 2, father: "p08", mother: "p09", spouses: ["p27"], occupation: "Kinh doanh" },
  { id: "p27", name: "Ngô Thị Quyên", gender: "female", birth: "1940", death: "2022", order: 1, spouses: ["p26"] },
  { id: "p28", name: "Phạm Thị Hương", gender: "female", birth: "1942", alive: true, order: 3, father: "p08", mother: "p09", spouses: ["p29"] },
  { id: "p29", name: "Đoàn Thanh Hùng", gender: "male", birth: "1940", death: "2015", order: 1, spouses: ["p28"] },
  { id: "p30", name: "Nguyễn Thị Mai", gender: "female", birth: "1928", death: "2010", order: 1, father: "p11", mother: "p10", spouses: ["p31"] },
  { id: "p31", name: "Trần Văn Nghĩa", gender: "male", birth: "1925", death: "2000", order: 1, spouses: ["p30"] },

  { id: "p32", name: "Phạm Minh Tuấn", gender: "male", birth: "1948", alive: true, order: 1, father: "p12", mother: "p13", spouses: ["p33"], occupation: "Giáo viên", address: "Mê Linh, Hà Nội" },
  { id: "p33", name: "Vũ Thanh Ngọc", gender: "female", birth: "1950", alive: true, order: 1, spouses: ["p32"] },
  { id: "p34", name: "Phạm Thu Hà", gender: "female", birth: "1952", alive: true, order: 2, father: "p12", mother: "p13", spouses: ["p35"] },
  { id: "p35", name: "Bùi Minh Dân", gender: "male", birth: "1950", alive: true, order: 1, spouses: ["p34"] },
  { id: "p36", name: "Phạm Quang Huy", gender: "male", birth: "1958", alive: true, order: 3, father: "p12", mother: "p13", spouses: ["p37"], occupation: "Kỹ sư xây dựng" },
  { id: "p37", name: "Đỗ Thị Yến", gender: "female", birth: "1960", alive: true, order: 1, spouses: ["p36"] },
  { id: "p38", name: "Nguyễn Thị Hồng", gender: "female", birth: "1950", alive: true, order: 1, father: "p15", mother: "p14", spouses: ["p39"] },
  { id: "p39", name: "Nguyễn Văn Hải", gender: "male", birth: "1948", alive: true, order: 1, spouses: ["p38"] },
  { id: "p40", name: "Nguyễn Văn Nam", gender: "male", birth: "1955", alive: true, order: 2, father: "p15", mother: "p14", spouses: ["p41"] },
  { id: "p41", name: "Nguyễn Thị Quỳnh", gender: "female", birth: "1958", alive: true, order: 1, spouses: ["p40"] },
  { id: "p42", name: "Phạm Đức Thắng", gender: "male", birth: "1950", alive: true, order: 1, father: "p16", mother: "p17", spouses: ["p43"], occupation: "Doanh nhân" },
  { id: "p43", name: "Lâm Thị Ngọc", gender: "female", birth: "1955", alive: true, order: 1, spouses: ["p42"] },
  { id: "p44", name: "Phạm Thị Lan Anh", gender: "female", birth: "1960", alive: true, order: 2, father: "p16", mother: "p17" },
  { id: "p45", name: "Hoàng Quốc Hưng", gender: "male", birth: "1955", death: "2022", order: 1, father: "p18", mother: "p19", spouses: ["p46"], occupation: "Bộ đội" },
  { id: "p46", name: "Trần Thị Thu", gender: "female", birth: "1958", alive: true, order: 1, spouses: ["p45"] },
  { id: "p47", name: "Hoàng Thị Mai", gender: "female", birth: "1960", alive: true, order: 2, father: "p18", mother: "p19", spouses: ["p48"] },
  { id: "p48", name: "Trần Văn Sơn", gender: "male", birth: "1956", alive: true, order: 1, spouses: ["p47"] },
  { id: "p49", name: "Nguyễn Thành Long", gender: "male", birth: "1958", alive: true, order: 1, father: "p21", mother: "p20", spouses: ["p50"] },
  { id: "p50", name: "Lưu Thị Thúy", gender: "female", birth: "1960", alive: true, order: 1, spouses: ["p49"] },
  { id: "p51", name: "Hoàng Gia Bảo", gender: "male", birth: "1965", alive: true, order: 1, father: "p22", mother: "p23", spouses: ["p52"], occupation: "Kinh doanh" },
  { id: "p52", name: "Nguyễn Thị Ngọc", gender: "female", birth: "1968", alive: true, order: 1, spouses: ["p51"] },
  { id: "p53", name: "Phạm Đăng Long", gender: "male", birth: "1962", alive: true, order: 1, father: "p24", mother: "p25", spouses: ["p54"], occupation: "Bác sĩ" },
  { id: "p54", name: "Phùng Thị Nga", gender: "female", birth: "1965", alive: true, order: 1, spouses: ["p53"] },
  { id: "p55", name: "Phạm Thị Hồng", gender: "female", birth: "1968", alive: true, order: 2, father: "p24", mother: "p25" },
  { id: "p56", name: "Phạm Quốc Bảo", gender: "male", birth: "1968", alive: true, order: 1, father: "p26", mother: "p27", spouses: ["p57"], occupation: "Giáo viên" },
  { id: "p57", name: "Vương Thị Tâm", gender: "female", birth: "1970", alive: true, order: 1, spouses: ["p56"] },
  { id: "p58", name: "Đoàn Minh Quân", gender: "male", birth: "1965", alive: true, order: 1, father: "p29", mother: "p28", spouses: ["p59"], occupation: "Kỹ sư" },
  { id: "p59", name: "Nguyễn Thị Diễm", gender: "female", birth: "1968", alive: true, order: 1, spouses: ["p58"] },
  { id: "p60", name: "Trần Văn Hùng", gender: "male", birth: "1952", alive: true, order: 1, father: "p31", mother: "p30", spouses: ["p61"], occupation: "Thợ điện" },
  { id: "p61", name: "Lê Thị Thu", gender: "female", birth: "1955", alive: true, order: 1, spouses: ["p60"] },
  { id: "p62", name: "Trần Thị Hạnh", gender: "female", birth: "1958", alive: true, order: 2, father: "p31", mother: "p30" },

  { id: "p63", name: "Phạm Anh Khoa", gender: "male", birth: "1978", alive: true, order: 1, father: "p32", mother: "p33", spouses: ["p64"], occupation: "Kỹ sư phần mềm", address: "Hà Nội" },
  { id: "p64", name: "Nguyễn Thị Mỹ", gender: "female", birth: "1980", alive: true, order: 1, spouses: ["p63"] },
  { id: "p65", name: "Phạm Thảo Vy", gender: "female", birth: "1983", alive: true, order: 2, father: "p32", mother: "p33", occupation: "Kế toán" },
  { id: "p66", name: "Bùi Ngọc Anh", gender: "female", birth: "1980", alive: true, order: 1, father: "p35", mother: "p34" },
  { id: "p67", name: "Bùi Minh Dân", gender: "male", birth: "1985", alive: true, order: 2, father: "p35", mother: "p34" },
  { id: "p68", name: "Phạm Khánh Linh", gender: "female", birth: "1988", alive: true, order: 1, father: "p36", mother: "p37" },
  { id: "p69", name: "Phạm Quang Minh", gender: "male", birth: "1992", alive: true, order: 2, father: "p36", mother: "p37" },
  { id: "p70", name: "Nguyễn Thị Quỳnh", gender: "female", birth: "1985", alive: true, order: 1, father: "p39", mother: "p38", spouses: ["p71"] },
  { id: "p71", name: "Trần Quốc Bảo", gender: "male", birth: "1983", alive: true, order: 1, spouses: ["p70"] },
  { id: "p72", name: "Nguyễn Văn Hải", gender: "male", birth: "1990", alive: true, order: 2, father: "p39", mother: "p38" },
  { id: "p73", name: "Phạm Đăng Khôi", gender: "male", birth: "1985", alive: true, order: 1, father: "p42", mother: "p43", spouses: ["p74"], occupation: "Kiến trúc sư" },
  { id: "p74", name: "Nguyễn Thị Trang", gender: "female", birth: "1987", alive: true, order: 1, spouses: ["p73"] },
  { id: "p75", name: "Phạm Ngọc Hân", gender: "female", birth: "1992", alive: true, order: 2, father: "p42", mother: "p43" },
  { id: "p76", name: "Hoàng Minh Đức", gender: "male", birth: "1988", alive: true, order: 1, father: "p45", mother: "p46", spouses: ["p77"], occupation: "Kỹ sư" },
  { id: "p77", name: "Nguyễn Thị Bích", gender: "female", birth: "1990", alive: true, order: 1, spouses: ["p76"] },
  { id: "p78", name: "Hoàng Thu Trang", gender: "female", birth: "1993", alive: true, order: 2, father: "p45", mother: "p46" },
  { id: "p79", name: "Nguyễn Thị Mai Anh", gender: "female", birth: "1990", alive: true, order: 1, father: "p48", mother: "p47" },
  { id: "p80", name: "Nguyễn Thành Đạt", gender: "male", birth: "1990", alive: true, order: 1, father: "p49", mother: "p50" },
  { id: "p81", name: "Hoàng Quốc Việt", gender: "male", birth: "1995", alive: true, order: 1, father: "p51", mother: "p52" },
  { id: "p82", name: "Phạm Thùy Dương", gender: "female", birth: "1996", alive: true, order: 1, father: "p53", mother: "p54" },
  { id: "p83", name: "Phạm Quốc Cường", gender: "male", birth: "1998", alive: true, order: 1, father: "p56", mother: "p57" },
  { id: "p84", name: "Đoàn Thanh Hà", gender: "female", birth: "1994", alive: true, order: 1, father: "p58", mother: "p59" },
  { id: "p85", name: "Trần Minh Quân", gender: "male", birth: "1992", alive: true, order: 1, father: "p60", mother: "p61" },

  { id: "p86", name: "Phạm Đăng Khôi", gender: "male", birth: "2010", alive: true, order: 1, father: "p63", mother: "p64" },
  { id: "p87", name: "Phạm Bảo Ngọc", gender: "female", birth: "2014", alive: true, order: 2, father: "p63", mother: "p64" },
  { id: "p88", name: "Hoàng Minh Khang", gender: "male", birth: "2012", alive: true, order: 1, father: "p76", mother: "p77" },
  { id: "p89", name: "Phạm Ngọc Diệp", gender: "female", birth: "2016", alive: true, order: 1, father: "p73", mother: "p74" },
  { id: "p90", name: "Nguyễn Gia Bảo", gender: "male", birth: "2015", alive: true, order: 1, father: "p71", mother: "p70" },
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
      generationNote: s.generationNote,
      tabooName: s.tabooName,
      courtesyName: s.courtesyName,
      styleName: s.styleName,
      posthumousName: s.posthumousName,
      officeTitle: s.officeTitle,
      mandarinRank: s.mandarinRank,
      honors: s.honors,
      birthOrder: s.order,
      fatherId: s.father,
      motherId: s.mother,
      spouseIds: [],
      hometown: s.hometown,
      occupation: s.occupation ?? "Không có",
      maritalStatus: s.maritalStatus ?? (s.spouses?.length ? "Đã kết hôn" : "Không có"),
      biography: s.biography,
      deathAnniversary: s.deathAnniversary,
      restingPlace: s.restingPlace,
      graveAddress: s.graveAddress,
      worshipPlace: s.worshipPlace,
      phone: s.phone,
      address: s.address,
      education: s.education,
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
  }
  const lineParent = (p: Person): string | undefined => {
    if (p.fatherId && bloodline.has(p.fatherId)) return p.fatherId;
    if (p.motherId && bloodline.has(p.motherId)) return p.motherId;
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
  const branches: Branch[] = [
    { id: "b1", name: "Chi trưởng", description: "Dòng trưởng, con cháu cụ Phạm Xuân Bằng", headId: "p04", color: "#8a1c15" },
    { id: "b2", name: "Chi thứ", description: "Con cháu cụ Hoàng Văn Thụ", headId: "p06", color: "#b7791f" },
    { id: "b3", name: "Chi ba", description: "Con cháu cụ Phạm Thái Bình", headId: "p08", color: "#2f6f5e" },
    { id: "b4", name: "Chi tư", description: "Con cháu cụ Phạm Thị Nga", headId: "p10", color: "#6b4c9a" },
  ];
  assignBranches(members, branches);
  const now = new Date().toISOString();
  return {
    id: "mau-gia-pha",
    name: "MẪU GIA PHẢ",
    address: "Hai Bà Trưng, Mê Linh, Hà Nội",
    description:
      "Gia phả mẫu gồm 6 đời, minh hoạ đầy đủ cách ghi chép thành viên, quan hệ vợ chồng, con cái và các nhánh trong dòng họ.",
    ownerName: "Quản trị viên",
    createdAt: now,
    updatedAt: now,
    members,
    branches,
    history:
      "Dòng họ Phạm Ngọc vốn gốc ở vùng Mê Linh, Hà Nội. Tương truyền cụ Thủy tổ Phạm Ngọc Bá vốn là nhà nho, mở lớp dạy chữ cho trẻ trong vùng, được dân làng kính trọng. Cụ cùng hai bà vợ khai khẩn đất hoang, lập nên xóm nhỏ bên bờ sông Hồng.\n\nQua sáu đời, con cháu dòng họ giữ nếp gia phong hiếu học, cần kiệm. Nhiều người thành đạt trong các lĩnh vực giáo dục, y tế, kỹ thuật và kinh doanh. Gia phả này được số hoá để con cháu muôn đời ghi nhớ cội nguồn.",
    design: { ...DEFAULT_DESIGN },
    positions: {},
    decorations: [],
    sample: true,
  };
}
