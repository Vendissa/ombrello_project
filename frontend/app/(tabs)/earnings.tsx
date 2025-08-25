// app/(tabs)/earnings.tsx
import React from 'react';
import { View, Text, FlatList, StyleSheet } from 'react-native';

const transactions = [
  { id: '1', date: '2025-07-20', description: 'Rental #123', amount: 1000 },
  { id: '2', date: '2025-07-21', description: 'Rental #124', amount: 1500 },
  // …replace with real data
];

export default function EarningsScreen() {
  const total = transactions.reduce((sum, t) => sum + t.amount, 0);

  return (
    <View style={styles.container}>
      <Text style={styles.header}>My Earnings</Text>
      <View style={styles.row}>
        <Text style={[styles.cell, styles.dateCell]}>Date</Text>
        <Text style={[styles.cell, styles.descCell]}>Description</Text>
        <Text style={[styles.cell, styles.amountCell]}>Amount</Text>
      </View>
      <FlatList
        data={transactions}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <View style={styles.row}>
            <Text style={[styles.cell, styles.dateCell]}>{item.date}</Text>
            <Text style={[styles.cell, styles.descCell]}>{item.description}</Text>
            <Text style={[styles.cell, styles.amountCell]}>₹{item.amount}</Text>
          </View>
        )}
      />
      <View style={styles.totalRow}>
        <Text style={styles.totalText}>Total:</Text>
        <Text style={styles.totalAmount}>₹{total}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 24, backgroundColor: '#f4f8ff' },
  header: { fontSize: 24, fontWeight: 'bold', marginBottom: 16, textAlign: 'center' },
  row: { flexDirection: 'row', paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: '#eee' },
  cell: { fontSize: 14 },
  dateCell: { flex: 2 },
  descCell: { flex: 3 },
  amountCell: { flex: 1, textAlign: 'right' },
  totalRow: { flexDirection: 'row', justifyContent: 'flex-end', paddingTop: 12 },
  totalText: { fontSize: 16, fontWeight: 'bold', marginRight: 8 },
  totalAmount: { fontSize: 16, fontWeight: 'bold' },
});
