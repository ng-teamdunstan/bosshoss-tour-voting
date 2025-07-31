// src/app/api/playlist/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { getTopTracks } from '@/lib/database'

interface SpotifyPlaylist {
  id: string
  name: string
  external_urls: {
    spotify: string
  }
}

interface SessionWithToken {
  user?: {
    email?: string
    name?: string
  }
  accessToken?: string
}

const PLAYLIST_NAME = 'The BossHoss Clubtour Setlist Voting'
const PLAYLIST_DESCRIPTION = 'Die beliebtesten BossHoss Songs basierend auf Community Voting für die Clubtour 2025. Wird täglich automatisch aktualisiert! 🎸'

// Create or update BossHoss voting playlist for user
export async function POST() {
  try {
    console.log('🎵 Starting playlist creation/update...')
    
    const session = await getServerSession() as SessionWithToken
    
    if (!session?.user?.email || !session?.accessToken) {
      console.log('❌ No session or access token')
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
    }
    
    console.log('✅ Session found for user:', session.user.email)
    
    // Get current top tracks from voting
    const topTracks = await getTopTracks(15)
    console.log('📊 Top tracks found:', topTracks.length)
    
    if (topTracks.length === 0) {
      console.log('❌ No voting results yet')
      return NextResponse.json({ error: 'No voting results yet' }, { status: 400 })
    }
    
    // Get user's Spotify profile
    console.log('🔍 Getting Spotify profile...')
    const profileResponse = await fetch('https://api.spotify.com/v1/me', {
      headers: {
        'Authorization': `Bearer ${session.accessToken}`
      }
    })
    
    if (!profileResponse.ok) {
      console.log('❌ Failed to get Spotify profile:', profileResponse.status)
      const errorText = await profileResponse.text()
      console.log('Profile error:', errorText)
      return NextResponse.json({ error: 'Failed to get Spotify profile' }, { status: 400 })
    }
    
    const profile = await profileResponse.json()
    const userId = profile.id
    console.log('✅ Spotify profile found for user:', userId)
    
    // Check if playlist already exists
    console.log('🔍 Checking for existing playlist...')
    const existingPlaylist = await findExistingPlaylist(session.accessToken, userId)
    
    let playlist: SpotifyPlaylist
    
    if (existingPlaylist) {
      console.log('🔄 Updating existing playlist:', existingPlaylist.id)
      playlist = await updatePlaylist(session.accessToken, existingPlaylist.id, topTracks)
    } else {
      console.log('🆕 Creating new playlist...')
      playlist = await createNewPlaylist(session.accessToken, userId, topTracks)
    }
    
    console.log('✅ Playlist operation successful!')
    
    return NextResponse.json({
      success: true,
      playlist: {
        id: playlist.id,
        name: playlist.name,
        url: playlist.external_urls.spotify
      },
      tracksCount: topTracks.length,
      message: existingPlaylist ? 'Playlist updated!' : 'Playlist created!'
    })
    
  } catch (error) {
    console.error('❌ Playlist creation error:', error)
    return NextResponse.json({ 
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}

// Get current playlist status for user
export async function GET() {
  try {
    const session = await getServerSession() as SessionWithToken
    
    if (!session?.user?.email || !session?.accessToken) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
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
    
    // Check if playlist exists
    const existingPlaylist = await findExistingPlaylist(session.accessToken, userId)
    
    return NextResponse.json({
      hasPlaylist: !!existingPlaylist,
      playlist: existingPlaylist ? {
        id: existingPlaylist.id,
        name: existingPlaylist.name,
        url: existingPlaylist.external_urls.spotify
      } : null
    })
    
  } catch (error) {
    console.error('Playlist status error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// Helper: Find existing BossHoss voting playlist
async function findExistingPlaylist(accessToken: string, userId: string): Promise<SpotifyPlaylist | null> {
  try {
    const playlistsResponse = await fetch(`https://api.spotify.com/v1/users/${userId}/playlists?limit=50`, {
      headers: {
        'Authorization': `Bearer ${accessToken}`
      }
    })
    
    if (!playlistsResponse.ok) {
      console.log('❌ Failed to fetch user playlists:', playlistsResponse.status)
      return null
    }
    
    const playlistsData = await playlistsResponse.json()
    
    const existingPlaylist = playlistsData.items?.find((playlist: SpotifyPlaylist) => 
      playlist.name === PLAYLIST_NAME
    )
    
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
  
  console.log('🆕 Creating playlist with data:', {
    name: PLAYLIST_NAME,
    description: PLAYLIST_DESCRIPTION,
    public: true // Changed to public to avoid potential issues
  })
  
  // Create playlist
  const createResponse = await fetch(`https://api.spotify.com/v1/users/${userId}/playlists`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      name: PLAYLIST_NAME,
      description: PLAYLIST_DESCRIPTION,
      public: true, // Changed from false to true
      collaborative: false
    })
  })
  
  if (!createResponse.ok) {
    const errorText = await createResponse.text()
    console.error('❌ Failed to create playlist:', createResponse.status, errorText)
    throw new Error(`Failed to create playlist: ${createResponse.status} - ${errorText}`)
  }
  
  const playlist = await createResponse.json()
  console.log('✅ Playlist created successfully:', playlist.id)
  
  // Add tracks to playlist
  const trackUris = topTracks.map(track => `spotify:track:${track.trackId}`)
  console.log('🎵 Adding tracks to playlist:', trackUris.length)
  
  if (trackUris.length > 0) {
    const addTracksResponse = await fetch(`https://api.spotify.com/v1/playlists/${playlist.id}/tracks`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        uris: trackUris
      })
    })
    
    if (!addTracksResponse.ok) {
      const errorText = await addTracksResponse.text()
      console.error('❌ Failed to add tracks:', addTracksResponse.status, errorText)
      // Don't throw error here - playlist was created successfully
    } else {
      console.log('✅ Tracks added successfully')
    }
  }
  
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
  
  console.log('🔄 Updating playlist:', playlistId)
  
  // Clear existing tracks
  const clearResponse = await fetch(`https://api.spotify.com/v1/playlists/${playlistId}/tracks`, {
    method: 'PUT',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      uris: []
    })
  })
  
  if (!clearResponse.ok) {
    console.error('❌ Failed to clear playlist tracks:', clearResponse.status)
  } else {
    console.log('✅ Playlist tracks cleared')
  }
  
  // Add new tracks
  const trackUris = topTracks.map(track => `spotify:track:${track.trackId}`)
  
  if (trackUris.length > 0) {
    const addResponse = await fetch(`https://api.spotify.com/v1/playlists/${playlistId}/tracks`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        uris: trackUris
      })
    })
    
    if (!addResponse.ok) {
      console.error('❌ Failed to add new tracks:', addResponse.status)
    } else {
      console.log('✅ New tracks added')
    }
  }
  
  // Update playlist description
  const updateResponse = await fetch(`https://api.spotify.com/v1/playlists/${playlistId}`, {
    method: 'PUT',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      description: PLAYLIST_DESCRIPTION
    })
  })
  
  if (!updateResponse.ok) {
    console.error('❌ Failed to update playlist description:', updateResponse.status)
  }
  
  // Return updated playlist info
  const playlistResponse = await fetch(`https://api.spotify.com/v1/playlists/${playlistId}`, {
    headers: {
      'Authorization': `Bearer ${accessToken}`
    }
  })
  
  if (!playlistResponse.ok) {
    throw new Error('Failed to fetch updated playlist info')
  }
  
  return await playlistResponse.json()
}