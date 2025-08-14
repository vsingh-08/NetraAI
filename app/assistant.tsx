import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, Alert, Vibration } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as Speech from 'expo-speech';
import { Car, MapPin, Clock, CheckCircle, Phone, Navigation } from 'lucide-react-native';
import { router } from 'expo-router';

interface BookingData {
  id: string;
  licensePlate: string;
  driverName: string;
  carModel: string;
  estimatedTime: number;
  status: 'searching' | 'confirmed' | 'arriving' | 'arrived';
}

export default function CabBookingScreen() {
  const [booking, setBooking] = useState<BookingData | null>(null);
  const [isBooking, setIsBooking] = useState(false);

  useEffect(() => {
    const announceScreen = async () => {
      await speak('Cab booking screen. Tap book ride to request a cab, or use voice commands.');
    };
    announceScreen();
  }, []);

  const speak = async (text: string) => {
    try {
      await Speech.speak(text, {
        language: 'en-US',
        pitch: 1.0,
        rate: 0.8,
        volume: 1.0,
      });
    } catch (error) {
      console.error('Speech error:', error);
    }
  };

  const generateMockBooking = (): BookingData => {
    const plateNumbers = ['MH12AB1234', 'DL01CD5678', 'KA03EF9012', 'TN09GH3456', 'UP16IJ7890'];
    const driverNames = ['Rajesh Kumar', 'Amit Singh', 'Priya Sharma', 'Vikram Patel', 'Sunita Devi'];
    const carModels = ['Maruti Swift', 'Hyundai i20', 'Honda City', 'Toyota Innova', 'Tata Nexon'];
    
    return {
      id: `RIDE${Date.now()}`,
      licensePlate: plateNumbers[Math.floor(Math.random() * plateNumbers.length)],
      driverName: driverNames[Math.floor(Math.random() * driverNames.length)],
      carModel: carModels[Math.floor(Math.random() * carModels.length)],
      estimatedTime: Math.floor(Math.random() * 10) + 3, // 3-12 minutes
      status: 'searching'
    };
  };

  const bookCab = async () => {
    setIsBooking(true);
    await speak('Searching for nearby cabs. Please wait.');
    Vibration.vibrate(200);

    // Simulate booking process
    setTimeout(async () => {
      const newBooking = generateMockBooking();
      setBooking(newBooking);
      setIsBooking(false);
      
      await speak(`Cab booked successfully! Your driver is ${newBooking.driverName} in a ${newBooking.carModel}. License plate number is ${newBooking.licensePlate.split('').join(' ')}. Estimated arrival time is ${newBooking.estimatedTime} minutes.`);
      Vibration.vibrate([200, 100, 200]);
      
      // Simulate status updates
      setTimeout(() => {
        setBooking(prev => prev ? { ...prev, status: 'confirmed' } : null);
        speak('Your cab has been confirmed and is on the way.');
      }, 2000);
      
      setTimeout(() => {
        setBooking(prev => prev ? { ...prev, status: 'arriving' } : null);
        speak('Your cab is arriving soon. Please be ready.');
        Vibration.vibrate(300);
      }, 8000);
    }, 3000);
  };

  const cancelBooking = async () => {
    await speak('Booking cancelled');
    Vibration.vibrate(100);
    setBooking(null);
  };

  const navigateToScanner = async () => {
    if (booking) {
      await speak('Opening license plate scanner to verify your cab');
      Vibration.vibrate(200);
      router.push('/scanner');
    } else {
      await speak('Please book a cab first');
    }
  };

  const StatusIndicator = ({ status }: { status: string }) => {
    const getStatusInfo = () => {
      switch (status) {
        case 'searching':
          return { color: '#4285F4', text: 'Searching...', icon: Clock };
        case 'confirmed':
          return { color: '#34A853', text: 'Confirmed', icon: CheckCircle };
        case 'arriving':
          return { color: '#FF9800', text: 'Arriving', icon: Navigation };
        case 'arrived':
          return { color: '#0F9D58', text: 'Arrived', icon: MapPin };
        default:
          return { color: '#666666', text: 'Unknown', icon: Clock };
      }
    };

    const { color, text, icon: Icon } = getStatusInfo();

    return (
      <View style={{
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: color,
        paddingHorizontal: 16,
        paddingVertical: 8,
        borderRadius: 20,
        marginVertical: 8,
      }}>
        <Icon size={20} color="#FFFFFF" />
        <Text style={{
          color: '#FFFFFF',
          fontWeight: '700',
          fontSize: 14,
          marginLeft: 8,
        }}>
          {text}
        </Text>
      </View>
    );
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#FFFFFF' }}>
      <View style={{ flex: 1, padding: 20 }}>
        {!booking ? (
          // Booking Request Screen
          <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
            <Car size={80} color="#000000" />
            
            <Text style={{
              fontSize: 24,
              fontWeight: '900',
              color: '#000000',
              textAlign: 'center',
              marginVertical: 20,
            }}>
              Book Your Cab
            </Text>
            
            <Text style={{
              fontSize: 16,
              fontWeight: '400',
              color: '#666666',
              textAlign: 'center',
              marginBottom: 40,
              lineHeight: 24,
            }}>
              Request a cab with voice commands or tap the button below. We'll find the nearest available driver for you.
            </Text>

            <TouchableOpacity
              onPress={bookCab}
              disabled={isBooking}
              style={{
                backgroundColor: isBooking ? '#4285F4' : '#000000',
                borderWidth: 3,
                borderColor: isBooking ? '#000000' : '#4285F4',
                borderRadius: 16,
                paddingVertical: 20,
                paddingHorizontal: 40,
                minWidth: 200,
                alignItems: 'center',
                shadowColor: '#000000',
                shadowOffset: { width: 4, height: 4 },
                shadowOpacity: 1,
                shadowRadius: 0,
                elevation: 8,
              }}
              accessibilityLabel={isBooking ? 'Searching for cab' : 'Book a cab now'}
              accessibilityRole="button"
            >
              <Text style={{
                fontSize: 18,
                fontWeight: '900',
                color: '#FFFFFF',
              }}>
                {isBooking ? 'Searching...' : 'Book Ride'}
              </Text>
            </TouchableOpacity>
          </View>
        ) : (
          // Booking Details Screen
          <View style={{ flex: 1 }}>
            <View style={{
              backgroundColor: '#F8F9FA',
              borderWidth: 3,
              borderColor: '#000000',
              borderRadius: 16,
              padding: 20,
              marginBottom: 20,
            }}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                <Text style={{
                  fontSize: 20,
                  fontWeight: '900',
                  color: '#000000',
                }}>
                  Booking Details
                </Text>
                <StatusIndicator status={booking.status} />
              </View>

              <View style={{ marginBottom: 12 }}>
                <Text style={{
                  fontSize: 14,
                  fontWeight: '700',
                  color: '#666666',
                  marginBottom: 4,
                }}>
                  Driver Name
                </Text>
                <Text style={{
                  fontSize: 18,
                  fontWeight: '700',
                  color: '#000000',
                }}>
                  {booking.driverName}
                </Text>
              </View>

              <View style={{ marginBottom: 12 }}>
                <Text style={{
                  fontSize: 14,
                  fontWeight: '700',
                  color: '#666666',
                  marginBottom: 4,
                }}>
                  Car Model
                </Text>
                <Text style={{
                  fontSize: 18,
                  fontWeight: '700',
                  color: '#000000',
                }}>
                  {booking.carModel}
                </Text>
              </View>

              <View style={{ marginBottom: 12 }}>
                <Text style={{
                  fontSize: 14,
                  fontWeight: '700',
                  color: '#666666',
                  marginBottom: 4,
                }}>
                  License Plate
                </Text>
                <Text style={{
                  fontSize: 24,
                  fontWeight: '900',
                  color: '#000000',
                  letterSpacing: 2,
                }}>
                  {booking.licensePlate}
                </Text>
              </View>

              <View>
                <Text style={{
                  fontSize: 14,
                  fontWeight: '700',
                  color: '#666666',
                  marginBottom: 4,
                }}>
                  Estimated Arrival
                </Text>
                <Text style={{
                  fontSize: 18,
                  fontWeight: '700',
                  color: '#4285F4',
                }}>
                  {booking.estimatedTime} minutes
                </Text>
              </View>
            </View>

            {/* Action Buttons */}
            <View style={{ flex: 1, justifyContent: 'flex-end' }}>
              <TouchableOpacity
                onPress={navigateToScanner}
                style={{
                  backgroundColor: '#34A853',
                  borderWidth: 3,
                  borderColor: '#000000',
                  borderRadius: 12,
                  padding: 16,
                  marginBottom: 12,
                  flexDirection: 'row',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
                accessibilityLabel="Open camera to scan and verify license plate"
                accessibilityRole="button"
              >
                <Navigation size={24} color="#FFFFFF" />
                <Text style={{
                  fontSize: 16,
                  fontWeight: '700',
                  color: '#FFFFFF',
                  marginLeft: 8,
                }}>
                  Scan License Plate
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={cancelBooking}
                style={{
                  backgroundColor: '#EA4335',
                  borderWidth: 3,
                  borderColor: '#000000',
                  borderRadius: 12,
                  padding: 16,
                  flexDirection: 'row',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
                accessibilityLabel="Cancel current booking"
                accessibilityRole="button"
              >
                <Text style={{
                  fontSize: 16,
                  fontWeight: '700',
                  color: '#FFFFFF',
                }}>
                  Cancel Booking
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        )}
      </View>
    </SafeAreaView>
  );
}