"use client"

import { Button } from "@/components/ui/button"
import { Settings } from "lucide-react"
import { useRouting } from "@/hooks/useRouting"
import Image from "next/image"

export default function Header() {
  const { navigateTo, currentView } = useRouting()

  return (
    <header className="border-b border-white/10 backdrop-blur-md z-50 w-full">
      <div className="container max-w-screen-xl mx-auto px-4 py-6 flex justify-between items-center">
        <div className="flex items-center space-x-8">
          <Button
            variant="link"
            className="text-xl font-bold text-white p-0 h-auto min-w-[48px]"
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
          <nav className="flex items-center w-[200px] justify-start">
            <Button
              variant="ghost"
              className={`${currentView === 'dashboard' ? 'text-white bg-gray-800' : 'text-gray-400 hover:text-white'} w-[100px] justify-center`}
              onClick={() => navigateTo('dashboard')}
            >
              Dashboard
            </Button>
            <Button
              variant="ghost"
              className={`${currentView === 'grows' ? 'text-white bg-gray-800' : 'text-gray-400 hover:text-white'} w-[100px] justify-center`}
              onClick={() => navigateTo('grows')}
            >
              Grows
            </Button>
          </nav>
        </div>

        <div className="flex items-center min-w-[40px] justify-end">
          <Button
            variant="ghost"
            size="icon"
            className="text-gray-400 hover:text-white w-10 h-10 flex items-center justify-center"
            onClick={() => navigateTo('settings')}
          >
            <Settings className="h-5 w-5" />
          </Button>
        </div>
      </div>
    </header>
  )
}

