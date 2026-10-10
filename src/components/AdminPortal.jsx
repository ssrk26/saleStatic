import React, { useState, useEffect } from 'react';
import {
  Lock,
  LogOut,
  FolderTree,
  Package,
  Settings,
  Users,
  Database,
  MessageSquare,
  Plus,
  Trash2,
  Edit3,
  Upload,
  Film,
  Image as ImageIcon,
  Check,
  AlertCircle,
  ShieldAlert,
  ShieldCheck,
  Download,
  FileUp,
  ArrowLeft,
  ExternalLink,
  Sparkles,
  RefreshCw,
  ArrowUp,
  ArrowDown
} from 'lucide-react';

export default function AdminPortal({
  storeData,
  onRefreshStore,
  onExitAdmin
}) {
  const [token, setToken] = useState(() => localStorage.getItem('teeto_admin_token') || '');
  const [currentUser, setCurrentUser] = useState(null);
  const [authLoading, setAuthLoading] = useState(Boolean(token));
  const [loginUsername, setLoginUsername] = useState('superadmin');
  const [loginPassword, setLoginPassword] = useState('superadmin123');
  const [loginError, setLoginError] = useState('');

  const [activeTab, setActiveTab] = useState('categories');
  const [toast, setToast] = useState(null);

  // Category & Subcategory state
  const [newCatName, setNewCatName] = useState('');
  const [newCatDesc, setNewCatDesc] = useState('');
  const [newCatImage, setNewCatImage] = useState('');
  const [subInputs, setSubInputs] = useState({});
  const [editingCatId, setEditingCatId] = useState(null);
  const [editingCatForm, setEditingCatForm] = useState({ name: '', description: '', coverImage: '' });

  // Product Form Modal state
  const [isProductModalOpen, setIsProductModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState(null);
  const [productForm, setProductForm] = useState({
    name: '',
    sku: '',
    categoryId: '',
    subcategoryId: '',
    price: 999,
    originalPrice: 1499,
    badge: 'New Drop',
    featured: true,
    inStock: true,
    fabric: '240 GSM 100% Combed Cotton',
    fit: 'Oversized Fit',
    description: '',
    sizesText: 'S, M, L, XL, XXL',
    colorsText: 'Obsidian Black, Chalk White',
    media: []
  });
  const [newMediaUrl, setNewMediaUrl] = useState('');
  const [newMediaType, setNewMediaType] = useState('image');
  const [newMediaCaption, setNewMediaCaption] = useState('');
  const [uploadingFiles, setUploadingFiles] = useState(false);

  // Config state
  const [configForm, setConfigForm] = useState(storeData.config || {});

  // Superadmin Users state
  const [adminUsers, setAdminUsers] = useState([]);
  const [newAdminForm, setNewAdminForm] = useState({
    name: '',
    username: '',
    password: '',
    role: 'admin'
  });
  const [resetPwdMap, setResetPwdMap] = useState({});

  // Orders & Storage info state
  const [orders, setOrders] = useState([]);
  const [storageInfo, setStorageInfo] = useState(null);

  const showNotice = (message, type = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3500);
  };

  useEffect(() => {
    setConfigForm(storeData.config || {});
  }, [storeData.config]);

  useEffect(() => {
    if (!token) {
      setCurrentUser(null);
      setAuthLoading(false);
      return;
    }
    setAuthLoading(true);
    fetch('/api/auth/me', {
      headers: { Authorization: `Bearer ${token}` }
    })
      .then((res) => {
        if (!res.ok) throw new Error('Invalid session');
        return res.json();
      })
      .then((data) => {
        setCurrentUser(data.user);
      })
      .catch(() => {
        localStorage.removeItem('teeto_admin_token');
        setToken('');
        setCurrentUser(null);
      })
      .finally(() => setAuthLoading(false));
  }, [token]);

  useEffect(() => {
    if (!currentUser || !token) return;
    if (activeTab === 'users' && currentUser.role === 'superadmin') {
      fetchAdminUsers();
    } else if (activeTab === 'orders') {
      fetchOrders();
    } else if (activeTab === 'storage') {
      fetchStorageInfo();
    }
  }, [activeTab, currentUser, token]);

  const apiFetch = async (url, options = {}) => {
    const res = await fetch(url, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
        ...(options.headers || {})
      }
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      throw new Error(data.error || 'Request failed');
    }
    return data;
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoginError('');
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: loginUsername, password: loginPassword })
      });
      const data = await res.json();
      if (!res.ok) {
        setLoginError(data.error || 'Login failed');
        return;
      }
      localStorage.setItem('teeto_admin_token', data.token);
      setToken(data.token);
      setCurrentUser(data.user);
      showNotice(`Welcome back, ${data.user.name}!`);
    } catch (err) {
      setLoginError(err.message || 'Unable to connect to server');
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('teeto_admin_token');
    setToken('');
    setCurrentUser(null);
  };

  // ============================================================================
  // CATEGORY & SUBCATEGORY HANDLERS
  // ============================================================================

  const handleAddCategory = async (e) => {
    e.preventDefault();
    if (!newCatName.trim()) return;
    try {
      await apiFetch('/api/admin/categories', {
        method: 'POST',
        body: JSON.stringify({
          name: newCatName,
          description: newCatDesc,
          coverImage: newCatImage
        })
      });
      setNewCatName('');
      setNewCatDesc('');
      setNewCatImage('');
      await onRefreshStore();
      showNotice('Category created dynamically!');
    } catch (err) {
      showNotice(err.message, 'error');
    }
  };

  const handleSaveCategoryEdit = async (categoryId) => {
    try {
      await apiFetch(`/api/admin/categories/${categoryId}`, {
        method: 'PUT',
        body: JSON.stringify(editingCatForm)
      });
      setEditingCatId(null);
      await onRefreshStore();
      showNotice('Category updated!');
    } catch (err) {
      showNotice(err.message, 'error');
    }
  };

  const handleDeleteCategory = async (categoryId, catName) => {
    if (!window.confirm(`Delete category "${catName}" and all its subcategories?`)) return;
    try {
      await apiFetch(`/api/admin/categories/${categoryId}`, { method: 'DELETE' });
      await onRefreshStore();
      showNotice(`Category "${catName}" removed.`);
    } catch (err) {
      showNotice(err.message, 'error');
    }
  };

  const handleAddSubcategory = async (categoryId) => {
    const subName = (subInputs[categoryId] || '').trim();
    if (!subName) return;
    try {
      await apiFetch(`/api/admin/categories/${categoryId}/subcategories`, {
        method: 'POST',
        body: JSON.stringify({ name: subName })
      });
      setSubInputs((prev) => ({ ...prev, [categoryId]: '' }));
      await onRefreshStore();
      showNotice(`Subcategory "${subName}" added!`);
    } catch (err) {
      showNotice(err.message, 'error');
    }
  };

  const handleDeleteSubcategory = async (categoryId, subId, subName) => {
    try {
      await apiFetch(`/api/admin/categories/${categoryId}/subcategories/${subId}`, {
        method: 'DELETE'
      });
      await onRefreshStore();
      showNotice(`Subcategory "${subName}" removed.`);
    } catch (err) {
      showNotice(err.message, 'error');
    }
  };

  // ============================================================================
  // PRODUCT & MULTI-MEDIA (IMAGES + VIDEOS) HANDLERS
  // ============================================================================

  const openCreateProductModal = () => {
    const firstCat = storeData.categories?.[0];
    const firstSub = firstCat?.subcategories?.[0];
    setEditingProduct(null);
    setProductForm({
      name: '',
      sku: `TL-${Math.floor(1000 + Math.random() * 9000)}`,
      categoryId: firstCat?.id || '',
      subcategoryId: firstSub?.id || '',
      price: 999,
      originalPrice: 1499,
      badge: 'New Drop',
      featured: true,
      inStock: true,
      fabric: '240 GSM 100% Combed Cotton',
      fit: 'Oversized Fit',
      description: '',
      sizesText: 'S, M, L, XL, XXL',
      colorsText: 'Obsidian Black, Chalk White',
      media: []
    });
    setIsProductModalOpen(true);
  };

  const openEditProductModal = (prod) => {
    setEditingProduct(prod);
    setProductForm({
      name: prod.name || '',
      sku: prod.sku || '',
      categoryId: prod.categoryId || '',
      subcategoryId: prod.subcategoryId || '',
      price: prod.price || 0,
      originalPrice: prod.originalPrice || prod.price || 0,
      badge: prod.badge || '',
      featured: Boolean(prod.featured),
      inStock: prod.inStock !== false,
      fabric: prod.fabric || '',
      fit: prod.fit || '',
      description: prod.description || '',
      sizesText: (prod.sizes || ['S', 'M', 'L', 'XL']).join(', '),
      colorsText: (prod.colors || ['Default']).join(', '),
      media: Array.isArray(prod.media) ? [...prod.media] : []
    });
    setIsProductModalOpen(true);
  };

  const handleFileUpload = async (e) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;
    setUploadingFiles(true);
    try {
      const formData = new FormData();
      files.forEach((f) => formData.append('files', f));
      const res = await fetch('/api/admin/upload', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: formData
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Upload failed');

      setProductForm((prev) => ({
        ...prev,
        media: [...prev.media, ...(data.media || [])]
      }));
      showNotice(`Uploaded ${data.media.length} media file(s)!`);
    } catch (err) {
      showNotice(err.message, 'error');
    } finally {
      setUploadingFiles(false);
      e.target.value = '';
    }
  };

  const handleAddMediaByUrl = () => {
    if (!newMediaUrl.trim()) return;
    const item = {
      id: `m-url-${Date.now()}`,
      type: newMediaType,
      url: newMediaUrl.trim(),
      caption: newMediaCaption.trim() || (newMediaType === 'video' ? 'Product Video' : 'Product Look')
    };
    setProductForm((prev) => ({
      ...prev,
      media: [...prev.media, item]
    }));
    setNewMediaUrl('');
    setNewMediaCaption('');
  };

  const handleRemoveMediaItem = (idx) => {
    setProductForm((prev) => ({
      ...prev,
      media: prev.media.filter((_, i) => i !== idx)
    }));
  };

  const handleMoveMediaItem = (idx, direction) => {
    setProductForm((prev) => {
      const copy = [...prev.media];
      const targetIdx = idx + direction;
      if (targetIdx < 0 || targetIdx >= copy.length) return prev;
      const temp = copy[idx];
      copy[idx] = copy[targetIdx];
      copy[targetIdx] = temp;
      return { ...prev, media: copy };
    });
  };

  const handleSaveProduct = async (e) => {
    e.preventDefault();
    const payload = {
      name: productForm.name,
      sku: productForm.sku,
      categoryId: productForm.categoryId,
      subcategoryId: productForm.subcategoryId,
      price: Number(productForm.price),
      originalPrice: Number(productForm.originalPrice),
      badge: productForm.badge,
      featured: productForm.featured,
      inStock: productForm.inStock,
      fabric: productForm.fabric,
      fit: productForm.fit,
      description: productForm.description,
      sizes: productForm.sizesText
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean),
      colors: productForm.colorsText
        .split(',')
        .map((c) => c.trim())
        .filter(Boolean),
      media: productForm.media
    };

    try {
      if (editingProduct) {
        await apiFetch(`/api/admin/products/${editingProduct.id}`, {
          method: 'PUT',
          body: JSON.stringify(payload)
        });
        showNotice(`Updated "${payload.name}"!`);
      } else {
        await apiFetch('/api/admin/products', {
          method: 'POST',
          body: JSON.stringify(payload)
        });
        showNotice(`Added "${payload.name}" to catalog!`);
      }
      setIsProductModalOpen(false);
      await onRefreshStore();
    } catch (err) {
      showNotice(err.message, 'error');
    }
  };

  const handleDeleteProduct = async (prod) => {
    if (!window.confirm(`Delete product "${prod.name}"?`)) return;
    try {
      await apiFetch(`/api/admin/products/${prod.id}`, { method: 'DELETE' });
      await onRefreshStore();
      showNotice(`Deleted "${prod.name}".`);
    } catch (err) {
      showNotice(err.message, 'error');
    }
  };

  // ============================================================================
  // STORE & WHATSAPP CONFIG HANDLER
  // ============================================================================

  const handleSaveConfig = async (e) => {
    e.preventDefault();
    try {
      await apiFetch('/api/admin/config', {
        method: 'PUT',
        body: JSON.stringify(configForm)
      });
      await onRefreshStore();
      showNotice('WhatsApp & Store configuration saved!');
    } catch (err) {
      showNotice(err.message, 'error');
    }
  };

  // ============================================================================
  // SUPERADMIN USER MANAGEMENT HANDLERS
  // ============================================================================

  const fetchAdminUsers = async () => {
    try {
      const data = await apiFetch('/api/superadmin/users');
      setAdminUsers(data.users || []);
    } catch (err) {
      showNotice(err.message, 'error');
    }
  };

  const handleCreateAdminUser = async (e) => {
    e.preventDefault();
    try {
      const data = await apiFetch('/api/superadmin/users', {
        method: 'POST',
        body: JSON.stringify(newAdminForm)
      });
      setAdminUsers(data.users || []);
      setNewAdminForm({ name: '', username: '', password: '', role: 'admin' });
      showNotice(`Created ${data.user.role} login "@${data.user.username}"!`);
    } catch (err) {
      showNotice(err.message, 'error');
    }
  };

  const handleToggleUserActive = async (u) => {
    try {
      const data = await apiFetch(`/api/superadmin/users/${u.id}`, {
        method: 'PUT',
        body: JSON.stringify({ active: !u.active })
      });
      setAdminUsers(data.users || []);
      showNotice(`Updated status for @${u.username}`);
    } catch (err) {
      showNotice(err.message, 'error');
    }
  };

  const handleResetUserPassword = async (userId, username) => {
    const newPassword = resetPwdMap[userId];
    if (!newPassword || newPassword.length < 6) {
      showNotice('New password must be at least 6 characters.', 'error');
      return;
    }
    try {
      await apiFetch(`/api/superadmin/users/${userId}`, {
        method: 'PUT',
        body: JSON.stringify({ newPassword })
      });
      setResetPwdMap((prev) => ({ ...prev, [userId]: '' }));
      showNotice(`Password updated for @${username}!`);
    } catch (err) {
      showNotice(err.message, 'error');
    }
  };

  const handleDeleteAdminUser = async (u) => {
    if (!window.confirm(`Permanently delete login account "@${u.username}"?`)) return;
    try {
      const data = await apiFetch(`/api/superadmin/users/${u.id}`, { method: 'DELETE' });
      setAdminUsers(data.users || []);
      showNotice(`Removed login @${u.username}.`);
    } catch (err) {
      showNotice(err.message, 'error');
    }
  };

  // ============================================================================
  // ORDERS & STORAGE BACKUP HANDLERS
  // ============================================================================

  const fetchOrders = async () => {
    try {
      const data = await apiFetch('/api/admin/orders');
      setOrders(data.orders || []);
    } catch (err) {
      showNotice(err.message, 'error');
    }
  };

  const handleUpdateOrderStatus = async (orderId, status) => {
    try {
      const data = await apiFetch(`/api/admin/orders/${orderId}`, {
        method: 'PUT',
        body: JSON.stringify({ status })
      });
      setOrders(data.orders || []);
      showNotice('Order status updated!');
    } catch (err) {
      showNotice(err.message, 'error');
    }
  };

  const fetchStorageInfo = async () => {
    try {
      const data = await apiFetch('/api/admin/storage/info');
      setStorageInfo(data);
    } catch (err) {
      showNotice(err.message, 'error');
    }
  };

  const handleExportJson = () => {
    if (!storageInfo?.exportData) return;
    const blob = new Blob([JSON.stringify(storageInfo.exportData, null, 2)], {
      type: 'application/json'
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `teeto-labels-backup-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
    showNotice('Downloaded JSON store backup!');
  };

  const handleImportJson = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const text = await file.text();
      const parsed = JSON.parse(text);
      await apiFetch('/api/admin/storage/import', {
        method: 'POST',
        body: JSON.stringify(parsed)
      });
      await onRefreshStore();
      await fetchStorageInfo();
      showNotice('Store catalog & categories restored from JSON file!');
    } catch (err) {
      showNotice(err.message || 'Invalid JSON file', 'error');
    } finally {
      e.target.value = '';
    }
  };

  // ============================================================================
  // RENDER LOGIN GATE IF NOT AUTHENTICATED
  // ============================================================================

  if (authLoading) {
    return (
      <div className="admin-login-screen">
        <div className="admin-login-card">
          <p>Verifying session...</p>
        </div>
      </div>
    );
  }

  if (!currentUser) {
    return (
      <div className="admin-login-screen">
        <div className="admin-login-card">
          <button className="btn-back-store" onClick={onExitAdmin}>
            <ArrowLeft size={16} /> Back to Teeto Labels Storefront
          </button>

          <div className="admin-login-brand">
            <span className="brand-monogram">TL</span>
            <div>
              <h2>TEETO LABELS</h2>
              <p>Admin & Superadmin Management Console</p>
            </div>
          </div>

          <div className="role-policy-banner">
            <ShieldCheck size={18} />
            <div>
              <strong>Role Policy:</strong> Store customers do not need logins (orders go via
              WhatsApp). Catalog management is restricted to <strong>Admins</strong>, and new Admin
              logins can only be added by <strong>Superadmins</strong>.
            </div>
          </div>

          {loginError && (
            <div className="login-error-alert">
              <AlertCircle size={16} /> {loginError}
            </div>
          )}

          <form onSubmit={handleLogin} className="admin-login-form">
            <div className="form-field">
              <label>Username</label>
              <input
                type="text"
                value={loginUsername}
                onChange={(e) => setLoginUsername(e.target.value)}
                placeholder="Enter admin or superadmin username"
                required
              />
            </div>
            <div className="form-field">
              <label>Password</label>
              <input
                type="password"
                value={loginPassword}
                onChange={(e) => setLoginPassword(e.target.value)}
                placeholder="Enter password"
                required
              />
            </div>
            <button type="submit" className="btn-admin-submit">
              <Lock size={16} /> Sign In to Management Console
            </button>
          </form>

          <div className="demo-credentials-box">
            <span>Quick Fill Demo Accounts:</span>
            <div className="demo-cred-buttons">
              <button
                type="button"
                className={loginUsername === 'superadmin' ? 'active' : ''}
                onClick={() => {
                  setLoginUsername('superadmin');
                  setLoginPassword('superadmin123');
                }}
              >
                <strong>Superadmin</strong> (Can manage store + create Admin logins)
              </button>
              <button
                type="button"
                className={loginUsername === 'admin' ? 'active' : ''}
                onClick={() => {
                  setLoginUsername('admin');
                  setLoginPassword('admin123');
                }}
              >
                <strong>Admin</strong> (Can manage Categories, Products & WhatsApp)
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const selectedCategoryForModal = storeData.categories?.find(
    (c) => c.id === productForm.categoryId
  );

  return (
    <div className="admin-layout">
      {toast && (
        <div className={`admin-toast ${toast.type}`}>
          {toast.type === 'error' ? <AlertCircle size={16} /> : <Check size={16} />}
          <span>{toast.message}</span>
        </div>
      )}

      {/* Admin Topbar */}
      <header className="admin-header">
        <div className="admin-header-left">
          <span className="brand-monogram">TL</span>
          <div>
            <h1>TEETO LABELS — ADMIN PORTAL</h1>
            <p>Dynamic Catalog, Multi-Media & WhatsApp Configuration</p>
          </div>
        </div>

        <div className="admin-header-right">
          <div className="user-role-pill">
            <span className={`role-dot ${currentUser.role}`} />
            <div>
              <strong>{currentUser.name}</strong>
              <small>@{currentUser.username} • {currentUser.role.toUpperCase()}</small>
            </div>
          </div>
          <button className="btn-outline-light" onClick={onExitAdmin}>
            <ExternalLink size={15} /> View Live Store
          </button>
          <button className="btn-logout" onClick={handleLogout}>
            <LogOut size={15} /> Sign Out
          </button>
        </div>
      </header>

      {/* Admin Navigation Tabs */}
      <div className="admin-tabs-bar">
        <button
          className={activeTab === 'categories' ? 'active' : ''}
          onClick={() => setActiveTab('categories')}
        >
          <FolderTree size={16} /> Dynamic Categories & Subcategories
        </button>
        <button
          className={activeTab === 'products' ? 'active' : ''}
          onClick={() => setActiveTab('products')}
        >
          <Package size={16} /> Products, Images & Videos ({storeData.products?.length || 0})
        </button>
        <button
          className={activeTab === 'config' ? 'active' : ''}
          onClick={() => setActiveTab('config')}
        >
          <Settings size={16} /> WhatsApp & Store Config
        </button>
        <button
          className={activeTab === 'orders' ? 'active' : ''}
          onClick={() => setActiveTab('orders')}
        >
          <MessageSquare size={16} /> WhatsApp Order Inquiries
        </button>
        <button
          className={activeTab === 'storage' ? 'active' : ''}
          onClick={() => setActiveTab('storage')}
        >
          <Database size={16} /> 0-Cost Storage & JSON Backup
        </button>
        <button
          className={activeTab === 'users' ? 'active' : ''}
          onClick={() => setActiveTab('users')}
        >
          <Users size={16} /> Admin Logins{' '}
          <span className="superadmin-lock-tag">Superadmin Only</span>
        </button>
      </div>

      <main className="admin-main-content">
        {/* ================================================================= */}
        {/* TAB 1: DYNAMIC CATEGORIES & SUBCATEGORIES                         */}
        {/* ================================================================= */}
        {activeTab === 'categories' && (
          <div className="admin-section">
            <div className="section-heading-row">
              <div>
                <h2>Dynamic Categories & Subcategories</h2>
                <p>
                  Add or remove main apparel categories (e.g., T-Shirts, Shirts, Hoodies) and
                  dynamically manage subcategories (e.g., Round Neck, Oversized, Cuban Collar, Linen).
                </p>
              </div>
            </div>

            {/* Add New Main Category Card */}
            <form onSubmit={handleAddCategory} className="admin-card add-category-form">
              <h3>
                <Plus size={18} /> Add New Top-Level Category
              </h3>
              <div className="form-row-3">
                <input
                  type="text"
                  placeholder="Category Name (e.g., Hoodies, Polos, Co-ords)"
                  value={newCatName}
                  onChange={(e) => setNewCatName(e.target.value)}
                  required
                />
                <input
                  type="text"
                  placeholder="Short Description"
                  value={newCatDesc}
                  onChange={(e) => setNewCatDesc(e.target.value)}
                />
                <input
                  type="url"
                  placeholder="Cover Image URL (optional)"
                  value={newCatImage}
                  onChange={(e) => setNewCatImage(e.target.value)}
                />
              </div>
              <button type="submit" className="btn-primary-dark">
                <Plus size={16} /> Create Category
              </button>
            </form>

            {/* Existing Categories & Dynamic Subcategories */}
            <div className="categories-admin-grid">
              {(storeData.categories || []).map((cat) => (
                <div key={cat.id} className="admin-card category-manage-card">
                  {editingCatId === cat.id ? (
                    <div className="cat-edit-box">
                      <input
                        type="text"
                        value={editingCatForm.name}
                        onChange={(e) =>
                          setEditingCatForm((p) => ({ ...p, name: e.target.value }))
                        }
                        placeholder="Category Name"
                      />
                      <input
                        type="text"
                        value={editingCatForm.description}
                        onChange={(e) =>
                          setEditingCatForm((p) => ({ ...p, description: e.target.value }))
                        }
                        placeholder="Category Description"
                      />
                      <input
                        type="text"
                        value={editingCatForm.coverImage}
                        onChange={(e) =>
                          setEditingCatForm((p) => ({ ...p, coverImage: e.target.value }))
                        }
                        placeholder="Cover Image URL"
                      />
                      <div className="cat-edit-actions">
                        <button
                          type="button"
                          className="btn-primary-dark"
                          onClick={() => handleSaveCategoryEdit(cat.id)}
                        >
                          Save
                        </button>
                        <button
                          type="button"
                          className="btn-ghost"
                          onClick={() => setEditingCatId(null)}
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="cat-card-header">
                      <div className="cat-header-info">
                        {cat.coverImage && (
                          <img src={cat.coverImage} alt={cat.name} className="cat-mini-thumb" />
                        )}
                        <div>
                          <h3>{cat.name}</h3>
                          <p>{cat.description || 'Dynamic store category'}</p>
                        </div>
                      </div>
                      <div className="cat-header-actions">
                        <button
                          type="button"
                          className="icon-btn"
                          title="Edit Category"
                          onClick={() => {
                            setEditingCatId(cat.id);
                            setEditingCatForm({
                              name: cat.name,
                              description: cat.description || '',
                              coverImage: cat.coverImage || ''
                            });
                          }}
                        >
                          <Edit3 size={15} />
                        </button>
                        <button
                          type="button"
                          className="icon-btn danger"
                          title="Delete Category"
                          onClick={() => handleDeleteCategory(cat.id, cat.name)}
                        >
                          <Trash2 size={15} />
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Subcategories List */}
                  <div className="subcategories-block">
                    <div className="subcategories-label">
                      <span>Subcategories ({cat.subcategories?.length || 0})</span>
                      <small>Click × to remove or add new below</small>
                    </div>
                    <div className="subcategories-tags">
                      {(cat.subcategories || []).map((sub) => (
                        <span key={sub.id} className="subcategory-admin-pill">
                          <strong>{sub.name}</strong>
                          <button
                            type="button"
                            onClick={() => handleDeleteSubcategory(cat.id, sub.id, sub.name)}
                            title={`Remove ${sub.name}`}
                          >
                            ×
                          </button>
                        </span>
                      ))}
                      {(!cat.subcategories || cat.subcategories.length === 0) && (
                        <span className="empty-sub-hint">No subcategories yet. Add one below!</span>
                      )}
                    </div>

                    <div className="add-sub-row">
                      <input
                        type="text"
                        placeholder={`Add subcategory to ${cat.name} (e.g. Round Neck, Oversized)...`}
                        value={subInputs[cat.id] || ''}
                        onChange={(e) =>
                          setSubInputs((prev) => ({ ...prev, [cat.id]: e.target.value }))
                        }
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            e.preventDefault();
                            handleAddSubcategory(cat.id);
                          }
                        }}
                      />
                      <button
                        type="button"
                        className="btn-primary-dark"
                        onClick={() => handleAddSubcategory(cat.id)}
                      >
                        <Plus size={15} /> Add Subcategory
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ================================================================= */}
        {/* TAB 2: PRODUCTS & RICH MEDIA (MULTIPLE IMAGES & VIDEOS)           */}
        {/* ================================================================= */}
        {activeTab === 'products' && (
          <div className="admin-section">
            <div className="section-heading-row">
              <div>
                <h2>Products & Multi-Media Gallery Manager</h2>
                <p>
                  Each T-Shirt or Shirt supports unlimited images and videos (direct file uploads or
                  URLs), dynamic category/subcategory assignment, sizes, and colors.
                </p>
              </div>
              <button className="btn-primary-dark" onClick={openCreateProductModal}>
                <Plus size={17} /> Add New Product
              </button>
            </div>

            <div className="admin-products-table-wrap admin-card">
              <table className="admin-table">
                <thead>
                  <tr>
                    <th>Product</th>
                    <th>Category & Subcategory</th>
                    <th>Price</th>
                    <th>Media (Photos & Videos)</th>
                    <th>Sizes & Stock</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {(storeData.products || []).map((prod) => {
                    const cat = storeData.categories?.find((c) => c.id === prod.categoryId);
                    const sub = cat?.subcategories?.find((s) => s.id === prod.subcategoryId);
                    const imgCount = (prod.media || []).filter((m) => m.type !== 'video').length;
                    const vidCount = (prod.media || []).filter((m) => m.type === 'video').length;
                    const thumb =
                      prod.media?.find((m) => m.type !== 'video')?.url ||
                      prod.media?.[0]?.url ||
                      '';

                    return (
                      <tr key={prod.id}>
                        <td>
                          <div className="prod-cell-main">
                            {thumb && <img src={thumb} alt={prod.name} className="prod-row-thumb" />}
                            <div>
                              <strong>{prod.name}</strong>
                              <small>SKU: {prod.sku}</small>
                              {prod.badge && <span className="mini-badge">{prod.badge}</span>}
                            </div>
                          </div>
                        </td>
                        <td>
                          <div className="cat-sub-cell">
                            <span className="cat-chip">{cat?.name || 'Uncategorized'}</span>
                            {sub && <span className="sub-chip">{sub.name}</span>}
                          </div>
                        </td>
                        <td>
                          <strong>
                            {storeData.config?.currencySymbol || '₹'}
                            {Number(prod.price).toLocaleString()}
                          </strong>
                          {prod.originalPrice > prod.price && (
                            <small className="strike-small">
                              {storeData.config?.currencySymbol || '₹'}
                              {Number(prod.originalPrice).toLocaleString()}
                            </small>
                          )}
                        </td>
                        <td>
                          <div className="media-badges-cell">
                            <span className="media-count-tag">
                              <ImageIcon size={13} /> {imgCount} Photos
                            </span>
                            {vidCount > 0 && (
                              <span className="media-count-tag video">
                                <Film size={13} /> {vidCount} Videos
                              </span>
                            )}
                          </div>
                        </td>
                        <td>
                          <div className="stock-sizes-cell">
                            <span className={`stock-dot ${prod.inStock ? 'in' : 'out'}`}>
                              {prod.inStock ? 'In Stock' : 'Sold Out'}
                            </span>
                            <small>{(prod.sizes || []).join(', ')}</small>
                          </div>
                        </td>
                        <td>
                          <div className="row-actions">
                            <button
                              className="btn-sm-edit"
                              onClick={() => openEditProductModal(prod)}
                            >
                              <Edit3 size={14} /> Edit / Media
                            </button>
                            <button
                              className="icon-btn danger"
                              onClick={() => handleDeleteProduct(prod)}
                              title="Delete Product"
                            >
                              <Trash2 size={15} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ================================================================= */}
        {/* TAB 3: WHATSAPP & STORE CONFIGURATION                             */}
        {/* ================================================================= */}
        {activeTab === 'config' && (
          <div className="admin-section">
            <div className="section-heading-row">
              <div>
                <h2>WhatsApp Order Link & Store Configuration</h2>
                <p>
                  Link your official WhatsApp phone number so customer orders are routed directly to
                  your WhatsApp without requiring customer sign-ups.
                </p>
              </div>
            </div>

            <form onSubmit={handleSaveConfig} className="admin-card config-form-grid">
              <div className="config-group">
                <h3>1. WhatsApp Checkout Integration</h3>
                <div className="form-field">
                  <label>WhatsApp Phone Number (with Country Code, digits only)</label>
                  <input
                    type="text"
                    value={configForm.whatsappNumber || ''}
                    onChange={(e) =>
                      setConfigForm((p) => ({ ...p, whatsappNumber: e.target.value }))
                    }
                    placeholder="e.g. 919876543210"
                    required
                  />
                  <small>
                    Example: <code>919876543210</code> for India (+91) or <code>14155552671</code>{' '}
                    for US (+1). All customer orders will open{' '}
                    <code>https://wa.me/{configForm.whatsappNumber || '919876543210'}</code>.
                  </small>
                </div>

                <div className="form-field">
                  <label>Default WhatsApp Order Greeting Message</label>
                  <input
                    type="text"
                    value={configForm.whatsappGreeting || ''}
                    onChange={(e) =>
                      setConfigForm((p) => ({ ...p, whatsappGreeting: e.target.value }))
                    }
                  />
                </div>

                <a
                  href={`https://wa.me/${String(configForm.whatsappNumber || '').replace(/[^0-9]/g, '')}?text=${encodeURIComponent('Hello Teeto Labels! Testing WhatsApp checkout integration.')}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn-test-whatsapp"
                >
                  <ExternalLink size={15} /> Test Your WhatsApp Link (+
                  {configForm.whatsappNumber || '919876543210'})
                </a>
              </div>

              <div className="config-group">
                <h3>2. Brand Identity & Pricing Settings</h3>
                <div className="form-row-2">
                  <div className="form-field">
                    <label>Store / Brand Name</label>
                    <input
                      type="text"
                      value={configForm.brandName || ''}
                      onChange={(e) =>
                        setConfigForm((p) => ({ ...p, brandName: e.target.value }))
                      }
                    />
                  </div>
                  <div className="form-field">
                    <label>Currency Symbol</label>
                    <input
                      type="text"
                      value={configForm.currencySymbol || '₹'}
                      onChange={(e) =>
                        setConfigForm((p) => ({ ...p, currencySymbol: e.target.value }))
                      }
                    />
                  </div>
                </div>

                <div className="form-row-2">
                  <div className="form-field">
                    <label>Free Shipping Threshold</label>
                    <input
                      type="number"
                      value={configForm.freeShippingThreshold ?? 1499}
                      onChange={(e) =>
                        setConfigForm((p) => ({ ...p, freeShippingThreshold: e.target.value }))
                      }
                    />
                  </div>
                  <div className="form-field">
                    <label>Standard Shipping Fee</label>
                    <input
                      type="number"
                      value={configForm.shippingFee ?? 99}
                      onChange={(e) =>
                        setConfigForm((p) => ({ ...p, shippingFee: e.target.value }))
                      }
                    />
                  </div>
                </div>

                <div className="form-field">
                  <label>Top Announcement Banner</label>
                  <input
                    type="text"
                    value={configForm.announcementBanner || ''}
                    onChange={(e) =>
                      setConfigForm((p) => ({ ...p, announcementBanner: e.target.value }))
                    }
                  />
                </div>

                <div className="form-field">
                  <label>Hero Headline</label>
                  <input
                    type="text"
                    value={configForm.heroTitle || ''}
                    onChange={(e) =>
                      setConfigForm((p) => ({ ...p, heroTitle: e.target.value }))
                    }
                  />
                </div>

                <div className="form-field">
                  <label>Hero Subtitle</label>
                  <textarea
                    rows={2}
                    value={configForm.heroSubtitle || ''}
                    onChange={(e) =>
                      setConfigForm((p) => ({ ...p, heroSubtitle: e.target.value }))
                    }
                  />
                </div>
              </div>

              <div className="config-save-bar">
                <button type="submit" className="btn-primary-dark">
                  <Check size={16} /> Save Store & WhatsApp Configuration
                </button>
              </div>
            </form>
          </div>
        )}

        {/* ================================================================= */}
        {/* TAB 4: WHATSAPP ORDER INQUIRIES LOG                               */}
        {/* ================================================================= */}
        {activeTab === 'orders' && (
          <div className="admin-section">
            <div className="section-heading-row">
              <div>
                <h2>WhatsApp Order Inquiries Log</h2>
                <p>
                  Every time a shopper clicks &ldquo;Place Order on WhatsApp&rdquo;, a copy of the
                  cart inquiry is recorded here for easy tracking.
                </p>
              </div>
              <button className="btn-ghost" onClick={fetchOrders}>
                <RefreshCw size={15} /> Refresh
              </button>
            </div>

            {orders.length === 0 ? (
              <div className="admin-card empty-orders-card">
                <MessageSquare size={36} />
                <h3>No WhatsApp orders logged yet</h3>
                <p>
                  Try adding a T-Shirt or Shirt to the shopping bag on the storefront and clicking
                  &ldquo;Place Order on WhatsApp&rdquo;!
                </p>
              </div>
            ) : (
              <div className="orders-list">
                {orders.map((ord) => (
                  <div key={ord.id} className="admin-card order-log-card">
                    <div className="order-log-header">
                      <div>
                        <strong>Order #{ord.id}</strong>
                        <span className="order-date">
                          {new Date(ord.createdAt).toLocaleString()}
                        </span>
                      </div>
                      <div className="order-status-controls">
                        <select
                          value={ord.status}
                          onChange={(e) => handleUpdateOrderStatus(ord.id, e.target.value)}
                        >
                          <option value="Initiated on WhatsApp">Initiated on WhatsApp</option>
                          <option value="Confirmed & Paid">Confirmed & Paid</option>
                          <option value="Dispatched">Dispatched</option>
                          <option value="Completed">Completed</option>
                          <option value="Cancelled">Cancelled</option>
                        </select>
                      </div>
                    </div>
                    <div className="order-customer-bar">
                      <span>
                        <strong>Customer:</strong> {ord.customerName || 'Guest Shopper'}
                      </span>
                      {ord.customerPhone && (
                        <span>
                          <strong>Phone:</strong> {ord.customerPhone}
                        </span>
                      )}
                      {ord.customerAddress && (
                        <span>
                          <strong>Address:</strong> {ord.customerAddress}
                        </span>
                      )}
                      <span>
                        <strong>Total:</strong> {storeData.config?.currencySymbol || '₹'}
                        {Number(ord.total).toLocaleString()}
                      </span>
                    </div>
                    <div className="order-items-mini">
                      {(ord.items || []).map((it, idx) => (
                        <span key={idx} className="order-item-chip">
                          {it.quantity}× {it.name} ({it.selectedSize}, {it.selectedColor})
                        </span>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ================================================================= */}
        {/* TAB 5: 0-COST STORAGE ARCHITECTURE & JSON BACKUP                  */}
        {/* ================================================================= */}
        {activeTab === 'storage' && (
          <div className="admin-section">
            <div className="section-heading-row">
              <div>
                <h2>0-Cost Storage Architecture & JSON Data Management</h2>
                <p>
                  Compare NoSQL vs. Structured File Storage and export/import your entire Teeto
                  Labels catalog as a portable JSON file at $0 cost.
                </p>
              </div>
            </div>

            <div className="storage-cards-grid">
              <div className="admin-card">
                <h3>Live JSON Document Store Status</h3>
                {storageInfo ? (
                  <div className="storage-stats-list">
                    <div className="stat-line">
                      <span>Active Engine:</span>
                      <strong>{storageInfo.storageEngine}</strong>
                    </div>
                    <div className="stat-line">
                      <span>Database File Path:</span>
                      <code>{storageInfo.filePath}</code>
                    </div>
                    <div className="stat-line">
                      <span>File Size:</span>
                      <strong>{(storageInfo.fileSizeBytes / 1024).toFixed(2)} KB</strong>
                    </div>
                    <div className="stat-line">
                      <span>Dynamic Categories / Subcategories:</span>
                      <strong>
                        {storageInfo.counts.categories} Categories /{' '}
                        {storageInfo.counts.subcategories} Subcategories
                      </strong>
                    </div>
                    <div className="stat-line">
                      <span>Products & Media Items:</span>
                      <strong>
                        {storageInfo.counts.products} Products ({storageInfo.counts.totalMediaItems}{' '}
                        Photos/Videos)
                      </strong>
                    </div>
                  </div>
                ) : (
                  <p>Loading storage info...</p>
                )}

                <div className="storage-backup-actions">
                  <button type="button" className="btn-primary-dark" onClick={handleExportJson}>
                    <Download size={16} /> Export Full Store JSON File
                  </button>

                  <label className="btn-upload-json">
                    <FileUp size={16} /> Import / Restore from JSON File
                    <input
                      type="file"
                      accept=".json,application/json"
                      onChange={handleImportJson}
                      hidden
                    />
                  </label>
                </div>
              </div>

              <div className="admin-card best-practice-card">
                <h3>
                  <Sparkles size={18} /> Best Practice Guide: 0-Cost Storage (JSON File vs. NoSQL)
                </h3>
                <ul className="best-practice-list">
                  <li>
                    <strong>Why Structured JSON File (Current Setup) is Best Now:</strong> Instead of
                    plain unstructured <code>.txt</code> files, Teeto Labels uses a{' '}
                    <strong>NoSQL-structured JSON document file</strong> (
                    <code>teeto-store-db.json</code>) managed by the Node.js server with{' '}
                    <em>atomic temp-file writes</em>. It costs <strong>$0</strong>, requires zero
                    external database accounts, naturally stores nested subcategories & arrays of
                    images/videos, and can be backed up with 1 click.
                  </li>
                  <li>
                    <strong>Media Handling (Lots of Images & Videos):</strong> Storing raw video
                    binaries inside a JSON/text file would bloat memory. Best practice is storing
                    the image/video files on disk (<code>server/uploads/</code>) or free CDNs
                    (Cloudinary / Cloudflare R2 Free Tier) and storing only their{' '}
                    <strong>URLs & metadata</strong> inside the JSON document.
                  </li>
                  <li>
                    <strong>Seamless Future Database Upgrade:</strong> Because all reads/writes go
                    through <code>server/storage.js</code> using document IDs, upgrading to{' '}
                    <strong>MongoDB Atlas (Free 512MB M0 Tier)</strong> or{' '}
                    <strong>Firebase Firestore (Free Tier)</strong> when you add customer logins
                    later requires zero changes to the React UI!
                  </li>
                </ul>
              </div>
            </div>
          </div>
        )}

        {/* ================================================================= */}
        {/* TAB 6: SUPERADMIN-ONLY ADMIN LOGINS MANAGER                       */}
        {/* ================================================================= */}
        {activeTab === 'users' && (
          <div className="admin-section">
            <div className="section-heading-row">
              <div>
                <h2>Admin Login Management (Superadmin Exclusive)</h2>
                <p>
                  Store management is done by Admins, and only <strong>Superadmins</strong> can add,
                  reset, or remove Admin login accounts.
                </p>
              </div>
            </div>

            {currentUser.role !== 'superadmin' ? (
              <div className="admin-card superadmin-restricted-card">
                <ShieldAlert size={42} />
                <h3>Superadmin Permission Required</h3>
                <p>
                  You are currently signed in as <strong>@{currentUser.username}</strong> with the{' '}
                  <code>admin</code> role. As per Teeto Labels security policy,{' '}
                  <strong>Admins</strong> can manage all categories, subcategories, products,
                  images/videos, and WhatsApp settings, but{' '}
                  <strong>only Superadmins can create or manage login accounts</strong>.
                </p>
                <p className="hint-switch">
                  To test adding new Admin logins, click <strong>Sign Out</strong> in the top right
                  and sign in with the <strong>Superadmin</strong> account (
                  <code>superadmin</code> / <code>superadmin123</code>).
                </p>
              </div>
            ) : (
              <div className="superadmin-users-grid">
                <form onSubmit={handleCreateAdminUser} className="admin-card">
                  <h3>
                    <Plus size={18} /> Create New Admin Login
                  </h3>
                  <div className="form-field">
                    <label>Full Name / Role Title</label>
                    <input
                      type="text"
                      placeholder="e.g. Priya (Catalog Admin)"
                      value={newAdminForm.name}
                      onChange={(e) => setNewAdminForm((p) => ({ ...p, name: e.target.value }))}
                      required
                    />
                  </div>
                  <div className="form-field">
                    <label>Login Username</label>
                    <input
                      type="text"
                      placeholder="e.g. priya_admin"
                      value={newAdminForm.username}
                      onChange={(e) =>
                        setNewAdminForm((p) => ({ ...p, username: e.target.value }))
                      }
                      required
                    />
                  </div>
                  <div className="form-field">
                    <label>Initial Password (min 6 characters)</label>
                    <input
                      type="password"
                      placeholder="Enter strong password"
                      value={newAdminForm.password}
                      onChange={(e) =>
                        setNewAdminForm((p) => ({ ...p, password: e.target.value }))
                      }
                      required
                    />
                  </div>
                  <div className="form-field">
                    <label>Account Role</label>
                    <select
                      value={newAdminForm.role}
                      onChange={(e) => setNewAdminForm((p) => ({ ...p, role: e.target.value }))}
                    >
                      <option value="admin">
                        Admin (Manage Categories, Subcategories, Products & WhatsApp)
                      </option>
                      <option value="superadmin">
                        Superadmin (Full Access + Can Create/Remove Admin Logins)
                      </option>
                    </select>
                  </div>
                  <button type="submit" className="btn-primary-dark">
                    <Plus size={16} /> Add Login Account
                  </button>
                </form>

                <div className="admin-card">
                  <h3>Existing Admin & Superadmin Accounts ({adminUsers.length})</h3>
                  <div className="admin-users-list">
                    {adminUsers.map((u) => (
                      <div key={u.id} className="admin-user-row">
                        <div className="admin-user-info">
                          <div className="admin-user-title">
                            <strong>{u.name}</strong>
                            <span className={`role-badge ${u.role}`}>{u.role.toUpperCase()}</span>
                            {!u.active && <span className="inactive-badge">Deactivated</span>}
                          </div>
                          <small>
                            Username: <code>@{u.username}</code> • Created:{' '}
                            {new Date(u.createdAt).toLocaleDateString()}
                          </small>

                          <div className="reset-pwd-inline">
                            <input
                              type="password"
                              placeholder="New password..."
                              value={resetPwdMap[u.id] || ''}
                              onChange={(e) =>
                                setResetPwdMap((prev) => ({ ...prev, [u.id]: e.target.value }))
                              }
                            />
                            <button
                              type="button"
                              className="btn-xs"
                              onClick={() => handleResetUserPassword(u.id, u.username)}
                            >
                              Reset Password
                            </button>
                          </div>
                        </div>

                        <div className="admin-user-actions">
                          <button
                            type="button"
                            className="btn-xs-outline"
                            onClick={() => handleToggleUserActive(u)}
                          >
                            {u.active ? 'Deactivate' : 'Activate'}
                          </button>
                          {u.id !== currentUser.id && (
                            <button
                              type="button"
                              className="icon-btn danger"
                              onClick={() => handleDeleteAdminUser(u)}
                              title="Delete Login"
                            >
                              <Trash2 size={15} />
                            </button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </main>

      {/* ================================================================= */}
      {/* MODAL: CREATE / EDIT PRODUCT WITH MULTI-IMAGE & VIDEO GALLERY     */}
      {/* ================================================================= */}
      {isProductModalOpen && (
        <div className="modal-backdrop" onClick={() => setIsProductModalOpen(false)}>
          <div
            className="admin-product-modal"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="admin-modal-header">
              <h3>
                {editingProduct
                  ? `Edit Product: ${editingProduct.name}`
                  : 'Create New T-Shirt / Shirt Product'}
              </h3>
              <button
                type="button"
                className="icon-btn"
                onClick={() => setIsProductModalOpen(false)}
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveProduct} className="admin-product-form">
              <div className="form-row-3">
                <div className="form-field">
                  <label>Product Title *</label>
                  <input
                    type="text"
                    value={productForm.name}
                    onChange={(e) => setProductForm((p) => ({ ...p, name: e.target.value }))}
                    placeholder="e.g. Acid Wash Heavy Oversized Tee"
                    required
                  />
                </div>
                <div className="form-field">
                  <label>SKU / Code</label>
                  <input
                    type="text"
                    value={productForm.sku}
                    onChange={(e) => setProductForm((p) => ({ ...p, sku: e.target.value }))}
                    placeholder="TL-TS-09"
                  />
                </div>
                <div className="form-field">
                  <label>Highlight Badge</label>
                  <input
                    type="text"
                    value={productForm.badge}
                    onChange={(e) => setProductForm((p) => ({ ...p, badge: e.target.value }))}
                    placeholder="e.g. Best Seller, New Drop, Oversized"
                  />
                </div>
              </div>

              {/* Dynamic Category & Subcategory Selection */}
              <div className="form-row-4">
                <div className="form-field">
                  <label>Main Category *</label>
                  <select
                    value={productForm.categoryId}
                    onChange={(e) => {
                      const newCatId = e.target.value;
                      const catObj = storeData.categories?.find((c) => c.id === newCatId);
                      setProductForm((p) => ({
                        ...p,
                        categoryId: newCatId,
                        subcategoryId: catObj?.subcategories?.[0]?.id || ''
                      }));
                    }}
                    required
                  >
                    {(storeData.categories || []).map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="form-field">
                  <label>Subcategory (Dynamic)</label>
                  <select
                    value={productForm.subcategoryId}
                    onChange={(e) =>
                      setProductForm((p) => ({ ...p, subcategoryId: e.target.value }))
                    }
                  >
                    <option value="">-- All / General --</option>
                    {(selectedCategoryForModal?.subcategories || []).map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="form-field">
                  <label>Selling Price ({storeData.config?.currencySymbol || '₹'}) *</label>
                  <input
                    type="number"
                    value={productForm.price}
                    onChange={(e) => setProductForm((p) => ({ ...p, price: e.target.value }))}
                    required
                  />
                </div>

                <div className="form-field">
                  <label>Original MRP ({storeData.config?.currencySymbol || '₹'})</label>
                  <input
                    type="number"
                    value={productForm.originalPrice}
                    onChange={(e) =>
                      setProductForm((p) => ({ ...p, originalPrice: e.target.value }))
                    }
                  />
                </div>
              </div>

              <div className="form-row-2">
                <div className="form-field">
                  <label>Fabric & GSM Specification</label>
                  <input
                    type="text"
                    value={productForm.fabric}
                    onChange={(e) => setProductForm((p) => ({ ...p, fabric: e.target.value }))}
                    placeholder="e.g. 260 GSM 100% French Terry Cotton"
                  />
                </div>
                <div className="form-field">
                  <label>Fit / Silhouette</label>
                  <input
                    type="text"
                    value={productForm.fit}
                    onChange={(e) => setProductForm((p) => ({ ...p, fit: e.target.value }))}
                    placeholder="e.g. Drop-Shoulder Oversized Fit"
                  />
                </div>
              </div>

              <div className="form-row-2">
                <div className="form-field">
                  <label>Available Sizes (Click to toggle or type custom sizes)</label>
                  <div className="admin-size-preset-pills">
                    {['XS', 'S', 'M', 'L', 'XL', 'XXL', '3XL', '38', '40', '42', '44'].map(
                      (presetSz) => {
                        const currentSizes = productForm.sizesText
                          .split(',')
                          .map((s) => s.trim())
                          .filter(Boolean);
                        const isSelected = currentSizes.includes(presetSz);
                        return (
                          <button
                            key={presetSz}
                            type="button"
                            className={`admin-size-chip ${isSelected ? 'active' : ''}`}
                            onClick={() => {
                              const nextSizes = isSelected
                                ? currentSizes.filter((s) => s !== presetSz)
                                : [...currentSizes, presetSz];
                              setProductForm((p) => ({
                                ...p,
                                sizesText: nextSizes.join(', ')
                              }));
                            }}
                          >
                            {isSelected ? `✓ ${presetSz}` : `+ ${presetSz}`}
                          </button>
                        );
                      }
                    )}
                  </div>
                  <input
                    type="text"
                    value={productForm.sizesText}
                    onChange={(e) => setProductForm((p) => ({ ...p, sizesText: e.target.value }))}
                    placeholder="S, M, L, XL, XXL"
                  />
                </div>
                <div className="form-field">
                  <label>Available Colors (comma-separated)</label>
                  <input
                    type="text"
                    value={productForm.colorsText}
                    onChange={(e) => setProductForm((p) => ({ ...p, colorsText: e.target.value }))}
                    placeholder="Obsidian Black, Ivory Sand, Olive"
                  />
                </div>
              </div>

              <div className="form-field">
                <label>Product Description</label>
                <textarea
                  rows={2}
                  value={productForm.description}
                  onChange={(e) => setProductForm((p) => ({ ...p, description: e.target.value }))}
                  placeholder="Describe the craftsmanship, collar rib, drape, and styling..."
                />
              </div>

              <div className="checkbox-row">
                <label className="checkbox-label">
                  <input
                    type="checkbox"
                    checked={productForm.inStock}
                    onChange={(e) => setProductForm((p) => ({ ...p, inStock: e.target.checked }))}
                  />
                  <span>In Stock & Ready to Order</span>
                </label>
                <label className="checkbox-label">
                  <input
                    type="checkbox"
                    checked={productForm.featured}
                    onChange={(e) => setProductForm((p) => ({ ...p, featured: e.target.checked }))}
                  />
                  <span>Featured Product</span>
                </label>
              </div>

              {/* MULTI-IMAGE & VIDEO MANAGER */}
              <div className="media-manager-box">
                <div className="media-manager-header">
                  <div>
                    <h4>
                      Product Images & Videos Gallery ({productForm.media.length} items)
                    </h4>
                    <p>
                      Upload multiple photos and videos from your device or paste image/video URLs.
                      First item is the cover thumbnail.
                    </p>
                  </div>

                  <label className="btn-upload-media">
                    <Upload size={16} />
                    <span>{uploadingFiles ? 'Uploading...' : 'Upload Images / Videos'}</span>
                    <input
                      type="file"
                      multiple
                      accept="image/*,video/*"
                      onChange={handleFileUpload}
                      disabled={uploadingFiles}
                      hidden
                    />
                  </label>
                </div>

                {/* Add Media via URL */}
                <div className="add-media-url-bar">
                  <select
                    value={newMediaType}
                    onChange={(e) => setNewMediaType(e.target.value)}
                  >
                    <option value="image">Image URL</option>
                    <option value="video">Video URL (.mp4 / .webm)</option>
                  </select>
                  <input
                    type="url"
                    placeholder="Paste Image or Video URL (https://...)"
                    value={newMediaUrl}
                    onChange={(e) => setNewMediaUrl(e.target.value)}
                  />
                  <input
                    type="text"
                    placeholder="Caption (e.g. Back View, Fabric Video)"
                    value={newMediaCaption}
                    onChange={(e) => setNewMediaCaption(e.target.value)}
                  />
                  <button
                    type="button"
                    className="btn-secondary-dark"
                    onClick={handleAddMediaByUrl}
                  >
                    <Plus size={15} /> Add URL
                  </button>
                </div>

                {/* Media Preview Grid */}
                <div className="admin-media-grid">
                  {productForm.media.map((m, idx) => (
                    <div key={m.id || idx} className="admin-media-card">
                      <div className="admin-media-preview">
                        {m.type === 'video' ? (
                          <video src={m.url} controls muted preload="metadata" />
                        ) : (
                          <img src={m.url} alt={m.caption || 'Media'} />
                        )}
                        <span className={`media-type-tag ${m.type}`}>
                          {m.type === 'video' ? 'VIDEO' : idx === 0 ? 'COVER PHOTO' : 'PHOTO'}
                        </span>
                      </div>
                      <div className="admin-media-card-footer">
                        <span className="media-caption-text" title={m.caption}>
                          {m.caption || `Media #${idx + 1}`}
                        </span>
                        <div className="media-item-controls">
                          <button
                            type="button"
                            onClick={() => handleMoveMediaItem(idx, -1)}
                            disabled={idx === 0}
                            title="Move earlier"
                          >
                            <ArrowUp size={13} />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleMoveMediaItem(idx, 1)}
                            disabled={idx === productForm.media.length - 1}
                            title="Move later"
                          >
                            <ArrowDown size={13} />
                          </button>
                          <button
                            type="button"
                            className="danger"
                            onClick={() => handleRemoveMediaItem(idx)}
                            title="Remove media"
                          >
                            <Trash2 size={13} />
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                  {productForm.media.length === 0 && (
                    <div className="empty-media-notice">
                      No images or videos added yet. Upload files or add a URL above!
                    </div>
                  )}
                </div>
              </div>

              <div className="admin-modal-footer">
                <button
                  type="button"
                  className="btn-ghost"
                  onClick={() => setIsProductModalOpen(false)}
                >
                  Cancel
                </button>
                <button type="submit" className="btn-primary-dark">
                  <Check size={16} />{' '}
                  {editingProduct ? 'Save Product Changes' : 'Publish Product to Store'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
