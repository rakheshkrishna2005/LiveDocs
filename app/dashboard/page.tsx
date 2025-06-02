import { getCurrentUser } from "@/lib/auth"
import { redirect } from "next/navigation"
import { Dashboard } from "@/components/dashboard"

export default async function DashboardPage() {
  const user = await getCurrentUser()

  if (!user) {
    redirect("/auth/login")
  }

  return (
    <div className="min-h-screen flex flex-col">
      <Dashboard user={user} />
    </div>
  )
}
