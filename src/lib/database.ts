// FULLY COMPATIBLE Enhanced database.ts - Fixes Leaderboard + All Exports
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
  isAvailable?: boolean
  lastChecked?: number
}

export interface TrackCache {
  trackId: string
  trackName: string
  artistName: string
  albumName: string
  isAvailable: boolean
  lastChecked: number
  spotifyData?: any
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

// ENHANCED: Submit user vote with better track data handling
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
  
  // ENHANCED: Update global track results with better data handling
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

// ENHANCED: Update track results with guaranteed track name storage
export async function updateTrackResults(vote: Vote): Promise<void> {
  const trackKey = `track_results:${vote.trackId}`
  
  // Get existing track results
  const existing = await kv.get<TrackResult>(trackKey)
  
  if (existing) {
    // Update existing - PRESERVE track names if they exist, otherwise use vote data
    const updated: TrackResult = {
      ...existing,
      totalPoints: existing.totalPoints + vote.points,
      totalVotes: existing.totalVotes + 1,
      // ENHANCED: Always ensure we have track names
      trackName: existing.trackName && existing.trackName !== 'Unknown Track' ? existing.trackName : vote.trackName,
      artistName: existing.artistName && existing.artistName !== 'Unknown Artist' ? existing.artistName : vote.artistName,
      albumName: existing.albumName && existing.albumName !== 'Unknown Album' ? existing.albumName : vote.albumName,
    }
    await kv.set(trackKey, updated)
  } else {
    // Create new - ALWAYS store track names from vote
    const newResult: TrackResult = {
      trackId: vote.trackId,
      totalPoints: vote.points,
      totalVotes: 1,
      trackName: vote.trackName || 'Unknown Track',
      artistName: vote.artistName || 'Unknown Artist', 
      albumName: vote.albumName || 'Unknown Album',
      rank: 0 // Will be calculated when fetching top results
    }
    await kv.set(trackKey, newResult)
  }
  
  // Update global leaderboard
  await updateLeaderboard(vote.trackId, existing ? existing.totalPoints + vote.points : vote.points)
}

// ENHANCED: Leaderboard update with track name preservation
export async function updateLeaderboard(trackId: string, totalPoints: number): Promise<void> {
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

// ENHANCED: Get top tracks with guaranteed track names (FIXES LEADERBOARD PROBLEM)
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
    let trackData = await kv.get<TrackResult>(`track_results:${item.trackId}`)
    
    if (trackData) {
      // ENHANCED: Ensure we always have track names
      const cleanTrackData: TrackResult = {
        ...trackData,
        rank: i + 1,
        // Fix any missing track names
        trackName: trackData.trackName && trackData.trackName !== 'Unknown Track' 
          ? trackData.trackName 
          : 'Unknown Track',
        artistName: trackData.artistName && trackData.artistName !== 'Unknown Artist'
          ? trackData.artistName
          : 'Unknown Artist',
        albumName: trackData.albumName && trackData.albumName !== 'Unknown Album'
          ? trackData.albumName
          : 'Unknown Album'
      }
      
      tracks.push(cleanTrackData)
    }
  }
  
  return tracks
}

// ENHANCED: Log vote for analytics
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

// ENHANCED: Cache track information for better performance
export async function cacheTrackInfo(trackId: string, trackName: string, artistName: string, albumName: string): Promise<void> {
  const cacheKey = `track_cache:${trackId}`
  const cacheData: TrackCache = {
    trackId,
    trackName,
    artistName, 
    albumName,
    isAvailable: true,
    lastChecked: Date.now()
  }
  
  // Cache for 7 days
  await kv.set(cacheKey, cacheData, { ex: 60 * 60 * 24 * 7 })
}

// ENHANCED: Get cached track info
export async function getCachedTrackInfo(trackId: string): Promise<TrackCache | null> {
  const cacheKey = `track_cache:${trackId}`
  return await kv.get<TrackCache>(cacheKey)
}

// User management functions (keep existing)
export async function saveUserProfile(userId: string, profile: { 
  name?: string | null
  email?: string | null  
  image?: string | null 
}): Promise<void> {
  const userKey = `user_profile:${userId}`
  await kv.set(userKey, profile, { ex: 60 * 60 * 24 * 30 }) // 30 days expiry
}

export async function getUserProfile(userId: string): Promise<{ 
  name?: string | null
  email?: string | null
  image?: string | null 
} | null> {
  const userKey = `user_profile:${userId}`
  return await kv.get(userKey)
}