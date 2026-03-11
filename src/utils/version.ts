// App build version — updated at build time via Vite define
export const APP_VERSION = typeof __APP_VERSION__ !== 'undefined'
  ? __APP_VERSION__
  : new Date().toLocaleDateString('en-GB', {
      day: 'numeric', month: 'long', year: 'numeric',
      hour: '2-digit', minute: '2-digit', hour12: false,
      timeZone: 'Australia/Sydney',
    }) + ' AEST';
