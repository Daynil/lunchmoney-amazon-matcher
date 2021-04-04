import fs from 'fs';
import { insertTestAmazonTransactions, LunchmoneyTransaction } from './api';
import { AmazonOrder } from './script';
import { logger } from './util';

export const TestAmazonOrders: AmazonOrder[] = [
  {
    'Order Date': '2021-03-21',
    'Order ID': '123-9999001-0111004',
    Title:
      'Sayfine Vegetable Steamer Basket, Premium Stainless Steel Veggie Steamer Basket - Folding Expandable Steamers to Fits Various Size Pot (6" to 10.5")',
    Category: 'COOKWARE',
    Condition: 'new',
    Seller: 'SAYFINE',
    'Purchase Price Per Unit': 9.99,
    Quantity: 1,
    'Payment Instrument Type': 'Visa - 1234',
    'Purchase Order Number': '',
    'PO Line Number': '',
    'Ordering Customer Email': 'test@gmail.com',
    'Item Subtotal': 9.99,
    'Item Subtotal Tax': 0,
    'Item Total': 9.99,
    'Buyer Name': 'Test Person',
    Currency: 'USD'
  },
  {
    'Order Date': '2021-03-21',
    'Order ID': '123-9999001-0111005',
    Title:
      "Anthony's Organic Inulin Powder, 1 lb, Gluten Free, Non GMO, Made from Jerusalem Artichokes",
    Category: 'GROCERY',
    Condition: 'new',
    Seller: "Anthony's Goods",
    'Purchase Price Per Unit': 12.99,
    Quantity: 1,
    'Payment Instrument Type': 'Visa - 1234',
    'Purchase Order Number': '',
    'PO Line Number': '',
    'Ordering Customer Email': 'test@gmail.com',
    'Item Subtotal': 12.99,
    'Item Subtotal Tax': 0,
    'Item Total': 12.99,
    'Buyer Name': 'Test Person',
    Currency: 'USD'
  },
  {
    'Order Date': '2021-03-22',
    'Order ID': '123-9999001-0111006',
    Title:
      'FURTALK Sun Visor Hats for Women Wide Brim Straw Roll Up Ponytail Summer Beach Hat UV UPF 50 Packable Foldable Travel',
    Category: 'HAT',
    Condition: 'new',
    Seller: 'Fammison',
    'Purchase Price Per Unit': 15.99,
    Quantity: 1,
    'Payment Instrument Type': 'Visa - 1234',
    'Purchase Order Number': '',
    'PO Line Number': '',
    'Ordering Customer Email': 'test@gmail.com',
    'Item Subtotal': 15.99,
    'Item Subtotal Tax': 0,
    'Item Total': 15.99,
    'Buyer Name': 'Test Person',
    Currency: 'USD'
  },
  {
    'Order Date': '2021-03-22',
    'Order ID': '123-9999001-0111006',
    Title:
      'FURTALK Sun Visor Hats for Women Wide Brim Straw Roll Up Ponytail Summer Beach Hat UV UPF 50 Packable Foldable Travel',
    Category: 'HAT',
    Condition: 'new',
    Seller: 'Fammison',
    'Purchase Price Per Unit': 15.99,
    Quantity: 1,
    'Payment Instrument Type': 'Visa - 1234',
    'Purchase Order Number': '',
    'PO Line Number': '',
    'Ordering Customer Email': 'test@gmail.com',
    'Item Subtotal': 15.99,
    'Item Subtotal Tax': 0,
    'Item Total': 15.99,
    'Buyer Name': 'Test Person',
    Currency: 'USD'
  }
];

/**
 * Get real Lunchmoney transactions for testing
 * On first run, insert test transactions and cache result
 * On subsequent tests, use cached transactions
 */
export async function getTestTransactions(): Promise<LunchmoneyTransaction[]> {
  let testTransactions: LunchmoneyTransaction[];
  if (fs.existsSync('./testTransactions.json')) {
    testTransactions = JSON.parse(
      // @ts-ignore
      fs.readFileSync('./testTransactions.json')
    );
    logger('Test transactions loaded from cache.', 'info');
  } else {
    testTransactions = await insertTestAmazonTransactions();
    fs.writeFileSync(
      './testTransactions.json',
      JSON.stringify(testTransactions)
    );
    logger('Test transactions inserted to and loaded from Lunchmoney.', 'info');
  }
  return testTransactions;
}
