// app/(tabs)/scan.tsx
import React from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';

export default function ScanScreen() {
  const router = useRouter();
  return (
    <View style={styles.container}>
      <Text style={styles.header}>Quick Scan</Text>
      <Pressable style={styles.button} onPress={() => router.push('/vendor/assign')}>
        <Text style={styles.buttonText}>Assign Umbrella</Text>
      </Pressable>
      <Pressable style={styles.button} onPress={() => router.push('/vendor/return')}>
        <Text style={styles.buttonText}>Return Umbrella</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24, backgroundColor: '#f4f8ff' },
  header: { fontSize: 24, fontWeight: 'bold', marginBottom: 24 },
  button: { backgroundColor: '#0077cc', paddingVertical: 14, paddingHorizontal: 32, borderRadius: 8, marginBottom: 16 },
  buttonText: { color: '#fff', fontSize: 16, fontWeight: '600' },
});
