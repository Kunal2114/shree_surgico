'use client'
import { useEffect, useState } from 'react'
import Navbar from '@/components/Navbar'
import { supabase } from '@/lib/supabase-client'
import type { Order } from '@/lib/types'

const STATUS_STYLES: Record<string, string> = {
  pending:    'bg-amber-50 text-amber-700 border-amber-200',
  confirmed:  'bg-blue-50 text-blue-700 border-blue-200',
  packing:    'bg-purple-50 text-purple-700 border-purple-200',
  dispatched: 'bg-indigo-50 text-indigo-700 border-indigo-200',
  delivered:  'bg-brand-50 text-brand-700 border-brand-200',
  cancelled:  'bg-red-50 text-red-600 border-red-200',
}

const NEXT_STATUS: Record<string, string> = {
  pending:    'confirmed',
  confirmed:  'packing',
  packing:    'dispatched',
  dispatched: 'delivered',
}

export default function AdminOrdersPage() {
  const [orders, setOrders]     = useState<Order[]>([])
  const [loading, setLoading]   = useState(true)
  const [filter, setFilter]     = useState('')
  const [selected, setSelected] = useState<Order | null>(null)
  const [mounted, setMounted]   = useState(false)

  useEffect(() => { setMounted(true) }, [])

  async function loadOrders() {
    setLoading(true)
    let query = supabase
      .from('orders')
      .select(`
        *,
        customer:customers(*),
        order_items(*, product:products(*))
      `)
      .order('created_at', { ascending: false })

    if (filter) query = query.eq('status', filter)
    const { data } = await query
    setOrders((data as Order[]) ?? [])
    setLoading(false)
  }

  useEffect(() => { if (mounted) loadOrders() }, [mounted, filter])

  async function updateStatus(orderId: string, status: string) {
    await supabase.from('orders').update({ status }).eq('id', orderId)
    loadOrders()
    if (selected?.id === orderId) setSelected(prev => prev ? { ...prev, status: status as any } : null)
  }

  const counts = orders.reduce((acc, o) => {
    acc[o.status] = (acc[o.status] ?? 0) + 1
    return acc
  }, {} as Record<string, number>)

  if (!mounted) return null

  return (
    <>
      <Navbar />
      <div className="max-w-6xl mx-auto px-4 py-6">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-xl font-semibold text-gray-900">Order management</h1>
          <button onClick={loadOrders} className="text-sm text-gray-400 hover:text-gray-600 border border-gray-200 px-3 py-1.5 rounded-lg">
            ↻ Refresh
          </button>
        </div>

        {/* Status filter pills */}
        <div className="flex gap-2 flex-wrap mb-5">
          {['', 'pending', 'confirmed', 'packing', 'dispatched', 'delivered', 'cancelled'].map(s => (
            <button
              key={s}
              onClick={() => setFilter(s)}
              className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${
                filter === s
                  ? 'bg-brand-500 text-white border-brand-500'
                  : 'bg-white text-gray-500 border-gray-200 hover:border-brand-300'
              }`}
            >
              {s === '' ? 'All orders' : s.charAt(0).toUpperCase() + s.slice(1)}
              {s !== '' && counts[s] ? ` (${counts[s]})` : ''}
            </button>
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
          {/* Orders list */}
          <div className="lg:col-span-2 space-y-3">
            {loading ? (
              <div className="text-center py-16 text-gray-400">Loading orders...</div>
            ) : orders.length === 0 ? (
              <div className="text-center py-16 text-gray-400 bg-white rounded-xl border border-gray-100">No orders found.</div>
            ) : orders.map(order => (
              <div
                key={order.id}
                onClick={() => setSelected(order)}
                className={`bg-white border rounded-xl p-4 cursor-pointer transition-all hover:shadow-sm ${
                  selected?.id === order.id ? 'border-brand-400 shadow-sm' : 'border-gray-100'
                }`}
              >
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <div className="font-medium text-gray-900 text-sm font-mono">
                      #{order.id.slice(0, 8).toUpperCase()}
                    </div>
                    <div className="text-xs text-gray-400 mt-0.5">
                      {new Date(order.created_at).toLocaleString('en-IN', {
                        day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit'
                      })}
                    </div>
                  </div>
                  <span className={`text-xs px-2.5 py-1 rounded-full border font-medium ${STATUS_STYLES[order.status]}`}>
                    {order.status}
                  </span>
                </div>

                <div className="flex items-center justify-between">
                  <div className="text-xs text-gray-500">
                    {order.customer?.name ?? 'Customer'} · {order.customer?.phone}
                  </div>
                  <div className="font-semibold text-gray-900">₹{order.total}</div>
                </div>

                <div className="text-xs text-gray-400 mt-1.5">
                  {order.order_items?.length ?? 0} item(s) ·{' '}
                  {order.payment_method ?? 'payment pending'}
                </div>

                {/* Quick action */}
                {NEXT_STATUS[order.status] && (
                  <button
                    onClick={e => { e.stopPropagation(); updateStatus(order.id, NEXT_STATUS[order.status]) }}
                    className="mt-3 w-full text-xs border border-brand-400 text-brand-600 hover:bg-brand-50 py-1.5 rounded-lg transition-colors font-medium"
                  >
                    Mark as {NEXT_STATUS[order.status]} →
                  </button>
                )}
              </div>
            ))}
          </div>

          {/* Order detail panel */}
          <div className="lg:col-span-1">
            {selected ? (
              <div className="bg-white border border-gray-100 rounded-xl p-4 sticky top-20">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-semibold text-gray-900 text-sm">Order detail</h3>
                  <button onClick={() => setSelected(null)} className="text-gray-400 hover:text-gray-600">✕</button>
                </div>

                <div className="space-y-2 mb-4">
                  <div className="flex justify-between text-xs"><span className="text-gray-400">Order ID</span><span className="font-mono font-medium text-gray-700">#{selected.id.slice(0, 8).toUpperCase()}</span></div>
                  <div className="flex justify-between text-xs"><span className="text-gray-400">Status</span>
                    <span className={`text-xs px-2 py-0.5 rounded-full border font-medium ${STATUS_STYLES[selected.status]}`}>{selected.status}</span>
                  </div>
                  <div className="flex justify-between text-xs"><span className="text-gray-400">Customer</span><span className="text-gray-700">{selected.customer?.name}</span></div>
                  <div className="flex justify-between text-xs"><span className="text-gray-400">Phone</span><span className="text-gray-700">{selected.customer?.phone}</span></div>
                  <div className="flex justify-between text-xs"><span className="text-gray-400">Payment</span><span className="text-gray-700">{selected.payment_method}</span></div>
                  <div className="flex justify-between text-xs"><span className="text-gray-400">Total</span><span className="font-semibold text-gray-900">₹{selected.total}</span></div>
                </div>

                {/* Delivery address */}
                {selected.delivery_address && (
                  <div className="bg-gray-50 rounded-lg p-3 mb-4">
                    <div className="text-xs font-medium text-gray-500 mb-1">📍 Delivery address</div>
                    <div className="text-xs text-gray-600 leading-relaxed">
                      {(selected.delivery_address as any).line1}<br />
                      {(selected.delivery_address as any).line2 && <>{(selected.delivery_address as any).line2}<br /></>}
                      {(selected.delivery_address as any).city} — {(selected.delivery_address as any).pincode}
                    </div>
                  </div>
                )}

                {/* Items */}
                <div className="mb-4">
                  <div className="text-xs font-medium text-gray-500 mb-2">🛍 Items</div>
                  <div className="space-y-2">
                    {selected.order_items?.map(item => (
                      <div key={item.id} className="flex justify-between text-xs text-gray-600">
                        <span>{item.product?.name} × {item.qty}</span>
                        <span className="font-medium">₹{item.price_at_sale * item.qty}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Status actions */}
                <div className="space-y-2">
                  <div className="text-xs font-medium text-gray-500 mb-1">Update status</div>
                  {Object.keys(NEXT_STATUS).includes(selected.status) && (
                    <button
                      onClick={() => updateStatus(selected.id, NEXT_STATUS[selected.status])}
                      className="w-full bg-brand-500 hover:bg-brand-600 text-white text-sm font-medium py-2 rounded-lg transition-colors"
                    >
                      Mark as {NEXT_STATUS[selected.status]}
                    </button>
                  )}
                  {selected.status !== 'cancelled' && selected.status !== 'delivered' && (
                    <button
                      onClick={() => updateStatus(selected.id, 'cancelled')}
                      className="w-full border border-red-200 text-red-500 hover:bg-red-50 text-sm py-2 rounded-lg transition-colors"
                    >
                      Cancel order
                    </button>
                  )}
                </div>
              </div>
            ) : (
              <div className="bg-white border border-gray-100 rounded-xl p-6 text-center text-gray-400 text-sm sticky top-20">
                <div className="text-3xl mb-2">📋</div>
                Click an order to see details
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  )
}
