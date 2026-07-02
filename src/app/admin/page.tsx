'use client'
import { useEffect, useState } from 'react'
import Navbar from '@/components/Navbar'
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

export default function AdminPage() {
  const [products, setProducts]   = useState<Product[]>([])
  const [loading, setLoading]     = useState(true)
  const [showPanel, setShowPanel] = useState(false)
  const [form, setForm]           = useState(emptyForm())
  const [editId, setEditId]       = useState<string | null>(null)
  const [search, setSearch]       = useState('')
  const [saving, setSaving]       = useState(false)
  const [mounted, setMounted]     = useState(false)

  useEffect(() => { setMounted(true) }, [])

  async function loadProducts() {
    setLoading(true)
    const { data } = await supabase
      .from('products')
      .select('*, inventory(stock_qty, reorder_at, expiry_date, batch_no, purchase_price)')
      .order('name')
    setProducts(data ?? [])
    setLoading(false)
  }

  useEffect(() => { if (mounted) loadProducts() }, [mounted])

  function openAdd() {
    setEditId(null)
    setForm(emptyForm())
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
    setShowPanel(true)
  }

  async function saveProduct() {
    if (!form.name || !form.mrp || !form.category) return alert('Fill required fields')
    setSaving(true)
    if (editId) {
      await supabase.from('products').update({
        name: form.name, salt_name: form.salt_name, category: form.category,
        manufacturer: form.manufacturer, mrp: Number(form.mrp),
        sell_price: Number(form.sell_price) || Number(form.mrp),
        requires_rx: form.requires_rx,
      }).eq('id', editId)
      // Update inventory
      await supabase.from('inventory').update({
        stock_qty: Number(form.stock_qty), reorder_at: Number(form.reorder_at),
        expiry_date: form.expiry_date, batch_no: form.batch_no,
        purchase_price: Number(form.purchase_price),
      }).eq('product_id', editId)
    } else {
      const { data: prod } = await supabase.from('products').insert({
        name: form.name, salt_name: form.salt_name, category: form.category,
        manufacturer: form.manufacturer, mrp: Number(form.mrp),
        sell_price: Number(form.sell_price) || Number(form.mrp),
        requires_rx: form.requires_rx,
      }).select().single()
      if (prod) {
        await supabase.from('inventory').insert({
          product_id: prod.id, stock_qty: Number(form.stock_qty),
          reorder_at: Number(form.reorder_at), expiry_date: form.expiry_date,
          batch_no: form.batch_no, purchase_price: Number(form.purchase_price),
        })
      }
    }
    setSaving(false)
    setShowPanel(false)
    loadProducts()
  }

  async function deleteProduct(id: string) {
    if (!confirm('Delete this product?')) return
    await supabase.from('inventory').delete().eq('product_id', id)
    await supabase.from('products').delete().eq('id', id)
    loadProducts()
  }

  function stockStatus(p: Product) {
    const stock = p.inventory?.[0]?.stock_qty ?? 0
    const reorder = p.inventory?.[0]?.reorder_at ?? 10
    const expiry = p.inventory?.[0]?.expiry_date
    const daysToExp = expiry ? (new Date(expiry).getTime() - Date.now()) / 86400000 : 999
    if (daysToExp < 30) return { label: 'Expiring', cls: 'bg-red-50 text-red-600 border-red-200' }
    if (stock <= reorder) return { label: 'Low stock', cls: 'bg-amber-50 text-amber-700 border-amber-200' }
    return { label: 'In stock', cls: 'bg-brand-50 text-brand-700 border-brand-200' }
  }

  if (!mounted) return null

  const totalValue = products.reduce((a, p) => a + p.mrp * (p.inventory?.[0]?.stock_qty ?? 0), 0)
  const lowStock   = products.filter(p => (p.inventory?.[0]?.stock_qty ?? 0) <= (p.inventory?.[0]?.reorder_at ?? 10)).length
  const filtered   = products.filter(p => !search || p.name.toLowerCase().includes(search.toLowerCase()))

  const f = (k: keyof typeof form) => (e: any) =>
    setForm(prev => ({ ...prev, [k]: e.target.type === 'checkbox' ? e.target.checked : e.target.value }))

  return (
    <>
      <Navbar />
      <div className="max-w-6xl mx-auto px-4 py-6">

        {/* Stats */}
        <div className="grid grid-cols-4 gap-4 mb-6">
          {[
            { label: 'Total products', value: products.length, sub: 'in catalogue' },
            { label: 'Low stock', value: lowStock, sub: 'need reorder', warn: true },
            { label: 'Inventory value', value: `₹${totalValue.toLocaleString('en-IN')}`, sub: 'at MRP' },
            { label: 'Categories', value: CATEGORIES.length, sub: 'product types' },
          ].map(s => (
            <div key={s.label} className="bg-white border border-gray-100 rounded-xl p-4">
              <div className="text-xs text-gray-400 mb-1">{s.label}</div>
              <div className={`text-2xl font-semibold ${s.warn && lowStock > 0 ? 'text-amber-600' : 'text-gray-900'}`}>
                {s.value}
              </div>
              <div className="text-xs text-gray-400">{s.sub}</div>
            </div>
          ))}
        </div>

        {/* Toolbar */}
        <div className="flex items-center gap-3 mb-4">
          <input
            className="form-input max-w-sm"
            placeholder="Search products..."
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
          <div className="flex-1" />
          <button
            onClick={openAdd}
            className="bg-brand-500 hover:bg-brand-600 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors flex items-center gap-2"
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
                const st = stockStatus(p)
                const stock = p.inventory?.[0]?.stock_qty ?? 0
                const expiry = p.inventory?.[0]?.expiry_date ?? '—'
                return (
                  <tr key={p.id} className="border-b border-gray-50 hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-3">
                      <div className="font-medium text-gray-900 flex items-center gap-2">
                        {p.name}
                        {p.requires_rx && <span className="text-xs bg-brand-50 text-brand-600 px-1.5 py-0.5 rounded-full">Rx</span>}
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
                      <div className="flex gap-2">
                        <button onClick={() => openEdit(p)} className="text-xs text-gray-400 hover:text-brand-600 transition-colors">Edit</button>
                        <button onClick={() => deleteProduct(p.id)} className="text-xs text-gray-400 hover:text-red-500 transition-colors">Delete</button>
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
              <h2 className="font-semibold text-gray-900">{editId ? 'Edit product' : 'Add product'}</h2>
              <button onClick={() => setShowPanel(false)} className="text-gray-400 hover:text-gray-600 text-xl">✕</button>
            </div>
            <div className="flex-1 p-5 space-y-3 overflow-y-auto">
              {/* Product fields */}
              <div><label className="text-xs font-medium text-gray-500 block mb-1">Brand name *</label><input className="form-input" value={form.name} onChange={f('name')} placeholder="e.g. Dolo 650" /></div>
              <div><label className="text-xs font-medium text-gray-500 block mb-1">Salt / Generic name</label><input className="form-input" value={form.salt_name} onChange={f('salt_name')} placeholder="e.g. Paracetamol 650mg" /></div>
              <div className="grid grid-cols-2 gap-3">
                <div><label className="text-xs font-medium text-gray-500 block mb-1">Category *</label>
                  <select className="form-input" value={form.category} onChange={f('category')}>
                    <option value="">Select</option>
                    {CATEGORIES.map(c => <option key={c}>{c}</option>)}
                  </select>
                </div>
                <div><label className="text-xs font-medium text-gray-500 block mb-1">Manufacturer</label><input className="form-input" value={form.manufacturer} onChange={f('manufacturer')} placeholder="e.g. GSK" /></div>
              </div>
              <div className="border-t border-gray-100 pt-3">
                <div className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">Pricing</div>
                <div className="grid grid-cols-2 gap-3">
                  <div><label className="text-xs font-medium text-gray-500 block mb-1">MRP (₹) *</label><input type="number" className="form-input" value={form.mrp} onChange={f('mrp')} /></div>
                  <div><label className="text-xs font-medium text-gray-500 block mb-1">Sell price (₹)</label><input type="number" className="form-input" value={form.sell_price} onChange={f('sell_price')} /></div>
                  <div><label className="text-xs font-medium text-gray-500 block mb-1">Purchase price (₹)</label><input type="number" className="form-input" value={form.purchase_price} onChange={f('purchase_price')} /></div>
                </div>
              </div>
              <div className="border-t border-gray-100 pt-3">
                <div className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">Stock</div>
                <div className="grid grid-cols-2 gap-3">
                  <div><label className="text-xs font-medium text-gray-500 block mb-1">Quantity *</label><input type="number" className="form-input" value={form.stock_qty} onChange={f('stock_qty')} /></div>
                  <div><label className="text-xs font-medium text-gray-500 block mb-1">Reorder at</label><input type="number" className="form-input" value={form.reorder_at} onChange={f('reorder_at')} /></div>
                  <div><label className="text-xs font-medium text-gray-500 block mb-1">Batch number</label><input className="form-input" value={form.batch_no} onChange={f('batch_no')} /></div>
                  <div><label className="text-xs font-medium text-gray-500 block mb-1">Expiry date *</label><input type="month" className="form-input" value={form.expiry_date} onChange={f('expiry_date')} /></div>
                </div>
              </div>
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" checked={form.requires_rx} onChange={f('requires_rx')} className="accent-brand-500 w-4 h-4" />
                <span className="text-sm text-gray-700">Requires prescription (Rx)</span>
              </label>
            </div>
            <div className="p-4 border-t border-gray-100 flex gap-3 sticky bottom-0 bg-white">
              <button onClick={saveProduct} disabled={saving} className="flex-1 bg-brand-500 hover:bg-brand-600 disabled:opacity-50 text-white font-medium py-2.5 rounded-xl transition-colors">
                {saving ? 'Saving...' : editId ? 'Save changes' : 'Add product'}
              </button>
              <button onClick={() => setShowPanel(false)} className="px-4 border border-gray-200 text-gray-500 rounded-xl hover:bg-gray-50 transition-colors">Cancel</button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
