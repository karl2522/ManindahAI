import { Redirect } from 'expo-router';

export default function Index() {
  // By default, redirect to the tabs or auth. 
  // For now, redirecting to (tabs)
  return <Redirect href="/(tabs)" />;
}
