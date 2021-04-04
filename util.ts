import chalk from 'chalk';
import { LM_API_MAX_NOTE_LENGTH } from './api';
import { GroupedAmazonOrder } from './script';

export function logger(
  message: string,
  level: 'info' | 'default' | 'warn' | 'error' = 'default'
) {
  switch (level) {
    case 'info':
      console.info(chalk.cyan(message));
      break;
    case 'default':
      console.log(message);
      break;
    case 'warn':
      console.warn(chalk.yellow(message));
      break;
    case 'error':
      console.error(chalk.red(message));
      break;
    default:
      break;
  }
}

export function generateTransactionNote(
  amazonGroupedOrder: GroupedAmazonOrder
): string {
  let noteForTransaction = '';
  if (amazonGroupedOrder.OrderItems.length === 1) {
    const amazonItem = amazonGroupedOrder.OrderItems[0];
    noteForTransaction = `(${amazonItem.Category}) ${amazonItem.Title}`;
    if (noteForTransaction.length > LM_API_MAX_NOTE_LENGTH) {
      noteForTransaction =
        noteForTransaction.substring(0, LM_API_MAX_NOTE_LENGTH - 4) + '...';
    }
    return noteForTransaction;
  } else {
    // Minimal note contents - we won't try shortening these
    const orderNoteFixedString: string[] = [];
    // Index-matched order details, shorten when needed
    const orderNoteDetails: string[] = [];
    // Phase one - try using full titles
    for (let i = 0; i < amazonGroupedOrder.OrderItems.length; i++) {
      const amazonItem = amazonGroupedOrder.OrderItems[i];
      orderNoteFixedString.push(
        `Item ${i + 1}: $${amazonItem['Item Total']}: (${amazonItem.Category})`
      );
      orderNoteDetails.push(amazonItem.Title);
    }
    // Phase two - if our minimum note is still too long, truncate orders at max
    if (orderNoteFixedString.join('; ').length > LM_API_MAX_NOTE_LENGTH) {
      noteForTransaction = orderNoteFixedString.join('; ');
      const ordersTruncatedMsg = ' (ADDT’L ORDERS TRUNCATED)...';
      return (
        noteForTransaction.substring(
          0,
          LM_API_MAX_NOTE_LENGTH - 1 - ordersTruncatedMsg.length - 1
        ) + ordersTruncatedMsg
      );
    }
    // TODO: Where shall we go from here?
    // Phase three - shorten the longest title to the length of the second-longest
    if (orderNoteFixedString.join().length > LM_API_MAX_NOTE_LENGTH) {
    }
  }

  return noteForTransaction;
}
