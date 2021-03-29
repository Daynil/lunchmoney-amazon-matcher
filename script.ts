import csv from 'csv-parser';
import { format, parse } from 'date-fns';
import fs from 'fs';

export interface AmazonOrder {
  'Order Date': string;
  'Order ID': string;
  Title: string;
  Category: string;
  Condition: string;
  Seller: string;
  'Purchase Price Per Unit': number;
  Quantity: number;
  'Payment Instrument Type': string;
  'Purchase Order Number': string;
  'PO Line Number': string;
  'Ordering Customer Email': string;
  'Item Subtotal': number;
  'Item Subtotal Tax': number;
  'Item Total': number;
  'Buyer Name': string;
  Currency: string;
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
      .pipe(csv())
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
          mapHeaders: ({ header, index }) => {
            if (!expectedHeaders.includes(header)) return null;
            return header;
          },
          mapValues: ({ header, index, value }) => {
            if (header === 'Order Date') {
              const parsed = new Date(value);
              if (isNaN(parsed.getTime()))
                return reject(`Value ${value} cannot be parsed to date`);
              return dateFormatter(value, 'lunchmoney');
            }
            if (
              [
                'Purchase Price Per Unit',
                'Item Subtotal',
                'Item Subtotal Tax',
                'Item Total',
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

export async function start() {
  const parsed = await parseAmazonOrderCSV(
    // './order-csv/01-Jan-2021_to_27-Mar-2021.csv'
    './test-csv/test_orders.csv'
  );
  // console.log(parsed[parsed.length - 1]);
  console.log(parsed);
}
