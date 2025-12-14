// /api/shopify/daily.js
// Fetches daily breakdown of orders and new subscribers

export default async function handler(req, res) {
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
    const { days = 30 } = req.query;
    
    // Calculate date range
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - parseInt(days));

    // Fetch orders from Shopify
    const response = await fetch(
      `https://${SHOPIFY_STORE_URL}/admin/api/2024-01/orders.json?status=any&limit=250&created_at_min=${startDate.toISOString()}&created_at_max=${endDate.toISOString()}`,
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

    // Group by date
    const dailyData = {};

    orders.forEach(order => {
      const date = order.created_at.split('T')[0]; // YYYY-MM-DD
      const tags = order.tags ? order.tags.toLowerCase() : '';
      const isFirstOrder = tags.includes('kaching subscription first order');
      const isSubscription = tags.includes('kaching subscription');

      if (!dailyData[date]) {
        dailyData[date] = {
          date,
          orders: 0,
          revenue: 0,
          newSubs: 0,
          renewals: 0,
          discounts: 0,
        };
      }

      dailyData[date].orders += 1;
      dailyData[date].revenue += parseFloat(order.total_price);
      dailyData[date].discounts += parseFloat(order.total_discounts);
      
      if (isFirstOrder) {
        dailyData[date].newSubs += 1;
      } else if (isSubscription) {
        dailyData[date].renewals += 1;
      }
    });

    // Convert to array and sort by date
    const dailyArray = Object.values(dailyData)
      .sort((a, b) => new Date(a.date) - new Date(b.date))
      .map(day => ({
        ...day,
        revenue: Math.round(day.revenue * 100) / 100,
        discounts: Math.round(day.discounts * 100) / 100,
      }));

    // Calculate totals
    const totals = {
      orders: dailyArray.reduce((sum, d) => sum + d.orders, 0),
      revenue: dailyArray.reduce((sum, d) => sum + d.revenue, 0),
      newSubs: dailyArray.reduce((sum, d) => sum + d.newSubs, 0),
      renewals: dailyArray.reduce((sum, d) => sum + d.renewals, 0),
      discounts: dailyArray.reduce((sum, d) => sum + d.discounts, 0),
    };

    return res.status(200).json({
      success: true,
      period: {
        start: startDate.toISOString().split('T')[0],
        end: endDate.toISOString().split('T')[0],
        days: parseInt(days),
      },
      totals,
      daily: dailyArray,
    });

  } catch (error) {
    console.error('Shopify API error:', error);
    return res.status(500).json({ error: error.message });
  }
}
