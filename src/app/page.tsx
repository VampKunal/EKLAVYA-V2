import Link from "next/link";
import { getServerSession } from "next-auth/next";
import { redirect } from "next/navigation";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";

export default async function Home() {
  const session = await getServerSession(authOptions);

  if (session?.user) {
    redirect("/dashboard");
  }

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '2rem',
      background: 'linear-gradient(135deg, var(--background) 0%, var(--surface) 100%)',
    }}>
      <div style={{
        maxWidth: '800px',
        textAlign: 'center',
      }}>
        <h1 style={{
          fontSize: '4rem',
          fontWeight: 800,
          marginBottom: '1.5rem',
          background: 'linear-gradient(to right, var(--primary), #a855f7)',
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent',
        }}>
          AI Tutor Mastery
        </h1>
        <p style={{
          fontSize: '1.25rem',
          color: 'var(--foreground)',
          opacity: 0.8,
          marginBottom: '2.5rem',
          lineHeight: 1.6,
        }}>
          Unlock your potential with personalized AI-driven learning paths. Sign up today and start your journey towards mastery.
        </p>
        
        <div style={{
          display: 'flex',
          gap: '1rem',
          justifyContent: 'center',
        }}>
          <Link href="/sign-up" className="btn btn-primary" style={{ padding: '1rem 2rem', fontSize: '1.125rem' }}>
            Get Started
          </Link>
          <Link href="/sign-in" className="btn" style={{ 
            padding: '1rem 2rem', 
            fontSize: '1.125rem',
            backgroundColor: 'transparent',
            border: '2px solid var(--primary)',
            color: 'var(--primary)'
          }}>
            Log In
          </Link>
        </div>
      </div>
    </div>
  );
}
