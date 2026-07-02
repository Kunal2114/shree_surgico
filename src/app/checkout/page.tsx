'use client'
import { useState } from 'react'
import Navbar from '@/components/Navbar'

type Step = 'address' | 'prescription' | 'payment' | 'success'

const STEPS: Step[] = ['address', 'prescription', 'payment', 'success']
const STEP_LABELS = ['Address', 'Prescription', 'Payment', 'Confirm']

// Mock cart — in production, read from localStorage or a cart context
const MOCK_CART = [
  { name: 'Dolo 650', qty: 2, price: 28, mrp: 30, rx: false },
  { name: 'Azithral 500', qty: 1, price: 80, mrp: 85, rx: true },
  { name: 'Alex Cough Syrup', qty: 1, price: 100, mrp: 110, rx: false },
]

export default function CheckoutPage() {
  const [step, setStep]       = useState<Step>('address')
  const [rxUploaded, setRx]   = useState(false)
  const [payMethod, setPay]   = useState('upi')
  const [orderId]             = useState(`SSP-2026-${Math.floor(10000 + Math.random() * 90000)}`)

  const subtotal  = MOCK_CART.reduce((a, i) => a + i.price * i.qty, 0)
  const savings   = MOCK_CART.reduce((a, i) => a + (i.mrp - i.price) * i.qty, 0)
  const delivery  = subtotal >= 299 ? 0 : 49
  const total     = subtotal + delivery
  const hasRx     = MOCK_CART.some(i => i.rx)

  const stepIdx = STEPS.indexOf(step)

  async function handlePayment() {
    // 1. Create Razorpay order via API
    const res = await fetch('/api/checkout', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ amount: total }),
    })
    const { razorpay_order_id, amount } = await res.json()

    // 2. Open Razorpay checkout widget
    const options = {
      key:        process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID,
      amount,
      currency:   'INR',
      name:       'Shree Surgico Pharmaceuticals',
      description: 'Medicine order',
      order_id:   razorpay_order_id,
      handler:    async (response: any) => {
        // 3. Verify payment signature server-side
        const verify = await fetch('/api/checkout', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(response),
        })
        const { verified } = await verify.json()
        if (verified) setStep('success')
      },
      prefill: { name: 'Rahul Sharma', contact: '9820012345' },
      theme: { color: '#1D9E75' },
    }

    // @ts-ignore — Razorpay loaded via CDN script tag
    const rzp = new (window as any).Razorpay(options)
    rzp.open()
  }

  return (
    <>
      {/* Razorpay CDN script */}
      <script src="https://checkout.razorpay.com/v1/checkout.js" async />

      <Navbar />

      {/* Steps progress bar */}
      <div className="bg-white border-b border-gray-100">
        <div className="max-w-4xl mx-auto px-4 py-3 flex items-center justify-center gap-2">
          {STEP_LABELS.map((label, i) => (
            <div key={label} className="flex items-center gap-2">
              <div className={`flex items-center gap-1.5 text-xs font-medium
                ${i < stepIdx ? 'text-brand-600' : i === stepIdx ? 'text-brand-600' : 'text-gray-400'}`}>
                <span className={`w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold
                  ${i < stepIdx ? 'bg-brand-500 text-white' : i === stepIdx ? 'bg-brand-500 text-white' : 'bg-gray-100 text-gray-400'}`}>
                  {i < stepIdx ? '✓' : i + 1}
                </span>
                {label}
              </div>
              {i < STEP_LABELS.length - 1 && (
                <div className={`w-8 h-px ${i < stepIdx ? 'bg-brand-400' : 'bg-gray-200'}`} />
              )}
            </div>
          ))}
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 py-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">

          {/* Left — main form area */}
          <div className="md:col-span-2 space-y-4">

            {/* ── STEP 1: Address ── */}
            {step === 'address' && (
              <div className="bg-white border border-gray-100 rounded-xl p-5">
                <h2 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
                  📍 Delivery address
                </h2>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs text-gray-500 font-medium block mb-1">First name *</label>
                    <input className="form-input" defaultValue="Rahul" />
                  </div>
                  <div>
                    <label className="text-xs text-gray-500 font-medium block mb-1">Last name *</label>
                    <input className="form-input" defaultValue="Sharma" />
                  </div>
                  <div className="col-span-2">
                    <label className="text-xs text-gray-500 font-medium block mb-1">Mobile number *</label>
                    <input className="form-input" defaultValue="9820012345" />
                  </div>
                  <div className="col-span-2">
                    <label className="text-xs text-gray-500 font-medium block mb-1">Flat / Building *</label>
                    <input className="form-input" defaultValue="402, Sunrise Apt, Andheri East" />
                  </div>
                  <div className="col-span-2">
                    <label className="text-xs text-gray-500 font-medium block mb-1">Area / Landmark</label>
                    <input className="form-input" defaultValue="Near WEH Metro, MIDC" />
                  </div>
                  <div>
                    <label className="text-xs text-gray-500 font-medium block mb-1">City *</label>
                    <input className="form-input" defaultValue="Mumbai" />
                  </div>
                  <div>
                    <label className="text-xs text-gray-500 font-medium block mb-1">PIN code *</label>
                    <input className="form-input" defaultValue="400093" />
                  </div>
                </div>

                {/* Delivery slot */}
                <h3 className="font-medium text-gray-800 mt-5 mb-3 flex items-center gap-2">⏰ Delivery slot</h3>
                <div className="space-y-2">
                  {[
                    { id: 'express', label: 'Express — within 2 hours', sub: 'Available today · ₹49', icon: '⚡' },
                    { id: 'standard', label: 'Standard — tomorrow by 12 PM', sub: 'Free on orders above ₹299', icon: '📦' },
                  ].map(opt => (
                    <label key={opt.id} className="flex items-center gap-3 p-3 border border-gray-200 rounded-lg cursor-pointer hover:border-brand-400 transition-colors has-[:checked]:border-brand-500 has-[:checked]:bg-brand-50">
                      <input type="radio" name="slot" value={opt.id} defaultChecked={opt.id === 'express'} className="accent-brand-500" />
                      <span className="text-xl">{opt.icon}</span>
                      <div>
                        <div className="text-sm font-medium text-gray-900">{opt.label}</div>
                        <div className="text-xs text-gray-400">{opt.sub}</div>
                      </div>
                    </label>
                  ))}
                </div>

                <button
                  onClick={() => setStep(hasRx ? 'prescription' : 'payment')}
                  className="w-full mt-5 bg-brand-500 hover:bg-brand-600 text-white font-medium py-3 rounded-xl transition-colors"
                >
                  Continue →
                </button>
              </div>
            )}

            {/* ── STEP 2: Prescription ── */}
            {step === 'prescription' && (
              <div className="bg-white border border-gray-100 rounded-xl p-5">
                <h2 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                  📋 Upload prescription
                </h2>

                <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 mb-4 flex gap-2 text-sm text-amber-800">
                  ⚠️ <span><strong>Azithral 500</strong> requires a valid doctor's prescription under Indian pharmacy law.</span>
                </div>

                {!rxUploaded ? (
                  <div
                    onClick={() => setRx(true)}
                    className="border-2 border-dashed border-gray-200 hover:border-brand-400 rounded-xl p-10 text-center cursor-pointer transition-colors"
                  >
                    <div className="text-4xl mb-3">📤</div>
                    <div className="font-medium text-gray-800 mb-1">Click to upload prescription</div>
                    <div className="text-xs text-gray-400">JPG, PNG or PDF · Max 5MB</div>
                  </div>
                ) : (
                  <div className="border-2 border-brand-400 bg-brand-50 rounded-xl p-4 flex items-center gap-3">
                    <span className="text-2xl">✅</span>
                    <div>
                      <div className="font-medium text-brand-700 text-sm">prescription_rahul.jpg uploaded</div>
                      <div className="text-xs text-brand-500">Pending pharmacist verification</div>
                    </div>
                    <button onClick={() => setRx(false)} className="ml-auto text-gray-400 hover:text-gray-600 text-lg">✕</button>
                  </div>
                )}

                <div className="mt-4 text-xs text-gray-400 space-y-1">
                  <div className="font-medium text-gray-500 mb-1">Valid prescription must include:</div>
                  {["Doctor's name, reg. number & signature", "Patient name & issue date", "Medicine name, dosage & duration"].map(r => (
                    <div key={r} className="flex gap-2"><span className="text-brand-500">✓</span>{r}</div>
                  ))}
                </div>

                {/* Patient details */}
                <h3 className="font-medium text-gray-800 mt-5 mb-3">👤 Patient details</h3>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs text-gray-500 font-medium block mb-1">Patient name *</label>
                    <input className="form-input" defaultValue="Rahul Sharma" />
                  </div>
                  <div>
                    <label className="text-xs text-gray-500 font-medium block mb-1">Age *</label>
                    <input className="form-input" defaultValue="34" />
                  </div>
                  <div className="col-span-2">
                    <label className="text-xs text-gray-500 font-medium block mb-1">Doctor's name</label>
                    <input className="form-input" placeholder="Dr. ..." />
                  </div>
                </div>

                <button
                  onClick={() => rxUploaded && setStep('payment')}
                  disabled={!rxUploaded}
                  className="w-full mt-5 bg-brand-500 hover:bg-brand-600 disabled:opacity-40 disabled:cursor-not-allowed text-white font-medium py-3 rounded-xl transition-colors"
                >
                  {rxUploaded ? 'Continue to payment →' : 'Upload prescription to continue'}
                </button>
              </div>
            )}

            {/* ── STEP 3: Payment ── */}
            {step === 'payment' && (
              <div className="bg-white border border-gray-100 rounded-xl p-5">
                <h2 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
                  💳 Payment method
                </h2>
                <div className="space-y-2 mb-5">
                  {[
                    { id: 'upi',  label: 'UPI', sub: 'GPay, PhonePe, Paytm, any UPI app', icon: '📱' },
                    { id: 'card', label: 'Credit / Debit card', sub: 'Visa, Mastercard, RuPay', icon: '💳' },
                    { id: 'nb',   label: 'Net banking', sub: 'All major Indian banks', icon: '🏦' },
                    { id: 'cod',  label: 'Cash on delivery', sub: 'Pay when you receive · +₹20', icon: '💵' },
                  ].map(opt => (
                    <label key={opt.id} className="flex items-center gap-3 p-3 border border-gray-200 rounded-lg cursor-pointer hover:border-brand-400 transition-colors has-[:checked]:border-brand-500 has-[:checked]:bg-brand-50">
                      <input type="radio" name="pay" value={opt.id} checked={payMethod === opt.id} onChange={() => setPay(opt.id)} className="accent-brand-500" />
                      <span className="text-xl">{opt.icon}</span>
                      <div>
                        <div className="text-sm font-medium text-gray-900">{opt.label}</div>
                        <div className="text-xs text-gray-400">{opt.sub}</div>
                      </div>
                    </label>
                  ))}
                </div>

                {payMethod === 'upi' && (
                  <div className="mb-4">
                    <label className="text-xs text-gray-500 font-medium block mb-1">UPI ID</label>
                    <input className="form-input" placeholder="yourname@upi" defaultValue="rahul@okaxis" />
                  </div>
                )}
                {payMethod === 'card' && (
                  <div className="mb-4 space-y-3">
                    <div>
                      <label className="text-xs text-gray-500 font-medium block mb-1">Card number</label>
                      <input className="form-input" placeholder="1234 5678 9012 3456" />
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="text-xs text-gray-500 font-medium block mb-1">Expiry (MM/YY)</label>
                        <input className="form-input" placeholder="MM/YY" />
                      </div>
                      <div>
                        <label className="text-xs text-gray-500 font-medium block mb-1">CVV</label>
                        <input className="form-input" placeholder="•••" type="password" maxLength={3} />
                      </div>
                    </div>
                  </div>
                )}

                <button
                  onClick={handlePayment}
                  className="w-full bg-brand-500 hover:bg-brand-600 text-white font-semibold py-3 rounded-xl transition-colors flex items-center justify-center gap-2"
                >
                  🔒 Pay ₹{total} securely
                </button>
                <div className="text-center text-xs text-gray-400 mt-2">
                  Powered by <span className="font-bold text-[#072654] bg-[#072654] text-white px-1.5 py-0.5 rounded text-[10px]">razorpay</span>
                </div>
              </div>
            )}

            {/* ── STEP 4: Success ── */}
            {step === 'success' && (
              <div className="bg-white border border-gray-100 rounded-xl p-8 text-center">
                <div className="w-16 h-16 bg-brand-50 rounded-full flex items-center justify-center mx-auto mb-4 text-3xl">✅</div>
                <h2 className="text-xl font-semibold text-gray-900 mb-1">Order placed!</h2>
                <p className="text-gray-500 text-sm mb-3">Thank you for choosing Shree Surgico Pharmaceuticals</p>
                <div className="inline-block bg-gray-100 rounded-lg px-4 py-2 font-mono text-sm text-gray-600 mb-4">{orderId}</div>
                <p className="text-sm text-gray-700 mb-6">Estimated delivery: <strong>Today by 6:30 PM</strong></p>

                {/* Tracking timeline */}
                <div className="text-left max-w-xs mx-auto space-y-3 mb-6">
                  {[
                    { label: 'Order confirmed', time: 'Just now', done: true },
                    { label: 'Pharmacist reviewing prescription', time: 'In progress', done: true },
                    { label: 'Packing your order', time: 'Pending', done: false },
                    { label: 'Out for delivery', time: 'Pending', done: false },
                    { label: 'Delivered', time: 'Today by 6:30 PM', done: false },
                  ].map((t, i) => (
                    <div key={i} className="flex gap-3 items-start">
                      <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs flex-shrink-0 mt-0.5 ${t.done ? 'bg-brand-500 text-white' : 'bg-gray-100 text-gray-400'}`}>
                        {t.done ? '✓' : i + 1}
                      </span>
                      <div>
                        <div className="text-sm font-medium text-gray-800">{t.label}</div>
                        <div className="text-xs text-gray-400">{t.time}</div>
                      </div>
                    </div>
                  ))}
                </div>

                <a href="/" className="inline-block bg-brand-500 hover:bg-brand-600 text-white font-medium px-6 py-2.5 rounded-xl transition-colors">
                  Continue shopping
                </a>
              </div>
            )}
          </div>

          {/* Right — Order summary (sticky) */}
          {step !== 'success' && (
            <div className="md:col-span-1">
              <div className="bg-white border border-gray-100 rounded-xl p-4 sticky top-20">
                <h3 className="font-semibold text-gray-900 mb-3 text-sm">Order summary</h3>
                <div className="space-y-2 mb-3">
                  {MOCK_CART.map(item => (
                    <div key={item.name} className="flex justify-between text-xs text-gray-600">
                      <span>{item.name} × {item.qty}{item.rx ? ' 🟡' : ''}</span>
                      <span className="font-medium">₹{item.price * item.qty}</span>
                    </div>
                  ))}
                </div>
                <div className="border-t border-gray-100 pt-2 space-y-1 text-xs">
                  <div className="flex justify-between text-gray-500"><span>Subtotal</span><span>₹{subtotal}</span></div>
                  <div className="flex justify-between text-brand-600"><span>Savings</span><span>−₹{savings}</span></div>
                  <div className="flex justify-between text-gray-500"><span>Delivery</span><span>{delivery === 0 ? 'Free' : `₹${delivery}`}</span></div>
                  <div className="flex justify-between font-semibold text-gray-900 pt-1 border-t border-gray-100 text-sm mt-1">
                    <span>Total</span><span>₹{total}</span>
                  </div>
                </div>
                <div className="mt-3 flex items-center gap-1.5 text-xs text-gray-400">
                  <span>🔒</span> Secured by Shree Surgico
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  )
}
