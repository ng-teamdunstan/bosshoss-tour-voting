// src/lib/spotify-tokens.ts
import { kv } from '@vercel/kv'

export interface StoredTokens {
  accessToken: string
  refreshToken: string
  expiresAt: number
  userId: string
  email: string
}

// Store user tokens when playlist is created
export async function storeUserTokens(
  userId: string, 
  email: string,
  accessToken: string, 
  refreshToken: string,
  expiresIn: number
): Promise<void> {
  const expiresAt = Date.now() + (expiresIn * 1000)
  
  const tokens: StoredTokens = {
    accessToken,
    refreshToken,
    expiresAt,
    userId,
    email
  }
  
  // Store tokens for this user
  await kv.set(`user_tokens:${userId}`, tokens, { ex: 60 * 60 * 24 * 30 }) // 30 days
  
  // Add user to playlist subscribers list
  const subscribers = await kv.get<string[]>('playlist_subscribers') || []
  if (!subscribers.includes(userId)) {
    subscribers.push(userId)
    await kv.set('playlist_subscribers', subscribers)
  }
  
  console.log(`✅ Stored tokens for user ${userId} (${email})`)
}

// Refresh expired Spotify token
export async function refreshSpotifyToken(refreshToken: string): Promise<{
  access_token: string
  expires_in: number
  refresh_token?: string
} | null> {
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
        refresh_token: refreshToken
      })
    })
    
    if (!response.ok) {
      console.error('Failed to refresh token:', response.status)
      return null
    }
    
    return await response.json()
    
  } catch (error) {
    console.error('Error refreshing token:', error)
    return null
  }
}

// Get valid access token for user (refresh if needed)
export async function getValidAccessToken(userId: string): Promise<string | null> {
  try {
    const tokens = await kv.get<StoredTokens>(`user_tokens:${userId}`)
    
    if (!tokens) {
      console.log(`❌ No tokens found for user ${userId}`)
      return null
    }
    
    // Check if token is still valid (add 5 min buffer)
    if (Date.now() < (tokens.expiresAt - 5 * 60 * 1000)) {
      return tokens.accessToken
    }
    
    // Token expired, try to refresh
    console.log(`🔄 Refreshing expired token for user ${userId}`)
    
    const refreshResult = await refreshSpotifyToken(tokens.refreshToken)
    
    if (!refreshResult) {
      console.log(`❌ Failed to refresh token for user ${userId}`)
      return null
    }
    
    // Update stored tokens
    const newTokens: StoredTokens = {
      ...tokens,
      accessToken: refreshResult.access_token,
      refreshToken: refreshResult.refresh_token || tokens.refreshToken,
      expiresAt: Date.now() + (refreshResult.expires_in * 1000)
    }
    
    await kv.set(`user_tokens:${userId}`, newTokens, { ex: 60 * 60 * 24 * 30 })
    
    console.log(`✅ Refreshed token for user ${userId}`)
    return newTokens.accessToken
    
  } catch (error) {
    console.error(`Error getting valid token for user ${userId}:`, error)
    return null
  }
}

// Remove user from automatic updates (if they delete playlist)
export async function removeUserFromUpdates(userId: string): Promise<void> {
  // Remove tokens
  await kv.del(`user_tokens:${userId}`)
  
  // Remove from subscribers list
  const subscribers = await kv.get<string[]>('playlist_subscribers') || []
  const updatedSubscribers = subscribers.filter(id => id !== userId)
  await kv.set('playlist_subscribers', updatedSubscribers)
  
  console.log(`🗑️ Removed user ${userId} from automatic updates`)
}

// Get all playlist subscribers
export async function getPlaylistSubscribers(): Promise<string[]> {
  return await kv.get<string[]>('playlist_subscribers') || []
}