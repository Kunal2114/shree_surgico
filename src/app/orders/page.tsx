'use client'
import { useState } from 'react'
import Navbar from '@/components/Navbar'
import { supabase } from '@/lib/supabase-client'
import type { Order } from '@/lib/types'

const STATUS_STEPS = ['confirmed', 'packing', 'dispatched', 'delivered']
const STEP_ICONS: Record<string, string> = {
  confirmed: '✅', packing: '📦', dispatched: '🚴', delivered: '🏠'
}

export default function OrdersPage() {
  const [phone, setPhone]   = useState('')
  const [orders, setOrders] = useState<Order[]>([])
  const [searched, setSearched] = useState(false)
  const [loading, setLoading]   = useState(false)

  async function lookupOrders() {
    if (!phone || phone.length < 10) return alert('Enter a valid 10-digit mobile number')
    setLoading(true)
    const { data: customer } = await supabase
      .from('customers')
      .select('id')
      .eq('phone', phone)
      .single()

    if (!customer) {
      setOrders([])
      setSearched(true)
      setLoading(false)
      return
    }

    const { data } = await supabase
      .from('orders')
      .select(`*, order_items(*, product:products(*))`)
      .eq('customer_id', customer.id)
      .order('created_at', { ascending: false })

    setOrders((data as Order[]) ?? [])
    setSearched(true)
    setLoading(false)
  }

  function stepIdx(status: string) {
    return STATUS_STEPS.indexOf(status)
  }

  return (
    <>
      <Navbar />
      <div className="max-w-2xl mx-auto px-4 py-10">
        <h1 className="text-xl font-semibold text-gray-900 mb-2">Track your orders</h1>
        <p className="text-sm text-gray-400 mb-6">Enter the mobile number used at checkout</p>

        <div className="flex gap-3 mb-8">
          <input
            className="form-input flex-1"
            placeholder="Enter your mobile number"
            value={phone}
            maxLength={10}
            onChange={e => setPhone(e.target.value.replace(/\D/, ''))}
            onKeyDown={e => e.key === 'Enter' && lookupOrders()}
          />
          <button
            onClick={lookupOrders}
            className="bg-brand-500 hover:bg-brand-600 text-white font-medium px-5 py-2 rounded-lg transition-colors"
          >
            {loading ? '...' : 'Track'}
          </button>
        </div>

        {searched && orders.length === 0 && (
          <div className="text-center py-12 text-gray-400">
            <div className="text-4xl mb-3">📭</div>
            <div className="text-sm">No orders found for this number.</div>
          </div>
        )}

        <div className="space-y-5">
          {orders.map(order => (
            <div key={order.id} className="bg-white border border-gray-100 rounded-xl p-5">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <div className="font-mono font-semibold text-gray-900 text-sm">
                    #{order.id.slice(0, 8).toUpperCase()}
                  </div>
                  <div className="text-xs text-gray-400 mt-0.5">
                    {new Date(order.created_at).toLocaleDateString('en-IN', {
                      day: 'numeric', month: 'long', year: 'numeric'
                    })}
                  </div>
                </div>
                <div className="font-semibold text-gray-900">₹{order.total}</div>
              </div>

              {/* Progress tracker */}
              <div className="flex items-center mb-5">
                {STATUS_STEPS.map((s, i) => {
                  const current = stepIdx(order.status)
                  const done = i <= current
                  const active = i === current
                  return (
                    <div key={s} className="flex items-center flex-1">
                      <div className={`flex flex-col items-center flex-shrink-0`}>
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm
                          ${done ? 'bg-brand-500 text-white' : 'bg-gray-100 text-gray-400'}`}>
                          {STEP_ICONS[s]}
                        </div>
                        <div className={`text-xs mt-1 text-center ${active ? 'text-brand-600 font-medium' : 'text-gray-400'}`}>
                          {s.charAt(0).toUpperCase() + s.slice(1)}
                        </div>
                      </div>
                      {i < STATUS_STEPS.length - 1 && (
                        <div className={`flex-1 h-0.5 mb-4 ${i < current ? 'bg-brand-400' : 'bg-gray-200'}`} />
                      )}
                    </div>
                  )
                })}
              </div>

              {/* Items */}
              <div className="border-t border-gray-100 pt-3 space-y-1.5">
                {order.order_items?.map(item => (
                  <div key={item.id} className="flex justify-between text-xs text-gray-600">
                    <span>{item.product?.name} × {item.qty}</span>
                    <span>₹{item.price_at_sale * item.qty}</span>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </>
  )
}
