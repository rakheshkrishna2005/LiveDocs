import { type NextRequest, NextResponse } from "next/server"
import dbConnect from "@/lib/db"
import DocumentModel from "@/lib/models/Document"
import { getCurrentUser } from "@/lib/auth"
import User from "@/lib/models/User"

interface Collaborator {
  userId: string
  email: string
  name: string
  addedAt: Date
}

export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    await dbConnect()

    const ownDocuments = await DocumentModel.find({ ownerId: user.userId })
      .sort({ updatedAt: -1 })
      .select("documentId title updatedAt collaborators")

    const sharedDocuments = await DocumentModel.find({
      ownerId: { $ne: user.userId },
      "collaborators.userId": user.userId,
    })
      .sort({ updatedAt: -1 })
      .select("documentId title updatedAt ownerId ownerEmail collaborators")

    return NextResponse.json({
      ownDocuments: ownDocuments.map((doc) => ({
        id: doc.documentId,
        title: doc.title,
        lastModified: doc.updatedAt,
        collaborators: doc.collaborators.length,
        isOwner: true,
      })),
      sharedDocuments: sharedDocuments.map((doc) => ({
        id: doc.documentId,
        title: doc.title,
        lastModified: doc.updatedAt,
        collaborators: doc.collaborators.length,
        isOwner: false,
        ownerEmail: doc.ownerEmail,
      })),
    })
  } catch (error) {
    console.error("Error fetching documents:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { documentId, title } = await request.json()

    await dbConnect()

    const newDocument = new DocumentModel({
      documentId,
      title: title || "Untitled Document",
      content: "",
      ownerId: user.userId,
      ownerEmail: user.email,
      collaborators: [],
    })

    await newDocument.save()

    return NextResponse.json({
      message: "Document created successfully",
      document: {
        id: newDocument.documentId,
        title: newDocument.title,
      },
    })
  } catch (error) {
    console.error("Error creating document:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

export async function PUT(request: NextRequest) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { documentId, email } = await request.json()

    if (!documentId || !email) {
      return NextResponse.json({ error: "Document ID and email are required" }, { status: 400 })
    }

    await dbConnect()

    const document = await DocumentModel.findOne({ documentId })

    if (!document) {
      return NextResponse.json({ error: "Document not found" }, { status: 404 })
    }

    if (document.ownerId !== user.userId) {
      return NextResponse.json({ error: "Only the owner can share this document" }, { status: 403 })
    }

    const userToShare = await User.findOne({ email })

    if (!userToShare) {
      return NextResponse.json({ error: "User not found" }, { status: 404 })
    }

    const alreadyShared = document.collaborators.some(
      (collaborator: Collaborator) => collaborator.userId === userToShare._id.toString(),
    )

    if (alreadyShared) {
      return NextResponse.json({ error: "Document already shared with this user" }, { status: 400 })
    }

    document.collaborators.push({
      userId: userToShare._id.toString(),
      email: userToShare.email,
      name: userToShare.name,
      addedAt: new Date(),
    })

    await document.save()

    return NextResponse.json({
      message: "Document shared successfully",
    })
  } catch (error) {
    console.error("Error sharing document:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
