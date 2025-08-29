// app/vendor/assign.tsx
import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, TextInput, Alert, ActivityIndicator } from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import * as Location from 'expo-location';
import { authedFetch } from '@/app/lib/auth';

const API_BASE = process.env.EXPO_PUBLIC_API_BASE || 'http://192.168.1.62:8000';

type Step = 'scan-user' | 'scan-umbrella' | 'confirm';

type VendorMe = {
  id?: string;
  shop_name?: string;
  location?: { type: 'Point'; coordinates: [number, number] } | null; // [lng, lat]
};

type SimplePriceResponse = {
  currency: string;       // "LKR"
  lat: number;
  lng: number;
  final_price: number;
  valid_until?: string;
  // ... other fields ignored
};

export default function AssignScreen() {
  const [permission, requestPermission] = useCameraPermissions();
  const [scanning, setScanning] = useState(true);
  const [step, setStep] = useState<Step>('scan-user');

  const [userCode, setUserCode] = useState<string | null>(null);
  const [userIdManual, setUserIdManual] = useState('');
  const [userId, setUserId] = useState<string | null>(null);
  const [userName] = useState<string | null>(null); // reserved for future use

  const [umbrellaCode, setUmbrellaCode] = useState<string | null>(null);
  const [umbrellaId, setUmbrellaId] = useState<string | null>(null);

  const [shopName, setShopName] = useState<string | null>(null);

  // pricing state
  const [fee, setFee] = useState<number | null>(null);
  const [feeCurrency, setFeeCurrency] = useState<string>('LKR');
  const [feeLoading, setFeeLoading] = useState<boolean>(false);

  const [submitting, setSubmitting] = useState(false);

  // Camera permission
  useEffect(() => {
    if (permission && !permission.granted) {
      requestPermission();
    }
  }, [permission?.granted]);

  // Fetch vendor profile (for shop_name + try to use vendor location for pricing)
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await authedFetch(`${API_BASE}/vendors/me`);
        if (!res.ok) {
          console.warn('Failed to fetch vendor profile:', res.status);
          // still try pricing via device GPS below
        } else {
          const me: VendorMe = await res.json();
          if (!cancelled) {
            setShopName(me?.shop_name || '');
          }
          // If vendor has a saved location, use it for pricing
          const coords = me?.location?.coordinates;
          if (coords && typeof coords[0] === 'number' && typeof coords[1] === 'number') {
            const [lng, lat] = coords;
            await fetchPrice(lat, lng);
            return;
          }
        }

        // Fallback to device location for pricing
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status === 'granted') {
          const pos = await Location.getCurrentPositionAsync({});
          await fetchPrice(pos.coords.latitude, pos.coords.longitude);
        } else {
          console.warn('Location permission denied; pricing will be blank until allowed.');
        }
      } catch (err) {
        console.error('Error initializing vendor/pricing', err);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  // ---- Pricing fetcher (simple price) ----
  const fetchPrice = async (lat: number, lng: number) => {
    try {
      setFeeLoading(true);
      const res = await fetch(`${API_BASE}/pricing/simple?lat=${lat}&lng=${lng}`);
      if (!res.ok) throw new Error(`Pricing failed (${res.status})`);
      const data: SimplePriceResponse = await res.json();
      setFee(data.final_price);
      setFeeCurrency(data.currency || 'LKR');
    } catch (e: any) {
      console.warn('Pricing error:', e?.message || e);
      setFee(null);
    } finally {
      setFeeLoading(false);
    }
  };

  // Parse "ombrello:user:<ID>" or plain ID
  const parseQr = (val: string) => {
    try {
      if (!val.includes(':')) return val.trim();
      const parts = val.split(':');
      return parts[parts.length - 1].trim();
    } catch {
      return val.trim();
    }
  };
  // Camera barcode callback (QR scanning for user, then umbrella)
  const onBarcodeScanned = ({ data }: { data: string }) => {
    if (!scanning) return;
    setScanning(false);

  const parsed = parseQr(data);

  if (step === 'scan-user') {
    if (parsed.length === 24) {
      setUserCode(data);
      setUserId(parsed);
      setStep('scan-umbrella');
    } else {
      Alert.alert('Invalid QR', 'User QR must be a 24-character ID.');
      setTimeout(() => setScanning(true), 500);
      return;
    }
    setTimeout(() => setScanning(true), 500);
  } else if (step === 'scan-umbrella') {
    if (parsed.startsWith('UMB-')) {
      setUmbrellaCode(data);
      setUmbrellaId(parsed);
      setStep('confirm');
    } else {
      Alert.alert('Invalid QR', 'Umbrella QR must start with "UMB-".');
      setTimeout(() => setScanning(true), 500);
      return;
    }
  }
};
  const useManualUser = () => {
    const id = userIdManual.trim();
    if (!id) return Alert.alert('Missing user ID', 'Enter a user ID or scan their QR.');
    setUserId(id);
    setUserCode(`manual:${id}`);
    setStep('scan-umbrella');
    setScanning(true);
  };

  const resetAll = () => {
    setStep('scan-user');
    setScanning(true);
    setUserCode(null);
    setUserId(null);
    // setUserName(null); // not used
    setUmbrellaCode(null);
    setUmbrellaId(null);
  };

  const assignRental = async () => {
    if (!userId || !umbrellaId) {
      Alert.alert('Missing data', 'Scan both user and umbrella first.');
      return;
    }
    setSubmitting(true);
    try {
      const body: any = {
        user_id: userId,
        code: umbrellaId,
        shop_name: shopName || undefined,
      };
      // include fee if we have it
      console.log('Current fee state:', { typeof : fee });
      if (typeof fee === 'number') {
        console.log('Including fee in assignment:', fee);
        body.fee = fee;
      }

      const res = await authedFetch(`${API_BASE}/rentals/assign`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      if (res.status === 401) {
        Alert.alert('Unauthorized', 'Please log in again.');
        return;
      }
      if (!res.ok) {
        let detail = 'Assignment failed.';
        try {
          const payload = await res.json();
          detail = payload?.detail || detail;
        } catch {
          const text = await res.text();
          if (text) detail = text;
        }
        Alert.alert('Error', detail);
        return;
      }

      const data = await res.json();
      Alert.alert(
        'Assigned',
        `Rental created.\nRental ID: ${data.rental_id}\nShop: ${data.shop_name}\nRecord _id: ${data.id}`
      );
      resetAll();
    } catch (e: any) {
      Alert.alert('Network error', e?.message || 'Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  // Permission UI
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
      <Text style={styles.header}>Assign Umbrella</Text>

      {step !== 'confirm' && (
        <>
          <Text style={styles.step}>
            {step === 'scan-user'
              ? 'Step 1: Scan User QR (or enter User ID below)'
              : 'Step 2: Scan Umbrella QR'}
          </Text>

          <View style={styles.scannerBox}>
            <CameraView
              style={{ width: '100%', height: '100%' }}
              facing="back"
              barcodeScannerSettings={{ barcodeTypes: ['qr'] }}
              onBarcodeScanned={scanning ? onBarcodeScanned : undefined}
            />
          </View>
        </>
      )}

      {step === 'scan-user' && (
        <View style={styles.manualBox}>
          <Text style={styles.label}>No user QR? Enter User ID:</Text>
          <TextInput
            style={styles.input}
            placeholder="User ObjectId (Mongo) or your chosen ID"
            value={userIdManual}
            onChangeText={setUserIdManual}
            autoCapitalize="none"
          />
          <TouchableOpacity style={styles.btnSecondary} onPress={useManualUser}>
            <Text style={styles.btnSecondaryText}>Use this User ID</Text>
          </TouchableOpacity>
        </View>
      )}

      <View style={styles.summary}>
        <Text style={styles.summaryText}>User: {userId ?? '—'}</Text>
        <Text style={styles.summaryText}>Umbrella: {umbrellaId ?? '—'}</Text>
        <Text style={styles.summaryText}>Shop: {shopName || '—'}</Text>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 6 }}>
          <Text style={styles.summaryText}>
            Fee: {feeLoading ? 'loading…' : (fee != null ? `${feeCurrency} ${new Intl.NumberFormat().format(fee)}` : '—')}
          </Text>
          <TouchableOpacity
            style={[styles.btnChip, { opacity: feeLoading ? 0.6 : 1 }]}
            onPress={async () => {
              try {
                // Try vendor location first again; else device GPS
                const res = await authedFetch(`${API_BASE}/vendors/me`);
                let lat: number | null = null, lng: number | null = null;
                if (res.ok) {
                  const me: VendorMe = await res.json();
                  const coords = me?.location?.coordinates;
                  if (coords) {
                    [lng, lat] = coords;
                  }
                }
                if (lat == null || lng == null) {
                  const perm = await Location.requestForegroundPermissionsAsync();
                  if (perm.status === 'granted') {
                    const pos = await Location.getCurrentPositionAsync({});
                    lat = pos.coords.latitude; lng = pos.coords.longitude;
                  }
                }
                if (lat != null && lng != null) {
                  await fetchPrice(lat, lng);
                } else {
                  Alert.alert('Location needed', 'Enable location or set vendor location to refresh price.');
                }
              } catch (e: any) {
                Alert.alert('Error', e?.message || 'Could not refresh price.');
              }
            }}
            disabled={feeLoading}
          >
            <Text style={styles.btnChipText}>Refresh price</Text>
          </TouchableOpacity>
        </View>
      </View>

      {step === 'confirm' ? (
        <TouchableOpacity style={styles.btnPrimary} onPress={assignRental} disabled={submitting}>
          {submitting ? <ActivityIndicator /> : <Text style={styles.btnPrimaryText}>Assign</Text>}
        </TouchableOpacity>
      ) : (
        <TouchableOpacity style={[styles.btnPrimary, { backgroundColor: '#98a2b3' }]} disabled>
          <Text style={styles.btnPrimaryText}>Assign</Text>
        </TouchableOpacity>
      )}

      <TouchableOpacity style={styles.btnLink} onPress={resetAll}>
        <Text style={styles.btnLinkText}>Reset</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 24, backgroundColor: '#f4f8ff' },
  header: { fontSize: 22, fontWeight: 'bold', marginBottom: 12 },
  step: { fontSize: 16, marginBottom: 8 },
  scannerBox: {
    width: '100%',
    aspectRatio: 1,
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: '#000',
    marginBottom: 12,
  },
  manualBox: { backgroundColor: '#fff', borderRadius: 12, padding: 12, marginBottom: 12, borderWidth: 1, borderColor: '#e5e7eb' },
  label: { fontSize: 14, marginBottom: 6 },
  input: { borderWidth: 1, borderColor: '#d1d5db', borderRadius: 8, padding: 10, backgroundColor: '#fff' },
  summary: { marginTop: 8, marginBottom: 12 },
  summaryText: { fontSize: 14, marginBottom: 4 },
  btnPrimary: { backgroundColor: '#2563eb', borderRadius: 10, paddingVertical: 12, alignItems: 'center' },
  btnPrimaryText: { color: '#fff', fontWeight: '600' },
  btnSecondary: { backgroundColor: '#10b981', borderRadius: 10, paddingVertical: 10, alignItems: 'center', marginTop: 8 },
  btnSecondaryText: { color: '#fff', fontWeight: '600' },
  btnLink: { marginTop: 10, alignItems: 'center' },
  btnLinkText: { color: '#2563eb' },
  btnChip: {
    backgroundColor: '#eef2ff',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: '#c7d2fe',
  },
  btnChipText: { color: '#3730a3', fontWeight: '600', fontSize: 12 },
});
