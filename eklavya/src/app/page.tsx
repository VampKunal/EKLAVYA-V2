import Link from "next/link";
import { getServerSession } from "next-auth/next";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";

export default async function Home() {
  const session = await getServerSession(authOptions);

  if (session?.user) {
    redirect("/dashboard");
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-surface overflow-hidden">
      {/* Navigation */}
      <nav className="w-full flex items-center justify-between p-6 max-w-7xl mx-auto absolute top-0 left-0 right-0 z-50">
        <div className="text-2xl font-bold bg-gradient-to-r from-primary to-purple-500 bg-clip-text text-transparent">
          Eklavya AI
        </div>
        <div className="flex gap-4">
          <Link href="/sign-in" className="btn btn-ghost px-6 py-2 rounded-full border border-primary text-primary hover:bg-primary/10 transition-all">
            Log In
          </Link>
          <Link href="/sign-up" className="btn btn-primary px-6 py-2 rounded-full shadow-[0_0_15px_rgba(var(--primary-rgb),0.5)] transition-all hover:scale-105">
            Get Started
          </Link>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative pt-40 pb-20 px-6 max-w-7xl mx-auto text-center flex flex-col items-center justify-center min-h-[80vh]">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(var(--primary-rgb),0.15),transparent_50%)] pointer-events-none" />
        <h1 className="text-5xl md:text-7xl font-extrabold mb-6 leading-tight tracking-tight relative z-10">
          Master Any Subject with <br/>
          <span className="bg-gradient-to-r from-primary via-purple-500 to-pink-500 bg-clip-text text-transparent">
            Your Personal AI Tutor
          </span>
        </h1>
        <p className="text-lg md:text-xl text-foreground/80 max-w-2xl mb-10 leading-relaxed relative z-10">
          Eklavya analyzes your learning style, tracks your weak points, and delivers personalized quizzes, notes, and AI-driven insights to accelerate your mastery.
        </p>
        <div className="flex flex-col sm:flex-row gap-4 relative z-10">
          <Link href="/sign-up" className="btn btn-primary px-8 py-4 text-lg font-semibold rounded-full shadow-[0_0_30px_rgba(var(--primary-rgb),0.6)] hover:scale-105 transition-all">
            Start Learning for Free
          </Link>
        </div>
      </section>

      {/* Features Grid */}
      <section className="py-24 px-6 bg-surface/50 relative z-10 border-y border-white/5">
        <div className="max-w-7xl mx-auto">
          <h2 className="text-3xl md:text-4xl font-bold text-center mb-16">Supercharge Your Education</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {/* Feature 1 */}
            <div className="p-8 rounded-2xl bg-background/50 border border-white/5 backdrop-blur-sm hover:border-primary/50 transition-colors">
              <div className="w-12 h-12 rounded-lg bg-primary/20 flex items-center justify-center mb-6 text-primary text-2xl">
                🧠
              </div>
              <h3 className="text-xl font-bold mb-3">Adaptive RAG Learning</h3>
              <p className="text-foreground/70 leading-relaxed">
                Upload your PDFs and notes. Eklavya instantly understands them and answers your doubts with precise context.
              </p>
            </div>
            {/* Feature 2 */}
            <div className="p-8 rounded-2xl bg-background/50 border border-white/5 backdrop-blur-sm hover:border-primary/50 transition-colors">
              <div className="w-12 h-12 rounded-lg bg-purple-500/20 flex items-center justify-center mb-6 text-purple-500 text-2xl">
                📊
              </div>
              <h3 className="text-xl font-bold mb-3">Deep Analytics</h3>
              <p className="text-foreground/70 leading-relaxed">
                Track your weak topics, accuracy trends, and mastery levels in real-time on a beautifully designed dashboard.
              </p>
            </div>
            {/* Feature 3 */}
            <div className="p-8 rounded-2xl bg-background/50 border border-white/5 backdrop-blur-sm hover:border-primary/50 transition-colors">
              <div className="w-12 h-12 rounded-lg bg-pink-500/20 flex items-center justify-center mb-6 text-pink-500 text-2xl">
                ⚡
              </div>
              <h3 className="text-xl font-bold mb-3">AI Quiz Generation</h3>
              <p className="text-foreground/70 leading-relaxed">
                Test your knowledge instantly. The AI generates custom quizzes tailored to your weakest points to ensure retention.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section className="py-24 px-6 max-w-7xl mx-auto relative z-10">
        <h2 className="text-3xl md:text-4xl font-bold text-center mb-16">Trusted by Top Students</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-4xl mx-auto">
          <div className="p-8 rounded-2xl bg-surface border border-white/10 relative">
            <div className="text-4xl absolute top-4 right-6 opacity-20">"</div>
            <p className="text-lg italic text-foreground/80 mb-6">
              "Eklavya completely changed how I study. The AI chat feature instantly clears my doubts, and the analytics show me exactly what to focus on before exams."
            </p>
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary to-purple-500" />
              <div>
                <div className="font-bold">Alex J.</div>
                <div className="text-sm text-foreground/60">Computer Science Major</div>
              </div>
            </div>
          </div>
          <div className="p-8 rounded-2xl bg-surface border border-white/10 relative">
            <div className="text-4xl absolute top-4 right-6 opacity-20">"</div>
            <p className="text-lg italic text-foreground/80 mb-6">
              "Uploading my messy notes and having the AI organize them into a quiz is like magic. I've never retained information this well."
            </p>
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-500 to-pink-500" />
              <div>
                <div className="font-bold">Sarah M.</div>
                <div className="text-sm text-foreground/60">Medical Student</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Footer CTA */}
      <section className="py-20 px-6 text-center relative z-10 border-t border-white/5">
        <h2 className="text-3xl font-bold mb-6">Ready to transform your study routine?</h2>
        <Link href="/sign-up" className="inline-block btn btn-primary px-8 py-4 text-lg font-semibold rounded-full shadow-[0_0_20px_rgba(var(--primary-rgb),0.4)] hover:scale-105 transition-all">
          Join Eklavya Today
        </Link>
      </section>
    </div>
  );
}
