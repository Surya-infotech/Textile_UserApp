import { useState, useEffect, useMemo } from 'react';
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Modal,
  Alert,
  KeyboardAvoidingView,
  Platform,
  StatusBar,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Ionicons from '@expo/vector-icons/Ionicons';

const STORAGE_KEY = '@textile_parties';

export default function PartyScreen() {
  const [parties, setParties] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  // Form State - only Party Name and GSTIN Number
  const [formData, setFormData] = useState({
    partyName: '',
    gstin: '',
  });

  // Load parties from AsyncStorage on mount
  useEffect(() => {
    loadParties();
  }, []);

  const loadParties = async () => {
    try {
      setIsLoading(true);
      const data = await AsyncStorage.getItem(STORAGE_KEY);
      if (data) {
        setParties(JSON.parse(data));
      } else {
        setParties([]);
      }
    } catch (error) {
      console.error('Failed to load parties:', error);
      Alert.alert('Error', 'Unable to load parties from storage.');
    } finally {
      setIsLoading(false);
    }
  };

  const resetForm = () => {
    setFormData({
      partyName: '',
      gstin: '',
    });
    setEditingId(null);
  };

  const handleOpenAddModal = () => {
    resetForm();
    setIsModalVisible(true);
  };

  const handleOpenEditModal = (party) => {
    setEditingId(party.id);
    setFormData({
      partyName: party.partyName || '',
      gstin: party.gstin || '',
    });
    setIsModalVisible(true);
  };

  const handleCloseModal = () => {
    setIsModalVisible(false);
    resetForm();
  };

  const handleInputChange = (field, value) => {
    if (field === 'gstin') {
      // GSTIN should be uppercase alphanumeric (up to 15 chars)
      setFormData((prev) => ({
        ...prev,
        [field]: value.toUpperCase().slice(0, 15),
      }));
    } else {
      setFormData((prev) => ({
        ...prev,
        [field]: value,
      }));
    }
  };

  const handleSaveParty = async () => {
    const trimmedName = formData.partyName.trim();
    const trimmedGstin = formData.gstin.trim();

    if (!trimmedName) {
      Alert.alert('Validation Error', 'Please enter the Party Name.');
      return;
    }

    if (trimmedGstin && trimmedGstin.length !== 15) {
      Alert.alert(
        'Invalid GSTIN',
        'A valid GSTIN must be 15 characters long (e.g. 24ABCDE1234F1Z5). Do you still want to proceed?',
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Save Anyway',
            onPress: () => savePartyRecord(trimmedName, trimmedGstin),
          },
        ]
      );
      return;
    }

    await savePartyRecord(trimmedName, trimmedGstin);
  };

  const savePartyRecord = async (trimmedName, trimmedGstin) => {
    try {
      let updatedList = [];

      if (editingId) {
        // Edit Mode
        updatedList = parties.map((p) => {
          if (p.id === editingId) {
            return {
              ...p,
              partyName: trimmedName,
              gstin: trimmedGstin,
              updatedAt: new Date().toISOString(),
            };
          }
          return p;
        });
      } else {
        // Add Mode
        const newParty = {
          id: 'party_' + Date.now().toString(),
          partyName: trimmedName,
          gstin: trimmedGstin,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };
        updatedList = [newParty, ...parties];
      }

      setParties(updatedList);
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(updatedList));
      setIsModalVisible(false);
      resetForm();
    } catch (error) {
      console.error('Failed to save party:', error);
      Alert.alert('Error', 'Unable to save party to storage.');
    }
  };

  const handleDeleteParty = (id, name) => {
    Alert.alert(
      'Delete Party',
      `Are you sure you want to delete "${name}"? This action cannot be undone.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              const updatedList = parties.filter((p) => p.id !== id);
              setParties(updatedList);
              await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(updatedList));
            } catch (error) {
              console.error('Failed to delete party:', error);
              Alert.alert('Error', 'Unable to delete party.');
            }
          },
        },
      ]
    );
  };

  // Filtered list based on search
  const filteredParties = useMemo(() => {
    if (!searchQuery.trim()) return parties;
    const query = searchQuery.trim().toLowerCase();
    return parties.filter((p) => {
      const matchName = p.partyName?.toLowerCase().includes(query);
      const matchGstin = p.gstin?.toLowerCase().includes(query);
      return matchName || matchGstin;
    });
  }, [parties, searchQuery]);

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <StatusBar barStyle="dark-content" backgroundColor="#F8FAFC" />

      {/* Screen Header with Right-Side Add Button */}
      <View style={styles.header}>
        <View>
          <Text style={styles.pageTitle}>Party</Text>
          <Text style={styles.pageSubtitle}>
            {parties.length} {parties.length === 1 ? 'party' : 'parties'} registered
          </Text>
        </View>

        {/* Add Button on Right Side */}
        <TouchableOpacity
          style={styles.headerAddBtn}
          onPress={handleOpenAddModal}
          activeOpacity={0.7}
        >
          <Ionicons name="add" size={20} color="#FFFFFF" />
          <Text style={styles.headerAddBtnText}>Add</Text>
        </TouchableOpacity>
      </View>

      {/* Search Bar if parties exist */}
      {parties.length > 0 && (
        <View style={styles.searchContainer}>
          <View style={styles.searchBar}>
            <Ionicons name="search-outline" size={18} color="#94A3B8" />
            <TextInput
              style={styles.searchInput}
              placeholder="Search by party name or GSTIN..."
              placeholderTextColor="#94A3B8"
              value={searchQuery}
              onChangeText={setSearchQuery}
              clearButtonMode="while-editing"
            />
            {searchQuery.length > 0 && Platform.OS === 'android' && (
              <TouchableOpacity
                onPress={() => setSearchQuery('')}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              >
                <Ionicons name="close-circle" size={18} color="#94A3B8" />
              </TouchableOpacity>
            )}
          </View>
        </View>
      )}

      {/* Main Content Area */}
      {parties.length === 0 && !isLoading ? (
        <View style={styles.emptyContainer}>
          <View style={styles.emptyIconWrap}>
            <Ionicons name="people-outline" size={48} color="#4F46E5" />
          </View>
          <Text style={styles.emptyTitle}>No Parties Added</Text>
          <Text style={styles.emptySubtitle}>
            Tap the "+ Add" button at the top right to register your client firms, parties, and their GSTIN numbers.
          </Text>
          <TouchableOpacity
            style={styles.emptyActionBtn}
            onPress={handleOpenAddModal}
            activeOpacity={0.7}
          >
            <Ionicons name="person-add-outline" size={20} color="#FFFFFF" />
            <Text style={styles.emptyActionBtnText}>Add New Party</Text>
          </TouchableOpacity>
        </View>
      ) : filteredParties.length === 0 && searchQuery.trim() ? (
        <View style={styles.emptyContainer}>
          <Ionicons name="search-outline" size={44} color="#94A3B8" />
          <Text style={styles.emptyTitle}>No Matching Parties</Text>
          <Text style={styles.emptySubtitle}>
            No party found matching "{searchQuery}". Try searching with another name or GSTIN.
          </Text>
        </View>
      ) : (
        <ScrollView
          style={styles.listScrollView}
          contentContainerStyle={styles.listContentContainer}
          showsVerticalScrollIndicator={false}
        >
          {filteredParties.map((party) => (
            <View key={party.id} style={styles.partyCard}>
              {/* Card Header */}
              <View style={styles.partyCardHeader}>
                <View style={styles.avatarWrap}>
                  <Text style={styles.avatarText}>
                    {party.partyName ? party.partyName.charAt(0).toUpperCase() : 'P'}
                  </Text>
                </View>

                <View style={styles.cardHeaderInfo}>
                  <Text style={styles.partyName} numberOfLines={1}>
                    {party.partyName}
                  </Text>
                  <Text style={styles.metaSubtext}>Textile Party</Text>
                </View>

                {/* Edit & Delete Action Buttons */}
                <View style={styles.cardActionsGroup}>
                  <TouchableOpacity
                    style={styles.editBtn}
                    onPress={() => handleOpenEditModal(party)}
                    activeOpacity={0.7}
                  >
                    <Ionicons name="create-outline" size={16} color="#4F46E5" />
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={styles.deleteBtn}
                    onPress={() => handleDeleteParty(party.id, party.partyName)}
                    activeOpacity={0.6}
                  >
                    <Ionicons name="trash-outline" size={16} color="#EF4444" />
                  </TouchableOpacity>
                </View>
              </View>

              {/* GSTIN Badge Row */}
              <View style={styles.detailSection}>
                <View style={styles.gstinBadge}>
                  <Ionicons name="shield-checkmark-outline" size={14} color="#4F46E5" />
                  <Text style={styles.gstinBadgeLabel}>GSTIN:</Text>
                  <Text style={styles.gstinBadgeValue}>
                    {party.gstin ? party.gstin : 'Not Provided'}
                  </Text>
                </View>
              </View>
            </View>
          ))}
        </ScrollView>
      )}

      {/* Add / Edit Party Modal */}
      <Modal
        visible={isModalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={handleCloseModal}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={styles.modalOverlay}
        >
          <View style={styles.modalBackdrop}>
            <TouchableOpacity
              style={StyleSheet.absoluteFill}
              onPress={handleCloseModal}
              activeOpacity={1}
            />
          </View>

          <View style={styles.modalContainer}>
            {/* Modal Header */}
            <View style={styles.modalHeader}>
              <View>
                <Text style={styles.modalTitle}>
                  {editingId ? 'Edit Party' : 'Add New Party'}
                </Text>
                <Text style={styles.modalSubtitle}>
                  {editingId
                    ? 'Update party name and GSTIN number'
                    : 'Enter party name and GSTIN number'}
                </Text>
              </View>
              <TouchableOpacity
                style={styles.closeBtn}
                onPress={handleCloseModal}
                activeOpacity={0.7}
              >
                <Ionicons name="close" size={20} color="#64748B" />
              </TouchableOpacity>
            </View>

            {/* Modal Form */}
            <ScrollView
              style={styles.modalFormScroll}
              contentContainerStyle={styles.modalFormContent}
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={false}
            >
              {/* Field 1: Party Name */}
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>
                  Party Name <Text style={styles.requiredStar}>*</Text>
                </Text>
                <TextInput
                  style={styles.input}
                  placeholder="e.g. Radhey Shyam Fabrics"
                  placeholderTextColor="#94A3B8"
                  autoCapitalize="words"
                  value={formData.partyName}
                  onChangeText={(val) => handleInputChange('partyName', val)}
                />
              </View>

              {/* Field 2: GSTIN Number */}
              <View style={styles.inputGroup}>
                <View style={styles.inputLabelRow}>
                  <Text style={styles.inputLabel}>GSTIN Number</Text>
                  <Text style={styles.inputLabelHelper}>
                    {formData.gstin.length}/15
                  </Text>
                </View>
                <TextInput
                  style={[styles.input, styles.gstinInput]}
                  placeholder="e.g. 24ABCDE1234F1Z5"
                  placeholderTextColor="#94A3B8"
                  autoCapitalize="characters"
                  maxLength={15}
                  value={formData.gstin}
                  onChangeText={(val) => handleInputChange('gstin', val)}
                />
                <Text style={styles.helperText}>
                  15-digit GST identification number
                </Text>
              </View>
            </ScrollView>

            {/* Modal Actions */}
            <View style={styles.modalFooter}>
              <TouchableOpacity
                style={styles.cancelBtn}
                onPress={handleCloseModal}
                activeOpacity={0.7}
              >
                <Text style={styles.cancelBtnText}>Cancel</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.saveBtn}
                onPress={handleSaveParty}
                activeOpacity={0.7}
              >
                <Ionicons name="checkmark-circle-outline" size={18} color="#FFFFFF" />
                <Text style={styles.saveBtnText}>
                  {editingId ? 'Update Party' : 'Save Party'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 14,
    backgroundColor: '#F8FAFC',
  },
  pageTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#0F172A',
    letterSpacing: -0.3,
  },
  pageSubtitle: {
    fontSize: 13,
    color: '#64748B',
    marginTop: 2,
  },
  headerAddBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#4F46E5',
    paddingHorizontal: 16,
    paddingVertical: 9,
    borderRadius: 22,
    gap: 5,
    shadowColor: '#4F46E5',
    shadowOpacity: 0.25,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 3 },
    elevation: 3,
  },
  headerAddBtnText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
  },
  searchContainer: {
    paddingHorizontal: 20,
    marginBottom: 12,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    gap: 10,
    shadowColor: '#0F172A',
    shadowOpacity: 0.02,
    shadowRadius: 4,
    elevation: 1,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    color: '#0F172A',
    padding: 0,
  },
  listScrollView: {
    flex: 1,
  },
  listContentContainer: {
    paddingHorizontal: 20,
    paddingBottom: 28,
  },
  partyCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: '#0F172A',
    shadowOpacity: 0.04,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  partyCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  avatarWrap: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#EEF2FF',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  avatarText: {
    fontSize: 18,
    fontWeight: '700',
    color: '#4F46E5',
  },
  cardHeaderInfo: {
    flex: 1,
  },
  partyName: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0F172A',
    marginBottom: 2,
  },
  metaSubtext: {
    fontSize: 12,
    color: '#94A3B8',
  },
  cardActionsGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  editBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#EEF2FF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  deleteBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#FEF2F2',
    alignItems: 'center',
    justifyContent: 'center',
  },
  detailSection: {
    marginTop: 2,
  },
  gstinBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    alignSelf: 'flex-start',
    gap: 6,
  },
  gstinBadgeLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: '#475569',
  },
  gstinBadgeValue: {
    fontSize: 12,
    fontWeight: '600',
    color: '#0F172A',
    letterSpacing: 0.5,
  },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 40,
    marginTop: 40,
  },
  emptyIconWrap: {
    width: 90,
    height: 90,
    borderRadius: 45,
    backgroundColor: '#EEF2FF',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 18,
  },
  emptyTitle: {
    fontSize: 19,
    fontWeight: '700',
    color: '#1E293B',
    marginBottom: 8,
    textAlign: 'center',
  },
  emptySubtitle: {
    fontSize: 14,
    color: '#64748B',
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 24,
  },
  emptyActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#4F46E5',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 24,
    gap: 8,
    shadowColor: '#4F46E5',
    shadowOpacity: 0.25,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 3,
  },
  emptyActionBtnText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
  },
  modalOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  modalBackdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(15, 23, 42, 0.45)',
  },
  modalContainer: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '75%',
    shadowColor: '#000',
    shadowOpacity: 0.15,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: -6 },
    elevation: 20,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#0F172A',
  },
  modalSubtitle: {
    fontSize: 13,
    color: '#64748B',
    marginTop: 2,
  },
  closeBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalFormScroll: {
    paddingHorizontal: 20,
  },
  modalFormContent: {
    paddingTop: 16,
    paddingBottom: 24,
  },
  inputGroup: {
    marginBottom: 16,
  },
  inputLabelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  inputLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#334155',
    marginBottom: 6,
  },
  inputLabelHelper: {
    fontSize: 11,
    color: '#94A3B8',
    fontWeight: '600',
  },
  requiredStar: {
    color: '#EF4444',
  },
  input: {
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 14,
    color: '#0F172A',
  },
  gstinInput: {
    letterSpacing: 0.8,
    fontWeight: '600',
  },
  helperText: {
    fontSize: 11,
    color: '#94A3B8',
    marginTop: 4,
  },
  modalFooter: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
    gap: 12,
    backgroundColor: '#FFFFFF',
  },
  cancelBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelBtnText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#64748B',
  },
  saveBtn: {
    flex: 2,
    flexDirection: 'row',
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: '#4F46E5',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    shadowColor: '#4F46E5',
    shadowOpacity: 0.25,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 3,
  },
  saveBtnText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#FFFFFF',
  },
});
