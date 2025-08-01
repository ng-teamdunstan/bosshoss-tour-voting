// Simple Data Fix API - Create /api/fix-unknown-tracks/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { kv } from '@vercel/kv'

interface Vote {
  userId: string
  trackId: string
  points: number
  timestamp: number
  trackName: string
  artistName: string
  albumName: string
}

interface TrackResult {
  trackId: string
  totalPoints: number
  totalVotes: number
  trackName: string
  artistName: string
  albumName: string
  rank: number
}

export async function POST(request: NextRequest) {
  try {
    const { action, password } = await request.json()
    
    // Simple protection
    if (password !== 'bosshoss2025') {
      return NextResponse.json({ error: 'Invalid password' }, { status: 401 })
    }
    
    if (action === 'fix_unknown_tracks') {
      console.log('🔧 Starting to fix Unknown Track entries...')
      
      // Get track names from recent votes (last 3 days)
      const trackNameMap = new Map<string, { trackName: string, artistName: string, albumName: string }>()
      
      const today = new Date()
      const dates = []
      for (let i = 0; i < 7; i++) { // Check last 7 days
        const date = new Date(today.getTime() - i * 24 * 60 * 60 * 1000)
        dates.push(date.toISOString().split('T')[0])
      }
      
      // Collect track names from votes
      for (const date of dates) {
        try {
          const voteSessions = await kv.keys(`user_votes:*:${date}`)
          console.log(`📅 Checking ${date}: found ${voteSessions.length} vote sessions`)
          
          for (const sessionKey of voteSessions) {
            try {
              const session = await kv.get<{ votes: Vote[] }>(sessionKey)
              if (session?.votes) {
                for (const vote of session.votes) {
                  if (vote.trackName && vote.trackName !== 'Unknown Track' && 
                      vote.artistName && vote.artistName !== 'Unknown Artist') {
                    trackNameMap.set(vote.trackId, {
                      trackName: vote.trackName,
                      artistName: vote.artistName,
                      albumName: vote.albumName || 'Unknown Album'
                    })
                  }
                }
              }
            } catch (error) {
              // Skip problematic sessions
            }
          }
        } catch (error) {
          console.log(`⚠️ Could not check date ${date}:`, error)
        }
      }
      
      console.log(`✅ Found track names for ${trackNameMap.size} tracks`)
      
      // Get leaderboard and fix Unknown Tracks
      const leaderboard = await kv.get<{ trackId: string, points: number }[]>('track_leaderboard') || []
      
      let fixedCount = 0
      let alreadyOkCount = 0
      let notFoundCount = 0
      
      for (const item of leaderboard) {
        const trackKey = `track_results:${item.trackId}`
        const trackData = await kv.get<TrackResult>(trackKey)
        
        if (trackData) {
          // Check if this track needs fixing
          if (trackData.trackName === 'Unknown Track' || !trackData.trackName) {
            const knownTrackInfo = trackNameMap.get(item.trackId)
            
            if (knownTrackInfo) {
              // Fix the track data
              const updatedTrackData: TrackResult = {
                ...trackData,
                trackName: knownTrackInfo.trackName,
                artistName: knownTrackInfo.artistName,
                albumName: knownTrackInfo.albumName
              }
              
              await kv.set(trackKey, updatedTrackData)
              fixedCount++
              
              console.log(`✅ Fixed: ${knownTrackInfo.trackName} by ${knownTrackInfo.artistName}`)
            } else {
              notFoundCount++
              console.log(`⚠️ No track info found for ${item.trackId.substring(0, 8)}...`)
            }
          } else {
            alreadyOkCount++
          }
        }
      }
      
      return NextResponse.json({
        success: true,
        message: `Fixed ${fixedCount} tracks out of ${leaderboard.length} total`,
        stats: {
          totalTracksChecked: leaderboard.length,
          tracksFixed: fixedCount,
          tracksAlreadyOk: alreadyOkCount,
          tracksNotFound: notFoundCount,
          knownTrackNamesFound: trackNameMap.size,
          datesChecked: dates.length
        },
        timestamp: new Date().toISOString()
      })
    }
    
    return NextResponse.json({ 
      error: 'Invalid action',
      availableActions: ['fix_unknown_tracks']
    }, { status: 400 })
    
  } catch (error) {
    console.error('Fix error:', error)
    return NextResponse.json({ 
      error: 'Fix failed',
      message: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}