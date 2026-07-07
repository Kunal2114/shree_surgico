'use client'
import React, { useState, useRef } from 'react'
import Navbar from '@/components/Navbar'

type Step = 'address' | 'prescription' | 'payment' | 'success'

const STEPS: Step[]    = ['address', 'prescription', 'payment', 'success']
const STEP_LABELS      = ['Address', 'Prescription', 'Payment', 'Confirm']

const MOCK_CART = [
  { name: 'Dolo 650',        qty: 2, price: 28,  mrp: 30,  rx: false },
  { name: 'Azithral 500',    qty: 1, price: 80,  mrp: 85,  rx: true  },
  { name: 'Alex Cough Syrup',qty: 1, price: 100, mrp: 110, rx: false },
]

// Accepted MIME types + extensions
const ACCEPTED_TYPES = [
  'image/jpeg',
  'image/jpg',
  'image/png',
  'application/pdf',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document', // .docx
  'application/msword', // .doc
]
const ACCEPTED_EXTENSIONS = '.jpg,.jpeg,.png,.pdf,.doc,.docx'
const MAX_SIZE_MB = 5

function fileIcon(file: File) {
  if (file.type.startsWith('image/'))      return '🖼️'
  if (file.type === 'application/pdf')     return '📄'
  if (file.type.includes('word') || file.type.includes('document')) return '📝'
  return '📎'
}

