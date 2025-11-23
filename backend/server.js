const { body, validationResult } = require('express-validator');
const multer = require('multer');
const csv = require('csv-parser');
const fs = require('fs');
const upload = multer({ dest: 'uploads/' });


require('dotenv').config();
const express = require('express');
const cors = require('cors');
const sqlite3 = require('sqlite3').verbose();

const app = express();
const PORT = process.env.PORT || 5001;

// Middlewares
app.use(cors());
app.use(express.json());

// SQLite DB setup
const db = new sqlite3.Database('./inventory.db');

db.serialize(() => {
  db.run(`CREATE TABLE IF NOT EXISTS products (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT UNIQUE NOT NULL,
    unit TEXT,
    category TEXT,
    brand TEXT,
    stock INTEGER NOT NULL,
    status TEXT,
    image TEXT
  )`);
  db.run(`CREATE TABLE IF NOT EXISTS inventory_history (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    product_id INTEGER,
    change INTEGER,
    previous_stock INTEGER,
    new_stock INTEGER,
    note TEXT,
    timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(product_id) REFERENCES products(id)
  )`);
});

// Backend root
app.get('/', (req, res) => {
  res.send('Inventory Management Backend Running!');
});

// Get unique categories for category dropdown
app.get('/api/categories', (req, res) => {
  db.all('SELECT DISTINCT category FROM products WHERE category IS NOT NULL AND category != ""', [], (err, rows) => {
    if (err) return res.status(500).json({ error: 'Failed to fetch categories' });
    const categories = rows.map(row => row.category);
    res.json(categories);
  });
});

// Get all products (with category filter, pagination, and sorting)
app.get('/api/products', (req, res) => {
  const { category, page = 1, pageSize = 10, sort = 'name', order = 'ASC' } = req.query;

  let base = 'SELECT * FROM products';
  let where = '';
  let params = [];

  if (category) {
    where = ' WHERE category = ?';
    params.push(category);
  }

  // Allow only valid sort fields
  const validSortFields = ['name', 'stock', 'category', 'id', 'brand', 'unit', 'status'];
  const sortField = validSortFields.includes(sort.toLowerCase()) ? sort : 'name';
  const sortOrder = order && order.toUpperCase() === 'DESC' ? 'DESC' : 'ASC';

  const limit = Number(pageSize) || 10;
  const offset = (Number(page) - 1) * limit;

  const query = `${base}${where} ORDER BY ${sortField} ${sortOrder} LIMIT ? OFFSET ?`;
  params.push(limit, offset);

  db.all(query, params, (err, rows) => {
    if (err) return res.status(500).json({ error: 'Database error', details: err });
    res.json(rows);
  });
});

// Add a new product AND log initial history
app.post('/api/products', (req, res) => {
  const { name, unit, category, brand, stock, status, image } = req.body;
  db.run(
    'INSERT INTO products (name, unit, category, brand, stock, status, image) VALUES (?, ?, ?, ?, ?, ?, ?)',
    [name, unit, category, brand, stock, status, image],
    function (err) {
      if (err) return res.status(500).json({ error: 'Failed to add product' });
      db.run(
        'INSERT INTO inventory_history (product_id, change, previous_stock, new_stock, note) VALUES (?, ?, ?, ?, ?)',
        [this.lastID, stock, 0, stock, 'Initial add'],
        function () {
          res.json({ success: true, newId: this.lastID });
        }
      );
    }
  );
});

// Update product details and track inventory history
app.put('/api/products/:id', (req, res) => {
  const { name, unit, category, brand, stock, status, image } = req.body;
  const { id } = req.params;
  db.get('SELECT stock FROM products WHERE id = ?', [id], (err, row) => {
    if (err || !row) return res.status(404).json({ error: 'Product not found' });
    const previous_stock = row.stock;
    db.run(
      'UPDATE products SET name = ?, unit = ?, category = ?, brand = ?, stock = ?, status = ?, image = ? WHERE id = ?',
      [name, unit, category, brand, stock, status, image, id],
      function (err2) {
        if (err2) return res.status(500).json({ error: 'Update failed' });
        if (parseInt(stock) !== parseInt(previous_stock)) {
          db.run(
            'INSERT INTO inventory_history (product_id, change, previous_stock, new_stock, note) VALUES (?, ?, ?, ?, ?)',
            [id, stock - previous_stock, previous_stock, stock, 'Stock update'],
            function () {
              res.json({ success: true });
            }
          );
        } else {
          res.json({ success: true });
        }
      }
    );
  });
});

