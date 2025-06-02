import { NextRequest, NextResponse } from "next/server"
import dbConnect from "@/lib/db"
import User from "@/lib/models/User"

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams
  const email = searchParams.get("email")

  if (!email) {
    return NextResponse.json({ error: "Email is required" }, { status: 400 })
  }

  try {
    await dbConnect()
    const user = await User.findOne({ email })
    
    return NextResponse.json({ exists: !!user })
  } catch (error) {
    console.error("Error checking user existence:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
