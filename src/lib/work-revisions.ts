import type { Work, WorkRevision } from "./types";

function content(work: Work) {
  return { title: work.title, summary: work.summary, type: work.type, coverUrl: work.coverUrl, externalUrl: work.externalUrl, repositoryUrl: work.repositoryUrl, license: { ...work.license } };
}
export function currentWorkRevision(work: Work): WorkRevision {
  return work.revisions?.at(-1) ?? { id: `${work.id}:r1`, number: 1, recordedAt: "", ...content(work) };
}
export function ensureWorkRevision(work: Work, at: string) {
  if (!work.revisions?.length) work.revisions = [{ ...currentWorkRevision(work), recordedAt: at }];
  return work.revisions.at(-1)!;
}
export function recordWorkRevision(work: Work, at: string) {
  const previous = ensureWorkRevision(work, at);
  const next = content(work);
  const { id: _id, number: _number, recordedAt: _at, ...old } = previous;
  if (JSON.stringify(old) === JSON.stringify(next)) return previous;
  const number = previous.number + 1;
  const revision = { id: `${work.id}:r${number}`, number, recordedAt: at, ...next };
  work.revisions!.push(revision);
  return revision;
}
