"use client"

import { useState, useRef } from "react"
import { Navbar } from "@/components/navbar"
import { EntryModal } from "@/components/entry-modal"
import { TextEditor } from "@/components/text-editor"
import { UserProvider } from "@/context/user-context"
import { DocumentProvider } from "@/context/document-context"

interface ClientDocumentPageProps {
  documentId: string
  initialDocumentData: {
    title: string
    content: string
  }
  userData: {
    user: {
      userId: string
      email: string
      name: string
    }
  }
}

export default function ClientDocumentPage({
  documentId,
  initialDocumentData,
  userData,
}: ClientDocumentPageProps) {
  const [showModal, setShowModal] = useState(true)
  const [saveStatus, setSaveStatus] = useState<"saved" | "saving" | "unsaved">("saved")
  const saveRef = useRef<() => void>(() => {})

  const handleSave = () => {
    if (saveRef.current) {
      saveRef.current()
    }
  }

  return (
    <UserProvider>
      <DocumentProvider documentId={documentId}>
        <main className="min-h-screen flex flex-col bg-gradient-to-br from-slate-50 to-blue-50 relative">
          {!initialDocumentData && (
            <div className="absolute inset-0 bg-white/80 backdrop-blur-sm flex items-center justify-center z-50">
              <div className="flex flex-col items-center gap-3">
                <div className="w-10 h-10 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
                <p className="text-slate-600 font-medium">Loading document...</p>
              </div>
            </div>
          )}
          <Navbar documentId={documentId} saveStatus={saveStatus} onSave={handleSave} currentUser={userData.user} />
          <div className="flex-1 px-4 md:px-8 lg:px-16 py-6">
            <TextEditor 
              documentId={documentId} 
              onSaveStatusChange={setSaveStatus} 
              onSave={saveRef}
              initialContent={initialDocumentData?.content || ""}
              initialTitle={initialDocumentData?.title || "Untitled Document"}
            />
          </div>
          {showModal && <EntryModal onComplete={() => setShowModal(false)} currentUser={userData.user} />}
        </main>
      </DocumentProvider>
    </UserProvider>
  )
}