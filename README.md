# Shopify Order Webhook to Distributor Integration

This lightweight Node.js server receives Shopify order webhooks and forwards them to the appropriate dropship distributor based on product metadata. Built with Vercel serverless functions for fast and scalable deployment.

## 🚀 Features

- Listens to Shopify's `orders/create` webhook
- Determines the correct distributor per line item
- Sends formatted order requests to the correct distributor API
- Notifies you on failure (via email, Slack, etc.)
- Minimal setup — no database or frontend
- Scalable for multiple distributors

## 📁 Project Structure
```
/api
└── order.js # Main webhook endpoint
/lib
├── sendToSexology.js # Example: logic to forward order to a distributor
├── sendToOther.js # Another distributor (if needed)
├── notifyError.js # Error notification logic (email, Slack, etc.)
└── utils.js # Utility functions (e.g., parsing metafields)
```

## 🛠️ Setup

1. **Clone the repo**

```bash
git clone https://github.com/CodingCashew/pearl-moon-server.git
cd pearl-moon-server

2. Install dependencies
```
npm install
```
3. Set up environment variables
Create a .env file or use the Vercel dashboard to store:
```
SHOPIFY_WEBHOOK_SECRET=your_webhook_secret
DISTRIBUTOR_API_KEY=your_distributor_key
NOTIFY_EMAIL=you@example.com
```

4. Deploy to Vercel
```
vercel
```
Vercel will provide you with a public URL like: 
https://your-project-name.vercel.app/api/order

5. Register Webhook with Shopify
In the Shopify admin or via Admin API, point the orders/create webhook to your Vercel endpoint.

⚠️ Error Handling
On failure to reach a distributor or if the order data is invalid:

The server will trigger a notification via your configured method (e.g., email or Slack).

You can manually fulfill the order as a fallback.

✅ Future Plans
Add optional dashboard for retrying failed orders

Support inventory syncing via cron or real-time feeds

OAuth and multi-store support (if needed)

# Running it locally
vercel dev

# Postman
POST to https://pearl-moon-server.vercel.app/api/order
POST to http://localhost:3000/api/order