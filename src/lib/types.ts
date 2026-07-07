export type Product = {
  id: string
  name: string
  salt_name: string | null
  category: string | null
  manufacturer: string | null
  mrp: number
  sell_price: number
  requires_rx: boolean
  created_at: string
  // Joined from inventory table
  inventory?: Inventory[]
}

export type Inventory = {
  id: string
  product_id: string
  batch_no: string | null
  stock_qty: number
  reorder_at: number
  expiry_date: string | null
  purchase_price: number | null
}

export type Customer = {
  id: string
  name: string | null
  phone: string
  email: string | null
  created_at: string
}

export type Order = {
  id: string
  customer_id: string
  status: 'pending' | 'confirmed' | 'packing' | 'dispatched' | 'delivered' | 'cancelled'
  total: number
  delivery_address: DeliveryAddress
  payment_method: string | null
  razorpay_order_id: string | null
  created_at: string
  // Joined
  order_items?: OrderItem[]
  customer?: Customer
}

export type OrderItem = {
  id: string
  order_id: string
  product_id: string
  qty: number
  price_at_sale: number
  product?: Product
}

export type Prescription = {
  id: string
  order_id: string
  image_url: string
  status: 'pending' | 'approved' | 'rejected'
  verified_by: string | null
  created_at: string
}

export type DeliveryAddress = {
  name: string
  phone: string
  line1: string
  line2?: string
  city: string
  pincode: string
  state: string
}

export type CartItem = {
  product: Product
  qty: number
}
