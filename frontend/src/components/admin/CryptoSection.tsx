import { useState, useEffect } from 'react';
import { DataTable } from '@/components/common/DataTable';
import { Badge } from '@/components/common/Badge';
import { Modal } from '@/components/common/Modal';
import { Input } from '@/components/common/Input';
import { Button } from '@/components/common/Button';
import toast from 'react-hot-toast';
import { MdAdd, MdEdit, MdDelete, MdCheck, MdClose, MdContentCopy } from 'react-icons/md';
import { FaBitcoin, FaEthereum } from 'react-icons/fa';
import { SiTether } from 'react-icons/si';
import { cryptoApi, type CryptoWallet, type CreditPurchase, type CreateWalletRequest } from '@/api/endpoints/crypto.api';

const CRYPTO_ICONS: Record<string, React.ReactNode> = {
  BTC: <FaBitcoin className="text-orange-500" />,
  ETH: <FaEthereum className="text-blue-400" />,
  USDT: <SiTether className="text-green-500" />,
  USDC: <span className="text-blue-500 font-bold text-sm">$</span>,
};

export function CryptoSection() {
  const [wallets, setWallets] = useState<CryptoWallet[]>([]);
  const [purchases, setPurchases] = useState<CreditPurchase[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'wallets' | 'purchases'>('wallets');
  const [statusFilter, setStatusFilter] = useState<string>('');

  // Wallet modal state
  const [showWalletModal, setShowWalletModal] = useState(false);
  const [editingWallet, setEditingWallet] = useState<CryptoWallet | null>(null);
  const [walletForm, setWalletForm] = useState<CreateWalletRequest>({
    crypto_type: 'USDT',
    network: 'TRC20',
    wallet_address: '',
    is_active: true,
  });
  const [saving, setSaving] = useState(false);

  // Purchase action modal
  const [showPurchaseModal, setShowPurchaseModal] = useState(false);
  const [selectedPurchase, setSelectedPurchase] = useState<CreditPurchase | null>(null);
  const [adminNotes, setAdminNotes] = useState('');

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    if (activeTab === 'purchases') {
      loadPurchases();
    }
  }, [statusFilter]);

  const loadData = async () => {
    setLoading(true);
    try {
      const [walletsData, purchasesData] = await Promise.all([
        cryptoApi.getWallets(),
        cryptoApi.getPurchases(),
      ]);
      setWallets(walletsData);
      setPurchases(purchasesData);
    } catch (error) {
      console.error('Failed to load crypto data:', error);
      toast.error('Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  const loadPurchases = async () => {
    try {
      const data = await cryptoApi.getPurchases(statusFilter || undefined);
      setPurchases(data);
    } catch (error) {
      toast.error('Failed to load purchases');
    }
  };

  const handleSaveWallet = async () => {
    if (!walletForm.wallet_address.trim()) {
      toast.error('Wallet address is required');
      return;
    }

    setSaving(true);
    try {
      if (editingWallet) {
        await cryptoApi.updateWallet(editingWallet.id, walletForm);
        toast.success('Wallet updated successfully');
      } else {
        await cryptoApi.createWallet(walletForm);
        toast.success('Wallet added successfully');
      }
      setShowWalletModal(false);
      setEditingWallet(null);
      resetWalletForm();
      loadData();
    } catch (error: any) {
      toast.error(error?.response?.data?.detail || 'Failed to save wallet');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteWallet = async (wallet: CryptoWallet) => {
    if (!confirm(`Delete ${wallet.crypto_type} wallet?`)) return;

    try {
      await cryptoApi.deleteWallet(wallet.id);
      toast.success('Wallet deleted');
      loadData();
    } catch (error: any) {
      toast.error(error?.response?.data?.detail || 'Failed to delete wallet');
    }
  };

  const handlePurchaseAction = async (action: 'confirm' | 'reject') => {
    if (!selectedPurchase) return;

    setSaving(true);
    try {
      const result = await cryptoApi.confirmPurchase(selectedPurchase.id, {
        action,
        admin_notes: adminNotes || undefined,
      });
      toast.success(result.message);
      setShowPurchaseModal(false);
      setSelectedPurchase(null);
      setAdminNotes('');
      loadData();
    } catch (error: any) {
      toast.error(error?.response?.data?.detail || 'Action failed');
    } finally {
      setSaving(false);
    }
  };

  const resetWalletForm = () => {
    setWalletForm({
      crypto_type: 'USDT',
      network: 'TRC20',
      wallet_address: '',
      is_active: true,
    });
  };

  const openEditWallet = (wallet: CryptoWallet) => {
    setEditingWallet(wallet);
    setWalletForm({
      crypto_type: wallet.crypto_type,
      network: wallet.network || '',
      wallet_address: wallet.wallet_address,
      is_active: wallet.is_active,
    });
    setShowWalletModal(true);
  };

  const openPurchaseAction = (purchase: CreditPurchase) => {
    setSelectedPurchase(purchase);
    setAdminNotes('');
    setShowPurchaseModal(true);
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success('Copied to clipboard');
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending':
        return <Badge variant="warning">Pending</Badge>;
      case 'confirmed':
        return <Badge variant="success">Confirmed</Badge>;
      case 'rejected':
        return <Badge variant="danger">Rejected</Badge>;
      case 'expired':
        return <Badge variant="secondary">Expired</Badge>;
      default:
        return <Badge>{status}</Badge>;
    }
  };

  // Wallet columns
  const walletColumns = [
    {
      key: 'crypto_type',
      label: 'Currency',
      render: (wallet: CryptoWallet) => (
        <div className="flex items-center gap-2">
          <span className="text-xl">{CRYPTO_ICONS[wallet.crypto_type] || wallet.crypto_type}</span>
          <span className="font-medium">{wallet.crypto_type}</span>
          {wallet.network && (
            <span className="text-xs text-gray-400">({wallet.network})</span>
          )}
        </div>
      ),
    },
    {
      key: 'wallet_address',
      label: 'Wallet Address',
      render: (wallet: CryptoWallet) => (
        <div className="flex items-center gap-2">
          <code className="text-sm bg-dark-400 px-2 py-1 rounded max-w-[300px] truncate">
            {wallet.wallet_address}
          </code>
          <button
            onClick={() => copyToClipboard(wallet.wallet_address)}
            className="text-emerald-500 hover:text-emerald-400"
          >
            <MdContentCopy />
          </button>
        </div>
      ),
    },
    {
      key: 'is_active',
      label: 'Status',
      render: (wallet: CryptoWallet) => (
        <Badge variant={wallet.is_active ? 'success' : 'secondary'}>
          {wallet.is_active ? 'Active' : 'Inactive'}
        </Badge>
      ),
    },
    {
      key: 'actions',
      label: 'Actions',
      render: (wallet: CryptoWallet) => (
        <div className="flex gap-2">
          <button
            onClick={() => openEditWallet(wallet)}
            className="p-2 text-blue-400 hover:bg-blue-900/20 rounded"
          >
            <MdEdit />
          </button>
          <button
            onClick={() => handleDeleteWallet(wallet)}
            className="p-2 text-red-400 hover:bg-red-900/20 rounded"
          >
            <MdDelete />
          </button>
        </div>
      ),
    },
  ];

  // Purchase columns
  const purchaseColumns = [
    {
      key: 'reference_code',
      label: 'Reference',
      render: (p: CreditPurchase) => (
        <span className="font-mono text-emerald-400">{p.reference_code}</span>
      ),
    },
    {
      key: 'client',
      label: 'Client',
      render: (p: CreditPurchase) => (
        <div>
          <div className="font-medium">{p.client?.username || 'Unknown'}</div>
          {p.client?.full_name && (
            <div className="text-xs text-gray-400">{p.client.full_name}</div>
          )}
        </div>
      ),
    },
    {
      key: 'amount',
      label: 'Amount',
      render: (p: CreditPurchase) => (
        <div>
          <div className="font-medium">${p.usd_amount.toFixed(2)}</div>
          <div className="text-xs text-gray-400">
            {p.crypto_amount} {p.crypto_type}
          </div>
        </div>
      ),
    },
    {
      key: 'credits',
      label: 'Credits',
      render: (p: CreditPurchase) => (
        <span className="text-emerald-400 font-medium">
          +{p.credits_amount.toLocaleString()}
        </span>
      ),
    },
    {
      key: 'tx_hash',
      label: 'TX Hash',
      render: (p: CreditPurchase) => (
        p.tx_hash ? (
          <div className="flex items-center gap-1">
            <code className="text-xs bg-dark-400 px-2 py-1 rounded max-w-[120px] truncate">
              {p.tx_hash}
            </code>
            <button
              onClick={() => copyToClipboard(p.tx_hash!)}
              className="text-emerald-500 hover:text-emerald-400"
            >
              <MdContentCopy size={14} />
            </button>
          </div>
        ) : (
          <span className="text-gray-500">Not submitted</span>
        )
      ),
    },
    {
      key: 'status',
      label: 'Status',
      render: (p: CreditPurchase) => getStatusBadge(p.status),
    },
    {
      key: 'created_at',
      label: 'Date',
      render: (p: CreditPurchase) => (
        <span className="text-sm text-gray-400">
          {new Date(p.created_at).toLocaleDateString()}
        </span>
      ),
    },
    {
      key: 'actions',
      label: 'Actions',
      render: (p: CreditPurchase) => (
        p.status === 'pending' ? (
          <button
            onClick={() => openPurchaseAction(p)}
            className="px-3 py-1 bg-emerald-600 hover:bg-emerald-700 rounded text-sm"
          >
            Review
          </button>
        ) : (
          <span className="text-gray-500">-</span>
        )
      ),
    },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-emerald-500">Crypto Payments</h1>
          <p className="text-gray-400">Manage crypto wallets and credit purchases</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-4 border-b border-dark-400">
        <button
          onClick={() => setActiveTab('wallets')}
          className={`pb-3 px-4 font-medium transition-colors ${
            activeTab === 'wallets'
              ? 'text-emerald-500 border-b-2 border-emerald-500'
              : 'text-gray-400 hover:text-gray-300'
          }`}
        >
          My Wallets ({wallets.length})
        </button>
        <button
          onClick={() => setActiveTab('purchases')}
          className={`pb-3 px-4 font-medium transition-colors ${
            activeTab === 'purchases'
              ? 'text-emerald-500 border-b-2 border-emerald-500'
              : 'text-gray-400 hover:text-gray-300'
          }`}
        >
          Purchase Requests ({purchases.filter(p => p.status === 'pending').length} pending)
        </button>
      </div>

      {/* Wallets Tab */}
      {activeTab === 'wallets' && (
        <div className="space-y-4">
          <div className="flex justify-end">
            <Button
              onClick={() => {
                resetWalletForm();
                setEditingWallet(null);
                setShowWalletModal(true);
              }}
              className="flex items-center gap-2"
            >
              <MdAdd /> Add Wallet
            </Button>
          </div>

          {wallets.length === 0 ? (
            <div className="text-center py-12 bg-dark-300 rounded-lg">
              <FaBitcoin className="text-5xl text-gray-600 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-400">No wallets configured</h3>
              <p className="text-gray-500 mb-4">Add your crypto wallet addresses to receive payments</p>
              <Button onClick={() => setShowWalletModal(true)}>
                <MdAdd className="mr-2" /> Add Your First Wallet
              </Button>
            </div>
          ) : (
            <DataTable
              columns={walletColumns}
              data={wallets}
              loading={loading}
            />
          )}
        </div>
      )}

      {/* Purchases Tab */}
      {activeTab === 'purchases' && (
        <div className="space-y-4">
          <div className="flex gap-4">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="bg-dark-400 border border-dark-300 rounded px-3 py-2 text-white"
            >
              <option value="">All Status</option>
              <option value="pending">Pending</option>
              <option value="confirmed">Confirmed</option>
              <option value="rejected">Rejected</option>
              <option value="expired">Expired</option>
            </select>
          </div>

          <DataTable
            columns={purchaseColumns}
            data={purchases}
            loading={loading}
          />
        </div>
      )}

      {/* Wallet Modal */}
      <Modal
        isOpen={showWalletModal}
        onClose={() => {
          setShowWalletModal(false);
          setEditingWallet(null);
        }}
        title={editingWallet ? 'Edit Wallet' : 'Add Wallet'}
      >
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">
              Cryptocurrency
            </label>
            <select
              value={walletForm.crypto_type}
              onChange={(e) => setWalletForm({ ...walletForm, crypto_type: e.target.value })}
              className="w-full bg-dark-400 border border-dark-300 rounded px-3 py-2 text-white"
            >
              <option value="USDT">USDT (Tether)</option>
              <option value="BTC">BTC (Bitcoin)</option>
              <option value="ETH">ETH (Ethereum)</option>
              <option value="USDC">USDC</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">
              Network
            </label>
            <select
              value={walletForm.network}
              onChange={(e) => setWalletForm({ ...walletForm, network: e.target.value })}
              className="w-full bg-dark-400 border border-dark-300 rounded px-3 py-2 text-white"
            >
              {walletForm.crypto_type === 'USDT' && (
                <>
                  <option value="TRC20">TRC20 (Tron)</option>
                  <option value="ERC20">ERC20 (Ethereum)</option>
                  <option value="BEP20">BEP20 (BSC)</option>
                </>
              )}
              {walletForm.crypto_type === 'BTC' && (
                <option value="Bitcoin">Bitcoin Network</option>
              )}
              {walletForm.crypto_type === 'ETH' && (
                <option value="ERC20">Ethereum Network</option>
              )}
              {walletForm.crypto_type === 'USDC' && (
                <>
                  <option value="ERC20">ERC20 (Ethereum)</option>
                  <option value="TRC20">TRC20 (Tron)</option>
                </>
              )}
            </select>
          </div>

          <Input
            label="Wallet Address"
            value={walletForm.wallet_address}
            onChange={(e) => setWalletForm({ ...walletForm, wallet_address: e.target.value })}
            placeholder="Enter your wallet address"
          />

          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="is_active"
              checked={walletForm.is_active}
              onChange={(e) => setWalletForm({ ...walletForm, is_active: e.target.checked })}
              className="rounded bg-dark-400 border-dark-300"
            />
            <label htmlFor="is_active" className="text-sm text-gray-300">
              Active (visible to clients)
            </label>
          </div>

          <div className="flex gap-3 pt-4">
            <Button
              variant="secondary"
              onClick={() => setShowWalletModal(false)}
              className="flex-1"
            >
              Cancel
            </Button>
            <Button
              onClick={handleSaveWallet}
              loading={saving}
              className="flex-1"
            >
              {editingWallet ? 'Update' : 'Add'} Wallet
            </Button>
          </div>
        </div>
      </Modal>

      {/* Purchase Action Modal */}
      <Modal
        isOpen={showPurchaseModal}
        onClose={() => {
          setShowPurchaseModal(false);
          setSelectedPurchase(null);
        }}
        title="Review Purchase Request"
      >
        {selectedPurchase && (
          <div className="space-y-4">
            <div className="bg-dark-400 rounded-lg p-4 space-y-3">
              <div className="flex justify-between">
                <span className="text-gray-400">Reference:</span>
                <span className="font-mono text-emerald-400">{selectedPurchase.reference_code}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Client:</span>
                <span>{selectedPurchase.client?.username}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Amount:</span>
                <span>${selectedPurchase.usd_amount.toFixed(2)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Crypto:</span>
                <span>{selectedPurchase.crypto_amount} {selectedPurchase.crypto_type}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Credits:</span>
                <span className="text-emerald-400 font-medium">+{selectedPurchase.credits_amount.toLocaleString()}</span>
              </div>
              {selectedPurchase.tx_hash && (
                <div className="pt-2 border-t border-dark-300">
                  <span className="text-gray-400 text-sm">TX Hash:</span>
                  <code className="block text-sm bg-dark-500 p-2 rounded mt-1 break-all">
                    {selectedPurchase.tx_hash}
                  </code>
                </div>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">
                Admin Notes (optional)
              </label>
              <textarea
                value={adminNotes}
                onChange={(e) => setAdminNotes(e.target.value)}
                placeholder="Add notes about this transaction..."
                className="w-full bg-dark-400 border border-dark-300 rounded px-3 py-2 text-white h-20"
              />
            </div>

            <div className="flex gap-3 pt-4">
              <Button
                variant="danger"
                onClick={() => handlePurchaseAction('reject')}
                loading={saving}
                className="flex-1 flex items-center justify-center gap-2"
              >
                <MdClose /> Reject
              </Button>
              <Button
                onClick={() => handlePurchaseAction('confirm')}
                loading={saving}
                className="flex-1 flex items-center justify-center gap-2"
              >
                <MdCheck /> Confirm & Add Credits
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
