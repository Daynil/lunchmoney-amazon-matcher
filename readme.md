## Limitations

- If an Amazon order was payed with multiple payment methods, or payed with a gift card, match will fail.
  - Gift cards are not linked to Lunchmoney, so unless they are manually entered, any transaction either solely or partly paid with a gift card will not match.
  - Amazon orders paid with multiple payment types (e.g. 2 different credit cards) will have separate transactions in Lunchmoney, so they will not match with Amazon order totals.
- 2 different Amazon orders with identical total paid amounts within the same transaction match threshold (30 day period by default) cannot be uniquely identified, so they will be skipped.
- If an Amazon order is using an Amazon credit card, paying for part or all of a transaction with credit card rewards points will cause the transaction not to match.
- If an Amazon order had a "coupon" applied, it will not match. Amazon's order export does not account for coupon discounts and only shows item totals, while the Lunchmoney transaction would show the amount after the coupon is applied.
- It is theoretically possible for a transaction to be mismatched if two transactions both payed with multiple payment methods and/or partly with reward points and the wrong one added up to the matching amount.
