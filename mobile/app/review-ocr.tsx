import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, Alert, ActivityIndicator, KeyboardAvoidingView, Platform, Image } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { MaterialIcons } from '@expo/vector-icons';
import { theme } from '../src/theme/theme';
import { ParsedReceiptItem } from '../src/services/receiptParser';
import { InventoryService } from '../src/services/inventory';
import { useStore } from '../src/hooks/useStore';
import { ProductService, OCRProductEntry } from '../src/services/product';

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

  useEffect(() => {
    if (!item.name || item.name.length < 3) return;
    
    // Web browsers (localhost) strictly block direct requests to Open Food Facts via CORS policy.
    // We disable this feature on web to prevent the console error you're seeing.
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
        // Silently fail on network/API errors
        console.log('[ReviewItemCard] Image fetch failed:', err.message);
      } finally {
        if (isMounted) setIsLoadingImage(false);
      }
    };
    
    fetchImage();
    return () => { isMounted = false; };
  }, [item.name]);

  return (
    <View style={[styles.itemCard, item.isConfirmed && styles.confirmedCard]}>
      {item.isConfirmed && (
        <View style={styles.confirmedHeader}>
          <MaterialIcons name="check-circle" size={16} color="#007052" />
          <Text style={styles.confirmedHeaderText}>Ready to Save</Text>
        </View>
      )}

      {/* Top row: Thumbnail + Details */}
      <View style={styles.cardMainRow}>
        
        {/* Left: Thumbnail Section */}
        <View style={styles.thumbnailSection}>
          <View style={[styles.thumbnailContainer, item.isConfirmed && styles.thumbnailConfirmed]}>
            {isLoadingImage ? (
              <ActivityIndicator size="small" color={theme.colors.primary} />
            ) : imageUrl ? (
              <Image source={{ uri: imageUrl }} style={styles.thumbnailImage} />
            ) : (
              <MaterialIcons name="image" size={32} color={theme.colors.outlineVariant} />
            )}
          </View>
          {item.confidence < 0.8 && !item.isConfirmed && (
            <View style={styles.confidenceBadge}>
              <MaterialIcons name="warning-amber" size={12} color="#b45309" />
              <Text style={styles.confidenceText}>{Math.round(item.confidence * 100)}% Match</Text>
            </View>
          )}
        </View>

        {/* Right: Details Form */}
        <View style={styles.detailsContainer}>
          <View style={styles.inputGroup}>
            <Text style={styles.fieldLabel}>PRODUCT NAME</Text>
            <View style={[styles.inputWrapper, item.isConfirmed && styles.inputWrapperDisabled]}>
              <MaterialIcons name="edit-note" size={18} color={theme.colors.outlineVariant} style={styles.inputIcon} />
              <TextInput
                style={styles.textInputFull}
                value={item.name}
                editable={!item.isConfirmed}
                onChangeText={(val) => updateItem(item.id, { name: val })}
                placeholder="e.g. Coke 1.5L"
                placeholderTextColor={theme.colors.outlineVariant}
                multiline
              />
            </View>
          </View>
          
          <View style={styles.metricsRow}>
            <View style={[styles.inputGroup, { flex: 1 }]}>
              <Text style={styles.fieldLabel}>QTY</Text>
              <View style={[styles.qtyContainer, item.isConfirmed && styles.inputWrapperDisabled]}>
                <TouchableOpacity 
                  onPress={() => updateItem(item.id, { quantity: Math.max(1, item.quantity - 1) })}
                  style={styles.qtyBtn}
                  disabled={item.isConfirmed}
                >
                  <MaterialIcons name="remove" size={16} color={item.isConfirmed ? theme.colors.outlineVariant : theme.colors.primary} />
                </TouchableOpacity>
                <TextInput
                  style={styles.qtyInput}
                  value={String(item.quantity)}
                  editable={!item.isConfirmed}
                  keyboardType="numeric"
                  onChangeText={(val) => updateItem(item.id, { quantity: parseInt(val, 10) || 0 })}
                />
                <TouchableOpacity 
                  onPress={() => updateItem(item.id, { quantity: item.quantity + 1 })}
                  style={styles.qtyBtn}
                  disabled={item.isConfirmed}
                >
                  <MaterialIcons name="add" size={16} color={item.isConfirmed ? theme.colors.outlineVariant : theme.colors.primary} />
                </TouchableOpacity>
              </View>
            </View>

            <View style={[styles.inputGroup, { flex: 1.2 }]}>
              <Text style={styles.fieldLabel}>PRICE</Text>
              <View style={[styles.inputWrapper, item.isConfirmed && styles.inputWrapperDisabled]}>
                <Text style={styles.currencyText}>₱</Text>
                <TextInput
                  style={styles.priceInput}
                  value={item.unitPrice ? String(item.unitPrice) : ''}
                  editable={!item.isConfirmed}
                  keyboardType="numeric"
                  placeholder="0.00"
                  placeholderTextColor={theme.colors.outlineVariant}
                  onChangeText={(val) => updateItem(item.id, { unitPrice: parseFloat(val) || 0 })}
                />
              </View>
            </View>
          </View>
        </View>
      </View>

      {/* Bottom row: Actions */}
      <View style={styles.cardActionsRow}>
        <TouchableOpacity onPress={() => deleteItem(item.id)} style={styles.deleteBtn}>
          <MaterialIcons name="delete-outline" size={20} color={theme.colors.error} />
          <Text style={styles.deleteText}>Remove</Text>
        </TouchableOpacity>

        <TouchableOpacity 
          style={[styles.confirmBtn, item.isConfirmed ? styles.editBtn : styles.primaryBtn]}
          onPress={() => toggleConfirm(item.id)}
          activeOpacity={0.8}
        >
          <MaterialIcons 
            name={item.isConfirmed ? "edit" : "verified"} 
            size={18} 
            color={item.isConfirmed ? theme.colors.primary : 'white'} 
          />
          <Text style={[styles.confirmText, item.isConfirmed ? styles.editText : styles.primaryText]}>
            {item.isConfirmed ? 'Edit Item' : 'Confirm'}
          </Text>
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

  const updateItem = (id: string, updates: Partial<ParsedReceiptItem>) => {
    setItems(prev => prev.map(item => item.id === id ? { ...item, ...updates } : item));
  };

  const deleteItem = (id: string) => {
    setItems(prev => prev.filter(item => item.id !== id));
  };

  const toggleConfirm = (id: string) => {
    setItems(prev => prev.map(item => item.id === id ? { ...item, isConfirmed: !item.isConfirmed } : item));
  };

  const handleSave = async () => {
    if (!store) return;
    
    const allVerified = items.length > 0 && items.every(i => i.isConfirmed);

    if (!allVerified) {
      Alert.alert(
        'Verify All Items',
        'Please confirm all items in the list before saving. If an item is incorrect or not needed, you can remove it using the "Remove" button.',
        [{ text: 'OK' }]
      );
      return;
    }

    performSave(items);
  };

  const performSave = async (confirmedItems: ParsedReceiptItem[]) => {
    if (!store) return;
    setIsSaving(true);
    try {
      console.log('[ReviewOCR] Saving all verified items to store:', store.store_id, confirmedItems.length);
      
      const entries: OCRProductEntry[] = confirmedItems.map(i => ({
        name: i.name,
        quantity: i.quantity,
        original_price: i.unitPrice || 0,
        selling_price: i.unitPrice || 0, 
        category: 'Scanned Product', 
      }));

      await ProductService.createFromOCR(store.store_id, entries);
      
      const navigateToInventory = () => {
        console.log('[ReviewOCR] Save successful, navigating to inventory...');
        // router.replace('/inventory') is often more reliable than the full group path on web
        setTimeout(() => {
          router.replace('/inventory');
        }, 100);
      };

      navigateToInventory();
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
          headerStyle: { backgroundColor: '#f4fafd' },
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
            <Text style={[styles.headerSubtitle, allVerified && { color: '#007052', fontWeight: '700' }]}>
              {allVerified 
                ? '✓ All items verified and ready' 
                : `${verifiedCount} of ${items.length} items verified`}
            </Text>
          </View>
        </View>

        <View style={styles.listContainer}>
          {items.map((item) => (
            <ReviewItemCard 
              key={item.id} 
              item={item} 
              updateItem={updateItem} 
              deleteItem={deleteItem} 
              toggleConfirm={toggleConfirm} 
            />
          ))}

          <TouchableOpacity style={styles.addItemBtn}>
            <MaterialIcons name="add-circle-outline" size={22} color={theme.colors.primary} />
            <Text style={styles.addItemText}>Add Missing Item</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>

      {/* Floating Gradient Footer */}
      <View style={styles.footerContainer} pointerEvents="box-none">
        <LinearGradient
          colors={['transparent', 'rgba(244, 250, 253, 0.95)', '#f4fafd', '#f4fafd']}
          style={StyleSheet.absoluteFill}
          pointerEvents="none"
        />
        <TouchableOpacity 
          style={[styles.saveBtnWrapper, !allVerified && { opacity: 0.6 }]}
          onPress={handleSave}
          disabled={isSaving || !allVerified}
          activeOpacity={0.85}
        >
          <LinearGradient
            colors={isSaving || !allVerified ? ['#94a3b8', '#cbd5e1'] : [theme.colors.primary, theme.colors.primaryContainer]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.saveBtn}
          >
            {isSaving ? (
              <ActivityIndicator color="white" />
            ) : (
              <>
                <MaterialIcons 
                  name={allVerified ? "save-alt" : "lock-outline"} 
                  size={22} 
                  color="white" 
                />
                <Text style={styles.saveBtnText}>
                  {allVerified 
                    ? `Save ${items.length} Items to Inventory` 
                    : `Verify ${items.length - verifiedCount} more to Save`}
                </Text>
              </>
            )}
          </LinearGradient>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f4fafd' }, // Updated to Soft Pearl background
  scrollContent: { paddingBottom: 130 },
  
  headerBtn: { paddingHorizontal: 16, paddingVertical: 8 },
  headerBtnText: { color: theme.colors.primary, fontWeight: '700', fontSize: 16 },

  headerInfo: { 
    flexDirection: 'row', 
    alignItems: 'center',
    padding: 24, 
    gap: 16,
    paddingTop: 12,
  },
  headerIconBadge: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: theme.colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  headerTextWrapper: { flex: 1 },
  headerTitle: { ...theme.typography.h2, color: '#0f172a', fontWeight: '800' },
  headerSubtitle: { ...theme.typography.bodyMedium, color: '#64748b', marginTop: 4 },

  listContainer: {
    paddingHorizontal: 16,
  },

  // Card Styles
  itemCard: {
    backgroundColor: 'white',
    borderRadius: 20,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#003a40',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.06,
    shadowRadius: 16,
    elevation: 3,
  },
  confirmedCard: { 
    backgroundColor: '#f0fdf9',
    borderColor: '#007052',
    borderWidth: 1,
    shadowOpacity: 0.02,
  },
  confirmedHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 12,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#d1fae5',
  },
  confirmedHeaderText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#007052',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  
  cardMainRow: {
    flexDirection: 'row',
    gap: 16,
  },
  
  thumbnailSection: {
    alignItems: 'center',
    gap: 8,
  },
  thumbnailContainer: {
    width: 80,
    height: 80,
    borderRadius: 16,
    backgroundColor: '#f8fafc',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  thumbnailConfirmed: {
    opacity: 0.8,
  },
  thumbnailImage: {
    width: '100%',
    height: '100%',
    resizeMode: 'contain',
    backgroundColor: 'transparent',
  },
  confidenceBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#fef3c7',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    borderWidth: 0.5,
    borderColor: '#f59e0b',
  },
  confidenceText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#b45309',
  },
  
  detailsContainer: {
    flex: 1,
    gap: 12,
  },
  inputGroup: {
    gap: 6,
  },
  fieldLabel: {
    fontSize: 10,
    fontWeight: '800',
    color: '#64748b',
    letterSpacing: 0.8,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f8fafc',
    borderRadius: 12,
    paddingHorizontal: 12,
    minHeight: 44,
  },
  inputWrapperDisabled: {
    backgroundColor: 'transparent',
    paddingHorizontal: 0,
  },
  inputIcon: {
    marginRight: 8,
  },
  textInputFull: { 
    flex: 1,
    ...theme.typography.bodyLarge, 
    fontWeight: '700', 
    color: '#0f172a', 
    paddingVertical: 10,
  },
  
  metricsRow: {
    flexDirection: 'row',
    gap: 12,
  },
  qtyContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f8fafc',
    borderRadius: 12,
    overflow: 'hidden',
  },
  qtyBtn: {
    padding: 10,
  },
  qtyInput: { 
    flex: 1,
    ...theme.typography.bodyLarge, 
    fontWeight: '800',
    color: '#0f172a', 
    textAlign: 'center',
    paddingVertical: 10,
  },
  
  currencyText: { 
    fontSize: 16,
    color: '#64748b', 
    fontWeight: '800', 
    marginRight: 6 
  },
  priceInput: { 
    flex: 1,
    ...theme.typography.bodyLarge, 
    color: '#0f172a', 
    fontWeight: '800', 
    paddingVertical: 10,
  },
  
  cardActionsRow: { 
    flexDirection: 'row', 
    justifyContent: 'space-between', 
    alignItems: 'center', 
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#f1f5f9',
  },
  
  deleteBtn: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    gap: 4, 
    paddingHorizontal: 8, 
    paddingVertical: 8 
  },
  deleteText: { 
    fontSize: 14, 
    fontWeight: '700', 
    color: theme.colors.error 
  },

  confirmBtn: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    gap: 6, 
    paddingHorizontal: 20, 
    paddingVertical: 12, 
    borderRadius: 24, 
  },
  primaryBtn: { 
    backgroundColor: theme.colors.primary,
    shadowColor: theme.colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  editBtn: {
    backgroundColor: theme.colors.primary + '15',
  },
  primaryText: { 
    fontSize: 14,
    color: 'white', 
    fontWeight: '800' 
  },
  editText: {
    fontSize: 14,
    color: theme.colors.primary,
    fontWeight: '800'
  },
  
  addItemBtn: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    justifyContent: 'center', 
    gap: 8, 
    padding: 18, 
    backgroundColor: 'white', 
    borderStyle: 'dashed', 
    borderWidth: 2, 
    borderColor: '#cbd5e1', 
    borderRadius: 20, 
    marginTop: 8, 
    marginBottom: 32 
  },
  addItemText: { ...theme.typography.button, color: '#475569', fontWeight: '700' },
  
  footerContainer: { 
    position: 'absolute', 
    bottom: 0, 
    left: 0, 
    right: 0, 
    height: 120, 
    justifyContent: 'flex-end', 
    padding: 20,
    paddingBottom: Platform.OS === 'ios' ? 32 : 20,
  },
  saveBtnWrapper: {
    shadowColor: theme.colors.primary, 
    shadowOffset: { width: 0, height: 8 }, 
    shadowOpacity: 0.3, 
    shadowRadius: 16, 
    elevation: 8,
    borderRadius: 32,
  },
  saveBtn: { 
    height: 64, 
    borderRadius: 32, 
    flexDirection: 'row', 
    alignItems: 'center', 
    justifyContent: 'center', 
    gap: 12, 
  },
  saveBtnText: { ...theme.typography.h3, color: 'white', fontWeight: '800' },
});
