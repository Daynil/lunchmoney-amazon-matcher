import fs from 'fs';
import {
  client,
  LunchmoneyCategory,
  LunchmoneyTransaction,
  updateLMTransaction
} from './api';
import { AmazonOrder, groupAmazonOrders } from './script';
import { logger } from './util';

export const TestAmazonOrders: AmazonOrder[] = [
  {
    Order_Date: '2021-03-21',
    Order_ID: '123-9999001-0111004',
    Title:
      'Sayfine Vegetable Steamer Basket, Premium Stainless Steel Veggie Steamer Basket - Folding Expandable Steamers to Fits Various Size Pot (6" to 10.5")',
    Category: 'COOKWARE',
    Condition: 'new',
    Seller: 'SAYFINE',
    Purchase_Price_Per_Unit: 9.99,
    Quantity: 1,
    Payment_Instrument_Type: 'Visa - 1234',
    Purchase_Order_Number: '',
    PO_Line_Number: '',
    Ordering_Customer_Email: 'test@gmail.com',
    Item_Subtotal: 9.99,
    Item_Subtotal_Tax: 0,
    Item_Total: 9.99,
    Buyer_Name: 'Test Person',
    Currency: 'USD'
  },
  {
    Order_Date: '2021-03-21',
    Order_ID: '123-9999001-0111005',
    Title:
      "Anthony's Organic Inulin Powder, 1 lb, Gluten Free, Non GMO, Made from Jerusalem Artichokes",
    Category: 'GROCERY',
    Condition: 'new',
    Seller: "Anthony's Goods",
    Purchase_Price_Per_Unit: 12.99,
    Quantity: 1,
    Payment_Instrument_Type: 'Visa - 1234',
    Purchase_Order_Number: '',
    PO_Line_Number: '',
    Ordering_Customer_Email: 'test@gmail.com',
    Item_Subtotal: 12.99,
    Item_Subtotal_Tax: 0,
    Item_Total: 12.99,
    Buyer_Name: 'Test Person',
    Currency: 'USD'
  },
  {
    Order_Date: '2021-03-22',
    Order_ID: '123-9999001-0111006',
    Title:
      'FURTALK Sun Visor Hats for Women Wide Brim Straw Roll Up Ponytail Summer Beach Hat UV UPF 50 Packable Foldable Travel',
    Category: 'HAT',
    Condition: 'new',
    Seller: 'Fammison',
    Purchase_Price_Per_Unit: 15.99,
    Quantity: 1,
    Payment_Instrument_Type: 'Visa - 1234',
    Purchase_Order_Number: '',
    PO_Line_Number: '',
    Ordering_Customer_Email: 'test@gmail.com',
    Item_Subtotal: 15.99,
    Item_Subtotal_Tax: 0,
    Item_Total: 15.99,
    Buyer_Name: 'Test Person',
    Currency: 'USD'
  },
  {
    Order_Date: '2021-03-22',
    Order_ID: '123-9999001-0111006',
    Title:
      'FURTALK Sun Visor Hats for Women Wide Brim Straw Roll Up Ponytail Summer Beach Hat UV UPF 50 Packable Foldable Travel',
    Category: 'HAT',
    Condition: 'new',
    Seller: 'Fammison',
    Purchase_Price_Per_Unit: 15.99,
    Quantity: 1,
    Payment_Instrument_Type: 'Visa - 1234',
    Purchase_Order_Number: '',
    PO_Line_Number: '',
    Ordering_Customer_Email: 'test@gmail.com',
    Item_Subtotal: 15.99,
    Item_Subtotal_Tax: 0,
    Item_Total: 15.99,
    Buyer_Name: 'Test Person',
    Currency: 'USD'
  }
];

/**
 * Create some transactions excluded from totals/budget for testing
 */
export async function insertTestAmazonTransactions(): Promise<
  LunchmoneyTransaction[]
> {
  const testCategoryId = await getTestCategoryId();
  const groupedAmazonOrders = groupAmazonOrders(TestAmazonOrders);
  const forInsertion = groupedAmazonOrders.map((order) => ({
    date: order.Order_Date,
    amount: order.Order_Total,
    payee: 'Amazon',
    category_id: testCategoryId
  }));
  try {
    await client<{ ids: number[] }>('transactions', 'POST', {
      body: {
        transactions: forInsertion
      }
    });
  } catch (e) {
    logger(e, 'error');
  }
  return await getAllTestTransactions(testCategoryId);
}

export async function getAllTestTransactions(
  testCategoryId: number
): Promise<LunchmoneyTransaction[]> {
  return (
    await client<{ transactions: LunchmoneyTransaction[] }>(
      'transactions',
      'GET',
      {
        queryParams: {
          category_id: testCategoryId,
          // Test transactions fall on these two dates
          start_date: '2021-03-21',
          end_date: '2021-03-22'
        }
      }
    )
  ).transactions;
}

/**
 * Test category makes for easier and more efficient retrieval
 * Also allows easy manual user deletion in interface if needed
 * Check if our test category exists, else create it
 */
export async function getTestCategoryId(): Promise<number> {
  const testCategoryName = 'LunchmoneyAmazonMatcherTest';
  const allCategories = (
    await client<{ categories: LunchmoneyCategory[] }>('categories', 'GET')
  ).categories;
  const testCategory = allCategories.find(
    (category) => category.name === testCategoryName
  );
  if (testCategory) return testCategory.id;
  else {
    return (
      await client<{ category_id: number }>('categories', 'POST', {
        body: {
          name: testCategoryName,
          description: 'Category for Lunchmoney Amazon Matcher testing',
          exclude_from_budget: true,
          exclude_from_totals: true
        }
      })
    ).category_id;
  }
}

/**
 * Get real Lunchmoney transactions for testing
 * On first run, insert test transactions and cache result
 * On subsequent tests, use cached transactions
 * @param forceLiveRefresh If we already have a cache but want a live call
 */
export async function getTestTransactions(
  forceLiveRefresh: boolean = false
): Promise<LunchmoneyTransaction[]> {
  let testTransactions: LunchmoneyTransaction[];
  if (fs.existsSync('./testTransactions.json')) {
    testTransactions = JSON.parse(
      // @ts-ignore
      fs.readFileSync('./testTransactions.json')
    );
    if (!forceLiveRefresh) {
      logger('Test transactions loaded from cache.', 'info');
    } else {
      testTransactions = await getAllTestTransactions(
        testTransactions[0].category_id
      );
      logger('Test transactions loaded from Lunchmoney.', 'info');
    }
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

/**
 * After E2E test, Amazon test transactions have notes added
 * Remove these for future test runs
 */
export async function resetTestTransactions() {
  const testTransactions = await getTestTransactions();
  for await (const testTransaction of testTransactions) {
    await updateLMTransaction({
      ...testTransaction,
      notes: ''
    });
  }
}
