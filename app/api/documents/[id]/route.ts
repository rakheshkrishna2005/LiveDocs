import { NextResponse } from "next/server";
import { MongoClient } from "mongodb";
import { getCurrentUser } from "@/lib/auth";
import dbConnect from "@/lib/db";
import DocumentModel from "@/lib/models/Document";

const mongoUri = process.env.MONGODB_URI!;
const client = new MongoClient(mongoUri);

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
    });

    if (!document) {
      return NextResponse.json({ error: "Document not found" }, { status: 404 });
    }

    return NextResponse.json({
      title: document.title,
      content: document.content,
    });
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

    await client.connect();
    const db = client.db("livedocs");

    const result = await db.collection("documents").deleteOne({ documentId: id });

    if (result.deletedCount === 0) {
      return NextResponse.json({ error: "Document not found" }, { status: 404 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting document:", error);
    return NextResponse.json({ error: "Failed to delete document" }, { status: 500 });
  } finally {
    await client.close();
  }
}
