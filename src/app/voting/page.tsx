// src/app/voting/page.tsx - KOMPLETTE DATEI
'use client'

import { useSession, signOut } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import { ArrowLeft, Music, Star, Clock, TrendingUp } from 'lucide-react'
import Image from 'next/image'

interface ExpandedAlbums {
  [key: string]: boolean
}

interface SpotifyArtist {
  name: string
}

interface SpotifyTrack {
  id: string
  name: string
  artists: SpotifyArtist[]
  album: {
    name: string
    images: { url: string }[]
    release_date: string
  }
}

interface AlbumWithTracks {
  id: string
  name: string
  release_date: string
  images: { url: string }[]
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

interface PlaylistStatus {
  hasPlaylist: boolean
  playlist?: {
    id: string
    name: string
    url: string
  }
}

export default function VotingPage() {
  const { data: session, status } = useSession()
  const router = useRouter()

  // States
  const [loading, setLoading] = useState(true)
  const [bosshossAlbums, setBosshossAlbums] = useState<AlbumWithTracks[]>([])
  const [expandedAlbums, setExpandedAlbums] = useState<ExpandedAlbums>({})
  const [remainingVotes, setRemainingVotes] = useState(10)
  const [votedTracks, setVotedTracks] = useState<string[]>([])
  const [submitting, setSubmitting] = useState(false)
  const [recentTracks, setRecentTracks] = useState<string[]>([])
  const [topTracks, setTopTracks] = useState<string[]>([])
  const [showResults, setShowResults] = useState(false)
  const [votingResults, setVotingResults] = useState<VotingResult[]>([])
  const [playlistStatus, setPlaylistStatus] = useState<PlaylistStatus>({ hasPlaylist: false })
  const [creatingPlaylist, setCreatingPlaylist] = useState(false)

  // Redirect if not authenticated
  useEffect(() => {
    if (status === 'loading') return
    if (!session) {
      router.push('/')
      return
    }
  }, [session, status, router])

  // Load data when component mounts
  useEffect(() => {
    if (!session) return

    const userSession = session as any

    const loadBossHossData = async () => {
      try {
        // Search for The BossHoss on Spotify
        const searchResponse = await fetch('https://api.spotify.com/v1/search?q=artist:The BossHoss&type=artist&limit=1', {
          headers: {
            'Authorization': `Bearer ${userSession.accessToken}`
          }
        })
        const searchData = await searchResponse.json()
        
        if (!searchData.artists?.items?.length) {
          console.error('BossHoss artist not found')
          return
        }

        const artistId = searchData.artists.items[0].id

        // Get all albums
        const albumsResponse = await fetch(`https://api.spotify.com/v1/artists/${artistId}/albums?include_groups=album,single&market=DE&limit=50`, {
          headers: {
            'Authorization': `Bearer ${userSession.accessToken}`
          }
        })
        const albumsData = await albumsResponse.json()

        // Get tracks for each album
        const albumsWithTracks = await Promise.all(
          albumsData.items.map(async (album: any) => {
            const tracksResponse = await fetch(`https://api.spotify.com/v1/albums/${album.id}/tracks`, {
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
    if (multiplier === 5) return '🔥 DEIN TOP TRACK (5 Punkte)'
    if (multiplier === 3) return '🎵 KÜRZLICH GEHÖRT (3 Punkte)'
    return '⭐ STANDARD VOTE (1 Punkt)'
  }

  const toggleAlbum = (albumId: string) => {
    setExpandedAlbums(prev => ({
      ...prev,
      [albumId]: !prev[albumId]
    }))
  }

  const handleVote = async (track: SpotifyTrack) => {
    if (submitting || remainingVotes <= 0 || hasVoted(track.id)) return

    setSubmitting(true)

    try {
      const points = getVoteMultiplier(track.id)
      
      const response = await fetch('/api/vote', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          trackId: track.id,
          points: points,
          trackName: track.name,
          artistName: track.artists[0]?.name || 'The BossHoss',
          albumName: track.album.name
        })
      })

      const data = await response.json()

      if (data.success) {
        setRemainingVotes(data.votesRemaining)
        setVotedTracks(prev => [...prev, track.id])
        
        // Show success message
        alert(`✅ Vote abgegeben!\n🎵 ${track.name}\n⭐ ${points} ${points === 1 ? 'Punkt' : 'Punkte'}\n\n${data.votesRemaining} Votes verbleibend.`)
      } else {
        alert(`❌ ${data.message}`)
      }
    } catch (error) {
      console.error('Error submitting vote:', error)
      alert('❌ Fehler beim Voting. Bitte versuche es nochmal.')
    } finally {
      setSubmitting(false)
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
        
        const successMessage = [
          `🎉 ${result.message}`,
          `🎵 ${result.tracksCount} Songs hinzugefügt!`,
          result.coverSet ? '🖼️ BossHoss Cover automatisch gesetzt!' : '',
          result.automaticUpdates ? '🔄 Automatische Updates aktiviert!' : '⚠️ Automatische Updates nicht verfügbar',
          '',
          '🔗 Öffne Spotify um deine Playlist zu sehen.'
        ].filter(Boolean).join('\n')
        
        alert(successMessage)
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
              <p className="text-amber-400 text-sm">Hey {session.user?.name}! 🤠</p>
            </div>
          </div>
          
          <div className="flex items-center space-x-4">
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
                🗳️ Vote für die Back to the Clubs Setlist!
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
              </div>
            </div>

            {/* Playlist Feature */}
            <div className="bg-white/90 rounded-2xl p-6 shadow-xl border border-amber-200 mb-8">
              <h3 className="text-xl font-bold text-gray-900 mb-4 flex items-center">
                <Music className="w-5 h-5 mr-2 text-amber-600" />
                Deine Community Playlist
              </h3>
              
              {playlistStatus.hasPlaylist ? (
                <div className="space-y-4">
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
                  
                  <div className="text-sm text-gray-600 bg-blue-50 p-3 rounded-lg">
                    <strong>📱 Playlist Name:</strong> &quot;The BossHoss - Back to the Clubs Community Voting Top 15 Songs&quot;<br />
                    <strong>🔄 Updates:</strong> Täglich automatisch um 8:00 Uhr MESZ<br />
                    <strong>📊 Ranking:</strong> Basiert auf Community Voting-Ergebnissen<br />
                    <strong>🖼️ Cover:</strong> Automatisches BossHoss Cover
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  <p className="text-gray-600">
                    Erstelle deine persönliche Spotify-Playlist mit den aktuellen Top 15 Community-Voting Songs!
                  </p>
                  
                  <div className="bg-blue-50 p-4 rounded-lg text-sm text-blue-800">
                    <strong>✨ Deine Playlist wird enthalten:</strong>
                    <ul className="mt-2 space-y-1">
                      <li>• Die aktuellen Top 15 Songs basierend auf Community Voting</li>
                      <li>• Tägliche automatische Updates um 8:00 Uhr MESZ</li>
                      <li>• Automatisches BossHoss &quot;Back to the Clubs&quot; Cover</li>
                      <li>• Direkter Link zu deiner Spotify Library</li>
                    </ul>
                  </div>
                  
                  <button
                    onClick={createOrUpdatePlaylist}
                    disabled={creatingPlaylist}
                    className="w-full bg-gradient-to-r from-purple-500 to-purple-600 hover:from-purple-600 hover:to-purple-700 text-white font-bold py-4 px-6 rounded-xl transition-all duration-300 transform hover:scale-[1.02] disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {creatingPlaylist ? (
                      <div className="flex items-center justify-center space-x-2">
                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                        <span>Erstelle Playlist...</span>
                      </div>
                    ) : (
                      <div className="flex items-center justify-center space-x-2">
                        <Music className="w-5 h-5" />
                        <span>🎵 Playlist erstellen</span>
                      </div>
                    )}
                  </button>
                  
                  <div className="text-xs text-center text-gray-500 bg-amber-50 p-2 rounded">
                    🖼️ Playlist bekommt automatisch das offizielle BossHoss &quot;Back to the Clubs&quot; Cover
                  </div>
                </div>
              )}
            </div>

            {/* Albums and Songs */}
            <div className="space-y-6">
              {bosshossAlbums.map((album) => (
                <div 
                  key={album.id} 
                  className="bg-white/90 rounded-2xl shadow-xl border border-amber-200 overflow-hidden"
                >
                  {/* Album Header */}
                  <div 
                    className="flex items-center space-x-4 p-4 cursor-pointer hover:bg-amber-50 transition-colors"
                    onClick={() => toggleAlbum(album.id)}
                  >
                    <Image 
                      src={album.images[0]?.url || '/placeholder-album.jpg'} 
                      alt={album.name}
                      width={64}
                      height={64}
                      className="w-16 h-16 rounded-lg shadow-md object-cover"
                    />
                    <div className="flex-1">
                      <h3 className="text-lg font-bold text-gray-900">{album.name}</h3>
                      <p className="text-gray-600">
                        {new Date(album.release_date).getFullYear()} • {album.tracks.length} Songs
                      </p>
                    </div>
                    <div className="text-gray-400">
                      {expandedAlbums[album.id] ? '−' : '+'}
                    </div>
                  </div>

                  {/* Songs List */}
                  {expandedAlbums[album.id] && (
                    <div className="border-t border-amber-200">
                      {album.tracks.map((track) => (
                        <div 
                          key={track.id}
                          className="flex items-center justify-between p-4 hover:bg-amber-50/50 transition-colors border-b border-amber-100 last:border-b-0"
                        >
                          <div className="flex-1">
                            <h4 className="font-semibold text-gray-900">{track.name}</h4>
                            <p className="text-sm text-gray-600">
                              {track.artists.map(artist => artist.name).join(', ')}
                            </p>
                            <div className="text-xs text-gray-500 mt-1">
                              {getVoteLabel(track.id)}
                            </div>
                          </div>
                          
                          <button
                            onClick={() => handleVote(track)}
                            disabled={submitting || remainingVotes <= 0 || hasVoted(track.id)}
                            className={`px-4 py-2 rounded-full font-medium text-sm transition-all duration-300 transform hover:scale-105 disabled:scale-100 ${
                              hasVoted(track.id)
                                ? 'bg-green-500 text-white cursor-default'
                                : remainingVotes <= 0
                                ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                                : getVoteMultiplier(track.id) === 5
                                ? 'bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 text-white'
                                : getVoteMultiplier(track.id) === 3
                                ? 'bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white'
                                : 'bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-white'
                            }`}
                          >
                            {hasVoted(track.id) 
                              ? '✓ Voted' 
                              : submitting 
                              ? '...' 
                              : `Vote (${getVoteMultiplier(track.id)})`
                            }
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </>
        ) : (
          /* Community Results View */
          <div className="space-y-6">
            <div className="bg-white/90 rounded-2xl p-6 shadow-xl border border-amber-200">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-bold text-gray-900">
                  🏆 Community Voting Results - Top 15
                </h2>
                <button
                  onClick={() => setShowResults(false)}
                  className="bg-gray-500 hover:bg-gray-600 text-white font-bold py-2 px-4 rounded-full transition-colors"
                >
                  ← Zurück zum Voting
                </button>
              </div>
              
              <div className="space-y-3">
                {votingResults.map((result, index) => (
                  <div 
                    key={result.trackId}
                    className="flex items-center space-x-4 p-4 bg-gradient-to-r from-amber-50 to-orange-50 rounded-xl border border-amber-200"
                  >
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm ${
                      index === 0 ? 'bg-yellow-500 text-white' :
                      index === 1 ? 'bg-gray-400 text-white' :
                      index === 2 ? 'bg-orange-600 text-white' :
                      'bg-gray-200 text-gray-700'
                    }`}>
                      {result.rank}
                    </div>
                    <div className="flex-1">
                      <h3 className="font-bold text-gray-900">{result.trackName}</h3>
                      <p className="text-sm text-gray-600">{result.artistName} • {result.albumName}</p>
                    </div>
                    <div className="text-right">
                      <div className="font-bold text-amber-600">{result.totalPoints} Punkte</div>
                      <div className="text-xs text-gray-500">{result.totalVotes} Votes</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  )
}