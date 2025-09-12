export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

// src/app/api/cron/update-playlists/route.ts - MIT AUTO-COVER
import { fetchSpotifyJSON, fetchWithRetry } from '@/lib/spotify-utils'
import { NextRequest, NextResponse } from 'next/server'
import { getTopTracks } from '@/lib/database'
import { getPlaylistSubscribers, getValidAccessToken, removeUserFromUpdates } from '@/lib/spotify-tokens'
import { PLAYLIST_CONFIG, setDefaultPlaylistCover } from '@/lib/playlist-config'

// This endpoint will be called daily by Vercel Cron
export async function GET(request: NextRequest) {
  try {
    // Verify this is a cron request
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
    
    console.log(`📊 Found ${topTracks.length} top tracks to update`)
    
    // Get all users who have playlists
    const playlistUsers = await getPlaylistSubscribers()
    
    if (playlistUsers.length === 0) {
      console.log('📝 No playlist subscribers found')
      return NextResponse.json({
        success: true,
        message: 'No users to update',
        stats: { totalUsers: 0, updatedCount: 0, errorCount: 0 }
      })
    }
    
    console.log(`👥 Found ${playlistUsers.length} users with playlists`)
    
    let updatedCount = 0
    let errorCount = 0
    let removedCount = 0
    let coversSet = 0
    
    // Update each user's playlist
    for (const userId of playlistUsers) {
      try {
        console.log(`🔍 Processing user: ${userId}`)
        
        // Get valid access token (will refresh if needed)
        const accessToken = await getValidAccessToken(userId)
        
        if (!accessToken) {
          console.log(`❌ No valid token for user ${userId} - removing from updates`)
          await removeUserFromUpdates(userId)
          removedCount++
          continue
        }
        
        // Find and update user's playlist
        const updateResult = await updateUserPlaylist(accessToken, topTracks, userId)
        
        if (updateResult.success) {
          updatedCount++
          if (updateResult.coverSet) coversSet++
          console.log(`✅ Updated playlist for user ${userId}`)
        } else {
          console.log(`⚠️ Failed to update playlist for user ${userId}`)
          errorCount++
        }
        
      } catch (error) {
        console.error(`❌ Error updating playlist for user ${userId}:`, error)
        errorCount++
      }
    }
    
    const finalMessage = `🎉 Playlist update complete: ${updatedCount} updated, ${errorCount} errors, ${removedCount} removed, ${coversSet} covers set`
    console.log(finalMessage)
    
    return NextResponse.json({
      success: true,
      message: finalMessage,
      stats: {
        totalUsers: playlistUsers.length,
        updatedCount,
        errorCount,
        removedCount,
        coversSet,
        topTracksCount: topTracks.length
      }
    })
    
  } catch (error) {
    console.error('🔥 Cron job error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// Helper function to update a user's playlist
async function updateUserPlaylist(
  accessToken: string, 
  topTracks: Array<{
    trackId: string
    totalPoints: number
    totalVotes: number
    trackName: string
    artistName: string
    albumName: string
    rank: number
  }>,
  userId: string
): Promise<{ success: boolean; coverSet: boolean }> {
  try {
    // Get user profile to verify token works
    const profileResponse = await fetch('https://api.spotify.com/v1/me', {
      headers: {
        'Authorization': `Bearer ${accessToken}`
      }
    })
    
    if (!profileResponse.ok) {
      console.log(`❌ Invalid token for user ${userId}`)
      return { success: false, coverSet: false }
    }
    
    const profile = await profileResponse.json()
    
    // Find existing BossHoss playlist (sucht nach altem UND neuem Namen)
    const playlistsResponse = await fetch(`https://api.spotify.com/v1/users/${profile.id}/playlists?limit=50`, {
      headers: {
        'Authorization': `Bearer ${accessToken}`
      }
    })
    
    if (!playlistsResponse.ok) {
      console.log(`❌ Failed to get playlists for user ${userId}`)
      return { success: false, coverSet: false }
    }
    
    const playlistsData = await playlistsResponse.json()
    
    // Suche nach neuem Namen
    let existingPlaylist = playlistsData.items?.find((playlist: {
      id: string
      name: string
      external_urls: { spotify: string }
    }) => playlist.name === PLAYLIST_CONFIG.name)
    
    // Falls nicht gefunden, suche nach altem Namen
    if (!existingPlaylist) {
      const oldPlaylistName = '🤠 BossHoss - Back to the Boots (Community Top 15)'
      existingPlaylist = playlistsData.items?.find((playlist: {
        id: string
        name: string
        external_urls: { spotify: string }
      }) => playlist.name === oldPlaylistName)
      
      // Wenn alte Playlist gefunden, erst umbenennen
      if (existingPlaylist) {
        console.log(`🔄 Migrating old playlist for user ${userId}`)
        await fetch(`https://api.spotify.com/v1/playlists/${existingPlaylist.id}`, {
          method: 'PUT',
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            name: PLAYLIST_CONFIG.name
          })
        })
      }
    }
    
    if (!existingPlaylist) {
      console.log(`📝 No BossHoss playlist found for user ${userId}`)
      return { success: false, coverSet: false }
    }
    
    console.log(`🎵 Updating playlist ${existingPlaylist.id} for user ${userId}`)
    
    // Update playlist description with current timestamp
    const updateDescResponse = await fetch(`https://api.spotify.com/v1/playlists/${existingPlaylist.id}`, {
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
    
    if (!updateDescResponse.ok) {
      console.log(`⚠️ Failed to update description for user ${userId}`)
    }
    
    // Clear existing tracks
    const clearResponse = await fetch(`https://api.spotify.com/v1/playlists/${existingPlaylist.id}/tracks`, {
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ uris: [] })
    })
    
    if (!clearResponse.ok) {
      console.log(`❌ Failed to clear tracks for user ${userId}`)
      return { success: false, coverSet: false }
    }
    
    // Add new tracks
    const trackUris = topTracks.map(track => `spotify:track:${track.trackId}`)
    
    if (trackUris.length > 0) {
      // Add tracks in batches of 50 (Spotify API limit)
      const batchSize = 50
      for (let i = 0; i < trackUris.length; i += batchSize) {
        const batch = trackUris.slice(i, i + batchSize)
        
        const addResponse = await fetch(`https://api.spotify.com/v1/playlists/${existingPlaylist.id}/tracks`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ uris: batch })
        })
        
        if (!addResponse.ok) {
          console.log(`❌ Failed to add tracks batch ${i/batchSize + 1} for user ${userId}`)
          return { success: false, coverSet: false }
        }
      }
    }
    
    // Automatisches Cover setzen (falls konfiguriert)
    let coverSet = false
    if (PLAYLIST_CONFIG.cover.autoSetCover) {
      try {
        coverSet = await setDefaultPlaylistCover(accessToken, existingPlaylist.id)
        if (coverSet) {
          console.log(`📷 Default cover set for user ${userId}`)
        }
      } catch (error) {
        console.log(`⚠️ Failed to set cover for user ${userId}:`, error)
        // Don't fail the entire update if cover setting fails
      }
    }
    
    console.log(`✅ Successfully updated ${trackUris.length} tracks for user ${userId}`)
    return { success: true, coverSet }
    
  } catch (error) {
    console.error(`Error updating user playlist for ${userId}:`, error)
    return { success: false, coverSet: false }
  }
}