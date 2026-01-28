"use client"

import { Button } from "@/components/ui/button"
import { Settings, Menu } from "lucide-react"
import { useRouting } from "@/hooks/useRouting"
import Image from "next/image"
import { useState } from "react"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

export default function Header() {
  const { navigateTo, currentView } = useRouting()
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

  const navItems = [
    { view: 'dashboard' as const, label: 'Dashboard' },
    { view: 'grows' as const, label: 'Grows' },
    { view: 'statistics' as const, label: 'Stats' },
    { view: 'tools' as const, label: 'Tools' },
  ]

  return (
    <header className="border-b border-white/10 backdrop-blur-md z-50 w-full">
      <div className="container max-w-screen-xl mx-auto px-4 py-4 sm:py-6 flex justify-between items-center">
        <div className="flex items-center gap-2 sm:gap-8">
          {/* Logo */}
          <Button
            variant="link"
            className="text-xl font-bold text-white p-0 h-auto min-w-[40px] sm:min-w-[48px]"
            onClick={() => navigateTo('dashboard')}
          >
            <div className="flex items-center">
              <Image
                src="/logo-light.svg"
                alt="GrowPanion Logo"
                width={48}
                height={48}
                className="h-8 sm:h-10 w-auto"
              />
            </div>
          </Button>

          {/* Desktop Navigation */}
          <nav className="hidden sm:flex items-center gap-1">
            {navItems.map((item) => (
              <Button
                key={item.view}
                variant="ghost"
                className={`${
                  currentView === item.view 
                    ? 'text-white bg-gray-800' 
                    : 'text-gray-400 hover:text-white'
                } px-3`}
                onClick={() => navigateTo(item.view)}
              >
{item.label}
              </Button>
            ))}
          </nav>

          {/* Mobile Navigation */}
          <div className="sm:hidden">
            <DropdownMenu open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="text-gray-400 hover:text-white">
                  <Menu className="h-5 w-5" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start" className="bg-gray-800 border-gray-700">
                {navItems.map((item) => (
                  <DropdownMenuItem
                    key={item.view}
                    className={`${
                      currentView === item.view 
                        ? 'text-white bg-gray-700' 
                        : 'text-gray-300'
                    } cursor-pointer`}
                    onClick={() => {
                      navigateTo(item.view)
                      setMobileMenuOpen(false)
                    }}
                  >
{item.label}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>

        {/* Settings Button */}
        <div className="flex items-center">
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
