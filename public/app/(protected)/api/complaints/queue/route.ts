import { type NextRequest, NextResponse } from "next/server"
import { WorkflowOrchestrator } from "@/lib/complaint-system/workflow-orchestrator"

const orchestrator = new WorkflowOrchestrator()

export async function GET(req: NextRequest) {
  try {
    const queueStatus = orchestrator.getQueueStatus()
    const monitoring = await orchestrator.monitorComplaintQueue()

    return NextResponse.json({
      success: true,
      queueStatus,
      monitoring,
    })
  } catch (error: any) {
    console.error("Error fetching queue status:", error)
    return NextResponse.json({ error: "Failed to fetch queue status", details: error.message }, { status: 500 })
  }
}
