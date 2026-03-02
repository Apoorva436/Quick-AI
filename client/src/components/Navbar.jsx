import React from 'react'
import { assets } from '../assets/assets'
import { useNavigate } from 'react-router-dom'
import { ArrowRight } from 'lucide-react'
import { useClerk, UserButton, useUser } from '@clerk/clerk-react'

const Navbar = () => {
  const navigate = useNavigate()
  const { user } = useUser()
  const { openSignIn } = useClerk()

  return (
    <header className="fixed top-0 left-0 w-full z-50 backdrop-blur-md bg-transparent">
      <div className="flex justify-between items-center py-4 px-4 sm:px-20 xl:px-32">
        
        {/* Logo */}
        <img
          src={assets.logo}
          alt="logo"
          className="w-32 sm:w-44 cursor-pointer"
          onClick={() => navigate('/')}
        />

        {/* Right Side */}
        {user ? (
          <UserButton  />
        ) : (
          <button
            onClick={() => openSignIn()}
            className="flex items-center gap-2 rounded-full text-sm bg-primary text-white px-8 py-2.5 hover:opacity-90 transition"
          >
            Get started
            <ArrowRight className="w-4 h-4" />
          </button>
        )}

      </div>
    </header>
  )
}

export default Navbar