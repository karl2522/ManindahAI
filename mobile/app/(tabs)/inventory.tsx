import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  Modal,
  TextInput,
  StyleSheet,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { useStore } from '../../src/hooks/useStore';
import { ProductService, Product } from '../../src/services/product';
import { InventoryService, InventoryChangeType, LOW_STOCK_THRESHOLD } from '../../src/services/inventory';

type AdjustOption = {
  key: InventoryChangeType;
  label: string;
  sign: 1 | -1;
};

const ADJUST_OPTIONS: AdjustOption[] = [
  { key: 'restock', label: 'Restock (+)', sign: 1 },
  { key: 'adjustment', label: 'Adjust (+)', sign: 1 },
  { key: 'loss', label: 'Loss (−)', sign: -1 },
];

export default function InventoryScreen() {
  const { store, loading: storeLoading, error: storeError } = useStore();
  const [products, setProducts] = useState<Product[]>([]);
  const [loadingProducts, setLoadingProducts] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [changeType, setChangeType] = useState<InventoryChangeType>('restock');
  const [quantityInput, setQuantityInput] = useState('');
  const [saving, setSaving] = useState(false);

  const fetchProducts = useCallback(async () => {
    if (!store) return;
    setLoadingProducts(true);
    try {
      const data = await ProductService.getByStoreId(store.store_id);
      setProducts(data);
    } catch (e: any) {
      Alert.alert('Error', e.message);
    } finally {
      setLoadingProducts(false);
    }
  }, [store]);

  useEffect(() => {
    fetchProducts();
  }, [fetchProducts]);

  const openAdjustModal = (product: Product) => {
    setSelectedProduct(product);
    setChangeType('restock');
    setQuantityInput('');
    setModalVisible(true);
  };

  const handleAdjust = async () => {
    if (!selectedProduct) return;
    const qty = parseInt(quantityInput, 10);
    if (!qty || qty <= 0) {
      Alert.alert('Validation', 'Enter a quantity greater than 0.');
      return;
    }
    const option = ADJUST_OPTIONS.find((o) => o.key === changeType)!;
    const delta = qty * option.sign;

    setSaving(true);
    try {
      await InventoryService.adjustStock(selectedProduct.product_id, delta, changeType);
      setProducts((prev) =>
        prev.map((p) =>
          p.product_id === selectedProduct.product_id
            ? { ...p, quantity: Math.max(0, p.quantity + delta) }
            : p
        )
      );
      setModalVisible(false);
    } catch (e: any) {
      Alert.alert('Error', e.message);
    } finally {
      setSaving(false);
    }
  };

  const lowStock = products.filter((p) => p.quantity <= LOW_STOCK_THRESHOLD);
  const sorted = [...products].sort((a, b) => a.quantity - b.quantity);

  if (storeLoading || loadingProducts) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  if (storeError) {
    return (
      <View style={styles.centered}>
        <Text style={styles.errorText}>{storeError}</Text>
      </View>
    );
  }

  if (!store) {
    return (
      <View style={styles.centered}>
        <Text style={styles.emptyText}>No store found.</Text>
        <Text style={styles.emptyHint}>Set up your store in the Products tab first.</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {lowStock.length > 0 && (
        <View style={styles.alertBanner}>
          <Text style={styles.alertTitle}>
            ⚠️  {lowStock.length} item{lowStock.length > 1 ? 's' : ''} running low
          </Text>
          <Text style={styles.alertItems} numberOfLines={2}>
            {lowStock.map((p) => p.name).join(' · ')}
          </Text>
        </View>
      )}

      <FlatList
        data={sorted}
        keyExtractor={(item) => item.product_id}
        ListEmptyComponent={
          <View style={styles.centered}>
            <Text style={styles.emptyText}>No products found.</Text>
            <Text style={styles.emptyHint}>Add products in the Products tab.</Text>
          </View>
        }
        renderItem={({ item }) => {
          const isLow = item.quantity <= LOW_STOCK_THRESHOLD;
          return (
            <TouchableOpacity style={styles.productCard} onPress={() => openAdjustModal(item)}>
              <View style={styles.productInfo}>
                <Text style={styles.productName}>{item.name}</Text>
                {item.category ? (
                  <Text style={styles.productCategory}>{item.category}</Text>
                ) : null}
              </View>
              <View style={[styles.stockBadge, isLow && styles.stockBadgeLow]}>
                <Text style={[styles.stockCount, isLow && styles.stockCountLow]}>
                  {item.quantity}
                </Text>
                <Text style={[styles.stockLabel, isLow && styles.stockCountLow]}>in stock</Text>
              </View>
            </TouchableOpacity>
          );
        }}
        contentContainerStyle={{ paddingBottom: 20 }}
      />

      <Modal visible={modalVisible} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <Text style={styles.modalTitle}>Adjust Stock</Text>
            {selectedProduct && (
              <Text style={styles.modalSubtitle}>
                {selectedProduct.name} — Current: {selectedProduct.quantity}
              </Text>
            )}

            <Text style={styles.label}>Type</Text>
            <View style={styles.typeRow}>
              {ADJUST_OPTIONS.map((opt) => (
                <TouchableOpacity
                  key={opt.key}
                  style={[styles.typeButton, changeType === opt.key && styles.typeButtonActive]}
                  onPress={() => setChangeType(opt.key)}
                >
                  <Text
                    style={[
                      styles.typeButtonText,
                      changeType === opt.key && styles.typeButtonTextActive,
                    ]}
                  >
                    {opt.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={styles.label}>Quantity</Text>
            <TextInput
              style={styles.input}
              placeholder="e.g. 10"
              value={quantityInput}
              onChangeText={setQuantityInput}
              keyboardType="number-pad"
              autoFocus
            />

            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.button, styles.cancelButton]}
                onPress={() => setModalVisible(false)}
              >
                <Text style={styles.cancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.button} onPress={handleAdjust} disabled={saving}>
                <Text style={styles.buttonText}>{saving ? 'Saving...' : 'Confirm'}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f5f5' },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24 },
  alertBanner: {
    backgroundColor: '#fff3cd',
    borderLeftWidth: 4,
    borderLeftColor: '#f0a500',
    padding: 12,
    marginHorizontal: 12,
    marginTop: 12,
    borderRadius: 8,
  },
  alertTitle: { fontWeight: '700', color: '#856404', fontSize: 14 },
  alertItems: { color: '#856404', fontSize: 12, marginTop: 4 },
  productCard: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    marginHorizontal: 12,
    marginTop: 10,
    padding: 14,
    borderRadius: 10,
    justifyContent: 'space-between',
    alignItems: 'center',
    elevation: 1,
  },
  productInfo: { flex: 1 },
  productName: { fontSize: 15, fontWeight: '600', color: '#222' },
  productCategory: { fontSize: 12, color: '#999', marginTop: 2 },
  stockBadge: {
    alignItems: 'center',
    backgroundColor: '#e8f5e9',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    minWidth: 60,
  },
  stockBadgeLow: { backgroundColor: '#fdecea' },
  stockCount: { fontSize: 18, fontWeight: '700', color: '#2e7d32' },
  stockCountLow: { color: '#c62828' },
  stockLabel: { fontSize: 10, color: '#2e7d32' },
  emptyText: { fontSize: 16, color: '#888' },
  emptyHint: { fontSize: 13, color: '#aaa', marginTop: 6, textAlign: 'center' },
  errorText: { color: '#e74c3c', textAlign: 'center' },
  label: { fontSize: 13, fontWeight: '600', color: '#555', marginBottom: 8, marginTop: 4 },
  typeRow: { flexDirection: 'row', gap: 8, marginBottom: 16 },
  typeButton: {
    flex: 1,
    padding: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#ddd',
    alignItems: 'center',
    backgroundColor: '#fafafa',
  },
  typeButtonActive: { borderColor: '#007AFF', backgroundColor: '#e8f0fe' },
  typeButtonText: { fontSize: 12, color: '#555', fontWeight: '600' },
  typeButtonTextActive: { color: '#007AFF' },
  input: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    marginBottom: 16,
    fontSize: 16,
  },
  button: {
    backgroundColor: '#007AFF',
    padding: 14,
    borderRadius: 8,
    alignItems: 'center',
    flex: 1,
  },
  buttonText: { color: '#fff', fontWeight: '700', fontSize: 15 },
  cancelButton: { backgroundColor: '#f0f0f0', marginRight: 8 },
  cancelText: { color: '#333', fontWeight: '700', fontSize: 15 },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'flex-end',
  },
  modalContainer: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
  },
  modalTitle: { fontSize: 18, fontWeight: '700', color: '#333', marginBottom: 4 },
  modalSubtitle: { fontSize: 13, color: '#888', marginBottom: 16 },
  modalButtons: { flexDirection: 'row' },
});
