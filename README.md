# Pearl Moon Server - Nalpac Integration

Automated system to manage orders between Shopify and Nalpac distributor, with automatic tracking number updates.

## Features

- **Order Processing**: Sends Shopify orders to Nalpac for fulfillment
- **Status Monitoring**: Periodically checks Nalpac for shipped orders
- **Automatic Tracking**: Sends tracking numbers from Nalpac back to Shopify
- **Error Handling**: Email notifications for failed orders
- **Inventory Management**: Shopify handles inventory automatically

## Architecture

### API Endpoints (`/api/`)

- `order.ts` - Main order processing endpoint (receives Shopify webhooks)
- `get-order-status.ts` - Get individual order status from Nalpac
- `get-all-orders.ts` - Get all orders from Nalpac
- `send-nalpac-order.ts` - Send order to Nalpac for fulfillment
- `send-tracking-number-to-shopify.ts` - Update Shopify with tracking info
- `send-error-email.ts` - Error notification system
- `check-for-order-status-updates.ts` - Automated status checking

### Libraries (`/lib/`)

- `order-type.ts` - TypeScript interfaces for order data
- `shippingCodeToBaseTrackingUrl.ts` - Tracking URL generation

### Automation

- `cron-scheduler.js` - Scheduled tasks for order status monitoring
- `data/previous-orders.json` - State storage for change detection

## Deployment

This is deployed on Vercel with the following environment variables required:

```
SHOPIFY_STORE_URL=https://your-store.myshopify.com
SHOPIFY_ACCESS_TOKEN=your-access-token
NALPAC_URL=https://nalpac-api-url
NALPAC_ACCOUNT_EMAIL=your-nalpac-email
NALPAC_PASSWORD=your-nalpac-password
SMTP_HOST=your-smtp-host
SMTP_PORT=587
SMTP_USER=your-smtp-user
SMTP_PASS=your-smtp-password
ADMIN_EMAIL=admin@yourdomain.com
```

## Setup Requirements

1. **Shopify Setup**:

   - Create custom fulfillment service named "pearl-moon-server-nalpac"
   - Assign products to this fulfillment service
   - Configure webhook to trigger `/api/order` on new orders

2. **Nalpac Setup**:

   - API credentials with order creation and status checking permissions

3. **Permissions**:
   - Shopify: `read_orders`, `write_orders`, `read_fulfillments`, `write_fulfillments`

## Workflow

1. Customer places order on Shopify
2. Shopify webhook triggers `/api/order`
3. Order is sent to Nalpac for fulfillment
4. Cron job periodically checks Nalpac for status updates
5. When order ships, tracking number is sent back to Shopify
6. Shopify creates fulfillment and updates customer

## Development

```bash
npm install
npm run dev
```

## Running Locally

```bash
# Start development server
vercel dev

# Run cron job manually
npx tsx cron-scheduler.js
```

## API Endpoints

- `POST /api/order` - Process new Shopify orders
- `GET /api/get-order-status?orderNumber=123` - Check order status
- `GET /api/get-all-orders` - Get all orders from Nalpac

Built with TypeScript, Node.js, and deployed on Vercel.
