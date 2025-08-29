import React, { useEffect, useState } from 'react';
import {
  View, Text, TextInput, StyleSheet, Pressable, TouchableOpacity,
  Alert, ActivityIndicator,
} from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { authedFetch } from '@/app/lib/auth';

const API_BASE = process.env.EXPO_PUBLIC_API_BASE || 'http://192.168.1.62:8000';

// stringify any server/JS error for Alert
function toMessage(err: any): string {
  if (typeof err === 'string') return err;
  if (err && typeof err.message === 'string') return err.message;
  if (Array.isArray(err)) return err.map(e => e?.msg || e?.message || JSON.stringify(e)).join('\n');
  if (err && typeof err === 'object') {
    if (typeof err.detail === 'string') return err.detail;
    if (Array.isArray(err.detail)) return toMessage(err.detail);
    return JSON.stringify(err);
  }
  return String(err ?? 'Unknown error');
}

export default function ReportScreen() {
  const [permission, requestPermission] = useCameraPermissions();
  const [scanning, setScanning] = useState(true);

  const [code, setCode] = useState<string | null>(null);
  const [manualCode, setManualCode] = useState('');
  const [details, setDetails] = useState(''); // optional local notes
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (permission && !permission.granted) requestPermission();
  }, [permission?.granted]);

  // Extract last segment if QR is like "ombrello:umbrella:CODE123"
  const parseQrToCode = (val: string) => {
    try {
      if (!val.includes(':')) return val.trim();
      const parts = val.split(':');
      return parts[parts.length - 1].trim();
    } catch {
      return val.trim();
    }
  };

  const onBarcodeScanned = ({ data }: { data: string }) => {
    if (!scanning) return;
    setScanning(false);
    setCode(parseQrToCode(data));
    setTimeout(() => setScanning(true), 800);
  };

  const useManual = () => {
    const c = manualCode.trim();
    if (!c) return Alert.alert('Missing code', 'Enter an umbrella code or scan the QR.');
    setCode(c);
  };

  const submitReport = async () => {
    if (!code) {
      Alert.alert('Missing data', 'Scan or enter an umbrella code first.');
      return;
    }
    setSubmitting(true);
    try {
      const res = await authedFetch(`${API_BASE}/umbrellas/report-broken`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code }),   // <-- send code, not umbrella_id
      });

      if (!res.ok) {
        let server: any;
        try { server = await res.json(); } catch { server = await res.text(); }
        Alert.alert('Error', toMessage(server) || 'Failed to report broken umbrella.');
        return;
      }

      const payload = await res.json(); // { code, status, condition, updated_at }
      Alert.alert(
        'Reported',
        `Umbrella ${String(payload?.code ?? '')} set to maintenance/bad.`
      );
      // reset
      setCode(null);
      setManualCode('');
      setDetails('');
    } catch (err: any) {
      Alert.alert('Network error', toMessage(err));
    } finally {
      setSubmitting(false);
    }
  };

  if (!permission) {
    return <View style={styles.container}><Text>Checking camera permission…</Text></View>;
  }
  if (!permission.granted) {
    return (
      <View style={styles.container}>
        <Text>We need camera permission to scan QR codes.</Text>
        <TouchableOpacity style={styles.btnPrimary} onPress={requestPermission}>
          <Text style={styles.btnPrimaryText}>Grant Permission</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.header}>Report Broken Umbrella</Text>

      <View style={styles.scannerBox}>
        <CameraView
          style={{ width: '100%', height: '100%' }}
          facing="back"
          barcodeScannerSettings={{ barcodeTypes: ['qr'] }}
          onBarcodeScanned={scanning ? onBarcodeScanned : undefined}
        />
      </View>

      <View style={styles.manualBox}>
        <Text style={styles.label}>No QR? Enter Umbrella Code:</Text>
        <TextInput
          style={styles.input}
          placeholder="e.g., CODE-00123"
          value={manualCode}
          onChangeText={setManualCode}
          autoCapitalize="none"
          placeholderTextColor="#999"
        />
        <TouchableOpacity style={styles.btnSecondary} onPress={useManual}>
          <Text style={styles.btnSecondaryText}>Use This Code</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.summary}>
        <Text style={styles.summaryText}>Code: {code ?? '—'}</Text>
      </View>

      <TextInput
        style={styles.textarea}
        placeholder="Describe the issue (optional, not sent)"
        value={details}
        onChangeText={setDetails}
        multiline
        placeholderTextColor="#999"
      />

      <Pressable
        style={[styles.btnPrimary, submitting && { opacity: 0.7 }]}
        onPress={submitReport}
        disabled={submitting}
      >
        {submitting ? <ActivityIndicator color="#fff" /> : <Text style={styles.btnPrimaryText}>Submit Report</Text>}
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 24, backgroundColor: '#f4f8ff' },
  header: { fontSize: 24, fontWeight: 'bold', marginBottom: 16 },

  scannerBox: {
    width: '100%',
    aspectRatio: 1,
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: '#000',
    marginBottom: 12,
  },

  manualBox: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  label: { fontSize: 14, marginBottom: 6 },
  input: {
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 8,
    padding: 10,
    backgroundColor: '#fff',
  },

  summary: { marginTop: 8, marginBottom: 12 },
  summaryText: { fontSize: 14, marginBottom: 4 },

  textarea: {
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 12,
    height: 100,
    textAlignVertical: 'top',
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#d1d5db',
  },

  btnPrimary: {
    backgroundColor: '#2563eb',
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: 'center',
  },
  btnPrimaryText: { color: '#fff', fontSize: 16, fontWeight: '600' },

  btnSecondary: {
    backgroundColor: '#10b981',
    borderRadius: 10,
    paddingVertical: 10,
    alignItems: 'center',
    marginTop: 8,
  },
  btnSecondaryText: { color: '#fff', fontWeight: '600' },
});
