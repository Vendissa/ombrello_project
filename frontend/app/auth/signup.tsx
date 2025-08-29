// app/auth/signup.tsx
import React, { useRef, useState } from 'react';
import {
  ScrollView,
  View,
  Text,
  TextInput,
  Pressable,
  TouchableOpacity,
  StyleSheet,
  Image,
  KeyboardAvoidingView,
  Platform,
  TouchableWithoutFeedback,
  Keyboard,
  ActivityIndicator,
  LayoutChangeEvent,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';

const API_BASE_URL = process.env.EXPO_PUBLIC_API_URL || 'http://192.168.1.62:8000';
console.log(API_BASE_URL);
//const BASE = process.env.NEXT_PUBLIC_API_BASE || "http://127.0.0.1:8000

export default function SignupScreen() {
  const router = useRouter();

  const [isVendor, setIsVendor] = useState(false); // false = borrower
  const [firstName, setFirstName] = useState('');
  const [shopName, setShopName] = useState('');
  const [shopOwnerName, setShopOwnerName] = useState('');
  const [businessRegNo, setBusinessRegNo] = useState('');
  const [telephone, setTelephone] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  // Scroll + simple positions registry per field
  const scrollRef = useRef<ScrollView | null>(null);
  const [positions, setPositions] = useState<Record<string, number>>({});

  // Keep classic refs so we can move focus with returnKeyType
  const inputRefs = {
    firstName: useRef<TextInput | null>(null),
    shopName: useRef<TextInput | null>(null),
    shopOwnerName: useRef<TextInput | null>(null),
    businessRegNo: useRef<TextInput | null>(null),
    telephone: useRef<TextInput | null>(null),
    email: useRef<TextInput | null>(null),
    password: useRef<TextInput | null>(null),
    confirmPassword: useRef<TextInput | null>(null),
  };

  const storeY =
    (key: string) =>
    (e: LayoutChangeEvent) => {
      const y = e.nativeEvent.layout.y;
      setPositions(prev => (prev[key] === y ? prev : { ...prev, [key]: y }));
    };

  const scrollToKey = (key: string) => {
    const y = positions[key];
    if (typeof y === 'number') {
      scrollRef.current?.scrollTo({ y: Math.max(y - 80, 0), animated: true });
    }
  };

  const toggleRole = () => setIsVendor(prev => !prev);

  const validate = () => {
    if (isVendor) {
      if (!shopName || !shopOwnerName || !businessRegNo || !telephone || !email) {
        return 'Please fill in all vendor fields.';
      }
    } else {
      if (!firstName || !telephone || !email) {
        return 'Please fill in all borrower fields.';
      }
    }
    if (!password || !confirmPassword) return 'Please enter and confirm your password.';
    if (password !== confirmPassword) return 'Passwords do not match.';
    return '';
  };

  const handleSignup = async () => {
    setError('');
    const err = validate();
    if (err) {
      setError(err);
      return;
    }

    try {
      setLoading(true);

      const payload = isVendor
        ? {
            role: 'vendor' as const,
            email,
            telephone,
            password,
            confirm_password: confirmPassword,
            shop_name: shopName,
            shop_owner_name: shopOwnerName,
            business_reg_no: businessRegNo,
          }
        : {
            role: 'user' as const,
            email,
            telephone,
            password,
            confirm_password: confirmPassword,
            first_name: firstName,
          };

      const res = await fetch(`${API_BASE_URL}/auth/signup`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        let message = 'Signup failed';
        try {
          const data = await res.json();
          message = (data && (data.detail || data.message)) || message;
        } catch {
          message = res.statusText || message;
        }
        throw new Error(message);
      }

      router.replace('/auth/login');
    } catch (e: any) {
      setError(e?.message || 'Something went wrong.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.select({ ios: 'padding', android: 'height' })}
      keyboardVerticalOffset={Platform.select({ ios: 80, android: 0 })}
    >
      <TouchableWithoutFeedback onPress={Keyboard.dismiss} accessible={false}>
        <ScrollView
          ref={scrollRef}
          contentContainerStyle={{
            ...styles.container,
            backgroundColor: isVendor ? '#f3faf4' : '#f4f8ff',
          }}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <Text style={styles.title}>Create your Ombrello account</Text>

          <Image
            source={require('../../assets/images/logo.png')}
            style={styles.logo}
          />

          <Text style={styles.selectText}>Please select your user type:</Text>
          <Pressable
            style={[
              styles.toggleButton,
              isVendor ? styles.toggleVendor : styles.toggleUser,
            ]}
            onPress={toggleRole}
          >
            <Text style={styles.toggleText}>
              I am a {isVendor ? 'Vendor' : 'Borrower'}
            </Text>
          </Pressable>

          {!isVendor ? (
            <TextInput
              ref={inputRefs.firstName}
              onLayout={storeY('firstName')}
              style={styles.input}
              placeholder="First Name"
              value={firstName}
              onChangeText={setFirstName}
              placeholderTextColor="#999"
              autoCapitalize="words"
              returnKeyType="next"
              onFocus={() => scrollToKey('firstName')}
              onSubmitEditing={() => inputRefs.telephone.current?.focus()}
            />
          ) : (
            <>
              <TextInput
                ref={inputRefs.shopName}
                onLayout={storeY('shopName')}
                style={styles.input}
                placeholder="Shop Name"
                value={shopName}
                onChangeText={setShopName}
                placeholderTextColor="#999"
                autoCapitalize="words"
                returnKeyType="next"
                onFocus={() => scrollToKey('shopName')}
                onSubmitEditing={() => inputRefs.shopOwnerName.current?.focus()}
              />
              <TextInput
                ref={inputRefs.shopOwnerName}
                onLayout={storeY('shopOwnerName')}
                style={styles.input}
                placeholder="Shop Owner Name"
                value={shopOwnerName}
                onChangeText={setShopOwnerName}
                placeholderTextColor="#999"
                autoCapitalize="words"
                returnKeyType="next"
                onFocus={() => scrollToKey('shopOwnerName')}
                onSubmitEditing={() => inputRefs.businessRegNo.current?.focus()}
              />
              <TextInput
                ref={inputRefs.businessRegNo}
                onLayout={storeY('businessRegNo')}
                style={styles.input}
                placeholder="Business Registration No."
                value={businessRegNo}
                onChangeText={setBusinessRegNo}
                placeholderTextColor="#999"
                autoCapitalize="characters"
                returnKeyType="next"
                onFocus={() => scrollToKey('businessRegNo')}
                onSubmitEditing={() => inputRefs.telephone.current?.focus()}
              />
            </>
          )}

          <TextInput
            ref={inputRefs.telephone}
            onLayout={storeY('telephone')}
            style={styles.input}
            placeholder="Mobile Phone Number"
            value={telephone}
            onChangeText={setTelephone}
            keyboardType="phone-pad"
            placeholderTextColor="#999"
            returnKeyType="next"
            onFocus={() => scrollToKey('telephone')}
            onSubmitEditing={() => inputRefs.email.current?.focus()}
          />

          <TextInput
            ref={inputRefs.email}
            onLayout={storeY('email')}
            style={styles.input}
            placeholder="Email"
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
            autoCapitalize="none"
            autoComplete="email"
            textContentType="emailAddress"
            placeholderTextColor="#999"
            returnKeyType="next"
            onFocus={() => scrollToKey('email')}
            onSubmitEditing={() => inputRefs.password.current?.focus()}
          />

          {/* Password */}
          <View style={styles.passwordWrapper} onLayout={storeY('password')}>
            <TextInput
              ref={inputRefs.password}
              style={styles.input}
              placeholder="Password"
              secureTextEntry={!showPassword}
              value={password}
              onChangeText={setPassword}
              placeholderTextColor="#999"
              autoCapitalize="none"
              textContentType="newPassword"
              returnKeyType="next"
              onFocus={() => scrollToKey('password')}
              onSubmitEditing={() => inputRefs.confirmPassword.current?.focus()}
            />
            <Pressable
              style={styles.eyeIcon}
              onPress={() => setShowPassword(v => !v)}
            >
              <Ionicons
                name={showPassword ? 'eye-off' : 'eye'}
                size={20}
                color="#999"
              />
            </Pressable>
          </View>

          {/* Confirm Password */}
          <View style={styles.passwordWrapper} onLayout={storeY('confirmPassword')}>
            <TextInput
              ref={inputRefs.confirmPassword}
              style={styles.input}
              placeholder="Confirm Password"
              secureTextEntry={!showConfirm}
              value={confirmPassword}
              onChangeText={setConfirmPassword}
              placeholderTextColor="#999"
              autoCapitalize="none"
              textContentType="password"
              returnKeyType="done"
              onFocus={() => scrollToKey('confirmPassword')}
              onSubmitEditing={handleSignup}
            />
            <Pressable
              style={styles.eyeIcon}
              onPress={() => setShowConfirm(v => !v)}
            >
              <Ionicons
                name={showConfirm ? 'eye-off' : 'eye'}
                size={20}
                color="#999"
              />
            </Pressable>
          </View>

          {error ? <Text style={styles.errorText}>{error}</Text> : null}

          <Pressable
            style={[styles.loginButton, loading && { opacity: 0.7 }]}
            onPress={handleSignup}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator />
            ) : (
              <Text style={styles.loginButtonText}>Sign Up</Text>
            )}
          </Pressable>

          <TouchableOpacity onPress={() => router.replace('/auth/login')}>
            <Text style={styles.forgotText}>Already have an account? Log in</Text>
          </TouchableOpacity>
        </ScrollView>
      </TouchableWithoutFeedback>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    padding: 24,
    paddingBottom: 40,
    justifyContent: 'center',
  },

  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 24,
    textAlign: 'center',
  },
  logo: {
    width: 150,
    height: 150,
    resizeMode: 'contain',
    alignSelf: 'center',
    marginBottom: 24,
    borderRadius: 10,
  },
  selectText: {
    fontSize: 16,
    fontWeight: '500',
    marginBottom: 12,
    textAlign: 'center',
  },
  toggleButton: {
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 30,
    marginBottom: 30,
    alignSelf: 'center',
  },
  toggleUser: {
    backgroundColor: '#0077cc',
  },
  toggleVendor: {
    backgroundColor: '#28a745',
  },
  toggleText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  input: {
    borderWidth: 1,
    borderColor: '#ccc',
    padding: 12,
    borderRadius: 8,
    marginBottom: 16,
    fontSize: 16,
    backgroundColor: '#fff',
  },
  passwordWrapper: {
    position: 'relative',
    justifyContent: 'center',
  },
  eyeIcon: {
    position: 'absolute',
    right: 16,
    top: 14,
  },
  forgotText: {
    alignSelf: 'center',
    color: '#4285F4',
    marginTop: 12,
  },
  errorText: {
    color: 'red',
    textAlign: 'center',
    marginBottom: 10,
  },
  loginButton: {
    backgroundColor: '#4285F4',
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 12,
  },
  loginButtonText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 16,
  },
});
