// /api/metrics.js
// Combined metrics: Shopify + Google Sheet (Meta Ads)

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const { 
    SHOPIFY_STORE_URL, 
    SHOPIFY_ACCESS_TOKEN,
    GOOGLE_SHEET_CSV_URL 
  } = process.env;

  try {
    const { days = 30, ltv = 160.55, avgPrice = 40.24, retention = 78 } = req.query;
    
    // Parse params
    const ltvValue = parseFloat(ltv);
    const avgPriceValue = parseFloat(avgPrice);
    const retentionValue = parseFloat(retention) / 100;
    
    // Calculate date range
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - parseInt(days));

    // ============================================
    // 1. FETCH SHOPIFY DATA
    // ============================================
    let shopifyData = { daily: [], totals: {} };
    
    if (SHOPIFY_STORE_URL && SHOPIFY_ACCESS_TOKEN) {
      const shopifyResponse = await fetch(
        `https://${SHOPIFY_STORE_URL}/admin/api/2024-01/orders.json?status=any&limit=250&created_at_min=${startDate.toISOString()}`,
        {
          headers: {
            'X-Shopify-Access-Token': SHOPIFY_ACCESS_TOKEN,
            'Content-Type': 'application/json',
          },
        }
      );

      if (shopifyResponse.ok) {
        const data = await shopifyResponse.json();
        const orders = data.orders || [];

        // Group by date
        const dailyMap = {};
        orders.forEach(order => {
          const date = order.created_at.split('T')[0];
          const tags = order.tags ? order.tags.toLowerCase() : '';
          const isFirstOrder = tags.includes('kaching subscription first order');

          if (!dailyMap[date]) {
            dailyMap[date] = { date, orders: 0, revenue: 0, newSubs: 0 };
          }
          dailyMap[date].orders += 1;
          dailyMap[date].revenue += parseFloat(order.total_price);
          if (isFirstOrder) dailyMap[date].newSubs += 1;
        });

        shopifyData.daily = Object.values(dailyMap).sort((a, b) => new Date(a.date) - new Date(b.date));
        shopifyData.totals = {
          orders: shopifyData.daily.reduce((s, d) => s + d.orders, 0),
          revenue: shopifyData.daily.reduce((s, d) => s + d.revenue, 0),
          newSubs: shopifyData.daily.reduce((s, d) => s + d.newSubs, 0),
        };
      }
    }

    // ============================================
    // 2. FETCH GOOGLE SHEET DATA (Meta Ads)
    // ============================================
    let metaData = { daily: [], totals: { adSpend: 0 } };
    
    if (GOOGLE_SHEET_CSV_URL) {
      try {
        const sheetResponse = await fetch(GOOGLE_SHEET_CSV_URL);
        if (sheetResponse.ok) {
          const csvText = await sheetResponse.text();
          const rows = csvText.split('\n').slice(1); // Skip header
          
          const dailyMeta = {};
          rows.forEach(row => {
            const cols = row.split(',');
            if (cols.length >= 2) {
              const date = cols[0]?.trim();
              const adSpend = parseFloat(cols[1]?.trim()) || 0;
              if (date && adSpend) {
                dailyMeta[date] = { date, adSpend };
              }
            }
          });
          
          metaData.daily = Object.values(dailyMeta);
          metaData.totals.adSpend = metaData.daily.reduce((s, d) => s + d.adSpend, 0);
        }
      } catch (e) {
        console.error('Google Sheet fetch error:', e);
      }
    }

    // ============================================
    // 3. COMBINE & CALCULATE METRICS
    // ============================================
    
    // Merge Shopify + Meta data by date
    const combinedDaily = shopifyData.daily.map(day => {
      const metaDay = metaData.daily.find(m => m.date === day.date) || { adSpend: 0 };
      
      // Calculate LTV breakdown
      const m0 = day.newSubs * avgPriceValue;
      const m1 = day.newSubs * Math.pow(retentionValue, 1) * avgPriceValue;
      const m2 = day.newSubs * Math.pow(retentionValue, 2) * avgPriceValue;
      const m3 = day.newSubs * Math.pow(retentionValue, 3) * avgPriceValue;
      const m4 = day.newSubs * Math.pow(retentionValue, 4) * avgPriceValue;
      const m5 = day.newSubs * Math.pow(retentionValue, 5) * avgPriceValue;
      const ltvRevenue = day.newSubs * ltvValue;

      return {
        date: day.date,
        orders: day.orders,
        revenue: Math.round(day.revenue * 100) / 100,
        newSubs: day.newSubs,
        adSpend: metaDay.adSpend,
        // LTV Breakdown
        m0: Math.round(m0 * 100) / 100,
        m1: Math.round(m1 * 100) / 100,
        m2: Math.round(m2 * 100) / 100,
        m3: Math.round(m3 * 100) / 100,
        m4: Math.round(m4 * 100) / 100,
        m5: Math.round(m5 * 100) / 100,
        ltvRevenue: Math.round(ltvRevenue * 100) / 100,
        // Daily metrics
        cac: metaDay.adSpend && day.newSubs ? Math.round((metaDay.adSpend / day.newSubs) * 100) / 100 : null,
        roasDay1: metaDay.adSpend ? Math.round((day.revenue / metaDay.adSpend) * 100) / 100 : null,
        roasLtv: metaDay.adSpend ? Math.round((ltvRevenue / metaDay.adSpend) * 100) / 100 : null,
      };
    });

    // Calculate totals
    const totalNewSubs = combinedDaily.reduce((s, d) => s + d.newSubs, 0);
    const totalRevenue = combinedDaily.reduce((s, d) => s + d.revenue, 0);
    const totalAdSpend = combinedDaily.reduce((s, d) => s + d.adSpend, 0);
    const totalLtvRevenue = combinedDaily.reduce((s, d) => s + d.ltvRevenue, 0);
    const totalM0 = combinedDaily.reduce((s, d) => s + d.m0, 0);
    const totalM1 = combinedDaily.reduce((s, d) => s + d.m1, 0);
    const totalM2 = combinedDaily.reduce((s, d) => s + d.m2, 0);
    const totalM3 = combinedDaily.reduce((s, d) => s + d.m3, 0);
    const totalM4 = combinedDaily.reduce((s, d) => s + d.m4, 0);
    const totalM5 = combinedDaily.reduce((s, d) => s + d.m5, 0);

    const kpis = {
      // Volume
      totalOrders: combinedDaily.reduce((s, d) => s + d.orders, 0),
      totalNewSubs,
      totalRevenue: Math.round(totalRevenue * 100) / 100,
      
      // Ad metrics
      totalAdSpend: Math.round(totalAdSpend * 100) / 100,
      cac: totalAdSpend && totalNewSubs ? Math.round((totalAdSpend / totalNewSubs) * 100) / 100 : null,
      
      // LTV metrics
      ltv: ltvValue,
      ltvRevenue: Math.round(totalLtvRevenue * 100) / 100,
      ltvCacRatio: totalAdSpend && totalNewSubs ? Math.round((ltvValue / (totalAdSpend / totalNewSubs)) * 10) / 10 : null,
      profitPerCustomer: totalAdSpend && totalNewSubs ? Math.round((ltvValue - (totalAdSpend / totalNewSubs)) * 100) / 100 : null,
      
      // ROAS
      roasDay1: totalAdSpend ? Math.round((totalRevenue / totalAdSpend) * 100) / 100 : null,
      roasLtv: totalAdSpend ? Math.round((totalLtvRevenue / totalAdSpend) * 100) / 100 : null,
      
      // Monthly breakdown totals
      m0: Math.round(totalM0 * 100) / 100,
      m1: Math.round(totalM1 * 100) / 100,
      m2: Math.round(totalM2 * 100) / 100,
      m3: Math.round(totalM3 * 100) / 100,
      m4: Math.round(totalM4 * 100) / 100,
      m5: Math.round(totalM5 * 100) / 100,
    };

    return res.status(200).json({
      success: true,
      params: {
        days: parseInt(days),
        ltv: ltvValue,
        avgPrice: avgPriceValue,
        retention: retentionValue * 100,
      },
      kpis,
      daily: combinedDaily,
    });

  } catch (error) {
    console.error('Metrics API error:', error);
    return res.status(500).json({ error: error.message });
  }
}
