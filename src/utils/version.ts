// App build version — updated at build time via Vite define
export const APP_VERSION = typeof __APP_VERSION__ !== 'undefined'
  ? __APP_VERSION__
  : new Date().toISOString().slice(0, 16).replace('T', ' ');
