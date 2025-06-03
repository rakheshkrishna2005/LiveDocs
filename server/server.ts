import express from "express"
import http from "http"
import { Server, type Socket } from "socket.io"
import cors from "cors"
import { MongoClient, type Db } from "mongodb"

interface Collaborator {
  userId: string
  email: string
  name: string
  addedAt: Date
}

interface Document {
  documentId: string
  content: string
  title: string
  createdAt: Date
  updatedAt: Date
  ownerId?: string
  collaborators?: Collaborator[]
}

const mongoUri = process.env.MONGODB_URI || "mongodb://localhost:27017"
const client = new MongoClient(mongoUri)
let db: Db

async function connectToMongo(): Promise<void> {
  try {
    await client.connect()
    db = client.db("livedocs")
    console.log("✅ Connected to MongoDB")
    await db.collection("documents").createIndex({ documentId: 1 }, { unique: true })
    console.log("✅ Database indexes created")
  } catch (error) {
    console.error("❌ Failed to connect to MongoDB", error)
    console.log("💡 Make sure MongoDB is running on localhost:27017")
    console.log("💡 You can start MongoDB with: mongod --dbpath /path/to/your/db")
  }
}

connectToMongo()

const app = express()
app.use(cors())
app.use(express.json())

const httpServer = http.createServer(app)
const io = new Server(httpServer, {
  cors: {
    origin: process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000",
    methods: ["GET", "POST"],
  },
})

const documents: Record<string, { content: string; title: string }> = {}
const documentUsers: Record<string, Record<string, any>> = {}
const cursors: Record<string, Record<string, any>> = {}

app.get("/health", (req, res) => {
  res.json({
    status: "ok",
    timestamp: new Date().toISOString(),
    mongodb: db ? "connected" : "disconnected",
  })
})

app.post("/update-title", async (req, res) => {
  const { documentId, title } = req.body

  if (!documentId || !title) {
    return res.status(400).json({ error: "Document ID and title are required" })
  }

  try {
    if (documents[documentId]) {
      documents[documentId].title = title
    }

    if (db) {
      await db.collection("documents").updateOne({ documentId }, { $set: { title } }, { upsert: false })
    }

    io.to(documentId).emit("title_updated", { documentId, title })

    return res.status(200).json({ success: true })
  } catch (error) {
    console.error("Failed to update document title:", error)
    return res.status(500).json({ error: "Failed to update document title" })
  }
})

