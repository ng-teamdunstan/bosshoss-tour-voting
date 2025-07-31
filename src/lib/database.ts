// src/lib/database.ts - KOMPLETTE FUNKTIONIERENDE VERSION
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
  date: string
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

// Helper: Test KV connection
export async function testKVConnection(): Promise<boolean> {
  try {
    const testKey = `test_${Date.now()}`
    await kv.set(testKey, 'test', { ex: 60 })
    const result = await kv.get(testKey)
    await kv.del(testKey)
    return result === 'test'
  } catch (error) {
    console.error('❌ KV Connection failed:', error)
    return false
  }
}

// Check if user can vote today
export async function canUserVoteToday(userId: string): Promise<{ canVote: boolean, votesUsed: number, votesRemaining: number }> {
  try {
    const today = new Date().toISOString().split('T')[0]
    const sessionKey = `user_votes:${userId}:${today}`
    
    console.log('🔍 Checking votes for user:', userId, 'date:', today)
    
    const session = await kv.get<UserVotingSession>(sessionKey)
    
    if (!session) {
      console.log('✅ No votes found, user can vote')
      return { canVote: true, votesUsed: 0, votesRemaining: 10 }
    }
    
    const votesUsed = session.totalVotes || 0
    const votesRemaining = Math.max(0, 10 - votesUsed)
    
    console.log('📊 Vote status:', { votesUsed, votesRemaining })
    
    return {
      canVote: votesRemaining > 0,
      votesUsed,
      votesRemaining
    }
  } catch (error) {
    console.error('❌ Error checking user votes:', error)
    return { canVote: true, votesUsed: 0, votesRemaining: 10 }
  }
}

// Get user's today votes
export async function getUserTodayVotes(userId: string): Promise<Vote[]> {
  try {
    const today = new Date().toISOString().split('T')[0]
    const sessionKey = `user_votes:${userId}:${today}`
    
    const session = await kv.get<UserVotingSession>(sessionKey)
    return session?.votes || []
  } catch (error) {
    console.error('❌ Error getting user votes:', error)
    return []
  }
}

// Submit user vote - IMPROVED VERSION
export async function submitVote(vote: Vote): Promise<{ success: boolean, message: string, votesRemaining: number }> {
  console.log('🎯 Starting vote submission:', vote.trackId)
  
  try {
    // 1. Validate vote data
    if (!vote.userId || !vote.trackId || !vote.points) {
      return { success: false, message: 'Ungültige Vote-Daten', votesRemaining: 0 }
    }
    
    const today = new Date().toISOString().split('T')[0]
    const sessionKey = `user_votes:${vote.userId}:${today}`
    
    // 2. Check voting limits
    const { canVote, votesUsed } = await canUserVoteToday(vote.userId)
    
    if (!canVote) {
      console.log('❌ User has no votes remaining')
      return { success: false, message: 'Du hast bereits alle 10 Stimmen für heute verwendet!', votesRemaining: 0 }
    }
    
    // 3. Check for duplicate vote
    const existingSession = await kv.get<UserVotingSession>(sessionKey)
    const existingVotes = existingSession?.votes || []
    const alreadyVoted = existingVotes.some(v => v.trackId === vote.trackId)
    
    if (alreadyVoted) {
      console.log('❌ User already voted for this track')
      return { success: false, message: 'Du hast für diesen Song heute bereits gevotet!', votesRemaining: 10 - votesUsed }
    }
    
    // 4. Create/update user session
    const newSession: UserVotingSession = {
      userId: vote.userId,
      date: today,
      votes: [...existingVotes, vote],
      totalVotes: votesUsed + 1,
      lastVoteTimestamp: vote.timestamp
    }
    
    console.log('💾 Saving user session:', sessionKey)
    
    // 5. Save user session with longer expiry
    await kv.set(sessionKey, newSession, { ex: 60 * 60 * 24 * 30 }) // 30 days
    
    // 6. Update global track results - WITH RETRY LOGIC
    const trackUpdateSuccess = await updateTrackResultsWithRetry(vote, 3)
    
    if (!trackUpdateSuccess) {
      console.error('❌ Failed to update track results')
    }
    
    // 7. Update leaderboard
    await updateLeaderboardSafe(vote.trackId)
    
    const votesRemaining = 10 - newSession.totalVotes
    
    console.log('✅ Vote submitted successfully, remaining:', votesRemaining)
    
    return { 
      success: true, 
      message: 'Vote erfolgreich abgegeben!', 
      votesRemaining 
    }
    
  } catch (error) {
    console.error('🔥 Vote submission error:', error)
    return { 
      success: false, 
      message: 'Fehler beim Speichern der Stimme. Bitte versuche es nochmal.', 
      votesRemaining: 0 
    }
  }
}

