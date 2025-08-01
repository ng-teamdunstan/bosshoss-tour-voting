// src/app/api/vote/route.ts - GEFIXTE VERSION MIT BULK VOTING
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
      return await processBulkVotes(body as BulkVoteRequest, userId)
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

// NEUE FUNKTION: Bulk Votes verarbeiten
async function processBulkVotes(request: BulkVoteRequest, userId: string): Promise<Response> {
  console.log('📦 Processing bulk votes:', request.votes.length, 'votes')
  
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
      
      // For bulk votes, we need to get track info from somewhere
      // Since frontend doesn't send track names, we'll use placeholder values
      // TODO: In a real app, you'd lookup track info from Spotify API or database
      const vote = {
        userId,
        trackId: voteRequest.trackId,
        points: Number(voteRequest.points),
        trackName: voteRequest.trackName || 'Unknown Track',
        artistName: voteRequest.artistName || 'The BossHoss',
        albumName: voteRequest.albumName || 'Unknown Album',
        timestamp: Date.now()
      }
      
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
        points: vote.points
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