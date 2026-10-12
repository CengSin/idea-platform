import "server-only";
import { cache } from "react";
import { readDbForRender } from "./db";
import { buildPublicCatalog, buildPublicActivities, buildPublicWorksPage } from "./public-catalog";
import { buildIdeaDiscussion } from "./idea-discussion";

export const getPublicCatalog = cache(async () => buildPublicCatalog(await readDbForRender()));
export const getPublicActivities = cache(async (limit = 8) => buildPublicActivities(await readDbForRender(), limit));
export const getPublicWorksPage = cache(async (userId?: string) => buildPublicWorksPage(await readDbForRender(), userId));
export const getPublicIdeaDiscussion = cache(async (ideaId: string, viewerId?: string) => buildIdeaDiscussion(await readDbForRender(), ideaId, viewerId));
