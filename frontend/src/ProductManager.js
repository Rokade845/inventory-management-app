import React, { useEffect, useState } from 'react';

// --- Simple styling objects ---
const styles = {
  container: {
    margin: '32px auto',
    maxWidth: 940,
    minWidth: 320,
    background: '#ffffff',
    borderRadius: 8,
    boxShadow: '0 2px 12px rgba(60,60,60,0.10)',
    padding: '32px 24px'
  },
  header: {
    fontSize: '2rem',
    fontWeight: 600,
    letterSpacing: '-1px',
    marginBottom: 10
  },
  controlGroup: {
    display: 'flex',
    gap: 16,
    flexWrap: 'wrap',
    alignItems: 'center',
    marginBottom: 24
  },
  label: {
    fontWeight: 500,
    fontSize: '1rem'
  },
  select: {
    padding: '8px 6px',
    borderRadius: 4
  },
  searchBox: {
    padding: 8,
    minWidth: 220,
    borderRadius: 4,
    border: '1px solid #bbb'
  },
  button: {
    background: '#2563eb',
    color: '#fff',
    border: 'none',
    padding: '7px 18px',
    marginRight: 12,
    borderRadius: 4,
    cursor: 'pointer',
    fontWeight: 500,
    fontSize: '1rem'
  },
  dangerButton: {
    background: '#ef4444',
    color: '#fff',
    border: 'none',
    padding: '7px 18px',
    borderRadius: 4,
    cursor: 'pointer',
    fontWeight: 500,
    fontSize: '1rem'
  },
  table: {
    width: '100%',
    borderCollapse: 'collapse',
    marginBottom: 16,
    background: '#f8fafc',
    borderRadius: 4,
    fontSize: '1.05em'
  },
  th: {
    background: '#f1f5f9',
    textAlign: 'left',
    fontWeight: 600,
    padding: 12,
    borderBottom: '1px solid #e2e8f0'
  },
  td: {
    padding: '12px 10px',
    borderBottom: '1px solid #e5e7eb'
  },
  statusIn: {
    background: '#dcfce7',
    color: '#15803d',
    borderRadius: 4,
    padding: '2px 10px',
    fontWeight: 700
  },
  statusOut: {
    background: '#fee2e2',
    color: '#b91c1c',
    borderRadius: 4,
    padding: '2px 10px',
    fontWeight: 700
  }
};

// --- Add Product Form ---
function AddProductForm({ onAdd }) {
  const [form, setForm] = useState({
    name: '',
    unit: '',
    category: '',
    brand: '',
    stock: '',
    status: '',
    image: ''
  });
  const [message, setMessage] = useState('');

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const submitForm = { ...form, stock: Number(form.stock) };
    fetch('https://inventory-management-app-g7yl.onrender.com/api/products', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(submitForm)
    })
      .then(async (res) => {
        let data = {};
        try { data = await res.json(); } catch {}
        if (res.ok && data.success) {
          setMessage('Product added!');
          setForm({
            name: '',
            unit: '',
            category: '',
            brand: '',
            stock: '',
            status: '',
            image: ''
          });
          onAdd();
        } else {
          setMessage(data.error || 'Failed to add.');
        }
      })
      .catch(() => setMessage('Server error.'));
  };

  return (
    <form onSubmit={handleSubmit} style={{ marginBottom: 24, padding: 12, borderRadius: 6, background: '#f9fafb' }}>
      <span style={{ fontWeight: 600, fontSize: '1.1em' }}>Add Product</span>
      <div style={{ display: 'flex', gap: 12, marginBottom: 11, flexWrap: 'wrap' }}>
        <input name="name" placeholder="Name" value={form.name} onChange={handleChange} required style={styles.searchBox} />
        <input name="unit" placeholder="Unit" value={form.unit} onChange={handleChange} style={styles.searchBox} />
        <input name="category" placeholder="Category" value={form.category} onChange={handleChange} style={styles.searchBox} />
        <input name="brand" placeholder="Brand" value={form.brand} onChange={handleChange} style={styles.searchBox} />
        <input name="stock" placeholder="Stock" value={form.stock} onChange={handleChange} required type="number" style={styles.searchBox} />
        <input name="status" placeholder="Status" value={form.status} onChange={handleChange} style={styles.searchBox} />
        <input name="image" placeholder="Image URL" value={form.image} onChange={handleChange} style={styles.searchBox} />
        <button type="submit" style={styles.button}>Add</button>
      </div>
      <div style={{ color: 'green', marginTop: 2 }}>{message}</div>
    </form>
  );
}

