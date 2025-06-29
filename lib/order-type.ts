// TODO: Create separate interfaces for Shopify and Nalpac orders
export interface Order {
  id: string;
  order_number: string;
  name: string;
  external_order_number?: string; // Optional, used for Nalpac orders
  ExternalOrderNumber?: string;
  customer: {
    first_name: string;
    last_name: string;
    email: string;
    phone?: string;
  };
  shipping_address: {
    address1: string;
    address2?: string;
    city: string;
    province_code: string;
    province?: string; // For compatibility with both Shopify and Nalpac
    state?: string; // For compatibility with both Shopify and Nalpac
    postal_code?: string; // For compatibility with both Shopify and Nalpac
    zip: string;
    country_code: string;
    phone?: string;
  };
  line_items: Array<{
    sku?: string;
    item_number?: string;
    quantity?: number;
  }>;
  created_at: string;
}
