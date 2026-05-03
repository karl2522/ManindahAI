import { Redirect } from 'expo-router';

export default function Index() {
  // By default, redirect to the auth flow for testing. 
  // Later we can add a check for the user's authentication state to redirect conditionally
  return <Redirect href="/(auth)/login" />;
}
