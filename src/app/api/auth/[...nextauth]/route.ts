// src/app/api/auth/[...nextauth]/route.ts
import NextAuth, { NextAuthOptions } from 'next-auth'
import SpotifyProvider from 'next-auth/providers/spotify'

export const authOptions: NextAuthOptions = {
  providers: [
    SpotifyProvider({
      clientId: process.env.SPOTIFY_CLIENT_ID!,
      clientSecret: process.env.SPOTIFY_CLIENT_SECRET!,
      authorization: {
        params: {
          scope: [
            'user-read-email',
            'user-read-private',
            'user-read-recently-played',
            'user-top-read',
            'playlist-modify-public',    // WICHTIG für Playlist-Erstellung
            'playlist-modify-private',   // WICHTIG für private Playlists  
            'playlist-read-private',     // Zum Lesen bestehender Playlists
            'playlist-read-collaborative'
          ].join(' ')
        }
      }
    })
  ],
  callbacks: {
    async jwt({ token, account }) {
      if (account) {
        token.accessToken = account.access_token
        token.refreshToken = account.refresh_token
      }
      return token
    },
    async session({ session, token }) {
      // @ts-expect-error - NextAuth session type doesn't include accessToken by default
      session.accessToken = token.accessToken
      return session
    }
  },
  pages: {
    signIn: '/',
  }
}

const handler = NextAuth(authOptions)

export { handler as GET, handler as POST }