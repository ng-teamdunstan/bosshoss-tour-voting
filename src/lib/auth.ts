// src/lib/auth.ts - NextAuth Konfiguration mit Refresh Token Support
import { NextAuthOptions } from 'next-auth'
import SpotifyProvider from 'next-auth/providers/spotify'

// Spotify scopes für alle benötigten Funktionen
const scopes = [
  'user-read-email',
  'user-read-private', 
  'user-read-recently-played',
  'user-top-read',
  'playlist-modify-public',
  'playlist-modify-private',
  'playlist-read-private'
].join(' ')

export const authOptions: NextAuthOptions = {
  providers: [
    SpotifyProvider({
      clientId: process.env.SPOTIFY_CLIENT_ID!,
      clientSecret: process.env.SPOTIFY_CLIENT_SECRET!,
      authorization: {
        params: {
          scope: scopes,
          // Wichtig: offline_access für refresh tokens
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
        console.log('🔐 New login, storing tokens')
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
        console.log('🟢 Token still valid')
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
}

// Refresh Token Funktion
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
      refreshToken: refreshedTokens.refresh_token ?? token.refreshToken, // Fall back to old refresh token
    }
  } catch (error) {
    console.error('❌ Error refreshing access token:', error)
    
    return {
      ...token,
      error: 'RefreshAccessTokenError'
    }
  }
}