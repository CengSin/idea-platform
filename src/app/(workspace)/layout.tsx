import { AppShell } from "@/components/chrome/AppShell";
import { SheetProvider } from "@/components/sheets/SheetContext";
import { getSnapshot } from "@/lib/queries";
import { isAdminUser } from "@/lib/admin";

export default async function WorkspaceLayout({ children }: { children: React.ReactNode }) {
  const { db, me } = await getSnapshot();
  const isAdmin = await isAdminUser(me.id);
  const unread = db.notifications.filter((notification) => !notification.read).length;
  return (
    <SheetProvider>
      <AppShell unread={unread} user={me} isAdmin={isAdmin}>{children}</AppShell>
    </SheetProvider>
  );
}
