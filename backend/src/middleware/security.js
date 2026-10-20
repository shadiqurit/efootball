import express from 'express';
import helmet from 'helmet';
import { rateLimit } from 'express-rate-limit';

export function installSecurity(app) {
  app.disable('x-powered-by');
  app.set('trust proxy', Number(process.env.TRUST_PROXY || 0));
  app.use(
    helmet({
      contentSecurityPolicy: {
        directives: {
          'script-src': ["'self'"],
          'style-src': ["'self'", "'unsafe-inline'"],
          'img-src': ["'self'", 'data:'],
          'upgrade-insecure-requests': process.env.NODE_ENV === 'production' ? [] : null,
        },
      },
    }),
  );
  app.use(
    '/api',
    rateLimit({
      windowMs: 60000,
      limit: 300,
      standardHeaders: 'draft-8',
      legacyHeaders: false,
      message: { message: 'Too many requests. Please wait a minute.' },
    }),
  );
  app.use('/api', (req, res, next) => {
    res.set('Cache-Control', 'no-store');
    res.vary('Origin');
    const origin = req.headers.origin;
    const allowed = origin && origin === process.env.APP_ORIGIN;
    if (origin && !allowed)
      return res.status(403).json({ message: 'Request origin is not allowed.' });
    if (allowed) {
      res.set('Access-Control-Allow-Origin', origin);
      res.set('Access-Control-Allow-Credentials', 'true');
    }
    if (req.method === 'OPTIONS') {
      const method = req.headers['access-control-request-method'];
      const headers = (req.headers['access-control-request-headers'] || '')
        .toLowerCase()
        .split(',')
        .map((h) => h.trim())
        .filter(Boolean);
      if (
        !allowed ||
        !['GET', 'POST', 'PUT', 'PATCH', 'DELETE'].includes(method) ||
        headers.some((h) => !['content-type', 'accept'].includes(h))
      )
        return res.status(403).json({ message: 'Preflight request is not allowed.' });
      res.set('Access-Control-Allow-Methods', 'GET, POST, PUT, PATCH, DELETE');
      res.set('Access-Control-Allow-Headers', 'Content-Type, Accept');
      res.set('Access-Control-Max-Age', '600');
      return res.status(204).end();
    }
    if (!['GET', 'HEAD', 'OPTIONS'].includes(req.method)) {
      if (!allowed) return res.status(403).json({ message: 'Request origin is not allowed.' });
      if (!req.is('application/json'))
        return res.status(415).json({ message: 'Send application/json.' });
    }
    next();
  });
  app.use(express.json({ limit: '256kb' }));
}
