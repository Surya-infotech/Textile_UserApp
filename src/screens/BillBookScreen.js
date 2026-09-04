import React, { useState } from 'react';
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  TouchableOpacity,
  TextInput,
  StatusBar,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Ionicons from '@expo/vector-icons/Ionicons';

const SAMPLE_PARTIES = [
  {
    id: 'P-101',
    name: 'Mahalakshmi Silks & Sarees',
    location: 'Surat Market, Ring Road',
    lastBillDate: '03 Sep 2026',
    lastBillNo: 'BB-4421',
    totalBills: 14,
    balance: '₹1,24,500',
    type: 'receive', // You will receive
  },
  {
    id: 'P-102',
    name: 'Vinayaka Handlooms & Fabrics',
    location: 'Erode Textile Nagar',
    lastBillDate: '01 Sep 2026',
    lastBillNo: 'BB-4418',
    totalBills: 8,
    balance: '₹68,200',
    type: 'receive',
  },
  {
    id: 'P-103',
    name: 'Sri Balaji Yarn Traders',
    location: 'Coimbatore Hub',
    lastBillDate: '29 Aug 2026',
    lastBillNo: 'BB-4402',
    totalBills: 19,
    balance: '₹34,000',
    type: 'pay', // You will pay
  },
  {
    id: 'P-104',
    name: 'Chennai Weaves & Prints',
    location: 'T. Nagar, Chennai',
    lastBillDate: '25 Aug 2026',
    lastBillNo: 'BB-4389',
    totalBills: 6,
    balance: '₹0',
    type: 'settled',
  },
  {
    id: 'P-105',
    name: 'Om Sai Krishna Cottons',
    location: 'Ahmedabad GIDC',
    lastBillDate: '22 Aug 2026',
    lastBillNo: 'BB-4375',
    totalBills: 11,
    balance: '₹89,400',
    type: 'receive',
  },
];

