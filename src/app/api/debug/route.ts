// src/app/api/debug/route.ts - Debug Route für Upstash Redis
import { NextResponse } from 'next/server'
import { redis } from '@/lib/redis'
import { getTopTracks, getVotingStats } from '@/lib/database'

export async function GET() {
  try {
    console.log('🔍 Running database debug checks...')
    
    // Test Redis connection
    const redisTestResult = await testRedisConnection()
    console.log('📡 Redis Connection:', redisTestResult ? '✅ SUCCESS' : '❌ FAILED')
    
    // Test database functions
    const topTracks = await getTopTracks(5)
    console.log('📊 Top tracks count:', topTracks.length)
    
    const stats = await getVotingStats()
    console.log('📈 Voting stats:', stats)
    
    // Check leaderboard
    const leaderboardData = await redis.get('track_leaderboard')
    const leaderboard = leaderboardData ? JSON.parse(leaderboardData as string) : null
    console.log('🏆 Leaderboard items:', Array.isArray(leaderboard) ? leaderboard.length : 'null/undefined')
    
    return NextResponse.json({
      redisConnection: redisTestResult,
      topTracksCount: topTracks.length,
      topTracks: topTracks.slice(0, 3), // Show first 3 tracks for debugging
      stats,
      leaderboardItems: Array.isArray(leaderboard) ? leaderboard.length : 0,
      environment: {
        hasUpstashUrl: !!process.env.UPSTASH_REDIS_REST_URL,
        hasUpstashToken: !!process.env.UPSTASH_REDIS_REST_TOKEN,
        nodeEnv: process.env.NODE_ENV
      }
    })
    
  } catch (error) {
    console.error('❌ Debug error:', error)
    return NextResponse.json({ 
      error: 'Debug failed',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}

async function testRedisConnection(): Promise<boolean> {
  try {
    const testKey = `test_${Date.now()}`
    await redis.set(testKey, 'test_value', { ex: 10 })
    const result = await redis.get(testKey)
    await redis.del(testKey) // Cleanup
    return result === 'test_value'
  } catch (error) {
    console.error('Redis connection test failed:', error)
    return false
  }
}