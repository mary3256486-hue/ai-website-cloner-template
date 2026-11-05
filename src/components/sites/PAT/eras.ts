export interface EraRecord {
  id: string;
  era: string;
  king: string;
  dynasty: string;
  /** Năm dương lịch bắt đầu niên hiệu. */
  start: number;
  /** Năm dương lịch cuối cùng còn dùng niên hiệu. */
  end: number;
  note?: string;
}

interface EraSeed {
  era: string;
  king: string;
  start: number;
  end: number;
  note?: string;
}

interface EraGroupSeed {
  dynasty: string;
  eras: EraSeed[];
}

const GROUPS: EraGroupSeed[] = [
  {
    dynasty: "Nhà Tiền Lý",
    eras: [{ era: "Thiên Đức", king: "Lý Nam Đế", start: 544, end: 548 }],
  },
  {
    dynasty: "Nhà Đinh",
    eras: [
      {
        era: "Thái Bình",
        king: "Đinh Tiên Hoàng · Đinh Phế Đế",
        start: 970,
        end: 980,
        note: "Niên hiệu duy nhất của nhà Đinh, dùng tiếp dưới thời Đinh Phế Đế.",
      },
    ],
  },
  {
    dynasty: "Nhà Tiền Lê",
    eras: [
      { era: "Thiên Phúc", king: "Lê Đại Hành", start: 980, end: 988 },
      { era: "Hưng Thống", king: "Lê Đại Hành", start: 989, end: 993 },
      {
        era: "Ứng Thiên",
        king: "Lê Đại Hành · Lê Trung Tông · Lê Ngọa Triều",
        start: 994,
        end: 1007,
      },
      { era: "Cảnh Thụy", king: "Lê Ngọa Triều", start: 1008, end: 1009 },
    ],
  },
  {
    dynasty: "Nhà Lý",
    eras: [
      { era: "Thuận Thiên", king: "Lý Thái Tổ", start: 1010, end: 1027 },
      { era: "Thiên Thành", king: "Lý Thái Tông", start: 1028, end: 1033 },
      { era: "Thông Thụy", king: "Lý Thái Tông", start: 1034, end: 1038 },
      { era: "Càn Phù Hữu Đạo", king: "Lý Thái Tông", start: 1039, end: 1041 },
      { era: "Minh Đạo", king: "Lý Thái Tông", start: 1042, end: 1043 },
      { era: "Thiên Cảm Thánh Vũ", king: "Lý Thái Tông", start: 1044, end: 1048 },
      { era: "Sùng Hưng Đại Bảo", king: "Lý Thái Tông", start: 1049, end: 1053 },
      { era: "Long Thụy Thái Bình", king: "Lý Thánh Tông", start: 1054, end: 1058 },
      { era: "Chương Thánh Gia Khánh", king: "Lý Thánh Tông", start: 1059, end: 1065 },
      { era: "Long Chương Thiên Tự", king: "Lý Thánh Tông", start: 1066, end: 1067 },
      { era: "Thiên Huống Bảo Tượng", king: "Lý Thánh Tông", start: 1068, end: 1068 },
      { era: "Thần Vũ", king: "Lý Thánh Tông", start: 1069, end: 1071 },
      { era: "Thái Ninh", king: "Lý Nhân Tông", start: 1072, end: 1075 },
      { era: "Anh Vũ Chiêu Thắng", king: "Lý Nhân Tông", start: 1076, end: 1084 },
      { era: "Quảng Hựu", king: "Lý Nhân Tông", start: 1085, end: 1091 },
      { era: "Hội Phong", king: "Lý Nhân Tông", start: 1092, end: 1100 },
      { era: "Long Phù", king: "Lý Nhân Tông", start: 1101, end: 1109 },
      { era: "Hội Tường Đại Khánh", king: "Lý Nhân Tông", start: 1110, end: 1119 },
      { era: "Thiên Phù Duệ Vũ", king: "Lý Nhân Tông", start: 1120, end: 1126 },
      { era: "Thiên Phù Khánh Thọ", king: "Lý Nhân Tông", start: 1127, end: 1127 },
      { era: "Thiên Thuận", king: "Lý Thần Tông", start: 1128, end: 1132 },
      { era: "Thiên Chương Bảo Tự", king: "Lý Thần Tông", start: 1133, end: 1137 },
      { era: "Thiệu Minh", king: "Lý Anh Tông", start: 1138, end: 1139 },
      { era: "Đại Định", king: "Lý Anh Tông", start: 1140, end: 1162 },
      { era: "Chính Long Bảo Ứng", king: "Lý Anh Tông", start: 1163, end: 1173 },
      { era: "Thiên Cảm Chí Bảo", king: "Lý Cao Tông", start: 1174, end: 1175 },
      { era: "Trinh Phù", king: "Lý Cao Tông", start: 1176, end: 1185 },
      { era: "Thiên Tư Gia Thụy", king: "Lý Cao Tông", start: 1186, end: 1201 },
      { era: "Thiên Gia Bảo Hựu", king: "Lý Cao Tông", start: 1202, end: 1204 },
      { era: "Trị Bình Long Ứng", king: "Lý Cao Tông", start: 1205, end: 1210 },
      { era: "Kiến Gia", king: "Lý Huệ Tông", start: 1211, end: 1223 },
      { era: "Thiên Chương Hữu Đạo", king: "Lý Chiêu Hoàng", start: 1224, end: 1225 },
    ],
  },
  {
    dynasty: "Nhà Trần",
    eras: [
      { era: "Kiến Trung", king: "Trần Thái Tông", start: 1225, end: 1231 },
      { era: "Thiên Ứng Chính Bình", king: "Trần Thái Tông", start: 1232, end: 1250 },
      { era: "Nguyên Phong", king: "Trần Thái Tông", start: 1251, end: 1257 },
      { era: "Thiệu Long", king: "Trần Thánh Tông", start: 1258, end: 1272 },
      { era: "Bảo Phù", king: "Trần Nhân Tông", start: 1273, end: 1278 },
      { era: "Thiệu Bảo", king: "Trần Nhân Tông", start: 1279, end: 1284 },
      { era: "Trùng Hưng", king: "Trần Nhân Tông", start: 1285, end: 1292 },
      { era: "Hưng Long", king: "Trần Anh Tông", start: 1293, end: 1313 },
      { era: "Đại Khánh", king: "Trần Minh Tông", start: 1314, end: 1323 },
      { era: "Khai Thái", king: "Trần Minh Tông", start: 1324, end: 1328 },
      { era: "Khai Hựu", king: "Trần Hiến Tông", start: 1329, end: 1341 },
      { era: "Thiệu Phong", king: "Trần Dụ Tông", start: 1342, end: 1357 },
      { era: "Đại Trị", king: "Trần Dụ Tông", start: 1358, end: 1368 },
      { era: "Đại Định", king: "Dương Nhật Lễ", start: 1369, end: 1369 },
      { era: "Thiệu Khánh", king: "Trần Nghệ Tông", start: 1370, end: 1372 },
      { era: "Long Khánh", king: "Trần Duệ Tông", start: 1373, end: 1376 },
      { era: "Xương Phù", king: "Trần Phế Đế", start: 1377, end: 1387 },
      { era: "Quang Thái", king: "Trần Thuận Tông", start: 1388, end: 1397 },
      { era: "Kiến Tân", king: "Trần Thiếu Đế", start: 1398, end: 1400 },
    ],
  },
  {
    dynasty: "Nhà Hồ",
    eras: [
      { era: "Thánh Nguyên", king: "Hồ Quý Ly", start: 1400, end: 1400 },
      { era: "Thiệu Thành", king: "Hồ Hán Thương", start: 1401, end: 1402 },
      { era: "Khai Đại", king: "Hồ Hán Thương", start: 1403, end: 1407 },
    ],
  },
  {
    dynasty: "Nhà Hậu Trần",
    eras: [
      { era: "Hưng Khánh", king: "Giản Định Đế", start: 1407, end: 1408 },
      { era: "Trùng Quang", king: "Trần Quý Khoáng", start: 1409, end: 1413 },
      { era: "Thiên Khánh", king: "Trần Cảo", start: 1426, end: 1427 },
    ],
  },
  {
    dynasty: "Nhà Lê sơ",
    eras: [
      { era: "Thuận Thiên", king: "Lê Thái Tổ", start: 1428, end: 1433 },
      { era: "Thiệu Bình", king: "Lê Thái Tông", start: 1434, end: 1439 },
      { era: "Đại Bảo", king: "Lê Nhân Tông", start: 1440, end: 1442 },
      { era: "Đại Hòa", king: "Lê Nhân Tông", start: 1443, end: 1453 },
      { era: "Diên Ninh", king: "Lê Nhân Tông", start: 1454, end: 1458 },
      { era: "Thiên Hưng", king: "Lê Nghi Dân", start: 1459, end: 1459 },
      { era: "Quang Thuận", king: "Lê Thánh Tông", start: 1460, end: 1469 },
      { era: "Hồng Đức", king: "Lê Thánh Tông", start: 1470, end: 1497 },
      { era: "Cảnh Thống", king: "Lê Hiến Tông", start: 1498, end: 1503 },
      { era: "Thái Trinh", king: "Lê Túc Tông", start: 1504, end: 1504 },
      { era: "Đoan Khánh", king: "Lê Uy Mục", start: 1505, end: 1508 },
      { era: "Hồng Thuận", king: "Lê Tương Dực", start: 1509, end: 1515 },
      { era: "Quang Thiệu", king: "Lê Chiêu Tông", start: 1516, end: 1521 },
      { era: "Thống Nguyên", king: "Lê Cung Hoàng", start: 1522, end: 1527 },
    ],
  },
  {
    dynasty: "Nhà Mạc",
    eras: [
      { era: "Minh Đức", king: "Mạc Thái Tổ", start: 1527, end: 1529 },
      { era: "Đại Chính", king: "Mạc Thái Tông", start: 1530, end: 1539 },
      { era: "Quảng Hòa", king: "Mạc Hiến Tông", start: 1540, end: 1546 },
      { era: "Vĩnh Định", king: "Mạc Tuyên Tông", start: 1547, end: 1547 },
      { era: "Cảnh Lịch", king: "Mạc Mậu Hợp", start: 1548, end: 1553 },
      { era: "Quang Bảo", king: "Mạc Mậu Hợp", start: 1554, end: 1561 },
      { era: "Thuần Phúc", king: "Mạc Mậu Hợp", start: 1562, end: 1565 },
      { era: "Sùng Khang", king: "Mạc Mậu Hợp", start: 1566, end: 1577 },
      { era: "Diên Thành", king: "Mạc Mậu Hợp", start: 1578, end: 1585 },
      { era: "Đoan Thái", king: "Mạc Mậu Hợp", start: 1586, end: 1587 },
      { era: "Hưng Trị", king: "Mạc Mậu Hợp", start: 1588, end: 1590 },
      { era: "Hồng Ninh", king: "Mạc Mậu Hợp", start: 1591, end: 1591 },
      { era: "Vũ An", king: "Mạc Toàn", start: 1592, end: 1593 },
    ],
  },
  {
    dynasty: "Nhà Mạc (Cao Bằng)",
    eras: [
      {
        era: "Bảo Định",
        king: "Mạc Kính Chỉ",
        start: 1592,
        end: 1592,
        note: "Chính quyền Mạc rút lên Cao Bằng sau khi mất Thăng Long.",
      },
      { era: "Khang Hựu", king: "Mạc Kính Chỉ", start: 1593, end: 1593 },
      { era: "Càn Thống", king: "Mạc Kính Cung", start: 1593, end: 1625 },
      { era: "Long Thái", king: "Mạc Kính Khoan", start: 1623, end: 1637 },
      { era: "Thuận Đức", king: "Mạc Kính Vũ", start: 1638, end: 1677 },
    ],
  },
  {
    dynasty: "Nhà Lê trung hưng",
    eras: [
      { era: "Nguyên Hòa", king: "Lê Trang Tông", start: 1533, end: 1548 },
      { era: "Thuận Bình", king: "Lê Trung Tông", start: 1549, end: 1556 },
      { era: "Thiên Hựu", king: "Lê Anh Tông", start: 1557, end: 1557 },
      { era: "Chính Trị", king: "Lê Anh Tông", start: 1558, end: 1571 },
      { era: "Hồng Phúc", king: "Lê Anh Tông", start: 1572, end: 1572 },
      { era: "Gia Thái", king: "Lê Thế Tông", start: 1573, end: 1577 },
      { era: "Quang Hưng", king: "Lê Thế Tông", start: 1578, end: 1599 },
      { era: "Thận Đức", king: "Lê Kính Tông", start: 1600, end: 1600 },
      { era: "Hoằng Định", king: "Lê Kính Tông", start: 1601, end: 1618 },
      { era: "Vĩnh Tộ", king: "Lê Thần Tông", start: 1619, end: 1628 },
      { era: "Đức Long", king: "Lê Chân Tông", start: 1629, end: 1634 },
      { era: "Dương Hòa", king: "Lê Chân Tông", start: 1635, end: 1642 },
      { era: "Phúc Thái", king: "Lê Thần Tông", start: 1643, end: 1648 },
      { era: "Khánh Đức", king: "Lê Thần Tông", start: 1649, end: 1652 },
      { era: "Thịnh Đức", king: "Lê Thần Tông", start: 1653, end: 1657 },
      { era: "Vĩnh Thọ", king: "Lê Huyền Tông", start: 1658, end: 1661 },
      { era: "Vạn Khánh", king: "Lê Huyền Tông", start: 1662, end: 1662 },
      { era: "Cảnh Trị", king: "Lê Huyền Tông", start: 1663, end: 1671 },
      { era: "Dương Đức", king: "Lê Gia Tông", start: 1672, end: 1673 },
      { era: "Đức Nguyên", king: "Lê Gia Tông", start: 1674, end: 1675 },
      { era: "Vĩnh Trị", king: "Lê Hy Tông", start: 1676, end: 1679 },
      { era: "Chính Hòa", king: "Lê Hy Tông", start: 1680, end: 1705 },
      { era: "Vĩnh Thịnh", king: "Lê Dụ Tông", start: 1706, end: 1719 },
      { era: "Bảo Thái", king: "Lê Dụ Tông", start: 1720, end: 1728 },
      { era: "Vĩnh Khánh", king: "Lê Duy Phường", start: 1729, end: 1731 },
      { era: "Long Đức", king: "Lê Thuần Tông", start: 1732, end: 1734 },
      { era: "Vĩnh Hựu", king: "Lê Ý Tông", start: 1735, end: 1739 },
      { era: "Cảnh Hưng", king: "Lê Hiển Tông", start: 1740, end: 1785 },
      { era: "Chiêu Thống", king: "Lê Mẫn Đế", start: 1786, end: 1788 },
    ],
  },
  {
    dynasty: "Nhà Tây Sơn",
    eras: [
      { era: "Thái Đức", king: "Nguyễn Nhạc", start: 1778, end: 1793 },
      { era: "Quang Trung", king: "Nguyễn Huệ", start: 1788, end: 1792 },
      { era: "Cảnh Thịnh", king: "Nguyễn Quang Toản", start: 1793, end: 1800 },
      { era: "Bảo Hưng", king: "Nguyễn Quang Toản", start: 1801, end: 1802 },
    ],
  },
  {
    dynasty: "Nhà Nguyễn",
    eras: [
      { era: "Gia Long", king: "Nguyễn Thế Tổ (Nguyễn Ánh)", start: 1802, end: 1819 },
      { era: "Minh Mạng", king: "Nguyễn Thánh Tổ", start: 1820, end: 1840 },
      { era: "Thiệu Trị", king: "Nguyễn Hiến Tổ", start: 1841, end: 1847 },
      { era: "Tự Đức", king: "Nguyễn Dực Tông", start: 1848, end: 1883 },
      { era: "Dục Đức", king: "Nguyễn Cung Tông", start: 1883, end: 1883 },
      { era: "Hiệp Hòa", king: "Nguyễn Phúc Hồng Dật", start: 1883, end: 1883 },
      { era: "Kiến Phúc", king: "Nguyễn Giản Tông", start: 1883, end: 1884 },
      { era: "Hàm Nghi", king: "Nguyễn Phúc Ưng Lịch", start: 1885, end: 1888 },
      { era: "Đồng Khánh", king: "Nguyễn Cảnh Tông", start: 1886, end: 1888 },
      { era: "Thành Thái", king: "Nguyễn Phúc Bửu Lân", start: 1889, end: 1906 },
      { era: "Duy Tân", king: "Nguyễn Phúc Vĩnh San", start: 1907, end: 1915 },
      { era: "Khải Định", king: "Nguyễn Hoằng Tông", start: 1916, end: 1924 },
      { era: "Bảo Đại", king: "Nguyễn Phúc Vĩnh Thụy", start: 1925, end: 1945 },
    ],
  },
];

