import type { FamilyTree, Person, TreeEdge, TreeLayout, TreeNode } from "./types";
import { cardDimsFor, normalizeTuning, SPOUSE_GAP } from "./types";
import { buildFamilyIndex, computeGenerations, sortPersons } from "./utils";

interface Measure {
  person: Person;
  width: number;
  unitWidth: number;
  spouses: Person[];
  children: Measure[];
}

export function computeLayout(tree: FamilyTree): TreeLayout {
  const tuning = normalizeTuning(tree.design.tuning);
  const byId = new Map(tree.members.map((m) => [m.id, m]));
  const generations = computeGenerations(tree.members);
  const index = buildFamilyIndex(tree.members);
  const roots = tree.members
    .filter((p) => index.bloodline.has(p.id) && !index.lineParent(p))
    .sort(sortPersons);

  const measure = (person: Person): Measure => {
    const generation = generations.get(person.id) ?? 1;
    const { width: cardW } = cardDimsFor(tree.design, generation);
    const spouses = person.spouseIds
      .map((id) => byId.get(id))
      .filter((p): p is Person => p !== undefined && !index.bloodline.has(p.id))
      .sort(sortPersons);
    const children = (index.childrenOf.get(person.id) ?? []).map(measure);
    const unitWidth = cardW + spouses.length * (SPOUSE_GAP + cardW);
    const childWidth =
      children.reduce((sum, c) => sum + c.width, 0) +
      Math.max(0, children.length - 1) * tuning.siblingGap;
    return { person, spouses, children, unitWidth, width: Math.max(unitWidth, childWidth) };
  };

  const measured = roots.map(measure);
  const nodes: TreeNode[] = [];

  const maxGeneration = Math.max(1, ...Array.from(generations.values()));
  const rowTop = new Map<number, number>();
  let rowCursor = tuning.marginTop;
  for (let generation = 1; generation <= maxGeneration; generation += 1) {
    rowTop.set(generation, rowCursor);
    rowCursor += cardDimsFor(tree.design, generation).height + tuning.generationGap;
  }

  const place = (m: Measure, left: number) => {
    const unitLeft = left + (m.width - m.unitWidth) / 2;
    const generation = generations.get(m.person.id) ?? 1;
    const { width: cardW, height: cardH } = cardDimsFor(tree.design, generation);
    const y = rowTop.get(generation) ?? tuning.marginTop;
    const add = (person: Person, x: number, isSpouse: boolean) => {
      nodes.push({
        id: person.id,
        x,
        y,
        width: cardW,
        height: cardH,
        generation,
        person,
        isSpouse,
        unitId: m.person.id,
      });
    };
    add(m.person, unitLeft, false);
    m.spouses.forEach((spouse, i) => add(spouse, unitLeft + (i + 1) * (cardW + SPOUSE_GAP), true));

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
    const order = [m.person.id, ...m.spouses.map((s) => s.id)];
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

  let cursor = tuning.marginLeft;
  for (const m of measured) {
    place(m, cursor);
    cursor += m.width + tuning.branchGap;
  }

  if (nodes.length === 0) {
    return {
      nodes: [],
      edges: [],
      generations: [],
      width: tuning.marginLeft + tuning.marginRight,
      height: tuning.marginTop + tuning.marginBottom,
    };
  }

  for (const node of nodes) {
    const override = tree.positions[node.id];
    if (override) {
      node.x = override.x;
      node.y = override.y;
    }
  }

  const edges = buildEdges(nodes, index.lineParent);
  const maxGen = Math.max(...nodes.map((n) => n.generation));
  const genRows = Array.from({ length: maxGen }, (_, i) => {
    const generation = i + 1;
    return {
      generation,
      count: nodes.filter((n) => n.generation === generation).length,
      y: rowTop.get(generation) ?? tuning.marginTop,
    };
  });
  const width = Math.max(...nodes.map((n) => n.x + n.width)) + tuning.marginRight;
  const height = Math.max(...nodes.map((n) => n.y + n.height)) + tuning.marginBottom;
  return {
    nodes,
    edges,
    generations: genRows,
    width: Math.max(width, tuning.marginLeft + tuning.marginRight),
    height: Math.max(height, tuning.marginTop + tuning.marginBottom),
  };
}

function buildEdges(nodes: TreeNode[], lineParent: (p: Person) => string | undefined): TreeEdge[] {
  const edges: TreeEdge[] = [];
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
    const list = childGroups.get(parentNode.id) ?? [];
    list.push(node);
    childGroups.set(parentNode.id, list);
  }

  for (const [parentId, kids] of childGroups) {
    const parentNode = nodeById.get(parentId);
    if (!parentNode) continue;
    const unit = units.get(parentNode.unitId) ?? [parentNode];
    const unitById = new Map(unit.map((n) => [n.id, n]));
    const byMother = new Map<string, TreeNode[]>();
    for (const kid of kids) {
      const motherId = kid.person.motherId;
      const key = motherId && unitById.has(motherId) ? motherId : parentId;
      const list = byMother.get(key) ?? [];
      list.push(kid);
      byMother.set(key, list);
    }
    const unitOrder = [...unit].sort((a, b) => a.x - b.x).map((n) => n.id);
    const groups = [...byMother.entries()].sort(
      (a, b) => unitOrder.indexOf(a[0]) - unitOrder.indexOf(b[0]),
    );

    for (const [key, members] of groups) {
      const startNode = unitById.get(key) ?? parentNode;
      const startX = startNode.x + startNode.width / 2;
      const startY = startNode.y + startNode.height;
      const sorted = [...members].sort((a, b) => a.x - b.x);

      if (sorted.length === 1) {
        const node = sorted[0];
        const endX = node.x + node.width / 2;
        const endY = node.y;
        const midY = startY + Math.max(18, (endY - startY) / 2);
        const groupId = `ch-${parentId}-${node.id}`;
        if (Math.abs(startX - endX) < 1) {
          edges.push({
            id: `${groupId}-v`,
            type: "child",
            x1: startX,
            y1: startY,
            x2: endX,
            y2: endY,
            generation: node.generation,
            subjectId: node.id,
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
          });
          edges.push({
            id: `${groupId}-c`,
            type: "child",
            x1: endX,
            y1: midY,
            x2: endX,
            y2: endY,
            generation: node.generation,
            subjectId: node.id,
          });
        }
        continue;
      }

      const minTop = Math.min(...sorted.map((n) => n.y));
      const midY = startY + Math.max(18, (minTop - startY) / 2);
      const centers = sorted.map((n) => n.x + n.width / 2);
      const siblingGeneration = sorted[0].generation;
      edges.push({
        id: `ch-${parentId}-${key}-trunk`,
        type: "child",
        x1: startX,
        y1: startY,
        x2: startX,
        y2: midY,
        generation: siblingGeneration,
      });
      edges.push({
        id: `ch-${parentId}-${sorted[0].id}-bar`,
        type: "child",
        x1: centers[0],
        y1: midY,
        x2: centers[centers.length - 1],
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
        });
      }
    }
  }
  return edges;
}