// Import products from CSV
app.post('/api/products/import', upload.single('csvFile'), (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: 'CSV file is required.' });
  }
  const added = [];
  const skipped = [];
  const results = [];
  fs.createReadStream(req.file.path)
    .pipe(csv())
    .on('data', (row) => {
      results.push(row);
    })
    .on('end', () => {
      let processed = 0;
      if (results.length === 0) {
        fs.unlinkSync(req.file.path);
        return res.json({ message: 'No products in CSV.', added: [], skipped: [] });
      }
      results.forEach((product) => {
        db.get('SELECT id FROM products WHERE name = ?', [product.name], (err, duplicate) => {
          if (!duplicate) {
            db.run(
              'INSERT INTO products (name, unit, category, brand, stock, status, image) VALUES (?, ?, ?, ?, ?, ?, ?)',
              [product.name, product.unit, product.category, product.brand, product.stock, product.status, product.image]
            );
            added.push(product.name);
          } else {
            skipped.push(product.name);
          }
          processed++;
          if (processed === results.length) {
            fs.unlinkSync(req.file.path);
            res.json({
              addedCount: added.length,
              skippedCount: skipped.length,
              added,
              skipped
            });
          }
        });
      });
    });
});

// Export products as CSV
app.get('/api/products/export', (req, res) => {
  db.all('SELECT * FROM products', [], (err, rows) => {
    if (err) {
      return res.status(500).json({ error: 'Database error', details: err });
    }
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename="products.csv"');
    const header = 'id,name,unit,category,brand,stock,status,image\n';
    const csvRows = rows.map(row =>
      `${row.id},"${row.name}","${row.unit}","${row.category}","${row.brand}",${row.stock},"${row.status}","${row.image}"`
    );
    const csvData = header + csvRows.join('\n');
    res.status(200).send(csvData);
  });
});

// Get inventory history for a product, sorted by timestamp DESC
app.get('/api/products/:id/history', (req, res) => {
  const { id } = req.params;
  db.all(
    'SELECT * FROM inventory_history WHERE product_id = ? ORDER BY timestamp DESC',
    [id],
    (err, rows) => {
      if (err) return res.status(500).json({ error: 'Failed to fetch history' });
      res.json(rows);
    }
  );
});

// Delete a product
app.delete('/api/products/:id', (req, res) => {
  const { id } = req.params;
  db.run('DELETE FROM products WHERE id = ?', [id], function (err) {
    if (err) {
      return res.status(500).json({ error: 'Failed to delete product' });
    }
    res.json({ success: true, deletedId: id });
  });
});
app.get('/api/products', (req, res) => {
  const { category, page = 1, pageSize = 10, sort = 'name', order = 'ASC' } = req.query;
  
  let sql = 'SELECT * FROM products';
  let params = [];

  if (category) {
    sql += ' WHERE category = ?';
    params.push(category);
  }

  const validSortFields = ['name', 'stock', 'category', 'id', 'brand', 'unit', 'status'];
  const sortField = validSortFields.includes(sort.toLowerCase()) ? sort : 'name';
  const sortOrder = order && order.toUpperCase() === 'DESC' ? 'DESC' : 'ASC';

  const limit = Number(pageSize);
  const offset = (Number(page) - 1) * limit;
  sql += ` ORDER BY ${sortField} ${sortOrder} LIMIT ? OFFSET ?`;
  params.push(limit, offset);

  // DEBUG: print query and params
  console.log("SQL:", sql);
  console.log("Params:", params);

  db.all(sql, params, (err, rows) => {
    if (err) return res.status(500).json({ error: 'Database error', details: err });
    res.json(rows);
  });
});

// FINAL LINE: Start the server
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
