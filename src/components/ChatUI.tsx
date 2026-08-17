"use client";

import React, { useState, useRef, useEffect } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import { vscDarkPlus } from "react-syntax-highlighter/dist/esm/styles/prism";
import { Copy, Check, Send, User, Bot, MoreHorizontal, Save, Mic, MicOff, Volume2, Square, Sparkles } from "lucide-react";
import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport } from "ai";

// Copy button for code blocks
const CodeCopyButton = ({ text }: { text: string }) => {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <button
      onClick={handleCopy}
      className="absolute top-2 right-2 p-1.5 rounded-md bg-stone-800 text-stone-300 hover:text-white hover:bg-orange-600 transition-colors font-mono text-xs flex items-center gap-1"
      title="Copy code"
    >
      {copied ? <Check className="w-3.5 h-3.5 text-green-400" /> : <Copy className="w-3.5 h-3.5" />}
    </button>
  );
};

// Text-to-Speech Button
const ReadAloudButton = ({ text }: { text: string }) => {
  const [isSpeaking, setIsSpeaking] = useState(false);

  const toggleSpeech = () => {
    if (isSpeaking) {
      window.speechSynthesis.cancel();
      setIsSpeaking(false);
    } else {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.onend = () => setIsSpeaking(false);
      utterance.onerror = () => setIsSpeaking(false);
      window.speechSynthesis.speak(utterance);
      setIsSpeaking(true);
    }
  };

  useEffect(() => {
    return () => {
      if (isSpeaking) {
        window.speechSynthesis.cancel();
      }
    };
  }, [isSpeaking]);

  return (
    <button
      onClick={toggleSpeech}
      className={`p-1.5 rounded-lg hover:bg-orange-50 transition-colors mt-2 self-start flex items-center gap-1.5 text-xs font-mono font-bold ${
        isSpeaking ? 'text-orange-600' : 'text-stone-500 hover:text-orange-600'
      }`}
      title={isSpeaking ? "Stop reading" : "Read aloud"}
    >
      {isSpeaking ? (
        <>
          <Square className="w-3.5 h-3.5 fill-current text-orange-500" /> Stop
        </>
      ) : (
        <>
          <Volume2 className="w-3.5 h-3.5 text-orange-500" /> Read Aloud
        </>
      )}
    </button>
  );
};

