import React, { useRef, useState } from 'react';
import {
  View, Text, TextInput, Pressable, StyleSheet, TouchableOpacity, Image,
  KeyboardAvoidingView, Platform, ScrollView, TouchableWithoutFeedback,
  Keyboard, ActivityIndicator
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { saveTokens, authedFetch, saveVendorProfile } from '@/app/lib/auth';
// TIP: centralize as `import { API_BASE } from '@/lib/config'`
const API_BASE = process.env.EXPO_PUBLIC_API_BASE || 'http://192.168.1.62:8000';

export default function LoginScreen() {
  const router = useRouter();
  const [isVendor, setIsVendor] = useState(false); // false = borrower (user)
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const passwordRef = useRef<TextInput>(null);

  const toggleRole = () => setIsVendor((prev) => !prev);

const API_BASE = process.env.EXPO_PUBLIC_API_BASE || 'http://192.168.1.62:8000';

const handleLogin = async () => {
  setError('');
  if (!email || !password) {
    setError('Please enter email and password.');
    return;
  }

  const role: 'user' | 'vendor' = isVendor ? 'vendor' : 'user';
  setLoading(true);

  try {
    const res = await fetch(`${API_BASE}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password, role }),
    });

    if (res.status === 401) { setError('Invalid email or password.'); return; }
    if (res.status === 403) {
      let detail = 'Login blocked.';
      try { const payload = await res.json(); detail = payload?.detail || detail; }
      catch { const text = await res.text(); if (text) detail = text; }
      setError(detail); return;
    }
    if (!res.ok) { const text = await res.text(); setError(text || 'Login failed. Please try again.'); return; }

    const data = await res.json(); // { access_token, refresh_token, token_type }
    if (data?.access_token && data?.refresh_token) {
      await saveTokens(data.access_token, data.refresh_token);
    }

    if (role === 'vendor') {
      // Fetch vendor profile so we have shop_name immediately
      const meRes = await authedFetch(`${API_BASE}/vendors/me`);
      if (meRes.ok) {
        const me = await meRes.json();
        console.log('Vendor profile; shop_name:', me?.shop_name);
        await saveVendorProfile(me); // { id, email, shop_name, ... }
      } else {
        // Not fatal; UI can still fetch later
        try {
          const err = await meRes.text();
          console.warn('vendors/me failed:', err);
        } catch {}
      }
      router.replace('/vendor/dashboard');
    } else {
      router.replace('/user/map');
    }
  } catch (e: any) {
    setError(typeof e?.message === 'string' ? e.message : 'Login failed. Try again.');
  } finally {
    setLoading(false);
  }
};


  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 80 : 0}
    >
      <TouchableWithoutFeedback onPress={Keyboard.dismiss} accessible={false}>
        <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
          <View style={[styles.container, { backgroundColor: isVendor ? '#f3faf4' : '#f4f8ff' }]}>
            <Text style={styles.title}>Welcome to Ombrello</Text>
            <Image source={require('../../assets/images/logo.png')} style={styles.logo} />
            <Text style={styles.selectText}>Please select your user type:</Text>

            <Pressable
              style={[styles.toggleButton, isVendor ? styles.toggleVendor : styles.toggleUser]}
              onPress={toggleRole}
            >
              <Text style={styles.toggleText}>I am a {isVendor ? 'Vendor' : 'Borrower'}</Text>
            </Pressable>

            <TextInput
              style={styles.input}
              placeholder="e.g. user@example.com"
              autoCapitalize="none"
              keyboardType="email-address"
              value={email}
              onChangeText={setEmail}
              placeholderTextColor="#999"
              returnKeyType="next"
              onSubmitEditing={() => passwordRef.current?.focus()}
              blurOnSubmit={false}
            />

            <View style={styles.passwordWrapper}>
              <TextInput
                ref={passwordRef}
                style={styles.input}
                placeholder="Enter your password"
                secureTextEntry={!showPassword}
                value={password}
                onChangeText={setPassword}
                placeholderTextColor="#999"
                returnKeyType="done"
                onSubmitEditing={handleLogin}
              />
              <Pressable style={styles.eyeIcon} onPress={() => setShowPassword(!showPassword)}>
                <Ionicons name={showPassword ? 'eye-off' : 'eye'} size={20} color="#999" />
              </Pressable>
            </View>

            <TouchableOpacity>
              <Text style={styles.forgotText}>Forgot Password?</Text>
            </TouchableOpacity>

            {error ? <Text style={styles.errorText}>{error}</Text> : null}

            <Pressable style={[styles.loginButton, loading && { opacity: 0.7 }]} onPress={handleLogin} disabled={loading}>
              {loading ? <ActivityIndicator /> : <Text style={styles.loginButtonText}>Login</Text>}
            </Pressable>

            <TouchableOpacity onPress={() => router.replace('/auth/signup')}>
              <Text style={styles.forgotText}>Don&apos;t have an account? Sign Up</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </TouchableWithoutFeedback>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  scrollContent: { flexGrow: 1 },
  container: { flex: 1, padding: 24, justifyContent: 'center', backgroundColor: '#e6f0fa' },
  title: { fontSize: 24, fontWeight: 'bold', marginBottom: 24, textAlign: 'center' },
  selectText: { fontSize: 16, fontWeight: '500', marginBottom: 12, textAlign: 'center' },
  toggleButton: { paddingVertical: 12, paddingHorizontal: 24, borderRadius: 30, marginBottom: 30, alignSelf: 'center' },
  toggleUser: { backgroundColor: '#0077cc' },
  toggleVendor: { backgroundColor: '#28a745' },
  toggleText: { color: '#fff', fontSize: 16, fontWeight: '600' },
  input: { borderWidth: 1, borderColor: '#ccc', padding: 12, borderRadius: 8, marginBottom: 16, fontSize: 16, backgroundColor: '#fff' },
  passwordWrapper: { position: 'relative', justifyContent: 'center' },
  eyeIcon: { position: 'absolute', right: 16, top: 14 },
  forgotText: { alignSelf: 'flex-end', color: '#4285F4', marginBottom: 12 },
  errorText: { color: 'red', textAlign: 'center', marginBottom: 10 },
  loginButton: { backgroundColor: '#4285F4', paddingVertical: 14, borderRadius: 12, alignItems: 'center', marginTop: 12 },
  loginButtonText: { color: '#fff', fontWeight: 'bold', fontSize: 16 },
  logo: { width: 150, height: 150, resizeMode: 'contain', alignSelf: 'center', marginBottom: 24, borderRadius: 10 },
});
