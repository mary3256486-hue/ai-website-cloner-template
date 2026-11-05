const PI = Math.PI;
const TIMEZONE = 7;

// Lịch Việt Nam, múi giờ +7. Thuật toán thiên văn dùng được cho 1700–2199; trước 1800
// một số nguồn lịch sử có thể lệch 1 ngày do quy ước vùng miền.
export const LUNAR_MIN_YEAR = 1700;
export const LUNAR_MAX_YEAR = 2199;

export interface SolarDate {
  day: number;
  month: number;
  year: number;
}

export interface LunarDate extends SolarDate {
  leap: boolean;
}

function INT(value: number) {
  return Math.floor(value);
}

function jdFromDate(day: number, month: number, year: number) {
  const a = INT((14 - month) / 12);
  const y = year + 4800 - a;
  const m = month + 12 * a - 3;
  let jd = day + INT((153 * m + 2) / 5) + 365 * y + INT(y / 4) - INT(y / 100) + INT(y / 400) - 32045;
  if (jd < 2299161) {
    jd = day + INT((153 * m + 2) / 5) + 365 * y + INT(y / 4) - 32083;
  }
  return jd;
}

function jdToDate(jd: number): SolarDate {
  let a: number;
  let b: number;
  let c: number;
  if (jd > 2299160) {
    a = jd + 32044;
    b = INT((4 * a + 3) / 146097);
    c = a - INT((146097 * b) / 4);
  } else {
    b = 0;
    a = jd + 32082;
    c = a;
  }
  const d = INT((4 * c + 3) / 1461);
  const e = c - INT((1461 * d) / 4);
  const m = INT((5 * e + 2) / 153);
  return {
    day: e - INT((153 * m + 2) / 5) + 1,
    month: m + 3 - 12 * INT(m / 10),
    year: 100 * b + d - 4800 + INT(m / 10),
  };
}

function newMoon(k: number) {
  const T = k / 1236.85;
  const T2 = T * T;
  const T3 = T2 * T;
  const dr = PI / 180;
  let jd = 2415020.75933 + 29.53058868 * k + 0.0001178 * T2 - 0.000000155 * T3;
  jd += 0.00033 * Math.sin((166.56 + 132.87 * T - 0.009173 * T2) * dr);
  const M = 359.2242 + 29.10535608 * k - 0.0000333 * T2 - 0.00000347 * T3;
  const Mpr = 306.0253 + 385.81691806 * k + 0.0107306 * T2 + 0.00001236 * T3;
  const F = 21.2964 + 390.67050646 * k - 0.0016528 * T2 - 0.00000239 * T3;
  let c = (0.1734 - 0.000393 * T) * Math.sin(M * dr) + 0.0021 * Math.sin(2 * dr * M);
  c = c - 0.4068 * Math.sin(Mpr * dr) + 0.0161 * Math.sin(2 * dr * Mpr);
  c -= 0.0004 * Math.sin(3 * dr * Mpr);
  c += 0.0104 * Math.sin(2 * dr * F) - 0.0051 * Math.sin(dr * (M + Mpr));
  c -= 0.0074 * Math.sin(dr * (M - Mpr)) + 0.0004 * Math.sin(dr * (2 * F + M));
  c -= 0.0004 * Math.sin(dr * (2 * F - M)) - 0.0006 * Math.sin(dr * (2 * F + Mpr));
  c += 0.001 * Math.sin(dr * (2 * F - Mpr)) + 0.0005 * Math.sin(dr * (2 * Mpr + M));
  let delta: number;
  if (T < -11) {
    delta = 0.001 + 0.000839 * T + 0.0002261 * T2 - 0.00000845 * T3 - 0.000000081 * T * T3;
  } else {
    delta = -0.000278 + 0.000265 * T + 0.000262 * T2;
  }
  return jd + c - delta;
}

function newMoonDay(k: number) {
  return INT(newMoon(k) + 0.5 + TIMEZONE / 24);
}

function sunLongitude(dayNumber: number) {
  const T = (dayNumber - 2451545.0) / 36525;
  const T2 = T * T;
  const dr = PI / 180;
  const M = 357.5291 + 35999.0503 * T - 0.0001559 * T2 - 0.00000048 * T * T2;
  const L0 = 280.46645 + 36000.76983 * T + 0.0003032 * T2;
  let dl = (1.9146 - 0.004817 * T - 0.000014 * T2) * Math.sin(dr * M);
  dl += (0.019993 - 0.000101 * T) * Math.sin(2 * dr * M) + 0.00029 * Math.sin(3 * dr * M);
  let l = (L0 + dl) * dr;
  l -= PI * 2 * INT(l / (PI * 2));
  return l;
}

function sunLongitudeIndex(dayNumber: number) {
  return INT((sunLongitude(dayNumber - 0.5 - TIMEZONE / 24) / PI) * 6);
}

function lunarMonth11(year: number) {
  const off = jdFromDate(31, 12, year) - 2415021;
  const k = INT(off / 29.530588853);
  let nm = newMoonDay(k);
  if (sunLongitudeIndex(nm) >= 9) nm = newMoonDay(k - 1);
  return nm;
}

function leapMonthOffset(a11: number) {
  const k = INT(0.5 + (a11 - 2415021.076998695) / 29.530588853);
  let last = 0;
  let i = 1;
  let arc = sunLongitudeIndex(newMoonDay(k + i));
  do {
    last = arc;
    i += 1;
    arc = sunLongitudeIndex(newMoonDay(k + i));
  } while (arc !== last && i < 14);
  return i - 1;
}

