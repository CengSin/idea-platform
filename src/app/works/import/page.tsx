import { ImportWebProject } from "@/components/works/ImportWebProject";
import { getCurrentUser } from "@/lib/auth";
import { redirect } from "next/navigation";

export const metadata = { title: "收录已有网站" };

export default async function ImportWebProjectPage() {
  const me = await getCurrentUser();
  if (!me) redirect("/login?next=%2Fworks%2Fimport");
  return <ImportWebProject authorName={me.displayName} />;
}
