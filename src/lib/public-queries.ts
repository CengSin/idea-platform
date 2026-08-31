import "server-only";
import { cache } from "react";
import { readDbForRender } from "./db";
import { buildPublicCatalog } from "./public-catalog";

export const getPublicCatalog = cache(async () => buildPublicCatalog(await readDbForRender()));
