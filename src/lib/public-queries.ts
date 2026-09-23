import "server-only";
import { cache } from "react";
import { readDbForRender } from "./db";
import { buildPublicCatalog, buildPublicActivities } from "./public-catalog";

export const getPublicCatalog = cache(async () => buildPublicCatalog(await readDbForRender()));
export const getPublicActivities = cache(async (limit = 8) => buildPublicActivities(await readDbForRender(), limit));

