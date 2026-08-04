'use client';

import React, { useState, useEffect } from 'react';
import { Search, Filter, Download, RefreshCw, ChevronDown, Loader2, AlertCircle } from 'lucide-react';
import { Transaction, PaymentStatus } from '@/lib/payment-types';
import { db } from '@/lib/firebase';
import { collection, query, orderBy, onSnapshot } from 'firebase/firestore';

interface PaymentDashboardProps {
  title?: string;
  showAnalytics?: boolean;
}

const toDate = (ts: any): Date => {
  if (!ts) return new Date();
  if (typeof ts.toDate === 'function') return ts.toDate();
  if (typeof ts.seconds === 'number') return new Date(ts.seconds * 1000);
  return new Date(ts);
};

// Normalize the stored payment method into a stable provider key
const mapProvider = (order: any): string => {
  const method = (order.paymentMethod || '').toLowerCase();
  if (method.includes('baridi')) return 'baridimob';
  if (method.includes('chargily')) return 'chargily';
  if (method.includes('en ligne') || method.includes('carte') || method.includes('cb')) return 'online';
  return 'cod';
};

// Derive a payment status from the order's verification data
const mapStatus = (order: any): PaymentStatus => {
  const verdict = order.aiVerification?.verdict;
  if (verdict === 'approved') return 'succeeded';
  if (verdict === 'rejected') return 'failed';
  if (verdict === 'needs_manual_review') return 'processing';
  if (order.paymentStatus === 'refunded' || order.status === 'Remboursé') return 'refunded';
  if (order.paymentStatus === 'Envoyé' || order.paymentStatus === 'paid' || order.paymentStatus === 'Confirmé') {
    return 'processing';
  }
  return 'pending';
};

