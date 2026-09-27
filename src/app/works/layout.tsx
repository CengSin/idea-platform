import { AppShell } from "@/components/chrome/AppShell";
import { PageFrame } from "@/components/chrome/PageFrame";
import { SheetProvider } from "@/components/sheets/SheetContext";
import { isAdminUser } from "@/lib/admin";
import { getCurrentUser } from "@/lib/auth";
import { getSnapshot } from "@/lib/queries";
import ExploreLayout from "../explore/layout";

export const dynamic = "force-dynamic";

export default async function WorksLayout({ children }: { children: React.ReactNode }) {
  const me = await getCurrentUser();
  if (!me) return <ExploreLayout>{children}</ExploreLayout>;

  const [{ db }, isAdmin] = await Promise.all([getSnapshot(), isAdminUser(me.id)]);
  const unread = db.notifications.filter((notification) => !notification.read).length;
  return (
    <SheetProvider>
      <AppShell unread={unread} user={me} isAdmin={isAdmin}>
        <PageFrame>{children}</PageFrame>
      </AppShell>
    </SheetProvider>
  );
}
