'use client'

import { useState, useEffect, useCallback } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import { Music, ArrowLeft, Vote, Trophy, ListMusic, Star, Play, Clock, RefreshCw } from 'lucide-react'
import { fetchSpotifyJSON, processBatches } from '@/lib/spotify-utils'

// Interfaces - vor ihrer Verwendung deklariert
interface SpotifyImage {
  url: string
  height: number
  width: number
}

interface SpotifyArtist {
  id: string
  name: string
}

interface SpotifyTrack {
  id: string
  name: string
  artists: SpotifyArtist[]
  album: {
    name: string
    images: SpotifyImage[]
    release_date: string
  }
}

interface SpotifyAlbum {
  id: string
  name: string
  release_date: string
  images: SpotifyImage[]
  album_type: string
  tracks: SpotifyTrack[]
}

interface VotingResult {
  trackId: string
  trackName: string
  artistName: string
  albumName: string
  totalPoints: number
  totalVotes: number
  rank: number
}

interface ExpandedAlbums {
  [albumId: string]: boolean
}

interface PlaylistStatus {
  hasPlaylist: boolean
  playlist?: { id: string; name: string; url: string }
}

export default function VotingPage() {
  const { data: session, status } = useSession()
  const router = useRouter()

  // State declarations mit Caching
  const [loading, setLoading] = useState(true)
  const [loadingProgress, setLoadingProgress] = useState({ loaded: 0, total: 0 })
  const [bosshossAlbums, setBosshossAlbums] = useState<SpotifyAlbum[]>([])
  const [expandedAlbums, setExpandedAlbums] = useState<ExpandedAlbums>({})
  const [recentTracks, setRecentTracks] = useState<string[]>([])
  const [topTracks, setTopTracks] = useState<string[]>([])
  const [remainingVotes, setRemainingVotes] = useState(10)
  const [votedTracks, setVotedTracks] = useState<string[]>([])
  const [submitting, setSubmitting] = useState(false)
  const [showResults, setShowResults] = useState(false)
  const [votingResults, setVotingResults] = useState<VotingResult[]>([])
  const [playlistStatus, setPlaylistStatus] = useState<PlaylistStatus>({ hasPlaylist: false })
  const [creatingPlaylist, setCreatingPlaylist] = useState(false)
  
  // Caching states
  const [dataLoaded, setDataLoaded] = useState(false)
  const [lastLoadTime, setLastLoadTime] = useState<number>(0)
  const [userHistoryLoaded, setUserHistoryLoaded] = useState(false)

  // Redirect if not logged in
  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/')
    }
  }, [status, router])

  // Helper functions - vor ihrer Verwendung deklariert
  const getVoteMultiplier = (trackId: string) => {
    if (topTracks.includes(trackId)) return 5
    if (recentTracks.includes(trackId)) return 3
    return 1
  }

  const getVoteLabel = (trackId: string) => {
    const multiplier = getVoteMultiplier(trackId)
    if (multiplier === 5) return '🔥 DEIN TOP TRACK (5x Punkte)'
    if (multiplier === 3) return '🎵 KÜRZLICH GEHÖRT (3x Punkte)'
    return '⭐ NORMALE STIMME (1x Punkt)'
  }

  const hasVoted = (trackId: string) => {
    return votedTracks.includes(trackId)
  }

  // Cache Helper Functions - OPTIMIERT für Production
  const isDataFresh = (lastLoad: number, maxAgeMinutes: number): boolean => {
    const now = Date.now()
    const maxAge = maxAgeMinutes * 60 * 1000 // Convert to milliseconds
    return (now - lastLoad) < maxAge
  }

  const shouldLoadBossHossData = (): boolean => {
    // BossHoss Alben ändern sich praktisch NIE (nur 1 Single + 1 Album in 5 Wochen)
    // 24 STUNDEN Cache ist perfekt!
    return !dataLoaded || !isDataFresh(lastLoadTime, 24 * 60) // 24 Stunden
  }

  const shouldLoadUserHistory = (): boolean => {
    // User History ändert sich nicht so schnell
    // 30 MINUTEN Cache ist ausreichend
    return !userHistoryLoaded || !isDataFresh(lastLoadTime, 30) // 30 Minuten
  }

  // Optimierte Album-Loading Funktion - Production Ready
  const loadAlbumsOptimized = async (
    albums: any[],
    accessToken: string,
    onProgress: (loaded: number, total: number) => void
  ): Promise<any[]> => {
    const BATCH_SIZE = 5      // Reduziert von 8 auf 5 (sicherer)
    const DELAY_MS = 500      // Erhöht von 300ms auf 500ms (sicherer)
    
    // Sortiere Alben nach Wichtigkeit (neueste zuerst)
    const sortedAlbums = albums.sort((a: any, b: any) => {
      return new Date(b.release_date).getTime() - new Date(a.release_date).getTime()
    })
    
    const results: any[] = []
    
    console.log(`🎵 Loading ${sortedAlbums.length} albums in batches of ${BATCH_SIZE} (Production Mode)`)
    
    for (let i = 0; i < sortedAlbums.length; i += BATCH_SIZE) {
      const batch = sortedAlbums.slice(i, i + BATCH_SIZE)
      
      console.log(`📀 Loading batch ${Math.floor(i/BATCH_SIZE) + 1}/${Math.ceil(sortedAlbums.length/BATCH_SIZE)}`)
      
      try {
        // Parallele Verarbeitung innerhalb des Batches mit Staggering
        const batchResults = await Promise.all(
          batch.map(async (album: any, index: number) => {
            // Staggered loading - 75ms zwischen parallel requests (erhöht von 50ms)
            if (index > 0) {
              await new Promise(resolve => setTimeout(resolve, index * 75))
            }
            
            try {
              console.log(`🎶 Loading tracks for: ${album.name}`)
              
              const tracksData = await fetchSpotifyJSON(
                `https://api.spotify.com/v1/albums/${album.id}/tracks?market=DE`,
                accessToken
              )
              
              return {
                id: album.id,
                name: album.name,
                release_date: album.release_date,
                images: album.images,
                album_type: album.album_type,
                tracks: tracksData.items?.map((track: any) => ({
                  ...track,
                  album: {
                    name: album.name,
                    images: album.images,
                    release_date: album.release_date
                  }
                })) || []
              }
              
            } catch (error) {
              console.error(`❌ Error loading tracks for album ${album.name}:`, error)
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
        
        results.push(...batchResults)
        
        // Progress Callback
        onProgress(results.length, sortedAlbums.length)
        
        // Pause zwischen Batches (erhöht für mehr Sicherheit)
        if (i + BATCH_SIZE < sortedAlbums.length) {
          console.log(`⏸️  Cooling down for ${DELAY_MS}ms...`)
          await new Promise(resolve => setTimeout(resolve, DELAY_MS))
        }
        
      } catch (error) {
        console.error(`❌ Batch ${Math.floor(i/BATCH_SIZE) + 1} failed:`, error)
        continue
      }
    }
    
    return results
  }

  // Main data loading functions wrapped in useCallback
  const loadBossHossData = useCallback(async (forceRefresh: boolean = false) => {
    // Cache Check - nur laden wenn nötig
    if (!forceRefresh && !shouldLoadBossHossData()) {
      console.log('🎵 Using cached BossHoss data')
      setLoading(false)
      return
    }

    try {
      setLoading(true)
      setLoadingProgress({ loaded: 0, total: 0 })
      const userSession = session as any

      console.log('🔍 Loading fresh BossHoss data...')

      // 1. Search for BossHoss artist (sehr schnell)
      const artistData = await fetchSpotifyJSON(
        `https://api.spotify.com/v1/search?q=artist:BossHoss&type=artist&limit=1`,
        userSession.accessToken
      )
      
      if (!artistData.artists?.items?.length) {
        console.error('BossHoss artist not found')
        setLoading(false)
        return
      }

      const artistId = artistData.artists.items[0].id
      console.log('✅ Found BossHoss artist:', artistId)

      // 2. Get all BossHoss albums (sehr schnell)
      console.log('📀 Loading BossHoss albums list...')
      const albumsData = await fetchSpotifyJSON(
        `https://api.spotify.com/v1/artists/${artistId}/albums?include_groups=album,single&market=DE&limit=50`,
        userSession.accessToken
      )

      if (!albumsData.items?.length) {
        console.error('No albums found')
        setLoading(false)
        return
      }

      console.log(`🎵 Found ${albumsData.items.length} albums/singles`)
      setLoadingProgress({ loaded: 0, total: albumsData.items.length })

      // 3. Load tracks for albums - OPTIMIERT mit Progress
      const albumsWithTracks = await loadAlbumsOptimized(
        albumsData.items,
        userSession.accessToken,
        (loaded: number, total: number) => {
          setLoadingProgress({ loaded, total })
        }
      )

      // 4. Albums sind bereits sortiert in loadAlbumsOptimized
      setBosshossAlbums(albumsWithTracks)
      
      // Expand first 2 releases by default
      const initialExpanded: ExpandedAlbums = {}
      albumsWithTracks.slice(0, 2).forEach((album: any) => {
        initialExpanded[album.id] = true
      })
      setExpandedAlbums(initialExpanded)
      
      // Update cache status
      setDataLoaded(true)
      setLastLoadTime(Date.now())
      
      console.log('🎉 BossHoss data loaded and cached successfully!')
      setLoading(false)
      
    } catch (error) {
      console.error('❌ Error loading BossHoss data:', error)
      setLoading(false)
      
      // User-freundliche Fehlermeldung
      alert('Fehler beim Laden der BossHoss Songs. Bitte lade die Seite neu.')
    }
  }, [session, shouldLoadBossHossData, loadAlbumsOptimized])

  const loadUserListeningHistory = useCallback(async (forceRefresh: boolean = false) => {
    // Cache Check - nur laden wenn nötig
    if (!forceRefresh && !shouldLoadUserHistory()) {
      console.log('🎧 Using cached user history data')
      return
    }

    try {
      const userSession = session as any
      console.log('🎧 Loading fresh user listening history...')

      // Get recently played tracks (last 50) mit Retry
      const recentData = await fetchSpotifyJSON(
        'https://api.spotify.com/v1/me/player/recently-played?limit=50',
        userSession.accessToken
      )
      
      const recentTrackIds = recentData.items?.map((item: { track: { id: string } }) => item.track.id) || []
      setRecentTracks(recentTrackIds)
      console.log(`✅ Found ${recentTrackIds.length} recent tracks`)

      // Kleine Pause zwischen API-Aufrufen (reduziert)
      await new Promise(resolve => setTimeout(resolve, 200))

      // Get top tracks (long term = ~1 year) mit Retry
      const topData = await fetchSpotifyJSON(
        'https://api.spotify.com/v1/me/top/tracks?time_range=long_term&limit=50',
        userSession.accessToken
      )
      
      const topTrackIds = topData.items?.map((item: { id: string }) => item.id) || []
      setTopTracks(topTrackIds)
      console.log(`✅ Found ${topTrackIds.length} top tracks`)
      
      // Update cache status
      setUserHistoryLoaded(true)
      
    } catch (error) {
      console.error('❌ Error loading user listening history:', error)
      // Nicht kritisch - App kann ohne diese Daten funktionieren
      setRecentTracks([])
      setTopTracks([])
    }
  }, [session, shouldLoadUserHistory])

  const loadUserVotingStatus = async () => {
    try {
      const response = await fetch('/api/vote')
      const data = await response.json()
      
      if (response.ok) {
        setRemainingVotes(data.votesRemaining)
        setVotedTracks(data.todayVotes.map((vote: { trackId: string }) => vote.trackId))
      }
    } catch (error) {
      console.error('Error loading user voting status:', error)
    }
  }

  const loadPlaylistStatus = async () => {
    try {
      const response = await fetch('/api/playlist')
      const data = await response.json()
      
      if (response.ok) {
        setPlaylistStatus(data)
      }
    } catch (error) {
      console.error('Error loading playlist status:', error)
    }
  }

  const loadCommunityResults = async () => {
    try {
      const response = await fetch('/api/results')
      const data = await response.json()
      
      if (response.ok) {
        setVotingResults(data.topTracks)
        setShowResults(true)
      }
    } catch (error) {
      console.error('Error loading community results:', error)
    }
  }

  // Force refresh function for manual updates
  const forceRefreshData = async () => {
    console.log('🔄 Force refreshing all data...')
    setDataLoaded(false)
    setUserHistoryLoaded(false)
    setLastLoadTime(0)
    setLoading(true)
    
    try {
      await loadBossHossData(true)
      await loadUserListeningHistory(true)
      await loadUserVotingStatus()
      await loadPlaylistStatus()
    } catch (error) {
      console.error('Error during force refresh:', error)
      setLoading(false)
    }
  }

  // Action functions
  const handleVote = async (trackId: string, trackName: string, artistName: string, albumName: string) => {
    if (hasVoted(trackId) || remainingVotes <= 0 || submitting) return

    setSubmitting(true)
    
    try {
      const multiplier = getVoteMultiplier(trackId)
      
      const response = await fetch('/api/vote', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          trackId,
          trackName,
          artistName,
          albumName,
          points: multiplier
        })
      })

      const result = await response.json()

      if (result.success) {
        setVotedTracks([...votedTracks, trackId])
        setRemainingVotes(result.votesRemaining)
        
        const voteTypeText = multiplier === 5 ? 'Super Vote (5x)' : 
                           multiplier === 3 ? 'Super Vote (3x)' : 'Normale Stimme'
        
        alert(`✅ Vote erfolgreich!\n🎵 ${trackName}\n⭐ ${voteTypeText}\n\n${result.votesRemaining} Stimmen übrig.`)
      } else {
        alert(`❌ ${result.error || 'Fehler beim Voten. Bitte versuche es nochmal.'}`)
      }
    } catch (error) {
      console.error('Vote error:', error)
      alert('❌ Fehler beim Voten. Bitte versuche es nochmal.')
    } finally {
      setSubmitting(false)
    }
  }

  const createOrUpdatePlaylist = async () => {
    if (creatingPlaylist) return
    
    setCreatingPlaylist(true)
    
    try {
      const response = await fetch('/api/playlist', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        }
      })
      
      const result = await response.json()
      
      if (result.success) {
        setPlaylistStatus({
          hasPlaylist: true,
          playlist: result.playlist
        })
        
        alert(`🎉 ${result.message}\n🎵 ${result.tracksCount} Songs hinzugefügt!\n\n🔗 Öffne Spotify um deine Playlist zu sehen.`)
      } else {
        alert(`❌ ${result.error || 'Fehler beim Erstellen der Playlist'}`)
      }
      
    } catch (error) {
      console.error('Error creating playlist:', error)
      alert('Fehler beim Erstellen der Playlist. Bitte versuche es nochmal.')
    } finally {
      setCreatingPlaylist(false)
    }
  }

  const toggleAlbum = (albumId: string) => {
    setExpandedAlbums(prev => ({
      ...prev,
      [albumId]: !prev[albumId]
    }))
  }

  // Load data when session is available - mit intelligentem Caching
  useEffect(() => {
    if (!session) return
    
    const userSession = session as any
    if (!userSession.accessToken) return

    const loadInitialData = async () => {
      // Voting Status und Playlist Status immer neu laden (ändern sich häufig)
      await loadUserVotingStatus()
      await loadPlaylistStatus()
      
      // BossHoss Daten und User History nur laden wenn nötig (mit Cache)
      await loadBossHossData()
      await loadUserListeningHistory()
    }
    
    loadInitialData()
  }, [session, loadBossHossData, loadUserListeningHistory])

  if (status === 'loading' || loading) {
    const progress = loadingProgress.total > 0 ? (loadingProgress.loaded / loadingProgress.total) * 100 : 0
    
    return (
      <div className="min-h-screen bg-gradient-to-b from-amber-50 to-amber-100 flex items-center justify-center">
        <div className="text-center max-w-md">
          <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-amber-600 mx-auto mb-4"></div>
          <p className="text-amber-800 font-semibold mb-2">Loading BossHoss Songs...</p>
          
          {loadingProgress.total > 0 && (
            <>
              <div className="w-full bg-amber-200 rounded-full h-2 mb-2">
                <div 
                  className="bg-amber-600 h-2 rounded-full transition-all duration-300"
                  style={{ width: `${progress}%` }}
                ></div>
              </div>
              <p className="text-amber-600 text-sm">
                {loadingProgress.loaded} / {loadingProgress.total} Alben geladen ({Math.round(progress)}%)
              </p>
            </>
          )}
        </div>
      </div>
    )
  }

  if (!session) {
    return null // Will redirect via useEffect
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-amber-50 via-orange-50 to-red-50">
      {/* Header */}
      <header className="bg-black/90 backdrop-blur-sm border-b-4 border-amber-500 sticky top-0 z-50">
        <div className="max-w-6xl mx-auto px-4 py-4 flex justify-between items-center">
          <div className="flex items-center space-x-3">
            <button 
              onClick={() => router.push('/')}
              className="text-white hover:text-amber-400 transition-colors mr-3"
            >
              <ArrowLeft className="w-6 h-6" />
            </button>
            <div className="w-10 h-10 bg-gradient-to-br from-amber-400 to-orange-500 rounded-full flex items-center justify-center">
              <Music className="w-5 h-5 text-black" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-white">SONG VOTING</h1>
              <p className="text-amber-400 text-sm">Hey {session.user?.name}!</p>
            </div>
          </div>
          
          <div className="flex items-center space-x-4">
            <div className="text-right text-white">
              <p className="text-lg font-bold">{remainingVotes}</p>
              <p className="text-xs text-amber-400">Stimmen übrig</p>
            </div>
            
            <button
              onClick={forceRefreshData}
              disabled={loading}
              className="bg-gray-600 text-white px-3 py-2 rounded-lg font-semibold hover:bg-gray-700 transition-all duration-200 flex items-center space-x-2 disabled:opacity-50"
              title="Daten neu laden"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
              <span className="hidden sm:inline">Refresh</span>
            </button>
            
            <button
              onClick={loadCommunityResults}
              className="bg-gradient-to-r from-purple-600 to-pink-600 text-white px-4 py-2 rounded-lg font-semibold hover:from-purple-700 hover:to-pink-700 transition-all duration-200 flex items-center space-x-2"
            >
              <Trophy className="w-4 h-4" />
              <span>Top 15</span>
            </button>
            
            <button
              onClick={createOrUpdatePlaylist}
              disabled={creatingPlaylist}
              className="bg-green-600 text-white px-4 py-2 rounded-lg font-semibold hover:bg-green-700 transition-all duration-200 flex items-center space-x-2 disabled:opacity-50"
            >
              <ListMusic className="w-4 h-4" />
              <span>{creatingPlaylist ? 'Erstelle...' : (playlistStatus.hasPlaylist ? 'Update Playlist' : 'Erstelle Playlist')}</span>
            </button>
          </div>
        </div>
      </header>

      {/* Community Results Modal */}
      {showResults && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl max-w-2xl w-full max-h-[80vh] overflow-hidden">
            <div className="bg-gradient-to-r from-purple-600 to-pink-600 text-white p-6">
              <div className="flex justify-between items-center">
                <div className="flex items-center space-x-3">
                  <Trophy className="w-8 h-8" />
                  <div>
                    <h2 className="text-2xl font-bold">Community Top 15</h2>
                    <p className="text-purple-200">Back to the Boots Tour 2025</p>
                  </div>
                </div>
                <button
                  onClick={() => setShowResults(false)}
                  className="text-white hover:text-purple-200 text-2xl"
                >
                  ×
                </button>
              </div>
            </div>
            
            <div className="p-6 overflow-y-auto max-h-[60vh]">
              {votingResults.length === 0 ? (
                <p className="text-center text-gray-500 py-8">Noch keine Voting-Ergebnisse verfügbar.</p>
              ) : (
                <div className="space-y-3">
                  {votingResults.map((result) => (
                    <div key={result.trackId} className="flex items-center space-x-4 p-3 bg-gray-50 rounded-lg">
                      <div className="w-8 h-8 bg-gradient-to-r from-purple-500 to-pink-500 rounded-full flex items-center justify-center text-white font-bold text-sm">
                        {result.rank}
                      </div>
                      <div className="flex-1">
                        <h3 className="font-semibold text-gray-800">{result.trackName}</h3>
                        <p className="text-sm text-gray-600">{result.albumName}</p>
                      </div>
                      <div className="text-right">
                        <p className="font-bold text-purple-600">{result.totalPoints} Punkte</p>
                        <p className="text-xs text-gray-500">{result.totalVotes} Stimmen</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Main Content */}
      <main className="max-w-6xl mx-auto px-4 py-8">
        {/* Instructions mit Cache-Info */}
        <div className="bg-white/80 backdrop-blur-sm rounded-xl p-6 mb-8 border border-amber-200">
          <h2 className="text-2xl font-bold text-gray-800 mb-4">🎸 Wähle deine Lieblings-BossHoss Songs</h2>
          <div className="grid md:grid-cols-3 gap-4 text-sm">
            <div className="flex items-center space-x-2">
              <Star className="w-5 h-5 text-amber-500" />
              <span><strong>Normale Stimme:</strong> 1 Punkt</span>
            </div>
            <div className="flex items-center space-x-2">
              <Clock className="w-5 h-5 text-blue-500" />
              <span><strong>Kürzlich gehört:</strong> 3 Punkte</span>
            </div>
            <div className="flex items-center space-x-2">
              <Play className="w-5 h-5 text-red-500" />
              <span><strong>Dein Top Track:</strong> 5 Punkte</span>
            </div>
          </div>
          <div className="flex justify-between items-center mt-3">
            <p className="text-gray-600">Du hast {remainingVotes} Stimmen für heute übrig. Wähle weise!</p>
            {dataLoaded && (
              <p className="text-xs text-gray-500">
                📊 Alben: {new Date(lastLoadTime).toLocaleTimeString('de-DE')}
                {!isDataFresh(lastLoadTime, 24 * 60) && <span className="text-orange-500"> (24h+ alt)</span>}
                {isDataFresh(lastLoadTime, 24 * 60) && <span className="text-green-500"> (✓ 24h Cache)</span>}
              </p>
            )}
          </div>
        </div>

        {/* Albums List */}
        <div className="space-y-6">
          {bosshossAlbums.map((album) => (
            <div key={album.id} className="bg-white/90 backdrop-blur-sm rounded-xl overflow-hidden border border-amber-200 shadow-lg">
              {/* Album Header */}
              <div 
                onClick={() => toggleAlbum(album.id)}
                className="p-6 cursor-pointer hover:bg-amber-50 transition-colors border-b border-amber-100"
              >
                <div className="flex items-center space-x-4">
                  <Image 
                    src={album.images[0]?.url || '/placeholder-album.jpg'} 
                    alt={album.name}
                    width={64}
                    height={64}
                    className="w-16 h-16 rounded-lg shadow-md"
                  />
                  <div className="flex-1">
                    <h3 className="text-xl font-bold text-gray-800">{album.name}</h3>
                    <p className="text-gray-600">{album.album_type === 'album' ? 'Album' : 'Single'} • {new Date(album.release_date).getFullYear()}</p>
                    <p className="text-sm text-gray-500">{album.tracks.length} Songs</p>
                  </div>
                  <div className="text-amber-600">
                    {expandedAlbums[album.id] ? '▼' : '▶'}
                  </div>
                </div>
              </div>

              {/* Tracks List */}
              {expandedAlbums[album.id] && (
                <div className="p-6 space-y-3">
                  {album.tracks.map((track) => (
                    <div key={track.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
                      <div className="flex-1">
                        <h4 className="font-semibold text-gray-800">{track.name}</h4>
                        <p className="text-sm text-gray-600">{track.artists.map(a => a.name).join(', ')}</p>
                        {(recentTracks.includes(track.id) || topTracks.includes(track.id)) && (
                          <p className="text-xs text-blue-600 font-medium mt-1">
                            {getVoteLabel(track.id)}
                          </p>
                        )}
                      </div>
                      
                      <button
                        onClick={() => handleVote(track.id, track.name, track.artists[0].name, album.name)}
                        disabled={hasVoted(track.id) || remainingVotes <= 0 || submitting}
                        className={`px-4 py-2 rounded-lg font-semibold transition-all duration-200 flex items-center space-x-2 ${
                          hasVoted(track.id)
                            ? 'bg-green-100 text-green-700 cursor-not-allowed'
                            : remainingVotes <= 0
                            ? 'bg-gray-200 text-gray-500 cursor-not-allowed'
                            : 'bg-gradient-to-r from-amber-500 to-orange-500 text-white hover:from-amber-600 hover:to-orange-600'
                        }`}
                      >
                        <Vote className="w-4 h-4" />
                        <span>
                          {hasVoted(track.id) 
                            ? 'Gevoted' 
                            : `Vote (${getVoteMultiplier(track.id)}x)`
                          }
                        </span>
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Playlist Status */}
        {playlistStatus.hasPlaylist && (
          <div className="mt-8 bg-green-50 border border-green-200 rounded-xl p-6">
            <div className="flex items-center space-x-3">
              <ListMusic className="w-6 h-6 text-green-600" />
              <div>
                <h3 className="font-semibold text-green-800">Deine Community Playlist ist bereit!</h3>
                <p className="text-green-600 text-sm">&ldquo;{playlistStatus.playlist?.name}&rdquo; wurde in deiner Spotify-Bibliothek erstellt.</p>
                {playlistStatus.playlist?.url && (
                  <a 
                    href={playlistStatus.playlist.url} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="text-green-600 hover:text-green-800 text-sm underline"
                  >
                    → In Spotify öffnen
                  </a>
                )}
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  )
}