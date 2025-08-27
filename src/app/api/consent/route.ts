// src/app/api/consent/route.ts - Vereinfachte Version
import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { kv } from '@vercel/kv'

export interface UserConsent {
  userId: string
  timestamp: number
  ipAddress?: string | null  // ✅ null ist erlaubt
  required: {
    terms: boolean
    privacy: boolean
    spotifyBasicData: boolean
    playlistAccess: boolean
  }
  optional: {
    newsletter: boolean
  }
  version: string
}

// POST: Consent nach Spotify-Login speichern
export async function POST(request: NextRequest) {
  try {
    const session: any = await getServerSession(authOptions)
    
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
    }

    const body = await request.json()
    
    // Validierung
    if (!body.required?.terms || !body.required?.privacy || 
        !body.required?.spotifyBasicData || !body.required?.playlistAccess) {
      return NextResponse.json({ 
        success: false, 
        error: 'Required consents missing' 
      }, { status: 400 })
    }

    const userConsent: UserConsent = {
      userId: session.user.email,
      timestamp: body.timestamp || Date.now(),
      ipAddress: request.ip || request.headers.get('x-forwarded-for'),
      required: body.required,
      optional: body.optional || {},
      version: '1.0'
    }

    // In Vercel KV speichern
    await kv.set(`consent:${session.user.email}`, userConsent)
    
    // Newsletter-Integration entfernt
    
    console.log(`✅ Consent saved for: ${session.user.email}`)
    
    return NextResponse.json({ 
      success: true, 
      message: 'Consent erfolgreich gespeichert'
    })

  } catch (error) {
    console.error('❌ Consent save error:', error)
    return NextResponse.json({ 
      success: false, 
      error: 'Fehler beim Speichern' 
    }, { status: 500 })
  }
}

// GET: Consent-Status abrufen
export async function GET() {
  try {
    const session: any = await getServerSession(authOptions)
    
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
    }

    const consent = await kv.get<UserConsent>(`consent:${session.user.email}`)
    
    if (!consent) {
      return NextResponse.json({ 
        success: false, 
        requiresConsent: true,
        message: 'No consent found' 
      })
    }

    return NextResponse.json({
      success: true,
      consent: consent,
      requiresConsent: false
    })

  } catch (error) {
    console.error('❌ Get consent error:', error)
    return NextResponse.json({ 
      success: false, 
      error: 'Server error' 
    }, { status: 500 })
  }
}

// PATCH: Consent-Einstellungen aktualisieren (vereinfacht ohne Newsletter)
export async function PATCH(request: NextRequest) {
  try {
    const session: any = await getServerSession(authOptions)
    
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
    }

    const updates = await request.json()
    const existingConsent = await kv.get<UserConsent>(`consent:${session.user.email}`)
    
    if (!existingConsent) {
      return NextResponse.json({ 
        success: false, 
        error: 'No consent found' 
      }, { status: 404 })
    }

    // Update nur optionale Einstellungen (aktuell keine vorhanden, aber für Zukunft)
    const updatedConsent: UserConsent = {
      ...existingConsent,
      optional: {
        ...existingConsent.optional,
        ...updates.optional
      },
      timestamp: Date.now() // Update timestamp
    }

    await kv.set(`consent:${session.user.email}`, updatedConsent)

    return NextResponse.json({ 
      success: true, 
      message: 'Einstellungen aktualisiert',
      consent: updatedConsent
    })

  } catch (error) {
    console.error('❌ Update consent error:', error)
    return NextResponse.json({ 
      success: false, 
      error: 'Update failed' 
    }, { status: 500 })
  }
}

// DELETE: Account & Consent löschen (DSGVO Art. 17)
export async function DELETE() {
  try {
    const session: any = await getServerSession(authOptions)
    
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
    }

    const userId = session.user.email

    // 1. Consent löschen
    await kv.del(`consent:${userId}`)
    
    // 2. Alle Voting-Daten löschen
    await deleteAllUserVotingData(userId)
    
    // Newsletter-Abmeldung entfernt
    
    console.log(`🗑️ Complete data deletion for: ${userId}`)
    
    return NextResponse.json({ 
      success: true, 
      message: 'Alle Daten erfolgreich gelöscht' 
    })

  } catch (error) {
    console.error('❌ Delete consent error:', error)
    return NextResponse.json({ 
      success: false, 
      error: 'Löschung fehlgeschlagen' 
    }, { status: 500 })
  }
}

// Helper: Alle Voting-Daten löschen (DSGVO-konform)
async function deleteAllUserVotingData(userId: string) {
  try {
    // Alle User-Voting-Sessions finden und löschen
    const keys = await kv.keys(`user_votes:${userId}:*`)
    
    if (keys.length > 0) {
      await kv.del(...keys)
      console.log(`🗑️ Deleted ${keys.length} voting sessions for ${userId}`)
    }
    
    // Weitere mögliche User-Daten
    const additionalKeys = [
      `user_profile:${userId}`,
      `user_preferences:${userId}`,
      `playlist_subscription:${userId}`
    ]
    
    for (const key of additionalKeys) {
      try {
        await kv.del(key)
      } catch {
        // Key existiert nicht - das ist ok
      }
    }
    
  } catch (error) {
    console.error('Error deleting user voting data:', error)
    throw error
  }
}