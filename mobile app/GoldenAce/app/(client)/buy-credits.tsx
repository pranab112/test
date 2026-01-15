import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  RefreshControl,
  Modal,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Clipboard from 'expo-clipboard';
import { cryptoApi } from '../../src/api/crypto.api';
import { Card, Button, Loading, Badge, EmptyState } from '../../src/components/ui';
import { Colors, FontSize, FontWeight, Spacing, BorderRadius } from '../../src/constants/theme';
import type { CryptoWallet, CryptoPurchase, CryptoType, CreditRate } from '../../src/types';

const CRYPTO_INFO: Record<CryptoType, { name: string; icon: string; color: string }> = {
  BTC: { name: 'Bitcoin', icon: 'logo-bitcoin', color: '#F7931A' },
  ETH: { name: 'Ethereum', icon: 'diamond', color: '#627EEA' },
  USDT: { name: 'Tether', icon: 'cash', color: '#26A17B' },
  USDC: { name: 'USD Coin', icon: 'logo-usd', color: '#2775CA' },
};

export default function BuyCreditsScreen() {
  const [wallets, setWallets] = useState<CryptoWallet[]>([]);
  const [purchases, setPurchases] = useState<CryptoPurchase[]>([]);
  const [rates, setRates] = useState<CreditRate | null>(null);
  const [cryptoPrices, setCryptoPrices] = useState<Record<CryptoType, number>>({} as any);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Purchase form state
  const [showPurchaseModal, setShowPurchaseModal] = useState(false);
  const [selectedCrypto, setSelectedCrypto] = useState<CryptoType | null>(null);
  const [usdAmount, setUsdAmount] = useState('');
  const [creating, setCreating] = useState(false);

  // Payment details modal
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [currentPurchase, setCurrentPurchase] = useState<CryptoPurchase | null>(null);
  const [txHash, setTxHash] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const loadData = async () => {
    try {
      const [walletsData, purchasesData, ratesData] = await Promise.all([
        cryptoApi.getWallets(),
        cryptoApi.getMyPurchases(),
        cryptoApi.getRates(),
      ]);
      setWallets(walletsData);
      setPurchases(purchasesData);
      setRates(ratesData.rates);
      setCryptoPrices(ratesData.crypto_prices);
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  };

  useEffect(() => {
    loadData();
  }, []);

  const calculateCredits = (usd: number): number => {
    if (!rates) return 0;
    return Math.floor(usd * rates.credits_per_dollar);
  };

  const calculateCryptoAmount = (usd: number, crypto: CryptoType): string => {
    const price = cryptoPrices[crypto];
    if (!price) return '0';
    return (usd / price).toFixed(8);
  };

  const handleSelectCrypto = (crypto: CryptoType) => {
    setSelectedCrypto(crypto);
    setShowPurchaseModal(true);
  };

  const handleCreatePurchase = async () => {
    if (!selectedCrypto || !usdAmount) return;

    const amount = parseFloat(usdAmount);
    if (isNaN(amount) || amount <= 0) {
      Alert.alert('Error', 'Please enter a valid amount');
      return;
    }

    if (rates && amount < rates.min_purchase) {
      Alert.alert('Error', `Minimum purchase is $${rates.min_purchase}`);
      return;
    }

    if (rates && amount > rates.max_purchase) {
      Alert.alert('Error', `Maximum purchase is $${rates.max_purchase}`);
      return;
    }

    setCreating(true);
    try {
      const purchase = await cryptoApi.createPurchase({
        crypto_type: selectedCrypto,
        usd_amount: amount,
      });

      setPurchases([purchase, ...purchases]);
      setShowPurchaseModal(false);
      setUsdAmount('');
      setSelectedCrypto(null);

      // Show payment details
      setCurrentPurchase(purchase);
      setShowPaymentModal(true);
    } catch (error: any) {
      Alert.alert('Error', error?.detail || 'Failed to create purchase');
    } finally {
      setCreating(false);
    }
  };

  const handleViewPayment = (purchase: CryptoPurchase) => {
    setCurrentPurchase(purchase);
    setTxHash(purchase.tx_hash || '');
    setShowPaymentModal(true);
  };

  const handleSubmitTxHash = async () => {
    if (!currentPurchase || !txHash.trim()) {
      Alert.alert('Error', 'Please enter the transaction hash');
      return;
    }

    setSubmitting(true);
    try {
      const updated = await cryptoApi.submitTxHash(currentPurchase.id, txHash.trim());
      setPurchases(purchases.map(p => p.id === updated.id ? updated : p));
      setShowPaymentModal(false);
      Alert.alert('Success', 'Transaction submitted! Admin will verify and add credits.');
    } catch (error: any) {
      Alert.alert('Error', error?.detail || 'Failed to submit transaction');
    } finally {
      setSubmitting(false);
    }
  };

  const handleCopyAddress = async (address: string) => {
    await Clipboard.setStringAsync(address);
    Alert.alert('Copied!', 'Wallet address copied to clipboard');
  };

  const handleCopyReference = async (reference: string) => {
    await Clipboard.setStringAsync(reference);
    Alert.alert('Copied!', 'Reference code copied to clipboard');
  };

  const getStatusColor = (status: CryptoPurchase['status']): string => {
    switch (status) {
      case 'confirmed':
        return Colors.success;
      case 'pending':
        return Colors.warning;
      case 'rejected':
        return Colors.error;
      case 'expired':
        return Colors.textMuted;
      default:
        return Colors.textMuted;
    }
  };

  const formatDate = (dateString: string): string => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  if (loading) {
    return <Loading fullScreen text="Loading..." />;
  }

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.primary} />
      }
    >
      {/* Header Info */}
      <Card style={styles.infoCard}>
        <View style={styles.infoHeader}>
          <Ionicons name="information-circle" size={24} color={Colors.primary} />
          <Text style={styles.infoTitle}>Buy Game Credits</Text>
        </View>
        <Text style={styles.infoText}>
          Purchase credits using cryptocurrency. Select a payment method below, send the exact amount, and your credits will be added after admin verification.
        </Text>
        {rates && (
          <View style={styles.rateInfo}>
            <Text style={styles.rateText}>
              Rate: <Text style={styles.rateValue}>{rates.credits_per_dollar} credits per $1</Text>
            </Text>
            <Text style={styles.rateText}>
              Min: ${rates.min_purchase} | Max: ${rates.max_purchase}
            </Text>
          </View>
        )}
      </Card>

      {/* Crypto Options */}
      <Text style={styles.sectionTitle}>Select Payment Method</Text>
      <View style={styles.cryptoGrid}>
        {wallets.filter(w => w.is_active).map((wallet) => {
          const info = CRYPTO_INFO[wallet.crypto_type];
          return (
            <TouchableOpacity
              key={wallet.crypto_type}
              style={styles.cryptoCard}
              onPress={() => handleSelectCrypto(wallet.crypto_type)}
              activeOpacity={0.7}
            >
              <View style={[styles.cryptoIcon, { backgroundColor: info.color + '20' }]}>
                <Ionicons name={info.icon as any} size={28} color={info.color} />
              </View>
              <Text style={styles.cryptoName}>{info.name}</Text>
              <Text style={styles.cryptoSymbol}>{wallet.crypto_type}</Text>
              {wallet.network && (
                <Badge text={wallet.network} variant="default" size="sm" />
              )}
            </TouchableOpacity>
          );
        })}
      </View>

      {/* Purchase History */}
      <Text style={styles.sectionTitle}>Purchase History</Text>
      {purchases.length === 0 ? (
        <Card style={styles.emptyCard}>
          <Ionicons name="receipt-outline" size={48} color={Colors.textMuted} />
          <Text style={styles.emptyText}>No purchases yet</Text>
        </Card>
      ) : (
        purchases.map((purchase) => (
          <TouchableOpacity
            key={purchase.id}
            onPress={() => handleViewPayment(purchase)}
            activeOpacity={0.7}
          >
            <Card style={styles.purchaseCard}>
              <View style={styles.purchaseHeader}>
                <View style={styles.purchaseInfo}>
                  <Text style={styles.purchaseRef}>#{purchase.reference_code}</Text>
                  <Text style={styles.purchaseDate}>{formatDate(purchase.created_at)}</Text>
                </View>
                <Badge
                  text={purchase.status}
                  variant={purchase.status === 'confirmed' ? 'success' : purchase.status === 'pending' ? 'warning' : 'default'}
                  size="sm"
                />
              </View>
              <View style={styles.purchaseDetails}>
                <View style={styles.purchaseDetail}>
                  <Text style={styles.detailLabel}>Amount</Text>
                  <Text style={styles.detailValue}>${purchase.usd_amount}</Text>
                </View>
                <View style={styles.purchaseDetail}>
                  <Text style={styles.detailLabel}>Crypto</Text>
                  <Text style={styles.detailValue}>
                    {purchase.crypto_amount} {purchase.crypto_type}
                  </Text>
                </View>
                <View style={styles.purchaseDetail}>
                  <Text style={styles.detailLabel}>Credits</Text>
                  <Text style={[styles.detailValue, { color: Colors.primary }]}>
                    +{purchase.credits_amount}
                  </Text>
                </View>
              </View>
              {purchase.status === 'pending' && !purchase.tx_hash && (
                <View style={styles.actionHint}>
                  <Ionicons name="alert-circle" size={16} color={Colors.warning} />
                  <Text style={styles.actionHintText}>Tap to submit payment details</Text>
                </View>
              )}
            </Card>
          </TouchableOpacity>
        ))
      )}

      {/* Purchase Modal */}
      <Modal
        visible={showPurchaseModal}
        animationType="slide"
        transparent
        onRequestClose={() => setShowPurchaseModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>
                Buy with {selectedCrypto ? CRYPTO_INFO[selectedCrypto].name : ''}
              </Text>
              <TouchableOpacity onPress={() => setShowPurchaseModal(false)}>
                <Ionicons name="close" size={24} color={Colors.text} />
              </TouchableOpacity>
            </View>

            <Text style={styles.inputLabel}>Amount (USD)</Text>
            <TextInput
              style={styles.input}
              value={usdAmount}
              onChangeText={setUsdAmount}
              placeholder="Enter amount in USD"
              placeholderTextColor={Colors.textMuted}
              keyboardType="numeric"
            />

            {usdAmount && !isNaN(parseFloat(usdAmount)) && (
              <View style={styles.conversionInfo}>
                <View style={styles.conversionRow}>
                  <Text style={styles.conversionLabel}>You'll get:</Text>
                  <Text style={styles.conversionValue}>
                    {calculateCredits(parseFloat(usdAmount)).toLocaleString()} Credits
                  </Text>
                </View>
                {selectedCrypto && (
                  <View style={styles.conversionRow}>
                    <Text style={styles.conversionLabel}>Send exactly:</Text>
                    <Text style={styles.conversionValue}>
                      {calculateCryptoAmount(parseFloat(usdAmount), selectedCrypto)} {selectedCrypto}
                    </Text>
                  </View>
                )}
              </View>
            )}

            <Button
              title="Continue"
              onPress={handleCreatePurchase}
              loading={creating}
              disabled={!usdAmount || creating}
              style={styles.modalButton}
            />
          </View>
        </View>
      </Modal>

      {/* Payment Details Modal */}
      <Modal
        visible={showPaymentModal}
        animationType="slide"
        transparent
        onRequestClose={() => setShowPaymentModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Payment Details</Text>
              <TouchableOpacity onPress={() => setShowPaymentModal(false)}>
                <Ionicons name="close" size={24} color={Colors.text} />
              </TouchableOpacity>
            </View>

            {currentPurchase && (
              <>
                <View style={styles.paymentSection}>
                  <Text style={styles.paymentLabel}>Reference Code</Text>
                  <TouchableOpacity
                    style={styles.copyRow}
                    onPress={() => handleCopyReference(currentPurchase.reference_code)}
                  >
                    <Text style={styles.paymentValue}>{currentPurchase.reference_code}</Text>
                    <Ionicons name="copy-outline" size={20} color={Colors.primary} />
                  </TouchableOpacity>
                </View>

                <View style={styles.paymentSection}>
                  <Text style={styles.paymentLabel}>
                    Send exactly to {currentPurchase.crypto_type} Wallet
                  </Text>
                  <Text style={styles.cryptoAmount}>
                    {currentPurchase.crypto_amount} {currentPurchase.crypto_type}
                  </Text>
                  <TouchableOpacity
                    style={styles.walletAddress}
                    onPress={() => handleCopyAddress(currentPurchase.wallet_address)}
                  >
                    <Text style={styles.addressText} numberOfLines={2}>
                      {currentPurchase.wallet_address}
                    </Text>
                    <Ionicons name="copy-outline" size={20} color={Colors.primary} />
                  </TouchableOpacity>
                </View>

                <View style={styles.paymentSection}>
                  <Text style={styles.paymentLabel}>You'll receive</Text>
                  <Text style={styles.creditsAmount}>
                    {currentPurchase.credits_amount.toLocaleString()} Credits
                  </Text>
                </View>

                {currentPurchase.status === 'pending' && (
                  <>
                    <Text style={styles.inputLabel}>Transaction Hash (after payment)</Text>
                    <TextInput
                      style={styles.input}
                      value={txHash}
                      onChangeText={setTxHash}
                      placeholder="Paste your transaction hash here"
                      placeholderTextColor={Colors.textMuted}
                      autoCapitalize="none"
                    />

                    <Button
                      title="Submit Payment"
                      onPress={handleSubmitTxHash}
                      loading={submitting}
                      disabled={!txHash.trim() || submitting}
                      style={styles.modalButton}
                    />
                  </>
                )}

                {currentPurchase.status === 'confirmed' && (
                  <View style={styles.confirmedBanner}>
                    <Ionicons name="checkmark-circle" size={24} color={Colors.success} />
                    <Text style={styles.confirmedText}>Payment Confirmed!</Text>
                  </View>
                )}

                {currentPurchase.tx_hash && (
                  <View style={styles.txHashInfo}>
                    <Text style={styles.txHashLabel}>TX Hash:</Text>
                    <Text style={styles.txHashValue} numberOfLines={1}>
                      {currentPurchase.tx_hash}
                    </Text>
                  </View>
                )}
              </>
            )}
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  content: {
    padding: Spacing.md,
    paddingBottom: Spacing.xxl,
  },
  infoCard: {
    marginBottom: Spacing.lg,
  },
  infoHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    marginBottom: Spacing.sm,
  },
  infoTitle: {
    fontSize: FontSize.lg,
    fontWeight: FontWeight.bold,
    color: Colors.text,
  },
  infoText: {
    fontSize: FontSize.sm,
    color: Colors.textSecondary,
    lineHeight: 20,
  },
  rateInfo: {
    marginTop: Spacing.md,
    paddingTop: Spacing.md,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },
  rateText: {
    fontSize: FontSize.sm,
    color: Colors.textSecondary,
    marginBottom: Spacing.xs,
  },
  rateValue: {
    color: Colors.primary,
    fontWeight: FontWeight.semibold,
  },
  sectionTitle: {
    fontSize: FontSize.md,
    fontWeight: FontWeight.semibold,
    color: Colors.text,
    marginBottom: Spacing.md,
    marginTop: Spacing.sm,
  },
  cryptoGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
    marginBottom: Spacing.lg,
  },
  cryptoCard: {
    width: '48%',
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.border,
  },
  cryptoIcon: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.sm,
  },
  cryptoName: {
    fontSize: FontSize.md,
    fontWeight: FontWeight.semibold,
    color: Colors.text,
  },
  cryptoSymbol: {
    fontSize: FontSize.sm,
    color: Colors.textSecondary,
    marginBottom: Spacing.xs,
  },
  emptyCard: {
    alignItems: 'center',
    paddingVertical: Spacing.xl,
  },
  emptyText: {
    fontSize: FontSize.md,
    color: Colors.textMuted,
    marginTop: Spacing.md,
  },
  purchaseCard: {
    marginBottom: Spacing.md,
  },
  purchaseHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: Spacing.md,
  },
  purchaseInfo: {},
  purchaseRef: {
    fontSize: FontSize.md,
    fontWeight: FontWeight.semibold,
    color: Colors.text,
  },
  purchaseDate: {
    fontSize: FontSize.xs,
    color: Colors.textMuted,
    marginTop: 2,
  },
  purchaseDetails: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  purchaseDetail: {
    alignItems: 'center',
  },
  detailLabel: {
    fontSize: FontSize.xs,
    color: Colors.textSecondary,
    marginBottom: 2,
  },
  detailValue: {
    fontSize: FontSize.sm,
    fontWeight: FontWeight.semibold,
    color: Colors.text,
  },
  actionHint: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    marginTop: Spacing.md,
    paddingTop: Spacing.sm,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },
  actionHintText: {
    fontSize: FontSize.sm,
    color: Colors.warning,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: Colors.surface,
    borderTopLeftRadius: BorderRadius.xl,
    borderTopRightRadius: BorderRadius.xl,
    padding: Spacing.lg,
    paddingBottom: Spacing.xxl,
    maxHeight: '85%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.lg,
  },
  modalTitle: {
    fontSize: FontSize.xl,
    fontWeight: FontWeight.bold,
    color: Colors.text,
  },
  inputLabel: {
    fontSize: FontSize.sm,
    fontWeight: FontWeight.medium,
    color: Colors.text,
    marginBottom: Spacing.xs,
  },
  input: {
    backgroundColor: Colors.surfaceLight,
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    fontSize: FontSize.md,
    color: Colors.text,
    marginBottom: Spacing.md,
  },
  conversionInfo: {
    backgroundColor: Colors.surfaceLight,
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    marginBottom: Spacing.lg,
  },
  conversionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: Spacing.xs,
  },
  conversionLabel: {
    fontSize: FontSize.sm,
    color: Colors.textSecondary,
  },
  conversionValue: {
    fontSize: FontSize.sm,
    fontWeight: FontWeight.semibold,
    color: Colors.primary,
  },
  modalButton: {
    marginTop: Spacing.md,
  },
  paymentSection: {
    marginBottom: Spacing.lg,
  },
  paymentLabel: {
    fontSize: FontSize.sm,
    color: Colors.textSecondary,
    marginBottom: Spacing.xs,
  },
  paymentValue: {
    fontSize: FontSize.lg,
    fontWeight: FontWeight.bold,
    color: Colors.primary,
  },
  copyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: Colors.surfaceLight,
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
  },
  cryptoAmount: {
    fontSize: FontSize.xl,
    fontWeight: FontWeight.bold,
    color: Colors.text,
    marginBottom: Spacing.sm,
  },
  walletAddress: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: Colors.surfaceLight,
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    gap: Spacing.sm,
  },
  addressText: {
    flex: 1,
    fontSize: FontSize.sm,
    color: Colors.text,
    fontFamily: 'monospace',
  },
  creditsAmount: {
    fontSize: FontSize.xxl,
    fontWeight: FontWeight.bold,
    color: Colors.success,
  },
  confirmedBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
    backgroundColor: Colors.success + '20',
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    marginTop: Spacing.md,
  },
  confirmedText: {
    fontSize: FontSize.md,
    fontWeight: FontWeight.semibold,
    color: Colors.success,
  },
  txHashInfo: {
    marginTop: Spacing.md,
    padding: Spacing.sm,
    backgroundColor: Colors.surfaceLight,
    borderRadius: BorderRadius.sm,
  },
  txHashLabel: {
    fontSize: FontSize.xs,
    color: Colors.textSecondary,
  },
  txHashValue: {
    fontSize: FontSize.sm,
    color: Colors.text,
    fontFamily: 'monospace',
  },
});
