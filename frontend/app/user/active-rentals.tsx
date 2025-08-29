import React, { useEffect, useState } from 'react';
import { SafeAreaView, View, Text, StyleSheet, ActivityIndicator, FlatList, RefreshControl } from 'react-native';
import { authedFetch } from '@/app/lib/auth';
import dayjs from 'dayjs';

const API_BASE = process.env.EXPO_PUBLIC_API_BASE || 'http://192.168.1.62:8000';

type MyActiveRental = {
  id: string;
  rental_id: string;
  umbrella_code?: string | null;
  rented_at: string; // ISO from backend
};

export default function ActiveRentalsScreen() {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [items, setItems] = useState<MyActiveRental[]>([]);

  const fetchData = async () => {
    const res = await authedFetch(`${API_BASE}/rentals/my-active`);
    if (!res.ok) {
      const t = await res.text();
      throw new Error(t || `Failed to load (${res.status})`);
    }
    const data: MyActiveRental[] = await res.json();
    setItems(data);
  };

  useEffect(() => {
    (async () => {
      try {
        await fetchData();
      } catch (e) {
        console.warn(e);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const onRefresh = async () => {
    try {
      setRefreshing(true);
      await fetchData();
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

  return (
    <SafeAreaView style={styles.container}>
      <Text style={styles.header}>My Active Rentals</Text>
      {items.length === 0 ? (
        <View style={{ padding: 16 }}>
          <Text style={{ color: '#555' }}>No active rentals.</Text>
        </View>
      ) : (
        <FlatList
          data={items}
          keyExtractor={(item) => item.id}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
          renderItem={({ item }) => {
            const rentedAt = dayjs(item.rented_at).format('YYYY-MM-DD HH:mm');
            return (
              <View style={styles.card}>
                <Text style={styles.code}>
                  Umbrella: {item.umbrella_code || '—'}
                </Text>
                <Text style={styles.meta}>Rented: {rentedAt}</Text>
                <Text style={styles.metaLight}>Rental ID: {item.rental_id}</Text>
              </View>
            );
          }}
          contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 24 }}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f4f8ff' },
  header: { fontSize: 22, fontWeight: 'bold', margin: 16 },
  card: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginTop: 12,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  code: { fontSize: 16, fontWeight: '600', marginBottom: 6 },
  meta: { fontSize: 14, color: '#111' },
  metaLight: { fontSize: 12, color: '#6b7280', marginTop: 4 },
});
