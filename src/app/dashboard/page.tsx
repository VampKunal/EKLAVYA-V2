import { UserButton } from "@clerk/nextjs";
import { currentUser } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import Link from "next/link";

export default async function Dashboard() {
  const user = await currentUser();

  if (!user) {
    redirect("/sign-in");
  }

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      <header style={{
        padding: '1rem 2rem',
        borderBottom: '1px solid var(--border)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        backgroundColor: 'var(--surface)'
      }}>
        <div style={{ fontWeight: 700, fontSize: '1.25rem' }}>
          AI Tutor
        </div>
        <nav style={{ display: 'flex', gap: '1.5rem', alignItems: 'center' }}>
          <Link href="/dashboard" style={{ fontWeight: 500, color: 'var(--primary)' }}>Dashboard</Link>
          <Link href="/dashboard/courses" style={{ fontWeight: 500, opacity: 0.8 }}>Courses</Link>
          <UserButton />
        </nav>
      </header>
      
      <main className="container" style={{ flex: 1, padding: '3rem 1rem' }}>
        <h1 style={{ fontSize: '2rem', marginBottom: '1rem' }}>
          Welcome back, {user.firstName || "Student"}!
        </h1>
        <p style={{ opacity: 0.8, marginBottom: '2rem' }}>
          This is your dashboard shell. Select a course to start learning.
        </p>

        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))',
          gap: '1.5rem'
        }}>
          {/* Dummy course cards */}
          {[1, 2, 3].map((i) => (
            <div key={i} className="card" style={{
              display: 'flex',
              flexDirection: 'column',
              gap: '1rem'
            }}>
              <div style={{
                height: '150px',
                backgroundColor: 'var(--border)',
                borderRadius: '0.5rem',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                opacity: 0.5
              }}>
                Placeholder Image
              </div>
              <h3 style={{ fontSize: '1.25rem', fontWeight: 600 }}>Introduction to Next.js</h3>
              <p style={{ opacity: 0.8, fontSize: '0.9rem' }}>
                Learn the basics of Next.js, the React framework for the web.
              </p>
              <button className="btn btn-primary" style={{ marginTop: 'auto' }}>
                Continue Learning
              </button>
            </div>
          ))}
        </div>
      </main>
    </div>
  );
}
