"use client"

import { useEffect, useState } from "react"
import { useParams, useSearchParams } from "next/navigation"
import { FileText, Loader2, ShieldAlert } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert"
import ReactMarkdown from "react-markdown"
import remarkGfm from "remark-gfm"
import remarkBreaks from "remark-breaks"

interface PublicDocument {
  title: string
  content: string
}

export default function PublicDocumentPage() {
  const params = useParams()
  const searchParams = useSearchParams()
  const [document, setDocument] = useState<PublicDocument | null>(null)
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetchDocument() {
      try {
        const token = searchParams.get("token")
        if (!token) {
          setError("Invalid access token")
          return
        }

        const response = await fetch(`/api/documents/${params.id}/public?token=${token}`)
        if (!response.ok) {
          throw new Error("Document not found or access expired")
        }

        const data = await response.json()
        setDocument(data)
      } catch (error) {
        setError("Failed to load document")
      } finally {
        setLoading(false)
      }
    }

    fetchDocument()
  }, [params.id, searchParams])

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    )
  }

  if (error || !document) {
    return (
      <div className="flex h-screen items-center justify-center p-4">
        <Alert variant="destructive" className="max-w-md">
          <ShieldAlert className="h-4 w-4" />
          <AlertTitle>Access Error</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      </div>
    )
  }

  return (
    <div className="container mx-auto max-w-4xl py-8 px-4">
      <Card>
        <CardHeader>          <div className="flex items-center gap-2">
            <FileText className="h-5 w-5 text-blue-600" />
            <CardTitle>{document.title}</CardTitle>
          </div>
        </CardHeader>        <CardContent className="pt-0">
          <div className="prose max-w-none dark:prose-invert border-t border-slate-200 pt-2">
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
              {document.content || "# No content"}
            </ReactMarkdown>
            <div className="text-xs text-slate-400 mt-8 pt-4 border-t">
              Shared via{" "}
              <a
                href="https://livedocs-nu-liart.vercel.app/"
                className="text-blue-500 underline"
                target="_blank"
                rel="noopener noreferrer"
              >
                LiveDocs
              </a>{" "}
              - View mode
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
