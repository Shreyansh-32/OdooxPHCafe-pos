import { getServerSession } from "next-auth/next";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";
import { SocketProvider } from "@/components/providers/socket-provider";
import { StaffSidebar } from "@/components/shared/staff-sidebar";

export default async function StaffLayout({ children }: { children: React.ReactNode }) {
  const session = await getServerSession(authOptions);

  if (!session?.user) {
    redirect("/login");
  }

  return (
    <SocketProvider>
      <div style={{ display: "flex", minHeight: "100vh", background: "var(--color-bg)" }}>
        <StaffSidebar
          userName={session.user.name ?? "Staff"}
          userEmail={session.user.email ?? ""}
          userRole={session.user.role}
        />
        <main style={{ flex: 1, minWidth: 0 }}>{children}</main>
      </div>
    </SocketProvider>
  );
}
