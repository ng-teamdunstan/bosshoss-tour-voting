// src/app/api/test-vote-fix/route.ts - DIRECT VOTE TEST
import { NextRequest, NextResponse } from 'next/server'
import { submitVote } from '@/lib/database'

export async function POST(request: NextRequest) {
  try {
    console.log('🧪 TESTING VOTE SUBMISSION WITH FIX...')
    
    // Simulate a test vote
    const testVote = {
      userId: 'test_user_' + Date.now(),
      trackId: '4uLU6hMCjSI75M1A2tKUQC', // Known BossHoss track
      points: 3,
      trackName: 'Test Song',
      artistName: 'The BossHoss',
      albumName: 'Test Album',
      timestamp: Date.now()
    }
    
    console.log('🎯 Submitting test vote:', testVote)
    
    const result = await submitVote(testVote)
    
    console.log('📊 Vote result:', result)
    
    return NextResponse.json({
      success: true,
      testVote,
      submitResult: result,
      timestamp: new Date().toISOString()
    })
    
  } catch (error) {
    console.error('🔥 TEST VOTE ERROR:', error)
    return NextResponse.json({ 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error'
    })
  }
}

export async function GET() {
  return NextResponse.json({ 
    message: 'Use POST to test vote submission',
    endpoint: '/api/test-vote-fix'
  })
}