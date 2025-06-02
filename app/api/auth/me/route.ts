import { NextResponse } from "next/server"
import { getCurrentUser } from "@/lib/auth"

export async function GET() {
  try {
    const user = await getCurrentUser()

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    return NextResponse.json({
      user: {
        userId: user.userId,
        email: user.email,
        name: user.name,
      },
    })
  } catch (error) {
    console.error("Error getting current user:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
