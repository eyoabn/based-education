"use client"

import { useState, useEffect, useRef, useCallback } from "react"
import {
  MessageSquare, Send, Users, Search, Plus, X, BookOpen, Clock,
  Check, CheckCheck, Sparkles, User as UserIcon
} from "lucide-react"

interface Participant {
  id: string
  name: string
  email: string
  avatarUrl: string | null
  role: string
}

interface ConversationItem {
  id: string
  isDirect: boolean
  courseId: string | null
  course?: { id: string; title: string; code: string; logoUrl?: string | null } | null
  title: string
  participants: Participant[]
  lastMessage?: {
    id: string
    content: string
    senderName: string
    senderId: string
    createdAt: string
  } | null
  unreadCount: number
  updatedAt: string
}

interface ChatMessageItem {
  id: string
  conversationId: string
  senderId: string
  senderName: string
  senderAvatar: string | null
  senderRole: string
  content: string
  isMe: boolean
  createdAt: string
}

interface ContactItem {
  id: string
  name: string
  email: string
  avatarUrl: string | null
  role: string
  label?: string
  isTeacher?: boolean
}

export default function ChatWindow({ initialCourseId }: { initialCourseId?: string }) {
  const [conversations, setConversations] = useState<ConversationItem[]>([])
  const [activeConvId, setActiveConvId] = useState<string | null>(null)
  const [messages, setMessages] = useState<ChatMessageItem[]>([])
  const [inputMessage, setInputMessage] = useState("")
  const [loading, setLoading] = useState(true)
  const [messagesLoading, setMessagesLoading] = useState(false)
  const [sending, setSending] = useState(false)
  const [filter, setFilter] = useState<"ALL" | "DIRECT" | "COURSE">("ALL")
  const [searchQuery, setSearchQuery] = useState("")

  // New Chat Modal
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [contacts, setContacts] = useState<ContactItem[]>([])
  const [contactSearch, setContactSearch] = useState("")
  const [creatingConv, setCreatingConv] = useState(false)

  const messagesEndRef = useRef<HTMLDivElement>(null)
  const pollIntervalRef = useRef<NodeJS.Timeout | null>(null)

  const scrollToBottom = useCallback((smooth = true) => {
    messagesEndRef.current?.scrollIntoView({ behavior: smooth ? "smooth" : "auto" })
  }, [])

  // Fetch all conversations
  const fetchConversations = useCallback(async () => {
    try {
      const res = await fetch("/api/messages/conversations", { cache: "no-store" })
      if (res.ok) {
        const data = await res.json()
        const convList: ConversationItem[] = data.conversations || []
        setConversations(convList)

        // If initialCourseId provided and active not set, find that course channel
        if (initialCourseId && !activeConvId) {
          const match = convList.find(c => c.courseId === initialCourseId)
          if (match) setActiveConvId(match.id)
        } else if (convList.length > 0 && !activeConvId) {
          setActiveConvId(convList[0].id)
        }
      }
    } catch (err) {
      console.error("Failed to load conversations", err)
    } finally {
      setLoading(false)
    }
  }, [activeConvId, initialCourseId])

  // Initial load
  useEffect(() => {
    fetchConversations()
  }, [fetchConversations])

  // Fetch messages for active conversation
  const fetchMessages = useCallback(async (convId: string, isSilent = false) => {
    if (!isSilent) setMessagesLoading(true)
    try {
      const res = await fetch(`/api/messages/${convId}`, { cache: "no-store" })
      if (res.ok) {
        const data = await res.json()
        setMessages(data.messages || [])
        if (!isSilent) setTimeout(() => scrollToBottom(false), 50)
      }
    } catch (err) {
      console.error("Failed to fetch messages", err)
    } finally {
      if (!isSilent) setMessagesLoading(false)
    }
  }, [scrollToBottom])

  useEffect(() => {
    if (!activeConvId) return

    fetchMessages(activeConvId)

    // Clear unread count locally for this conversation
    setConversations(prev =>
      prev.map(c => (c.id === activeConvId ? { ...c, unreadCount: 0 } : c))
    )

    // Set up polling every 3.5 seconds
    if (pollIntervalRef.current) clearInterval(pollIntervalRef.current)
    pollIntervalRef.current = setInterval(() => {
      fetchMessages(activeConvId, true)
    }, 3500)

    return () => {
      if (pollIntervalRef.current) clearInterval(pollIntervalRef.current)
    }
  }, [activeConvId, fetchMessages])

  // Send message
  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!inputMessage.trim() || !activeConvId || sending) return

    const content = inputMessage.trim()
    setInputMessage("")
    setSending(true)

    // Optimistic UI push
    const tempMessage: ChatMessageItem = {
      id: `temp-${Date.now()}`,
      conversationId: activeConvId,
      senderId: "me",
      senderName: "You",
      senderAvatar: null,
      senderRole: "STUDENT",
      content,
      isMe: true,
      createdAt: new Date().toISOString(),
    }
    setMessages(prev => [...prev, tempMessage])
    setTimeout(() => scrollToBottom(), 20)

    try {
      const res = await fetch(`/api/messages/${activeConvId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content }),
      })

      if (res.ok) {
        const data = await res.json()
        // Replace temp with real
        setMessages(prev =>
          prev.map(m => (m.id === tempMessage.id ? data.message : m))
        )
        // Refresh conversations list to update snippet
        fetchConversations()
      }
    } catch (err) {
      console.error("Failed to send message", err)
    } finally {
      setSending(false)
    }
  }

  // Open New Chat modal
  const openNewChatModal = async () => {
    setIsModalOpen(true)
    try {
      const res = await fetch("/api/messages/users")
      if (res.ok) {
        const data = await res.json()
        setContacts(data.users || [])
      }
    } catch (err) {
      console.error("Failed to load contacts", err)
    }
  }

  // Start direct conversation with contact
  const handleStartChat = async (targetUserId: string) => {
    setCreatingConv(true)
    try {
      const res = await fetch("/api/messages/conversations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ targetUserId }),
      })

      if (res.ok) {
        const data = await res.json()
        setIsModalOpen(false)
        await fetchConversations()
        if (data.conversationId) {
          setActiveConvId(data.conversationId)
        }
      }
    } catch (err) {
      console.error("Failed to start chat", err)
    } finally {
      setCreatingConv(false)
    }
  }

  const activeConv = conversations.find(c => c.id === activeConvId)

  // Filter conversations
  const filteredConversations = conversations.filter(c => {
    if (filter === "DIRECT" && !c.isDirect) return false
    if (filter === "COURSE" && c.isDirect) return false
    if (searchQuery.trim()) {
      return c.title.toLowerCase().includes(searchQuery.toLowerCase())
    }
    return true
  })

  // Filter modal contacts
  const filteredContacts = contacts.filter(
    c =>
      c.name.toLowerCase().includes(contactSearch.toLowerCase()) ||
      c.email.toLowerCase().includes(contactSearch.toLowerCase()) ||
      c.label?.toLowerCase().includes(contactSearch.toLowerCase())
  )

  return (
    <div className="flex h-[calc(100vh-8.5rem)] rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
      {/* Left Sidebar: Conversations list */}
      <div className="w-80 md:w-96 border-r border-slate-200 flex flex-col bg-slate-50/50 shrink-0">
        {/* Header */}
        <div className="p-4 border-b border-slate-200 bg-white space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="font-bold text-slate-900 text-lg flex items-center gap-2">
              <MessageSquare className="w-5 h-5 text-indigo-600" />
              Messages
            </h2>
            <button
              onClick={openNewChatModal}
              className="p-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded-xl transition-colors flex items-center gap-1.5 text-xs font-bold"
              title="Start a new message"
            >
              <Plus className="w-4 h-4" /> New Chat
            </button>
          </div>

          {/* Search bar */}
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search conversations..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 text-xs bg-slate-100 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-indigo-500 focus:outline-none transition-all"
            />
          </div>

          {/* Filters */}
          <div className="flex gap-1 p-0.5 bg-slate-100 rounded-lg text-xs">
            <button
              onClick={() => setFilter("ALL")}
              className={`flex-1 py-1 font-semibold rounded-md transition-all ${
                filter === "ALL" ? "bg-white text-indigo-700 shadow-sm" : "text-slate-500 hover:text-slate-800"
              }`}
            >
              All
            </button>
            <button
              onClick={() => setFilter("DIRECT")}
              className={`flex-1 py-1 font-semibold rounded-md transition-all ${
                filter === "DIRECT" ? "bg-white text-indigo-700 shadow-sm" : "text-slate-500 hover:text-slate-800"
              }`}
            >
              Direct
            </button>
            <button
              onClick={() => setFilter("COURSE")}
              className={`flex-1 py-1 font-semibold rounded-md transition-all ${
                filter === "COURSE" ? "bg-white text-indigo-700 shadow-sm" : "text-slate-500 hover:text-slate-800"
              }`}
            >
              Courses
            </button>
          </div>
        </div>

        {/* Conversation List */}
        <div className="flex-1 overflow-y-auto divide-y divide-slate-100">
          {loading ? (
            <div className="p-8 text-center text-slate-400 text-xs">Loading conversations...</div>
          ) : filteredConversations.length === 0 ? (
            <div className="p-8 text-center space-y-3">
              <MessageSquare className="w-10 h-10 text-slate-300 mx-auto" />
              <p className="text-xs font-semibold text-slate-600">No conversations found</p>
              <button
                onClick={openNewChatModal}
                className="text-xs text-indigo-600 hover:underline font-bold"
              >
                Start a new conversation
              </button>
            </div>
          ) : (
            filteredConversations.map(conv => {
              const active = conv.id === activeConvId
              return (
                <button
                  key={conv.id}
                  onClick={() => setActiveConvId(conv.id)}
                  className={`w-full text-left p-3.5 flex items-start gap-3 transition-colors ${
                    active ? "bg-indigo-50/70 border-l-4 border-indigo-600" : "hover:bg-slate-100/70"
                  }`}
                >
                  {/* Avatar / Icon */}
                  <div className="relative shrink-0">
                    {conv.isDirect ? (
                      <div className="w-10 h-10 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 text-white font-bold flex items-center justify-center text-sm shadow-sm">
                        {conv.title.substring(0, 2).toUpperCase()}
                      </div>
                    ) : (
                      <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-slate-800 to-indigo-900 text-white font-bold flex items-center justify-center text-sm shadow-sm">
                        <BookOpen className="w-5 h-5 text-indigo-300" />
                      </div>
                    )}
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-1 mb-1">
                      <h3 className={`text-xs font-bold truncate ${active ? "text-indigo-950" : "text-slate-900"}`}>
                        {conv.title}
                      </h3>
                      {conv.lastMessage && (
                        <span className="text-[10px] text-slate-400 shrink-0">
                          {new Date(conv.lastMessage.createdAt).toLocaleTimeString([], {
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </span>
                      )}
                    </div>

                    <div className="flex items-center justify-between gap-2">
                      <p className="text-[11px] text-slate-500 truncate leading-tight">
                        {conv.lastMessage
                          ? `${conv.lastMessage.senderName}: ${conv.lastMessage.content}`
                          : "No messages yet"}
                      </p>
                      {conv.unreadCount > 0 && (
                        <span className="px-2 py-0.5 rounded-full bg-indigo-600 text-white text-[10px] font-extrabold shrink-0">
                          {conv.unreadCount}
                        </span>
                      )}
                    </div>
                  </div>
                </button>
              )
            })
          )}
        </div>
      </div>

      {/* Right Column: Chat Window */}
      <div className="flex-1 flex flex-col bg-white overflow-hidden">
        {activeConv ? (
          <>
            {/* Active Header */}
            <div className="h-16 px-6 border-b border-slate-200 flex items-center justify-between bg-white shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-full bg-indigo-600/10 text-indigo-700 flex items-center justify-center font-bold text-sm">
                  {activeConv.isDirect ? (
                    activeConv.title.substring(0, 2).toUpperCase()
                  ) : (
                    <BookOpen className="w-4 h-4" />
                  )}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="font-bold text-slate-900 text-sm">{activeConv.title}</h3>
                    {activeConv.isDirect ? (
                      <span className="px-2 py-0.5 rounded-full bg-purple-50 text-purple-700 border border-purple-200 text-[10px] font-bold">
                        Direct Message
                      </span>
                    ) : (
                      <span className="px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 text-[10px] font-bold">
                        Course Channel
                      </span>
                    )}
                  </div>
                  <p className="text-[11px] text-slate-500">
                    {activeConv.isDirect
                      ? activeConv.participants[0]?.email || "Private 1-on-1 Chat"
                      : "Shared discussion with teacher and enrolled students"}
                  </p>
                </div>
              </div>
            </div>

            {/* Messages Thread */}
            <div className="flex-1 overflow-y-auto p-6 space-y-4 bg-slate-50/40">
              {messagesLoading && messages.length === 0 ? (
                <div className="flex items-center justify-center h-full text-slate-400 text-xs">
                  Loading message history...
                </div>
              ) : messages.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-center p-8 space-y-2">
                  <div className="w-12 h-12 rounded-full bg-indigo-50 text-indigo-600 flex items-center justify-center mb-1">
                    <MessageSquare className="w-6 h-6" />
                  </div>
                  <h4 className="text-sm font-bold text-slate-700">Start the conversation</h4>
                  <p className="text-xs text-slate-400 max-w-xs">
                    Send your first message to ask questions, share notes, or connect.
                  </p>
                </div>
              ) : (
                messages.map((msg, index) => {
                  const isInstructor = msg.senderRole === "TEACHER"
                  return (
                    <div
                      key={msg.id || index}
                      className={`flex flex-col ${msg.isMe ? "items-end" : "items-start"}`}
                    >
                      {!msg.isMe && (
                        <div className="flex items-center gap-1.5 mb-1 px-1">
                          <span className="text-xs font-bold text-slate-700">{msg.senderName}</span>
                          {isInstructor && (
                            <span className="px-1.5 py-0.2 rounded bg-emerald-100 text-emerald-800 text-[9px] font-black uppercase">
                              Instructor
                            </span>
                          )}
                        </div>
                      )}

                      <div
                        className={`max-w-[75%] rounded-2xl px-4 py-2.5 text-sm shadow-sm break-words whitespace-pre-wrap ${
                          msg.isMe
                            ? "bg-indigo-600 text-white rounded-br-none"
                            : "bg-white border border-slate-200 text-slate-800 rounded-bl-none"
                        }`}
                      >
                        {msg.content}
                      </div>

                      <span className="text-[10px] text-slate-400 mt-1 px-1 tabular-nums">
                        {new Date(msg.createdAt).toLocaleTimeString([], {
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </span>
                    </div>
                  )
                })
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Input Composer */}
            <form onSubmit={handleSendMessage} className="p-4 border-t border-slate-200 bg-white">
              <div className="flex items-center gap-3 bg-slate-50 border border-slate-200 rounded-2xl p-2 focus-within:ring-2 focus-within:ring-indigo-500 focus-within:bg-white transition-all">
                <textarea
                  rows={1}
                  value={inputMessage}
                  onChange={e => setInputMessage(e.target.value)}
                  onKeyDown={e => {
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault()
                      handleSendMessage(e)
                    }
                  }}
                  placeholder="Type your message... (Enter to send, Shift+Enter for new line)"
                  className="flex-1 bg-transparent px-2 text-sm text-slate-800 placeholder-slate-400 resize-none focus:outline-none max-h-32"
                />
                <button
                  type="submit"
                  disabled={!inputMessage.trim() || sending}
                  className="p-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white disabled:opacity-40 transition-colors shadow-sm shrink-0"
                >
                  <Send className="w-4 h-4" />
                </button>
              </div>
            </form>
          </>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center p-8 text-center">
            <MessageSquare className="w-12 h-12 text-slate-300 mb-3" />
            <h3 className="text-base font-bold text-slate-800">Select a Conversation</h3>
            <p className="text-xs text-slate-500 max-w-sm mt-1 mb-4">
              Choose a course channel or direct message from the sidebar, or start a new chat.
            </p>
            <button
              onClick={openNewChatModal}
              className="px-4 py-2 bg-indigo-600 text-white rounded-xl text-xs font-bold hover:bg-indigo-700 transition-colors"
            >
              Start New Chat
            </button>
          </div>
        )}
      </div>

      {/* New Chat Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4 animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="font-bold text-slate-900 text-base flex items-center gap-2">
                <Users className="w-4 h-4 text-indigo-600" /> Start a Conversation
              </h3>
              <button
                onClick={() => setIsModalOpen(false)}
                className="p-1 text-slate-400 hover:text-slate-600 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search teachers or students..."
                value={contactSearch}
                onChange={e => setContactSearch(e.target.value)}
                className="w-full pl-9 pr-3 py-2 text-xs bg-slate-100 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-indigo-500 focus:outline-none"
              />
            </div>

            <div className="max-h-64 overflow-y-auto divide-y divide-slate-100">
              {filteredContacts.length === 0 ? (
                <div className="py-8 text-center text-slate-400 text-xs">
                  No contacts found.
                </div>
              ) : (
                filteredContacts.map(contact => (
                  <button
                    key={contact.id}
                    onClick={() => handleStartChat(contact.id)}
                    disabled={creatingConv}
                    className="w-full text-left p-3 hover:bg-slate-50 rounded-xl flex items-center justify-between transition-colors group"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-9 h-9 rounded-full bg-indigo-100 text-indigo-700 font-bold flex items-center justify-center text-xs shrink-0">
                        {contact.name.substring(0, 2).toUpperCase()}
                      </div>
                      <div className="min-w-0">
                        <p className="text-xs font-bold text-slate-900 truncate group-hover:text-indigo-600">
                          {contact.name}
                        </p>
                        <p className="text-[10px] text-slate-400 truncate">
                          {contact.label || contact.email}
                        </p>
                      </div>
                    </div>
                    <span className="text-xs font-bold text-indigo-600 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                      Chat →
                    </span>
                  </button>
                ))
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
