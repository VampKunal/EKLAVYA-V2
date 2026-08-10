"use client";

import React, { useState, useRef, useEffect, useCallback } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import { vscDarkPlus } from "react-syntax-highlighter/dist/esm/styles/prism";
import { Copy, Check, Send, User, Bot, MoreHorizontal, Save, Mic, MicOff, Volume2, Square } from "lucide-react";
import { useChat } from "@ai-sdk/react";

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
      className="absolute top-2 right-2 p-1.5 rounded-md bg-gray-800 text-gray-300 hover:text-white hover:bg-gray-700 transition-colors"
      title="Copy code"
    >
      {copied ? <Check className="w-4 h-4 text-green-400" /> : <Copy className="w-4 h-4" />}
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
      // Cancel any ongoing speech
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.onend = () => setIsSpeaking(false);
      utterance.onerror = () => setIsSpeaking(false);
      window.speechSynthesis.speak(utterance);
      setIsSpeaking(true);
    }
  };

  // Cleanup on unmount
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
      className={`p-1.5 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors mt-2 self-start flex items-center gap-1.5 text-xs ${isSpeaking ? 'text-blue-600 dark:text-blue-400' : 'text-gray-500 dark:text-gray-400'}`}
      title={isSpeaking ? "Stop reading" : "Read aloud"}
    >
      {isSpeaking ? (
        <>
          <Square className="w-3.5 h-3.5 fill-current" /> Stop
        </>
      ) : (
        <>
          <Volume2 className="w-3.5 h-3.5" /> Read Aloud
        </>
      )}
    </button>
  );
};

import { DefaultChatTransport } from "ai";

