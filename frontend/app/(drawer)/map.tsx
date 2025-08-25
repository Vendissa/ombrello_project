// app/(drawer)/map.tsx
import React from 'react';
import {
  SafeAreaView,
  View,
  Text,
  Pressable,
  StyleSheet,
  Dimensions,
} from 'react-native';
import MapView, { Marker } from 'react-native-maps';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as Linking from 'expo-linking';

import { useNavigation } from '@react-navigation/native';
import type { DrawerNavigationProp } from '@react-navigation/drawer';
import { BorrowerDrawerParamList } from './types';

export default function MapScreen() {
  const router = useRouter();

  // Here we tell TS that this navigation is a DrawerNavigationProp
  const navigation = useNavigation<DrawerNavigationProp<BorrowerDrawerParamList>>();

  // Sample shops (replace with real data)
  const shops = [
    { id: 1, title: 'Shop A', latitude: 6.9271, longitude: 79.8612 },
    { id: 2, title: 'Shop B', latitude: 6.9350, longitude: 79.8550 },
  ];
  const nearest = shops[0];
  const mapHeight = Dimensions.get('window').height * 0.88;

  const openDrawer = () => {
    navigation.openDrawer();  // TypeScript knows about this method now
  };

  const handleNavigate = () => {
    const url = `https://www.google.com/maps/dir/?api=1&destination=${nearest.latitude},${nearest.longitude}`;
    Linking.openURL(url);
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Hamburger icon */}
      <Pressable style={styles.hamburger} onPress={openDrawer}>
        <Ionicons name="menu" size={28} color="#333" />
      </Pressable>

      {/* Map */}
      <MapView
        style={[styles.map, { height: mapHeight }]}
        initialRegion={{
          latitude: nearest.latitude,
          longitude: nearest.longitude,
          latitudeDelta: 0.05,
          longitudeDelta: 0.05,
        }}
      >
        {shops.map((s) => (
          <Marker
            key={s.id}
            coordinate={{ latitude: s.latitude, longitude: s.longitude }}
            title={s.title}
          />
        ))}
      </MapView>

      {/* Bottom buttons */}
      <View style={styles.buttons}>
        <Pressable style={styles.button} onPress={() => router.push('../tabs/dashboard')}>
          <Text style={styles.buttonText}>View My QR</Text>
        </Pressable>
        <Pressable style={styles.button} onPress={handleNavigate}>
          <Text style={styles.buttonText}>Navigate Me</Text>
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
    zIndex: 1,
    backgroundColor: 'rgba(255,255,255,0.8)',
    borderRadius: 20,
    padding: 8,
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
