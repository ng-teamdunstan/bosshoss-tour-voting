// src/lib/database.ts - Updated with proper KV integration
import { kv } from './kv'

export interface Vote {
  userId: string
  trackId: string
  points: number
  trackName: string
  artistName: string
  albumName: string
  timestamp: number
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

export interface UserProfile {
  userId: string
  name?: string | null
  email?: string | null
  image?: string | null
  createdAt: number
  lastActive: number
}

// Submit a vote
export async function submitVote(vote: Vote): Promise<{ success: boolean; message: string; votesRemaining: number }> {
  try {
    console.log('💾 Submitting vote to database:', vote)
    
    // Check if user has already voted for this track today
    const todayKey = getTodayKey()
    const userVotesKey = `user_votes:${vote.userId}:${todayKey}`
    const userVotes = await kv.get<Vote[]>(userVotesKey) || []
    
    // Check if user already voted for this track today
    const existingVote = userVotes.find(v => v.trackId === vote.trackId)
    if (existingVote) {
      return {
        success: false,
        message: 'Du hast heute bereits für diesen Song gestimmt!',
        votesRemaining: Math.max(0, 10 - userVotes.length)
      }
    }
    
    // Check daily vote limit (10 votes per day)
    if (userVotes.length >= 10) {
      return {
        success: false,
        message: 'Du hast heute bereits alle 10 Stimmen abgegeben!',
        votesRemaining: 0
      }
    }
    
    // Add vote to user's daily votes
    userVotes.push(vote)
    await kv.set(userVotesKey, userVotes, { ex: 60 * 60 * 24 * 2 }) // 2 days expiry
    
    // Update global track results
    await updateTrackResults(vote)
    
    // Log vote for analytics
    await logVote(vote)
    
    console.log('✅ Vote submitted successfully')
    
    return {
      success: true,
      message: 'Stimme erfolgreich abgegeben!',
      votesRemaining: Math.max(0, 10 - userVotes.length)
    }
    
  } catch (error) {
    console.error('❌ Error submitting vote:', error)
    return {
      success: false,
      message: 'Fehler beim Speichern der Stimme',
      votesRemaining: 0
    }
  }
}

// Check if user can vote today
export async function canUserVoteToday(userId: string): Promise<{ canVote: boolean; votesRemaining: number; votesUsed: number }> {
  try {
    const todayKey = getTodayKey()
    const userVotesKey = `user_votes:${userId}:${todayKey}`
    const userVotes = await kv.get<Vote[]>(userVotesKey) || []
    
    const votesUsed = userVotes.length
    const votesRemaining = Math.max(0, 10 - votesUsed)
    
    return {
      canVote: votesRemaining > 0,
      votesRemaining,
      votesUsed
    }
  } catch (error) {
    console.error('Error checking user vote status:', error)
    return { canVote: false, votesRemaining: 0, votesUsed: 0 }
  }
}

// Get user's votes for today
export async function getUserTodayVotes(userId: string): Promise<Vote[]> {
  try {
    const todayKey = getTodayKey()
    const userVotesKey = `user_votes:${userId}:${todayKey}`
    return await kv.get<Vote[]>(userVotesKey) || []
  } catch (error) {
    console.error('Error getting user votes:', error)
    return []
  }
}

// Update global track results
async function updateTrackResults(vote: Vote): Promise<void> {
  const trackKey = `track_results:${vote.trackId}`
  
  try {
    // Get existing track results
    const existing = await kv.get<TrackResult>(trackKey)
    
    if (existing) {
      // Update existing
      const updated: TrackResult = {
        ...existing,
        totalPoints: existing.totalPoints + vote.points,
        totalVotes: existing.totalVotes + 1
      }
      await kv.set(trackKey, updated, { ex: 60 * 60 * 24 * 365 }) // 1 year expiry
    } else {
      // Create new
      const newResult: TrackResult = {
        trackId: vote.trackId,
        totalPoints: vote.points,
        totalVotes: 1,
        trackName: vote.trackName,
        artistName: vote.artistName,
        albumName: vote.albumName,
        rank: 0
      }
      await kv.set(trackKey, newResult, { ex: 60 * 60 * 24 * 365 }) // 1 year expiry
    }
    
    // Update leaderboard
    await updateLeaderboard(vote.trackId, existing ? existing.totalPoints + vote.points : vote.points)
    
  } catch (error) {
    console.error('Error updating track results:', error)
  }
}

// Update leaderboard
async function updateLeaderboard(trackId: string, totalPoints: number): Promise<void> {
  try {
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
    
    // Sort by points (highest first) and limit to top 100
    const sortedLeaderboard = currentLeaderboard
      .sort((a, b) => b.points - a.points)
      .slice(0, 100)
    
    // Save back to KV
    await kv.set(leaderboardKey, sortedLeaderboard, { ex: 60 * 60 * 24 * 365 }) // 1 year expiry
    
  } catch (error) {
    console.error('Error updating leaderboard:', error)
  }
}

// Get top tracks
export async function getTopTracks(limit: number = 15): Promise<TrackResult[]> {
  try {
    const leaderboardKey = 'track_leaderboard'
    
    // Get leaderboard
    const leaderboard = await kv.get<{ trackId: string, points: number }[]>(leaderboardKey)
    
    if (!leaderboard || leaderboard.length === 0) {
      console.log('📊 No tracks in leaderboard yet')
      return []
    }
    
    console.log(`📊 Found ${leaderboard.length} tracks in leaderboard`)
    
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
    
    console.log(`📊 Returning ${tracks.length} top tracks`)
    return tracks
    
  } catch (error) {
    console.error('Error getting top tracks:', error)
    return []
  }
}

// Log vote for analytics
async function logVote(vote: Vote): Promise<void> {
  try {
    const logKey = `vote_log:${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    await kv.set(logKey, vote, { ex: 60 * 60 * 24 * 30 }) // 30 days expiry
  } catch (error) {
    console.error('Error logging vote:', error)
  }
}

// Get voting statistics
export async function getVotingStats(): Promise<{ totalVotes: number, totalUsers: number, totalTracks: number }> {
  try {
    const leaderboard = await kv.get<{ trackId: string, points: number }[]>('track_leaderboard')
    
    // Calculate total votes from all tracks
    let totalVotes = 0
    if (leaderboard) {
      for (const item of leaderboard) {
        const trackData = await kv.get<TrackResult>(`track_results:${item.trackId}`)
        if (trackData) {
          totalVotes += trackData.totalVotes
        }
      }
    }
    
    return {
      totalVotes,
      totalUsers: 0, // Would need dedicated counter
      totalTracks: leaderboard?.length || 0
    }
  } catch (error) {
    console.error('Error getting voting stats:', error)
    return { totalVotes: 0, totalUsers: 0, totalTracks: 0 }
  }
}

// User management
export async function saveUserProfile(userId: string, profile: { 
  name?: string | null
  email?: string | null  
  image?: string | null
}): Promise<void> {
  try {
    const userProfile: UserProfile = {
      userId,
      ...profile,
      createdAt: Date.now(),
      lastActive: Date.now()
    }
    
    await kv.set(`user_profile:${userId}`, userProfile, { ex: 60 * 60 * 24 * 365 }) // 1 year expiry
  } catch (error) {
    console.error('Error saving user profile:', error)
  }
}

// Helper: Get today's key for daily vote limits
function getTodayKey(): string {
  const today = new Date()
  return `${today.getFullYear()}-${today.getMonth() + 1}-${today.getDate()}`
}