"use client"

import { Button } from "@/components/ui/button"
import { Settings } from "lucide-react"
import { useRouting, AppView } from "@/hooks/useRouting"
import Image from "next/image"

export default function Header() {
  const { navigateTo, currentView } = useRouting()

  return (
    <header className="border-b border-white/10 backdrop-blur-md sticky top-0 z-50">
      <div className="container max-w-screen-xl mx-auto px-4 py-6 flex justify-between items-center">
        <div className="flex items-center space-x-8">
          <Button
            variant="link"
            className="text-xl font-bold text-white p-0 h-auto"
            onClick={() => navigateTo('dashboard')}
          >
            <div className="flex items-center">
              <Image
                src="/logo-light.svg"
                alt="GrowPanion Logo"
                width={48}
                height={48}
                className="h-10 w-auto mr-2"
              />
            </div>
          </Button>
          <nav className="flex items-center space-x-3">
            <Button
              variant="ghost"
              className={`${currentView === 'dashboard' ? 'text-white bg-gray-800' : 'text-gray-400 hover:text-white'}`}
              onClick={() => navigateTo('dashboard')}
            >
              Dashboard
            </Button>
            <Button
              variant="ghost"
              className={`${currentView === 'grows' ? 'text-white bg-gray-800' : 'text-gray-400 hover:text-white'}`}
              onClick={() => navigateTo('grows')}
            >
              Grows
            </Button>
          </nav>
        </div>

        <div className="flex items-center">
          <Button
            variant="ghost"
            size="icon"
            className="text-gray-400 hover:text-white"
            onClick={() => navigateTo('settings')}
          >
            <Settings className="h-5 w-5" />
          </Button>
        </div>
      </div>
    </header>
  )
}

