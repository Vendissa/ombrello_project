// app/vendor/return.tsx
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

export default function ReturnScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.header}>Return Umbrella</Text>
      <Text style={styles.text}>[QR scanner UI goes here]</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 24, backgroundColor: '#f4f8ff' },
  header: { fontSize: 24, fontWeight: 'bold', marginBottom: 16 },
  text: { fontSize: 16 },
});
