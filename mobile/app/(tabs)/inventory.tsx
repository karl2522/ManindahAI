import React, { useState, useCallback, useMemo } from 'react';
import { useQuery, useQueryClient, onlineManager } from '@tanstack/react-query';
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
  Image,
  ScrollView,
  Platform,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { Stack, useRouter } from 'expo-router';
import { MaterialIcons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { useStore } from '../../src/hooks/useStore';
import { ProductService, Product } from '../../src/services/product';
import { InventoryService, LOW_STOCK_THRESHOLD, InventoryChangeType, InventoryLog } from '../../src/services/inventory';
import { theme } from '../../src/theme/theme';
import { useOfflineMutation } from '../../src/hooks/useOfflineMutation';
import { CreateProductInput, UpdateProductInput } from '../../src/services/product';

const isTemp = (id: string) => id.startsWith('temp_');

type ModalMode = 'adjust' | 'edit' | 'add';
type SortOption = 'qty_asc' | 'qty_desc' | 'price_asc' | 'price_desc' | 'cost_asc' | 'cost_desc' | 'az' | 'za';

const SORT_OPTIONS: { value: SortOption; label: string }[] = [
  { value: 'qty_asc',    label: 'Qty: Low → High' },
  { value: 'qty_desc',   label: 'Qty: High → Low' },
  { value: 'price_asc',  label: 'Desired Price: Low → High' },
  { value: 'price_desc', label: 'Desired Price: High → Low' },
  { value: 'cost_asc',   label: 'Cost Price: Low → High' },
  { value: 'cost_desc',  label: 'Cost Price: High → Low' },
  { value: 'az',         label: 'Name: A → Z' },
  { value: 'za',         label: 'Name: Z → A' },
];

export default function InventoryScreen() {
  const { store, loading: storeLoading, error: storeError } = useStore();
  const router = useRouter();
  
  React.useEffect(() => {
    if (!storeLoading && (storeError || !store)) {
      router.replace('/(auth)/login');
    }
  }, [storeLoading, storeError, store, router]);
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

  const [searchQuery, setSearchQuery] = useState('');
  const [viewMode, setViewMode] = useState<'list' | 'grid'>('list');
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [modalMode, setModalMode] = useState<ModalMode>('adjust');
  
  // Adjustment state
  const [changeType, setChangeType] = useState<InventoryChangeType>('restock');
  const [quantityInput, setQuantityInput] = useState('');
  
  // Edit & Add state
  const [editForm, setEditForm] = useState({
    name: '',
    selling_price: '',
    original_price: '',
    category: '',
    quantity: '0',
    image_url: '',
  });

  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [deleteModalVisible, setDeleteModalVisible] = useState(false);
  const [productToDelete, setProductToDelete] = useState<Product | null>(null);
  const [sortBy, setSortBy] = useState<SortOption>('qty_asc');
  const [filterLowStock, setFilterLowStock] = useState(false);
  const [filterModalVisible, setFilterModalVisible] = useState(false);

  useFocusEffect(
    useCallback(() => {
      if (store) refetch();
    }, [store, refetch])
  );

  const filteredProducts = useMemo(() => {
    let list = products.filter(p => p.name.toLowerCase().includes(searchQuery.toLowerCase()));
    if (filterLowStock) list = list.filter(p => p.quantity <= LOW_STOCK_THRESHOLD);
    switch (sortBy) {
      case 'qty_asc':    list = [...list].sort((a, b) => a.quantity - b.quantity); break;
      case 'qty_desc':   list = [...list].sort((a, b) => b.quantity - a.quantity); break;
      case 'price_asc':  list = [...list].sort((a, b) => a.selling_price - b.selling_price); break;
      case 'price_desc': list = [...list].sort((a, b) => b.selling_price - a.selling_price); break;
      case 'cost_asc':   list = [...list].sort((a, b) => a.original_price - b.original_price); break;
      case 'cost_desc':  list = [...list].sort((a, b) => b.original_price - a.original_price); break;
      case 'az':         list = [...list].sort((a, b) => a.name.localeCompare(b.name)); break;
      case 'za':         list = [...list].sort((a, b) => b.name.localeCompare(a.name)); break;
    }
    return list;
  }, [products, searchQuery, sortBy, filterLowStock]);

  const openAddModal = () => {
    setSelectedProduct(null);
    setEditForm({
      name: '',
      selling_price: '',
      original_price: '',
      category: '',
      quantity: '',
      image_url: '',
    });
    setModalMode('add');
    setModalVisible(true);
  };

  const openAdjustModal = (product: Product) => {
    setSelectedProduct(product);
    setChangeType('restock');
    setQuantityInput('');
    setModalMode('adjust');
    setModalVisible(true);
  };

  const openEditModal = (product: Product) => {
    setSelectedProduct(product);
    setEditForm({
      name: product.name,
      selling_price: String(product.selling_price),
      original_price: String(product.original_price),
      category: product.category || '',
      quantity: String(product.quantity),
      image_url: product.image_url || '',
    });
    setModalMode('edit');
    setModalVisible(true);
  };

  const pickImage = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.7,
    });

    if (!result.canceled) {
      setEditForm((f: typeof editForm) => ({ ...f, image_url: result.assets[0].uri }));
    }
  };

  const openDetailsScreen = (product: Product) => {
    router.push({ pathname: '/product/compare_product', params: { id: product.product_id } });
  };

  const handleDelete = (product?: Product) => {
    const target = product || selectedProduct;
    if (!target) return;
    setProductToDelete(target);
    setDeleteModalVisible(true);
  };

  const createProductMutation = useOfflineMutation<Product, Error, CreateProductInput>({
    mutationFn: (data: CreateProductInput) => ProductService.create(data),
    getOutboxInput: (data: CreateProductInput) => ({
      op: 'product_create',
      store_id: store!.store_id,
      payload: data,
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['products', store?.store_id] });
      setModalVisible(false);
    },
  });

  const updateProductMutation = useOfflineMutation<Product, Error, { id: string; data: UpdateProductInput }>({
    mutationFn: ({ id, data }: { id: string; data: UpdateProductInput }) =>
      ProductService.update(id, data),
    getOutboxInput: ({ id, data }: { id: string; data: UpdateProductInput }) => ({
      op: 'product_update',
      store_id: store!.store_id,
      product_id: id,
      payload: data,
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['products', store?.store_id] });
      queryClient.invalidateQueries({ queryKey: ['inventory_logs'] });
      setModalVisible(false);
    },
  });

  const deleteProductMutation = useOfflineMutation<void, Error, string>({
    mutationFn: (id: string) => ProductService.delete(id),
    getOutboxInput: (id: string) => ({
      op: 'product_delete',
      store_id: store!.store_id,
      product_id: id,
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['products', store?.store_id] });
      setModalVisible(false);
      setDeleteModalVisible(false);
    },
  });

  const adjustStockMutation = useOfflineMutation<void, Error, { id: string; delta: number; type: InventoryChangeType }>({
    mutationFn: ({ id, delta, type }: { id: string; delta: number; type: InventoryChangeType }) =>
      InventoryService.adjustStock(id, delta, type),
    getOutboxInput: ({ id, delta, type }: { id: string; delta: number; type: InventoryChangeType }) => ({
      op: 'inventory_adjust',
      store_id: store!.store_id,
      product_id: id,
      delta,
      change_type: type,
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['products', store?.store_id] });
      queryClient.invalidateQueries({ queryKey: ['inventory_logs'] });
      setModalVisible(false);
      setQuantityInput('');
    },
  });

  const confirmDelete = async () => {
    if (!productToDelete || !store) return;
    deleteProductMutation.mutate(productToDelete.product_id);
  };

  const handleSave = async () => {
    if (!store) return;
    try {
      if (modalMode === 'add') {
        const newPayload: CreateProductInput = {
          store_id: store.store_id,
          name: editForm.name.trim(),
          selling_price: parseFloat(editForm.selling_price) || 0,
          original_price: parseFloat(editForm.original_price) || 0,
          quantity: parseInt(editForm.quantity, 10) || 0,
          category: editForm.category.trim() || undefined,
          image_url: editForm.image_url || undefined,
        };
        if (!newPayload.name) throw new Error('Product name is required');
        
        createProductMutation.mutate(newPayload);
      } else if (modalMode === 'adjust' && selectedProduct) {
        const qty = parseInt(quantityInput, 10);
        if (!qty || qty <= 0) throw new Error('Enter a valid quantity');
        const sign = changeType === 'restock' ? 1 : -1;
        const delta = qty * sign;

        adjustStockMutation.mutate({
          id: selectedProduct.product_id,
          delta,
          type: changeType
        });
      } else if (modalMode === 'edit' && selectedProduct) {
        const updatePayload: UpdateProductInput = {
          name: editForm.name.trim(),
          selling_price: parseFloat(editForm.selling_price) || 0,
          original_price: parseFloat(editForm.original_price) || 0,
          category: editForm.category.trim() || undefined,
          image_url: editForm.image_url || undefined,
        };

        updateProductMutation.mutate({
          id: selectedProduct.product_id,
          data: updatePayload
        });
      }
    } catch (e: any) {
      console.error('[Inventory] Input error:', e.message);
      Alert.alert('Error', e.message);
    }
  };

  if (storeLoading || loadingProducts) {
    return (
      <View style={[styles.centered, { backgroundColor: theme.colors.background }]}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <Stack.Screen options={{ title: 'Stock List' }} />

      <View style={styles.headerContent}>
        <View style={styles.titleSection}>
          <Text style={[theme.typography.h1, { color: theme.colors.onSurface }]}>Inventory</Text>
          <Text style={[theme.typography.bodyLarge, { color: theme.colors.onSurfaceVariant }]}>
            Manage your store's stock levels intelligently.
          </Text>
        </View>

        {/* Search Bar */}
        <View style={styles.searchRow}>
          <View style={[styles.searchBar, { borderColor: theme.colors.outlineVariant }]}>
            <MaterialIcons name="search" size={24} color={theme.colors.outline} />
            <TextInput
              style={[theme.typography.bodyMedium, styles.searchInput]}
              placeholder="Search products..."
              value={searchQuery}
              onChangeText={setSearchQuery}
              placeholderTextColor={theme.colors.outline}
            />
          </View>
          <TouchableOpacity
            style={[styles.filterButton, {
              borderColor: viewMode === 'grid' ? theme.colors.primary : theme.colors.outlineVariant,
              backgroundColor: viewMode === 'grid' ? theme.colors.primaryContainer : '#fff',
            }]}
            onPress={() => setViewMode(v => v === 'list' ? 'grid' : 'list')}
          >
            <MaterialIcons
              name={viewMode === 'list' ? 'grid-view' : 'view-list'}
              size={22}
              color={viewMode === 'grid' ? theme.colors.onPrimaryContainer : theme.colors.onSurfaceVariant}
            />
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.filterButton, {
              borderColor: (sortBy !== 'qty_asc' || filterLowStock) ? theme.colors.primary : theme.colors.outlineVariant,
              backgroundColor: (sortBy !== 'qty_asc' || filterLowStock) ? theme.colors.primaryContainer : '#fff',
            }]}
            onPress={() => setFilterModalVisible(true)}
          >
            <MaterialIcons
              name="tune"
              size={24}
              color={(sortBy !== 'qty_asc' || filterLowStock) ? theme.colors.onPrimaryContainer : theme.colors.onSurfaceVariant}
            />
          </TouchableOpacity>
        </View>
      </View>

      {/* Offline Banner */}
      {(productsHasError || fetchStatus === 'paused') && products.length > 0 && (
        <View style={[styles.offlineBanner, { backgroundColor: theme.colors.errorContainer }]}>
          <MaterialIcons name="cloud-off" size={16} color={theme.colors.onErrorContainer} />
          <Text style={[theme.typography.labelMedium, { color: theme.colors.onErrorContainer, marginLeft: 8 }]}>
            Offline — showing cached data
          </Text>
        </View>
      )}

      {viewMode === 'list' && (
        <View style={[styles.tableHeaderRow, { borderColor: theme.colors.outlineVariant, backgroundColor: theme.colors.surfaceContainerLow }]}>
          <View style={styles.tableColProduct}>
            <Text style={[theme.typography.labelSmall, { color: theme.colors.onSurfaceVariant }]}>Product</Text>
          </View>
          <View style={styles.tableColQty}>
            <Text style={[theme.typography.labelSmall, { color: theme.colors.onSurfaceVariant, textAlign: 'center' }]}>Qty</Text>
          </View>
          <View style={styles.tableColPrice}>
            <Text style={[theme.typography.labelSmall, { color: theme.colors.onSurfaceVariant, textAlign: 'center' }]}>Sell Price</Text>
          </View>
          <View style={styles.tableColActions}>
            <Text style={[theme.typography.labelSmall, { color: theme.colors.onSurfaceVariant, textAlign: 'center' }]}>Actions</Text>
          </View>
        </View>
      )}

      <FlatList
        key={viewMode}
        data={filteredProducts}
        keyExtractor={(item) => item.product_id}
        numColumns={viewMode === 'grid' ? 2 : 1}
        columnWrapperStyle={viewMode === 'grid' ? styles.gridRow : undefined}
        contentContainerStyle={viewMode === 'list' ? styles.tableContent : styles.listContent}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <View style={styles.centered}>
            <Text style={[theme.typography.bodyLarge, { color: theme.colors.onSurfaceVariant }]}>
              No products found.
            </Text>
          </View>
        }
        renderItem={({ item }) => viewMode === 'grid' ? (
          <ProductGridItem
            item={item}
            onAdjust={() => openAdjustModal(item)}
            onEdit={() => openEditModal(item)}
            onDelete={() => handleDelete(item)}
            onPress={() => openDetailsScreen(item)}
          />
        ) : (
          <ProductItem 
            item={item} 
            onAdjust={() => openAdjustModal(item)}
            onEdit={() => openEditModal(item)}
            onDelete={() => handleDelete(item)}
            onPress={() => openDetailsScreen(item)}
          />
        )}
      />

      {/* Floating Action Button */}
      <TouchableOpacity 
        style={[styles.fab, { backgroundColor: theme.colors.secondaryContainer }]}
        activeOpacity={0.8}
        onPress={openAddModal}
      >
        <MaterialIcons name="add" size={28} color={theme.colors.onSecondaryContainer} />
      </TouchableOpacity>

      {/* Unified Modal */}
      <Modal visible={modalVisible} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContainer, { backgroundColor: theme.colors.surface }]}>
            <View style={styles.modalHeader}>
              <Text style={[theme.typography.h3, { color: theme.colors.onSurface }]}>
                {modalMode === 'adjust' ? 'Adjust Stock' : modalMode === 'edit' ? 'Edit Product' : 'Add Product'}
              </Text>
              <TouchableOpacity onPress={() => setModalVisible(false)}>
                <MaterialIcons name="close" size={24} color={theme.colors.onSurfaceVariant} />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false}>
              {modalMode === 'adjust' ? (
                <View style={styles.modalBody}>
                  <Text style={[theme.typography.bodyMedium, { color: theme.colors.onSurfaceVariant, marginBottom: 16 }]}>
                    {selectedProduct?.name} — Current: {selectedProduct?.quantity}
                  </Text>
                  
                  <Text style={[theme.typography.button, { color: theme.colors.onSurface, marginBottom: 12 }]}>Adjustment Type</Text>
                  <View style={styles.typeRow}>
                    {(['restock', 'loss'] as const).map((type) => {
                      const colors = type === 'restock' 
                        ? { bg: '#e8f5e9', border: '#2e7d32', text: '#2e7d32' }
                        : { bg: '#ffebee', border: '#c62828', text: '#c62828' };

                      const isSelected = changeType === type;
                      
                      return (
                        <TouchableOpacity
                          key={type}
                          style={[
                            styles.typeButton,
                            { 
                              borderColor: theme.colors.outlineVariant,
                              backgroundColor: theme.colors.surfaceContainerLow,
                            },
                            isSelected && { 
                              backgroundColor: colors.bg,
                              borderColor: colors.border,
                              borderWidth: 2,
                            }
                          ]}
                          onPress={() => setChangeType(type)}
                        >
                          <Text style={[
                            theme.typography.labelMedium,
                            { color: theme.colors.onSurfaceVariant, fontWeight: '500' },
                            isSelected && { color: colors.text, fontWeight: '700' }
                          ]}>
                            {type.charAt(0).toUpperCase() + type.slice(1)}
                          </Text>
                        </TouchableOpacity>
                      );
                    })}
                  </View>

                  <Text style={[theme.typography.button, { color: theme.colors.onSurface, marginBottom: 8, marginTop: 16 }]}>Quantity</Text>
                  <TextInput
                    style={[styles.modalInput, theme.typography.bodyLarge, { borderColor: theme.colors.outlineVariant }]}
                    placeholder="e.g. 10"
                    value={quantityInput}
                    onChangeText={setQuantityInput}
                    keyboardType="number-pad"
                    autoFocus
                  />
                </View>
              ) : (
                <View style={styles.modalBody}>
                  <TouchableOpacity 
                    style={[styles.imagePicker, { backgroundColor: theme.colors.surfaceContainerLow, borderColor: theme.colors.outlineVariant }]} 
                    onPress={pickImage}
                  >
                    {editForm.image_url ? (
                      <View style={styles.imagePreviewContainer}>
                        <Image source={{ uri: editForm.image_url }} style={styles.imagePreview} resizeMode="cover" />
                        <View style={styles.imageOverlay}>
                          <MaterialIcons name="edit" size={24} color="white" />
                        </View>
                      </View>
                    ) : (
                      <View style={styles.imagePlaceholder}>
                        <MaterialIcons name="add-a-photo" size={32} color={theme.colors.outline} />
                        <Text style={[theme.typography.labelMedium, { color: theme.colors.outline, marginTop: 8 }]}>
                          Add Product Image (Optional)
                        </Text>
                      </View>
                    )}
                  </TouchableOpacity>

                  <Text style={[theme.typography.bodyLarge, { color: theme.colors.onSurface, fontWeight: '500', marginBottom: 8 }]}>Product Name</Text>
                  <TextInput
                    style={[styles.modalInput, theme.typography.bodyLarge, { borderColor: theme.colors.outlineVariant }]}
                    placeholder="e.g. Coca-Cola 1.5L"
                    value={editForm.name}
                    onChangeText={(v: string) => setEditForm((f: typeof editForm) => ({ ...f, name: v }))}
                  />

                  <Text style={[theme.typography.bodyLarge, { color: theme.colors.onSurface, fontWeight: '500', marginBottom: 8, marginTop: 20 }]}>Selling Price (₱)</Text>
                  <TextInput
                    style={[styles.modalInput, theme.typography.bodyLarge, { borderColor: theme.colors.outlineVariant }]}
                    placeholder="0.00"
                    value={editForm.selling_price}
                    onChangeText={(v: string) => setEditForm((f: typeof editForm) => ({ ...f, selling_price: v }))}
                    keyboardType="decimal-pad"
                  />

                  <Text style={[theme.typography.bodyLarge, { color: theme.colors.onSurface, fontWeight: '500', marginBottom: 8, marginTop: 20 }]}>Cost Price (₱)</Text>
                  <TextInput
                    style={[styles.modalInput, theme.typography.bodyLarge, { borderColor: theme.colors.outlineVariant }]}
                    placeholder="0.00"
                    value={editForm.original_price}
                    onChangeText={(v: string) => setEditForm((f: typeof editForm) => ({ ...f, original_price: v }))}
                    keyboardType="decimal-pad"
                  />

                  <Text style={[theme.typography.bodyLarge, { color: theme.colors.onSurface, fontWeight: '500', marginBottom: 8, marginTop: 20 }]}>Category</Text>
                  <TextInput
                    style={[styles.modalInput, theme.typography.bodyLarge, { borderColor: theme.colors.outlineVariant }]}
                    placeholder="e.g. Beverages"
                    value={editForm.category}
                    onChangeText={(v: string) => setEditForm((f: typeof editForm) => ({ ...f, category: v }))}
                  />

                  {modalMode === 'add' && (
                    <>
                      <Text style={[theme.typography.bodyLarge, { color: theme.colors.onSurface, fontWeight: '500', marginBottom: 8, marginTop: 20 }]}>Initial Quantity</Text>
                      <TextInput
                        style={[styles.modalInput, theme.typography.bodyLarge, { borderColor: theme.colors.outlineVariant }]}
                        placeholder="0"
                        value={editForm.quantity}
                        onChangeText={(v: string) => setEditForm((f: typeof editForm) => ({ ...f, quantity: v }))}
                        keyboardType="number-pad"
                      />
                    </>
                  )}
                </View>
              )}
            </ScrollView>

            <View style={styles.modalFooter}>
              {modalMode === 'edit' && (
                <TouchableOpacity
                  style={[styles.deleteButtonModal, { borderColor: theme.colors.error }]}
                  onPress={() => handleDelete()}
                  disabled={deleteProductMutation.isPending}
                >
                  {deleteProductMutation.isPending ? (
                    <ActivityIndicator color={theme.colors.error} />
                  ) : (
                    <>
                      <MaterialIcons name="delete-outline" size={20} color={theme.colors.error} />
                      <Text style={[theme.typography.button, { color: theme.colors.error, marginLeft: 8 }]}>
                        Delete Product
                      </Text>
                    </>
                  )}
                </TouchableOpacity>
              )}

              <TouchableOpacity
                style={[styles.saveButton, { backgroundColor: theme.colors.primary }]}
                onPress={handleSave}
                disabled={createProductMutation.isPending || updateProductMutation.isPending || adjustStockMutation.isPending || deleteProductMutation.isPending}
              >
                {(createProductMutation.isPending || updateProductMutation.isPending || adjustStockMutation.isPending) ? (
                  <ActivityIndicator color={theme.colors.onPrimary} />
                ) : (
                  <Text style={[theme.typography.button, { color: theme.colors.onPrimary }]}>
                    {modalMode === 'add' ? 'Add Product' : 'Confirm Changes'}
                  </Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Delete Confirmation Modal */}
      <Modal visible={deleteModalVisible} animationType="fade" transparent>
        <View style={styles.confirmOverlay}>
          <View style={[styles.confirmContainer, { backgroundColor: theme.colors.surface }]}>
            <View style={[styles.warningIconContainer, { backgroundColor: theme.colors.errorContainer }]}>
              <MaterialIcons name="delete-forever" size={32} color={theme.colors.error} />
            </View>
            
            <Text style={[theme.typography.h2, { color: theme.colors.onSurface, textAlign: 'center', marginBottom: 12 }]}>
              Delete Product?
            </Text>
            
            <Text style={[theme.typography.bodyLarge, { color: theme.colors.onSurfaceVariant, textAlign: 'center', marginBottom: 32 }]}>
              Are you sure you want to remove <Text style={{ fontWeight: '700', color: theme.colors.onSurface }}>"{productToDelete?.name}"</Text>? This action cannot be undone.
            </Text>

            <View style={styles.confirmFooter}>
              <TouchableOpacity 
                style={[styles.cancelButton, { borderColor: theme.colors.outlineVariant }]}
                onPress={() => setDeleteModalVisible(false)}
                disabled={deleteProductMutation.isPending}
              >
                <Text style={[theme.typography.button, { color: theme.colors.onSurfaceVariant }]}>Cancel</Text>
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={[styles.confirmDeleteButton, { backgroundColor: theme.colors.error }]}
                onPress={confirmDelete}
                disabled={deleteProductMutation.isPending}
              >
                {deleteProductMutation.isPending ? (
                  <ActivityIndicator color={theme.colors.onError} />
                ) : (
                  <Text style={[theme.typography.button, { color: theme.colors.onError }]}>
                    {productToDelete?.product_id?.startsWith('temp_') && (
                      <MaterialIcons name="cloud-upload" size={14} color={theme.colors.onError} />
                    )}
                    {productToDelete?.product_id?.startsWith('temp_') ? ' Syncing...' : 'Delete'}
                  </Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Sort & Filter Modal */}
      <Modal visible={filterModalVisible} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContainer, { backgroundColor: theme.colors.surface }]}>
            <View style={styles.modalHeader}>
              <Text style={[theme.typography.h3, { color: theme.colors.onSurface }]}>Sort & Filter</Text>
              <TouchableOpacity onPress={() => setFilterModalVisible(false)}>
                <MaterialIcons name="close" size={24} color={theme.colors.onSurfaceVariant} />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false}>
              <Text style={[theme.typography.button, { color: theme.colors.onSurfaceVariant, marginBottom: 12, letterSpacing: 0.8 }]}>SORT BY</Text>
              {SORT_OPTIONS.map((opt) => (
                <TouchableOpacity
                  key={opt.value}
                  style={[styles.sortOption, {
                    backgroundColor: sortBy === opt.value ? theme.colors.primaryContainer : theme.colors.surfaceContainerLow,
                    borderColor: sortBy === opt.value ? theme.colors.primary : theme.colors.outlineVariant,
                  }]}
                  onPress={() => setSortBy(opt.value)}
                >
                  <Text style={[theme.typography.bodyMedium, {
                    flex: 1,
                    color: sortBy === opt.value ? theme.colors.onPrimaryContainer : theme.colors.onSurface,
                    fontWeight: sortBy === opt.value ? '600' : '400',
                  }]}>
                    {opt.label}
                  </Text>
                  <MaterialIcons
                    name={sortBy === opt.value ? 'radio-button-on' : 'radio-button-off'}
                    size={20}
                    color={sortBy === opt.value ? theme.colors.primary : theme.colors.outline}
                  />
                </TouchableOpacity>
              ))}

              <View style={[styles.filterDivider, { backgroundColor: theme.colors.outlineVariant }]} />

              <Text style={[theme.typography.button, { color: theme.colors.onSurfaceVariant, marginBottom: 12, letterSpacing: 0.8 }]}>FILTERS</Text>
              <TouchableOpacity
                style={[styles.sortOption, {
                  backgroundColor: filterLowStock ? theme.colors.errorContainer : theme.colors.surfaceContainerLow,
                  borderColor: filterLowStock ? theme.colors.error : theme.colors.outlineVariant,
                }]}
                onPress={() => setFilterLowStock(v => !v)}
              >
                <MaterialIcons name="warning" size={18} color={filterLowStock ? theme.colors.error : theme.colors.onSurfaceVariant} style={{ marginRight: 12 }} />
                <Text style={[theme.typography.bodyMedium, {
                  flex: 1,
                  color: filterLowStock ? theme.colors.onErrorContainer : theme.colors.onSurface,
                  fontWeight: filterLowStock ? '600' : '400',
                }]}>
                  Low Stock Only
                </Text>
                <MaterialIcons
                  name={filterLowStock ? 'toggle-on' : 'toggle-off'}
                  size={32}
                  color={filterLowStock ? theme.colors.error : theme.colors.outline}
                />
              </TouchableOpacity>
            </ScrollView>

            <View style={[styles.modalFooter, { flexDirection: 'row', gap: 12 }]}>
              <TouchableOpacity
                style={[styles.cancelButton, { flex: 1, borderColor: theme.colors.outlineVariant }]}
                onPress={() => { setSortBy('qty_asc'); setFilterLowStock(false); }}
              >
                <Text style={[theme.typography.button, { color: theme.colors.onSurfaceVariant }]}>Reset</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.saveButton, { flex: 2, backgroundColor: theme.colors.primary }]}
                onPress={() => setFilterModalVisible(false)}
              >
                <Text style={[theme.typography.button, { color: theme.colors.onPrimary }]}>Done</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

    </View>
  );
}

