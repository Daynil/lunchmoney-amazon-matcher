import {
  AmazonOrder,
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
      'Amazon orders CSV missing expected headers: Title,Item_Subtotal'
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
      Order_Date: '2021-03-21',
      Order_ID: '123-9999001-0111004',
      Order_Total: 9.99,
      OrderItems: [
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
        }
      ]
    },
    {
      Order_Date: '2021-03-21',
      Order_ID: '123-9999001-0111005',
      Order_Total: 12.99,
      OrderItems: [
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
        }
      ]
    },
    {
      Order_Date: '2021-03-22',
      Order_ID: '123-9999001-0111006',
      Order_Total: 31.98,
      OrderItems: [
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
      ]
    }
  ]);
});

test('Transaction notes are generated and truncated when needed', () => {
  const orderItemBase: Omit<AmazonOrder, 'Title' | 'Category'> = {
    Order_Date: '2021-03-21',
    Order_ID: '123-9999001-0111004',
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
  };
  let singleAmazonOrderNote: AmazonOrder[] = [
    {
      ...orderItemBase,
      Title:
        'Sayfine Vegetable Steamer Basket, Premium Stainless Steel Veggie Steamer Basket - Folding Expandable Steamers to Fits Various Size Pot (6" to 10.5")',
      Category: 'COOKWARE'
    }
  ];
  expect(generateTransactionNote(singleAmazonOrderNote)).toEqual(
    '(COOKWARE) Sayfine Vegetable Steamer Basket, Premium Stainless Steel Veggie Steamer Basket - Folding Expandable Steamers to Fits Various Size Pot (6" to 10.5")'
  );
  const superLongNoteAddon =
    ' Premium Long Name Item of Goodness That Would Probably Never Be This Long But Hey This Is A Test And We Need it To Be Really Long, Wow 350 Characters Is A Lot Longer Than I had an Idea Of In My Head But We Finally Made It!';
  singleAmazonOrderNote[0].Title += superLongNoteAddon;

  expect(generateTransactionNote(singleAmazonOrderNote)).toEqual(
    '(COOKWARE) Sayfine Vegetable Steamer Basket, Premium Stainless Steel Veggie Steamer Basket - Folding Expandable Steamers to Fits Various Size Pot (6" to 10.5") Premium Long Name Item of Goodness That Would Probably Never Be This Long But Hey This Is A Test And We Need it To Be Really Long, Wow 350 Characters Is A Lot Longer Than I had an Idea O...'
  );

  const noShorteningMultiOrder: AmazonOrder[] = [
    {
      ...orderItemBase,
      Title:
        'Sayfine Vegetable Steamer Basket, Premium Stainless Steel Veggie Steamer Basket - Folding Expandable Steamers to Fits Various Size Pot (6" to 10.5")',
      Category: 'COOKWARE'
    },
    {
      ...orderItemBase,
      Title:
        'FURTALK Sun Visor Hats for Women Wide Brim Straw Roll Up Ponytail Summer Beach Hat UV UPF 50 Packable Foldable Travel',
      Category: 'HAT',
      Item_Total: 15.99
    }
  ];

  expect(generateTransactionNote(noShorteningMultiOrder)).toEqual(
    `Item 1: $${noShorteningMultiOrder[0].Item_Total}: (${noShorteningMultiOrder[0].Category}): ${noShorteningMultiOrder[0].Title}; ` +
      `Item 2: $${noShorteningMultiOrder[1].Item_Total}: (${noShorteningMultiOrder[1].Category}): ${noShorteningMultiOrder[1].Title}`
  );

  const shortenOne = [
    ...noShorteningMultiOrder,
    {
      ...orderItemBase,
      Title: 'This is a short object description',
      Category: 'OBJECT',
      Item_Total: 58.26
    }
  ];

  expect(generateTransactionNote(shortenOne)).toEqual(
    `Item 1: $${shortenOne[0].Item_Total}: (${shortenOne[0].Category}): Sayfine Vegetable Steamer Basket, Premium Stainless Steel Veggie Steamer Basket - Folding Expandable Steamers to F...; ` +
      `Item 2: $${shortenOne[1].Item_Total}: (${shortenOne[1].Category}): FURTALK Sun Visor Hats for Women Wide Brim Straw Roll Up Ponytail Summer Beach Hat UV UPF 50 Packable Foldable Travel; ` +
      `Item 3: $${shortenOne[2].Item_Total}: (${shortenOne[2].Category}): This is a short object description`
  );

  const shortenAll = [
    ...noShorteningMultiOrder,
    {
      ...orderItemBase,
      Title: `Sayfine Vegetable Steamer Basket, Premium Stainless Steel Veggie Steamer Basket - Folding Expandable Steamers to Fits Various Size Pot (6" to 10.5")`,
      Category: 'COOKWARE',
      Item_Total: 9.98
    }
  ];

  expect(generateTransactionNote(shortenAll)).toEqual(
    `Item 1: $${shortenAll[0].Item_Total}: (${shortenAll[0].Category}): Sayfine Vegetable Steamer Basket, Premium Stainless Steel Veggie Steamer Basket - Fold...; ` +
      `Item 2: $${shortenAll[1].Item_Total}: (${shortenAll[1].Category}): FURTALK Sun Visor Hats for Women Wide Brim Straw Roll Up Ponytail Summer Beach Hat UV ...; ` +
      `Item 3: $${shortenAll[2].Item_Total}: (${shortenAll[2].Category}): Sayfine Vegetable Steamer Basket, Premium Stainless Steel Veggie Steamer Basket - Fold...`
  );

  const truncate = [
    ...shortenOne,
    ...shortenOne,
    ...shortenOne,
    ...shortenOne,
    ...shortenOne,
    ...shortenOne,
    ...shortenOne,
    ...shortenOne,
    ...shortenOne
  ];

  expect(generateTransactionNote(truncate)).toEqual(
    `Item 1: $9.99: (COOKWARE); Item 2: $15.99: (HAT); Item 3: $58.26: (OBJECT); Item 4: $9.99: (COOKWARE); Item 5: $15.99: (HAT); Item 6: $58.26: (OBJECT); Item 7: $9.99: (COOKWARE); Item 8: $15.99: (HAT); Item 9: $58.26: (OBJECT); Item 10: $9.99: (COOKWARE); Item 11: $15.99: (HAT); Item 12: $58.26: (OBJECT); Item 13: $9. (ADDT’L ORDERS TRUNCATED)...`
  );
});

// Integration tests start here
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
      date: order.Order_Date,
      amount: order.Order_Total,
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
        Order_Date: '2021-03-21',
        Order_ID: '123-9999001-0111004',
        Order_Total: 9.99,
        OrderItems: [
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
        Order_Date: '2021-03-21',
        Order_ID: '123-9999001-0111005',
        Order_Total: 12.99,
        OrderItems: [
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
        Order_Date: '2021-03-22',
        Order_ID: '123-9999001-0111006',
        Order_Total: 31.98,
        OrderItems: [
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
