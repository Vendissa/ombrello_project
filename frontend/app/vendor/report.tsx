// app/vendor/report.tsx
import React, { useState } from 'react';
import { View, Text, TextInput, StyleSheet, Pressable } from 'react-native';

export default function ReportScreen() {
  const [details, setDetails] = useState('');

  return (
    <View style={styles.container}>
      <Text style={styles.header}>Report Broken Umbrella</Text>
      <TextInput
        style={styles.input}
        placeholder="Describe the issue"
        value={details}
        onChangeText={setDetails}
        multiline
        placeholderTextColor="#999"
      />
      <Pressable style={styles.button} onPress={() => {/* submit */}}>
        <Text style={styles.buttonText}>Submit Report</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 24, backgroundColor: '#f4f8ff' },
  header: { fontSize: 24, fontWeight: 'bold', marginBottom: 16 },
  input: {
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 12,
    height: 100,
    textAlignVertical: 'top',
    marginBottom: 16,
  },
  button: { backgroundColor: '#28a745', padding: 14, borderRadius: 8, alignItems: 'center' },
  buttonText: { color: '#fff', fontSize: 16, fontWeight: '600' },
});
