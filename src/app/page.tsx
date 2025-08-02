'use client'

import { useSession, signIn, signOut } from 'next-auth/react'
import { useState } from 'react'
import { Star, Users, Clock } from 'lucide-react'

export default function Home() {
  const { data: session, status } = useSession()
  const [isLoading, setIsLoading] = useState(false)

  const handleSpotifyLogin = async () => {
    setIsLoading(true)
    await signIn('spotify', { callbackUrl: '/voting' })
  }

  // Spotify Logo SVG Component
  const SpotifyLogo = ({ className }: { className?: string }) => (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <path d="M12 0C5.4 0 0 5.4 0 12s5.4 12 12 12 12-5.4 12-12S18.66 0 12 0zm5.521 17.34c-.24.359-.66.48-1.021.24-2.82-1.74-6.36-2.101-10.561-1.141-.418.122-.779-.179-.899-.539-.12-.421.18-.78.54-.9 4.56-1.021 8.52-.6 11.64 1.32.42.18.479.659.301 1.02zm1.44-3.3c-.301.42-.841.6-1.262.3-3.239-1.98-8.159-2.58-11.939-1.38-.479.12-1.02-.12-1.14-.6-.12-.48.12-1.021.6-1.141C9.6 9.9 15 10.561 18.72 12.84c.361.181.54.78.241 1.2zm.12-3.36C15.24 8.4 8.82 8.16 5.16 9.301c-.6.179-1.2-.181-1.38-.721-.18-.601.18-1.2.72-1.381 4.26-1.26 11.28-1.02 15.721 1.621.539.3.719 1.02.42 1.56-.299.421-1.02.599-1.559.3z"/>
    </svg>
  )

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
          {/* Navigation - nur Sign Out wenn eingeloggt */}
          {session && (
            <nav className="flex justify-end items-center mb-6">
              <button 
                onClick={() => signOut()}
                className="font-blackbetty text-lg tracking-[0.15rem] uppercase hover:opacity-50 transition-all duration-300"
              >
                SIGN OUT
              </button>
            </nav>
          )}

          {/* Logo */}
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
            {/* Hero Section */}
            <div className="mb-12">
              <div className="font-rama mb-4 text-xl md:text-2xl tracking-[0.15rem] uppercase font-semibold">
                Club Tour 2025
              </div>

              <h1 className="font-helltown mb-6 text-2xl md:text-4xl lg:text-5xl leading-[1.1] tracking-[0.2rem] uppercase font-semibold">
                Du entscheidest mit!
              </h1>

              <p className="font-rama mb-8 text-base md:text-lg tracking-[0.05em] max-w-[60rem] mx-auto">
                Vote für deine Lieblingssongs und bestimme die Setlist für die exklusive Club Tour.
              </p>

              {/* Spotify CTA Button mit Logo */}
              <button
                onClick={handleSpotifyLogin}
                disabled={isLoading}
                className="group relative inline-flex items-center space-x-3 bg-[#1DB954] hover:bg-[#1ed760] text-white font-bold py-3 px-6 rounded-full text-base transition-all duration-300 transform hover:scale-105 shadow-xl hover:shadow-2xl disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isLoading ? (
                  <>
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                    <span>Connecting...</span>
                  </>
                ) : (
                  <>
                    <SpotifyLogo className="w-6 h-6 text-white" />
                    <span>Mit Spotify anmelden & voten</span>
                  </>
                )}
              </button>
              
              <p className="font-rama text-xs md:text-sm opacity-80 mt-3">
                Sichere Anmeldung über Spotify. Wir speichern nur deine öffentlichen Profildaten.
              </p>
            </div>

            {/* Features */}
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

            {/* Tour Dates */}
            <div className="mb-8">
              {/* Tour Titel */}
              <div className="text-center mb-6">
                <div className="font-helltown text-xl md:text-2xl lg:text-3xl tracking-[0.2rem] uppercase font-semibold">
                  Back To The Boots Club Tour
                </div>
              </div>

              {/* Desktop Tour List */}
              <div className="hidden md:block space-y-1">
                {[
                  { date: '26.09.2025', city: 'HAMBURG', venue: 'GROSSE FREIHEIT', status: 'sold_out' },
                  { date: '27.09.2025', city: 'BERLIN', venue: 'ASTRA', status: 'sold_out' },
                  { date: '01.10.2025', city: 'KÖLN', venue: 'LIVE MUSIC HALL', status: 'sold_out' },
                  { date: '02.10.2025', city: 'MÜNSTER', venue: 'SKATERS PALACE', status: 'sold_out' },
                  { date: '03.10.2025', city: 'HANNOVER', venue: 'CAPITOL', status: 'sold_out' },
                  { date: '04.10.2025', city: 'STUTTGART', venue: 'IM WIZEMANN', status: 'sold_out' },
                  { date: '05.10.2025', city: 'FRANKFURT', venue: 'BATSCHKAPP', status: 'sold_out' },
                  { date: '06.10.2025', city: 'LEIPZIG', venue: 'TÄUBCHENTHAL', status: 'few_left' },
                  { date: '07.10.2025', city: 'DRESDEN', venue: 'ALTER SCHLACHTHOF', status: 'few_left' },
                  { date: '08.10.2025', city: 'MÜNCHEN', venue: 'BACKSTAGE-WERK', status: 'sold_out' }
                ].map((show, index) => (
                  <a 
                    key={index}
                    href="https://shop.thebosshoss.com"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="relative grid grid-cols-12 gap-2 p-3 transition-all duration-300 items-center block overflow-hidden group"
                    style={{ 
                      backgroundColor: '#ceae79'
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.backgroundColor = 'rgba(0,0,0,0.8)'
                      e.currentTarget.style.color = '#ceae79'
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.backgroundColor = '#ceae79'
                      e.currentTarget.style.color = '#000'
                    }}
                  >
                    {/* Schräger Badge */}
                    {show.status === 'sold_out' && (
                      <div className="absolute top-2 left-1/2 transform -translate-x-1/2 -rotate-12 z-10">
                        <span className="font-helltown text-xs bg-red-600 text-white px-3 py-1 uppercase shadow-lg">
                          SOLD OUT
                        </span>
                      </div>
                    )}
                    {show.status === 'few_left' && (
                      <div className="absolute top-2 left-1/2 transform -translate-x-1/2 -rotate-12 z-10">
                        <span className="font-helltown text-xs bg-green-600 text-white px-3 py-1 uppercase shadow-lg">
                          FEW LEFT
                        </span>
                      </div>
                    )}

                    <div className="col-span-3 font-blackbetty text-base font-semibold">
                      {show.date}
                    </div>
                    <div className="col-span-3 font-blackbetty text-base font-semibold">
                      {show.city}
                    </div>
                    <div className="col-span-4 font-rama text-base">
                      {show.venue}
                    </div>
                    <div className="col-span-2 text-right">
                      <span className="font-blackbetty underline text-sm font-semibold">
                        TICKETS
                      </span>
                    </div>
                  </a>
                ))}
              </div>

              {/* Mobile Tour List */}
              <div className="md:hidden space-y-3">
                {[
                  { date: '26.09.2025', city: 'HAMBURG', venue: 'GROSSE FREIHEIT', status: 'sold_out' },
                  { date: '27.09.2025', city: 'BERLIN', venue: 'ASTRA', status: 'sold_out' },
                  { date: '01.10.2025', city: 'KÖLN', venue: 'LIVE MUSIC HALL', status: 'sold_out' },
                  { date: '02.10.2025', city: 'MÜNSTER', venue: 'SKATERS PALACE', status: 'sold_out' },
                  { date: '03.10.2025', city: 'HANNOVER', venue: 'CAPITOL', status: 'sold_out' },
                  { date: '04.10.2025', city: 'STUTTGART', venue: 'IM WIZEMANN', status: 'sold_out' },
                  { date: '05.10.2025', city: 'FRANKFURT', venue: 'BATSCHKAPP', status: 'sold_out' },
                  { date: '06.10.2025', city: 'LEIPZIG', venue: 'TÄUBCHENTHAL', status: 'few_left' },
                  { date: '07.10.2025', city: 'DRESDEN', venue: 'ALTER SCHLACHTHOF', status: 'few_left' },
                  { date: '08.10.2025', city: 'MÜNCHEN', venue: 'BACKSTAGE-WERK', status: 'sold_out' }
                ].map((show, index) => (
                  <a 
                    key={index}
                    href="https://shop.thebosshoss.com"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="relative p-3 transition-all duration-300 block overflow-hidden"
                    style={{ 
                      backgroundColor: '#ceae79'
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.backgroundColor = 'rgba(0,0,0,0.8)'
                      e.currentTarget.style.color = '#ceae79'
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.backgroundColor = '#ceae79'
                      e.currentTarget.style.color = '#000'
                    }}
                  >
                    {/* Badge für Mobile - oben mittig */}
                    {show.status === 'sold_out' && (
                      <div className="absolute top-1 left-1/2 transform -translate-x-1/2 -rotate-12 z-10">
                        <span className="font-helltown text-xs bg-red-600 text-white px-2 py-1 uppercase shadow-lg">
                          SOLD OUT
                        </span>
                      </div>
                    )}
                    {show.status === 'few_left' && (
                      <div className="absolute top-1 left-1/2 transform -translate-x-1/2 -rotate-12 z-10">
                        <span className="font-helltown text-xs bg-green-600 text-white px-2 py-1 uppercase shadow-lg">
                          FEW LEFT
                        </span>
                      </div>
                    )}

                    <div className="flex justify-between items-start mb-1">
                      <div className="font-blackbetty text-sm font-semibold">
                        {show.date}
                      </div>
                      <span className="font-blackbetty underline text-xs font-semibold">
                        TICKETS
                      </span>
                    </div>
                    <div className="font-blackbetty text-base font-semibold mb-1">
                      {show.city}
                    </div>
                    <div className="font-rama text-sm">
                      {show.venue}
                    </div>
                  </a>
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