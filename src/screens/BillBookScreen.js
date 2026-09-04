import { useState, useEffect } from 'react';
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

const STORAGE_KEY = '@textile_bill_books';

const DEFAULT_TAX_PRESETS = [
  {
    label: 'GST 5% (2.5% + 2.5%)',
    items: [
      { id: 'tax-cgst-2.5', taxName: 'CGST', taxRate: '2.5' },
      { id: 'tax-sgst-2.5', taxName: 'SGST', taxRate: '2.5' },
    ],
  },
  {
    label: 'IGST 5%',
    items: [{ id: 'tax-igst-5', taxName: 'IGST', taxRate: '5' }],
  },
  {
    label: 'GST 12% (6% + 6%)',
    items: [
      { id: 'tax-cgst-6', taxName: 'CGST', taxRate: '6' },
      { id: 'tax-sgst-6', taxName: 'SGST', taxRate: '6' },
    ],
  },
  {
    label: 'GST 18% (9% + 9%)',
    items: [
      { id: 'tax-cgst-9', taxName: 'CGST', taxRate: '9' },
      { id: 'tax-sgst-9', taxName: 'SGST', taxRate: '9' },
    ],
  },
];

// Helper to ensure mobile numbers display with +91 and 5 digits space 5 digits (e.g. +91 98765 43210)
const formatMobileWithCountryCode = (number) => {
  if (!number) return '';
  const digits = number.replace(/[^\d]/g, '');
  let phoneDigits = digits;
  if (phoneDigits.startsWith('91') && phoneDigits.length === 12) {
    phoneDigits = phoneDigits.slice(2);
  }
  if (phoneDigits.length === 10) {
    return `+91 ${phoneDigits.slice(0, 5)} ${phoneDigits.slice(5, 10)}`;
  }
  if (phoneDigits.length > 5) {
    return `+91 ${phoneDigits.slice(0, 5)} ${phoneDigits.slice(5)}`;
  }
  return `+91 ${phoneDigits}`;
};

