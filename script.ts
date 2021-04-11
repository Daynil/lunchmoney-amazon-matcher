import csv from 'csv-parser';
import { format, parse } from 'date-fns';
import fs from 'fs';
import {
  LunchmoneyTransaction,
  MatchedLunchmoneyTransaction,
  updateLMTransaction
} from './api';
import { generateTransactionNote, logger, replaceAll } from './util';

export interface AmazonOrder {
  Order_Date: string;
  Order_ID: string;
  Title: string;
  Category: string;
  Condition: string;
  Seller: string;
  Purchase_Price_Per_Unit: number;
  Quantity: number;
  Payment_Instrument_Type: string;
  Purchase_Order_Number: string;
  PO_Line_Number: string;
  Ordering_Customer_Email: string;
  Item_Subtotal: number;
  Item_Subtotal_Tax: number;
  Item_Total: number;
  Buyer_Name: string;
  Currency: string;
}

export interface GroupedAmazonOrder {
  Order_Date: string;
  Order_ID: string;
  Order_Total: number;
  OrderItems: AmazonOrder[];
}

export function dateFormatter(
  dateString: string,
  toFormat: 'lunchmoney' | 'amazon'
): string {
  const lunchmoneyFormat = 'yyyy-MM-dd';
  const amazonFormat = 'MM/dd/yyyy';

  let parsed: Date;
  if (toFormat === 'lunchmoney') {
    parsed = parse(dateString, amazonFormat, new Date());
    return format(parsed, lunchmoneyFormat);
  } else {
    parsed = parse(dateString, lunchmoneyFormat, new Date());
    return format(parsed, amazonFormat);
  }
}

function getExpectedHeaders(): Promise<string[]> {
  return new Promise((resolve, reject) => {
    fs.createReadStream('./test-csv/expected_headers.csv')
      .pipe(
        csv({
          mapHeaders: ({ header }) => replaceAll(header, ' ', '_')
        })
      )
      .on('headers', (headers) => resolve(headers))
      .on('error', (e) => reject(e));
  });
}

export async function parseAmazonOrderCSV(
  csvPath: string
): Promise<AmazonOrder[]> {
  const expectedHeaders = await getExpectedHeaders();
  return new Promise((resolve, reject) => {
    const results: AmazonOrder[] = [];
    fs.createReadStream(csvPath)
      .pipe(
        csv({
          mapHeaders: ({ header }) => {
            const uscoreHeader = replaceAll(header, ' ', '_');
            if (!expectedHeaders.includes(uscoreHeader)) return null;
            return uscoreHeader;
          },
          mapValues: ({ header, index, value }) => {
            if (header === 'Order_Date') {
              const parsed = new Date(value);
              if (isNaN(parsed.getTime()))
                return reject(`Value ${value} cannot be parsed to date`);
              return dateFormatter(value, 'lunchmoney');
            }
            if (
              [
                'Purchase_Price_Per_Unit',
                'Item_Subtotal',
                'Item_Subtotal_Tax',
                'Item_Total',
                'Quantity'
              ].includes(header)
            ) {
              const strVal = value as string;
              // Check for stringy number with a dollar sign, strip sign before parsing
              const parsed =
                strVal.substr(0, 1) === '$' ? +strVal.substring(1) : +strVal;
              if (isNaN(parsed))
                return reject(`Value ${value} cannot be parsed to number`);
              return parsed;
            }
            return value;
          }
        })
      )
      .on('headers', (headers: string[]) => {
        const missingHeaders = [];
        for (const header of expectedHeaders) {
          if (!headers.includes(header)) missingHeaders.push(header);
        }
        if (missingHeaders.length)
          reject(
            `Amazon orders CSV missing expected headers: ${missingHeaders}`
          );
      })
      .on('data', (data: AmazonOrder) => {
        results.push(data);
      })
      .on('end', () => {
        resolve(results);
      })
      .on('error', (e) => reject(e));
  });
}

/**
 * In order to match Amazon orders with multiple items, we need to group them together.
 * Amazon purchase history returns one row per item, even if they were in the same transaction (order).
 * However, on credit card statements, and thus Lunchmoney, each order is lumped into 1 transactions, regardless of item count.
 * @param orders Original Amazon orders (1 row per item)
 */
export function groupAmazonOrders(orders: AmazonOrder[]): GroupedAmazonOrder[] {
  const groupedOrders: GroupedAmazonOrder[] = [];
  for (let i = 0; i < orders.length; i++) {
    const order = orders[i];
    const existingOrderGroup = groupedOrders.find(
      (d) => d.Order_ID === order.Order_ID
    );
    if (existingOrderGroup) {
      existingOrderGroup.OrderItems.push(order);
      existingOrderGroup.Order_Total += order.Item_Total;
    } else {
      groupedOrders.push({
        Order_Date: order.Order_Date,
        Order_ID: order.Order_ID,
        Order_Total: order.Item_Total,
        OrderItems: [order]
      });
    }
  }
  return groupedOrders;
}

export function matchLunchmoneyToAmazon(
  lmTransactions: LunchmoneyTransaction[],
  amazonOrders: AmazonOrder[]
): MatchedLunchmoneyTransaction[] {
  const groupedAmazonOrders = groupAmazonOrders(amazonOrders);
  const matched: MatchedLunchmoneyTransaction[] = [];
  for (let i = 0; i < lmTransactions.length; i++) {
    const lmTransaction = lmTransactions[i];
    const matchingAmazonGroupedOrders = groupedAmazonOrders.filter(
      (d) =>
        d.Order_Date === lmTransaction.date &&
        d.Order_Total === parseFloat(lmTransaction.amount)
    );
    // Gracefully skip missing matches, but warn for manual intervention
    if (matchingAmazonGroupedOrders.length === 0) {
      logger(
        `Could not match Lunchmoney transaction: ${lmTransaction.date} $${lmTransaction.amount} to an Amazon Order! Skipping...`,
        'warn'
      );
      // Gracefully skip multi-matched orders, requires manual disambiguation
    } else if (matchingAmazonGroupedOrders.length > 1) {
      logger(
        `Lunchmoney transaction: ${lmTransaction.date} $${lmTransaction.amount} matched multiple Amazon Orders! Skipping...`,
        'warn'
      );
    } else {
      matched.push({
        lmTransaction,
        amazonGroupedOrder: matchingAmazonGroupedOrders[0]
      });
    }
  }
  return matched;
}

export async function enrichLMOrdersWithAmazonOrderDetails(
  lmTransactions: LunchmoneyTransaction[],
  amazonOrders: AmazonOrder[]
) {
  const matched = matchLunchmoneyToAmazon(lmTransactions, amazonOrders);
  const enrichedLMTransactions = matched.map((matchedTransaction) => {
    const { amazonGroupedOrder, lmTransaction } = matchedTransaction;
    return {
      ...lmTransaction,
      notes: generateTransactionNote(amazonGroupedOrder.OrderItems)
    };
  });
  for await (const lmTransaction of enrichedLMTransactions) {
    try {
      await updateLMTransaction(lmTransaction);
    } catch (error) {
      logger(error, 'error');
    }
  }
}

export async function start() {
  // const parsed = await parseAmazonOrderCSV(
  //   // './order-csv/01-Jan-2021_to_27-Mar-2021.csv'
  //   './test-csv/test_orders.csv'
  // );
  // // console.log(parsed[parsed.length - 1]);
  // console.log(parsed);
  // await resetTestTransactions();
}
