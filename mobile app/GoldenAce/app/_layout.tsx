import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { View } from 'react-native';
import 'react-native-reanimated';
import { AuthProvider } from '../src/contexts/AuthContext';
import { WebSocketProvider } from '../src/contexts/WebSocketContext';
import { NotificationProvider } from '../src/contexts/NotificationContext';
import { ChatProvider } from '../src/contexts/ChatContext';
import { Colors } from '../src/constants/theme';

export default function RootLayout() {
  return (
    <AuthProvider>
      <WebSocketProvider>
        <NotificationProvider>
          <ChatProvider>
            <View style={{ flex: 1, backgroundColor: Colors.background }}>
            <Stack
              screenOptions={{
                headerShown: false,
                contentStyle: { backgroundColor: Colors.background },
                animation: 'slide_from_right',
              }}
            >
              <Stack.Screen name="index" />
              <Stack.Screen name="login" />
              <Stack.Screen name="register" />
              <Stack.Screen name="(player)" options={{ headerShown: false }} />
              <Stack.Screen name="(client)" options={{ headerShown: false }} />
              <Stack.Screen
                name="chat/[friendId]"
                options={{
                  headerShown: true,
                  presentation: 'card',
                  animation: 'slide_from_right',
                }}
              />
              <Stack.Screen
                name="support/index"
                options={{
                  headerShown: true,
                  presentation: 'card',
                  animation: 'slide_from_right',
                }}
              />
              <Stack.Screen
                name="privacy"
                options={{
                  headerShown: true,
                  presentation: 'card',
                  animation: 'slide_from_right',
                }}
              />
              <Stack.Screen
                name="terms"
                options={{
                  headerShown: true,
                  presentation: 'card',
                  animation: 'slide_from_right',
                }}
              />
              <Stack.Screen
                name="reviews/index"
                options={{
                  headerShown: true,
                  presentation: 'card',
                  animation: 'slide_from_right',
                }}
              />
            </Stack>
            <StatusBar style="light" />
            </View>
          </ChatProvider>
        </NotificationProvider>
      </WebSocketProvider>
    </AuthProvider>
  );
}
