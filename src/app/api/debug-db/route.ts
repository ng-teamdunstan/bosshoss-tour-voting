import { NextResponse } from 'next/server'
import { kv } from '@vercel/kv'

export async function GET() {
  try {
    console.log('🔍 DEBUGGING DATABASE STATE...')
    
    // 1. Check Leaderboard
    const leaderboard = await kv.get('track_leaderboard')
    console.log('📊 Leaderboard:', leaderboard)
    
    // 2. Get all track results
    const trackKeys = await kv.keys('track_results:*')
    console.log('🎵 Track Result Keys found:', trackKeys.length)
    
    const trackData = []
    for (const key of trackKeys.slice(0, 10)) { // First 10 tracks
      const data = await kv.get(key)
      trackData.push({ key, data })
    }
    
    // 3. Get all user sessions (today)
    const today = new Date().toISOString().split('T')[0]
    const userKeys = await kv.keys(`user_votes:*:${today}`)
    console.log('👤 User Sessions Today:', userKeys.length)
    
    const userSessions = []
    for (const key of userKeys.slice(0, 5)) { // First 5 users
      const data = await kv.get(key)
      userSessions.push({ key, data })
    }
    
    return NextResponse.json({
      success: true,
      debug: {
        currentTime: new Date().toISOString(),
        leaderboard: {
          exists: !!leaderboard,
          count: Array.isArray(leaderboard) ? leaderboard.length : 0,
          data: leaderboard
        },
        trackResults: {
          count: trackKeys.length,
          sample: trackData
        },
        userSessions: {
          today: {
            count: userKeys.length,
            sample: userSessions
          }
        },
        dates: {
          today
        }
      }
    })
    
  } catch (error) {
    console.error('🔥 DEBUG ERROR:', error)
    return NextResponse.json({ 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error'
    })
  }
}