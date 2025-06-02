"use client"

import { createContext, useContext, useState, useEffect, type ReactNode } from "react"

interface User {
  id: string
  displayName: string
  email: string
  color: string
}

interface UserContextType {
  currentUser: User | null
  setCurrentUser: (user: User) => void
  onlineUsers: User[]
  addOnlineUser: (user: User) => void
  removeOnlineUser: (userId: string) => void
}

const UserContext = createContext<UserContextType | undefined>(undefined)

export function UserProvider({ children }: { children: ReactNode }) {
  const [currentUser, setCurrentUser] = useState<User | null>(null)
  const [onlineUsers, setOnlineUsers] = useState<User[]>([])

  const addOnlineUser = (user: User) => {
    setOnlineUsers((prev) => {
      const filtered = prev.filter((u) => u.id !== user.id)
      return [...filtered, user]
    })
  }

  const removeOnlineUser = (userId: string) => {
    setOnlineUsers((prev) => prev.filter((user) => user.id !== userId))
  }

  useEffect(() => {
    if (currentUser) {
      setOnlineUsers([])
    }
  }, [currentUser])

  return (
    <UserContext.Provider
      value={{
        currentUser,
        setCurrentUser,
        onlineUsers,
        addOnlineUser,
        removeOnlineUser,
      }}
    >
      {children}
    </UserContext.Provider>
  )
}

export function useUser() {
  const context = useContext(UserContext)
  if (context === undefined) {
    throw new Error("useUser must be used within a UserProvider")
  }
  return context
}
