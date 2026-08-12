import { NextAuthOptions } from 'next-auth';
import CredentialsProvider from 'next-auth/providers/credentials';
import bcrypt from 'bcryptjs';
import User from '@/models/User';
import connectToDatabase from '@/lib/mongodb';
import crypto from 'crypto';

export const authOptions: NextAuthOptions = {
  providers: [
    CredentialsProvider({
      name: 'Credentials',
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" }
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          throw new Error('Please enter an email and password');
        }

        await connectToDatabase();
        
        const user = await User.findOne({ email: credentials.email });
        if (!user || !user.password) {
          throw new Error('No user found');
        }

        const isPasswordMatch = await bcrypt.compare(credentials.password, user.password);
        if (!isPasswordMatch) {
          throw new Error('Invalid password');
        }

        // Create a custom session ID or refresh token logic
        const sessionId = crypto.randomBytes(16).toString('hex');
        const refreshToken = crypto.randomBytes(32).toString('hex');
        
        user.sessionId = sessionId;
        user.refreshToken = refreshToken;
        await user.save();

        return {
          id: user._id.toString(),
          name: user.name,
          email: user.email,
          role: user.role,
          sessionId: sessionId,
          refreshToken: refreshToken,
        };
      }
    })
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.role = user.role;
        token.sessionId = user.sessionId;
        token.refreshToken = user.refreshToken;
      }
      return token;
    },
    async session({ session, token }) {
      if (token) {
        session.user = {
          ...session.user,
          id: token.id as string,
          role: token.role as string,
          sessionId: token.sessionId as string,
        };
        // Expose tokens if needed
        session.refreshToken = token.refreshToken as string;
      }
      return session;
    }
  },
  session: {
    strategy: 'jwt',
    maxAge: 30 * 24 * 60 * 60, // 30 days
  },
  pages: {
    signIn: '/sign-in', // Custom login page
  },
  secret: process.env.NEXTAUTH_SECRET,
};
