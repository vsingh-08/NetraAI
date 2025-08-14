import { Tabs } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { View, Text, Pressable, Platform } from 'react-native';
import { useState, useEffect } from 'react';
import { Mic, Car, Camera, Navigation, MessageCircle } from 'lucide-react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import GlobalSpeechService from '../services/GlobalSpeechService';
import * as Haptics from 'expo-haptics';

function VoiceIndicator({ isListening, isProcessing }: { isListening: boolean; isProcessing: boolean }) {
  if (!isListening && !isProcessing) return null;

  return (
    <View style={{
      position: 'absolute',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: 'rgba(0, 0, 0, 0.8)',
      justifyContent: 'center',
      alignItems: 'center',
      zIndex: 1000,
    }}>
      <View style={{
        backgroundColor: isListening ? '#4285F4' : '#34A853',
        borderRadius: 80,
        padding: 30,
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 4,
        borderColor: '#FFFFFF',
      }}>
        <Mic size={48} color="#FFFFFF" />
      </View>
      
      <Text style={{
        color: '#FFFFFF',
        fontSize: 18,
        fontWeight: '700',
        marginTop: 20,
        textAlign: 'center',
      }}>
        {isListening ? 'Listening...' : 'Processing...'}
      </Text>
      
      <Text style={{
        color: '#CCCCCC',
        fontSize: 14,
        fontWeight: '400',
        marginTop: 8,
        textAlign: 'center',
      }}>
        {isListening ? 'Release to stop' : 'Please wait'}
      </Text>
    </View>
  );
}

function GlobalVoiceWrapper({ children }: { children: React.ReactNode }) {
  const [isListening, setIsListening] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);

  useEffect(() => {
    // Set up listening state callback
    GlobalSpeechService.setListeningStateCallback((listening) => {
      setIsListening(listening);
      if (!listening) {
        // Check if processing
        setIsProcessing(GlobalSpeechService.getProcessingState());
        
        // Clear processing state after delay
        setTimeout(() => {
          setIsProcessing(false);
        }, 3000);
      }
    });
  }, []);

  const handleLongPressStart = async () => {
    try {
      if (Platform.OS !== 'web') {
        await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
      }
      await GlobalSpeechService.startListening();
    } catch (error) {
      console.error('Error starting voice recognition:', error);
    }
  };

  const handleLongPressEnd = async () => {
    try {
      await GlobalSpeechService.stopListening();
    } catch (error) {
      console.error('Error stopping voice recognition:', error);
    }
  };

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <Pressable
        style={{ flex: 1 }}
        onLongPress={handleLongPressStart}
        onPressOut={handleLongPressEnd}
        delayLongPress={500}
        accessibilityLabel="Long press anywhere to activate voice commands"
        accessibilityHint="Hold down to speak a voice command, release when done"
      >
        {children}
        <VoiceIndicator isListening={isListening} isProcessing={isProcessing} />
      </Pressable>
    </GestureHandlerRootView>
  );
}

export default function RootLayout() {
  return (
    <GlobalVoiceWrapper>
      <StatusBar style="dark" backgroundColor="#FFFFFF" />
      <Tabs
        screenOptions={{
          tabBarActiveTintColor: '#000000',
          tabBarInactiveTintColor: '#666666',
          tabBarStyle: {
            backgroundColor: '#FFFFFF',
            borderTopWidth: 2,
            borderTopColor: '#000000',
            height: 80,
            paddingBottom: 10,
            paddingTop: 10,
          },
          tabBarLabelStyle: {
            fontSize: 12,
            fontWeight: '700',
            marginTop: 4,
          },
          headerStyle: {
            backgroundColor: '#FFFFFF',
            borderBottomWidth: 2,
            borderBottomColor: '#000000',
          },
          headerTitleStyle: {
            color: '#000000',
            fontSize: 20,
            fontWeight: '900',
          },
          headerTintColor: '#000000',
        }}
      >
        <Tabs.Screen
          name="index"
          options={{
            title: 'Voice Command',
            tabBarIcon: ({ color, size }) => <Mic color={color} size={size} />,
            headerTitle: 'Netra AI - Voice Assistant',
          }}
        />
        <Tabs.Screen
          name="booking"
          options={{
            title: 'Book Cab',
            tabBarIcon: ({ color, size }) => <Car color={color} size={size} />,
            headerTitle: 'Cab Booking',
          }}
        />
        <Tabs.Screen
          name="scanner"
          options={{
            title: 'Scan Plate',
            tabBarIcon: ({ color, size }) => <Camera color={color} size={size} />,
            headerTitle: 'License Scanner',
          }}
        />
        <Tabs.Screen
          name="navigation"
          options={{
            title: 'Navigate',
            tabBarIcon: ({ color, size }) => <Navigation color={color} size={size} />,
            headerTitle: 'Navigation Aid',
          }}
        />
        <Tabs.Screen
          name="assistant"
          options={{
            title: 'Assistant',
            tabBarIcon: ({ color, size }) => <MessageCircle color={color} size={size} />,
            headerTitle: 'AI Assistant',
          }}
        />
      </Tabs>
    </GlobalVoiceWrapper>
  );
}