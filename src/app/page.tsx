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
      <div className="min-h-screen bg-gradient-to-b from-amber-50 to-amber-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-amber-600 mx-auto mb-4"></div>
          <p className="text-amber-800 font-semibold">Loading...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-amber-50 via-orange-50 to-red-50">
      {/* Header */}
      <header className="bg-black/90 backdrop-blur-sm border-b-4 border-amber-500">
        <div className="max-w-6xl mx-auto px-4 py-4 flex justify-between items-center">
          <div className="flex items-center space-x-3">
            <div className="w-12 h-12 bg-gradient-to-br from-amber-400 to-orange-500 rounded-full flex items-center justify-center">
              <Music className="w-6 h-6 text-black" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-white">THE BOSSHOSS</h1>
              <p className="text-amber-400 text-sm font-semibold">BACK TO THE BOOTS TOUR</p>
            </div>
          </div>
          
          {session && (
            <button 
              onClick={() => signOut()}
              className="text-white hover:text-amber-400 transition-colors"
            >
              Sign Out
            </button>
          )}
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 py-8">
        {!session ? (
          /* Landing Page */
          <div className="text-center">
            {/* Hero Section */}
            <div className="mb-12">
              <div className="inline-block p-8 mb-8">
                <div className="w-32 h-32 bg-gradient-to-br from-amber-400 via-orange-500 to-red-500 rounded-full mx-auto mb-6 flex items-center justify-center shadow-2xl">
                  <Music className="w-16 h-16 text-white" />
                </div>
                <h1 className="text-5xl md:text-7xl font-black text-gray-900 mb-4 tracking-tight">
                  BACK TO THE
                  <span className="block text-amber-600">BOOTS</span>
                </h1>
                <p className="text-xl md:text-2xl text-gray-700 font-semibold mb-2">
                  Club Tour 2025
                </p>
                <p className="text-lg text-gray-600 max-w-2xl mx-auto">
                  Du entscheidest mit! Vote für deine Lieblingssongs und bestimme die Setlist für die exklusive Club Tour.
                </p>
              </div>

              {/* CTA Button */}
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
              
              <p className="text-sm text-gray-500 mt-4 max-w-md mx-auto">
                Sichere Anmeldung über Spotify. Wir speichern nur deine öffentlichen Profildaten.
              </p>
            </div>

            {/* Features */}
            <div className="grid md:grid-cols-3 gap-8 mb-12">
              <div className="bg-white/70 backdrop-blur-sm rounded-2xl p-6 shadow-lg border border-amber-200 hover:shadow-xl transition-shadow">
                <div className="w-12 h-12 bg-amber-500 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Star className="w-6 h-6 text-white" />
                </div>
                <h3 className="text-xl font-bold text-gray-900 mb-2">Smart Voting</h3>
                <p className="text-gray-600">
                  Deine Stimme zählt mehr, wenn du die Songs auch wirklich hörst! 
                  Bis zu 5 Punkte pro Vote.
                </p>
              </div>

              <div className="bg-white/70 backdrop-blur-sm rounded-2xl p-6 shadow-lg border border-amber-200 hover:shadow-xl transition-shadow">
                <div className="w-12 h-12 bg-orange-500 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Users className="w-6 h-6 text-white" />
                </div>
                <h3 className="text-xl font-bold text-gray-900 mb-2">Fan Community</h3>
                <p className="text-gray-600">
                  Sieh die Ergebnisse aller Fans und entdecke die beliebtesten 
                  BossHoss Tracks der Community.
                </p>
              </div>

              <div className="bg-white/70 backdrop-blur-sm rounded-2xl p-6 shadow-lg border border-amber-200 hover:shadow-xl transition-shadow">
                <div className="w-12 h-12 bg-red-500 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Clock className="w-6 h-6 text-white" />
                </div>
                <h3 className="text-xl font-bold text-gray-900 mb-2">Live Updates</h3>
                <p className="text-gray-600">
                  Automatische Playlist-Updates täglich. Die aktuellen Top-Songs 
                  immer in deiner Spotify Library.
                </p>
              </div>
            </div>

            {/* Tour Dates */}
            <div className="bg-black/90 rounded-2xl p-8 text-white">
              <h2 className="text-3xl font-bold mb-6 text-amber-400">BACK TO THE BOOTS CLUB TOUR</h2>
              <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 text-sm">
                <div className="bg-white/10 rounded-lg p-4">
                  <p className="text-amber-400 font-semibold">26.09.2025</p>
                  <p className="font-bold">Hamburg</p>
                  <p className="text-gray-300">Große Freiheit</p>
                </div>
                <div className="bg-white/10 rounded-lg p-4">
                  <p className="text-amber-400 font-semibold">27.09.2025</p>
                  <p className="font-bold">Berlin</p>
                  <p className="text-gray-300">Astra</p>
                </div>
                <div className="bg-white/10 rounded-lg p-4">
                  <p className="text-amber-400 font-semibold">01.10.2025</p>
                  <p className="font-bold">Köln</p>
                  <p className="text-gray-300">Live Music Hall</p>
                </div>
                <div className="bg-white/10 rounded-lg p-4">
                  <p className="text-amber-400 font-semibold">+ 5 weitere</p>
                  <p className="font-bold">Städte</p>
                  <p className="text-gray-300">Coming Soon</p>
                </div>
              </div>
            </div>
          </div>
        ) : (
          /* Logged In State */
          <div className="text-center">
            <div className="bg-white/80 rounded-2xl p-8 shadow-xl border border-amber-200 mb-8">
              <h2 className="text-3xl font-bold text-gray-900 mb-4">
                Welcome back, {session.user?.name}! 🤠
              </h2>
              <p className="text-lg text-gray-600 mb-6">
                Ready to vote for your favorite BossHoss songs?
              </p>
              <a 
                href="/voting"
                className="inline-flex items-center space-x-2 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white font-bold py-3 px-6 rounded-full text-lg transition-all duration-300 transform hover:scale-105 shadow-lg"
              >
                <Star className="w-5 h-5" />
                <span>Jetzt voten!</span>
              </a>
            </div>
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="bg-black/90 text-white py-8 mt-16">
        <div className="max-w-6xl mx-auto px-4 text-center">
          <p className="text-gray-400">
            © 2025 The BossHoss • Back to the Boots Tour • 
            <span className="text-amber-400 ml-2">Powered by Fan Votes</span>
          </p>
        </div>
      </footer>
    </div>
  )
}