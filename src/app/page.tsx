import { IdeaGraph } from "@/components/graph/IdeaGraph";
import { getSnapshot } from "@/lib/queries";

export const dynamic = "force-dynamic";

export default async function DiscoverPage() {
  const { db, currentUserId } = await getSnapshot();
  return <IdeaGraph db={db} currentUserId={currentUserId} />;
}
