// app/(tabs)/reports.tsx
import React from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';

export default function ReportsScreen() {
  const router = useRouter();
  return (
    <View style={styles.container}>
      <Text style={styles.header}>Report Broken Umbrella</Text>
      <Pressable style={styles.button} onPress={() => router.push('/vendor/report')}>
        <Text style={styles.buttonText}>Report Now</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24, backgroundColor: '#f4f8ff' },
  header: { fontSize: 24, fontWeight: 'bold', marginBottom: 24 },
  button: { backgroundColor: '#28a745', padding: 14, borderRadius: 8 },
  buttonText: { color: '#fff', fontSize: 16, fontWeight: '600' },
});
