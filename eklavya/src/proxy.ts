import { NextRequest, NextResponse } from 'next/server';
import { getToken } from 'next-auth/jwt';
import { Ratelimit } from '@upstash/ratelimit';
import { Redis } from '@upstash/redis';

// ---------------------------------------------------------------------------
// Rate limiter — only created when Redis is configured
// ---------------------------------------------------------------------------

let ratelimit: Ratelimit | null = null;

if (
  process.env.UPSTASH_REDIS_REST_URL &&
  process.env.UPSTASH_REDIS_REST_TOKEN
) {
  ratelimit = new Ratelimit({
    redis: new Redis({
      url: process.env.UPSTASH_REDIS_REST_URL,
      token: process.env.UPSTASH_REDIS_REST_TOKEN,
    }),
    limiter: Ratelimit.slidingWindow(20, '1 m'), // 20 AI requests per minute per user
    analytics: false,
    prefix: 'eklavya:rl',
  });
}

// ---------------------------------------------------------------------------
// Proxy (replaces middleware in Next.js 16+)
// ---------------------------------------------------------------------------

const protectedPrefixes = ['/dashboard', '/api/chat', '/api/quiz', '/api/upload', '/api/analytics', '/api/recommendations'];
const aiEndpoints = ['/api/chat', '/api/quiz/generate', '/api/recommendations'];

export default async function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // 1. Auth guard — protect dashboard + API routes
  const isProtected = protectedPrefixes.some((p) => pathname.startsWith(p));
  if (isProtected) {
    const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });
    if (!token) {
      // API routes → 401 JSON, pages → redirect to sign-in
      if (pathname.startsWith('/api/')) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
      }
      const signIn = new URL('/sign-in', req.url);
      signIn.searchParams.set('callbackUrl', pathname);
      return NextResponse.redirect(signIn);
    }

    // 2. Rate limiting — only on AI endpoints and only when Redis is configured
    const isAiEndpoint = aiEndpoints.some((p) => pathname.startsWith(p));
    if (isAiEndpoint && ratelimit) {
      const identifier = `user:${token.id ?? token.sub ?? token.email}`;
      const { success, limit, remaining, reset } = await ratelimit.limit(identifier);

      if (!success) {
        return NextResponse.json(
          {
            error: 'Too many requests. Please wait a moment before trying again.',
            retryAfter: Math.ceil((reset - Date.now()) / 1000),
          },
          {
            status: 429,
            headers: {
              'X-RateLimit-Limit': String(limit),
              'X-RateLimit-Remaining': String(remaining),
              'X-RateLimit-Reset': String(reset),
              'Retry-After': String(Math.ceil((reset - Date.now()) / 1000)),
            },
          },
        );
      }
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    '/dashboard/:path*',
    '/api/chat/:path*',
    '/api/quiz/:path*',
    '/api/upload/:path*',
    '/api/analytics/:path*',
    '/api/recommendations/:path*',
  ],
};

