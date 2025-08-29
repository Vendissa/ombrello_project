import React, { useEffect, useState } from 'react';
import { SafeAreaView, View, Text, ActivityIndicator, StyleSheet, Pressable, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import QRCode from 'react-native-qrcode-svg';
import { jwtDecode } from 'jwt-decode';
import { getAccessToken } from '@/app/lib/auth';

type JwtPayload = {
  sub?: string;
  id?: string;
  uid?: string;
  user_id?: string;
  [k: string]: any;
};

function extractUserIdFromToken(token: string): string | null {
  try {
    const decoded = jwtDecode<JwtPayload>(token);
    return decoded.sub || decoded.id || decoded.uid || decoded.user_id || null;
  } catch {
    return null;
  }
}

export default function MyQRScreen() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [userId, setUserId] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const token = await getAccessToken();
        if (!token) {
          Alert.alert('Not logged in', 'Please log in to view your QR.');
          return;
        }
        const id = extractUserIdFromToken(token);
        if (!id) {
          Alert.alert('Oops', 'Could not find your user id in the token claims.');
        }
        setUserId(id);
      } catch (e: any) {
        Alert.alert('Error', e?.message ?? 'Failed to load your QR.');
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <ActivityIndicator size="large" />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <Pressable style={styles.back} onPress={() => router.back()}>
        <Ionicons name="arrow-back" size={24} color="#333" />
      </Pressable>

      <View style={styles.card}>
        <Text style={styles.title}>My QR</Text>
        {userId ? (
          <>
            <View style={{ marginVertical: 18 }}>
              <QRCode value={userId} size={220} />
            </View>
            <Text style={styles.caption}>User ID</Text>
            <Text selectable style={styles.idText}>{userId}</Text>
          </>
        ) : (
          <Text style={{ textAlign: 'center' }}>
            We couldn’t determine your user id. Please log in again.
          </Text>
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#f4f8ff' },
  back: {
    position: 'absolute', top: 16, left: 16, padding: 8,
    backgroundColor: 'rgba(255,255,255,0.9)', borderRadius: 16,
  },
  card: {
    width: '86%', backgroundColor: '#fff', borderRadius: 16, padding: 20,
    shadowColor: '#000', shadowOpacity: 0.08, shadowRadius: 10, elevation: 3,
    alignItems: 'center',
  },
  title: { fontSize: 20, fontWeight: '700', marginBottom: 6 },
  caption: { marginTop: 4, color: '#666' },
  idText: { fontSize: 13, marginTop: 6, color: '#333', textAlign: 'center' },
});
