import React, { useState, useRef, useEffect } from 'react'
import { MessageCircle, X, Send, Bot, User as UserIcon, Loader2 } from 'lucide-react'
import { apiFetch } from '../lib/api'

interface Message {
    id: string
    role: 'user' | 'assistant'
    text: string
    timestamp: number
}

const ChatAssistant: React.FC = () => {
    const [isOpen, setIsOpen] = useState(false)
    const [messages, setMessages] = useState<Message[]>([
        {
            id: 'welcome',
            role: 'assistant',
            text: "Hi! I'm StockBuddy. I can see your portfolio. Ask me anything about your holdings or how to improve your strategy.",
            timestamp: Date.now()
        }
    ])
    const [inputText, setInputText] = useState('')
    const [isTyping, setIsTyping] = useState(false)
    const scrollRef = useRef<HTMLDivElement>(null)

    useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight
        }
    }, [messages, isOpen])

    const handleSend = async () => {
        if (!inputText.trim()) return

        const userMsg: Message = {
            id: Date.now().toString(),
            role: 'user',
            text: inputText,
            timestamp: Date.now()
        }

        setMessages(prev => [...prev, userMsg])
        setInputText('')
        setIsTyping(true)

        try {
            const response = await apiFetch('/api/ai/chat', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ message: userMsg.text })
            })

            if (response.ok) {
                const data = await response.json()
                const aiMsg: Message = {
                    id: (Date.now() + 1).toString(),
                    role: 'assistant',
                    text: data.response,
                    timestamp: Date.now()
                }
                setMessages(prev => [...prev, aiMsg])
            } else {
                throw new Error("Failed to get response")
            }
        } catch (error) {
            const errorMsg: Message = {
                id: (Date.now() + 1).toString(),
                role: 'assistant',
                text: "I'm having trouble connecting to my brain right now. Please try again later.",
                timestamp: Date.now()
            }
            setMessages(prev => [...prev, errorMsg])
        } finally {
            setIsTyping(false)
        }
    }

    const handleKeyPress = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault()
            handleSend()
        }
    }

    if (!isOpen) {
        return (
            <button
                onClick={() => setIsOpen(true)}
                className="fixed bottom-6 right-6 z-50 flex items-center justify-center w-14 h-14 bg-brand-purple text-white rounded-full shadow-lg hover:bg-brand-purple/90 hover:scale-105 transition-all duration-300"
            >
                <MessageCircle className="w-8 h-8" />
            </button>
        )
    }

    return (
        <div className="fixed bottom-6 right-6 z-50 w-full max-w-[380px] h-[600px] max-h-[80vh] flex flex-col bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden animate-in slide-in-from-bottom-10 fade-in duration-300">
            {/* Header */}
            <div className="flex items-center justify-between p-4 bg-brand-purple text-white">
                <div className="flex items-center gap-3">
                    <div className="p-2 bg-white/20 rounded-full">
                        <Bot className="w-5 h-5" />
                    </div>
                    <div>
                        <h3 className="font-bold text-sm">StockBuddy Assistant</h3>
                        <span className="text-xs text-brand-mint flex items-center gap-1">
                            <span className="w-2 h-2 rounded-full bg-brand-mint animate-pulse" />
                            Online
                        </span>
                    </div>
                </div>
                <button
                    onClick={() => setIsOpen(false)}
                    className="p-1 hover:bg-white/20 rounded-lg transition-colors"
                >
                    <X className="w-5 h-5" />
                </button>
            </div>

            {/* Messages */}
            <div
                ref={scrollRef}
                className="flex-1 overflow-y-auto p-4 space-y-4 bg-slate-50 dark:bg-slate-950/50"
            >
                {messages.map((msg) => (
                    <div
                        key={msg.id}
                        className={`flex gap-3 ${msg.role === 'user' ? 'flex-row-reverse' : 'flex-row'}`}
                    >
                        <div className={`
              w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0
              ${msg.role === 'user' ? 'bg-slate-200 dark:bg-slate-800 text-slate-600' : 'bg-brand-purple/10 text-brand-purple'}
            `}>
                            {msg.role === 'user' ? <UserIcon className="w-4 h-4" /> : <Bot className="w-4 h-4" />}
                        </div>

                        <div className={`
              max-w-[80%] px-4 py-3 rounded-2xl text-sm leading-relaxed
              ${msg.role === 'user'
                                ? 'bg-brand-purple text-white rounded-br-none'
                                : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 rounded-bl-none shadow-sm'
                            }
            `}>
                            {msg.text}
                        </div>
                    </div>
                ))}

                {isTyping && (
                    <div className="flex gap-3">
                        <div className="w-8 h-8 rounded-full bg-brand-purple/10 text-brand-purple flex items-center justify-center flex-shrink-0">
                            <Bot className="w-4 h-4" />
                        </div>
                        <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 px-4 py-3 rounded-2xl rounded-bl-none shadow-sm flex items-center gap-1">
                            <span className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce [animation-delay:-0.3s]" />
                            <span className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce [animation-delay:-0.15s]" />
                            <span className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce" />
                        </div>
                    </div>
                )}
            </div>

            {/* Input */}
            <div className="p-4 bg-white dark:bg-slate-900 border-t border-slate-100 dark:border-slate-800">
                <div className="flex items-center gap-2 bg-slate-100 dark:bg-slate-800 px-4 py-2 rounded-xl border border-transparent focus-within:border-brand-purple/50 transition-colors">
                    <input
                        type="text"
                        value={inputText}
                        onChange={(e) => setInputText(e.target.value)}
                        onKeyDown={handleKeyPress}
                        placeholder="Ask about your portfolio..."
                        className="flex-1 bg-transparent outline-none text-sm text-slate-900 dark:text-white placeholder-slate-400"
                        disabled={isTyping}
                    />
                    <button
                        onClick={handleSend}
                        disabled={!inputText.trim() || isTyping}
                        className="p-2 bg-brand-purple text-white rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-brand-purple/90 transition-colors"
                    >
                        {isTyping ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                    </button>
                </div>
                <div className="mt-2 text-center">
                    <p className="text-[10px] text-slate-400">
                        StockBuddy AI can make mistakes. Check important info.
                    </p>
                </div>
            </div>
        </div>
    )
}

export default ChatAssistant
