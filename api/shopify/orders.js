// /api/shopify/orders.js
// Fetches orders from Shopify with subscription tags

export default async function handler(req, res) {
  // CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const { SHOPIFY_STORE_URL, SHOPIFY_ACCESS_TOKEN } = process.env;

  if (!SHOPIFY_STORE_URL || !SHOPIFY_ACCESS_TOKEN) {
    return res.status(500).json({ error: 'Missing Shopify credentials' });
  }

  try {
    // Get query params
    const { 
      created_at_min, 
      created_at_max, 
      limit = 250,
      status = 'any'
    } = req.query;

    // Build query string
    let queryParams = `status=${status}&limit=${limit}`;
    if (created_at_min) queryParams += `&created_at_min=${created_at_min}`;
    if (created_at_max) queryParams += `&created_at_max=${created_at_max}`;

    // Fetch from Shopify
    const response = await fetch(
      `https://${SHOPIFY_STORE_URL}/admin/api/2024-01/orders.json?${queryParams}`,
      {
        headers: {
          'X-Shopify-Access-Token': SHOPIFY_ACCESS_TOKEN,
          'Content-Type': 'application/json',
        },
      }
    );

    if (!response.ok) {
      const error = await response.text();
      return res.status(response.status).json({ error });
    }

    const data = await response.json();
    const orders = data.orders || [];

    // Process orders
    const processedOrders = orders.map(order => {
      const tags = order.tags ? order.tags.toLowerCase() : '';
      const isSubscription = tags.includes('kaching subscription');
      const isFirstOrder = tags.includes('kaching subscription first order');
      const isRenewal = isSubscription && !isFirstOrder;

      return {
        id: order.id,
        name: order.name,
        created_at: order.created_at,
        total_price: parseFloat(order.total_price),
        subtotal_price: parseFloat(order.subtotal_price),
        total_discounts: parseFloat(order.total_discounts),
        currency: order.currency,
        financial_status: order.financial_status,
        fulfillment_status: order.fulfillment_status,
        customer: order.customer ? {
          id: order.customer.id,
          email: order.customer.email,
          first_name: order.customer.first_name,
          last_name: order.customer.last_name,
          orders_count: order.customer.orders_count,
        } : null,
        shipping_country: order.shipping_address?.country_code || null,
        tags: order.tags,
        is_subscription: isSubscription,
        is_first_order: isFirstOrder,
        is_renewal: isRenewal,
        line_items: order.line_items.map(item => ({
          title: item.title,
          quantity: item.quantity,
          price: parseFloat(item.price),
        })),
      };
    });

    // Calculate summary stats
    const summary = {
      total_orders: processedOrders.length,
      total_revenue: processedOrders.reduce((sum, o) => sum + o.total_price, 0),
      subscription_orders: processedOrders.filter(o => o.is_subscription).length,
      first_orders: processedOrders.filter(o => o.is_first_order).length,
      renewals: processedOrders.filter(o => o.is_renewal).length,
      total_discounts: processedOrders.reduce((sum, o) => sum + o.total_discounts, 0),
    };

    return res.status(200).json({
      success: true,
      summary,
      orders: processedOrders,
    });

  } catch (error) {
    console.error('Shopify API error:', error);
    return res.status(500).json({ error: error.message });
  }
}