export function isValidSolarDate(day: number, month: number, year: number) {
  if (!Number.isInteger(day) || !Number.isInteger(month) || !Number.isInteger(year)) return false;
  if (day < 1 || day > 31 || month < 1 || month > 12) return false;
  if (year < 1 || year > 9999) return false;
  const roundTrip = jdToDate(jdFromDate(day, month, year));
  return roundTrip.day === day && roundTrip.month === month && roundTrip.year === year;
}

export function solarToLunar(day: number, month: number, year: number): LunarDate {
  const dayNumber = jdFromDate(day, month, year);
  const k = INT((dayNumber - 2415021.076998695) / 29.530588853);
  let monthIndex = k + 1;
  let monthStart = newMoonDay(monthIndex);
  // Sai số làm tròn khiến điểm đầu tháng đôi khi vượt quá ngày đang xét (vd 13/04/1877);
  // lùi từng tháng cho tới khi điểm đầu tháng nằm trong tháng chứa ngày đó.
  while (monthStart > dayNumber) {
    monthIndex -= 1;
    monthStart = newMoonDay(monthIndex);
  }
  let a11 = lunarMonth11(year);
  let b11 = a11;
  let lunarYear: number;
  if (a11 >= monthStart) {
    lunarYear = year;
    a11 = lunarMonth11(year - 1);
  } else {
    lunarYear = year + 1;
    b11 = lunarMonth11(year + 1);
  }
  const lunarDay = dayNumber - monthStart + 1;
  const diff = INT((monthStart - a11) / 29);
  let lunarMonth = diff + 11;
  let leap = false;
  if (b11 - a11 > 365) {
    const leapOffset = leapMonthOffset(a11);
    if (diff >= leapOffset) {
      lunarMonth = diff + 10;
      if (diff === leapOffset) leap = true;
    }
  }
  if (lunarMonth > 12) lunarMonth -= 12;
  if (lunarMonth >= 11 && diff < 4) lunarYear -= 1;
  return { day: lunarDay, month: lunarMonth, year: lunarYear, leap };
}

export function lunarToSolar(day: number, month: number, year: number, leap: boolean): SolarDate | null {
  if (
    !Number.isInteger(day)
    || !Number.isInteger(month)
    || !Number.isInteger(year)
    || day < 1
    || day > 30
    || month < 1
    || month > 12
  ) {
    return null;
  }
  let a11: number;
  let b11: number;
  if (month < 11) {
    a11 = lunarMonth11(year - 1);
    b11 = lunarMonth11(year);
  } else {
    a11 = lunarMonth11(year);
    b11 = lunarMonth11(year + 1);
  }
  const k = INT(0.5 + (a11 - 2415021.076998695) / 29.530588853);
  let off = month - 11;
  if (off < 0) off += 12;
  if (b11 - a11 > 365) {
    const leapOffset = leapMonthOffset(a11);
    let leapMonth = leapOffset - 2;
    if (leapMonth < 0) leapMonth += 12;
    if (leap && month !== leapMonth) return null;
    if (leap || off >= leapOffset) {
      off += 1;
    }
  } else if (leap) {
    return null;
  }
  const solar = jdToDate(newMoonDay(k + off) + day - 1);
  const check = solarToLunar(solar.day, solar.month, solar.year);
  if (check.day !== day || check.month !== month || check.leap !== leap) return null;
  return solar;
}

export function formatSolarDate(date: SolarDate) {
  return `${String(date.day).padStart(2, "0")}/${String(date.month).padStart(2, "0")}/${date.year}`;
}

export function formatLunarDate(date: LunarDate) {
  return `${String(date.day).padStart(2, "0")}/${String(date.month).padStart(2, "0")}/${date.year}${date.leap ? " nhuận" : ""}`;
}

const CAN = ["Giáp", "Ất", "Bính", "Đinh", "Mậu", "Kỷ", "Canh", "Tân", "Nhâm", "Quý"];
const CHI = ["Tý", "Sửu", "Dần", "Mão", "Thìn", "Tỵ", "Ngọ", "Mùi", "Thân", "Dậu", "Tuất", "Hợi"];

export function lunarYearName(year: number) {
  const index = (((year - 4) % 60) + 60) % 60;
  return `${CAN[index % 10]} ${CHI[index % 12]}`;
}

function normalizeName(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/đ/g, "d")
    .replace(/Đ/g, "d")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

export function lunarYearsForName(value: string): number[] {
  const tokens = normalizeName(value).split(" ").filter(Boolean);
  if (!tokens.length) return [];
  const can = CAN.findIndex((name) => tokens.includes(normalizeName(name)));
  const chi = CHI.findIndex((name) => tokens.includes(normalizeName(name)));
  if (can < 0 || chi < 0) return [];
  const years: number[] = [];
  for (let year = LUNAR_MIN_YEAR; year <= LUNAR_MAX_YEAR; year += 1) {
    if ((((year - 4) % 10) + 10) % 10 === can && (((year - 4) % 12) + 12) % 12 === chi) {
      years.push(year);
    }
  }
  return years;
}

export function formatLunarDateLong(date: LunarDate) {
  return `ngày ${date.day} tháng ${date.month}${date.leap ? " nhuận" : ""} năm ${lunarYearName(date.year)}`;
}

export function parseStoredDate(value?: string): SolarDate | null {
  if (!value) return null;
  const match = value.trim().match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (!match) return null;
  return { day: Number(match[1]), month: Number(match[2]), year: Number(match[3]) };
}

export function formatStoredLunarDate(value?: string, leap = false): string | null {
  const parsed = parseStoredDate(value);
  if (!parsed || parsed.year < LUNAR_MIN_YEAR || parsed.year > LUNAR_MAX_YEAR) return null;
  return formatLunarDateLong({ ...parsed, leap });
}
