// src/app/api/auth/[...nextauth]/route.ts
import NextAuth from 'next-auth'
import SpotifyProvider from 'next-auth/providers/spotify'

const handler = NextAuth({
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
      // @ts-ignore
      session.accessToken = token.accessToken
      return session
    }
  },
  pages: {
    signIn: '/',
  }
})

export { handler as GET, handler as POST }