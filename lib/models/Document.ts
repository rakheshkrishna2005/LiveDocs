import mongoose, { type Document, Schema } from "mongoose"

export interface IDocument extends Document {
  documentId: string
  title: string
  content: string
  ownerId: string
  ownerEmail: string
  collaborators: Array<{
    userId: string
    email: string
    name: string
    addedAt: Date
  }>
  createdAt: Date
  updatedAt: Date
}

const DocumentSchema = new Schema<IDocument>({
  documentId: {
    type: String,
    required: true,
    unique: true,
  },
  title: {
    type: String,
    required: true,
    default: "Untitled Document",
  },
  content: {
    type: String,
    default: "",
  },
  ownerId: {
    type: String,
    required: true,
  },
  ownerEmail: {
    type: String,
    required: true,
  },
  collaborators: [
    {
      userId: String,
      email: String,
      name: String,
      addedAt: {
        type: Date,
        default: Date.now,
      },
    },
  ],
  createdAt: {
    type: Date,
    default: Date.now,
  },
  updatedAt: {
    type: Date,
    default: Date.now,
  },
})

const DocumentModel = mongoose.models.Document || mongoose.model<IDocument>("Document", DocumentSchema)

export default DocumentModel
