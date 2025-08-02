// src/app/api/playlist/route.ts - NUR AUTOMATISCHES COVER
import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { getTopTracks } from '@/lib/database'
import { storeUserTokens } from '@/lib/spotify-tokens'
import { PLAYLIST_CONFIG, setDefaultPlaylistCover } from '@/lib/playlist-config'
import { authOptions } from '@/lib/auth'

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
    const session = await getServerSession(authOptions) as any
    
    if (!session?.user?.email || !session?.accessToken) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
    }
    
    // Get current top tracks from voting
    const topTracks = await getTopTracks(15)
    
    if (topTracks.length === 0) {
      return NextResponse.json({ error: 'No voting results yet' }, { status: 400 })
    }
    
    console.log(`Creating/updating playlist with ${topTracks.length} tracks`)
    
    // Get user's Spotify profile
    const profileResponse = await fetch('https://api.spotify.com/v1/me', {
      headers: {
        'Authorization': `Bearer ${session.accessToken}`
      }
    })
    
    if (!profileResponse.ok) {
      console.error('Spotify profile request failed:', profileResponse.status)
      return NextResponse.json({ error: 'Failed to get Spotify profile' }, { status: 400 })
    }
    
    const profile = await profileResponse.json()
    const userId = profile.id
    
    console.log(`Processing for Spotify user: ${userId}`)
    
    // Store tokens for automatic updates
    if (session.refreshToken) {
      try {
        await storeUserTokens(
          userId,
          session.user.email,
          session.accessToken,
          session.refreshToken,
          3600
        )
        console.log(`💾 Tokens gespeichert für automatische Updates: ${userId}`)
      } catch (error) {
        console.error('Error storing tokens:', error)
      }
    } else {
      console.warn(`⚠️ Kein refresh token verfügbar für ${userId}`)
    }
    
    // Check if playlist already exists
    const existingPlaylist = await findExistingPlaylist(session.accessToken, userId)
    
    let playlist: SpotifyPlaylist
    let isNewPlaylist = false
    
    if (existingPlaylist) {
      console.log(`Updating existing playlist: ${existingPlaylist.id}`)
      playlist = await updatePlaylist(session.accessToken, existingPlaylist.id, topTracks)
    } else {
      console.log('Creating new playlist')
      playlist = await createNewPlaylist(session.accessToken, userId, topTracks)
      isNewPlaylist = true
    }
    
    // Automatisches Cover setzen
    const coverSet = await setDefaultPlaylistCover(
      session.accessToken, 
      playlist.id
    )
    
    if (coverSet) {
      console.log(`📷 Automatisches Cover erfolgreich gesetzt für Playlist ${playlist.id}`)
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
      automaticUpdates: !!session.refreshToken,
      coverSet,
      isNewPlaylist
    })
    
  } catch (error) {
    console.error('Error in playlist creation:', error)
    return NextResponse.json({ 
      error: 'Internal server error', 
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}

// Get user's playlist status
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions) as any
    
    if (!session?.accessToken) {
      return NextResponse.json({ hasPlaylist: false })
    }
    
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

// Helper: Find existing playlist (sucht nach altem UND neuem Namen)
async function findExistingPlaylist(accessToken: string, userId: string): Promise<SpotifyPlaylist | null> {
  try {
    const playlistsResponse = await fetch(`https://api.spotify.com/v1/users/${userId}/playlists?limit=50`, {
      headers: {
        'Authorization': `Bearer ${accessToken}`
      }
    })
    
    if (!playlistsResponse.ok) return null
    
    const playlistsData = await playlistsResponse.json()
    
    // Suche nach neuem Namen
    let existingPlaylist = playlistsData.items?.find((playlist: SpotifyPlaylist) => 
      playlist.name === PLAYLIST_CONFIG.name
    )
    
    // Falls nicht gefunden, suche nach altem Namen für Migration
    if (!existingPlaylist) {
      const oldPlaylistName = '🤠 BossHoss - Back to the Boots (Community Top 15)'
      existingPlaylist = playlistsData.items?.find((playlist: SpotifyPlaylist) => 
        playlist.name === oldPlaylistName
      )
      
      // Wenn alte Playlist gefunden, umbenennen
      if (existingPlaylist) {
        console.log(`🔄 Migrating old playlist "${oldPlaylistName}" to new name`)
        await fetch(`https://api.spotify.com/v1/playlists/${existingPlaylist.id}`, {
          method: 'PUT',
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            name: PLAYLIST_CONFIG.name,
            description: PLAYLIST_CONFIG.description.update
          })
        })
        
        // Update lokales Objekt mit neuem Namen
        existingPlaylist.name = PLAYLIST_CONFIG.name
      }
    }
    
    return existingPlaylist || null
  } catch (error) {
    console.error('Error finding existing playlist:', error)
    return null
  }
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
  
  const createResponse = await fetch(`https://api.spotify.com/v1/users/${userId}/playlists`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      name: PLAYLIST_CONFIG.name,
      description: PLAYLIST_CONFIG.description.create,
      public: PLAYLIST_CONFIG.settings.public,
      collaborative: PLAYLIST_CONFIG.settings.collaborative
    })
  })
  
  if (!createResponse.ok) {
    const errorText = await createResponse.text()
    console.error('Failed to create playlist:', createResponse.status, errorText)
    throw new Error(`Failed to create playlist: ${createResponse.status}`)
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
  
  // Update playlist name and description
  await fetch(`https://api.spotify.com/v1/playlists/${playlistId}`, {
    method: 'PUT',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      name: PLAYLIST_CONFIG.name,
      description: PLAYLIST_CONFIG.description.update
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
  const trackUris = topTracks.map(track => `spotify:track:${track.trackId}`)
  
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