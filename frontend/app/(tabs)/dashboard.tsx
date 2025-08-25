// app/(tabs)/dashboard.tsx
import React from 'react';
import { ScrollView, View, Text, Pressable, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

export default function DashboardScreen() {
  const router = useRouter();
  const cards = [
    { title: 'Assign Umbrella', icon: 'arrow-up-circle', link: '/vendor/assign' },
    { title: 'Return Umbrella', icon: 'arrow-down-circle', link: '/vendor/return' },
    { title: 'Report Broken Umbrella', icon: 'alert-circle', link: '/vendor/report' },
    { title: 'View My Earnings', icon: 'cash', link: '/earnings' },
  ] as const;

  return (
    <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.container}
     >
      <Text style={styles.header}>Vendor Dashboard</Text>
      <View style={styles.grid}>
        {cards.map((c) => (
          <Pressable
            key={c.title}
            style={styles.card}
            onPress={() => router.push(c.link)}
          >
            <Ionicons name={c.icon} size={36} color="#4285F4" style={{ marginBottom: 12 }} />
            <Text style={styles.cardText}>{c.title}</Text>
          </Pressable>
        ))}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 24,
  },
  header: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 24,
    textAlign: 'center',
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  card: {
    width: '48%',
    backgroundColor: '#fff',
    padding: 20,
    borderRadius: 12,
    marginBottom: 16,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 1.41,
    elevation: 2,
  },
  cardText: {
    fontSize: 16,
    fontWeight: '600',
    textAlign: 'center',
  },
    scrollView: {
        flexGrow: 1,
        backgroundColor: '#f4f8ff',
    },
});
