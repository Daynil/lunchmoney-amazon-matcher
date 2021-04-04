import * as dotenv from 'dotenv';
import fetch, { RequestInit } from 'node-fetch';
import { stringify } from 'query-string';
import { TestAmazonOrders } from './test-utils';

const baseUrl = 'https://dev.lunchmoney.app/v1';

dotenv.config();

export interface LunchmoneyTransaction {
  id: number;
  date: string;
  payee: string;
  amount: string;
  currency: string;
  notes: string;
  category_id: number;
  recurring_id: number;
  asset_id: number;
  plaid_account_id: number;
  status: string;
  is_group: boolean;
  group_id: number;
  parent_id: number;
  tags: {
    name: string;
    id: number;
  }[];
  external_id: null;
}

export interface LunchmoneyCategory {
  id: number;
  name: string;
  description: string;
  is_income: boolean;
  exclude_from_budget: boolean;
  exclude_from_totals: boolean;
  updated_at: string;
  created_at: string;
  is_group: boolean;
  group_id: number;
}

type Opts = {
  param?: any;
  queryParams?: any;
  body?: any;
};

async function client<T>(
  endpoint: string,
  method: 'GET' | 'PUT' | 'POST',
  options?: Opts
): Promise<T> {
  if (!options) options = {};
  const { param, queryParams, body } = options;
  let url = `${baseUrl}/${endpoint}`;
  if (param) url += `/${param}`;
  if (queryParams) url += `?${stringify(queryParams)}`;

  let config: RequestInit = {
    method,
    headers: {
      Authorization: `Bearer ${process.env.LUNCHMONEY_ACCESS_TOKEN}`
    }
  };

  if (body) {
    config.headers['Content-Type'] = 'application/json';
    config.body = JSON.stringify(body);
  }

  const response = await fetch(url, config);
  if (response.ok) return (await response.json()) as T;
  else {
    const errorMessage = await response.text();
    return Promise.reject(new Error(errorMessage));
  }
}

export async function getAmazonTransactions(): Promise<
  LunchmoneyTransaction[]
> {
  return await client<LunchmoneyTransaction[]>('transactions', 'GET', {
    queryParams: {
      tag_id: process.env.AMAZON_TAG_ID
    }
  });
}

/**
 * Create some transactions excluded from totals/budget for testing
 */
export async function insertTestAmazonTransactions(): Promise<
  LunchmoneyTransaction[]
> {
  const testCategoryId = await getTestCategoryId();
  const forInsertion = TestAmazonOrders.map((order) => ({
    date: order['Order Date'],
    amount: order['Item Total'],
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
    console.error('Test transaction insertion error', e);
  }
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
