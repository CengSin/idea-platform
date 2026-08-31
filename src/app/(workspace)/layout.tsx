import { AppShell } from "@/components/chrome/AppShell";
import { SheetProvider } from "@/components/sheets/SheetContext";
import { getSnapshot } from "@/lib/queries";

export default async function WorkspaceLayout({ children }: { children: React.ReactNode }) {
  const { db, me } = await getSnapshot();
  const unread = db.notifications.filter((notification) => !notification.read).length;
  return (
    <SheetProvider>
      <AppShell unread={unread} user={me}>{children}</AppShell>
    </SheetProvider>
  );
}
