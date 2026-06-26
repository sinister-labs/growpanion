import "./globals.css"
import { ThemeProvider } from "@/components/theme-provider"
import { DatabaseInitializer } from "@/components/database-initializer"
import { Toaster } from "@/components/ui/toaster"
import { Metadata } from "next"
import { NavigationProgress } from "@/components/navigation-progress"
import { NotificationInitializer } from "@/components/notification-initializer"

export const metadata: Metadata = {
  title: 'GrowPanion - Your Plant Companion App',
  description: 'Track and manage your plants with GrowPanion'
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="de" suppressHydrationWarning>
      <body className="bg-black min-h-screen font-sans">
        <ThemeProvider attribute="class" defaultTheme="dark">
          <DatabaseInitializer>
            <NotificationInitializer />
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
