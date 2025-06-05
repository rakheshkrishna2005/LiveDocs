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
      <DialogContent 
        className="w-[95vw] max-w-md mx-auto p-4 sm:p-6 md:p-8 rounded-xl sm:rounded-2xl" 
        hideCloseButton={true}
      >
        <div className="flex justify-center mb-4 sm:mb-6">
          <div className="relative">
            <div className="h-12 w-12 sm:h-16 sm:w-16 rounded-2xl bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center shadow-lg">
              <FileText className="h-6 w-6 sm:h-8 sm:w-8 text-white" />
            </div>
            <div className="absolute -bottom-1 -right-1 h-5 w-5 sm:h-6 sm:w-6 bg-green-400 rounded-full border-2 border-white flex items-center justify-center">
              <Users className="h-2.5 w-2.5 sm:h-3 sm:w-3 text-white" />
            </div>
          </div>
        </div>
        <DialogHeader className="space-y-2 sm:space-y-3">
          <DialogTitle className="text-center text-lg sm:text-xl font-bold px-2">
            Join Document Collaboration!
          </DialogTitle>
          <DialogDescription className="text-center text-slate-600 text-sm sm:text-base px-2">
            Confirm your details to start collaborating on this document in real-time.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 sm:space-y-6 pt-4 sm:pt-6">
          <div className="space-y-3 sm:space-y-4">
            <div>
              <Label htmlFor="displayName" className="text-sm font-medium">
                Display Name
              </Label>
              <Input
                id="displayName"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                placeholder="Enter your name"
                className="focus-visible:ring-blue-500 h-10 sm:h-11 mt-1.5"
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
                className="focus-visible:ring-blue-500 h-10 sm:h-11 mt-1.5"
                required
                disabled
              />
            </div>
          </div>
          <Button 
            type="submit" 
            className="w-full bg-blue-600 hover:bg-blue-700 h-10 sm:h-11 font-semibold text-sm sm:text-base"
          >
            Join Document
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  )
}
