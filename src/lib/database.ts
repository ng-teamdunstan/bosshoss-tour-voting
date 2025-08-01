// Enhanced database.ts - Fixes Unknown Tracks Problem + Leaderboard Issues
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

export interface TrackResult {
  trackId: string
  totalPoints: number
  totalVotes: number
  trackName: string
  artistName: string
  albumName: string
  rank: number
  isAvailable?: boolean // NEW: Track availability flag
  lastChecked?: number // NEW: When was availability last checked
}

export interface TrackCache {
  trackId: string
  trackName: string
  artistName: string
  albumName: string
  isAvailable: boolean
  lastChecked: number
  spotifyData?: any // Cache full Spotify track data
}

// NEW: Verify track exists on Spotify
async function verifyTrackExists(trackId: string, accessToken: string): Promise<{
  exists: boolean
  trackData?: any
}> {
  try {
    const response = await fetch(`https://api.spotify.com/v1/tracks/${trackId}?market=DE`, {
      headers: {
        'Authorization': `Bearer ${accessToken}`
      }
    })
    
    if (response.ok) {
      const trackData = await response.json()
      return { exists: true, trackData }
    }
    
    return { exists: false }
    
  } catch (error) {
    console.error(`Error verifying track ${trackId}:`, error)
    return { exists: false }
  }
}

// NEW: Cache track information to reduce API calls
async function cacheTrackInfo(trackId: string, trackData: any): Promise<void> {
  const cacheKey = `track_cache:${trackId}`
  const cacheData: TrackCache = {
    trackId,
    trackName: trackData.name,
    artistName: trackData.artists.map((a: any) => a.name).join(', '),
    albumName: trackData.album.name,
    isAvailable: true,
    lastChecked: Date.now(),
    spotifyData: trackData
  }
  
  // Cache for 7 days
  await kv.set(cacheKey, cacheData, { ex: 60 * 60 * 24 * 7 })
}

// NEW: Get cached track info
async function getCachedTrackInfo(trackId: string): Promise<TrackCache | null> {
  const cacheKey = `track_cache:${trackId}`
  return await kv.get<TrackCache>(cacheKey)
}

// NEW: Mark track as unavailable
async function markTrackUnavailable(trackId: string): Promise<void> {
  const cacheKey = `track_cache:${trackId}`
  const existing = await getCachedTrackInfo(trackId)
  
  if (existing) {
    const updated: TrackCache = {
      ...existing,
      isAvailable: false,
      lastChecked: Date.now()
    }
    await kv.set(cacheKey, updated, { ex: 60 * 60 * 24 * 7 })
  }
}

// ENHANCED: Get top tracks with availability checking
export async function getTopTracksEnhanced(
  limit: number = 15, 
  accessToken?: string
): Promise<TrackResult[]> {
  const leaderboardKey = 'track_leaderboard'
  
  // Get leaderboard
  const leaderboard = await kv.get<{ trackId: string, points: number }[]>(leaderboardKey)
  
  if (!leaderboard || leaderboard.length === 0) {
    return []
  }
  
  const tracks: TrackResult[] = []
  
  for (let i = 0; i < Math.min(leaderboard.length, limit * 2); i++) { // Get more than needed as buffer
    const item = leaderboard[i]
    let trackData = await kv.get<TrackResult>(`track_results:${item.trackId}`)
    
    if (!trackData) continue
    
    // Check if we have cached availability info
    const cachedInfo = await getCachedTrackInfo(item.trackId)
    const needsCheck = !cachedInfo || (Date.now() - cachedInfo.lastChecked) > (24 * 60 * 60 * 1000) // 24 hours
    
    let isAvailable = true
    
    if (accessToken && needsCheck) {
      // Verify track still exists on Spotify
      const verification = await verifyTrackExists(item.trackId, accessToken)
      isAvailable = verification.exists
      
      if (verification.exists && verification.trackData) {
        // Update cache with fresh data
        await cacheTrackInfo(item.trackId, verification.trackData)
        
        // Update track names in case they changed
        trackData = {
          ...trackData,
          trackName: verification.trackData.name,
          artistName: verification.trackData.artists.map((a: any) => a.name).join(', '),
          albumName: verification.trackData.album.name
        }
        await kv.set(`track_results:${item.trackId}`, trackData)
      } else {
        // Mark as unavailable
        await markTrackUnavailable(item.trackId)
        isAvailable = false
      }
    } else if (cachedInfo) {
      isAvailable = cachedInfo.isAvailable
    }
    
    // Only include available tracks in results
    if (isAvailable) {
      tracks.push({
        ...trackData,
        rank: tracks.length + 1, // Recalculate rank based on available tracks
        isAvailable,
        lastChecked: Date.now()
      })
      
      if (tracks.length >= limit) break // Stop when we have enough available tracks
    }
  }
  
  return tracks
}

