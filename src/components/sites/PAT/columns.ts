/**
 * Danh sách cột dùng chung cho mẫu Excel, nhập liệu và xuất CSV.
 * Thứ tự ở đây cũng là thứ tự cột trong tệp mẫu và tệp xuất.
 */
export type MemberColumnKey =
  | "code"
  | "name"
  | "surname"
  | "middleName"
  | "givenName"
  | "gender"
  | "lifeStatus"
  | "birthDate"
  | "birthCalendar"
  | "deathDate"
  | "deathCalendar"
  | "alive"
  | "father"
  | "mother"
  | "spouses"
  | "spouseOrder"
  | "spouseRank"
  | "generation"
  | "scope"
  | "ancestorOrder"
  | "founder"
  | "title"
  | "generationNote"
  | "tabooName"
  | "courtesyName"
  | "styleName"
  | "posthumousName"
  | "officeTitle"
  | "mandarinRank"
  | "honors"
  | "branch"
  | "ancestorLink"
  | "ancestorLinkRelation"
  | "ancestorLinkGap"
  | "ancestorLinkConfidence"
  | "ancestorLinkNote"
  | "nameIsConventional"
  | "nameNote"
  | "hometown"
  | "occupation"
  | "maritalStatus"
  | "deathAnniversary"
  | "worshipPlace"
  | "worshipMapUrl"
  | "restingPlace"
  | "graveAddress"
  | "graveMapUrl"
  | "phone"
  | "address"
  | "education"
  | "biography"
  | "notes";

export interface MemberColumn {
  key: MemberColumnKey;
  header: string;
  /** Cột thiết yếu: có trong mọi lần xuất tối giản và được nhắc trong hướng dẫn. */
  essential?: boolean;
}

export const MEMBER_COLUMNS: MemberColumn[] = [
  { key: "code", header: "Mã", essential: true },
  { key: "name", header: "Họ tên", essential: true },
  { key: "surname", header: "Họ" },
  { key: "middleName", header: "Đệm" },
  { key: "givenName", header: "Tên" },
  { key: "gender", header: "Giới tính", essential: true },
  { key: "lifeStatus", header: "Tình trạng" },
  { key: "birthDate", header: "Sinh" },
  { key: "birthCalendar", header: "Lịch sinh" },
  { key: "deathDate", header: "Mất" },
  { key: "deathCalendar", header: "Lịch mất" },
  { key: "alive", header: "Còn sống" },
  { key: "father", header: "Cha", essential: true },
  { key: "mother", header: "Mẹ", essential: true },
  { key: "spouses", header: "Vợ/chồng" },
  { key: "spouseOrder", header: "Thứ tự vợ/chồng" },
  { key: "spouseRank", header: "Vai vế vợ/chồng" },
  { key: "generation", header: "Đời" },
  { key: "scope", header: "Phạm vi" },
  { key: "ancestorOrder", header: "Bậc tiền tổ" },
  { key: "founder", header: "Khởi Tổ" },
  { key: "title", header: "Danh xưng" },
  { key: "generationNote", header: "Thế thứ" },
  { key: "tabooName", header: "Tên húy" },
  { key: "courtesyName", header: "Tên tự" },
  { key: "styleName", header: "Tên hiệu" },
  { key: "posthumousName", header: "Thụy hiệu" },
  { key: "officeTitle", header: "Chức tước" },
  { key: "mandarinRank", header: "Phẩm hàm" },
  { key: "honors", header: "Khoa bảng" },
  { key: "branch", header: "Chi phái" },
  { key: "ancestorLink", header: "Liên kết tiền tổ" },
  { key: "ancestorLinkRelation", header: "Quan hệ liên kết tiền tổ" },
  { key: "ancestorLinkGap", header: "Cách mấy bậc" },
  { key: "ancestorLinkConfidence", header: "Độ tin cậy liên kết" },
  { key: "ancestorLinkNote", header: "Ghi chú liên kết tiền tổ" },
  { key: "nameIsConventional", header: "Tên quy ước" },
  { key: "nameNote", header: "Nguồn tên quy ước" },
  { key: "hometown", header: "Nguyên quán" },
  { key: "occupation", header: "Nghề nghiệp" },
  { key: "maritalStatus", header: "Hôn nhân" },
  { key: "deathAnniversary", header: "Ngày giỗ" },
  { key: "worshipPlace", header: "Nơi thờ tự" },
  { key: "worshipMapUrl", header: "Bản đồ nơi thờ" },
  { key: "restingPlace", header: "Nơi an nghỉ" },
  { key: "graveAddress", header: "Mộ táng" },
  { key: "graveMapUrl", header: "Bản đồ mộ" },
  { key: "phone", header: "Điện thoại" },
  { key: "address", header: "Địa chỉ" },
  { key: "education", header: "Học vấn" },
  { key: "biography", header: "Tiểu sử" },
  { key: "notes", header: "Ghi chú" },
];

export const MEMBER_HEADERS = MEMBER_COLUMNS.map((column) => column.header);
export const MEMBER_COLUMN_COUNT = MEMBER_COLUMNS.length;
export const TEMPLATE_VERSION = "3.1";

