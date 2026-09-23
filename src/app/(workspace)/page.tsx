import { IdeaJournal } from "@/components/journal/IdeaJournal";
import { getPublicCatalog, getPublicActivities } from "@/lib/public-queries";
export const dynamic = "force-dynamic";

export default async function DiscoverPage() {
  const [ideas, activities] = await Promise.all([
    getPublicCatalog(),
    getPublicActivities(6),
  ]);
  return (
    <div className="h-full overflow-auto">
      <div className="mx-auto max-w-[1240px] px-5 sm:px-10">
        <IdeaJournal ideas={ideas} activities={activities} workspace />
      </div>
    </div>
  );
}

