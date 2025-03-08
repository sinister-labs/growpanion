"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { Settings } from "lucide-react"

export default function Header() {
  const pathname = usePathname()

  return (
    <header className="w-full mb-8 sm:mb-12">
      <div className="flex flex-col sm:flex-row items-center justify-between">
        <div className="flex items-center mb-4 sm:mb-0">
          <svg
            className="w-8 h-8 sm:w-12 sm:h-12 mr-2 sm:mr-4"
            viewBox="0 0 24 24"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              d="M12 2L3 9V21H21V9L12 2Z"
              stroke="#4ade80"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            <path
              d="M12 15C13.6569 15 15 13.6569 15 12C15 10.3431 13.6569 9 12 9C10.3431 9 9 10.3431 9 12C9 13.6569 10.3431 15 12 15Z"
              stroke="#4ade80"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            <path d="M12 15V22" stroke="#4ade80" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          <h1 className="text-2xl sm:text-4xl font-bold text-white">
            Growpanion<span className="text-green-400">.</span>
          </h1>
        </div>
        <nav>
          <ul className="flex space-x-4 sm:space-x-6 text-sm sm:text-base text-white">
            <li>
              <Link
                href="/"
                className={`hover:text-green-400 transition-colors ${pathname === "/" ? "text-green-400" : ""}`}
              >
                Dashboard
              </Link>
            </li>
            <li>
              <Link
                href="/grows"
                className={`hover:text-green-400 transition-colors ${pathname.startsWith("/grows") ? "text-green-400" : ""}`}
              >
                Grows
              </Link>
            </li>
            <li>
              <Link
                href="/settings"
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