const LOG_TYPE_CONFIG: Record<string, { icon: string; color: string }> = {
  restock:    { icon: 'add-circle',    color: theme.colors.tertiaryContainer },
  sale:       { icon: 'shopping-cart', color: theme.colors.primaryContainer },
  loss:       { icon: 'warning',       color: theme.colors.error },
  adjustment: { icon: 'edit',          color: theme.colors.secondary },
};

function fmtLogDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString('en-PH', { month: 'short', day: 'numeric' });
}

function logLabel(log: InventoryLog): string {
  const abs = Math.abs(log.quantity_changed);
  
  let label = '';
  switch (log.change_type) {
    case 'restock':    label = `Restocked +${abs}`; break;
    case 'sale':       label = `Sold -${abs}`; break;
    case 'adjustment': 
      label = log.quantity_changed !== 0 ? `Adjusted ${log.quantity_changed > 0 ? '+' : ''}${log.quantity_changed}` : 'Price Update'; 
      break;
    case 'loss':       label = `Loss -${abs}`; break;
    default:           label = 'Inventory Change';
  }

  // Add price change info if available
  if (log.old_price !== undefined && log.old_price !== null && log.new_price !== undefined && log.new_price !== null) {
    label += ` (${log.old_price} → ${log.new_price})`;
  }

  return label;
}

