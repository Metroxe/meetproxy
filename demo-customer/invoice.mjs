// Biscuit Bakery's billing script: invoices today's deliveries through CorgiPay.
// Run: node demo-customer/invoice.mjs   (CORGIPAY_API defaults to the public demo)
const API = process.env.CORGIPAY_API ?? 'https://corgipay.boilerroom.tech'
const KEY = process.env.CORGIPAY_KEY ?? 'sk_test_demo_biscuit'

const deliveries = [
  {
    customer_name: 'Corgi Cafe',
    customer_email: 'orders@corgicafe.example',
    line_items: [
      { description: '18 butter croissants x $3.25', amount: 58.5 },
      { description: '2 dozen biscuits', amount: 36.0 },
    ],
  },
]

for (const d of deliveries) {
  const res = await fetch(`${API}/v1/invoices`, {
    method: 'POST',
    headers: { authorization: `Bearer ${KEY}`, 'content-type': 'application/json' },
    body: JSON.stringify({ ...d, currency: 'usd' }),
  })
  const body = await res.json()
  if (!res.ok) {
    console.error(`Invoice for ${d.customer_name} failed: HTTP ${res.status}`)
    console.error(JSON.stringify(body, null, 2))
    process.exitCode = 1
    continue
  }
  console.log(`Invoiced ${d.customer_name}: ${body.number} (${body.id}) total $${(body.total_cents / 100).toFixed(2)}`)
}
