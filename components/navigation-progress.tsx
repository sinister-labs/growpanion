"use client"

import { useEffect } from "react"
import { usePathname, useSearchParams } from "next/navigation"
import NProgress from "nprogress"

NProgress.configure({
    minimum: 0.3,
    easing: 'ease',
    speed: 300,
    showSpinner: false,
})

export function NavigationProgress() {
    const pathname = usePathname()
    const searchParams = useSearchParams()

    useEffect(() => {
        NProgress.start()
        const timer = setTimeout(() => {
            NProgress.done()
        }, 100)

        return () => {
            clearTimeout(timer)
        }
    }, [pathname, searchParams])

    return null
} 