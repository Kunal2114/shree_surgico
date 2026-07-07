'use client'
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase-client'
import type { Product } from '@/lib/types'

const CATEGORIES = ['Tablet', 'Syrup', 'Cream', 'Injection', 'Capsule', 'Drops']

function emptyForm() {
  return {
    name: '', salt_name: '', category: '', manufacturer: '',
    mrp: '', sell_price: '', requires_rx: false,
    batch_no: '', stock_qty: '', reorder_at: '10',
    expiry_date: '', purchase_price: '',
  }
}

// ── Login screen ──────────────────────────────────────────────
function LoginScreen({ onLogin }: { onLogin: () => void }) {
  const [email, setEmail]       = useState('')
  const [password, setPassword] = useState('')
  const [error, setError]       = useState('')
  const [loading, setLoading]   = useState(false)

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) {
      setError(error.message)
      setLoading(false)
    } else {
      onLogin()
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
      <div className="bg-white border border-gray-100 rounded-2xl shadow-sm p-8 w-full max-w-sm">
        <div className="text-center mb-8">
          <div className="text-4xl mb-3">💊</div>
          <h1 className="text-lg font-semibold text-gray-900">Shree Surgico Pharmaceuticals</h1>
          <p className="text-sm text-gray-400 mt-1">Admin portal — staff only</p>
        </div>

        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <label className="text-xs font-medium text-gray-500 block mb-1.5">Email address</label>
            <input
              type="email"
              required
              autoComplete="email"
              className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-green-500 focus:ring-1 focus:ring-green-500"
              placeholder="admin@shreesurgico.com"
              value={email}
              onChange={e => setEmail(e.target.value)}
            />
          </div>
          <div>
            <label className="text-xs font-medium text-gray-500 block mb-1.5">Password</label>
            <input
              type="password"
              required
              autoComplete="current-password"
              className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-green-500 focus:ring-1 focus:ring-green-500"
              placeholder="••••••••"
              value={password}
              onChange={e => setPassword(e.target.value)}
            />
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg px-3 py-2.5 text-sm text-red-600">
              {error === 'Invalid login credentials'
                ? 'Incorrect email or password. Please try again.'
                : error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-green-600 hover:bg-green-700 disabled:opacity-50 text-white font-medium py-2.5 rounded-xl transition-colors text-sm"
          >
            {loading ? 'Signing in...' : 'Sign in'}
          </button>
        </form>

        <p className="text-xs text-gray-400 text-center mt-6">
          First time? Create your admin account in Supabase Dashboard → Authentication → Users
        </p>
      </div>
    </div>
  )
}

