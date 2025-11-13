const express = require('express');
const path = require('path');
const sqlite3 = require('sqlite3').verbose();
const crypto = require('crypto');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));

// Database setup
const dbPath = path.join(__dirname, 'data.db');
const db = new sqlite3.Database(dbPath);

db.serialize(() => {
  db.run(`
    CREATE TABLE IF NOT EXISTS tickets (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      email TEXT NOT NULL,
      ticket_type TEXT NOT NULL,
      quantity INTEGER NOT NULL,
      total_price REAL NOT NULL,
      code TEXT UNIQUE NOT NULL,
      created_at TEXT NOT NULL
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS reservations (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      email TEXT NOT NULL,
      phone TEXT,
      guests INTEGER NOT NULL,
      notes TEXT,
      created_at TEXT NOT NULL
    )
  `);
});

// Helper to generate ticket code
function generateCode() {
  return crypto.randomBytes(8).toString('hex');
}

function formatTicketType(type) {
  if (type === 'vip') return 'Jegy + vacsora';
  return 'Normál jegy';
}

// API routes

// Create ticket order
app.post('/api/tickets', (req, res) => {
  const { name, email, ticket_type, quantity } = req.body;

  if (!name || !email || !ticket_type || !quantity) {
    return res.status(400).json({ error: 'Hiányzó adatok.' });
  }

  const qty = parseInt(quantity, 10);
  if (isNaN(qty) || qty <= 0) {
    return res.status(400).json({ error: 'A mennyiségnek pozitív számnak kell lennie.' });
  }

  // Simple pricing logic (you can customize)
  let pricePerTicket = 5000;
  if (ticket_type === 'vip') pricePerTicket = 9000;

  const total = pricePerTicket * qty;
  const code = generateCode();
  const createdAt = new Date().toISOString();

  db.run(
    `INSERT INTO tickets (name, email, ticket_type, quantity, total_price, code, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [name, email, ticket_type, qty, total, code, createdAt],
    function (err) {
      if (err) {
        console.error(err);
        return res.status(500).json({ error: 'Hiba a mentés közben.' });
      }

      res.json({
        id: this.lastID,
        name,
        email,
        ticket_type,
        quantity: qty,
        total_price: total,
        code,
        created_at: createdAt
      });
    }
  );
});

// List tickets (admin)
app.get('/api/tickets', (req, res) => {
  db.all(`SELECT * FROM tickets ORDER BY created_at DESC`, [], (err, rows) => {
    if (err) {
      console.error(err);
      return res.status(500).json({ error: 'Hiba a lekérdezés közben.' });
    }
    res.json(rows);
  });
});

// Get single ticket by code (for verification)
app.get('/api/tickets/code/:code', (req, res) => {
  const code = req.params.code;
  db.get(`SELECT * FROM tickets WHERE code = ?`, [code], (err, row) => {
    if (err) {
      console.error(err);
      return res.status(500).json({ error: 'Hiba a lekérdezés közben.' });
    }
    if (!row) {
      return res.status(404).json({ valid: false, message: 'Jegy nem található.' });
    }
    res.json({ valid: true, ticket: row });
  });
});

// Simple HTML verification page
app.get('/verify/:code', (req, res) => {
  const code = req.params.code;
  db.get(`SELECT * FROM tickets WHERE code = ?`, [code], (err, row) => {
    if (err) {
      console.error(err);
      return res.status(500).send('<h1>Hiba történt</h1>');
    }
    if (!row) {
      return res.send(`
        <html>
          <head><title>Jegy ellenőrzés</title></head>
          <body style="font-family: sans-serif; text-align:center;">
            <h1>Érvénytelen jegy</h1>
            <p>A megadott jegykód nem található.</p>
          </body>
        </html>
      `);
    }

    res.send(`
      <html>
        <head><title>Jegy ellenőrzés</title></head>
        <body style="font-family: sans-serif; text-align:center;">
          <h1>Érvényes jegy</h1>
          <p><strong>Név:</strong> ${row.name}</p>
          <p><strong>Email:</strong> ${row.email}</p>
          <p><strong>Jegytípus:</strong> ${formatTicketType(row.ticket_type)}</p>
          <p><strong>Mennyiség:</strong> ${row.quantity} db</p>
          <p><strong>Összeg:</strong> ${row.total_price} Ft</p>
          <p><em>Wemender GJU | 2025.12.29.</em></p>
        </body>
      </html>
    `);
  });
});

// Create table reservation
app.post('/api/reservations', (req, res) => {
  const { name, email, phone, guests, notes } = req.body;

  if (!name || !email || !guests) {
    return res.status(400).json({ error: 'Hiányzó adatok.' });
  }

  const g = parseInt(guests, 10);
  if (isNaN(g) || g <= 0) {
    return res.status(400).json({ error: 'A létszámnak pozitív számnak kell lennie.' });
  }

  const createdAt = new Date().toISOString();

  db.run(
    `INSERT INTO reservations (name, email, phone, guests, notes, created_at)
     VALUES (?, ?, ?, ?, ?, ?)`,
    [name, email, phone || '', g, notes || '', createdAt],
    function (err) {
      if (err) {
        console.error(err);
        return res.status(500).json({ error: 'Hiba a mentés közben.' });
      }

      res.json({
        id: this.lastID,
        name,
        email,
        phone,
        guests: g,
        notes,
        created_at: createdAt
      });
    }
  );
});

// List reservations (admin)
app.get('/api/reservations', (req, res) => {
  db.all(`SELECT * FROM reservations ORDER BY created_at DESC`, [], (err, rows) => {
    if (err) {
      console.error(err);
      return res.status(500).json({ error: 'Hiba a lekérdezés közben.' });
    }
    res.json(rows);
  });
});

// Serve admin page
app.get('/admin', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'admin.html'));
});

// Start server
app.listen(PORT, () => {
  console.log(`Server listening on http://localhost:${PORT}`);
});
