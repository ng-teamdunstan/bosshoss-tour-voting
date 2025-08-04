// src/app/voting/page.tsx - SERVER-SIDE VERSION
'use client'

import { useState, useEffect, useCallback } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import { Music, ArrowLeft, Vote, Trophy, ListMusic, Star, Play, Clock, RefreshCw, Server } from 'lucide-react'
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

export default function VotingPage() {
  const { data: session, status } = useSession()
  const router = useRouter()

  // State declarations mit Server-Caching
  const [loading, setLoading] = useState(true)
  const [serverLoading, setServerLoading] = useState(false)
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
  
  // Server-Caching states
  const [dataLoaded, setDataLoaded] = useState(false)
  const [lastLoadTime, setLastLoadTime] = useState<number>(0)
  const [userHistoryLoaded, setUserHistoryLoaded] = useState(false)
  const [dataSource, setDataSource] = useState<'server-cache' | 'server-fresh' | 'loading'>('loading')

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

  // SERVER-SIDE BossHoss Data Loading - SUPER FAST!
  const loadBossHossData = useCallback(async (forceRefresh: boolean = false) => {
    try {
      setLoading(true)
      setServerLoading(true)
      
      console.log('📡 Loading BossHoss data from server...')
      
      // Call our server API instead of Spotify directly
      const url = forceRefresh ? '/api/bosshoss-data?refresh=true' : '/api/bosshoss-data'
      const response = await fetch(url, {
        cache: forceRefresh ? 'no-cache' : 'default'
      })
      
      if (!response.ok) {
        throw new Error(`Server error: ${response.status}`)
      }
      
      const result = await response.json()
      
      if (!result.success) {
        throw new Error(result.error || 'Failed to load data from server')
      }
      
      // Server hat Daten zurückgegeben!
      setBosshossAlbums(result.data)
      setDataSource(result.cached ? 'server-cache' : 'server-fresh')
      
      // Expand first 2 releases by default
      const initialExpanded: ExpandedAlbums = {}
      result.data.slice(0, 2).forEach((album: any) => {
        initialExpanded[album.id] = true
      })
      setExpandedAlbums(initialExpanded)
      
      setDataLoaded(true)
      setLastLoadTime(result.lastUpdate)
      
      const loadType = result.cached ? 'cached (instant!)' : result.stale ? 'stale cache' : 'fresh'
      console.log(`✅ BossHoss data loaded from server ${loadType}`)
      
      if (result.cached) {
        console.log('⚡ INSTANT LOADING - No API calls needed!')
      } else {
        console.log('🔄 Server loaded fresh data - all users benefit for 24h!')
      }
      
      setLoading(false)
      setServerLoading(false)
      
    } catch (error) {
      console.error('❌ Error loading BossHoss data from server:', error)
      setLoading(false)
      setServerLoading(false)
      
      alert('Fehler beim Laden der BossHoss Songs vom Server. Bitte versuche es nochmal.')
    }
  }, [])

  // User History Loading - weiterhin client-side (user-spezifisch)
  const loadUserListeningHistory = useCallback(async (forceRefresh: boolean = false) => {
    if (!forceRefresh && userHistoryLoaded) {
      console.log('🎧 Using cached user history data')
      return
    }

    try {
      const userSession = session as any
      console.log('🎧 Loading user listening history...')

      // Get recently played tracks (last 50)
      const recentData = await fetchSpotifyJSON(
        'https://api.spotify.com/v1/me/player/recently-played?limit=50',
        userSession.accessToken
      )
      
      const recentTrackIds = recentData.items?.map((item: { track: { id: string } }) => item.track.id) || []
      setRecentTracks(recentTrackIds)
      console.log(`✅ Found ${recentTrackIds.length} recent tracks`)

      // Kleine Pause zwischen API-Aufrufen
      await new Promise(resolve => setTimeout(resolve, 300))

      // Get top tracks (long term = ~1 year)
      const topData = await fetchSpotifyJSON(
        'https://api.spotify.com/v1/me/top/tracks?time_range=long_term&limit=50',
        userSession.accessToken
      )
      
      const topTrackIds = topData.items?.map((item: { id: string }) => item.id) || []
      setTopTracks(topTrackIds)
      console.log(`✅ Found ${topTrackIds.length} top tracks`)
      
      setUserHistoryLoaded(true)
      
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

  // Force refresh function - triggers server refresh
  const forceRefreshData = async () => {
    console.log('🔄 Force refreshing data from server...')
    setDataLoaded(false)
    setUserHistoryLoaded(false)
    setLastLoadTime(0)
    
    try {
      await loadBossHossData(true) // Force server refresh
      await loadUserListeningHistory(true)
      await loadUserVotingStatus()
      await loadPlaylistStatus()
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
      // Voting Status und Playlist Status immer neu laden
      await loadUserVotingStatus()
      await loadPlaylistStatus()
      
      // BossHoss Daten vom Server laden (super schnell!)
      await loadBossHossData()
      
      // User History laden (weiterhin client-side)
      await loadUserListeningHistory()
    }
    
    loadInitialData()
  }, [session, loadBossHossData, loadUserListeningHistory])

  if (status === 'loading' || loading) {
    const loadingMessage = serverLoading ? 
      (dataSource === 'server-fresh' ? 'Server lädt frische Daten...' : 'Loading von Server...') :
      'Loading BossHoss Songs...'
    
    return (
      <div className="min-h-screen bg-gradient-to-b from-amber-50 to-amber-100 flex items-center justify-center">
        <div className="text-center max-w-md">
          <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-amber-600 mx-auto mb-4"></div>
          <p className="text-amber-800 font-semibold mb-2">{loadingMessage}</p>
          
          {serverLoading && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mt-4">
              <div className="flex items-center justify-center space-x-2 text-blue-700">
                <Server className="w-4 h-4" />
                <span className="text-sm">Server-Side Loading - Viel schneller!</span>
              </div>
            </div>
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
        {/* Instructions mit Server-Info */}
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
              <div className="text-xs text-gray-500 flex items-center space-x-2">
                <Server className="w-4 h-4" />
                <span>
                  {dataSource === 'server-cache' && <span className="text-green-600">⚡ Server Cache (instant)</span>}
                  {dataSource === 'server-fresh' && <span className="text-blue-600">🔄 Server Fresh (24h cache)</span>}
                  {lastLoadTime > 0 && <span> • {new Date(lastLoadTime).toLocaleTimeString('de-DE')}</span>}
                </span>
              </div>
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