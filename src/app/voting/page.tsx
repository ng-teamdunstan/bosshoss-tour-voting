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
  const [playlistStatus, setPlaylistStatus] = useState<{
    hasPlaylist: boolean
    playlist?: { id: string; name: string; url: string }
  }>({ hasPlaylist: false })
  const [creatingPlaylist, setCreatingPlaylist] = useState(false)

  // Redirect if not authenticated
  useEffect(() => {
    if (status === 'loading') return
    if (!session) {
      router.push('/')
    }
  }, [session, status, router])

  // Load all data when component mounts and user is authenticated
  useEffect(() => {
    if (!session?.user) return

    const loadBossHossData = async () => {
      try {
        const response = await fetch('/api/bosshoss-albums')
        const data = await response.json()
        
        if (response.ok) {
          setBosshossAlbums(data.albums)
        }
      } catch (error) {
        console.error('Error loading BossHoss albums:', error)
      }
    }

    const loadUserListeningHistory = async () => {
      try {
        const userSession = session as any
        
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
    if (multiplier === 5) return '🔥 DEIN FAVORIT'
    if (multiplier === 3) return '📻 RECENTLY PLAYED'
    return '🎵 STANDARD'
  }

  const hasVoted = (trackId: string) => {
    return votedTracks.includes(trackId)
  }

  const handleVote = async (trackId: string) => {
    if (remainingVotes <= 0 || hasVoted(trackId) || submitting) return

    setSubmitting(true)
    
    try {
      const response = await fetch('/api/vote', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ trackId }),
      })

      const data = await response.json()

      if (response.ok) {
        setVotedTracks([...votedTracks, trackId])
        setRemainingVotes(data.votesRemaining)
      } else {
        alert(data.error || 'Voting failed')
      }
    } catch (error) {
      console.error('Voting error:', error)
      alert('Voting failed. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  const loadCommunityResults = async () => {
    try {
      const response = await fetch('/api/results')
      const data = await response.json()
      
      if (response.ok) {
        setVotingResults(data.results)
        setShowResults(true)
      } else {
        alert('Failed to load results')
      }
    } catch (error) {
      console.error('Error loading results:', error)
      alert('Failed to load results')
    }
  }

  const createOrUpdatePlaylist = async () => {
    setCreatingPlaylist(true)
    
    try {
      const response = await fetch('/api/playlist', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      })

      const data = await response.json()

      if (response.ok) {
        setPlaylistStatus({
          hasPlaylist: true,
          playlist: data.playlist
        })
        alert(data.message)
      } else {
        alert(data.error || 'Failed to create/update playlist')
      }
    } catch (error) {
      console.error('Playlist creation error:', error)
      alert('Failed to create/update playlist')
    } finally {
      setCreatingPlaylist(false)
    }
  }

  const toggleAlbumExpansion = (albumId: string) => {
    setExpandedAlbums(prev => ({
      ...prev,
      [albumId]: !prev[albumId]
    }))
  }

  if (status === 'loading' || loading) {
    return (
      <div 
        className="min-h-screen flex items-center justify-center"
        style={{
          backgroundImage: 'url(https://thebosshoss.com/paper-texture.jpg)',
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          backgroundAttachment: 'fixed'
        }}
      >
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-amber-600 mx-auto mb-4"></div>
          <p className="text-amber-800 font-semibold">Loading...</p>
        </div>
      </div>
    )
  }

  if (!session) {
    return null
  }

  return (
    <div 
      className="min-h-screen"
      style={{
        backgroundImage: 'url(https://thebosshoss.com/paper-texture.jpg)',
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundAttachment: 'fixed'
      }}
    >
      {/* Header mit Logo */}
      <header className="bg-black/90 backdrop-blur-sm text-white p-4 shadow-lg">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <button
              onClick={() => router.push('/')}
              className="flex items-center space-x-2 text-amber-400 hover:text-amber-300 transition-colors"
            >
              <ArrowLeft className="w-5 h-5" />
              <span className="font-semibold">Back</span>
            </button>
            
            {/* BossHoss Logo */}
            <Image
              src="https://thebosshoss.com/_next/static/media/tbh_bttb.cb9d83ef.webp"
              alt="The BossHoss - Back to the Boots"
              width={200}
              height={80}
              className="h-16 w-auto"
            />
          </div>
          
          <div className="flex items-center space-x-4">
            <div className="text-right">
              <p className="text-amber-400 font-semibold">Welcome back, {session.user?.name}</p>
              <p className="text-gray-300 text-sm">Ready to rock the vote? 🤠</p>
            </div>
            <div className="text-white text-sm">
              <span className="font-bold text-amber-400">{remainingVotes}</span> Votes left
            </div>
            <button 
              onClick={() => signOut()}
              className="text-white hover:text-amber-400 transition-colors"
            >
              Sign Out
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 py-8">
        {!showResults ? (
          <>
            {/* Voting Instructions */}
            <div className="bg-white/80 rounded-2xl p-6 shadow-xl border border-amber-200 mb-8">
              <h2 className="text-2xl font-bold text-gray-900 mb-4">
                🗳️ Vote für die Back to the Boots Setlist!
              </h2>
              <p className="text-gray-600 mb-4">
                <strong>Smart Voting:</strong> Deine Stimme zählt mehr, wenn du die Songs auch wirklich hörst! 
                Wir checken deine Spotify-History für faire Gewichtung.
              </p>
              <div className="grid md:grid-cols-3 gap-4 text-sm">
                <div className="flex items-center space-x-2">
                  <Star className="w-5 h-5 text-amber-500" />
                  <span><strong>1 Punkt:</strong> Standard Vote für alle Songs</span>
                </div>
                <div className="flex items-center space-x-2">
                  <Clock className="w-5 h-5 text-blue-500" />
                  <span><strong>3 Punkte:</strong> Du hast den Song kürzlich gehört (letzte 50 Tracks)</span>
                </div>
                <div className="flex items-center space-x-2">
                  <TrendingUp className="w-5 h-5 text-red-500" />
                  <span><strong>5 Punkte:</strong> Einer deiner meistgehörten Songs (letztes Jahr)</span>
                </div>
              </div>
              
              <div className="flex flex-wrap gap-4 mt-4">
                {votedTracks.length > 0 && !showResults && (
                  <button
                    onClick={loadCommunityResults}
                    className="bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white font-bold py-3 px-6 rounded-full transition-all duration-300 transform hover:scale-105"
                  >
                    Community Results anzeigen ({votedTracks.length} Votes abgegeben)
                  </button>
                )}
                
                {/* Playlist Feature */}
                <div className="flex items-center space-x-4">
                  {playlistStatus.hasPlaylist ? (
                    <div className="flex items-center space-x-3">
                      <div className="flex items-center space-x-2 bg-green-100 px-4 py-2 rounded-full">
                        <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                        <span className="text-green-800 font-semibold text-sm">Playlist aktiv</span>
                      </div>
                      <a
                        href={playlistStatus.playlist?.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="bg-green-600 hover:bg-green-700 text-white font-bold py-2 px-4 rounded-full text-sm transition-all duration-300 transform hover:scale-105"
                      >
                        🎵 In Spotify öffnen
                      </a>
                      <button
                        onClick={createOrUpdatePlaylist}
                        disabled={creatingPlaylist}
                        className="bg-amber-500 hover:bg-amber-600 text-white font-bold py-2 px-4 rounded-full text-sm transition-all duration-300 transform hover:scale-105 disabled:opacity-50"
                      >
                        {creatingPlaylist ? 'Updating...' : '🔄 Update'}
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={createOrUpdatePlaylist}
                      disabled={creatingPlaylist}
                      className="bg-gradient-to-r from-purple-500 to-purple-600 hover:from-purple-600 hover:to-purple-700 text-white font-bold py-3 px-6 rounded-full transition-all duration-300 transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {creatingPlaylist ? 'Creating Playlist...' : '🎵 Create Spotify Playlist'}
                    </button>
                  )}
                </div>
              </div>
            </div>

            {/* Albums */}
            <div className="grid gap-6">
              {bosshossAlbums.map((album) => {
                const isExpanded = expandedAlbums[album.id]
                const albumVotes = album.tracks.filter(track => hasVoted(track.id)).length
                
                return (
                  <div key={album.id} className="bg-white/80 rounded-2xl shadow-xl border border-amber-200 overflow-hidden">
                    {/* Album Header */}
                    <button
                      onClick={() => toggleAlbumExpansion(album.id)}
                      className="w-full p-6 bg-gradient-to-r from-black/90 to-gray-900 text-white hover:from-black hover:to-gray-800 transition-all duration-300"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-4">
                          {album.images[0] && (
                            <Image
                              src={album.images[0].url}
                              alt={album.name}
                              width={80}
                              height={80}
                              className="rounded-lg shadow-lg"
                            />
                          )}
                          <div className="text-left">
                            <h3 className="text-2xl font-bold text-amber-400 mb-1">{album.name}</h3>
                            <p className="text-gray-300 text-sm">
                              Released: {new Date(album.release_date).getFullYear()} • 
                              {album.tracks.length} track{album.tracks.length !== 1 ? 's' : ''}
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