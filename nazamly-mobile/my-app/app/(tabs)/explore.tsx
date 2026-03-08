import { Redirect } from 'expo-router';

// This screen is hidden from tabs and redirects to Home
export default function ExploreRedirect() {
  return <Redirect href="/(tabs)/HomePage" />;
}
