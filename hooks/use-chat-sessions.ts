'use client'

import { useState, useEffect } from 'react'
import type { ChatSession, Message } from '@/lib/types'

const STORAGE_KEY = 'muhaffiz_chat_sessions'

function loadFromStorage(): ChatSession[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return []
    return JSON.parse(raw) as ChatSession[]
  } catch {
    // Handles both SecurityError (private browsing) and malformed JSON
    return []
  }
}

function saveToStorage(sessions: ChatSession[]): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(sessions))
  } catch {
    // SecurityError in private browsing — silently fall back to in-memory state
  }
}

export interface UseChatSessions {
  sessions: ChatSession[]
  activeSessionId: string | null
  createSession: () => ChatSession
  addMessage: (sessionId: string, message: Message) => void
  replaceMessage: (sessionId: string, messageId: string, newText: string) => void
  deleteSession: (sessionId: string) => void
  getSession: (sessionId: string) => ChatSession | undefined
  setActiveSessionId: (id: string) => void
}

export function useChatSessions(): UseChatSessions {
  const [sessions, setSessions] = useState<ChatSession[]>([])
  const [activeSessionId, setActiveSessionIdState] = useState<string | null>(null)

  useEffect(() => {
    const loaded = loadFromStorage()
    setSessions(loaded)
    if (loaded.length > 0) {
      // Set the most recent session as active
      const mostRecent = loaded.reduce((a, b) => (a.createdAt > b.createdAt ? a : b))
      setActiveSessionIdState(mostRecent.id)
    }
  }, [])

  function createSession(): ChatSession {
    const session: ChatSession = {
      id: crypto.randomUUID(),
      createdAt: Date.now(),
      messages: [],
    }
    setSessions(prev => {
      const updated = [...prev, session]
      saveToStorage(updated)
      return updated
    })
    return session
  }

  function addMessage(sessionId: string, message: Message): void {
    setSessions(prev => {
      const updated = prev.map(s =>
        s.id === sessionId ? { ...s, messages: [...s.messages, message] } : s
      )
      saveToStorage(updated)
      return updated
    })
  }

  function replaceMessage(sessionId: string, messageId: string, newText: string): void {
    setSessions(prev => {
      const updated = prev.map(s =>
        s.id === sessionId
          ? { ...s, messages: s.messages.map(m => m.id === messageId ? { ...m, text: newText } : m) }
          : s
      )
      saveToStorage(updated)
      return updated
    })
  }

  function deleteSession(sessionId: string): void {
    setSessions(prev => {
      const updated = prev.filter(s => s.id !== sessionId)
      saveToStorage(updated)
      return updated
    })
    setActiveSessionIdState(prev => {
      if (prev !== sessionId) return prev
      const remaining = sessions.filter(s => s.id !== sessionId)
      return remaining.length > 0
        ? remaining.reduce((a, b) => (a.createdAt > b.createdAt ? a : b)).id
        : null
    })
  }

  function getSession(sessionId: string): ChatSession | undefined {
    return sessions.find(s => s.id === sessionId)
  }

  function setActiveSessionId(id: string): void {
    setActiveSessionIdState(id)
  }

  return { sessions, activeSessionId, createSession, addMessage, replaceMessage, deleteSession, getSession, setActiveSessionId }
}
