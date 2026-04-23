'use client'

import { useState, useRef, useEffect } from 'react'
import { useChatSessions } from '@/hooks/use-chat-sessions'
import { useMediaRecorder } from '@/hooks/use-media-recorder'
import { Button } from '@/components/ui/button'
import { ScrollArea } from '@/components/ui/scroll-area'
import { MessageSquare, Plus, Menu, X, Send, Mic, MicOff, Trash2 } from 'lucide-react'
import ReactMarkdown from 'react-markdown'
import rehypeSanitize from 'rehype-sanitize'
import type { ChatSession, Message } from '@/lib/types'

function formatSessionDate(timestamp: number): string {
  return new Date(timestamp).toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

export function ChatbotContent() {
  const { sessions, activeSessionId, createSession, setActiveSessionId, addMessage, replaceMessage, deleteSession } = useChatSessions()
  const { isRecording, startRecording, stopRecording, permissionError } = useMediaRecorder()

  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [input, setInput] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const bottomRef = useRef<HTMLDivElement>(null)

  const activeSession = sessions.find((s) => s.id === activeSessionId) ?? null

  // Auto-scroll to bottom when messages change
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [activeSession?.messages.length])

  // Show permissionError as error banner
  useEffect(() => {
    if (permissionError) setError(permissionError)
  }, [permissionError])

  function handleNewSession() {
    const session = createSession()
    setActiveSessionId(session.id)
    setSidebarOpen(false)
  }

  function handleSelectSession(session: ChatSession) {
    setActiveSessionId(session.id)
    setSidebarOpen(false)
  }

  async function handleSend(e: React.FormEvent) {
    e.preventDefault()
    const text = input.trim()
    if (!text || !activeSessionId || isLoading) return

    setError(null)
    setInput('')

    const userMsg: Message = {
      id: crypto.randomUUID(),
      role: 'user',
      text,
      timestamp: Date.now(),
    }
    addMessage(activeSessionId, userMsg)

    // Build conversation history including the new user message
    const history = [
      ...(activeSession?.messages ?? []).map((m) => ({ role: m.role, text: m.text })),
      { role: 'user' as const, text },
    ]

    setIsLoading(true)
    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ conversation: history }),
      })
      if (!res.ok) throw new Error(`Request failed: ${res.status}`)
      const data = await res.json()
      const botMsg: Message = {
        id: crypto.randomUUID(),
        role: 'bot',
        text: data.result,
        timestamp: Date.now(),
      }
      addMessage(activeSessionId, botMsg)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong.')
    } finally {
      setIsLoading(false)
    }
  }

  async function handleRecordToggle() {
    if (!activeSessionId) return
    setError(null)

    if (isRecording) {
      const blob = await stopRecording()
      const history = (activeSession?.messages ?? []).map((m) => ({ role: m.role, text: m.text }))
      const formData = new FormData()
      formData.append('audio', blob, 'recording.webm')
      formData.append('history', JSON.stringify(history))

      // Add a temporary "analyzing" placeholder message
      const placeholderId = crypto.randomUUID()
      const placeholderMsg: Message = {
        id: placeholderId,
        role: 'bot',
        text: '🎙️ Analyzing your recitation...',
        timestamp: Date.now(),
      }
      addMessage(activeSessionId, placeholderMsg)

      setIsLoading(true)
      try {
        const res = await fetch('/api/chat-audio', { method: 'POST', body: formData })
        if (!res.ok) throw new Error(`Request failed: ${res.status}`)
        const data = await res.json()
        // Replace the placeholder with the real response
        replaceMessage(activeSessionId, placeholderId, data.result)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Audio upload failed.')
      } finally {
        setIsLoading(false)
      }
    } else {
      await startRecording()
    }
  }

  // Empty state — no sessions at all
  if (sessions.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-[calc(100vh-6rem)] gap-4 px-6 text-center">
        <MessageSquare className="w-12 h-12 text-muted-foreground" />
        <p className="text-muted-foreground text-lg">
          Start a new session to chat with Muhaffiz AI
        </p>
        <Button onClick={handleNewSession}>
          <Plus className="w-4 h-4 mr-2" />
          New Session
        </Button>
      </div>
    )
  }

  return (
    <div className="flex h-[calc(100vh-6rem)] overflow-hidden">
      {/* Mobile overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-20 bg-black/40 md:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Session sidebar */}
      <aside
        className={[
          'fixed inset-y-0 left-0 z-30 w-64 bg-background border-r flex flex-col transition-transform duration-200',
          'md:static md:translate-x-0 md:z-auto',
          sidebarOpen ? 'translate-x-0' : '-translate-x-full',
        ].join(' ')}
      >
        <div className="flex items-center justify-between p-3 border-b">
          <span className="font-semibold text-sm">Sessions</span>
          <Button
            variant="ghost"
            size="icon"
            className="md:hidden"
            onClick={() => setSidebarOpen(false)}
          >
            <X className="w-4 h-4" />
          </Button>
        </div>

        <div className="p-2">
          <Button className="w-full" size="sm" onClick={handleNewSession}>
            <Plus className="w-4 h-4 mr-2" />
            New Session
          </Button>
        </div>

        <ScrollArea className="flex-1">
          <ul className="p-2 space-y-1">
            {sessions
              .slice()
              .sort((a, b) => b.createdAt - a.createdAt)
              .map((session) => (
                <li key={session.id}>
                  <div className={[
                    'flex items-center rounded-md text-sm transition-colors',
                    session.id === activeSessionId ? 'bg-primary text-primary-foreground' : 'hover:bg-muted',
                  ].join(' ')}>
                    <button
                      onClick={() => handleSelectSession(session)}
                      className="flex-1 text-left px-3 py-2 min-w-0"
                    >
                      <span className="block truncate font-medium">
                        {formatSessionDate(session.createdAt)}
                      </span>
                      <span className="block text-xs opacity-70">
                        {session.messages.length} message
                        {session.messages.length !== 1 ? 's' : ''}
                      </span>
                    </button>
                    <button
                      onClick={(e) => { e.stopPropagation(); deleteSession(session.id) }}
                      className="shrink-0 p-2 opacity-50 hover:opacity-100 transition-opacity"
                      aria-label="Delete session"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </li>
              ))}
          </ul>
        </ScrollArea>
      </aside>

      {/* Main chat area */}
      <div className="flex flex-col flex-1 min-w-0">
        {/* Top bar */}
        <div className="flex items-center gap-2 p-3 border-b">
          <Button
            variant="ghost"
            size="icon"
            className="md:hidden"
            onClick={() => setSidebarOpen(true)}
          >
            <Menu className="w-5 h-5" />
          </Button>
          <span className="font-semibold text-base truncate">Muhaffiz AI</span>
        </div>

        {/* Error banner */}
        {error && (
          <div className="flex items-center justify-between gap-2 px-4 py-2 bg-destructive/10 text-destructive text-sm border-b">
            <span>{error}</span>
            <button onClick={() => setError(null)} className="shrink-0">
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* Message list */}
        <div className="flex-1 min-h-0 overflow-y-auto px-4 py-4">
          {!activeSession || activeSession.messages.length === 0 ? (
            <p className="text-center text-muted-foreground text-sm mt-8">
              {activeSession
                ? 'Send a message to start the conversation.'
                : 'Select a session or create a new one.'}
            </p>
          ) : (
            <ul className="space-y-4">
              {activeSession.messages.map((msg) => (
                <li
                  key={msg.id}
                  className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  <div
                    className={[
                      'max-w-[80%] rounded-2xl px-4 py-2 text-sm',
                      msg.role === 'user'
                        ? 'bg-primary text-primary-foreground'
                        : 'bg-muted text-foreground',
                    ].join(' ')}
                  >
                    {msg.role === 'bot' ? (
                      <div className="prose prose-sm dark:prose-invert max-w-none">
                        <ReactMarkdown rehypePlugins={[rehypeSanitize]}>
                          {msg.text}
                        </ReactMarkdown>
                      </div>
                    ) : (
                      <p>{msg.text}</p>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          )}

          {/* Loading indicator */}
          {isLoading && (
            <div className="flex justify-start mt-4">
              <div className="bg-muted rounded-2xl px-4 py-3 flex gap-1 items-center">
                <span className="w-2 h-2 rounded-full bg-muted-foreground animate-bounce [animation-delay:0ms]" />
                <span className="w-2 h-2 rounded-full bg-muted-foreground animate-bounce [animation-delay:150ms]" />
                <span className="w-2 h-2 rounded-full bg-muted-foreground animate-bounce [animation-delay:300ms]" />
              </div>
            </div>
          )}

          <div ref={bottomRef} />
        </div>

        {/* Input bar */}
        <form
          onSubmit={handleSend}
          className="flex items-center gap-2 p-3 border-t"
        >
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Type a message…"
            disabled={isLoading || !activeSession}
            className="flex-1 rounded-full border bg-background px-4 py-2 text-sm outline-none focus:ring-2 focus:ring-ring disabled:opacity-50"
          />

          {/* Mic button */}
          <Button
            type="button"
            size="icon"
            variant={isRecording ? 'destructive' : 'outline'}
            onClick={handleRecordToggle}
            disabled={isLoading && !isRecording}
            aria-label={isRecording ? 'Stop recording' : 'Start recording'}
            className={isRecording ? 'animate-pulse' : ''}
          >
            {isRecording ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
          </Button>

          {/* Send button */}
          <Button
            type="submit"
            size="icon"
            disabled={isLoading || !input.trim() || !activeSession}
            aria-label="Send message"
          >
            <Send className="w-4 h-4" />
          </Button>
        </form>
      </div>
    </div>
  )
}
