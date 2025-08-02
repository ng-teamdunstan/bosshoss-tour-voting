'use client'

import { useSession, signIn, signOut } from 'next-auth/react'
import { useState } from 'react'
import { Music, Star, Users, Clock } from 'lucide-react'

export default function Home() {
  const { data: session, status } = useSession()
  const [isLoading, setIsLoading] = useState(false)

  const handleSpotifyLogin = async () => {
    setIsLoading(true)
    await signIn('spotify', { callbackUrl: '/voting' })
  }

  if (status === 'loading') {
    return (
      <div className="min-h-screen bttb-bg flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-black mx-auto mb-4"></div>
          <p className="font-rama text-black font-semibold">Loading...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bttb-bg">
      {/* Header */}
      <header className="relative z-20 py-4">
        <div className="max-w-[112rem] mx-auto px-[2.4rem]">
          {/* Navigation */}
          <nav className="flex justify-between items-center mb-6">
            <div className="font-blackbetty text-lg tracking-[0.15rem] uppercase">
              MENU
            </div>
            {session && (
              <button 
                onClick={() => signOut()}
                className="font-blackbetty text-lg tracking-[0.15rem] uppercase hover:opacity-50 transition-all duration-300"
              >
                SIGN OUT
              </button>
            )}
          </nav>

          {/* Logo - um die Hälfte reduziert */}
          <div className="text-center relative">
            <img 
              src="https://thebosshoss.com/_next/static/media/tbh_bttb.cb9d83ef.webp"
              alt="The BossHoss - Back to the Boots"
              className="mx-auto mb-6 w-[14rem] h-auto"
              style={{
                filter: 'drop-shadow(8px 0 16px rgba(206,174,121,.1333)) drop-shadow(4px 0 8px rgba(206,174,121,.2666)) drop-shadow(1px 0 2px rgba(206,174,121,.6666))'
              }}
            />
          </div>
        </div>
      </header>

      <main className="max-w-[112rem] mx-auto px-[2.4rem]">
        {!session ? (
          /* Landing Page */
          <div className="text-center">
            {/* Hero Section - kleinere Schriften */}
            <div className="mb-12">
              <div className="font-rama mb-4 text-xl md:text-2xl tracking-[0.15rem] uppercase font-semibold">
                Club Tour 2025
              </div>

              {/* Haupttitel kleiner für Mobile */}
              <h1 className="font-helltown mb-6 text-2xl md:text-4xl lg:text-5xl leading-[1.1] tracking-[0.2rem] uppercase font-semibold">
                Du entscheidest mit!
              </h1>

              <p className="font-rama mb-8 text-base md:text-lg tracking-[0.05em] max-w-[60rem] mx-auto">
                Vote für deine Lieblingssongs und bestimme die Setlist für die exklusive Club Tour.
              </p>

              {/* CTA Button */}
              <button
                onClick={handleSpotifyLogin}
                disabled={isLoading}
                className="group relative inline-flex items-center space-x-3 bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white font-bold py-3 px-6 rounded-full text-base transition-all duration-300 transform hover:scale-105 shadow-xl hover:shadow-2xl disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isLoading ? (
                  <>
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                    <span>Connecting...</span>
                  </>
                ) : (
                  <>
                    <div className="w-6 h-6 bg-black rounded-full flex items-center justify-center">
                      <Music className="w-3 h-3 text-green-400" />
                    </div>
                    <span>Mit Spotify anmelden & voten</span>
                  </>
                )}
              </button>
              
              <p className="font-rama text-xs md:text-sm opacity-80 mt-3">
                Sichere Anmeldung über Spotify. Wir speichern nur deine öffentlichen Profildaten.
              </p>
            </div>

            {/* Features - kleinere Schriften */}
            <div className="grid md:grid-cols-3 gap-6 mb-12">
              <div className="bg-black bg-opacity-10 p-6 transition-all duration-300 hover:bg-opacity-20">
                <div className="w-12 h-12 bg-black rounded-full flex items-center justify-center mx-auto mb-4">
                  <Star className="w-6 h-6 text-white" />
                </div>
                <h3 className="font-helltown mb-3 text-lg md:text-xl tracking-[0.1rem] uppercase font-semibold">Smart Voting</h3>
                <p className="font-rama text-sm md:text-base tracking-[0.05em]">
                  Deine Stimme zählt mehr, wenn du die Songs auch wirklich hörst! 
                  Bis zu 5 Punkte pro Vote.
                </p>
              </div>

              <div className="bg-black bg-opacity-10 p-6 transition-all duration-300 hover:bg-opacity-20">
                <div className="w-12 h-12 bg-black rounded-full flex items-center justify-center mx-auto mb-4">
                  <Users className="w-6 h-6 text-white" />
                </div>
                <h3 className="font-helltown mb-3 text-lg md:text-xl tracking-[0.1rem] uppercase font-semibold">Fan Community</h3>
                <p className="font-rama text-sm md:text-base tracking-[0.05em]">
                  Sieh die Ergebnisse aller Fans und entdecke die beliebtesten 
                  BossHoss Tracks der Community.
                </p>
              </div>

              <div className="bg-black bg-opacity-10 p-6 transition-all duration-300 hover:bg-opacity-20">
                <div className="w-12 h-12 bg-black rounded-full flex items-center justify-center mx-auto mb-4">
                  <Clock className="w-6 h-6 text-white" />
                </div>
                <h3 className="font-helltown mb-3 text-lg md:text-xl tracking-[0.1rem] uppercase font-semibold">Live Updates</h3>
                <p className="font-rama text-sm md:text-base tracking-[0.05em]">
                  Automatische Playlist-Updates täglich. Die aktuellen Top-Songs 
                  immer in deiner Spotify Library.
                </p>
              </div>
            </div>

            {/* Tour Dates - wie im Screenshot */}
            <div className="mb-8">
              <div className="text-center mb-6">
                <div className="font-rama mb-2 text-lg tracking-[0.1rem] uppercase font-semibold">
                  Back to the Boots
                </div>
                <h2 className="font-helltown text-2xl md:text-3xl tracking-[0.2rem] uppercase font-semibold mb-6">
                  Club Tour
                </h2>
              </div>

              {/* Tour Event List - exakt wie im Screenshot */}
              <div className="space-y-1">
                {[
                  { date: '26.09.2025', country: 'DE', city: 'HAMBURG', venue: 'GROSSE FREIHEIT' },
                  { date: '27.09.2025', country: 'DE', city: 'BERLIN', venue: 'ASTRA' },
                  { date: '01.10.2025', country: 'DE', city: 'KÖLN', venue: 'LIVE MUSIC HALL' },
                  { date: '02.10.2025', country: 'DE', city: 'MÜNSTER', venue: 'SKATERS PALACE' },
                  { date: '03.10.2025', country: 'DE', city: 'HANNOVER', venue: 'CAPITOL' },
                  { date: '04.10.2025', country: 'DE', city: 'STUTTGART', venue: 'IM WIZEMANN' },
                  { date: '05.10.2025', country: 'DE', city: 'FRANKFURT', venue: 'BATSCHKAPP' },
                  { date: '06.10.2025', country: 'DE', city: 'LEIPZIG', venue: 'TÄUBCHENTHAL' },
                  { date: '07.10.2025', country: 'DE', city: 'DRESDEN', venue: 'ALTER SCHLACHTHOF' },
                  { date: '08.10.2025', country: 'DE', city: 'MÜNCHEN', venue: 'BACKSTAGE-WERK' }
                ].map((show, index) => (
                  <div 
                    key={index}
                    className="grid grid-cols-12 gap-2 p-3 bg-white bg-opacity-80 transition-all duration-300 hover:bg-black hover:bg-opacity-80 hover:text-[#ceae79] items-center"
                  >
                    <div className="col-span-3 md:col-span-2 font-blackbetty text-sm md:text-base font-semibold">
                      {show.date}
                    </div>
                    <div className="col-span-1 font-blackbetty text-sm md:text-base font-semibold">
                      {show.country}
                    </div>
                    <div className="col-span-3 md:col-span-2 font-blackbetty text-sm md:text-base font-semibold">
                      {show.city}
                    </div>
                    <div className="col-span-3 md:col-span-4 font-rama text-sm md:text-base">
                      {show.venue}
                    </div>
                    <div className="col-span-2 md:col-span-1 text-right">
                      <a 
                        href="#" 
                        className="font-blackbetty underline text-xs md:text-sm font-semibold transition-all duration-300 hover:opacity-50"
                      >
                        TICKETS
                      </a>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        ) : (
          /* Logged In State */
          <div className="text-center">
            <div className="bg-black bg-opacity-10 p-6 mb-8">
              <h2 className="font-helltown mb-3 text-xl md:text-2xl tracking-[0.1rem] uppercase font-semibold">
                Welcome back, {session.user?.name}! 🤠
              </h2>
              <p className="font-rama mb-4 text-base tracking-[0.05em]">
                Ready to vote for your favorite BossHoss songs?
              </p>
              <a 
                href="/voting"
                className="inline-flex items-center space-x-2 bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white font-bold py-3 px-6 rounded-full text-base transition-all duration-300 transform hover:scale-105 shadow-lg"
              >
                <Star className="w-4 h-4" />
                <span>Jetzt voten!</span>
              </a>
            </div>
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="relative z-20 text-center py-8 mt-8">
        <div className="max-w-6xl mx-auto px-4">
          <p className="font-rama opacity-80 text-sm">
            © 2025 The BossHoss • Back to the Boots Tour • 
            <span className="font-blackbetty ml-2">Powered by Fan Votes</span>
          </p>
        </div>
      </footer>
    </div>
  )
}