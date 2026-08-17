import ChatUI from "@/components/ChatUI";

export const metadata = {
  title: "AI Chat | Eklavya",
  description: "Chat with your AI tutor.",
};

export default async function ChatPage({ searchParams }: { searchParams: Promise<{ courseId?: string }> }) {
  const resolvedSearchParams = await searchParams;
  const courseId = resolvedSearchParams?.courseId;

  return (
    <div className="flex flex-col h-full max-w-5xl mx-auto p-4 sm:p-6 w-full">
      <div className="mb-6">
        <h1 className="text-2xl font-mono font-bold text-stone-900 tracking-tight">AI Tutor</h1>
        <p className="text-stone-600 font-mono text-sm">Ask questions, get explanations, and solve doubts.</p>
      </div>
      <ChatUI courseId={courseId} />
    </div>
  );
}
