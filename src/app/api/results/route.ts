// Enhanced /api/results/route.ts - Fixes Unknown Tracks Problem
import { NextRequest, NextResponse } from 'next/server'
import { getTopTracksEnhanced, getVotingStats, cleanupUnavailableTracks } from '@/lib/database'
import { getServerSession } from 'next-auth'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const limit = parseInt(searchParams.get('limit') || '15')
    const cleanup = searchParams.get('cleanup') === 'true' // Optional cleanup parameter
    
    // Get session for access token (if available)
    const session: any = await getServerSession()
    const accessToken = session?.accessToken
    
    let cleanupStats = null
    
    // Optional: Clean up unavailable tracks if requested and access token available
    if (cleanup && accessToken) {
      console.log('🧹 Cleaning up unavailable tracks...')
      cleanupStats = await cleanupUnavailableTracks(accessToken)
      console.log(`🧹 Cleanup complete: ${cleanupStats.removedCount} tracks removed out of ${cleanupStats.totalChecked} checked`)
    }
    
    // Get top tracks with enhanced availability checking
    const topTracks = await getTopTracksEnhanced(limit, accessToken)
    
    // Get voting statistics
    const stats = await getVotingStats()
    
    // Add availability info to response
    const availableTracks = topTracks.filter(track => track.isAvailable !== false)
    const unavailableCount = topTracks.length - availableTracks.length
    
    const response = {
      topTracks: availableTracks, // Only return available tracks
      stats: {
        ...stats,
        availableTracksCount: availableTracks.length,
        unavailableTracksCount: unavailableCount,
        totalTracksInLeaderboard: stats.totalTracks
      },
      lastUpdated: new Date().toISOString(),
      trackVerification: {
        enabled: !!accessToken,
        lastCleanup: cleanup ? new Date().toISOString() : null,
        cleanupStats
      }
    }
    
    // If we have very few available tracks, suggest cleanup
    if (availableTracks.length < Math.min(limit, 10) && accessToken) {
      response.suggestion = {
        action: 'cleanup_recommended',
        message: 'Es wurden wenige verfügbare Tracks gefunden. Ein Cleanup könnte helfen.',
        cleanupUrl: `/api/results?cleanup=true&limit=${limit}`
      }
    }
    
    return NextResponse.json(response)
    
  } catch (error) {
    console.error('Get results error:', error)
    return NextResponse.json({ 
      error: 'Internal server error',
      message: 'Fehler beim Laden der Ergebnisse'
    }, { status: 500 })
  }
}

// NEW: POST endpoint for manual cleanup
export async function POST(request: NextRequest) {
  try {
    const session: any = await getServerSession()
    
    if (!session?.accessToken) {
      return NextResponse.json({ 
        error: 'Authentication required',
        message: 'Spotify-Zugang erforderlich für Track-Cleanup'
      }, { status: 401 })
    }
    
    const { action } = await request.json()
    
    if (action === 'cleanup') {
      console.log('🧹 Manual cleanup requested...')
      const cleanupStats = await cleanupUnavailableTracks(session.accessToken)
      
      return NextResponse.json({
        success: true,
        message: `Cleanup abgeschlossen: ${cleanupStats.removedCount} nicht verfügbare Tracks entfernt`,
        stats: cleanupStats,
        timestamp: new Date().toISOString()
      })
    }
    
    return NextResponse.json({ 
      error: 'Invalid action',
      availableActions: ['cleanup']
    }, { status: 400 })
    
  } catch (error) {
    console.error('Manual cleanup error:', error)
    return NextResponse.json({ 
      error: 'Cleanup failed',
      message: 'Fehler beim Cleanup der nicht verfügbaren Tracks'
    }, { status: 500 })
  }
}