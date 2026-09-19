import { useState, useEffect, useRef } from 'react'
import {
  Globe,
  Compass,
  Send,
  Sparkles,
  RotateCcw,
  Key,
  X,
  MapPin,
  CheckCircle,
  HelpCircle,
  AlertCircle,
  Plane,
  ChevronRight,
} from 'lucide-react'
import {
  type ChatMessage,
  sendChatMessage,
  getGeminiApiKey,
  saveGeminiApiKey,
} from './services/gemini'

const INITIAL_HELP_MESSAGE: ChatMessage = {
  id: 'welcome-msg',
  role: 'model',
  text: `Hello! I am your **GlobeDesk Tourism Specialist**. 🌍✈️\n\nI have comprehensive knowledge of every country, city, culture, and itinerary across the globe. Whether you need a day-by-day travel plan, best months to visit, visa guidelines, local food recommendations, or hidden gems—I am here to guide your journey.\n\nWhich country or destination would you like to explore today?`,
  timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
}

const QUICK_PROMPTS = [
  '🗾 Plan a 7-day cultural itinerary for Japan (Tokyo & Kyoto)',
  '🏔️ Best season & hidden spots to visit in Switzerland',
  '🏖️ Essential first-timer guide for traveling to Thailand',
  '🏛️ 4-day budget-friendly exploration of Rome and Florence',
  '🌮 Ultimate foodie and cultural guide to Oaxaca, Mexico',
]

