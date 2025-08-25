// src/app/api/vote/route.ts - SCHLANKE VERSION
import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { submitVote, canUserVoteToday, getUserTodayVotes } from '@/lib/database'

interface VoteRequest {
  trackId: string
  trackName: string
  artistName: string
  albumName: string
}

export async function POST(request: NextRequest) {
  try {
    const session: any = await getServerSession()
    
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
    }
    
    const body = await request.json()
    const userId = session.user.email
    
    // Handle both single vote and bulk votes
    const votes: VoteRequest[] = body.votes || [body]
    
    // Check if user can vote
    const { canVote, votesRemaining } = await canUserVoteToday(userId)
    
    if (!canVote || votesRemaining < votes.length) {
      return NextResponse.json({
        success: false,
        message: `Du hast nur noch ${votesRemaining} Stimmen übrig!`,
        votesRemaining
      })
    }
    
    let successCount = 0
    
    // Process each vote
    for (const voteData of votes) {
      if (!voteData.trackId || !voteData.trackName || !voteData.artistName) {
        continue // Skip invalid votes
      }
      
      const vote = {
        userId,
        trackId: voteData.trackId,
        points: 1, // Always 1 point
        trackName: voteData.trackName,
        artistName: voteData.artistName,
        albumName: voteData.albumName || '',
        timestamp: Date.now()
      }
      
      const result = await submitVote(vote)
      if (result.success) {
        successCount++
      }
    }
    
    // Get updated status
    const { votesRemaining: finalVotesRemaining } = await canUserVoteToday(userId)
    
    return NextResponse.json({
      success: successCount > 0,
      message: successCount === 1 
        ? '1 Stimme erfolgreich abgegeben!'
        : `${successCount} Stimmen erfolgreich abgegeben!`,
      votesRemaining: finalVotesRemaining
    })
    
  } catch (error) {
    console.error('Vote error:', error)
    return NextResponse.json({ 
      success: false,
      message: 'Fehler beim Voten. Bitte versuche es nochmal.'
    }, { status: 500 })
  }
}

export async function GET() {
  try {
    const session: any = await getServerSession()
    
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
    }
    
    const userId = session.user.email
    
    // Get voting status
    const votingStatus = await canUserVoteToday(userId)
    const todayVotes = await getUserTodayVotes(userId)
    
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
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}