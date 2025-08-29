// app/vendor/return.tsx
import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert, ActivityIndicator } from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { authedFetch } from '@/app/lib/auth';

const API_BASE = process.env.EXPO_PUBLIC_API_BASE || 'http://192.168.1.62:8000';

// helper to normalize any error payload into a string
function toMessage(err: any): string {
  if (typeof err === 'string') return err;
  if (err && typeof err.message === 'string') return err.message;
  if (Array.isArray(err)) {
    return err.map((e) => e?.msg || e?.message || JSON.stringify(e)).join('\n');
  }
  if (err && typeof err === 'object') {
    if (typeof err.detail === 'string') return err.detail;
    if (Array.isArray(err.detail)) return toMessage(err.detail);
    return JSON.stringify(err);
  }
  return String(err ?? 'Unknown error');
}

export default function ReturnScreen() {
  const [permission, requestPermission] = useCameraPermissions();
  const [scanning, setScanning] = useState(true);
  const [umbrellaId, setUmbrellaId] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (permission && !permission.granted) {
      requestPermission();
    }
  }, [permission?.granted]);

  const parseQr = (val: string) => {
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

  const id = parseQr(data);

  // Accept only umbrella codes that start with "UMB-"
  if (!id.startsWith('UMB-')) {
    Alert.alert('Invalid QR', 'Umbrella QR must start with "UMB-".');

    setTimeout(() => setScanning(true), 800);
    return;
  }

  setUmbrellaId(id);
  setTimeout(() => setScanning(true), 800);
};

  const returnUmbrella = async () => {
    if (!umbrellaId) {
      Alert.alert('Missing data', 'Scan an umbrella QR first.');
      return;
    }
    setSubmitting(true);
    try {
      const res = await authedFetch(`${API_BASE}/returns`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: umbrellaId }),
      });

      if (res.status === 401) {
        Alert.alert('Unauthorized', 'Please log in again.');
        return;
      }
      if (!res.ok) {
        let msg = 'Return failed.';
        try {
          const payload = await res.json();
          msg = toMessage(payload) || msg;
        } catch {
          const text = await res.text();
          if (text) msg = text;
        }
        Alert.alert('Error', msg);
        return;
      }

      const data = await res.json();
      const returnedAt = data?.returned_at
        ? new Date(data.returned_at).toLocaleString()
        : 'now';

      Alert.alert(
        'Returned',
        `Umbrella ${String(data?.code ?? '')} successfully returned.\nReturned at: ${returnedAt}`
      );
      setUmbrellaId(null);
    } catch (err: any) {
      Alert.alert('Network error', toMessage(err));
    } finally {
      setSubmitting(false);
    }
  };

  if (!permission) {
    return (
      <View style={styles.container}>
        <Text>Checking camera permission…</Text>
      </View>
    );
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
      <Text style={styles.header}>Return Umbrella</Text>

      <View style={styles.scannerBox}>
        <CameraView
          style={{ width: '100%', height: '100%' }}
          facing="back"
          barcodeScannerSettings={{ barcodeTypes: ['qr'] }}
          onBarcodeScanned={scanning ? onBarcodeScanned : undefined}
        />
      </View>

      <Text style={styles.summaryText}>Umbrella: {umbrellaId ?? '—'}</Text>

      <TouchableOpacity
        style={[styles.btnPrimary, submitting && { opacity: 0.7 }]}
        onPress={returnUmbrella}
        disabled={submitting}
      >
        {submitting ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text style={styles.btnPrimaryText}>Return</Text>
        )}
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 24, backgroundColor: '#f4f8ff' },
  header: { fontSize: 22, fontWeight: 'bold', marginBottom: 12 },
  scannerBox: {
    width: '100%',
    aspectRatio: 1,
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: '#000',
    marginBottom: 12,
  },
  summaryText: { fontSize: 16, marginBottom: 12 },
  btnPrimary: {
    backgroundColor: '#2563eb',
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: 'center',
  },
  btnPrimaryText: { color: '#fff', fontWeight: '600' },
});
