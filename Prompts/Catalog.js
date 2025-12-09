const catalog = {
  tables: {
    customers: {
      description:
        "Customer profiles with demographic, contact, signup, and loyalty program data",
      columns: {
        customer_id: { type: "integer", synonyms: ["identifier", "number"] },
        first_name: { type: "string", synonyms: [] },
        last_name: { type: "string", synonyms: [] },
        email: { type: "string", synonyms: ["email address", "e-mail"] },
        phone: { type: "string", synonyms: ["contact", "mobile number"] },
        signup_date: { type: "date", synonyms: ["date", "timestamp"] },
        loyalty_tier: { type: "string", synonyms: [] },
        date_of_birth: { type: "date", synonyms: [] },
        country: { type: "string", synonyms: [] },
        preferred_language: { type: "string", synonyms: [] },
      },
    },
    orders: {
      description:
        "High-level order header records with dates, status, currency, and channel",
      columns: {
        order_id: { type: "integer", synonyms: [] },
        customer_id: { type: "integer", synonyms: [] },
        order_date: { type: "date", synonyms: [] },
        status: { type: "string", synonyms: [] },
        total_amount: { type: "float", synonyms: [] },
        currency: { type: "string", synonyms: [] },
        sales_channel: { type: "string", synonyms: [] },
        shipping_method: { type: "string", synonyms: [] },
        tax_amount: { type: "float", synonyms: [] },
      },
    },
    order_items: {
      description:
        "Individual line items per order, including product, quantity, and per‑unit pricing",
      columns: {
        order_item_id: { type: "integer", synonyms: [] },
        order_id: { type: "integer", synonyms: [] },
        product_id: { type: "integer", synonyms: [] },
        quantity: { type: "integer", synonyms: [] },
        unit_price: { type: "float", synonyms: [] },
        discount_amount: { type: "float", synonyms: [] },
        tax_amount: { type: "float", synonyms: [] },
      },
    },
    products: {
      description:
        "Product catalog with SKUs, categories, pricing, dimensions, and inventory flags",
      columns: {
        product_id: { type: "integer", synonyms: [] },
        sku: { type: "string", synonyms: [] },
        name: { type: "string", synonyms: [] },
        category_id: { type: "integer", synonyms: [] },
        price: { type: "float", synonyms: [] },
        cost: { type: "float", synonyms: [] },
        weight_kg: { type: "float", synonyms: [] },
        height_cm: { type: "float", synonyms: [] },
        width_cm: { type: "float", synonyms: [] },
        depth_cm: { type: "float", synonyms: [] },
        in_stock: { type: "boolean", synonyms: [] },
        discontinued: { type: "boolean", synonyms: [] },
      },
    },
    categories: {
      description:
        "Hierarchical product categories and metadata for navigation and reporting",
      columns: {
        category_id: { type: "integer", synonyms: [] },
        parent_category_id: { type: "integer", synonyms: [] },
        name: { type: "string", synonyms: [] },
        description: { type: "string", synonyms: [] },
        display_order: { type: "integer", synonyms: [] },
        is_active: { type: "boolean", synonyms: [] },
      },
    },
    suppliers: {
      description:
        "External suppliers providing products, with contact info and rating",
      columns: {
        supplier_id: { type: "integer", synonyms: [] },
        name: { type: "string", synonyms: [] },
        contact_name: { type: "string", synonyms: [] },
        contact_email: { type: "string", synonyms: [] },
        phone: { type: "string", synonyms: [] },
        address: { type: "string", synonyms: [] },
        rating: { type: "float", synonyms: [] },
        active_since: { type: "date", synonyms: [] },
      },
    },
    inventory_movements: {
      description:
        "Stock in/out events per warehouse with quantity, reason, and timestamps",
      columns: {
        movement_id: { type: "integer", synonyms: [] },
        product_id: { type: "integer", synonyms: [] },
        warehouse_id: { type: "integer", synonyms: [] },
        movement_type: { type: "string", synonyms: [] },
        quantity: { type: "integer", synonyms: [] },
        movement_date: { type: "date", synonyms: [] },
        reference_no: { type: "string", synonyms: [] },
      },
    },
    warehouses: {
      description:
        "Physical warehouse locations with capacity and manager assignments",
      columns: {
        warehouse_id: { type: "integer", synonyms: [] },
        name: { type: "string", synonyms: [] },
        location_city: { type: "string", synonyms: [] },
        location_country: { type: "string", synonyms: [] },
        capacity_units: { type: "integer", synonyms: [] },
        manager_employee_id: { type: "integer", synonyms: [] },
      },
    },
    employees: {
      description:
        "Company employees, their roles, departments, hire dates, salaries",
      columns: {
        employee_id: { type: "integer", synonyms: [] },
        first_name: { type: "string", synonyms: [] },
        last_name: { type: "string", synonyms: [] },
        email: { type: "string", synonyms: [] },
        department_id: { type: "integer", synonyms: [] },
        role: { type: "string", synonyms: [] },
        hire_date: { type: "date", synonyms: [] },
        salary: { type: "float", synonyms: [] },
        manager_id: { type: "integer", synonyms: [] },
      },
    },
    departments: {
      description:
        "Organizational departments with cost centers and head counts",
      columns: {
        department_id: { type: "integer", synonyms: [] },
        name: { type: "string", synonyms: [] },
        cost_center_code: { type: "string", synonyms: [] },
        location: { type: "string", synonyms: [] },
        budget_year: { type: "integer", synonyms: [] },
      },
    },
    payroll: {
      description:
        "Monthly payroll runs per employee, including gross/net pay, deductions, taxes",
      columns: {
        payroll_id: { type: "integer", synonyms: [] },
        employee_id: { type: "integer", synonyms: [] },
        pay_period_start: { type: "date", synonyms: [] },
        pay_period_end: { type: "date", synonyms: [] },
        gross_pay: { type: "float", synonyms: [] },
        net_pay: { type: "float", synonyms: [] },
        tax_deduction: { type: "float", synonyms: [] },
        benefits_deduction: { type: "float", synonyms: [] },
      },
    },
    attendance: {
      description: "Daily clock‑in/clock‑out records for hourly employees",
      columns: {
        attendance_id: { type: "integer", synonyms: [] },
        employee_id: { type: "integer", synonyms: [] },
        date: { type: "date", synonyms: [] },
        clock_in_time: { type: "string", synonyms: [] },
        clock_out_time: { type: "string", synonyms: [] },
        hours_worked: { type: "float", synonyms: [] },
      },
    },
    returns: {
      description:
        "Product return events with reason codes, restocking status, refund amounts",
      columns: {
        return_id: { type: "integer", synonyms: [] },
        order_item_id: { type: "integer", synonyms: [] },
        return_date: { type: "date", synonyms: [] },
        reason_code: { type: "string", synonyms: [] },
        refunded_amount: { type: "float", synonyms: [] },
        restocked_flag: { type: "boolean", synonyms: [] },
      },
    },
    reviews: {
      description:
        "Customer product reviews with ratings, comments, and moderation status",
      columns: {
        review_id: { type: "integer", synonyms: [] },
        product_id: { type: "integer", synonyms: [] },
        customer_id: { type: "integer", synonyms: [] },
        rating: { type: "integer", synonyms: [] },
        review_text: { type: "string", synonyms: [] },
        review_date: { type: "date", synonyms: [] },
        status: { type: "string", synonyms: [] },
      },
    },
    regions: {
      description:
        "Geographical sales regions for territory management and reporting",
      columns: {
        region_id: { type: "integer", synonyms: [] },
        name: { type: "string", synonyms: [] },
        manager_employee_id: { type: "integer", synonyms: [] },
        target_sales_amount: { type: "float", synonyms: [] },
        currency: { type: "string", synonyms: [] },
      },
    },
    sales_targets: {
      description:
        "Monthly/quarterly sales targets per region and product category",
      columns: {
        target_id: { type: "integer", synonyms: [] },
        region_id: { type: "integer", synonyms: [] },
        category_id: { type: "integer", synonyms: [] },
        period_start: { type: "date", synonyms: [] },
        period_end: { type: "date", synonyms: [] },
        target_amount: { type: "float", synonyms: [] },
      },
    },
    marketing_campaigns: {
      description:
        "Campaign metadata, channels, budget, start/end, and attribution data",
      columns: {
        campaign_id: { type: "integer", synonyms: [] },
        name: { type: "string", synonyms: [] },
        channel: { type: "string", synonyms: [] },
        budget_total: { type: "float", synonyms: [] },
        start_date: { type: "date", synonyms: [] },
        end_date: { type: "date", synonyms: [] },
        attribution_model: { type: "string", synonyms: [] },
      },
    },
    campaign_performance: {
      description:
        "Daily campaign KPIs: impressions, clicks, cost, conversions",
      columns: {
        performance_id: { type: "integer", synonyms: [] },
        campaign_id: { type: "integer", synonyms: [] },
        date: { type: "date", synonyms: [] },
        impressions: { type: "integer", synonyms: [] },
        clicks: { type: "integer", synonyms: [] },
        cost: { type: "float", synonyms: [] },
        conversions: { type: "integer", synonyms: [] },
        revenue_attributed: { type: "float", synonyms: [] },
      },
    },
    website_traffic: {
      description:
        "Web analytics daily figures: sessions, pageviews, bounce rates, device mix",
      columns: {
        traffic_id: { type: "integer", synonyms: [] },
        date: { type: "date", synonyms: [] },
        sessions: { type: "integer", synonyms: [] },
        pageviews: { type: "integer", synonyms: [] },
        bounce_rate: { type: "float", synonyms: [] },
        device_type: { type: "string", synonyms: [] },
        avg_session_duration: { type: "float", synonyms: [] },
      },
    },
    support_tickets: {
      description:
        "Customer support tickets: categories, priorities, status, resolution times",
      columns: {
        ticket_id: { type: "integer", synonyms: [] },
        customer_id: { type: "integer", synonyms: [] },
        created_at: { type: "date", synonyms: [] },
        closed_at: { type: "date", synonyms: [] },
        priority: { type: "string", synonyms: [] },
        status: { type: "string", synonyms: [] },
        category: { type: "string", synonyms: [] },
      },
    },
  },
  accessControl: {
    customers: {
      read: ["admin", "manager", "support", "analyst"],
      write: ["admin", "manager"],
      columnConstraints: {
        email: ["admin", "manager"],
        phone: ["admin", "manager"],
        date_of_birth: ["admin"],
        loyalty_tier: ["admin", "manager"],
      },
    },
    orders: {
      read: ["admin", "manager", "analyst", "support"],
      write: ["admin", "manager"],
    },
    payroll: {
      read: ["admin", "hr"],
      write: ["admin"],
      columnConstraints: {
        gross_pay: ["admin"],
        net_pay: ["admin"],
        tax_deduction: ["admin"],
        benefits_deduction: ["admin"],
      },
    },
    employees: {
      read: ["admin", "hr", "manager"],
      write: ["admin", "hr"],
      columnConstraints: {
        salary: ["admin"],
      },
    },
    reviews: {
      read: ["admin", "manager", "support", "analyst"],
      write: ["admin", "manager", "support"],
      columnConstraints: {
        review_text: ["admin", "support"],
      },
    },
    support_tickets: {
      read: ["admin", "support"],
      write: ["admin", "support"],
    },
    inventory_movements: {
      read: ["admin", "manager", "warehouse_manager"],
      write: ["admin", "warehouse_manager"],
    },
    marketing_campaigns: {
      read: ["admin", "marketing", "manager"],
      write: ["admin", "marketing"],
    },
    campaign_performance: {
      read: ["admin", "marketing", "analyst"],
      write: ["admin", "marketing"],
    },
    website_traffic: {
      read: ["admin", "marketing", "analyst"],
      write: ["admin"],
    },
    returns: {
      read: ["admin", "support", "manager"],
      write: ["admin", "support"],
    },
    products: {
      read: ["admin", "manager", "analyst", "support"],
      write: ["admin", "manager"],
    },
    suppliers: {
      read: ["admin", "manager"],
      write: ["admin"],
    },
    warehouses: {
      read: ["admin", "manager", "warehouse_manager"],
      write: ["admin", "warehouse_manager"],
    },
    departments: {
      read: ["admin", "hr"],
      write: ["admin"],
    },
    attendance: {
      read: ["admin", "hr", "manager"],
      write: ["admin", "hr"],
    },
    sales_targets: {
      read: ["admin", "manager", "analyst"],
      write: ["admin", "manager"],
    },
    regions: {
      read: ["admin", "manager"],
      write: ["admin"],
    },
  },
};

export default catalog;
