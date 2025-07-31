// src/lib/kv.ts - Vercel KV Connection Setup
import { createClient } from '@vercel/kv'

// Vercel KV client setup
export const kv = createClient({
  url: process.env.KV_REST_API_URL!,
  token: process.env.KV_REST_API_TOKEN!,
})

// Test KV connection
export async function testKVConnection(): Promise<boolean> {
  try {
    await kv.set('test_key', 'test_value', { ex: 10 })
    const result = await kv.get('test_key')
    return result === 'test_value'
  } catch (error) {
    console.error('KV connection test failed:', error)
    return false
  }
}

// Initialize database schema (run once)
export async function initializeDatabase(): Promise<void> {
  try {
    // Initialize empty leaderboard if it doesn't exist
    const existingLeaderboard = await kv.get('track_leaderboard')
    if (!existingLeaderboard) {
      await kv.set('track_leaderboard', [], { ex: 60 * 60 * 24 * 365 }) // 1 year expiry
      console.log('✅ Initialized empty leaderboard')
    }
    
    // Initialize playlist subscribers list
    const existingSubscribers = await kv.get('playlist_subscribers')
    if (!existingSubscribers) {
      await kv.set('playlist_subscribers', [], { ex: 60 * 60 * 24 * 365 }) // 1 year expiry
      console.log('✅ Initialized playlist subscribers list')
    }
    
    console.log('✅ Database initialization complete')
  } catch (error) {
    console.error('❌ Database initialization failed:', error)
    throw error
  }
}