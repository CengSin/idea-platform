import ExploreLayout from "../explore/layout";

export const dynamic = "force-dynamic";

export default function WorksLayout({ children }: { children: React.ReactNode }) {
  return <ExploreLayout>{children}</ExploreLayout>;
}
