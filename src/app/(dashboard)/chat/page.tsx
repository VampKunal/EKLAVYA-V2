import ChatUI from "@/components/ChatUI";

export const metadata = {
  title: "AI Chat | Eklavya",
  description: "Chat with your AI tutor.",
};

export default function ChatPage() {
  return (
    <div className="flex flex-col h-full max-w-5xl mx-auto p-4 sm:p-6 w-full">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">AI Tutor</h1>
        <p className="text-gray-600 dark:text-gray-400">Ask questions, get explanations, and solve doubts.</p>
      </div>
      <ChatUI />
    </div>
  );
}
