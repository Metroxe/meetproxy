# Demo customer: Biscuit Bakery

Biscuit Bakery's own agent invoices the cafes it delivered to this morning, through CorgiPay.

- `PROMPT.md`: paste into Claude Code or ChatGPT. The agent reads `/docs`, creates the invoice, hits a
  500 on the $58.50 line (a real CorgiPay bug), follows `support.room_url` from the error body, and works
  with CorgiPay Support until the fix is deployed and the retry succeeds.
- `invoice.mjs`: the same request as a script (`node demo-customer/invoice.mjs`), for a quick repro.
