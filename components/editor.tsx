"use client"

import type React from "react"

import { useEffect, useState, useRef, useCallback } from "react"
import { io, type Socket } from "socket.io-client"
import { useUser } from "@/context/user-context"
import { useDocument } from "@/context/document-context"
import { UserCursor } from "@/components/user-cursor"
import { Card } from "@/components/ui/card"
import ReactMarkdown from "react-markdown"
import remarkGfm from "remark-gfm"
import remarkBreaks from "remark-breaks"

interface CursorPosition {
  userId: string
  x: number
  y: number
  displayName: string
  color: string
}

interface EditorProps {
  documentId: string
  onSaveStatusChange: (status: "saved" | "saving" | "unsaved") => void
  onSave: () => void
}

export function Editor({ documentId, onSaveStatusChange, onSave }: EditorProps) {
  const [document, setDocument] = useState<string>("")
  const [socket, setSocket] = useState<Socket | null>(null)
  const [cursors, setCursors] = useState<Record<string, CursorPosition>>({})
  const [isPreview, setIsPreview] = useState(false)
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false)
  const editorRef = useRef<HTMLDivElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const { currentUser, addOnlineUser, removeOnlineUser } = useUser()
  const { setDocumentTitle } = useDocument()
  const socketRef = useRef<Socket | null>(null)

  const handleManualSave = useCallback(() => {
    if (!socketRef.current || !documentId) return

    onSaveStatusChange("saving")
    setHasUnsavedChanges(false)

    socketRef.current.emit("save_document", {
      documentId,
      content: document,
    })
  }, [document, documentId, onSaveStatusChange])

  useEffect(() => {
    if (onSave) {
      onSave()
    }
  }, [handleManualSave, onSave])

  useEffect(() => {
    if (!currentUser?.id || !documentId) return

    console.log("🔌 Establishing socket connection for user:", currentUser.displayName)

    const newSocket = io(process.env.NEXT_PUBLIC_API_URL || "http://localhost:8080", {
      forceNew: false,
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
      timeout: 20000,
    })

    setSocket(newSocket)
    socketRef.current = newSocket

    newSocket.on("connect", () => {
      console.log("✅ Socket connected for user:", currentUser.displayName)
      newSocket.emit("join_document", {
        documentId,
        userId: currentUser.id,
        displayName: currentUser.displayName,
        color: currentUser.color,
      })
    })

    newSocket.on("disconnect", (reason) => {
      console.log("❌ Socket disconnected for user:", currentUser.displayName, "Reason:", reason)
    })

    newSocket.on("connect_error", (error) => {
      console.error("🔥 Socket connection error for user:", currentUser.displayName, error)
    })

    newSocket.on("document_data", (data) => {
      console.log("📄 Received document data for user:", currentUser.displayName)
      setDocument(data.content)
      setDocumentTitle(data.title || "Untitled Document")
      onSaveStatusChange("saved")
      setHasUnsavedChanges(false)
    })

    newSocket.on("update", (data) => {
      setDocument(data.content)
    })

    newSocket.on("user_joined", (userData) => {
      console.log("👋 User joined:", userData.displayName)
      addOnlineUser({
        id: userData.userId,
        displayName: userData.displayName,
        color: userData.color,
        email: `${userData.userId}@user.local`
      })
    })

    newSocket.on("cursor_move", (data: CursorPosition) => {
      if (data.userId !== currentUser.id) {
        setCursors((prev) => ({
          ...prev,
          [data.userId]: data,
        }))
      }
    })

    newSocket.on("user_left", (userId: string) => {
      console.log("👋 User completely left:", userId)
      removeOnlineUser(userId)
      setCursors((prev) => {
        const newCursors = { ...prev }
        delete newCursors[userId]
        return newCursors
      })
    })

    newSocket.on("online_users", (users) => {
      console.log("📊 Updated online users list:", users.length, "users")
      users.forEach((user: any) => {
        if (user.userId !== currentUser.id) {
          addOnlineUser({
            id: user.userId,
            displayName: user.displayName,
            color: user.color,
            email: `${user.userId}@user.local`
          })
        }
      })
    })

    newSocket.on("document_saved", () => {
      console.log("💾 Document saved successfully by current user")
      onSaveStatusChange("saved")
    })

    newSocket.on("document_saved_broadcast", () => {
      console.log("📢 Document saved by another user")
      onSaveStatusChange("saved")
      setHasUnsavedChanges(false)
    })

    return () => {
      console.log("🧹 Cleaning up socket connection for user:", currentUser.displayName)
      newSocket.disconnect()
      socketRef.current = null
    }
  }, [currentUser?.id, documentId])

  const handleInputChange = (event: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newDocument = event.target.value
    setDocument(newDocument)
    setHasUnsavedChanges(true)
    onSaveStatusChange("unsaved")

    if (socketRef.current) {
      socketRef.current.emit("update", {
        documentId,
        content: newDocument,
      })
    }
  }

  const handleMouseMove = (event: React.MouseEvent) => {
    if (!socketRef.current || !currentUser || !editorRef.current) return

    const rect = editorRef.current.getBoundingClientRect()
    const x = event.clientX - rect.left
    const y = event.clientY - rect.top

    socketRef.current.emit("cursor_move", {
      documentId,
      userId: currentUser.id,
      displayName: currentUser.displayName,
      color: currentUser.color,
      x,
      y,
    })
  }

  return (
    <div className="max-w-4xl mx-auto w-full">
      <Card className="shadow-lg border-gray-200 overflow-hidden">
        <div className="flex items-center justify-between p-4 border-b border-gray-200 bg-gradient-to-r from-gray-50 to-gray-100">
          <div className="flex items-center gap-3">
            <div className="h-2 w-2 rounded-full bg-green-400"></div>
            <span className="text-sm font-bold text-gray-700">Markdown Editor</span>
            <span className="text-xs text-gray-500 bg-white px-2 py-1 rounded-full">
              Real-time collaboration enabled
            </span>
            {hasUnsavedChanges && (
              <span className="text-xs text-orange-600 bg-orange-50 px-2 py-1 rounded-full font-medium">
                Unsaved changes
              </span>
            )}
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setIsPreview(false)}
              className={`px-4 py-2 text-sm font-bold rounded-lg transition-all ${
                !isPreview ? "bg-blue-600 text-white shadow-md" : "text-gray-600 hover:bg-gray-200"
              }`}
            >
              Edit
            </button>
            <button
              onClick={() => setIsPreview(true)}
              className={`px-4 py-2 text-sm font-bold rounded-lg transition-all ${
                isPreview ? "bg-blue-600 text-white shadow-md" : "text-gray-600 hover:bg-gray-200"
              }`}
            >
              Preview
            </button>
          </div>
        </div>

        <div
          ref={editorRef}
          className="relative w-full min-h-[calc(100vh-14rem)] bg-white"
          onMouseMove={handleMouseMove}
        >
          {isPreview ? (
            <div className="p-8 prose prose-gray max-w-none prose-headings:font-bold prose-h1:text-3xl prose-h2:text-2xl prose-h3:text-xl prose-p:text-gray-700 prose-strong:text-gray-900 prose-code:bg-gray-100 prose-code:px-1 prose-code:py-0.5 prose-code:rounded prose-pre:bg-gray-900 prose-pre:text-gray-100">
              <ReactMarkdown
                remarkPlugins={[remarkGfm, remarkBreaks]}
                components={{
                  h1: ({ children }) => <h1 className="text-3xl font-bold text-gray-900 mb-4">{children}</h1>,
                  h2: ({ children }) => <h2 className="text-2xl font-bold text-gray-800 mb-3">{children}</h2>,
                  h3: ({ children }) => <h3 className="text-xl font-bold text-gray-800 mb-2">{children}</h3>,
                  p: ({ children }) => <p className="text-gray-700 mb-4 leading-relaxed">{children}</p>,
                  strong: ({ children }) => <strong className="font-bold text-gray-900">{children}</strong>,
                  em: ({ children }) => <em className="italic text-gray-700">{children}</em>,
                  code: ({ children }) => (
                    <code className="bg-gray-100 px-2 py-1 rounded text-sm font-mono text-gray-800">{children}</code>
                  ),
                  pre: ({ children }) => (
                    <pre className="bg-gray-900 text-gray-100 p-4 rounded-lg overflow-x-auto">{children}</pre>
                  ),
                }}
              >
                {document ||
                  "# Welcome to LiveDocs!\n\nStart typing to see your markdown rendered here...\n\n## Features:\n- **Real-time collaboration**\n- *Live cursor tracking*\n- `Markdown support`\n- Auto-save functionality"}
              </ReactMarkdown>
            </div>
          ) : (
            <textarea
              ref={textareaRef}
              value={document}
              onChange={handleInputChange}
              className="w-full h-full p-8 resize-none focus:outline-none text-gray-800 min-h-[calc(100vh-14rem)] font-mono leading-relaxed"
              placeholder="# Welcome to LiveDocs! Start typing your markdown here..."
              style={{
                fontSize: "15px",
                lineHeight: "1.7",
              }}
            />
          )}

          {!isPreview &&
            Object.values(cursors).map((cursor) => {
              if (cursor.userId === currentUser?.id) return null

              return (
                <UserCursor
                  key={cursor.userId}
                  x={cursor.x}
                  y={cursor.y}
                  displayName={cursor.displayName}
                  color={cursor.color}
                />
              )
            })}
        </div>
      </Card>
    </div>
  )
}
