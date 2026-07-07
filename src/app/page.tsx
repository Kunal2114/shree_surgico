'use client'
import { useEffect, useState } from 'react'
import dynamic from 'next/dynamic'
import type { Product } from '@/lib/types'

const CATEGORIES = ['Tablet', 'Syrup', 'Cream', 'Injection', 'Capsule']
const CAT_ICONS: Record<string, string> = {
  Tablet: '💊', Syrup: '🧴', Cream: '🫙', Injection: '💉', Capsule: '🔵',
}

function totalStock(p: Product) {
  return p.inventory?.reduce((a, i) => a + i.stock_qty, 0) ?? 0
}

function disc(p: Product) {
  return p.sell_price < p.mrp
    ? Math.round(((p.mrp - p.sell_price) / p.mrp) * 100)
    : 0
}

export default function HomePage() {
  const [products, setProducts] = useState<Product[]>([])
  const [search, setSearch]     = useState('')
  const [category, setCategory] = useState('')
  const [cart, setCart]         = useState<Record<string, number>>({})
  const [loading, setLoading]   = useState(true)
  const [mounted, setMounted]   = useState(false)

  // Only run on client — avoids SSR/prerender touching Supabase
  useEffect(() => { setMounted(true) }, [])

  useEffect(() => {
    if (!mounted) return

    async function load() {
      setLoading(true)
      try {
        const params = new URLSearchParams()
        if (category) params.set('category', category)
        if (search)   params.set('search', search)

        const res  = await fetch(`/api/products?${params}`)
        const data = await res.json()
        setProducts(Array.isArray(data) ? data : [])
      } catch (e) {
        console.error('Failed to load products', e)
        setProducts([])
      } finally {
        setLoading(false)
      }
    }

    load()
  }, [mounted, search, category])

  const cartCount = Object.values(cart).reduce((a, v) => a + v, 0)

  if (!mounted) return null  // prevent SSR entirely

  return (
    <div className="min-h-screen bg-gray-50">

      {/* Navbar */}
      <nav className="bg-white border-b border-gray-100 sticky top-0 z-50 shadow-sm">
        <div className="max-w-6xl mx-auto px-4 h-14 flex items-center gap-4">
          <div className="font-semibold text-green-700 text-sm flex-shrink-0 flex items-center gap-2">
            💊 Shree Surgico Pharmaceuticals
          </div>
          <input
            className="flex-1 border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-green-500"
            placeholder="Search medicines by name or salt..."
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
          <a
            href="/checkout"
            className="relative flex items-center gap-2 bg-green-600 hover:bg-green-700 text-white text-sm px-4 py-2 rounded-lg transition-colors"
          >
            🛒 Cart
            {cartCount > 0 && (
              <span className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-orange-500 text-white text-xs rounded-full flex items-center justify-center font-bold">
                {cartCount}
              </span>
            )}
          </a>
          <a href="/admin" className="text-xs text-gray-400 hover:text-gray-600">Admin ↗</a>
        </div>
      </nav>

      {/* Hero */}
      <div className="bg-white border-b border-gray-100 py-8 px-4">
        <div className="max-w-6xl mx-auto flex items-center justify-between flex-wrap gap-6">
          <div>
            <h1 className="text-2xl font-semibold text-gray-900 mb-2">
              Medicines delivered to your door
            </h1>
            <p className="text-gray-500 text-sm mb-4">
              Genuine medicines · Licensed pharmacists · Fast delivery across Mumbai
            </p>
            <div className="flex gap-2 flex-wrap">
              {['⚡ 30-min delivery', '✅ 100% genuine', '📋 Upload Rx online'].map(b => (
                <span key={b} className="text-xs bg-gray-100 text-gray-600 px-3 py-1 rounded-full">{b}</span>
              ))}
            </div>
          </div>
          <div className="flex border border-gray-100 rounded-xl overflow-hidden">
            <div className="px-6 py-4 text-center border-r border-gray-100">
              <div className="text-2xl font-semibold text-green-600">500+</div>
              <div className="text-xs text-gray-400">Medicines</div>
            </div>
            <div className="px-6 py-4 text-center">
              <div className="text-2xl font-semibold text-green-600">20%</div>
              <div className="text-xs text-gray-400">Avg savings</div>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 py-6">

        {/* Category filter */}
        <div className="flex gap-2 flex-wrap mb-6">
          {['All', ...CATEGORIES].map(c => (
            <button
              key={c}
              onClick={() => setCategory(c === 'All' ? '' : c)}
              className={`px-4 py-1.5 rounded-full text-sm border transition-colors ${
                (c === 'All' && !category) || c === category
                  ? 'bg-green-50 border-green-500 text-green-700 font-medium'
                  : 'bg-white border-gray-200 text-gray-500 hover:border-green-300'
              }`}
            >
              {CAT_ICONS[c] ?? ''} {c}
            </button>
          ))}
        </div>

        {/* Product grid */}
        {loading ? (
          <div className="text-center text-gray-400 py-16 text-sm">Loading medicines...</div>
        ) : products.length === 0 ? (
          <div className="text-center text-gray-400 py-16 text-sm">No products found.</div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {products.map(p => (
              <div
                key={p.id}
                className="bg-white border border-gray-100 rounded-xl overflow-hidden hover:border-green-300 hover:shadow-sm transition-all flex flex-col"
              >
                <div className="h-24 bg-green-50 flex items-center justify-center text-4xl">
                  {CAT_ICONS[p.category ?? ''] ?? '💊'}
                </div>
                <div className="p-3 flex flex-col flex-1">
                  {p.requires_rx && (
                    <span className="text-xs bg-amber-50 text-amber-700 border border-amber-200 px-2 py-0.5 rounded-full mb-1.5 inline-block w-fit">
                      Rx required
                    </span>
                  )}
                  <div className="font-medium text-sm text-gray-900 leading-tight mb-0.5">{p.name}</div>
                  <div className="text-xs text-gray-400 mb-1">{p.manufacturer}</div>
                  {p.salt_name && (
                    <div className="text-xs text-gray-400 mb-2 italic truncate">{p.salt_name}</div>
                  )}
                  <div className="mt-auto">
                    <div className="flex items-baseline gap-1.5 mb-1">
                      <span className="font-semibold text-gray-900 text-sm">₹{p.sell_price}</span>
                      {disc(p) > 0 && (
                        <>
                          <span className="text-xs text-gray-400 line-through">₹{p.mrp}</span>
                          <span className="text-xs text-green-600 font-medium">{disc(p)}% off</span>
                        </>
                      )}
                    </div>
                    <div className="text-xs mb-2">
                      {totalStock(p) > 0
                        ? <span className="text-gray-400">{totalStock(p)} in stock</span>
                        : <span className="text-red-500 font-medium">Out of stock</span>
                      }
                    </div>
                    <button
                      onClick={() => setCart(c => ({ ...c, [p.id]: (c[p.id] ?? 0) + 1 }))}
                      disabled={totalStock(p) === 0}
                      className={`w-full text-sm py-1.5 rounded-lg border font-medium transition-colors
                        ${cart[p.id]
                          ? 'bg-green-600 text-white border-green-600'
                          : 'border-green-400 text-green-700 hover:bg-green-50'
                        }
                        disabled:opacity-40 disabled:cursor-not-allowed`}
                    >
                      {cart[p.id] ? `✓ Added (${cart[p.id]})` : 'Add to cart'}
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
