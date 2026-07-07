'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'

type Props = { cartCount?: number }

export default function Navbar({ cartCount = 0 }: Props) {
  const path = usePathname()
  const isAdmin = path.startsWith('/admin')

  return (
    <nav className="bg-white border-b border-gray-100 sticky top-0 z-50 shadow-sm">
      <div className="max-w-6xl mx-auto px-4 h-14 flex items-center gap-4">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-2 flex-shrink-0">
          <span className="text-2xl">💊</span>
          <div>
            <div className="font-semibold text-brand-600 text-sm leading-tight">
              Shree Surgico Pharmaceuticals
            </div>
            <div className="text-xs text-gray-400 leading-tight">Licensed Pharmacy · Mumbai</div>
          </div>
        </Link>

        <div className="flex-1" />

        {isAdmin ? (
          <div className="flex items-center gap-3">
            <Link href="/admin" className={`text-sm px-3 py-1.5 rounded-lg transition-colors ${path === '/admin' ? 'bg-brand-50 text-brand-600 font-medium' : 'text-gray-500 hover:text-gray-900'}`}>
              Inventory
            </Link>
            <Link href="/admin/orders" className={`text-sm px-3 py-1.5 rounded-lg transition-colors ${path === '/admin/orders' ? 'bg-brand-50 text-brand-600 font-medium' : 'text-gray-500 hover:text-gray-900'}`}>
              Orders
            </Link>
            <Link href="/" className="text-sm text-gray-400 hover:text-gray-600 transition-colors">
              ← Storefront
            </Link>
          </div>
        ) : (
          <div className="flex items-center gap-3">
            <Link href="/" className="text-sm text-gray-500 hover:text-gray-900 transition-colors">Home</Link>
            <Link href="/orders" className="text-sm text-gray-500 hover:text-gray-900 transition-colors">My Orders</Link>
            <Link href="/admin" className="text-sm text-gray-400 hover:text-gray-600 transition-colors">Admin ↗</Link>
            <Link href="/checkout" className="relative flex items-center gap-2 bg-brand-500 hover:bg-brand-600 text-white text-sm px-4 py-2 rounded-lg transition-colors">
              🛒 Cart
              {cartCount > 0 && (
                <span className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-orange-500 text-white text-xs rounded-full flex items-center justify-center font-bold">
                  {cartCount}
                </span>
              )}
            </Link>
          </div>
        )}
      </div>
    </nav>
  )
}
