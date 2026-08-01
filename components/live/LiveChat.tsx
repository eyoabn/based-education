"use client"

import { useState, useEffect, useRef } from "react"
import { useChat } from "@livekit/components-react"
import { Send, Pin } from "lucide-react"

interface LiveChatProps {
  isTeacher?: boolean
}

export default function LiveChat({ isTeacher = false }: LiveChatProps) {
  const { chatMessages, send } = useChat()
  const [input, setInput] = useState("")
  const [pinnedMessage, setPinnedMessage] = useState<string | null>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [chatMessages])

  const handleSend = (e: React.FormEvent) => {
    e.preventDefault()
    if (!input.trim()) return
    send(input)
    setInput("")
  }

  return (
    <div className="flex flex-col h-full">
      {/* Pinned Message Banner */}
      {pinnedMessage && (
        <div className="mx-3 mt-3 px-3 py-2 bg-indigo-600/20 border border-indigo-500/30 rounded-lg">
          <div className="flex items-center gap-2 mb-1">
            <Pin className="w-3 h-3 text-indigo-400" />
            <span className="text-[10px] font-bold text-indigo-400 uppercase tracking-wide">Pinned by Host</span>
          </div>
          <p className="text-xs text-slate-200">{pinnedMessage}</p>
        </div>
      )}

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-3 space-y-3">
        {/* Mock initial messages for demo */}
        {chatMessages.length === 0 && (
          <>
            {[
              { from: { name: "Dr. Morgan", identity: "teacher" }, message: "Welcome to the live class! Feel free to ask questions anytime.", timestamp: Date.now() - 60000 },
              { from: { name: "Sarah K.", identity: "student1" }, message: "Thank you! Ready to learn 🎉", timestamp: Date.now() - 30000 },
            ].map((msg, i) => (
              <ChatBubble key={i} msg={msg} isTeacher={isTeacher} onPin={setPinnedMessage} showPinAction={isTeacher} />
            ))}
          </>
        )}
        {chatMessages.map((msg, i) => (
          <ChatBubble key={i} msg={msg} isTeacher={isTeacher} onPin={setPinnedMessage} showPinAction={isTeacher} />
        ))}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <form onSubmit={handleSend} className="p-3 border-t border-white/10">
        <div className="flex items-center gap-2 bg-white/5 border border-white/10 rounded-xl px-3 py-2">
          <input
            type="text"
            value={input}
            onChange={e => setInput(e.target.value)}
            placeholder="Message the class..."
            className="flex-1 bg-transparent text-sm text-slate-200 placeholder-slate-500 focus:outline-none"
          />
          <button
            type="submit"
            disabled={!input.trim()}
            className="p-1.5 rounded-lg text-indigo-400 hover:bg-indigo-500/20 disabled:opacity-30 transition-colors"
          >
            <Send className="w-4 h-4" />
          </button>
        </div>
      </form>
    </div>
  )
}

function ChatBubble({ msg, isTeacher, onPin, showPinAction }: { msg: any, isTeacher: boolean, onPin: (m: string) => void, showPinAction: boolean }) {
  const isHost = msg.from?.identity === "teacher" // in real app, check role metadata
  return (
    <div className="group">
      <div className="flex items-center gap-2 mb-1">
        <span className={`text-xs font-semibold ${isHost ? "text-indigo-400" : "text-slate-300"}`}>
          {msg.from?.name || "Anonymous"}
        </span>
        {isHost && (
          <span className="text-[9px] bg-indigo-600/40 text-indigo-300 px-1.5 py-0.5 rounded font-bold">HOST</span>
        )}
        <span className="text-[10px] text-slate-600 ml-auto">
          {new Date(msg.timestamp || Date.now()).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
        </span>
      </div>
      <div className="flex items-start gap-2">
        <p className={`text-sm flex-1 ${isHost ? "text-indigo-100" : "text-slate-300"}`}>
          {msg.message}
        </p>
        {showPinAction && (
          <button
            onClick={() => onPin(msg.message)}
            className="opacity-0 group-hover:opacity-100 p-1 rounded hover:bg-white/10 text-slate-500 hover:text-indigo-400 transition-all"
            title="Pin message"
          >
            <Pin className="w-3 h-3" />
          </button>
        )}
      </div>
    </div>
  )
}
