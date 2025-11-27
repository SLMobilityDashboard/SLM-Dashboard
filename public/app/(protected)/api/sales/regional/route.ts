import { NextResponse } from "next/server"
import { mockRegionalSales, mockSalesData } from "@/lib/mock-data/sales-data"

export async function GET() {
  try {
    // Calculate additional regional metrics
    const regionalData = mockRegionalSales.map((region) => {
      const regionSales = mockSalesData.filter((sale) => sale.locationCity === region.city)
      const subscriptionSales = regionSales.filter((sale) => sale.batteryOwnershipModel === "subscription")

      return {
        ...region,
        subscriptionRate: (subscriptionSales.length / regionSales.length) * 100,
        averageDiscount: regionSales.reduce((sum, sale) => sum + sale.discountAmount, 0) / regionSales.length,
        topModel: regionSales.reduce(
          (acc, sale) => {
            acc[sale.bikeModel] = (acc[sale.bikeModel] || 0) + 1
            return acc
          },
          {} as Record<string, number>,
        ),
        customerTypes: {
          individual: regionSales.filter((sale) => sale.customerType === "individual").length,
          fleet: regionSales.filter((sale) => sale.customerType === "fleet").length,
        },
      }
    })

    // Calculate regional performance ranking
    const rankedRegions = regionalData
      .sort((a, b) => b.totalRevenue - a.totalRevenue)
      .map((region, index) => ({ ...region, rank: index + 1 }))

    return NextResponse.json({
      regionalSales: rankedRegions,
      totalRegions: rankedRegions.length,
      topPerformingRegion: rankedRegions[0],
      regionGrowthTrends: rankedRegions.map((region) => ({
        city: region.city,
        growthRate: region.growthRate,
        marketShare: region.marketShare,
      })),
    })
  } catch (error) {
    console.error("Error fetching regional sales:", error)
    return NextResponse.json({ error: "Failed to fetch regional sales" }, { status: 500 })
  }
}