/** Cột tối giản dùng khi người dùng chọn “chỉ cột thiết yếu”. */
export const ESSENTIAL_HEADERS = MEMBER_COLUMNS.filter((column) => column.essential).map(
  (column) => column.header,
);

export function normalizeHeader(value: unknown): string {
  return String(value ?? "")
    .normalize("NFC")
    .trim()
    .replace(/\s+/g, " ")
    .toLowerCase();
}

const ALIASES: Record<string, MemberColumnKey> = {
  "mã": "code",
  "mã thành viên": "code",
  "mã số": "code",
  code: "code",
  "họ tên": "name",
  "họ và tên": "name",
  "tên": "name",
  "họ tên thành viên": "name",
  "họ": "surname",
  "họ người": "surname",
  "đệm": "middleName",
  "tên đệm": "middleName",
  "chữ đệm": "middleName",
  "tên gọi": "givenName",
  "tên riêng": "givenName",
  "giới tính": "gender",
  "tình trạng": "lifeStatus",
  "tình trạng sống": "lifeStatus",
  "trạng thái": "lifeStatus",
  "sinh": "birthDate",
  "ngày sinh": "birthDate",
  "năm sinh": "birthDate",
  "lịch sinh": "birthCalendar",
  "loại lịch sinh": "birthCalendar",
  "mất": "deathDate",
  "ngày mất": "deathDate",
  "năm mất": "deathDate",
  "lịch mất": "deathCalendar",
  "loại lịch mất": "deathCalendar",
  "còn sống": "alive",
  "cha": "father",
  "họ tên cha": "father",
  "tên cha": "father",
  "mẹ": "mother",
  "họ tên mẹ": "mother",
  "tên mẹ": "mother",
  "vợ/chồng": "spouses",
  "vợ chồng": "spouses",
  "vợ / chồng": "spouses",
  "phối ngẫu": "spouses",
  "thứ tự vợ/chồng": "spouseOrder",
  "thứ tự phối ngẫu": "spouseOrder",
  "vợ/chồng theo thứ tự": "spouseOrder",
  "vai vế vợ/chồng": "spouseRank",
  "thứ bậc vợ/chồng": "spouseRank",
  "vai vế phối ngẫu": "spouseRank",
  "đời": "generation",
  "đời nội bộ": "generation",
  "phạm vi": "scope",
  "bậc tiền tổ": "ancestorOrder",
  "bậc tổ": "ancestorOrder",
  "khởi tổ": "founder",
  "là khởi tổ": "founder",
  "tổ của nhánh": "founder",
  "tổ của chi phái": "founder",
  "tổ của dòng": "founder",
  "danh xưng": "title",
  "thế thứ": "generationNote",
  "tên húy": "tabooName",
  "húy": "tabooName",
  "tên tự": "courtesyName",
  "tự": "courtesyName",
  "tên hiệu": "styleName",
  "hiệu": "styleName",
  "thụy hiệu": "posthumousName",
  "thụy danh": "posthumousName",
  "chức tước": "officeTitle",
  "phẩm hàm": "mandarinRank",
  "khoa bảng": "honors",
  "nhánh": "branch",
  "chi": "branch",
  "chi phái": "branch",
  "liên kết tiền tổ": "ancestorLink",
  "nối tiền tổ": "ancestorLink",
  "quan hệ liên kết tiền tổ": "ancestorLinkRelation",
  "cách mấy bậc": "ancestorLinkGap",
  "độ tin cậy liên kết": "ancestorLinkConfidence",
  "ghi chú liên kết tiền tổ": "ancestorLinkNote",
  "tên quy ước": "nameIsConventional",
  "nguồn tên quy ước": "nameNote",
  "lý do tên quy ước": "nameNote",
  "nguồn tên": "nameNote",
  "nguyên quán": "hometown",
  "quê quán": "hometown",
  "nghề nghiệp": "occupation",
  "hôn nhân": "maritalStatus",
  "tình trạng hôn nhân": "maritalStatus",
  "ngày giỗ": "deathAnniversary",
  "giỗ": "deathAnniversary",
  "nơi thờ tự": "worshipPlace",
  "bản đồ nơi thờ": "worshipMapUrl",
  "liên kết nơi thờ": "worshipMapUrl",
  "nơi an nghỉ": "restingPlace",
  "mộ táng": "graveAddress",
  "bản đồ mộ": "graveMapUrl",
  "liên kết mộ": "graveMapUrl",
  "điện thoại": "phone",
  "số điện thoại": "phone",
  "địa chỉ": "address",
  "học vấn": "education",
  "tiểu sử": "biography",
  "ghi chú": "notes",
};

export function columnKeyFor(header: string): MemberColumnKey | undefined {
  const normalized = normalizeHeader(header);
  const direct = ALIASES[normalized];
  if (direct) return direct;
  return MEMBER_COLUMNS.find((column) => normalizeHeader(column.header) === normalized)?.key;
}