function ProductItem({ item, onAdjust, onEdit, onDelete, onPress }: { item: Product, onAdjust: () => void, onEdit: () => void, onDelete: () => void, onPress: () => void }) {
  const isLow = item.quantity <= LOW_STOCK_THRESHOLD;
  const [isExpanded, setIsExpanded] = useState(false);
  const [showAll, setShowAll] = useState(false);

  const { data: logs = [], isLoading: logsLoading } = useQuery({
    queryKey: ['inventory_logs', item.product_id],
    queryFn: () => InventoryService.getLogs(item.product_id),
    enabled: isExpanded,
    staleTime: 30_000,
  });

  const displayLogs = showAll ? logs : logs.slice(0, 3);

  return (
    <View>
      <TouchableOpacity
        activeOpacity={0.8}
        onPress={onPress}
        style={[styles.tableRow, { borderColor: theme.colors.outlineVariant }]}
      >
        {/* Product */}
        <View style={styles.tableColProduct}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
            <View style={[styles.tableThumb, { backgroundColor: theme.colors.surfaceVariant }]}>
              {item.image_url ? (
                <Image source={{ uri: item.image_url }} style={styles.tableThumbImage} resizeMode="cover" />
              ) : (
                <MaterialIcons name="inventory" size={20} color={theme.colors.outline} />
              )}
            </View>
            <View style={styles.tableNameBlock}>
              <Text style={[theme.typography.labelMedium, { color: theme.colors.onSurface, fontWeight: '600' }]} numberOfLines={2}>
                {item.name} {isTemp(item.product_id) && (
                  <MaterialIcons name="cloud-upload" size={14} color={theme.colors.outline} />
                )}
              </Text>
              <Text style={[theme.typography.labelSmall, { color: theme.colors.onSurfaceVariant }]}>
                ₱ {item.original_price.toFixed(2)}
              </Text>
            </View>
          </View>
        </View>

        {/* Qty */}
        <View style={styles.tableColQty}>
          <View style={[styles.qtyChip, {
            backgroundColor: isLow ? theme.colors.errorContainer : theme.colors.surfaceContainerHigh,
            borderColor: isLow ? theme.colors.error : theme.colors.outlineVariant,
          }]}>
            <Text style={[theme.typography.labelMedium, {
              color: isLow ? theme.colors.error : theme.colors.onSurface,
              fontWeight: '700',
            }]}>
              {item.quantity}
            </Text>
          </View>
        </View>

        {/* Desired Price */}
        <View style={styles.tableColPrice}>
          <View style={[styles.priceBadge, { backgroundColor: theme.colors.primary }]}>
            <Text style={[theme.typography.labelMedium, { color: theme.colors.onPrimary, fontWeight: '700' }]}>
              ₱{item.selling_price.toFixed(2)}
            </Text>
          </View>
        </View>

        {/* Actions */}
        <View style={styles.tableColActions}>
          <TouchableOpacity onPress={onDelete} style={styles.tableAction}>
            <MaterialIcons name="delete-outline" size={20} color={theme.colors.error} />
          </TouchableOpacity>
          <TouchableOpacity onPress={onEdit} style={styles.tableAction}>
            <MaterialIcons name="edit" size={20} color={theme.colors.primary} />
          </TouchableOpacity>
          <TouchableOpacity onPress={onAdjust} style={styles.tableAction}>
            <MaterialIcons name="add-circle-outline" size={20} color={theme.colors.tertiary} />
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => { setIsExpanded(v => !v); setShowAll(false); }}
            style={styles.tableAction}
          >
            <MaterialIcons
              name={isExpanded ? 'expand-less' : 'history'}
              size={20}
              color={isExpanded ? theme.colors.primary : theme.colors.outline}
            />
          </TouchableOpacity>
        </View>
      </TouchableOpacity>

      {/* Inline Log History */}
      {isExpanded && (
        <View style={[styles.logSection, {
          borderColor: theme.colors.outlineVariant,
          backgroundColor: theme.colors.surfaceContainerLow,
        }]}>
          {logsLoading ? (
            <ActivityIndicator size="small" color={theme.colors.primary} style={{ marginVertical: 6 }} />
          ) : logs.length === 0 ? (
            <Text style={[theme.typography.labelSmall, { color: theme.colors.onSurfaceVariant, textAlign: 'center', paddingVertical: 6 }]}>
              No stock history yet.
            </Text>
          ) : (
            <>
              {displayLogs.map(log => {
                const cfg = LOG_TYPE_CONFIG[log.change_type] ?? { icon: 'swap-vert', color: theme.colors.outline };
                return (
                  <View key={log.log_id} style={styles.logEntry}>
                    <MaterialIcons name={cfg.icon as any} size={13} color={cfg.color} style={{ marginRight: 7 }} />
                    <Text 
                      style={[theme.typography.labelSmall, { flex: 1, color: theme.colors.onSurface }]}
                      numberOfLines={1}
                      ellipsizeMode="tail"
                    >
                      {logLabel(log)}
                    </Text>
                    <Text style={[theme.typography.labelSmall, { color: theme.colors.onSurfaceVariant, marginLeft: 8 }]}>
                      {fmtLogDate(log.date)}
                    </Text>
                  </View>
                );
              })}
              {!showAll && logs.length > 3 && (
                <TouchableOpacity onPress={() => setShowAll(true)} style={styles.seeAllButton}>
                  <Text style={[theme.typography.labelSmall, { color: theme.colors.primary, fontWeight: '600' }]}>
                    See all {logs.length} entries
                  </Text>
                </TouchableOpacity>
              )}
            </>
          )}
        </View>
      )}
    </View>
  );
}

