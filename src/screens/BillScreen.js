import React, { useState, useEffect } from 'react';
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

const BILLS_STORAGE_KEY = '@textile_bills_list';
const BILL_BOOKS_STORAGE_KEY = '@textile_bill_books';

const MONTH_NAMES = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
];

const WEEKDAYS = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];

// Helper to get formatted today's date (DD/MM/YYYY)
const getTodayFormatted = () => {
  const now = new Date();
  const day = String(now.getDate()).padStart(2, '0');
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const year = now.getFullYear();
  return `${day}/${month}/${year}`;
};

// Helper to format any Date object to DD/MM/YYYY
const formatDateToDDMMYYYY = (date) => {
  if (!date || isNaN(date.getTime())) return getTodayFormatted();
  const day = String(date.getDate()).padStart(2, '0');
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const year = date.getFullYear();
  return `${day}/${month}/${year}`;
};

// Helper to format Date for readable display (e.g. "Fri, 04 Sep 2026")
const formatDateToReadable = (date) => {
  if (!date || isNaN(date.getTime())) return '';
  const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const months = [
    'Jan',
    'Feb',
    'Mar',
    'Apr',
    'May',
    'Jun',
    'Jul',
    'Aug',
    'Sep',
    'Oct',
    'Nov',
    'Dec',
  ];
  const dayName = days[date.getDay()];
  const d = String(date.getDate()).padStart(2, '0');
  const m = months[date.getMonth()];
  const y = date.getFullYear();
  return `${dayName}, ${d} ${m} ${y}`;
};

// Helper to parse DD/MM/YYYY back into Date object
const parseDateString = (str) => {
  if (!str) return new Date();
  const parts = str.split('/');
  if (parts.length === 3) {
    const day = parseInt(parts[0], 10);
    const month = parseInt(parts[1], 10) - 1;
    const year = parseInt(parts[2], 10);
    const d = new Date(year, month, day);
    if (!isNaN(d.getTime())) return d;
  }
  const fallback = new Date(str);
  return isNaN(fallback.getTime()) ? new Date() : fallback;
};

// Helper to generate calendar weeks: array of 7-day rows with exact columns
const getCalendarWeeks = (year, month) => {
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const firstDayIndex = new Date(year, month, 1).getDay(); // 0 = Sunday

  const prevMonthDaysCount = new Date(year, month, 0).getDate();
  const allDays = [];

  // Previous month padding days
  for (let i = firstDayIndex - 1; i >= 0; i--) {
    allDays.push({
      day: prevMonthDaysCount - i,
      month: month === 0 ? 11 : month - 1,
      year: month === 0 ? year - 1 : year,
      isCurrentMonth: false,
    });
  }

  // Current month days
  for (let i = 1; i <= daysInMonth; i++) {
    allDays.push({
      day: i,
      month: month,
      year: year,
      isCurrentMonth: true,
    });
  }

  // Next month padding to complete row of 7
  const remainder = allDays.length % 7;
  const nextDaysCount = remainder === 0 ? 0 : 7 - remainder;
  for (let i = 1; i <= nextDaysCount; i++) {
    allDays.push({
      day: i,
      month: month === 11 ? 0 : month + 1,
      year: month === 11 ? year + 1 : year,
      isCurrentMonth: false,
    });
  }

  // Split into 7-day rows
  const weeks = [];
  for (let i = 0; i < allDays.length; i += 7) {
    weeks.push(allDays.slice(i, i + 7));
  }
  return weeks;
};

