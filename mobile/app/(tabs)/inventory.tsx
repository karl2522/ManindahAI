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
import { InventoryService, LOW_STOCK_THRESHOLD, InventoryChangeType } from '../../src/services/inventory';
import { theme } from '../../src/theme/theme';

const isTemp = (id: string) => id.startsWith('temp_');

type ModalMode = 'adjust' | 'edit' | 'add';

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

  useFocusEffect(
    useCallback(() => {
      if (store) refetch();
    }, [store, refetch])
  );

  const filteredProducts = useMemo(() => {
    return products
      .filter(p => p.name.toLowerCase().includes(searchQuery.toLowerCase()))
      .sort((a, b) => a.quantity - b.quantity);
  }, [products, searchQuery]);

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
      setEditForm(f => ({ ...f, image_url: result.assets[0].uri }));
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

  const confirmDelete = async () => {
    if (!productToDelete || !store) return;

    setDeleting(true);
    try {
      console.log(`[Inventory] Deleting product: ${productToDelete.product_id}`);
      
      if (!isTemp(productToDelete.product_id)) {
        await ProductService.delete(productToDelete.product_id);
      }
      
      // Optimistic cache update
      queryClient.setQueryData<Product[]>(['products', store.store_id], (old = []) =>
        old.filter(p => p.product_id !== productToDelete.product_id)
      );
      
      setDeleteModalVisible(false);
      setModalVisible(false);
      setSelectedProduct(null);
      setProductToDelete(null);
    } catch (e: any) {
      console.error('[Inventory] Delete failed:', e.message);
    } finally {
      setDeleting(false);
    }
  };

  const handleSave = async () => {
    if (!store) return;
    setSaving(true);
    try {
      if (modalMode === 'add') {
        const newPayload = {
          store_id: store.store_id,
          name: editForm.name.trim(),
          selling_price: parseFloat(editForm.selling_price) || 0,
          original_price: parseFloat(editForm.original_price) || 0,
          quantity: parseInt(editForm.quantity, 10) || 0,
          category: editForm.category.trim() || undefined,
          image_url: editForm.image_url || undefined,
        };
        if (!newPayload.name) throw new Error('Product name is required');
        
        if (onlineManager.isOnline()) {
          await ProductService.create(newPayload);
        } else {
          // Manual cache update for offline creation (temporary ID)
          const tempProduct: Product = {
            ...newPayload,
            product_id: `temp_${Date.now()}`,
            category: newPayload.category || null,
            image_url: newPayload.image_url || null,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          };
          queryClient.setQueryData<Product[]>(['products', store.store_id], (old = []) => [...old, tempProduct]);
        }
      } else if (modalMode === 'adjust' && selectedProduct) {
        const qty = parseInt(quantityInput, 10);
        if (!qty || qty <= 0) throw new Error('Enter a valid quantity');
        const sign = (changeType === 'restock' || changeType === 'adjustment') ? 1 : -1;
        const delta = qty * sign;

        if (onlineManager.isOnline()) {
          await InventoryService.adjustStock(selectedProduct.product_id, delta, changeType);
        } else {
          // Manual cache update for offline
          queryClient.setQueryData<Product[]>(['products', store.store_id], (old = []) =>
            old.map(p => p.product_id === selectedProduct.product_id ? { ...p, quantity: Math.max(0, p.quantity + delta) } : p)
          );
        }
      } else if (modalMode === 'edit' && selectedProduct) {
        const updatePayload = {
          name: editForm.name.trim(),
          selling_price: parseFloat(editForm.selling_price) || 0,
          original_price: parseFloat(editForm.original_price) || 0,
          category: editForm.category.trim() || undefined,
          image_url: editForm.image_url || undefined,
        };

        if (onlineManager.isOnline()) {
          await ProductService.update(selectedProduct.product_id, updatePayload);
        } else {
          queryClient.setQueryData<Product[]>(['products', store.store_id], (old = []) =>
            old.map(p => p.product_id === selectedProduct.product_id ? { ...p, ...updatePayload, category: updatePayload.category || null, image_url: updatePayload.image_url || null } : p)
          );
        }
      }
      
      queryClient.invalidateQueries({ queryKey: ['products', store.store_id] });
      setModalVisible(false);
    } catch (e: any) {
      console.error('[Inventory] Save failed:', e.message);
    } finally {
      setSaving(false);
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
          <TouchableOpacity style={[styles.filterButton, { borderColor: theme.colors.outlineVariant }]}>
            <MaterialIcons name="tune" size={24} color={theme.colors.onSurfaceVariant} />
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

      <FlatList
        data={filteredProducts}
        keyExtractor={(item) => item.product_id}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <View style={styles.centered}>
            <Text style={[theme.typography.bodyLarge, { color: theme.colors.onSurfaceVariant }]}>
              No products found.
            </Text>
          </View>
        }
        renderItem={({ item }) => (
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
                  
                  <Text style={[theme.typography.button, { color: theme.colors.onSurface, marginBottom: 8 }]}>Change Type</Text>
                  <View style={styles.typeRow}>
                    {(['restock', 'adjustment', 'loss'] as InventoryChangeType[]).map((type) => (
                      <TouchableOpacity
                        key={type}
                        style={[
                          styles.typeButton,
                          { borderColor: theme.colors.outlineVariant },
                          changeType === type && { backgroundColor: theme.colors.primaryContainer, borderColor: theme.colors.primary }
                        ]}
                        onPress={() => setChangeType(type)}
                      >
                        <Text style={[
                          theme.typography.labelMedium,
                          { color: theme.colors.onSurfaceVariant },
                          changeType === type && { color: theme.colors.primary, fontWeight: '700' }
                        ]}>
                          {type.charAt(0).toUpperCase() + type.slice(1)}
                        </Text>
                      </TouchableOpacity>
                    ))}
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
                        <Text style={[theme.typography.labelLarge, { color: theme.colors.outline, marginTop: 8 }]}>
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
                    onChangeText={(v) => setEditForm(f => ({ ...f, name: v }))}
                  />

                  <Text style={[theme.typography.bodyLarge, { color: theme.colors.onSurface, fontWeight: '500', marginBottom: 8, marginTop: 20 }]}>Selling Price (₱)</Text>
                  <TextInput
                    style={[styles.modalInput, theme.typography.bodyLarge, { borderColor: theme.colors.outlineVariant }]}
                    placeholder="0.00"
                    value={editForm.selling_price}
                    onChangeText={(v) => setEditForm(f => ({ ...f, selling_price: v }))}
                    keyboardType="decimal-pad"
                  />

                  <Text style={[theme.typography.bodyLarge, { color: theme.colors.onSurface, fontWeight: '500', marginBottom: 8, marginTop: 20 }]}>Cost Price (₱)</Text>
                  <TextInput
                    style={[styles.modalInput, theme.typography.bodyLarge, { borderColor: theme.colors.outlineVariant }]}
                    placeholder="0.00"
                    value={editForm.original_price}
                    onChangeText={(v) => setEditForm(f => ({ ...f, original_price: v }))}
                    keyboardType="decimal-pad"
                  />

                  <Text style={[theme.typography.bodyLarge, { color: theme.colors.onSurface, fontWeight: '500', marginBottom: 8, marginTop: 20 }]}>Category</Text>
                  <TextInput
                    style={[styles.modalInput, theme.typography.bodyLarge, { borderColor: theme.colors.outlineVariant }]}
                    placeholder="e.g. Beverages"
                    value={editForm.category}
                    onChangeText={(v) => setEditForm(f => ({ ...f, category: v }))}
                  />

                  {modalMode === 'add' && (
                    <>
                      <Text style={[theme.typography.bodyLarge, { color: theme.colors.onSurface, fontWeight: '500', marginBottom: 8, marginTop: 20 }]}>Initial Quantity</Text>
                      <TextInput
                        style={[styles.modalInput, theme.typography.bodyLarge, { borderColor: theme.colors.outlineVariant }]}
                        placeholder="0"
                        value={editForm.quantity}
                        onChangeText={(v) => setEditForm(f => ({ ...f, quantity: v }))}
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
                  disabled={deleting}
                >
                  {deleting ? (
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
                disabled={saving || deleting}
              >
                {saving ? (
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
                disabled={deleting}
              >
                <Text style={[theme.typography.button, { color: theme.colors.onSurfaceVariant }]}>Cancel</Text>
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={[styles.confirmDeleteButton, { backgroundColor: theme.colors.error }]}
                onPress={confirmDelete}
                disabled={deleting}
              >
                {deleting ? (
                  <ActivityIndicator color={theme.colors.onError} />
                ) : (
                  <Text style={[theme.typography.button, { color: theme.colors.onError }]}>Delete</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

function ProductItem({ item, onAdjust, onEdit, onDelete, onPress }: { item: Product, onAdjust: () => void, onEdit: () => void, onDelete: () => void, onPress: () => void }) {
  const isLow = item.quantity <= LOW_STOCK_THRESHOLD;
  const pending = isTemp(item.product_id);

  return (
    <TouchableOpacity 
      activeOpacity={0.7}
      onPress={onPress}
      style={[
        styles.productCard, 
        { backgroundColor: theme.colors.surface, borderColor: isLow ? theme.colors.errorContainer : 'transparent' },
        isLow && styles.lowStockCard
      ]}
    >
      {isLow && (
        <View style={[styles.lowStockBadge, { backgroundColor: theme.colors.error }]}>
          <Text style={[theme.typography.labelMedium, { color: theme.colors.onError, fontWeight: '700' }]}>
            Kulang sa Stocks
          </Text>
        </View>
      )}

      <View style={styles.cardContent}>
        <View style={[styles.imageContainer, { backgroundColor: theme.colors.surfaceVariant }]}>
          {item.image_url ? (
            <Image source={{ uri: item.image_url }} style={styles.productImage} />
          ) : (
            <MaterialIcons name="inventory" size={32} color={theme.colors.outline} />
          )}
        </View>

        <View style={styles.productDetails}>
          <View style={styles.nameRow}>
            <Text style={[theme.typography.h3, { color: theme.colors.onSurface, flex: 1 }]} numberOfLines={1}>
              {item.name}
            </Text>
            <View style={styles.actionButtons}>
              <TouchableOpacity onPress={onEdit} style={styles.actionIcon}>
                <MaterialIcons name="edit" size={20} color={theme.colors.primary} />
              </TouchableOpacity>
              <TouchableOpacity onPress={onDelete} style={styles.actionIcon}>
                <MaterialIcons name="delete-outline" size={20} color={theme.colors.error} />
              </TouchableOpacity>
            </View>
          </View>
          
          <Text style={[theme.typography.bodyMedium, { color: theme.colors.onSurfaceVariant }]}>
            {item.category || 'No Category'}
          </Text>

          <View style={styles.priceStockRow}>
            <View>
              <Text style={[theme.typography.labelMedium, { color: theme.colors.primary, fontWeight: '700' }]}>
                ₱ {item.selling_price.toFixed(2)}
              </Text>
              <View style={styles.stockInfo}>
                <MaterialIcons 
                  name={isLow ? "warning" : "inventory-2"} 
                  size={14} 
                  color={isLow ? theme.colors.error : theme.colors.tertiary} 
                />
                <Text style={[
                  theme.typography.bodyMedium, 
                  { color: isLow ? theme.colors.error : theme.colors.tertiary, marginLeft: 4, fontWeight: isLow ? '700' : '500' }
                ]}>
                  {item.quantity} items left
                </Text>
              </View>
            </View>

            {isLow && (
              <TouchableOpacity 
                style={[styles.orderButton, { backgroundColor: theme.colors.error }]}
                onPress={onAdjust}
              >
                <MaterialIcons name="shopping-cart" size={16} color={theme.colors.onError} />
                <Text style={[theme.typography.button, { color: theme.colors.onError, marginLeft: 4 }]}>
                  Mag-order
                </Text>
              </TouchableOpacity>
            )}
            
            {!isLow && (
              <TouchableOpacity 
                style={[styles.adjustButton, { borderColor: theme.colors.outlineVariant }]}
                onPress={onAdjust}
              >
                <Text style={[theme.typography.labelMedium, { color: theme.colors.onSurfaceVariant }]}>Adjust</Text>
              </TouchableOpacity>
            )}
          </View>
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
    backgroundColor: '#fff',
  },
  searchInput: {
    flex: 1,
    marginLeft: 8,
  },
  filterButton: {
    width: 48,
    height: 48,
    borderWidth: 1,
    borderRadius: theme.borderRadius.lg,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#fff',
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
    shadowColor: '#00535B',
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
    backgroundColor: 'rgba(0,0,0,0.4)',
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
    backgroundColor: '#fff',
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
    borderColor: '#eee',
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
});
