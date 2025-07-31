// src/app/api/debug-voting/route.ts – Voting-System Debug
export {} // erzwingt Modultyp in TypeScript

import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth'
import { redis } from '@/lib/redis'
import { getTopTracks, getVotingStats, getUserTodayVotes, canUserVoteToday } from '@/lib/database'

interface SessionWithToken {
  user?: {
    email?: string
    name?: string
  }
  accessToken?: string
}

// Helper function für Tages-Schlüssel
function getTodayKey(): string {
  return new Date().toISOString().slice(0, 10)
}

export async function GET() {
  try {
    console.log('🔍 Starting comprehensive voting system debug...')

    // 1. Check Environment
    const envCheck = {
      hasUpstashUrl: !!process.env.UPSTASH_REDIS_REST_URL,
      hasUpstashToken: !!process.env.UPSTASH_REDIS_REST_TOKEN,
      upstashUrlLength: process.env.UPSTASH_REDIS_REST_URL?.length || 0,
      upstashTokenLength: process.env.UPSTASH_REDIS_REST_TOKEN?.length || 0
    }

    console.log('🔧 Environment Variables:', envCheck)

    // 2. Test Redis
    let redisConnection = false
    let redisError: string | null = null
    try {
      const testKey = `debug_test_${Date.now()}`
      await redis.set(testKey, 'debug_value', { ex: 10 })
      const result = await redis.get(testKey)
      redisConnection = result === 'debug_value'
      if (redisConnection) await redis.del(testKey)
    } catch (error) {
      redisError = error instanceof Error ? error.message : 'Unknown error'
      console.error('Redis connection failed:', redisError)
    }

    console.log('📡 Redis Connection:', redisConnection ? '✅ SUCCESS' : '❌ FAILED')

    // 3. DB Functions
    const topTracks = await getTopTracks(5)
    const stats = await getVotingStats()

    console.log('📊 Database Functions:', {
      topTracksCount: topTracks.length,
      stats
    })

    // 4. Session check
    const session = await getServerSession(authOptions) as SessionWithToken
    const hasSession = !!session?.user?.email

    let userVotingInfo = null
    if (hasSession) {
      const userId = session.user!.email!
      const votingStatus = await canUserVoteToday(userId)
      const todayVotes = await getUserTodayVotes(userId)

      userVotingInfo = {
        userId,
        votingStatus,
        todayVotesCount: todayVotes.length,
        todayVotes: todayVotes.map(v => ({
          trackId: v.trackId,
          points: v.points,
          trackName: v.trackName
        }))
      }
    }

    // 5. Raw Redis Data
    let rawRedisData: any = {}
    try {
      const leaderboardData = await redis.get('track_leaderboard')
      const leaderboard = leaderboardData ? JSON.parse(leaderboardData as string) : null

      let sampleTrackData = null
      if (leaderboard && leaderboard.length > 0) {
        const firstTrackId = leaderboard[0].trackId
        const trackDataRaw = await redis.get(`track_results:${firstTrackId}`)
        sampleTrackData = trackDataRaw ? JSON.parse(trackDataRaw as string) : null
      }

      rawRedisData = {
        leaderboardExists: !!leaderboardData,
        leaderboardCount: leaderboard?.length || 0,
        sampleTrack: sampleTrackData
      }
    } catch (error) {
      rawRedisData = { error: error instanceof Error ? error.message : 'Unknown error' }
    }

    // 6. Manual Vote Test
    let manualVoteTest: any = null
    if (hasSession && redisConnection) {
      try {
        const testVote = {
          userId: session.user!.email!,
          trackId: 'test_track_debug',
          points: 1,
          trackName: 'Debug Test Track',
          artistName: 'Debug Artist',
          albumName: 'Debug Album',
          timestamp: Date.now()
        }

        const todayKey = getTodayKey()
        const userVotesKey = `user_votes:${testVote.userId}:${todayKey}`

        const existingVotesData = await redis.get(userVotesKey)
        const existingVotes = existingVotesData ? JSON.parse(existingVotesData as string) : []

        manualVoteTest = {
          testVoteKey: userVotesKey,
          existingVotesCount: existingVotes.length,
          testPerformed: true
        }
      } catch (error) {
        manualVoteTest = {
          error: error instanceof Error ? error.message : 'Unknown error',
          testPerformed: false
        }
      }
    }

    // Final result
    const debugResult = {
      timestamp: new Date().toISOString(),
      environment: envCheck,
      redisConnection: {
        success: redisConnection,
        error: redisError
      },
      database: {
        topTracksCount: topTracks.length,
        stats,
        topTracks: topTracks.slice(0, 3)
      },
      session: {
        hasSession,
        userVotingInfo
      },
      rawRedisData,
      manualVoteTest,
      recommendations: [] as string[]
    }

    // Empfehlungen
    if (!envCheck.hasUpstashUrl || !envCheck.hasUpstashToken) {
      debugResult.recommendations.push('❌ Missing Upstash environment variables')
    }

    if (!redisConnection) {
      debugResult.recommendations.push('❌ Redis connection failed - check environment variables')
    }

    if (redisConnection && topTracks.length === 0) {
      debugResult.recommendations.push('⚠️ Database is empty - try voting to create test data')
    }

    if (!hasSession) {
      debugResult.recommendations.push('ℹ️ No user session - login required for user-specific debugging')
    }

    return NextResponse.json(debugResult)
  } catch (error) {
    console.error('❌ Debug error:', error)
    return NextResponse.json(
      {
        error: 'Debug failed',
        details: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString()
      },
      { status: 500 }
    )
  }
}
