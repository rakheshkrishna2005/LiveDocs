import { headers } from 'next/headers'
import { redirect } from 'next/navigation'
import { Navbar } from "@/components/navbar"
import { EntryModal } from "@/components/entry-modal"
import { TextEditor } from "@/components/text-editor"
import { UserProvider } from "@/context/user-context"
import { DocumentProvider } from "@/context/document-context"
import ClientDocumentPage from './client'

async function getDocument(documentId: string) {
  const headersList = await headers()
  const headersObject = Object.fromEntries(headersList.entries())
  const response = await fetch(`${process.env.NEXT_PUBLIC_APP_URL}/api/documents/${documentId}`, {
    headers: headersObject,
    cache: 'no-store'
  })
  if (!response.ok) {
    if (response.status === 401) {
      redirect('/auth/login')
    }
    throw new Error('Failed to fetch document')
  }
  return response.json()
}

async function getCurrentUser() {
  const headersList = await headers()
  const headersObject = Object.fromEntries(headersList.entries())
  const response = await fetch(`${process.env.NEXT_PUBLIC_APP_URL}/api/auth/me`, {
    headers: headersObject,
    cache: 'no-store'
  })
  if (!response.ok) {
    redirect('/auth/login')
  }
  return response.json()
}

export default async function DocumentPage({ params }: { params: { id: string } }) {
  const { id: documentId } = await params
  const [userData, documentData] = await Promise.all([
    getCurrentUser(),
    getDocument(documentId)
  ])

  return (
    <ClientDocumentPage 
      documentId={documentId}
      initialDocumentData={documentData}
      userData={userData}
    />
  )
}
