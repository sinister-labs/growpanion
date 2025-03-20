import { Montserrat } from "next/font/google"
import { GrowDetailClient } from "@/components/grow-detail-client"
import { getAllGrowIds } from "@/lib/grows"

const montserrat = Montserrat({ subsets: ["latin"] })

export async function generateStaticParams() {
  if (process.env.NODE_ENV === 'development' || process.env.NEXT_PUBLIC_DEPLOYMENT_MODE === 'web') {
    return [{ id: "placeholder" }];
  }

  try {
    const growIds = await getAllGrowIds();
    return growIds.map(id => ({ id }));
  } catch (error) {
    console.error("Error fetching grow IDs:", error);
    return [{ id: "placeholder" }];
  }
}

export default function GrowDetailPage({ params }: { params: { id: string } }) {
  return (
    <div className={montserrat.className}>
      <GrowDetailClient id={params.id} />
    </div>
  );
}

