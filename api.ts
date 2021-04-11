import * as dotenv from 'dotenv';
import fetch, { RequestInit } from 'node-fetch';
import { stringify } from 'query-string';
import { GroupedAmazonOrder } from './script';

const baseUrl = 'https://dev.lunchmoney.app/v1';
export const LM_API_MAX_NOTE_LENGTH = 350;

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

export interface MatchedLunchmoneyTransaction {
  lmTransaction: LunchmoneyTransaction;
  amazonGroupedOrder: GroupedAmazonOrder;
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

export async function client<T>(
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

// TODO: add start and end dates, with input from command line args
export async function getLMAmazonTransactions(): Promise<
  LunchmoneyTransaction[]
> {
  return await client<LunchmoneyTransaction[]>('transactions', 'GET', {
    queryParams: {
      tag_id: process.env.AMAZON_TAG_ID
    }
  });
}

export async function getLMTransaction(
  id: number
): Promise<LunchmoneyTransaction> {
  return await client<LunchmoneyTransaction>('transaction', 'GET', {
    param: id
  });
}

export async function updateLMTransaction(
  transaction: LunchmoneyTransaction
): Promise<LunchmoneyTransaction> {
  await client<{ updated: boolean }>('transactions', 'PUT', {
    param: transaction.id,
    body: {
      transaction
    }
  });
  return await getLMTransaction(transaction.id);
}
