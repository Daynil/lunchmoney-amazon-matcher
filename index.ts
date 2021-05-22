import cmdr from 'commander';
import fs from 'fs';
import { getLMAmazonTransactions } from './api';
import {
  enrichLMOrdersWithAmazonOrderDetails,
  parseAmazonOrderCSV
} from './script';
import { dateFormatter, logger } from './util';

/**
 * E.g. npm start -- match -s "2021-01-01" -e "2021-12-31"
 */
cmdr
  .command('match')
  .description(
    'Match Lunchmoney Amazon transactions to Amazon transaction detailed descriptions. If start and end dates are not passed, current month range is used.'
  )
  .option(
    '-s, --startDate <s>',
    'Specify Lunchmoney transaction start date (Format YYYY-MM-DD)'
  )
  .option(
    '-e, --endDate <e>',
    'Specify Lunchmoney transaction end date (Format YYYY-MM-DD)'
  )
  .action(
    async ({ startDate, endDate }: { startDate: string; endDate: string }) => {
      if (!startDate && endDate) {
        logger(
          'Pass in either no dates for current month transactions, start date only for through current date, or both start and end dates',
          'error'
        );
        return;
      } else if (startDate && !endDate) {
        endDate = dateFormatter(new Date(), 'native', 'lunchmoney') as string;
      } else if (!startDate || !endDate) {
        // Default to current month range
        const today = new Date();
        const firstDayOfMonth = new Date(
          today.getFullYear(),
          today.getMonth(),
          1
        );
        startDate = dateFormatter(
          firstDayOfMonth,
          'native',
          'lunchmoney'
        ) as string;
        endDate = dateFormatter(today, 'native', 'lunchmoney') as string;
      }
      if (!fs.existsSync('./order-csv/amazon_order_details.csv')) {
        logger(
          'Please place your Amazon order details csv in a local folder called order-csv and name it amazon_order_details.csv: ./order-csv/amazon_order_details.csv',
          'error'
        );
      } else {
        const parsedOrders = await parseAmazonOrderCSV(
          './order-csv/amazon_order_details.csv'
        );
        const lmTransactions = await getLMAmazonTransactions(
          startDate,
          endDate
        );
        const successfullyUpdated = await enrichLMOrdersWithAmazonOrderDetails(
          lmTransactions,
          parsedOrders
        );
        logger(
          `${successfullyUpdated} Lunchmoney transactions have been successfully updated!`
        );
      }
    }
  );

cmdr.command('*').action(() => {
  logger('Invalid command', 'error');
  cmdr.help();
});

cmdr.parse(process.argv);

if (!process.argv.slice(2).length) {
  logger('Please pass a command.', 'error');
  cmdr.help();
}
