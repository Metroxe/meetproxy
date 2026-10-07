// Prints a clean, varied CorgiPay invoice list (Biscuit Bakery's wholesale customers) as JSON, with
// timestamps relative to now. reset-demo.sh writes it to /opt/corgipay/data/invoices.json before each take.
const H = 3_600_000, D = 24 * H
const rows = [
  ['Sunrise Coffee', 'orders@sunrisecoffee.example', 'paid', 6 * D, [['40 butter croissants', 130], ['3 dozen biscuits', 54]]],
  ['Paws & Pour', 'billing@pawsandpour.example', 'paid', 5 * D + 3 * H, [['Weekly pastry order', 212]]],
  ['The Loaf Lounge', 'ap@loaflounge.example', 'overdue', 4 * D + 5 * H, [['Sourdough loaves x 24', 168]]],
  ['Bean There Café', 'hello@beanthere.example', 'paid', 3 * D + 2 * H, [['60 cinnamon rolls', 195], ['2 dozen scones', 42]]],
  ['Muni Market Deli', 'accounts@munideli.example', 'sent', 2 * D + 6 * H, [['30 everything bagels', 45], ['Cream cheese tubs x 5', 27.5]]],
  ['Golden Gate Espresso', 'ops@ggespresso.example', 'paid', 2 * D + 1 * H, [['24 almond croissants', 84]]],
  ['Dogpatch Diner', 'kitchen@dogpatchdiner.example', 'sent', 1 * D + 4 * H, [['10 rye loaves', 65], ['4 dozen dinner rolls', 38]]],
  ['Mission Matcha', 'team@missionmatcha.example', 'sent', 20 * H, [['36 matcha shortbread', 63], ['12 yuzu tarts', 54]]],
  ['Sunrise Coffee', 'orders@sunrisecoffee.example', 'sent', 18 * H, [['Morning delivery: croissants, scones', 96]]],
]
const now = Date.now()
const out = rows.map(([name, email, status, ago, lines], i) => {
  const created = new Date(now - ago).toISOString()
  const items = lines.map(([description, dollars]) => ({ description, amount_cents: Math.round(dollars * 100) }))
  const subtotal = items.reduce((a, li) => a + li.amount_cents, 0)
  const fee = Math.floor((subtotal * 290 + 5000) / 10000) + 30
  return {
    id: `inv_${Date.parse(created).toString(36)}${Math.random().toString(36).slice(2, 6)}`,
    object: 'invoice', number: `CP-${1041 + i}`, customer_name: name, customer_email: email, currency: 'usd',
    line_items: items, subtotal_cents: subtotal, fee_cents: fee, total_cents: subtotal, net_cents: subtotal - fee,
    status, created, api_version: '2026-10-01',
  }
})
process.stdout.write(JSON.stringify(out, null, 2))
