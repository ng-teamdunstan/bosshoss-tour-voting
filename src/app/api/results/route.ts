import { NextRequest, NextResponse } from 'next/server'
import { getTopTracks, getVotingStats } from '@/lib/database'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const limit = parseInt(searchParams.get('limit') || '15')
    
    // Get top tracks
    const topTracks = await getTopTracks(limit)
    
    // Get voting statistics
    const stats = await getVotingStats()
    
    return NextResponse.json({
      topTracks,
      stats,
      lastUpdated: new Date().toISOString()
    })
    
  } catch (error) {
    console.error('Get results error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}