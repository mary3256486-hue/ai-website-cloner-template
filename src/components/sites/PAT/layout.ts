import type { FamilyTree, Person, TreeEdge, TreeLayout, TreeNode } from "./types";
import {
  ancestorLabelFor,
  bandLabelFor,
  cardDimsFor,
  FRAME_CORNER_CLEARANCE,
  GENERATION_LABEL_CARD_SCALE,
  generationBandMetrics,
  normalizeTuning,
  SPOUSE_GAP,
  TOP_CARD_SCALE_GENERATIONS,
} from "./types";
import { classifyClan, type ClanIndex } from "./clan";
import {
  computeGenerations,
  isIndirectLink,
  linkLabel,
  orderedSpouses,
  sortGenerations,
  sortPersons,
} from "./utils";
import { paperDimensions } from "./export";
import { PAPER_UNITS_PER_MM } from "./diagram-canvas";

interface Measure {
  person: Person;
  width: number;
  unitWidth: number;
  spouses: Person[];
  children: Measure[];
}

/** Một khối vợ/chồng trong một hàng đời. */
interface LayoutUnit {
  unitId: string;
  nodes: TreeNode[];
  totalWidth: number;
  left: number;
  owner: TreeNode;
}

export function computeLayout(tree: FamilyTree, scopeIds?: Set<string> | null): TreeLayout {
  const tuning = normalizeTuning(tree.design.tuning);
  if (tuning.layoutMode === "balanced") {
    return computeLayoutBalanced(tree, scopeIds);
  }
  return computeLayoutTopDown(tree, scopeIds);
}

/**
 * Từ tiền tổ tới đời 1, hàng thẻ ít người nên nếu bám theo con sẽ lệch hẳn về
 * một bên trang. Ưu tiên căn giữa từng hàng theo tâm trang hiển thị; hàng có vị
 * trí kéo tay hợp lệ giữ nguyên ý người dùng.
 *
 * Tâm trang không phải tâm nội dung: khung vẽ còn cộng thêm phần chênh lề
 * trái/phải, nên căn theo tâm dải khả dụng giữa hai lề; khi lề hai bên bằng nhau
 * (mặc định) tâm dải trùng tâm trang. Lặp vài vòng để hội tụ khi chính hàng trên
 * cùng quyết định biên phải của nội dung.
 */
function centerTopRows(
  nodes: TreeNode[],
  marginLeft: number,
  marginRight: number,
  skipGenerations?: Set<number>,
) {
  if (nodes.length === 0) return;
  const rows = new Map<number, TreeNode[]>();
  for (const node of nodes) {
    if (node.generation > 1 || skipGenerations?.has(node.generation)) continue;
    const list = rows.get(node.generation) ?? [];
    list.push(node);
    rows.set(node.generation, list);
  }
  if (rows.size === 0) return;
  const bounds = new Map<number, { left: number; right: number }>();
  for (const [generation, members] of rows) {
    bounds.set(generation, {
      left: Math.min(...members.map((node) => node.x)),
      right: Math.max(...members.map((node) => node.x + node.width)),
    });
  }
  for (let pass = 0; pass < 3; pass++) {
    const maxRight = Math.max(...nodes.map((node) => node.x + node.width));
    const width = Math.max(maxRight + marginRight, marginLeft + marginRight);
    const bandWidth = width - marginLeft - marginRight;
    if (bandWidth <= 0) return;
    const targetX = marginLeft + bandWidth / 2;
    let moved = false;
    for (const [generation, row] of bounds) {
      if (row.right - row.left > bandWidth) continue;
      const dx = targetX - (row.left + row.right) / 2;
      if (!Number.isFinite(dx) || Math.abs(dx) < 0.5) continue;
      for (const node of rows.get(generation) ?? []) node.x += dx;
      row.left += dx;
      row.right += dx;
      moved = true;
    }
    if (!moved) break;
  }
}

