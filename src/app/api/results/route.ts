// Compatible /api/results/route.ts - Uses existing database functions
import { NextRequest, NextResponse } from 'next/server'
import { getTopTracks, getVotingStats } from '@/lib/database'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const limit = parseInt(searchParams.get('limit') || '15')
    
    console.log(`🏆 Getting top ${limit} tracks for leaderboard...`)
    
    // Use standard getTopTracks function (now enhanced internally)
    const topTracks = await getTopTracks(limit)
    
    console.log(`✅ Retrieved ${topTracks.length} tracks:`)
    topTracks.forEach((track, index) => {
      console.log(`   ${index + 1}. ${track.trackName} by ${track.artistName} (${track.totalPoints} points)`)
    })
    
    // Get voting statistics
    const stats = await getVotingStats()
    
    // Enhanced response with debugging info
    const response = {
      topTracks: topTracks.map(track => ({
        ...track,
        // Ensure no track has "Unknown" in the name
        trackName: track.trackName || 'Unknown Track',
        artistName: track.artistName || 'Unknown Artist', 
        albumName: track.albumName || 'Unknown Album',
      })),
      stats: {
        ...stats,
        availableTracksCount: topTracks.length,
        tracksWithNames: topTracks.filter(t => t.trackName && t.trackName !== 'Unknown Track').length,
        tracksWithoutNames: topTracks.filter(t => !t.trackName || t.trackName === 'Unknown Track').length
      },
      lastUpdated: new Date().toISOString(),
      meta: {
        totalRequested: limit,
        totalReturned: topTracks.length,
        allTracksHaveNames: topTracks.every(t => t.trackName && t.trackName !== 'Unknown Track')
      }
    }
    
    // Log any issues
    const tracksWithoutNames = topTracks.filter(t => !t.trackName || t.trackName === 'Unknown Track')
    if (tracksWithoutNames.length > 0) {
      console.warn(`⚠️ Found ${tracksWithoutNames.length} tracks without proper names:`)
      tracksWithoutNames.forEach(track => {
        console.warn(`   - Track ID: ${track.trackId}, Name: '${track.trackName}', Artist: '${track.artistName}'`)
      })
    }
    
    return NextResponse.json(response)
    
  } catch (error) {
    console.error('❌ Get results error:', error)
    return NextResponse.json({ 
      error: 'Internal server error',
      message: 'Fehler beim Laden der Ergebnisse',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}

// Debug endpoint
export async function POST(request: NextRequest) {
  try {
    const { action } = await request.json()
    
    if (action === 'debug_leaderboard') {
      // Debug entire leaderboard
      const { kv } = await import('@vercel/kv')
      const leaderboard = await kv.get('track_leaderboard')
      
      // Also get a few track results for detailed inspection
      const trackResults = []
      if (Array.isArray(leaderboard) && leaderboard.length > 0) {
        for (let i = 0; i < Math.min(3, leaderboard.length); i++) {
          const trackId = leaderboard[i].trackId
          const trackData = await kv.get(`track_results:${trackId}`)
          trackResults.push({
            trackId: trackId.substring(0, 8) + '...',
            points: leaderboard[i].points,
            trackData
          })
        }
      }
      
      return NextResponse.json({
        success: true,
        leaderboard,
        leaderboardSize: Array.isArray(leaderboard) ? leaderboard.length : 0,
        sampleTrackResults: trackResults,
        timestamp: new Date().toISOString()
      })
    }
    
    return NextResponse.json({ 
      error: 'Invalid action',
      availableActions: ['debug_leaderboard']
    }, { status: 400 })
    
  } catch (error) {
    console.error('Debug endpoint error:', error)
    return NextResponse.json({ 
      error: 'Debug failed',
      message: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}