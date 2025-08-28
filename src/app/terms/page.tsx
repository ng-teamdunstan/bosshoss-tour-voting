'use client'

import Link from 'next/link'
import Image from 'next/image'
import { ArrowLeft, FileText } from 'lucide-react'

export default function TermsPage() {
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
              <FileText className="w-8 h-8" />
              <div>
                <h1 className="text-2xl font-bold">Nutzungsbedingungen</h1>
                <p className="text-gray-300 text-sm">BossHoss Setlist Voting App</p>
              </div>
            </div>
          </div>

          {/* Content */}
          <div className="px-8 py-8 space-y-8">
            
            {/* Anbieter */}
            <section>
              <h2 className="text-xl font-bold text-gray-900 mb-4">1. Anbieter und Geltungsbereich</h2>
              <div className="bg-gray-50 rounded-lg p-4 mb-4">
                <p className="font-semibold">TBH Rights GmbH</p>
                <p>An der Industriebahn 12</p>
                <p>13088 Berlin, Deutschland</p>
                <p className="mt-2">
                  <strong>Kontakt:</strong> <a href="mailto:info@internashville.com" className="underline">info@internashville.com</a>
                </p>
              </div>
              <p className="text-gray-700 text-sm">
                Diese Nutzungsbedingungen regeln die Nutzung der &quot;BossHoss Community Voting&quot; Web-App. 
                Mit der Nutzung der App akzeptieren Sie diese Bedingungen vollständig.
              </p>
            </section>

            {/* Zweck und Funktion */}
            <section>
              <h2 className="text-xl font-bold text-gray-900 mb-4">2. Zweck und Funktion der App</h2>
              <div className="space-y-4">
                <p className="text-gray-700">
                  Die App ermöglicht es Fans von The BossHoss, für ihre Lieblingssongs zu voten und so die Setlist 
                  der &quot;Back to the Boots Club Tour 2025&quot; zu beeinflussen.
                </p>
                
                <div className="grid md:grid-cols-3 gap-4">
                  <div className="border border-gray-200 rounded-lg p-4">
                    <h3 className="font-semibold text-gray-900 text-sm mb-2">Voting-Funktion</h3>
                    <p className="text-xs text-gray-600">10 Stimmen pro Tag für BossHoss-Songs</p>
                  </div>
                  <div className="border border-gray-200 rounded-lg p-4">
                    <h3 className="font-semibold text-gray-900 text-sm mb-2">Community-Ranking</h3>
                    <p className="text-xs text-gray-600">Einsicht in die Voting-Ergebnisse</p>
                  </div>
                  <div className="border border-gray-200 rounded-lg p-4">
                    <h3 className="font-semibold text-gray-900 text-sm mb-2">Spotify-Integration</h3>
                    <p className="text-xs text-gray-600">Automatische Playlist-Erstellung</p>
                  </div>
                </div>
              </div>
            </section>

            {/* Nutzungsvoraussetzungen */}
            <section>
              <h2 className="text-xl font-bold text-gray-900 mb-4">3. Nutzungsvoraussetzungen</h2>
              <div className="space-y-3">
                <div className="border border-gray-200 rounded-lg p-4">
                  <h3 className="font-semibold text-gray-900 mb-2">Spotify-Account erforderlich</h3>
                  <p className="text-sm text-gray-700">
                    Für die Nutzung der App ist ein aktiver Spotify-Account (Free oder Premium) erforderlich. 
                    Die Anmeldung erfolgt über Spotify OAuth.
                  </p>
                </div>
                <div className="border border-gray-200 rounded-lg p-4">
                  <h3 className="font-semibold text-gray-900 mb-2">Technische Voraussetzungen</h3>
                  <p className="text-sm text-gray-700">
                    Moderner Webbrowser mit JavaScript-Unterstützung und Internetverbindung.
                  </p>
                </div>
              </div>
            </section>

            {/* Nutzungsregeln */}
            <section>
              <h2 className="text-xl font-bold text-gray-900 mb-4">4. Nutzungsregeln und Pflichten</h2>
              
              <div className="space-y-4">
                <div className="border border-gray-200 rounded-lg p-4">
                  <h3 className="font-semibold text-gray-900 mb-2">Erlaubt ist:</h3>
                  <ul className="text-sm text-gray-700 space-y-1">
                    <li>• Ehrliches Voting für Ihre Lieblingssongs</li>
                    <li>• Maximal 10 Stimmen pro Tag</li>
                    <li>• Einsicht in die Community-Voting-Ergebnisse</li>
                    <li>• Erstellung und Nutzung der automatischen Spotify-Playlist</li>
                    <li>• Löschen Ihres Accounts und aller Daten jederzeit</li>
                  </ul>
                </div>

                <div className="border border-gray-200 rounded-lg p-4">
                  <h3 className="font-semibold text-gray-900 mb-2">Verboten ist:</h3>
                  <ul className="text-sm text-gray-700 space-y-1">
                    <li>• <strong>Manipulation:</strong> Bots, automatisierte Scripts oder Mehrfach-Accounts</li>
                    <li>• <strong>Missbrauch:</strong> Übermäßige Anfragen oder Serverüberlastung</li>
                    <li>• <strong>Umgehung:</strong> Technische Schutzmaßnahmen umgehen</li>
                    <li>• <strong>Störung:</strong> Die App-Funktionalität für andere beeinträchtigen</li>
                    <li>• <strong>Rechtswidrigkeit:</strong> Verstöße gegen geltendes Recht</li>
                  </ul>
                </div>
              </div>
            </section>

            {/* Voting-Regeln */}
            <section>
              <h2 className="text-xl font-bold text-gray-900 mb-4">5. Voting-Regeln</h2>
              <div className="border border-gray-200 rounded-lg p-4">
                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <h3 className="font-semibold text-gray-900 mb-2">Voting-Limits</h3>
                    <ul className="text-sm text-gray-700 space-y-1">
                      <li>• <strong>10 Stimmen</strong> pro Tag und Account</li>
                      <li>• <strong>1 Stimme</strong> pro Song und Tag</li>
                      <li>• <strong>1 Punkt</strong> pro Stimme</li>
                    </ul>
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900 mb-2">Gültigkeit</h3>
                    <ul className="text-sm text-gray-700 space-y-1">
                      <li>• Voting läuft bis zum <strong>Tour-Start</strong></li>
                      <li>• Stimmen können <strong>nicht rückgängig</strong> gemacht werden</li>
                      <li>• Bei Manipulation werden Stimmen <strong>disqualifiziert</strong></li>
                    </ul>
                  </div>
                </div>
              </div>
            </section>

            {/* Spotify-Integration */}
            <section>
              <h2 className="text-xl font-bold text-gray-900 mb-4">6. Spotify-Integration</h2>
              <div className="space-y-3">
                <div className="border border-gray-200 rounded-lg p-4">
                  <h3 className="font-semibold text-gray-900 mb-2">OAuth-Anmeldung</h3>
                  <p className="text-sm text-gray-700">
                    Wir verwenden Spotifys sichere OAuth-Anmeldung. Ihre Spotify-Zugangsdaten werden niemals bei uns gespeichert.
                  </p>
                </div>
                <div className="border border-gray-200 rounded-lg p-4">
                  <h3 className="font-semibold text-gray-900 mb-2">Playlist-Erstellung</h3>
                  <p className="text-sm text-gray-700">
                    Wir erstellen eine &quot;BossHoss Setlist 2025&quot; Playlist in Ihrer Spotify-Bibliothek, 
                    die automatisch mit den aktuellen Voting-Ergebnissen aktualisiert wird.
                  </p>
                </div>
                <div className="border border-gray-200 rounded-lg p-4">
                  <h3 className="font-semibold text-gray-900 mb-2">Wichtiger Hinweis</h3>
                  <p className="text-sm text-gray-700">
                    Die Spotify-Integration unterliegt auch den <a href="https://www.spotify.com/terms" target="_blank" className="underline">Spotify Nutzungsbedingungen</a>. 
                    Bei Problemen mit der Spotify-Funktionalität kontaktieren Sie uns.
                  </p>
                </div>
              </div>
            </section>

            {/* Haftung */}
            <section>
              <h2 className="text-xl font-bold text-gray-900 mb-4">7. Haftung und Gewährleistung</h2>
              <div className="space-y-4">
                <div className="border border-gray-200 rounded-lg p-4">
                  <h3 className="font-semibold text-gray-900 mb-2">Verfügbarkeit</h3>
                  <p className="text-sm text-gray-700">
                    Wir bemühen uns um eine hohe Verfügbarkeit der App, können jedoch keine 100%ige Verfügbarkeit garantieren. 
                    Wartungsarbeiten und technische Störungen können vorübergehend zu Ausfällen führen.
                  </p>
                </div>
                <div className="border border-gray-200 rounded-lg p-4">
                  <h3 className="font-semibold text-gray-900 mb-2">Haftungsausschluss</h3>
                  <p className="text-sm text-gray-700">
                    Die Haftung für Schäden ist ausgeschlossen, soweit gesetzlich zulässig. 
                    Dies gilt nicht für Schäden aus der Verletzung des Lebens, des Körpers oder der Gesundheit 
                    oder für Schäden aus vorsätzlichen oder grob fahrlässigen Pflichtverletzungen.
                  </p>
                </div>
              </div>
            </section>

            {/* Beendigung */}
            <section>
              <h2 className="text-xl font-bold text-gray-900 mb-4">8. Beendigung der Nutzung</h2>
              <div className="border border-gray-200 rounded-lg p-4">
                <div className="space-y-2">
                  <p className="text-sm text-gray-700">
                    <strong>Votingende:</strong> Das Voting endet automatisch nach der &quot;Back to the Boots Club Tour 2025&quot;.
                  </p>
                  <p className="text-sm text-gray-700">
                    <strong>Vorzeitige Kündigung:</strong> Sie können Ihren Account jederzeit löschen lassen.
                  </p>
                  <p className="text-sm text-gray-700">
                    <strong>Datenlöschung:</strong> Nach Beendigung der Tour werden alle Nutzerdaten DSGVO-konform gelöscht.
                  </p>
                </div>
              </div>
            </section>

            {/* Änderungen */}
            <section>
              <h2 className="text-xl font-bold text-gray-900 mb-4">9. Änderungen der Nutzungsbedingungen</h2>
              <div className="border border-gray-200 rounded-lg p-4">
                <p className="text-sm text-gray-700 mb-2">
                  Wir behalten uns vor, diese Nutzungsbedingungen zu ändern, wenn:
                </p>
                <ul className="text-sm text-gray-700 space-y-1 mb-3">
                  <li>• Rechtliche Anforderungen es erfordern</li>
                  <li>• Neue App-Features hinzugefügt werden</li>
                  <li>• Sicherheitsverbesserungen implementiert werden</li>
                </ul>
                <p className="text-sm text-gray-700 font-semibold">
                  Über wesentliche Änderungen werden Sie durch eine Benachrichtigung in der App informiert.
                </p>
              </div>
            </section>

            {/* Rechtliches */}
            <section>
              <h2 className="text-xl font-bold text-gray-900 mb-4">10. Anwendbares Recht und Gerichtsstand</h2>
              <div className="border border-gray-200 rounded-lg p-4">
                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <h3 className="font-semibold text-gray-900 text-sm mb-1">Anwendbares Recht</h3>
                    <p className="text-xs text-gray-700">
                      Es gilt das Recht der Bundesrepublik Deutschland unter Ausschluss des UN-Kaufrechts.
                    </p>
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900 text-sm mb-1">Gerichtsstand</h3>
                    <p className="text-xs text-gray-700">
                      Ausschließlicher Gerichtsstand ist Berlin, Deutschland.
                    </p>
                  </div>
                </div>
              </div>
            </section>

            {/* Schlussbestimmungen */}
            <section>
              <h2 className="text-xl font-bold text-gray-900 mb-4">11. Schlussbestimmungen</h2>
              <div className="text-sm text-gray-700 space-y-2">
                <p>
                  <strong>Salvatorische Klausel:</strong> Sollten einzelne Bestimmungen dieser Nutzungsbedingungen unwirksam sein, 
                  berührt dies nicht die Wirksamkeit der übrigen Bestimmungen.
                </p>
                <p>
                  <strong>Vertragssprache:</strong> Diese Nutzungsbedingungen sind in deutscher Sprache verfasst. 
                  Bei Übersetzungen in andere Sprachen ist die deutsche Version maßgebend.
                </p>
              </div>
            </section>

          </div>

          {/* Footer */}
          <div className="bg-gray-100 px-8 py-4">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between text-sm text-gray-600">
              <div>
                <p><strong>Letzte Aktualisierung:</strong> August 2025 | <strong>Version:</strong> 1.0</p>
              </div>
              <div>
                <p>
                  Fragen? <a href="mailto:info@internashville.com" className="underline">info@internashville.com</a>
                </p>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}