function computeLayoutTopDown(tree: FamilyTree, scopeIds?: Set<string> | null): TreeLayout {
  const tuning = normalizeTuning(tree.design.tuning);
  const clan = classifyClan(tree.members, tree.founderId);
  const generations = computeGenerations(tree.members, tree.founderId);
  const inScope = (id: string) => !scopeIds || scopeIds.has(id);
  const counts = new Map<number, number>();
  for (const member of tree.members) {
    if (!clan.isDisplayed(member.id) || !inScope(member.id)) continue;
    const generation = generations.get(member.id) ?? 1;
    counts.set(generation, (counts.get(generation) ?? 0) + 1);
  }
  const inset = Math.round(FRAME_CORNER_CLEARANCE * tuning.frameScale);
  const cardScale = tuning.cardScale ?? 1;
  // Bốn đời trên cùng theo đúng thứ tự trình bày (tiền tổ xếp trước) được phóng thẻ mặc định.
  const generationKeys = Array.from(counts.keys()).sort(sortGenerations);
  const topGenerations = generationKeys.slice(0, TOP_CARD_SCALE_GENERATIONS);
  const marginTop = tuning.marginTop + inset;
  const marginBottom = tuning.marginBottom + inset;
  const ancestorTitles = new Map<number, string[]>();
  for (const member of tree.members) {
    if (!clan.isDisplayed(member.id) || !inScope(member.id)) continue;
    const generation = generations.get(member.id);
    if (generation === undefined || generation >= 0) continue;
    const title = member.title?.trim();
    if (!title) continue;
    const list = ancestorTitles.get(generation) ?? [];
    if (!list.includes(title)) list.push(title);
    ancestorTitles.set(generation, list);
  }
  const rowLabel = (generation: number) => {
    if (generation < 0) {
      const titles = ancestorTitles.get(generation) ?? [];
      return titles.length
        ? titles.slice(0, 2).join(" · ").toLocaleUpperCase("vi")
        : ancestorLabelFor(tuning.generationBandLabel, -generation);
    }
    return bandLabelFor(tuning.generationBandLabel, generation);
  };
  // Khổ A0: nhãn cách mép trong khung 2,5 cm (khoảng 73 đơn vị) và cách mép thẻ 2,5 cm.
  const labelGap = Math.round(73 * tuning.frameScale);
  const frameGuess = Math.round((FRAME_CORNER_CLEARANCE * tuning.frameScale * 92) / 180);
  const labelScaleFor = () => (tuning.generationLabelScale ?? 1) * GENERATION_LABEL_CARD_SCALE;
  const bandPillWidth = (label: string) => generationBandMetrics(label, labelScaleFor()).width;
  // Chừa đủ chỗ cho nhãn: khung + 2,5 cm + nhãn + 2,5 cm tới mép thẻ.
  const bandGutter = tree.design.showGenerationLabels
    ? Math.round(
        frameGuess +
          labelGap +
          Array.from(counts.keys()).reduce(
            (max, generation) => Math.max(max, bandPillWidth(rowLabel(generation))),
            0,
          ) +
          labelGap,
      )
    : 0;
  const marginLeft = Math.max(tuning.marginLeft + inset, bandGutter);
  const marginRight = Math.max(tuning.marginRight + inset, bandGutter);
  const orderSiblings = (list: Person[]) =>
    tuning.siblingOrder === "desc" ? [...list].reverse() : list;

  /**
   * Vợ/chồng cùng khối hiển thị: dâu/rể đứng cạnh người hôn phối, vợ/chồng
   * của tiền tổ cùng hàng tiền tổ cũng đứng cạnh nhau.
   */
  const isUnitSpouse = (person: Person, spouse: Person) => {
    if (!inScope(spouse.id)) return false;
    const role = clan.roleOf(spouse.id);
    if (role === "inLaw") return true;
    if (role === "ancestor" && clan.roleOf(person.id) === "ancestor") {
      return clan.ancestorTier.get(spouse.id) === clan.ancestorTier.get(person.id);
    }
    return false;
  };

  const rootCandidates = tree.members
    .filter((person) => {
      if (!inScope(person.id)) return false;
      const role = clan.roleOf(person.id);
      if (role !== "ancestor" && role !== "clan") return false;
      const parent = clan.lineParent(person);
      return !parent || !inScope(parent);
    })
    .sort(sortPersons);
  const rootIds = new Set(rootCandidates.map((person) => person.id));
  const absorbed = new Set<string>();
  for (const person of rootCandidates) {
    if (absorbed.has(person.id)) continue;
    for (const spouse of orderedSpouses(person, tree.members)) {
      if (spouse.id === person.id || !rootIds.has(spouse.id)) continue;
      if (!isUnitSpouse(person, spouse)) continue;
      absorbed.add(spouse.id);
    }
  }
  const roots = orderSiblings(rootCandidates.filter((person) => !absorbed.has(person.id)));

  const measure = (person: Person): Measure => {
    const generation = generations.get(person.id) ?? 1;
    const { width: cardW } = cardDimsFor(
      tree.design,
      generation,
      counts.get(generation),
      cardScale,
      topGenerations,
    );
    const spouses = orderedSpouses(person, tree.members).filter(
      (spouse) => inScope(spouse.id) && isUnitSpouse(person, spouse),
    );
    const children = orderSiblings(clan.clanChildren.get(person.id) ?? [])
      .filter((child) => inScope(child.id))
      .map(measure);
    const unitWidth = cardW + spouses.length * (SPOUSE_GAP + cardW);
    const childWidth =
      children.reduce((sum, c) => sum + c.width, 0) +
      Math.max(0, children.length - 1) * tuning.siblingGap;
    return { person, spouses, children, unitWidth, width: Math.max(unitWidth, childWidth) };
  };

  const measured = roots.map(measure);
  const nodes: TreeNode[] = [];

  const rowTop = new Map<number, number>();
  let rowCursor = marginTop;
  for (const generation of generationKeys) {
    rowTop.set(generation, rowCursor);
    rowCursor +=
      cardDimsFor(tree.design, generation, counts.get(generation), cardScale, topGenerations)
        .height + Math.max(tuning.generationGap, 36);
  }

  const place = (m: Measure, left: number) => {
    const unitLeft = left + (m.width - m.unitWidth) / 2;
    const generation = generations.get(m.person.id) ?? 1;
    const { width: cardW, height: cardH } = cardDimsFor(
      tree.design,
      generation,
      counts.get(generation),
      cardScale,
      topGenerations,
    );
    const y = rowTop.get(generation) ?? marginTop;
    const add = (person: Person, x: number, isSpouse: boolean) => {
      const role = clan.roleOf(person.id);
      nodes.push({
        id: person.id,
        x,
        y,
        width: cardW,
        height: cardH,
        generation,
        person,
        isSpouse,
        inLaw: role === "inLaw" || undefined,
        maternal: role === "maternal" || undefined,
        unitId: m.person.id,
      });
    };
    const sequence = unitSequence(m.person, m.spouses);
    sequence.forEach((person, i) =>
      add(person, unitLeft + i * (cardW + SPOUSE_GAP), person.id !== m.person.id),
    );

    if (m.children.length === 0) return;

    const memberIds = new Set([m.person.id, ...m.spouses.map((s) => s.id)]);
    const byMother = new Map<string, Measure[]>();
    for (const child of m.children) {
      const motherId = child.person.motherId;
      const key = motherId && memberIds.has(motherId) ? motherId : m.person.id;
      const list = byMother.get(key) ?? [];
      list.push(child);
      byMother.set(key, list);
    }
    const order = sequence.map((person) => person.id);
    const clusters = order
      .filter((key) => byMother.has(key))
      .map((key) => {
        const members = byMother.get(key)!;
        const width =
          members.reduce((sum, c) => sum + c.width, 0) +
          Math.max(0, members.length - 1) * tuning.siblingGap;
        return { key, members, width };
      });

    const unitCenter = (key: string) => {
      const idx = order.indexOf(key);
      return unitLeft + idx * (cardW + SPOUSE_GAP) + cardW / 2;
    };

    const ideal = clusters.map((cl) => unitCenter(cl.key) - cl.width / 2);
    const resolved: number[] = [];
    let prevRight = Number.NEGATIVE_INFINITY;
    let overflow = false;
    for (let i = 0; i < clusters.length; i++) {
      const minX = prevRight === Number.NEGATIVE_INFINITY ? ideal[i] : prevRight + tuning.branchGap;
      const x = Math.max(ideal[i], minX, left);
      resolved.push(x);
      prevRight = x + clusters[i].width;
    }
    const span = prevRight - resolved[0];
    if (span > m.width + 0.5) overflow = true;
    const offset = overflow ? 0 : left + (m.width - span) / 2 - resolved[0];
    const packedWidth =
      clusters.reduce((sum, c) => sum + c.width, 0) +
      Math.max(0, clusters.length - 1) * tuning.branchGap;

    // Khi các cụm con (theo mẹ) cần khoảng branchGap lớn hơn siblingGap đã đo,
    // mở rộng băng tần của cha để tránh đẩy con lệch khỏi vùng căn giữa.
    const effectiveWidth = Math.max(m.width, packedWidth);
    let cursor = left + (effectiveWidth - packedWidth) / 2;
    clusters.forEach((cl, i) => {
      let inner = overflow ? cursor : resolved[i] + offset;
      for (const child of cl.members) {
        place(child, inner);
        inner += child.width + tuning.siblingGap;
      }
      cursor = (overflow ? cursor : resolved[i] + offset) + cl.width + tuning.branchGap;
    });
  };

  let cursor = marginLeft;
  for (const m of measured) {
    place(m, cursor);
    cursor += m.width + tuning.branchGap;
  }

  if (nodes.length === 0) {
    return {
      nodes: [],
      edges: [],
      generations: [],
      topGenerations: [],
      width: marginLeft + marginRight,
      height: marginTop + marginBottom,
    };
  }

  // Phạm vi chi luôn xếp lại từ đầu để bản xem chi gọn, không phụ thuộc vị trí
  // kéo tay của phả đồ toàn dòng họ.
  const overriddenGenerations = new Set<number>();
  if (!scopeIds) {
    // Áp vị trí đã lưu theo cả cụm vợ/chồng: một thẻ lệch thì cả cụm dịch theo,
    // tránh trường hợp dữ liệu cũ làm vợ/chồng chồng lên nhau. Chỉ nhận trục x
    // vì thẻ chỉ được di chuyển ngang, và giữ nguyên hàng đời để không đè nhãn đời.
    const units = new Map<string, TreeNode[]>();
    for (const node of nodes) {
      const list = units.get(node.unitId) ?? [];
      list.push(node);
      units.set(node.unitId, list);
    }
    const autoX = new Map(nodes.map((node) => [node.id, node.x]));
    for (const [unitId, members] of units) {
      const owner = members.find((member) => member.id === unitId) ?? members[0];
      const ownerOverride = tree.positions[owner.id];
      let shift: number | undefined;
      if (ownerOverride) {
        shift = ownerOverride.x - owner.x;
      } else {
        for (const member of members) {
          const override = tree.positions[member.id];
          if (!override) continue;
          shift = override.x - member.x;
          break;
        }
      }
      if (shift === undefined || !Number.isFinite(shift)) continue;
      for (const member of members) member.x += shift;
    }

    // Vị trí đã lưu từ bản cũ có thể để hai cụm cùng đời chồng nhau; xếp lại theo
    // thứ tự ngang và phân phối đều khoảng trống để không chèn vào cụm khác.
    for (const node of nodes) {
      if (tree.positions[node.id]) overriddenGenerations.add(node.generation);
    }

    // Nguyên tắc chung cho mọi bố cục: con của cùng một cặp cha mẹ luôn đứng
    // liền nhau trong hàng đời. Vị trí lưu từ bản cũ có thể đặt một cụm (thẻ
    // đơn hoặc vợ/chồng) vào giữa cụm anh em của gia đình khác; khi phát hiện
    // xen kẽ, bỏ vị trí đã lưu của cả đời đó để hàng trở về thứ tự tự xếp.
    for (const generation of overriddenGenerations) {
      const rowUnits = Array.from(units.entries())
        .filter(([, members]) => members[0]?.generation === generation)
        .map(([unitId, members]) => ({
          unitId,
          left: Math.min(...members.map((member) => member.x)),
        }))
        .sort((a, b) => a.left - b.left);
      const unitOrder = new Map(rowUnits.map((unit, index) => [unit.unitId, index]));
      let interleaved = false;
      for (const children of clan.clanChildren.values()) {
        const indices = children
          .map((child) => unitOrder.get(child.id))
          .filter((index): index is number => index !== undefined);
        if (indices.length < 2) continue;
        const span = Math.max(...indices) - Math.min(...indices) + 1;
        if (span !== indices.length) {
          interleaved = true;
          break;
        }
      }
      if (!interleaved) continue;
      for (const [unitId, members] of units) {
        if (!unitOrder.has(unitId)) continue;
        for (const member of members) {
          const base = autoX.get(member.id);
          if (base !== undefined) member.x = base;
        }
      }
      overriddenGenerations.delete(generation);
    }

    for (const generation of overriddenGenerations) {
      const rows = Array.from(units.values())
        .filter((members) => members[0]?.generation === generation)
        .map((members) => ({
          members,
          left: Math.min(...members.map((member) => member.x)),
          right: Math.max(...members.map((member) => member.x + member.width)),
        }))
        .sort((a, b) => a.left - b.left);
      
      if (rows.length === 0) continue;
      
      // Tính tổng chiều rộng cần thiết và khoảng trống có sẵn
      const totalWidth = rows.reduce((sum, r) => sum + (r.right - r.left), 0);
      const totalGaps = (rows.length - 1) * 12;
      const rightmost = rows[rows.length - 1].right;
      const leftmost = rows[0].left;
      const span = rightmost - leftmost;
      const neededWidth = totalWidth + totalGaps;
      
      if (span >= neededWidth) {
        // Không có va chạm, chỉ cần đảm bảo khoảng cách tối thiểu
        let cursor = bandGutter;
        for (const row of rows) {
          const target = Math.max(row.left, cursor);
          const adjust = target - row.left;
          if (adjust > 0) {
            for (const member of row.members) member.x += adjust;
          }
          cursor = row.right + adjust + 12;
        }
      } else {
        // Có va chạm hoặc không đủ chỗ - phân phối đều từ bandGutter
        const availableWidth = Math.max(span, neededWidth);
        const extraSpace = availableWidth - totalWidth;
        const gapSize = rows.length > 1 ? extraSpace / (rows.length - 1) : 0;
        
        let cursor = Math.max(bandGutter, leftmost);
        for (let i = 0; i < rows.length; i++) {
          const row = rows[i];
          const target = cursor;
          const adjust = target - row.left;
          for (const member of row.members) member.x += adjust;
          cursor = row.right + adjust + gapSize;
        }
      }
    }
  }
  if (bandGutter > 0) {
    const minX = Math.min(...nodes.map((node) => node.x));
    if (minX < bandGutter) {
      const adjust = bandGutter - minX;
      for (const node of nodes) node.x += adjust;
    }
  }

  // Nguyên tắc chung cho cả hai bố cục: các đời tiền tổ xuống tới đời 1 ưu tiên
  // nằm giữa trang. Hàng đã được người dùng kéo (vị trí lưu hợp lệ) giữ nguyên.
  centerTopRows(nodes, marginLeft, marginRight, scopeIds ? undefined : overriddenGenerations);

  // Đường ngang chỉ được xếp lớp trong khoảng giữa hai đời; nếu thiếu chỗ thì nới
  // khoảng cách đời rồi dựng lại đường nối.
  let edgeBuild = buildEdges(nodes, clan, tuning);
  if (edgeBuild.extraGap.size > 0) {
    applyGapExpansion(nodes, rowTop, edgeBuild.extraGap);
    edgeBuild = buildEdges(nodes, clan, tuning);
  }
  const edges = edgeBuild.edges;
  const genRows = generationKeys.map((generation) => {
    const label = rowLabel(generation);
    return {
      generation,
      count: nodes.filter((n) => n.generation === generation).length,
      y: rowTop.get(generation) ?? marginTop,
      label,
      isAncestor: generation < 0,
    };
  });
  const width = Math.max(...nodes.map((n) => n.x + n.width)) + marginRight;
  const height = Math.max(...nodes.map((n) => n.y + n.height)) + marginBottom;
  return {
    nodes,
    edges,
    generations: genRows,
    topGenerations,
    width: Math.max(width, marginLeft + marginRight),
    height: Math.max(height, marginTop + marginBottom),
  };
}

