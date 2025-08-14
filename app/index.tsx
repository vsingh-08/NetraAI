import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Mic, Car, Camera, Navigation, MessageCircle, Volume2 } from 'lucide-react-native';
import { router } from 'expo-router';
import GlobalSpeechService from '../services/GlobalSpeechService';
import * as Haptics from 'expo-haptics';

export default function VoiceCommandScreen() {
  const [isListening, setIsListening] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);

  useEffect(() => {
    const announceScreen = async () => {
      await GlobalSpeechService.speak('Welcome to Netra AI. Your voice-operated navigation and cab assistance app. Long press anywhere on the screen to activate voice commands, or use the buttons below.');
    };
    
    announceScreen();

    // Set up listening state callback
    GlobalSpeechService.setListeningStateCallback((listening) => {
      setIsListening(listening);
      if (!listening) {
        setIsProcessing(GlobalSpeechService.getProcessingState());
        
        // Clear processing state after delay
        setTimeout(() => {
          setIsProcessing(false);
        }, 3000);
      }
    });
  }, []);

  const handleVoiceCommand = async () => {
    try {
      if (isListening || isProcessing) {
        await GlobalSpeechService.stopListening();
        return;
      }

      if (Platform.OS !== 'web') {
        await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
      }
      await GlobalSpeechService.startListening();
    } catch (error) {
      console.error('Error with voice command:', error);
      await GlobalSpeechService.speak('Sorry, voice recognition is not available right now. Please use the buttons below.');
    }
  };

  const ActionButton = ({ 
    icon: Icon, 
    title, 
    onPress, 
    description,
    color = '#000000'
  }: { 
    icon: any, 
    title: string, 
    onPress: () => void, 
    description: string,
    color?: string
  }) => (
    <TouchableOpacity
      onPress={onPress}
      style={{
        backgroundColor: '#FFFFFF',
        borderWidth: 3,
        borderColor: color,
        borderRadius: 16,
        padding: 20,
        margin: 8,
        alignItems: 'center',
        minHeight: 120,
        justifyContent: 'center',
        shadowColor: '#000000',
        shadowOffset: { width: 4, height: 4 },
        shadowOpacity: 1,
        shadowRadius: 0,
        elevation: 8,
      }}
      accessibilityLabel={`${title}. ${description}`}
      accessibilityRole="button"
    >
      <Icon size={32} color={color} />
      <Text style={{
        fontSize: 16,
        fontWeight: '900',
        color: color,
        marginTop: 8,
        textAlign: 'center',
      }}>
        {title}
      </Text>
      <Text style={{
        fontSize: 12,
        fontWeight: '400',
        color: '#666666',
        marginTop: 4,
        textAlign: 'center',
      }}>
        {description}
      </Text>
    </TouchableOpacity>
  );

  const handleBookCab = async () => {
    await GlobalSpeechService.speak('Opening cab booking.');
    router.push('/booking');
  };

  const handleScanPlate = async () => {
    await GlobalSpeechService.speak('Opening license plate scanner.');
    router.push('/scanner');
  };

  const handleNavigate = async () => {
    await GlobalSpeechService.speak('Opening navigation assistant.');
    router.push('/navigation');
  };

  const handleAssistant = async () => {
    await GlobalSpeechService.speak('Opening AI assistant.');
    router.push('/assistant');
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#FFFFFF' }}>
      <View style={{ flex: 1, padding: 20 }}>
        {/* Voice Command Instructions */}
        <View style={{
          backgroundColor: '#F8F9FA',
          borderWidth: 2,
          borderColor: '#4285F4',
          borderRadius: 12,
          padding: 16,
          marginBottom: 20,
        }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8 }}>
            <Volume2 size={20} color="#4285F4" />
            <Text style={{
              fontSize: 14,
              fontWeight: '700',
              color: '#4285F4',
              marginLeft: 8,
            }}>
              Voice Commands Available
            </Text>
          </View>
          <Text style={{
            fontSize: 12,
            fontWeight: '400',
            color: '#666666',
            lineHeight: 16,
          }}>
            Long press anywhere to activate voice control. Try saying: "book a cab", "scan the plate", "navigate me", or "help me"
          </Text>
        </View>

        {/* Main Voice Button */}
        <View style={{ alignItems: 'center', marginVertical: 30 }}>
          <TouchableOpacity
            onPress={handleVoiceCommand}
            style={{
              width: 120,
              height: 120,
              borderRadius: 60,
              backgroundColor: isListening ? '#4285F4' : (isProcessing ? '#34A853' : '#000000'),
              justifyContent: 'center',
              alignItems: 'center',
              borderWidth: 4,
              borderColor: isListening ? '#000000' : '#4285F4',
              shadowColor: '#000000',
              shadowOffset: { width: 6, height: 6 },
              shadowOpacity: 1,
              shadowRadius: 0,
              elevation: 12,
            }}
            accessibilityLabel={
              isListening ? 'Listening for voice command' : 
              isProcessing ? 'Processing voice command' : 
              'Tap to give voice command'
            }
            accessibilityRole="button"
          >
            <Mic size={48} color="#FFFFFF" />
          </TouchableOpacity>
          
          <Text style={{
            fontSize: 18,
            fontWeight: '700',
            color: '#000000',
            marginTop: 16,
            textAlign: 'center',
          }}>
            {isListening ? 'Listening...' : 
             isProcessing ? 'Processing...' : 
             'Tap to Speak'}
          </Text>
          
          <Text style={{
            fontSize: 14,
            fontWeight: '400',
            color: '#666666',
            marginTop: 4,
            textAlign: 'center',
          }}>
            {isListening ? 'Release to stop' : 
             isProcessing ? 'Please wait' : 
             'Or long press anywhere'}
          </Text>
        </View>

        {/* Action Buttons Grid */}
        <Text style={{
          fontSize: 20,
          fontWeight: '900',
          color: '#000000',
          marginBottom: 16,
          textAlign: 'center',
        }}>
          Quick Actions
        </Text>

        <View style={{ 
          flexDirection: 'row', 
          flexWrap: 'wrap', 
          justifyContent: 'space-between',
          flex: 1,
        }}>
          <View style={{ width: '48%' }}>
            <ActionButton
              icon={Car}
              title="Book Cab"
              description="Request a ride"
              onPress={handleBookCab}
              color="#4285F4"
            />
          </View>
          
          <View style={{ width: '48%' }}>
            <ActionButton
              icon={Camera}
              title="Scan Plate"
              description="Detect license plate"
              onPress={handleScanPlate}
              color="#34A853"
            />
          </View>
          
          <View style={{ width: '48%' }}>
            <ActionButton
              icon={Navigation}
              title="Navigate"
              description="Get directions"
              onPress={handleNavigate}
              color="#EA4335"
            />
          </View>
          
          <View style={{ width: '48%' }}>
            <ActionButton
              icon={MessageCircle}
              title="Assistant"
              description="Ask questions"
              onPress={handleAssistant}
              color="#FBBC04"
            />
          </View>
        </View>

        {/* Help Text */}
        <View style={{
          backgroundColor: '#F8F9FA',
          borderRadius: 8,
          padding: 12,
          marginTop: 16,
        }}>
          <Text style={{
            fontSize: 12,
            fontWeight: '400',
            color: '#666666',
            textAlign: 'center',
            lineHeight: 16,
          }}>
            Designed for visually impaired users • Full voice control • Haptic feedback • High contrast UI
          </Text>
        </View>
      </View>
    </SafeAreaView>
  );
}