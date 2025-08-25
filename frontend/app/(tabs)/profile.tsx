// app/(tabs)/profile.tsx
import React from 'react';
import { View, Text, StyleSheet, Pressable, Image } from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '../../context/Authcontext';

export default function ProfileScreen() {
  const router = useRouter();
  const { user, logout } = useAuth();

  return (
    <View style={styles.container}>
      {user?.profilePic && <Image source={{ uri: user.profilePic }} style={styles.avatar} />}
      <Text style={styles.name}>{user?.name || 'Vendor'}</Text>
      <Pressable
        style={styles.logoutButton}
        onPress={() => {
          logout();
          router.replace('/auth/login');
        }}
      >
        <Text style={styles.logoutText}>Logout</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24, backgroundColor: '#f4f8ff' },
  avatar: { width: 100, height: 100, borderRadius: 50, marginBottom: 16 },
  name: { fontSize: 20, fontWeight: 'bold', marginBottom: 24 },
  logoutButton: { backgroundColor: '#ff3b30', paddingVertical: 12, paddingHorizontal: 32, borderRadius: 8 },
  logoutText: { color: '#fff', fontSize: 16, fontWeight: '600' },
});