/**
 * Bố cục cân đối: căn theo đời có số thành viên nhiều nhất (thường là đời cuối).
 * Dàn đều đời rộng nhất cho hết chiều rộng khu vực hiển thị (giữa 2 nhãn đời).
 */
export function computeLayoutBalanced(
  tree: FamilyTree,
  scopeIds?: Set<string> | null,
): TreeLayout {
  // Chạy layout mặc định trước để có cấu trúc cơ bản
  const base = computeLayoutTopDown(tree, scopeIds);
  if (base.nodes.length === 0) return base;

  const tuning = normalizeTuning(tree.design.tuning);
  const inset = Math.round(FRAME_CORNER_CLEARANCE * tuning.frameScale);

  // Tính chiều rộng trang theo đơn vị layout
  const { widthMm } = paperDimensions(tree);
  const pageWidthUnits = widthMm * PAPER_UNITS_PER_MM;

  // Tính lại marginLeft và marginRight giống như computeLayoutTopDown
  const counts = new Map<number, number>();
  const clan = classifyClan(tree.members, tree.founderId);
  const generations = computeGenerations(tree.members, tree.founderId);
  const inScope = (id: string) => !scopeIds || scopeIds.has(id);
  for (const member of tree.members) {
    if (!clan.isDisplayed(member.id) || !inScope(member.id)) continue;
    const generation = generations.get(member.id) ?? 1;
    counts.set(generation, (counts.get(generation) ?? 0) + 1);
  }

  const frameGuess = Math.round((FRAME_CORNER_CLEARANCE * tuning.frameScale * 92) / 180);
  const labelGap = Math.round(73 * tuning.frameScale);
  const labelScaleFor = () => (tuning.generationLabelScale ?? 1) * GENERATION_LABEL_CARD_SCALE;
  const bandPillWidth = (label: string) => generationBandMetrics(label, labelScaleFor()).width;

  const rowLabel = (generation: number) => {
    if (generation < 0) {
      return ancestorLabelFor(tuning.generationBandLabel, -generation);
    }
    return bandLabelFor(tuning.generationBandLabel, generation);
  };

  const bandGutter = tree.design.showGenerationLabels
    ? Math.round(
        frameGuess +
          labelGap +
          Array.from(counts.keys()).reduce(
            (max, generation) => Math.max(max, bandPillWidth(rowLabel(generation))),
            0,
          ) +
          labelGap,
      )
    : 0;

  const marginLeft = Math.max(tuning.marginLeft + inset, bandGutter);
  const marginRight = Math.max(tuning.marginRight + inset, bandGutter);

  // Chiều rộng khả dụng giữa hai nhãn đời
  const availableWidth = pageWidthUnits - marginLeft - marginRight;

  // Tìm đời có số thành viên nhiều nhất
  const genCounts = new Map<number, number>();
  for (const node of base.nodes) {
    genCounts.set(node.generation, (genCounts.get(node.generation) ?? 0) + 1);
  }
  let widestGen = 0;
  let maxCount = 0;
  for (const [gen, count] of genCounts) {
    if (count > maxCount) {
      maxCount = count;
      widestGen = gen;
    }
  }

  const nodeById = new Map(base.nodes.map((n) => [n.id, n]));

  // Lấy các node của đời rộng nhất, nhóm theo unitId (vợ chồng là 1 khối)
  const widestNodes = base.nodes
    .filter((n) => n.generation === widestGen)
    .sort((a, b) => a.x - b.x);

  const unitMap = new Map<string, TreeNode[]>();
  for (const node of widestNodes) {
    const list = unitMap.get(node.unitId) ?? [];
    list.push(node);
    unitMap.set(node.unitId, list);
  }

  const widestUnits: LayoutUnit[] = Array.from(unitMap.entries())
    .map(([unitId, nodes]) => {
      const sorted = [...nodes].sort((a, b) => a.x - b.x);
      const left = sorted[0].x;
      const right = Math.max(...sorted.map((n) => n.x + n.width));
      return {
        unitId,
        nodes: sorted,
        totalWidth: right - left,
        left,
        owner: sorted.find((n) => n.id === unitId) ?? sorted[0],
      };
    })
    .sort((a, b) => a.left - b.left);

  // Con ruột của cùng một cặp cha mẹ (và cùng mẹ) đi liền nhau. Chỉ dàn khoảng trống
  // giữa các cụm thay vì rải đều từng thẻ, nhờ vậy con vẫn nằm sát dưới cha mẹ.
  const widestClusterKey = new Map<string, string>();
  for (const unit of widestUnits) {
    const parentId = clan.lineParent(unit.owner.person);
    const parentNode = parentId ? nodeById.get(parentId) : undefined;
    if (!parentNode) {
      widestClusterKey.set(unit.unitId, `solo-${unit.unitId}`);
      continue;
    }
    const motherId = unit.owner.person.motherId;
    const motherNode = motherId ? nodeById.get(motherId) : undefined;
    const sameUnitMother =
      motherNode && motherNode.unitId === parentNode.unitId ? motherId : undefined;
    widestClusterKey.set(
      unit.unitId,
      sameUnitMother ? `${parentNode.unitId}@${sameUnitMother}` : parentNode.unitId,
    );
  }
  const widestClusters: LayoutUnit[][] = [];
  const widestClusterIndex = new Map<string, number>();
  for (const unit of widestUnits) {
    const key = widestClusterKey.get(unit.unitId) ?? unit.unitId;
    let index = widestClusterIndex.get(key);
    if (index === undefined) {
      index = widestClusters.length;
      widestClusterIndex.set(key, index);
      widestClusters.push([]);
    }
    widestClusters[index].push(unit);
  }
  const clusterWidth = (cluster: LayoutUnit[]) =>
    cluster.reduce((sum, unit) => sum + unit.totalWidth, 0) +
    Math.max(0, cluster.length - 1) * tuning.siblingGap;
  const widestClusterWidths = widestClusters.map(clusterWidth);
  const totalWidestWidth = widestClusterWidths.reduce((a, b) => a + b, 0);
  const clusterSlots = Math.max(0, widestClusters.length - 1);
  const clusterGap =
    clusterSlots === 0
      ? 0
      : Math.max(tuning.branchGap, (availableWidth - totalWidestWidth) / clusterSlots);

  const unitLeftMap = new Map<string, number>();
  let cursor =
    clusterSlots === 0
      ? marginLeft + Math.max(0, (availableWidth - totalWidestWidth) / 2)
      : marginLeft;
  for (const cluster of widestClusters) {
    let inner = cursor;
    cluster.forEach((unit, index) => {
      unitLeftMap.set(unit.unitId, inner);
      inner += unit.totalWidth;
      if (index < cluster.length - 1) inner += tuning.siblingGap;
    });
    cursor = inner + clusterGap;
  }

  // Dịch chuyển các node: mỗi unit bắt đầu tại vị trí mới, vợ chồng giữ nguyên khoảng cách
  for (const node of base.nodes) {
    if (node.generation !== widestGen) continue;
    const unitLeft = unitLeftMap.get(node.unitId);
    if (unitLeft === undefined) continue;
    const sorted = [...(unitMap.get(node.unitId) ?? [])].sort((a, b) => a.x - b.x);
    const index = sorted.findIndex((n) => n.id === node.id);
    const offsetInUnit = sorted
      .slice(0, index)
      .reduce((sum, n) => sum + n.width + SPOUSE_GAP, 0);
    node.x = unitLeft + offsetInUnit;
  }

  // Đời dưới đời rộng nhất (hiếm): giữ nguyên hình dạng cây, dịch theo cha mẹ
  // để không lệch khỏi đời trên.
  const dxByUnit = new Map<string, number>();
  for (const unit of widestUnits) {
    dxByUnit.set(unit.unitId, (unitLeftMap.get(unit.unitId) ?? unit.left) - unit.left);
  }
  const gensBelow = Array.from(new Set(base.nodes.map((n) => n.generation)))
    .filter((generation) => generation > widestGen)
    .sort((a, b) => a - b);
  for (const generation of gensBelow) {
    const unitsInGen = new Map<string, TreeNode[]>();
    for (const n of base.nodes) {
      if (n.generation !== generation) continue;
      const list = unitsInGen.get(n.unitId) ?? [];
      list.push(n);
      unitsInGen.set(n.unitId, list);
    }
    for (const [unitId, members] of unitsInGen) {
      const owner = members.find((m) => m.id === unitId) ?? members[0];
      const parentId = clan.lineParent(owner.person);
      const parentNode = parentId ? nodeById.get(parentId) : undefined;
      const dx = parentNode ? (dxByUnit.get(parentNode.unitId) ?? 0) : 0;
      dxByUnit.set(unitId, dx);
      for (const member of members) member.x += dx;
    }
  }

  const unitNodesMap = new Map<string, TreeNode[]>();
  for (const n of base.nodes) {
    const list = unitNodesMap.get(n.unitId) ?? [];
    list.push(n);
    unitNodesMap.set(n.unitId, list);
  }
  const childrenUnitsOf = new Map<string, Set<string>>();
  for (const n of base.nodes) {
    const parent = clan.lineParent(n.person);
    if (!parent) continue;
    const parentNode = nodeById.get(parent);
    if (!parentNode || parentNode.unitId === n.unitId) continue;
    const set = childrenUnitsOf.get(parentNode.unitId) ?? new Set<string>();
    set.add(n.unitId);
    childrenUnitsOf.set(parentNode.unitId, set);
  }

  // Các đời phía trên: kéo về tâm cụm con nhưng không bắt buộc căn giữa tuyệt đối.
  // Xếp theo đúng thứ tự, giữ khoảng tối thiểu để thẻ không chồng nhau; đơn vị không
  // có con bám theo hàng xóm thay vì giữ toạ độ cũ đã lệch khỏi đời dưới.
  const gensAbove = Array.from(new Set(base.nodes.map((n) => n.generation)))
    .filter((generation) => generation < widestGen)
    .sort((a, b) => b - a);

  for (const generation of gensAbove) {
    const unitsInGen = new Map<string, TreeNode[]>();
    for (const n of base.nodes) {
      if (n.generation !== generation) continue;
      const list = unitsInGen.get(n.unitId) ?? [];
      list.push(n);
      unitsInGen.set(n.unitId, list);
    }
    const rowUnits: LayoutUnit[] = Array.from(unitsInGen.entries())
      .map(([unitId, members]) => {
        const sorted = [...members].sort((a, b) => a.x - b.x);
        const left = Math.min(...members.map((m) => m.x));
        const right = Math.max(...members.map((m) => m.x + m.width));
        return {
          unitId,
          nodes: sorted,
          totalWidth: right - left,
          left,
          owner: sorted.find((m) => m.id === unitId) ?? sorted[0],
        };
      })
      .sort((a, b) => a.left - b.left);
    if (rowUnits.length === 0) continue;

    const unitParentId = (unit: LayoutUnit) => {
      const parentId = clan.lineParent(unit.owner.person);
      return parentId ? nodeById.get(parentId)?.unitId : undefined;
    };
    // Anh em ruột đứng sát nhau, giữa các gia đình khác thì cách xa hơn.
    const pairGap = rowUnits.map((unit, index) => {
      if (index === 0) return 0;
      const previousParent = unitParentId(rowUnits[index - 1]);
      const parent = unitParentId(unit);
      return previousParent !== undefined && previousParent === parent
        ? tuning.siblingGap
        : tuning.branchGap;
    });

    const childIdeal = (unit: LayoutUnit): number | undefined => {
      const childUnitIds = childrenUnitsOf.get(unit.unitId);
      if (!childUnitIds || childUnitIds.size === 0) return undefined;
      let min = Number.POSITIVE_INFINITY;
      let max = Number.NEGATIVE_INFINITY;
      for (const childUnitId of childUnitIds) {
        for (const member of unitNodesMap.get(childUnitId) ?? []) {
          min = Math.min(min, member.x);
          max = Math.max(max, member.x + member.width);
        }
      }
      if (!Number.isFinite(min) || !Number.isFinite(max)) return undefined;
      return (min + max) / 2 - unit.totalWidth / 2;
    };

    const resolved: number[] = rowUnits.map(() => 0);
    let lastAnchor = -1;
    for (let i = 0; i < rowUnits.length; i++) {
      const anchor = childIdeal(rowUnits[i]);
      if (anchor === undefined) continue;
      resolved[i] = anchor;
      if (lastAnchor < 0) {
        // Dải đầu hàng: lùi dần từ mốc đầu tiên.
        let left = anchor;
        for (let j = i - 1; j >= 0; j--) {
          left -= rowUnits[j].totalWidth + pairGap[j + 1];
          resolved[j] = left;
        }
      } else if (i > lastAnchor + 1) {
        // Nội suy đều cho các đơn vị không có con nằm giữa hai mốc.
        const start =
          resolved[lastAnchor] + rowUnits[lastAnchor].totalWidth + pairGap[lastAnchor + 1];
        const end = anchor - pairGap[i];
        const widths = rowUnits
          .slice(lastAnchor + 1, i)
          .reduce((sum, unit) => sum + unit.totalWidth, 0);
        const step = Math.max(0, end - start - widths) / (i - lastAnchor);
        let left = start + step;
        for (let j = lastAnchor + 1; j < i; j++) {
          resolved[j] = left;
          left += rowUnits[j].totalWidth + step;
        }
      }
      lastAnchor = i;
    }
    if (lastAnchor < 0) {
      // Cả hàng không có dữ liệu con: giữ tương đối như bố cục top-down.
      rowUnits.forEach((unit, index) => {
        resolved[index] = unit.left;
      });
    } else {
      let left = resolved[lastAnchor] + rowUnits[lastAnchor].totalWidth;
      for (let j = lastAnchor + 1; j < rowUnits.length; j++) {
        left += pairGap[j] + rowUnits[j].totalWidth;
        resolved[j] = left - rowUnits[j].totalWidth;
      }
    }

    const packed: number[] = [];
    let packedEnd = Number.NEGATIVE_INFINITY;
    for (let i = 0; i < rowUnits.length; i++) {
      const left = Math.max(resolved[i], packedEnd + (i === 0 ? 0 : pairGap[i]));
      packed.push(left);
      packedEnd = left + rowUnits[i].totalWidth;
    }
    const idealMean =
      rowUnits.reduce((sum, unit, i) => sum + resolved[i] + unit.totalWidth / 2, 0) /
      rowUnits.length;
    const packedMean =
      rowUnits.reduce((sum, unit, i) => sum + packed[i] + unit.totalWidth / 2, 0) /
      rowUnits.length;
    const offset = idealMean - packedMean;
    rowUnits.forEach((unit, i) => {
      const dx = packed[i] + offset - unit.left;
      if (!Number.isFinite(dx) || Math.abs(dx) < 0.01) return;
      for (const member of unit.nodes) member.x += dx;
    });
  }

  // Đảm bảo không có node nào bị đẩy ra ngoài lề
  const finalMinX = Math.min(...base.nodes.map((n) => n.x));
  const finalMaxX = Math.max(...base.nodes.map((n) => n.x + n.width));
  if (finalMinX < marginLeft) {
    const adjust = marginLeft - finalMinX;
    for (const node of base.nodes) {
      node.x += adjust;
    }
  }
  if (finalMaxX > pageWidthUnits - marginRight) {
    const adjust = finalMaxX - (pageWidthUnits - marginRight);
    for (const node of base.nodes) {
      node.x -= adjust;
    }
  }

  // Cùng nguyên tắc với bố cục từ trên xuống: các đời tiền tổ → đời 1 nằm giữa trang.
  centerTopRows(base.nodes, marginLeft, marginRight);

  // Tính lại chiều rộng và cạnh
  let edgeBuild = buildEdges(base.nodes, clan, tuning);
  if (edgeBuild.extraGap.size > 0) {
    const rowTops = new Map(base.generations.map((row) => [row.generation, row.y]));
    applyGapExpansion(base.nodes, rowTops, edgeBuild.extraGap);
    for (const row of base.generations) {
      row.y = rowTops.get(row.generation) ?? row.y;
    }
    edgeBuild = buildEdges(base.nodes, clan, tuning);
  }
  const edges = edgeBuild.edges;
  const genRows = base.generations;
  const width = Math.max(...base.nodes.map((n) => n.x + n.width)) + marginRight;
  const height = Math.max(...base.nodes.map((n) => n.y + n.height)) + tuning.marginBottom + inset;

  return {
    nodes: base.nodes,
    edges,
    generations: genRows,
    topGenerations: base.topGenerations,
    width: Math.max(width, marginLeft + marginRight),
    height: Math.max(height, tuning.marginTop + tuning.marginBottom + inset * 2),
  };
}