export default function BillScreen({ navigation }) {
  const [bills, setBills] = useState([]);
  const [billBooks, setBillBooks] = useState([]);
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [isBookPickerVisible, setIsBookPickerVisible] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  // Interactive Calendar Date Picker State
  const [isCalendarVisible, setIsCalendarVisible] = useState(false);
  const [pickerSelectedDate, setPickerSelectedDate] = useState(new Date());
  const [pickerViewMonth, setPickerViewMonth] = useState(new Date().getMonth());
  const [pickerViewYear, setPickerViewYear] = useState(new Date().getFullYear());

  // Selected Bill Book inside the form
  const [selectedBillBook, setSelectedBillBook] = useState(null);

  // Form State
  const [formData, setFormData] = useState({
    partyName: '',
    billNo: '',
    date: getTodayFormatted(),
    pChNo: '',
    partyGstin: '',
    // Bill Book inherited fields
    billBookId: '',
    billBookName: '',
    billBookAddress: '',
    billBookGstin: '',
    billBookPan: '',
    billBookDiscount: '',
    billBookBankName: '',
    billBookAccountNo: '',
    billBookIfsc: '',
  });

  // Multiple Taxes (inherited from Bill Book or customized)
  const [taxes, setTaxes] = useState([]);

  // Multiple Items State
  const [items, setItems] = useState([
    {
      id: 'item-1',
      description: '',
      hsnCode: '',
      psc: '',
      rate: '',
      amount: '',
    },
  ]);

  // Load bills and bill books on mount
  useEffect(() => {
    loadAllData();
  }, []);

  const loadAllData = async () => {
    try {
      setIsLoading(true);
      const [billsData, booksData] = await Promise.all([
        AsyncStorage.getItem(BILLS_STORAGE_KEY),
        AsyncStorage.getItem(BILL_BOOKS_STORAGE_KEY),
      ]);

      if (billsData) {
        setBills(JSON.parse(billsData));
      } else {
        setBills([]);
      }

      if (booksData) {
        setBillBooks(JSON.parse(booksData));
      } else {
        setBillBooks([]);
      }
    } catch (error) {
      console.error('Failed to load data:', error);
      Alert.alert('Error', 'Unable to load bills and bill books from storage.');
    } finally {
      setIsLoading(false);
    }
  };

  const reloadBillBooks = async () => {
    try {
      const booksData = await AsyncStorage.getItem(BILL_BOOKS_STORAGE_KEY);
      if (booksData) {
        const parsed = JSON.parse(booksData);
        setBillBooks(parsed);
        return parsed;
      }
    } catch (e) {
      console.error(e);
    }
    return [];
  };

  const handleInputChange = (field, value) => {
    setFormData((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  // Calendar Date Picker Handlers (Popup Dialog)
  const handleOpenDatePicker = () => {
    const current = parseDateString(formData.date);
    setPickerSelectedDate(current);
    setPickerViewMonth(current.getMonth());
    setPickerViewYear(current.getFullYear());
    setIsCalendarVisible(true);
  };

  const handlePrevMonth = () => {
    if (pickerViewMonth === 0) {
      setPickerViewMonth(11);
      setPickerViewYear((prev) => prev - 1);
    } else {
      setPickerViewMonth((prev) => prev - 1);
    }
  };

  const handleNextMonth = () => {
    if (pickerViewMonth === 11) {
      setPickerViewMonth(0);
      setPickerViewYear((prev) => prev + 1);
    } else {
      setPickerViewMonth((prev) => prev + 1);
    }
  };

  const handlePrevYear = () => {
    setPickerViewYear((prev) => prev - 1);
  };

  const handleNextYear = () => {
    setPickerViewYear((prev) => prev + 1);
  };

  const handleSelectDay = (day, month, year) => {
    const m = month !== undefined ? month : pickerViewMonth;
    const y = year !== undefined ? year : pickerViewYear;
    const newDate = new Date(y, m, day);
    setPickerSelectedDate(newDate);
    setPickerViewMonth(m);
    setPickerViewYear(y);
  };

  const handleSelectToday = () => {
    const today = new Date();
    setPickerSelectedDate(today);
    setPickerViewMonth(today.getMonth());
    setPickerViewYear(today.getFullYear());
  };

  const handleConfirmDate = () => {
    const formatted = formatDateToDDMMYYYY(pickerSelectedDate);
    setFormData((prev) => ({ ...prev, date: formatted }));
    setIsCalendarVisible(false);
  };

  const handleCancelDate = () => {
    setIsCalendarVisible(false);
  };

  // Select a Bill Book and auto-populate its registered details
  const handleSelectBillBook = (book) => {
    setSelectedBillBook(book);
    setFormData((prev) => ({
      ...prev,
      billBookId: book.id,
      billBookName: book.billBookName || '',
      billBookAddress: book.address || '',
      billBookGstin: book.gstin || '',
      billBookPan: book.panNo || '',
      billBookDiscount: book.discount || '',
      billBookBankName: book.bankName || '',
      billBookAccountNo: book.accountNo || '',
      billBookIfsc: book.ifsc || '',
    }));

    if (book.taxes && Array.isArray(book.taxes) && book.taxes.length > 0) {
      setTaxes(book.taxes.map((t) => ({ ...t })));
    } else {
      setTaxes([]);
    }

    setIsBookPickerVisible(false);
  };

  // Multiple Items Handlers
  const handleItemChange = (id, field, value) => {
    setItems((prev) =>
      prev.map((item) => {
        if (item.id === id) {
          const updated = { ...item, [field]: value };
          if (field === 'psc' || field === 'rate') {
            const pscVal = parseFloat(field === 'psc' ? value : item.psc) || 0;
            const rateVal = parseFloat(field === 'rate' ? value : item.rate) || 0;
            if (pscVal > 0 && rateVal > 0) {
              updated.amount = (pscVal * rateVal).toFixed(2).replace(/\.00$/, '');
            }
          }
          return updated;
        }
        return item;
      })
    );
  };

  const handleAddItem = () => {
    setItems((prev) => [
      ...prev,
      {
        id: Date.now().toString(),
        description: '',
        hsnCode: '',
        psc: '',
        rate: '',
        amount: '',
      },
    ]);
  };

  const handleRemoveItem = (id) => {
    if (items.length === 1) {
      setItems([
        {
          id: Date.now().toString(),
          description: '',
          hsnCode: '',
          psc: '',
          rate: '',
          amount: '',
        },
      ]);
      return;
    }
    setItems((prev) => prev.filter((item) => item.id !== id));
  };

  // Calculation helpers
  const calculateGrossTotal = () => {
    return items.reduce((sum, it) => sum + (parseFloat(it.amount) || 0), 0);
  };

  // Backward-compatible alias
  const calculateSubtotal = calculateGrossTotal;

  const calculateDiscountAmount = (grossTotal) => {
    const discPercent = parseFloat(formData.billBookDiscount) || 0;
    if (discPercent <= 0) return 0;
    return Math.round(((grossTotal * discPercent) / 100) * 100) / 100;
  };

  const calculateTaxableTotal = () => {
    const gross = calculateGrossTotal();
    const disc = calculateDiscountAmount(gross);
    return Math.max(0, Math.round((gross - disc) * 100) / 100);
  };

  const calculateTotalTaxes = (taxableAmount) => {
    if (!taxes || taxes.length === 0) return 0;
    return taxes.reduce((sum, t) => {
      const rate = parseFloat(t.taxRate) || 0;
      return sum + (taxableAmount * rate) / 100;
    }, 0);
  };

  const calculateGrandTotal = () => {
    const taxable = calculateTaxableTotal();
    const totalTaxes = calculateTotalTaxes(taxable);
    return Math.round((taxable + totalTaxes) * 100) / 100;
  };

  const resetForm = () => {
    setEditingId(null);
    setSelectedBillBook(null);
    setIsCalendarVisible(false);
    const today = new Date();
    setPickerSelectedDate(today);
    setPickerViewMonth(today.getMonth());
    setPickerViewYear(today.getFullYear());
    setFormData({
      partyName: '',
      billNo: '',
      date: getTodayFormatted(),
      pChNo: '',
      partyGstin: '',
      billBookId: '',
      billBookName: '',
      billBookAddress: '',
      billBookGstin: '',
      billBookPan: '',
      billBookDiscount: '',
      billBookBankName: '',
      billBookAccountNo: '',
      billBookIfsc: '',
    });
    setTaxes([]);
    setItems([
      {
        id: 'item-1',
        description: '',
        hsnCode: '',
        psc: '',
        rate: '',
        amount: '',
      },
    ]);
  };

  const handleOpenAddModal = async () => {
    resetForm();
    const books = await reloadBillBooks();
    if (books.length > 0) {
      handleSelectBillBook(books[0]);
    }
    setIsModalVisible(true);
  };

  const handleOpenEditModal = async (bill) => {
    setEditingId(bill.id);
    const books = await reloadBillBooks();

    const matchedBook = books.find((b) => b.id === bill.billBookId) || {
      id: bill.billBookId || '',
      billBookName: bill.billBookName || '',
      address: bill.billBookAddress || '',
      gstin: bill.billBookGstin || '',
      panNo: bill.billBookPan || '',
      discount: bill.billBookDiscount || '',
      bankName: bill.billBookBankName || '',
      accountNo: bill.billBookAccountNo || '',
      ifsc: bill.billBookIfsc || '',
    };
    setSelectedBillBook(matchedBook);

    const parsedDate = parseDateString(bill.date);
    setPickerSelectedDate(parsedDate);
    setPickerViewMonth(parsedDate.getMonth());
    setPickerViewYear(parsedDate.getFullYear());
    setIsCalendarVisible(false);

    setFormData({
      partyName: bill.partyName || '',
      billNo: bill.billNo || '',
      date: bill.date || getTodayFormatted(),
      pChNo: bill.pChNo || '',
      partyGstin: bill.partyGstin || '',
      billBookId: bill.billBookId || '',
      billBookName: bill.billBookName || '',
      billBookAddress: bill.billBookAddress || '',
      billBookGstin: bill.billBookGstin || '',
      billBookPan: bill.billBookPan || '',
      billBookDiscount: bill.billBookDiscount || '',
      billBookBankName: bill.billBookBankName || '',
      billBookAccountNo: bill.billBookAccountNo || '',
      billBookIfsc: bill.billBookIfsc || '',
    });

    if (bill.taxes && Array.isArray(bill.taxes) && bill.taxes.length > 0) {
      setTaxes(bill.taxes.map((t) => ({ ...t })));
    } else {
      setTaxes([]);
    }

    if (bill.items && Array.isArray(bill.items) && bill.items.length > 0) {
      setItems(
        bill.items.map((it, idx) => ({
          id: it.id || `item-${idx}-${Date.now()}`,
          description: it.description || '',
          hsnCode: it.hsnCode || '',
          psc: String(it.psc || ''),
          rate: String(it.rate || ''),
          amount: String(it.amount || ''),
        }))
      );
    } else {
      setItems([
        {
          id: 'item-1',
          description: '',
          hsnCode: '',
          psc: '',
          rate: '',
          amount: '',
        },
      ]);
    }

    setIsModalVisible(true);
  };

  const handleCloseModal = () => {
    resetForm();
    setIsModalVisible(false);
  };

  const handleSaveBill = async () => {
    if (!formData.billBookName.trim()) {
      Alert.alert('Validation Error', 'Please select a Bill Book for this invoice.');
      return;
    }

    if (!formData.partyName.trim()) {
      Alert.alert('Validation Error', 'Please enter Party Name.');
      return;
    }

    if (!formData.billNo.trim()) {
      Alert.alert('Validation Error', 'Please enter Bill No.');
      return;
    }

    const validItems = items
      .map((it) => ({
        id: it.id,
        description: it.description.trim(),
        hsnCode: it.hsnCode.trim(),
        psc: it.psc.trim(),
        rate: it.rate.trim(),
        amount:
          it.amount.trim() ||
          ((parseFloat(it.psc) || 0) * (parseFloat(it.rate) || 0)).toString(),
      }))
      .filter((it) => it.description || it.amount || it.psc);

    if (validItems.length === 0) {
      Alert.alert('Validation Error', 'Please add at least one line item.');
      return;
    }

    const grossTotal = calculateGrossTotal();
    const discountAmount = calculateDiscountAmount(grossTotal);
    const taxableAmount = Math.max(0, Math.round((grossTotal - discountAmount) * 100) / 100);
    const totalTaxes = Math.round(calculateTotalTaxes(taxableAmount) * 100) / 100;
    const grandTotal = Math.round((taxableAmount + totalTaxes) * 100) / 100;

    const totalPsc = validItems.reduce(
      (sum, it) => sum + (parseFloat(it.psc) || 0),
      0
    );

    const billRecord = {
      id: editingId || Date.now().toString(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toLocaleDateString('en-IN'),
      partyName: formData.partyName.trim(),
      billNo: formData.billNo.trim(),
      date: formData.date.trim() || getTodayFormatted(),
      pChNo: formData.pChNo.trim(),
      partyGstin: formData.partyGstin.trim().toUpperCase(),
      billBookId: formData.billBookId,
      billBookName: formData.billBookName.trim(),
      billBookAddress: formData.billBookAddress.trim(),
      billBookGstin: formData.billBookGstin.trim().toUpperCase(),
      billBookPan: formData.billBookPan.trim().toUpperCase(),
      billBookDiscount: formData.billBookDiscount.trim(),
      billBookBankName: formData.billBookBankName.trim(),
      billBookAccountNo: formData.billBookAccountNo.trim(),
      billBookIfsc: formData.billBookIfsc.trim().toUpperCase(),
      taxes: taxes.map((t) => ({ ...t })),
      items: validItems,
      grossTotal,
      subtotal: grossTotal,
      discountAmount,
      taxableAmount,
      totalAmountBeforeTax: taxableAmount,
      totalTaxes,
      totalAmount: grandTotal,
      totalPsc,
    };

    try {
      let updatedList;
      if (editingId) {
        updatedList = bills.map((b) => (b.id === editingId ? billRecord : b));
      } else {
        updatedList = [billRecord, ...bills];
      }

      await AsyncStorage.setItem(BILLS_STORAGE_KEY, JSON.stringify(updatedList));
      setBills(updatedList);
      setIsModalVisible(false);
      resetForm();
      Alert.alert(
        'Success',
        editingId ? 'Bill updated successfully!' : 'Bill saved successfully!'
      );
    } catch (error) {
      console.error('Failed to save bill:', error);
      Alert.alert('Error', 'Failed to save bill details.');
    }
  };

  const handleDeleteBill = (id, billNo) => {
    Alert.alert(
      'Delete Bill',
      `Are you sure you want to delete Bill "${billNo}"?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              const updatedList = bills.filter((b) => b.id !== id);
              await AsyncStorage.setItem(BILLS_STORAGE_KEY, JSON.stringify(updatedList));
              setBills(updatedList);
            } catch (error) {
              console.error('Failed to delete bill:', error);
              Alert.alert('Error', 'Unable to delete bill.');
            }
          },
        },
      ]
    );
  };

  const grandTotalBilled = bills.reduce(
    (sum, b) => sum + (parseFloat(b.totalAmount) || 0),
    0
  );

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <StatusBar barStyle="dark-content" backgroundColor="#F8FAFC" />

      {/* Header with Right-Side Add Bill Button */}
      <View style={styles.header}>
        <View>
          <Text style={styles.pageTitle}>Bills & Invoices</Text>
          <Text style={styles.pageSubtitle}>
            {bills.length} {bills.length === 1 ? 'bill' : 'bills'} recorded
          </Text>
        </View>

        <TouchableOpacity
          style={styles.headerAddBtn}
          onPress={handleOpenAddModal}
          activeOpacity={0.7}
        >
          <Ionicons name="add" size={20} color="#FFFFFF" />
          <Text style={styles.headerAddBtnText}>Add Bill</Text>
        </TouchableOpacity>
      </View>

      {/* Summary Box */}
      {bills.length > 0 && (
        <View style={styles.summaryContainer}>
          <View style={styles.summaryBox}>
            <Text style={styles.summaryLabel}>Total Invoiced Amount</Text>
            <Text style={styles.summaryAmount}>
              ₹{grandTotalBilled.toLocaleString('en-IN')}
            </Text>
          </View>
          <View style={[styles.summaryBox, styles.summaryBoxHighlight]}>
            <Text style={[styles.summaryLabel, { color: '#4F46E5' }]}>Total Bills</Text>
            <Text style={[styles.summaryAmount, { color: '#4F46E5' }]}>
              {bills.length}
            </Text>
          </View>
        </View>
      )}

      {/* Main Content Area */}
      {bills.length === 0 && !isLoading ? (
        <View style={styles.emptyContainer}>
          <View style={styles.emptyIconWrap}>
            <Ionicons name="receipt-outline" size={48} color="#4F46E5" />
          </View>
          <Text style={styles.emptyTitle}>No Bills Added Yet</Text>
          <Text style={styles.emptySubtitle}>
            Select your registered Bill Book and generate invoices with automatic tax, discount, and bank details.
          </Text>
          <TouchableOpacity
            style={styles.emptyActionBtn}
            onPress={handleOpenAddModal}
            activeOpacity={0.7}
          >
            <Ionicons name="add-circle-outline" size={20} color="#FFFFFF" />
            <Text style={styles.emptyActionBtnText}>Create First Bill</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <ScrollView
          style={styles.listScrollView}
          contentContainerStyle={styles.listContentContainer}
          showsVerticalScrollIndicator={false}
        >
          {bills.map((bill) => (
            <View key={bill.id} style={styles.billCard}>
              {/* Bill Book Association Banner */}
              <View style={styles.cardBillBookBanner}>
                <View style={styles.bannerLeft}>
                  <Ionicons name="book" size={14} color="#4F46E5" />
                  <Text style={styles.bannerBillBookName} numberOfLines={1}>
                    {bill.billBookName || 'Standard Bill Book'}
                  </Text>
                </View>
                {bill.billBookDiscount ? (
                  <View style={styles.bannerDiscountBadge}>
                    <Text style={styles.bannerDiscountText}>
                      {bill.billBookDiscount}% Disc
                    </Text>
                  </View>
                ) : null}
              </View>

              {/* Card Header Row */}
              <View style={styles.cardHeaderRow}>
                <View style={styles.billIconWrap}>
                  <Ionicons name="receipt" size={20} color="#4F46E5" />
                </View>
                <View style={styles.cardHeaderInfo}>
                  <Text style={styles.billPartyName} numberOfLines={1}>
                    {bill.partyName}
                  </Text>
                  <Text style={styles.billMeta}>
                    Bill No: <Text style={styles.boldText}>{bill.billNo}</Text> • {bill.date}
                  </Text>
                </View>

                {/* Edit & Delete Action Buttons */}
                <View style={styles.cardActionsGroup}>
                  <TouchableOpacity
                    style={styles.editBtn}
                    onPress={() => handleOpenEditModal(bill)}
                    activeOpacity={0.7}
                  >
                    <Ionicons name="create-outline" size={16} color="#4F46E5" />
                    <Text style={styles.editBtnText}>Edit</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={styles.deleteBtn}
                    onPress={() => handleDeleteBill(bill.id, bill.billNo)}
                    activeOpacity={0.6}
                  >
                    <Ionicons name="trash-outline" size={16} color="#EF4444" />
                  </TouchableOpacity>
                </View>
              </View>

              {/* Badges: P.Ch.No, Bill Book GSTIN, Party GSTIN */}
              <View style={styles.badgesRow}>
                {bill.pChNo ? (
                  <View style={[styles.badge, styles.pChBadge]}>
                    <Text style={styles.pChBadgeLabel}>P.Ch.No:</Text>
                    <Text style={styles.pChBadgeValue}>{bill.pChNo}</Text>
                  </View>
                ) : null}

                {bill.billBookGstin ? (
                  <View style={styles.badge}>
                    <Text style={styles.badgeLabel}>Firm GST:</Text>
                    <Text style={styles.badgeValue}>{bill.billBookGstin}</Text>
                  </View>
                ) : null}

                {bill.billBookPan ? (
                  <View style={styles.badge}>
                    <Text style={styles.badgeLabel}>PAN:</Text>
                    <Text style={styles.badgeValue}>{bill.billBookPan}</Text>
                  </View>
                ) : null}
              </View>

              {/* Applied Taxes Badges */}
              {bill.taxes && bill.taxes.length > 0 && (
                <View style={styles.taxesRow}>
                  <Text style={styles.taxesPrefix}>Taxes:</Text>
                  {bill.taxes.map((t, idx) => (
                    <View key={t.id || idx} style={styles.taxChip}>
                      <Text style={styles.taxChipName}>{t.taxName}:</Text>
                      <Text style={styles.taxChipRate}>{t.taxRate}%</Text>
                    </View>
                  ))}
                </View>
              )}

              {/* Items Summary Table */}
              {bill.items && bill.items.length > 0 && (
                <View style={styles.itemsTable}>
                  <View style={styles.tableHeader}>
                    <Text style={[styles.tableColHeader, { flex: 3 }]}>Item & HSN</Text>
                    <Text style={[styles.tableColHeader, { flex: 1.2, textAlign: 'center' }]}>Psc</Text>
                    <Text style={[styles.tableColHeader, { flex: 1.5, textAlign: 'right' }]}>Rate</Text>
                    <Text style={[styles.tableColHeader, { flex: 2, textAlign: 'right' }]}>Amount</Text>
                  </View>
                  {bill.items.map((it, idx) => (
                    <View key={it.id || idx} style={styles.tableRow}>
                      <View style={{ flex: 3 }}>
                        <Text style={styles.itemDesc} numberOfLines={1}>
                          {it.description || 'Item'}
                        </Text>
                        {it.hsnCode ? (
                          <Text style={styles.itemHsn}>HSN: {it.hsnCode}</Text>
                        ) : null}
                      </View>
                      <Text style={[styles.itemText, { flex: 1.2, textAlign: 'center' }]}>
                        {it.psc || '-'}
                      </Text>
                      <Text style={[styles.itemText, { flex: 1.5, textAlign: 'right' }]}>
                        ₹{it.rate || '-'}
                      </Text>
                      <Text style={[styles.itemAmountText, { flex: 2, textAlign: 'right' }]}>
                        ₹{parseFloat(it.amount || 0).toLocaleString('en-IN')}
                      </Text>
                    </View>
                  ))}
                </View>
              )}

              {/* Bank Details in Card */}
              {bill.billBookBankName ? (
                <View style={styles.cardBankRow}>
                  <Ionicons name="card-outline" size={13} color="#64748B" />
                  <Text style={styles.cardBankText} numberOfLines={1}>
                    Bank: {bill.billBookBankName}
                    {bill.billBookAccountNo ? ` • A/C: ${bill.billBookAccountNo}` : ''}
                    {bill.billBookIfsc ? ` • IFSC: ${bill.billBookIfsc}` : ''}
                  </Text>
                </View>
              ) : null}

              {/* Card Footer: Total Amount */}
              <View style={styles.cardFooter}>
                <View>
                  <Text style={styles.totalItemsLabel}>
                    {bill.items ? bill.items.length : 0} items
                    {bill.totalPsc ? ` • ${bill.totalPsc} psc` : ''}
                  </Text>
                </View>
                <View style={styles.totalAmountWrap}>
                  <Text style={styles.totalAmountLabel}>Grand Total:</Text>
                  <Text style={styles.totalAmountValue}>
                    ₹{parseFloat(bill.totalAmount || 0).toLocaleString('en-IN')}
                  </Text>
                </View>
              </View>
            </View>
          ))}
        </ScrollView>
      )}

      {/* Add / Edit Bill Modal Form */}
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
                  {editingId ? 'Edit Bill' : 'Add Bill'}
                </Text>
                <Text style={styles.modalSubtitle}>
                  {editingId
                    ? 'Update invoice details & bill book items'
                    : 'Select Bill Book and create invoice'}
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

            {/* Form Scroll Area */}
            <ScrollView
              style={styles.formScrollView}
              contentContainerStyle={styles.formContent}
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
            >
              {/* STEP 1: SELECT BILL BOOK */}
              <View style={styles.billBookSelectorSection}>
                <Text style={styles.inputLabel}>
                  1. Select Bill Book <Text style={styles.requiredStar}>*</Text>
                </Text>

                <TouchableOpacity
                  style={styles.billBookPickerTrigger}
                  onPress={() => setIsBookPickerVisible(true)}
                  activeOpacity={0.7}
                >
                  <View style={styles.triggerLeft}>
                    <View style={styles.triggerIconBox}>
                      <Ionicons name="business" size={18} color="#4F46E5" />
                    </View>
                    <View>
                      <Text style={styles.triggerTitle}>
                        {formData.billBookName || 'Select Registered Bill Book...'}
                      </Text>
                      {formData.billBookGstin ? (
                        <Text style={styles.triggerSubtitle}>
                          GSTIN: {formData.billBookGstin}
                        </Text>
                      ) : (
                        <Text style={styles.triggerSubtitlePlaceholder}>
                          Tap to choose company / firm
                        </Text>
                      )}
                    </View>
                  </View>
                  <Ionicons name="chevron-down" size={18} color="#64748B" />
                </TouchableOpacity>

                {/* Selected Bill Book Details Card Preview */}
                {selectedBillBook && (
                  <View style={styles.selectedBookPreviewCard}>
                    <View style={styles.previewHeaderRow}>
                      <Text style={styles.previewHeading}>Active Bill Book Details</Text>
                      {formData.billBookDiscount ? (
                        <View style={styles.previewDiscountBadge}>
                          <Text style={styles.previewDiscountText}>
                            {formData.billBookDiscount}% Discount
                          </Text>
                        </View>
                      ) : null}
                    </View>

                    {formData.billBookAddress ? (
                      <Text style={styles.previewAddressText} numberOfLines={1}>
                        📍 {formData.billBookAddress}
                      </Text>
                    ) : null}

                    {taxes.length > 0 && (
                      <View style={styles.previewTaxesRow}>
                        <Text style={styles.previewTaxesLabel}>Taxes:</Text>
                        {taxes.map((t, idx) => (
                          <View key={t.id || idx} style={styles.previewTaxChip}>
                            <Text style={styles.previewTaxChipText}>
                              {t.taxName}: {t.taxRate}%
                            </Text>
                          </View>
                        ))}
                      </View>
                    )}

                    {formData.billBookBankName ? (
                      <Text style={styles.previewBankText} numberOfLines={1}>
                        🏦 {formData.billBookBankName} (A/C: {formData.billBookAccountNo || '-'}) • IFSC: {formData.billBookIfsc || '-'}
                      </Text>
                    ) : null}
                  </View>
                )}
              </View>

              {/* STEP 2: INVOICE & PARTY DETAILS */}
              <View style={styles.formSectionDivider}>
                <Text style={styles.formSectionTitle}>2. Party & Bill Details</Text>
              </View>

              {/* Field: Party Name */}
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>
                  Party Name <Text style={styles.requiredStar}>*</Text>
                </Text>
                <TextInput
                  style={styles.input}
                  placeholder="e.g. Aura Weaves & Fabrics"
                  placeholderTextColor="#94A3B8"
                  value={formData.partyName}
                  onChangeText={(val) => handleInputChange('partyName', val)}
                />
              </View>

              {/* Row: Bill No & Date Picker Trigger */}
              <View style={styles.inputRow}>
                <View style={[styles.inputGroup, { flex: 1 }]}>
                  <Text style={styles.inputLabel}>
                    Bill No. <Text style={styles.requiredStar}>*</Text>
                  </Text>
                  <TextInput
                    style={styles.input}
                    placeholder="e.g. INV-1001"
                    placeholderTextColor="#94A3B8"
                    value={formData.billNo}
                    onChangeText={(val) => handleInputChange('billNo', val)}
                  />
                </View>

                {/* Date Picker Button */}
                <View style={[styles.inputGroup, { flex: 1 }]}>
                  <Text style={styles.inputLabel}>
                    Date <Text style={styles.requiredStar}>*</Text>
                  </Text>
                  <TouchableOpacity
                    style={styles.datePickerTrigger}
                    onPress={handleOpenDatePicker}
                    activeOpacity={0.7}
                  >
                    <View style={styles.datePickerLeft}>
                      <View style={styles.dateIconPill}>
                        <Ionicons name="calendar" size={15} color="#4F46E5" />
                      </View>
                      <Text style={styles.datePickerValueText}>
                        {formData.date || getTodayFormatted()}
                      </Text>
                    </View>
                    <Ionicons name="chevron-down" size={15} color="#64748B" />
                  </TouchableOpacity>
                </View>
              </View>

              {/* Row: P.Ch.No & Party GSTIN */}
              <View style={styles.inputRow}>
                <View style={[styles.inputGroup, { flex: 1 }]}>
                  <Text style={styles.inputLabel}>P.Ch.No. (Challan)</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="e.g. PCH-882"
                    placeholderTextColor="#94A3B8"
                    value={formData.pChNo}
                    onChangeText={(val) => handleInputChange('pChNo', val)}
                  />
                </View>

                <View style={[styles.inputGroup, { flex: 1 }]}>
                  <Text style={styles.inputLabel}>Party GSTIN</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="e.g. 24AAAAA0000A1Z5"
                    placeholderTextColor="#94A3B8"
                    autoCapitalize="characters"
                    value={formData.partyGstin}
                    onChangeText={(val) => handleInputChange('partyGstin', val)}
                  />
                </View>
              </View>

              {/* STEP 3: MULTIPLE ITEM DETAILS */}
              <View style={styles.formSectionDivider}>
                <View style={styles.sectionHeaderRow}>
                  <Text style={styles.formSectionTitle}>3. Line Items</Text>
                  <TouchableOpacity
                    style={styles.addItemSmallBtn}
                    onPress={handleAddItem}
                    activeOpacity={0.7}
                  >
                    <Ionicons name="add-circle" size={16} color="#4F46E5" />
                    <Text style={styles.addItemSmallBtnText}>Add Item</Text>
                  </TouchableOpacity>
                </View>
              </View>

              {/* Dynamic Multiple Item Rows */}
              <View style={styles.itemsListContainer}>
                {items.map((item, index) => (
                  <View key={item.id} style={styles.itemCard}>
                    <View style={styles.itemCardTop}>
                      <Text style={styles.itemIndexLabel}>Item #{index + 1}</Text>
                      {items.length > 1 && (
                        <TouchableOpacity
                          style={styles.itemRemoveBtn}
                          onPress={() => handleRemoveItem(item.id)}
                          activeOpacity={0.6}
                        >
                          <Ionicons name="trash-outline" size={16} color="#EF4444" />
                          <Text style={styles.itemRemoveText}>Remove</Text>
                        </TouchableOpacity>
                      )}
                    </View>

                    {/* Description */}
                    <View style={styles.itemFieldGroup}>
                      <Text style={styles.itemFieldLabel}>Description</Text>
                      <TextInput
                        style={styles.itemInput}
                        placeholder="e.g. Cotton Cambric 60s / Silk Satin"
                        placeholderTextColor="#94A3B8"
                        value={item.description}
                        onChangeText={(val) => handleItemChange(item.id, 'description', val)}
                      />
                    </View>

                    {/* Row: HSN, Psc, Rate, Amount */}
                    <View style={styles.itemGridRow}>
                      <View style={styles.gridColHSN}>
                        <Text style={styles.itemFieldLabel}>HSN</Text>
                        <TextInput
                          style={styles.itemInput}
                          placeholder="5208"
                          placeholderTextColor="#94A3B8"
                          keyboardType="number-pad"
                          value={item.hsnCode}
                          onChangeText={(val) => handleItemChange(item.id, 'hsnCode', val)}
                        />
                      </View>

                      <View style={styles.gridColPsc}>
                        <Text style={styles.itemFieldLabel}>Psc</Text>
                        <TextInput
                          style={styles.itemInput}
                          placeholder="10"
                          placeholderTextColor="#94A3B8"
                          keyboardType="decimal-pad"
                          value={item.psc}
                          onChangeText={(val) => handleItemChange(item.id, 'psc', val)}
                        />
                      </View>

                      <View style={styles.gridColRate}>
                        <Text style={styles.itemFieldLabel}>Rate (₹)</Text>
                        <TextInput
                          style={styles.itemInput}
                          placeholder="250"
                          placeholderTextColor="#94A3B8"
                          keyboardType="decimal-pad"
                          value={item.rate}
                          onChangeText={(val) => handleItemChange(item.id, 'rate', val)}
                        />
                      </View>

                      <View style={styles.gridColAmount}>
                        <Text style={styles.itemFieldLabel}>Amount (₹)</Text>
                        <TextInput
                          style={[styles.itemInput, styles.itemAmountInput]}
                          placeholder="2500"
                          placeholderTextColor="#94A3B8"
                          keyboardType="decimal-pad"
                          value={item.amount}
                          onChangeText={(val) => handleItemChange(item.id, 'amount', val)}
                        />
                      </View>
                    </View>
                  </View>
                ))}

                <TouchableOpacity
                  style={styles.addMoreItemBtn}
                  onPress={handleAddItem}
                  activeOpacity={0.7}
                >
                  <Ionicons name="add" size={18} color="#4F46E5" />
                  <Text style={styles.addMoreItemBtnText}>Add Another Item</Text>
                </TouchableOpacity>
              </View>

              {/* Comprehensive Invoice Summary Breakdown */}
              <View style={styles.formBreakdownCard}>
                {/* 1. Gross Total */}
                <View style={styles.breakdownRow}>
                  <Text style={styles.breakdownLabel}>Gross Total</Text>
                  <Text style={styles.breakdownValue}>
                    ₹{calculateGrossTotal().toLocaleString('en-IN')}
                  </Text>
                </View>

                {/* 2. Discount (if present) */}
                {parseFloat(formData.billBookDiscount) > 0 ? (
                  <View style={styles.breakdownRow}>
                    <Text style={[styles.breakdownLabel, { color: '#059669' }]}>
                      Discount ({formData.billBookDiscount}%)
                    </Text>
                    <Text style={[styles.breakdownValue, { color: '#059669' }]}>
                      -₹{calculateDiscountAmount(calculateGrossTotal()).toLocaleString('en-IN')}
                    </Text>
                  </View>
                ) : null}

                {/* 3. Total (Gross Total - Discount) */}
                <View style={[styles.breakdownRow, styles.breakdownSubtotalRow]}>
                  <Text style={styles.breakdownSubtotalLabel}>Total</Text>
                  <Text style={styles.breakdownSubtotalValue}>
                    ₹{calculateTaxableTotal().toLocaleString('en-IN')}
                  </Text>
                </View>

                {/* 4. Taxes generated up to Total */}
                {taxes.map((t, idx) => {
                  const taxable = calculateTaxableTotal();
                  const rate = parseFloat(t.taxRate) || 0;
                  const taxAmt = Math.round(((taxable * rate) / 100) * 100) / 100;
                  return (
                    <View key={t.id || idx} style={styles.breakdownRow}>
                      <Text style={styles.breakdownLabel}>
                        {t.taxName || 'Tax'} ({t.taxRate || 0}%)
                      </Text>
                      <Text style={styles.breakdownValue}>
                        +₹{taxAmt.toLocaleString('en-IN')}
                      </Text>
                    </View>
                  );
                })}

                <View style={styles.breakdownDivider} />

                {/* 5. Grand Total */}
                <View style={styles.breakdownTotalRow}>
                  <Text style={styles.breakdownTotalLabel}>Grand Total</Text>
                  <Text style={styles.breakdownTotalValue}>
                    ₹{calculateGrandTotal().toLocaleString('en-IN')}
                  </Text>
                </View>
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
                onPress={handleSaveBill}
                activeOpacity={0.8}
              >
                <Ionicons
                  name={editingId ? 'save-outline' : 'checkmark-circle-outline'}
                  size={18}
                  color="#FFFFFF"
                />
                <Text style={styles.saveBtnText}>
                  {editingId ? 'Update Bill' : 'Save Bill'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* Bill Book Selection Modal */}
      <Modal
        visible={isBookPickerVisible}
        animationType="fade"
        transparent={true}
        onRequestClose={() => setIsBookPickerVisible(false)}
      >
        <View style={styles.pickerModalOverlay}>
          <View style={styles.pickerModalContent}>
            <View style={styles.pickerHeader}>
              <Text style={styles.pickerTitle}>Select Bill Book</Text>
              <TouchableOpacity onPress={() => setIsBookPickerVisible(false)}>
                <Ionicons name="close" size={20} color="#64748B" />
              </TouchableOpacity>
            </View>

            {billBooks.length === 0 ? (
              <View style={styles.pickerEmptyWrap}>
                <Ionicons name="book-outline" size={40} color="#94A3B8" />
                <Text style={styles.pickerEmptyTitle}>No Bill Books Found</Text>
                <Text style={styles.pickerEmptySub}>
                  Please register a bill book in the Bill Book tab first.
                </Text>
                <TouchableOpacity
                  style={styles.goToBillBookBtn}
                  onPress={() => {
                    setIsBookPickerVisible(false);
                    setIsModalVisible(false);
                    navigation?.navigate('BillBook');
                  }}
                >
                  <Text style={styles.goToBillBookBtnText}>Go to Bill Book Tab</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <ScrollView style={styles.pickerScroll}>
                {billBooks.map((book) => {
                  const isSelected = selectedBillBook && selectedBillBook.id === book.id;
                  return (
                    <TouchableOpacity
                      key={book.id}
                      style={[styles.pickerItem, isSelected && styles.pickerItemSelected]}
                      onPress={() => handleSelectBillBook(book)}
                      activeOpacity={0.7}
                    >
                      <View style={styles.pickerItemIconWrap}>
                        <Ionicons
                          name="business"
                          size={18}
                          color={isSelected ? '#FFFFFF' : '#4F46E5'}
                        />
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text
                          style={[
                            styles.pickerItemName,
                            isSelected && styles.pickerItemTextSelected,
                          ]}
                        >
                          {book.billBookName}
                        </Text>
                        <Text style={styles.pickerItemDetails}>
                          GST: {book.gstin || 'N/A'} • {book.address || 'No Address'}
                        </Text>
                        {book.taxes && book.taxes.length > 0 && (
                          <Text style={styles.pickerItemTaxes}>
                            Taxes: {book.taxes.map((t) => `${t.taxName} ${t.taxRate}%`).join(', ')}
                          </Text>
                        )}
                      </View>
                      {isSelected && (
                        <Ionicons name="checkmark-circle" size={20} color="#4F46E5" />
                      )}
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>
            )}
          </View>
        </View>
      </Modal>

      {/* Date Picker Popup Dialog Modal */}
      <Modal
        visible={isCalendarVisible}
        animationType="fade"
        transparent={true}
        onRequestClose={handleCancelDate}
      >
        <View style={styles.popupModalOverlay}>
          <View style={styles.datePickerPopupCard}>
            {/* Header */}
            <View style={styles.calendarHeader}>
              <View style={styles.calendarHeaderLeft}>
                <View style={styles.calendarIconCircle}>
                  <Ionicons name="calendar" size={18} color="#4F46E5" />
                </View>
                <View>
                  <Text style={styles.calendarTitle}>Select Invoice Date</Text>
                  <Text style={styles.calendarSelectedText}>
                    {formatDateToReadable(pickerSelectedDate)}
                  </Text>
                </View>
              </View>
              <TouchableOpacity
                style={styles.calendarCloseBtn}
                onPress={handleCancelDate}
                activeOpacity={0.7}
              >
                <Ionicons name="close" size={20} color="#64748B" />
              </TouchableOpacity>
            </View>

            {/* Navigation: Month & Year Controls */}
            <View style={styles.calendarNavRow}>
              <View style={styles.navControlsGroup}>
                <TouchableOpacity
                  style={styles.navArrowBtn}
                  onPress={handlePrevYear}
                  activeOpacity={0.7}
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                >
                  <Ionicons name="play-back" size={11} color="#475569" />
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.navArrowBtn}
                  onPress={handlePrevMonth}
                  activeOpacity={0.7}
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                >
                  <Ionicons name="chevron-back" size={15} color="#475569" />
                </TouchableOpacity>
              </View>

              <Text style={styles.calendarMonthYearText}>
                {MONTH_NAMES[pickerViewMonth]} {pickerViewYear}
              </Text>

              <View style={styles.navControlsGroup}>
                <TouchableOpacity
                  style={styles.navArrowBtn}
                  onPress={handleNextMonth}
                  activeOpacity={0.7}
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                >
                  <Ionicons name="chevron-forward" size={15} color="#475569" />
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.navArrowBtn}
                  onPress={handleNextYear}
                  activeOpacity={0.7}
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                >
                  <Ionicons name="play-forward" size={11} color="#475569" />
                </TouchableOpacity>
              </View>
            </View>

            {/* Weekdays Row */}
            <View style={styles.calendarWeekRow}>
              {WEEKDAYS.map((wd, index) => (
                <View key={index} style={styles.calendarDayCol}>
                  <Text
                    style={[
                      styles.calendarWeekdayText,
                      index === 0 && styles.sundayText,
                    ]}
                  >
                    {wd}
                  </Text>
                </View>
              ))}
            </View>

            {/* 7-column Calendar Weeks */}
            {getCalendarWeeks(pickerViewYear, pickerViewMonth).map((week, wIdx) => (
              <View key={`week-${wIdx}`} style={styles.calendarWeekRow}>
                {week.map((cell, dIdx) => {
                  const isSelected =
                    cell.isCurrentMonth &&
                    pickerSelectedDate &&
                    pickerSelectedDate.getDate() === cell.day &&
                    pickerSelectedDate.getMonth() === cell.month &&
                    pickerSelectedDate.getFullYear() === cell.year;

                  const now = new Date();
                  const isToday =
                    cell.isCurrentMonth &&
                    now.getDate() === cell.day &&
                    now.getMonth() === cell.month &&
                    now.getFullYear() === cell.year;

                  return (
                    <View key={`day-${wIdx}-${dIdx}`} style={styles.calendarDayCol}>
                      <TouchableOpacity
                        style={[
                          styles.calendarDayBtn,
                          isSelected && styles.calendarDayBtnSelected,
                          isToday && !isSelected && styles.calendarDayBtnToday,
                        ]}
                        onPress={() => handleSelectDay(cell.day, cell.month, cell.year)}
                        activeOpacity={0.7}
                      >
                        <Text
                          style={[
                            styles.calendarDayText,
                            !cell.isCurrentMonth && styles.calendarDayTextMuted,
                            isSelected && styles.calendarDayTextSelected,
                            isToday && !isSelected && styles.calendarDayTextToday,
                          ]}
                        >
                          {cell.day}
                        </Text>
                      </TouchableOpacity>
                    </View>
                  );
                })}
              </View>
            ))}

            {/* Footer with Today, Cancel & Set Date */}
            <View style={styles.calendarPopupFooter}>
              <TouchableOpacity
                style={styles.todayQuickBtn}
                onPress={handleSelectToday}
                activeOpacity={0.7}
              >
                <Ionicons name="flash" size={13} color="#4F46E5" />
                <Text style={styles.todayQuickText}>Today</Text>
              </TouchableOpacity>

              <View style={styles.calendarPopupActions}>
                <TouchableOpacity
                  style={styles.calendarCancelBtn}
                  onPress={handleCancelDate}
                  activeOpacity={0.7}
                >
                  <Text style={styles.calendarCancelText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.calendarConfirmBtn}
                  onPress={handleConfirmDate}
                  activeOpacity={0.7}
                >
                  <Ionicons name="checkmark" size={15} color="#FFFFFF" />
                  <Text style={styles.calendarConfirmText}>Set Date</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </View>
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
  summaryContainer: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    marginBottom: 14,
    gap: 12,
  },
  summaryBox: {
    flex: 1.8,
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: '#000',
    shadowOpacity: 0.03,
    shadowRadius: 6,
    elevation: 1,
  },
  summaryBoxHighlight: {
    flex: 1,
    backgroundColor: '#EEF2FF',
    borderColor: '#C7D2FE',
  },
  summaryLabel: {
    fontSize: 11,
    color: '#64748B',
    fontWeight: '600',
    marginBottom: 4,
  },
  summaryAmount: {
    fontSize: 19,
    fontWeight: '700',
    color: '#0F172A',
  },
  listScrollView: {
    flex: 1,
  },
  listContentContainer: {
    paddingHorizontal: 20,
    paddingBottom: 28,
  },
  billCard: {
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
  cardBillBookBanner: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#EEF2FF',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 5,
    marginBottom: 10,
  },
  bannerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flex: 1,
  },
  bannerBillBookName: {
    fontSize: 12,
    fontWeight: '700',
    color: '#4F46E5',
  },
  bannerDiscountBadge: {
    backgroundColor: '#ECFDF5',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  bannerDiscountText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#059669',
  },
  cardHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  billIconWrap: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  cardHeaderInfo: {
    flex: 1,
  },
  billPartyName: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0F172A',
    marginBottom: 2,
  },
  billMeta: {
    fontSize: 12,
    color: '#64748B',
  },
  boldText: {
    fontWeight: '700',
    color: '#1E293B',
  },
  cardActionsGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  editBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#EEF2FF',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 14,
    gap: 4,
  },
  editBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#4F46E5',
  },
  deleteBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#FEF2F2',
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgesRow: {
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
    paddingVertical: 4,
    borderRadius: 8,
    gap: 4,
  },
  pChBadge: {
    backgroundColor: '#FEF3C7',
  },
  pChBadgeLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: '#B45309',
  },
  pChBadgeValue: {
    fontSize: 11,
    fontWeight: '700',
    color: '#92400E',
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
  taxesRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 6,
    marginBottom: 10,
  },
  taxesPrefix: {
    fontSize: 11,
    fontWeight: '700',
    color: '#64748B',
  },
  taxChip: {
    flexDirection: 'row',
    backgroundColor: '#FFFBEB',
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#FDE68A',
    gap: 3,
  },
  taxChipName: {
    fontSize: 10,
    fontWeight: '600',
    color: '#92400E',
  },
  taxChipRate: {
    fontSize: 10,
    fontWeight: '700',
    color: '#B45309',
  },
  itemsTable: {
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: '#F1F5F9',
    marginBottom: 10,
  },
  tableHeader: {
    flexDirection: 'row',
    paddingBottom: 6,
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
    marginBottom: 6,
  },
  tableColHeader: {
    fontSize: 11,
    fontWeight: '700',
    color: '#64748B',
    textTransform: 'uppercase',
  },
  tableRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 6,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  itemDesc: {
    fontSize: 12,
    fontWeight: '600',
    color: '#1E293B',
  },
  itemHsn: {
    fontSize: 10,
    color: '#94A3B8',
    marginTop: 1,
  },
  itemText: {
    fontSize: 12,
    color: '#475569',
  },
  itemAmountText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#0F172A',
  },
  cardBankRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: '#F8FAFC',
    padding: 8,
    borderRadius: 8,
    marginBottom: 8,
  },
  cardBankText: {
    fontSize: 11,
    color: '#475569',
    flex: 1,
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
  },
  totalItemsLabel: {
    fontSize: 12,
    color: '#64748B',
  },
  totalAmountWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  totalAmountLabel: {
    fontSize: 12,
    color: '#64748B',
    fontWeight: '600',
  },
  totalAmountValue: {
    fontSize: 18,
    fontWeight: '800',
    color: '#4F46E5',
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
  billBookSelectorSection: {
    marginBottom: 16,
  },
  billBookPickerTrigger: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#F8FAFC',
    borderWidth: 1.5,
    borderColor: '#C7D2FE',
    borderRadius: 14,
    padding: 12,
  },
  triggerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
  },
  triggerIconBox: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: '#EEF2FF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  triggerTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0F172A',
  },
  triggerSubtitle: {
    fontSize: 11,
    color: '#4F46E5',
    fontWeight: '600',
    marginTop: 1,
  },
  triggerSubtitlePlaceholder: {
    fontSize: 12,
    color: '#94A3B8',
  },
  selectedBookPreviewCard: {
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginTop: 10,
  },
  previewHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  previewHeading: {
    fontSize: 11,
    fontWeight: '700',
    color: '#475569',
    textTransform: 'uppercase',
  },
  previewDiscountBadge: {
    backgroundColor: '#ECFDF5',
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 6,
  },
  previewDiscountText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#059669',
  },
  previewAddressText: {
    fontSize: 12,
    color: '#64748B',
    marginBottom: 6,
  },
  previewTaxesRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 6,
    marginBottom: 6,
  },
  previewTaxesLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: '#64748B',
  },
  previewTaxChip: {
    backgroundColor: '#FFFBEB',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#FDE68A',
  },
  previewTaxChipText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#B45309',
  },
  previewBankText: {
    fontSize: 11,
    color: '#475569',
  },
  formSectionDivider: {
    marginTop: 10,
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
  inputGroup: {
    marginBottom: 14,
  },
  inputRow: {
    flexDirection: 'row',
    gap: 12,
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
  datePickerTrigger: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  datePickerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  dateIconPill: {
    width: 26,
    height: 26,
    borderRadius: 7,
    backgroundColor: '#EEF2FF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  datePickerValueText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#0F172A',
  },
  popupModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.65)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  datePickerPopupCard: {
    width: '100%',
    maxWidth: 350,
    backgroundColor: '#FFFFFF',
    borderRadius: 22,
    padding: 16,
    shadowColor: '#0F172A',
    shadowOpacity: 0.25,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: 10 },
    elevation: 20,
  },
  calendarHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  calendarHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flex: 1,
  },
  calendarHeaderRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  calendarIconCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#EEF2FF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  calendarTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0F172A',
  },
  calendarSelectedText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#4F46E5',
    marginTop: 1,
  },
  todayQuickPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#EEF2FF',
    paddingHorizontal: 9,
    paddingVertical: 5,
    borderRadius: 12,
  },
  todayQuickPillText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#4F46E5',
  },
  calendarCloseBtn: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  calendarNavRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderRadius: 10,
    paddingVertical: 6,
    paddingHorizontal: 8,
    marginVertical: 10,
  },
  navControlsGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  navArrowBtn: {
    width: 26,
    height: 26,
    borderRadius: 7,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  calendarMonthYearText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#1E293B',
  },
  calendarWeekRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginVertical: 2,
  },
  calendarDayCol: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  calendarWeekdayText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#64748B',
    textAlign: 'center',
    paddingBottom: 4,
  },
  sundayText: {
    color: '#EF4444',
  },
  calendarDayBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
  },
  calendarDayBtnSelected: {
    backgroundColor: '#4F46E5',
    shadowColor: '#4F46E5',
    shadowOpacity: 0.35,
    shadowRadius: 4,
    elevation: 2,
  },
  calendarDayBtnToday: {
    borderWidth: 1.5,
    borderColor: '#6366F1',
    backgroundColor: '#EEF2FF',
  },
  calendarDayText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#0F172A',
  },
  calendarDayTextSelected: {
    color: '#FFFFFF',
    fontWeight: '800',
  },
  calendarDayTextToday: {
    color: '#4F46E5',
    fontWeight: '700',
  },
  calendarDayTextMuted: {
    color: '#CBD5E1',
    fontWeight: '400',
  },
  calendarPopupFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 12,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
  },
  todayQuickBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#EEF2FF',
    paddingHorizontal: 11,
    paddingVertical: 7,
    borderRadius: 14,
  },
  todayQuickText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#4F46E5',
  },
  calendarPopupActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  calendarCancelBtn: {
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: 8,
  },
  calendarCancelText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#64748B',
  },
  calendarConfirmBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#4F46E5',
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 10,
    shadowColor: '#4F46E5',
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 2,
  },
  calendarConfirmText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  addItemSmallBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 2,
    paddingHorizontal: 6,
  },
  addItemSmallBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#4F46E5',
  },
  itemsListContainer: {
    marginBottom: 14,
  },
  itemCard: {
    backgroundColor: '#F8FAFC',
    borderRadius: 14,
    padding: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginBottom: 12,
  },
  itemCardTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  itemIndexLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: '#4F46E5',
  },
  itemRemoveBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
  },
  itemRemoveText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#EF4444',
  },
  itemFieldGroup: {
    marginBottom: 8,
  },
  itemFieldLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: '#64748B',
    marginBottom: 4,
  },
  itemInput: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#CBD5E1',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 13,
    color: '#0F172A',
  },
  itemAmountInput: {
    backgroundColor: '#F1F5F9',
    fontWeight: '700',
    color: '#0F172A',
  },
  itemGridRow: {
    flexDirection: 'row',
    gap: 8,
  },
  gridColHSN: {
    flex: 2,
  },
  gridColPsc: {
    flex: 1.5,
  },
  gridColRate: {
    flex: 1.8,
  },
  gridColAmount: {
    flex: 2.2,
  },
  addMoreItemBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#C7D2FE',
    borderStyle: 'dashed',
    borderRadius: 12,
    paddingVertical: 10,
    gap: 6,
  },
  addMoreItemBtnText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#4F46E5',
  },
  formBreakdownCard: {
    backgroundColor: '#EEF2FF',
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: '#C7D2FE',
    marginBottom: 10,
  },
  breakdownRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  breakdownSubtotalRow: {
    paddingTop: 5,
    paddingBottom: 4,
    borderTopWidth: 1,
    borderTopColor: '#C7D2FE',
    marginTop: 2,
    marginBottom: 6,
  },
  breakdownSubtotalLabel: {
    fontSize: 13,
    color: '#1E293B',
    fontWeight: '700',
  },
  breakdownSubtotalValue: {
    fontSize: 14,
    color: '#1E293B',
    fontWeight: '800',
  },
  breakdownLabel: {
    fontSize: 13,
    color: '#475569',
    fontWeight: '500',
  },
  breakdownValue: {
    fontSize: 13,
    color: '#1E293B',
    fontWeight: '700',
  },
  breakdownDivider: {
    height: 1,
    backgroundColor: '#C7D2FE',
    marginVertical: 8,
  },
  breakdownTotalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  breakdownTotalLabel: {
    fontSize: 15,
    fontWeight: '800',
    color: '#312E81',
  },
  breakdownTotalValue: {
    fontSize: 20,
    fontWeight: '800',
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
  pickerModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.6)',
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  pickerModalContent: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 20,
    maxHeight: '75%',
  },
  pickerHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  pickerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#0F172A',
  },
  pickerEmptyWrap: {
    alignItems: 'center',
    paddingVertical: 20,
  },
  pickerEmptyTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1E293B',
    marginTop: 10,
  },
  pickerEmptySub: {
    fontSize: 13,
    color: '#64748B',
    textAlign: 'center',
    marginTop: 4,
    marginBottom: 16,
  },
  goToBillBookBtn: {
    backgroundColor: '#4F46E5',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 12,
  },
  goToBillBookBtnText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
  },
  pickerScroll: {
    maxHeight: 340,
  },
  pickerItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginBottom: 10,
    gap: 12,
  },
  pickerItemSelected: {
    borderColor: '#4F46E5',
    backgroundColor: '#EEF2FF',
  },
  pickerItemIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: '#EEF2FF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  pickerItemName: {
    fontSize: 15,
    fontWeight: '700',
    color: '#0F172A',
    marginBottom: 2,
  },
  pickerItemTextSelected: {
    color: '#4F46E5',
  },
  pickerItemDetails: {
    fontSize: 11,
    color: '#64748B',
  },
  pickerItemTaxes: {
    fontSize: 10,
    fontWeight: '600',
    color: '#D97706',
    marginTop: 2,
  },
});