export default function ChatUI({ courseId, courseName }: { courseId?: string, courseName?: string }) {
  const [input, setInput] = useState("");
  const [isListening, setIsListening] = useState(false);
  const recognitionRef = useRef<any>(null);
  
  const { messages, sendMessage, status, setMessages } = useChat({
    transport: new DefaultChatTransport({
      api: '/api/chat',
      body: {
        courseId,
      }
    }),
    onFinish: ({ message }) => {
      // Save history after ai responds
      if (courseId) {
        saveHistory(courseId, [...messages, message]);
      }
    }
  });

  const isLoading = status === 'submitted' || status === 'streaming';

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [isSaving, setIsSaving] = useState(false);

  // Initialize Speech Recognition
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
          setInput(prev => {
             // For simplicity, just append to input if empty, or replace last chunk.
             // Standard continuous dictation usually requires more complex state, but we'll keep it simple:
             // It overwrites input while listening.
             return currentTranscript;
          });
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
        setInput(""); // Clear input before new dictation
        recognitionRef.current.start();
        setIsListening(true);
      } else {
        alert("Speech recognition is not supported in this browser.");
      }
    }
  };

  useEffect(() => {
    if (courseId) {
      loadHistory(courseId);
    } else if (messages.length === 0) {
      setMessages([
        {
          id: "1",
          role: "assistant",
          parts: [{ type: 'text', text: `Hello! I'm your AI tutor for ${courseName || "this course"}. How can I help you today? \n\nYou can ask me to explain concepts, provide examples, or write code.` }]
        }
      ]);
    }
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
            parts: [{ type: 'text', text: `Hello! I'm your AI tutor for ${courseName || "this course"}. How can I help you today? \n\nYou can ask me to explain concepts, provide examples, or write code.` }]
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
          messages: updatedMessages.map(m => ({
            role: m.role,
            content: m.parts?.filter((p: any) => p.type === 'text').map((p: any) => p.text).join('\n') || (m as any).content || '',
          }))
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
    
    // Create optimistic user message for saving
    const userMessage = { id: Date.now().toString(), role: "user" as const, parts: [{ type: 'text' as const, text: input }] };
    if (courseId) {
       // We save user msg + previous msgs. The assistant response will be saved in onFinish.
       saveHistory(courseId, [...messages, userMessage]);
    }

    sendMessage({ text: input });
    setInput("");
  };

  return (
    <div className="flex flex-col h-[600px] max-h-[80vh] w-full bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl overflow-hidden shadow-sm flex-1">
      {/* Header */}
      <div className="px-4 py-3 border-b border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-950 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-blue-100 dark:bg-blue-900 flex items-center justify-center text-blue-600 dark:text-blue-400">
            <Bot className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-semibold text-gray-900 dark:text-white">AI Tutor {isSaving && <Save className="w-3 h-3 inline animate-pulse text-gray-400 ml-2" />}</h3>
            <p className="text-xs text-gray-500 dark:text-gray-400">Always online to help you</p>
          </div>
        </div>
      </div>

      {/* Chat Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-6">
        {messages.map((msg) => {
          const textContent = msg.parts?.filter((p: any) => p.type === 'text').map((p: any) => p.text).join('\n') || '';
          
          return (
            <div key={msg.id} className={`flex gap-4 ${msg.role === "user" ? "flex-row-reverse" : "flex-row"}`}>
              <div className={`w-8 h-8 rounded-full flex shrink-0 items-center justify-center ${msg.role === "user" ? "bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300" : "bg-blue-100 dark:bg-blue-900 text-blue-600 dark:text-blue-400"}`}>
                {msg.role === "user" ? <User className="w-5 h-5" /> : <Bot className="w-5 h-5" />}
              </div>
              <div className={`flex flex-col max-w-[85%] sm:max-w-[75%] ${msg.role === "user" ? "items-end" : "items-start"}`}>
                <div 
                  className={`px-4 py-3 rounded-2xl ${
                    msg.role === "user" 
                      ? "bg-blue-600 text-white rounded-tr-sm" 
                      : "bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-gray-100 rounded-tl-sm border border-gray-200 dark:border-gray-700"
                  }`}
                >
                  {msg.role === "user" ? (
                    <p className="whitespace-pre-wrap">{textContent}</p>
                  ) : (
                    <div className="prose prose-sm dark:prose-invert max-w-none prose-pre:p-0 prose-pre:bg-transparent">
                      <ReactMarkdown
                        remarkPlugins={[remarkGfm]}
                        components={{
                          code(props) {
                            const { children, className, node, ref, ...rest } = props;
                            const match = /language-(\w+)/.exec(className || "");
                            const isInline = !match && !String(children).includes("\n");
                            
                            if (isInline) {
                              return (
                                <code className="bg-gray-200 dark:bg-gray-700 px-1.5 py-0.5 rounded text-sm font-mono text-gray-800 dark:text-gray-200" {...rest}>
                                  {children}
                                </code>
                              );
                            }
                            
                            return match ? (
                              <div className="relative group rounded-md overflow-hidden my-3 border border-gray-700">
                                <CodeCopyButton text={String(children).replace(/\n$/, "")} />
                                <div className="bg-gray-800 text-gray-400 text-xs px-4 py-1.5 border-b border-gray-700 font-mono">
                                  {match[1]}
                                </div>
                                <SyntaxHighlighter
                                  {...rest}
                                  PreTag="div"
                                  language={match[1]}
                                  style={vscDarkPlus}
                                  customStyle={{ margin: 0, padding: '1rem', background: '#1e1e1e' }}
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
                <span className="text-xs text-gray-500 mt-1 mx-1">
                  {msg.role === "user" ? "You" : "AI Tutor"}
                </span>
              </div>
            </div>
          );
        })}

        {isLoading && messages.length > 0 && messages[messages.length - 1].role === 'user' && (
          <div className="flex gap-4 flex-row">
            <div className="w-8 h-8 rounded-full bg-blue-100 dark:bg-blue-900 flex shrink-0 items-center justify-center text-blue-600 dark:text-blue-400">
              <Bot className="w-5 h-5" />
            </div>
            <div className="flex flex-col items-start">
              <div className="px-4 py-4 rounded-2xl rounded-tl-sm bg-gray-100 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 flex items-center h-[46px]">
                <MoreHorizontal className="w-5 h-5 text-gray-500 animate-pulse" />
              </div>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input Area */}
      <div className="p-4 bg-white dark:bg-gray-900 border-t border-gray-200 dark:border-gray-800">
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
                // trigger form submit
                e.currentTarget.form?.dispatchEvent(new Event('submit', { cancelable: true, bubbles: true }));
              }
            }}
            placeholder={isListening ? "Listening..." : "Type your question... (Shift+Enter for new line)"}
            className="w-full bg-gray-100 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl px-4 py-3 pr-20 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none max-h-32 min-h-[50px] text-gray-900 dark:text-gray-100"
            rows={input.split('\n').length > 1 ? Math.min(input.split('\n').length, 4) : 1}
          />
          <div className="absolute right-2 bottom-2 flex gap-1">
            <button
              type="button"
              onClick={toggleListening}
              className={`p-2 rounded-lg transition-colors ${
                isListening 
                  ? "bg-red-100 text-red-600 hover:bg-red-200 dark:bg-red-900/30 dark:text-red-400" 
                  : "bg-gray-200 text-gray-600 hover:bg-gray-300 dark:bg-gray-700 dark:text-gray-300"
              }`}
              title={isListening ? "Stop listening" : "Start voice input"}
            >
              {isListening ? <MicOff className="w-4 h-4 animate-pulse" /> : <Mic className="w-4 h-4" />}
            </button>
            <button
              type="submit"
              disabled={!input.trim() || isLoading}
              className="p-2 rounded-lg bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              <Send className="w-4 h-4" />
            </button>
          </div>
        </form>
        <div className="text-center mt-2">
          <span className="text-[10px] text-gray-400">AI can make mistakes. Verify important information.</span>
        </div>
      </div>
    </div>
  );
}

