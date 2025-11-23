import React, { useEffect, useState } from 'react';

// --- InventoryHistory component, included inside this file ---
function InventoryHistory({ productId }) {
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`http://localhost:5001/api/products/${productId}/history`)
      .then(response => response.json())
      .then(data => {
        setHistory(data);
        setLoading(false);
      })
      .catch(err => {
        setHistory([]);
        setLoading(false);
      });
  }, [productId]);

  if (loading) return <div>Loading history...</div>;
  if (!history.length) return <div>No history found for this product.</div>;

  return (
    <div>
      <h3>Inventory Change History</h3>
      <table border="1" cellPadding="6">
        <thead>
          <tr>
            <th>Change</th>
            <th>Previous Stock</th>
            <th>New Stock</th>
            <th>Note</th>
            <th>Timestamp</th>
          </tr>
        </thead>
        <tbody>
          {history.map(entry => (
            <tr key={entry.id}>
              <td>{entry.change}</td>
              <td>{entry.previous_stock}</td>
              <td>{entry.new_stock}</td>
              <td>{entry.note}</td>
              <td>{entry.timestamp}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default function ProductDetails() {
  const [product, setProduct] = useState(null);
  const productId = 1; // Only one product

  useEffect(() => {
    fetch(`http://localhost:5001/api/products/${productId}`)
      .then(res => res.json())
      .then(data => setProduct(data))
      .catch(() => setProduct(null));
  }, [productId]);

  if (product === null) return <div>Loading product details...</div>;
  if (!product.id) return <div>Product not found.</div>;

  return (
    <div style={{ margin: 30 }}>
      <h2>Product Details</h2>
      <div>
        <strong>Name:</strong> {product.name} <br />
        <strong>Unit:</strong> {product.unit} <br />
        <strong>Category:</strong> {product.category} <br />
        <strong>Brand:</strong> {product.brand} <br />
        <strong>Stock:</strong> {product.stock} <br />
        <strong>Status:</strong> {product.status}
      </div>
      <InventoryHistory productId={productId} />
    </div>
  );
}
