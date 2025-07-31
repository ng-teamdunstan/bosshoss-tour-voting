// src/app/api/debug/voting/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { kv } from '@vercel/kv'
import { getTopTracks, submitVote } from '@/lib/database'

export async function GET() {
  try {
    console.log('🔍 DEBUGGING VOTING SYSTEM...')
    
    // 1. Test KV Connection
    const testKey = 'debug_test'
    await kv.set(testKey, { timestamp: Date.now(), test: 'success' })
    const testResult = await kv.get(testKey)
    
    console.log('✅ KV Connection:', testResult)
    
    // 2. Check Leaderboard
    const leaderboard = await kv.get('track_leaderboard')
    console.log('📊 Current Leaderboard:', leaderboard)
    
    // 3. Check sample track results
    const sampleTrackKeys = await kv.keys('track_results:*')
    console.log('🎵 Track Result Keys:', sampleTrackKeys.slice(0, 5))
    
    let sampleTrackData = null
    if (sampleTrackKeys.length > 0) {
      sampleTrackData = await kv.get(sampleTrackKeys[0])
      console.log('🎵 Sample Track Data:', sampleTrackData)
    }
    
    // 4. Check user sessions
    const userSessionKeys = await kv.keys('user_votes:*')
    console.log('👤 User Session Keys:', userSessionKeys.slice(0, 3))
    
    // 5. Get top tracks
    const topTracks = await getTopTracks(5)
    console.log('🏆 Top Tracks:', topTracks)
    
    return NextResponse.json({
      success: true,
      debug: {
        kvConnection: !!testResult,
        leaderboard: leaderboard,
        sampleTrackKeys: sampleTrackKeys.length,
        sampleTrackData,
        userSessionKeys: userSessionKeys.length,
        topTracks: topTracks.length,
        topTracksData: topTracks
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

export async function POST(request: NextRequest) {
  try {
    console.log('🧪 TESTING VOTE SUBMISSION...')
    
    // Test vote submission
    const testVote = {
      userId: 'debug_user_' + Date.now(),
      trackId: 'test_track_123',
      points: 1,
      trackName: 'Test Song',
      artistName: 'The BossHoss',
      albumName: 'Test Album',
      timestamp: Date.now()
    }
    
    const result = await submitVote(testVote)
    console.log('🗳️ Vote Result:', result)
    
    // Check if vote was actually saved
    const savedVote = await kv.get(`track_results:${testVote.trackId}`)
    console.log('💾 Saved Vote Data:', savedVote)
    
    return NextResponse.json({
      success: true,
      testVote,
      submitResult: result,
      savedData: savedVote
    })
    
  } catch (error) {
    console.error('🔥 VOTE TEST ERROR:', error)
    return NextResponse.json({ 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error'
    })
  }
}