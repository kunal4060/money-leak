# THE MONEY LEAK — EDA Report

Generated from synthetic DATATHON CSVs at `/home/hatch/workspace/user/files`.

## Row counts

- transactions.csv: 18,000 rows
- customers.csv: 3,000 rows
- products.csv: 250 rows
- inventory.csv: 5,000 rows
- campaigns.csv: 1,200 rows

## Nulls / duplicates

- No null values in ANY file (all columns 0 missing).
- No duplicate rows in any file (transaction_id unique: True).

## Distinct values

- transactions.status: {'Completed': 13962, 'Cancelled': 1689, 'Returned': 1431, 'Pending': 918}
- transactions.channel: ['App', 'Store', 'Web']
- transactions.payment_method: ['Card', 'Cash', 'NetBanking', 'UPI', 'Wallet']
- customers.region: ['Central', 'East', 'North', 'South', 'West']
- customers.customer_segment: ['At-risk', 'Loyal', 'New', 'Returning']
- products.category: ['Beauty', 'Electronics', 'Fashion', 'Grocery', 'Home', 'Sports']
- campaigns.channel: ['App', 'Email', 'Social', 'Store', 'Web']; campaigns.category: ['Beauty', 'Electronics', 'Fashion', 'Grocery', 'Home', 'Sports']

## Date ranges

- transactions.timestamp: 2025-01-01 00:11:00 → 2025-12-31 23:53:00
- customers.signup_date: 2023-01-01 → 2025-06-18
- inventory.date: 2025-01-01 → 2025-12-31 (365 distinct days)
- campaigns.date: 2025-01-01 → 2025-12-31 (350 distinct days)

## Join integrity

- transactions.customer_id not in customers: 0 (0 = clean)
- transactions.product_id not in products: 0 (0 = clean)
- inventory.product_id not in products: 0 (0 = clean)
- Customers with transactions: 2987 of 3000 (13 signed up but never ordered)

## Margin sanity check (Completed transactions only, n=13,962)

- Negative-margin rows: 5,315 = **38.07%** of completed transactions
- Margin pct: min -3561.1%, median 24.3%, max 98.9%
- Margins >100%: 0 (none)
- Rows with unit_price < unit_cost: 34.1%
- Products with unit_cost > list_price: 76 of 250

## Range checks

- quantity: 1–5; unit_price: $6.28–$399.42
- discount_pct: 0%–25% (max unit_price 399.42 == max list_price 399.42: discounts applied against list price)
- inventory.stock_on_hand: 0–299; stockout_flag=1 on 760 of 5,000 records
- supplier_delay_days: 0–19, mean 9.6 vs mean supplier_lead_days 14.2

## ⚠️ Data-quality red flags

1. **Negative margins are the dominant signal (38.07% of completed transactions).** This matches the README warning: costs and prices were generated independently — 76/250 products have unit_cost > list_price, so deep negative margins (down to −35.6× revenue... i.e. −3,561%) are a *generator artifact*, not necessarily real business behavior. The pipeline treats them as 'leaks' per the dashboard brief, but any recommendation must be caveated.
2. `Pending` status (918 rows, 5.1%) has no outcome — excluded from margin, classifier training, and return-rate math; kept in counts/KPIs only.
3. Campaign channels include Email and Social, which do not exist in transaction channels (App/Web/Store) — cross-attribution for those channels is approximate.
4. Inventory has 5,000 records / 250 products / 365 days (~20 records per product): sparse time series, not daily coverage per product. Stockout-risk uses latest record + last-30-day history per product.
5. **Cancel/return classifier found no predictive signal.** Bad-rate is ~18% across ALL feature slices (channel, payment method, category, discount, quantity): statuses appear randomly assigned relative to the available features (another generator artifact). XGBoost reaches AUC ≈ 0.49, recall ≈ 0.0 at the default threshold — the risk.json scores therefore measure almost nothing and must NOT drive real decisions; they are included only to satisfy the dashboard schema.
6. Leak flags are statistically real outliers of the data (|z|>2.5 within category), but because the generator randomly assigns statuses/costs, most flags are clumps of synthetic noise rather than actionable business drivers. The EDA finding stands: treat dashboard recommendations as illustrative, not prescriptive.

## Assumptions

- revenue = quantity × unit_price × (1 − discount_pct); margin = revenue − quantity × unit_cost (Completed only).
- lost_revenue = revenue of Cancelled + Returned transactions (Pending excluded).
- cancel_return_rate = (Cancelled + Returned) / total transactions.
- Return rate in leak detection = Returned / (Completed + Returned).
- Classifier 'prior' features (prior order count / prior return rate) are computed strictly from transactions *before* each transaction's timestamp — no future leakage.
- Campaign ROAS proxy: attributed_revenue ≈ conversions × avg completed-order value of that channel/category (no true attribution key exists).
- All monetary values in USD. Floats rounded to 2 decimals in JSON artifacts.
