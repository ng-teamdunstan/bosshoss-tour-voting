// src/app/api/vote/route.ts - VERBESSERTE VERSION MIT TRACK-NAMEN
import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { submitVote, canUserVoteToday, getUserTodayVotes } from '@/lib/database'

interface VoteRequest {
  trackId: string
  points: number
  trackName?: string
  artistName?: string
  albumName?: string
}

interface BulkVoteRequest {
  votes: VoteRequest[]
}

export async function POST(request: NextRequest) {
  try {
    console.log('🗳️ Processing vote submission...')
    
    const session: any = await getServerSession()
    
    if (!session?.user?.email) {
      console.log('❌ No session found')
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
    }
    
    console.log('✅ Session found for user:', session.user.email)
    
    const body = await request.json()
    console.log('📨 Request body:', JSON.stringify(body, null, 2))
    
    const userId = session.user.email
    
    // Check if this is bulk voting (new format) or single vote (old format)
    if (body.votes && Array.isArray(body.votes)) {
      // BULK VOTING - NEW FORMAT
      return await processBulkVotesWithTrackLookup(body as BulkVoteRequest, userId, session.accessToken)
    } else {
      // SINGLE VOTING - OLD FORMAT (backward compatibility)
      return await processSingleVote(body as VoteRequest, userId)
    }
    
  } catch (error) {
    console.error('🔥 Vote API Error:', error)
    return NextResponse.json({ 
      success: false,
      error: 'Internal server error',
      message: 'Fehler beim Speichern der Stimme. Bitte versuche es nochmal.'
    }, { status: 500 })
  }
}

// VERBESSERTE FUNKTION: Bulk Votes mit Track-Namen Lookup
async function processBulkVotesWithTrackLookup(request: BulkVoteRequest, userId: string, accessToken?: string): Promise<Response> {
  console.log('📦 Processing bulk votes with track lookup:', request.votes.length, 'votes')
  
  // Check voting limits first
  const { canVote, votesRemaining } = await canUserVoteToday(userId)
  
  if (!canVote || votesRemaining < request.votes.length) {
    console.log('❌ Not enough votes remaining:', votesRemaining, 'needed:', request.votes.length)
    return NextResponse.json({
      success: false,
      message: `Du hast nur noch ${votesRemaining} Stimmen übrig, aber versuchst ${request.votes.length} Stimmen abzugeben!`,
      votesRemaining
    })
  }
  
  // Lookup track info for tracks that don't have names
  const trackInfoMap = await lookupTrackInfo(request.votes, accessToken)
  
  const results = []
  let successCount = 0
  let totalPoints = 0
  
  // Process each vote
  for (const voteRequest of request.votes) {
    try {
      console.log('🎯 Processing vote:', voteRequest.trackId, 'points:', voteRequest.points)
      
      // Validate required fields
      if (!voteRequest.trackId || !voteRequest.points) {
        console.log('❌ Missing required fields in vote:', JSON.stringify(voteRequest))
        results.push({
          trackId: voteRequest.trackId,
          success: false,
          message: 'Missing trackId or points'
        })
        continue
      }
      
      // Get track info (from request or lookup)
      const trackInfo = trackInfoMap.get(voteRequest.trackId) || {
        trackName: voteRequest.trackName || 'Unknown Track',
        artistName: voteRequest.artistName || 'The BossHoss',
        albumName: voteRequest.albumName || 'Unknown Album'
      }
      
      const vote = {
        userId,
        trackId: voteRequest.trackId,
        points: Number(voteRequest.points),
        trackName: trackInfo.trackName,
        artistName: trackInfo.artistName,
        albumName: trackInfo.albumName,
        timestamp: Date.now()
      }
      
      console.log('🎵 Vote with track info:', {
        trackId: vote.trackId,
        trackName: vote.trackName,
        points: vote.points
      })
      
      const result = await submitVote(vote)
      
      if (result.success) {
        successCount++
        totalPoints += vote.points
        console.log('✅ Vote successful:', voteRequest.trackId, '+' + vote.points, 'points')
      } else {
        console.log('❌ Vote failed:', voteRequest.trackId, result.message)
      }
      
      results.push({
        trackId: voteRequest.trackId,
        success: result.success,
        message: result.message,
        points: vote.points,
        trackName: vote.trackName // Include in response for debugging
      })
      
    } catch (error) {
      console.error('❌ Error processing individual vote:', error)
      results.push({
        trackId: voteRequest.trackId,
        success: false,
        message: 'Internal error'
      })
    }
  }
  
  // Get updated vote status
  const { votesRemaining: finalVotesRemaining } = await canUserVoteToday(userId)
  
  console.log('📊 Bulk vote complete:', successCount, 'successful,', totalPoints, 'total points')
  
  return NextResponse.json({
    success: successCount > 0,
    message: `${successCount} Stimmen erfolgreich abgegeben!`,
    pointsUsed: totalPoints,
    votesRemaining: finalVotesRemaining,
    results: results.filter(r => r.success) // Only return successful votes for frontend
  })
}