io.on("connection", (socket: Socket) => {
  console.log(`👤 Socket connected: ${socket.id}`)

  let currentDocumentId: string | null = null
  let currentUserId: string | null = null

  socket.on("join_document", async ({ documentId, userId, displayName, email, color }) => {
    currentDocumentId = documentId
    currentUserId = userId

    socket.join(documentId)

    if (!documentUsers[documentId]) {
      documentUsers[documentId] = {}
    }

    const existingUserSockets = Object.values(documentUsers[documentId]).filter((user: any) => user.userId === userId)

    if (!documentUsers[documentId][socket.id]) {
      documentUsers[documentId][socket.id] = {
        userId,
        displayName,
        email,
        color,
        socketId: socket.id,
        joinedAt: new Date(),
      }
    }

    if (!documents[documentId]) {
      if (db) {
        try {
          const doc = await db.collection("documents").findOne({ documentId })
          if (doc) {
            documents[documentId] = {
              content: doc.content || "",
              title: doc.title || "Untitled Document",
            }
            console.log(`📄 Loaded existing document: ${documentId}`)
          } else {
            documents[documentId] = {
              content: "",
              title: "Untitled Document",
            }

            await db.collection("documents").insertOne({
              documentId,
              content: "",
              title: "Untitled Document",
              createdAt: new Date(),
              updatedAt: new Date(),
            })
            console.log(`📝 Created new document: ${documentId}`)
          }
        } catch (error) {
          console.error("Failed to load document from MongoDB", error)
          documents[documentId] = {
            content: "",
            title: "Untitled Document",
          }
        }
      } else {
        documents[documentId] = {
          content: "",
          title: "Untitled Document",
        }
      }
    }

    if (db) {
      try {
        const doc = await db.collection("documents").findOne({ documentId })
        if (doc && doc.ownerId && doc.ownerId !== userId) {
          const isCollaborator = doc.collaborators?.some((collab: any) => collab.userId === userId)

          if (!isCollaborator) {
            await db.collection<Document>("documents").updateOne(
              { documentId },
              {
                $push: {
                  collaborators: {
                    userId: userId,
                    email: email,
                    name: displayName,
                    addedAt: new Date(),
                  } as Collaborator,
                },
              },
            )
            console.log(`👥 Auto-added ${displayName} as collaborator to document ${documentId}`)
          }
        }
      } catch (error) {
        console.error("Failed to auto-add collaborator:", error)
      }
    }

    socket.emit("document_data", documents[documentId])

    const uniqueUsers = getUniqueUsers(documentId)

    io.to(documentId).emit("online_users", uniqueUsers)

    if (existingUserSockets.length === 0) {
      socket.to(documentId).emit("user_joined", {
        userId,
        displayName,
        email,
        color,
      })
      console.log(`👋 User ${displayName} joined document ${documentId} (first connection)`)
    } else {
      console.log(`🔄 User ${displayName} connected from additional browser/tab to document ${documentId}`)
    }
  })

  socket.on("delete_document", async ({ documentId }) => {
    if (!documentId) return

    try {
      if (db) {
        await db.collection("documents").deleteOne({ documentId })
      }

      delete documents[documentId]
      delete documentUsers[documentId]
      delete cursors[documentId]

      io.to(documentId).emit("document_deleted", { documentId })

      console.log(`🗑️ Document ${documentId} deleted and all users notified`)
    } catch (error) {
      console.error("Failed to delete document:", error)
    }
  })

  socket.on("update", ({ documentId, content }) => {
    if (!documentId || !documents[documentId]) return

    documents[documentId].content = content

    socket.to(documentId).emit("update", {
      documentId,
      content,
    })
  })

  socket.on("save_document", async ({ documentId, content }) => {
    if (!documentId || !documents[documentId]) return

    documents[documentId].content = content

    if (db) {
      try {
        await db.collection("documents").updateOne(
          { documentId },
          {
            $set: {
              content,
              updatedAt: new Date(),
            },
          },
          { upsert: false },
        )

        socket.emit("document_saved", { documentId })
        socket.to(documentId).emit("document_saved_broadcast", { documentId })

        console.log(`💾 Document ${documentId} saved to database and broadcasted to all users`)
      } catch (error) {
        console.error("Failed to save document to MongoDB", error)
      }
    }
  })

  socket.on("cursor_move", (data) => {
    const { documentId, userId, x, y, displayName, color } = data

    if (!documentId || !documentUsers[documentId]) return

    if (!cursors[documentId]) {
      cursors[documentId] = {}
    }

    cursors[documentId][userId] = {
      userId,
      x,
      y,
      displayName,
      color,
      lastUpdate: Date.now(),
    }

    socket.to(documentId).emit("cursor_move", {
      userId,
      x,
      y,
      displayName,
      color,
    })
  })

  socket.on("disconnect", () => {
    console.log(`👤 Socket disconnected: ${socket.id}`)

    if (currentDocumentId && currentUserId && documentUsers[currentDocumentId]) {
      const user = documentUsers[currentDocumentId][socket.id]
      if (user) {
        delete documentUsers[currentDocumentId][socket.id]

        const remainingUserSockets = Object.values(documentUsers[currentDocumentId]).filter(
          (u: any) => u.userId === currentUserId,
        )

        if (remainingUserSockets.length === 0) {
          if (cursors[currentDocumentId] && cursors[currentDocumentId][currentUserId]) {
            delete cursors[currentDocumentId][currentUserId]
          }

          io.to(currentDocumentId).emit("user_left", currentUserId)

          console.log(`👋 User ${user.displayName} completely left document ${currentDocumentId}`)
        } else {
          console.log(
            `🔄 User ${user.displayName} disconnected one browser/tab but still has ${remainingUserSockets.length} active connection(s)`,
          )
        }

        const uniqueUsers = getUniqueUsers(currentDocumentId)
        io.to(currentDocumentId).emit("online_users", uniqueUsers)
      }

      if (Object.keys(documentUsers[currentDocumentId]).length === 0) {
        delete documentUsers[currentDocumentId]
        delete cursors[currentDocumentId]
        console.log(`🧹 Document ${currentDocumentId} has no users, cleaning up`)
      }
    }
  })
})

function getUniqueUsers(documentId: string) {
  if (!documentUsers[documentId]) return []

  const userMap = new Map()

  Object.values(documentUsers[documentId]).forEach((user: any) => {
    if (!userMap.has(user.userId)) {
      userMap.set(user.userId, {
        userId: user.userId,
        displayName: user.displayName,
        color: user.color,
      })
    }
  })

  return Array.from(userMap.values())
}

process.on("SIGINT", async () => {
  console.log("\n🛑 Shutting down server...")

  if (client) {
    await client.close()
    console.log("📦 MongoDB connection closed")
  }

  httpServer.close(() => {
    console.log("🔌 HTTP server closed")
    process.exit(0)
  })
})

const PORT = process.env.PORT || 8080
httpServer.listen(PORT, () => {
  console.log(`🚀 Server is running on ${process.env.NEXT_PUBLIC_API_URL}`)
  console.log(`📊 Health check available at ${process.env.NEXT_PUBLIC_API_URL}/health`)
  console.log(`🔗 Make sure your frontend is running on ${process.env.NEXT_PUBLIC_APP_URL}`)
})
