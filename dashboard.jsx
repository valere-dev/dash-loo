import React, { useState, useEffect } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';

// ============================================
// CONFIG - Change this to your Vercel URL
// ============================================
const API_URL = 'https://loomi-api.vercel.app'; // ← Change this after deploy!

// ============================================
// STYLES
// ============================================
const colors = {
  bg: '#0a0a0a',
  card: '#141414',
  border: '#262626',
  text: '#ffffff',
  muted: '#737373',
  accent: '#3b82f6',
  green: '#22c55e',
  red: '#ef4444',
  yellow: '#eab308',
  m0: '#3b82f6',
  m1: '#6366f1',
  m2: '#8b5cf6',
  m3: '#a855f7',
  m4: '#d946ef',
  m5: '#ec4899',
};

// ============================================
// MAIN COMPONENT
// ============================================
export default function Dashboard() {
  // State
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [data, setData] = useState(null);
  
  // Parameters
  const [days, setDays] = useState(30);
  const [ltv, setLtv] = useState(160.55);
  const [avgPrice, setAvgPrice] = useState(40.24);
  const [retention, setRetention] = useState(78);

  // Fetch data from API
  const fetchData = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const url = `${API_URL}/api/metrics?days=${days}&ltv=${ltv}&avgPrice=${avgPrice}&retention=${retention}`;
      const response = await fetch(url);
      
      if (!response.ok) {
        throw new Error(`API error: ${response.status}`);
      }
      
      const result = await response.json();
      
      if (!result.success) {
        throw new Error(result.error || 'Unknown error');
      }
      
      setData(result);
    } catch (err) {
      setError(err.message);
      console.error('Fetch error:', err);
    } finally {
      setLoading(false);
    }
  };

  // Fetch on mount and when params change
  useEffect(() => {
    fetchData();
  }, [days]);

  // Refetch with new LTV params (manual trigger)
  const handleRefresh = () => {
    fetchData();
  };

  // Input style
  const inputStyle = {
    background: colors.bg,
    border: `1px solid ${colors.border}`,
    borderRadius: '8px',
    padding: '10px 14px',
    color: colors.text,
    fontSize: '16px',
    fontWeight: '600',
    width: '100px',
    outline: 'none'
  };

  // Chart data
  const chartData = data?.daily?.map(d => ({
    date: d.date.slice(5), // MM-DD
    M0: d.m0,
    M1: d.m1,
    M2: d.m2,
    M3: d.m3,
    M4: d.m4,
    M5: d.m5,
  })) || [];

  return (
    <div style={{ minHeight: '100vh', background: colors.bg, color: colors.text, fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif', padding: '32px' }}>
      
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '32px', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <h1 style={{ fontSize: '28px', fontWeight: '700', margin: 0 }}>Loomi Analytics</h1>
          <p style={{ color: colors.muted, marginTop: '4px', fontSize: '14px' }}>Live data from Shopify + Google Sheet</p>
        </div>
        <button 
          onClick={handleRefresh}
          disabled={loading}
          style={{
            background: colors.accent,
            color: 'white',
            border: 'none',
            borderRadius: '8px',
            padding: '12px 24px',
            fontSize: '14px',
            fontWeight: '600',
            cursor: loading ? 'not-allowed' : 'pointer',
            opacity: loading ? 0.5 : 1,
          }}
        >
          {loading ? '⏳ Loading...' : '🔄 Refresh'}
        </button>
      </div>

      {/* Error State */}
      {error && (
        <div style={{ background: '#2d1f1f', border: `1px solid ${colors.red}`, borderRadius: '12px', padding: '20px', marginBottom: '24px' }}>
          <p style={{ color: colors.red, margin: 0 }}>⚠️ Error: {error}</p>
          <p style={{ color: colors.muted, margin: '8px 0 0', fontSize: '14px' }}>
            Make sure your API is deployed and environment variables are set.
          </p>
        </div>
      )}

      {/* Parameters */}
      <div style={{ background: colors.card, border: `1px solid ${colors.border}`, borderRadius: '12px', padding: '24px', marginBottom: '24px' }}>
        <h3 style={{ fontSize: '13px', fontWeight: '600', marginBottom: '16px', color: colors.muted, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Parameters</h3>
        <div style={{ display: 'flex', gap: '24px', flexWrap: 'wrap', alignItems: 'flex-end' }}>
          
          <div>
            <label style={{ display: 'block', fontSize: '11px', color: colors.muted, marginBottom: '6px' }}>DAYS</label>
            <select 
              value={days} 
              onChange={(e) => setDays(Number(e.target.value))}
              style={{ ...inputStyle, width: '120px', cursor: 'pointer' }}
            >
              <option value={7}>Last 7 days</option>
              <option value={14}>Last 14 days</option>
              <option value={30}>Last 30 days</option>
              <option value={60}>Last 60 days</option>
              <option value={90}>Last 90 days</option>
            </select>
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '11px', color: colors.green, marginBottom: '6px', fontWeight: '600' }}>LTV ($)</label>
            <input type="number" value={ltv} onChange={(e) => setLtv(Number(e.target.value) || 0)} style={{ ...inputStyle, borderColor: colors.green }} />
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '11px', color: colors.muted, marginBottom: '6px' }}>AVG PRICE/MO</label>
            <input type="number" value={avgPrice} onChange={(e) => setAvgPrice(Number(e.target.value) || 0)} style={inputStyle} />
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '11px', color: colors.muted, marginBottom: '6px' }}>RETENTION %</label>
            <input type="number" value={retention} onChange={(e) => setRetention(Number(e.target.value) || 0)} style={inputStyle} />
          </div>

          <button 
            onClick={handleRefresh}
            style={{
              background: 'transparent',
              color: colors.accent,
              border: `1px solid ${colors.accent}`,
              borderRadius: '8px',
              padding: '10px 20px',
              fontSize: '14px',
              fontWeight: '600',
              cursor: 'pointer',
            }}
          >
            Apply
          </button>
        </div>
      </div>

      {/* Loading State */}
      {loading && !data && (
        <div style={{ textAlign: 'center', padding: '60px' }}>
          <div style={{ fontSize: '48px', marginBottom: '16px' }}>⏳</div>
          <p style={{ color: colors.muted }}>Loading data from API...</p>
        </div>
      )}

      {/* Main Content */}
      {data && (
        <>
          {/* KPIs Row */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '16px', marginBottom: '24px' }}>
            <KPICard label="Total Orders" value={data.kpis.totalOrders} />
            <KPICard label="New Subs" value={data.kpis.totalNewSubs} />
            <KPICard label="Day 1 Revenue" value={data.kpis.totalRevenue} prefix="$" />
            <KPICard label="Ad Spend" value={data.kpis.totalAdSpend || 0} prefix="$" />
            <KPICard label="CAC" value={data.kpis.cac || '-'} prefix="$" />
            <KPICard label="LTV" value={data.kpis.ltv} prefix="$" color={colors.green} />
          </div>

          {/* ROAS Row */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px', marginBottom: '24px' }}>
            <div style={{ background: colors.card, border: `1px solid ${colors.border}`, borderRadius: '12px', padding: '20px' }}>
              <div style={{ fontSize: '11px', color: colors.muted, marginBottom: '4px' }}>ROAS DAY 1</div>
              <div style={{ fontSize: '32px', fontWeight: '700', color: data.kpis.roasDay1 >= 1 ? colors.green : colors.red }}>
                {data.kpis.roasDay1 ? `${data.kpis.roasDay1}x` : '-'}
              </div>
            </div>
            <div style={{ background: colors.card, border: `2px solid ${colors.green}`, borderRadius: '12px', padding: '20px' }}>
              <div style={{ fontSize: '11px', color: colors.green, marginBottom: '4px', fontWeight: '600' }}>LTV ROAS (TRUE)</div>
              <div style={{ fontSize: '32px', fontWeight: '700', color: colors.green }}>
                {data.kpis.roasLtv ? `${data.kpis.roasLtv}x` : '-'}
              </div>
            </div>
            <div style={{ background: colors.card, border: `1px solid ${colors.border}`, borderRadius: '12px', padding: '20px' }}>
              <div style={{ fontSize: '11px', color: colors.muted, marginBottom: '4px' }}>LTV:CAC RATIO</div>
              <div style={{ fontSize: '32px', fontWeight: '700', color: data.kpis.ltvCacRatio >= 3 ? colors.green : colors.yellow }}>
                {data.kpis.ltvCacRatio ? `${data.kpis.ltvCacRatio}:1` : '-'}
              </div>
            </div>
            <div style={{ background: colors.card, border: `1px solid ${colors.border}`, borderRadius: '12px', padding: '20px' }}>
              <div style={{ fontSize: '11px', color: colors.muted, marginBottom: '4px' }}>PROFIT/CUSTOMER</div>
              <div style={{ fontSize: '32px', fontWeight: '700', color: data.kpis.profitPerCustomer > 0 ? colors.green : colors.red }}>
                {data.kpis.profitPerCustomer ? `$${data.kpis.profitPerCustomer}` : '-'}
              </div>
            </div>
          </div>

          {/* Monthly Breakdown */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(100px, 1fr))', gap: '12px', marginBottom: '24px' }}>
            <MonthCard label="M0" value={data.kpis.m0} color={colors.m0} />
            <MonthCard label="M1" value={data.kpis.m1} color={colors.m1} />
            <MonthCard label="M2" value={data.kpis.m2} color={colors.m2} />
            <MonthCard label="M3" value={data.kpis.m3} color={colors.m3} />
            <MonthCard label="M4" value={data.kpis.m4} color={colors.m4} />
            <MonthCard label="M5" value={data.kpis.m5} color={colors.m5} />
            <MonthCard label="LTV TOTAL" value={data.kpis.ltvRevenue} color={colors.green} highlight />
          </div>

          {/* Chart */}
          <div style={{ background: colors.card, border: `1px solid ${colors.border}`, borderRadius: '12px', padding: '24px', marginBottom: '24px' }}>
            <h3 style={{ fontSize: '16px', fontWeight: '600', marginBottom: '24px' }}>LTV Revenue by Month (Stacked)</h3>
            <ResponsiveContainer width="100%" height={350}>
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke={colors.border} />
                <XAxis dataKey="date" stroke={colors.muted} tick={{ fill: colors.muted, fontSize: 11 }} />
                <YAxis stroke={colors.muted} tick={{ fill: colors.muted, fontSize: 11 }} />
                <Tooltip 
                  contentStyle={{ background: colors.card, border: `1px solid ${colors.border}`, borderRadius: '8px' }}
                  formatter={(value) => [`$${value?.toFixed(2) || 0}`, '']}
                />
                <Legend />
                <Bar dataKey="M0" stackId="a" fill={colors.m0} />
                <Bar dataKey="M1" stackId="a" fill={colors.m1} />
                <Bar dataKey="M2" stackId="a" fill={colors.m2} />
                <Bar dataKey="M3" stackId="a" fill={colors.m3} />
                <Bar dataKey="M4" stackId="a" fill={colors.m4} />
                <Bar dataKey="M5" stackId="a" fill={colors.m5} />
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Daily Table */}
          <div style={{ background: colors.card, border: `1px solid ${colors.border}`, borderRadius: '12px', padding: '24px', overflowX: 'auto' }}>
            <h3 style={{ fontSize: '16px', fontWeight: '600', marginBottom: '24px' }}>Daily Breakdown</h3>
            <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: '1000px' }}>
              <thead>
                <tr style={{ borderBottom: `1px solid ${colors.border}` }}>
                  <Th>Date</Th>
                  <Th right>Orders</Th>
                  <Th right>New Subs</Th>
                  <Th right>Revenue</Th>
                  <Th right>Ad Spend</Th>
                  <Th right color={colors.m0}>M0</Th>
                  <Th right color={colors.m1}>M1</Th>
                  <Th right color={colors.m2}>M2</Th>
                  <Th right color={colors.m3}>M3</Th>
                  <Th right color={colors.green}>LTV Rev</Th>
                  <Th right>CAC</Th>
                  <Th right>ROAS LTV</Th>
                </tr>
              </thead>
              <tbody>
                {data.daily.map((row, i) => (
                  <tr key={i} style={{ borderBottom: `1px solid ${colors.border}` }}>
                    <Td>{row.date}</Td>
                    <Td right>{row.orders}</Td>
                    <Td right bold>{row.newSubs}</Td>
                    <Td right>${row.revenue}</Td>
                    <Td right>{row.adSpend ? `$${row.adSpend}` : '-'}</Td>
                    <Td right color={colors.m0}>${row.m0}</Td>
                    <Td right color={colors.m1}>${row.m1}</Td>
                    <Td right color={colors.m2}>${row.m2}</Td>
                    <Td right color={colors.m3}>${row.m3}</Td>
                    <Td right color={colors.green} bold>${row.ltvRevenue}</Td>
                    <Td right>{row.cac ? `$${row.cac}` : '-'}</Td>
                    <Td right color={row.roasLtv >= 3 ? colors.green : colors.yellow}>
                      {row.roasLtv ? `${row.roasLtv}x` : '-'}
                    </Td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}

      {/* Footer */}
      <div style={{ marginTop: '48px', textAlign: 'center', color: colors.muted, fontSize: '12px' }}>
        Loomi Analytics • Last updated: {new Date().toLocaleString()}
      </div>
    </div>
  );
}

