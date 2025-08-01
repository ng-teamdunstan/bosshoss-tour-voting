// src/app/api/auth/[...nextauth]/route.ts - ERWEITERTE VERSION
import NextAuth from 'next-auth'
import SpotifyProvider from 'next-auth/providers/spotify'

const scopes = [
  'user-read-email',
  'user-read-private',
  'user-read-recently-played',
  'user-top-read',
  'playlist-modify-public',
  'playlist-modify-private',
  'playlist-read-private'
].join(' ')

// Token-Refresh-Funktion
async function refreshAccessToken(token: any) {
  try {
    const clientId = process.env.SPOTIFY_CLIENT_ID!
    const clientSecret = process.env.SPOTIFY_CLIENT_SECRET!
    
    const response = await fetch('https://accounts.spotify.com/api/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Authorization': `Basic ${Buffer.from(`${clientId}:${clientSecret}`).toString('base64')}`
      },
      body: new URLSearchParams({
        grant_type: 'refresh_token',
        refresh_token: token.refreshToken
      })
    })
    
    const refreshedTokens = await response.json()
    
    if (!response.ok) {
      console.error('❌ Failed to refresh token:', refreshedTokens)
      throw refreshedTokens
    }
    
    console.log('✅ Token refreshed successfully')
    
    return {
      ...token,
      accessToken: refreshedTokens.access_token,
      expiresAt: Date.now() + refreshedTokens.expires_in * 1000,
      refreshToken: refreshedTokens.refresh_token ?? token.refreshToken,
    }
  } catch (error) {
    console.error('❌ Error refreshing access token:', error)
    
    return {
      ...token,
      error: 'RefreshAccessTokenError'
    }
  }
}

const handler = NextAuth({
  providers: [
    SpotifyProvider({
      clientId: process.env.SPOTIFY_CLIENT_ID!,
      clientSecret: process.env.SPOTIFY_CLIENT_SECRET!,
      authorization: {
        params: {
          scope: scopes,
          // Wichtig für Refresh Tokens
          access_type: 'offline',
          prompt: 'consent'
        }
      }
    })
  ],
  callbacks: {
    async jwt({ token, account, user }) {
      // Beim ersten Login: Account-Daten speichern
      if (account && user) {
        console.log('🔐 New login, storing tokens for', user.email)
        return {
          ...token,
          accessToken: account.access_token,
          refreshToken: account.refresh_token,
          expiresAt: account.expires_at! * 1000, // Convert to milliseconds
          spotifyId: account.providerAccountId
        }
      }
      
      // Prüfen ob Token noch gültig ist
      if (Date.now() < (token.expiresAt as number)) {
        return token
      }
      
      // Token abgelaufen - refresh
      console.log('🔄 Token expired, refreshing...')
      return await refreshAccessToken(token)
    },
    async session({ session, token }) {
      // Token-Daten an Session weitergeben
      return {
        ...session,
        accessToken: token.accessToken,
        refreshToken: token.refreshToken,
        error: token.error,
        spotifyId: token.spotifyId
      }
    }
  },
  pages: {
    signIn: '/',
    error: '/auth/error'
  },
  session: {
    strategy: 'jwt'
  }
})

export { handler as GET, handler as POST }