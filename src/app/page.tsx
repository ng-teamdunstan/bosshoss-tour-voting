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
      <header className="relative z-20 py-8">
        <div className="max-w-[112rem] mx-auto px-[2.4rem]">
          {/* Navigation */}
          <nav className="flex justify-between items-center mb-8">
            <div className="font-blackbetty text-2xl tracking-[0.15rem] uppercase">
              MENU
            </div>
            {session && (
              <button 
                onClick={() => signOut()}
                className="font-blackbetty text-2xl tracking-[0.15rem] uppercase hover:opacity-50 transition-all duration-300"
              >
                SIGN OUT
              </button>
            )}
          </nav>

          {/* Logo */}
          <div className="text-center relative">
            <img 
              src="https://thebosshoss.com/_next/static/media/tbh_bttb.cb9d83ef.webp"
              alt="The BossHoss - Back to the Boots"
              className="mx-auto mb-8 w-[28rem] h-auto"
              style={{
                filter: 'drop-shadow(16px 0 32px rgba(206,174,121,.1333)) drop-shadow(8px 0 16px rgba(206,174,121,.2666)) drop-shadow(2px 0 4px rgba(206,174,121,.6666)) drop-shadow(1px 0 2px rgba(206,174,121,.6666))'
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
              <div className="font-rama mb-8 text-[2.8rem] tracking-[0.15rem] uppercase font-semibold">
                Club Tour 2025
              </div>

              <h1 className="font-helltown mb-8 text-[5.5rem] leading-[1.1] tracking-[0.275rem] uppercase font-semibold">
                Du entscheidest mit!
              </h1>

              <p className="font-rama mb-12 text-[1.8rem] tracking-[0.05em] max-w-[80rem] mx-auto">
                Vote für deine Lieblingssongs und bestimme die Setlist für die exklusive Club Tour.
              </p>

              {/* CTA Button - FUNKTIONALITÄT UNVERÄNDERT */}
              <button
                onClick={handleSpotifyLogin}
                disabled={isLoading}
                className="group relative inline-flex items-center space-x-3 bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white font-bold py-4 px-8 rounded-full text-lg transition-all duration-300 transform hover:scale-105 shadow-xl hover:shadow-2xl disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isLoading ? (
                  <>
                    <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-white"></div>
                    <span>Connecting...</span>
                  </>
                ) : (
                  <>
                    <div className="w-8 h-8 bg-black rounded-full flex items-center justify-center">
                      <Music className="w-4 h-4 text-green-400" />
                    </div>
                    <span>Mit Spotify anmelden & voten</span>
                  </>
                )}
              </button>
              
              <p className="font-rama text-sm opacity-80 mt-4">
                Sichere Anmeldung über Spotify. Wir speichern nur deine öffentlichen Profildaten.
              </p>
            </div>

            {/* Features */}
            <div className="grid md:grid-cols-3 gap-8 mb-12">
              <div className="bg-black bg-opacity-10 p-8 transition-all duration-300 hover:bg-opacity-20">
                <div className="w-16 h-16 bg-black rounded-full flex items-center justify-center mx-auto mb-6">
                  <Star className="w-8 h-8 text-white" />
                </div>
                <h3 className="font-helltown mb-4 text-[3.5rem] tracking-[0.175rem] uppercase font-semibold">Smart Voting</h3>
                <p className="font-rama text-[1.8rem] tracking-[0.05em]">
                  Deine Stimme zählt mehr, wenn du die Songs auch wirklich hörst! 
                  Bis zu 5 Punkte pro Vote.
                </p>
              </div>

              <div className="bg-black bg-opacity-10 p-8 transition-all duration-300 hover:bg-opacity-20">
                <div className="w-16 h-16 bg-black rounded-full flex items-center justify-center mx-auto mb-6">
                  <Users className="w-8 h-8 text-white" />
                </div>
                <h3 className="font-helltown mb-4 text-[3.5rem] tracking-[0.175rem] uppercase font-semibold">Fan Community</h3>
                <p className="font-rama text-[1.8rem] tracking-[0.05em]">
                  Sieh die Ergebnisse aller Fans und entdecke die beliebtesten 
                  BossHoss Tracks der Community.
                </p>
              </div>

              <div className="bg-black bg-opacity-10 p-8 transition-all duration-300 hover:bg-opacity-20">
                <div className="w-16 h-16 bg-black rounded-full flex items-center justify-center mx-auto mb-6">
                  <Clock className="w-8 h-8 text-white" />
                </div>
                <h3 className="font-helltown mb-4 text-[3.5rem] tracking-[0.175rem] uppercase font-semibold">Live Updates</h3>
                <p className="font-rama text-[1.8rem] tracking-[0.05em]">
                  Automatische Playlist-Updates täglich. Die aktuellen Top-Songs 
                  immer in deiner Spotify Library.
                </p>
              </div>
            </div>

            {/* Tour Dates */}
            <div className="bg-black bg-opacity-10 p-8 mb-8">
              <h2 className="font-helltown mb-6 text-[5.5rem] leading-[1.1] tracking-[0.275rem] uppercase font-semibold">BACK TO THE BOOTS CLUB TOUR</h2>
              <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 text-sm">
                <div className="bg-white bg-opacity-10 p-4">
                  <p className="font-blackbetty font-semibold">26.09.2025</p>
                  <p className="font-bold">Hamburg</p>
                  <p className="opacity-80">Große Freiheit</p>
                </div>
                <div className="bg-white bg-opacity-10 p-4">
                  <p className="font-blackbetty font-semibold">27.09.2025</p>
                  <p className="font-bold">Berlin</p>
                  <p className="opacity-80">Astra</p>
                </div>
                <div className="bg-white bg-opacity-10 p-4">
                  <p className="font-blackbetty font-semibold">01.10.2025</p>
                  <p className="font-bold">Köln</p>
                  <p className="opacity-80">Live Music Hall</p>
                </div>
                <div className="bg-white bg-opacity-10 p-4">
                  <p className="font-blackbetty font-semibold">+ 5 weitere</p>
                  <p className="font-bold">Städte</p>
                  <p className="opacity-80">Coming Soon</p>
                </div>
              </div>
            </div>
          </div>
        ) : (
          /* Logged In State - FUNKTIONALITÄT UNVERÄNDERT */
          <div className="text-center">
            <div className="bg-black bg-opacity-10 p-8 mb-8">
              <h2 className="font-helltown mb-4 text-[3.5rem] tracking-[0.175rem] uppercase font-semibold">
                Welcome back, {session.user?.name}! 🤠
              </h2>
              <p className="font-rama mb-6 text-[1.8rem] tracking-[0.05em]">
                Ready to vote for your favorite BossHoss songs?
              </p>
              <a 
                href="/voting"
                className="inline-flex items-center space-x-2 bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white font-bold py-3 px-6 rounded-full text-lg transition-all duration-300 transform hover:scale-105 shadow-lg"
              >
                <Star className="w-5 h-5" />
                <span>Jetzt voten!</span>
              </a>
            </div>
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="relative z-20 text-center py-8 mt-16">
        <div className="max-w-6xl mx-auto px-4">
          <p className="font-rama opacity-80">
            © 2025 The BossHoss • Back to the Boots Tour • 
            <span className="font-blackbetty ml-2">Powered by Fan Votes</span>
          </p>
        </div>
      </footer>
    </div>
  )
}