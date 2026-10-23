import { z } from 'zod';

export function errorHandler(err, req, res, next) {
  if (err instanceof z.ZodError)
    return res
      .status(400)
      .json({ message: err.issues.map((i) => `${i.path.join('.')}: ${i.message}`).join('; ') });
  if (err.type === 'entity.parse.failed') return res.status(400).json({ message: 'Invalid JSON.' });
  if (err.type === 'entity.too.large')
    return res.status(413).json({ message: 'Request is too large.' });
  if (err.code === 'ER_DUP_ENTRY')
    return res
      .status(409)
      .json({ message: 'This email, game ID, squad assignment or playing style already exists.' });
  if (err.code === 'ER_ROW_IS_REFERENCED_2')
    return res
      .status(409)
      .json({ message: 'Remove this player from all game IDs before deleting.' });
  if (err.code === 'ER_NO_REFERENCED_ROW_2')
    return res.status(404).json({ message: 'The selected record no longer exists.' });
  if ([400, 403, 404, 409].includes(err.status))
    return res.status(err.status).json({ message: err.message });
  console.error('Request failed:', err.code || err.name);
  res.status(500).json({ message: 'Something went wrong. Please try again.' });
}