// Helper: Lookup track information from Spotify
async function lookupTrackInfo(votes: VoteRequest[], accessToken?: string): Promise<Map<string, {
  trackName: string
  artistName: string
  albumName: string
}>> {
  const trackInfoMap = new Map()
  
  // If no access token, return empty map (will use fallback names)
  if (!accessToken) {
    console.log('⚠️ No access token for track lookup, using fallback names')
    return trackInfoMap
  }
  
  // Get track IDs that need lookup (don't have trackName)
  const trackIdsToLookup = votes
    .filter(vote => !vote.trackName)
    .map(vote => vote.trackId)
  
  if (trackIdsToLookup.length === 0) {
    console.log('✅ All votes have track names, no lookup needed')
    return trackInfoMap
  }
  
  console.log('🔍 Looking up track info for', trackIdsToLookup.length, 'tracks')
  
  try {
    // Batch lookup (up to 50 tracks per request)
    const batchSize = 50
    
    for (let i = 0; i < trackIdsToLookup.length; i += batchSize) {
      const batch = trackIdsToLookup.slice(i, i + batchSize)
      const idsParam = batch.join(',')
      
      const response = await fetch(`https://api.spotify.com/v1/tracks?ids=${idsParam}`, {
        headers: {
          'Authorization': `Bearer ${accessToken}`
        }
      })
      
      if (response.ok) {
        const data = await response.json()
        
        data.tracks?.forEach((track: any) => {
          if (track && track.id) {
            trackInfoMap.set(track.id, {
              trackName: track.name,
              artistName: track.artists.map((a: any) => a.name).join(', '),
              albumName: track.album.name
            })
            console.log('🎵 Looked up:', track.id, '→', track.name)
          }
        })
      } else {
        console.log('⚠️ Spotify API error:', response.status)
      }
    }
    
    console.log('✅ Track lookup complete:', trackInfoMap.size, 'tracks found')
    
  } catch (error) {
    console.error('❌ Error in track lookup:', error)
  }
  
  return trackInfoMap
}

// ALTE FUNKTION: Single Vote (backward compatibility)
async function processSingleVote(voteRequest: VoteRequest, userId: string): Promise<Response> {
  console.log('🎯 Processing single vote:', voteRequest.trackId)
  
  const { trackId, points, trackName, artistName, albumName } = voteRequest
  
  if (!trackId || !points || !trackName || !artistName) {
    console.log('❌ Missing required fields:', { trackId: !!trackId, points: !!points, trackName: !!trackName, artistName: !!artistName })
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
  }
  
  const vote = {
    userId,
    trackId,
    points: Number(points),
    trackName,
    artistName,
    albumName: albumName || '',
    timestamp: Date.now()
  }
  
  const result = await submitVote(vote)
  
  return NextResponse.json(result)
}

export async function GET() {
  try {
    const session: any = await getServerSession()
    
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
    }
    
    const userId = session.user.email
    
    // Get user's voting status for today
    const votingStatus = await canUserVoteToday(userId)
    const todayVotes = await getUserTodayVotes(userId)
    
    console.log('📊 User voting status:', { userId, ...votingStatus, votesToday: todayVotes.length })
    
    return NextResponse.json({
      ...votingStatus,
      todayVotes: todayVotes.map(v => ({
        trackId: v.trackId,
        trackName: v.trackName,
        points: v.points,
        timestamp: v.timestamp
      }))
    })
    
  } catch (error) {
    console.error('Get votes error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}