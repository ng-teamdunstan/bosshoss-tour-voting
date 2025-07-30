import { kv } from '@vercel/kv'

export interface Vote {
  userId: string
  trackId: string
  points: number
  timestamp: number
  trackName: string
  artistName: string
  albumName: string
}

export interface UserVotingSession {
  userId: string
  date: string // YYYY-MM-DD format
  votes: Vote[]
  totalVotes: number
  lastVoteTimestamp: number
}

export interface TrackResult {
  trackId: string
  totalPoints: number
  totalVotes: number
  trackName: string
  artistName: string
  albumName: string
  rank: number
}

// Check if user can vote today
export async function canUserVoteToday(userId: string): Promise<{ canVote: boolean, votesUsed: number, votesRemaining: number }> {
  const today = new Date().toISOString().split('T')[0] // YYYY-MM-DD
  const sessionKey = `user_votes:${userId}:${today}`
  
  const session = await kv.get<UserVotingSession>(sessionKey)
  
  if (!session) {
    return { canVote: true, votesUsed: 0, votesRemaining: 10 }
  }
  
  const votesUsed = session.totalVotes
  const votesRemaining = Math.max(0, 10 - votesUsed)
  
  return {
    canVote: votesRemaining > 0,
    votesUsed,
    votesRemaining
  }
}

// Get user's today votes
export async function getUserTodayVotes(userId: string): Promise<Vote[]> {
  const today = new Date().toISOString().split('T')[0]
  const sessionKey = `user_votes:${userId}:${today}`
  
  const session = await kv.get<UserVotingSession>(sessionKey)
  return session?.votes || []
}

// Submit user vote
export async function submitVote(vote: Vote): Promise<{ success: boolean, message: string, votesRemaining: number }> {
  const today = new Date().toISOString().split('T')[0]
  const sessionKey = `user_votes:${vote.userId}:${today}`
  
  // Check if user can still vote
  const { canVote, votesUsed } = await canUserVoteToday(vote.userId)
  
  if (!canVote) {
    return { success: false, message: 'Du hast bereits alle 10 Stimmen für heute verwendet!', votesRemaining: 0 }
  }
  
  // Get existing session
  const existingSession = await kv.get<UserVotingSession>(sessionKey)
  
  // Check if user already voted for this track today
  const existingVotes = existingSession?.votes || []
  const alreadyVoted = existingVotes.some(v => v.trackId === vote.trackId)
  
  if (alreadyVoted) {
    return { success: false, message: 'Du hast für diesen Song heute bereits gevotet!', votesRemaining: 10 - votesUsed }
  }
  
  // Create/update session
  const newSession: UserVotingSession = {
    userId: vote.userId,
    date: today,
    votes: [...existingVotes, vote],
    totalVotes: votesUsed + 1,
    lastVoteTimestamp: vote.timestamp
  }
  
  // Save user session
  await kv.set(sessionKey, newSession, { ex: 60 * 60 * 24 * 7 }) // 7 days expiry
  
  // Update global track results
  await updateTrackResults(vote)
  
  // Log vote for analytics
  await logVote(vote)
  
  const votesRemaining = 10 - newSession.totalVotes
  
  return { 
    success: true, 
    message: 'Vote erfolgreich abgegeben!', 
    votesRemaining 
  }
}

// Update global track results (simplified for Vercel KV)
async function updateTrackResults(vote: Vote): Promise<void> {
  const trackKey = `track_results:${vote.trackId}`
  
  // Get existing track results
  const existing = await kv.get<TrackResult>(trackKey)
  
  if (existing) {
    // Update existing
    const updated: TrackResult = {
      ...existing,
      totalPoints: existing.totalPoints + vote.points,
      totalVotes: existing.totalVotes + 1
    }
    await kv.set(trackKey, updated)
  } else {
    // Create new
    const newResult: TrackResult = {
      trackId: vote.trackId,
      totalPoints: vote.points,
      totalVotes: 1,
      trackName: vote.trackName,
      artistName: vote.artistName,
      albumName: vote.albumName,
      rank: 0 // Will be calculated when fetching top results
    }
    await kv.set(trackKey, newResult)
  }
  
  // Update global leaderboard list (simplified approach)
  await updateLeaderboard(vote.trackId, existing ? existing.totalPoints + vote.points : vote.points)
}

// Simple leaderboard update (using basic KV operations)
async function updateLeaderboard(trackId: string, totalPoints: number): Promise<void> {
  const leaderboardKey = 'track_leaderboard'
  
  // Get current leaderboard
  const currentLeaderboard = await kv.get<{ trackId: string, points: number }[]>(leaderboardKey) || []
  
  // Update or add track
  const existingIndex = currentLeaderboard.findIndex(item => item.trackId === trackId)
  
  if (existingIndex >= 0) {
    currentLeaderboard[existingIndex].points = totalPoints
  } else {
    currentLeaderboard.push({ trackId, points: totalPoints })
  }
  
  // Sort by points (highest first) and limit to top 50
  const sortedLeaderboard = currentLeaderboard
    .sort((a, b) => b.points - a.points)
    .slice(0, 50)
  
  // Save back to KV
  await kv.set(leaderboardKey, sortedLeaderboard, { ex: 60 * 60 * 24 * 30 }) // 30 days expiry
}

// Get top tracks (simplified for Vercel KV)
export async function getTopTracks(limit: number = 15): Promise<TrackResult[]> {
  const leaderboardKey = 'track_leaderboard'
  
  // Get leaderboard
  const leaderboard = await kv.get<{ trackId: string, points: number }[]>(leaderboardKey)
  
  if (!leaderboard || leaderboard.length === 0) {
    return []
  }
  
  // Get top track IDs
  const topTrackIds = leaderboard.slice(0, limit)
  
  // Get full track data
  const tracks: TrackResult[] = []
  
  for (let i = 0; i < topTrackIds.length; i++) {
    const item = topTrackIds[i]
    const trackData = await kv.get<TrackResult>(`track_results:${item.trackId}`)
    
    if (trackData) {
      tracks.push({
        ...trackData,
        rank: i + 1
      })
    }
  }
  
  return tracks
}

// Log vote for analytics
async function logVote(vote: Vote): Promise<void> {
  const logKey = `vote_log:${Date.now()}`
  await kv.set(logKey, vote, { ex: 60 * 60 * 24 * 30 }) // 30 days expiry
}

// Get total voting statistics
export async function getVotingStats(): Promise<{ totalVotes: number, totalUsers: number, totalTracks: number }> {
  const leaderboard = await kv.get<{ trackId: string, points: number }[]>('track_leaderboard')
  
  return {
    totalVotes: 0, // Would need dedicated counter
    totalUsers: 0, // Would need dedicated counter  
    totalTracks: leaderboard?.length || 0
  }
}

// User management functions
export async function saveUserProfile(userId: string, profile: { 
  name?: string | null
  email?: string | null  
  image?: string | null
}): Promise<void> {
  const userKey = `user_profile:${userId}`
  const userData = {
    id: userId,
    name: profile.name,
    email: profile.email,
    image: profile.image,
    firstLogin: new Date().toISOString(),
    lastActive: new Date().toISOString()
  }
  
  await kv.set(userKey, userData)
}

export async function updateUserActivity(userId: string): Promise<void> {
  const userKey = `user_profile:${userId}`
  const existing = await kv.get(userKey)
  
  if (existing) {
    await kv.set(userKey, {
      ...existing,
      lastActive: new Date().toISOString()
    })
  }
}