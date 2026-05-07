import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Alert, Platform, Modal, TextInput, ActivityIndicator, Image, Switch } from 'react-native';
import { useState, useEffect } from 'react';
import { Stack, useRouter } from 'expo-router';
import { MaterialIcons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useStore } from '../../src/hooks/useStore';
import { AuthService } from '../../src/services/auth';
import { ProductService } from '../../src/services/product';
import { InventoryService } from '../../src/services/inventory';
import { SalesService } from '../../src/services/sales';
import { StoreService, UpdateStoreInput } from '../../src/services/store';
import { ImageService } from '../../src/services/imageService';
import { theme } from '../../src/theme/theme';

const WebViewComponent = Platform.OS === 'web'
  ? null
  : require('react-native-webview').WebView;

export default function OwnerProfileScreen() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { profile, store } = useStore();
  
  // Modals state
  const [showLogoutModal, setShowLogoutModal] = useState(false);
  const [showEditDetailsModal, setShowEditDetailsModal] = useState(false);
  const [showTimePicker, setShowTimePicker] = useState<'open' | 'close' | null>(null);
  const [fullscreenImage, setFullscreenImage] = useState<string | null>(null);

  // Edit form state
  const [editName, setEditName] = useState(store?.store_name ?? '');
  const [editAddress, setEditAddress] = useState(store?.address ?? '');
  const [editContact, setEditContact] = useState(store?.contact_number ?? '');
  const [editDescription, setEditDescription] = useState(store?.description ?? '');
  const [editImageUrl, setEditImageUrl] = useState(store?.image_url ?? '');
  const [editOpenTime, setEditOpenTime] = useState(store?.open_time ?? '08:00 AM');
  const [editCloseTime, setEditCloseTime] = useState(store?.close_time ?? '10:00 PM');
  const [editAutoClose, setEditAutoClose] = useState(store?.auto_close ?? false);
  
  const [uploading, setUploading] = useState(false);

  // Reset form when store data changes or modal opens
  useEffect(() => {
    if (showEditDetailsModal && store) {
      setEditName(store.store_name);
      setEditAddress(store.address ?? '');
      setEditContact(store.contact_number ?? '');
      setEditDescription(store.description ?? '');
      setEditImageUrl(store.image_url ?? '');
      setEditOpenTime(store.open_time ?? '08:00 AM');
      setEditCloseTime(store.close_time ?? '10:00 PM');
      setEditAutoClose(store.auto_close ?? false);
    }
  }, [showEditDetailsModal, store]);

  const today = new Date().toISOString().split('T')[0];

  const { data: products, isLoading: loadingProducts } = useQuery({
    queryKey: ['products', store?.store_id],
    queryFn: () => ProductService.getByStoreId(store!.store_id),
    enabled: !!store?.store_id,
  });

  const { data: lowStockProducts, isLoading: loadingLowStock } = useQuery({
    queryKey: ['low-stock', store?.store_id],
    queryFn: () => InventoryService.getLowStockProducts(store!.store_id),
    enabled: !!store?.store_id,
  });

  const { data: todaySales, isLoading: loadingSales } = useQuery({
    queryKey: ['sales-today', store?.store_id, today],
    queryFn: () => SalesService.getByDateRange(store!.store_id, today, today),
    enabled: !!store?.store_id,
  });

  // Pick Image Logic
  const handlePickImage = async () => {
    const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
    
    if (permissionResult.granted === false) {
      Alert.alert("Permission Required", "You need to allow access to your photos to change the store image.");
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });

    if (!result.canceled && result.assets[0].uri) {
      try {
        setUploading(true);
        const fileExt = result.assets[0].uri.split('.').pop();
        const fileName = `store_${store?.store_id}_${Date.now()}.${fileExt}`;
        const publicUrl = await ImageService.upload('store-images', fileName, result.assets[0].uri);
        setEditImageUrl(publicUrl);
        Alert.alert('Success', 'Image uploaded successfully! Click save to apply changes.');
      } catch (e: any) {
        Alert.alert('Upload Error', e.message);
      } finally {
        setUploading(false);
      }
    }
  };

  // Update mutation
  const updateStoreMutation = useMutation({
    mutationFn: (input: UpdateStoreInput) => StoreService.update(store!.store_id, input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['store'] });
      queryClient.invalidateQueries({ queryKey: ['profile'] });
      setShowEditDetailsModal(false);
      Alert.alert('Success', 'Store details updated successfully!');
    },
    onError: (err: any) => {
      Alert.alert('Update Error', err.message);
    }
  });

  const handleUpdateStore = () => {
    if (!editName.trim()) {
      Alert.alert('Validation Error', 'Store name is required.');
      return;
    }
    updateStoreMutation.mutate({
      store_name: editName,
      address: editAddress,
      contact_number: editContact,
      description: editDescription,
      image_url: editImageUrl,
      open_time: editOpenTime,
      close_time: editCloseTime,
      auto_close: editAutoClose,
    });
  };

  const itemCount = products?.length ?? 0;
  const lowStockCount = lowStockProducts?.length ?? 0;
  const todayRevenue = todaySales?.reduce((sum, s) => sum + s.total_amount, 0) ?? 0;

  const doLogout = async () => {
    try {
      setShowLogoutModal(false);
      await AuthService.logout();
      router.replace('/(auth)/login');
    } catch (e: any) {
      Alert.alert('Logout Error', e.message);
    }
  };

  const handleTimeSelect = (hour: number, ampm: string) => {
    const timeStr = `${hour}:00 ${ampm}`;
    if (showTimePicker === 'open') setEditOpenTime(timeStr);
    else if (showTimePicker === 'close') setEditCloseTime(timeStr);
    setShowTimePicker(null);
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <Stack.Screen 
        options={{ 
          title: 'Store Profile', 
          headerShown: true,
          headerStyle: { backgroundColor: theme.colors.surface },
          headerTitleStyle: { ...theme.typography.h3, color: theme.colors.primaryContainer, fontWeight: '700' },
          headerTintColor: theme.colors.primaryContainer,
          headerLeft: () => (
            <TouchableOpacity onPress={() => router.back()} style={{ marginLeft: 8 }}>
              <MaterialIcons name="arrow-back-ios" size={20} color={theme.colors.primaryContainer} />
            </TouchableOpacity>
          ),
        }} 
      />
      
      <ScrollView 
        contentContainerStyle={styles.scrollContent} 
        showsVerticalScrollIndicator={false}
      >
        {/* Profile Header Section */}
        <View style={styles.headerSection}>
          <View style={styles.avatarWrapper}>
            <TouchableOpacity 
              style={styles.avatarContainer}
              onPress={() => store?.image_url && setFullscreenImage(store.image_url)}
              activeOpacity={0.9}
            >
              <View style={styles.avatarBorder}>
                <View style={styles.avatar}>
                  {store?.image_url ? (
                    <Image source={{ uri: store.image_url }} style={styles.avatarImage} />
                  ) : (
                    <MaterialIcons name="store" size={48} color={theme.colors.primaryContainer} />
                  )}
                </View>
              </View>
            </TouchableOpacity>
            <TouchableOpacity 
              style={styles.avatarEditBadge}
              onPress={() => setShowEditDetailsModal(true)}
              activeOpacity={0.7}
            >
              <MaterialIcons name="edit" size={14} color="#fff" />
            </TouchableOpacity>
          </View>
          
          <View style={styles.headerInfo}>
            <Text style={styles.storeName}>{store?.store_name || "Store Owner"}</Text>
            <Text style={styles.ownerEmail}>{profile?.email || 'Account logged in'}</Text>
          </View>
        </View>

        {/* Business Stats Grid */}
        <View style={styles.statsGrid}>
          <View style={styles.statCard}>
            <Text style={[styles.statValue, { color: theme.colors.secondary }]}>
              {loadingSales ? '--' : `₱${todayRevenue.toLocaleString('en-PH', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`}
            </Text>
            <Text style={styles.statLabel}>TODAY</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={[styles.statValue, { color: theme.colors.primary }]}>
              {loadingProducts ? '--' : itemCount}
            </Text>
            <Text style={styles.statLabel}>ITEMS</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={[styles.statValue, { color: theme.colors.error }]}>
              {loadingLowStock ? '--' : lowStockCount}
            </Text>
            <Text style={[styles.statLabel, { color: theme.colors.error }]}>LOW STOCK</Text>
          </View>
        </View>

        {/* Store Information Card */}
        <View style={styles.detailsCard}>
          <View style={styles.detailsHeader}>
            <MaterialIcons name="info" size={20} color={theme.colors.primary} />
            <Text style={styles.detailsTitle}>Store Information</Text>
          </View>
          
          {store?.description ? (
            <Text style={styles.descriptionText}>{store.description}</Text>
          ) : (
            <Text style={[styles.descriptionText, { opacity: 0.5, fontStyle: 'italic' }]}>No description added yet.</Text>
          )}

          <View style={styles.divider} />

          <View style={styles.infoRow}>
            <MaterialIcons name="place" size={18} color={theme.colors.outline} />
            <Text style={styles.infoText}>{store?.address || 'No address set'}</Text>
          </View>

          <View style={styles.infoRow}>
            <MaterialIcons name="phone" size={18} color={theme.colors.outline} />
            <Text style={styles.infoText}>{store?.contact_number || 'No contact number'}</Text>
          </View>

          <View style={styles.infoRow}>
            <MaterialIcons name="schedule" size={18} color={theme.colors.outline} />
            <Text style={styles.infoText}>
              {store?.open_time && store?.close_time 
                ? `${store.open_time} - ${store.close_time}` 
                : 'Business hours not set'}
              {store?.auto_close && <Text style={styles.autoTag}> • Auto-Close Active</Text>}
            </Text>
          </View>
        </View>

        {/* Map Preview Card */}
        <View style={styles.mapCard}>
          <View style={styles.mapHeader}>
            <MaterialIcons name="map" size={20} color={theme.colors.primary} />
            <Text style={styles.mapTitle}>Store Location Pin</Text>
            <TouchableOpacity 
              style={styles.mapEditBtn} 
              onPress={() => router.push('/(tabs)/store_location')}
            >
              <Text style={styles.mapEditBtnText}>Adjust Pin</Text>
            </TouchableOpacity>
          </View>
          
          <TouchableOpacity 
            style={styles.mapContainer}
            onPress={() => router.push('/(tabs)/store_location')}
            activeOpacity={0.9}
          >
            {store?.latitude != null && store?.longitude != null ? (
              <>
                <MapPreview 
                  latitude={store.latitude} 
                  longitude={store.longitude} 
                />
                <View style={styles.mapOverlayHint}>
                  <MaterialIcons name="fullscreen" size={20} color="#fff" />
                </View>
              </>
            ) : (
              <View style={styles.noMap}>
                <MaterialIcons name="location-off" size={32} color={theme.colors.outline} />
                <Text style={styles.noMapText}>Location pin not set</Text>
              </View>
            )}
          </TouchableOpacity>
        </View>

        {/* Management Menu */}
        <View style={styles.menuContainer}>
          <MenuItem 
            label="Stock List" 
            icon="inventory-2" 
            onPress={() => router.push('/(tabs)/inventory')} 
          />
          <MenuItem 
            label="Financial Reports" 
            icon="assessment" 
            onPress={() => router.push('/(tabs)/financial_hub')} 
          />
          <MenuItem 
            label="Sales History" 
            icon="history" 
            onPress={() => router.push('/sales/history')} 
          />
          <MenuItem 
            label="View as Customer" 
            icon="visibility" 
            onPress={() => store && router.push(`/store/${store.store_id}?isPreview=true`)} 
          />
          <MenuItem 
            label="Edit Store Details" 
            icon="edit" 
            onPress={() => setShowEditDetailsModal(true)} 
          />
        </View>

        {/* Logout Action */}
        <TouchableOpacity style={styles.logoutButton} onPress={() => setShowLogoutModal(true)}>
          <Text style={styles.logoutText}>Sign Out from Store</Text>
        </TouchableOpacity>
      </ScrollView>

      {/* Edit Store Details Modal */}
      <Modal
        visible={showEditDetailsModal}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setShowEditDetailsModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Edit Store Details</Text>
              <TouchableOpacity onPress={() => setShowEditDetailsModal(false)}>
                <MaterialIcons name="close" size={24} color={theme.colors.outline} />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.formScroll} showsVerticalScrollIndicator={false}>
              <View style={styles.form}>
                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>Store Name</Text>
                  <TextInput
                    style={styles.input}
                    value={editName}
                    onChangeText={setEditName}
                    placeholder="Enter store name"
                    placeholderTextColor={theme.colors.outline}
                  />
                </View>

                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>Store Description</Text>
                  <TextInput
                    style={[styles.input, { height: 80, textAlignVertical: 'top' }]}
                    value={editDescription}
                    onChangeText={setEditDescription}
                    placeholder="Tell customers about your store..."
                    placeholderTextColor={theme.colors.outline}
                    multiline
                  />
                </View>

                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>Store Image</Text>
                  <TouchableOpacity 
                    style={styles.imagePickerButton} 
                    onPress={handlePickImage}
                    disabled={uploading}
                  >
                    {uploading ? (
                      <ActivityIndicator color={theme.colors.primary} />
                    ) : (
                      <>
                        <MaterialIcons name="add-a-photo" size={24} color={theme.colors.primary} />
                        <Text style={styles.imagePickerText}>
                          {editImageUrl ? 'Change Store Image' : 'Select Store Image'}
                        </Text>
                      </>
                    )}
                  </TouchableOpacity>
                  {editImageUrl ? (
                    <View style={styles.previewContainer}>
                      <TouchableOpacity 
                        activeOpacity={0.9} 
                        onPress={() => setFullscreenImage(editImageUrl)}
                        style={{ width: '100%' }}
                      >
                        <Image source={{ uri: editImageUrl }} style={styles.previewImage} />
                        <View style={styles.previewZoomHint}>
                          <MaterialIcons name="zoom-out-map" size={16} color="#fff" />
                        </View>
                      </TouchableOpacity>
                      <TouchableOpacity 
                        style={styles.removeImageBtn} 
                        onPress={() => setEditImageUrl('')}
                      >
                        <MaterialIcons name="cancel" size={24} color={theme.colors.error} />
                      </TouchableOpacity>
                    </View>
                  ) : null}
                </View>

                {/* Operating Hours Section */}
                <View style={styles.sectionHeader}>
                  <MaterialIcons name="access-time" size={20} color={theme.colors.primary} />
                  <Text style={styles.sectionTitle}>Operating Hours</Text>
                </View>

                <View style={styles.row}>
                  <View style={[styles.inputGroup, { flex: 1 }]}>
                    <Text style={styles.inputLabel}>Open Time</Text>
                    <TouchableOpacity 
                      style={styles.timePickerButton} 
                      onPress={() => setShowTimePicker('open')}
                    >
                      <Text style={styles.timePickerText}>{editOpenTime}</Text>
                      <MaterialIcons name="expand-more" size={20} color={theme.colors.outline} />
                    </TouchableOpacity>
                  </View>
                  <View style={[styles.inputGroup, { flex: 1 }]}>
                    <Text style={styles.inputLabel}>Close Time</Text>
                    <TouchableOpacity 
                      style={styles.timePickerButton} 
                      onPress={() => setShowTimePicker('close')}
                    >
                      <Text style={styles.timePickerText}>{editCloseTime}</Text>
                      <MaterialIcons name="expand-more" size={20} color={theme.colors.outline} />
                    </TouchableOpacity>
                  </View>
                </View>

                <View style={styles.toggleRow}>
                  <View style={styles.toggleText}>
                    <Text style={styles.toggleLabel}>Automatic Close</Text>
                    <Text style={styles.toggleSubtitle}>Auto-set store to offline after hours</Text>
                  </View>
                  <Switch
                    value={editAutoClose}
                    onValueChange={setEditAutoClose}
                    trackColor={{ false: theme.colors.surfaceVariant, true: theme.colors.primary }}
                    thumbColor={Platform.OS === 'ios' ? '#fff' : (editAutoClose ? theme.colors.surface : theme.colors.outline)}
                  />
                </View>

                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>Address</Text>
                  <TextInput
                    style={[styles.input, { height: 60, textAlignVertical: 'top' }]}
                    value={editAddress}
                    onChangeText={setEditAddress}
                    placeholder="Store physical address"
                    placeholderTextColor={theme.colors.outline}
                    multiline
                  />
                </View>

                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>Contact Number</Text>
                  <TextInput
                    style={styles.input}
                    value={editContact}
                    onChangeText={setEditContact}
                    placeholder="e.g. 09123456789"
                    placeholderTextColor={theme.colors.outline}
                    keyboardType="phone-pad"
                  />
                </View>

                <TouchableOpacity 
                  style={[styles.confirmButton, { marginTop: 12, backgroundColor: theme.colors.primary }]} 
                  onPress={handleUpdateStore}
                  disabled={updateStoreMutation.isPending || uploading}
                >
                  {updateStoreMutation.isPending ? (
                    <ActivityIndicator color={theme.colors.onPrimary} />
                  ) : (
                    <Text style={[styles.confirmButtonText, { color: theme.colors.onPrimary }]}>Save Changes</Text>
                  )}
                </TouchableOpacity>
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Custom Time Selection Modal */}
      <Modal
        visible={!!showTimePicker}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowTimePicker(null)}
      >
        <TouchableOpacity 
          style={styles.timeModalOverlay} 
          activeOpacity={1} 
          onPress={() => setShowTimePicker(null)}
        >
          <View style={styles.timeModalContent}>
            <Text style={styles.timeModalTitle}>Select {showTimePicker === 'open' ? 'Opening' : 'Closing'} Hour</Text>
            <ScrollView style={styles.timeList} showsVerticalScrollIndicator={false}>
              {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map(h => (
                <View key={h} style={styles.timeRow}>
                  <TouchableOpacity style={styles.timeOption} onPress={() => handleTimeSelect(h, 'AM')}>
                    <Text style={styles.timeOptionText}>{h}:00 AM</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.timeOption} onPress={() => handleTimeSelect(h, 'PM')}>
                    <Text style={styles.timeOptionText}>{h}:00 PM</Text>
                  </TouchableOpacity>
                </View>
              ))}
            </ScrollView>
          </View>
        </TouchableOpacity>
      </Modal>

      {/* Fullscreen Image Viewer */}
      <Modal
        visible={!!fullscreenImage}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setFullscreenImage(null)}
      >
        <TouchableOpacity 
          style={styles.fullscreenOverlay} 
          activeOpacity={1} 
          onPress={() => setFullscreenImage(null)}
        >
          <View style={styles.fullscreenHeader}>
            <TouchableOpacity 
              style={styles.fullscreenCloseBtn}
              onPress={() => setFullscreenImage(null)}
            >
              <MaterialIcons name="close" size={28} color="#fff" />
            </TouchableOpacity>
          </View>
          <View style={styles.fullscreenImageContainer}>
            {fullscreenImage && (
              <Image 
                source={{ uri: fullscreenImage }} 
                style={styles.fullscreenImage}
                resizeMode="contain"
              />
            )}
          </View>
        </TouchableOpacity>
      </Modal>

      {/* Custom Logout Modal */}
      <Modal
        visible={showLogoutModal}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowLogoutModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalIconContainer}>
              <MaterialIcons name="logout" size={32} color={theme.colors.error} />
            </View>
            <Text style={styles.modalTitleText}>Sign Out?</Text>
            <Text style={styles.modalMessage}>Are you sure you want to log out of your store account?</Text>
            
            <View style={styles.modalActions}>
              <TouchableOpacity 
                style={styles.cancelButton} 
                onPress={() => setShowLogoutModal(false)}
              >
                <Text style={styles.cancelButtonText}>Stay Signed In</Text>
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={styles.confirmButton} 
                onPress={doLogout}
              >
                <Text style={styles.confirmButtonText}>Sign Out</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

