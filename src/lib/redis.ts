// src/lib/redis.ts - Upstash Redis Connection Setup
import { Redis } from '@upstash/redis'

// Upstash Redis client setup
export const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL!,
  token: process.env.UPSTASH_REDIS_REST_TOKEN!,
})

// Test Redis connection
export async function testRedisConnection(): Promise<boolean> {
  try {
    await redis.set('test_key', 'test_value', { ex: 10 })
    const result = await redis.get('test_key')
    return result === 'test_value'
  } catch (error) {
    console.error('Redis connection test failed:', error)
    return false
  }
}

// Initialize database schema (run once)
export async function initializeDatabase(): Promise<void> {
  try {
    // Initialize empty leaderboard if it doesn't exist
    const existingLeaderboard = await redis.get('track_leaderboard')
    if (!existingLeaderboard) {
      await redis.set('track_leaderboard', JSON.stringify([]), { ex: 60 * 60 * 24 * 365 })
      console.log('✅ Initialized empty leaderboard')
    }
    
    // Initialize playlist subscribers list
    const existingSubscribers = await redis.get('playlist_subscribers')
    if (!existingSubscribers) {
      await redis.set('playlist_subscribers', JSON.stringify([]), { ex: 60 * 60 * 24 * 365 })
      console.log('✅ Initialized playlist subscribers list')
    }
    
    console.log('✅ Database initialization complete')
  } catch (error) {
    console.error('❌ Database initialization failed:', error)
    throw error
  }
}