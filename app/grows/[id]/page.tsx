import { Montserrat } from "next/font/google"
import { GrowDetailClient } from "@/components/grow-detail-client"

const montserrat = Montserrat({ subsets: ["latin"] })

export async function generateStaticParams() {
  return [{
    id: "placeholder",
  }];
}

export default function GrowDetailPage({ params }: { params: { id: string } }) {
  return (
    <div className={montserrat.className}>
      <GrowDetailClient id={params.id} />
    </div>
  );
}