// ENHANCED: Submit vote with better error handling
export async function submitVoteEnhanced(vote: Vote, accessToken?: string): Promise<{ 
  success: boolean
  message: string
  votesRemaining: number 
}> {
  // First, verify the track exists (if we have an access token)
  if (accessToken) {
    const verification = await verifyTrackExists(vote.trackId, accessToken)
    if (!verification.exists) {
      return { 
        success: false, 
        message: 'Dieser Song ist derzeit nicht verfügbar. Bitte wähle einen anderen.', 
        votesRemaining: await getRemainingVotes(vote.userId) 
      }
    }
    
    // Cache the track info for future use
    if (verification.trackData) {
      await cacheTrackInfo(vote.trackId, verification.trackData)
    }
  }
  
  // Continue with normal vote submission logic
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
  await kv.set(sessionKey, newSession, { ex: 60 * 60 * 24 * 7 })
  
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

// HELPER: Get remaining votes for user
async function getRemainingVotes(userId: string): Promise<number> {
  const { votesRemaining } = await canUserVoteToday(userId)
  return votesRemaining
}

// NEW: Clean up unavailable tracks from leaderboard
export async function cleanupUnavailableTracks(accessToken: string): Promise<{
  removedCount: number
  totalChecked: number
}> {
  const leaderboardKey = 'track_leaderboard'
  const leaderboard = await kv.get<{ trackId: string, points: number }[]>(leaderboardKey) || []
  
  let removedCount = 0
  const cleanedLeaderboard: { trackId: string, points: number }[] = []
  
  for (const item of leaderboard) {
    const verification = await verifyTrackExists(item.trackId, accessToken)
    
    if (verification.exists) {
      cleanedLeaderboard.push(item)
      
      // Update cache
      if (verification.trackData) {
        await cacheTrackInfo(item.trackId, verification.trackData)
      }
    } else {
      removedCount++
      await markTrackUnavailable(item.trackId)
      console.log(`Removed unavailable track: ${item.trackId}`)
    }
  }
  
  // Save cleaned leaderboard
  await kv.set(leaderboardKey, cleanedLeaderboard, { ex: 60 * 60 * 24 * 30 })
  
  return {
    removedCount,
    totalChecked: leaderboard.length
  }
}

// NEW: Batch verify tracks for playlist creation
export async function verifyTracksForPlaylist(trackIds: string[], accessToken: string): Promise<{
  availableTrackIds: string[]
  unavailableTrackIds: string[]
}> {
  const availableTrackIds: string[] = []
  const unavailableTrackIds: string[] = []
  
  // Process in batches of 50 (Spotify API limit)
  const batchSize = 50
  for (let i = 0; i < trackIds.length; i += batchSize) {
    const batch = trackIds.slice(i, i + batchSize)
    
    try {
      const response = await fetch(`https://api.spotify.com/v1/tracks?ids=${batch.join(',')}&market=DE`, {
        headers: {
          'Authorization': `Bearer ${accessToken}`
        }
      })
      
      if (response.ok) {
        const data = await response.json()
        
        for (let j = 0; j < batch.length; j++) {
          const trackId = batch[j]
          const trackData = data.tracks[j]
          
          if (trackData && trackData.id) {
            availableTrackIds.push(trackId)
            // Cache the track data
            await cacheTrackInfo(trackId, trackData)
          } else {
            unavailableTrackIds.push(trackId)
            await markTrackUnavailable(trackId)
          }
        }
      } else {
        // If batch request fails, mark all as unavailable for safety
        unavailableTrackIds.push(...batch)
      }
      
    } catch (error) {
      console.error('Error in batch track verification:', error)
      unavailableTrackIds.push(...batch)
    }
  }
  
  return { availableTrackIds, unavailableTrackIds }
}

// Keep existing interfaces and functions...
export interface UserVotingSession {
  userId: string
  date: string
  votes: Vote[]
  totalVotes: number
  lastVoteTimestamp: number
}

export async function canUserVoteToday(userId: string): Promise<{ canVote: boolean, votesUsed: number, votesRemaining: number }> {
  const today = new Date().toISOString().split('T')[0]
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

export async function getUserTodayVotes(userId: string): Promise<Vote[]> {
  const today = new Date().toISOString().split('T')[0]
  const sessionKey = `user_votes:${userId}:${today}`
  
  const session = await kv.get<UserVotingSession>(sessionKey)
  return session?.votes || []
}

// Keep other existing functions...
async function updateTrackResults(vote: Vote): Promise<void> {
  const trackKey = `track_results:${vote.trackId}`
  const existing = await kv.get<TrackResult>(trackKey)
  
  if (existing) {
    const updated: TrackResult = {
      ...existing,
      totalPoints: existing.totalPoints + vote.points,
      totalVotes: existing.totalVotes + 1
    }
    await kv.set(trackKey, updated)
  } else {
    const newResult: TrackResult = {
      trackId: vote.trackId,
      totalPoints: vote.points,
      totalVotes: 1,
      trackName: vote.trackName,
      artistName: vote.artistName,
      albumName: vote.albumName,
      rank: 0
    }
    await kv.set(trackKey, newResult)
  }
  
  await updateLeaderboard(vote.trackId, existing ? existing.totalPoints + vote.points : vote.points)
}

async function updateLeaderboard(trackId: string, totalPoints: number): Promise<void> {
  const leaderboardKey = 'track_leaderboard'
  const currentLeaderboard = await kv.get<{ trackId: string, points: number }[]>(leaderboardKey) || []
  const existingIndex = currentLeaderboard.findIndex(item => item.trackId === trackId)
  
  if (existingIndex >= 0) {
    currentLeaderboard[existingIndex].points = totalPoints
  } else {
    currentLeaderboard.push({ trackId, points: totalPoints })
  }
  
  const sortedLeaderboard = currentLeaderboard
    .sort((a, b) => b.points - a.points)
    .slice(0, 50)
  
  await kv.set(leaderboardKey, sortedLeaderboard, { ex: 60 * 60 * 24 * 30 })
}

async function logVote(vote: Vote): Promise<void> {
  const logKey = `vote_log:${Date.now()}`
  await kv.set(logKey, vote, { ex: 60 * 60 * 24 * 30 })
}

export async function getVotingStats(): Promise<{ totalVotes: number, totalUsers: number, totalTracks: number }> {
  const leaderboard = await kv.get<{ trackId: string, points: number }[]>('track_leaderboard')
  
  return {
    totalVotes: 0,
    totalUsers: 0,
    totalTracks: leaderboard?.length || 0
  }
}