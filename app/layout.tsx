import { Montserrat } from "next/font/google"
import "./globals.css"
import { ThemeProvider } from "@/components/theme-provider"
import { DatabaseInitializer } from "@/components/database-initializer"
import { Toaster } from "@/components/ui/toaster"
import { Metadata } from "next"
import { NavigationProgress } from "@/components/navigation-progress"

const montserrat = Montserrat({ subsets: ["latin"] })

export const metadata: Metadata = {
  title: 'GrowPanion - Your Plant Companion App',
  description: 'Track and manage your plants with GrowPanion'
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="de" suppressHydrationWarning>
      <body className={`${montserrat.className} bg-black min-h-screen`}>
        <ThemeProvider attribute="class" defaultTheme="dark">
          <DatabaseInitializer>
            <NavigationProgress />
            <main className="min-h-screen bg-gradient-to-br from-gray-900 to-black">
              {children}
            </main>
            <Toaster />
          </DatabaseInitializer>
        </ThemeProvider>
      </body>
    </html>
  )
}
