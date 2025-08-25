import { Redirect } from 'expo-router';
import { useAuth } from '../context/Authcontext';

export default function Index() {
  const { user } = useAuth();

  if (!user) {
    return <Redirect href={'/auth/login' as any} />;
  }

  if (user.role === 'user') {
    return <Redirect href={'/user/index' as any} />;
  }

  if (user.role === 'vendor') {
    return <Redirect href={'/vendor/dashboard' as any} />;
  }

  return null;
}
