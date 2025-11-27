import { NextResponse } from "next/server"
import { mockSalesData, mockFinancialMetrics } from "@/lib/mock-data/sales-data"

export async function GET() {
  try {
    // Calculate detailed financial metrics
    const financedSales = mockSalesData.filter((sale) => sale.paymentMethod === "finance")
    const cashSales = mockSalesData.filter((sale) => sale.paymentMethod === "cash")
    const cardSales = mockSalesData.filter((sale) => sale.paymentMethod === "card")

    // EMI analysis
    const emiAnalysis = {
      averageEmi: financedSales.reduce((sum, sale) => sum + sale.emi, 0) / financedSales.length || 0,
      averageLoanAmount: financedSales.reduce((sum, sale) => sum + sale.loanAmount, 0) / financedSales.length || 0,
      averageDownPayment: financedSales.reduce((sum, sale) => sum + sale.downPayment, 0) / financedSales.length || 0,
      financePartnerBreakdown: financedSales.reduce(
        (acc, sale) => {
          if (sale.financePartner) {
            acc[sale.financePartner] = (acc[sale.financePartner] || 0) + 1
          }
          return acc
        },
        {} as Record<string, number>,
      ),
    }

    // Revenue breakdown by month
    const monthlyRevenue = Array.from({ length: 12 }, (_, i) => {
      const month = new Date(2024, i, 1).toLocaleString("default", { month: "short" })
      const monthlySales = mockSalesData.filter((sale) => new Date(sale.dateOfSale).getMonth() === i)

      return {
        month,
        bikeRevenue: monthlySales.reduce((sum, sale) => sum + sale.bikePrice, 0),
        subscriptionRevenue: monthlySales
          .filter((sale) => sale.batteryOwnershipModel === "subscription")
          .reduce((sum, sale) => sum + sale.swapPlanPrice, 0),
        totalRevenue: monthlySales.reduce((sum, sale) => sum + sale.onroadPrice, 0),
        discounts: monthlySales.reduce((sum, sale) => sum + sale.discountAmount, 0),
      }
    })

    // Profitability analysis
    const profitabilityMetrics = {
      ...mockFinancialMetrics,
      revenueByPaymentMethod: {
        cash: cashSales.reduce((sum, sale) => sum + sale.onroadPrice, 0),
        finance: financedSales.reduce((sum, sale) => sum + sale.onroadPrice, 0),
        card: cardSales.reduce((sum, sale) => sum + sale.onroadPrice, 0),
      },
      discountImpact: {
        totalDiscounts: mockSalesData.reduce((sum, sale) => sum + sale.discountAmount, 0),
        discountPercentage:
          (mockSalesData.reduce((sum, sale) => sum + sale.discountAmount, 0) /
            mockSalesData.reduce((sum, sale) => sum + sale.bikePrice, 0)) *
          100,
        averageDiscountPerSale:
          mockSalesData.reduce((sum, sale) => sum + sale.discountAmount, 0) / mockSalesData.length,
      },
    }

    return NextResponse.json({
      financialMetrics: profitabilityMetrics,
      emiAnalysis,
      monthlyRevenue,
      paymentMethodAnalysis: {
        financeRate: (financedSales.length / mockSalesData.length) * 100,
        cashRate: (cashSales.length / mockSalesData.length) * 100,
        cardRate: (cardSales.length / mockSalesData.length) * 100,
      },
      revenueStreams: {
        primaryRevenue: mockSalesData.reduce((sum, sale) => sum + sale.bikePrice, 0),
        recurringRevenue: mockSalesData
          .filter((sale) => sale.batteryOwnershipModel === "subscription")
          .reduce((sum, sale) => sum + sale.swapPlanPrice * 12, 0), // Annual
        serviceRevenue: mockSalesData.filter((sale) => sale.amcPurchased).length * 25000, // Estimated AMC revenue
      },
    })
  } catch (error) {
    console.error("Error fetching financial data:", error)
    return NextResponse.json({ error: "Failed to fetch financial data" }, { status: 500 })
  }
}
