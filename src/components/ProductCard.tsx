'use client'
import type { Product } from '@/lib/types'

const CAT_ICONS: Record<string, string> = {
  Tablet: '💊', Syrup: '🧴', Cream: '🫙', Injection: '💉', Capsule: '🔵', Drops: '💧',
}

type Props = {
  product: Product
  inCart: boolean
  onAdd: () => void
}

export default function ProductCard({ product: p, inCart, onAdd }: Props) {
  const stock = p.inventory?.reduce((a, i) => a + i.stock_qty, 0) ?? 0
  const disc = p.sell_price < p.mrp
    ? Math.round(((p.mrp - p.sell_price) / p.mrp) * 100)
    : 0

  return (
    <div className="bg-white border border-gray-100 rounded-xl overflow-hidden hover:border-brand-400 hover:shadow-sm transition-all flex flex-col">
      {/* Image area */}
      <div className="h-24 bg-brand-50 flex items-center justify-center text-4xl">
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
            {disc > 0 && (
              <>
                <span className="text-xs text-gray-400 line-through">₹{p.mrp}</span>
                <span className="text-xs text-brand-600 font-medium">{disc}% off</span>
              </>
            )}
          </div>

          <div className="text-xs mb-2">
            {stock > 0
              ? <span className="text-gray-400">{stock} in stock</span>
              : <span className="text-red-500 font-medium">Out of stock</span>
            }
          </div>

          <button
            onClick={onAdd}
            disabled={stock === 0}
            className={`w-full text-sm py-1.5 rounded-lg border font-medium transition-colors
              ${inCart
                ? 'bg-brand-500 text-white border-brand-500'
                : 'border-brand-400 text-brand-600 hover:bg-brand-50'
              }
              disabled:opacity-40 disabled:cursor-not-allowed`}
          >
            {inCart ? '✓ Added' : 'Add to cart'}
          </button>
        </div>
      </div>
    </div>
  )
}
