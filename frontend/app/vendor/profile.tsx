// app/vendor/profile.tsx
import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, TextInput, Alert, ActivityIndicator } from 'react-native';
import * as Location from 'expo-location';
import { authedFetch, clearAuth, getVendorProfile, saveVendorProfile } from '@/app/lib/auth';
import { useRouter } from 'expo-router';

const API_BASE = process.env.EXPO_PUBLIC_API_BASE || 'http://192.168.1.62:8000';

export default function VendorProfile() {
  const router = useRouter();
  const [shopName, setShopName] = useState('');
  const [address, setAddress] = useState('');
  const [lat, setLat] = useState<string>('');
  const [lng, setLng] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const cached = await getVendorProfile<any>();
        if (cached) {
          setShopName(cached.shop_name || '');
          setAddress(cached.address || '');
          const coords = cached.location?.coordinates;
          if (coords) {
            setLng(String(coords[0]));
            setLat(String(coords[1]));
          }
        }
        const res = await authedFetch(`${API_BASE}/vendors/me`);
        if (res.ok) {
          const me = await res.json();
          setShopName(me?.shop_name || '');
          setAddress(me?.address || '');
          const coords = me?.location?.coordinates;
          if (coords) {
            setLng(String(coords[0]));
            setLat(String(coords[1]));
          }
          await saveVendorProfile(me);
        }
      } catch {}
      setLoading(false);
    })();
  }, []);

  const useCurrentLocation = async () => {
    const { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission needed', 'Location permission is required to set your shop location.');
      return;
    }
    const pos = await Location.getCurrentPositionAsync({});
    setLat(String(pos.coords.latitude));
    setLng(String(pos.coords.longitude));
    // Optional reverse geocode:
    try {
      const r = await Location.reverseGeocodeAsync({
        latitude: pos.coords.latitude, longitude: pos.coords.longitude,
      });
      if (r?.[0]) {
        const a = `${r[0].name ?? ''} ${r[0].street ?? ''}, ${r[0].city ?? ''} ${r[0].region ?? ''}`.trim();
        if (a) setAddress(a);
      }
    } catch {}
  };

  const saveLocation = async () => {
    const latNum = Number(lat), lngNum = Number(lng);
    if (Number.isNaN(latNum) || Number.isNaN(lngNum)) {
      Alert.alert('Invalid coordinates', 'Please enter numeric lat/lng.');
      return;
    }
    setSaving(true);
    try {
      const res = await authedFetch(`${API_BASE}/vendors/me/location`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ lat: latNum, lng: lngNum, address: address || undefined }),
      });
      const payload = await res.json().catch(() => ({}));
      if (!res.ok) {
        Alert.alert('Error', typeof payload?.detail === 'string' ? payload.detail : 'Failed to save location.');
        return;
      }
      Alert.alert('Saved', 'Location updated.');
      await saveVendorProfile(payload);
    } catch (e: any) {
      Alert.alert('Network error', e?.message || 'Try again.');
    } finally {
      setSaving(false);
    }
  };

  const logout = async () => {
    try {
      // Optional: notify server
      // await authedFetch(`${API_BASE}/auth/logout`, { method: 'POST' });
    } catch {}
    await clearAuth();
    router.replace('/auth/login');
  };

  if (loading) {
    return <View style={styles.container}><ActivityIndicator /></View>;
  }

  return (
    <View style={styles.container}>
      <Text style={styles.header}>Manage Profile</Text>
      <Text style={styles.label}>Shop Name</Text>
      <TextInput style={styles.input} value={shopName} editable={false} />

      <Text style={[styles.label, { marginTop: 12 }]}>Address</Text>
      <TextInput style={styles.input} value={address} onChangeText={setAddress} placeholder="Optional" />

      <View style={{ flexDirection: 'row', gap: 8 }}>
        <View style={{ flex: 1 }}>
          <Text style={styles.label}>Latitude</Text>
          <TextInput style={styles.input} value={lat} onChangeText={setLat} keyboardType="numeric" />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.label}>Longitude</Text>
          <TextInput style={styles.input} value={lng} onChangeText={setLng} keyboardType="numeric" />
        </View>
      </View>

      <TouchableOpacity style={styles.btnSecondary} onPress={useCurrentLocation}>
        <Text style={styles.btnSecondaryText}>Use Current Location</Text>
      </TouchableOpacity>

      <TouchableOpacity style={[styles.btnPrimary, saving && { opacity: 0.7 }]} onPress={saveLocation} disabled={saving}>
        <Text style={styles.btnPrimaryText}>{saving ? 'Saving…' : 'Save Location'}</Text>
      </TouchableOpacity>

      <View style={{ height: 24 }} />

      <TouchableOpacity style={styles.btnDanger} onPress={logout}>
        <Text style={styles.btnDangerText}>Log Out</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 24, backgroundColor: '#f4f8ff' },
  header: { fontSize: 22, fontWeight: 'bold', marginBottom: 12 },
  label: { fontSize: 14, marginBottom: 6 },
  input: { borderWidth: 1, borderColor: '#d1d5db', borderRadius: 8, padding: 10, backgroundColor: '#fff' },
  btnSecondary: { backgroundColor: '#10b981', marginTop: 12, borderRadius: 10, paddingVertical: 12, alignItems: 'center' },
  btnSecondaryText: { color: '#fff', fontWeight: '600' },
  btnPrimary: { backgroundColor: '#2563eb', marginTop: 12, borderRadius: 10, paddingVertical: 12, alignItems: 'center' },
  btnPrimaryText: { color: '#fff', fontWeight: '600' },
  btnDanger: { backgroundColor: '#ef4444', borderRadius: 10, paddingVertical: 12, alignItems: 'center' },
  btnDangerText: { color: '#fff', fontWeight: '700' },
});
