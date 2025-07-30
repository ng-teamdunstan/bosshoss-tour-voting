import { NextRequest, NextResponse } from 'next/server'
import { getTopTracks } from '@/lib/database'
import { kv } from '@vercel/kv'

// This endpoint will be called daily by Vercel Cron
export async function GET(request: NextRequest) {
  try {
    // Verify this is a cron request (optional security)
    const authHeader = request.headers.get('authorization')
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    
    console.log('🔄 Starting daily playlist update...')
    
    // Get current top tracks
    const topTracks = await getTopTracks(15)
    
    if (topTracks.length === 0) {
      console.log('❌ No voting results found')
      return NextResponse.json({ 
        success: false, 
        message: 'No voting results to update playlists' 
      })
    }
    
    // Get all users who have playlists (we need to track this)
    const playlistUsers = await kv.get<string[]>('playlist_subscribers') || []
    
    let updatedCount = 0
    let errorCount = 0
    
    // Update each user's playlist
    for (const userId of playlistUsers) {
      try {
        // Get user's stored access token (we'll need to implement token storage)
        const userTokens = await kv.get<{
          accessToken: string
          refreshToken: string
          expiresAt: number
        }>(`user_tokens:${userId}`)
        
        if (!userTokens) {
          console.log(`⚠️ No tokens found for user ${userId}`)
          continue
        }
        
        // Check if token needs refresh
        let accessToken = userTokens.accessToken
        if (Date.now() > userTokens.expiresAt) {
          // Refresh token logic would go here
          console.log(`🔄 Token expired for user ${userId}, skipping for now`)
          continue
        }
        
        // Find and update user's playlist
        const updated = await updateUserPlaylist(accessToken, topTracks)
        
        if (updated) {
          updatedCount++
          console.log(`✅ Updated playlist for user ${userId}`)
        }
        
      } catch (error) {
        console.error(`❌ Error updating playlist for user ${userId}:`, error)
        errorCount++
      }
    }
    
    console.log(`🎉 Playlist update complete: ${updatedCount} updated, ${errorCount} errors`)
    
    return NextResponse.json({
      success: true,
      message: `Updated ${updatedCount} playlists`,
      stats: {
        totalUsers: playlistUsers.length,
        updatedCount,
        errorCount,
        topTracksCount: topTracks.length
      }
    })
    
  } catch (error) {
    console.error('🔥 Cron job error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// Helper function to update a user's playlist
async function updateUserPlaylist(accessToken: string, topTracks: any[]): Promise<boolean> {
  try {
    // Get user profile
    const profileResponse = await fetch('https://api.spotify.com/v1/me', {
      headers: {
        'Authorization': `Bearer ${accessToken}`
      }
    })
    
    if (!profileResponse.ok) return false
    
    const profile = await profileResponse.json()
    const userId = profile.id
    
    // Find existing playlist
    const playlistsResponse = await fetch(`https://api.spotify.com/v1/users/${userId}/playlists?limit=50`, {
      headers: {
        'Authorization': `Bearer ${accessToken}`
      }
    })
    
    if (!playlistsResponse.ok) return false
    
    const playlistsData = await playlistsResponse.json()
    const playlistName = '🤠 BossHoss - Back to the Boots (Community Top 15)'
    
    const existingPlaylist = playlistsData.items?.find((playlist: any) => 
      playlist.name === playlistName
    )
    
    if (!existingPlaylist) return false
    
    // Update playlist description
    const description = `Die beliebtesten BossHoss Songs basierend auf Community Voting für die Back to the Boots Tour 2025. Wird täglich automatisch aktualisiert! 🎸 Letztes Update: ${new Date().toLocaleDateString('de-DE')}`
    
    await fetch(`https://api.spotify.com/v1/playlists/${existingPlaylist.id}`, {
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ description })
    })
    
    // Clear and re-add tracks
    await fetch(`https://api.spotify.com/v1/playlists/${existingPlaylist.id}/tracks`, {
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ uris: [] })
    })
    
    // Add new tracks
    const trackUris = topTracks.map(track => `spotify:track:${track.trackId}`)
    
    if (trackUris.length > 0) {
      await fetch(`https://api.spotify.com/v1/playlists/${existingPlaylist.id}/tracks`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ uris: trackUris })
      })
    }
    
    return true
    
  } catch (error) {
    console.error('Error updating user playlist:', error)
    return false
  }
}