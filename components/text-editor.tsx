"use client"

import type React from "react"

import { useEffect, useState, useRef, useCallback } from "react"
import { io, type Socket } from "socket.io-client"
import { useUser } from "@/context/user-context"
import { useDocument } from "@/context/document-context"
import { UserCursor } from "@/components/user-cursor"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { toast } from "@/components/ui/use-toast"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Edit, Eye } from "lucide-react"
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
  onSave: React.MutableRefObject<() => void>
  initialContent?: string
  initialTitle?: string
}

export function TextEditor({ documentId, onSaveStatusChange, onSave, initialContent = "", initialTitle = "Untitled Document" }: EditorProps) {
  const [documentContent, setDocumentContent] = useState<string>(initialContent)
  const [socket, setSocket] = useState<Socket | null>(null)
  const [cursors, setCursors] = useState<Record<string, CursorPosition>>({})
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false)
  const [isClient, setIsClient] = useState(false)
  const [activeTab, setActiveTab] = useState("preview")
  const [initialLoadComplete, setInitialLoadComplete] = useState(false)

  const editorRef = useRef<HTMLDivElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const { currentUser, addOnlineUser, removeOnlineUser } = useUser()
  const { setDocumentTitle } = useDocument()
  const socketRef = useRef<Socket | null>(null)

  useEffect(() => {
    setIsClient(true)
    setDocumentContent(initialContent)
    setDocumentTitle(initialTitle)
    setInitialLoadComplete(true)
  }, [initialContent, initialTitle, setDocumentTitle])

  const handlePaste = (e: React.ClipboardEvent<HTMLTextAreaElement>) => {
    e.preventDefault()

    const text = e.clipboardData.getData("text/plain")
    const textarea = e.currentTarget
    const start = textarea.selectionStart
    const end = textarea.selectionEnd

    const newContent = documentContent.substring(0, start) + text + documentContent.substring(end)
    setDocumentContent(newContent)
    
    textarea.value = newContent
    
    const newCursorPos = start + text.length
    setTimeout(() => {
      textarea.setSelectionRange(newCursorPos, newCursorPos)
      textarea.focus()
    }, 0)

    handleContentChange(newContent)

    toast({
      title: "Formatting removed",
      description: "Content pasted as plain text",
      duration: 2000,
    })
  }

  const handleManualSave = useCallback(() => {
    if (!socketRef.current || !documentId) return

    onSaveStatusChange("saving")
    setHasUnsavedChanges(false)

    socketRef.current.emit("save_document", {
      documentId,
      content: documentContent,
    })
  }, [documentId, onSaveStatusChange, documentContent])


  useEffect(() => {
    onSave.current = handleManualSave
  }, [handleManualSave, onSave])

  useEffect(() => {
    if (!currentUser?.id || !documentId || !isClient || !initialLoadComplete) return

    console.log("🔌 Establishing socket connection for user:", currentUser.displayName)

    const newSocket = io(process.env.NEXT_PUBLIC_API_URL, {
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
        email: currentUser.email,
        color: currentUser.color,
        currentContent: documentContent
      })
    })

    newSocket.on("document_data", (data) => {
      console.log("📄 Received document data for user:", currentUser.displayName)
      if (data.content && data.content !== documentContent) {
        const content = data.content
        setDocumentContent(content)
        
        if (textareaRef.current) {
          textareaRef.current.value = content
        }
        
        if (data.title) {
          setDocumentTitle(data.title)
        }
        onSaveStatusChange("saved")
        setHasUnsavedChanges(false)
      }
    })

    newSocket.on("update", (data) => {
      if (data.content !== documentContent) {
        let selectionStart = 0
        let selectionEnd = 0
        
        if (textareaRef.current && document.activeElement === textareaRef.current) {
          selectionStart = textareaRef.current.selectionStart
          selectionEnd = textareaRef.current.selectionEnd
        }

        setDocumentContent(data.content)
        
        if (textareaRef.current) {
          textareaRef.current.value = data.content
          
          if (document.activeElement === textareaRef.current) {
            setTimeout(() => {
              if (textareaRef.current) {
                textareaRef.current.setSelectionRange(selectionStart, selectionEnd)
              }
            }, 0)
          }
        }
      }
    })

    newSocket.on("user_joined", (userData) => {
      addOnlineUser({
        id: userData.userId,
        displayName: userData.displayName,
        email: userData.email,
        color: userData.color,
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
      removeOnlineUser(userId)
      setCursors((prev) => {
        const newCursors = { ...prev }
        delete newCursors[userId]
        return newCursors
      })
    })

    newSocket.on("online_users", (users) => {
      users.forEach((user: any) => {
        if (user.userId !== currentUser.id) {
          addOnlineUser({
            id: user.userId,
            displayName: user.displayName,
            email: user.email,
            color: user.color,
          })
        }
      })
    })

    newSocket.on("document_saved", () => {
      onSaveStatusChange("saved")
    })

    newSocket.on("document_saved_broadcast", () => {
      onSaveStatusChange("saved")
      setHasUnsavedChanges(false)
    })

    return () => {
      console.log("🧹 Cleaning up socket connection for user:", currentUser.displayName)
      newSocket.disconnect()
      socketRef.current = null
    }
  }, [currentUser?.id, documentId, isClient, initialLoadComplete])

  const handleContentChange = (newContent?: string) => {
    const content = newContent ?? (textareaRef.current?.value || "")
    setDocumentContent(content)
    setHasUnsavedChanges(true)
    onSaveStatusChange("unsaved")

    if (socketRef.current) {
      socketRef.current.emit("update", {
        documentId,
        content,
      })
    }
  }

  const handleTextareaChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    handleContentChange(e.target.value)
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

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Tab') {
      e.preventDefault()
      const textarea = e.currentTarget
      const start = textarea.selectionStart
      const end = textarea.selectionEnd
      
      const newContent = documentContent.substring(0, start) + '  ' + documentContent.substring(end)
      setDocumentContent(newContent)
      textarea.value = newContent
      
      setTimeout(() => {
        textarea.setSelectionRange(start + 2, start + 2)
      }, 0)
      
      handleContentChange(newContent)
    }
  }

  useEffect(() => {
    if (textareaRef.current && textareaRef.current.value !== documentContent) {
      textareaRef.current.value = documentContent
    }
  }, [documentContent])

  return (
    <div className="max-w-5xl mx-auto w-full">
      {(!isClient || !documentContent) && (
        <div className="absolute inset-0 bg-white/80 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="flex flex-col items-center gap-3">
            <div className="w-10 h-10 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
            <p className="text-slate-600 font-medium">Loading editor...</p>
          </div>
        </div>
      )}
      <Card className="shadow-lg border-slate-200 overflow-hidden">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <div className="border-b border-slate-200 bg-slate-50/50 p-2 flex items-center justify-between">
            <TabsList className="bg-slate-100">
              <TabsTrigger value="edit" className="flex items-center gap-1">
                <Edit className="h-3.5 w-3.5" />
                <span>Edit</span>
              </TabsTrigger>
              <TabsTrigger value="preview" className="flex items-center gap-1">
                <Eye className="h-3.5 w-3.5" />
                <span>View</span>
              </TabsTrigger>
            </TabsList>
            <Badge variant="outline" className="text-xs px-2 py-1 border-purple-200 text-purple-700 bg-purple-50">
              Markdown Editor
            </Badge>
          </div>

          <TabsContent value="edit" className="mt-0 p-0">
            <div
              ref={editorRef}
              className="relative w-full min-h-[calc(100vh-16rem)] bg-white"
              onMouseMove={handleMouseMove}
            >
              <textarea
                ref={textareaRef}
                className="w-full h-full p-8 focus:outline-none text-slate-800 min-h-[calc(100vh-10rem)] leading-relaxed resize-none border-none bg-transparent"
                onChange={handleTextareaChange}
                onPaste={handlePaste}
                onKeyDown={handleKeyDown}
                placeholder="Start typing your markdown here. If you already edited the document, wait until it loads..."
                style={{
                  fontSize: "16px",
                  lineHeight: "1.6",
                  fontFamily: "ui-monospace, SFMono-Regular, 'SF Mono', Monaco, Consolas, 'Liberation Mono', 'Courier New', monospace",
                }}
                defaultValue={documentContent}
              />

              {Object.values(cursors).map((cursor) => {
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
          </TabsContent>

          <TabsContent value="preview" className="mt-0 p-0">
            <div className="w-full min-h-[calc(100vh-16rem)] bg-white p-8 overflow-auto">
              <div className="prose prose-slate max-w-none">
                <ReactMarkdown
                  remarkPlugins={[remarkGfm, remarkBreaks]}
                  components={{
                    h1: ({ node, ...props }) => <h1 className="text-3xl font-bold text-slate-900 mb-4" {...props} />,
                    h2: ({ node, ...props }) => <h2 className="text-2xl font-bold text-slate-800 mb-3" {...props} />,
                    h3: ({ node, ...props }) => <h3 className="text-xl font-bold text-slate-800 mb-2" {...props} />,
                    h4: ({ node, ...props }) => <h4 className="text-lg font-bold text-slate-800 mb-2" {...props} />,
                    h5: ({ node, ...props }) => <h5 className="text-base font-bold text-slate-800 mb-1" {...props} />,
                    h6: ({ node, ...props }) => <h6 className="text-sm font-bold text-slate-800 mb-1" {...props} />,
                    p: ({ node, ...props }) => <p className="text-slate-700 mb-4 leading-relaxed" {...props} />,
                    a: ({ node, ...props }) => (
                      <a
                        className="text-blue-600 hover:underline"
                        target="_blank"
                        rel="noopener noreferrer"
                        {...props}
                      />
                    ),
                    ul: ({ node, ...props }) => <ul className="list-disc pl-6 mb-4 space-y-1" {...props} />,
                    ol: ({ node, ...props }) => <ol className="list-decimal pl-6 mb-4 space-y-1" {...props} />,
                    li: ({ node, ...props }) => <li className="text-slate-700" {...props} />,
                    blockquote: ({ node, ...props }) => (
                      <blockquote className="border-l-4 border-slate-300 pl-4 italic text-slate-600 my-4" {...props} />
                    ),
                    code: ({ children, className, ...props }) => {
                      if (!className) {
                        return (
                          <code
                            className="bg-slate-100 px-1.5 py-0.5 rounded text-sm font-mono text-slate-800"
                            {...props}
                          >
                            {children}
                          </code>
                        )
                      }
                      return (
                        <code className={className} {...props}>
                          {children}
                        </code>
                      )
                    },
                    pre: ({ node, ...props }) => (
                      <pre className="bg-slate-800 text-slate-100 p-4 rounded-lg overflow-x-auto mb-4 text-sm" {...props} />
                    ),
                    table: ({ node, ...props }) => (
                      <div className="overflow-x-auto mb-4">
                        <table className="min-w-full border border-slate-200" {...props} />
                      </div>
                    ),
                    thead: ({ node, ...props }) => (
                      <thead className="bg-slate-50" {...props} />
                    ),
                    th: ({ node, ...props }) => (
                      <th className="border border-slate-200 px-4 py-2 text-left font-semibold text-slate-800" {...props} />
                    ),
                    td: ({ node, ...props }) => (
                      <td className="border border-slate-200 px-4 py-2 text-slate-700" {...props} />
                    ),
                    hr: ({ node, ...props }) => (
                      <hr className="border-slate-300 my-6" {...props} />
                    ),
                  }}
                >
                  {documentContent || `# Welcome to Markdown Editor.`}
                </ReactMarkdown>
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </Card>
    </div>
  )
}
