'use strict';

const AbstractDriver = require('../abstract');
const Attribute = require('./attribute');
const DataTypes = require('./data_types');
const spellbook = require('./spellbook');
const schema = require('./schema');

class MysqlDriver extends AbstractDriver {
  /**
   * Create a connection pool
   * @param {string} clientName
   * @param {Object} opts
   * @param {string} opts.host
   * @param {string} opts.port
   * @param {string} opts.user
   * @param {string} opts.password
   * @param {string} opts.appName         - In some RDMS, appName is used as the actual name of the database
   * @param {string} opts.database
   * @param {string} opts.connectionLimit
   */
  constructor(name = 'mysql', opts = {}) {
    if (name !== 'mysql' && name !== 'mysql2') {
      throw new Error(`Unsupported mysql client ${name}`);
    }
    const { host, port, user, password, connectionLimit } = opts;
    // some RDMS use appName to locate the database instead of the actual db, though the table_schema stored in infomation_schema.columns is still the latter one.
    const database = opts.appName || opts.database;
    super(name, opts);
    this.type = 'mysql';
    this.database = database;
    this.pool = require(name).createPool({
      connectionLimit,
      host,
      port,
      user,
      password,
      database,
    });
  }

  get escapeId() {
    return this.pool.escapeId;
  }

  get escape() {
    return this.pool.escape;
  }

  getConnection() {
    return new Promise((resolve, reject) => {
      this.pool.getConnection((err, connection) => {
        if (err) {
          reject(err);
        } else {
          resolve(connection);
        }
      });
    });
  }

  async query(query, values, opts = {}) {
    const { pool, logger } = this;
    const { connection } = opts;
    const [results, fields] = await new Promise((resolve, reject) => {
      logger.logQuery(logger.format(query, values, opts));
      (connection || pool).query(query, values, (err, results, fields) => {
        if (err) {
          reject(err);
        } else {
          resolve([results, fields]);
        }
      });
    });

    if (fields) {
      return { rows: results, fields };
    } else {
      return results;
    }
  }

  format(spell) {
    return spellbook.format(spell);
  }
};

Object.assign(MysqlDriver.prototype, { ...schema, Attribute, DataTypes });

module.exports = MysqlDriver;
