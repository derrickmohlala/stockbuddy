import React, { useState, useEffect } from 'react'
import { Sparkles, ArrowRight, Loader2 } from 'lucide-react'

interface MagicInputProps {
    onAnalyze: (text: string) => Promise<void>
    isAnalyzing: boolean
}

const PLACEHOLDERS = [
    "I'm 26 and saving for a wedding in 3 years...",
    "I want to retire early and I'm okay with some risk...",
    "I have R5000 a month and I'm terrified of losing money...",
    "I want accurate dividend income to pay my bills...",
    "I'm looking for high growth tech stocks for the long term..."
]

const MagicInput: React.FC<MagicInputProps> = ({ onAnalyze, isAnalyzing }) => {
    const [text, setText] = useState('')
    const [placeholderIndex, setPlaceholderIndex] = useState(0)
    const [placeholderText, setPlaceholderText] = useState('')
    const [isTyping, setIsTyping] = useState(true)

    // Typewriter effect for placeholders
    useEffect(() => {
        if (text) return // Don't animate if user is typing

        let timeout: ReturnType<typeof setTimeout>
        const currentFullText = PLACEHOLDERS[placeholderIndex]

        if (isTyping) {
            if (placeholderText.length < currentFullText.length) {
                timeout = setTimeout(() => {
                    setPlaceholderText(currentFullText.slice(0, placeholderText.length + 1))
                }, 50)
            } else {
                timeout = setTimeout(() => setIsTyping(false), 2000) // Wait before deleting
            }
        } else {
            if (placeholderText.length > 0) {
                timeout = setTimeout(() => {
                    setPlaceholderText(placeholderText.slice(0, -1))
                }, 30)
            } else {
                setPlaceholderIndex((prev) => (prev + 1) % PLACEHOLDERS.length)
                setIsTyping(true)
            }
        }

        return () => clearTimeout(timeout)
    }, [placeholderText, isTyping, placeholderIndex, text])

    return (
        <div className="w-full max-w-2xl mx-auto space-y-6">
            <div className="text-center space-y-2">
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-brand-purple/10 text-brand-purple text-xs font-bold uppercase tracking-wider">
                    <Sparkles className="w-3 h-3" />
                    <span>AI Powered</span>
                </div>
                <h2 className="text-3xl font-black text-brand-ink dark:text-white">
                    Tell us your story.
                </h2>
                <p className="text-muted dark:text-gray-400">
                    Describe your goals in plain English, and we'll build your profile.
                </p>
            </div>

            <div className="relative group">
                <div className="absolute -inset-1 bg-gradient-to-r from-brand-purple to-brand-mint rounded-2xl opacity-20 group-hover:opacity-40 transition duration-500 blur-lg"></div>
                <div className="relative bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-xl border border-slate-100 dark:border-gray-700">
                    <textarea
                        value={text}
                        onChange={(e) => setText(e.target.value)}
                        placeholder={placeholderText}
                        className="w-full h-32 bg-transparent text-lg resize-none outline-none text-brand-ink dark:text-white placeholder-slate-300 dark:placeholder-gray-600"
                        disabled={isAnalyzing}
                    />

                    <div className="flex justify-between items-center mt-4 pt-4 border-t border-slate-50 dark:border-gray-700">
                        <span className="text-xs text-slate-400 font-medium">
                            {text.length} chars
                        </span>
                        <button
                            onClick={() => text.trim() && onAnalyze(text)}
                            disabled={!text.trim() || isAnalyzing}
                            className={`
                flex items-center gap-2 px-6 py-2.5 rounded-xl font-bold text-white transition-all
                ${!text.trim()
                                    ? 'bg-slate-200 text-slate-400 cursor-not-allowed'
                                    : 'bg-brand-purple hover:bg-brand-purple/90 shadow-lg shadow-brand-purple/20 hover:scale-105 active:scale-95'
                                }
              `}
                        >
                            {isAnalyzing ? (
                                <>
                                    <Loader2 className="w-4 h-4 animate-spin" />
                                    <span>Analyzing...</span>
                                </>
                            ) : (
                                <>
                                    <span>Create Plan</span>
                                    <ArrowRight className="w-4 h-4" />
                                </>
                            )}
                        </button>
                    </div>
                </div>
            </div>

            <p className="text-center text-xs text-slate-400">
                Or <button className="underline hover:text-brand-purple">skip this</button> and configure manually.
            </p>
        </div>
    )
}

export default MagicInput
