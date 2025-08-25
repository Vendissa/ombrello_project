import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  Pressable,
  StyleSheet,
  TouchableOpacity,
  Image
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';


export default function LoginScreen() {
  const router = useRouter();
  const [isVendor, setIsVendor] = useState(false); // false = borrower
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');

  const handleLogin = () => {
    if (!email || !password) {
      setError('Please enter email and password.');
      return;
    }

    const role = isVendor ? 'vendor' : 'user';
    console.log(`Logging in as ${role} with email: ${email}`);
    // Your login logic here
  };

  const toggleRole = () => setIsVendor((prev) => !prev);

  return (
   <View
      style={[
        styles.container,
        { backgroundColor: isVendor ? '#f3faf4' : '#f4f8ff' }
      ]}
    >
      <Text style={styles.title}>Welcome to Ombrello</Text>

      <Image source={require('../../assets/images/logo.png')} style={styles.logo} />

      <Text style={styles.selectText}>Please select your user type:</Text>

      <Pressable
        style={[
          styles.toggleButton,
          isVendor ? styles.toggleVendor : styles.toggleUser
        ]}
        onPress={toggleRole}
      >
        <Text style={styles.toggleText}>
          I am a {isVendor ? 'Vendor' : 'Borrower'}
        </Text>
      </Pressable>

      <TextInput
        style={styles.input}
        placeholder="e.g. user@example.com"
        autoCapitalize="none"
        keyboardType="email-address"
        value={email}
        onChangeText={setEmail}
        placeholderTextColor="#999"
      />

      <View style={styles.passwordWrapper}>
        <TextInput
          style={styles.input}
          placeholder="Enter your password"
          secureTextEntry={!showPassword}
          value={password}
          onChangeText={setPassword}
          placeholderTextColor="#999"
        />
        <Pressable
          style={styles.eyeIcon}
          onPress={() => setShowPassword(!showPassword)}
        >
          <Ionicons
            name={showPassword ? 'eye-off' : 'eye'}
            size={20}
            color="#999"
          />
        </Pressable>
      </View>

      <TouchableOpacity>
        <Text style={styles.forgotText}>Forgot Password?</Text>
      </TouchableOpacity>

      {error ? <Text style={styles.errorText}>{error}</Text> : null}

      <Pressable style={styles.loginButton} onPress={handleLogin}>
        <Text style={styles.loginButtonText}>Login</Text>
      </Pressable>
      <TouchableOpacity onPress={() => router.replace('/auth/signup')}>
        <Text style={styles.forgotText}>Don't have an account? Sign Up</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 24,
    justifyContent: 'center',
    backgroundColor: '#e6f0fa',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 24,
    textAlign: 'center',
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
    alignSelf: 'flex-end',
    color: '#4285F4',
    marginBottom: 12,
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
  
  logo: {
    width: 150,
    height: 150,
    resizeMode: 'contain',
    alignSelf: 'center',
    marginBottom: 24,
    borderRadius: 10, // Make it circular
  },
});
