import { getSessionUser } from "@/lib/auth-neon";
import { DashboardSidebar } from "@/components/dashboard-sidebar";
import { DashboardHeader } from "@/components/dashboard-header";

export const dynamic = "force-dynamic";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const sessionUser = await getSessionUser();
  const userEmail = sessionUser?.email ?? "Guest";
  const isGuest = !sessionUser;

  return (
    <div className="flex min-h-screen bg-[var(--background)] text-[var(--foreground)]">
      <DashboardSidebar />
      <div className="flex flex-1 flex-col min-w-0">
        <DashboardHeader userEmail={userEmail} isGuest={isGuest} />
        <main className="flex-1 p-6 overflow-auto">
          {children}
        </main>
      </div>
    </div>
  );
}
