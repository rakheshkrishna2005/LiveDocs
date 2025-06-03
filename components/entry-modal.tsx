"use client"

import type React from "react"

import { useState } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { useUser } from "@/context/user-context"
import { FileText, Users } from "lucide-react"

interface EntryModalProps {
  onComplete: () => void
  currentUser: {
    userId: string
    email: string
    name: string
  }
}

export function EntryModal({ onComplete, currentUser }: EntryModalProps) {
  const [displayName, setDisplayName] = useState(currentUser.name)
  const [email, setEmail] = useState(currentUser.email)
  const { setCurrentUser } = useUser()

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()

    if (!displayName.trim() || !email.trim()) return

    const randomColor = getRandomColor()

    setCurrentUser({
      id: currentUser.userId,
      displayName,
      email,
      color: randomColor,
    })

    onComplete()
  }

  const getRandomColor = () => {
    const hue = Math.floor(Math.random() * 360)
    return `hsl(${hue}, 70%, 80%)`
  }

  return (
    <Dialog open={true} onOpenChange={() => {}}>
      <DialogContent className="sm:max-w-md" hideCloseButton={true}>
        <div className="flex justify-center mb-4">
          <div className="relative">
            <div className="h-16 w-16 rounded-2xl bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center shadow-lg">
              <FileText className="h-8 w-8 text-white" />
            </div>
            <div className="absolute -bottom-1 -right-1 h-6 w-6 bg-green-400 rounded-full border-2 border-white flex items-center justify-center">
              <Users className="h-3 w-3 text-white" />
            </div>
          </div>
        </div>
        <DialogHeader>
          <DialogTitle className="text-center text-xl font-bold">Join Document Collaboration!</DialogTitle>
          <DialogDescription className="text-center text-slate-600">
            Confirm your details to start collaborating on this document in real-time.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-6 pt-4">
          <div className="space-y-4">
            <div>
              <Label htmlFor="displayName" className="text-sm font-medium">
                Display Name
              </Label>
              <Input
                id="displayName"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                placeholder="Enter your name"
                className="focus-visible:ring-blue-500 h-11"
                required
              />
            </div>
            <div>
              <Label htmlFor="email" className="text-sm font-medium">
                Email Address
              </Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Enter your email"
                className="focus-visible:ring-blue-500 h-11"
                required
                disabled
              />
            </div>
          </div>
          <Button type="submit" className="w-full bg-blue-600 hover:bg-blue-700 h-11 font-semibold">
            Join Document
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  )
}
