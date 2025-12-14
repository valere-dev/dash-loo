# 🚀 Loomi API

Backend API pour ton dashboard Loomi Analytics.
- **Shopify** → Données temps réel (orders, subscriptions)
- **Google Sheet** → Données Meta Ads (ton VA remplit)

---

## 📊 Google Sheet Template (pour ton VA)

Crée un Google Sheet avec ces colonnes :

| Date | Ad Spend | Impressions | Clicks | CPM | CPC | Notes |
|------|----------|-------------|--------|-----|-----|-------|
| 2025-12-01 | 250 | 15000 | 450 | 16.67 | 0.56 | |
| 2025-12-02 | 275 | 18000 | 520 | 15.28 | 0.53 | |
| 2025-12-03 | 300 | 20000 | 600 | 15.00 | 0.50 | |

**Important :**
- Colonne A = Date (format: YYYY-MM-DD)
- Colonne B = Ad Spend (juste le nombre, pas de $)
- Les autres colonnes sont optionnelles

### Publier le Sheet :
1. File → Share → Publish to web
2. Sélectionne "Sheet1" (ou le nom de ton onglet)
3. Format: **CSV**
4. Clique "Publish"
5. Copie l'URL

---

## 🔧 Setup

### 1. Clone le repo
```bash
git clone <ton-repo>
cd loomi-api
npm install
```

### 2. Configure les variables d'environnement

**Pour Vercel (production) :**
1. Va sur [vercel.com](https://vercel.com)
2. Import le projet
3. Settings → Environment Variables
4. Ajoute :
   - `SHOPIFY_STORE_URL` = ton-store.myshopify.com
   - `SHOPIFY_ACCESS_TOKEN` = shpat_xxxxx
   - `GOOGLE_SHEET_CSV_URL` = https://docs.google.com/...

**Pour local :**
```bash
cp .env.example .env.local
# Edit .env.local avec tes vraies clés
```

### 3. Deploy
```bash
vercel --prod
```

Ou push sur GitHub → Vercel auto-deploy

---

## 📡 Endpoints

### GET /api/shopify/orders
Récupère les commandes Shopify.

**Query params :**
- `limit` (default: 250)
- `created_at_min` (ISO date)
- `created_at_max` (ISO date)
- `status` (default: any)

**Response :**
```json
{
  "success": true,
  "summary": {
    "total_orders": 327,
    "total_revenue": 15535.92,
    "subscription_orders": 262,
    "first_orders": 123,
    "renewals": 139
  },
  "orders": [...]
}
```

---

### GET /api/shopify/daily
Récupère les stats par jour.

**Query params :**
- `days` (default: 30)

**Response :**
```json
{
  "success": true,
  "totals": {
    "orders": 110,
    "revenue": 4868.46,
    "newSubs": 90,
    "renewals": 20
  },
  "daily": [
    { "date": "2025-12-01", "orders": 5, "revenue": 222.40, "newSubs": 4 },
    { "date": "2025-12-02", "orders": 9, "revenue": 387.48, "newSubs": 7 },
    ...
  ]
}
```

---

### GET /api/metrics ⭐ (PRINCIPAL)
Combine Shopify + Google Sheet avec calculs LTV.

**Query params :**
- `days` (default: 30)
- `ltv` (default: 160.55)
- `avgPrice` (default: 40.24)
- `retention` (default: 78)

**Response :**
```json
{
  "success": true,
  "kpis": {
    "totalOrders": 110,
    "totalNewSubs": 90,
    "totalRevenue": 4868.46,
    "totalAdSpend": 3000,
    "cac": 33.33,
    "ltv": 160.55,
    "ltvRevenue": 14449.50,
    "ltvCacRatio": 4.8,
    "profitPerCustomer": 127.22,
    "roasDay1": 1.62,
    "roasLtv": 4.82,
    "m0": 3621.60,
    "m1": 2824.85,
    "m2": 2203.38,
    "m3": 1718.64,
    "m4": 1340.54,
    "m5": 1045.62
  },
  "daily": [
    {
      "date": "2025-12-01",
      "orders": 5,
      "revenue": 222.40,
      "newSubs": 4,
      "adSpend": 250,
      "m0": 160.96,
      "m1": 125.55,
      "m2": 97.93,
      "m3": 76.38,
      "m4": 59.58,
      "m5": 46.47,
      "ltvRevenue": 642.20,
      "cac": 62.50,
      "roasDay1": 0.89,
      "roasLtv": 2.57
    },
    ...
  ]
}
```

---

## 🔑 Obtenir les clés API

### Shopify Access Token

1. **Shopify Admin** → Settings → Apps → Develop apps
2. Clique **"Create an app"**
3. Nom: "Loomi Analytics"
4. **Configure Admin API scopes** :
   - ✅ `read_orders`
   - ✅ `read_customers`
   - ✅ `read_products`
5. Clique **"Install app"**
6. **API credentials** → Reveal token
7. Copie le token `shpat_xxxxx`

### Google Sheet CSV URL

1. Ouvre ton Google Sheet
2. **File → Share → Publish to web**
3. Sélectionne l'onglet avec les données Meta
4. Format: **CSV**
5. Clique **"Publish"**
6. Copie l'URL (ressemble à `https://docs.google.com/spreadsheets/d/e/2PACX-.../pub?output=csv`)

---

## 🧪 Test local

```bash
npm run dev
```

Puis ouvre :
- http://localhost:3000/api/shopify/orders
- http://localhost:3000/api/shopify/daily?days=7
- http://localhost:3000/api/metrics?days=14&ltv=160

---

## 🎯 Utilisation dans ton Dashboard

```javascript
// Dans ton React dashboard
const API_URL = 'https://loomi-api.vercel.app';

// Fetch les métriques
const response = await fetch(`${API_URL}/api/metrics?days=30&ltv=160.55`);
const data = await response.json();

console.log(data.kpis.roasLtv); // 4.82
console.log(data.daily); // Array des données par jour
```

---

## 📝 Instructions pour ton VA

**Chaque jour, ton VA doit :**

1. Ouvrir Facebook Ads Manager
2. Noter dans le Google Sheet :
   - Date (format: 2025-12-14)
   - Ad Spend total du jour
   - (Optionnel) Impressions, Clicks, CPM, CPC

**Temps estimé : 30 secondes/jour**

---

## 🆘 Troubleshooting

**"Missing Shopify credentials"**
→ Vérifie que `SHOPIFY_STORE_URL` et `SHOPIFY_ACCESS_TOKEN` sont bien dans Vercel

**Les données Meta ne s'affichent pas**
→ Vérifie que le Google Sheet est bien publié en CSV
→ Vérifie le format de date (YYYY-MM-DD)

**CORS errors**
→ Le backend gère déjà CORS, mais si problème, vérifie `vercel.json`

---

## 📄 License

MIT - Fais ce que tu veux avec !