export default function App() {
  const [messages, setMessages] = useState<ChatMessage[]>([INITIAL_HELP_MESSAGE])
  const [inputValue, setInputValue] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [showIntroModal, setShowIntroModal] = useState(true)
  const [showKeyModal, setShowKeyModal] = useState(false)
  const [apiKeyInput, setApiKeyInput] = useState('')
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [lastFailedText, setLastFailedText] = useState<string | null>(null)
  const [activeKey, setActiveKey] = useState<string>('')

  const messagesEndRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    const key = getGeminiApiKey()
    setActiveKey(key)
    setApiKeyInput(key)
    // Check if user has already seen the intro in this session
    const hasSeenIntro = sessionStorage.getItem('globedesk_intro_seen')
    if (hasSeenIntro) {
      setShowIntroModal(false)
    }
  }, [])

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, isLoading])

  const handleCloseIntro = () => {
    setShowIntroModal(false)
    sessionStorage.setItem('globedesk_intro_seen', 'true')
    setTimeout(() => {
      inputRef.current?.focus()
    }, 100)
  }

  const handleSaveKey = (e: React.FormEvent) => {
    e.preventDefault()
    saveGeminiApiKey(apiKeyInput.trim())
    setActiveKey(apiKeyInput.trim())
    setShowKeyModal(false)
    setErrorMessage(null)
  }

  const handleSendMessage = async (textToSend?: string) => {
    const text = (textToSend || inputValue).trim()
    if (!text || isLoading) return

    const currentKey = activeKey || getGeminiApiKey()
    if (!currentKey) {
      setShowKeyModal(true)
      return
    }

    const userMessage: ChatMessage = {
      id: `usr-${Date.now()}`,
      role: 'user',
      text,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    }

    // Append user message immediately
    const updatedHistory = [...messages, userMessage]
    setMessages(updatedHistory)
    setInputValue('')
    setIsLoading(true)
    setErrorMessage(null)

    try {
      // Exclude greeting banner if needed, send previous talks as context
      const historyForApi = updatedHistory.filter((m) => m.id !== 'welcome-msg')
      // Note: sendChatMessage takes (history, newMessage)
      // history = all messages except the very latest one
      const previousTurns = historyForApi.slice(0, -1)

      const replyText = await sendChatMessage(previousTurns, text, currentKey)

      const botMessage: ChatMessage = {
        id: `bot-${Date.now()}`,
        role: 'model',
        text: replyText,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      }

      setMessages((prev: ChatMessage[]) => [...prev, botMessage])
      setLastFailedText(null)
    } catch (err: any) {
      console.error('Chat error:', err)
      setLastFailedText(text)
      if (err.message === 'MISSING_API_KEY') {
        setShowKeyModal(true)
      } else {
        setErrorMessage(err.message || 'An error occurred while connecting with Gemini.')
      }
    } finally {
      setIsLoading(false)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSendMessage()
    }
  }

  const handleResetChat = () => {
    if (confirm('Start a fresh travel consultation session?')) {
      setMessages([INITIAL_HELP_MESSAGE])
      setErrorMessage(null)
    }
  }

  // Senior dev minimal markdown formatter for clean readable travel responses
  const renderFormattedContent = (content: string) => {
    const lines = content.split('\n')
    return lines.map((line, idx) => {
      // Empty lines
      if (!line.trim()) {
        return <div key={idx} className="h-2" />
      }

      // Headers (e.g. ### Day 1: Arrival or ## Overview)
      if (line.startsWith('### ') || line.startsWith('## ') || line.startsWith('# ')) {
        const clean = line.replace(/^#+\s*/, '')
        return (
          <h4 key={idx} className="text-base font-bold text-cyan-300 mt-3 mb-1 flex items-center gap-1.5">
            <MapPin className="w-4 h-4 text-cyan-400 inline-shrink-0" />
            <span>{clean}</span>
          </h4>
        )
      }

      // Bullet points
      if (line.trim().startsWith('* ') || line.trim().startsWith('- ')) {
        const bulletContent = line.trim().substring(2)
        return (
          <div key={idx} className="flex items-start gap-2.5 my-1 pl-1">
            <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 mt-2 shrink-0"></span>
            <span className="text-slate-200 text-sm leading-relaxed">
              {formatInlineText(bulletContent)}
            </span>
          </div>
        )
      }

      // Numbered items (e.g. "1. Visit Grand Palace")
      const numberedMatch = line.match(/^(\d+)\.\s*(.+)/)
      if (numberedMatch) {
        return (
          <div key={idx} className="flex items-start gap-2.5 my-1 pl-1">
            <span className="text-xs font-semibold text-cyan-400 bg-cyan-950/70 border border-cyan-800/60 rounded px-1.5 py-0.5 mt-0.5 shrink-0">
              {numberedMatch[1]}
            </span>
            <span className="text-slate-200 text-sm leading-relaxed">
              {formatInlineText(numberedMatch[2])}
            </span>
          </div>
        )
      }

      // Regular paragraph
      return (
        <p key={idx} className="text-slate-200 text-sm leading-relaxed my-1">
          {formatInlineText(line)}
        </p>
      )
    })
  }

  // Parse bold **text** in lines
  const formatInlineText = (text: string) => {
    const parts = text.split(/(\*\*.*?\*\*)/g)
    return parts.map((part, i) => {
      if (part.startsWith('**') && part.endsWith('**')) {
        return (
          <strong key={i} className="font-semibold text-white">
            {part.slice(2, -2)}
          </strong>
        )
      }
      return part
    })
  }

  return (
    <div className="flex flex-col h-screen bg-slate-950 text-slate-100 antialiased selection:bg-cyan-500/30 selection:text-cyan-200">
      {/* Clean Minimal Header */}
      <header className="h-16 shrink-0 border-b border-slate-800/80 bg-slate-950/90 backdrop-blur-md px-4 sm:px-6 flex items-center justify-between z-30">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-cyan-500 via-blue-600 to-indigo-600 flex items-center justify-center shadow-lg shadow-cyan-500/20 ring-1 ring-white/10">
            <Globe className="w-5 h-5 text-white" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="font-bold text-base tracking-tight text-white">GlobeDesk</h1>
            </div>
            <p className="text-[11px] text-slate-400 font-medium">World Travel & Country Exploration</p>
          </div>
        </div>

        {/* Header Actions: Reset, Intro Info & Key status */}
        <div className="flex items-center gap-2">
          <button
            onClick={handleResetChat}
            title="Reset conversation context"
            className="p-2 text-slate-400 hover:text-slate-200 hover:bg-slate-900 rounded-xl transition-all border border-transparent hover:border-slate-800"
          >
            <RotateCcw className="w-4 h-4" />
          </button>

          <button
            onClick={() => setShowIntroModal(true)}
            title="How to use GlobeDesk"
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-300 hover:text-white bg-slate-900 hover:bg-slate-800 border border-slate-800 rounded-xl transition-all"
          >
            <HelpCircle className="w-3.5 h-3.5 text-cyan-400" />
            <span className="hidden sm:inline">How to use</span>
          </button>

          <button
            onClick={() => setShowKeyModal(true)}
            title="Configure Gemini API Key"
            className={`flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium rounded-xl border transition-all ${activeKey
                ? 'text-slate-400 hover:text-slate-200 bg-slate-900 border-slate-800'
                : 'text-amber-400 bg-amber-500/10 border-amber-500/30 animate-pulse'
              }`}
          >
            <Key className="w-3.5 h-3.5" />
            <span className="hidden md:inline">{activeKey ? 'API Key Active' : 'Set API Key'}</span>
          </button>
        </div>
      </header>

      {/* Main Chat Conversation Stream */}
      <main className="flex-1 overflow-y-auto px-4 sm:px-6 py-6 space-y-6 max-w-4xl mx-auto w-full">
        {errorMessage && (
          <div className="flex items-start gap-3 p-4 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-rose-400" />
            <div className="flex-1 space-y-2">
              <p className="font-semibold">{errorMessage}</p>
              {lastFailedText && (
                <button
                  onClick={() => {
                    // Strip the failed user message turn to avoid visual duplicates, then re-send
                    setMessages((prev) => prev.slice(0, -1))
                    handleSendMessage(lastFailedText)
                  }}
                  className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-rose-500/20 hover:bg-rose-500/30 text-rose-200 border border-rose-500/40 text-xs font-semibold transition-all shadow-sm"
                >
                  <RotateCcw className="w-3 h-3" /> Retry Prompt
                </button>
              )}
            </div>
            <button onClick={() => setErrorMessage(null)} className="text-rose-400 hover:text-rose-200">
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {messages.map((message: ChatMessage) => {
          const isUser = message.role === 'user'

          return (
            <div
              key={message.id}
              className={`flex gap-3.5 ${isUser ? 'justify-end' : 'justify-start'}`}
            >
              {!isUser && (
                <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-cyan-600 to-blue-600 flex items-center justify-center shrink-0 shadow-md ring-1 ring-white/10 mt-1">
                  <Compass className="w-4 h-4 text-white" />
                </div>
              )}

              <div
                className={`max-w-[85%] sm:max-w-[78%] rounded-2xl p-4 transition-all ${isUser
                    ? 'bg-gradient-to-r from-cyan-600 to-blue-600 text-white rounded-tr-sm shadow-lg shadow-cyan-600/10'
                    : 'bg-slate-900/90 border border-slate-800/90 rounded-tl-sm shadow-xl'
                  }`}
              >
                {isUser ? (
                  <p className="text-sm leading-relaxed whitespace-pre-wrap">{message.text}</p>
                ) : (
                  <div className="space-y-1">{renderFormattedContent(message.text)}</div>
                )}

                <div
                  className={`mt-2 text-[10px] font-mono flex items-center justify-end ${isUser ? 'text-cyan-100/70' : 'text-slate-500'
                    }`}
                >
                  <span>{message.timestamp}</span>
                </div>
              </div>
            </div>
          )
        })}

        {/* Loading Indicator */}
        {isLoading && (
          <div className="flex items-center gap-3.5">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-cyan-600 to-blue-600 flex items-center justify-center shrink-0 shadow-md ring-1 ring-white/10">
              <Compass className="w-4 h-4 text-white animate-spin" />
            </div>
            <div className="bg-slate-900 border border-slate-800/90 rounded-2xl rounded-tl-sm px-4 py-3 flex items-center gap-2.5">
              <div className="flex gap-1">
                <span className="w-2 h-2 rounded-full bg-cyan-400 animate-bounce"></span>
                <span className="w-2 h-2 rounded-full bg-cyan-400 animate-bounce [animation-delay:0.2s]"></span>
                <span className="w-2 h-2 rounded-full bg-cyan-400 animate-bounce [animation-delay:0.4s]"></span>
              </div>
              <span className="text-xs text-slate-400 font-medium">Consulting global tourism database...</span>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </main>

      {/* Footer / Input Workspace */}
      <footer className="shrink-0 border-t border-slate-800/80 bg-slate-950/95 p-4 sm:p-5 z-20">
        <div className="max-w-4xl mx-auto w-full space-y-3">
          {/* Quick Starter Inspiration Pills (shown when chat is concise) */}
          {messages.length <= 3 && (
            <div className="flex items-center gap-2 overflow-x-auto pb-1 no-scrollbar">
              <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider shrink-0 flex items-center gap-1">
                <Sparkles className="w-3 h-3 text-cyan-400" /> Ideas:
              </span>
              {QUICK_PROMPTS.map((prompt, i) => (
                <button
                  key={i}
                  onClick={() => handleSendMessage(prompt)}
                  disabled={isLoading}
                  className="text-xs text-slate-300 hover:text-white bg-slate-900 hover:bg-slate-800 border border-slate-800 hover:border-slate-700 px-3 py-1 rounded-full whitespace-nowrap transition-all shrink-0"
                >
                  {prompt}
                </button>
              ))}
            </div>
          )}

          {/* Chat Input Field */}
          <div className="relative flex items-center bg-slate-900/90 border border-slate-800 focus-within:border-cyan-500/50 focus-within:ring-2 focus-within:ring-cyan-500/20 rounded-2xl p-1.5 transition-all shadow-xl">
            <textarea
              ref={inputRef}
              rows={1}
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Ask about any country, city, custom itinerary, visa rule, or hidden gem..."
              className="w-full bg-transparent text-sm text-slate-100 placeholder-slate-500 px-3 py-2 focus:outline-none resize-none max-h-32"
            />
            <button
              onClick={() => handleSendMessage()}
              disabled={!inputValue.trim() || isLoading}
              className="p-2.5 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 text-white disabled:opacity-30 disabled:cursor-not-allowed hover:from-cyan-400 hover:to-blue-500 active:scale-95 transition-all shadow-md shadow-cyan-500/20 shrink-0"
            >
              <Send className="w-4 h-4" />
            </button>
          </div>

          <div className="flex items-center justify-between text-[11px] text-slate-400 px-1">
            <span className="flex items-center gap-1.5">
              <Plane className="w-3 h-3 text-cyan-400" />
              Specialized exclusively in World Tourism & Travel Geography
            </span>
            <span className="hidden sm:inline">Press Enter to send, Shift+Enter for new line</span>
          </div>
        </div>
      </footer>

      {/* Intro Modal (How to Use Popup) */}
      {showIntroModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fade-in">
          <div className="w-full max-w-lg rounded-3xl border border-slate-800 bg-gradient-to-b from-slate-900 to-slate-950 p-6 sm:p-7 shadow-2xl relative space-y-6">
            <div className="flex items-center justify-between border-b border-slate-800/80 pb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-cyan-500 to-blue-600 flex items-center justify-center shadow-lg shadow-cyan-500/30">
                  <Globe className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h3 className="font-bold text-lg text-white">Welcome to GlobeDesk</h3>
                  <p className="text-xs text-cyan-400 font-medium">Your Global Tourism & Travel Helpdesk</p>
                </div>
              </div>
              <button
                onClick={handleCloseIntro}
                className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* How to use points */}
            <div className="space-y-3.5 text-xs text-slate-300">
              <div className="p-3.5 rounded-2xl bg-slate-950/70 border border-slate-800/80 space-y-1.5">
                <div className="font-semibold text-white flex items-center gap-2">
                  <Compass className="w-4 h-4 text-cyan-400" />
                  <span>Ask About Any Country & Destination</span>
                </div>
                <p className="text-slate-400 leading-relaxed">
                  Request day-by-day travel itineraries, local food delicacies, best seasons to visit, visa guidelines, packing lists, and hidden spots off the beaten path.
                </p>
              </div>

              <div className="p-3.5 rounded-2xl bg-slate-950/70 border border-slate-800/80 space-y-1.5">
                <div className="font-semibold text-white flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-cyan-400" />
                  <span>Remembers Context Across Conversation</span>
                </div>
                <p className="text-slate-400 leading-relaxed">
                  GlobeDesk remembers your previous questions in the chat session. Feel free to ask follow-up questions like: <em>&ldquo;Can we adjust Day 3 for rainy weather?&rdquo;</em> or <em>&ldquo;What is the budget for that trip?&rdquo;</em>
                </p>
              </div>

              <div className="p-3.5 rounded-2xl bg-slate-950/70 border border-slate-800/80 space-y-1.5">
                <div className="font-semibold text-white flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 text-emerald-400" />
                  <span>Strict Tourism Scope</span>
                </div>
                <p className="text-slate-400 leading-relaxed">
                  This helpdesk is exclusively focused on tourism and geography. If a query wanders outside travel and world exploration, GlobeDesk will politely ask to stay in context.
                </p>
              </div>
            </div>

            {/* CTA */}
            <div className="pt-2">
              <button
                onClick={handleCloseIntro}
                className="w-full flex items-center justify-center gap-2 py-3 rounded-2xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white font-semibold text-sm shadow-xl shadow-cyan-500/25 active:scale-98 transition-all"
              >
                <span>Start Exploring</span>
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* API Key Modal */}
      {showKeyModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fade-in">
          <div className="w-full max-w-md rounded-3xl border border-slate-800 bg-slate-900 p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
                  <Key className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-bold text-sm text-white">Gemini API Key</h3>
                  <p className="text-[11px] text-slate-400">Configure or override your API key</p>
                </div>
              </div>
              <button
                onClick={() => setShowKeyModal(false)}
                className="p-1 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveKey} className="space-y-4">
              <p className="text-xs text-slate-300 leading-relaxed">
                You can configure <code className="bg-slate-950 px-1 py-0.5 rounded text-cyan-300 border border-slate-800">VITE_GEMINI_API_KEY</code> in your project’s <code className="bg-slate-950 px-1 py-0.5 rounded text-cyan-300 border border-slate-800">.env</code> file, or paste your key below directly:
              </p>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Google Gemini API Key
                </label>
                <input
                  type="password"
                  value={apiKeyInput}
                  onChange={(e) => setApiKeyInput(e.target.value)}
                  placeholder="AIzaSy..."
                  className="w-full text-xs bg-slate-950 border border-slate-800 rounded-xl px-3 py-2.5 text-slate-200 placeholder-slate-600 focus:outline-none focus:ring-1 focus:ring-cyan-500 font-mono"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowKeyModal(false)}
                  className="px-3.5 py-2 text-xs font-semibold rounded-xl text-slate-400 hover:text-white hover:bg-slate-800"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-xs font-semibold rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white shadow-md shadow-cyan-600/20 active:scale-95 transition-all"
                >
                  Save Key
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