interface ChildBarPlan {
  key: string;
  bandKey: string;
  kind: "main" | "mother";
  /** Gia đình mà nét phụ này bám theo; nét chính không đổi khi ẩn/hiện nét mẹ. */
  mainKey?: string;
  fromId?: string;
  secondary?: boolean;
  startX: number;
  startY: number;
  minTop: number;
  barMin: number;
  barMax: number;
  generation: number;
  drops: { node: TreeNode; x: number }[];
  level: number;
  y: number;
}

interface EdgeBuildResult {
  edges: TreeEdge[];
  /** Đời con → chiều cao còn thiếu để xếp các đường ngang mà không chồng nhau. */
  extraGap: Map<number, number>;
}

/** Dịch các hàng đời phía dưới xuống khi cần thêm chỗ cho đường ngang. */
function applyGapExpansion(
  nodes: TreeNode[],
  rowTops: Map<number, number>,
  extraGap: Map<number, number>,
) {
  if (extraGap.size === 0) return;
  const generations = Array.from(extraGap.keys()).sort((a, b) => a - b);
  for (const generation of generations) {
    const delta = extraGap.get(generation) ?? 0;
    if (delta <= 0) continue;
    for (const [rowGeneration, y] of rowTops) {
      if (rowGeneration >= generation) rowTops.set(rowGeneration, y + delta);
    }
    for (const node of nodes) {
      if (node.generation >= generation) node.y += delta;
    }
  }
}

