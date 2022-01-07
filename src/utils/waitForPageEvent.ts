import { Page } from 'puppeteer-core';

/**
 * Wait for the browser to fire an event (including custom events)
 * @param {string} eventName - Event name
 * @param {integer} timeout - number of ms to wait for timeout, default to 10 seconds
 * @returns {Promise} resolves when event fires or timeout is reached
 */
 export async function waitForPageEvent(page: Page, eventName: string, timeout: number) {
  // use race to implement a timeout
  return Promise.race([
      // add event listener and wait for event to fire before returning
      page.evaluate(function(eventName) {
          return new Promise(function(resolve, reject) {
              document.addEventListener(eventName, function(e) {
                  resolve(e?.detail); // resolves when the event fires
              });
          });
      }, eventName),

      // if the event does not fire within n seconds, exit
      page.waitForTimeout(timeout || 10000)
  ]);
}