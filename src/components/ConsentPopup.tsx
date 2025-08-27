// src/components/ConsentPopup.tsx
'use client'

import { useState } from 'react'
import { X, Shield, Music, Mail, Check, ExternalLink } from 'lucide-react'

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
    newsletter: boolean
  }
  timestamp: number
}

export default function ConsentPopup({ isOpen, onClose, onAccept }: ConsentPopupProps) {
  const [requiredConsent, setRequiredConsent] = useState(false)
  const [newsletterConsent, setNewsletterConsent] = useState(false)
  
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
        newsletter: newsletterConsent
      },
      timestamp: Date.now()
    }
    
    onAccept(consentData)
  }
  
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
        <div className="bg-gradient-to-r from-amber-500 to-orange-500 px-6 py-4 rounded-t-xl">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <Music className="w-8 h-8 text-white" />
              <div>
                <h2 className="text-xl font-bold text-white">BossHoss Setlist Voting</h2>
                <p className="text-amber-100 text-sm">Lass uns gemeinsam die perfekte Setlist erstellen!</p>
              </div>
            </div>
            <button 
              onClick={onClose}
              className="text-white hover:text-amber-200 transition-colors"
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
              So funktioniert's:
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
                  <p className="text-gray-600">Top 15 Songs bestimmen die Setlist</p>
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
                  <p className="font-medium text-gray-900">Spotify-Profil (Name & E-Mail)</p>
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
                  <p className="text-gray-600">Erstellen & tägliches Update der "BossHoss Setlist 2025" Playlist</p>
                </div>
              </div>
            </div>
          </div>

          {/* Consent Checkboxes */}
          <div className="space-y-4">
            
            {/* Required Consent */}
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
                    Rechtliche Grundlage: Vertragserfüllung (Voting-Service) & berechtigtes Interesse (Community-Features)
                  </p>
                </div>
              </div>
            </div>

            {/* Optional Newsletter */}
            <div className="border border-gray-200 rounded-lg p-4">
              <div className="flex items-start space-x-3">
                <div className="pt-1">
                  <input
                    type="checkbox"
                    id="newsletter-consent"
                    checked={newsletterConsent}
                    onChange={(e) => setNewsletterConsent(e.target.checked)}
                    className="w-5 h-5 text-green-600 border-2 border-gray-300 rounded focus:ring-green-500 cursor-pointer"
                  />
                </div>
                <div className="flex-1">
                  <label htmlFor="newsletter-consent" className="block font-medium text-gray-900 cursor-pointer flex items-center">
                    <Mail className="w-4 h-4 mr-2 text-green-600" />
                    📧 Newsletter abonnieren (optional)
                  </label>
                  <p className="text-sm text-gray-600 mt-1">
                    Erfahre als Erster von Tour-Terminen, Voting-Updates und neuen BossHoss-News
                  </p>
                  <p className="text-xs text-gray-600 mt-1 italic">
                    Rechtliche Grundlage: Deine ausdrückliche Einwilligung (DSGVO Art. 6)
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Deine Rechte */}
          <div className="bg-blue-50 rounded-lg p-4">
            <h4 className="font-medium text-gray-900 mb-2">🛡️ Deine Rechte:</h4>
            <div className="text-sm text-gray-700 grid md:grid-cols-2 gap-2">
              <div>• ✅ Daten jederzeit einsehen</div>
              <div>• ⚙️ Einstellungen ändern</div>
              <div>• 📁 Daten exportieren</div>
              <div>• ❌ Account vollständig löschen</div>
              <div>• 🔌 Spotify-Verbindung trennen</div>
              <div>• 📧 Fragen? <a href="mailto:privacy@thebosshoss.com" className="text-blue-600 hover:underline font-medium">privacy@thebosshoss.com</a></div>
            </div>
            <p className="text-xs text-gray-600 mt-2">
              Speicherdauer: Bis Ende der Tour oder auf deinen Wunsch hin sofortiger Löschung
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 bg-gray-50 rounded-b-xl">
          <div className="flex flex-col md:flex-row gap-3">
            <button
              onClick={handleAccept}
              disabled={!requiredConsent}
              className={`flex-1 py-3 px-6 rounded-lg font-semibold transition-all flex items-center justify-center ${
                requiredConsent 
                  ? 'bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-700 hover:to-orange-700 text-white shadow-lg hover:shadow-xl' 
                  : 'bg-gray-300 text-gray-500 cursor-not-allowed'
              }`}
            >
              {requiredConsent && <Music className="w-5 h-5 mr-2" />}
              {requiredConsent ? '🎸 Jetzt mit Spotify anmelden!' : '⚠️ Zustimmung erforderlich'}
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