import NextAuth from 'next-auth'
import SpotifyProvider from 'next-auth/providers/spotify'
import { JWT } from 'next-auth/jwt'
import { Session, Account } from 'next-auth'

const scopes = [
  'user-read-email',
  'user-read-private',
  'user-read-recently-played',
  'user-top-read',
  'playlist-modify-public',
  'playlist-modify-private',
  'user-library-read'
].join(' ')

// Extended types for session and JWT
interface ExtendedJWT extends JWT {
  accessToken?: string
  refreshToken?: string
  expiresAt?: number
}

interface ExtendedSession extends Session {
  accessToken?: string
  refreshToken?: string
  expiresAt?: number
}

const handler = NextAuth({
  providers: [
    SpotifyProvider({
      clientId: process.env.SPOTIFY_CLIENT_ID!,
      clientSecret: process.env.SPOTIFY_CLIENT_SECRET!,
      authorization: {
        params: {
          scope: scopes
        }
      }
    })
  ],
  callbacks: {
    async jwt({ token, account }: { token: ExtendedJWT; account: Account | null }) {
      if (account) {
        token.accessToken = account.access_token
        token.refreshToken = account.refresh_token
        token.expiresAt = account.expires_at
      }
      return token
    },
    async session({ session, token }: { session: ExtendedSession; token: ExtendedJWT }) {
      session.accessToken = token.accessToken
      session.refreshToken = token.refreshToken
      session.expiresAt = token.expiresAt
      return session
    }
  }
})

export { handler as GET, handler as POST }