'use client'

import { useState, useEffect, useCallback } from 'react'
import { useSession, signOut } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import { 
  Music, 
  ArrowLeft, 
  Vote, 
  CheckCircle, 
  ChevronDown, 
  ChevronUp, 
  RefreshCw, 
  Trophy, 
  ListMusic 
} from 'lucide-react'

// Minimal Interfaces - nur was wir brauchen
interface SpotifyTrack {
  id: string
  name: string
  artists: { name: string }[]
}

interface SpotifyAlbum {
  id: string
  name: string
  release_date: string
  images: { url: string }[]
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

export default function VotingPage() {
  const { data: session, status } = useSession()
  const router = useRouter()

  // Schlanker State - nur das Nötige
  const [loading, setLoading] = useState(true)
  const [albums, setAlbums] = useState<SpotifyAlbum[]>([])
  const [expandedAlbums, setExpandedAlbums] = useState<Record<string, boolean>>({})
  const [remainingVotes, setRemainingVotes] = useState(10)
  const [votedTracks, setVotedTracks] = useState<string[]>([])
  const [submitting, setSubmitting] = useState(false)
  const [showResults, setShowResults] = useState(false)
  const [results, setResults] = useState<VotingResult[]>([])
  const [hasPlaylist, setHasPlaylist] = useState(false)
  const [creatingPlaylist, setCreatingPlaylist] = useState(false)

  // Redirect if not authenticated
  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/')
    }
  }, [status, router])

  // Load BossHoss albums
  const loadAlbums = useCallback(async () => {
    if (!session) return
    
    try {
      setLoading(true)
      const response = await fetch('/api/bosshoss-data')
      const data = await response.json()
      
      if (data.success) {
        setAlbums(data.data || [])
        
        // Auto-expand first 3 albums
        const initialExpanded: Record<string, boolean> = {}
        data.data?.slice(0, 3).forEach((album: SpotifyAlbum) => {
          initialExpanded[album.id] = true
        })
        setExpandedAlbums(initialExpanded)
      }
    } catch (error) {
      console.error('Error loading albums:', error)
    } finally {
      setLoading(false)
    }
  }, [session])

  // Load user voting status
  const loadVotingStatus = async () => {
    try {
      const response = await fetch('/api/vote')
      const data = await response.json()
      
      if (response.ok) {
        setRemainingVotes(data.votesRemaining)
        setVotedTracks(data.todayVotes.map((vote: { trackId: string }) => vote.trackId))
      }
    } catch (error) {
      console.error('Error loading voting status:', error)
    }
  }

  // Load playlist status
  const loadPlaylistStatus = async () => {
    try {
      const response = await fetch('/api/playlist')
      const data = await response.json()
      if (response.ok) {
        setHasPlaylist(data.hasPlaylist)
      }
    } catch (error) {
      console.error('Error loading playlist status:', error)
    }
  }

  // Load voting results
  const loadResults = async () => {
    try {
      const response = await fetch('/api/results')
      const data = await response.json()
      
      if (response.ok) {
        setResults(data.topTracks)
        setShowResults(true)
      }
    } catch (error) {
      console.error('Error loading results:', error)
    }
  }

  // Initial data loading
  useEffect(() => {
    if (session) {
      loadAlbums()
      loadVotingStatus()
      loadPlaylistStatus()
    }
  }, [session, loadAlbums])

  // Simple vote submission - always 1 point
  const submitVote = async (trackId: string, trackName: string, artistName: string, albumName: string) => {
    if (votedTracks.includes(trackId) || remainingVotes <= 0 || submitting) return

    setSubmitting(true)
    try {
      const response = await fetch('/api/vote', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          votes: [{
            trackId,
            points: 1,
            trackName,
            artistName,
            albumName
          }]
        }),
      })

      const data = await response.json()
      if (response.ok && data.success) {
        setVotedTracks(prev => [...prev, trackId])
        setRemainingVotes(data.votesRemaining)
        console.log(`✅ Vote successful: ${trackName}`)
      } else {
        alert(data.message || 'Voting-Fehler')
      }
    } catch (error) {
      console.error('Vote error:', error)
      alert('Netzwerk-Fehler beim Voten')
    } finally {
      setSubmitting(false)
    }
  }

  // Create/update playlist
  const handlePlaylist = async () => {
    setCreatingPlaylist(true)
    try {
      const response = await fetch('/api/playlist', { method: 'POST' })
      const data = await response.json()
      
      if (response.ok) {
        setHasPlaylist(true)
        alert(data.message || 'Playlist aktualisiert!')
      } else {
        alert(data.message || 'Playlist-Fehler')
      }
    } catch (error) {
      alert('Fehler beim Erstellen der Playlist')
    } finally {
      setCreatingPlaylist(false)
    }
  }

  if (status === 'loading') {
    return (
      <div className="min-h-screen bg-gradient-to-b from-black via-gray-900 to-black flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-yellow-500"></div>
      </div>
    )
  }

  if (!session) return null

  return (
    <div className="min-h-screen bg-gradient-to-b from-black via-gray-900 to-black text-white">
      {/* Simple Header */}
      <header className="bg-black/50 backdrop-blur-sm border-b border-gray-800 sticky top-0 z-40">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center space-x-4">
              <button
                onClick={() => router.push('/')}
                className="flex items-center space-x-2 text-yellow-500 hover:text-yellow-400"
              >
                <ArrowLeft className="w-5 h-5" />
                <span>Zurück</span>
              </button>
              
              <div className="flex items-center space-x-3">
                <Vote className="w-6 h-6 text-yellow-500" />
                <h1 className="text-xl font-bold">Song Voting</h1>
              </div>
            </div>

            <div className="flex items-center space-x-4">
              <div className="bg-gray-800/50 px-4 py-2 rounded-full border border-gray-700">
                <span className="text-sm font-medium">{remainingVotes} Stimmen</span>
              </div>
              
              <button
                onClick={() => signOut()}
                className="text-sm text-gray-400 hover:text-white"
              >
                Logout
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        
        {/* Action Controls */}
        <div className="mb-8 flex flex-wrap gap-3 justify-center">
          <button
            onClick={() => loadAlbums()}
            disabled={loading}
            className="flex items-center space-x-2 bg-yellow-600 hover:bg-yellow-700 text-black px-4 py-2 rounded-full font-semibold disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            <span>Songs neu laden</span>
          </button>
          
          {!showResults ? (
            <button
              onClick={loadResults}
              className="flex items-center space-x-2 bg-purple-600 hover:bg-purple-700 px-6 py-2 rounded-full font-semibold"
            >
              <Trophy className="w-4 h-4" />
              <span>Ergebnisse zeigen</span>
            </button>
          ) : (
            <button
              onClick={() => setShowResults(false)}
              className="flex items-center space-x-2 bg-gray-600 hover:bg-gray-700 px-6 py-2 rounded-full font-semibold"
            >
              <ListMusic className="w-4 h-4" />
              <span>Zurück zu Songs</span>
            </button>
          )}
          
          {!showResults && (
            <button
              onClick={handlePlaylist}
              disabled={creatingPlaylist}
              className="flex items-center space-x-2 bg-green-600 hover:bg-green-700 px-6 py-2 rounded-full font-semibold disabled:opacity-50"
            >
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 0C5.4 0 0 5.4 0 12s5.4 12 12 12 12-5.4 12-12S18.66 0 12 0zm5.521 17.34c-.24.359-.66.48-1.021.24-2.82-1.74-6.36-2.101-10.561-1.141-.418.122-.779-.179-.899-.539-.12-.421.18-.78.54-.9 4.56-1.021 8.52-.6 11.64 1.32.42.18.479.659.301 1.02zm1.44-3.3c-.301.42-.841.6-1.262.3-3.239-1.98-8.159-2.58-11.939-1.38-.479.12-1.02-.12-1.14-.6-.12-.48.12-1.021.6-1.141C9.6 9.9 15 10.561 18.72 12.84c.361.181.54.78.241 1.2zm.12-3.36C15.24 8.4 8.82 8.16 5.16 9.301c-.6.179-1.2-.181-1.38-.721-.18-.601.18-1.2.72-1.381 4.26-1.26 11.28-1.02 15.721 1.621.539.3.719 1.02.42 1.56-.299.421-1.02.599-1.559.3z"/>
              </svg>
              <span>
                {creatingPlaylist ? 'Erstelle...' : hasPlaylist ? 'Playlist updaten' : 'Playlist erstellen'}
              </span>
            </button>
          )}
        </div>

        {/* Results View */}
        {showResults ? (
          <div className="space-y-6">
            <div className="text-center">
              <h2 className="text-3xl font-bold mb-2">🏆 Voting Ergebnisse</h2>
              <p className="text-gray-400">Die beliebtesten Songs für die Tour</p>
            </div>

            <div className="grid gap-4">
              {results.map((result, index) => (
                <div
                  key={result.trackId}
                  className="bg-gray-900/50 rounded-xl border border-gray-800 p-6 flex items-center justify-between"
                >
                  <div className="flex items-center space-x-4">
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-lg ${
                      index === 0 ? 'bg-yellow-500 text-black' :
                      index === 1 ? 'bg-gray-400 text-black' :
                      index === 2 ? 'bg-orange-600 text-white' :
                      'bg-gray-700 text-white'
                    }`}>
                      {result.rank}
                    </div>
                    
                    <div>
                      <h3 className="font-semibold text-lg">{result.trackName}</h3>
                      <p className="text-gray-400">{result.artistName} • {result.albumName}</p>
                    </div>
                  </div>
                  
                  <div className="text-right">
                    <div className="text-2xl font-bold text-yellow-500">{result.totalPoints}</div>
                    <div className="text-sm text-gray-400">{result.totalVotes} Stimmen</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : (
          /* Song Voting */
          <div className="space-y-8">
            {loading && (
              <div className="text-center py-12">
                <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-yellow-500 mx-auto mb-4"></div>
                <p className="text-gray-400">Lade BossHoss Songs...</p>
              </div>
            )}

            {!loading && albums.length === 0 && (
              <div className="text-center py-12">
                <Music className="w-16 h-16 text-gray-600 mx-auto mb-4" />
                <p className="text-gray-400">Keine Songs gefunden</p>
              </div>
            )}

            {/* Albums */}
            {albums.map((album) => (
              <div key={album.id} className="bg-gray-900/50 rounded-xl border border-gray-800 overflow-hidden">
                {/* Album Header */}
                <div 
                  className="p-6 cursor-pointer hover:bg-gray-800/50 transition-colors"
                  onClick={() => setExpandedAlbums(prev => ({
                    ...prev,
                    [album.id]: !prev[album.id]
                  }))}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-4">
                      {album.images?.[0] && (
                        <Image
                          src={album.images[0].url}
                          alt={album.name}
                          width={64}
                          height={64}
                          className="rounded-lg"
                        />
                      )}
                      
                      <div>
                        <h2 className="text-xl font-bold">{album.name}</h2>
                        <div className="text-sm text-gray-400 mt-1">
                          {new Date(album.release_date).getFullYear()} • {album.tracks.length} Songs
                        </div>
                      </div>
                    </div>
                    
                    {expandedAlbums[album.id] ? (
                      <ChevronUp className="w-6 h-6 text-gray-400" />
                    ) : (
                      <ChevronDown className="w-6 h-6 text-gray-400" />
                    )}
                  </div>
                </div>

                {/* Track List */}
                {expandedAlbums[album.id] && (
                  <div className="border-t border-gray-800">
                    {album.tracks.map((track) => (
                      <div
                        key={track.id}
                        className="flex items-center justify-between p-4 hover:bg-gray-800/30 border-b border-gray-800/50 last:border-b-0"
                      >
                        <div>
                          <h3 className="font-medium">{track.name}</h3>
                          <p className="text-sm text-gray-400">
                            {track.artists.map(a => a.name).join(', ')}
                          </p>
                        </div>

                        <button
                          onClick={() => submitVote(
                            track.id, 
                            track.name, 
                            track.artists.map(a => a.name).join(', '), 
                            album.name
                          )}
                          disabled={
                            votedTracks.includes(track.id) || 
                            remainingVotes <= 0 || 
                            submitting
                          }
                          className={`px-4 py-2 rounded-full font-semibold transition-all duration-200 min-w-[100px] ${
                            votedTracks.includes(track.id) 
                              ? 'bg-green-800 text-green-200 cursor-not-allowed' 
                              : remainingVotes <= 0
                                ? 'bg-gray-700 text-gray-500 cursor-not-allowed'
                                : 'bg-yellow-600 hover:bg-yellow-700 text-black hover:scale-105'
                          }`}
                        >
                          {votedTracks.includes(track.id) ? (
                            <div className="flex items-center justify-center space-x-1">
                              <CheckCircle className="w-4 h-4" />
                              <span>Gevotet</span>
                            </div>
                          ) : remainingVotes <= 0 ? (
                            'Keine Stimmen'
                          ) : submitting ? (
                            'Voting...'
                          ) : (
                            'Vote (1 Punkt)'
                          )}
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}