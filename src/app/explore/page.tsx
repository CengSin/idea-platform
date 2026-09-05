import { getPublicCatalog } from "@/lib/public-queries";
import { IdeaJournal } from "@/components/journal/IdeaJournal";
export const metadata = { title: "想法共享 · Idea Platform", description: "分享你在意的问题，遇见愿意一起实现的人。" };
export default async function ExplorePage() { return <IdeaJournal ideas={await getPublicCatalog()} />; }
