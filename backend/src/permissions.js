export const isSuperAdmin = (user) => user?.ROLE === 'super_admin';
export const canManageDatabase = (user) => ['admin', 'super_admin'].includes(user?.ROLE);

export function requireDatabaseAdmin(req, res, next) {
  if (!canManageDatabase(req.user))
    return res.status(403).json({ message: 'Administrator permission is required.' });
  next();
}

export function requireSuperAdmin(req, res, next) {
  if (!isSuperAdmin(req.user))
    return res.status(403).json({ message: 'Super administrator permission is required.' });
  next();
}

export function accountScope(user, alias = 'g') {
  return isSuperAdmin(user)
    ? { clause: '1=1', args: [] }
    : { clause: `${alias}.OWNER_ID=?`, args: [user.ID] };
}

export async function assertAccountAccess(db, user, accountId, lock = false) {
  if (isSuperAdmin(user)) return;
  const [rows] = await db.execute(
    `SELECT ID FROM GAME_ACCOUNTS WHERE ID=? AND OWNER_ID=?${lock ? ' FOR UPDATE' : ''}`,
    [accountId, user.ID],
  );
  if (!rows.length) throw Object.assign(new Error('Squad not found.'), { status: 404 });
}

export async function assertAssignmentAccess(db, user, assignmentId, lock = false) {
  if (isSuperAdmin(user)) return;
  const [rows] = await db.execute(
    `SELECT a.ID FROM ASSIGNMENTS a JOIN GAME_ACCOUNTS g ON g.ID=a.GAME_ACCOUNT_ID WHERE a.ID=? AND g.OWNER_ID=?${lock ? ' FOR UPDATE' : ''}`,
    [assignmentId, user.ID],
  );
  if (!rows.length) throw Object.assign(new Error('Assignment not found.'), { status: 404 });
}
