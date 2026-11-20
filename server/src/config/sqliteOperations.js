const { AsyncLocalStorage } = require('node:async_hooks');
const transactions = new AsyncLocalStorage();
const queues = new WeakMap();
const broken = new WeakSet();
class TransactionError extends Error {
  constructor(cause) { super('SQLite transaction could not be safely rolled back'); this.name = 'TransactionError'; this.cause = cause; this.rollbackFailed = true; }
}
function rawAccess(db) {
  const runQuery = (query, params = []) => new Promise((resolve, reject) => db.run(query, params, function(error) {
    error ? reject(error) : resolve({ id: this.lastID, changes: this.changes });
  }));
  const getOne = (query, params = []) => new Promise((resolve, reject) => db.get(query, params, (error, row) => error ? reject(error) : resolve(row)));
  const getAll = (query, params = []) => new Promise((resolve, reject) => db.all(query, params, (error, rows) => error ? reject(error) : resolve(rows)));
  return { runQuery, getOne, getAll };
}
function queueOperation(db, work) {
  const previous = queues.get(db) || Promise.resolve();
  const action = previous.then(() => {
    if (broken.has(db)) throw new TransactionError();
    return work();
  });
  // Keep a handled queue tail; the caller still receives the original rejection.
  queues.set(db, action.then(() => undefined, () => undefined));
  return action;
}
function withTransaction(db, work) {
  const current = transactions.getStore();
  // A model called by a transactional controller joins the same transaction.
  if (current?.db === db && current.active) return Promise.resolve().then(() => work(rawAccess(db)));
  return queueOperation(db, async () => {
    const access = rawAccess(db);
    await access.runQuery('BEGIN IMMEDIATE'); // Never rollback another transaction if BEGIN itself fails.
    const context = { db, active: true };
    return transactions.run(context, async () => {
      try {
        const result = await work(access);
        await access.runQuery('COMMIT');
        return result;
      } catch (error) {
        try { await access.runQuery('ROLLBACK'); }
        catch { broken.add(db); throw new TransactionError(error); }
        throw error;
      } finally { context.active = false; }
    });
  });
}
function createDatabaseAccess(db) {
  const raw = rawAccess(db);
  const execute = (method, args) => {
    const current = transactions.getStore();
    return current?.db === db && current.active ? raw[method](...args) : queueOperation(db, () => raw[method](...args));
  };
  return {
    runQuery: (...args) => execute('runQuery', args),
    getOne: (...args) => execute('getOne', args),
    getAll: (...args) => execute('getAll', args),
    withTransaction: work => withTransaction(db, work),
    runTransaction: queries => withTransaction(db, async access => {
      const results = [];
      for (const { query, params } of queries) results.push(await access.runQuery(query, params));
      return results;
    })
  };
}
module.exports = { createDatabaseAccess, withTransaction, rawAccess, queueOperation, TransactionError };
