'use client'

import { useState, useEffect, useCallback } from 'react'
import { useSession, signOut } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import { Music, Star, Clock, TrendingUp, Zap, CloudDownload, Server, Vote, ArrowLeft, CheckCircle, ChevronDown, ChevronUp, RefreshCw, Trophy, ListMusic } from 'lucide-react'
import { fetchSpotifyJSON } from '@/lib/spotify-utils'


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

interface ServerResponse {
  success: boolean
  data?: any[]
  cached?: boolean
  cacheAge?: number
  backgroundRefresh?: boolean
  loadTime?: string
  error?: string
  stale?: boolean
}

export default function VotingPage() {
  const { data: session, status } = useSession()
  const router = useRouter()

  // State declarations optimiert für Server-API
  const [loading, setLoading] = useState(true)
  const [serverStatus, setServerStatus] = useState<'loading' | 'cached' | 'fresh' | 'background' | 'error'>('loading')
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
  
  // Server Cache Info
  const [cacheInfo, setCacheInfo] = useState<{
    age: number
    loadTime: string
    backgroundRefresh: boolean
    lastUpdate: number
  }>({
    age: 0,
    loadTime: '',
    backgroundRefresh: false,
    lastUpdate: 0
  })

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

  // OPTIMIZED Server-API BossHoss Data Loading
  const loadBossHossData = useCallback(async (forceRefresh: boolean = false) => {
    try {
      setLoading(true)
      setServerStatus('loading')
      
      console.log('📡 Loading BossHoss data from optimized server...')
      
      // Call optimized server API
      const url = forceRefresh ? '/api/bosshoss-data?refresh=true' : '/api/bosshoss-data'
      const startTime = Date.now()
      
      const response = await fetch(url, {
        cache: forceRefresh ? 'no-cache' : 'default'
      })
      
      const loadTime = Date.now() - startTime
      
      if (!response.ok) {
        throw new Error(`Server error: ${response.status}`)
      }
      
      const result: ServerResponse = await response.json()
      
      if (!result.success) {
        throw new Error(result.error || 'Failed to load data from server')
      }
      
      // Update UI mit Server-Daten
      setBosshossAlbums(result.data || [])
      
      // Server Status für UI
      if (result.cached) {
        if (result.stale) {
          setServerStatus('background')
        } else {
          setServerStatus('cached')
        }
      } else {
        setServerStatus('fresh')
      }
      
      // Cache Info für Status-Anzeige
      setCacheInfo({
        age: result.cacheAge || 0,
        loadTime: result.loadTime || `${loadTime}ms`,
        backgroundRefresh: result.backgroundRefresh || false,
        lastUpdate: Date.now()
      })
      
      // Expand first 2 releases by default
      const initialExpanded: ExpandedAlbums = {}
      if (result.data) {
        result.data.slice(0, 2).forEach((album: any) => {
          initialExpanded[album.id] = true
        })
        setExpandedAlbums(initialExpanded)
      }
      
      // Log Performance
      if (result.cached) {
        console.log(`⚡ INSTANT: Server cache hit (${result.cacheAge}min old, ${loadTime}ms)`)
        if (result.backgroundRefresh) {
          console.log('🔄 Background refresh in progress - data will be fresher soon')
        }
      } else {
        console.log(`🔄 Fresh load: ${loadTime}ms - cached for other users`)
      }
      
      setLoading(false)
      
    } catch (error) {
      console.error('❌ Error loading from server:', error)
      setLoading(false)
      setServerStatus('error')
      
      alert('Fehler beim Laden der BossHoss Songs vom Server. Bitte versuche es nochmal.')
    }
  }, [])

  // User History Loading - weiterhin client-side aber optimiert
  const loadUserListeningHistory = useCallback(async () => {
    try {
      const userSession = session as any
      console.log('🎧 Loading user listening history (optimized)...')

      // Parallel loading für bessere Performance
      const [recentData, topData] = await Promise.all([
        fetchSpotifyJSON(
          'https://api.spotify.com/v1/me/player/recently-played?limit=50',
          userSession.accessToken
        ),
        new Promise(resolve => setTimeout(resolve, 200)).then(() => // Kleine Staggering
          fetchSpotifyJSON(
            'https://api.spotify.com/v1/me/top/tracks?time_range=long_term&limit=50',
            userSession.accessToken
          )
        )
      ])
      
      const recentTrackIds = recentData.items?.map((item: { track: { id: string } }) => item.track.id) || []
      const topTrackIds = topData.items?.map((item: { id: string }) => item.id) || []
      
      setRecentTracks(recentTrackIds)
      setTopTracks(topTrackIds)
      
      console.log(`✅ User history: ${recentTrackIds.length} recent, ${topTrackIds.length} top tracks`)
      
    } catch (error) {
      console.error('❌ Error loading user listening history:', error)
      // Nicht kritisch - App kann ohne diese Daten funktionieren
      setRecentTracks([])
      setTopTracks([])
    }
  }, [session])

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

  // Force refresh - triggers server fresh load
  const forceRefreshData = async () => {
    console.log('🔄 Force refresh from server...')
    
    try {
      // Parallel loading für bessere UX
      await Promise.all([
        loadBossHossData(true), // Force server refresh
        loadUserListeningHistory(),
        loadUserVotingStatus(),
        loadPlaylistStatus()
      ])
    } catch (error) {
      console.error('Error during force refresh:', error)
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

  // Load data when session is available
  useEffect(() => {
    if (!session) return
    
    const userSession = session as any
    if (!userSession.accessToken) return

    const loadInitialData = async () => {
      // Parallel loading für beste Performance
      await Promise.all([
        loadBossHossData(), // Server-cached (instant!)
        loadUserVotingStatus(),
        loadPlaylistStatus()
      ])
      
      // User History nach Server-Daten laden
      await loadUserListeningHistory()
    }
    
    loadInitialData()
  }, [session, loadBossHossData, loadUserListeningHistory])

  // Loading State mit Server-Status
  if (status === 'loading' || loading) {
    let loadingMessage = 'Loading BossHoss Songs...'
    let loadingIcon = null
    
    if (serverStatus === 'cached') {
      loadingMessage = 'Lade von Server Cache...'
      loadingIcon = <Zap className="w-4 h-4 text-green-500" />
    } else if (serverStatus === 'fresh') {
      loadingMessage = 'Server lädt frische Daten...'
      loadingIcon = <CloudDownload className="w-4 h-4 text-blue-500" />
    } else if (serverStatus === 'background') {
      loadingMessage = 'Server aktualisiert im Hintergrund...'
      loadingIcon = <RefreshCw className="w-4 h-4 text-orange-500 animate-spin" />
    }
    
    return (
      <div className="min-h-screen bttb-bg flex items-center justify-center">
        <div className="text-center max-w-md">
          <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-amber-600 mx-auto mb-4"></div>
          <p className="text-amber-800 font-semibold mb-2">{loadingMessage}</p>
          
          <div className="bg-white/80 border border-amber-200 rounded-lg p-4 mt-4">
            <div className="flex items-center justify-center space-x-2 text-gray-700">
              <Server className="w-4 h-4" />
              {loadingIcon}
              <span className="text-sm">Optimized Server Loading</span>
            </div>
            <p className="text-xs text-gray-500 mt-2">
              {serverStatus === 'cached' && '⚡ Instant from cache'}
              {serverStatus === 'fresh' && '🔄 Fresh load (cached for others)'}
              {serverStatus === 'background' && '🚀 Background update in progress'}
            </p>
          </div>
        </div>
      </div>
    )
  }

  if (!session) {
    return null // Will redirect via useEffect
  }

  return (
    <div className="min-h-screen bttb-bg">
      {/* Header - Neue Version */}
<header 
  className="sticky top-0 z-50 border-b-2 border-black"
  style={{ backgroundColor: '#ceae79' }}
>
  <div className="max-w-6xl mx-auto px-4 py-4">
    {/* User Info oben rechts */}
    <div className="flex justify-end mb-2">
      <div className="text-right text-black">
        <p className="font-semibold">Hey {session.user?.name}! 🤠</p>
        <p className="text-sm font-bold">
          {remainingVotes} Stimme{remainingVotes !== 1 ? 'n' : ''} übrig
        </p>
      </div>
    </div>
    
    {/* Logo mittig */}
    <div className="flex justify-center">
      <Image
        src="https://thebosshoss.com/_next/static/media/tbh_bttb.cb9d83ef.webp"
        alt="The BossHoss - Back to the Boots"
        width={280}
        height={100}
        className="h-16 w-auto md:h-20 md:w-auto"
        priority
      />
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
        {/* Voting Instructions - Erweiterte Version mit Buttons */}
<div className="bg-white/90 backdrop-blur-sm rounded-2xl p-6 shadow-lg border border-amber-200 mb-8">
  <h2 className="text-2xl font-bold text-gray-900 mb-4">
    🗳️ Wähle deine Lieblings-BossHoss Songs!
  </h2>
  
  {/* User Info und Navigation - Vereinfacht */}
  <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4">
    <div className="flex items-center space-x-4">
      <button 
        onClick={() => router.push('/')}
        className="flex items-center space-x-2 text-gray-600 hover:text-amber-600 transition-colors"
      >
        <ArrowLeft className="w-5 h-5" />
        <span className="font-semibold">Zurück zur Startseite</span>
      </button>
    </div>
    
    <div className="flex items-center space-x-4">
      <button 
        onClick={() => signOut()}
        className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-full font-semibold transition-colors"
      >
        Abmelden
      </button>
    </div>
  </div>
  
  <p className="text-gray-600 mb-4">
    <strong>Smart Voting:</strong> Deine Stimme zählt mehr, wenn du die Songs auch wirklich hörst! 
    Wir checken deine Spotify-History für faire Gewichtung.
  </p>
  
  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm mb-6">
    <div className="flex items-center space-x-2">
      <Star className="w-5 h-5 text-amber-500" />
      <span><strong>1 Punkt:</strong> Standard Vote für alle Songs</span>
    </div>
    <div className="flex items-center space-x-2">
      <Clock className="w-5 h-5 text-blue-500" />
      <span><strong>3 Punkte:</strong> Du hast den Song kürzlich gehört</span>
    </div>
    <div className="flex items-center space-x-2">
      <TrendingUp className="w-5 h-5 text-red-500" />
      <span><strong>5 Punkte:</strong> Einer deiner meistgehörten Songs</span>
    </div>
  </div>
  
  {/* Action Buttons */}
  <div className="flex flex-wrap gap-3">
    {/* Refresh Button */}
    <button
      onClick={forceRefreshData}
      disabled={loading}
      className="flex items-center space-x-2 bg-gray-600 hover:bg-gray-700 text-white px-4 py-2 rounded-full font-semibold transition-all duration-200 disabled:opacity-50"
      title="Daten neu laden"
    >
      <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
      <span className="hidden sm:inline">Refresh</span>
    </button>
    
    {/* Community Results Button */}
    {votedTracks.length > 0 && (
      <button
        onClick={loadCommunityResults}
        className="flex items-center space-x-2 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white px-4 py-2 rounded-full font-semibold transition-all duration-200"
      >
        <Trophy className="w-4 h-4" />
        <span>Community Top 15</span>
      </button>
    )}
    
    {/* Playlist Button */}
    <button
      onClick={createOrUpdatePlaylist}
      disabled={creatingPlaylist}
      className="flex items-center space-x-2 bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-full font-semibold transition-all duration-200 disabled:opacity-50"
    >
      <ListMusic className="w-4 h-4" />
      <span>
        {creatingPlaylist 
          ? 'Erstelle...' 
          : (playlistStatus.hasPlaylist ? 'Update Playlist' : 'Erstelle Playlist')
        }
      </span>
    </button>
  </div>
  
  {/* Playlist Status */}
  {playlistStatus.hasPlaylist && (
    <div className="mt-4 p-3 bg-green-50 border border-green-200 rounded-lg">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
          <span className="text-green-800 font-semibold text-sm">Playlist aktiv</span>
        </div>
        <a
          href={playlistStatus.playlist?.url}
          target="_blank"
          rel="noopener noreferrer"
          className="bg-green-600 hover:bg-green-700 text-white px-3 py-1 rounded-full text-sm font-semibold transition-colors"
        >
          🎵 In Spotify öffnen
        </a>
      </div>
    </div>
  )}
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