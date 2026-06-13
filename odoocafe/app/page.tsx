import { redirect } from "next/navigation";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";

export default async function HomePage() {
  const session = await getServerSession(authOptions);

  if (!session) {
    redirect("/login");
  }

  if (session.user.role === "KITCHEN") {
    redirect("/kds");
  }

  if (session.user.role === "ADMIN") {
    redirect("/admin");
  }

  redirect("/pos");
}
