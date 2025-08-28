'use client'

import Link from 'next/link'
import Image from 'next/image'
import { ArrowLeft, Shield } from 'lucide-react'

export default function PrivacyPage() {
  return (
    <div className="min-h-screen bttb-bg">
      {/* Header */}
      <header className="relative z-20 py-4">
        <div className="max-w-4xl mx-auto px-4">
          <div className="flex items-center justify-between">
            <Link 
              href="/"
              className="flex items-center space-x-2 text-black hover:opacity-70 transition-opacity"
            >
              <ArrowLeft className="w-5 h-5" />
              <span className="font-rama font-semibold">Zurück</span>
            </Link>
            
            <Image 
              src="https://thebosshoss.com/_next/static/media/tbh_bttb.cb9d83ef.webp"
              alt="The BossHoss - Back to the Boots"
              width={120}
              height={60}
              className="h-auto"
              style={{
                filter: 'drop-shadow(4px 0 8px rgba(206,174,121,.2666)) drop-shadow(1px 0 2px rgba(206,174,121,.6666))'
              }}
            />
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-8">
        <div className="bg-white/90 backdrop-blur-sm rounded-xl shadow-lg overflow-hidden">
          
          {/* Header Section */}
          <div className="bg-gray-800 text-white px-8 py-6">
            <div className="flex items-center space-x-3">
              <Shield className="w-8 h-8" />
              <div>
                <h1 className="text-2xl font-bold">Datenschutzerklärung</h1>
                <p className="text-gray-300 text-sm">BossHoss Setlist Voting App</p>
              </div>
            </div>
          </div>

          {/* Content */}
          <div className="px-8 py-8 space-y-8">
            
            {/* Verantwortlicher */}
            <section>
              <h2 className="text-xl font-bold text-gray-900 mb-4">1. Verantwortlicher</h2>
              <div className="bg-gray-50 rounded-lg p-4">
                <p className="font-semibold">TBH Rights GmbH</p>
                <p>An der Industriebahn 12</p>
                <p>13088 Berlin, Deutschland</p>
                <p className="mt-2">
                  <strong>Kontakt:</strong> <a href="mailto:info@internashville.com" className="underline">info@internashville.com</a>
                </p>
                <p className="text-sm text-gray-600 mt-2">
                  Kein Datenschutzbeauftragter bestellt (nicht erforderlich gem. Art. 37 DSGVO)
                </p>
              </div>
            </section>

            {/* Zweck der App */}
            <section>
              <h2 className="text-xl font-bold text-gray-900 mb-4">2. Zweck der Datenverarbeitung</h2>
              <div className="space-y-3">
                <p className="text-gray-700">
                  Diese App ermöglicht es Fans von The BossHoss, für Songs zu voten, die auf der &quot;Back to the Boots Club Tour 2025&quot; 
                  gespielt werden sollen. Die Datenverarbeitung erfolgt ausschließlich für diesen Zweck.
                </p>
                <div className="border border-gray-200 rounded-lg p-4">
                  <h3 className="font-semibold text-gray-900 mb-2">Hauptfunktionen</h3>
                  <ul className="text-sm text-gray-700 space-y-1">
                    <li>• Song-Voting mit Spotify-Integration</li>
                    <li>• Automatische Playlist-Erstellung basierend auf Voting-Ergebnissen</li>
                    <li>• Community-Ranking der beliebtesten Songs</li>
                  </ul>
                </div>
              </div>
            </section>

            {/* Erhobene Daten */}
            <section>
              <h2 className="text-xl font-bold text-gray-900 mb-4">3. Welche Daten wir verarbeiten</h2>
              <div className="space-y-4">
                
                <div className="border border-gray-200 rounded-lg p-4">
                  <h3 className="font-semibold text-gray-900 mb-2">3.1 Spotify-Daten</h3>
                  <ul className="text-sm text-gray-700 space-y-1">
                    <li>• <strong>Benutzername:</strong> Ihr öffentlicher Spotify-Nutzername</li>
                    <li>• <strong>E-Mail-Adresse:</strong> Aus Ihrem Spotify-Profil</li>
                    <li>• <strong>Benutzer-ID:</strong> Eindeutige Spotify-Kennung</li>
                    <li>• <strong>Profilbild:</strong> Falls in Ihrem Spotify-Profil hinterlegt</li>
                  </ul>
                  <p className="text-xs text-gray-600 mt-2">
                    <strong>Rechtsgrundlage:</strong> Art. 6 Abs. 1 lit. b DSGVO (Vertragserfüllung)
                  </p>
                </div>

                <div className="border border-gray-200 rounded-lg p-4">
                  <h3 className="font-semibold text-gray-900 mb-2">3.2 Voting-Daten</h3>
                  <ul className="text-sm text-gray-700 space-y-1">
                    <li>• <strong>Song-Votes:</strong> Für welche Songs Sie gestimmt haben</li>
                    <li>• <strong>Voting-Zeitpunkt:</strong> Datum und Uhrzeit Ihrer Stimmen</li>
                    <li>• <strong>Stimmen-Anzahl:</strong> Wie viele Stimmen Sie pro Tag abgegeben haben</li>
                  </ul>
                  <p className="text-xs text-gray-600 mt-2">
                    <strong>Rechtsgrundlage:</strong> Art. 6 Abs. 1 lit. f DSGVO (berechtigtes Interesse an der Durchführung des Votings)
                  </p>
                </div>

                <div className="border border-gray-200 rounded-lg p-4">
                  <h3 className="font-semibold text-gray-900 mb-2">3.3 Playlist-Daten</h3>
                  <ul className="text-sm text-gray-700 space-y-1">
                    <li>• <strong>Playlist-ID:</strong> Kennung der erstellten &quot;BossHoss Community Voting 2025&quot; Playlist</li>
                    <li>• <strong>Playlist-Zugriff:</strong> Berechtigung zum Erstellen und Aktualisieren</li>
                  </ul>
                  <p className="text-xs text-gray-600 mt-2">
                    <strong>Rechtsgrundlage:</strong> Art. 6 Abs. 1 lit. b DSGVO (Vertragserfüllung)
                  </p>
                </div>

                <div className="border border-gray-200 rounded-lg p-4">
                  <h3 className="font-semibold text-gray-900 mb-2">3.4 Technische Daten</h3>
                  <ul className="text-sm text-gray-700 space-y-1">
                    <li>• <strong>Session-Cookies:</strong> Für die Anmeldung (technisch erforderlich)</li>
                    <li>• <strong>Vercel Analytics:</strong> Anonymisierte Nutzungsstatistiken</li>
                    <li>• <strong>Server-Logs:</strong> IP-Adresse, Browser-Info (30 Tage gespeichert)</li>
                  </ul>
                  <p className="text-xs text-gray-600 mt-2">
                    <strong>Rechtsgrundlage:</strong> Art. 6 Abs. 1 lit. f DSGVO (berechtigtes Interesse an der technischen Bereitstellung)
                  </p>
                </div>
              </div>
            </section>

            {/* Auftragsverarbeiter */}
            <section>
              <h2 className="text-xl font-bold text-gray-900 mb-4">4. Auftragsverarbeiter & Datentransfers</h2>
              <div className="space-y-4">
                
                <div className="border border-gray-200 rounded-lg p-4">
                  <h3 className="font-semibold text-gray-900">Vercel Inc. (Hosting)</h3>
                  <ul className="text-sm text-gray-700 mt-2">
                    <li>• <strong>Standort:</strong> Server in Frankfurt, Deutschland</li>
                    <li>• <strong>Zweck:</strong> Website-Hosting und Analytics</li>
                    <li>• <strong>Datenschutz:</strong> <a href="https://vercel.com/legal/privacy-policy" target="_blank" className="underline">Vercel Privacy Policy</a></li>
                  </ul>
                </div>

                <div className="border border-gray-200 rounded-lg p-4">
                  <h3 className="font-semibold text-gray-900">Upstash (Datenbank)</h3>
                  <ul className="text-sm text-gray-700 mt-2">
                    <li>• <strong>Standort:</strong> Server in Irland (EU)</li>
                    <li>• <strong>Zweck:</strong> Speicherung von Voting- und Nutzerdaten</li>
                    <li>• <strong>Datenschutz:</strong> <a href="https://upstash.com/privacy" target="_blank" className="underline">Upstash Privacy Policy</a></li>
                  </ul>
                </div>

                <div className="border border-gray-200 rounded-lg p-4">
                  <h3 className="font-semibold text-gray-900">Spotify AB</h3>
                  <ul className="text-sm text-gray-700 mt-2">
                    <li>• <strong>Zweck:</strong> OAuth-Anmeldung und Playlist-Verwaltung</li>
                    <li>• <strong>Datenübertragung:</strong> Nur für Authentifizierung erforderlich</li>
                    <li>• <strong>Datenschutz:</strong> <a href="https://www.spotify.com/privacy" target="_blank" className="underline">Spotify Privacy Policy</a></li>
                  </ul>
                </div>

                <div className="border border-gray-200 rounded-lg p-4">
                  <h3 className="font-semibold text-gray-900">Dunstan Media (Agentur)</h3>
                  <ul className="text-sm text-gray-700 mt-2">
                    <li>• <strong>Zweck:</strong> Technische Entwicklung und Support</li>
                    <li>• <strong>Zugriff:</strong> Nur für Wartung und Fehlerbehebung</li>
                    <li>• <strong>Verpflichtung:</strong> Auftragsverarbeitungsvertrag und Geheimhaltung</li>
                  </ul>
                </div>
              </div>
            </section>

            {/* Speicherdauer */}
            <section>
              <h2 className="text-xl font-bold text-gray-900 mb-4">5. Speicherdauer</h2>
              <div className="border border-gray-200 rounded-lg p-4">
                <div className="space-y-3">
                  <div>
                    <h3 className="font-semibold text-gray-900">Voting- und Nutzerdaten</h3>
                    <p className="text-sm text-gray-700">Bis zum Ende der &quot;Back to the Boots Club Tour 2025&quot; (voraussichtlich November 2025)</p>
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900">Server-Logs</h3>
                    <p className="text-sm text-gray-700">Automatische Löschung nach 30 Tagen</p>
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900">Session-Cookies</h3>
                    <p className="text-sm text-gray-700">Werden beim Schließen des Browsers gelöscht</p>
                  </div>
                  <div className="bg-gray-100 p-3 rounded border border-gray-300">
                    <p className="text-sm text-gray-700">
                      <strong>Wichtig:</strong> Sie können jederzeit eine vorzeitige Löschung Ihrer Daten beantragen (siehe Ihre Rechte unten).
                    </p>
                  </div>
                </div>
              </div>
            </section>

            {/* Ihre Rechte */}
            <section>
              <h2 className="text-xl font-bold text-gray-900 mb-4">6. Ihre Rechte (DSGVO)</h2>
              <div className="grid md:grid-cols-2 gap-4">
                <div className="space-y-3">
                  <div className="border border-gray-200 rounded p-3">
                    <h3 className="font-semibold text-gray-900 text-sm">Recht auf Auskunft (Art. 15)</h3>
                    <p className="text-xs text-gray-600">Welche Daten wir über Sie speichern</p>
                  </div>
                  <div className="border border-gray-200 rounded p-3">
                    <h3 className="font-semibold text-gray-900 text-sm">Recht auf Berichtigung (Art. 16)</h3>
                    <p className="text-xs text-gray-600">Korrektur falscher Daten</p>
                  </div>
                  <div className="border border-gray-200 rounded p-3">
                    <h3 className="font-semibold text-gray-900 text-sm">Recht auf Löschung (Art. 17)</h3>
                    <p className="text-xs text-gray-600">Vollständige Entfernung Ihrer Daten</p>
                  </div>
                </div>
                <div className="space-y-3">
                  <div className="border border-gray-200 rounded p-3">
                    <h3 className="font-semibold text-gray-900 text-sm">Recht auf Einschränkung (Art. 18)</h3>
                    <p className="text-xs text-gray-600">Verarbeitung einschränken</p>
                  </div>
                  <div className="border border-gray-200 rounded p-3">
                    <h3 className="font-semibold text-gray-900 text-sm">Recht auf Datenübertragbarkeit (Art. 20)</h3>
                    <p className="text-xs text-gray-600">Ihre Daten in strukturiertem Format</p>
                  </div>
                  <div className="border border-gray-200 rounded p-3">
                    <h3 className="font-semibold text-gray-900 text-sm">Recht auf Widerspruch (Art. 21)</h3>
                    <p className="text-xs text-gray-600">Verarbeitung widersprechen</p>
                  </div>
                </div>
              </div>
              <div className="mt-4 bg-gray-100 p-3 rounded">
                <p className="text-sm text-gray-700">
                  <strong>Kontakt für Datenschutzanfragen:</strong> <a href="mailto:info@internashville.com" className="underline">info@internashville.com</a>
                </p>
                <p className="text-xs text-gray-600 mt-1">
                  Sie haben auch das Recht, sich bei einer Datenschutzbehörde zu beschweren.
                </p>
              </div>
            </section>

            {/* Cookies */}
            <section>
              <h2 className="text-xl font-bold text-gray-900 mb-4">7. Cookies und Tracking</h2>
              <div className="space-y-3">
                <div className="border border-gray-200 rounded-lg p-4">
                  <h3 className="font-semibold text-gray-900 mb-2">Erforderliche Cookies</h3>
                  <p className="text-sm text-gray-700">
                    Wir verwenden ausschließlich technisch notwendige Session-Cookies für die Spotify-Anmeldung. 
                    Diese werden automatisch gelöscht, wenn Sie den Browser schließen.
                  </p>
                </div>
                <div className="border border-gray-200 rounded-lg p-4">
                  <h3 className="font-semibold text-gray-900 mb-2">Analytics</h3>
                  <p className="text-sm text-gray-700">
                    Wir nutzen Vercel Analytics für anonyme Nutzungsstatistiken (Seitenaufrufe, Ladezeiten). 
                    Diese Daten sind nicht personenbezogen und können nicht zu Ihnen zurückverfolgt werden.
                  </p>
                </div>
              </div>
            </section>

            {/* Datensicherheit */}
            <section>
              <h2 className="text-xl font-bold text-gray-900 mb-4">8. Datensicherheit</h2>
              <div className="border border-gray-200 rounded-lg p-4">
                <div className="space-y-2">
                  <p className="text-sm text-gray-700">
                    Wir treffen angemessene technische und organisatorische Maßnahmen zum Schutz Ihrer Daten:
                  </p>
                  <ul className="text-sm text-gray-700 space-y-1">
                    <li>• <strong>Verschlüsselung:</strong> HTTPS für alle Datenübertragungen</li>
                    <li>• <strong>Zugriffskontrolle:</strong> Beschränkter Zugang zu Produktionsdaten</li>
                    <li>• <strong>Regelmäßige Updates:</strong> Sicherheitspatches für alle Systeme</li>
                    <li>• <strong>Monitoring:</strong> Überwachung auf verdächtige Aktivitäten</li>
                  </ul>
                </div>
              </div>
            </section>

            {/* Änderungen */}
            <section>
              <h2 className="text-xl font-bold text-gray-900 mb-4">9. Änderungen dieser Datenschutzerklärung</h2>
              <p className="text-gray-700 text-sm">
                Wir behalten uns vor, diese Datenschutzerklärung zu aktualisieren, um rechtlichen Anforderungen zu entsprechen 
                oder Änderungen unserer Services zu berücksichtigen. Die aktuelle Version finden Sie immer unter dieser URL.
              </p>
              <div className="mt-4 border border-gray-200 rounded p-3">
                <p className="text-sm text-gray-700">
                  <strong>Letzte Aktualisierung:</strong> August 2025<br/>
                  <strong>Version:</strong> 1.0
                </p>
              </div>
            </section>

          </div>

          {/* Footer */}
          <div className="bg-gray-100 px-8 py-4 text-center">
            <p className="text-sm text-gray-600">
              Bei Fragen zum Datenschutz kontaktieren Sie uns unter: 
              <a href="mailto:info@internashville.com" className="underline ml-1">info@internashville.com</a>
            </p>
          </div>
        </div>
      </main>
    </div>
  )
}