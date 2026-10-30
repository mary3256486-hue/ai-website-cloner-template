import type { FamilyTree, Person, TreeEdge, TreeLayout, TreeNode } from "./types";
import { CARD_H, CARD_W, PADDING, ROW_GAP, SPOUSE_GAP, UNIT_GAP } from "./types";
import { buildFamilyIndex, computeGenerations, sortPersons } from "./utils";

interface Measure {
  person: Person;
  width: number;
  unitWidth: number;
  spouses: Person[];
  children: Measure[];
}

export function computeLayout(tree: FamilyTree): TreeLayout {
  const byId = new Map(tree.members.map((m) => [m.id, m]));
  const generations = computeGenerations(tree.members);
  const index = buildFamilyIndex(tree.members);
  const roots = tree.members
    .filter((p) => index.bloodline.has(p.id) && !index.lineParent(p))
    .sort(sortPersons);

  const measure = (person: Person): Measure => {
    const spouses = person.spouseIds
      .map((id) => byId.get(id))
      .filter((p): p is Person => p !== undefined && !index.bloodline.has(p.id))
      .sort(sortPersons);
    const children = (index.childrenOf.get(person.id) ?? []).map(measure);
    const unitWidth = CARD_W + spouses.length * (SPOUSE_GAP + CARD_W);
    const childWidth =
      children.reduce((sum, c) => sum + c.width, 0) + Math.max(0, children.length - 1) * UNIT_GAP;
    return { person, spouses, children, unitWidth, width: Math.max(unitWidth, childWidth) };
  };

  const measured = roots.map(measure);
  const nodes: TreeNode[] = [];

  const place = (m: Measure, left: number) => {
    const childWidth =
      m.children.reduce((sum, c) => sum + c.width, 0) + Math.max(0, m.children.length - 1) * UNIT_GAP;
    let cursor = left + (m.width - childWidth) / 2;
    for (const child of m.children) {
      place(child, cursor);
      cursor += child.width + UNIT_GAP;
    }
    const unitLeft = left + (m.width - m.unitWidth) / 2;
    const generation = generations.get(m.person.id) ?? 1;
    const y = PADDING + (generation - 1) * (CARD_H + ROW_GAP);
    const add = (person: Person, x: number, isSpouse: boolean) => {
      nodes.push({
        id: person.id,
        x,
        y,
        width: CARD_W,
        height: CARD_H,
        generation,
        person,
        isSpouse,
        unitId: m.person.id,
      });
    };
    add(m.person, unitLeft, false);
    m.spouses.forEach((spouse, i) => add(spouse, unitLeft + (i + 1) * (CARD_W + SPOUSE_GAP), true));
  };

  let cursor = PADDING;
  for (const m of measured) {
    place(m, cursor);
    cursor += m.width + UNIT_GAP * 2;
  }

  if (nodes.length === 0) {
    return { nodes: [], edges: [], generations: [], width: PADDING * 2, height: PADDING * 2 };
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
      y: PADDING + i * (CARD_H + ROW_GAP),
    };
  });
  const width = Math.max(...nodes.map((n) => n.x + n.width)) + PADDING;
  const height = Math.max(...nodes.map((n) => n.y + n.height)) + PADDING;
  return {
    nodes,
    edges,
    generations: genRows,
    width: Math.max(width, PADDING * 2),
    height: Math.max(height, PADDING * 2),
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
      });
    }
  }

  for (const node of nodes) {
    if (node.isSpouse) continue;
    const parent = lineParent(node.person);
    if (!parent) continue;
    const parentNode = nodeById.get(parent);
    if (!parentNode) continue;
    const unit = units.get(parentNode.unitId) ?? [parentNode];
    const minX = Math.min(...unit.map((n) => n.x));
    const maxX = Math.max(...unit.map((n) => n.x + n.width));
    const startX = (minX + maxX) / 2;
    const startY = Math.max(...unit.map((n) => n.y + n.height));
    const endX = node.x + node.width / 2;
    const endY = node.y;
    const midY = startY + Math.max(18, (endY - startY) / 2);
    const groupId = `ch-${parent}-${node.id}`;
    if (Math.abs(startX - endX) < 1) {
      edges.push({ id: `${groupId}-v`, type: "child", x1: startX, y1: startY, x2: endX, y2: endY });
    } else {
      edges.push({ id: `${groupId}-a`, type: "child", x1: startX, y1: startY, x2: startX, y2: midY });
      edges.push({ id: `${groupId}-b`, type: "child", x1: startX, y1: midY, x2: endX, y2: midY });
      edges.push({ id: `${groupId}-c`, type: "child", x1: endX, y1: midY, x2: endX, y2: endY });
    }
  }
  return edges;
}
