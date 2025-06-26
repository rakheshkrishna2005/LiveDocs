import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import dbConnect from "@/lib/db";
import DocumentModel from "@/lib/models/Document";
export const dynamic = 'force-dynamic';

export async function GET(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await dbConnect();

    const { id } = await context.params;

    const document = await DocumentModel.findOne({
      documentId: id,
      $or: [
        { ownerId: user.userId },
        { "collaborators.userId": user.userId },
      ],
    }).exec();

    if (!document) {
      return NextResponse.json({ error: "Document not found" }, { status: 404 });
    }

    const documentData = document.toObject();

    const response = NextResponse.json({
      title: documentData.title || "Untitled Document",
      content: documentData.content || "",
      timestamp: new Date().toISOString(),
    });

    response.headers.set('Cache-Control', 'no-store, must-revalidate');
    response.headers.set('Pragma', 'no-cache');
    response.headers.set('Expires', '0');

    return response;
  } catch (error) {
    console.error("Error fetching document:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function DELETE(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;

    await dbConnect();
    const result = await DocumentModel.deleteOne({ documentId: id });

    if (result.deletedCount === 0) {
      return NextResponse.json({ error: "Document not found" }, { status: 404 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting document:", error);
    return NextResponse.json({ error: "Failed to delete document" }, { status: 500 });
  }
}
