// src/components/SimpleSongSearch.tsx
import React, { useState, useMemo } from 'react'
import { Search, X } from 'lucide-react'

interface SimpleSongSearchProps {
  albums: any[]
  onTrackSelect: (track: any, album: any) => void
  userRecentTracks: string[]
  userTopTracks: string[]
  votedTracks: string[]
  getVoteMultiplier: (track: any) => number
  remainingVotes: number
}

export default function SimpleSongSearch({ 
  albums, 
  onTrackSelect, 
  userRecentTracks, 
  userTopTracks, 
  votedTracks, 
  getVoteMultiplier, 
  remainingVotes 
}: SimpleSongSearchProps) {
  const [searchTerm, setSearchTerm] = useState('')

  // Erstelle eine flache Liste aller Songs mit Album-Info
  const allTracks = useMemo(() => {
    if (!albums || albums.length === 0) return []
    
    return albums.flatMap(album => 
      (album.tracks || []).map((track: any) => ({
        ...track,
        albumInfo: {
          id: album.id,
          name: album.name,
          images: album.images || [],
          release_date: album.release_date
        }
      }))
    )
  }, [albums])

  // Filtere Songs basierend auf Suchterm
  const filteredTracks = useMemo(() => {
    if (!searchTerm.trim()) {
      return allTracks.slice(0, 20) // Zeige nur erste 20 wenn keine Suche
    }

    const searchLower = searchTerm.toLowerCase()
    return allTracks.filter(track => 
      track.name && track.name.toLowerCase().includes(searchLower)
    )
  }, [allTracks, searchTerm])

  const handleTrackClick = (track: any) => {
    // Simuliere Album-Struktur für bestehende Vote-Funktion
    const mockAlbum = {
      id: track.albumInfo.id,
      name: track.albumInfo.name,
      images: track.albumInfo.images,
      release_date: track.albumInfo.release_date
    }
    
    onTrackSelect(track, mockAlbum)
  }

  if (!albums || albums.length === 0) {
    return (
      <div className="bg-white rounded-xl shadow-lg p-6 mb-8">
        <div className="text-center py-8 text-gray-500">
          <Search className="w-12 h-12 mx-auto mb-3 opacity-50" />
          <p>Noch keine Songs geladen...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="bg-white rounded-xl shadow-lg p-6 mb-8">
      {/* Header */}
      <div className="flex items-center space-x-3 mb-6">
        <Search className="w-6 h-6 text-gray-600" />
        <h2 className="text-2xl font-bold text-gray-800">Song Suche</h2>
      </div>

      {/* Suchfeld */}
      <div className="relative mb-6">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
        <input
          type="text"
          placeholder="Suche nach Songs..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full pl-10 pr-10 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-lg"
        />
        {searchTerm && (
          <button
            onClick={() => setSearchTerm('')}
            className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
          >
            <X className="w-5 h-5" />
          </button>
        )}
      </div>

      {/* Ergebnis-Info */}
      <div className="flex justify-between items-center text-sm text-gray-600 mb-4">
        <span>
          {searchTerm.trim() ? `${filteredTracks.length} Songs gefunden` : `${filteredTracks.length} Songs (erste 20 angezeigt)`}
        </span>
        {searchTerm.trim() && (
          <span>Suche nach: "{searchTerm}"</span>
        )}
      </div>

      {/* Song-Liste */}
      <div className="space-y-3 max-h-96 overflow-y-auto">
        {filteredTracks.map((track) => {
          const multiplier = getVoteMultiplier(track)
          const isVoted = votedTracks.includes(track.id)
          const artistName = track.artists && track.artists[0] ? track.artists[0].name : 'Unknown Artist'

          return (
            <div
              key={track.id}
              className={`p-4 rounded-lg border transition-all ${
                isVoted 
                  ? 'bg-gray-50 border-gray-200 opacity-60'
                  : 'bg-white border-gray-200 hover:border-blue-300 hover:shadow-md cursor-pointer'
              }`}
            >
              <div className="flex justify-between items-start">
                <div className="flex-1">
                  <div className="flex items-center space-x-3 mb-1">
                    <h3 className="font-semibold text-gray-900">{track.name}</h3>
                    
                    {/* Vote Multiplier Badge */}
                    {multiplier > 1 && !isVoted && (
                      <span className={`px-2 py-1 rounded-full text-xs font-bold ${
                        multiplier === 5 ? 'bg-yellow-100 text-yellow-800' : 'bg-blue-100 text-blue-800'
                      }`}>
                        {multiplier}x Punkte
                      </span>
                    )}
                    
                    {isVoted && (
                      <span className="px-2 py-1 bg-green-100 text-green-800 rounded-full text-xs font-bold">
                        ✓ Gevotet
                      </span>
                    )}
                  </div>
                  
                  <p className="text-sm text-gray-600 mb-1">
                    von {artistName}
                  </p>
                  
                  <p className="text-xs text-gray-500">
                    Album: {track.albumInfo.name} ({track.albumInfo.release_date ? new Date(track.albumInfo.release_date).getFullYear() : 'Unknown'})
                  </p>
                </div>
                
                {/* Vote Button */}
                <div className="flex items-center space-x-2">
                  {!isVoted && remainingVotes > 0 ? (
                    <button
                      onClick={() => handleTrackClick(track)}
                      className="bg-amber-600 hover:bg-amber-700 text-white px-4 py-2 rounded-lg font-semibold text-sm transition-colors"
                    >
                      Vote ({multiplier} Punkt{multiplier > 1 ? 'e' : ''})
                    </button>
                  ) : remainingVotes === 0 ? (
                    <span className="text-xs text-gray-500">
                      Keine Stimmen übrig
                    </span>
                  ) : (
                    <span className="bg-green-100 text-green-800 px-3 py-1 rounded-lg text-sm font-semibold">
                      ✓ Gevotet
                    </span>
                  )}
                </div>
              </div>
            </div>
          )
        })}

        {/* Keine Ergebnisse */}
        {filteredTracks.length === 0 && searchTerm.trim() && (
          <div className="text-center py-8 text-gray-500">
            <Search className="w-12 h-12 mx-auto mb-3 opacity-50" />
            <p className="text-lg font-medium">Keine Songs gefunden</p>
            <p className="text-sm">Versuche andere Suchbegriffe oder überprüfe die Schreibweise.</p>
          </div>
        )}

        {/* Hinweis bei leerer Suche */}
        {!searchTerm.trim() && allTracks.length > 0 && (
          <div className="text-center py-4 text-gray-500 text-sm">
            <p>💡 Gib einen Songtitel ein, um durch alle {allTracks.length} Songs zu suchen</p>
          </div>
        )}
      </div>
    </div>
  )
}