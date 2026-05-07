import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, Alert, ActivityIndicator, KeyboardAvoidingView, Platform, Image } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { MaterialIcons } from '@expo/vector-icons';
import { theme } from '../src/theme/theme';
import { ParsedReceiptItem } from '../src/services/receiptParser';
import { ProductService, OCRProductEntry } from '../src/services/product';
import { useStore } from '../src/hooks/useStore';

// ------------------------------------------------------------------
// ReviewItemCard Component
// ------------------------------------------------------------------
function ReviewItemCard({ 
  item, 
  updateItem, 
  deleteItem, 
  toggleConfirm 
}: { 
  item: ParsedReceiptItem; 
  updateItem: (id: string, updates: Partial<ParsedReceiptItem>) => void;
  deleteItem: (id: string) => void;
  toggleConfirm: (id: string) => void;
}) {
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [isLoadingImage, setIsLoadingImage] = useState(false);
  const [nameInputFocused, setNameInputFocused] = useState(false);
  const [priceError, setPriceError] = useState(false);
  const [qtyError, setQtyError] = useState(false);

  useEffect(() => {
    if (!item.name || item.name.length < 3) return;
    
    // Web browsers (localhost) strictly block direct requests to Open Food Facts via CORS policy.
    if (Platform.OS === 'web') return;

    let isMounted = true;
    
    const fetchImage = async () => {
      setIsLoadingImage(true);
      try {
        const searchQuery = item.name.replace(/^\d+\s+/, '').trim();
        const url = `https://world.openfoodfacts.org/cgi/search.pl?search_terms=${encodeURIComponent(searchQuery)}&search_simple=1&action=process&json=1`;
        const res = await fetch(url);
        const data = await res.json();
        
        if (isMounted && data.products && data.products.length > 0) {
          const product = data.products.find((p: any) => p.image_url || p.image_front_url);
          if (product) {
            const img = product.image_front_small_url || product.image_front_thumb_url || product.image_url;
            if (img) setImageUrl(img);
          }
        }
      } catch (err: any) {
        console.log('[ReviewItemCard] Image fetch failed:', err.message);
      } finally {
        if (isMounted) setIsLoadingImage(false);
      }
    };
    
    fetchImage();
    return () => { isMounted = false; };
  }, [item.name]);

  return (
    <View style={[styles.itemRow, item.isConfirmed && styles.itemRowConfirmed]}>
      {/* Product Column */}
      <View style={[styles.productCol, { flex: 1 }]}>
        <View style={styles.thumbnailContainer}>
          {isLoadingImage ? (
            <ActivityIndicator size="small" color={theme.colors.primary} />
          ) : imageUrl ? (
            <Image source={{ uri: imageUrl }} style={styles.thumbnailImage} />
          ) : (
            <MaterialIcons name="inventory-2" size={20} color={theme.colors.outlineVariant} />
          )}
        </View>
        <View style={styles.productInfo}>
          <TextInput
            style={[styles.nameInput, nameInputFocused && styles.nameInputFocused, item.isConfirmed && styles.nameInputDisabled]}
            value={item.name}
            placeholder="Product name"
            placeholderTextColor="#cbd5e1"
            editable={!item.isConfirmed}
            onChangeText={(val) => updateItem(item.id, { name: val })}
            onFocus={() => setNameInputFocused(true)}
            onBlur={() => setNameInputFocused(false)}
            multiline
            numberOfLines={2}
          />
        </View>
      </View>

      {/* Price Column */}
      <View style={[styles.priceCol]}>
        <View style={[styles.priceWrapper, item.isConfirmed && styles.priceWrapperDisabled]}>
          <Text style={styles.currencySymbol}>₱</Text>
          <TextInput
            style={[styles.priceInput, priceError && styles.priceInputError]}
            value={String((item.unitPrice || 0).toFixed(2))}
            editable={!item.isConfirmed}
            keyboardType="decimal-pad"
            onChangeText={(val) => {
              const price = parseFloat(val) || 0;
              setPriceError(price < 0);
              updateItem(item.id, { unitPrice: price });
            }}
            placeholder="0.00"
            placeholderTextColor="#cbd5e1"
          />
        </View>
      </View>

      {/* Qty Column */}
      <View style={[styles.qtyCol]}>
        <View style={[styles.qtyWrapper, item.isConfirmed && styles.qtyWrapperDisabled]}>
          <TextInput
            style={[styles.qtyInput, qtyError && styles.qtyInputError]}
            value={String(item.quantity)}
            editable={!item.isConfirmed}
            keyboardType="numeric"
            onChangeText={(val) => {
              const qty = parseInt(val, 10) || 0;
              setQtyError(qty < 0);
              updateItem(item.id, { quantity: qty });
            }}
            placeholderTextColor="#cbd5e1"
          />
        </View>
      </View>

      {/* Actions Column */}
      <View style={[styles.actionsCol]}>
        <TouchableOpacity 
          onPress={() => deleteItem(item.id)} 
          style={styles.actionBtn}
          accessibilityLabel="Delete item"
          accessibilityRole="button"
        >
          <MaterialIcons name="delete-outline" size={20} color={theme.colors.error} />
        </TouchableOpacity>
        <TouchableOpacity 
          onPress={() => toggleConfirm(item.id)} 
          style={[styles.actionBtn, item.isConfirmed && styles.actionBtnConfirmed]}
          accessibilityLabel={item.isConfirmed ? "Unconfirm item" : "Confirm item"}
          accessibilityRole="checkbox"
          accessibilityState={{ checked: item.isConfirmed }}
        >
          <MaterialIcons 
            name={item.isConfirmed ? "check-circle" : "check-circle-outline"} 
            size={20} 
            color={item.isConfirmed ? '#059669' : '#cbd5e1'} 
          />
        </TouchableOpacity>
      </View>
    </View>
  );
}

