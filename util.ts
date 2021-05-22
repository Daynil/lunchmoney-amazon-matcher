import chalk from 'chalk';
import { differenceInDays, format, parse } from 'date-fns';
import { LM_API_MAX_NOTE_LENGTH } from './api';
import { AmazonOrder } from './script';

/**
 * string.replaceAll polyfill for node
 */
export function replaceAll(
  string: string,
  searchValue: string,
  replaceValue: string
) {
  return string.replace(
    new RegExp(escapeRegExp(searchValue), 'g'),
    replaceValue
  );
}

/**
 * When using regexp with string literals, escape special characters
 * https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide/Regular_Expressions#escaping
 */
function escapeRegExp(string: string) {
  return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); // $& means the whole matched string
}

function isErrorObj(error: Error | any): error is Error {
  return (error as Error).stack !== undefined;
}

export function logger(
  message: any,
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
      if (isErrorObj(message)) {
        console.error(chalk.red(message.stack));
      } else {
        console.error(chalk.red(message));
      }
      break;
    default:
      break;
  }
}

export function generateTransactionNote(
  amazonOrderItems: AmazonOrder[]
): string {
  let noteForTransaction = '';
  if (amazonOrderItems.length === 1) {
    const amazonItem = amazonOrderItems[0];
    noteForTransaction = `(${amazonItem.Category}) ${amazonItem.Title}`;
    if (noteForTransaction.length > LM_API_MAX_NOTE_LENGTH) {
      noteForTransaction =
        noteForTransaction.substring(0, LM_API_MAX_NOTE_LENGTH - 4) + '...';
    }
    return noteForTransaction;
  } else {
    // Minimal note contents needed for context - we won't try shortening these
    const orderNoteFixedString: string[] = [];
    // Index-matched order details, shorten when needed
    let orderNoteDetails: string[] = [];
    // Phase one - try using full titles
    for (let i = 0; i < amazonOrderItems.length; i++) {
      const amazonItem = amazonOrderItems[i];
      orderNoteFixedString.push(
        `Item ${i + 1}: $${amazonItem.Item_Total}: (${amazonItem.Category})`
      );
      orderNoteDetails.push(amazonItem.Title);
    }

    noteForTransaction = joinNoteFixedAndDetails(
      orderNoteFixedString,
      orderNoteDetails
    );
    if (noteForTransaction.length <= LM_API_MAX_NOTE_LENGTH)
      return noteForTransaction;

    // Phase two - if our minimum contextual note is still too long, truncate fixed only at max
    const minMeaningfulTruncatedDescriptorLength =
      orderNoteFixedString.join('; ').length +
      orderNoteFixedString.length * 'Descript...'.length;
    if (minMeaningfulTruncatedDescriptorLength > LM_API_MAX_NOTE_LENGTH) {
      noteForTransaction = orderNoteFixedString.join('; ');
      const ordersTruncatedMsg = ' (ADDT’L ORDERS TRUNCATED)...';
      return (
        noteForTransaction.substring(
          0,
          LM_API_MAX_NOTE_LENGTH - 1 - ordersTruncatedMsg.length - 1
        ) + ordersTruncatedMsg
      );
    }

    /*
      Phase 3
      Preserve maximum context by shortening longest descriptions first to 
        the length of the next longest.
      After all are equal length, shorten each by 1 char to spec.
    */
    do {
      const orderNoteDetailsByLength: {
        noteDetails: string;
        origIdx: number;
      }[] = orderNoteDetails
        .map((note, i) => ({
          noteDetails: note,
          origIdx: i
        }))
        .sort((a, b) => a.noteDetails.length - b.noteDetails.length);
      const longestNote =
        orderNoteDetailsByLength[orderNoteDetailsByLength.length - 1];
      let nextLongestNote = '';
      for (let i = orderNoteDetailsByLength.length - 2; i >= 0; i--) {
        const nextLongest = orderNoteDetailsByLength[i].noteDetails;
        if (nextLongest.length < longestNote.noteDetails.length) {
          nextLongestNote = nextLongest;
          break;
        }
      }

      if (nextLongestNote !== '') {
        orderNoteDetails[longestNote.origIdx] =
          orderNoteDetails[longestNote.origIdx].substring(
            0,
            nextLongestNote.length - 3
          ) + '...';
      } else {
        // If we haven't found a next longest note, all notes are now equal length
        // Strip 1 additional letter at a time
        orderNoteDetails = orderNoteDetails.map((note) => {
          if (note.substring(note.length - 3, note.length) === '...') {
            return note.substring(0, note.length - 4) + '...';
          } else return note.substring(0, note.length - 1) + '...';
        });
      }
      noteForTransaction = joinNoteFixedAndDetails(
        orderNoteFixedString,
        orderNoteDetails
      );
    } while (noteForTransaction.length > LM_API_MAX_NOTE_LENGTH);

    return noteForTransaction;
  }
}

function joinNoteFixedAndDetails(
  noteFixed: string[],
  noteDetails: string[]
): string {
  return noteFixed.map((note, i) => `${note}: ${noteDetails[i]}`).join('; ');
}

export function dateFormatter(
  date: string | Date,
  fromFormat: 'lunchmoney' | 'amazon' | 'native',
  toFormat: 'lunchmoney' | 'amazon' | 'native'
): string | Date {
  const lunchmoneyFormat = 'yyyy-MM-dd';
  const amazonFormat = 'MM/dd/yy';

  const fromFormatStr =
    fromFormat === 'lunchmoney' ? lunchmoneyFormat : amazonFormat;
  const toFormatStr =
    toFormat === 'lunchmoney' ? lunchmoneyFormat : amazonFormat;

  let parsed: Date;
  if (typeof date === 'string') {
    parsed = parse(date, fromFormatStr, new Date());
    if (toFormat === 'native') return parsed;
    return format(parsed, toFormatStr);
  } else {
    return format(date, toFormatStr);
  }
}

/**
 * Credit card transaction date is often days after initial order.
 * Check if the transaction is within a threshold of the order date.
 */
export function lmTransactionDateCloseToOrder(
  orderDate: string,
  lmTransactionDate: string,
  thresholdDays?: number
): boolean {
  if (!thresholdDays) thresholdDays = 30;
  const lmTransactionDateD = dateFormatter(
    lmTransactionDate,
    'lunchmoney',
    'native'
  ) as Date;
  const orderDateD = dateFormatter(orderDate, 'lunchmoney', 'native') as Date;
  return (
    Math.abs(differenceInDays(orderDateD, lmTransactionDateD)) <= thresholdDays
  );
}
