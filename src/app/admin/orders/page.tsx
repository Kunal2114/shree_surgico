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
  delivered:  'bg-green-50 text-green-700 border-green-200',
  cancelled:  'bg-red-50 text-red-600 border-red-200',
}

const RX_STATUS_STYLES: Record<string, string> = {
  pending:  'bg-amber-50 text-amber-700 border-amber-200',
  approved: 'bg-green-50 text-green-700 border-green-200',
  rejected: 'bg-red-50 text-red-600 border-red-200',
}

const NEXT_STATUS: Record<string, string> = {
  pending:    'confirmed',
  confirmed:  'packing',
  packing:    'dispatched',
  dispatched: 'delivered',
}

export default function AdminOrdersPage() {
  const [orders, setOrders]       = useState<Order[]>([])
  const [loading, setLoading]     = useState(true)
  const [filter, setFilter]       = useState('')
  const [selected, setSelected]   = useState<Order | null>(null)
  const [mounted, setMounted]     = useState(false)
  // Prescription state
  const [rxUrl, setRxUrl]         = useState<string | null>(null)
  const [rxStatus, setRxStatus]   = useState<string | null>(null)
  const [rxLoading, setRxLoading] = useState(false)
  const [rxError, setRxError]     = useState('')
  const [rxChecked, setRxChecked] = useState(false)

  useEffect(() => { setMounted(true) }, [])

  useEffect(() => {
    if (mounted) loadOrders()
  }, [mounted, filter])

  async function loadOrders() {
    setLoading(true)
    let query = supabase
      .from('orders')
      .select('*, customer:customers(*), order_items(*, product:products(*))')
      .order('created_at', { ascending: false })
    if (filter) query = query.eq('status', filter)
    const { data } = await query
    setOrders((data as Order[]) ?? [])
    setLoading(false)
  }

  async function selectOrder(order: Order) {
    setSelected(order)
    setRxUrl(null)
    setRxError('')
    setRxStatus(null)
    setRxChecked(false)
  }

  async function loadPrescription() {
    if (!selected) return
    setRxLoading(true)
    setRxError('')
    setRxChecked(true)
    const res  = await fetch(`/api/prescription?order_id=${selected.id}`)
    const data = await res.json()
    if (!res.ok) {
      setRxError(data.error ?? 'No prescription uploaded for this order')
    } else {
      setRxUrl(data.signed_url)
      setRxStatus(data.status)
    }
    setRxLoading(false)
  }

  async function updateRxStatus(status: 'approved' | 'rejected') {
    if (!selected) return
    await fetch(`/api/prescription?order_id=${selected.id}`, {
      method:  'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ status }),
    })
    setRxStatus(status)
  }

  async function updateStatus(orderId: string, status: string) {
    await supabase.from('orders').update({ status }).eq('id', orderId)
    loadOrders()
    if (selected?.id === orderId) setSelected(prev => prev ? { ...prev, status: status as any } : null)
  }

  const counts = orders.reduce((acc, o) => {
    acc[o.status] = (acc[o.status] ?? 0) + 1
    return acc
  }, {} as Record<string, number>)

  const hasRxItems = selected?.order_items?.some(i => i.product?.requires_rx)

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
                  ? 'bg-green-600 text-white border-green-600'
                  : 'bg-white text-gray-500 border-gray-200 hover:border-green-400'
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
                onClick={() => selectOrder(order)}
                className={`bg-white border rounded-xl p-4 cursor-pointer transition-all hover:shadow-sm ${
                  selected?.id === order.id ? 'border-green-400 shadow-sm' : 'border-gray-100'
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
                  <div className="flex items-center gap-2">
                    {order.order_items?.some(i => (i as any).product?.requires_rx) && (
                      <span className="text-xs bg-amber-50 text-amber-700 border border-amber-200 px-2 py-0.5 rounded-full">Rx</span>
                    )}
                    <span className={`text-xs px-2.5 py-1 rounded-full border font-medium ${STATUS_STYLES[order.status]}`}>
                      {order.status}
                    </span>
                  </div>
                </div>
                <div className="flex items-center justify-between">
                  <div className="text-xs text-gray-500">
                    {order.customer?.name ?? 'Customer'} · {order.customer?.phone}
                  </div>
                  <div className="font-semibold text-gray-900">₹{order.total}</div>
                </div>
                <div className="text-xs text-gray-400 mt-1.5">
                  {order.order_items?.length ?? 0} item(s) · {order.payment_method ?? 'payment pending'}
                </div>
                {NEXT_STATUS[order.status] && (
                  <button
                    onClick={e => { e.stopPropagation(); updateStatus(order.id, NEXT_STATUS[order.status]) }}
                    className="mt-3 w-full text-xs border border-green-400 text-green-600 hover:bg-green-50 py-1.5 rounded-lg transition-colors font-medium"
                  >
                    Mark as {NEXT_STATUS[order.status]} →
                  </button>
                )}
              </div>
            ))}
          </div>

          {/* Detail panel */}
          <div className="lg:col-span-1">
            {selected ? (
              <div className="bg-white border border-gray-100 rounded-xl p-4 sticky top-20 space-y-4">

                {/* Order header */}
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="font-semibold text-gray-900 text-sm">Order detail</h3>
                    <button onClick={() => setSelected(null)} className="text-gray-400 hover:text-gray-600">✕</button>
                  </div>
                  <div className="space-y-1.5">
                    {[
                      ['Order ID',  `#${selected.id.slice(0, 8).toUpperCase()}`],
                      ['Customer',  selected.customer?.name ?? '—'],
                      ['Phone',     selected.customer?.phone ?? '—'],
                      ['Payment',   selected.payment_method ?? '—'],
                      ['Total',     `₹${selected.total}`],
                    ].map(([k, v]) => (
                      <div key={k} className="flex justify-between text-xs">
                        <span className="text-gray-400">{k}</span>
                        <span className="font-medium text-gray-700">{v}</span>
                      </div>
                    ))}
                    <div className="flex justify-between text-xs items-center">
                      <span className="text-gray-400">Status</span>
                      <span className={`text-xs px-2 py-0.5 rounded-full border font-medium ${STATUS_STYLES[selected.status]}`}>
                        {selected.status}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Delivery address */}
                {selected.delivery_address && (
                  <div className="bg-gray-50 rounded-lg p-3">
                    <div className="text-xs font-medium text-gray-500 mb-1">📍 Delivery address</div>
                    <div className="text-xs text-gray-600 leading-relaxed">
                      {(selected.delivery_address as any).line1}<br />
                      {(selected.delivery_address as any).line2 && <>{(selected.delivery_address as any).line2}<br /></>}
                      {(selected.delivery_address as any).city} — {(selected.delivery_address as any).pincode}
                    </div>
                  </div>
                )}

                {/* Items */}
                <div>
                  <div className="text-xs font-medium text-gray-500 mb-2">🛍 Items</div>
                  <div className="space-y-1.5">
                    {selected.order_items?.map(item => (
                      <div key={item.id} className="flex justify-between text-xs text-gray-600">
                        <span className="flex items-center gap-1">
                          {item.product?.name} × {item.qty}
                          {item.product?.requires_rx && (
                            <span className="text-xs bg-amber-50 text-amber-600 border border-amber-200 px-1 rounded">Rx</span>
                          )}
                        </span>
                        <span>₹{item.price_at_sale * item.qty}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* ── Prescription section ── */}
                {hasRxItems && (
                  <div className="border border-amber-200 bg-amber-50 rounded-xl p-3">
                    <div className="text-xs font-semibold text-amber-800 mb-2 flex items-center gap-1.5">
                      📋 Prescription
                      {rxStatus && (
                        <span className={`text-xs px-2 py-0.5 rounded-full border font-medium ${RX_STATUS_STYLES[rxStatus]}`}>
                          {rxStatus}
                        </span>
                      )}
                    </div>

                    {!rxChecked ? (
                      <button
                        onClick={loadPrescription}
                        className="w-full text-xs bg-amber-600 hover:bg-amber-700 text-white py-2 rounded-lg font-medium transition-colors"
                      >
                        Load prescription file
                      </button>
                    ) : rxLoading ? (
                      <div className="text-xs text-amber-700 text-center py-2">Loading...</div>
                    ) : rxError ? (
                      <div className="text-xs text-red-600 bg-red-50 border border-red-200 rounded-lg p-2">{rxError}</div>
                    ) : rxUrl ? (
                      <div className="space-y-2">
                        {/* Preview — image shows inline, PDF/DOCX opens in new tab */}
                        {rxUrl.match(/\.(jpg|jpeg|png)(\?|$)/i) ? (
                          <a href={rxUrl} target="_blank" rel="noreferrer">
                            <img
                              src={rxUrl}
                              alt="Prescription"
                              className="w-full rounded-lg border border-amber-200 object-cover max-h-48"
                            />
                          </a>
                        ) : (
                          <a
                            href={rxUrl}
                            target="_blank"
                            rel="noreferrer"
                            className="flex items-center gap-2 bg-white border border-amber-300 rounded-lg p-3 hover:bg-amber-50 transition-colors"
                          >
                            <span className="text-2xl">
                              {rxUrl.includes('.pdf') ? '📄' : '📝'}
                            </span>
                            <div>
                              <div className="text-xs font-medium text-amber-900">Open prescription file</div>
                              <div className="text-xs text-amber-600">Click to view in new tab · Link expires in 60 min</div>
                            </div>
                            <span className="ml-auto text-amber-500 text-sm">↗</span>
                          </a>
                        )}

                        {/* Approve / Reject buttons */}
                        {rxStatus === 'pending' && (
                          <div className="flex gap-2 mt-1">
                            <button
                              onClick={() => updateRxStatus('approved')}
                              className="flex-1 text-xs bg-green-600 hover:bg-green-700 text-white py-2 rounded-lg font-medium transition-colors"
                            >
                              ✓ Approve
                            </button>
                            <button
                              onClick={() => updateRxStatus('rejected')}
                              className="flex-1 text-xs bg-red-100 hover:bg-red-200 text-red-700 py-2 rounded-lg font-medium transition-colors border border-red-200"
                            >
                              ✕ Reject
                            </button>
                          </div>
                        )}
                        {rxStatus === 'approved' && (
                          <div className="text-xs text-green-700 bg-green-50 border border-green-200 rounded-lg p-2 text-center">
                            ✓ Prescription approved
                          </div>
                        )}
                        {rxStatus === 'rejected' && (
                          <div className="flex gap-2 items-center">
                            <div className="flex-1 text-xs text-red-600 bg-red-50 border border-red-200 rounded-lg p-2 text-center">
                              ✕ Prescription rejected
                            </div>
                            <button
                              onClick={() => updateRxStatus('approved')}
                              className="text-xs text-green-600 border border-green-300 px-2 py-2 rounded-lg hover:bg-green-50"
                            >
                              Re-approve
                            </button>
                          </div>
                        )}

                        {/* Reload signed URL (expires after 60 min) */}
                        <button
                          onClick={loadPrescription}
                          className="w-full text-xs text-gray-400 hover:text-gray-600 py-1"
                        >
                          ↻ Refresh link (expires after 60 min)
                        </button>
                      </div>
                    ) : null}
                  </div>
                )}

                {/* Status actions */}
                <div>
                  <div className="text-xs font-medium text-gray-500 mb-2">Update order status</div>
                  {NEXT_STATUS[selected.status] && (
                    <button
                      onClick={() => updateStatus(selected.id, NEXT_STATUS[selected.status])}
                      className="w-full bg-green-600 hover:bg-green-700 text-white text-sm font-medium py-2 rounded-lg transition-colors mb-2"
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
