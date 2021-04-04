import {
  dateFormatter,
  enrichLMOrdersWithAmazonOrderDetails,
  groupAmazonOrders,
  GroupedAmazonOrder,
  matchLunchmoneyToAmazon,
  parseAmazonOrderCSV
} from './script';
import { getTestTransactions, TestAmazonOrders } from './test-utils';
import { generateTransactionNote } from './util';

test('manages formatted dates', () => {
  const fromAmazon = '03/05/2021';
  const fromLunchmoney = '2021-03-05';
  expect(dateFormatter(fromAmazon, 'lunchmoney')).toEqual(fromLunchmoney);
  expect(dateFormatter(fromLunchmoney, 'amazon')).toEqual(fromAmazon);
});

test('missing headers throws properly', async () => {
  expect.assertions(1);
  try {
    await parseAmazonOrderCSV('./test-csv/test_file_missing_headers.csv');
  } catch (e) {
    expect(e).toMatch(
      'Amazon orders CSV missing expected headers: Title,Item Subtotal'
    );
  }
});

test('invalid numbers throw properly', async () => {
  expect.assertions(1);
  try {
    await parseAmazonOrderCSV('./test-csv/test_file_invalid_number.csv');
  } catch (e) {
    expect(e).toMatch('Value wrong cannot be parsed to number');
  }
});

test('invalid dates throw properly', async () => {
  expect.assertions(1);
  try {
    await parseAmazonOrderCSV('./test-csv/test_file_invalid_date.csv');
  } catch (e) {
    expect(e).toMatch('Value wrong cannot be parsed to date');
  }
});

test('parses correctly', async () => {
  const parsedOrders = await parseAmazonOrderCSV('./test-csv/test_orders.csv');
  expect(parsedOrders).toEqual(TestAmazonOrders);
});

test('Amazon orders are grouped by Order ID with totals', () => {
  const groupedOrders: GroupedAmazonOrder[] = groupAmazonOrders(
    TestAmazonOrders
  );
  expect(groupedOrders).toEqual([
    {
      'Order Date': '2021-03-21',
      'Order ID': '123-9999001-0111004',
      'Order Total': 9.99,
      OrderItems: [
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
        }
      ]
    },
    {
      'Order Date': '2021-03-21',
      'Order ID': '123-9999001-0111005',
      'Order Total': 12.99,
      OrderItems: [
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
        }
      ]
    },
    {
      'Order Date': '2021-03-22',
      'Order ID': '123-9999001-0111006',
      'Order Total': 31.98,
      OrderItems: [
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
      ]
    }
  ]);
});

test('gets test transactions', async () => {
  const testTransactions = await getTestTransactions();
  const groupedAmazonOrders = groupAmazonOrders(TestAmazonOrders);
  expect(
    testTransactions.map(({ date, amount, payee }) => ({
      date,
      payee,
      amount: parseFloat(amount)
    }))
  ).toEqual(
    groupedAmazonOrders.map((order) => ({
      date: order['Order Date'],
      amount: order['Order Total'],
      payee: 'Amazon'
    }))
  );
});

// TODO add test case for duplicate order date & amounts
// we won't be able to parse those properly, add text indicating order IDs saying we can't disambiguate - requires manual intervention
// Should be pretty rare...
test('correctly matches Amazon order details to Lunchmoney transactions', async () => {
  const testTransactions = await getTestTransactions();
  const matched = matchLunchmoneyToAmazon(testTransactions, TestAmazonOrders);
  expect(
    matched.map((match) => {
      const { date, amount, payee } = match.lmTransaction;
      return {
        lmTransaction: {
          date,
          amount,
          payee
        },
        amazonGroupedOrder: match.amazonGroupedOrder
      };
    })
  ).toEqual([
    {
      lmTransaction: {
        date: '2021-03-21',
        payee: 'Amazon',
        amount: '9.9900'
      },
      amazonGroupedOrder: {
        'Order Date': '2021-03-21',
        'Order ID': '123-9999001-0111004',
        'Order Total': 9.99,
        OrderItems: [
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
          }
        ]
      }
    },
    {
      lmTransaction: {
        date: '2021-03-21',
        payee: 'Amazon',
        amount: '12.9900'
      },
      amazonGroupedOrder: {
        'Order Date': '2021-03-21',
        'Order ID': '123-9999001-0111005',
        'Order Total': 12.99,
        OrderItems: [
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
          }
        ]
      }
    },
    {
      lmTransaction: {
        date: '2021-03-22',
        payee: 'Amazon',
        amount: '31.9800'
      },
      amazonGroupedOrder: {
        'Order Date': '2021-03-22',
        'Order ID': '123-9999001-0111006',
        'Order Total': 31.98,
        OrderItems: [
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
        ]
      }
    }
  ]);
});

test('Lunchmoney transactions are matched to Amazon orders and notes are enriched with order details', async () => {
  const testTransactions = await getTestTransactions();
  const enrichedLMTransactions = enrichLMOrdersWithAmazonOrderDetails(
    testTransactions,
    TestAmazonOrders
  );
  expect(
    enrichedLMTransactions.map(({ date, payee, amount, notes }) => ({
      date,
      payee,
      amount,
      notes
    }))
  ).toEqual([
    {
      date: '2021-03-21',
      payee: 'Amazon',
      amount: '9.9900',
      notes: ''
    },
    {
      date: '2021-03-21',
      payee: 'Amazon',
      amount: '12.9900',
      notes: ''
    },
    {
      date: '2021-03-22',
      payee: 'Amazon',
      amount: '31.9800',
      notes: ''
    }
  ]);
});

test('Transaction notes are generated and truncated when needed', () => {
  let singleAmazonOrderNote: GroupedAmazonOrder = {
    'Order Date': '2021-03-21',
    'Order ID': '123-9999001-0111004',
    'Order Total': 9.99,
    OrderItems: [
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
      }
    ]
  };
  expect(generateTransactionNote(singleAmazonOrderNote)).toEqual(
    '(COOKWARE) Sayfine Vegetable Steamer Basket, Premium Stainless Steel Veggie Steamer Basket - Folding Expandable Steamers to Fits Various Size Pot (6" to 10.5")'
  );
  singleAmazonOrderNote.OrderItems[0].Title +=
    ' Premium Long Name Item of Goodness That Would Probably Never Be This Long But Hey This Is A Test And We Need it To Be Really Long, Wow 350 Characters Is A Lot Longer Than I had an Idea Of In My Head But We Finally Made It!';
  expect(generateTransactionNote(singleAmazonOrderNote)).toEqual(
    '(COOKWARE) Sayfine Vegetable Steamer Basket, Premium Stainless Steel Veggie Steamer Basket - Folding Expandable Steamers to Fits Various Size Pot (6" to 10.5") Premium Long Name Item of Goodness That Would Probably Never Be This Long But Hey This Is A Test And We Need it To Be Really Long, Wow 350 Characters Is A Lot Longer Than I had an Idea O...'
  );
});
