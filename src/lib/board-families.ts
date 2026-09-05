import type { PublicIdea } from "./public-catalog";

/** Preserve ancestry while searching; break corrupt cycles without dropping any idea. */
export function boardFamilies(ideas: PublicIdea[], query = "", filter = "全部") {
  const byId = new Map(ideas.map(i => [i.id, i]));
  const parent = new Map<string, string>();
  for (const idea of ideas) {
    const source = idea.source;
    if (source && source.ideaId !== idea.id && byId.get(source.ideaId)?.works.some(w => w.id === source.workId)) parent.set(idea.id, source.ideaId);
  }
  for (const id of parent.keys()) {
    const seen = new Set([id]); let current = parent.get(id);
    while (current) {
      if (seen.has(current)) { parent.delete(id); break; }
      seen.add(current); current = parent.get(current);
    }
  }
  const groups = new Map<string, PublicIdea[]>();
  for (const idea of ideas) {
    let root = idea.id;
    while (parent.has(root)) root = parent.get(root)!;
    groups.set(root, [...(groups.get(root) ?? []), idea]);
  }
  const q = query.trim().toLowerCase();
  const matches = (i: PublicIdea) => `${i.title} ${i.summary} ${i.problem} ${i.authorName} ${i.tags.join(" ")} ${i.works.map(w => w.title).join(" ")}`.toLowerCase().includes(q)
    && (filter === "全部" || filter === "待实现" && i.attemptCount === 0 && !i.works.length && i.status !== "deprecated" || filter === "迭代中" && (Boolean(i.source) || i.attemptCount > 0) && i.status !== "deprecated" || filter === "有作品" && i.works.length > 0 || filter === "已弃用" && i.status === "deprecated");
  return [...groups].map(([id, members]) => {
    const matched = new Set(members.filter(matches).map(i => i.id));
    const reveal = new Set<string>();
    if (q || filter !== "全部") for (const match of matched) {
      let ancestor = parent.get(match);
      while (ancestor) { reveal.add(ancestor); ancestor = parent.get(ancestor); }
    }
    return { root: byId.get(id)!, members, parent, matches: matched, reveal, updatedAt: members.reduce((at, i) => i.updatedAt > at ? i.updatedAt : at, "") };
  })
    .filter(g => g.matches.size > 0).sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
}
