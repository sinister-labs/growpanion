"use client"

import { Button } from "@/components/ui/button"
import { BarChart3, Beaker, Database, Home, Leaf, Menu, Router, Settings, Sprout } from "lucide-react"
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
    { view: 'dashboard' as const, label: 'Dashboard', icon: Home },
    { view: 'grows' as const, label: 'Grows', icon: Sprout },
    { view: 'devices' as const, label: 'Devices', icon: Router },
    { view: 'genetics' as const, label: 'Genetics', icon: Database },
    { view: 'statistics' as const, label: 'Stats', icon: BarChart3 },
    { view: 'tools' as const, label: 'Tools', icon: Beaker },
  ]

  return (
    <header className="z-50 w-full border-b border-border/[0.55] bg-background/[0.68] backdrop-blur-xl">
      <div className="container mx-auto flex max-w-screen-xl items-center justify-between px-4 py-3 sm:py-4">
        <div className="flex items-center gap-2 sm:gap-6">
          <Button
            variant="link"
            className="h-auto min-w-[40px] p-0 text-foreground no-underline hover:no-underline sm:min-w-[48px]"
            onClick={() => navigateTo('dashboard')}
          >
            <div className="flex items-center gap-2">
              <Image
                src="/logo-light.svg"
                alt="GrowPanion Logo"
                width={48}
                height={48}
                className="h-8 w-auto rounded-full bg-primary p-1 sm:h-10"
              />
              <span className="hidden text-lg font-semibold leading-none sm:block">GrowPanion</span>
            </div>
          </Button>

          <nav className="hidden items-center gap-1 rounded-full border border-border/[0.60] bg-muted/35 p-1 sm:flex">
            {navItems.map((item) => {
              const Icon = item.icon
              return (
              <Button
                key={item.view}
                variant="ghost"
                className={`${
                  currentView === item.view 
                    ? 'bg-primary text-primary-foreground hover:bg-primary/90 hover:text-primary-foreground' 
                    : 'text-muted-foreground hover:bg-background/[0.65] hover:text-foreground'
                } h-9 gap-2 px-3`}
                onClick={() => navigateTo(item.view)}
              >
                <Icon className="h-4 w-4" />
                {item.label}
              </Button>
            )})}
          </nav>

          <div className="sm:hidden">
            <DropdownMenu open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="text-muted-foreground hover:text-foreground"
                  aria-label="Open navigation"
                  title="Navigation"
                >
                  <Menu className="h-5 w-5" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start" className="rounded-3xl border-border/[0.70] bg-popover/[0.95] p-2 text-popover-foreground">
                {navItems.map((item) => {
                  const Icon = item.icon
                  return (
                  <DropdownMenuItem
                    key={item.view}
                    className={`${
                      currentView === item.view 
                        ? 'bg-primary text-primary-foreground' 
                        : 'text-foreground'
                    } cursor-pointer rounded-2xl gap-2`}
                    onClick={() => {
                      navigateTo(item.view)
                      setMobileMenuOpen(false)
                    }}
                  >
                    <Icon className="h-4 w-4" />
                    {item.label}
                  </DropdownMenuItem>
                )})}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>

        <div className="flex items-center">
          <Button
            variant="ghost"
            size="icon"
            className="flex h-10 w-10 items-center justify-center text-muted-foreground hover:text-foreground"
            onClick={() => navigateTo('settings')}
            aria-label="Settings"
            title="Settings"
          >
            {currentView === 'settings' ? <Leaf className="h-5 w-5" /> : <Settings className="h-5 w-5" />}
          </Button>
        </div>
      </div>
    </header>
  )
}
