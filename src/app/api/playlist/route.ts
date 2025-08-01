// src/app/api/playlist/route.ts - KOMPLETT ERSETZEN
import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { getTopTracks } from '@/lib/database'
import { storeUserTokens } from '@/lib/spotify-tokens'

interface SpotifyPlaylist {
  id: string
  name: string
  external_urls: {
    spotify: string
  }
}

// Create or update BossHoss voting playlist for user
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession() as any
    
    if (!session?.user?.email || !session?.accessToken) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
    }
    
    // Get current top tracks from voting
    const topTracks = await getTopTracks(15)
    
    if (topTracks.length === 0) {
      return NextResponse.json({ error: 'No voting results yet' }, { status: 400 })
    }
    
    // Get user's Spotify profile
    const profileResponse = await fetch('https://api.spotify.com/v1/me', {
      headers: {
        'Authorization': `Bearer ${session.accessToken}`
      }
    })
    
    if (!profileResponse.ok) {
      return NextResponse.json({ error: 'Failed to get Spotify profile' }, { status: 400 })
    }
    
    const profile = await profileResponse.json()
    const userId = profile.id
    
    // WICHTIG: Speichere Tokens für automatische Updates
    if (session.refreshToken) {
      try {
        await storeUserTokens(
          userId,
          session.user.email,
          session.accessToken,
          session.refreshToken,
          3600 // Spotify tokens laufen normalerweise nach 1h ab
        )
        console.log(`💾 Tokens gespeichert für automatische Updates: ${userId}`)
      } catch (error) {
        console.error('Error storing tokens:', error)
        // Continue anyway - playlist creation shouldn't fail because of token storage
      }
    } else {
      console.warn(`⚠️ Kein refresh token verfügbar für ${userId} - automatische Updates werden nicht funktionieren`)
    }
    
    // Check if playlist already exists
    const existingPlaylist = await findExistingPlaylist(session.accessToken, userId)
    
    let playlist: SpotifyPlaylist
    
    if (existingPlaylist) {
      // Update existing playlist
      playlist = await updatePlaylist(session.accessToken, existingPlaylist.id, topTracks)
    } else {
      // Create new playlist
      playlist = await createNewPlaylist(session.accessToken, userId, topTracks)
    }
    
    return NextResponse.json({
      success: true,
      playlist: {
        id: playlist.id,
        name: playlist.name,
        url: playlist.external_urls.spotify
      },
      tracksCount: topTracks.length,
      message: existingPlaylist ? 'Playlist updated!' : 'Playlist created!',
      automaticUpdates: !!session.refreshToken
    })
    
  } catch (error) {
    console.error('Error in playlist creation:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// Get user's playlist status
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession() as any
    
    if (!session?.accessToken) {
      return NextResponse.json({ hasPlaylist: false })
    }
    
    // Get user's Spotify profile
    const profileResponse = await fetch('https://api.spotify.com/v1/me', {
      headers: {
        'Authorization': `Bearer ${session.accessToken}`
      }
    })
    
    if (!profileResponse.ok) {
      return NextResponse.json({ hasPlaylist: false })
    }
    
    const profile = await profileResponse.json()
    const userId = profile.id
    
    // Find existing playlist
    const existingPlaylist = await findExistingPlaylist(session.accessToken, userId)
    
    if (existingPlaylist) {
      return NextResponse.json({
        hasPlaylist: true,
        playlist: {
          id: existingPlaylist.id,
          name: existingPlaylist.name,
          url: existingPlaylist.external_urls.spotify
        }
      })
    }
    
    return NextResponse.json({ hasPlaylist: false })
    
  } catch (error) {
    console.error('Error checking playlist status:', error)
    return NextResponse.json({ hasPlaylist: false })
  }
}

// Helper: Find existing playlist
async function findExistingPlaylist(accessToken: string, userId: string): Promise<SpotifyPlaylist | null> {
  const playlistsResponse = await fetch(`https://api.spotify.com/v1/users/${userId}/playlists?limit=50`, {
    headers: {
      'Authorization': `Bearer ${accessToken}`
    }
  })
  
  if (!playlistsResponse.ok) return null
  
  const playlistsData = await playlistsResponse.json()
  const playlistName = '🤠 BossHoss - Back to the Boots (Community Top 15)'
  
  return playlistsData.items?.find((playlist: SpotifyPlaylist) => 
    playlist.name === playlistName
  ) || null
}

// Helper: Create new playlist
async function createNewPlaylist(accessToken: string, userId: string, topTracks: Array<{
  trackId: string
  totalPoints: number
  totalVotes: number
  trackName: string
  artistName: string
  albumName: string
  rank: number
}>): Promise<SpotifyPlaylist> {
  const playlistName = '🤠 BossHoss - Back to the Boots (Community Top 15)'
  const description = `Die beliebtesten BossHoss Songs basierend auf Community Voting für die Back to the Boots Tour 2025. Wird täglich automatisch aktualisiert! 🎸 Erstellt: ${new Date().toLocaleDateString('de-DE')}`
  
  // Create playlist
  const createResponse = await fetch(`https://api.spotify.com/v1/users/${userId}/playlists`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      name: playlistName,
      description: description,
      public: false,
      collaborative: false
    })
  })
  
  if (!createResponse.ok) {
    throw new Error('Failed to create playlist')
  }
  
  const playlist = await createResponse.json()
  
  // Add tracks to playlist
  await addTracksToPlaylist(accessToken, playlist.id, topTracks)
  
  return playlist
}

// Helper: Update existing playlist
async function updatePlaylist(accessToken: string, playlistId: string, topTracks: Array<{
  trackId: string
  totalPoints: number
  totalVotes: number
  trackName: string
  artistName: string
  albumName: string
  rank: number
}>): Promise<SpotifyPlaylist> {
  // Update playlist description
  const description = `Die beliebtesten BossHoss Songs basierend auf Community Voting für die Back to the Boots Tour 2025. Wird täglich automatisch aktualisiert! 🎸 Letztes Update: ${new Date().toLocaleDateString('de-DE')}`
  
  await fetch(`https://api.spotify.com/v1/playlists/${playlistId}`, {
    method: 'PUT',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      description: description
    })
  })
  
  // Clear existing tracks
  await fetch(`https://api.spotify.com/v1/playlists/${playlistId}/tracks`, {
    method: 'PUT',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      uris: []
    })
  })
  
  // Add new tracks
  await addTracksToPlaylist(accessToken, playlistId, topTracks)
  
  // Get updated playlist info
  const playlistResponse = await fetch(`https://api.spotify.com/v1/playlists/${playlistId}`, {
    headers: {
      'Authorization': `Bearer ${accessToken}`
    }
  })
  
  return await playlistResponse.json()
}

// Helper: Add tracks to playlist
async function addTracksToPlaylist(accessToken: string, playlistId: string, topTracks: Array<{
  trackId: string
  totalPoints: number
  totalVotes: number
  trackName: string
  artistName: string
  albumName: string
  rank: number
}>): Promise<void> {
  // Convert track results to Spotify URIs
  const trackUris = topTracks.map(track => `spotify:track:${track.trackId}`)
  
  // Add tracks in batches of 50 (Spotify API limit)
  const batchSize = 50
  for (let i = 0; i < trackUris.length; i += batchSize) {
    const batch = trackUris.slice(i, i + batchSize)
    
    await fetch(`https://api.spotify.com/v1/playlists/${playlistId}/tracks`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        uris: batch
      })
    })
  }
}