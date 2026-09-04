import React, { useState } from 'react';
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  TouchableOpacity,
  StatusBar,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Ionicons from '@expo/vector-icons/Ionicons';

const SAMPLE_BILLS = [
  {
    id: 'INV-2026-001',
    partyName: 'Aura Weaves & Fabrics',
    date: '02 Sep 2026',
    dueDate: '16 Sep 2026',
    itemsCount: 4,
    meters: '1,200m',
    amount: '₹84,500',
    status: 'Pending',
  },
  {
    id: 'INV-2026-002',
    partyName: 'Premier Textiles Pvt Ltd',
    date: '28 Aug 2026',
    dueDate: '12 Sep 2026',
    itemsCount: 2,
    meters: '650m',
    amount: '₹42,300',
    status: 'Paid',
  },
  {
    id: 'INV-2026-003',
    partyName: 'Kaveri Cottons Hub',
    date: '24 Aug 2026',
    dueDate: '07 Sep 2026',
    itemsCount: 6,
    meters: '2,400m',
    amount: '₹1,56,800',
    status: 'Paid',
  },
  {
    id: 'INV-2026-004',
    partyName: 'Sri Balaji Yarn & Prints',
    date: '18 Aug 2026',
    dueDate: '01 Sep 2026',
    itemsCount: 3,
    meters: '900m',
    amount: '₹59,200',
    status: 'Overdue',
  },
];