export default function BillBookScreen() {
  const [billBooks, setBillBooks] = useState([]);
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  // Form State
  const [formData, setFormData] = useState({
    billBookName: '',
    address: '',
    mobileNumber: '',
    bankName: '',
    accountNo: '',
    ifsc: '',
    gstin: '',
    panNo: '',
    discount: '',
  });

  // Multiple Taxes State
  const [taxes, setTaxes] = useState([
    { id: 'tax-1', taxName: 'CGST', taxRate: '2.5' },
    { id: 'tax-2', taxName: 'SGST', taxRate: '2.5' },
  ]);

  // Load from AsyncStorage on mount
  useEffect(() => {
    loadBillBooks();
  }, []);

  const loadBillBooks = async () => {
    try {
      setIsLoading(true);
      const data = await AsyncStorage.getItem(STORAGE_KEY);
      if (data) {
        setBillBooks(JSON.parse(data));
      } else {
        setBillBooks([]);
      }
    } catch (error) {
      console.error('Failed to load bill books:', error);
      Alert.alert('Error', 'Unable to load bill books from storage.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleInputChange = (field, value) => {
    setFormData((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  // Multiple Tax Handlers
  const handleTaxChange = (id, field, value) => {
    setTaxes((prev) =>
      prev.map((item) => (item.id === id ? { ...item, [field]: value } : item))
    );
  };

  const handleAddTax = () => {
    setTaxes((prev) => [
      ...prev,
      { id: Date.now().toString(), taxName: '', taxRate: '' },
    ]);
  };

  const handleRemoveTax = (id) => {
    if (taxes.length === 1) {
      setTaxes([{ id: Date.now().toString(), taxName: '', taxRate: '' }]);
      return;
    }
    setTaxes((prev) => prev.filter((item) => item.id !== id));
  };

  const handleApplyTaxPreset = (presetItems) => {
    setTaxes(presetItems.map((item) => ({ ...item, id: Date.now() + Math.random().toString() })));
  };

  const resetForm = () => {
    setEditingId(null);
    setFormData({
      billBookName: '',
      address: '',
      mobileNumber: '',
      bankName: '',
      accountNo: '',
      ifsc: '',
      gstin: '',
      panNo: '',
      discount: '',
    });
    setTaxes([
      { id: 'tax-1', taxName: 'CGST', taxRate: '2.5' },
      { id: 'tax-2', taxName: 'SGST', taxRate: '2.5' },
    ]);
  };

  const handleOpenAddModal = () => {
    resetForm();
    setIsModalVisible(true);
  };

  const handleOpenEditModal = (book) => {
    setEditingId(book.id);

    // Clean mobile number of existing "+91" prefix for input display
    let rawMobile = book.mobileNumber || '';
    let cleanMobile = rawMobile.replace(/^\+91\s*/, '').replace(/[^\d]/g, '');
    if (cleanMobile.startsWith('91') && cleanMobile.length > 10) {
      cleanMobile = cleanMobile.substring(2);
    }

    setFormData({
      billBookName: book.billBookName || '',
      address: book.address || '',
      mobileNumber: cleanMobile,
      bankName: book.bankName || '',
      accountNo: book.accountNo || '',
      ifsc: book.ifsc || '',
      gstin: book.gstin || '',
      panNo: book.panNo || '',
      discount: book.discount || '',
    });

    if (book.taxes && Array.isArray(book.taxes) && book.taxes.length > 0) {
      setTaxes(
        book.taxes.map((t, idx) => ({
          id: t.id || `tax-${idx}-${Date.now()}`,
          taxName: t.taxName || '',
          taxRate: t.taxRate || '',
        }))
      );
    } else {
      setTaxes([
        { id: 'tax-1', taxName: 'CGST', taxRate: '2.5' },
        { id: 'tax-2', taxName: 'SGST', taxRate: '2.5' },
      ]);
    }

    setIsModalVisible(true);
  };

  const handleCloseModal = () => {
    resetForm();
    setIsModalVisible(false);
  };

  const handleSaveBillBook = async () => {
    if (!formData.billBookName.trim()) {
      Alert.alert('Validation Error', 'Please enter the Bill Book Name.');
      return;
    }

    const rawPhone = formData.mobileNumber.trim().replace(/[^\d]/g, '');
    if (!rawPhone) {
      Alert.alert('Validation Error', 'Please enter the Mobile Number.');
      return;
    }

    // Standardize phone with +91 country code
    const standardizedMobile = `+91 ${rawPhone}`;

    // Filter out completely blank tax rows
    const validTaxes = taxes
      .map((t) => ({
        id: t.id,
        taxName: t.taxName.trim(),
        taxRate: t.taxRate.trim(),
      }))
      .filter((t) => t.taxName || t.taxRate);

    if (editingId) {
      // Update existing bill book
      const updatedList = billBooks.map((item) => {
        if (item.id === editingId) {
          return {
            ...item,
            billBookName: formData.billBookName.trim(),
            address: formData.address.trim(),
            mobileNumber: standardizedMobile,
            bankName: formData.bankName.trim(),
            accountNo: formData.accountNo.trim(),
            ifsc: formData.ifsc.trim().toUpperCase(),
            gstin: formData.gstin.trim().toUpperCase(),
            panNo: formData.panNo.trim().toUpperCase(),
            discount: formData.discount.trim(),
            taxes: validTaxes,
            updatedAt: new Date().toLocaleDateString('en-IN', {
              day: '2-digit',
              month: 'short',
              year: 'numeric',
            }),
          };
        }
        return item;
      });

      try {
        await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(updatedList));
        setBillBooks(updatedList);
        setIsModalVisible(false);
        resetForm();
        Alert.alert('Success', 'Bill Book updated successfully!');
      } catch (error) {
        console.error('Failed to update bill book:', error);
        Alert.alert('Error', 'Failed to update bill book. Please try again.');
      }
    } else {
      // Create new bill book
      const newBook = {
        id: Date.now().toString(),
        createdAt: new Date().toLocaleDateString('en-IN', {
          day: '2-digit',
          month: 'short',
          year: 'numeric',
        }),
        billBookName: formData.billBookName.trim(),
        address: formData.address.trim(),
        mobileNumber: standardizedMobile,
        bankName: formData.bankName.trim(),
        accountNo: formData.accountNo.trim(),
        ifsc: formData.ifsc.trim().toUpperCase(),
        gstin: formData.gstin.trim().toUpperCase(),
        panNo: formData.panNo.trim().toUpperCase(),
        discount: formData.discount.trim(),
        taxes: validTaxes,
      };

      try {
        const updatedList = [newBook, ...billBooks];
        await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(updatedList));
        setBillBooks(updatedList);
        setIsModalVisible(false);
        resetForm();
        Alert.alert('Success', 'Bill Book added successfully!');
      } catch (error) {
        console.error('Failed to save bill book:', error);
        Alert.alert('Error', 'Failed to save bill book details. Please try again.');
      }
    }
  };

  const handleDeleteBillBook = (id, name) => {
    Alert.alert(
      'Delete Bill Book',
      `Are you sure you want to delete "${name}"?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              const updatedList = billBooks.filter((item) => item.id !== id);
              await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(updatedList));
              setBillBooks(updatedList);
            } catch (error) {
              console.error('Failed to delete bill book:', error);
              Alert.alert('Error', 'Unable to delete bill book.');
            }
          },
        },
      ]
    );
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <StatusBar barStyle="dark-content" backgroundColor="#F8FAFC" />

      {/* Screen Header with Right-Side Add Button */}
      <View style={styles.header}>
        <View>
          <Text style={styles.pageTitle}>Bill Book</Text>
          <Text style={styles.pageSubtitle}>
            {billBooks.length} {billBooks.length === 1 ? 'book' : 'books'} registered
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

      {/* Main Content Area */}
      {billBooks.length === 0 && !isLoading ? (
        <View style={styles.emptyContainer}>
          <View style={styles.emptyIconWrap}>
            <Ionicons name="book-outline" size={48} color="#4F46E5" />
          </View>
          <Text style={styles.emptyTitle}>No Bill Books Added</Text>
          <Text style={styles.emptySubtitle}>
            Tap the "+ Add" button at the top right to register your firm name, bank accounts, GSTIN, multiple tax rates and billing details.
          </Text>
          <TouchableOpacity
            style={styles.emptyActionBtn}
            onPress={handleOpenAddModal}
            activeOpacity={0.7}
          >
            <Ionicons name="add-circle-outline" size={20} color="#FFFFFF" />
            <Text style={styles.emptyActionBtnText}>Create Bill Book</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <ScrollView
          style={styles.listScrollView}
          contentContainerStyle={styles.listContentContainer}
          showsVerticalScrollIndicator={false}
        >
          {billBooks.map((book) => (
            <View key={book.id} style={styles.bookCard}>
              {/* Card Header */}
              <View style={styles.bookCardHeader}>
                <View style={styles.avatarWrap}>
                  <Text style={styles.avatarText}>
                    {book.billBookName ? book.billBookName.charAt(0).toUpperCase() : 'B'}
                  </Text>
                </View>
                <View style={styles.cardHeaderInfo}>
                  <Text style={styles.bookName} numberOfLines={1}>
                    {book.billBookName}
                  </Text>
                  {book.mobileNumber ? (
                    <View style={styles.metaRow}>
                      <Ionicons name="call-outline" size={13} color="#64748B" />
                      <Text style={styles.metaText}>{formatMobileWithCountryCode(book.mobileNumber)}</Text>
                    </View>
                  ) : null}
                </View>

                {/* Edit & Delete Action Buttons */}
                <View style={styles.cardActionsGroup}>
                  <TouchableOpacity
                    style={styles.editBtn}
                    onPress={() => handleOpenEditModal(book)}
                    activeOpacity={0.7}
                  >
                    <Ionicons name="create-outline" size={16} color="#4F46E5" />
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={styles.deleteBtn}
                    onPress={() => handleDeleteBillBook(book.id, book.billBookName)}
                    activeOpacity={0.6}
                  >
                    <Ionicons name="trash-outline" size={16} color="#EF4444" />
                  </TouchableOpacity>
                </View>
              </View>

              {/* Address */}
              {book.address ? (
                <View style={styles.addressRow}>
                  <Ionicons name="location-outline" size={14} color="#64748B" style={styles.detailIcon} />
                  <Text style={styles.addressText} numberOfLines={2}>
                    {book.address}
                  </Text>
                </View>
              ) : null}

              {/* Badges Row (Discount, GSTIN, PAN) */}
              <View style={styles.badgesWrap}>
                {book.discount ? (
                  <View style={[styles.badge, styles.discountBadge]}>
                    <Ionicons name="pricetag-outline" size={12} color="#059669" />
                    <Text style={styles.discountBadgeText}>{book.discount}% Discount</Text>
                  </View>
                ) : null}

                {book.gstin ? (
                  <View style={styles.badge}>
                    <Text style={styles.badgeLabel}>GSTIN:</Text>
                    <Text style={styles.badgeValue}>{book.gstin}</Text>
                  </View>
                ) : null}

                {book.panNo ? (
                  <View style={styles.badge}>
                    <Text style={styles.badgeLabel}>PAN:</Text>
                    <Text style={styles.badgeValue}>{book.panNo}</Text>
                  </View>
                ) : null}
              </View>

              {/* Multiple Taxes Section */}
              {book.taxes && book.taxes.length > 0 ? (
                <View style={styles.taxesSection}>
                  <View style={styles.taxesSectionHeader}>
                    <Ionicons name="receipt-outline" size={13} color="#D97706" />
                    <Text style={styles.taxesSectionTitle}>Applied Taxes</Text>
                  </View>
                  <View style={styles.taxBadgesList}>
                    {book.taxes.map((t, idx) => (
                      <View key={t.id || idx} style={styles.taxChip}>
                        <Text style={styles.taxChipName}>{t.taxName || 'Tax'}:</Text>
                        <Text style={styles.taxChipRate}>{t.taxRate}%</Text>
                      </View>
                    ))}
                  </View>
                </View>
              ) : null}

              {/* Bank Details Section */}
              {(book.bankName || book.accountNo || book.ifsc) ? (
                <View style={styles.bankSection}>
                  <View style={styles.bankSectionHeader}>
                    <Ionicons name="business-outline" size={14} color="#4F46E5" />
                    <Text style={styles.bankSectionTitle}>Bank Information</Text>
                  </View>
                  <View style={styles.bankGrid}>
                    {book.bankName ? (
                      <View style={styles.bankCol}>
                        <Text style={styles.bankFieldLabel}>Bank</Text>
                        <Text style={styles.bankFieldValue}>{book.bankName}</Text>
                      </View>
                    ) : null}
                    {book.accountNo ? (
                      <View style={styles.bankCol}>
                        <Text style={styles.bankFieldLabel}>A/C No</Text>
                        <Text style={styles.bankFieldValue}>{book.accountNo}</Text>
                      </View>
                    ) : null}
                    {book.ifsc ? (
                      <View style={styles.bankCol}>
                        <Text style={styles.bankFieldLabel}>IFSC</Text>
                        <Text style={styles.bankFieldValue}>{book.ifsc}</Text>
                      </View>
                    ) : null}
                  </View>
                </View>
              ) : null}
            </View>
          ))}
        </ScrollView>
      )}

      {/* Add / Edit Bill Book Modal Form */}
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
          <View style={styles.modalContent}>
            {/* Modal Header */}
            <View style={styles.modalHeader}>
              <View>
                <Text style={styles.modalTitle}>
                  {editingId ? 'Edit Bill Book' : 'Add Bill Book'}
                </Text>
                <Text style={styles.modalSubtitle}>
                  {editingId
                    ? 'Update company, tax & banking details'
                    : 'Fill in company, tax & banking details'}
                </Text>
              </View>
              <TouchableOpacity
                style={styles.modalCloseBtn}
                onPress={handleCloseModal}
                activeOpacity={0.7}
              >
                <Ionicons name="close" size={22} color="#64748B" />
              </TouchableOpacity>
            </View>

            {/* Form Fields Scroll */}
            <ScrollView
              style={styles.formScrollView}
              contentContainerStyle={styles.formContent}
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
            >
              {/* Field 1: Bill Book Name */}
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>
                  Bill Book Name <Text style={styles.requiredStar}>*</Text>
                </Text>
                <TextInput
                  style={styles.input}
                  placeholder="e.g. Sri Lakshmi Textiles"
                  placeholderTextColor="#94A3B8"
                  value={formData.billBookName}
                  onChangeText={(val) => handleInputChange('billBookName', val)}
                />
              </View>

              {/* Field 2: Mobile Number with Default +91 Country Code */}
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>
                  Mobile Number <Text style={styles.requiredStar}>*</Text>
                </Text>
                <View style={styles.phoneInputRow}>
                  {/* Default Country Code Badge */}
                  <View style={styles.countryCodePill}>
                    <Text style={styles.flagEmoji}>🇮🇳</Text>
                    <Text style={styles.countryCodeText}>+91</Text>
                  </View>
                  <TextInput
                    style={[styles.input, styles.phoneInput]}
                    placeholder="98765 43210"
                    placeholderTextColor="#94A3B8"
                    keyboardType="phone-pad"
                    maxLength={10}
                    value={formData.mobileNumber}
                    onChangeText={(val) => {
                      let digits = val.replace(/[^\d]/g, '');
                      if (digits.startsWith('91') && digits.length > 10) {
                        digits = digits.substring(2);
                      }
                      handleInputChange('mobileNumber', digits.slice(0, 10));
                    }}
                  />
                </View>
              </View>

              {/* Field 3: Address */}
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Address</Text>
                <TextInput
                  style={[styles.input, styles.inputMultiline]}
                  placeholder="e.g. 104 Ring Road, Textile Market, Surat"
                  placeholderTextColor="#94A3B8"
                  multiline
                  numberOfLines={2}
                  value={formData.address}
                  onChangeText={(val) => handleInputChange('address', val)}
                />
              </View>

              {/* Multiple Tax Details Section */}
              <View style={styles.formSectionDivider}>
                <View style={styles.sectionHeaderRow}>
                  <Text style={styles.formSectionTitle}>Tax Details (Multiple)</Text>
                  <TouchableOpacity
                    style={styles.addTaxSmallBtn}
                    onPress={handleAddTax}
                    activeOpacity={0.7}
                  >
                    <Ionicons name="add-circle" size={16} color="#4F46E5" />
                    <Text style={styles.addTaxSmallBtnText}>Add Tax</Text>
                  </TouchableOpacity>
                </View>
              </View>

              {/* Tax Presets Chips */}
              <View style={styles.presetsContainer}>
                <Text style={styles.presetsLabel}>Quick presets:</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.presetsScroll}>
                  {DEFAULT_TAX_PRESETS.map((preset, idx) => (
                    <TouchableOpacity
                      key={idx}
                      style={styles.presetChip}
                      onPress={() => handleApplyTaxPreset(preset.items)}
                      activeOpacity={0.7}
                    >
                      <Ionicons name="flash-outline" size={12} color="#4F46E5" />
                      <Text style={styles.presetChipText}>{preset.label}</Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>

              {/* Dynamic Multiple Tax Rows */}
              <View style={styles.taxRowsContainer}>
                {taxes.map((taxItem) => (
                  <View key={taxItem.id} style={styles.taxRowItem}>
                    <View style={styles.taxInputColName}>
                      <Text style={styles.taxColLabel}>Tax Name</Text>
                      <TextInput
                        style={styles.taxInput}
                        placeholder="e.g. CGST, SGST, Cess"
                        placeholderTextColor="#94A3B8"
                        autoCapitalize="characters"
                        value={taxItem.taxName}
                        onChangeText={(val) => handleTaxChange(taxItem.id, 'taxName', val)}
                      />
                    </View>

                    <View style={styles.taxInputColRate}>
                      <Text style={styles.taxColLabel}>Rate (%)</Text>
                      <TextInput
                        style={styles.taxInput}
                        placeholder="e.g. 2.5"
                        placeholderTextColor="#94A3B8"
                        keyboardType="decimal-pad"
                        value={taxItem.taxRate}
                        onChangeText={(val) => handleTaxChange(taxItem.id, 'taxRate', val)}
                      />
                    </View>

                    <TouchableOpacity
                      style={styles.taxRemoveBtn}
                      onPress={() => handleRemoveTax(taxItem.id)}
                      activeOpacity={0.6}
                    >
                      <Ionicons name="trash-outline" size={18} color="#EF4444" />
                    </TouchableOpacity>
                  </View>
                ))}

                <TouchableOpacity
                  style={styles.addMoreTaxBtn}
                  onPress={handleAddTax}
                  activeOpacity={0.7}
                >
                  <Ionicons name="add" size={16} color="#4F46E5" />
                  <Text style={styles.addMoreTaxBtnText}>Add Another Tax</Text>
                </TouchableOpacity>
              </View>

              {/* Commercial & Discount Details */}
              <View style={styles.formSectionDivider}>
                <Text style={styles.formSectionTitle}>Discount & Tax Identifiers</Text>
              </View>

              {/* Field: Discount */}
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Discount (%)</Text>
                <TextInput
                  style={styles.input}
                  placeholder="e.g. 5 or 10"
                  placeholderTextColor="#94A3B8"
                  keyboardType="decimal-pad"
                  value={formData.discount}
                  onChangeText={(val) => handleInputChange('discount', val)}
                />
              </View>

              {/* Field: GSTIN */}
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>GSTIN (GST Number)</Text>
                <TextInput
                  style={styles.input}
                  placeholder="e.g. 24AAAAA0000A1Z5"
                  placeholderTextColor="#94A3B8"
                  autoCapitalize="characters"
                  maxLength={15}
                  value={formData.gstin}
                  onChangeText={(val) => handleInputChange('gstin', val)}
                />
              </View>

              {/* Field: PAN No */}
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>PAN No</Text>
                <TextInput
                  style={styles.input}
                  placeholder="e.g. ABCDE1234F"
                  placeholderTextColor="#94A3B8"
                  autoCapitalize="characters"
                  maxLength={10}
                  value={formData.panNo}
                  onChangeText={(val) => handleInputChange('panNo', val)}
                />
              </View>

              {/* Bank Details Divider */}
              <View style={styles.formSectionDivider}>
                <Text style={styles.formSectionTitle}>Bank & Account Details</Text>
              </View>

              {/* Field: Bank Name */}
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Bank Name</Text>
                <TextInput
                  style={styles.input}
                  placeholder="e.g. State Bank of India"
                  placeholderTextColor="#94A3B8"
                  value={formData.bankName}
                  onChangeText={(val) => handleInputChange('bankName', val)}
                />
              </View>

              {/* Field: A/C No */}
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>A/C No (Account Number)</Text>
                <TextInput
                  style={styles.input}
                  placeholder="e.g. 30894218821"
                  placeholderTextColor="#94A3B8"
                  keyboardType="number-pad"
                  value={formData.accountNo}
                  onChangeText={(val) => handleInputChange('accountNo', val)}
                />
              </View>

              {/* Field: IFSC Code */}
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>IFSC Code</Text>
                <TextInput
                  style={styles.input}
                  placeholder="e.g. SBIN0001234"
                  placeholderTextColor="#94A3B8"
                  autoCapitalize="characters"
                  maxLength={11}
                  value={formData.ifsc}
                  onChangeText={(val) => handleInputChange('ifsc', val)}
                />
              </View>
            </ScrollView>

            {/* Modal Footer Buttons */}
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
                onPress={handleSaveBillBook}
                activeOpacity={0.8}
              >
                <Ionicons
                  name={editingId ? 'save-outline' : 'checkmark-circle-outline'}
                  size={18}
                  color="#FFFFFF"
                />
                <Text style={styles.saveBtnText}>
                  {editingId ? 'Update Bill Book' : 'Save Bill Book'}
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
  listScrollView: {
    flex: 1,
  },
  listContentContainer: {
    paddingHorizontal: 20,
    paddingBottom: 28,
  },
  bookCard: {
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
  bookCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
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
  bookName: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0F172A',
    marginBottom: 2,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  metaText: {
    fontSize: 13,
    color: '#64748B',
    fontWeight: '600',
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
  addressRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  detailIcon: {
    marginTop: 2,
    marginRight: 6,
  },
  addressText: {
    fontSize: 13,
    color: '#475569',
    lineHeight: 18,
    flex: 1,
  },
  badgesWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 10,
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 9,
    paddingVertical: 5,
    borderRadius: 8,
    gap: 4,
  },
  discountBadge: {
    backgroundColor: '#ECFDF5',
  },
  discountBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#059669',
  },
  badgeLabel: {
    fontSize: 10,
    fontWeight: '600',
    color: '#64748B',
  },
  badgeValue: {
    fontSize: 11,
    fontWeight: '700',
    color: '#1E293B',
  },
  taxesSection: {
    backgroundColor: '#FFFBEB',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: '#FEF3C7',
    marginBottom: 10,
  },
  taxesSectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    marginBottom: 6,
  },
  taxesSectionTitle: {
    fontSize: 11,
    fontWeight: '700',
    color: '#B45309',
    textTransform: 'uppercase',
    letterSpacing: 0.3,
  },
  taxBadgesList: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  taxChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#FDE68A',
    gap: 4,
  },
  taxChipName: {
    fontSize: 11,
    fontWeight: '600',
    color: '#92400E',
  },
  taxChipRate: {
    fontSize: 11,
    fontWeight: '700',
    color: '#B45309',
  },
  bankSection: {
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: '#F1F5F9',
  },
  bankSectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 8,
  },
  bankSectionTitle: {
    fontSize: 12,
    fontWeight: '600',
    color: '#4F46E5',
  },
  bankGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  bankCol: {
    minWidth: '45%',
    flex: 1,
  },
  bankFieldLabel: {
    fontSize: 10,
    color: '#94A3B8',
    marginBottom: 2,
  },
  bankFieldValue: {
    fontSize: 12,
    fontWeight: '600',
    color: '#1E293B',
  },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 36,
  },
  emptyIconWrap: {
    width: 88,
    height: 88,
    borderRadius: 44,
    backgroundColor: '#EEF2FF',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 18,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#0F172A',
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
    shadowOffset: { width: 0, height: 3 },
    elevation: 3,
  },
  emptyActionBtnText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '92%',
    paddingBottom: Platform.OS === 'ios' ? 24 : 16,
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
    fontSize: 20,
    fontWeight: '700',
    color: '#0F172A',
  },
  modalSubtitle: {
    fontSize: 13,
    color: '#64748B',
    marginTop: 2,
  },
  modalCloseBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  formScrollView: {
    paddingHorizontal: 20,
  },
  formContent: {
    paddingTop: 16,
    paddingBottom: 16,
  },
  inputGroup: {
    marginBottom: 14,
  },
  inputLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#334155',
    marginBottom: 6,
  },
  requiredStar: {
    color: '#EF4444',
  },
  input: {
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 14,
    color: '#0F172A',
  },
  inputMultiline: {
    minHeight: 64,
    textAlignVertical: 'top',
  },
  phoneInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  countryCodePill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F1F5F9',
    borderWidth: 1,
    borderColor: '#CBD5E1',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    gap: 6,
  },
  flagEmoji: {
    fontSize: 15,
  },
  countryCodeText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#1E293B',
  },
  phoneInput: {
    flex: 1,
  },
  formSectionDivider: {
    marginTop: 8,
    marginBottom: 12,
    paddingBottom: 6,
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  formSectionTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#4F46E5',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  addTaxSmallBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 2,
    paddingHorizontal: 6,
  },
  addTaxSmallBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#4F46E5',
  },
  presetsContainer: {
    marginBottom: 12,
  },
  presetsLabel: {
    fontSize: 11,
    color: '#64748B',
    marginBottom: 6,
    fontWeight: '500',
  },
  presetsScroll: {
    flexDirection: 'row',
  },
  presetChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#EEF2FF',
    borderWidth: 1,
    borderColor: '#C7D2FE',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 14,
    marginRight: 8,
    gap: 4,
  },
  presetChipText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#4F46E5',
  },
  taxRowsContainer: {
    backgroundColor: '#F8FAFC',
    borderRadius: 14,
    padding: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginBottom: 14,
  },
  taxRowItem: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    marginBottom: 10,
    gap: 10,
  },
  taxInputColName: {
    flex: 3,
  },
  taxInputColRate: {
    flex: 2,
  },
  taxColLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: '#64748B',
    marginBottom: 4,
  },
  taxInput: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#CBD5E1',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 13,
    color: '#0F172A',
  },
  taxRemoveBtn: {
    width: 36,
    height: 36,
    borderRadius: 8,
    backgroundColor: '#FEE2E2',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 1,
  },
  addMoreTaxBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#C7D2FE',
    borderStyle: 'dashed',
    borderRadius: 10,
    paddingVertical: 9,
    gap: 6,
    marginTop: 4,
  },
  addMoreTaxBtnText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#4F46E5',
  },
  modalFooter: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
    gap: 12,
  },
  cancelBtn: {
    flex: 1,
    paddingVertical: 13,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
  },
  cancelBtnText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#64748B',
  },
  saveBtn: {
    flex: 2,
    flexDirection: 'row',
    paddingVertical: 13,
    borderRadius: 14,
    backgroundColor: '#4F46E5',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    shadowColor: '#4F46E5',
    shadowOpacity: 0.25,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 3 },
    elevation: 3,
  },
  saveBtnText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#FFFFFF',
  },
});
