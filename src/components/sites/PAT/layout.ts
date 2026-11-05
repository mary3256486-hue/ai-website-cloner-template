import type { FamilyTree, Person, TreeEdge, TreeLayout, TreeNode } from "./types";
import { ancestorLabelFor, bandLabelFor, cardDimsFor, normalizeTuning, SPOUSE_GAP } from "./types";
import { classifyClan, type ClanIndex } from "./clan";
import {
  computeGenerations,
  isIndirectLink,
  linkLabel,
  orderedSpouses,
  sortGenerations,
  sortPersons,
} from "./utils";

interface Measure {
  person: Person;
  width: number;
  unitWidth: number;
  spouses: Person[];
  children: Measure[];
}

export function computeLayout(tree: FamilyTree): TreeLayout {
  const tuning = normalizeTuning(tree.design.tuning);
  const clan = classifyClan(tree.members, tree.founderId);
  const generations = computeGenerations(tree.members, tree.founderId);
  const counts = new Map<number, number>();
  for (const member of tree.members) {
    if (!clan.isDisplayed(member.id)) continue;
    const generation = generations.get(member.id) ?? 1;
    counts.set(generation, (counts.get(generation) ?? 0) + 1);
  }
  const inset = tuning.frameStyle === "meander" ? Math.round(88 * tuning.frameScale) : 0;
  const cardScale = tuning.cardScale ?? 1;
  const marginTop = tuning.marginTop + inset;
  const marginBottom = tuning.marginBottom + inset;
  const ancestorTitles = new Map<number, string[]>();
  for (const member of tree.members) {
    if (!clan.isDisplayed(member.id)) continue;
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
  const bandPillWidth = (label: string) => Math.max(86, Math.min(160, label.length * 5.4 + 18));
  // Dải đời nằm sát mép trái/phải; chừa vùng này để thẻ không bao giờ đè lên nhãn đời.
  const bandGutter = tree.design.showGenerationLabels
    ? Math.round(
        34 +
          Array.from(counts.keys()).reduce(
            (max, generation) => Math.max(max, bandPillWidth(rowLabel(generation))),
            0,
          ) +
          12,
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
    const role = clan.roleOf(spouse.id);
    if (role === "inLaw") return true;
    if (role === "ancestor" && clan.roleOf(person.id) === "ancestor") {
      return clan.ancestorTier.get(spouse.id) === clan.ancestorTier.get(person.id);
    }
    return false;
  };

  const rootCandidates = tree.members
    .filter(
      (person) =>
        (clan.roleOf(person.id) === "ancestor" || clan.roleOf(person.id) === "clan") &&
        !clan.lineParent(person),
    )
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
    const { width: cardW } = cardDimsFor(tree.design, generation, counts.get(generation), cardScale);
    const spouses = orderedSpouses(person, tree.members).filter((spouse) =>
      isUnitSpouse(person, spouse),
    );
    const children = orderSiblings(clan.clanChildren.get(person.id) ?? []).map(measure);
    const unitWidth = cardW + spouses.length * (SPOUSE_GAP + cardW);
    const childWidth =
      children.reduce((sum, c) => sum + c.width, 0) +
      Math.max(0, children.length - 1) * tuning.siblingGap;
    return { person, spouses, children, unitWidth, width: Math.max(unitWidth, childWidth) };
  };

  const measured = roots.map(measure);
  const nodes: TreeNode[] = [];

  const generationKeys = Array.from(new Set(Array.from(counts.keys()))).sort(sortGenerations);
  const rowTop = new Map<number, number>();
  let rowCursor = marginTop;
  for (const generation of generationKeys) {
    rowTop.set(generation, rowCursor);
    rowCursor +=
      cardDimsFor(tree.design, generation, counts.get(generation), cardScale).height +
      Math.max(tuning.generationGap, 36);
  }

  const place = (m: Measure, left: number) => {
    const unitLeft = left + (m.width - m.unitWidth) / 2;
    const generation = generations.get(m.person.id) ?? 1;
    const { width: cardW, height: cardH } = cardDimsFor(
      tree.design,
      generation,
      counts.get(generation),
      cardScale,
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

    let cursor = left + (m.width - packedWidth) / 2;
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
      width: marginLeft + marginRight,
      height: marginTop + marginBottom,
    };
  }

  // Áp vị trí đã lưu theo cả cụm vợ/chồng: một thẻ lệch thì cả cụm dịch theo,
  // tránh trường hợp dữ liệu cũ làm vợ/chồng chồng lên nhau. Chỉ nhận trục x
  // vì thẻ chỉ được di chuyển ngang, và giữ nguyên hàng đời để không đè nhãn đời.
  const units = new Map<string, TreeNode[]>();
  for (const node of nodes) {
    const list = units.get(node.unitId) ?? [];
    list.push(node);
    units.set(node.unitId, list);
  }
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
  // thứ tự ngang và giữ khoảng hở tối thiểu để không chèn vào cụm khác.
  const overriddenGenerations = new Set<number>();
  for (const node of nodes) {
    if (tree.positions[node.id]) overriddenGenerations.add(node.generation);
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
    let cursor = bandGutter;
    for (const row of rows) {
      const target = Math.max(row.left, cursor);
      const adjust = target - row.left;
      if (adjust > 0) {
        for (const member of row.members) member.x += adjust;
      }
      cursor = row.right + adjust + 12;
    }
  }
  if (bandGutter > 0) {
    const minX = Math.min(...nodes.map((node) => node.x));
    if (minX < bandGutter) {
      const adjust = bandGutter - minX;
      for (const node of nodes) node.x += adjust;
    }
  }

  const edges = buildEdges(nodes, clan, tuning);
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
    width: Math.max(width, marginLeft + marginRight),
    height: Math.max(height, marginTop + marginBottom),
  };
}

