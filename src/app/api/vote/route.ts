// src/app/api/vote/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '../auth/[...nextauth]/route'
import { submitVote, canUserVoteToday, getUserTodayVotes } from '@/lib/database'

interface SessionWithToken {
  user?: {
    email?: string
    name?: string
  }
  accessToken?: string
}

export async function POST(request: NextRequest) {
  try {
    console.log('🗳️ Processing vote submission...')
    
    const session = await getServerSession(authOptions) as SessionWithToken
    
    if (!session?.user?.email) {
      console.log('❌ No session found')
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
    }
    
    console.log('✅ Session found for user:', session.user.email)
    
    const body = await request.json()
    console.log('📨 Request body:', body)
    
    // Handle both single vote and multiple votes format
    const votes = body.votes || [body] // Support both formats
    
    if (!votes || votes.length === 0) {
      return NextResponse.json({ error: 'No votes provided' }, { status: 400 })
    }
    
    const userId = session.user.email
    
    // Check if user can vote today
    const canVote = await canUserVoteToday(userId)
    if (!canVote.canVote) {
      return NextResponse.json({ 
        error: 'Daily vote limit reached',
        message: 'Du hast heute bereits deine 10 Stimmen abgegeben. Komm morgen wieder!'
      }, { status: 400 })
    }
    
    let totalPointsUsed = 0
    const results = []
    
    // Process each vote
    for (const voteData of votes) {
      const { trackId, points, trackName, artistName, albumName } = voteData
      
      if (!trackId || !points || !trackName || !artistName) {
        console.log('❌ Missing required fields in vote:', voteData)
        continue
      }
      
      const vote = {
        userId,
        trackId,
        points,
        trackName,
        artistName,
        albumName: albumName || '',
        timestamp: Date.now()
      }
      
      console.log('💾 Submitting vote:', vote)
      
      const result = await submitVote(vote)
      results.push(result)
      totalPointsUsed += points
      
      console.log('✅ Vote submitted successfully')
    }
    
    // Get updated voting status
    const updatedStatus = await canUserVoteToday(userId)
    
    return NextResponse.json({
      success: true,
      message: `${votes.length} Stimme${votes.length !== 1 ? 'n' : ''} erfolgreich abgegeben!`,
      pointsUsed: totalPointsUsed,
      votesRemaining: updatedStatus.votesRemaining,
      results
    })
    
  } catch (error) {
    console.error('❌ Vote submission error:', error)
    return NextResponse.json({ 
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}

export async function GET() {
  try {
    const session = await getServerSession(authOptions) as SessionWithToken
    
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
    }
    
    const userId = session.user.email
    
    // Get user's voting status for today
    const votingStatus = await canUserVoteToday(userId)
    const todayVotes = await getUserTodayVotes(userId)
    
    return NextResponse.json({
      ...votingStatus,
      todayVotes
    })
    
  } catch (error) {
    console.error('Get votes error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}