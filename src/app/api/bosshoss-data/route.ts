// src/app/api/bosshoss-data/route.ts - OPTIMIERT für Speed
import { NextRequest, NextResponse } from 'next/server'

// Global Cache (in Memory - funktioniert für die meisten Fälle)
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

// KURZE Cache-Dauer für schnellere Updates bei neuen Releases
const CACHE_DURATION = 6 * 60 * 60 * 1000 // 6 Stunden statt 24h
const BACKGROUND_REFRESH_THRESHOLD = 4 * 60 * 60 * 1000 // 4 Stunden

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const forceRefresh = searchParams.get('refresh') === 'true'
    
    console.log('📡 BossHoss data request received')
    
    // Cache Check: Sind Daten frisch genug für sofortigen Return?
    const now = Date.now()
    const cacheAge = now - globalBossHossCache.lastUpdate
    const isCacheFresh = globalBossHossCache.data && cacheAge < CACHE_DURATION
    const shouldBackgroundRefresh = globalBossHossCache.data && cacheAge > BACKGROUND_REFRESH_THRESHOLD
    
    // SOFORTIGER RETURN wenn Cache vorhanden (auch wenn älter)
    if (!forceRefresh && globalBossHossCache.data) {
      console.log(`✅ Serving cached data immediately (age: ${Math.round(cacheAge/1000/60)}min)`)
      
      // Background Refresh starten wenn nötig (User wartet NICHT!)
      if (shouldBackgroundRefresh && !globalBossHossCache.isLoading) {
        console.log('🔄 Starting background refresh (user doesn\'t wait)')
        refreshCacheInBackground()
      }
      
      return NextResponse.json({
        success: true,
        data: globalBossHossCache.data,
        cached: true,
        cacheAge: Math.round(cacheAge / 1000 / 60), // in Minuten
        backgroundRefresh: shouldBackgroundRefresh,
        lastUpdate: globalBossHossCache.lastUpdate,
        loadTime: '~200ms (instant from cache)'
      })
    }
    
    // Falls kein Cache und bereits loading: User wartet kurz
    if (globalBossHossCache.isLoading && globalBossHossCache.loadingPromise) {
      console.log('⏳ Fresh load in progress, user waits...')
      try {
        const data = await Promise.race([
          globalBossHossCache.loadingPromise,
          new Promise((_, reject) => setTimeout(() => reject(new Error('timeout')), 10000)) // 10s timeout
        ])
        
        return NextResponse.json({
          success: true,
          data: data,
          cached: false,
          loadTime: '~5-10s (waited for fresh load)'
        })
      } catch (error) {
        console.log('⏰ Load taking too long, will return placeholder or old cache')
      }
    }
    
    // Erste Anfrage oder Force Refresh: Fresh Load
    console.log('🔄 Loading fresh data (first time or force refresh)')
    return await loadFreshData()
    
  } catch (error) {
    console.error('❌ Server error:', error)
    
    // Fallback: Alte Daten zurückgeben wenn vorhanden
    if (globalBossHossCache.data) {
      return NextResponse.json({
        success: true,
        data: globalBossHossCache.data,
        cached: true,
        stale: true,
        error: 'Server error, serving cached data'
      })
    }
    
    return NextResponse.json({
      success: false,
      error: 'Server error and no cache available'
    }, { status: 500 })
  }
}

// Background Refresh (User wartet NICHT!)
async function refreshCacheInBackground(): Promise<void> {
  if (globalBossHossCache.isLoading) return
  
  try {
    globalBossHossCache.isLoading = true
    console.log('🔄 Background refresh started...')
    
    const freshData = await loadBossHossDataFromSpotify()
    
    globalBossHossCache.data = freshData
    globalBossHossCache.lastUpdate = Date.now()
    globalBossHossCache.isLoading = false
    globalBossHossCache.loadingPromise = null
    
    console.log('✅ Background refresh completed')
  } catch (error) {
    console.error('❌ Background refresh failed:', error)
    globalBossHossCache.isLoading = false
    globalBossHossCache.loadingPromise = null
  }
}

