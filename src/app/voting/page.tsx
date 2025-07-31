'use client'

import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import Image from 'next/image'
import { ArrowLeft, Music, Star, ExternalLink, Heart, Clock, TrendingUp } from 'lucide-react'

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

interface BossHossAlbum {
  id: string
  name: string
  release_date: string
  images: SpotifyImage[]
  album_type: string
  tracks: SpotifyTrack[]
}

interface ExpandedAlbums {
  [key: string]: boolean
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

interface SessionWithToken {
  user?: {
    email?: string
    name?: string
  }
  accessToken?: string
}

export default function VotingPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  
  // Existing states
  const [loading, setLoading] = useState(true)
  const [bosshossAlbums, setBosshossAlbums] = useState<BossHossAlbum[]>([])
  const [expandedAlbums, setExpandedAlbums] = useState<ExpandedAlbums>({})
  const [votes, setVotes] = useState<{[trackId: string]: number}>({})
  const [remainingVotes, setRemainingVotes] = useState(10)
  const [votedTracks, setVotedTracks] = useState<string[]>([])
  const [submitting, setSubmitting] = useState(false)
  const [recentlyPlayed, setRecentlyPlayed] = useState<string[]>([])
  const [topTracks, setTopTracks] = useState<string[]>([])
  const [showResults, setShowResults] = useState(false)
  const [votingResults, setVotingResults] = useState<VotingResult[]>([])
  
  // NEW: Playlist states
  const [playlistAutoUpdated, setPlaylistAutoUpdated] = useState(false)
  const [playlistInfo, setPlaylistInfo] = useState<{
    id: string
    name: string  
    url: string
  } | null>(null)