export default function ChatUI({ courseId, courseName }: { courseId?: string, courseName?: string }) {
  const [input, setInput] = useState("");
  const [isListening, setIsListening] = useState(false);
  const recognitionRef = useRef<any>(null);
  
  const { messages, sendMessage, status, setMessages } = useChat({
    transport: new DefaultChatTransport({
      api: '/api/chat',
      body: { courseId },
    }),
    onFinish: (message) => {
      const cid = courseId || 'global';
      saveHistory(cid, [...messages, message]);
    }
  });

  const isLoading = status === 'submitted' || status === 'streaming';
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [isSaving, setIsSaving] = useState(false);

  // Speech Recognition initialization
  useEffect(() => {
    if (typeof window !== "undefined") {
      const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      if (SpeechRecognition) {
        const recognition = new SpeechRecognition();
        recognition.continuous = true;
        recognition.interimResults = true;
        
        recognition.onresult = (event: any) => {
          let currentTranscript = "";
          for (let i = event.resultIndex; i < event.results.length; i++) {
             currentTranscript += event.results[i][0].transcript;
          }
          setInput(currentTranscript);
        };

        recognition.onerror = (event: any) => {
          console.error("Speech recognition error", event.error);
          setIsListening(false);
        };

        recognition.onend = () => {
          setIsListening(false);
        };

        recognitionRef.current = recognition;
      }
    }
  }, []);

  const toggleListening = () => {
    if (isListening) {
      recognitionRef.current?.stop();
      setIsListening(false);
    } else {
      if (recognitionRef.current) {
        setInput("");
        recognitionRef.current.start();
        setIsListening(true);
      } else {
        alert("Speech recognition is not supported in this browser.");
      }
    }
  };

  useEffect(() => {
    const cid = courseId || 'global';
    loadHistory(cid);
  }, [courseId]);

  const loadHistory = async (cid: string) => {
    try {
      const res = await fetch(`/api/chat/history?courseId=${cid}`);
      const data = await res.json();
      if (data && data.messages && data.messages.length > 0) {
        setMessages(data.messages.map((m: any) => ({
          id: m._id || Date.now().toString() + Math.random().toString(),
          role: m.role,
          parts: [{ type: 'text', text: m.content || '' }]
        })));
      } else {
        setMessages([
          {
            id: "1",
            role: "assistant",
            parts: [{ type: 'text', text: `Hello! I'm your AI tutor for **${courseName || "this workspace"}**. How can I assist your learning today?\n\nFeel free to ask questions, request code samples, or unpack difficult concepts!` }]
          }
        ]);
      }
    } catch (e) {
      console.error('Failed to load history', e);
    }
  };

  const saveHistory = async (cid: string, updatedMessages: any[]) => {
    try {
      setIsSaving(true);
      await fetch('/api/chat/history', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          courseId: cid,
          messages: updatedMessages.map(m => {
            const textContent = Array.isArray(m.parts) 
              ? m.parts.filter((p: any) => p.type === 'text').map((p: any) => p.text).join('')
              : (m as any).content || '';
            return {
              role: m.role,
              content: textContent,
            };
          })
        })
      });
    } catch (e) {
      console.error('Failed to save history', e);
    } finally {
      setIsSaving(false);
    }
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isLoading]);

  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInput(e.target.value);
  };

  const onSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!input.trim()) return;
    
    if (isListening) {
      toggleListening();
    }
    
    const userMessage = { id: Date.now().toString(), role: "user" as const, parts: [{ type: 'text' as const, text: input }] };
    const cid = courseId || 'global';
    saveHistory(cid, [...messages, userMessage]);

    sendMessage({ text: input });
    setInput("");
  };

  return (
    <div className="flex flex-col h-[650px] max-h-[85vh] w-full bg-white border border-orange-200/80 rounded-2xl overflow-hidden shadow-xl shadow-orange-500/5 flex-1">
      {/* Header */}
      <div className="px-5 py-4 border-b border-orange-100 bg-gradient-to-r from-orange-50/80 to-white flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-orange-500 to-orange-600 flex items-center justify-center text-white shadow-md shadow-orange-500/25">
            <Bot className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-mono font-bold text-stone-900 flex items-center gap-2">
              AI TUTOR
              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-orange-100 text-orange-700 border border-orange-200">
                <Sparkles className="w-2.5 h-2.5 mr-1 text-orange-500" />
                Active
              </span>
              {isSaving && <Save className="w-3.5 h-3.5 inline animate-pulse text-orange-500" />}
            </h3>
            <p className="text-xs text-stone-500 font-mono">Personalized pedagogical mentor</p>
          </div>
        </div>
      </div>

      {/* Chat Messages */}
      <div className="flex-1 overflow-y-auto p-5 space-y-6 bg-stone-50/30">
        {messages.map((msg) => {
          const textContent = Array.isArray(msg.parts)
            ? msg.parts.filter((p: any) => p.type === 'text').map((p: any) => p.text).join('')
            : (msg as any).content || '';
          
          return (
            <div key={msg.id} className={`flex gap-3.5 ${msg.role === "user" ? "flex-row-reverse" : "flex-row"}`}>
              <div className={`w-8 h-8 rounded-xl flex shrink-0 items-center justify-center shadow-sm ${
                msg.role === "user" 
                  ? "bg-stone-900 text-white font-mono font-bold text-xs" 
                  : "bg-gradient-to-br from-orange-500 to-orange-600 text-white"
              }`}>
                {msg.role === "user" ? <User className="w-4 h-4" /> : <Bot className="w-4 h-4" />}
              </div>
              <div className={`flex flex-col max-w-[85%] sm:max-w-[78%] ${msg.role === "user" ? "items-end" : "items-start"}`}>
                <div 
                  className={`px-4 py-3.5 rounded-2xl text-sm leading-relaxed ${
                    msg.role === "user" 
                      ? "bg-gradient-to-r from-orange-500 to-orange-600 text-white shadow-md shadow-orange-500/20 font-medium rounded-tr-xs" 
                      : "bg-white text-stone-800 rounded-tl-xs border border-orange-100 shadow-sm"
                  }`}
                >
                  {msg.role === "user" ? (
                    <p className="whitespace-pre-wrap">{textContent}</p>
                  ) : (
                    <div className="prose prose-sm max-w-none prose-orange prose-pre:p-0 prose-pre:bg-transparent">
                      <ReactMarkdown
                        remarkPlugins={[remarkGfm]}
                        components={{
                          code(props) {
                            const { children, className, node, ref, ...rest } = props;
                            const match = /language-(\w+)/.exec(className || "");
                            const isInline = !match && !String(children).includes("\n");
                            
                            if (isInline) {
                              return (
                                <code className="bg-orange-100/80 text-orange-900 px-1.5 py-0.5 rounded font-mono text-xs border border-orange-200/60 font-semibold" {...rest}>
                                  {children}
                                </code>
                              );
                            }
                            
                            return match ? (
                              <div className="relative group rounded-xl overflow-hidden my-3 border border-stone-800 shadow-md">
                                <CodeCopyButton text={String(children).replace(/\n$/, "")} />
                                <div className="bg-stone-900 text-orange-400 text-[11px] px-4 py-1.5 border-b border-stone-800 font-mono font-bold uppercase tracking-wider flex items-center justify-between">
                                  <span>{match[1]}</span>
                                </div>
                                <SyntaxHighlighter
                                  {...rest}
                                  PreTag="div"
                                  language={match[1]}
                                  style={vscDarkPlus}
                                  customStyle={{ margin: 0, padding: '1rem', background: '#121212', fontSize: '13px' }}
                                >
                                  {String(children).replace(/\n$/, "")}
                                </SyntaxHighlighter>
                              </div>
                            ) : (
                              <code className={className} {...rest}>
                                {children}
                              </code>
                            );
                          },
                        }}
                      >
                        {textContent}
                      </ReactMarkdown>
                    </div>
                  )}
                </div>
                {msg.role !== "user" && <ReadAloudButton text={textContent} />}
                <span className="text-[11px] font-mono text-stone-400 mt-1 mx-1">
                  {msg.role === "user" ? "You" : "Eklavya AI"}
                </span>
              </div>
            </div>
          );
        })}

        {isLoading && messages.length > 0 && messages[messages.length - 1].role === 'user' && (
          <div className="flex gap-3.5 flex-row">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-orange-500 to-orange-600 flex shrink-0 items-center justify-center text-white shadow-sm">
              <Bot className="w-4 h-4" />
            </div>
            <div className="flex flex-col items-start">
              <div className="px-4 py-3.5 rounded-2xl rounded-tl-xs bg-white border border-orange-100 shadow-sm flex items-center h-[46px]">
                <MoreHorizontal className="w-5 h-5 text-orange-500 animate-pulse" />
              </div>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input Area */}
      <div className="p-4 bg-white border-t border-orange-100">
        <form 
          onSubmit={onSubmit}
          className="flex gap-2 relative items-end"
        >
          <textarea
            value={input}
            onChange={handleInputChange}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                e.currentTarget.form?.dispatchEvent(new Event('submit', { cancelable: true, bubbles: true }));
              }
            }}
            placeholder={isListening ? "Listening..." : "Ask your AI tutor anything..."}
            className="w-full bg-stone-50 border border-orange-200/80 rounded-xl px-4 py-3 pr-24 focus:outline-none focus:ring-2 focus:ring-orange-500/50 focus:border-orange-500 focus:bg-white resize-none max-h-32 min-h-[50px] text-stone-900 text-sm font-sans transition-all placeholder:text-stone-400 placeholder:font-mono placeholder:text-xs"
            rows={input.split('\n').length > 1 ? Math.min(input.split('\n').length, 4) : 1}
          />
          <div className="absolute right-2.5 bottom-2.5 flex gap-1.5">
            <button
              type="button"
              onClick={toggleListening}
              className={`p-2 rounded-lg transition-all font-mono text-xs ${
                isListening 
                  ? "bg-red-100 text-red-600 border border-red-200 hover:bg-red-200" 
                  : "bg-orange-100/60 text-orange-600 hover:bg-orange-100 border border-orange-200/60"
              }`}
              title={isListening ? "Stop listening" : "Start voice input"}
            >
              {isListening ? <MicOff className="w-4 h-4 animate-pulse" /> : <Mic className="w-4 h-4" />}
            </button>
            <button
              type="submit"
              disabled={!input.trim() || isLoading}
              className="p-2 rounded-lg bg-gradient-to-r from-orange-500 to-orange-600 text-white hover:from-orange-600 hover:to-orange-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-sm shadow-orange-500/20"
            >
              <Send className="w-4 h-4" />
            </button>
          </div>
        </form>
        <div className="text-center mt-2">
          <span className="text-[10px] font-mono text-stone-400">Eklavya AI is empowered with pedagogical RAG context.</span>
        </div>
      </div>
    </div>
  );
}