// Fresh Load (nur wenn wirklich nötig)
async function loadFreshData() {
  if (globalBossHossCache.isLoading && globalBossHossCache.loadingPromise) {
    return globalBossHossCache.loadingPromise
  }
  
  globalBossHossCache.isLoading = true
  globalBossHossCache.loadingPromise = loadBossHossDataFromSpotify()
  
  try {
    const freshData = await globalBossHossCache.loadingPromise
    
    globalBossHossCache.data = freshData
    globalBossHossCache.lastUpdate = Date.now()
    globalBossHossCache.isLoading = false
    globalBossHossCache.loadingPromise = null
    
    return NextResponse.json({
      success: true,
      data: freshData,
      cached: false,
      loadTime: '~10-20s (fresh load, cached for next users)'
    })
    
  } catch (error) {
    globalBossHossCache.isLoading = false
    globalBossHossCache.loadingPromise = null
    throw error
  }
}

// OPTIMIERTES Spotify Loading - Viel schneller!
async function loadBossHossDataFromSpotify(): Promise<any[]> {
  console.log('🎵 Loading BossHoss data from Spotify (OPTIMIZED)...')
  
  try {
    // 1. Get Token
    const tokenResponse = await fetch('https://accounts.spotify.com/api/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Authorization': `Basic ${Buffer.from(`${process.env.SPOTIFY_CLIENT_ID}:${process.env.SPOTIFY_CLIENT_SECRET}`).toString('base64')}`
      },
      body: 'grant_type=client_credentials'
    })
    
    const tokenData = await tokenResponse.json()
    const accessToken = tokenData.access_token
    
    // 2. Search Artist
    const artistResponse = await fetchSpotifyOptimized(
      'https://api.spotify.com/v1/search?q=artist:BossHoss&type=artist&limit=1',
      accessToken
    )
    
    const artistId = artistResponse.artists.items[0].id
    
    // 3. Get Albums
    const albumsResponse = await fetchSpotifyOptimized(
      `https://api.spotify.com/v1/artists/${artistId}/albums?include_groups=album,single&market=DE&limit=50`,
      accessToken
    )
    
    const sortedAlbums = albumsResponse.items.sort((a: any, b: any) => {
      return new Date(b.release_date).getTime() - new Date(a.release_date).getTime()
    })
    
    // 4. PARALLELES Loading mit größeren Batches - VIEL SCHNELLER!
    console.log(`🚀 Fast-loading ${sortedAlbums.length} albums...`)
    
    const BATCH_SIZE = 8 // Größere Batches
    const DELAY_MS = 500  // Kürzere Pausen
    const albumsWithTracks = []
    
    for (let i = 0; i < sortedAlbums.length; i += BATCH_SIZE) {
      const batch = sortedAlbums.slice(i, i + BATCH_SIZE)
      
      console.log(`⚡ Fast batch ${Math.floor(i/BATCH_SIZE) + 1}/${Math.ceil(sortedAlbums.length/BATCH_SIZE)}`)
      
      // Parallel loading innerhalb Batch
      const batchResults = await Promise.all(
        batch.map(async (album: any, index: number) => {
          // Kurze Staggering
          if (index > 0) {
            await new Promise(resolve => setTimeout(resolve, index * 100))
          }
          
          try {
            const tracksResponse = await fetchSpotifyOptimized(
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
            console.error(`Error loading ${album.name}:`, error)
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
      
      // Kurze Pause zwischen Batches
      if (i + BATCH_SIZE < sortedAlbums.length) {
        await new Promise(resolve => setTimeout(resolve, DELAY_MS))
      }
    }
    
    console.log(`✅ Fast-loaded ${albumsWithTracks.length} albums successfully!`)
    return albumsWithTracks
    
  } catch (error) {
    console.error('❌ Error in fast loading:', error)
    throw error
  }
}

// Optimierte Spotify API Calls - weniger Retries, schnellere Timeouts
async function fetchSpotifyOptimized(url: string, accessToken: string): Promise<any> {
  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), 10000) // 10s timeout
  
  try {
    const response = await fetch(url, {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      },
      signal: controller.signal
    })
    
    clearTimeout(timeoutId)
    
    if (response.status === 429) {
      const retryAfter = response.headers.get('Retry-After')
      const waitTime = retryAfter ? Math.min(parseInt(retryAfter) * 1000, 5000) : 2000 // Max 5s wait
      
      console.log(`⏸️ Rate limited, waiting ${waitTime/1000}s`)
      await new Promise(resolve => setTimeout(resolve, waitTime))
      
      // Ein Retry
      return fetchSpotifyOptimized(url, accessToken)
    }
    
    if (!response.ok) {
      throw new Error(`Spotify API Error: ${response.status}`)
    }
    
    return await response.json()
    
  } catch (error) {
    clearTimeout(timeoutId)
    if ((error as Error).name === 'AbortError') {
      throw new Error('Request timeout')
    }
    throw error
  }
}