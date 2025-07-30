'use client'

import { useSession, signOut } from 'next-auth/react'
import { useState, useEffect } from 'react'
import { Music, Star, Clock, TrendingUp, ArrowLeft, CheckCircle, ChevronDown, ChevronUp } from 'lucide-react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'

interface SpotifyArtist {
  name: string
}

interface SpotifyImage {
  url: string
}

interface SpotifyAlbumInfo {
  name: string
  images: SpotifyImage[]
  release_date: string
}

interface SpotifyTrack {
  id: string
  name: string
  artists: SpotifyArtist[]
  album: SpotifyAlbumInfo
  preview_url: string | null
}

interface Album {
  id: string
  name: string
  release_date: string
  images: SpotifyImage[]
  album_type: string // 'album', 'single', 'compilation'
  tracks: SpotifyTrack[]
}

interface ExpandedAlbums {
  [key: string]: boolean
}

interface VoteResult {
  trackId: string
  totalPoints: number
  totalVotes: number
  trackName: string
  artistName: string
  albumName: string
}

interface ExtendedSession {
  user?: {
    email?: string
    name?: string
  }
  accessToken?: string
  refreshToken?: string
  expiresAt?: number
}

interface PlaylistStatus {
  hasPlaylist: boolean
  playlist?: {
    id: string
    name: string
    url: string
  }
}

interface TodayVote {
  trackId: string
  points: number
  trackName: string
  artistName: string
  albumName: string
  timestamp: number
}