// Update track results with retry logic
async function updateTrackResultsWithRetry(vote: Vote, retries: number): Promise<boolean> {
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      console.log(`🔄 Updating track results, attempt ${attempt}`)
      
      const trackKey = `track_results:${vote.trackId}`
      
      // Get existing results
      const existing = await kv.get<TrackResult>(trackKey)
      
      let updated: TrackResult
      
      if (existing) {
        // Update existing
        updated = {
          ...existing,
          totalPoints: existing.totalPoints + vote.points,
          totalVotes: existing.totalVotes + 1
        }
        console.log('📊 Updating existing track:', { oldPoints: existing.totalPoints, newPoints: updated.totalPoints })
      } else {
        // Create new
        updated = {
          trackId: vote.trackId,
          totalPoints: vote.points,
          totalVotes: 1,
          trackName: vote.trackName,
          artistName: vote.artistName,
          albumName: vote.albumName,
          rank: 0
        }
        console.log('🆕 Creating new track result:', updated)
      }
      
      // Save with expiry
      await kv.set(trackKey, updated, { ex: 60 * 60 * 24 * 365 }) // 1 year
      
      console.log('✅ Track results updated successfully')
      return true
      
    } catch (error) {
      console.error(`❌ Track update attempt ${attempt} failed:`, error)
      
      if (attempt === retries) {
        return false
      }
      
      // Wait before retry
      await new Promise(resolve => setTimeout(resolve, 100 * attempt))
    }
  }
  
  return false
}

// Safe leaderboard update
async function updateLeaderboardSafe(trackId: string): Promise<void> {
  try {
    const leaderboardKey = 'track_leaderboard'
    const trackKey = `track_results:${trackId}`
    
    // Get current track data
    const trackData = await kv.get<TrackResult>(trackKey)
    if (!trackData) return
    
    // Get current leaderboard
    const currentLeaderboard = await kv.get<{ trackId: string, points: number }[]>(leaderboardKey) || []
    
    // Update or add track
    const existingIndex = currentLeaderboard.findIndex(item => item.trackId === trackId)
    
    if (existingIndex >= 0) {
      currentLeaderboard[existingIndex].points = trackData.totalPoints
    } else {
      currentLeaderboard.push({ trackId, points: trackData.totalPoints })
    }
    
    // Sort and limit
    const sortedLeaderboard = currentLeaderboard
      .sort((a, b) => b.points - a.points)
      .slice(0, 100) // Keep top 100
    
    // Save with long expiry
    await kv.set(leaderboardKey, sortedLeaderboard, { ex: 60 * 60 * 24 * 365 })
    
    console.log('📊 Leaderboard updated, track position for', trackId, ':', sortedLeaderboard.findIndex(item => item.trackId === trackId) + 1)
    
  } catch (error) {
    console.error('❌ Leaderboard update error:', error)
  }
}

// Get top tracks with better error handling
export async function getTopTracks(limit: number = 15): Promise<TrackResult[]> {
  try {
    console.log('🏆 Getting top tracks, limit:', limit)
    
    const leaderboardKey = 'track_leaderboard'
    const leaderboard = await kv.get<{ trackId: string, points: number }[]>(leaderboardKey)
    
    if (!leaderboard || leaderboard.length === 0) {
      console.log('⚠️ No leaderboard data found')
      return []
    }
    
    console.log('📊 Leaderboard entries:', leaderboard.length)
    
    // Get top track IDs
    const topTrackIds = leaderboard.slice(0, limit)
    const tracks: TrackResult[] = []
    
    // Get full track data
    for (let i = 0; i < topTrackIds.length; i++) {
      try {
        const item = topTrackIds[i]
        const trackData = await kv.get<TrackResult>(`track_results:${item.trackId}`)
        
        if (trackData) {
          tracks.push({
            ...trackData,
            rank: i + 1
          })
        }
      } catch (error) {
        console.error(`❌ Error loading track ${topTrackIds[i].trackId}:`, error)
      }
    }
    
    console.log('✅ Loaded', tracks.length, 'top tracks')
    return tracks
    
  } catch (error) {
    console.error('❌ Error getting top tracks:', error)
    return []
  }
}

// Get total voting statistics - FIXED VERSION
export async function getVotingStats(): Promise<{ totalVotes: number, totalUsers: number, totalTracks: number }> {
  try {
    const leaderboard = await kv.get<{ trackId: string, points: number }[]>('track_leaderboard')
    
    // Get total votes from all user sessions (today)
    const today = new Date().toISOString().split('T')[0]
    const userKeys = await kv.keys(`user_votes:*:${today}`)
    
    let totalVotes = 0
    let uniqueUsers = new Set<string>()
    
    for (const key of userKeys) {
      try {
        const session = await kv.get<UserVotingSession>(key)
        if (session) {
          totalVotes += session.totalVotes
          uniqueUsers.add(session.userId)
        }
      } catch (error) {
        console.error('Error reading user session:', error)
      }
    }
    
    return {
      totalVotes,
      totalUsers: uniqueUsers.size,
      totalTracks: leaderboard?.length || 0
    }
  } catch (error) {
    console.error('❌ Error getting voting stats:', error)
    return {
      totalVotes: 0,
      totalUsers: 0,
      totalTracks: 0
    }
  }
}

// Save user profile for future use
export async function saveUserProfile(userId: string, profile: { 
  name?: string | null
  email?: string | null  
  image?: string | null
  spotifyId?: string
}): Promise<void> {
  try {
    const userKey = `user_profile:${userId}`
    await kv.set(userKey, profile, { ex: 60 * 60 * 24 * 365 }) // 1 year
  } catch (error) {
    console.error('❌ Error saving user profile:', error)
  }
}

// Get user profile
export async function getUserProfile(userId: string): Promise<any> {
  try {
    return await kv.get(`user_profile:${userId}`)
  } catch (error) {
    console.error('❌ Error getting user profile:', error)
    return null
  }
}