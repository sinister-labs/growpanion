import { useParams } from "next/navigation"
import { useEffect } from "react"
import { useRouting } from "@/hooks/useRouting"
import { Montserrat } from "next/font/google"
import { GrowDetailClient } from "@/components/grow-detail-client"
import { getAllGrowIds } from "@/lib/grows"

const montserrat = Montserrat({ subsets: ["latin"] })

export async function generateStaticParams() {
  return [{ id: "placeholder" }];
}

export default function GrowDetailPage() {
  const params = useParams()
  const id = params?.id as string
  const { navigateTo } = useRouting()

  useEffect(() => {
    if (id) {
      navigateTo('growDetail', { id })
    } else {
      navigateTo('grows')
    }
  }, [id, navigateTo])

  return null
}

