import { type NextRequest, NextResponse } from "next/server"
import { WorkflowOrchestrator } from "@/lib/complaint-system/workflow-orchestrator"
import MongoDBManager from "@/lib/mongodb"

const orchestrator = new WorkflowOrchestrator()

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const complaint = await MongoDBManager.getComplaintById(params.id)

    if (!complaint) {
      return NextResponse.json({ error: "Complaint not found" }, { status: 404 })
    }

    return NextResponse.json({
      success: true,
      complaint,
    })
  } catch (error: any) {
    console.error("Error fetching complaint:", error)
    return NextResponse.json({ error: "Failed to fetch complaint", details: error.message }, { status: 500 })
  }
}

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const body = await req.json()
    const complaint = await MongoDBManager.getComplaintById(params.id)

    if (!complaint) {
      return NextResponse.json({ error: "Complaint not found" }, { status: 404 })
    }

    // Update complaint with new information
    const updatedComplaint = {
      ...complaint,
      ...body,
      updatedAt: new Date(),
    }

    // Process update through workflow
    const result = await orchestrator.processComplaintUpdate(updatedComplaint)

    // Save updated complaint
    await MongoDBManager.updateComplaint(result.complaint)

    return NextResponse.json({
      success: true,
      complaint: result.complaint,
      decision: result.decision,
      nextSteps: result.nextSteps,
    })
  } catch (error: any) {
    console.error("Error updating complaint:", error)
    return NextResponse.json({ error: "Failed to update complaint", details: error.message }, { status: 500 })
  }
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    await MongoDBManager.deleteComplaint(params.id)
    orchestrator.removeComplaintFromQueue(params.id)

    return NextResponse.json({
      success: true,
      message: "Complaint deleted successfully",
    })
  } catch (error: any) {
    console.error("Error deleting complaint:", error)
    return NextResponse.json({ error: "Failed to delete complaint", details: error.message }, { status: 500 })
  }
}
