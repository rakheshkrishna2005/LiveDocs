"use client"

import { createContext, useContext, useState, type ReactNode } from "react"

interface DocumentContextType {
  documentId: string
  documentTitle: string
  setDocumentTitle: (title: string) => void
  updateDocumentTitle: (title: string) => void
}

const DocumentContext = createContext<DocumentContextType | undefined>(undefined)

export function DocumentProvider({
  children,
  documentId,
}: {
  children: ReactNode
  documentId: string
}) {
  const [documentTitle, setDocumentTitle] = useState<string>("Untitled Document")

  const updateDocumentTitle = (title: string) => {
    setDocumentTitle(title)

    fetch(`${process.env.NEXT_PUBLIC_API_URL}/update-title` || "http://localhost:8080/update-title", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        documentId,
        title,
      }),
    }).catch((error) => {
      console.error("Failed to update document title:", error)
    })
  }

  return (
    <DocumentContext.Provider
      value={{
        documentId,
        documentTitle,
        setDocumentTitle,
        updateDocumentTitle,
      }}
    >
      {children}
    </DocumentContext.Provider>
  )
}

export function useDocument() {
  const context = useContext(DocumentContext)
  if (context === undefined) {
    throw new Error("useDocument must be used within a DocumentProvider")
  }
  return context
}
