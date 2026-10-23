// Additive, restartable upgrade: legacy administrators retain catalog access.
// Existing squads are assigned to the oldest legacy administrator.
export async function migrateAccessControl(pool) {
  const columns = async (table, column) => {
    const [rows] = await pool.execute(
      'SELECT COLUMN_NAME,COLUMN_DEFAULT,IS_NULLABLE FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME=? AND COLUMN_NAME=?',
      [table, column],
    );
    return rows;
  };
  let role = await columns('USERS', 'ROLE');
  if (!role.length) {
    await pool.query(
      "ALTER TABLE USERS ADD COLUMN ROLE ENUM('user','admin','super_admin') NOT NULL DEFAULT 'admin'",
    );
    role = [{ COLUMN_DEFAULT: 'admin' }];
  }
  // The temporary default also acts as a checkpoint if an upgrade was interrupted.
  if (role[0].COLUMN_DEFAULT === 'admin') {
    const [existing] = await pool.execute(
      "SELECT ID FROM USERS WHERE ROLE='super_admin' ORDER BY ID LIMIT 1",
    );
    if (!existing.length)
      await pool.query("UPDATE USERS SET ROLE='super_admin' ORDER BY ID LIMIT 1");
    await pool.query("ALTER TABLE USERS ALTER COLUMN ROLE SET DEFAULT 'user'");
  }
  if (!(await columns('USERS', 'IS_ACTIVE')).length)
    await pool.query('ALTER TABLE USERS ADD COLUMN IS_ACTIVE TINYINT(1) NOT NULL DEFAULT 1');
  let owner = await columns('GAME_ACCOUNTS', 'OWNER_ID');
  if (!owner.length) {
    await pool.query('ALTER TABLE GAME_ACCOUNTS ADD COLUMN OWNER_ID INT UNSIGNED NULL');
    owner = [{ IS_NULLABLE: 'YES' }];
  }
  if (owner[0].IS_NULLABLE === 'YES') {
    const [users] = await pool.execute(
      "SELECT ID FROM USERS WHERE ROLE='super_admin' ORDER BY ID LIMIT 1",
    );
    const [unowned] = await pool.execute(
      'SELECT COUNT(*) total FROM GAME_ACCOUNTS WHERE OWNER_ID IS NULL',
    );
    if (unowned[0].total && !users.length)
      throw new Error(
        'Create a super administrator with admin:create, then rerun db:migrate to assign existing squads.',
      );
    if (users.length)
      await pool.execute('UPDATE GAME_ACCOUNTS SET OWNER_ID=? WHERE OWNER_ID IS NULL', [
        users[0].ID,
      ]);
    await pool.query('ALTER TABLE GAME_ACCOUNTS MODIFY COLUMN OWNER_ID INT UNSIGNED NOT NULL');
  }
  const [constraints] = await pool.execute(
    "SELECT CONSTRAINT_NAME FROM information_schema.TABLE_CONSTRAINTS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='GAME_ACCOUNTS' AND CONSTRAINT_NAME='fk_account_owner'",
  );
  if (!constraints.length)
    await pool.query(
      'ALTER TABLE GAME_ACCOUNTS ADD CONSTRAINT fk_account_owner FOREIGN KEY (OWNER_ID) REFERENCES USERS(ID) ON DELETE RESTRICT',
    );
}