// ── Main admin dashboard ──────────────────────────────────────
export default function AdminPage() {
  const [mounted, setMounted]     = useState(false)
  const [authed, setAuthed]       = useState(false)
  const [checkingAuth, setChecking] = useState(true)
  const [products, setProducts]   = useState<Product[]>([])
  const [loading, setLoading]     = useState(true)
  const [showPanel, setShowPanel] = useState(false)
  const [form, setForm]           = useState(emptyForm())
  const [editId, setEditId]       = useState<string | null>(null)
  const [search, setSearch]       = useState('')
  const [saving, setSaving]       = useState(false)
  const [saveError, setSaveError] = useState('')

  useEffect(() => { setMounted(true) }, [])

  // Check if user already has a session
  useEffect(() => {
    if (!mounted) return
    supabase.auth.getSession().then(({ data: { session } }) => {
      setAuthed(!!session)
      setChecking(false)
    })
    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_e, session) => {
      setAuthed(!!session)
    })
    return () => subscription.unsubscribe()
  }, [mounted])

  useEffect(() => {
    if (authed) loadProducts()
  }, [authed])

  async function loadProducts() {
    setLoading(true)
    const { data, error } = await supabase
      .from('products')
      .select('*, inventory(stock_qty, reorder_at, expiry_date, batch_no, purchase_price)')
      .order('name')
    if (!error) setProducts(data ?? [])
    setLoading(false)
  }

  async function signOut() {
    await supabase.auth.signOut()
    setAuthed(false)
  }

  function openAdd() {
    setEditId(null)
    setForm(emptyForm())
    setSaveError('')
    setShowPanel(true)
  }

  function openEdit(p: Product) {
    setEditId(p.id)
    const inv = p.inventory?.[0]
    setForm({
      name: p.name, salt_name: p.salt_name ?? '', category: p.category ?? '',
      manufacturer: p.manufacturer ?? '', mrp: String(p.mrp),
      sell_price: String(p.sell_price), requires_rx: p.requires_rx,
      batch_no: inv?.batch_no ?? '', stock_qty: String(inv?.stock_qty ?? ''),
      reorder_at: String(inv?.reorder_at ?? 10),
      expiry_date: inv?.expiry_date ?? '',
      purchase_price: String(inv?.purchase_price ?? ''),
    })
    setSaveError('')
    setShowPanel(true)
  }

  // Routes through API so the service-role key is used (bypasses RLS)
  async function saveProduct() {
    if (!form.name || !form.mrp || !form.category) {
      setSaveError('Please fill in name, category and MRP.')
      return
    }
    setSaving(true)
    setSaveError('')
    try {
      const payload = {
        name: form.name,
        salt_name: form.salt_name,
        category: form.category,
        manufacturer: form.manufacturer,
        mrp: Number(form.mrp),
        sell_price: Number(form.sell_price) || Number(form.mrp),
        requires_rx: form.requires_rx,
        batch_no: form.batch_no,
        stock_qty: Number(form.stock_qty) || 0,
        reorder_at: Number(form.reorder_at) || 10,
        expiry_date: form.expiry_date || null,
        purchase_price: Number(form.purchase_price) || 0,
      }

      const url    = editId ? `/api/products/${editId}` : '/api/products'
      const method = editId ? 'PUT' : 'POST'

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })

      const json = await res.json()
      if (!res.ok) {
        setSaveError(json.error ?? 'Failed to save product. Check console for details.')
        return
      }

      setShowPanel(false)
      loadProducts()
    } catch (err: any) {
      setSaveError(err.message ?? 'Unexpected error')
    } finally {
      setSaving(false)
    }
  }

  async function deleteProduct(id: string) {
    if (!confirm('Delete this product and all its inventory records?')) return
    await fetch(`/api/products/${id}`, { method: 'DELETE' })
    loadProducts()
  }

  function stockStatus(p: Product) {
    const stock   = p.inventory?.[0]?.stock_qty ?? 0
    const reorder = p.inventory?.[0]?.reorder_at ?? 10
    const expiry  = p.inventory?.[0]?.expiry_date
    const daysToExp = expiry ? (new Date(expiry).getTime() - Date.now()) / 86400000 : 999
    if (daysToExp < 30)    return { label: 'Expiring',  cls: 'bg-red-50 text-red-600 border-red-200' }
    if (stock <= reorder)  return { label: 'Low stock', cls: 'bg-amber-50 text-amber-700 border-amber-200' }
    return { label: 'In stock', cls: 'bg-green-50 text-green-700 border-green-200' }
  }

  const f = (k: keyof typeof form) => (e: any) =>
    setForm(prev => ({ ...prev, [k]: e.target.type === 'checkbox' ? e.target.checked : e.target.value }))

  if (!mounted || checkingAuth) return null
  if (!authed) return <LoginScreen onLogin={() => setAuthed(true)} />

  const totalValue = products.reduce((a, p) => a + p.mrp * (p.inventory?.[0]?.stock_qty ?? 0), 0)
  const lowStock   = products.filter(p => (p.inventory?.[0]?.stock_qty ?? 0) <= (p.inventory?.[0]?.reorder_at ?? 10)).length
  const filtered   = products.filter(p => !search || p.name.toLowerCase().includes(search.toLowerCase()))

  return (
    <>
      {/* Navbar */}
      <nav className="bg-white border-b border-gray-100 sticky top-0 z-50 shadow-sm">
        <div className="max-w-6xl mx-auto px-4 h-14 flex items-center gap-4">
          <a href="/" className="font-semibold text-green-700 text-sm flex items-center gap-2">
            💊 Shree Surgico Pharmaceuticals
          </a>
          <span className="text-xs bg-green-50 text-green-700 border border-green-200 px-2 py-0.5 rounded-full font-medium">Admin</span>
          <div className="flex-1" />
          <a href="/admin/orders" className="text-sm text-gray-500 hover:text-gray-900 transition-colors">Orders</a>
          <a href="/" className="text-sm text-gray-400 hover:text-gray-600 transition-colors">← Storefront</a>
          <button
            onClick={signOut}
            className="text-sm border border-gray-200 text-gray-500 hover:bg-gray-50 px-3 py-1.5 rounded-lg transition-colors"
          >
            Sign out
          </button>
        </div>
      </nav>

      <div className="max-w-6xl mx-auto px-4 py-6">
        {/* Stats */}
        <div className="grid grid-cols-4 gap-4 mb-6">
          {[
            { label: 'Total products', value: products.length, sub: 'in catalogue' },
            { label: 'Low stock', value: lowStock, sub: 'need reorder', warn: lowStock > 0 },
            { label: 'Inventory value', value: `₹${totalValue.toLocaleString('en-IN')}`, sub: 'at MRP' },
            { label: 'Categories', value: CATEGORIES.length, sub: 'product types' },
          ].map(s => (
            <div key={s.label} className="bg-white border border-gray-100 rounded-xl p-4">
              <div className="text-xs text-gray-400 mb-1">{s.label}</div>
              <div className={`text-2xl font-semibold ${s.warn ? 'text-amber-600' : 'text-gray-900'}`}>{s.value}</div>
              <div className="text-xs text-gray-400">{s.sub}</div>
            </div>
          ))}
        </div>

        {/* Toolbar */}
        <div className="flex items-center gap-3 mb-4">
          <input
            className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-green-500 max-w-sm w-full"
            placeholder="Search products..."
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
          <div className="flex-1" />
          <button
            onClick={openAdd}
            className="bg-green-600 hover:bg-green-700 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors"
          >
            + Add product
          </button>
        </div>

        {/* Table */}
        <div className="bg-white border border-gray-100 rounded-xl overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-100">
              <tr>
                {['Product', 'Category', 'MRP', 'Sell price', 'Stock', 'Expiry', 'Status', ''].map(h => (
                  <th key={h} className="text-left px-4 py-3 text-xs font-medium text-gray-400 uppercase tracking-wide">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={8} className="text-center py-12 text-gray-400">Loading...</td></tr>
              ) : filtered.length === 0 ? (
                <tr><td colSpan={8} className="text-center py-12 text-gray-400">No products found</td></tr>
              ) : filtered.map(p => {
                const st     = stockStatus(p)
                const stock  = p.inventory?.[0]?.stock_qty ?? 0
                const expiry = p.inventory?.[0]?.expiry_date ?? '—'
                return (
                  <tr key={p.id} className="border-b border-gray-50 hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-3">
                      <div className="font-medium text-gray-900 flex items-center gap-2">
                        {p.name}
                        {p.requires_rx && <span className="text-xs bg-green-50 text-green-700 px-1.5 py-0.5 rounded-full">Rx</span>}
                      </div>
                      <div className="text-xs text-gray-400">{p.manufacturer}</div>
                    </td>
                    <td className="px-4 py-3 text-gray-600">{p.category}</td>
                    <td className="px-4 py-3 font-medium text-gray-900">₹{p.mrp}</td>
                    <td className="px-4 py-3 text-gray-600">₹{p.sell_price}</td>
                    <td className="px-4 py-3 text-gray-700">{stock} units</td>
                    <td className="px-4 py-3 text-gray-500 text-xs">{expiry}</td>
                    <td className="px-4 py-3">
                      <span className={`text-xs px-2 py-1 rounded-full border font-medium ${st.cls}`}>{st.label}</span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex gap-3">
                        <button onClick={() => openEdit(p)} className="text-xs text-gray-400 hover:text-green-600 transition-colors font-medium">Edit</button>
                        <button onClick={() => deleteProduct(p.id)} className="text-xs text-gray-400 hover:text-red-500 transition-colors font-medium">Delete</button>
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Slide-in panel */}
      {showPanel && (
        <div className="fixed inset-0 z-50 flex">
          <div className="flex-1 bg-black/30" onClick={() => setShowPanel(false)} />
          <div className="w-96 bg-white shadow-2xl overflow-y-auto flex flex-col">
            <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between sticky top-0 bg-white z-10">
              <h2 className="font-semibold text-gray-900">{editId ? 'Edit product' : 'Add new product'}</h2>
              <button onClick={() => setShowPanel(false)} className="text-gray-400 hover:text-gray-600 text-xl">✕</button>
            </div>

            <div className="flex-1 p-5 space-y-3 overflow-y-auto">
              <div>
                <label className="text-xs font-medium text-gray-500 block mb-1">Brand name *</label>
                <input className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-green-500" value={form.name} onChange={f('name')} placeholder="e.g. Dolo 650" />
              </div>
              <div>
                <label className="text-xs font-medium text-gray-500 block mb-1">Salt / Generic name</label>
                <input className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-green-500" value={form.salt_name} onChange={f('salt_name')} placeholder="e.g. Paracetamol 650mg" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-medium text-gray-500 block mb-1">Category *</label>
                  <select className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-green-500" value={form.category} onChange={f('category')}>
                    <option value="">Select</option>
                    {CATEGORIES.map(c => <option key={c}>{c}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-500 block mb-1">Manufacturer</label>
                  <input className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-green-500" value={form.manufacturer} onChange={f('manufacturer')} placeholder="e.g. GSK" />
                </div>
              </div>

              <div className="border-t border-gray-100 pt-3">
                <div className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">Pricing</div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-medium text-gray-500 block mb-1">MRP (₹) *</label>
                    <input type="number" min="0" className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-green-500" value={form.mrp} onChange={f('mrp')} placeholder="0.00" />
                  </div>
                  <div>
                    <label className="text-xs font-medium text-gray-500 block mb-1">Sell price (₹)</label>
                    <input type="number" min="0" className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-green-500" value={form.sell_price} onChange={f('sell_price')} placeholder="Leave blank = MRP" />
                  </div>
                  <div>
                    <label className="text-xs font-medium text-gray-500 block mb-1">Purchase price (₹)</label>
                    <input type="number" min="0" className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-green-500" value={form.purchase_price} onChange={f('purchase_price')} placeholder="0.00" />
                  </div>
                </div>
              </div>

              <div className="border-t border-gray-100 pt-3">
                <div className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">Stock / Inventory</div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-medium text-gray-500 block mb-1">Quantity *</label>
                    <input type="number" min="0" className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-green-500" value={form.stock_qty} onChange={f('stock_qty')} placeholder="0" />
                  </div>
                  <div>
                    <label className="text-xs font-medium text-gray-500 block mb-1">Reorder at</label>
                    <input type="number" min="0" className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-green-500" value={form.reorder_at} onChange={f('reorder_at')} />
                  </div>
                  <div>
                    <label className="text-xs font-medium text-gray-500 block mb-1">Batch number</label>
                    <input className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-green-500" value={form.batch_no} onChange={f('batch_no')} placeholder="e.g. BN2024A" />
                  </div>
                  <div>
                    <label className="text-xs font-medium text-gray-500 block mb-1">Expiry date</label>
                    <input type="month" className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-green-500" value={form.expiry_date} onChange={f('expiry_date')} />
                  </div>
                </div>
              </div>

              <label className="flex items-center gap-2 cursor-pointer pt-1">
                <input type="checkbox" checked={form.requires_rx} onChange={f('requires_rx')} className="w-4 h-4 accent-green-600" />
                <span className="text-sm text-gray-700">Requires prescription (Rx)</span>
              </label>

              {saveError && (
                <div className="bg-red-50 border border-red-200 rounded-lg px-3 py-2.5 text-sm text-red-600">
                  {saveError}
                </div>
              )}
            </div>

            <div className="p-4 border-t border-gray-100 flex gap-3 sticky bottom-0 bg-white">
              <button
                onClick={saveProduct}
                disabled={saving}
                className="flex-1 bg-green-600 hover:bg-green-700 disabled:opacity-50 text-white font-medium py-2.5 rounded-xl transition-colors text-sm"
              >
                {saving ? 'Saving...' : editId ? 'Save changes' : 'Add product'}
              </button>
              <button onClick={() => setShowPanel(false)} className="px-4 border border-gray-200 text-gray-500 rounded-xl hover:bg-gray-50 transition-colors text-sm">
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