function formatSize(bytes: number) {
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

export default function CheckoutPage() {
  const [step, setStep]         = useState<Step>('address')
  const [payMethod, setPay]     = useState('upi')
  const [orderId]               = useState(`SSP-2026-${Math.floor(10000 + Math.random() * 90000)}`)

  // Prescription state
  const [rxFile, setRxFile]     = useState<File | null>(null)
  const [rxError, setRxError]   = useState('')
  const [dragging, setDragging] = useState(false)
  const fileInputRef            = useRef<HTMLInputElement>(null)

  // Patient details
  const [patientName, setPatientName] = useState('')
  const [patientAge, setPatientAge]   = useState('')
  const [doctorName, setDoctorName]   = useState('')

  const subtotal = MOCK_CART.reduce((a, i) => a + i.price * i.qty, 0)
  const savings  = MOCK_CART.reduce((a, i) => a + (i.mrp - i.price) * i.qty, 0)
  const delivery = subtotal >= 299 ? 0 : 49
  const total    = subtotal + delivery
  const hasRx    = MOCK_CART.some(i => i.rx)
  const stepIdx  = STEPS.indexOf(step)
  const rxItems  = MOCK_CART.filter(i => i.rx).map(i => i.name).join(', ')

  // ── File validation ──────────────────────────────────────────
  function validateAndSetFile(file: File) {
    setRxError('')

    if (!ACCEPTED_TYPES.includes(file.type)) {
      setRxError(`Invalid file type "${file.name}". Please upload a JPG, PNG, PDF, or Word document (.docx).`)
      return
    }
    if (file.size > MAX_SIZE_MB * 1024 * 1024) {
      setRxError(`File is too large (${formatSize(file.size)}). Maximum size is ${MAX_SIZE_MB} MB.`)
      return
    }
    setRxFile(file)
  }

  function handleFileInput(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (file) validateAndSetFile(file)
    // Reset input so the same file can be re-selected after removal
    e.target.value = ''
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault()
    setDragging(false)
    const file = e.dataTransfer.files?.[0]
    if (file) validateAndSetFile(file)
  }

  function removeFile() {
    setRxFile(null)
    setRxError('')
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  // ── Razorpay payment ─────────────────────────────────────────
  async function handlePayment() {
    const res = await fetch('/api/checkout', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ amount: total }),
    })
    const { razorpay_order_id, amount } = await res.json()
    const options = {
      key:      process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID,
      amount,
      currency: 'INR',
      name:     'Shree Surgico Pharmaceuticals',
      order_id: razorpay_order_id,
      handler:  async (response: any) => {
        const verify = await fetch('/api/checkout', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(response),
        })
        const { verified } = await verify.json()
        if (verified) setStep('success')
      },
      prefill: { name: patientName },
      theme:   { color: '#16a34a' },
    }
    const rzp = new (window as any).Razorpay(options)
    rzp.open()
  }

  // ── Order summary sidebar (reused across steps) ───────────────
  const OrderSummary = () => (
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
        <div className="flex justify-between text-green-600"><span>Savings</span><span>−₹{savings}</span></div>
        <div className="flex justify-between text-gray-500"><span>Delivery</span><span>{delivery === 0 ? <span className="text-green-600">Free</span> : `₹${delivery}`}</span></div>
        <div className="flex justify-between font-semibold text-gray-900 pt-1 border-t border-gray-100 text-sm mt-1">
          <span>Total</span><span>₹{total}</span>
        </div>
      </div>
      <div className="mt-3 flex items-center gap-1.5 text-xs text-gray-400">
        🔒 Secured by Shree Surgico
      </div>
    </div>
  )

  return (
    <>
      <script src="https://checkout.razorpay.com/v1/checkout.js" async />
      <Navbar />

      {/* Steps bar */}
      <div className="bg-white border-b border-gray-100">
        <div className="max-w-4xl mx-auto px-4 py-3 flex items-center justify-center gap-2">
          {STEP_LABELS.map((label, i) => (
            <div key={label} className="flex items-center gap-2">
              <div className={`flex items-center gap-1.5 text-xs font-medium
                ${i <= stepIdx ? 'text-green-600' : 'text-gray-400'}`}>
                <span className={`w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold
                  ${i < stepIdx ? 'bg-green-500 text-white' : i === stepIdx ? 'bg-green-500 text-white' : 'bg-gray-100 text-gray-400'}`}>
                  {i < stepIdx ? '✓' : i + 1}
                </span>
                {label}
              </div>
              {i < STEP_LABELS.length - 1 && (
                <div className={`w-8 h-px ${i < stepIdx ? 'bg-green-400' : 'bg-gray-200'}`} />
              )}
            </div>
          ))}
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 py-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="md:col-span-2 space-y-4">

            {/* ── STEP 1: Address ── */}
            {step === 'address' && (
              <div className="bg-white border border-gray-100 rounded-xl p-5">
                <h2 className="font-semibold text-gray-900 mb-4">📍 Delivery address</h2>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs text-gray-500 font-medium block mb-1">First name *</label>
                    <input className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-green-500" defaultValue="Rahul" />
                  </div>
                  <div>
                    <label className="text-xs text-gray-500 font-medium block mb-1">Last name *</label>
                    <input className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-green-500" defaultValue="Sharma" />
                  </div>
                  <div className="col-span-2">
                    <label className="text-xs text-gray-500 font-medium block mb-1">Mobile *</label>
                    <input className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-green-500" defaultValue="9820012345" />
                  </div>
                  <div className="col-span-2">
                    <label className="text-xs text-gray-500 font-medium block mb-1">Flat / Building *</label>
                    <input className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-green-500" defaultValue="402, Sunrise Apt, Andheri East" />
                  </div>
                  <div className="col-span-2">
                    <label className="text-xs text-gray-500 font-medium block mb-1">Area / Landmark</label>
                    <input className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-green-500" defaultValue="Near WEH Metro, MIDC" />
                  </div>
                  <div>
                    <label className="text-xs text-gray-500 font-medium block mb-1">City *</label>
                    <input className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-green-500" defaultValue="Bhagalpur" />
                  </div>
                  <div>
                    <label className="text-xs text-gray-500 font-medium block mb-1">PIN code *</label>
                    <input className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-green-500" defaultValue="400093" />
                  </div>
                </div>

                <h3 className="font-medium text-gray-800 mt-5 mb-3">⏰ Delivery slot</h3>
                <div className="space-y-2">
                  {[
                    { id: 'express',  label: 'Express — within 2 hours', sub: 'Available today · ₹49',          icon: '⚡' },
                    { id: 'standard', label: 'Standard — tomorrow by 12 PM', sub: 'Free on orders above ₹299', icon: '📦' },
                  ].map(opt => (
                    <label key={opt.id} className="flex items-center gap-3 p-3 border border-gray-200 rounded-lg cursor-pointer hover:border-green-400 transition-colors has-[:checked]:border-green-500 has-[:checked]:bg-green-50">
                      <input type="radio" name="slot" value={opt.id} defaultChecked={opt.id === 'express'} className="accent-green-600" />
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
                  className="w-full mt-5 bg-green-600 hover:bg-green-700 text-white font-medium py-3 rounded-xl transition-colors"
                >
                  Continue →
                </button>
              </div>
            )}

            {/* ── STEP 2: Prescription ── */}
            {step === 'prescription' && (
              <div className="bg-white border border-gray-100 rounded-xl p-5">
                <h2 className="font-semibold text-gray-900 mb-3">📋 Upload prescription</h2>

                {/* Warning banner */}
                <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 mb-5 flex gap-2 text-sm text-amber-800">
                  ⚠️ <span>
                    <strong>{rxItems}</strong> require{MOCK_CART.filter(i=>i.rx).length > 1 ? '' : 's'} a valid doctor's
                    prescription under Indian pharmacy law (Drugs & Cosmetics Act).
                  </span>
                </div>

                {/* Upload zone */}
                {!rxFile ? (
                  <div>
                    {/* Hidden real file input */}
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept={ACCEPTED_EXTENSIONS}
                      onChange={handleFileInput}
                      className="hidden"
                      id="rx-file-input"
                    />

                    {/* Drag-and-drop zone */}
                    <div
                      onDragOver={e => { e.preventDefault(); setDragging(true) }}
                      onDragLeave={() => setDragging(false)}
                      onDrop={handleDrop}
                      onClick={() => fileInputRef.current?.click()}
                      className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-all
                        ${dragging
                          ? 'border-green-500 bg-green-50'
                          : 'border-gray-200 hover:border-green-400 hover:bg-gray-50'
                        }`}
                    >
                      <div className="text-4xl mb-3">{dragging ? '📂' : '📤'}</div>
                      <div className="font-medium text-gray-800 mb-1">
                        {dragging ? 'Drop file here' : 'Click to browse or drag & drop'}
                      </div>
                      <div className="text-xs text-gray-400 mb-3">
                        Accepted formats: <strong>JPG, PNG, PDF, DOC, DOCX</strong>
                      </div>
                      <div className="text-xs text-gray-400">Maximum size: 5 MB</div>
                    </div>

                    {/* Format pills */}
                    <div className="flex gap-2 mt-3 flex-wrap">
                      {['📷 JPG / PNG', '📄 PDF', '📝 Word (.docx)'].map(f => (
                        <span key={f} className="text-xs bg-gray-100 text-gray-500 px-3 py-1 rounded-full">{f}</span>
                      ))}
                    </div>

                    {/* Or click button as alternative */}
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="mt-3 w-full border border-green-500 text-green-600 hover:bg-green-50 text-sm font-medium py-2.5 rounded-xl transition-colors"
                    >
                      📁 Choose file from device
                    </button>
                  </div>
                ) : (
                  /* File successfully selected */
                  <div className="border-2 border-green-400 bg-green-50 rounded-xl p-4">
                    <div className="flex items-center gap-3">
                      <span className="text-3xl">{fileIcon(rxFile)}</span>
                      <div className="flex-1 min-w-0">
                        <div className="font-medium text-green-800 text-sm truncate">{rxFile.name}</div>
                        <div className="text-xs text-green-600 mt-0.5">{formatSize(rxFile.size)} · Ready to upload</div>
                      </div>
                      <button
                        onClick={removeFile}
                        className="text-gray-400 hover:text-red-500 transition-colors ml-auto flex-shrink-0 text-lg leading-none"
                        title="Remove file"
                      >
                        ✕
                      </button>
                    </div>
                    <div className="mt-2 text-xs text-green-600 flex items-center gap-1">
                      ✅ File selected — will be sent to our pharmacist for verification
                    </div>
                    {/* Option to change file */}
                    <button
                      type="button"
                      onClick={() => { removeFile(); setTimeout(() => fileInputRef.current?.click(), 100) }}
                      className="mt-2 text-xs text-gray-400 hover:text-gray-600 underline"
                    >
                      Choose a different file
                    </button>
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept={ACCEPTED_EXTENSIONS}
                      onChange={handleFileInput}
                      className="hidden"
                    />
                  </div>
                )}

                {/* Error message */}
                {rxError && (
                  <div className="mt-3 bg-red-50 border border-red-200 rounded-lg px-3 py-2.5 text-sm text-red-600 flex gap-2">
                    ❌ {rxError}
                  </div>
                )}

                {/* Checklist */}
                <div className="mt-5 p-3 bg-gray-50 rounded-xl">
                  <div className="text-xs font-semibold text-gray-500 mb-2 uppercase tracking-wide">
                    Valid prescription must include
                  </div>
                  {[
                    "Doctor's name, registration number & signature",
                    "Patient's name & date of issue",
                    "Medicine name, dosage & duration",
                  ].map(r => (
                    <div key={r} className="flex gap-2 text-xs text-gray-500 mb-1">
                      <span className="text-green-500 flex-shrink-0">✓</span>{r}
                    </div>
                  ))}
                </div>

                {/* Patient details */}
                <h3 className="font-medium text-gray-800 mt-5 mb-3">👤 Patient details</h3>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs text-gray-500 font-medium block mb-1">Patient name *</label>
                    <input
                      className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-green-500"
                      placeholder="Full name"
                      value={patientName}
                      onChange={e => setPatientName(e.target.value)}
                    />
                  </div>
                  <div>
                    <label className="text-xs text-gray-500 font-medium block mb-1">Age *</label>
                    <input
                      className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-green-500"
                      placeholder="e.g. 34"
                      value={patientAge}
                      onChange={e => setPatientAge(e.target.value)}
                    />
                  </div>
                  <div className="col-span-2">
                    <label className="text-xs text-gray-500 font-medium block mb-1">Doctor's name</label>
                    <input
                      className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-green-500"
                      placeholder="Dr. ..."
                      value={doctorName}
                      onChange={e => setDoctorName(e.target.value)}
                    />
                  </div>
                </div>

                <button
                  onClick={() => rxFile && setStep('payment')}
                  disabled={!rxFile}
                  className="w-full mt-5 bg-green-600 hover:bg-green-700 disabled:opacity-40 disabled:cursor-not-allowed text-white font-medium py-3 rounded-xl transition-colors"
                >
                  {rxFile ? 'Continue to payment →' : '⬆ Upload a prescription to continue'}
                </button>
              </div>
            )}

            {/* ── STEP 3: Payment ── */}
            {step === 'payment' && (
              <div className="bg-white border border-gray-100 rounded-xl p-5">
                <h2 className="font-semibold text-gray-900 mb-4">💳 Payment method</h2>
                <div className="space-y-2 mb-5">
                  {[
                    { id: 'upi',  label: 'UPI', sub: 'GPay, PhonePe, Paytm, any UPI app', icon: '📱' },
                    { id: 'card', label: 'Credit / Debit card', sub: 'Visa, Mastercard, RuPay', icon: '💳' },
                    { id: 'nb',   label: 'Net banking', sub: 'All major Indian banks', icon: '🏦' },
                    { id: 'cod',  label: 'Cash on delivery', sub: 'Pay when you receive · +₹20', icon: '💵' },
                  ].map(opt => (
                    <label key={opt.id} className="flex items-center gap-3 p-3 border border-gray-200 rounded-lg cursor-pointer hover:border-green-400 transition-colors has-[:checked]:border-green-500 has-[:checked]:bg-green-50">
                      <input type="radio" name="pay" value={opt.id} checked={payMethod === opt.id} onChange={() => setPay(opt.id)} className="accent-green-600" />
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
                    <input className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-green-500" placeholder="yourname@upi" />
                  </div>
                )}
                {payMethod === 'card' && (
                  <div className="mb-4 space-y-3">
                    <div>
                      <label className="text-xs text-gray-500 font-medium block mb-1">Card number</label>
                      <input className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-green-500" placeholder="1234 5678 9012 3456" />
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="text-xs text-gray-500 font-medium block mb-1">Expiry (MM/YY)</label>
                        <input className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-green-500" placeholder="MM/YY" />
                      </div>
                      <div>
                        <label className="text-xs text-gray-500 font-medium block mb-1">CVV</label>
                        <input type="password" maxLength={3} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-green-500" placeholder="•••" />
                      </div>
                    </div>
                  </div>
                )}

                <button
                  onClick={handlePayment}
                  className="w-full bg-green-600 hover:bg-green-700 text-white font-semibold py-3 rounded-xl transition-colors flex items-center justify-center gap-2"
                >
                  🔒 Pay ₹{total} securely
                </button>
                <div className="text-center text-xs text-gray-400 mt-2">
                  Powered by <span className="font-bold bg-[#072654] text-white px-1.5 py-0.5 rounded text-[10px]">razorpay</span>
                </div>
              </div>
            )}

            {/* ── STEP 4: Success ── */}
            {step === 'success' && (
              <div className="bg-white border border-gray-100 rounded-xl p-8 text-center">
                <div className="w-16 h-16 bg-green-50 rounded-full flex items-center justify-center mx-auto mb-4 text-3xl">✅</div>
                <h2 className="text-xl font-semibold text-gray-900 mb-1">Order placed!</h2>
                <p className="text-gray-500 text-sm mb-3">Thank you for choosing Shree Surgico Pharmaceuticals</p>
                <div className="inline-block bg-gray-100 rounded-lg px-4 py-2 font-mono text-sm text-gray-600 mb-4">{orderId}</div>
                <p className="text-sm text-gray-700 mb-6">
                  Estimated delivery: <strong>Today by 6:30 PM</strong>
                </p>
                {rxFile && (
                  <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 mb-5 text-sm text-amber-700 text-left">
                    📋 Prescription <strong>{rxFile.name}</strong> has been submitted for pharmacist verification.
                    We'll confirm your Rx medicines once approved.
                  </div>
                )}
                <div className="text-left max-w-xs mx-auto space-y-3 mb-6">
                  {[
                    { label: 'Order confirmed',                    done: true,  time: 'Just now' },
                    { label: 'Pharmacist reviewing prescription',  done: !!rxFile, time: 'In progress' },
                    { label: 'Packing your order',                 done: false, time: 'Pending' },
                    { label: 'Out for delivery',                   done: false, time: 'Pending' },
                    { label: 'Delivered',                          done: false, time: 'Today by 6:30 PM' },
                  ].map((t, i) => (
                    <div key={i} className="flex gap-3 items-start">
                      <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs flex-shrink-0 mt-0.5 ${t.done ? 'bg-green-500 text-white' : 'bg-gray-100 text-gray-400'}`}>
                        {t.done ? '✓' : i + 1}
                      </span>
                      <div>
                        <div className="text-sm font-medium text-gray-800">{t.label}</div>
                        <div className="text-xs text-gray-400">{t.time}</div>
                      </div>
                    </div>
                  ))}
                </div>
                <a href="/" className="inline-block bg-green-600 hover:bg-green-700 text-white font-medium px-6 py-2.5 rounded-xl transition-colors">
                  Continue shopping
                </a>
              </div>
            )}
          </div>

          {/* Right — Order summary */}
          {step !== 'success' && (
            <div className="md:col-span-1">
              <OrderSummary />
            </div>
          )}
        </div>
      </div>
    </>
  )
}
