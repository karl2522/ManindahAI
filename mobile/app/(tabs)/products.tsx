import React, { useState, useCallback } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
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
  ScrollView,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { useStore } from '../../src/hooks/useStore';
import { ProductService, Product, CreateProductInput } from '../../src/services/product';
import { StoreService } from '../../src/services/store';

type FormData = {
  name: string;
  original_price: string;
  selling_price: string;
  quantity: string;
  category: string;
};

const EMPTY_FORM: FormData = {
  name: '',
  original_price: '',
  selling_price: '',
  quantity: '0',
  category: '',
};

export default function ProductsScreen() {
  const { store, userId, loading: storeLoading, error: storeError, setStore } = useStore();
  const queryClient = useQueryClient();
  const {
    data: products = [],
    isLoading: loadingProducts,
    isError: productsHasError,
    fetchStatus,
    refetch,
  } = useQuery({
    queryKey: ['products', store?.store_id],
    queryFn: () => ProductService.getByStoreId(store!.store_id),
    enabled: !!store,
  });
  const [modalVisible, setModalVisible] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [form, setForm] = useState<FormData>(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [storeName, setStoreName] = useState('');
  const [creatingStore, setCreatingStore] = useState(false);

  useFocusEffect(
    useCallback(() => {
      if (store) refetch();
    }, [store, refetch])
  );

  const handleCreateStore = async () => {
    if (!userId || !storeName.trim()) {
      Alert.alert('Validation', 'Please enter a store name.');
      return;
    }
    setCreatingStore(true);
    try {
      const newStore = await StoreService.create(userId, storeName.trim());
      setStore(newStore);
    } catch (e: any) {
      Alert.alert('Error', e.message);
    } finally {
      setCreatingStore(false);
    }
  };

  const openAddModal = () => {
    setEditingProduct(null);
    setForm(EMPTY_FORM);
    setModalVisible(true);
  };

  const openEditModal = (product: Product) => {
    setEditingProduct(product);
    setForm({
      name: product.name,
      original_price: String(product.original_price),
      selling_price: String(product.selling_price),
      quantity: String(product.quantity),
      category: product.category ?? '',
    });
    setModalVisible(true);
  };

  const handleSave = async () => {
    if (!store || !form.name.trim()) {
      Alert.alert('Validation', 'Product name is required.');
      return;
    }
    setSaving(true);
    try {
      const payload: CreateProductInput = {
        store_id: store.store_id,
        name: form.name.trim(),
        original_price: parseFloat(form.original_price) || 0,
        selling_price: parseFloat(form.selling_price) || 0,
        quantity: parseInt(form.quantity, 10) || 0,
        category: form.category.trim() || undefined,
      };

      if (editingProduct) {
        const { store_id, ...updatePayload } = payload;
        await ProductService.update(editingProduct.product_id, updatePayload);
        queryClient.invalidateQueries({ queryKey: ['products', store.store_id] });
      } else {
        await ProductService.create(payload);
        queryClient.invalidateQueries({ queryKey: ['products', store.store_id] });
      }
      setModalVisible(false);
    } catch (e: any) {
      Alert.alert('Error', e.message);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = (product: Product) => {
    Alert.alert(
      'Delete Product',
      `Delete "${product.name}"? This cannot be undone.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await ProductService.delete(product.product_id);
              queryClient.invalidateQueries({ queryKey: ['products', store.store_id] });
            } catch (e: any) {
              Alert.alert('Error', e.message);
            }
          },
        },
      ]
    );
  };

  if (storeLoading) {
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
        <Text style={styles.setupTitle}>Set up your store</Text>
        <Text style={styles.setupSub}>Enter a name for your sari-sari store to get started.</Text>
        <TextInput
          style={styles.input}
          placeholder="Store name"
          value={storeName}
          onChangeText={setStoreName}
        />
        <TouchableOpacity
          style={styles.primaryButton}
          onPress={handleCreateStore}
          disabled={creatingStore}
        >
          <Text style={styles.buttonText}>
            {creatingStore ? 'Creating...' : 'Create Store'}
          </Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.storeName}>{store.store_name}</Text>
        <TouchableOpacity style={styles.addButton} onPress={openAddModal}>
          <Text style={styles.addButtonText}>+ Add</Text>
        </TouchableOpacity>
      </View>

      {(productsHasError || fetchStatus === 'paused') && products.length > 0 && (
        <View style={styles.offlineBanner}>
          <Text style={styles.offlineBannerText}>Offline — showing cached data</Text>
        </View>
      )}

      {loadingProducts ? (
        <ActivityIndicator style={{ marginTop: 24 }} />
      ) : products.length === 0 ? (
        <View style={styles.centered}>
          <Text style={styles.emptyText}>No products yet.</Text>
          <Text style={styles.emptyHint}>Tap "+ Add" to add your first product.</Text>
        </View>
      ) : (
        <FlatList
          data={products}
          keyExtractor={(item) => item.product_id}
          renderItem={({ item }) => (
            <TouchableOpacity
              style={styles.productCard}
              onPress={() => openEditModal(item)}
              onLongPress={() => handleDelete(item)}
            >
              <View style={styles.productInfo}>
                <Text style={styles.productName}>{item.name}</Text>
                {item.category ? (
                  <Text style={styles.productCategory}>{item.category}</Text>
                ) : null}
              </View>
              <View style={styles.productRight}>
                <Text style={styles.priceText}>₱{item.selling_price.toFixed(2)}</Text>
                <Text style={[styles.stockText, item.quantity <= 5 && styles.lowStock]}>
                  Stock: {item.quantity}
                </Text>
              </View>
            </TouchableOpacity>
          )}
          contentContainerStyle={{ paddingBottom: 20 }}
        />
      )}

      <Modal visible={modalVisible} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <Text style={styles.modalTitle}>
              {editingProduct ? 'Edit Product' : 'Add Product'}
            </Text>
            <ScrollView showsVerticalScrollIndicator={false}>
              <TextInput
                style={styles.input}
                placeholder="Product name *"
                value={form.name}
                onChangeText={(v) => setForm((f) => ({ ...f, name: v }))}
              />
              <TextInput
                style={styles.input}
                placeholder="Cost price (original)"
                value={form.original_price}
                onChangeText={(v) => setForm((f) => ({ ...f, original_price: v }))}
                keyboardType="decimal-pad"
              />
              <TextInput
                style={styles.input}
                placeholder="Selling price"
                value={form.selling_price}
                onChangeText={(v) => setForm((f) => ({ ...f, selling_price: v }))}
                keyboardType="decimal-pad"
              />
              <TextInput
                style={styles.input}
                placeholder="Quantity"
                value={form.quantity}
                onChangeText={(v) => setForm((f) => ({ ...f, quantity: v }))}
                keyboardType="number-pad"
              />
              <TextInput
                style={styles.input}
                placeholder="Category (optional)"
                value={form.category}
                onChangeText={(v) => setForm((f) => ({ ...f, category: v }))}
              />
            </ScrollView>
            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.primaryButton, styles.cancelButton]}
                onPress={() => setModalVisible(false)}
              >
                <Text style={styles.cancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.primaryButton}
                onPress={handleSave}
                disabled={saving}
              >
                <Text style={styles.buttonText}>{saving ? 'Saving...' : 'Save'}</Text>
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
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  storeName: { fontSize: 16, fontWeight: '700', color: '#333' },
  addButton: {
    backgroundColor: '#007AFF',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 8,
  },
  addButtonText: { color: '#fff', fontWeight: '700', fontSize: 14 },
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
  productRight: { alignItems: 'flex-end' },
  priceText: { fontSize: 14, fontWeight: '600', color: '#333' },
  stockText: { fontSize: 12, color: '#666', marginTop: 2 },
  lowStock: { color: '#e74c3c', fontWeight: '700' },
  offlineBanner: {
    backgroundColor: '#fff3cd',
    padding: 8,
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#ffd952',
  },
  offlineBannerText: { color: '#856404', fontSize: 12, fontWeight: '600' },
  emptyText: { fontSize: 16, color: '#888' },
  emptyHint: { fontSize: 13, color: '#aaa', marginTop: 6 },
  errorText: { color: '#e74c3c', textAlign: 'center' },
  setupTitle: { fontSize: 20, fontWeight: '700', color: '#333', marginBottom: 8 },
  setupSub: { fontSize: 14, color: '#888', marginBottom: 20, textAlign: 'center' },
  input: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    marginBottom: 12,
    fontSize: 15,
    width: '100%',
  },
  primaryButton: {
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
    maxHeight: '88%',
  },
  modalTitle: { fontSize: 18, fontWeight: '700', color: '#333', marginBottom: 16 },
  modalButtons: { flexDirection: 'row', marginTop: 8 },
});
