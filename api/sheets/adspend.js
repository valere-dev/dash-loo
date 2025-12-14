// /api/sheets/adspend.js
// Fetches Meta Ads data from Google Sheet

export default async function handler(req, res) {
  // CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const { GOOGLE_SHEET_ID } = process.env;

  if (!GOOGLE_SHEET_ID) {
    return res.status(500).json({ error: 'Missing Google Sheet ID' });
  }

  try {
    // Fetch from Google Sheets (public sheet, no auth needed)
    // This URL returns JSON from a public Google Sheet
    const url = `https://docs.google.com/spreadsheets/d/${GOOGLE_SHEET_ID}/gviz/tq?tqx=out:json`;
    
    const response = await fetch(url);
    
    if (!response.ok) {
      throw new Error(`Google Sheets error: ${response.status}`);
    }

    const text = await response.text();
    
    // Google returns JSONP, we need to extract the JSON
    // Format: /*O_o*/google.visualization.Query.setResponse({...});
    const jsonMatch = text.match(/google\.visualization\.Query\.setResponse\(([\s\S]*)\);?$/);
    
    if (!jsonMatch) {
      throw new Error('Could not parse Google Sheets response');
    }

    const json = JSON.parse(jsonMatch[1]);
    const rows = json.table.rows;
    const cols = json.table.cols;

    // Parse column headers
    const headers = cols.map(col => col.label?.toLowerCase().replace(/\s+/g, '_') || col.id);

    // Parse rows into objects
    const data = rows.map(row => {
      const obj = {};
      row.c.forEach((cell, i) => {
        const header = headers[i];
        let value = cell?.v;
        
        // Handle date format from Google Sheets
        if (header === 'date' && value && typeof value === 'string' && value.includes('Date')) {
          // Google Sheets date format: Date(2025,11,13) = Dec 13, 2025 (months are 0-indexed)
          const match = value.match(/Date\((\d+),(\d+),(\d+)\)/);
          if (match) {
            const [, year, month, day] = match;
            value = `${year}-${String(parseInt(month) + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
          }
        }
        
        obj[header] = value;
      });
      return obj;
    }).filter(row => row.date); // Filter out empty rows

    // Calculate totals
    const totals = {
      ad_spend: data.reduce((sum, row) => sum + (parseFloat(row.ad_spend) || 0), 0),
      impressions: data.reduce((sum, row) => sum + (parseInt(row.impressions) || 0), 0),
      clicks: data.reduce((sum, row) => sum + (parseInt(row.clicks) || 0), 0),
      purchases: data.reduce((sum, row) => sum + (parseInt(row.purchases) || 0), 0),
      days: data.length
    };

    // Calculate averages
    totals.avg_cpa = totals.purchases > 0 ? totals.ad_spend / totals.purchases : 0;
    totals.avg_ctr = totals.impressions > 0 ? (totals.clicks / totals.impressions) * 100 : 0;
    totals.avg_cpm = totals.impressions > 0 ? (totals.ad_spend / totals.impressions) * 1000 : 0;

    return res.status(200).json({
      data,
      totals,
      fetched_at: new Date().toISOString()
    });

  } catch (error) {
    console.error('Google Sheets API Error:', error);
    return res.status(500).json({ error: error.message });
  }
}
