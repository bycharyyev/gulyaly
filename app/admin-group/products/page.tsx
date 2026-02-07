'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';

interface Product {
  id: string;
  name: string;
  description: string;
  image: string | null;
  status: string;
  rejectionReason: string | null;
  createdAt: string;
  store: {
    id: string;
    name: string;
    owner: {
      id: string;
      name: string | null;
      email: string;
    };
  };
  variants: {
    id: string;
    name: string;
    price: number;
  }[];
  _count: {
    orders: number;
  };
}

interface Stats {
  pending: number;
  active: number;
  rejected: number;
  total: number;
}

export default function AdminProductsPage() {
  const router = useRouter();
  const { data: session, status } = useSession();
  const [products, setProducts] = useState<Product[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState('PENDING_APPROVAL');
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState('');
  const [showRejectModal, setShowRejectModal] = useState<string | null>(null);

  useEffect(() => {
    if (status === 'loading') return;
    if (!session?.user) {
      router.push('/admin/login');
      return;
    }
    if ((session.user as any).role !== 'ADMIN') {
      router.push('/');
      return;
    }
    loadProducts();
  }, [session, status, router, filter]);

  const loadProducts = async () => {
    try {
      setLoading(true);
      const res = await fetch(`/api/admin/products?status=${filter}`);
      if (!res.ok) throw new Error('Failed to load products');
      const data = await res.json();
      setProducts(data.products || []);
      setStats(data.stats || null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error loading products');
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (productId: string) => {
    try {
      setProcessingId(productId);
      const res = await fetch(`/api/admin/products/${productId}/approve`, {
        method: 'PATCH'
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to approve');
      }
      setProducts(products.filter(p => p.id !== productId));
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Error');
    } finally {
      setProcessingId(null);
    }
  };

  const handleReject = async (productId: string) => {
    if (!rejectReason.trim() || rejectReason.length < 10) {
      alert('Please provide a reason (min 10 characters)');
      return;
    }
    try {
      setProcessingId(productId);
      const res = await fetch(`/api/admin/products/${productId}/reject`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason: rejectReason })
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to reject');
      }
      setProducts(products.filter(p => p.id !== productId));
      setShowRejectModal(null);
      setRejectReason('');
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Error');
    } finally {
      setProcessingId(null);
    }
  };

  const getStatusBadge = (status: string) => {
    const styles: Record<string, string> = {
      'PENDING_APPROVAL': 'bg-yellow-100 text-yellow-700',
      'ACTIVE': 'bg-green-100 text-green-700',
      'REJECTED': 'bg-red-100 text-red-700'
    };
    const labels: Record<string, string> = {
      'PENDING_APPROVAL': 'Pending Approval',
      'ACTIVE': 'Active',
      'REJECTED': 'Rejected'
    };
    return (
      <span className={`px-2 py-1 text-xs rounded-full ${styles[status] || 'bg-gray-100 text-gray-700'}`}>
        {labels[status] || status}
      </span>
    );
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-900">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-900 text-white">
      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold">Product Moderation</h1>
          <p className="text-gray-400 mt-1">Review and approve seller products</p>
        </div>

        {error && (
          <div className="bg-red-900/50 border border-red-700 text-red-200 px-4 py-3 rounded-lg mb-6">
            {error}
          </div>
        )}

        {/* Stats */}
        {stats && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
            <StatCard title="Pending" value={stats.pending} color="bg-yellow-900/50 text-yellow-200" />
            <StatCard title="Active" value={stats.active} color="bg-green-900/50 text-green-200" />
            <StatCard title="Rejected" value={stats.rejected} color="bg-red-900/50 text-red-200" />
            <StatCard title="Total" value={stats.total} color="bg-gray-800 text-gray-200" />
          </div>
        )}

        {/* Filter */}
        <div className="flex gap-2 mb-6">
          {['PENDING_APPROVAL', 'ACTIVE', 'REJECTED', 'ALL'].map(status => (
            <button
              key={status}
              onClick={() => setFilter(status)}
              className={`px-4 py-2 rounded-lg transition ${filter === status ? 'bg-blue-600 text-white' : 'bg-gray-800 text-gray-300 hover:bg-gray-700'}`}
            >
              {status === 'PENDING_APPROVAL' && 'Pending'}
              {status === 'ACTIVE' && 'Active'}
              {status === 'REJECTED' && 'Rejected'}
              {status === 'ALL' && 'All'}
            </button>
          ))}
        </div>

        {/* Products Table */}
        {products.length === 0 ? (
          <div className="bg-gray-800 rounded-lg p-12 text-center">
            <div className="text-6xl mb-4">📦</div>
            <h3 className="text-xl font-semibold mb-2">No products found</h3>
            <p className="text-gray-400">
              {filter === 'PENDING_APPROVAL' ? 'No products pending approval' : 'No products in this category'}
            </p>
          </div>
        ) : (
          <div className="bg-gray-800 rounded-lg overflow-hidden">
            <table className="w-full">
              <thead className="bg-gray-700">
                <tr>
                  <th className="px-6 py-4 text-left text-sm font-medium text-gray-300">Product</th>
                  <th className="px-6 py-4 text-left text-sm font-medium text-gray-300">Seller</th>
                  <th className="px-6 py-4 text-left text-sm font-medium text-gray-300">Price</th>
                  <th className="px-6 py-4 text-left text-sm font-medium text-gray-300">Status</th>
                  <th className="px-6 py-4 text-right text-sm font-medium text-gray-300">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-700">
                {products.map(product => (
                  <tr key={product.id} className="hover:bg-gray-700/50">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        {product.image ? (
                          <img src={product.image} alt={product.name} className="w-12 h-12 rounded-lg object-cover" />
                        ) : (
                          <div className="w-12 h-12 bg-gray-600 rounded-lg flex items-center justify-center text-2xl">
                            📦
                          </div>
                        )}
                        <div>
                          <p className="font-medium text-white">{product.name}</p>
                          <p className="text-sm text-gray-400 line-clamp-1">{product.description}</p>
                          <p className="text-xs text-gray-500">{product.store.name}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-300">
                      {product.store.owner.name || product.store.owner.email}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-300">
                      {product.variants?.length > 0 ? (
                        <span>
                          from {(Math.min(...product.variants.map(v => v.price)) / 100).toFixed(2)} ₽
                        </span>
                      ) : (
                        '—'
                      )}
                    </td>
                    <td className="px-6 py-4">
                      {getStatusBadge(product.status)}
                      {product.rejectionReason && (
                        <p className="text-xs text-red-400 mt-1">{product.rejectionReason}</p>
                      )}
                    </td>
                    <td className="px-6 py-4 text-right">
                      {product.status === 'PENDING_APPROVAL' && (
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => handleApprove(product.id)}
                            disabled={processingId === product.id}
                            className="px-3 py-1.5 text-sm bg-green-600 hover:bg-green-700 text-white rounded transition disabled:opacity-50"
                          >
                            {processingId === product.id ? '...' : 'Approve'}
                          </button>
                          <button
                            onClick={() => setShowRejectModal(product.id)}
                            disabled={processingId === product.id}
                            className="px-3 py-1.5 text-sm bg-red-600 hover:bg-red-700 text-white rounded transition disabled:opacity-50"
                          >
                            Reject
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Reject Modal */}
        {showRejectModal && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <div className="bg-gray-800 rounded-lg p-6 max-w-md w-full mx-4">
              <h3 className="text-xl font-semibold mb-4">Reject Product</h3>
              <p className="text-gray-400 mb-4">Please provide a reason for rejection (min 10 characters):</p>
              <textarea
                value={rejectReason}
                onChange={e => setRejectReason(e.target.value)}
                rows={4}
                className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 mb-4"
                placeholder="Reason for rejection..."
              />
              <div className="flex gap-4">
                <button
                  onClick={() => {
                    setShowRejectModal(null);
                    setRejectReason('');
                  }}
                  className="flex-1 px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition"
                >
                  Cancel
                </button>
                <button
                  onClick={() => handleReject(showRejectModal)}
                  disabled={processingId === showRejectModal}
                  className="flex-1 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition disabled:opacity-50"
                >
                  {processingId === showRejectModal ? 'Rejecting...' : 'Reject'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function StatCard({ title, value, color }: { title: string; value: number; color: string }) {
  return (
    <div className={`${color} rounded-lg p-4`}>
      <p className="text-sm opacity-80">{title}</p>
      <p className="text-2xl font-bold">{value}</p>
    </div>
  );
}
