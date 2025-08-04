// src/app/api/bosshoss-data/route.ts
import { NextRequest, NextResponse } from 'next/server'

// Global Cache (in Memory - für Production später Redis/Database)
let globalBossHossCache: {
  data: any[] | null
  lastUpdate: number
  isLoading: boolean
  loadingPromise: Promise<any> | null
} = {
  data: null,
  lastUpdate: 0,
  isLoading: false,
  loadingPromise: null
}

// Cache-Dauer: 24 Stunden (BossHoss Alben ändern sich selten)
const CACHE_DURATION = 24 * 60 * 60 * 1000 // 24 Stunden in Millisekunden

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const forceRefresh = searchParams.get('refresh') === 'true'
    
    console.log('📡 BossHoss data request received')
    
    // Cache Check: Sind Daten frisch?
    const isCacheFresh = !forceRefresh && 
                        globalBossHossCache.data && 
                        (Date.now() - globalBossHossCache.lastUpdate < CACHE_DURATION)
    
    if (isCacheFresh) {
      console.log('✅ Serving cached BossHoss data (ultra-fast)')
      return NextResponse.json({
        success: true,
        data: globalBossHossCache.data,
        cached: true,
        lastUpdate: globalBossHossCache.lastUpdate,
        nextUpdate: globalBossHossCache.lastUpdate + CACHE_DURATION,
        loadTime: '~200ms'
      })
    }
    
    // Falls bereits ein anderer Request lädt, auf den warten
    if (globalBossHossCache.isLoading && globalBossHossCache.loadingPromise) {
      console.log('⏳ Another request is loading data, waiting...')
      try {
        const data = await globalBossHossCache.loadingPromise
        return NextResponse.json({
          success: true,
          data: data,
          cached: false,
          lastUpdate: globalBossHossCache.lastUpdate,
          loadTime: '~500ms (waited for parallel load)'
        })
      } catch (error) {
        // Falls parallel loading fehlschlägt, selbst versuchen
        console.log('⚠️ Parallel loading failed, trying ourselves')
      }
    }
    
    // Frische Daten laden
    console.log('🔄 Loading fresh BossHoss data from Spotify...')
    globalBossHossCache.isLoading = true
    
    // Promise speichern damit andere Requests darauf warten können
    globalBossHossCache.loadingPromise = loadBossHossDataFromSpotify()
    
    try {
      const freshData = await globalBossHossCache.loadingPromise
      
      // Cache aktualisieren
      globalBossHossCache.data = freshData
      globalBossHossCache.lastUpdate = Date.now()
      globalBossHossCache.isLoading = false
      globalBossHossCache.loadingPromise = null
      
      console.log('✅ BossHoss data loaded and cached successfully!')
      
      return NextResponse.json({
        success: true,
        data: freshData,
        cached: false,
        lastUpdate: globalBossHossCache.lastUpdate,
        nextUpdate: globalBossHossCache.lastUpdate + CACHE_DURATION,
        loadTime: '~2-3min (fresh load, serves all users for 24h)'
      })
      
    } catch (error) {
      // Loading fehlgeschlagen
      globalBossHossCache.isLoading = false
      globalBossHossCache.loadingPromise = null
      
      console.error('❌ Error loading BossHoss data:', error)
      
      // Falls alte Daten vorhanden, die zurückgeben
      if (globalBossHossCache.data) {
        console.log('🔄 Serving stale data due to loading error')
        return NextResponse.json({
          success: true,
          data: globalBossHossCache.data,
          cached: true,
          stale: true,
          error: 'Failed to load fresh data, serving cached version',
          lastUpdate: globalBossHossCache.lastUpdate
        })
      }
      
      return NextResponse.json({
        success: false,
        error: 'Failed to load BossHoss data and no cache available',
        message: 'Please try again in a few minutes'
      }, { status: 500 })
    }
    
  } catch (error) {
    console.error('❌ Server error:', error)
    return NextResponse.json({
      success: false,
      error: 'Internal server error'
    }, { status: 500 })
  }
}

