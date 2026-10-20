// Passenger/cPanel can use a CommonJS startup file while the app remains ESM.
import('./src/index.js').catch((error) => {
  console.error('Touchline could not start:', error.code || error.message);
  process.exit(1);
});