function buildEdges(
  nodes: TreeNode[],
  clan: ClanIndex,
  tuning: ReturnType<typeof normalizeTuning>,
): EdgeBuildResult {
  const edges: TreeEdge[] = [];
  const lineParent = clan.lineParent;
  const nodeById = new Map(nodes.map((n) => [n.id, n]));
  const units = new Map<string, TreeNode[]>();
  for (const node of nodes) {
    const list = units.get(node.unitId) ?? [];
    list.push(node);
    units.set(node.unitId, list);
  }
  for (const list of units.values()) {
    const ordered = [...list].sort((a, b) => a.x - b.x);
    for (let i = 0; i < ordered.length - 1; i++) {
      const a = ordered[i];
      const b = ordered[i + 1];
      edges.push({
        id: `sp-${a.id}-${b.id}`,
        type: "spouse",
        x1: a.x + a.width,
        y1: a.y + a.height / 2,
        x2: b.x,
        y2: b.y + b.height / 2,
        generation: a.generation,
      });
    }
  }

  const childGroups = new Map<string, TreeNode[]>();
  for (const node of nodes) {
    if (node.isSpouse) continue;
    const parent = lineParent(node.person);
    if (!parent) continue;
    const parentNode = nodeById.get(parent);
    if (!parentNode) continue;
    if (isIndirectLink(node.person) && node.person.ancestorLinkId === parent) {
      const startX = parentNode.x + parentNode.width / 2;
      const startY = parentNode.y + parentNode.height;
      const endX = node.x + node.width / 2;
      const endY = node.y;
      const midY = startY + Math.max(16, (endY - startY) / 2);
      const label = linkLabel(node.person);
      const base = {
        type: "child" as const,
        generation: node.generation,
        subjectId: node.id,
        fromId: parentNode.id,
        toId: node.id,
        indirect: true,
        maternal: node.maternal,
      };
      if (Math.abs(startX - endX) < 1) {
        edges.push({
          ...base,
          id: `ind-${parent}-${node.id}-v`,
          x1: startX,
          y1: startY,
          x2: endX,
          y2: endY,
          label,
        });
      } else {
        edges.push({
          ...base,
          id: `ind-${parent}-${node.id}-a`,
          x1: startX,
          y1: startY,
          x2: startX,
          y2: midY,
        });
        edges.push({
          ...base,
          id: `ind-${parent}-${node.id}-b`,
          x1: startX,
          y1: midY,
          x2: endX,
          y2: midY,
          label,
        });
        edges.push({
          ...base,
          id: `ind-${parent}-${node.id}-c`,
          x1: endX,
          y1: midY,
          x2: endX,
          y2: endY,
        });
      }
      continue;
    }
    const list = childGroups.get(parentNode.id) ?? [];
    list.push(node);
    childGroups.set(parentNode.id, list);
  }

  // Mỗi gia đình có một đường ngang (bus) nối cha/mẹ với các con. Đường ngang luôn
  // nằm trong khoảng giữa hai đời, giữ đoạn dọc từ cha/mẹ xuống và từ đường ngang vào con.
  const stub = Math.max(12, tuning.connectorWidth * 2);
  const directLinks: {
    id: string;
    startX: number;
    startY: number;
    endX: number;
    node: TreeNode;
  }[] = [];
  const bars: ChildBarPlan[] = [];

  for (const [parentId, kids] of childGroups) {
    const parentNode = nodeById.get(parentId);
    if (!parentNode) continue;
    const unit = units.get(parentNode.unitId) ?? [parentNode];
    const unitById = new Map(unit.map((n) => [n.id, n]));
    const fatherNode =
      parentNode.person.gender === "male"
        ? parentNode
        : (unit.find((n) => n.person.gender === "male") ?? parentNode);
    const sorted = [...kids].sort((a, b) => a.x - b.x);
    const startX = fatherNode.x + fatherNode.width / 2;
    const startY = fatherNode.y + fatherNode.height;
    const minTop = Math.min(...sorted.map((n) => n.y));
    const siblingGeneration = sorted[0].generation;
    const bandKey = `${startY.toFixed(2)}:${minTop.toFixed(2)}`;
    const mainKey = `ch-${parentId}`;
    const wivesInUnit = unit.filter((n) => n.person.gender === "female");
    const motherLines = tuning.motherLine && wivesInUnit.length > 1;

    const only = sorted[0];
    if (sorted.length === 1 && Math.abs(startX - (only.x + only.width / 2)) < 1) {
      directLinks.push({
        id: `ch-${parentId}-${only.id}-v`,
        startX,
        startY,
        endX: only.x + only.width / 2,
        node: only,
      });
    } else {
      const centers = sorted.map((n) => n.x + n.width / 2);
      bars.push({
        key: mainKey,
        bandKey,
        kind: "main",
        startX,
        startY,
        minTop,
        barMin: Math.min(startX, ...centers),
        barMax: Math.max(startX, ...centers),
        generation: siblingGeneration,
        drops: sorted.map((node) => ({ node, x: node.x + node.width / 2 })),
        level: 0,
        y: 0,
      });
    }

    if (!motherLines) continue;

    const byMother = new Map<TreeNode, TreeNode[]>();
    for (const node of sorted) {
      const motherId = node.person.motherId;
      const mother = motherId ? unitById.get(motherId) : undefined;
      if (!mother || mother.id === fatherNode.id) continue;
      const list = byMother.get(mother) ?? [];
      list.push(node);
      byMother.set(mother, list);
    }
    for (const [mother, members] of byMother) {
      const motherX = mother.x + mother.width / 2;
      const motherY = mother.y + mother.height;
      if (motherY >= minTop - stub) continue;
      // Nét mẹ-con lệch 8 đơn vị để phân biệt với nét của hàng con, dù cắt qua nét chính.
      const drops = members.map((n) => ({ node: n, x: n.x + n.width / 2 + 8 }));
      bars.push({
        key: `sm-${mother.id}`,
        bandKey,
        kind: "mother",
        mainKey: `ch-${parentId}`,
        fromId: mother.id,
        secondary: true,
        startX: motherX,
        startY: motherY,
        minTop,
        barMin: Math.min(motherX, ...drops.map((drop) => drop.x)),
        barMax: Math.max(motherX, ...drops.map((drop) => drop.x)),
        generation: members[0].generation,
        drops,
        level: 0,
        y: 0,
      });
    }
  }

  // Xếp lớp các đường ngang theo từng dải giữa hai đời: hai đường ngang cắt nhau
  // theo trục x mới phải khác tầng; đường không xung đột giữ nguyên một tầng.
  const barsByBand = new Map<string, ChildBarPlan[]>();
  for (const bar of bars) {
    const list = barsByBand.get(bar.bandKey) ?? [];
    list.push(bar);
    barsByBand.set(bar.bandKey, list);
  }
  const extraGap = new Map<number, number>();
  const separation = Math.max(14, tuning.connectorWidth * 3);
  const clearance = Math.max(4, tuning.connectorWidth);

  for (const group of barsByBand.values()) {
    const occupancy: { min: number; max: number }[][] = [];
    const levelByKey = new Map<string, number>();
    const assign = (bar: ChildBarPlan, minLevel: number) => {
      let level = minLevel;
      for (;;) {
        const row = occupancy[level] ?? [];
        const clash = row.some(
          (span) => !(bar.barMax + clearance < span.min || bar.barMin - clearance > span.max),
        );
        if (!clash) break;
        level += 1;
      }
      (occupancy[level] ??= []).push({ min: bar.barMin, max: bar.barMax });
      bar.level = level;
      levelByKey.set(bar.key, level);
    };
    const mains = group
      .filter((bar) => bar.kind === "main")
      .sort((a, b) => a.barMin - b.barMin);
    for (const bar of mains) assign(bar, 0);

    // Chỉ nét chính tham gia xếp lớp nên ẩn/hiện nét mẹ–con không đổi tầng, không
    // kéo giãn dải đời; nét mẹ–con được vẽ thêm ngay dưới nét chính cùng gia đình.
    const maxLevel = occupancy.reduce((max, row, index) => (row.length > 0 ? index : max), 0);
    const sample = group[0];
    const bandHeight = sample.minTop - sample.startY;
    const needed = 2 * stub + maxLevel * separation;
    if (needed > bandHeight) {
      extraGap.set(
        sample.generation,
        Math.max(extraGap.get(sample.generation) ?? 0, needed - bandHeight),
      );
    }
    const usable = Math.max(needed, bandHeight);
    const top = sample.startY + stub + Math.max(0, (usable - needed) / 2);
    for (const bar of mains) bar.y = top + bar.level * separation;
    // Nét mẹ–con: mỗi mẹ chỉ nối con của bà ấy. Các nét ngang của những mẹ khác nhau
    // xếp so le theo tầng khi khoảng x chồng nhau, để không dính thành một đường
    // chung đi qua con của mẹ khác; vẫn giữ sát nét chính cùng gia đình.
    const motherStep = Math.max(6, Math.round(separation / 2));
    const motherRows: { min: number; max: number }[][] = [];
    const mothers = group
      .filter((bar) => bar.kind === "mother")
      .sort((a, b) => a.barMin - b.barMin);
    for (const bar of mothers) {
      const mainLevel = bar.mainKey ? levelByKey.get(bar.mainKey) : undefined;
      const anchor = mainLevel === undefined ? top : top + mainLevel * separation;
      let row = 0;
      for (;;) {
        const clash = (motherRows[row] ?? []).some(
          (span) => !(bar.barMax + clearance < span.min || bar.barMin - clearance > span.max),
        );
        if (!clash) break;
        row += 1;
      }
      (motherRows[row] ??= []).push({ min: bar.barMin, max: bar.barMax });
      bar.y = Math.min(anchor + motherStep * (row + 1), bar.minTop - stub);
    }
  }

  for (const link of directLinks) {
    edges.push({
      id: link.id,
      type: "child",
      x1: link.startX,
      y1: link.startY,
      x2: link.endX,
      y2: link.node.y,
      generation: link.node.generation,
      subjectId: link.node.id,
      maternal: link.node.maternal,
    });
  }

  for (const bar of bars) {
    const common = {
      type: "child" as const,
      generation: bar.generation,
      ...(bar.fromId ? { fromId: bar.fromId } : {}),
      ...(bar.secondary ? { secondary: true } : {}),
    };
    edges.push({
      ...common,
      id: `${bar.key}-trunk`,
      x1: bar.startX,
      y1: bar.startY,
      x2: bar.startX,
      y2: bar.y,
    });
    if (Math.abs(bar.barMax - bar.barMin) > 0.5) {
      edges.push({
        ...common,
        id: `${bar.key}-bar`,
        x1: bar.barMin,
        y1: bar.y,
        x2: bar.barMax,
        y2: bar.y,
      });
    }
    for (const drop of bar.drops) {
      edges.push({
        ...common,
        id: `${bar.key}-${drop.node.id}-d`,
        x1: drop.x,
        y1: bar.y,
        x2: drop.x,
        y2: drop.node.y,
        generation: drop.node.generation,
        subjectId: drop.node.id,
        maternal: drop.node.maternal,
      });
    }
  }

  return { edges, extraGap };
}

function unitSequence(person: Person, spouses: Person[]): Person[] {
  if (person.gender === "female") return [person, ...spouses];
  const wives = spouses.filter((spouse) => spouse.gender === "female");
  const rest = spouses.filter((spouse) => spouse.gender !== "female");
  return [...wives.reverse(), person, ...rest];
}
