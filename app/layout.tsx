import "./globals.css"
import { ThemeProvider } from "@/components/theme-provider"
import { DatabaseInitializer } from "@/components/database-initializer"
import { Toaster } from "@/components/ui/toaster"
import { Metadata } from "next"
import { NavigationProgress } from "@/components/navigation-progress"
import { NotificationInitializer } from "@/components/notification-initializer"

export const metadata: Metadata = {
  title: 'GrowPanion',
  description: 'Track and manage indoor grows.'
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="de" suppressHydrationWarning>
      <body className="min-h-screen bg-background font-sans text-foreground">
        <ThemeProvider attribute="class" defaultTheme="light" enableSystem={false}>
          <DatabaseInitializer>
            <NotificationInitializer />
            <NavigationProgress />
            <main className="min-h-screen bg-transparent">
              {children}
            </main>
            <Toaster />
          </DatabaseInitializer>
        </ThemeProvider>
      </body>
    </html>
  )
}
