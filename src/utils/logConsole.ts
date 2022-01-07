import { Page } from 'puppeteer-core';

/**
 * Log Console Events
 */
 export function logConsoleEvent(page: Page, logs: any[]) {
  page
    .on('console', message => logs.push(`${message.type().toUpperCase()}: ${message.text()}`))
    .on('pageerror', message => logs.push(`${message.type().toUpperCase()}: ${message.text()}`))
    .on('response', response =>
      logs.push(`${response.status()}: ${response.url()}`))
    .on('requestfailed', request =>
      logs.push(`${request.failure().errorText}: ${request.url()}`))
 }
