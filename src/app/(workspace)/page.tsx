import { IdeaJournal } from "@/components/journal/IdeaJournal";
import { getPublicCatalog } from "@/lib/public-queries";
export const dynamic = "force-dynamic";
export default async function DiscoverPage() { return <div className="h-full overflow-auto"><div className="mx-auto max-w-[1240px] px-5 sm:px-10"><IdeaJournal ideas={await getPublicCatalog()} workspace /></div></div>; }
