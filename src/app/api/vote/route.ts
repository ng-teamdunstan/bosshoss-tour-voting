import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { submitVote, canUserVoteToday, getUserTodayVotes } from '@/lib/database'

export async function POST(request: NextRequest) {
  try {
    const session: any = await getServerSession()
    
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
    }
    
    const { trackId, points, trackName, artistName, albumName } = await request.json()
    
    if (!trackId || !points || !trackName || !artistName) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }
    
    const userId = session.user.email // Using email as unique identifier
    
    const vote = {
      userId,
      trackId,
      points,
      trackName,
      artistName,
      albumName: albumName || '',
      timestamp: Date.now()
    }
    
    const result = await submitVote(vote)
    
    return NextResponse.json(result)
    
  } catch (error) {
    console.error('Vote submission error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
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
    
    return NextResponse.json({
      ...votingStatus,
      todayVotes
    })
    
  } catch (error) {
    console.error('Get votes error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}