// Spotify API Loading Funktion - läuft auf Server mit Client Credentials
async function loadBossHossDataFromSpotify(): Promise<any[]> {
  console.log('🎵 Starting Spotify API data loading...')
  
  try {
    // 1. Get Spotify App Token (Client Credentials - nicht User-abhängig!)
    console.log('🔑 Getting Spotify app token...')
    const tokenResponse = await fetch('https://accounts.spotify.com/api/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Authorization': `Basic ${Buffer.from(`${process.env.SPOTIFY_CLIENT_ID}:${process.env.SPOTIFY_CLIENT_SECRET}`).toString('base64')}`
      },
      body: 'grant_type=client_credentials'
    })
    
    if (!tokenResponse.ok) {
      throw new Error(`Failed to get Spotify token: ${tokenResponse.status}`)
    }
    
    const tokenData = await tokenResponse.json()
    const accessToken = tokenData.access_token
    
    console.log('✅ Spotify app token obtained')
    
    // 2. Search for BossHoss Artist
    console.log('🔍 Searching for BossHoss artist...')
    const artistResponse = await fetchSpotifyWithRetry(
      'https://api.spotify.com/v1/search?q=artist:BossHoss&type=artist&limit=1',
      accessToken
    )
    
    if (!artistResponse.artists?.items?.length) {
      throw new Error('BossHoss artist not found')
    }
    
    const artistId = artistResponse.artists.items[0].id
    console.log(`✅ Found BossHoss artist: ${artistId}`)
    
    // 3. Get Albums
    console.log('📀 Loading BossHoss albums...')
    const albumsResponse = await fetchSpotifyWithRetry(
      `https://api.spotify.com/v1/artists/${artistId}/albums?include_groups=album,single&market=DE&limit=50`,
      accessToken
    )
    
    if (!albumsResponse.items?.length) {
      throw new Error('No albums found')
    }
    
    console.log(`🎵 Found ${albumsResponse.items.length} albums/singles`)
    
    // 4. Get Tracks for each Album - ULTRA CONSERVATIVE SERVER-SIDE
    const albumsWithTracks = []
    
    // Sortiere Filtern nach Release-Datum (neueste zuerst)
    const sortedAlbums = albumsResponse.items.sort((a: any, b: any) => {
      return new Date(b.release_date).getTime() - new Date(a.release_date).getTime()
    })
    
    // Server kann sich mehr Zeit lassen - User wartet nicht!
    const BATCH_SIZE = 3
    const DELAY_MS = 2000 // 2 Sekunden zwischen Batches
    
    for (let i = 0; i < sortedAlbums.length; i += BATCH_SIZE) {
      const batch = sortedAlbums.slice(i, i + BATCH_SIZE)
      
      console.log(`📀 Loading tracks batch ${Math.floor(i/BATCH_SIZE) + 1}/${Math.ceil(sortedAlbums.length/BATCH_SIZE)}`)
      
      // Parallel innerhalb Batch, aber mit Delays
      const batchResults = await Promise.all(
        batch.map(async (album: any, index: number) => {
          // Staggered requests
          if (index > 0) {
            await new Promise(resolve => setTimeout(resolve, index * 500))
          }
          
          try {
            console.log(`🎶 Loading tracks for: ${album.name}`)
            
            const tracksResponse = await fetchSpotifyWithRetry(
              `https://api.spotify.com/v1/albums/${album.id}/tracks?market=DE`,
              accessToken
            )
            
            return {
              id: album.id,
              name: album.name,
              release_date: album.release_date,
              images: album.images,
              album_type: album.album_type,
              tracks: tracksResponse.items?.map((track: any) => ({
                ...track,
                album: {
                  name: album.name,
                  images: album.images,
                  release_date: album.release_date
                }
              })) || []
            }
            
          } catch (error) {
            console.error(`❌ Error loading tracks for ${album.name}:`, error)
            // Album ohne Tracks zurückgeben
            return {
              id: album.id,
              name: album.name,
              release_date: album.release_date,
              images: album.images,
              album_type: album.album_type,
              tracks: []
            }
          }
        })
      )
      
      albumsWithTracks.push(...batchResults)
      
      // Pause zwischen Batches
      if (i + BATCH_SIZE < sortedAlbums.length) {
        console.log(`⏸️ Server cooling down for ${DELAY_MS}ms...`)
        await new Promise(resolve => setTimeout(resolve, DELAY_MS))
      }
    }
    
    console.log(`✅ Successfully loaded ${albumsWithTracks.length} albums with tracks`)
    return albumsWithTracks
    
  } catch (error) {
    console.error('❌ Error in loadBossHossDataFromSpotify:', error)
    throw error
  }
}

// Server-Side Spotify API Helper mit Retry Logic
async function fetchSpotifyWithRetry(url: string, accessToken: string, maxRetries: number = 3): Promise<any> {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      console.log(`🔗 Spotify API call: ${url.split('?')[0]}... (attempt ${attempt})`)
      
      const response = await fetch(url, {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        }
      })
      
      if (response.status === 429) {
        const retryAfter = response.headers.get('Retry-After')
        const waitTime = retryAfter ? parseInt(retryAfter) * 1000 : Math.pow(2, attempt) * 2000
        
        console.log(`🚨 Server rate limited. Waiting ${waitTime/1000}s (attempt ${attempt}/${maxRetries})`)
        
        if (attempt < maxRetries) {
          await new Promise(resolve => setTimeout(resolve, waitTime))
          continue
        } else {
          throw new Error(`Rate limited after ${maxRetries} attempts`)
        }
      }
      
      if (!response.ok) {
        throw new Error(`Spotify API Error: ${response.status} ${response.statusText}`)
      }
      
      const data = await response.json()
      console.log(`✅ Spotify API success: ${url.split('?')[0]}...`)
      return data
      
    } catch (error) {
      console.error(`❌ Attempt ${attempt} failed:`, error)
      
      if (attempt === maxRetries) {
        throw error
      }
      
      // Exponential backoff
      const waitTime = Math.pow(2, attempt) * 1000
      console.log(`⏸️ Server backing off for ${waitTime/1000}s...`)
      await new Promise(resolve => setTimeout(resolve, waitTime))
    }
  }
  
  throw new Error('All retry attempts failed')
}