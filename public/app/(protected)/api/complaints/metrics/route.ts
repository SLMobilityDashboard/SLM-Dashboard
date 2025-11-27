import { type NextRequest, NextResponse } from "next/server"
import { ComplaintManager } from "@/lib/complaint-system/agents/complaint-manager"
import MongoDBManager from "@/lib/mongodb"

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const days = Number.parseInt(searchParams.get("days") || "30")

    const startDate = new Date()
    startDate.setDate(startDate.getDate() - days)

    const complaints = await MongoDBManager.getComplaints({
      startDate,
    })

    const complaintManager = new ComplaintManager()
    const metrics = complaintManager.generateMetrics(complaints)

    return NextResponse.json({
      success: true,
      metrics,
      period: `${days} days`,
    })
  } catch (error: any) {
    console.error("Error generating metrics:", error)
    return NextResponse.json({ error: "Failed to generate metrics", details: error.message }, { status: 500 })
  }
}
