import { redirect } from "next/navigation";

export default function LegacyNewIdeaPage() {
  redirect("/ideas");
}
