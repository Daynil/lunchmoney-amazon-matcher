import { dateFormatter, parseAmazonOrderCSV } from './script';
import { getTestTransactions, TestAmazonOrders } from './test-utils';

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

test('gets test transactions', async () => {
  const testTransactions = await getTestTransactions();
  expect(
    testTransactions.map(({ date, amount, payee }) => ({
      date,
      payee,
      amount: parseFloat(amount)
    }))
  ).toEqual(
    TestAmazonOrders.map((order) => ({
      date: order['Order Date'],
      amount: order['Item Total'],
      payee: 'Amazon'
    }))
  );
});
