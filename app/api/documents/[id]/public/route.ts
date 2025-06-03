import { NextResponse } from "next/server"
import dbConnect from "@/lib/db"
import DocumentModel from "@/lib/models/Document"

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const { searchParams } = new URL(request.url)
    const token = searchParams.get("token")

    if (!token) {
      return NextResponse.json({ error: "Token required" }, { status: 400 })
    }

    await dbConnect()
    const { id } = await params
    
    const document = await DocumentModel.findOne({
      documentId: id,
      "publicAccess.enabled": true,
      "publicAccess.token": token,
      "publicAccess.expiresAt": { $gt: new Date() }
    })

    if (!document) {
      return NextResponse.json(
        { error: "Document not found or access expired" },
        { status: 404 }
      )
    }

    return NextResponse.json({
      title: document.title,
      content: document.content
    })
  } catch (error) {
    console.error("[PUBLIC_DOCUMENT]", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}
