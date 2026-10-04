import { pageSocialMetadata } from "@/lib/seo";
import { getPublicCatalog, getPublicActivities } from "@/lib/public-queries";
import { IdeaJournal } from "@/components/journal/IdeaJournal";

const description = "这里的想法，不止用来收藏。分享一个还没实现的想法，让别人沿着自己的方向实现它，再把作品带回来。";

export const metadata = {
  title: "探索想法",
  description,
  ...pageSocialMetadata({ title: "探索想法 · Idea Platform", description, url: "/explore" }),
};

export default async function ExplorePage() {
  const [ideas, activities] = await Promise.all([
    getPublicCatalog(),
    getPublicActivities(6),
  ]);

  return <IdeaJournal ideas={ideas} activities={activities} />;
}

