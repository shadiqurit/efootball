import express from 'express';
import { authenticate } from './auth.js';
import { installSecurity } from './middleware/security.js';
import { errorHandler } from './middleware/error-handler.js';
import { createAuthRoutes } from './routes/auth.js';
import { createPlayersRoutes } from './routes/players.js';
import { createAccountsRoutes } from './routes/accounts.js';
import { createAssignmentsRoutes } from './routes/assignments.js';
import { createAnalyticsRoutes } from './routes/analytics.js';
import { createPlayingStylesRoutes } from './routes/playing-styles.js';

export function createApp(db, transaction) {
  const app = express();
  installSecurity(app);

  app.use('/api', createAuthRoutes(db));
  app.use('/api', authenticate(db));
  app.use('/api', createPlayersRoutes(db));
  app.use('/api', createPlayingStylesRoutes(db));
  app.use('/api', createAccountsRoutes(db));
  app.use('/api', createAssignmentsRoutes(db, transaction));
  app.use('/api', createAnalyticsRoutes(db));

  app.use('/api', (req, res) => res.status(404).json({ message: 'API route not found.' }));
  app.get('/', (req, res) => res.json({ service: 'Touchline API', status: 'ok' }));
  app.get('/health', (req, res) => {
    res.set('Cache-Control', 'no-store');
    res.json({ service: 'Touchline API', status: 'ok' });
  });
  app.use((req, res) => res.status(404).json({ message: 'Route not found.' }));
  app.use(errorHandler);
  return app;
}
