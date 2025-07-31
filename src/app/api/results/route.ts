// src/app/api/results/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { getTopTracks, getVotingStats } from '@/lib/database'

export async function GET(request: NextRequest) {
  try {
    console.log('📊 Getting voting results...')
    
    const { searchParams } = new URL(request.url)
    const limit = parseInt(searchParams.get('limit') || '15')
    
    // Get top tracks
    const topTracks = await getTopTracks(limit)
    console.log(`📊 Found ${topTracks.length} top tracks`)
    
    // Get voting statistics
    const stats = await getVotingStats()
    console.log('📈 Voting stats:', stats)
    
    return NextResponse.json({
      topTracks,
      stats,
      lastUpdated: new Date().toISOString()
    })
    
  } catch (error) {
    console.error('❌ Get results error:', error)
    return NextResponse.json({ 
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}