"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Search, Plus, FileText, Users, Clock, LogOut, Trash } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { DropdownMenu, DropdownMenuContent, DropdownMenuTrigger, DropdownMenuItem } from "@/components/ui/dropdown-menu"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { v4 as uuidv4 } from "uuid"
import type { JWTPayload } from "@/lib/auth"

interface Document {
  id: string
  title: string
  lastModified: string
  collaborators: number
  isOwner: boolean
  ownerEmail?: string
}

interface DashboardProps {
  user: JWTPayload
}

export function Dashboard({ user }: DashboardProps) {
  const router = useRouter()
  const [searchQuery, setSearchQuery] = useState("")
  const [ownDocuments, setOwnDocuments] = useState<Document[]>([])
  const [sharedDocuments, setSharedDocuments] = useState<Document[]>([])
  const [loading, setLoading] = useState(true)
  const [documentToDelete, setDocumentToDelete] = useState<string | null>(null)

  useEffect(() => {
    fetchDocuments()
  }, [])

  const fetchDocuments = async () => {
    try {
      const response = await fetch("/api/documents")
      if (response.ok) {
        const data = await response.json()
        setOwnDocuments(data.ownDocuments || [])
        setSharedDocuments(data.sharedDocuments || [])
        console.log("📊 Fetched documents:", {
          own: data.ownDocuments?.length || 0,
          shared: data.sharedDocuments?.length || 0,
        })
      }
    } catch (error) {
      console.error("Error fetching documents:", error)
    } finally {
      setLoading(false)
    }
  }

  const createNewDocument = async () => {
    const newDocId = uuidv4()

    try {
      const response = await fetch("/api/documents", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ documentId: newDocId, title: "Untitled Document" }),
      })

      if (response.ok) {
        router.push(`/document/${newDocId}`)
      }
    } catch (error) {
      console.error("Error creating document:", error)
    }
  }

  const handleLogout = async () => {
    try {
      await fetch("/api/auth/logout", { method: "POST" })
      router.push("/auth/login")
      router.refresh()
    } catch (error) {
      console.error("Logout error:", error)
    }
  }

  const filteredOwnDocuments = ownDocuments.filter((doc) => doc.title.toLowerCase().includes(searchQuery.toLowerCase()))

  const filteredSharedDocuments = sharedDocuments.filter((doc) =>
    doc.title.toLowerCase().includes(searchQuery.toLowerCase()),
  )

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    const now = new Date()
    const diffInHours = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60))

    if (diffInHours < 1) return "Just now"
    if (diffInHours < 24) return `${diffInHours} hours ago`
    if (diffInHours < 48) return "1 day ago"
    return `${Math.floor(diffInHours / 24)} days ago`
  }

  const deleteDocument = async (docId: string) => {
    try {
      const response = await fetch(`/api/documents/${docId}`, {
        method: "DELETE",
      })

      if (response.ok) {
        setOwnDocuments((prevDocs) => prevDocs.filter((doc) => doc.id !== docId))
        console.log("🗑️ Document deleted successfully:", docId)
      } else {
        console.error("Failed to delete document")
      }
    } catch (error) {
      console.error("Error deleting document:", error)
    }
    setDocumentToDelete(null)
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50">
      <header className="border-b border-slate-200 bg-white/80 backdrop-blur-sm shadow-sm">
        <div className="flex items-center justify-between h-14 px-4 md:px-6">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <div className="relative">
                <div className="h-10 w-10 rounded-lg bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center shadow-md">
                  <FileText className="h-5 w-5 text-white" />
                </div>
                <div className="absolute -top-0.5 -right-0.5 h-3 w-3 bg-green-400 rounded-full border-2 border-white"></div>
              </div>
              <div className="flex flex-col">
                <span className="text-lg font-bold text-slate-900">LiveDocs</span>
                <span className="text-xs text-slate-500 -mt-0.5">Collaborative Editor</span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <Button
              onClick={createNewDocument}
              className="bg-blue-600 hover:bg-blue-700 text-white font-medium h-9 px-4"
            >
              <Plus className="h-4 w-4 mr-2" />
              New Document
            </Button>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="h-9 w-9 p-0">
                  <Avatar className="h-8 w-8">
                    <AvatarFallback className="bg-blue-100 text-blue-700 font-semibold">
                      {user.name.charAt(0).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-64">
                <div className="px-3 py-2 border-b">
                  <p className="font-medium text-sm truncate">{user.name}</p>
                  <p className="text-xs text-slate-500 truncate">{user.email}</p>
                </div>
                <DropdownMenuItem onClick={handleLogout} className="text-red-600">
                  <LogOut className="h-4 w-4 mr-2" />
                  Sign out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8 max-w-6xl">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-slate-900 mb-2">Welcome back, {user.name.split(" ")[0]}! 👋</h1>
          <p className="text-slate-600">Manage your documents and collaborate with your team in real-time.</p>
        </div>

        <div className="max-w-md mb-8">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-slate-400" />
            <Input
              type="text"
              placeholder="Search documents..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 pr-4 py-3 border-slate-300 focus:border-blue-500 focus:ring-blue-500 rounded-lg"
            />
          </div>
        </div>

        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold text-slate-900">My Documents</h2>
            <Badge variant="secondary" className="px-2 py-1">
              {filteredOwnDocuments.length}
            </Badge>
          </div>

          {loading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {[...Array(3)].map((_, i) => (
                <Card key={i} className="animate-pulse">
                  <CardContent className="p-4">
                    <div className="h-4 bg-slate-200 rounded mb-2"></div>
                    <div className="h-3 bg-slate-200 rounded w-2/3"></div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : filteredOwnDocuments.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredOwnDocuments.map((doc) => (
                <Card
                  key={doc.id}
                  className="hover:shadow-lg transition-all duration-200 border-slate-200 hover:border-blue-300"
                >
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-blue-100 to-blue-200 flex items-center justify-center">
                          <FileText className="h-4 w-4 text-blue-600" />
                        </div>
                        <div>
                          <h3 className="font-semibold text-slate-900 text-sm">{doc.title}</h3>
                        </div>
                      </div>
                      <Badge
                        variant="outline"
                        className="text-xs px-1.5 py-0.5 border-blue-200 text-blue-700 bg-blue-50"
                      >
                        Owner
                      </Badge>
                    </div>

                    <div className="flex items-center justify-between text-xs text-slate-500 mb-3">
                      <div className="flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {formatDate(doc.lastModified)}
                      </div>
                      <div className="flex items-center gap-1">
                        <Users className="h-3 w-3" />
                        <Badge variant="secondary" className="text-xs px-1.5 py-0.5">
                          {doc.collaborators + 1}
                        </Badge>
                      </div>
                    </div>

                    <div className="flex items-center justify-between">
                      <Button
                        variant="outline"
                        size="sm"
                        className="text-xs"
                        onClick={() => router.push(`/document/${doc.id}`)}
                      >
                        <FileText className="h-3 w-3 mr-1" />
                        Open
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        className="text-xs text-red-600 hover:text-red-700 hover:bg-red-50"
                        onClick={() => setDocumentToDelete(doc.id)}
                      >
                        <Trash className="h-3 w-3" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <Card className="border-dashed border-2 border-slate-300 max-w-md mx-auto">
              <CardContent className="p-6 text-center">
                <FileText className="h-10 w-10 text-slate-300 mx-auto mb-3" />
                <h3 className="text-base font-medium text-slate-900 mb-2">No documents yet</h3>
                <p className="text-slate-500 mb-4 text-sm">Create your first document to get started</p>
                <Button onClick={createNewDocument} className="bg-blue-600 hover:bg-blue-700 text-white text-sm">
                  <Plus className="h-4 w-4 mr-2" />
                  Create Document
                </Button>
              </CardContent>
            </Card>
          )}
        </div>

        {(filteredSharedDocuments.length > 0 || (!loading && sharedDocuments.length > 0)) && (
          <div>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold text-slate-900">Shared with Me</h2>
              <Badge variant="secondary" className="px-2 py-1">
                {filteredSharedDocuments.length}
              </Badge>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredSharedDocuments.map((doc) => (
                <Card
                  key={doc.id}
                  className="hover:shadow-lg transition-all duration-200 border-slate-200 hover:border-green-300"
                >
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-green-100 to-green-200 flex items-center justify-center">
                          <FileText className="h-4 w-4 text-green-600" />
                        </div>
                        <div>
                          <h3 className="font-semibold text-slate-900 text-sm">{doc.title}</h3>
                          <p className="text-xs text-slate-500">by {doc.ownerEmail}</p>
                        </div>
                      </div>
                      <Badge
                        variant="outline"
                        className="text-xs px-1.5 py-0.5 border-green-200 text-green-700 bg-green-50"
                      >
                        Shared
                      </Badge>
                    </div>

                    <div className="flex items-center justify-between text-xs text-slate-500 mb-3">
                      <div className="flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {formatDate(doc.lastModified)}
                      </div>
                      <div className="flex items-center gap-1">
                        <Users className="h-3 w-3" />
                        <Badge variant="secondary" className="text-xs px-1.5 py-0.5">
                          {doc.collaborators + 1}
                        </Badge>
                      </div>
                    </div>

                    <div className="flex items-center justify-between">
                      <Button
                        variant="outline"
                        size="sm"
                        className="text-xs"
                        onClick={() => router.push(`/document/${doc.id}`)}
                      >
                        <FileText className="h-3 w-3 mr-1" />
                        Open
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        )}

        <AlertDialog open={!!documentToDelete} onOpenChange={(open) => !open && setDocumentToDelete(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
              <AlertDialogDescription>
                This will permanently delete the document and remove it for all collaborators. This action cannot be undone.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction
                onClick={() => documentToDelete && deleteDocument(documentToDelete)}
                className="bg-red-600 hover:bg-red-700 text-white"
              >
                Delete
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </main>
    </div>
  )
}
