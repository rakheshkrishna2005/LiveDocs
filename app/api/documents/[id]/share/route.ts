import { NextResponse } from "next/server"
import { v4 as uuidv4 } from "uuid"
import { getCurrentUser } from "@/lib/auth"
import dbConnect from "@/lib/db"
import DocumentModel from "@/lib/models/Document"

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    await dbConnect()
    const { id } = await params
    
    const document = await DocumentModel.findOne({ documentId: id })
    
    if (!document) {
      return NextResponse.json({ error: "Document not found" }, { status: 404 })
    }

    if (document.ownerId !== user.userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 })
    }

    return NextResponse.json({ publicAccess: document.publicAccess })
  } catch (error) {
    console.error("[GET_PUBLIC_ACCESS]", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}

export async function POST(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { expirationDays } = await request.json()
    
    if (!expirationDays || expirationDays < 1 || expirationDays > 365) {
      return NextResponse.json(
        { error: "Expiration period must be between 1 and 12 months" },
        { status: 400 }
      )
    }

    await dbConnect()
    const { id } = await params
    
    const document = await DocumentModel.findOne({ documentId: id })
    
    if (!document) {
      return NextResponse.json({ error: "Document not found" }, { status: 404 })
    }

    if (document.ownerId !== user.userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 })
    }

    const token = uuidv4()
    const expiresAt = new Date()
    expiresAt.setMonth(expiresAt.getMonth() + Math.ceil(expirationDays / 30))

    document.publicAccess = {
      enabled: true,
      token,
      expiresAt
    }
    await document.save()

    return NextResponse.json({ token })
  } catch (error) {
    console.error("[SHARE_DOCUMENT]", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    await dbConnect()
    const { id } = await params
    
    const document = await DocumentModel.findOne({ documentId: id })
    
    if (!document) {
      return NextResponse.json({ error: "Document not found" }, { status: 404 })
    }

    if (document.ownerId !== user.userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 })
    }

    document.publicAccess = {
      enabled: false,
      token: "",
      expiresAt: new Date()
    }
    await document.save()

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("[DISABLE_PUBLIC_ACCESS]", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}
