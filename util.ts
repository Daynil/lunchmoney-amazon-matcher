import chalk from 'chalk';

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