function MapPreview({ latitude, longitude }: { latitude: number, longitude: number }) {
  const html = `<!doctype html>
  <html>
    <head>
      <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1" />
      <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
      <style>
        html, body, #map { height: 100%; margin: 0; background: #f8f9fa; }
        .leaflet-control-attribution { display: none !important; }
      </style>
    </head>
    <body>
      <div id="map"></div>
      <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
      <script>
        const map = L.map('map', {
          zoomControl: false,
          dragging: false,
          touchZoom: false,
          doubleClickZoom: false,
          scrollWheelZoom: false,
          boxZoom: false,
          keyboard: false
        }).setView([${latitude}, ${longitude}], 16);
        
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png').addTo(map);
        L.marker([${latitude}, ${longitude}]).addTo(map);
      </script>
    </body>
  </html>`;

  if (Platform.OS === 'web') {
    return (
      <iframe
        srcDoc={html}
        style={{ width: '100%', height: '100%', border: 'none', borderRadius: 16 }}
        title="Store Map"
      />
    );
  }

  if (!WebViewComponent) return null;

  return (
    <WebViewComponent
      originWhitelist={['*']}
      source={{ html }}
      style={{ flex: 1 }}
      scrollEnabled={false}
    />
  );
}

function MenuItem({ 
  label, 
  icon, 
  onPress, 
  isLast = false,
  hasBadge = false 
}: { 
  label: string; 
  icon: any; 
  onPress: () => void;
  isLast?: boolean;
  hasBadge?: boolean;
}) {
  return (
    <TouchableOpacity 
      style={[styles.menuItem, isLast && { borderBottomWidth: 0 }]} 
      onPress={onPress}
    >
      <View style={styles.menuIconBox}>
        <MaterialIcons name={icon} size={22} color={theme.colors.primary} />
        {hasBadge && <View style={styles.menuDot} />}
      </View>
      <Text style={styles.menuLabel}>{label}</Text>
      <MaterialIcons name="chevron-right" size={24} color={theme.colors.outlineVariant} />
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    padding: theme.spacing.gridMargin,
    gap: 20,
    paddingTop: Platform.OS === 'ios' ? 60 : 40,
    paddingBottom: 100,
  },
  headerSection: {
    alignItems: 'center',
    backgroundColor: theme.colors.surface,
    padding: 24,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: theme.colors.surfaceVariant,
    shadowColor: theme.colors.primaryContainer,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 16,
    elevation: 4,
    gap: 16,
  },
  avatarWrapper: {
    position: 'relative',
    alignItems: 'center',
  },
  avatarContainer: {
    alignItems: 'center',
    position: 'relative',
  },
  avatarEditBadge: {
    position: 'absolute',
    bottom: 2,
    right: 2,
    backgroundColor: theme.colors.primary,
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 3,
    borderColor: theme.colors.surface,
    elevation: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.3,
    shadowRadius: 5,
  },
  avatarBorder: {
    padding: 4,
    borderRadius: 60,
    backgroundColor: theme.colors.surface,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  avatar: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: theme.colors.surfaceContainerLow,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  avatarImage: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  headerInfo: {
    alignItems: 'center',
    gap: 4,
  },
  storeName: {
    ...theme.typography.h2,
    color: theme.colors.onSurface,
    fontWeight: '700',
  },
  ownerEmail: {
    ...theme.typography.bodyMedium,
    color: theme.colors.onSurfaceVariant,
  },
  statsGrid: {
    flexDirection: 'row',
    gap: 12,
  },
  statCard: {
    flex: 1,
    backgroundColor: theme.colors.surface,
    padding: 16,
    borderRadius: 20,
    alignItems: 'center',
    gap: 4,
    borderWidth: 1,
    borderColor: theme.colors.surfaceVariant,
    shadowColor: theme.colors.primaryContainer,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  statValue: {
    ...theme.typography.h3,
    fontWeight: '700',
  },
  statLabel: {
    fontSize: 10,
    fontWeight: '800',
    color: theme.colors.outline,
    letterSpacing: 0.5,
  },
  detailsCard: {
    backgroundColor: theme.colors.surface,
    borderRadius: 24,
    padding: 20,
    borderWidth: 1,
    borderColor: theme.colors.surfaceVariant,
    gap: 12,
    shadowColor: theme.colors.primaryContainer,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 12,
    elevation: 2,
  },
  detailsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  detailsTitle: {
    ...theme.typography.labelLarge,
    color: theme.colors.primary,
    fontWeight: '700',
  },
  descriptionText: {
    ...theme.typography.bodyMedium,
    color: theme.colors.onSurfaceVariant,
    lineHeight: 22,
  },
  divider: {
    height: 1,
    backgroundColor: theme.colors.surfaceContainerLow,
    marginVertical: 4,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
  },
  infoText: {
    flex: 1,
    ...theme.typography.bodyMedium,
    color: theme.colors.onSurface,
    fontWeight: '500',
  },
  autoTag: {
    color: theme.colors.secondary,
    fontWeight: '700',
    fontSize: 11,
  },
  mapCard: {
    backgroundColor: theme.colors.surface,
    borderRadius: 24,
    padding: 20,
    borderWidth: 1,
    borderColor: theme.colors.surfaceVariant,
    gap: 16,
    shadowColor: theme.colors.primaryContainer,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 12,
    elevation: 2,
  },
  mapHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  mapTitle: {
    ...theme.typography.labelLarge,
    color: theme.colors.primary,
    fontWeight: '700',
    flex: 1,
  },
  mapEditBtn: {
    backgroundColor: theme.colors.surfaceContainerLow,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: theme.colors.surfaceVariant,
  },
  mapEditBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: theme.colors.primary,
  },
  mapContainer: {
    height: 160,
    borderRadius: 16,
    backgroundColor: theme.colors.surfaceContainerLow,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: theme.colors.surfaceVariant,
    position: 'relative',
  },
  previewZoomHint: {
    position: 'absolute',
    bottom: 12,
    right: 12,
    backgroundColor: 'rgba(0,0,0,0.5)',
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  fullscreenOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.95)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  fullscreenHeader: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 60 : 40,
    right: 20,
    zIndex: 10,
  },
  fullscreenCloseBtn: {
    padding: 8,
  },
  fullscreenImageContainer: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  fullscreenImage: {
    width: '100%',
    height: '100%',
  },
  mapOverlayHint: {
    position: 'absolute',
    bottom: 8,
    right: 8,
    backgroundColor: 'rgba(0,0,0,0.5)',
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  noMap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  noMapText: {
    ...theme.typography.bodySmall,
    color: theme.colors.outline,
    fontWeight: '600',
  },
  menuContainer: {
    backgroundColor: theme.colors.surface,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: theme.colors.surfaceVariant,
    overflow: 'hidden',
    shadowColor: theme.colors.primaryContainer,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 12,
    elevation: 2,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 18,
    gap: 16,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.surfaceContainerLow,
  },
  menuIconBox: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: theme.colors.surfaceContainerLow,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  menuDot: {
    position: 'absolute',
    top: 0,
    right: 0,
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: theme.colors.error,
    borderWidth: 2,
    borderColor: theme.colors.surface,
  },
  menuLabel: {
    flex: 1,
    ...theme.typography.bodyLarge,
    color: theme.colors.onSurface,
    fontWeight: '600',
  },
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    borderRadius: 16,
    backgroundColor: theme.colors.surfaceContainerLow,
    borderWidth: 1,
    borderColor: theme.colors.surfaceVariant,
    gap: 8,
  },
  logoutText: {
    ...theme.typography.button,
    color: theme.colors.error,
    fontWeight: '700',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: theme.colors.surface,
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    padding: 24,
    width: '100%',
    maxHeight: '90%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -10 },
    shadowOpacity: 0.2,
    shadowRadius: 20,
    elevation: 10,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  modalTitleText: {
    ...theme.typography.h2,
    color: theme.colors.onSurface,
    fontWeight: '700',
    marginBottom: 12,
  },
  modalTitle: {
    ...theme.typography.h3,
    color: theme.colors.onSurface,
    fontWeight: '700',
  },
  formScroll: {
    width: '100%',
  },
  form: {
    gap: 20,
    paddingBottom: 40,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 8,
  },
  sectionTitle: {
    ...theme.typography.labelLarge,
    color: theme.colors.primary,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  row: {
    flexDirection: 'row',
    gap: 12,
  },
  timePickerButton: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: theme.colors.surfaceContainerLow,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: theme.colors.surfaceVariant,
  },
  timePickerText: {
    ...theme.typography.bodyLarge,
    color: theme.colors.onSurface,
    fontWeight: '600',
  },
  toggleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: theme.colors.surfaceContainerLow,
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: theme.colors.surfaceVariant,
  },
  toggleText: {
    flex: 1,
    gap: 2,
  },
  toggleLabel: {
    ...theme.typography.bodyLarge,
    color: theme.colors.onSurface,
    fontWeight: '600',
  },
  toggleSubtitle: {
    ...theme.typography.bodySmall,
    color: theme.colors.onSurfaceVariant,
  },
  inputGroup: {
    gap: 8,
  },
  inputLabel: {
    ...theme.typography.labelMedium,
    color: theme.colors.onSurfaceVariant,
    fontWeight: '600',
  },
  input: {
    backgroundColor: theme.colors.surfaceContainerLow,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    ...theme.typography.bodyLarge,
    color: theme.colors.onSurface,
    borderWidth: 1,
    borderColor: theme.colors.surfaceVariant,
  },
  imagePickerButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    backgroundColor: theme.colors.surfaceContainerLow,
    borderWidth: 2,
    borderColor: theme.colors.primary,
    borderStyle: 'dashed',
    borderRadius: 16,
    paddingVertical: 24,
  },
  imagePickerText: {
    ...theme.typography.bodyLarge,
    color: theme.colors.primary,
    fontWeight: '700',
  },
  previewContainer: {
    position: 'relative',
    marginTop: 12,
  },
  previewImage: {
    width: '100%',
    height: 180,
    borderRadius: 16,
    resizeMode: 'cover',
    borderWidth: 1,
    borderColor: theme.colors.surfaceVariant,
  },
  removeImageBtn: {
    position: 'absolute',
    top: -10,
    right: -10,
    backgroundColor: theme.colors.surface,
    borderRadius: 12,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
  },
  timeModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  timeModalContent: {
    backgroundColor: theme.colors.surface,
    borderRadius: 24,
    width: '100%',
    maxHeight: 400,
    padding: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.1,
    shadowRadius: 20,
    elevation: 10,
  },
  timeModalTitle: {
    ...theme.typography.h3,
    color: theme.colors.onSurface,
    fontWeight: '700',
    marginBottom: 20,
    textAlign: 'center',
  },
  timeList: {
    width: '100%',
  },
  timeRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 12,
  },
  timeOption: {
    flex: 1,
    backgroundColor: theme.colors.surfaceContainerLow,
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: theme.colors.surfaceVariant,
  },
  timeOptionText: {
    ...theme.typography.bodyMedium,
    color: theme.colors.onSurface,
    fontWeight: '600',
  },
  modalIconContainer: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: theme.colors.errorContainer,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  modalMessage: {
    ...theme.typography.bodyLarge,
    color: theme.colors.onSurfaceVariant,
    textAlign: 'center',
    marginBottom: 32,
    lineHeight: 24,
  },
  modalActions: {
    width: '100%',
    gap: 12,
  },
  confirmButton: {
    backgroundColor: theme.colors.error,
    paddingVertical: 16,
    borderRadius: 16,
    alignItems: 'center',
    width: '100%',
  },
  confirmButtonText: {
    ...theme.typography.button,
    color: theme.colors.onError,
    fontWeight: '700',
  },
  cancelButton: {
    backgroundColor: theme.colors.surfaceVariant,
    paddingVertical: 16,
    borderRadius: 16,
    alignItems: 'center',
    width: '100%',
  },
  cancelButtonText: {
    ...theme.typography.button,
    color: theme.colors.onSurfaceVariant,
    fontWeight: '700',
  },
});
