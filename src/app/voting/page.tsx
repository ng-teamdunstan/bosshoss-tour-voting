'use client'

import { useSession, signOut } from 'next-auth/react'
import { useState, useEffect } from 'react'
import { Music, Star, Clock, TrendingUp, ArrowLeft, CheckCircle, ChevronDown, ChevronUp, LogOut, Trophy, PlayCircle } from 'lucide-react'
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
      setLoading(true)
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

  const loadResults = async () => {
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
      <div className="min-h-screen bg-gradient-to-br from-amber-50 via-orange-50 to-red-50 flex items-center justify-center">
        <div className="bg-white/80 backdrop-blur-sm rounded-2xl p-8 shadow-xl border border-amber-200">
          <div className="flex items-center space-x-4">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-amber-500"></div>
            <span className="text-xl text-gray-700">Loading your BossHoss experience...</span>
          </div>
        </div>
      </div>
    )
  }

  if (!session) {
    return null
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-amber-50 via-orange-50 to-red-50">
      {/* Header */}
      <header className="bg-black/90 backdrop-blur-sm text-white p-4 shadow-lg">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <button
              onClick={() => router.push('/')}
              className="flex items-center space-x-2 text-amber-400 hover:text-amber-300 transition-colors"
            >
              <ArrowLeft className="w-5 h-5" />
              <span className="font-semibold">Back to Home</span>
            </button>
          </div>
          
          <div className="flex items-center space-x-4">
            <div className="text-right">
              <p className="text-amber-400 font-semibold">Welcome back, {session.user?.name}</p>
              <p className="text-gray-300 text-sm">Ready to rock the vote? 🤠</p>
            </div>
            <button
              onClick={() => signOut()}
              className="flex items-center space-x-2 bg-red-600 hover:bg-red-700 px-4 py-2 rounded-full transition-all duration-300 transform hover:scale-105"
            >
              <LogOut className="w-4 h-4" />
              <span className="font-semibold">Logout</span>
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto p-6">
        {!showResults ? (
          <>
            {/* Voting Status & Controls */}
            <div className="bg-white/80 backdrop-blur-sm rounded-2xl p-8 shadow-xl border border-amber-200 mb-8">
              <div className="text-center mb-6">
                <h1 className="text-4xl font-bold text-gray-900 mb-2">
                  🤠 BossHoss Tour Voting
                </h1>
                <p className="text-xl text-gray-600">
                  Vote for your favorites to influence the setlist!
                </p>
              </div>

              <div className="grid md:grid-cols-2 gap-6 mb-6">
                {/* Vote Counter */}
                <div className="bg-gradient-to-r from-amber-500 to-orange-500 rounded-2xl p-6 text-white text-center">
                  <div className="flex items-center justify-center space-x-3 mb-2">
                    <Star className="w-8 h-8" />
                    <span className="text-3xl font-bold">{remainingVotes}</span>
                  </div>
                  <p className="text-amber-100 font-semibold">
                    {remainingVotes === 1 ? 'Vote remaining' : 'Votes remaining'}
                  </p>
                  <p className="text-amber-200 text-sm mt-1">
                    New votes reset daily at midnight
                  </p>
                </div>

                {/* Vote Multipliers Info */}
                <div className="bg-white/70 backdrop-blur-sm rounded-2xl p-6 border border-amber-200">
                  <h3 className="font-bold text-gray-900 mb-3">🎯 Vote Multipliers</h3>
                  <div className="space-y-2 text-sm">
                    <div className="flex items-center justify-between">
                      <span className="text-gray-600">🔥 Your Top Tracks:</span>
                      <span className="font-bold text-red-600">5x Points</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-gray-600">📻 Recently Played:</span>
                      <span className="font-bold text-orange-600">3x Points</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-gray-600">🎵 All Other Songs:</span>
                      <span className="font-bold text-gray-600">1x Points</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex flex-wrap items-center justify-center gap-4">
                <button
                  onClick={loadResults}
                  className="flex items-center space-x-2 bg-gradient-to-r from-purple-500 to-purple-600 hover:from-purple-600 hover:to-purple-700 text-white font-bold py-3 px-6 rounded-full transition-all duration-300 transform hover:scale-105 shadow-lg"
                >
                  <Trophy className="w-5 h-5" />
                  <span>View Community Results</span>
                </button>

                {/* Playlist Status/Creation */}
                {playlistStatus.hasPlaylist ? (
                  <div className="flex items-center space-x-3">
                    <div className="flex items-center space-x-2 bg-green-100 px-4 py-2 rounded-full border border-green-200">
                      <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                      <span className="text-green-800 font-semibold text-sm">Playlist aktiv</span>
                    </div>
                    <a
                      href={playlistStatus.playlist?.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center space-x-2 bg-green-600 hover:bg-green-700 text-white font-bold py-2 px-4 rounded-full text-sm transition-all duration-300 transform hover:scale-105 shadow-lg"
                    >
                      <PlayCircle className="w-4 h-4" />
                      <span>Open in Spotify</span>
                    </a>
                    <button
                      onClick={createOrUpdatePlaylist}
                      disabled={creatingPlaylist}
                      className="flex items-center space-x-2 bg-amber-500 hover:bg-amber-600 text-white font-bold py-2 px-4 rounded-full text-sm transition-all duration-300 transform hover:scale-105 disabled:opacity-50 shadow-lg"
                    >
                      <Clock className="w-4 h-4" />
                      <span>{creatingPlaylist ? 'Updating...' : 'Update Playlist'}</span>
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={createOrUpdatePlaylist}
                    disabled={creatingPlaylist}
                    className="flex items-center space-x-2 bg-gradient-to-r from-purple-500 to-purple-600 hover:from-purple-600 hover:to-purple-700 text-white font-bold py-3 px-6 rounded-full transition-all duration-300 transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg"
                  >
                    <PlayCircle className="w-5 h-5" />
                    <span>{creatingPlaylist ? 'Creating Playlist...' : 'Create Spotify Playlist'}</span>
                  </button>
                )}
              </div>
            </div>

            {/* Albums Grid */}
            <div className="grid gap-6">
              {bosshossAlbums.map((album) => {
                const isExpanded = expandedAlbums[album.id]
                const albumVotes = album.tracks.filter(track => hasVoted(track.id)).length
                
                return (
                  <div key={album.id} className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-xl border border-amber-200 overflow-hidden">
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
                              className="rounded-xl shadow-lg"
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
                            <div className="bg-white/20 rounded-full px-3 py-1 border border-amber-400">
                              <span className="text-amber-300 font-semibold">{albumVotes} voted</span>
                            </div>
                          )}
                          <div className="text-amber-400">
                            {isExpanded ? <ChevronUp className="w-6 h-6" /> : <ChevronDown className="w-6 h-6" />}
                          </div>
                        </div>
                      </div>
                    </button>
                    
                    {/* Album Tracks - Collapsible */}
                    {isExpanded && (
                      <div className="p-6 animate-in slide-in-from-top-2 duration-300">
                        <div className="grid gap-4">
                          {album.tracks.map((track) => (
                            <div key={track.id} className="flex items-center justify-between p-4 bg-white/70 backdrop-blur-sm rounded-xl hover:bg-white/90 transition-all duration-300 border border-amber-100 hover:border-amber-300 hover:shadow-lg">
                              <div className="flex items-center space-x-4 flex-1">
                                <div className="w-3 h-3 bg-gradient-to-r from-amber-500 to-orange-500 rounded-full"></div>
                                <div className="flex-1">
                                  <h4 className="font-bold text-gray-900 text-lg">{track.name}</h4>
                                  <p className="text-gray-600">
                                    {track.artists.map(a => a.name).join(', ')}
                                  </p>
                                </div>
                                
                                {/* Vote multiplier indicator */}
                                <div className="text-xs px-3 py-1 rounded-full bg-gradient-to-r from-amber-100 to-orange-100 text-amber-800 font-bold border border-amber-200">
                                  {getVoteLabel(track.id)}
                                </div>
                              </div>
                              
                              <button
                                onClick={() => handleVote(track.id)}
                                disabled={remainingVotes <= 0 || hasVoted(track.id) || submitting}
                                className={`ml-4 px-6 py-3 rounded-full font-bold transition-all duration-300 shadow-lg ${
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
                                  <span className="flex items-center space-x-2">
                                    <CheckCircle className="w-4 h-4" />
                                    <span>Voted</span>
                                  </span>
                                ) : submitting ? (
                                  <span className="flex items-center space-x-2">
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
          <div className="bg-white/80 backdrop-blur-sm rounded-2xl p-8 shadow-xl border border-amber-200">
            <div className="text-center mb-8">
              <h2 className="text-4xl font-bold text-gray-900 mb-2">
                🏆 Community Voting Results
              </h2>
              <p className="text-xl text-gray-600">Top 15 Songs for the Back to the Boots Tour</p>
            </div>
            
            <div className="space-y-4 mb-8">
              {votingResults.map((result, index) => (
                <div key={result.trackId} className={`flex items-center justify-between p-6 rounded-2xl transition-all duration-300 hover:shadow-lg ${
                  index === 0 ? 'bg-gradient-to-r from-amber-100 via-yellow-100 to-orange-100 border-2 border-amber-400 shadow-xl' :
                  index < 3 ? 'bg-gradient-to-r from-amber-50 to-orange-50 border-2 border-amber-200 shadow-lg' :
                  'bg-white/70 backdrop-blur-sm border border-gray-200 shadow-md'
                }`}>
                  <div className="flex items-center space-x-6">
                    <div className={`w-12 h-12 rounded-full flex items-center justify-center text-white font-bold text-lg shadow-lg ${
                      index === 0 ? 'bg-gradient-to-r from-yellow-400 to-yellow-600' :
                      index === 1 ? 'bg-gradient-to-r from-gray-300 to-gray-500' :
                      index === 2 ? 'bg-gradient-to-r from-amber-600 to-orange-600' :
                      'bg-gradient-to-r from-gray-400 to-gray-600'
                    }`}>
                      {index + 1}
                    </div>
                    
                    <div>
                      <h3 className="text-xl font-bold text-gray-900">{result.trackName}</h3>
                      <p className="text-gray-600">{result.artistName}</p>
                      <p className="text-sm text-gray-500">{result.albumName}</p>
                    </div>
                  </div>
                  
                  <div className="text-right">
                    <div className="text-2xl font-bold text-amber-600">{result.totalPoints}</div>
                    <div className="text-sm text-gray-500">{result.totalVotes} votes</div>
                  </div>
                </div>
              ))}
            </div>

            <div className="text-center">
              <button
                onClick={() => setShowResults(false)}
                className="bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white font-bold py-3 px-8 rounded-full transition-all duration-300 transform hover:scale-105 shadow-lg"
              >
                Back to Voting
              </button>
            </div>
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="bg-black/90 text-white py-8 mt-16">
        <div className="max-w-6xl mx-auto px-4 text-center">
          <p className="text-gray-400">
            © 2025 The BossHoss • Back to the Boots Tour • 
            <span className="text-amber-400 ml-2">Powered by Fan Votes</span>
          </p>
        </div>
      </footer>
    </div>
  )
}