export default function BillBookScreen() {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTab, setSelectedTab] = useState('All');

  const filteredParties = SAMPLE_PARTIES.filter((party) => {
    const matchesSearch =
      party.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      party.location.toLowerCase().includes(searchQuery.toLowerCase()) ||
      party.lastBillNo.toLowerCase().includes(searchQuery.toLowerCase());

    if (!matchesSearch) return false;

    if (selectedTab === 'Receivable') return party.type === 'receive';
    if (selectedTab === 'Payable') return party.type === 'pay';
    if (selectedTab === 'Settled') return party.type === 'settled';
    return true;
  });

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <StatusBar barStyle="dark-content" backgroundColor="#F8FAFC" />
      
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.pageTitle}>Bill Book</Text>
          <Text style={styles.pageSubtitle}>Khata ledger & party accounts</Text>
        </View>
        <TouchableOpacity style={styles.addPartyBtn} activeOpacity={0.7}>
          <Ionicons name="person-add-outline" size={18} color="#FFFFFF" />
          <Text style={styles.addPartyBtnText}>New Party</Text>
        </TouchableOpacity>
      </View>

      {/* Ledger Summary Cards */}
      <View style={styles.summaryContainer}>
        <View style={[styles.summaryCard, styles.receiveCard]}>
          <View style={styles.summaryTop}>
            <Text style={styles.summaryTitle}>You'll Receive</Text>
            <Ionicons name="arrow-down-circle" size={18} color="#059669" />
          </View>
          <Text style={[styles.summaryAmount, { color: '#059669' }]}>₹2,82,100</Text>
          <Text style={styles.summarySub}>From 3 parties</Text>
        </View>

        <View style={[styles.summaryCard, styles.payCard]}>
          <View style={styles.summaryTop}>
            <Text style={styles.summaryTitle}>You'll Pay</Text>
            <Ionicons name="arrow-up-circle" size={18} color="#DC2626" />
          </View>
          <Text style={[styles.summaryAmount, { color: '#DC2626' }]}>₹34,000</Text>
          <Text style={styles.summarySub}>To 1 party</Text>
        </View>
      </View>

      {/* Search Input */}
      <View style={styles.searchSection}>
        <View style={styles.searchBar}>
          <Ionicons name="search" size={18} color="#94A3B8" style={styles.searchIcon} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search party name, location or bill..."
            placeholderTextColor="#94A3B8"
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => setSearchQuery('')}>
              <Ionicons name="close-circle" size={18} color="#94A3B8" />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Filter Tabs */}
      <View style={styles.filterRow}>
        {['All', 'Receivable', 'Payable', 'Settled'].map((tab) => {
          const isActive = selectedTab === tab;
          return (
            <TouchableOpacity
              key={tab}
              style={[styles.filterChip, isActive && styles.filterChipActive]}
              onPress={() => setSelectedTab(tab)}
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

      {/* Parties Ledger List */}
      <ScrollView
        style={styles.partyList}
        contentContainerStyle={styles.partyListContent}
        showsVerticalScrollIndicator={false}
      >
        {filteredParties.map((party) => {
          const isReceive = party.type === 'receive';
          const isPay = party.type === 'pay';

          return (
            <TouchableOpacity
              key={party.id}
              style={styles.partyCard}
              activeOpacity={0.7}
            >
              <View style={styles.cardMain}>
                <View style={styles.avatarWrap}>
                  <Text style={styles.avatarText}>
                    {party.name.charAt(0).toUpperCase()}
                  </Text>
                </View>

                <View style={styles.partyDetails}>
                  <Text style={styles.partyName} numberOfLines={1}>
                    {party.name}
                  </Text>
                  <Text style={styles.partyLocation} numberOfLines={1}>
                    {party.location}
                  </Text>
                  <Text style={styles.lastBillMeta}>
                    Last: {party.lastBillNo} • {party.lastBillDate}
                  </Text>
                </View>

                <View style={styles.balanceContainer}>
                  <Text
                    style={[
                      styles.balanceAmount,
                      isReceive && styles.receiveAmount,
                      isPay && styles.payAmount,
                    ]}
                  >
                    {party.balance}
                  </Text>
                  <Text
                    style={[
                      styles.balanceTypeTag,
                      isReceive && styles.receiveTag,
                      isPay && styles.payTag,
                    ]}
                  >
                    {isReceive ? 'RECEIVABLE' : isPay ? 'PAYABLE' : 'SETTLED'}
                  </Text>
                </View>
              </View>

              <View style={styles.cardActionRow}>
                <Text style={styles.billsCountText}>{party.totalBills} bills recorded</Text>
                <View style={styles.viewLedgerBtn}>
                  <Text style={styles.viewLedgerText}>View Book</Text>
                  <Ionicons name="chevron-forward" size={14} color="#4F46E5" />
                </View>
              </View>
            </TouchableOpacity>
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
  addPartyBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#4F46E5',
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 20,
    gap: 6,
    shadowColor: '#4F46E5',
    shadowOpacity: 0.25,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 3 },
    elevation: 3,
  },
  addPartyBtnText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '600',
  },
  summaryContainer: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    marginBottom: 16,
    gap: 12,
  },
  summaryCard: {
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
  receiveCard: {
    backgroundColor: '#F0FDF4',
    borderColor: '#BBF7D0',
  },
  payCard: {
    backgroundColor: '#FEF2F2',
    borderColor: '#FECACA',
  },
  summaryTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  summaryTitle: {
    fontSize: 12,
    fontWeight: '600',
    color: '#475569',
  },
  summaryAmount: {
    fontSize: 19,
    fontWeight: '700',
    marginBottom: 2,
  },
  summarySub: {
    fontSize: 11,
    color: '#64748B',
  },
  searchSection: {
    paddingHorizontal: 20,
    marginBottom: 12,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    paddingHorizontal: 14,
    height: 44,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    color: '#0F172A',
  },
  filterRow: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    marginBottom: 14,
    gap: 8,
  },
  filterChip: {
    paddingHorizontal: 13,
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
    fontSize: 12,
    color: '#64748B',
    fontWeight: '600',
  },
  filterChipTextActive: {
    color: '#FFFFFF',
  },
  partyList: {
    flex: 1,
  },
  partyListContent: {
    paddingHorizontal: 20,
    paddingBottom: 28,
  },
  partyCard: {
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
  cardMain: {
    flexDirection: 'row',
    alignItems: 'center',
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
  partyDetails: {
    flex: 1,
    marginRight: 10,
  },
  partyName: {
    fontSize: 15,
    fontWeight: '600',
    color: '#0F172A',
    marginBottom: 2,
  },
  partyLocation: {
    fontSize: 12,
    color: '#64748B',
    marginBottom: 4,
  },
  lastBillMeta: {
    fontSize: 11,
    color: '#94A3B8',
  },
  balanceContainer: {
    alignItems: 'flex-end',
  },
  balanceAmount: {
    fontSize: 16,
    fontWeight: '700',
    color: '#64748B',
    marginBottom: 4,
  },
  receiveAmount: {
    color: '#059669',
  },
  payAmount: {
    color: '#DC2626',
  },
  balanceTypeTag: {
    fontSize: 10,
    fontWeight: '700',
    color: '#64748B',
    letterSpacing: 0.4,
  },
  receiveTag: {
    color: '#059669',
  },
  payTag: {
    color: '#DC2626',
  },
  cardActionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 12,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
  },
  billsCountText: {
    fontSize: 12,
    color: '#94A3B8',
  },
  viewLedgerBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  viewLedgerText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#4F46E5',
  },
});