export const ERA_MIN_YEAR = 544;
export const ERA_MAX_YEAR = 1945;

export const ERA_DYNASTY_GROUPS: { dynasty: string; eras: EraRecord[] }[] = GROUPS.map((group) => ({
  dynasty: group.dynasty,
  eras: group.eras.map((seed) => ({
    ...seed,
    dynasty: group.dynasty,
    id: `${group.dynasty}-${seed.era}-${seed.start}`,
  })),
}));

export const ERA_RECORDS: EraRecord[] = ERA_DYNASTY_GROUPS.flatMap((group) => group.eras);

export const FEATURED_ERAS = [
  "Hồng Đức",
  "Quang Trung",
  "Gia Long",
  "Minh Mạng",
  "Tự Đức",
  "Cảnh Hưng",
  "Thiên Phúc",
  "Thái Bình",
];

export const FEATURED_YEARS = [1470, 1789, 1802, 1945];

export function normalizeEraText(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/đ/g, "d")
    .replace(/Đ/g, "D")
    .toLowerCase()
    .trim();
}

export function erasForYear(year: number): EraRecord[] {
  return ERA_RECORDS.filter((record) => year >= record.start && year <= record.end).sort(
    (left, right) => left.start - right.start,
  );
}

export function searchEras(query: string): EraRecord[] {
  const needle = normalizeEraText(query);
  if (!needle) return [];
  return ERA_RECORDS.filter((record) =>
    normalizeEraText(`${record.era} ${record.king} ${record.dynasty}`).includes(needle),
  );
}

export function formatEraYears(record: EraRecord) {
  return record.start === record.end ? `${record.start}` : `${record.start} – ${record.end}`;
}

export function eraOrdinalLabel(record: EraRecord, ordinal: number) {
  return ordinal === 1 ? `${record.era} nguyên niên` : `${record.era} thứ ${ordinal}`;
}
