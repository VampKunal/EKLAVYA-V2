"use client";

import React, { useState, useRef, useEffect } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import { vscDarkPlus } from "react-syntax-highlighter/dist/esm/styles/prism";
import { Copy, Check, Send, User, Bot, MoreHorizontal } from "lucide-react";

type Message = {
  id: string;
  role: "user" | "assistant";
  content: string;
};

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

export default function ChatUI({ courseName }: { courseName?: string }) {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: "1",
      role: "assistant",
      content: `Hello! I'm your AI tutor for ${courseName || "this course"}. How can I help you today? \n\nYou can ask me to explain concepts, provide examples, or write code. For instance:\n\n\`\`\`javascript\nconsole.log("Hello, World!");\n\`\`\``
    }
  ]);
  const [input, setInput] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isTyping]);

  const handleSend = async () => {
    if (!input.trim()) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      role: "user",
      content: input
    };

    setMessages(prev => [...prev, userMessage]);
    setInput("");
    setIsTyping(true);

    // Simulate AI response
    setTimeout(() => {
      const aiMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: "assistant",
        content: `Here is a response to your query about **${userMessage.content.substring(0, 20)}...**\n\n### Example Code\n\n\`\`\`typescript\nfunction example() {\n  return "This is a simulated response!";\n}\n\`\`\`\n\nHope that helps!`
      };
      setMessages(prev => [...prev, aiMessage]);
      setIsTyping(false);
    }, 1500);
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
            <h3 className="font-semibold text-gray-900 dark:text-white">AI Tutor</h3>
            <p className="text-xs text-gray-500 dark:text-gray-400">Always online to help you</p>
          </div>
        </div>
      </div>

      {/* Chat Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-6">
        {messages.map((msg) => (
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
                  <p className="whitespace-pre-wrap">{msg.content}</p>
                ) : (
                  <div className="prose prose-sm dark:prose-invert max-w-none prose-pre:p-0 prose-pre:bg-transparent">
                    <ReactMarkdown
                      remarkPlugins={[remarkGfm]}
                      components={{
                        code(props) {
                          const { children, className, node, ...rest } = props;
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
                      {msg.content}
                    </ReactMarkdown>
                  </div>
                )}
              </div>
              <span className="text-xs text-gray-500 mt-1 mx-1">
                {msg.role === "user" ? "You" : "AI Tutor"}
              </span>
            </div>
          </div>
        ))}

        {isTyping && (
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
          onSubmit={(e) => { e.preventDefault(); handleSend(); }}
          className="flex gap-2 relative items-end"
        >
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                handleSend();
              }
            }}
            placeholder="Type your question... (Shift+Enter for new line)"
            className="w-full bg-gray-100 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl px-4 py-3 pr-12 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none max-h-32 min-h-[50px] text-gray-900 dark:text-gray-100"
            rows={input.split('\n').length > 1 ? Math.min(input.split('\n').length, 4) : 1}
          />
          <button
            type="submit"
            disabled={!input.trim() || isTyping}
            className="absolute right-2 bottom-2 p-2 rounded-lg bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            <Send className="w-4 h-4" />
          </button>
        </form>
        <div className="text-center mt-2">
          <span className="text-[10px] text-gray-400">AI can make mistakes. Verify important information.</span>
        </div>
      </div>
    </div>
  );
}
