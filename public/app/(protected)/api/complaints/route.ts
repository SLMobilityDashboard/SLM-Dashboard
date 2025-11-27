import { NextResponse } from "next/server"
import { ComplaintCrew } from "@/ComplainCrew/crew/complaint-crew"
import { DatabaseTool } from "@/ComplainCrew/tools/database-tool" // Assuming this is still used, though not directly in the crew's return
import type { Complaint } from "@/ComplainCrew/types/complaint-types"

// Ensure Groq API key is loaded from .env
// This is typically handled by Next.js automatically for process.env variables
// but explicitly checking here for clarity.
if (!process.env.GROQ_API_KEY) {
  console.error("GROQ_API_KEY environment variable is not set.")
  // In a real application, you might want to throw an error or handle this more gracefully.
}

const dbTool = new DatabaseTool() // Instance of DatabaseTool, if needed elsewhere

export async function POST(req: Request) {
  try {
    const { customerId, customerEmail, title, description, type, priority, scooterId, stationId } = await req.json()

    // Generate a unique ID for the complaint
    const newComplaint: Complaint = {
      id: `COMP${Math.floor(Math.random() * 100000)
        .toString()
        .padStart(5, "0")}`,
      customerId,
      customerEmail,
      title,
      description,
      type,
      priority,
      status: "Open", // Initial status
      createdAt: new Date(),
      updatedAt: new Date(),
      scooterId,
      stationId,
    }

    const crew = new ComplaintCrew()
    const { workflow, finalResult, resolution } = await crew.processComplaint(newComplaint)

    // After processing, update the complaint status to resolved or requiring follow-up
    const finalStatus = finalResult.confidence > 0.7 ? "Resolved" : "Requires Follow-up"
    newComplaint.status = finalStatus as any // Update status based on AI confidence
    newComplaint.resolutionSummary = resolution
    newComplaint.assignedAgent = finalResult.nextAction.includes("Escalate")
      ? "Complaint Manager"
      : finalResult.nextAction.includes("Technician")
        ? "Technician"
        : finalResult.nextAction.includes("Finance Officer")
          ? "Finance Officer"
          : finalResult.nextAction.includes("Station Manager")
            ? "Station Manager"
            : "Support Agent" // Simplified assignment for display

    return NextResponse.json({ success: true, complaint: newComplaint, workflow, result: finalResult, resolution })
  } catch (error) {
    console.error("API Error processing complaint:", error)
    return NextResponse.json({ success: false, error: "Failed to process complaint." }, { status: 500 })
  }
}

// Other API routes (GET, PUT, DELETE) can be added here if needed
export async function GET() {
  return NextResponse.json({ message: "Complaint API is running." })
}
