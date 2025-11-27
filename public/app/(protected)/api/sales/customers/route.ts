import { NextResponse } from "next/server"
import { getCustomerInsights } from "@/lib/mock-data/sales-data"

export async function GET() {
  try {
    // Get customer insights data
    const customerInsights = getCustomerInsights()

    // Add some additional processing if needed
    const processedData = {
      ...customerInsights,
      // Add timestamp for cache management
      lastUpdated: new Date().toISOString(),
      // Add summary statistics
      summary: {
        totalCustomerValue: customerInsights.totalCustomers * customerInsights.averageCustomerValue,
        highValueCustomers: customerInsights.customerSegments
          .filter((segment) => segment.averageValue > 300000)
          .reduce((sum, segment) => sum + segment.count, 0),
        loyaltyScore: Math.round(
          (customerInsights.customerRetentionRate +
            customerInsights.subscriptionAdoptionRate +
            (customerInsights.customerSatisfaction.reduce((sum, cat) => sum + cat.score, 0) /
              customerInsights.customerSatisfaction.length) *
              20) /
            3,
        ),
        conversionEfficiency:
          Math.round(
            (customerInsights.leadSources.reduce((sum, source) => sum + source.conversionRate, 0) /
              customerInsights.leadSources.length) *
              10,
          ) / 10,
      },
    }

    return NextResponse.json(processedData, {
      headers: {
        "Cache-Control": "public, s-maxage=300, stale-while-revalidate=600", // Cache for 5 minutes
      },
    })
  } catch (error) {
    console.error("Error fetching customer insights:", error)

    return NextResponse.json(
      {
        error: "Failed to fetch customer insights",
        message: error instanceof Error ? error.message : "Unknown error occurred",
        timestamp: new Date().toISOString(),
      },
      { status: 500 },
    )
  }
}

// Optional: Add POST method for updating customer data
export async function POST(request: Request) {
  try {
    const body = await request.json()

    // Here you would typically update customer data in your database
    // For now, we'll just return a success response

    console.log("Customer data update request:", body)

    return NextResponse.json({
      success: true,
      message: "Customer data updated successfully",
      timestamp: new Date().toISOString(),
    })
  } catch (error) {
    console.error("Error updating customer data:", error)

    return NextResponse.json(
      {
        error: "Failed to update customer data",
        message: error instanceof Error ? error.message : "Unknown error occurred",
        timestamp: new Date().toISOString(),
      },
      { status: 500 },
    )
  }
}

// Optional: Add PUT method for bulk customer updates
export async function PUT(request: Request) {
  try {
    const body = await request.json()

    // Validate the request body
    if (!body.updates || !Array.isArray(body.updates)) {
      return NextResponse.json({ error: "Invalid request format. Expected 'updates' array." }, { status: 400 })
    }

    // Process bulk updates
    console.log(`Processing ${body.updates.length} customer updates`)

    return NextResponse.json({
      success: true,
      message: `Successfully processed ${body.updates.length} customer updates`,
      processedCount: body.updates.length,
      timestamp: new Date().toISOString(),
    })
  } catch (error) {
    console.error("Error processing bulk customer updates:", error)

    return NextResponse.json(
      {
        error: "Failed to process bulk customer updates",
        message: error instanceof Error ? error.message : "Unknown error occurred",
        timestamp: new Date().toISOString(),
      },
      { status: 500 },
    )
  }
}