function ProductGridItem({ item, onAdjust, onEdit, onDelete, onPress }: { item: Product, onAdjust: () => void, onEdit: () => void, onDelete: () => void, onPress: () => void }) {
  const isLow = item.quantity <= LOW_STOCK_THRESHOLD;

  return (
    <TouchableOpacity
      activeOpacity={0.7}
      onPress={onPress}
      style={[
        styles.gridCard,
        { backgroundColor: theme.colors.surface },
        isLow && styles.lowStockCard,
        isLow && { borderColor: theme.colors.errorContainer },
      ]}
    >
      <TouchableOpacity 
        style={styles.gridEditBtn} 
        onPress={onEdit}
        activeOpacity={0.6}
      >
        <MaterialIcons name="edit" size={18} color="white" />
      </TouchableOpacity>

      <View style={[styles.gridImageContainer, { backgroundColor: theme.colors.surfaceVariant }]}>
        {item.image_url ? (
          <Image source={{ uri: item.image_url }} style={styles.gridImage} resizeMode="cover" />
        ) : (
          <MaterialIcons name="inventory" size={40} color={theme.colors.outline} />
        )}
        {isLow && (
          <View style={[styles.gridLowBadge, { backgroundColor: theme.colors.error }]}>
            <MaterialIcons name="warning" size={10} color={theme.colors.onError} />
            <Text style={[theme.typography.labelSmall, { color: theme.colors.onError, marginLeft: 2 }]}>Low</Text>
          </View>
        )}
      </View>

      <View style={styles.gridInfo}>
        <Text style={[theme.typography.labelMedium, { color: theme.colors.onSurface, fontWeight: '600' }]} numberOfLines={2}>
          {item.name} {isTemp(item.product_id) && (
            <MaterialIcons name="cloud-upload" size={14} color={theme.colors.outline} />
          )}
        </Text>
        <View style={styles.gridBottom}>
          <Text style={[theme.typography.labelSmall, { color: isLow ? theme.colors.error : theme.colors.tertiary, fontWeight: '600' }]}>
            {item.quantity} left
          </Text>
          <TouchableOpacity
            onPress={onAdjust}
            style={[styles.gridAdjustBtn, { backgroundColor: isLow ? theme.colors.error : theme.colors.primaryContainer }]}
          >
            <MaterialIcons name="add-circle-outline" size={16} color={isLow ? theme.colors.onError : theme.colors.onPrimaryContainer} />
          </TouchableOpacity>
        </View>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  headerContent: {
    padding: theme.spacing.containerPadding,
    paddingBottom: 8,
  },
  titleSection: {
    marginBottom: 24,
  },
  searchRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 8,
  },
  searchBar: {
    flex: 1,
    height: 48,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    borderWidth: 1,
    borderRadius: theme.borderRadius.lg,
    backgroundColor: theme.colors.surface,
  },
  searchInput: {
    flex: 1,
    marginLeft: 8,
    color: theme.colors.onSurface,
  },
  filterButton: {
    width: 48,
    height: 48,
    borderWidth: 1,
    borderRadius: theme.borderRadius.lg,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.colors.surface,
  },
  offlineBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    marginHorizontal: theme.spacing.containerPadding,
    borderRadius: theme.borderRadius.lg,
    marginBottom: 16,
  },
  listContent: {
    paddingHorizontal: theme.spacing.containerPadding,
    paddingBottom: 100,
  },
  productCard: {
    borderRadius: 16,
    padding: theme.spacing.containerPadding,
    marginBottom: 16,
    shadowColor: theme.colors.primaryContainer,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 3,
    position: 'relative',
    overflow: 'hidden',
  },
  lowStockCard: {
    borderWidth: 1,
  },
  lowStockBadge: {
    position: 'absolute',
    top: 0,
    right: 0,
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderBottomLeftRadius: 8,
    zIndex: 1,
  },
  cardContent: {
    flexDirection: 'row',
    gap: 16,
  },
  imageContainer: {
    width: 80,
    height: 80,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  productDetails: {
    flex: 1,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  actionButtons: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  actionIcon: {
    padding: 10,
  },
  priceStockRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    marginTop: 8,
  },
  stockInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 2,
  },
  orderButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    height: 36,
    borderRadius: 8,
  },
  adjustButton: {
    paddingHorizontal: 12,
    height: 32,
    borderRadius: 8,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'flex-end',
  },
  modalContainer: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
    maxHeight: '90%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
  },
  modalBody: {
    marginBottom: 24,
  },
  typeRow: {
    flexDirection: 'row',
    gap: 8,
  },
  typeButton: {
    flex: 1,
    paddingVertical: 10,
    borderWidth: 1,
    borderRadius: 8,
    alignItems: 'center',
  },
  modalInput: {
    height: 56,
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 16,
    backgroundColor: theme.colors.surface,
    color: theme.colors.onSurface,
  },
  modalFooter: {
    marginTop: 16,
    paddingBottom: Platform.OS === 'ios' ? 20 : 0,
  },
  saveButton: {
    height: 56,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  deleteButtonModal: {
    height: 56,
    borderRadius: 12,
    borderWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  fab: {
    position: 'absolute',
    bottom: 24,
    right: 24,
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 6,
  },
  manualEntryText: {
    ...theme.typography.button,
    color: 'white',
    textDecorationLine: 'underline',
  },
  confirmOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  confirmContainer: {
    width: '100%',
    borderRadius: 28,
    padding: 24,
    alignItems: 'center',
    elevation: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
  },
  warningIconContainer: {
    width: 64,
    height: 64,
    borderRadius: 32,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  confirmFooter: {
    flexDirection: 'row',
    gap: 12,
    width: '100%',
  },
  cancelButton: {
    flex: 1,
    height: 52,
    borderRadius: 12,
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  confirmDeleteButton: {
    flex: 1,
    height: 52,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  imagePicker: {
    height: 160,
    borderRadius: 16,
    marginBottom: 20,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: theme.colors.outlineVariant,
    borderStyle: 'dashed',
  },
  imagePlaceholder: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  imagePreviewContainer: {
    flex: 1,
    position: 'relative',
  },
  imagePreview: {
    width: '100%',
    height: '100%',
  },
  imageOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.3)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  productImage: {
    width: '100%',
    height: '100%',
  },
  gridRow: {
    gap: 8,
    marginBottom: 8,
  },
  gridCard: {
    flex: 1,
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: theme.colors.primaryContainer,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 3,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  gridImageContainer: {
    width: '100%',
    aspectRatio: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  gridImage: {
    width: '100%',
    height: '100%',
  },
  gridLowBadge: {
    position: 'absolute',
    top: 6,
    left: 6,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: 6,
  },
  gridInfo: {
    padding: 10,
    gap: 4,
  },
  gridBottom: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 4,
  },
  gridAdjustBtn: {
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tableContent: {
    paddingBottom: 100,
  },
  tableHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: theme.spacing.containerPadding,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderTopWidth: 1,
  },
  tableRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: theme.spacing.containerPadding,
    paddingVertical: 14,
    borderBottomWidth: 1,
    backgroundColor: theme.colors.surface,
  },
  tableColProduct: {
    flex: 3,
    paddingRight: 8,
  },
  tableColQty: {
    width: 38,
    alignItems: 'center',
  },
  tableColPrice: {
    width: 90,
    alignItems: 'center',
  },
  tableColActions: {
    width: 92,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: 2,
  },
  tableThumb: {
    width: 36,
    height: 36,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
    overflow: 'hidden',
  },
  tableThumbImage: {
    width: '100%',
    height: '100%',
  },
  tableNameBlock: {
    flex: 1,
  },
  qtyChip: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    borderWidth: 1,
    alignItems: 'center',
    minWidth: 32,
  },
  priceBadge: {
    paddingHorizontal: 6,
    paddingVertical: 4,
    borderRadius: 6,
    alignItems: 'center',
  },
  tableAction: {
    padding: 2,
  },
  gridEditBtn: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(0,0,0,0.4)',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 2,
  },
  sortOption: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 13,
    paddingHorizontal: 14,
    borderRadius: 10,
    borderWidth: 1,
    marginBottom: 8,
  },
  filterDivider: {
    height: 1,
    marginVertical: 20,
  },
  logSection: {
    paddingLeft: 62,
    paddingRight: theme.spacing.containerPadding,
    paddingVertical: 8,
    borderBottomWidth: 1,
    gap: 2,
  },
  logEntry: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 4,
  },
  seeAllButton: {
    paddingTop: 6,
    paddingBottom: 2,
    alignItems: 'flex-start',
  },
});
