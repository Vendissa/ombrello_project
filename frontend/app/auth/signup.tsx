// app/auth/signup.tsx
import React, { useState } from 'react';
import {
  ScrollView,
  View,
  Text,
  TextInput,
  Pressable,
  TouchableOpacity,
  StyleSheet,
  Image,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';

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

  const toggleRole = () => setIsVendor(prev => !prev);

  const handleSignup = () => {
    // basic required‐field check
    if (isVendor) {
      if (!shopName || !shopOwnerName || !businessRegNo || !telephone || !email) {
        setError('Please fill in all vendor fields.');
        return;
      }
    } else {
      if (!firstName || !telephone || !email) {
        setError('Please fill in all borrower fields.');
        return;
      }
    }
    if (!password || !confirmPassword) {
      setError('Please enter and confirm your password.');
      return;
    }
    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    console.log('Signing up as', isVendor ? 'Vendor' : 'Borrower', {
      firstName,
      shopName,
      shopOwnerName,
      businessRegNo,
      telephone,
      email,
    });
    // TODO: your signup logic
    router.replace('/auth/login');
  };

  return (
    <ScrollView contentContainerStyle={{ 
      ...styles.container, 
      backgroundColor: isVendor ? '#f3faf4' : '#f4f8ff' 
      }}
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
          style={styles.input}
          placeholder="First Name"
          value={firstName}
          onChangeText={setFirstName}
          placeholderTextColor="#999"
        />
      ) : (
        <>
          <TextInput
            style={styles.input}
            placeholder="Shop Name"
            value={shopName}
            onChangeText={setShopName}
            placeholderTextColor="#999"
          />
          <TextInput
            style={styles.input}
            placeholder="Shop Owner Name"
            value={shopOwnerName}
            onChangeText={setShopOwnerName}
            placeholderTextColor="#999"
          />
          <TextInput
            style={styles.input}
            placeholder="Business Registration No."
            value={businessRegNo}
            onChangeText={setBusinessRegNo}
            placeholderTextColor="#999"
          />
        </>
      )}

      <TextInput
        style={styles.input}
        placeholder="Mobile Phone Number"
        value={telephone}
        onChangeText={setTelephone}
        keyboardType="phone-pad"
        placeholderTextColor="#999"
      />

      <TextInput
        style={styles.input}
        placeholder="Email"
        value={email}
        onChangeText={setEmail}
        keyboardType="email-address"
        autoCapitalize="none"
        placeholderTextColor="#999"
      />

      {/* Password */}
      <View style={styles.passwordWrapper}>
        <TextInput
          style={styles.input}
          placeholder="Password"
          secureTextEntry={!showPassword}
          value={password}
          onChangeText={setPassword}
          placeholderTextColor="#999"
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
      <View style={styles.passwordWrapper}>
        <TextInput
          style={styles.input}
          placeholder="Confirm Password"
          secureTextEntry={!showConfirm}
          value={confirmPassword}
          onChangeText={setConfirmPassword}
          placeholderTextColor="#999"
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

      <Pressable style={styles.loginButton} onPress={handleSignup}>
        <Text style={styles.loginButtonText}>Sign Up</Text>
      </Pressable>

      <TouchableOpacity onPress={() => router.replace('/auth/login')}>
        <Text style={styles.forgotText}>Already have an account? Log in</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    padding: 24,
    justifyContent: 'center',
    // backgroundColor is now set dynamically inline
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
