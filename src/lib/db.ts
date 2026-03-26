import Database from "better-sqlite3";
import path from "path";
import bcrypt from "bcryptjs";

const DB_PATH = path.join(process.cwd(), "data", "financial.db");

let _db: Database.Database | null = null;

export function getDb(): Database.Database {
  if (!_db) {
    const fs = require("fs");
    const dir = path.dirname(DB_PATH);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

    _db = new Database(DB_PATH);
    _db.pragma("journal_mode = WAL");
    _db.pragma("foreign_keys = ON");
    initDb(_db);
  }
  return _db;
}

function initDb(db: Database.Database) {
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT UNIQUE NOT NULL,
      password TEXT NOT NULL,
      role TEXT NOT NULL DEFAULT 'customer',
      customer_id INTEGER,
      created_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS customers (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      birth_year INTEGER,
      gender TEXT,
      job TEXT,
      address TEXT,
      email TEXT,
      phone TEXT,
      financial_goal TEXT,
      label TEXT,
      created_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS snapshots (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      customer_id INTEGER NOT NULL,
      snapshot_date TEXT NOT NULL,
      label TEXT,

      salary_self INTEGER DEFAULT 0,
      salary_spouse INTEGER DEFAULT 0,
      other_income INTEGER DEFAULT 0,
      bonus INTEGER DEFAULT 0,
      total_monthly_income INTEGER DEFAULT 0,

      expense_fixed INTEGER DEFAULT 0,
      expense_variable INTEGER DEFAULT 0,
      total_expense INTEGER DEFAULT 0,

      safe_assets INTEGER DEFAULT 0,
      investment_assets INTEGER DEFAULT 0,
      total_financial_assets INTEGER DEFAULT 0,

      real_estate_total INTEGER DEFAULT 0,

      total_debt INTEGER DEFAULT 0,
      monthly_debt_payment INTEGER DEFAULT 0,

      insurance_premium INTEGER DEFAULT 0,

      net_assets INTEGER DEFAULT 0,
      savings_capacity INTEGER DEFAULT 0,
      savings_ratio REAL DEFAULT 0,
      investment_ratio REAL DEFAULT 0,
      total_assets INTEGER DEFAULT 0,
      overall_return_rate REAL DEFAULT 0,

      created_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (customer_id) REFERENCES customers(id)
    );

    CREATE TABLE IF NOT EXISTS income_details (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      snapshot_id INTEGER NOT NULL,
      category TEXT,
      odd_month INTEGER DEFAULT 0,
      even_month INTEGER DEFAULT 0,
      allowance INTEGER DEFAULT 0,
      monthly_avg INTEGER DEFAULT 0,
      FOREIGN KEY (snapshot_id) REFERENCES snapshots(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS expense_details (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      snapshot_id INTEGER NOT NULL,
      category TEXT,
      type TEXT,
      amount INTEGER DEFAULT 0,
      FOREIGN KEY (snapshot_id) REFERENCES snapshots(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS assets (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      snapshot_id INTEGER NOT NULL,
      asset_type TEXT,
      product_name TEXT,
      deposit_amount INTEGER DEFAULT 0,
      start_date TEXT,
      end_date TEXT,
      accumulated INTEGER DEFAULT 0,
      return_rate REAL DEFAULT 0,
      FOREIGN KEY (snapshot_id) REFERENCES snapshots(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS real_estate (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      snapshot_id INTEGER NOT NULL,
      usage TEXT,
      property_type TEXT,
      ownership TEXT,
      amount INTEGER DEFAULT 0,
      region TEXT,
      FOREIGN KEY (snapshot_id) REFERENCES snapshots(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS debts (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      snapshot_id INTEGER NOT NULL,
      usage TEXT,
      debt_type TEXT,
      repayment_method TEXT,
      period TEXT,
      total_balance INTEGER DEFAULT 0,
      interest_rate REAL DEFAULT 0,
      monthly_payment INTEGER DEFAULT 0,
      FOREIGN KEY (snapshot_id) REFERENCES snapshots(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS insurance (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      snapshot_id INTEGER NOT NULL,
      policyholder TEXT,
      insured TEXT,
      product_name TEXT,
      premium INTEGER DEFAULT 0,
      FOREIGN KEY (snapshot_id) REFERENCES snapshots(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS portfolio_files (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      customer_id INTEGER NOT NULL,
      snapshot_id INTEGER,
      original_name TEXT NOT NULL,
      stored_name TEXT NOT NULL,
      relative_path TEXT NOT NULL,
      mime_type TEXT,
      file_size INTEGER DEFAULT 0,
      note TEXT,
      uploaded_by INTEGER,
      created_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE CASCADE,
      FOREIGN KEY (snapshot_id) REFERENCES snapshots(id) ON DELETE SET NULL,
      FOREIGN KEY (uploaded_by) REFERENCES users(id) ON DELETE SET NULL
    );

    CREATE INDEX IF NOT EXISTS idx_snapshots_customer_date ON snapshots(customer_id, snapshot_date DESC);
    CREATE INDEX IF NOT EXISTS idx_portfolio_customer_date ON portfolio_files(customer_id, created_at DESC);
  `);

  runMigrations(db);

  // Create default admin if not exists
  const admin = db.prepare("SELECT id FROM users WHERE username = ?").get("admin");
  if (!admin) {
    const hash = bcrypt.hashSync("admin1234", 10);
    db.prepare("INSERT INTO users (username, password, role) VALUES (?, ?, ?)").run("admin", hash, "admin");
  }
}

function runMigrations(db: Database.Database) {
  ensureColumn(db, "snapshots", "total_assets", "INTEGER DEFAULT 0");
  ensureColumn(db, "snapshots", "overall_return_rate", "REAL DEFAULT 0");
}

function ensureColumn(db: Database.Database, tableName: string, columnName: string, definition: string) {
  const columns = db.prepare(`PRAGMA table_info(${tableName})`).all() as Array<{ name: string }>;
  const exists = columns.some((column) => column.name === columnName);

  if (!exists) {
    db.exec(`ALTER TABLE ${tableName} ADD COLUMN ${columnName} ${definition}`);
  }
}
