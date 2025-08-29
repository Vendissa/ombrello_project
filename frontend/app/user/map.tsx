// app/(drawer)/map.tsx
import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  SafeAreaView,
  View,
  Text,
  Pressable,
  StyleSheet,
  Dimensions,
  ActivityIndicator,
  Alert,
  Platform,
  Image,
} from 'react-native';
import MapView, { Marker, PROVIDER_GOOGLE, Region } from 'react-native-maps';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as Linking from 'expo-linking';
import * as Location from 'expo-location';
import { useNavigation } from '@react-navigation/native';
import type { DrawerNavigationProp } from '@react-navigation/drawer';
import { BorrowerDrawerParamList } from './types';

const API_BASE = process.env.EXPO_PUBLIC_API_BASE || 'http://192.168.1.62:8000';
const umbrellaPin = require('../../assets/images/10-umbrella-png-image.png');

type Vendor = {
  id: string;
  shop_name?: string | null;
  address?: string | null;
  location?: { type: 'Point'; coordinates: [number, number] } | null; // [lng, lat]
};

type SimplePriceResponse = {
  currency: string;       // "LKR"
  lat: number;
  lng: number;
  final_price: number;    // <-- we care about this
  valid_until?: string;
  // ...other fields ignored
};

export default function MapScreen() {
  const router = useRouter();
  const navigation = useNavigation<DrawerNavigationProp<BorrowerDrawerParamList>>();
  const mapRef = useRef<MapView>(null);

  const [loading, setLoading] = useState(true);
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [vendors, setVendors] = useState<Vendor[]>([]);

  // pricing UI state
  const [price, setPrice] = useState<number | null>(null);
  const [priceCurrency, setPriceCurrency] = useState<string>('LKR');
  const [priceLoading, setPriceLoading] = useState<boolean>(false);

  const mapHeight = Dimensions.get('window').height * 0.88;
  const DEFAULT_REGION: Region = {
    latitude: 6.9271,      // Colombo fallback
    longitude: 79.8612,
    latitudeDelta: 0.08,
    longitudeDelta: 0.08,
  };

  // Helpers
  const filterWithLocation = (data: Vendor[]) =>
    (data || []).filter(
      (v) =>
        v.location &&
        v.location.type === 'Point' &&
        Array.isArray(v.location.coordinates) &&
        v.location.coordinates.length === 2 &&
        typeof v.location.coordinates[0] === 'number' &&
        typeof v.location.coordinates[1] === 'number'
    );

  const fetchAll = async () => {
    const res = await fetch(`${API_BASE}/vendors/locations?limit=500`);
    if (!res.ok) throw new Error(`Locations fetch failed (${res.status})`);
    const data: Vendor[] = await res.json();
    return filterWithLocation(data);
  };

  // Load flow
  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        // Ask for location (for blue dot + better centering)
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status === 'granted') {
          const pos = await Location.getCurrentPositionAsync({});
          const lat = pos.coords.latitude;
          const lng = pos.coords.longitude;
          if (!mounted) return;
          setUserLocation({ lat, lng });

          // Center map on user
          setTimeout(() => {
            mapRef.current?.animateToRegion(
              { latitude: lat, longitude: lng, latitudeDelta: 0.035, longitudeDelta: 0.035 },
              500
            );
          }, 80);
        }

        // Fetch all vendors with a stored location
        const withLoc = await fetchAll();
        if (!mounted) return;
        setVendors(withLoc);
      } catch (e: any) {
        if (mounted) Alert.alert('Error', e?.message || 'Failed to load map data.');
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => { mounted = false; };
  }, []);

  // nearest vendor (for navigation if you bring that back later)
  const nearestVendor = useMemo(() => {
    if (!userLocation || vendors.length === 0) return null;
    const toRad = (d: number) => (d * Math.PI) / 180;
    const haversine = (lat1: number, lon1: number, lat2: number, lon2: number) => {
      const R = 6371; // km
      const dLat = toRad(lat2 - lat1);
      const dLon = toRad(lon2 - lon1);
      const a =
        Math.sin(dLat / 2) ** 2 +
        Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
      const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
      return R * c;
    };

    let best: { v: Vendor; d: number } | null = null;
    for (const v of vendors) {
      const [lng, lat] = v.location!.coordinates; // [lng, lat]
      const d = haversine(userLocation.lat, userLocation.lng, lat, lng);
      if (!best || d < best.d) best = { v, d };
    }
    return best?.v ?? null;
  }, [userLocation, vendors]);

  const openDrawer = () => navigation.openDrawer();

  // ---- PRICING fetcher ----
  const fetchPrice = async (lat: number, lng: number) => {
    setPriceLoading(true);
    const ctrl = new AbortController();
    try {
      const res = await fetch(`${API_BASE}/pricing/simple?lat=${lat}&lng=${lng}`, {
        signal: ctrl.signal,
      });
      if (!res.ok) throw new Error(`Pricing failed (${res.status})`);
      const data: SimplePriceResponse = await res.json();
      setPrice(data.final_price);
      setPriceCurrency(data.currency || 'LKR');
    } catch (e: any) {
      console.warn('Pricing error:', e?.message || e);
    } finally {
      setPriceLoading(false);
    }
    return () => ctrl.abort();
  };

  // Call pricing whenever we know where we are (or use a sensible fallback)
  useEffect(() => {
    // priority: user location -> nearest vendor -> Colombo
    const pick = () => {
      if (userLocation) return userLocation;
      if (vendors[0]?.location?.coordinates) {
        const [lng, lat] = vendors[0].location.coordinates;
        return { lat, lng };
      }
      return { lat: DEFAULT_REGION.latitude, lng: DEFAULT_REGION.longitude };
    };
    const { lat, lng } = pick();
    fetchPrice(lat, lng);
    // refresh price every 10 minutes (matches backend validity hint)
    const t = setInterval(() => fetchPrice(lat, lng), 10 * 60 * 1000);
    return () => clearInterval(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userLocation, vendors.length]);

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <ActivityIndicator style={{ marginTop: 32 }} />
      </SafeAreaView>
    );
  }

  const initialRegion: Region = userLocation
    ? { latitude: userLocation.lat, longitude: userLocation.lng, latitudeDelta: 0.035, longitudeDelta: 0.035 }
    : DEFAULT_REGION;

  return (
    <SafeAreaView style={styles.container}>
      {/* Hamburger icon */}
      <Pressable style={styles.hamburger} onPress={openDrawer}>
        <Ionicons name="menu" size={28} color="#333" />
      </Pressable>

      {/* Price pill (top-right) */}
      <View style={styles.priceWrap}>
        <View style={styles.pricePill}>
          <Text style={styles.priceText}>
            {price != null ? `${priceCurrency} ${new Intl.NumberFormat().format(price)}` : '—'}
          </Text>
          <Text style={styles.priceSub}>weather-based</Text>
        </View>
        <Pressable
          onPress={() => {
            const lat = userLocation?.lat ?? initialRegion.latitude;
            const lng = userLocation?.lng ?? initialRegion.longitude;
            fetchPrice(lat, lng);
          }}
          style={styles.refreshBtn}
        >
          {priceLoading ? (
            <ActivityIndicator size="small" />
          ) : (
            <Ionicons name="refresh" size={18} color="#1f2937" />
          )}
        </Pressable>
      </View>

      {/* Map */}
      <MapView
        ref={mapRef}
        provider={PROVIDER_GOOGLE}
        style={[styles.map, { height: mapHeight }]}
        showsUserLocation
        showsMyLocationButton={Platform.OS === 'android'}
        initialRegion={initialRegion}
      >
        {vendors.map((v) => {
          const [lng, lat] = v.location!.coordinates;
          return (
            <Marker
              key={v.id}
              coordinate={{ latitude: lat, longitude: lng }}
              title={v.shop_name || 'Umbrella Vendor'}
              description={v.address || undefined}
              anchor={{ x: 0.5, y: 0.5 }}
            >
              <Image
                source={umbrellaPin}
                style={{ width: 38, height: 32, resizeMode: 'contain' }}
              />
            </Marker>
          );
        })}
      </MapView>

      {/* Bottom buttons */}
      <View style={styles.buttons}>
        <Pressable style={styles.button} onPress={() => router.push('/user/my-qr')}>
          <Text style={styles.buttonText}>View My QR</Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f4f8ff' },
  hamburger: {
    position: 'absolute',
    top: 16,
    left: 16,
    zIndex: 3,
    backgroundColor: 'rgba(255,255,255,0.9)',
    borderRadius: 20,
    padding: 8,
  },
  priceWrap: {
    position: 'absolute',
    top: 16,
    right: 16,
    zIndex: 3,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  pricePill: {
    backgroundColor: 'rgba(255,255,255,0.96)',
    borderRadius: 999,
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    alignItems: 'flex-start',
  },
  priceText: { fontWeight: '700', color: '#111827' },
  priceSub: { fontSize: 11, color: '#6b7280', marginTop: 2 },
  refreshBtn: {
    backgroundColor: 'rgba(255,255,255,0.96)',
    borderRadius: 999,
    padding: 8,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  map: { width: '100%' },
  buttons: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    padding: 16,
  },
  button: {
    flex: 1,
    marginHorizontal: 8,
    backgroundColor: '#4285F4',
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: 'center',
  },
  buttonText: { color: '#fff', fontSize: 16, fontWeight: '600' },
});