// ------------------------------------------------------------------
// Main Screen
// ------------------------------------------------------------------
export default function ReviewOCRScreen() {
  const router = useRouter();
  const { store } = useStore();
  const params = useLocalSearchParams<{ items: string; imageUri: string }>();
  
  const initialItems: ParsedReceiptItem[] = params.items ? JSON.parse(params.items) : [];
  const [items, setItems] = useState<ParsedReceiptItem[]>(initialItems);
  const [isSaving, setIsSaving] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [newItemName, setNewItemName] = useState('');
  const [newItemPrice, setNewItemPrice] = useState('');
  const [newItemQty, setNewItemQty] = useState('1');
  const [addModalErrors, setAddModalErrors] = useState({ name: false, price: false, qty: false });

  const updateItem = (id: string, updates: Partial<ParsedReceiptItem>) => {
    setItems(prev => prev.map(item => item.id === id ? { ...item, ...updates } : item));
  };

  const deleteItem = (id: string) => {
    setItems(prev => prev.filter(item => item.id !== id));
  };

  const toggleConfirm = (id: string) => {
    setItems(prev => prev.map(item => item.id === id ? { ...item, isConfirmed: !item.isConfirmed } : item));
  };

  const confirmAll = () => {
    setItems(prev => prev.map(item => ({ ...item, isConfirmed: true })));
  };

  const openAddModal = () => {
    setShowAddModal(true);
    setNewItemName('');
    setNewItemPrice('');
    setNewItemQty('1');
    setAddModalErrors({ name: false, price: false, qty: false });
  };

  const closeAddModal = () => {
    setShowAddModal(false);
    setNewItemName('');
    setNewItemPrice('');
    setNewItemQty('1');
    setAddModalErrors({ name: false, price: false, qty: false });
  };

  const handleAddItem = () => {
    const nameError = !newItemName.trim();
    const priceError = !newItemPrice.trim() || parseFloat(newItemPrice) < 0;
    const qtyError = !newItemQty.trim() || parseInt(newItemQty, 10) <= 0;

    if (nameError || priceError || qtyError) {
      setAddModalErrors({ name: nameError, price: priceError, qty: qtyError });
      return;
    }

    const newItem: ParsedReceiptItem = {
      id: `manual-${Date.now()}`,
      name: newItemName.trim(),
      unitPrice: parseFloat(newItemPrice),
      quantity: parseInt(newItemQty, 10),
      isConfirmed: false,
      confidence: 1.0,
    };

    setItems(prev => [...prev, newItem]);
    
    // Show success feedback
    Alert.alert(
      'Item Added',
      `"${newItemName}" has been added to your list.`,
      [{ text: 'OK', onPress: closeAddModal }]
    );
  };

  const isAddFormValid = newItemName.trim() && newItemPrice.trim() && 
                          parseFloat(newItemPrice) >= 0 && 
                          newItemQty.trim() && 
                          parseInt(newItemQty, 10) > 0;

  const handleSave = async () => {
    if (!store) return;
    
    const allVerified = items.length > 0 && items.every(i => i.isConfirmed);

    if (!allVerified) {
      Alert.alert(
        'Verify All Items',
        'Please confirm all items in the list before saving.',
        [{ text: 'OK' }]
      );
      return;
    }

    setIsSaving(true);
    try {
      const entries: OCRProductEntry[] = items.map(i => ({
        name: i.name,
        quantity: i.quantity,
        original_price: i.unitPrice || 0,
        selling_price: i.unitPrice || 0, 
        category: 'Scanned Product', 
      }));

      await ProductService.createFromOCR(store.store_id, entries);
      
      setTimeout(() => {
        router.replace('/inventory');
      }, 100);
    } catch (e: any) {
      console.error('[ReviewOCR] Save Error:', e);
      Alert.alert('Error', 'Failed to save items to the database. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  const verifiedCount = items.filter(i => i.isConfirmed).length;
  const allVerified = items.length > 0 && verifiedCount === items.length;

  return (
    <KeyboardAvoidingView 
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={styles.container}
    >
      <Stack.Screen 
        options={{ 
          title: 'Review Items',
          headerRight: () => (
            <TouchableOpacity onPress={() => router.back()} style={styles.headerBtn}>
              <Text style={styles.headerBtnText}>Cancel</Text>
            </TouchableOpacity>
          ),
          headerStyle: { backgroundColor: '#f8fafc' },
          headerShadowVisible: false,
        }} 
      />

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        
        <View style={styles.headerInfo}>
          <LinearGradient
            colors={[theme.colors.primary, theme.colors.primaryContainer]}
            style={styles.headerIconBadge}
          >
            <MaterialIcons name="document-scanner" size={24} color="white" />
          </LinearGradient>
          <View style={styles.headerTextWrapper}>
            <Text style={styles.headerTitle}>{items.length} Scanned Item{items.length !== 1 ? 's' : ''}</Text>
            <Text style={[styles.headerSubtitle, allVerified && { color: '#059669', fontWeight: '700' }]}>
              {allVerified 
                ? '✓ All items verified and ready' 
                : `${verifiedCount} of ${items.length} items verified`}
            </Text>
          </View>
        </View>

        <View style={styles.tableContainer}>
          <View style={styles.tableHeader}>
            <Text style={[styles.columnHeader, { flex: 1, marginRight: 8 }]}>Product</Text>
            <Text style={[styles.columnHeader, { minWidth: 48, textAlign: 'center' }]}>Price</Text>
            <Text style={[styles.columnHeader, { minWidth: 36, textAlign: 'center' }]}>Qty</Text>
            <Text style={[styles.columnHeader, { minWidth: 72, textAlign: 'right' }]}>Actions</Text>
          </View>

          {items.map((item) => (
            <ReviewItemCard 
              key={item.id} 
              item={item} 
              updateItem={updateItem} 
              deleteItem={deleteItem} 
              toggleConfirm={toggleConfirm} 
            />
          ))}

          {items.length === 0 && (
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyText}>No items found. Try scanning again.</Text>
            </View>
          )}

          <TouchableOpacity style={styles.addItemBtn} onPress={openAddModal}>
            <MaterialIcons name="add-circle-outline" size={22} color={theme.colors.primary} />
            <Text style={styles.addItemText}>Add Missing Item</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>

      {/* Floating Footer */}
      <View style={styles.footerContainer}>
        <TouchableOpacity 
          style={[styles.footerBtn, styles.confirmAllBtn]}
          onPress={confirmAll}
        >
          <Text style={styles.confirmAllText}>Confirm All ({items.length} Items)</Text>
        </TouchableOpacity>

        <TouchableOpacity 
          style={[styles.footerBtn, styles.saveBtn, !allVerified && styles.saveBtnDisabled]}
          onPress={handleSave}
          disabled={isSaving || !allVerified}
          activeOpacity={0.8}
        >
          {isSaving ? (
            <ActivityIndicator color="white" />
          ) : (
            <>
              <MaterialIcons name="file-download" size={20} color="white" />
              <Text style={styles.saveText}>
                Save {verifiedCount} Verified Items
              </Text>
            </>
          )}
        </TouchableOpacity>
      </View>

      {/* Add Missing Item Modal */}
      {showAddModal && (
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <View>
                <Text style={styles.modalTitle}>Add Missing Item</Text>
                <Text style={styles.modalSubtitle}>Fill in the product details below</Text>
              </View>
              <TouchableOpacity onPress={closeAddModal} style={styles.modalCloseBtn}>
                <MaterialIcons name="close" size={24} color="#0f172a" />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} style={styles.modalFormScroll}>
              {/* Product Name Input */}
              <View style={styles.modalField}>
                <View style={styles.fieldHeader}>
                  <Text style={styles.modalLabel}>Product Name</Text>
                  <Text style={styles.fieldRequired}>*</Text>
                </View>
                <TextInput
                  style={[styles.modalInput, addModalErrors.name && styles.modalInputError, newItemName && styles.modalInputFilled]}
                  placeholder="e.g., Coca Cola 500ml"
                  placeholderTextColor="#cbd5e1"
                  value={newItemName}
                  onChangeText={(val) => {
                    setNewItemName(val);
                    if (addModalErrors.name && val.trim()) {
                      setAddModalErrors(prev => ({ ...prev, name: false }));
                    }
                  }}
                  editable={true}
                  maxLength={100}
                />
                <View style={styles.fieldHint}>
                  <Text style={styles.hintText}>{newItemName.length}/100 characters</Text>
                  {addModalErrors.name && <Text style={styles.fieldError}>Product name is required</Text>}
                </View>
              </View>

              {/* Price Input */}
              <View style={styles.modalField}>
                <View style={styles.fieldHeader}>
                  <Text style={styles.modalLabel}>Price</Text>
                  <Text style={styles.fieldRequired}>*</Text>
                </View>
                <View style={[styles.priceInputWrapper, addModalErrors.price && styles.modalInputError, newItemPrice && styles.modalInputFilled]}>
                  <Text style={styles.currencyPrefix}>₱</Text>
                  <TextInput
                    style={styles.modalInputPrice}
                    placeholder="0.00"
                    placeholderTextColor="#cbd5e1"
                    keyboardType="decimal-pad"
                    value={newItemPrice}
                    onChangeText={(val) => {
                      setNewItemPrice(val);
                      if (addModalErrors.price && val.trim() && parseFloat(val) >= 0) {
                        setAddModalErrors(prev => ({ ...prev, price: false }));
                      }
                    }}
                  />
                </View>
                {addModalErrors.price && <Text style={styles.fieldError}>Valid price is required (must be ≥ 0)</Text>}
              </View>

              {/* Quantity Input */}
              <View style={styles.modalField}>
                <View style={styles.fieldHeader}>
                  <Text style={styles.modalLabel}>Quantity</Text>
                  <Text style={styles.fieldRequired}>*</Text>
                </View>
                <TextInput
                  style={[styles.modalInput, addModalErrors.qty && styles.modalInputError, newItemQty && styles.modalInputFilled]}
                  placeholder="1"
                  placeholderTextColor="#cbd5e1"
                  keyboardType="number-pad"
                  value={newItemQty}
                  onChangeText={(val) => {
                    setNewItemQty(val);
                    if (addModalErrors.qty && val.trim() && parseInt(val, 10) > 0) {
                      setAddModalErrors(prev => ({ ...prev, qty: false }));
                    }
                  }}
                />
                {addModalErrors.qty && <Text style={styles.fieldError}>Quantity must be greater than 0</Text>}
              </View>

              {/* Summary Preview */}
              {isAddFormValid && (
                <View style={styles.summaryBox}>
                  <MaterialIcons name="check-circle" size={20} color="#059669" />
                  <View style={styles.summaryContent}>
                    <Text style={styles.summaryTitle}>Ready to add</Text>
                    <Text style={styles.summaryText}>{newItemQty}x {newItemName} @ ₱{parseFloat(newItemPrice).toFixed(2)}</Text>
                  </View>
                </View>
              )}
            </ScrollView>

            {/* Modal Buttons */}
            <View style={styles.modalButtonsContainer}>
              <TouchableOpacity 
                style={[styles.modalBtn, styles.modalBtnCancel]}
                onPress={closeAddModal}
              >
                <Text style={styles.modalBtnCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={[
                  styles.modalBtn, 
                  styles.modalBtnAdd,
                  !isAddFormValid && styles.modalBtnAddDisabled
                ]}
                onPress={handleAddItem}
                disabled={!isAddFormValid}
              >
                <MaterialIcons name="add-circle" size={20} color={isAddFormValid ? "white" : "#cbd5e1"} />
                <Text style={[styles.modalBtnAddText, !isAddFormValid && styles.modalBtnAddTextDisabled]}>
                  Add Item
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      )}
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc' },
  scrollContent: { paddingBottom: 160 },
  
  headerBtn: { paddingHorizontal: 16, paddingVertical: 8 },
  headerBtnText: { color: theme.colors.primary, fontWeight: '700', fontSize: 16 },

  headerInfo: { 
    flexDirection: 'row', 
    alignItems: 'center',
    padding: 20, 
    gap: 16,
  },
  headerIconBadge: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTextWrapper: { flex: 1 },
  headerTitle: { ...theme.typography.h3, color: '#0f172a', fontWeight: '800' },
  headerSubtitle: { ...theme.typography.bodyMedium, color: '#64748b', marginTop: 2 },

  tableContainer: {
    backgroundColor: '#ffffff',
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: '#e2e8f0',
  },
  tableHeader: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
    alignItems: 'center',
  },
  columnHeader: {
    fontSize: 12,
    fontWeight: '700',
    color: '#475569',
  },

  itemRow: {
    flexDirection: 'row',
    alignItems: 'center',  // Center items vertically for better mobile alignment
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
    gap: 8,
    backgroundColor: '#ffffff',
    minHeight: 68,  // Ensure row has enough height for 2-line text + padding
  },
  itemRowConfirmed: {
    backgroundColor: '#f0fdf4',
    borderLeftWidth: 4,
    borderLeftColor: '#059669',
    paddingHorizontal: 12,
  },
  productCol: {
    flexDirection: 'row',
    alignItems: 'center',  // Center thumbnail with text
    gap: 12,
    flex: 1,
    minWidth: 0,
  },
  thumbnailContainer: {
    width: 44,
    height: 44,
    borderRadius: 8,
    backgroundColor: '#e2e8f0',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  thumbnailImage: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  productInfo: {
    flex: 1,
    minHeight: 52,  // Accommodate 2 lines of text: (14px * 1.4 lineHeight * 2) + padding
    minWidth: 0,
  },
  nameInput: {
    fontSize: 14,
    fontWeight: '700',
    lineHeight: 20,  // 14 * 1.43 = proper multiline spacing
    color: '#0f172a',
    padding: 0,
    margin: 0,
    width: '100%',
    flexShrink: 1,
    borderBottomWidth: 1,
    borderBottomColor: 'transparent',
    paddingBottom: 4,
    textAlignVertical: 'top',  // Top align for proper text display with multiline
  },
  nameInputFocused: {
    borderBottomColor: theme.colors.primary,
  },
  nameInputDisabled: {
    color: '#64748b',
  },

  qtyCol: {
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 36,
    height: 52,
  },
  qtyWrapper: {
    borderWidth: 1,
    borderColor: '#cbd5e1',
    borderRadius: 6,
    width: 36,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'white',
  },
  qtyWrapperDisabled: {
    backgroundColor: '#f1f5f9',
    borderColor: '#e2e8f0',
  },
  qtyInput: {
    fontSize: 13,
    fontWeight: '700',
    color: '#0f172a',
    textAlign: 'center',
    width: '100%',
    height: '100%',
    padding: 0,
  },
  qtyInputError: {
    color: theme.colors.error,
  },
  priceCol: {
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 48,
    height: 52,
  },
  priceWrapper: {
    flexDirection: 'row',
    borderWidth: 1,
    borderColor: '#cbd5e1',
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 6,
    backgroundColor: 'white',
    height: 44,
    minWidth: 48,
  },
  priceWrapperDisabled: {
    backgroundColor: '#f1f5f9',
    borderColor: '#e2e8f0',
  },
  currencySymbol: {
    fontSize: 11,
    fontWeight: '600',
    color: '#475569',
    marginRight: 2,
  },
  priceInput: {
    fontSize: 11,
    fontWeight: '600',
    color: '#0f172a',
    flex: 1,
    textAlign: 'right',
    padding: 0,
    margin: 0,
    maxWidth: 30,
  },
  priceInputError: {
    color: theme.colors.error,
  },
  actionsCol: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: 4,
    minWidth: 72,
    height: 52,
  },
  actionBtn: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 20,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  actionBtnConfirmed: {
    backgroundColor: '#f0fdf4',
    borderColor: '#059669',
  },

  emptyContainer: {
    padding: 32,
    alignItems: 'center',
  },
  emptyText: {
    ...theme.typography.bodyMedium,
    color: '#64748b',
  },

  addItemBtn: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    justifyContent: 'center', 
    gap: 8, 
    padding: 16, 
    backgroundColor: '#f0f9ff',
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: '#e0f2fe', 
  },
  addItemText: { ...theme.typography.button, color: theme.colors.primary, fontWeight: '700' },
  
  footerContainer: { 
    position: 'absolute', 
    bottom: 0, 
    left: 0, 
    right: 0, 
    backgroundColor: '#ffffff',
    padding: 20,
    paddingBottom: Platform.OS === 'ios' ? 40 : 20,
    borderTopWidth: 1,
    borderTopColor: '#e2e8f0',
    gap: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.05,
    shadowRadius: 12,
    elevation: 8,
  },
  footerBtn: {
    height: 52,
    borderRadius: 26,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  confirmAllBtn: {
    backgroundColor: '#002f35', 
  },
  confirmAllText: {
    color: 'white',
    fontSize: 15,
    fontWeight: '700',
  },
  saveBtn: {
    backgroundColor: theme.colors.primary, 
  },
  saveBtnDisabled: {
    backgroundColor: '#cbd5e1', 
  },
  saveText: {
    color: 'white',
    fontSize: 15,
    fontWeight: '700',
  },

  // Modal Styles
  modalOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
    alignItems: 'center',
    zIndex: 1000,
  },
  modalContent: {
    backgroundColor: '#ffffff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingHorizontal: 24,
    paddingTop: 24,
    paddingBottom: 24,
    maxHeight: '85%',
    width: '100%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 12,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 24,
    gap: 16,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#0f172a',
    lineHeight: 24,
  },
  modalSubtitle: {
    fontSize: 13,
    color: '#64748b',
    marginTop: 4,
    fontWeight: '500',
  },
  modalCloseBtn: {
    padding: 8,
    marginRight: -8,
    marginTop: -8,
  },
  modalFormScroll: {
    maxHeight: 300,
    marginBottom: 16,
  },
  modalField: {
    marginBottom: 18,
  },
  fieldHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
    gap: 4,
  },
  modalLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#0f172a',
  },
  fieldRequired: {
    fontSize: 14,
    fontWeight: '700',
    color: theme.colors.error,
  },
  modalInput: {
    borderWidth: 1.5,
    borderColor: '#cbd5e1',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 14,
    fontWeight: '500',
    color: '#0f172a',
    backgroundColor: '#ffffff',
    minHeight: 48,
  },
  modalInputFilled: {
    borderColor: theme.colors.primary,
    backgroundColor: '#f0f9ff',
  },
  modalInputError: {
    borderColor: theme.colors.error,
    backgroundColor: '#fef2f2',
  },
  priceInputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: '#cbd5e1',
    borderRadius: 10,
    paddingLeft: 12,
    backgroundColor: '#ffffff',
    minHeight: 48,
  },
  currencyPrefix: {
    fontSize: 14,
    fontWeight: '600',
    color: '#475569',
    marginRight: 4,
  },
  modalInputPrice: {
    flex: 1,
    paddingRight: 14,
    paddingVertical: 12,
    fontSize: 14,
    fontWeight: '500',
    color: '#0f172a',
  },
  fieldHint: {
    marginTop: 6,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  hintText: {
    fontSize: 12,
    color: '#94a3b8',
    fontWeight: '500',
  },
  fieldError: {
    color: theme.colors.error,
    fontSize: 12,
    fontWeight: '600',
  },
  summaryBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: '#f0fdf4',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 12,
    marginBottom: 8,
    borderLeftWidth: 4,
    borderLeftColor: '#059669',
  },
  summaryContent: {
    flex: 1,
  },
  summaryTitle: {
    fontSize: 12,
    fontWeight: '600',
    color: '#059669',
    marginBottom: 2,
  },
  summaryText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#0f172a',
  },
  modalButtonsContainer: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 16,
  },
  modalBtn: {
    flex: 1,
    height: 48,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 8,
  },
  modalBtnCancel: {
    backgroundColor: '#f1f5f9',
    borderWidth: 1.5,
    borderColor: '#cbd5e1',
  },
  modalBtnCancelText: {
    color: '#475569',
    fontSize: 14,
    fontWeight: '700',
  },
  modalBtnAdd: {
    backgroundColor: theme.colors.primary,
  },
  modalBtnAddDisabled: {
    backgroundColor: '#f1f5f9',
    borderWidth: 1.5,
    borderColor: '#cbd5e1',
  },
  modalBtnAddText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '700',
  },
  modalBtnAddTextDisabled: {
    color: '#cbd5e1',
  },
});