function buildEdges(
  nodes: TreeNode[],
  clan: ClanIndex,
  tuning: ReturnType<typeof normalizeTuning>,
): TreeEdge[] {
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
    const midY = startY + Math.max(18, (minTop - startY) / 2);
    const centers = sorted.map((n) => n.x + n.width / 2);
    const siblingGeneration = sorted[0].generation;

    if (sorted.length === 1) {
      const node = sorted[0];
      const endX = node.x + node.width / 2;
      const groupId = `ch-${parentId}-${node.id}`;
      if (Math.abs(startX - endX) < 1) {
        edges.push({
          id: `${groupId}-v`,
          type: "child",
          x1: startX,
          y1: startY,
          x2: endX,
          y2: node.y,
          generation: node.generation,
          subjectId: node.id,
          maternal: node.maternal,
        });
      } else {
        edges.push({
          id: `${groupId}-a`,
          type: "child",
          x1: startX,
          y1: startY,
          x2: startX,
          y2: midY,
          generation: node.generation,
          subjectId: node.id,
          maternal: node.maternal,
        });
        edges.push({
          id: `${groupId}-b`,
          type: "child",
          x1: startX,
          y1: midY,
          x2: endX,
          y2: midY,
          generation: node.generation,
          subjectId: node.id,
          maternal: node.maternal,
        });
        edges.push({
          id: `${groupId}-c`,
          type: "child",
          x1: endX,
          y1: midY,
          x2: endX,
          y2: node.y,
          generation: node.generation,
          subjectId: node.id,
          maternal: node.maternal,
        });
      }
    } else {
      const barMin = Math.min(startX, ...centers);
      const barMax = Math.max(startX, ...centers);
      edges.push({
        id: `ch-${parentId}-trunk`,
        type: "child",
        x1: startX,
        y1: startY,
        x2: startX,
        y2: midY,
        generation: siblingGeneration,
      });
      edges.push({
        id: `ch-${parentId}-bar`,
        type: "child",
        x1: barMin,
        y1: midY,
        x2: barMax,
        y2: midY,
        generation: siblingGeneration,
      });
      for (const node of sorted) {
        const endX = node.x + node.width / 2;
        edges.push({
          id: `ch-${parentId}-${node.id}-d`,
          type: "child",
          x1: endX,
          y1: midY,
          x2: endX,
          y2: node.y,
          generation: node.generation,
          subjectId: node.id,
          maternal: node.maternal,
        });
      }
    }

    if (!tuning.motherLine) continue;
    const byMother = new Map<TreeNode, TreeNode[]>();
    for (const node of sorted) {
      const motherId = node.person.motherId;
      const mother = motherId ? unitById.get(motherId) : undefined;
      if (!mother || mother.id === fatherNode.id) continue;
      const list = byMother.get(mother) ?? [];
      list.push(node);
      byMother.set(mother, list);
    }
    if (byMother.size === 0) continue;
    const secondaryY = midY + Math.max(14, tuning.connectorWidth * 6);
    for (const [mother, members] of byMother) {
      const motherX = mother.x + mother.width / 2;
      const motherY = mother.y + mother.height;
      if (motherY >= secondaryY - 4) continue;
      const drops = members.map((n) => n.x + n.width / 2 + 8);
      const barMin = Math.min(motherX, ...drops);
      const barMax = Math.max(motherX, ...drops);
      const base = {
        type: "child" as const,
        generation: members[0].generation,
        fromId: mother.id,
        secondary: true,
      };
      edges.push({
        ...base,
        id: `sm-${mother.id}-trunk`,
        x1: motherX,
        y1: motherY,
        x2: motherX,
        y2: secondaryY,
      });
      edges.push({
        ...base,
        id: `sm-${mother.id}-bar`,
        x1: barMin,
        y1: secondaryY,
        x2: barMax,
        y2: secondaryY,
      });
      for (const node of members) {
        const endX = node.x + node.width / 2 + 8;
        edges.push({
          ...base,
          id: `sm-${mother.id}-${node.id}-d`,
          x1: endX,
          y1: secondaryY,
          x2: endX,
          y2: node.y,
          subjectId: node.id,
          generation: node.generation,
        });
      }
    }
  }
  return edges;
}

function unitSequence(person: Person, spouses: Person[]): Person[] {
  if (person.gender === "female") return [person, ...spouses];
  const wives = spouses.filter((spouse) => spouse.gender === "female");
  const rest = spouses.filter((spouse) => spouse.gender !== "female");
  return [...wives.reverse(), person, ...rest];
}
