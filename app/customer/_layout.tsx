import { Stack } from 'expo-router';

export default function CustomerLayout() {
  return (
    <Stack>
      <Stack.Screen
        name="index"
        options={{
          title: 'Dashboard',
          headerShown: false,
        }}
      />
      <Stack.Screen
        name="buy-points"
        options={{
          title: 'Buy Points',
          presentation: 'modal',
        }}
      />
      <Stack.Screen
        name="spend-points"
        options={{
          title: 'Spend Points',
          presentation: 'modal',
        }}
      />
      <Stack.Screen
        name="profile"
        options={{
          title: 'Tier Details',
          presentation: 'modal',
        }}
      />
      <Stack.Screen
        name="services"
        options={{
          title: 'Services & Products',
          presentation: 'modal',
          headerShown: false,
        }}
      />
      <Stack.Screen
        name="statement"
        options={{
          title: 'Statement',
          presentation: 'modal',
          headerShown: false,
        }}
      />
    </Stack>
  );
}
