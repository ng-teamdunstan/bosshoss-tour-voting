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