"use client"

import { useState, useRef, useEffect, use } from "react"
import { useRouter } from "next/navigation"
import { Navbar } from "@/components/navbar"
import { EntryModal } from "@/components/entry-modal"
import { TextEditor } from "@/components/text-editor"
import { UserProvider } from "@/context/user-context"
import { DocumentProvider } from "@/context/document-context"

export default function DocumentPage({ params }: { params: Promise<{ id: string }> }) {
  const [showModal, setShowModal] = useState(true)
  const [saveStatus, setSaveStatus] = useState<"saved" | "saving" | "unsaved">("saved")
  const [currentUser, setCurrentUser] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const saveRef = useRef<() => void>(() => {})
  const router = useRouter()
  
  const { id: documentId } = use(params)

  useEffect(() => {
    const getCurrentUser = async () => {
      try {
        const response = await fetch("/api/auth/me")
        if (response.ok) {
          const userData = await response.json()
          setCurrentUser(userData.user)
        } else {
          router.push("/auth/login")
        }
      } catch (error) {
        console.error("Error getting current user:", error)
        router.push("/auth/login")
      } finally {
        setLoading(false)
      }
    }

    getCurrentUser()
  }, [router])

  const handleSave = () => {
    if (saveRef.current) {
      saveRef.current()
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="animate-pulse">Loading...</div>
      </div>
    )
  }

  if (!currentUser) {
    return null
  }

  return (
    <UserProvider>
      <DocumentProvider documentId={documentId}>
        <main className="min-h-screen flex flex-col bg-gradient-to-br from-slate-50 to-blue-50">
          <Navbar documentId={documentId} saveStatus={saveStatus} onSave={handleSave} currentUser={currentUser} />
          <div className="flex-1 px-4 md:px-8 lg:px-16 py-6">
            <TextEditor documentId={documentId} onSaveStatusChange={setSaveStatus} onSave={saveRef} />
          </div>
          {showModal && <EntryModal onComplete={() => setShowModal(false)} currentUser={currentUser} />}
        </main>
      </DocumentProvider>
    </UserProvider>
  )
}
