"use client"

import type React from "react"
import { FileText, Share2, UserCircle, Copy, LinkIcon, Check, Save, Home, LogOut } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { DropdownMenu, DropdownMenuContent, DropdownMenuTrigger, DropdownMenuItem } from "@/components/ui/dropdown-menu"
import { useUser } from "@/context/user-context"
import { useDocument } from "@/context/document-context"
import { useEffect, useState } from "react"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { toast } from "@/components/ui/use-toast"
import { useRouter } from "next/navigation"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

interface NavbarProps {
  documentId: string
  saveStatus: "saved" | "saving" | "unsaved"
  onSave: () => void
  currentUser: {
    userId: string
    email: string
    name: string
  }
}

export function Navbar({ documentId, saveStatus, onSave, currentUser }: NavbarProps) {
  const { onlineUsers } = useUser()
  const { documentTitle, updateDocumentTitle } = useDocument()
  const [shareUrl, setShareUrl] = useState("")
  const [isEditing, setIsEditing] = useState(false)
  const [title, setTitle] = useState(documentTitle || "Untitled Document")
  const router = useRouter()

  const [shareDialogOpen, setShareDialogOpen] = useState(false)
  const [shareEmail, setShareEmail] = useState("")
  const [isSharing, setIsSharing] = useState(false)
  const [shareError, setShareError] = useState("")
  const [isCopied, setIsCopied] = useState(false)
  const [isValidEmail, setIsValidEmail] = useState(true)
  const [hasPublicAccess, setHasPublicAccess] = useState(false)
  const [publicUrl, setPublicUrl] = useState("")
  const [expirationDays, setExpirationDays] = useState(7)

  useEffect(() => {
    setShareUrl(`${window.location.origin}/document/${documentId}`)
    if (documentTitle) {
      setTitle(documentTitle)
    }

    // Fetch existing public link info when dialog opens
    const fetchPublicLinkInfo = async () => {
      try {
        const response = await fetch(`/api/documents/${documentId}/share`)
        const data = await response.json()
        
        if (response.ok && data.publicAccess) {
          setHasPublicAccess(data.publicAccess.enabled)
          if (data.publicAccess.enabled) {
            setPublicUrl(`${window.location.origin}/public/document/${documentId}?token=${data.publicAccess.token}`)
          }
        }
      } catch (error) {
        console.error("Failed to fetch public link info:", error)
      }
    }

    fetchPublicLinkInfo()
  }, [documentId, documentTitle])

  const copyToClipboard = async (textToCopy: string) => {
    try {
      await navigator.clipboard.writeText(textToCopy)
      setIsCopied(true)
      setTimeout(() => setIsCopied(false), 2000)
      toast({
        title: "Link copied!",
        description: "Document link has been copied to clipboard",
        duration: 2000,
      })
    } catch (error) {
      console.error("Failed to copy to clipboard:", error)
      toast({
        title: "Copy failed",
        description: "Failed to copy link to clipboard",
        variant: "destructive",
        duration: 2000,
      })
    }
  }

  const handleTitleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setTitle(e.target.value)
  }

  const handleTitleBlur = () => {
    setIsEditing(false)
    updateDocumentTitle(title)
  }

  const handleTitleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      setIsEditing(false)
      updateDocumentTitle(title)
    }
  }

  const handleSave = () => {
    onSave()
    toast({
      title: "Document saved!",
      description: "Your changes have been saved for all collaborators",
      duration: 2000,
    })
  }

  const goHome = () => {
    router.push("/dashboard")
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

  const handleCreatePublicLink = async () => {
    setIsSharing(true)
    setShareError("")

    try {
      const response = await fetch(`/api/documents/${documentId}/share`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ expirationDays })
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || "Failed to create public link")
      }

      setPublicUrl(`${window.location.origin}/public/document/${documentId}?token=${data.token}`)
      setHasPublicAccess(true)

      toast({
        title: "Public link created!",
        description: `The document can now be accessed via the public link for ${expirationDays} days`,
        duration: 3000,
        className: "bg-green-50 border-green-200",
      })
    } catch (error) {
      setShareError(error instanceof Error ? error.message : "Failed to create public link")
      toast({
        title: "Failed to create public link",
        description: error instanceof Error ? error.message : "Failed to create public link",
        duration: 3000,
        variant: "destructive",
      })
    } finally {
      setIsSharing(false)
    }
  }

  const handleDisablePublicAccess = async () => {
    setIsSharing(true)
    setShareError("")

    try {
      const response = await fetch(`/api/documents/${documentId}/share`, {
        method: "DELETE",
      })

      if (!response.ok) {
        throw new Error("Failed to disable public access")
      }

      setHasPublicAccess(false)
      setPublicUrl("")
      toast({
        title: "Public access disabled",
        description: "The public link has been deactivated",
        duration: 3000,
        className: "bg-green-50 border-green-200",
      })
    } catch (error) {
      setShareError(error instanceof Error ? error.message : "Failed to disable public access")
      toast({
        title: "Failed to disable public access",
        description: error instanceof Error ? error.message : "An error occurred",
        duration: 3000,
        variant: "destructive",
      })
    } finally {
      setIsSharing(false)
    }
  }

  const handleShareDocument = async () => {
    if (!shareEmail.trim()) return

    setIsSharing(true)
    setShareError("")

    try {
      // First validate if user exists
      const checkUserResponse = await fetch(`/api/auth/user-exists?email=${encodeURIComponent(shareEmail)}`)
      const checkUserData = await checkUserResponse.json()

      if (!checkUserResponse.ok || !checkUserData.exists) {
        throw new Error("User with this email address does not exist")
      }

      // If user exists, proceed with sharing
      const response = await fetch("/api/documents", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          documentId,
          email: shareEmail,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || "Failed to share document")
      }

      toast({
        title: "Document shared!",
        description: `Document has been shared with ${shareEmail}`,
        duration: 3000,
        className: "bg-green-50 border-green-200",
      })

      setShareDialogOpen(false)
      setShareEmail("")
    } catch (error) {
      setShareError(error instanceof Error ? error.message : "Failed to share document")
      toast({
        title: "Sharing failed",
        description: error instanceof Error ? error.message : "Failed to share document",
        duration: 3000,
        variant: "destructive",
      })
    } finally {
      setIsSharing(false)
    }
  }

  return (
    <header className="border-b border-slate-200 bg-white/80 backdrop-blur-sm shadow-sm">
      <div className="flex items-center justify-between h-12 px-4 md:px-6">
        <div className="flex items-center gap-3 min-w-0 flex-1">
          <div className="flex items-center gap-2 flex-shrink-0">
            <div className="relative cursor-pointer" onClick={goHome}>
              <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center shadow-md hover:shadow-lg transition-shadow">
                <FileText className="h-4 w-4 text-white" />
              </div>
              <div className="absolute -top-0.5 -right-0.5 h-2 w-2 bg-green-400 rounded-full border border-white"></div>
            </div>
          </div>

          <div className="h-4 w-px bg-slate-300 mx-1 hidden md:block"></div>

          <div className="min-w-0 flex-1 max-w-xs">
            {isEditing ? (
              <input
                type="text"
                value={title}
                onChange={handleTitleChange}
                onBlur={handleTitleBlur}
                onKeyDown={handleTitleKeyDown}
                className="text-sm font-semibold border-b border-blue-500 focus:border-blue-600 focus:outline-none px-1 py-1 bg-transparent text-slate-900 w-full"
                autoFocus
              />
            ) : (
              <h1
                className="text-sm font-semibold cursor-pointer hover:bg-slate-100 px-2 py-1 rounded transition-colors text-slate-900 truncate"
                onClick={() => setIsEditing(true)}
                title={title}
              >
                {title}
              </h1>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2 flex-shrink-0">
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="outline" size="sm" className="h-8 w-8 p-0 hover:bg-slate-100" onClick={goHome}>
                  <Home className="h-4 w-4 text-slate-600" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>Go to Dashboard</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>

          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="outline"
                  size="sm"
                  className="bg-white border-slate-200 hover:bg-slate-50 text-slate-700 font-medium h-8 px-3"
                  onClick={handleSave}
                  disabled={saveStatus === "saving"}
                >
                  {saveStatus === "saving" ? (
                    <>
                      <div className="h-3 w-3 mr-1 animate-spin rounded-full border border-slate-300 border-t-blue-600"></div>
                      <span className="text-xs hidden sm:inline">Saving...</span>
                    </>
                  ) : saveStatus === "saved" ? (
                    <>
                      <Check className="h-3 w-3 mr-1 text-green-600" />
                      <span className="text-xs font-semibold hidden sm:inline">Saved</span>
                    </>
                  ) : (
                    <>
                      <Save className="h-3 w-3 mr-1" />
                      <span className="text-xs font-semibold hidden sm:inline">Save</span>
                    </>
                  )}
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>Save document for all collaborators</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>

          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      size="sm"
                      className="bg-white border-slate-200 hover:bg-slate-50 text-slate-700 font-medium h-8 px-3"
                    >
                      <UserCircle className="h-3 w-3 mr-1 text-slate-500" />
                      <Badge variant="secondary" className="text-xs px-1 py-0 ml-1">
                        {onlineUsers.length + 1}
                      </Badge>
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-64 p-0" align="end">
                    <div className="py-2 px-3 border-b border-slate-100 bg-slate-50">
                      <div className="font-semibold text-xs text-slate-700">Online Users</div>
                    </div>
                    <div className="max-h-48 overflow-y-auto">
                      <div className="flex items-center gap-2 py-2 px-3 hover:bg-slate-50">
                        <Avatar className="h-6 w-6">
                          <AvatarFallback className="bg-blue-100 text-blue-700 text-xs">
                            <span className="font-semibold">{currentUser.name.charAt(0).toUpperCase()}</span>
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1 min-w-0">
                          <span className="text-xs font-medium block truncate">{currentUser.name} (You)</span>
                          <span className="text-xs text-slate-500 block truncate">{currentUser.email}</span>
                        </div>
                        <div className="h-2 w-2 bg-green-400 rounded-full flex-shrink-0"></div>
                      </div>
                      {/* Display other online users */}
                      {onlineUsers.map((user) => (
                        <div key={user.id} className="flex items-center gap-2 py-2 px-3 hover:bg-slate-50">
                          <Avatar className="h-6 w-6">
                            <AvatarFallback style={{ backgroundColor: user.color }} className="text-xs">
                              <span className="font-semibold">{user.displayName.charAt(0).toUpperCase()}</span>
                            </AvatarFallback>
                          </Avatar>
                          <div className="flex-1 min-w-0">
                            <span className="text-xs font-medium block truncate">{user.displayName}</span>
                            <span className="text-xs text-slate-500 block truncate">{user.email}</span>
                          </div>
                          <div className="h-2 w-2 bg-green-400 rounded-full flex-shrink-0"></div>
                        </div>
                      ))}
                    </div>
                  </PopoverContent>
                </Popover>
              </TooltipTrigger>
              <TooltipContent>
                <p>View online users</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>

          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  className="bg-blue-600 hover:bg-blue-700 text-white font-semibold h-8 px-3"
                  size="sm"
                  onClick={() => setShareDialogOpen(true)}
                >
                  <Share2 className="h-3 w-3 mr-1" />
                  <span className="text-xs hidden sm:inline">Share</span>
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>Share this document</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="h-8 w-8 p-0">
                <Avatar className="h-7 w-7">
                  <AvatarFallback className="bg-blue-100 text-blue-700 font-semibold text-xs">
                    {currentUser.name.charAt(0).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-64">
              <div className="px-3 py-2 border-b">
                <p className="font-medium text-sm truncate">{currentUser.name}</p>
                <p className="text-xs text-slate-500 truncate">{currentUser.email}</p>
              </div>
              <DropdownMenuItem onClick={handleLogout} className="text-red-600">
                <LogOut className="h-4 w-4 mr-2" />
                Sign out
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      <Dialog open={shareDialogOpen} onOpenChange={setShareDialogOpen}>
        <DialogContent className="sm:max-w-lg w-full max-w-[calc(100vw-2rem)] p-4 sm:p-6 mx-auto rounded-lg sm:rounded-xl">
          <DialogHeader>
            <DialogTitle>Share document</DialogTitle>
          </DialogHeader>
          <div className="space-y-6 py-2">
            {shareError && (
              <div className="bg-red-50 text-red-700 p-3 rounded-md text-sm flex items-start">
                <div className="flex-1">{shareError}</div>
              </div>
            )}
            <div className="space-y-4">
              <div>
                <div className="flex flex-col gap-2">
                  <Label htmlFor="email">Email address</Label>
                  <div className="relative">
                    <Input
                      id="email"
                      type="email"
                      placeholder="Enter email address"
                      value={shareEmail}
                      onChange={(e) => {
                        setShareEmail(e.target.value)
                        setShareError("")
                        setIsValidEmail(/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e.target.value))
                      }}
                      className={`pr-8 w-full ${!isValidEmail && shareEmail ? "border-red-300 focus:border-red-500" : ""}`}
                    />
                    {!isValidEmail && shareEmail && (
                      <div className="absolute right-2 top-1/2 -translate-y-1/2">
                        <div className="text-red-500">!</div>
                      </div>
                    )}
                  </div>
                  <Button
                    onClick={handleShareDocument}
                    disabled={isSharing || !shareEmail.trim() || !isValidEmail}
                    className={`bg-blue-600 hover:bg-blue-700 w-full sm:w-auto ${!isValidEmail ? "opacity-50 cursor-not-allowed" : ""}`}
                  >
                    {isSharing ? (
                      <>
                        <div className="h-3 w-3 mr-1 animate-spin rounded-full border border-white border-t-transparent"></div>
                        Sharing...
                      </>
                    ) : (
                      "Share"
                    )}
                  </Button>
                </div>
              </div>

              <div className="space-y-2">
                <h3 className="text-sm font-semibold">Public access link</h3>
                <div className="flex flex-col gap-2">
                  <div className="flex items-center gap-2 p-3 bg-slate-50 rounded-lg border border-slate-200">
                    <LinkIcon className="h-3 w-3 text-slate-500 flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      {hasPublicAccess ? (
                        <p className="text-xs text-slate-700 font-mono break-all leading-relaxed">{publicUrl}</p>
                      ) : (
                        <p className="text-xs text-slate-500">Create a public link to allow anyone to view this document</p>
                      )}
                    </div>
                    {hasPublicAccess && (
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-6 w-6 transition-all duration-200 flex-shrink-0"
                        onClick={() => copyToClipboard(publicUrl)}
                        title="Copy public link"
                      >
                        {isCopied ? <Check className="h-3 w-3 text-green-600" /> : <Copy className="h-3 w-3" />}
                      </Button>
                    )}
                  </div>
                  
                  <div className="flex gap-2 items-center">
                    <Select
                      value={expirationDays.toString()}
                      onValueChange={(value) => setExpirationDays(Number(value))}
                      disabled={isSharing}
                    >
                      <SelectTrigger className="h-9 w-[110px] border-slate-200 focus:ring-blue-500">
                        <SelectValue placeholder="Select days" />
                      </SelectTrigger>
                      <SelectContent>
                        {Array.from({ length: 30 }, (_, i) => i + 1).map((days) => (
                          <SelectItem key={days} value={days.toString()}>
                            {days} {days === 1 ? 'day' : 'days'}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>

                    <Button
                      variant={hasPublicAccess ? "outline" : "secondary"}
                      onClick={handleCreatePublicLink}
                      disabled={isSharing}
                      className="flex-1"
                    >
                      {isSharing ? (
                        <>
                          <div className="h-3 w-3 mr-1 animate-spin rounded-full border border-slate-300 border-t-blue-600"></div>
                          Creating link...
                        </>
                      ) : hasPublicAccess ? (
                        "Create new public link"
                      ) : (
                        "Create public link"
                      )}
                    </Button>
                  </div>

                  {hasPublicAccess && (
                    <div className="flex flex-col gap-2">
                      <Button
                        variant="destructive"
                        onClick={handleDisablePublicAccess}
                        disabled={isSharing}
                        className="w-full sm:w-auto"
                      >
                        {isSharing ? (
                          <>
                            <div className="h-3 w-3 mr-1 animate-spin rounded-full border border-white border-t-transparent"></div>
                            Disabling access...
                          </>
                        ) : (
                          "Disable public access"
                        )}
                      </Button>
                      <p className="text-xs text-slate-500">Public link will expire in {expirationDays} {expirationDays === 1 ? 'day' : 'days'}</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </header>
  )
}
