// File: /app/api/sales/overview/route.ts
import { NextResponse } from "next/server";
import {
  mockSalesData,
  mockFinancialMetrics,
  mockMonthlySales,
  mockModelSales,
  mockPaymentMethods,
  mockSubscriptionPlans,
  mockRegionalSales,
} from "@/lib/mock-data/sales-data";

export async function GET() {
  try {
    // Calculate key metrics
    const totalSales = mockSalesData.length;
    const totalRevenue = mockSalesData.reduce((sum, sale) => sum + sale.onroadPrice, 0);
    const averageOrderValue = totalRevenue / totalSales;
    const subscriptionRate =
      (mockSalesData.filter((sale) => sale.batteryOwnershipModel === "subscription").length / totalSales) * 100;

    // Current month vs previous month
    const currentMonth = new Date().getMonth();
    const currentMonthSales = mockSalesData.filter((sale) => new Date(sale.dateOfSale).getMonth() === currentMonth);
    const previousMonthSales = mockSalesData.filter((sale) => new Date(sale.dateOfSale).getMonth() === currentMonth - 1);

    const salesGrowth =
      previousMonthSales.length > 0
        ? ((currentMonthSales.length - previousMonthSales.length) / previousMonthSales.length) * 100
        : 0;

    const revenueGrowth =
      previousMonthSales.length > 0
        ? ((currentMonthSales.reduce((sum, sale) => sum + sale.onroadPrice, 0) -
            previousMonthSales.reduce((sum, sale) => sum + sale.onroadPrice, 0)) /
            previousMonthSales.reduce((sum, sale) => sum + sale.onroadPrice, 0)) *
          100
        : 0;

    // Format model sales data correctly - using the existing mockModelSales structure
    const formattedModelSales = mockModelSales.map(model => ({
      model: model.model, // Use the correct property name
      sales: model.sales,
      revenue: model.revenue,
      percentage: (model.sales / totalSales) * 100, // Calculate percentage correctly
      averagePrice: model.averagePrice
    }));

    // Calculate top performing metrics
    const topModel = mockModelSales.reduce((prev, current) => 
      (current.sales > prev.sales) ? current : prev
    );

    const topRegion = mockRegionalSales.reduce((prev, current) => 
      (current.totalSales > prev.totalSales) ? current : prev
    );

    // Calculate conversion metrics
    const totalLeads = Math.round(totalSales * 1.8); // Assuming 55% conversion rate
    const conversionRate = (totalSales / totalLeads) * 100;

    const overview = {
      kpis: {
        totalSales,
        totalRevenue,
        averageOrderValue,
        subscriptionRate,
        salesGrowth,
        revenueGrowth,
        conversionRate,
        topModel: topModel.model,
        topRegion: topRegion.city
      },
      financialMetrics: mockFinancialMetrics,
      monthlySales: mockMonthlySales,
      modelSales: formattedModelSales,
      regionSales: mockRegionalSales.map(region => ({
        ...region,
        percentage: region.marketShare
      })),
      paymentMethods: mockPaymentMethods,
      subscriptionPlans: mockSubscriptionPlans,
      recentSales: mockSalesData
        .sort((a, b) => new Date(b.dateOfSale).getTime() - new Date(a.dateOfSale).getTime())
        .slice(0, 10)
        .map(sale => ({
          id: sale.id,
          bikeModel: sale.bikeModel,
          customerType: sale.customerType,
          onroadPrice: sale.onroadPrice,
          locationCity: sale.locationCity,
          dealerName: sale.dealerName,
          dateOfSale: sale.dateOfSale,
          paymentMethod: sale.paymentMethod,
          batteryOwnershipModel: sale.batteryOwnershipModel
        })),
      summary: {
        totalCustomers: totalSales,
        individualCustomers: mockSalesData.filter(sale => sale.customerType === "individual").length,
        fleetCustomers: mockSalesData.filter(sale => sale.customerType === "fleet").length,
        avgDealValue: averageOrderValue,
        totalDiscounts: mockFinancialMetrics.totalDiscounts,
        avgDiscount: mockFinancialMetrics.averageDiscount
      }
    };

    return NextResponse.json(overview);
  } catch (error) {
    console.error("Error fetching sales overview:", error);
    return NextResponse.json({ error: "Failed to fetch sales overview" }, { status: 500 });
  }
}