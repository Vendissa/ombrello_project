import { Slot } from 'expo-router';
import { AuthProvider } from '../context/Authcontext';

export default function Layout() {
  return (
    <AuthProvider>
      <Slot />
    </AuthProvider>
  );
}