  // Redirect if not logged in
  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/')
    }
  }, [status, router])

  // Load BossHoss data and user listening history
  useEffect(() => {
    if (!session) return
    
    const userSession = session as SessionWithToken
    if (!userSession.accessToken) return

    const loadBossHossData = async () => {
      try {
        // Search for BossHoss artist
        const artistResponse = await fetch(`https://api.spotify.com/v1/search?q=artist:BossHoss&type=artist&limit=1`, {
          headers: {
            'Authorization': `Bearer ${userSession.accessToken}`
          }
        })
        const artistData = await artistResponse.json()
        
        if (artistData.artists.items.length === 0) {
          console.error('BossHoss artist not found')
          return
        }

        const artistId = artistData.artists.items[0].id

        // Get all BossHoss albums
        const albumsResponse = await fetch(`https://api.spotify.com/v1/artists/${artistId}/albums?include_groups=album,single&market=DE&limit=50`, {
          headers: {
            'Authorization': `Bearer ${userSession.accessToken}`
          }
        })
        const albumsData = await albumsResponse.json()

        // Get tracks for each album/single
        const albumsWithTracks = await Promise.all(
          albumsData.items.map(async (album: {
            id: string
            name: string
            release_date: string
            images: SpotifyImage[]
            album_type: string
          }) => {
            const tracksResponse = await fetch(`https://api.spotify.com/v1/albums/${album.id}/tracks?market=DE`, {
              headers: {
                'Authorization': `Bearer ${userSession.accessToken}`
              }
            })
            const tracksData = await tracksResponse.json()
            
            return {
              id: album.id,
              name: album.name,
              release_date: album.release_date,
              images: album.images,
              album_type: album.album_type,
              tracks: tracksData.items.map((track: {
                id: string
                name: string
                artists: SpotifyArtist[]
              }) => ({
                ...track,
                album: {
                  name: album.name,
                  images: album.images,
                  release_date: album.release_date
                }
              }))
            }
          })
        )

        // Sort by release date (newest first)
        const sortedAlbums = albumsWithTracks.sort((a, b) => {
          return new Date(b.release_date).getTime() - new Date(a.release_date).getTime()
        })

        setBosshossAlbums(sortedAlbums)
        
        // Expand first 2 releases by default
        const initialExpanded: ExpandedAlbums = {}
        sortedAlbums.slice(0, 2).forEach(album => {
          initialExpanded[album.id] = true
        })
        setExpandedAlbums(initialExpanded)
        
        setLoading(false)
      } catch (error) {
        console.error('Error loading BossHoss data:', error)
        setLoading(false)
      }
    }

    const loadUserListeningHistory = async () => {
      try {
        // Get recently played tracks (last 50)
        const recentResponse = await fetch('https://api.spotify.com/v1/me/player/recently-played?limit=50', {
          headers: {
            'Authorization': `Bearer ${userSession.accessToken}`
          }
        })
        const recentData = await recentResponse.json()
        
        const recentTrackIds = recentData.items?.map((item: { track: { id: string } }) => item.track.id) || []
        setRecentlyPlayed(recentTrackIds)

        // Get top tracks (last 365 days)
        const topResponse = await fetch('https://api.spotify.com/v1/me/top/tracks?time_range=long_term&limit=50', {
          headers: {
            'Authorization': `Bearer ${userSession.accessToken}`
          }
        })
        const topData = await topResponse.json()
        
        const topTrackIds = topData.items?.map((track: { id: string }) => track.id) || []
        setTopTracks(topTrackIds)

      } catch (error) {
        console.error('Error loading user listening history:', error)
      }
    }

    // NEW: Check and update playlist automatically
    const checkAndUpdatePlaylist = async () => {
      try {
        // Check if user already has playlist
        const statusResponse = await fetch('/api/playlist')
        
        if (statusResponse.ok) {
          const statusData = await statusResponse.json()
          
          if (statusData.hasPlaylist && statusData.playlist) {
            setPlaylistInfo(statusData.playlist)
          } else {
            // No playlist yet - will be created after first vote
            console.log('No playlist found - will be created after voting')
          }
        }
        
      } catch (error) {
        console.error('Error checking playlist:', error)
      }
    }

    loadBossHossData()
    loadUserListeningHistory()
    checkAndUpdatePlaylist()
    
  }, [session])

  const toggleAlbum = (albumId: string) => {
    setExpandedAlbums(prev => ({
      ...prev,
      [albumId]: !prev[albumId]
    }))
  }

  const handleVote = (trackId: string, points: number) => {
    if (hasVoted(trackId)) {
      alert('Du hast für diesen Song bereits abgestimmt!')
      return
    }

    const newVotes = { ...votes }
    
    if (newVotes[trackId]) {
      // Remove existing vote
      setRemainingVotes(prev => prev + newVotes[trackId])
      delete newVotes[trackId]
    } else {
      // Add new vote
      if (remainingVotes < points) {
        alert(`Du hast nur noch ${remainingVotes} Stimme(n) übrig!`)
        return
      }
      
      newVotes[trackId] = points
      setRemainingVotes(prev => prev - points)
    }
    
    setVotes(newVotes)
  }

  const getVoteMultiplier = (trackId: string): number => {
    if (topTracks.includes(trackId)) return 5
    if (recentlyPlayed.includes(trackId)) return 3
    return 1
  }

  const getVoteButtonText = (trackId: string): string => {
    const multiplier = getVoteMultiplier(trackId)
    if (multiplier === 5) return 'Super Vote (5 Punkte)'
    if (multiplier === 3) return 'Super Vote (3 Punkte)'
    return 'Vote (1 Punkt)'
  }

  const getVoteButtonStyle = (trackId: string): string => {
    const multiplier = getVoteMultiplier(trackId)
    const isVoted = votes[trackId]
    
    if (isVoted) {
      return 'bg-amber-500 text-white border-amber-500'
    }
    
    if (multiplier === 5) return 'bg-gradient-to-r from-purple-500 to-pink-500 text-white border-purple-500 hover:from-purple-600 hover:to-pink-600'
    if (multiplier === 3) return 'bg-gradient-to-r from-blue-500 to-cyan-500 text-white border-blue-500 hover:from-blue-600 hover:to-cyan-600'
    return 'bg-white text-amber-600 border-amber-600 hover:bg-amber-50'
  }

  // NEW: Enhanced submitVotes with automatic playlist creation/update
  const submitVotes = async () => {
    if (Object.keys(votes).length === 0) {
      alert('Bitte wähle mindestens einen Song aus!')
      return
    }

    setSubmitting(true)
    
    try {
      // 1. Submit votes
      const response = await fetch('/api/vote', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          votes: Object.entries(votes).map(([trackId, points]) => ({
            trackId, points
          }))
        })
      })

      const result = await response.json()

      if (result.success) {
        // 2. Update UI with voted tracks
        setVotedTracks(Object.keys(votes))
        setVotes({})
        setRemainingVotes(10)
        
        // 3. Load community results
        await loadCommunityResults()
        
        // 4. NEW: Automatic playlist creation/update
        await createOrUpdatePlaylistAutomatically()
        
        alert('🎉 Deine Stimmen wurden erfolgreich abgegeben!')
      } else {
        alert(`❌ ${result.error || 'Fehler beim Abstimmen'}`)
      }
      
    } catch (error) {
      console.error('Error submitting votes:', error)
      alert('❌ Fehler beim Abstimmen. Bitte versuche es nochmal.')
    } finally {
      setSubmitting(false)
    }
  }

  // NEW: Automatic playlist creation/update after voting
  const createOrUpdatePlaylistAutomatically = async () => {
    try {
      const response = await fetch('/api/playlist', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      })
      
      if (response.ok) {
        const result = await response.json()
        
        if (result.success) {
          setPlaylistInfo(result.playlist)
          setPlaylistAutoUpdated(true)
          console.log('✅ Playlist automatically created/updated after voting!')
        }
      }
    } catch (error) {
      // Silent fail - playlist creation is not critical for voting
      console.error('Error creating playlist automatically:', error)
    }
  }

  const hasVoted = (trackId: string) => {
    return votedTracks.includes(trackId)
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

  if (status === 'loading' || loading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-amber-50 to-amber-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-amber-600 mx-auto mb-4"></div>
          <p className="text-amber-800 font-semibold">Loading BossHoss Songs...</p>
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
          <div className="text-right">
            <div className="text-white font-bold text-lg">{remainingVotes}</div>
            <div className="text-amber-400 text-sm">Stimmen übrig</div>
          </div>
        </div>
      </header>

      <div className="max-w-6xl mx-auto px-4 py-8 space-y-8">
        
        {/* Voting Instructions */}
        <div className="bg-white/80 backdrop-blur-sm rounded-2xl p-6 shadow-lg border border-amber-200">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">🗳️ So funktioniert das Voting</h2>
          <div className="grid md:grid-cols-3 gap-4 text-sm">
            <div className="flex items-start space-x-3">
              <div className="w-8 h-8 bg-amber-500 rounded-full flex items-center justify-center flex-shrink-0">
                <Star className="w-4 h-4 text-white" />
              </div>
              <div>
                <div className="font-semibold text-gray-900">Normal Vote</div>
                <div className="text-gray-600">1 Punkt pro Stimme</div>
              </div>
            </div>
            <div className="flex items-start space-x-3">
              <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center flex-shrink-0">
                <Clock className="w-4 h-4 text-white" />
              </div>
              <div>
                <div className="font-semibold text-gray-900">Recent Super Vote</div>
                <div className="text-gray-600">3 Punkte (kürzlich gehört)</div>
              </div>
            </div>
            <div className="flex items-start space-x-3">
              <div className="w-8 h-8 bg-purple-500 rounded-full flex items-center justify-center flex-shrink-0">
                <Heart className="w-4 h-4 text-white" />
              </div>
              <div>
                <div className="font-semibold text-gray-900">Top Super Vote</div>
                <div className="text-gray-600">5 Punkte (Lieblingssong)</div>
              </div>
            </div>
          </div>
        </div>

        {/* Albums and Tracks */}
        <div className="space-y-6">
          {bosshossAlbums.map((album) => (
            <div key={album.id} className="bg-white rounded-2xl shadow-lg border border-amber-200 overflow-hidden">
              {/* Album Header */}
              <button
                onClick={() => toggleAlbum(album.id)}
                className="w-full p-6 flex items-center space-x-4 hover:bg-amber-50 transition-colors text-left"
              >
                <Image
                  src={album.images[0]?.url || '/placeholder-album.jpg'}
                  alt={album.name}
                  width={64}
                  height={64}
                  className="rounded-lg shadow-md"
                />
                <div className="flex-1">
                  <h3 className="text-xl font-bold text-gray-900">{album.name}</h3>
                  <p className="text-gray-600">
                    {album.album_type === 'single' ? 'Single' : 'Album'} • {new Date(album.release_date).getFullYear()} • {album.tracks.length} Songs
                  </p>
                </div>
                <div className={`transform transition-transform ${expandedAlbums[album.id] ? 'rotate-180' : ''}`}>
                  <svg className="w-6 h-6 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </div>
              </button>

              {/* Tracks */}
              {expandedAlbums[album.id] && (
                <div className="border-t border-amber-100">
                  {album.tracks.map((track, index) => {
                    const multiplier = getVoteMultiplier(track.id)
                    const isVoted = votes[track.id]
                    const hasAlreadyVoted = hasVoted(track.id)
                    
                    return (
                      <div key={track.id} className={`
                        p-4 border-b border-amber-50 last:border-b-0 flex items-center justify-between
                        ${hasAlreadyVoted ? 'bg-gray-50' : ''}
                        ${isVoted ? 'bg-amber-50' : ''}
                      `}>
                        <div className="flex-1">
                          <div className="flex items-center space-x-3">
                            <span className="text-gray-400 font-mono text-sm w-6 text-right">
                              {index + 1}
                            </span>
                            <div>
                              <h4 className={`font-semibold ${hasAlreadyVoted ? 'text-gray-500' : 'text-gray-900'}`}>
                                {track.name}
                              </h4>
                              <div className="flex items-center space-x-2 text-sm text-gray-600">
                                {multiplier > 1 && (
                                  <span className={`
                                    px-2 py-1 rounded-full text-xs font-semibold
                                    ${multiplier === 5 ? 'bg-purple-100 text-purple-700' : 'bg-blue-100 text-blue-700'}
                                  `}>
                                    {multiplier === 5 ? '💜 Top Track' : '🕐 Kürzlich gehört'}
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>
                        </div>
                        
                        <div className="flex items-center space-x-3">
                          {hasAlreadyVoted && (
                            <span className="text-green-600 font-semibold text-sm">✓ Abgestimmt</span>
                          )}
                          
                          {!hasAlreadyVoted && (
                            <button
                              onClick={() => handleVote(track.id, multiplier)}
                              disabled={submitting}
                              className={`
                                px-4 py-2 rounded-lg border-2 font-semibold text-sm transition-all transform hover:scale-105
                                ${getVoteButtonStyle(track.id)}
                                disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none
                              `}
                            >
                              {isVoted ? `Gewählt (${multiplier})` : getVoteButtonText(track.id)}
                            </button>
                          )}
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Submit Button */}
        {Object.keys(votes).length > 0 && (
          <div className="bg-white rounded-2xl shadow-lg p-6 border border-amber-200 sticky bottom-4">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-lg font-bold text-gray-900">Deine Auswahl</h3>
                <p className="text-gray-600">{Object.keys(votes).length} Songs gewählt</p>
              </div>
              <div className="text-right">
                <div className="text-2xl font-bold text-amber-600">
                  {Object.values(votes).reduce((sum, points) => sum + points, 0)}
                </div>
                <div className="text-sm text-gray-500">Punkte vergeben</div>
              </div>
            </div>
            
            <button
              onClick={submitVotes}
              disabled={submitting}
              className="w-full bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white font-bold py-4 px-6 rounded-xl transition-all transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
            >
              {submitting ? (
                <div className="flex items-center justify-center space-x-2">
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                  <span>Stimmen werden übertragen...</span>
                </div>
              ) : (
                `🗳️ ${Object.keys(votes).length} Stimme${Object.keys(votes).length !== 1 ? 'n' : ''} abgeben`
              )}
            </button>
          </div>
        )}

        {/* Show Results Button */}
        {!showResults && votedTracks.length > 0 && (
          <div className="text-center">
            <button
              onClick={loadCommunityResults}
              className="bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white font-bold py-3 px-6 rounded-xl transition-all transform hover:scale-105"
            >
              <TrendingUp className="w-5 h-5 inline mr-2" />
              Community Ergebnisse anzeigen
            </button>
          </div>
        )}

        {/* NEW: Enhanced Results with Playlist Info */}
        {showResults && votingResults.length > 0 && (
          <div className="bg-white rounded-2xl shadow-lg p-6 border border-amber-200">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold text-gray-900">
                🏆 Community Top 15
              </h2>
              <div className="text-sm text-gray-500">
                Live Ergebnisse • Täglich aktualisiert
              </div>
            </div>
            
            {/* NEW: Smart Playlist Info */}
            {playlistInfo && (
              <div className="mb-6 p-4 bg-gradient-to-r from-green-50 to-green-100 rounded-xl border border-green-200">
                <div className="flex items-start space-x-3">
                  <div className="w-10 h-10 bg-green-500 rounded-full flex items-center justify-center flex-shrink-0 mt-1">
                    <Music className="w-5 h-5 text-white" />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center space-x-2 mb-1">
                      <h3 className="font-semibold text-green-900">
                        🎵 Deine Spotify Playlist
                      </h3>
                      {playlistAutoUpdated && (
                        <span className="text-xs bg-green-200 text-green-800 px-2 py-1 rounded-full">
                          Gerade aktualisiert!
                        </span>
                      )}
                    </div>
                    <p className="text-green-700 text-sm mb-3">
                      Die Playlist <strong>&ldquo;{playlistInfo.name}&rdquo;</strong> in deiner Spotify Library 
                      basiert auf dem aktuellen Voting-Stand und wird täglich automatisch aktualisiert.
                    </p>
                    <a
                      href={playlistInfo.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center space-x-2 bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
                    >
                      <span>🎵 In Spotify öffnen</span>
                      <ExternalLink className="w-4 h-4" />
                    </a>
                  </div>
                </div>
              </div>
            )}
            
            {/* Results List */}
            <div className="space-y-3">
              {votingResults.map((track, index) => (
                <div key={track.trackId} className={`
                  flex items-center space-x-4 p-4 rounded-xl border-2 transition-all
                  ${index < 3 
                    ? 'bg-gradient-to-r from-amber-50 to-orange-50 border-amber-300' 
                    : 'bg-gray-50 border-gray-200'
                  }
                `}>
                  {/* Position Badge */}
                  <div className={`
                    w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm
                    ${index === 0 ? 'bg-yellow-400 text-yellow-900' :
                      index === 1 ? 'bg-gray-300 text-gray-700' :
                      index === 2 ? 'bg-amber-600 text-amber-100' :
                      'bg-gray-200 text-gray-600'
                    }
                  `}>
                    {index + 1}
                  </div>
                  
                  {/* Track Info */}
                  <div className="flex-1">
                    <h4 className="font-semibold text-gray-900">{track.trackName}</h4>
                    <p className="text-sm text-gray-600">{track.albumName}</p>
                  </div>
                  
                  {/* Points */}
                  <div className="text-right">
                    <div className="font-bold text-lg text-amber-600">
                      {track.totalPoints}
                    </div>
                    <div className="text-xs text-gray-500">
                      {track.totalVotes} Vote{track.totalVotes !== 1 ? 's' : ''}
                    </div>
                  </div>
                  
                  {/* Trophy for Top 3 */}
                  {index < 3 && (
                    <div className="text-2xl">
                      {index === 0 ? '🏆' : index === 1 ? '🥈' : '🥉'}
                    </div>
                  )}
                </div>
              ))}
            </div>
            
            <div className="mt-6 p-4 bg-amber-50 rounded-xl border border-amber-200">
              <p className="text-sm text-amber-800 text-center">
                <strong>🎸 Diese Songs bestimmen die Setlist!</strong><br/>
                Das Voting läuft bis Tourbeginn. Je mehr Fans mitmachen, desto aussagekräftiger wird das Ergebnis.
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}