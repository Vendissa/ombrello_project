// app/vendor/earnings.tsx
import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, SafeAreaView, ActivityIndicator, FlatList, RefreshControl } from 'react-native';
import { authedFetch } from '@/app/lib/auth';

const API_BASE = process.env.EXPO_PUBLIC_API_BASE || 'http://192.168.1.62:8000';

type Summary = {
  range: { from: string; to: string; tz: string };
  total_fee: number;
  count: number;
  vendor_share: number;
  admin_share: number;
  daily: { date: string; total_fee: number; count: number }[];
};

type RecentRental = {
  id: string;
  rental_id: string;
  code?: string;
  shop_name?: string | null;
  user_name?: string | null;
  rented_at?: string | null;
  returned_at?: string | null;
  fee: number;
  effective_at: string;
  vendor_share: number;
  admin_share: number;
};

export default function VendorEarningsScreen() {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [summary, setSummary] = useState<Summary | null>(null);
  const [recent, setRecent] = useState<RecentRental[]>([]);

  const fetchAll = async () => {
    const [sumRes, recRes] = await Promise.all([
      authedFetch(`${API_BASE}/vendors/me/earnings/summary`),
      authedFetch(`${API_BASE}/vendors/me/earnings/recent?limit=50`),
    ]);
    if (!sumRes.ok) throw new Error(await sumRes.text());
    if (!recRes.ok) throw new Error(await recRes.text());
    const s = (await sumRes.json()) as Summary;
    const r = (await recRes.json()) as RecentRental[];
    setSummary(s);
    setRecent(r);
  };

  useEffect(() => {
    (async () => {
      try {
        await fetchAll();
      } catch (e: any) {
        console.warn(e?.message || e);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const onRefresh = async () => {
    try {
      setRefreshing(true);
      await fetchAll();
    } finally {
      setRefreshing(false);
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <ActivityIndicator style={{ marginTop: 24 }} />
      </SafeAreaView>
    );
  }

const vendorShare = summary?.vendor_share ?? 0;
const totalCount = summary?.count ?? 0;

  return (
    <SafeAreaView style={styles.container}>
      <Text style={styles.header}>My Earnings</Text>

    <View style={styles.summaryCard}>
      <Text style={styles.summaryTitle}>Your Share (Last 30 days)</Text>
      <Text style={styles.totalFee}>
        {new Intl.NumberFormat(undefined, { style: 'currency', currency: 'LKR', maximumFractionDigits: 0 }).format(vendorShare)}
      </Text>
      <Text style={styles.summarySub}>{totalCount} rental{totalCount === 1 ? '' : 's'}</Text>
    </View>

    <Text style={{ marginTop: 4, color: '#6b7280' }}>
      Admin Share: {new Intl.NumberFormat(undefined, { style: 'currency', currency: 'LKR', maximumFractionDigits: 0 }).format(summary?.admin_share ?? 0)}
    </Text>
      <Text style={styles.section}>Recent Paid Rentals</Text>
      
      <FlatList
        data={recent}
        keyExtractor={(item) => item.id}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        renderItem={({ item }) => {
          const when = new Date(item.effective_at);
          const whenText = isNaN(when.getTime())
            ? '-'
            : when.toLocaleString(undefined, {
                year: 'numeric',
                month: 'short',
                day: '2-digit',
                hour: '2-digit',
                minute: '2-digit',
              });
          return (

            <View style={styles.card}>
              <View style={{ flex: 1 }}>
                <Text style={styles.code}>{item.code || '—'}</Text>
                <Text style={styles.meta}>#{item.rental_id}</Text>
                <Text style={styles.metaLight}>{whenText}</Text>
                <Text style={[styles.metaLight, { marginTop: 4 }]}>
                  Fee: {new Intl.NumberFormat(undefined, { style: 'currency', currency: 'LKR', maximumFractionDigits: 0 }).format(item.fee)}
                </Text>
              </View>
              <Text style={styles.feeText}>
                {new Intl.NumberFormat(undefined, { style: 'currency', currency: 'LKR', maximumFractionDigits: 0 }).format(item.vendor_share)}
              </Text>
            </View>

          );
        }}
        contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 24 }}
        ListEmptyComponent={<Text style={{ padding: 16, color: '#666' }}>No paid rentals yet.</Text>}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f4f8ff' },
  header: { fontSize: 22, fontWeight: 'bold', margin: 16 },
  summaryCard: {
    backgroundColor: '#fff',
    marginHorizontal: 16,
    marginBottom: 8,
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  summaryTitle: { fontSize: 14, color: '#6b7280' },
  totalFee: { fontSize: 28, fontWeight: '800', marginTop: 6 },
  summarySub: { fontSize: 12, color: '#6b7280', marginTop: 2 },
  section: { fontSize: 16, fontWeight: '600', marginHorizontal: 16, marginTop: 12 },
  card: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginTop: 12,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    flexDirection: 'row',
    alignItems: 'center',
  },
  code: { fontSize: 16, fontWeight: '600' },
  meta: { fontSize: 12, color: '#111' },
  metaLight: { fontSize: 11, color: '#6b7280' },
  feeText: { fontSize: 16, fontWeight: '700' },
});
