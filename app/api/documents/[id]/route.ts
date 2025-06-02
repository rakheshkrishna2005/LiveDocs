import { NextResponse } from "next/server"
import { MongoClient } from "mongodb"

const mongoUri = process.env.MONGODB_URI || "mongodb://localhost:27017"
const client = new MongoClient(mongoUri)

export async function DELETE(request: Request, { params }: { params: { id: string } }) {
  try {
    await client.connect()
    const db = client.db("livedocs")

    const result = await db.collection("documents").deleteOne({ documentId: params.id })

    if (result.deletedCount === 0) {
      return NextResponse.json({ error: "Document not found" }, { status: 404 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Error deleting document:", error)
    return NextResponse.json({ error: "Failed to delete document" }, { status: 500 })
  } finally {
    await client.close()
  }
}
