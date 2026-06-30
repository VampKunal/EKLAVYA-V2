"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";

export default function SignIn() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const res = await signIn("credentials", {
        redirect: false,
        email,
        password,
      });

      if (res?.error) {
        setError(res.error);
      } else {
        router.push("/dashboard");
        router.refresh();
      }
    } catch (err: any) {
      setError("An unexpected error occurred. Please try again.");
    } finally {
      setLoading(false);
    }
  };

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
        width: '100%',
        maxWidth: '400px',
        padding: '2.5rem',
        backgroundColor: 'var(--surface)',
        borderRadius: '1rem',
        boxShadow: '0 10px 30px rgba(0,0,0,0.1)',
        border: '1px solid var(--border)',
      }}>
        <h1 style={{ fontSize: '2rem', fontWeight: 'bold', marginBottom: '1.5rem', textAlign: 'center' }}>
          Welcome Back
        </h1>
        
        {error && (
          <div style={{
            padding: '1rem',
            marginBottom: '1rem',
            backgroundColor: 'rgba(255, 0, 0, 0.1)',
            color: 'red',
            borderRadius: '0.5rem',
            textAlign: 'center',
          }}>
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            <label htmlFor="email" style={{ fontWeight: 500 }}>Email Address</label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              style={{
                padding: '0.75rem 1rem',
                borderRadius: '0.5rem',
                border: '1px solid var(--border)',
                backgroundColor: 'var(--background)',
                color: 'var(--foreground)',
              }}
              placeholder="you@example.com"
            />
          </div>
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            <label htmlFor="password" style={{ fontWeight: 500 }}>Password</label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              style={{
                padding: '0.75rem 1rem',
                borderRadius: '0.5rem',
                border: '1px solid var(--border)',
                backgroundColor: 'var(--background)',
                color: 'var(--foreground)',
              }}
              placeholder="••••••••"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            style={{
              padding: '0.875rem',
              backgroundColor: 'var(--primary)',
              color: 'white',
              border: 'none',
              borderRadius: '0.5rem',
              fontWeight: 600,
              fontSize: '1rem',
              cursor: loading ? 'not-allowed' : 'pointer',
              opacity: loading ? 0.7 : 1,
              marginTop: '0.5rem'
            }}
          >
            {loading ? "Signing In..." : "Sign In"}
          </button>
        </form>

        <p style={{ marginTop: '1.5rem', textAlign: 'center', color: 'var(--foreground)', opacity: 0.8 }}>
          Don't have an account?{' '}
          <Link href="/sign-up" style={{ color: 'var(--primary)', fontWeight: 600 }}>
            Sign up
          </Link>
        </p>
      </div>
    </div>
  );
}