// ============================================
// SUB-COMPONENTS
// ============================================
const KPICard = ({ label, value, prefix = '', color = colors.text }) => (
  <div style={{ background: colors.card, border: `1px solid ${colors.border}`, borderRadius: '12px', padding: '20px' }}>
    <div style={{ fontSize: '11px', color: colors.muted, marginBottom: '4px' }}>{label}</div>
    <div style={{ fontSize: '24px', fontWeight: '700', color }}>
      {prefix}{typeof value === 'number' ? value.toLocaleString() : value}
    </div>
  </div>
);

const MonthCard = ({ label, value, color, highlight = false }) => (
  <div style={{ 
    background: colors.card, 
    border: highlight ? `2px solid ${color}` : `1px solid ${colors.border}`, 
    borderRadius: '12px', 
    padding: '16px', 
    textAlign: 'center' 
  }}>
    <div style={{ fontSize: '10px', color: highlight ? color : colors.muted, marginBottom: '4px', fontWeight: highlight ? '600' : '400' }}>{label}</div>
    <div style={{ fontSize: '18px', fontWeight: '700', color }}>${value?.toLocaleString() || 0}</div>
  </div>
);

const Th = ({ children, right, color = colors.muted }) => (
  <th style={{ textAlign: right ? 'right' : 'left', padding: '12px', color, fontSize: '11px', fontWeight: '600' }}>{children}</th>
);

const Td = ({ children, right, bold, color = colors.text }) => (
  <td style={{ padding: '12px', textAlign: right ? 'right' : 'left', fontWeight: bold ? '600' : '400', color, fontSize: '14px' }}>{children}</td>
);
