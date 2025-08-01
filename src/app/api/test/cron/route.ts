// src/app/api/test/cron/route.ts - Für Development Testing
import { NextRequest, NextResponse } from 'next/server'
import { getTopTracks } from '@/lib/database'
import { getPlaylistSubscribers, getValidAccessToken } from '@/lib/spotify-tokens'

// Diese Route nur für Development - NICHT in Production verwenden!
export async function GET(request: NextRequest) {
  // Nur in Development verfügbar
  if (process.env.NODE_ENV === 'production') {
    return NextResponse.json({ error: 'Not available in production' }, { status: 404 })
  }
  
  try {
    console.log('🧪 Manual cron job test started...')
    
    // Get current top tracks
    const topTracks = await getTopTracks(15)
    
    if (topTracks.length === 0) {
      return NextResponse.json({ 
        success: false, 
        message: 'No voting results to test with',
        debug: 'Füge erst einige Votes hinzu, bevor du die automatische Aktualisierung testest'
      })
    }
    
    // Get all users who have playlists
    const playlistUsers = await getPlaylistSubscribers()
    
    if (playlistUsers.length === 0) {
      return NextResponse.json({
        success: false,
        message: 'No playlist subscribers found',
        debug: 'Erstelle erst eine Playlist über die normale UI, bevor du automatische Updates testest'
      })
    }
    
    console.log(`📊 Testing with ${topTracks.length} tracks for ${playlistUsers.length} users`)
    
    let testResults = []
    
    // Test each user (aber nur ersten 3 für Development)
    const testUsers = playlistUsers.slice(0, 3) // Limitiere für Tests
    
    for (const userId of testUsers) {
      try {
        console.log(`🔍 Testing user: ${userId}`)
        
        // Get valid access token
        const accessToken = await getValidAccessToken(userId)
        
        if (!accessToken) {
          testResults.push({
            userId,
            status: 'failed',
            reason: 'No valid access token',
            action: 'User should re-authenticate'
          })
          continue
        }
        
        // Test Spotify API access
        const profileResponse = await fetch('https://api.spotify.com/v1/me', {
          headers: { 'Authorization': `Bearer ${accessToken}` }
        })
        
        if (!profileResponse.ok) {
          testResults.push({
            userId,
            status: 'failed', 
            reason: 'Token invalid',
            action: 'User should re-authenticate'
          })
          continue
        }
        
        // Find playlist
        const profile = await profileResponse.json()
        const playlistsResponse = await fetch(`https://api.spotify.com/v1/users/${profile.id}/playlists?limit=50`, {
          headers: { 'Authorization': `Bearer ${accessToken}` }
        })
        
        if (!playlistsResponse.ok) {
          testResults.push({
            userId,
            status: 'failed',
            reason: 'Cannot access playlists'
          })
          continue
        }
        
        const playlistsData = await playlistsResponse.json()
        const playlistName = '🤠 BossHoss - Back to the Boots (Community Top 15)'
        const existingPlaylist = playlistsData.items?.find((p: any) => p.name === playlistName)
        
        if (!existingPlaylist) {
          testResults.push({
            userId,
            status: 'no_playlist',
            reason: 'No BossHoss playlist found',
            action: 'User should create playlist first'
          })
          continue
        }
        
        testResults.push({
          userId,
          status: 'ready',
          playlistId: existingPlaylist.id,
          playlistUrl: existingPlaylist.external_urls.spotify,
          tracksToUpdate: topTracks.length
        })
        
      } catch (error) {
        testResults.push({
          userId,
          status: 'error',
          error: error instanceof Error ? error.message : 'Unknown error'
        })
      }
    }
    
    // Zusammenfassung
    const summary = {
      totalUsers: playlistUsers.length,
      testedUsers: testUsers.length,
      ready: testResults.filter(r => r.status === 'ready').length,
      failed: testResults.filter(r => r.status === 'failed').length,
      noPlaylist: testResults.filter(r => r.status === 'no_playlist').length,
      errors: testResults.filter(r => r.status === 'error').length
    }
    
    return NextResponse.json({
      success: true,
      message: 'Cron job test completed',
      summary,
      results: testResults,
      topTracks: topTracks.map(t => ({
        rank: t.rank,
        name: t.trackName,
        points: t.totalPoints,
        votes: t.totalVotes
      })),
      nextSteps: summary.ready > 0 
        ? 'Automatische Updates sollten funktionieren! 🎉'
        : 'Erst Playlists erstellen oder User re-authentifizieren'
    })
    
  } catch (error) {
    console.error('🔥 Test error:', error)
    return NextResponse.json({ 
      error: 'Test failed', 
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}

// POST endpoint um einen echten Test-Update zu machen
export async function POST(request: NextRequest) {
  // Nur in Development verfügbar
  if (process.env.NODE_ENV === 'production') {
    return NextResponse.json({ error: 'Not available in production' }, { status: 404 })
  }
  
  try {
    const { userId } = await request.json()
    
    if (!userId) {
      return NextResponse.json({ error: 'userId required' }, { status: 400 })
    }
    
    console.log(`🧪 Testing actual playlist update for user: ${userId}`)
    
    // Get access token
    const accessToken = await getValidAccessToken(userId)
    if (!accessToken) {
      return NextResponse.json({ error: 'No valid access token' }, { status: 400 })
    }
    
    // Get top tracks
    const topTracks = await getTopTracks(15)
    if (topTracks.length === 0) {
      return NextResponse.json({ error: 'No voting results' }, { status: 400 })
    }
    
    // Simuliere den Update-Prozess (aber füge Test-Prefix hinzu)
    const success = await testUpdateUserPlaylist(accessToken, topTracks, userId)
    
    return NextResponse.json({
      success,
      message: success ? 'Test update successful!' : 'Test update failed',
      tracksUpdated: success ? topTracks.length : 0
    })
    
  } catch (error) {
    console.error('🔥 Test update error:', error)
    return NextResponse.json({ 
      error: 'Test update failed', 
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}

// Test-Version der Update-Funktion
async function testUpdateUserPlaylist(accessToken: string, topTracks: any[], userId: string): Promise<boolean> {
  try {
    // Get user profile
    const profileResponse = await fetch('https://api.spotify.com/v1/me', {
      headers: { 'Authorization': `Bearer ${accessToken}` }
    })
    
    if (!profileResponse.ok) return false
    
    const profile = await profileResponse.json()
    
    // Find playlist
    const playlistsResponse = await fetch(`https://api.spotify.com/v1/users/${profile.id}/playlists?limit=50`, {
      headers: { 'Authorization': `Bearer ${accessToken}` }
    })
    
    if (!playlistsResponse.ok) return false
    
    const playlistsData = await playlistsResponse.json()
    const playlistName = '🤠 BossHoss - Back to the Boots (Community Top 15)'
    
    const existingPlaylist = playlistsData.items?.find((playlist: any) => 
      playlist.name === playlistName
    )
    
    if (!existingPlaylist) return false
    
    // Update description mit Test-Hinweis
    const description = `[TEST UPDATE] Die beliebtesten BossHoss Songs basierend auf Community Voting für die Back to the Boots Tour 2025. Test-Update: ${new Date().toLocaleString('de-DE')}`
    
    await fetch(`https://api.spotify.com/v1/playlists/${existingPlaylist.id}`, {
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ description })
    })
    
    console.log(`✅ Test update successful for user ${userId}`)
    return true
    
  } catch (error) {
    console.error(`❌ Test update failed for user ${userId}:`, error)
    return false
  }
}