export default function VotingPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  
  const [bosshossAlbums, setBosshossAlbums] = useState<Album[]>([])
  const [recentTracks, setRecentTracks] = useState<string[]>([])
  const [topTracks, setTopTracks] = useState<string[]>([])
  const [votedTracks, setVotedTracks] = useState<string[]>([])
  const [loading, setLoading] = useState(true)
  const [votingResults, setVotingResults] = useState<VoteResult[]>([])
  const [showResults, setShowResults] = useState(false)
  const [remainingVotes, setRemainingVotes] = useState(10)
  const [expandedAlbums, setExpandedAlbums] = useState<ExpandedAlbums>({})
  const [submitting, setSubmitting] = useState(false)
  const [playlistStatus, setPlaylistStatus] = useState<PlaylistStatus>({
    hasPlaylist: false
  })

  // Redirect if not authenticated
  useEffect(() => {
    if (status === 'loading') return
    if (status === 'unauthenticated') {
      router.push('/')
      return
    }
  }, [status, router])

  // Load data when session is available
  useEffect(() => {
    if (!session) return

    const loadBossHossData = async () => {
      try {
        const userSession = session as ExtendedSession
        
        if (!userSession.accessToken) {
          console.error('No access token available')
          return
        }

        // Search for The BossHoss artist
        const searchResponse = await fetch(
          `https://api.spotify.com/v1/search?q=artist:"The BossHoss"&type=artist&limit=1`,
          {
            headers: {
              'Authorization': `Bearer ${userSession.accessToken}`
            }
          }
        )
        
        if (!searchResponse.ok) {
          throw new Error('Failed to search for BossHoss')
        }
        
        const searchData = await searchResponse.json()
        const artist = searchData.artists?.items?.[0]
        
        if (!artist) {
          console.error('BossHoss artist not found')
          return
        }
        
        // Get all albums by The BossHoss
        const albumsResponse = await fetch(
          `https://api.spotify.com/v1/artists/${artist.id}/albums?include_groups=album,single&market=DE&limit=50`,
          {
            headers: {
              'Authorization': `Bearer ${userSession.accessToken}`
            }
          }
        )
        
        if (!albumsResponse.ok) {
          throw new Error('Failed to get BossHoss albums')
        }
        
        const albumsData = await albumsResponse.json()
        
        // Get detailed information for each album including tracks
        const albumDetails = await Promise.all(
          albumsData.items.map(async (album: { id: string }) => {
            const albumResponse = await fetch(
              `https://api.spotify.com/v1/albums/${album.id}?market=DE`,
              {
                headers: {
                  'Authorization': `Bearer ${userSession.accessToken}`
                }
              }
            )
            
            if (albumResponse.ok) {
              return albumResponse.json()
            }
            return null
          })
        )
        
        // Filter out failed requests and format data
        const formattedAlbums = albumDetails
          .filter(album => album !== null)
          .map(album => ({
            id: album.id,
            name: album.name,
            release_date: album.release_date,
            images: album.images,
            album_type: album.album_type,
            tracks: album.tracks.items.filter((track: SpotifyTrack) => 
              track.artists.some(artist => artist.name === "The BossHoss")
            )
          }))
          .sort((a, b) => new Date(b.release_date).getTime() - new Date(a.release_date).getTime())
        
        setBosshossAlbums(formattedAlbums)
        
      } catch (error) {
        console.error('Error loading BossHoss data:', error)
      }
    }

    const loadUserListeningHistory = async () => {
      const userSession = session as ExtendedSession
      
      if (!userSession.accessToken) return
      
      try {
        // Get recently played tracks
        const recentResponse = await fetch('https://api.spotify.com/v1/me/player/recently-played?limit=50', {
          headers: {
            'Authorization': `Bearer ${userSession.accessToken}`
          }
        })
        const recentData = await recentResponse.json()
        
        const recentTrackIds = recentData.items?.map((item: { track: { id: string } }) => item.track.id) || []
        setRecentTracks(recentTrackIds)

        // Get top tracks (long term = ~1 year)
        const topResponse = await fetch('https://api.spotify.com/v1/me/top/tracks?time_range=long_term&limit=50', {
          headers: {
            'Authorization': `Bearer ${userSession.accessToken}`
          }
        })
        const topData = await topResponse.json()
        
        const topTrackIds = topData.items?.map((item: { id: string }) => item.id) || []
        setTopTracks(topTrackIds)
        
      } catch (error) {
        console.error('Error loading user listening history:', error)
      }
    }

    const loadUserVotingStatus = async () => {
      try {
        const response = await fetch('/api/vote')
        const data = await response.json()
        
        if (response.ok) {
          setRemainingVotes(data.votesRemaining)
          setVotedTracks(data.todayVotes.map((vote: TodayVote) => vote.trackId))
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

    const loadData = async () => {
      await loadBossHossData()
      await loadUserListeningHistory()
      await loadUserVotingStatus()
      await loadPlaylistStatus()
      setLoading(false)
    }
    
    loadData()
  }, [session])

  const getVoteMultiplier = (trackId: string) => {
    if (topTracks.includes(trackId)) return 5
    if (recentTracks.includes(trackId)) return 3
    return 1
  }

  const getVoteLabel = (trackId: string) => {
    const multiplier = getVoteMultiplier(trackId)
    if (multiplier === 5) return '🔥 DEIN TOP TRACK (5 Punkte - meistgehört letztes Jahr)'
    if (multiplier === 3) return '🎵 KÜRZLICH GEHÖRT (3 Punkte - in deinen letzten 50 Songs)'  
    return '⭐ STANDARD VOTE (1 Punkt)'
  }

  const getAlbumTypeLabel = (albumType: string, trackCount: number) => {
    if (albumType === 'single' && trackCount === 1) return 'Single'
    if (albumType === 'single' && trackCount > 1) return 'EP'
    if (albumType === 'compilation') return 'Compilation'
    return 'Album'
  }

  const toggleAlbum = (albumId: string) => {
    setExpandedAlbums(prev => ({
      ...prev,
      [albumId]: !prev[albumId]
    }))
  }

  const handleVote = async (trackId: string) => {
    if (remainingVotes <= 0 || submitting || hasVoted(trackId)) return
    
    setSubmitting(true)
    
    try {
      // Find track details
      const track = bosshossAlbums
        .flatMap(album => album.tracks)
        .find(t => t.id === trackId)
      
      if (!track) {
        alert('Track not found')
        return
      }
      
      const points = getVoteMultiplier(trackId)
      
      const response = await fetch('/api/vote', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          trackId,
          points,
          trackName: track.name,
          artistName: track.artists.map(a => a.name).join(', '),
          albumName: track.album.name
        })
      })
      
      const result = await response.json()
      
      if (result.success) {
        setVotedTracks(prev => [...prev, trackId])
        setRemainingVotes(result.votesRemaining)
        
        // Show success message briefly
        alert(`✅ ${result.message} (+${points} Punkte)`)
      } else {
        alert(`❌ ${result.message}`)
      }
      
    } catch (error) {
      console.error('Error submitting vote:', error)
      alert('Fehler beim Abstimmen. Bitte versuche es nochmal.')
    } finally {
      setSubmitting(false)
    }
  }

  const loadVotingResults = async () => {
    try {
      const response = await fetch('/api/results')
      const data = await response.json()
      
      if (response.ok) {
        setVotingResults(data.topTracks || [])
        setShowResults(true)
      } else {
        alert('Fehler beim Laden der Ergebnisse')
      }
    } catch (error) {
      console.error('Error loading voting results:', error)
      alert('Fehler beim Laden der Ergebnisse')
    }
  }

  const createPlaylist = async () => {
    try {
      const response = await fetch('/api/playlist', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        }
      })
      
      const result = await response.json()
      
      if (result.success) {
        setPlaylistStatus({
          hasPlaylist: true,
          playlist: result.playlist
        })
        alert(`✅ ${result.message}`)
      } else {
        alert(`❌ ${result.error}`)
      }
    } catch (error) {
      console.error('Error creating playlist:', error)
      alert('Fehler beim Erstellen der Playlist')
    }
  }

  const hasVoted = (trackId: string) => {
    return votedTracks.includes(trackId)
  }

  if (status === 'loading' || loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-amber-400 via-orange-500 to-red-600 flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-white"></div>
      </div>
    )
  }

  if (status === 'unauthenticated') {
    return null // Will redirect
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-amber-400 via-orange-500 to-red-600">
      {/* Header */}
      <header className="bg-black/20 backdrop-blur-sm border-b border-white/20">
        <div className="max-w-6xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <button
              onClick={() => router.push('/')}
              className="flex items-center space-x-2 text-white hover:text-amber-200 transition-colors"
            >
              <ArrowLeft className="w-5 h-5" />
              <span className="font-semibold">Zurück</span>
            </button>
            
            <div className="flex items-center space-x-4">
              <div className="text-white text-center">
                <div className="text-sm opacity-80">Verbleibende Stimmen</div>
                <div className="text-2xl font-bold">{remainingVotes}</div>
              </div>
              
              <button
                onClick={() => signOut({ callbackUrl: '/' })}
                className="bg-white/20 hover:bg-white/30 text-white px-4 py-2 rounded-lg transition-colors"
              >
                Abmelden
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Navigation */}
      <div className="max-w-6xl mx-auto px-4 py-6">
        <div className="flex items-center justify-center space-x-4 mb-8">
          <button
            onClick={() => setShowResults(false)}
            className={`flex items-center space-x-2 px-6 py-3 rounded-full font-semibold transition-all duration-300 ${
              !showResults 
                ? 'bg-white text-amber-600 shadow-lg' 
                : 'bg-white/20 text-white hover:bg-white/30'
            }`}
          >
            <Star className="w-5 h-5" />
            <span>Voting</span>
          </button>
          
          <button
            onClick={loadVotingResults}
            className={`flex items-center space-x-2 px-6 py-3 rounded-full font-semibold transition-all duration-300 ${
              showResults 
                ? 'bg-white text-amber-600 shadow-lg' 
                : 'bg-white/20 text-white hover:bg-white/30'
            }`}
          >
            <TrendingUp className="w-5 h-5" />
            <span>Ergebnisse</span>
          </button>
          
          <button
            onClick={createPlaylist}
            className="flex items-center space-x-2 bg-green-500 hover:bg-green-600 text-white px-6 py-3 rounded-full font-semibold transition-all duration-300 transform hover:scale-105"
          >
            <Music className="w-5 h-5" />
            <span>
              {playlistStatus.hasPlaylist ? 'Playlist updaten' : 'Playlist erstellen'}
            </span>
          </button>
        </div>
      </div>

      {/* Main Content */}
      <main className="max-w-6xl mx-auto px-4 pb-12">
        {!showResults ? (
          /* Voting Interface */
          <>
            <div className="text-center mb-8">
              <h1 className="text-4xl font-bold text-white mb-4">
                🎸 BossHoss Song Voting
              </h1>
              <p className="text-white/90 text-lg">
                Stimme für deine Lieblings-BossHoss Songs ab! Songs die du kürzlich gehört hast oder die zu deinen Top Tracks gehören, geben mehr Punkte.
              </p>
              <div className="mt-4 p-4 bg-white/20 rounded-lg text-white">
                <p className="text-sm">
                  💡 <strong>Tipp:</strong> Songs aus deiner Spotify-Historie geben Bonus-Punkte!
                </p>
              </div>
            </div>

            <div className="space-y-6">
              {bosshossAlbums.map((album) => {
                const isExpanded = expandedAlbums[album.id]
                const albumVotes = album.tracks.filter(track => hasVoted(track.id)).length
                
                return (
                  <div key={album.id} className="bg-white/90 rounded-2xl shadow-xl overflow-hidden">
                    {/* Album Header - Clickable */}
                    <button
                      onClick={() => toggleAlbum(album.id)}
                      className="w-full p-6 bg-gradient-to-r from-gray-800 to-gray-900 hover:from-gray-700 hover:to-gray-800 transition-all duration-300"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-4">
                          {album.images?.[0] && (
                            <Image
                              src={album.images[0].url}
                              alt={album.name}
                              width={80}
                              height={80}
                              className="rounded-lg shadow-lg"
                            />
                          )}
                          <div className="text-left">
                            <h3 className="text-xl font-bold text-white">{album.name}</h3>
                            <p className="text-gray-300">
                              {getAlbumTypeLabel(album.album_type, album.tracks.length)} • {new Date(album.release_date).getFullYear()} • {album.tracks.length} Track{album.tracks.length !== 1 ? 's' : ''}
                            </p>
                          </div>
                        </div>
                        
                        <div className="flex items-center space-x-3">
                          {albumVotes > 0 && (
                            <div className="bg-white/20 rounded-full px-3 py-1">
                              <span className="text-white font-semibold">{albumVotes} voted</span>
                            </div>
                          )}
                          <div className="text-white">
                            {isExpanded ? <ChevronUp className="w-6 h-6" /> : <ChevronDown className="w-6 h-6" />}
                          </div>
                        </div>
                      </div>
                    </button>
                    
                    {/* Album Tracks - Collapsible */}
                    {isExpanded && (
                      <div className="p-4 animate-in slide-in-from-top-2 duration-300">
                        <div className="grid gap-3">
                          {album.tracks.map((track) => (
                            <div key={track.id} className="flex items-center justify-between p-3 bg-white/50 rounded-lg hover:bg-white/70 transition-colors">
                              <div className="flex items-center space-x-3 flex-1">
                                <div className="w-2 h-2 bg-amber-500 rounded-full"></div>
                                <div className="flex-1">
                                  <h4 className="font-semibold text-gray-900">{track.name}</h4>
                                  <p className="text-sm text-gray-600">
                                    {track.artists.map(a => a.name).join(', ')}
                                  </p>
                                </div>
                                
                                {/* Vote multiplier indicator */}
                                <div className="text-xs px-2 py-1 rounded-full bg-gradient-to-r from-amber-100 to-orange-100 text-amber-800 font-semibold">
                                  {getVoteLabel(track.id)}
                                </div>
                              </div>
                              
                              <button
                                onClick={() => handleVote(track.id)}
                                disabled={remainingVotes <= 0 || hasVoted(track.id) || submitting}
                                className={`ml-4 px-4 py-2 rounded-full font-semibold transition-all duration-300 ${
                                  hasVoted(track.id)
                                    ? 'bg-green-500 text-white cursor-default'
                                    : remainingVotes <= 0
                                    ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                                    : submitting
                                    ? 'bg-amber-400 text-white cursor-wait'
                                    : 'bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white transform hover:scale-105'
                                }`}
                              >
                                {hasVoted(track.id) ? (
                                  <span className="flex items-center space-x-1">
                                    <CheckCircle className="w-4 h-4" />
                                    <span>Voted</span>
                                  </span>
                                ) : submitting ? (
                                  <span className="flex items-center space-x-1">
                                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                                    <span>...</span>
                                  </span>
                                ) : (
                                  `Vote (+${getVoteMultiplier(track.id)})`
                                )}
                              </button>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          </>
        ) : (
          /* Community Results View */
          <div className="bg-white/80 rounded-2xl p-8 shadow-xl border border-amber-200">
            <h2 className="text-3xl font-bold text-gray-900 mb-6 text-center">
              🏆 Community Voting Results - Top 15
            </h2>
            
            <div className="space-y-4 mb-8">
              {votingResults.map((result, index) => (
                <div key={result.trackId} className={`flex items-center justify-between p-4 rounded-lg ${
                  index === 0 ? 'bg-gradient-to-r from-amber-100 to-orange-100 border-2 border-amber-300' :
                  index < 3 ? 'bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-200' :
                  'bg-gray-50 border border-gray-200'
                }`}>
                  <div className="flex items-center space-x-4">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center text-white font-bold ${
                      index === 0 ? 'bg-gradient-to-r from-yellow-400 to-yellow-600' :
                      index === 1 ? 'bg-gradient-to-r from-gray-300 to-gray-500' :
                      index === 2 ? 'bg-gradient-to-r from-amber-600 to-amber-800' :
                      'bg-gradient-to-r from-amber-500 to-orange-500'
                    }`}>
                      {index + 1}
                    </div>
                    <div>
                      <h4 className="font-bold text-gray-900">{result.trackName}</h4>
                      <p className="text-sm text-gray-600">{result.artistName}</p>
                      {result.albumName && (
                        <p className="text-xs text-gray-500">{result.albumName}</p>
                      )}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-lg font-bold text-amber-600">{result.totalPoints} Punkte</div>
                    <div className="text-sm text-gray-500">{result.totalVotes} Votes</div>
                  </div>
                </div>
              ))}
            </div>

            <div className="text-center space-y-4">
              <p className="text-gray-600">
                🎸 Das sind die beliebtesten BossHoss Songs der Community!
              </p>
              <p className="text-sm text-gray-500">
                {votedTracks.length > 0 ? 
                  `Du hast heute ${votedTracks.length} Stimme${votedTracks.length !== 1 ? 'n' : ''} abgegeben. Komm morgen wieder für neue Votes!` :
                  'Gib deine Stimmen ab um die Setlist zu beeinflussen!'
                }
              </p>
              <div className="flex justify-center space-x-4">
                <button
                  onClick={() => setShowResults(false)}
                  className="bg-gradient-to-r from-gray-500 to-gray-600 hover:from-gray-600 hover:to-gray-700 text-white font-bold py-3 px-6 rounded-full transition-all duration-300 transform hover:scale-105"
                >
                  Zurück zum Voting
                </button>
                <button
                  onClick={() => router.push('/')}
                  className="bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white font-bold py-3 px-6 rounded-full transition-all duration-300 transform hover:scale-105"
                >
                  Zur Startseite
                </button>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  )
}