export const PaymentDashboard: React.FC<PaymentDashboardProps> = ({
  title = 'Tableau de bord des paiements',
  showAnalytics = true,
}) => {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<PaymentStatus | 'all'>('all');
  const [providerFilter, setProviderFilter] = useState<string>('all');
  const [sortBy, setSortBy] = useState<'date' | 'amount'>('date');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

  useEffect(() => {
    // Live-load payment-related fields from the orders collection
    const q = query(collection(db, 'orders'), orderBy('createdAt', 'desc'));
    const unsub = onSnapshot(
      q,
      (snap) => {
        const fetched = snap.docs.map((d) => {
          const data = d.data();
          const order: Record<string, any> = { id: d.id, ...data };
          return {
            id: d.id,
            orderId: d.id,
            invoiceNumber: d.id.slice(-6).toUpperCase(),
            provider: mapProvider(order),
            amount: Number(order.total) || Number(order.paidAmount) || 0,
            currency: 'DA',
            status: mapStatus(order),
            createdAt: toDate(order.createdAt),
            userId: order.customerUserId || '',
            customerName: order.customerName || '',
          } as Transaction & { customerName: string };
        });
        setTransactions(fetched);
        setLoading(false);
        setError(null);
      },
      (err) => {
        console.error('Payment dashboard Firestore error:', err);
        setError('Échec du chargement des paiements.');
        setLoading(false);
      }
    );
    return () => unsub();
  }, []);

  const filteredTransactions = transactions.filter(t => {
    const matchesSearch =
      t.orderId.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (t.invoiceNumber || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (t as any).customerName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      t.userId.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesStatus = statusFilter === 'all' || t.status === statusFilter;
    const matchesProvider = providerFilter === 'all' || t.provider === providerFilter;

    return matchesSearch && matchesStatus && matchesProvider;
  });

  const sortedTransactions = [...filteredTransactions].sort((a, b) => {
    let comparison = 0;
    if (sortBy === 'date') {
      comparison = new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
    } else if (sortBy === 'amount') {
      comparison = a.amount - b.amount;
    }
    return sortOrder === 'asc' ? comparison : -comparison;
  });

  const handleExport = () => {
    const csv = [
      ['ID', 'Commande', 'Facture', 'Provider', 'Montant (DA)', 'Statut', 'Date', 'Client'],
      ...sortedTransactions.map(t => [
        t.id,
        t.orderId,
        t.invoiceNumber || '',
        t.provider,
        t.amount,
        t.status,
        new Date(t.createdAt).toLocaleDateString('fr-FR'),
        (t as any).customerName || t.userId,
      ]),
    ]
      .map(row => row.map(cell => `"${cell}"`).join(','))
      .join('\n');

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `transactions_${new Date().toISOString()}.csv`;
    a.click();
  };

  const totalAmount = sortedTransactions
    .filter(t => t.status === 'succeeded')
    .reduce((sum, t) => sum + t.amount, 0);

  const successCount = sortedTransactions.filter(t => t.status === 'succeeded').length;
  const failureCount = sortedTransactions.filter(t => t.status === 'failed').length;

  return (
    <div className="w-full space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold text-gray-900">{title}</h1>
        <button
          onClick={handleExport}
          className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
        >
          <Download className="w-4 h-4" />
          Exporter CSV
        </button>
      </div>

      {/* Quick Stats */}
      {showAnalytics && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="p-4 bg-gradient-to-br from-blue-500 to-blue-600 text-white rounded-lg">
            <p className="text-sm opacity-75">Transactions totales</p>
            <p className="text-3xl font-bold mt-2">{sortedTransactions.length}</p>
          </div>
          <div className="p-4 bg-gradient-to-br from-green-500 to-green-600 text-white rounded-lg">
            <p className="text-sm opacity-75">Paiements confirmés</p>
            <p className="text-3xl font-bold mt-2">{successCount}</p>
          </div>
          <div className="p-4 bg-gradient-to-br from-red-500 to-red-600 text-white rounded-lg">
            <p className="text-sm opacity-75">Paiements rejetés</p>
            <p className="text-3xl font-bold mt-2">{failureCount}</p>
          </div>
          <div className="p-4 bg-gradient-to-br from-purple-500 to-purple-600 text-white rounded-lg">
            <p className="text-sm opacity-75">Total des revenus</p>
            <p className="text-3xl font-bold mt-2">{totalAmount.toLocaleString()} DA</p>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="bg-white p-4 rounded-lg shadow space-y-4">
        <div className="flex gap-4 flex-wrap">
          {/* Search */}
          <div className="flex-1 min-w-200px">
            <div className="relative">
              <Search className="absolute left-3 top-3 w-5 h-5 text-gray-400" />
              <input
                type="text"
                placeholder="Chercher par commande, facture, client ou utilisateur..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-blue-500"
              />
            </div>
          </div>

          {/* Status Filter */}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as any)}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-blue-500"
          >
            <option value="all">Tous les statuts</option>
            <option value="succeeded">Confirmé</option>
            <option value="failed">Rejeté</option>
            <option value="processing">En vérification</option>
            <option value="pending">En attente</option>
            <option value="refunded">Remboursé</option>
          </select>

          {/* Provider Filter */}
          <select
            value={providerFilter}
            onChange={(e) => setProviderFilter(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-blue-500"
          >
            <option value="all">Tous les modes</option>
            <option value="cod">Paiement à la livraison</option>
            <option value="baridimob">BaridiMob</option>
            <option value="online">Paiement en ligne</option>
          </select>

          {/* Sort */}
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as any)}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-blue-500"
          >
            <option value="date">Trier par date</option>
            <option value="amount">Trier par montant</option>
          </select>

          <button
            onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
            className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
          >
            {sortOrder === 'asc' ? '↑' : '↓'}
          </button>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        {loading ? (
          <div className="p-8 text-center">
            <RefreshCw className="w-6 h-6 animate-spin mx-auto text-gray-400" />
            <p className="mt-2 text-gray-500">Chargement des transactions...</p>
          </div>
        ) : error ? (
          <div className="p-8 text-center text-red-500">
            <AlertCircle className="w-6 h-6 mx-auto mb-2" />
            <p>{error}</p>
          </div>
        ) : sortedTransactions.length === 0 ? (
          <div className="p-8 text-center text-gray-500">Aucune transaction trouvée</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">Commande</th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">Facture</th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">Mode</th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">Montant</th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">Statut</th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">Date</th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">Client</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {sortedTransactions.map((transaction) => (
                  <tr key={transaction.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-3 text-sm font-medium text-blue-600">#{transaction.orderId.slice(0, 8)}</td>
                    <td className="px-6 py-3 text-sm text-gray-600">{transaction.invoiceNumber || '-'}</td>
                    <td className="px-6 py-3 text-sm">
                      <span className="px-2 py-1 bg-gray-100 rounded text-xs font-medium">
                        {transaction.provider}
                      </span>
                    </td>
                    <td className="px-6 py-3 text-sm font-semibold">
                      {transaction.amount.toLocaleString()} {transaction.currency}
                    </td>
                    <td className="px-6 py-3 text-sm">
                      <span
                        className={`px-3 py-1 rounded-full text-xs font-medium ${
                          transaction.status === 'succeeded'
                            ? 'bg-green-100 text-green-800'
                            : transaction.status === 'failed'
                            ? 'bg-red-100 text-red-800'
                            : transaction.status === 'refunded'
                            ? 'bg-blue-100 text-blue-800'
                            : 'bg-yellow-100 text-yellow-800'
                        }`}
                      >
                        {transaction.status}
                      </span>
                    </td>
                    <td className="px-6 py-3 text-sm text-gray-600">
                      {new Date(transaction.createdAt).toLocaleDateString('fr-FR')}
                    </td>
                    <td className="px-6 py-3 text-sm text-gray-600">
                      {(transaction as any).customerName || transaction.userId || '-'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default PaymentDashboard;