export default function BillScreen() {
  const [activeFilter, setActiveFilter] = useState('All');

  const filteredBills = SAMPLE_BILLS.filter((bill) => {
    if (activeFilter === 'All') return true;
    return bill.status.toLowerCase() === activeFilter.toLowerCase();
  });

  const getStatusColor = (status) => {
    switch (status) {
      case 'Paid':
        return { bg: '#DCFCE7', text: '#15803D' };
      case 'Pending':
        return { bg: '#FEF3C7', text: '#B45309' };
      case 'Overdue':
        return { bg: '#FEE2E2', text: '#B91C1C' };
      default:
        return { bg: '#F1F5F9', text: '#475569' };
    }
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <StatusBar barStyle="dark-content" backgroundColor="#F8FAFC" />
      <View style={styles.header}>
        <View>
          <Text style={styles.pageTitle}>Bills & Invoices</Text>
          <Text style={styles.pageSubtitle}>Manage and track your textile orders</Text>
        </View>
        <TouchableOpacity style={styles.filterIconButton} activeOpacity={0.7}>
          <Ionicons name="filter-outline" size={20} color="#1E293B" />
        </TouchableOpacity>
      </View>

      {/* Summary Row */}
      <View style={styles.summaryContainer}>
        <View style={styles.summaryBox}>
          <Text style={styles.summaryLabel}>Total Billed</Text>
          <Text style={styles.summaryAmount}>₹3,42,800</Text>
        </View>
        <View style={[styles.summaryBox, styles.summaryBoxHighlight]}>
          <Text style={[styles.summaryLabel, { color: '#B45309' }]}>Pending Due</Text>
          <Text style={[styles.summaryAmount, { color: '#B45309' }]}>₹1,43,700</Text>
        </View>
      </View>

      {/* Filter Tabs */}
      <View style={styles.filterRow}>
        {['All', 'Pending', 'Paid', 'Overdue'].map((tab) => {
          const isActive = activeFilter === tab;
          return (
            <TouchableOpacity
              key={tab}
              style={[styles.filterChip, isActive && styles.filterChipActive]}
              onPress={() => setActiveFilter(tab)}
              activeOpacity={0.7}
            >
              <Text
                style={[
                  styles.filterChipText,
                  isActive && styles.filterChipTextActive,
                ]}
              >
                {tab}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {/* Bills List */}
      <ScrollView
        style={styles.billsList}
        contentContainerStyle={styles.billsContentContainer}
        showsVerticalScrollIndicator={false}
      >
        {filteredBills.map((bill) => {
          const statusColors = getStatusColor(bill.status);
          return (
            <View key={bill.id} style={styles.billCard}>
              <View style={styles.cardTop}>
                <View style={styles.billIconWrap}>
                  <Ionicons name="document-text" size={22} color="#4F46E5" />
                </View>
                <View style={styles.cardHeaderInfo}>
                  <Text style={styles.billParty}>{bill.partyName}</Text>
                  <Text style={styles.billId}>{bill.id} • {bill.date}</Text>
                </View>
                <View style={[styles.statusBadge, { backgroundColor: statusColors.bg }]}>
                  <Text style={[styles.statusBadgeText, { color: statusColors.text }]}>
                    {bill.status}
                  </Text>
                </View>
              </View>

              <View style={styles.cardDetailsRow}>
                <View style={styles.detailCol}>
                  <Text style={styles.detailLabel}>Quantity</Text>
                  <Text style={styles.detailValue}>{bill.meters} ({bill.itemsCount} rolls)</Text>
                </View>
                <View style={styles.detailColRight}>
                  <Text style={styles.detailLabel}>Total Amount</Text>
                  <Text style={styles.billAmount}>{bill.amount}</Text>
                </View>
              </View>

              <View style={styles.cardFooter}>
                <Text style={styles.dueDateText}>Due: {bill.dueDate}</Text>
                <TouchableOpacity style={styles.viewDetailsBtn} activeOpacity={0.6}>
                  <Text style={styles.viewDetailsText}>View Bill</Text>
                  <Ionicons name="chevron-forward" size={14} color="#4F46E5" />
                </TouchableOpacity>
              </View>
            </View>
          );
        })}
      </ScrollView>
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
  filterIconButton: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  summaryContainer: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    marginBottom: 16,
    gap: 12,
  },
  summaryBox: {
    flex: 1,
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
    backgroundColor: '#FFFBEB',
    borderColor: '#FDE68A',
  },
  summaryLabel: {
    fontSize: 12,
    color: '#64748B',
    fontWeight: '500',
    marginBottom: 4,
  },
  summaryAmount: {
    fontSize: 18,
    fontWeight: '700',
    color: '#0F172A',
  },
  filterRow: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    marginBottom: 12,
    gap: 8,
  },
  filterChip: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 20,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  filterChipActive: {
    backgroundColor: '#1E293B',
    borderColor: '#1E293B',
  },
  filterChipText: {
    fontSize: 13,
    color: '#64748B',
    fontWeight: '600',
  },
  filterChipTextActive: {
    color: '#FFFFFF',
  },
  billsList: {
    flex: 1,
  },
  billsContentContainer: {
    paddingHorizontal: 20,
    paddingBottom: 28,
  },
  billCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: '#000',
    shadowOpacity: 0.03,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  cardTop: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  billIconWrap: {
    width: 40,
    height: 40,
    borderRadius: 10,
    backgroundColor: '#EEF2FF',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  cardHeaderInfo: {
    flex: 1,
  },
  billParty: {
    fontSize: 15,
    fontWeight: '600',
    color: '#0F172A',
  },
  billId: {
    fontSize: 12,
    color: '#94A3B8',
    marginTop: 2,
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusBadgeText: {
    fontSize: 12,
    fontWeight: '600',
  },
  cardDetailsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 10,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: '#F1F5F9',
    marginBottom: 10,
  },
  detailCol: {
    flex: 1,
  },
  detailColRight: {
    alignItems: 'flex-end',
  },
  detailLabel: {
    fontSize: 11,
    color: '#94A3B8',
    marginBottom: 2,
  },
  detailValue: {
    fontSize: 13,
    color: '#334155',
    fontWeight: '500',
  },
  billAmount: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0F172A',
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  dueDateText: {
    fontSize: 12,
    color: '#64748B',
  },
  viewDetailsBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  viewDetailsText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#4F46E5',
  },
});