// --- InventoryHistory component ---
function InventoryHistory({ productId }) {
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`https://inventory-management-app-g7yl.onrender.com/api/products/${productId}/history`)
      .then(response => response.json())
      .then(data => {
        setHistory(data);
        setLoading(false);
      })
      .catch(() => {
        setHistory([]);
        setLoading(false);
      });
  }, [productId]);

  if (loading) return <div>Loading history...</div>;
  if (!history.length) return <div>No history found for this product.</div>;

  return (
    <div style={{ marginTop: 6 }}>
      <span style={{ fontWeight: 600, fontSize: '1.04em', marginBottom: 3 }}>Inventory Change History</span>
      <table style={styles.table}>
        <thead>
          <tr>
            <th style={styles.th}>Change</th>
            <th style={styles.th}>Previous</th>
            <th style={styles.th}>New</th>
            <th style={styles.th}>Note</th>
            <th style={styles.th}>Timestamp</th>
          </tr>
        </thead>
        <tbody>
          {history.map(entry => (
            <tr key={entry.id}>
              <td style={styles.td}>{entry.change}</td>
              <td style={styles.td}>{entry.previous_stock}</td>
              <td style={styles.td}>{entry.new_stock}</td>
              <td style={styles.td}>{entry.note}</td>
              <td style={styles.td}>{entry.timestamp}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// --- Inline Editing Table Row ---
function ProductRow({ product, onEdit, onDelete, isEditing, setEditing }) {
  const [form, setForm] = useState({ ...product });
  const [message, setMessage] = useState('');

  useEffect(() => { setForm({ ...product }); }, [product]);

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSave = () => {
    fetch(`https://inventory-management-app-g7yl.onrender.com/api/products/${product.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form)
    })
      .then(res => res.json())
      .then(data => {
        if (data.success) {
          setMessage('Saved!');
          setEditing(null);
          onEdit();
        } else {
          setMessage('Save failed.');
        }
      });
  };

  return (
    <tr>
      {isEditing === product.id ?
        <>
          <td style={styles.td}><input name="name" value={form.name} onChange={handleChange} style={styles.searchBox} /></td>
          <td style={styles.td}><input name="unit" value={form.unit} onChange={handleChange} style={styles.searchBox} /></td>
          <td style={styles.td}><input name="category" value={form.category} onChange={handleChange} style={styles.searchBox} /></td>
          <td style={styles.td}><input name="brand" value={form.brand} onChange={handleChange} style={styles.searchBox} /></td>
          <td style={styles.td}><input name="stock" value={form.stock} type="number" onChange={handleChange} style={{ ...styles.searchBox, width: 60 }} /></td>
          <td style={form.stock > 0 ? styles.statusIn : styles.statusOut}>
            {form.stock > 0 ? 'In Stock' : 'Out of Stock'}
          </td>
          <td style={styles.td}><input name="status" value={form.status} onChange={handleChange} style={styles.searchBox} /></td>
          <td style={styles.td}><input name="image" value={form.image} onChange={handleChange} style={styles.searchBox} /></td>
          <td style={styles.td}>
            <button onClick={handleSave} style={styles.button}>Save</button>
            <button onClick={() => setEditing(null)} style={{ ...styles.button, background: '#64748b', color: '#fff' }}>Cancel</button>
            <div style={{ color: 'green', fontSize: '0.85em' }}>{message}</div>
          </td>
        </>
        :
        <>
          <td style={styles.td}>{product.name}</td>
          <td style={styles.td}>{product.unit}</td>
          <td style={styles.td}>{product.category}</td>
          <td style={styles.td}>{product.brand}</td>
          <td style={styles.td}>{product.stock}</td>
          <td style={product.stock > 0 ? styles.statusIn : styles.statusOut}>
            {product.stock > 0 ? 'In Stock' : 'Out of Stock'}
          </td>
          <td style={styles.td}>{product.status}</td>
          <td style={styles.td}>{product.image}</td>
          <td style={styles.td}>
            <button onClick={() => setEditing(product.id)} style={styles.button}>Edit</button>
            <button onClick={() => onDelete(product.id)} style={styles.dangerButton}>Delete</button>
          </td>
        </>
      }
    </tr>
  );
}

// --- Main ProductManager ---
export default function ProductManager() {
  const [products, setProducts] = useState([]);
  const [search, setSearch] = useState('');
  const [categories, setCategories] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState('');
  const [page, setPage] = useState(1);
  const [pageSize] = useState(10);
  const [sort, setSort] = useState('name');
  const [order, setOrder] = useState('ASC');
  const [editingId, setEditing] = useState(null);
  const [selectedForHistory, setSelectedForHistory] = useState(null);

  useEffect(() => {
    fetch('https://inventory-management-app-g7yl.onrender.com/api/categories')
      .then(res => res.json())
      .then(data => setCategories(data))
      .catch(() => setCategories([]));
  }, []);

  useEffect(() => {
    let url = `https://inventory-management-app-g7yl.onrender.com/api/products?page=${page}&pageSize=${pageSize}&sort=${sort}&order=${order}`;
    if (selectedCategory) url += `&category=${encodeURIComponent(selectedCategory)}`;
    fetch(url)
      .then(res => res.json())
      .then(data => setProducts(data))
      .catch(() => setProducts([]));
  }, [selectedCategory, page, pageSize, sort, order]);

  const refreshProducts = () => {
    let url = `https://inventory-management-app-g7yl.onrender.com/api/products?page=${page}&pageSize=${pageSize}&sort=${sort}&order=${order}`;
    if (selectedCategory) url += `&category=${encodeURIComponent(selectedCategory)}`;
    fetch(url)
      .then(res => res.json())
      .then(data => setProducts(data));
  };

  const handleDelete = (id) => {
    if (window.confirm('Delete this product?')) {
      fetch(`https://inventory-management-app-g7yl.onrender.com/api/products/${id}`, { method: 'DELETE' })
        .then(res => res.json())
        .then(() => {
          setEditing(null);
          refreshProducts();
        });
    }
  };

  function handleExportCSV() {
    window.open('https://inventory-management-app-g7yl.onrender.com/api/products/export', '_blank');
  }

  function handleImportCSV(event) {
    const file = event.target.files[0];
    if (!file) return;
    const formData = new FormData();
    formData.append('csvFile', file);

    fetch('https://inventory-management-app-g7yl.onrender.com/api/products/import', {
      method: 'POST',
      body: formData
    })
      .then(res => res.json())
      .then(data => {
        alert(`Added: ${data.added.join(', ')}\nSkipped: ${data.skipped.join(', ')}`);
        refreshProducts();
      });
  }

  // Search filter (client-side in UI only)
  const filteredProducts = products.filter(product =>
    product.name.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div style={styles.container}>
      <div style={styles.header}>Inventory Management</div>
      <div style={styles.controlGroup}>
        <button onClick={handleExportCSV} style={styles.button}>Download Products CSV</button>
        <label>
          <input type="file" accept=".csv" onChange={handleImportCSV} style={{ ...styles.button, padding: 0, height: 38, width: 170, fontWeight: 400, fontSize: '0.97em' }} />
        </label>
      </div>
      <div style={styles.controlGroup}>
        <span style={styles.label}>Filter by Category:</span>
        <select
          value={selectedCategory}
          onChange={e => setSelectedCategory(e.target.value)}
          style={styles.select}
        >
          <option value="">All Categories</option>
          {categories.map((cat, i) => (
            <option key={i} value={cat}>{cat}</option>
          ))}
        </select>
        <span style={styles.label}>Sort By:</span>
        <select
          value={sort}
          onChange={e => setSort(e.target.value)}
          style={styles.select}
        >
          <option value="name">Name</option>
          <option value="stock">Stock</option>
          <option value="category">Category</option>
          <option value="brand">Brand</option>
        </select>
        <button onClick={() => setOrder(order === 'ASC' ? 'DESC' : 'ASC')} style={{ ...styles.button, padding: '5px 14px', background: '#e0e7ff', color: '#0f172a', fontWeight: 500 }}>
          {order === 'ASC' ? '▲ Ascending' : '▼ Descending'}
        </button>
      </div>
      <AddProductForm onAdd={refreshProducts} />
      <div style={{ fontWeight: '600', fontSize: '1.15em', marginBottom: 10 }}>Product List</div>
      <input
        type="text"
        placeholder="Search products by name..."
        value={search}
        onChange={e => setSearch(e.target.value)}
        style={styles.searchBox}
      />
      <div style={{ overflowX: 'auto', width: '100%', marginTop: 11 }}>
        <table style={styles.table}>
          <thead>
            <tr>
              <th style={styles.th}>Name</th>
              <th style={styles.th}>Unit</th>
              <th style={styles.th}>Category</th>
              <th style={styles.th}>Brand</th>
              <th style={styles.th}>Stock</th>
              <th style={styles.th}>Status</th>
              <th style={styles.th}>Status Label</th>
              <th style={styles.th}>Image URL</th>
              <th style={styles.th}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredProducts.length ? (
              filteredProducts.map(product => (
                <ProductRow
                  key={product.id}
                  product={product}
                  onEdit={refreshProducts}
                  onDelete={handleDelete}
                  isEditing={editingId}
                  setEditing={setEditing}
                />
              ))
            ) : (
              <tr><td colSpan="9" style={{ ...styles.td, textAlign: "center" }}>No products found.</td></tr>
            )}
          </tbody>
        </table>
      </div>
      <div style={{ margin: '18px 0' }}>
        <button disabled={page === 1} onClick={() => setPage(page - 1)} style={styles.button}>Prev</button>
        <span style={{ fontWeight: 500, fontSize: '1em', margin: '0 10px' }}>Page {page}</span>
        <button onClick={() => setPage(page + 1)} style={styles.button}>Next</button>
      </div>
      <div>
        {filteredProducts.map(product => (
          <div key={"history-" + product.id} style={{ margin: "12px 0" }}>
            <button onClick={() => setSelectedForHistory(selectedForHistory === product.id ? null : product.id)} style={styles.button}>
              {selectedForHistory === product.id ? "Hide" : "View"} History for <b>{product.name}</b>
            </button>
            {selectedForHistory === product.id && <InventoryHistory productId={product.id} />}
          </div>
        ))}
      </div>
    </div>
  );
}
