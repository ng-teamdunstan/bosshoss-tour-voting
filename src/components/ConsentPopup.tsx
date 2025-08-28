// src/components/ConsentPopup.tsx - Angepasstes Design
'use client'

import { useState } from 'react'
import { X, Shield, Music, Check, ExternalLink } from 'lucide-react'

interface ConsentPopupProps {
  isOpen: boolean
  onClose: () => void
  onAccept: (consentData: ConsentData) => void
}

export interface ConsentData {
  required: {
    terms: boolean
    privacy: boolean
    spotifyBasicData: boolean
    playlistAccess: boolean
  }
  optional: {
    // Newsletter-Option entfernt
  }
  timestamp: number
}

export default function ConsentPopup({ isOpen, onClose, onAccept }: ConsentPopupProps) {
  const [requiredConsent, setRequiredConsent] = useState(false)
  
  const handleAccept = () => {
    if (!requiredConsent) {
      alert('Bitte stimme den erforderlichen Bedingungen zu, um fortzufahren.')
      return
    }
    
    const consentData: ConsentData = {
      required: {
        terms: true,
        privacy: true,
        spotifyBasicData: true,
        playlistAccess: true
      },
      optional: {
        // Newsletter entfernt
      },
      timestamp: Date.now()
    }
    
    onAccept(consentData)
  }

  // Spotify Logo SVG Component (gleich wie auf der Startseite)
  const SpotifyLogo = ({ className }: { className?: string }) => (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <path d="M12 0C5.4 0 0 5.4 0 12s5.4 12 12 12 12-5.4 12-12S18.66 0 12 0zm5.521 17.34c-.24.359-.66.48-1.021.24-2.82-1.74-6.36-2.101-10.561-1.141-.418.122-.779-.179-.899-.539-.12-.421.18-.78.54-.9 4.56-1.021 8.52-.6 11.64 1.32.42.18.479.659.301 1.02zm1.44-3.3c-.301.42-.841.6-1.262.3-3.239-1.98-8.159-2.58-11.939-1.38-.479.12-1.02-.12-1.14-.6-.12-.48.12-1.021.6-1.141C9.6 9.9 15 10.561 18.72 12.84c.361.181.54.78.241 1.2zm.12-3.36C15.24 8.4 8.82 8.16 5.16 9.301c-.6.179-1.2-.181-1.38-.721-.18-.601.18-1.2.72-1.381 4.26-1.26 11.28-1.02 15.721 1.621.539.3.719 1.02.42 1.56-.299.421-1.02.599-1.559.3z"/>
    </svg>
  )
  
  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Overlay */}
      <div 
        className="absolute inset-0 bg-black bg-opacity-60 backdrop-blur-sm"
        onClick={onClose}
      />
      
      {/* Modal */}
      <div className="relative bg-white rounded-xl shadow-2xl max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
        
        {/* Header */}
        <div className="px-6 py-4 rounded-t-xl backdrop-blur-sm" style={{ backgroundColor: 'rgba(201, 175, 128, 0.9)' }}>
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              
              <div>
                <h2 className="text-xl font-bold text-black">BossHoss Club Tour Voting</h2>
                <p className="text-gray-800 text-sm">Vote deine Lieblingssongs für die Back to the Clubs Tour</p>
              </div>
            </div>
            <button 
              onClick={onClose}
              className="text-black hover:text-gray-600 transition-colors"
            >
              <X className="w-6 h-6" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="px-6 py-6 space-y-6">
          
          {/* Kurze Erklärung */}
          <div>
            <h3 className="text-lg font-semibold text-gray-900 mb-3">
              So funktioniert es:
            </h3>
            <div className="grid md:grid-cols-3 gap-4 text-sm">
              <div className="flex items-start space-x-2 p-3 bg-amber-50 rounded-lg">
                <div className="bg-amber-600 text-white rounded-full w-6 h-6 flex items-center justify-center text-xs font-bold flex-shrink-0">1</div>
                <div>
                  <p className="font-medium text-gray-900">Voting</p>
                  <p className="text-gray-600">10 Stimmen pro Tag, 1 Punkt pro Song</p>
                </div>
              </div>
              <div className="flex items-start space-x-2 p-3 bg-blue-50 rounded-lg">
                <div className="bg-blue-600 text-white rounded-full w-6 h-6 flex items-center justify-center text-xs font-bold flex-shrink-0">2</div>
                <div>
                  <p className="font-medium text-gray-900">Ranking</p>
                  <p className="text-gray-600">Top 15 Songs</p>
                </div>
              </div>
              <div className="flex items-start space-x-2 p-3 bg-green-50 rounded-lg">
                <div className="bg-green-600 text-white rounded-full w-6 h-6 flex items-center justify-center text-xs font-bold flex-shrink-0">3</div>
                <div>
                  <p className="font-medium text-gray-900">Playlist</p>
                  <p className="text-gray-600">Automatische Playlist in deiner Spotify-Library</p>
                </div>
              </div>
            </div>
          </div>

          {/* Datenverarbeitung */}
          <div className="border border-gray-200 rounded-lg p-4 bg-gray-50">
            <h4 className="font-medium text-gray-900 mb-3 flex items-center">
              <Shield className="w-5 h-5 mr-2 text-blue-600" />
              Was wir mit deinen Daten machen:
            </h4>
            
            <div className="space-y-3 text-sm">
              <div className="flex items-start space-x-3">
                <Check className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
                <div>
                  <p className="font-medium text-gray-900">Spotify-Profil (Name &amp; E-Mail)</p>
                  <p className="text-gray-600">Für Login und Identifikation beim Voting</p>
                </div>
              </div>
              
              <div className="flex items-start space-x-3">
                <Check className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
                <div>
                  <p className="font-medium text-gray-900">Deine Voting-Entscheidungen</p>
                  <p className="text-gray-600">Um das Community-Ranking zu erstellen</p>
                </div>
              </div>
              
              <div className="flex items-start space-x-3">
                <Check className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
                <div>
                  <p className="font-medium text-gray-900">Playlist-Zugriff</p>
                  <p className="text-gray-600">Erstellen &amp; tägliches Update der &ldquo;BossHoss Communiy Voting &rdquo; Playlist</p>
                </div>
              </div>
            </div>
          </div>

          {/* Consent Checkbox - nur noch der Required-Teil */}
          <div className="border-2 border-amber-200 rounded-lg p-4 bg-amber-50">
            <div className="flex items-start space-x-3">
              <div className="pt-1">
                <input
                  type="checkbox"
                  id="required-consent"
                  checked={requiredConsent}
                  onChange={(e) => setRequiredConsent(e.target.checked)}
                  className="w-5 h-5 text-amber-600 border-2 border-amber-300 rounded focus:ring-amber-500 cursor-pointer"
                />
              </div>
              <div className="flex-1">
                <label htmlFor="required-consent" className="block font-medium text-gray-900 cursor-pointer">
                  ✅ Ich stimme zu (erforderlich)
                </label>
                <div className="text-sm text-gray-700 mt-2 space-y-1">
                  <p>• <button type="button" className="text-amber-700 hover:underline font-medium" onClick={() => window.open('/terms', '_blank')}>Nutzungsbedingungen</button> und <button type="button" className="text-amber-700 hover:underline font-medium" onClick={() => window.open('/privacy', '_blank')}>Datenschutzerklärung</button></p>
                  <p>• Verwendung meiner Spotify-Daten für das Voting-System</p>
                  <p>• Erstellung und Update einer Community-Playlist in meiner Spotify-Library</p>
                </div>
                <p className="text-xs text-gray-600 mt-2 italic">
                  Rechtliche Grundlage: Vertragserfüllung (Voting-Service) &amp; berechtigtes Interesse (Community-Features)
                </p>
              </div>
            </div>
          </div>

          {/* Deine Rechte */}
          <div className="bg-blue-50 rounded-lg p-4">
            <h4 className="font-medium text-gray-900 mb-2">🛡️ Deine Rechte:</h4>
            <div className="text-sm text-gray-700 grid md:grid-cols-2 gap-2">
              <div>• Daten jederzeit einsehen</div>
              <div>• Einstellungen ändern</div>
              <div>• Daten exportieren</div>
              <div>• Daten vollständig löschen</div>
              <div>• Spotify-Verbindung trennen</div>
              <div>• Fragen? <a href="mailto:privacy@thebosshoss.com" className="text-blue-600 hover:underline font-medium">info@internashville.com</a></div>
            </div>
            <p className="text-xs text-gray-600 mt-2">
              Speicherdauer: Bis Ende der Tour oder auf deinen Wunsch hin sofortige Löschung
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 bg-gray-50 rounded-b-xl">
          <div className="flex flex-col md:flex-row gap-3">
            {/* ✅ Button genau wie auf der Startseite - Spotify Grün mit Logo */}
            <button
              onClick={handleAccept}
              disabled={!requiredConsent}
              className={`flex-1 py-3 px-6 rounded-full font-bold transition-all duration-300 transform hover:scale-105 shadow-xl hover:shadow-2xl flex items-center justify-center space-x-3 ${
                requiredConsent 
                  ? 'bg-[#1DB954] hover:bg-[#1ed760] text-white' 
                  : 'bg-gray-300 text-gray-500 cursor-not-allowed'
              }`}
            >
              {requiredConsent ? (
                <>
                  <SpotifyLogo className="w-6 h-6 text-white" />
                  <span>Mit Spotify anmelden & voten</span>
                </>
              ) : (
                <span>⚠️ Zustimmung erforderlich</span>
              )}
            </button>
            
            <button 
              onClick={onClose}
              className="md:w-auto py-3 px-6 border-2 border-gray-300 text-gray-700 rounded-lg font-semibold hover:bg-gray-100 hover:border-gray-400 transition-all"
            >
              Abbrechen
            </button>
          </div>
          
          {/* Links */}
          <div className="mt-4 pt-3 border-t border-gray-200 text-center">
            <div className="flex flex-wrap justify-center gap-4 text-xs text-gray-600">
              <button type="button" onClick={() => window.open('/privacy', '_blank')} className="hover:text-amber-600 flex items-center transition-colors">
                Datenschutzerklärung <ExternalLink className="w-3 h-3 ml-1" />
              </button>
              <button type="button" onClick={() => window.open('/terms', '_blank')} className="hover:text-amber-600 flex items-center transition-colors">
                Nutzungsbedingungen <ExternalLink className="w-3 h-3 ml-1" />
              </button>
              <a href="mailto:support@thebosshoss.com" className="hover:text-amber-600 transition-colors">
                Support
              </a>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}