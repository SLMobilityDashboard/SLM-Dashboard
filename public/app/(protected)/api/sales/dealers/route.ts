import { NextResponse } from "next/server"
import { mockDealerPerformance, mockSalesData } from "@/lib/mock-data/sales-data"

export async function GET() {
  try {
    // Enhanced dealer performance data that matches the DealerPerformance interface
    const dealerData = mockDealerPerformance.map((dealer) => {
      const dealerSales = mockSalesData.filter((sale) => sale.dealerName === dealer.dealerName)
      
      // Calculate additional metrics
      const subscriptionRate = dealerSales.length > 0 
        ? (dealerSales.filter((sale) => sale.batteryOwnershipModel === "subscription").length / dealerSales.length) * 100
        : 0
      
      const averageDiscount = dealerSales.length > 0 
        ? dealerSales.reduce((sum, sale) => sum + sale.discountAmount, 0) / dealerSales.length
        : 0

      return {
        ...dealer,
        subscriptionRate,
        averageDiscount,
        // These are already included in the mockDealerPerformance from sales-data.ts
        // customerSatisfactionScore, deliveryRating, salesGrowth, revenueGrowth,
        // salespeople, monthlyPerformance, etc.
      }
    })

    // Return the array directly since the component expects data.reduce() to work
    return NextResponse.json(dealerData)
    
  } catch (error) {
    console.error("Error fetching dealer performance:", error)
    return NextResponse.json({ error: "Failed to fetch dealer performance" }, { status: 500 })
  }
}