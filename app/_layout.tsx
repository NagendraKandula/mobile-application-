/// app/_layout.tsx
import {
  DarkTheme,
  DefaultTheme,
  ThemeProvider,
} from "@react-navigation/native";
import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { Text, View } from "react-native";
import "react-native-reanimated";

import { AuthContext, AuthProvider } from "@/context/AuthContext";
import { useColorScheme } from "@/hooks/use-color-scheme";
import { useContext } from "react";

export const unstable_settings = {
  anchor: "(tabs)",
};
export default function RootLayout() {
  return (
    <AuthProvider>
      <RootNavigation />
    </AuthProvider>
  );
}

function RootNavigation() {
  const { user, loading } = useContext(AuthContext);
  const colorScheme = useColorScheme();

  if (loading) {
    // Show a splash while auth state is being determined
    return (
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
        <Text>Loading...</Text>
      </View>
    );
  }

  return (
    <ThemeProvider value={colorScheme === "dark" ? DarkTheme : DefaultTheme}>
      <Stack>
        {!user ? (
          // Login screen if not authenticated
          <Stack.Screen name="auth/login" options={{ headerShown: false }} />
        ) : (
          // Main tabs after login
          <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        )}

        {/* Optional modal route */}
        <Stack.Screen
          name="modal"
          options={{ presentation: "modal", title: "Modal" }}
        />
      </Stack>
      <StatusBar style="auto" />
    </ThemeProvider>
  );
}
