import { nanoid } from "nanoid";
import { mutateDb } from "./db";
import { resolveWebsitePreview, validatePublicWebsiteUrl } from "./link-preview";
import { applyImportedCollaboration, applyWebProjectImport, parseWebProjectImportInput } from "./web-project-import";

export async function importWebProject(userId: string, raw: unknown) {
  const input = parseWebProjectImportInput(raw);
  input.url = await validatePublicWebsiteUrl(input.url);
  if (input.coverUrl) input.coverUrl = await validatePublicWebsiteUrl(input.coverUrl);
  else input.coverUrl = (await resolveWebsitePreview(input.url)).imageUrl;
  const ids = { ideaId: `idea_${nanoid(8)}`, attemptId: `att_${nanoid(8)}`, workId: `work_${nanoid(8)}`, eventId: `evt_${nanoid(6)}` };
  const at = new Date().toISOString();
  let result: ReturnType<typeof applyWebProjectImport> | undefined;
  await mutateDb((db) => { result = applyWebProjectImport(db, userId, input, ids, at); });
  return result!;
}

export async function setImportedCollaboration(userId: string, workId: string, open: boolean) {
  let updated = false;
  await mutateDb((db) => { updated = applyImportedCollaboration(db, userId, workId, open).collaborationOpen === true; });
  return { collaboration_open: updated };
}
