"use client"

import Link from "next/link"
import Image from "next/image"
import { usePathname } from "next/navigation"
import { Settings } from "lucide-react"

export default function Header() {
  const pathname = usePathname()

  return (
    <header className="w-full mb-8 sm:mb-12">
      <div className="flex flex-col sm:flex-row items-center justify-between">
        <div className="flex items-center mb-4 sm:mb-0">
          <Image
            src="/logo-light.svg"
            alt="GrowPanion Logo"
            width={48}
            height={48}
            className="h-8 w-auto sm:h-14 mr-2"
          />
        </div>
        <nav>
          <ul className="flex space-x-4 sm:space-x-6 text-sm sm:text-base text-white">
            <li>
              <Link
                href="/"
                prefetch={true}
                className={`hover:text-green-400 transition-colors ${pathname === "/" ? "text-green-400" : ""}`}
              >
                Dashboard
              </Link>
            </li>
            <li>
              <Link
                href="/grows"
                prefetch={true}
                className={`hover:text-green-400 transition-colors ${pathname.startsWith("/grows") ? "text-green-400" : ""}`}
              >
                Grows
              </Link>
            </li>
            <li>
              <Link
                href="/settings"
                prefetch={true}
                className={`hover:text-green-400 transition-colors flex items-center ${pathname === "/settings" ? "text-green-400" : ""}`}
              >
                Settings
              </Link>
            </li>
          </ul>
        </nav>
      </div>
    </header>
  )
}

