import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, Vibration, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as Speech from 'expo-speech';
import * as Haptics from 'expo-haptics';
import { Navigation, MapPin, Compass, ArrowUp, ArrowRight, ArrowDown, ArrowLeft, Target, AlertTriangle, CheckCircle } from 'lucide-react-native';
import LocationService, { LocationCoordinates, NavigationRoute, DirectionFeedback } from '../services/LocationService';

interface NavigationStep {
  instruction: string;
  distance: string;
  direction: 'straight' | 'left' | 'right' | 'back';
  isCompleted: boolean;
}

export default function NavigationScreen() {
  const [isNavigating, setIsNavigating] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const [steps, setSteps] = useState<NavigationStep[]>([]);
  const [destination, setDestination] = useState('Your Cab Location');
  const [currentLocation, setCurrentLocation] = useState<LocationCoordinates | null>(null);
  const [cabLocation, setCabLocation] = useState<LocationCoordinates | null>(null);
  const [isLoadingLocation, setIsLoadingLocation] = useState(false);
  const [navigationRoute, setNavigationRoute] = useState<NavigationRoute | null>(null);
  const [directionFeedback, setDirectionFeedback] = useState<DirectionFeedback | null>(null);
  const [isOnRoute, setIsOnRoute] = useState(true);
  const [distanceToDestination, setDistanceToDestination] = useState<string>('');

  useEffect(() => {
    const initializeNavigation = async () => {
      await speak('Navigation assistant ready. Getting your location...');
      
      // Get current location
      setIsLoadingLocation(true);
      const location = await LocationService.getCurrentLocation();
      if (location) {
        setCurrentLocation(location);
        
        // Generate mock cab location near user
        const mockCabLocation = LocationService.generateMockCabLocation(location);
        setCabLocation(mockCabLocation);
        
        const distance = LocationService.formatDistance(
          LocationService.calculateDistance(location, mockCabLocation)
        );
        setDistanceToDestination(distance);
        
        await speak(`Location found. Your cab is approximately ${distance} away. Tap start navigation to get voice-guided directions with real-time feedback.`);
      } else {
        await speak('Unable to get your location. Navigation will use mock directions.');
      }
      setIsLoadingLocation(false);
    };
    
    initializeNavigation();

    // Cleanup on unmount
    return () => {
      LocationService.stopWatchingLocation();
      LocationService.stopNavigation();
    };
  }, []);

  const speak = async (text: string, options?: { interrupt?: boolean }) => {
    try {
      if (options?.interrupt) {
        await Speech.stop();
      }
      
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

  const startNavigation = async () => {
    setIsLoadingLocation(true);
    
    try {
      let route: NavigationRoute | null = null;
      
      if (currentLocation && cabLocation) {
        // Use real GPS navigation
        route = await LocationService.generateNavigation(cabLocation, currentLocation);
        
        if (route) {
          setNavigationRoute(route);
          
          // Convert route steps to display format
          const navigationSteps: NavigationStep[] = route.steps.map(step => ({
            instruction: step.instruction,
            distance: LocationService.formatDistance(step.distance),
            direction: step.direction.toLowerCase().includes('left') ? 'left' : 
                     step.direction.toLowerCase().includes('right') ? 'right' : 'straight',
            isCompleted: false,
          }));
          
          setSteps(navigationSteps);
          
          const totalDistance = LocationService.formatDistance(route.totalDistance);
          const totalTime = LocationService.formatDuration(route.totalDuration);
          
          await speak(`Starting real-time navigation to your cab. Total distance: ${totalDistance}. Estimated time: ${totalTime}. ${navigationSteps[0].instruction}`, { interrupt: true });
          
          // Start real-time location tracking with directional feedback
          LocationService.startWatchingLocation(
            (location) => {
              setCurrentLocation(location);
              
              // Update distance to destination
              if (cabLocation) {
                const distance = LocationService.formatDistance(
                  LocationService.calculateDistance(location, cabLocation)
                );
                setDistanceToDestination(distance);
              }
            },
            (error) => {
              console.error('Location tracking error:', error);
            }
          );
          
          // Start navigation with feedback
          LocationService.startNavigation(route, (feedback: DirectionFeedback) => {
            setDirectionFeedback(feedback);
            setIsOnRoute(feedback.isOnRoute);
            
            // Provide audio feedback for significant deviations
            if (!feedback.isOnRoute && feedback.distanceFromRoute > 30) {
              speak(`You are ${Math.round(feedback.distanceFromRoute)} meters off route. Please return to the path.`, { interrupt: false });
            }
          });
          
        } else {
          throw new Error('Failed to generate route');
        }
      } else {
        throw new Error('Location not available');
      }
      
      setIsNavigating(true);
      setCurrentStep(0);
      if (Platform.OS !== 'web') {
        await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
      }
      
    } catch (error) {
      console.error('Error starting navigation:', error);
      
      // Fallback to mock directions
      const mockSteps = generateMockDirections();
      setSteps(mockSteps);
      setIsNavigating(true);
      setCurrentStep(0);
      await speak(`Starting navigation to ${destination}. ${mockSteps[0].instruction}. Distance: ${mockSteps[0].distance}.`);
      if (Platform.OS !== 'web') {
        await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
      }
    } finally {
      setIsLoadingLocation(false);
    }
  };

  const generateMockDirections = (): NavigationStep[] => {
    return [
      {
        instruction: 'Head north toward the main road',
        distance: '50 meters',
        direction: 'straight',
        isCompleted: false,
      },
      {
        instruction: 'Turn right at the traffic signal',
        distance: '100 meters',
        direction: 'right',
        isCompleted: false,
      },
      {
        instruction: 'Continue straight past the bus stop',
        distance: '150 meters',
        direction: 'straight',
        isCompleted: false,
      },
      {
        instruction: 'Turn left into the parking area',
        distance: '30 meters',
        direction: 'left',
        isCompleted: false,
      },
      {
        instruction: 'Your cab is waiting near the entrance',
        distance: '20 meters',
        direction: 'straight',
        isCompleted: false,
      },
    ];
  };

  const nextStep = async () => {
    if (currentStep < steps.length - 1) {
      // Mark current step as completed
      const updatedSteps = [...steps];
      updatedSteps[currentStep].isCompleted = true;
      setSteps(updatedSteps);
      
      const nextStepIndex = currentStep + 1;
      setCurrentStep(nextStepIndex);
      
      const nextInstruction = steps[nextStepIndex];
      await speak(`Step completed. Next: ${nextInstruction.instruction}. Distance: ${nextInstruction.distance}.`);
      if (Platform.OS !== 'web') {
        await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      }
    } else {
      // Navigation completed
      const updatedSteps = [...steps];
      updatedSteps[currentStep].isCompleted = true;
      setSteps(updatedSteps);
      
      await speak('Navigation completed! You have arrived at your cab location. Look for your booked vehicle.');
      if (Platform.OS !== 'web') {
        await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        Vibration.vibrate([300, 100, 300, 100, 300]);
      }
      
      // Stop navigation
      LocationService.stopNavigation();
      LocationService.stopWatchingLocation();
      setIsNavigating(false);
    }
  };

  const repeatInstruction = async () => {
    if (isNavigating && steps[currentStep]) {
      const instruction = steps[currentStep];
      const routeStatus = isOnRoute ? 'You are on the correct route.' : 'You are off route. Please return to the path.';
      await speak(`Current instruction: ${instruction.instruction}. Distance: ${instruction.distance}. ${routeStatus}`);
      if (Platform.OS !== 'web') {
        await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      }
    }
  };

  const stopNavigation = async () => {
    LocationService.stopNavigation();
    LocationService.stopWatchingLocation();
    setIsNavigating(false);
    setSteps([]);
    setCurrentStep(0);
    setDirectionFeedback(null);
    setIsOnRoute(true);
    await speak('Navigation stopped');
    if (Platform.OS !== 'web') {
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
  };

  const getDirectionIcon = (direction: string) => {
    switch (direction) {
      case 'straight':
        return ArrowUp;
      case 'right':
        return ArrowRight;
      case 'left':
        return ArrowLeft;
      case 'back':
        return ArrowDown;
      default:
        return ArrowUp;
    }
  };

  const DirectionIndicator = ({ direction, size = 48 }: { direction: string, size?: number }) => {
    const Icon = getDirectionIcon(direction);
    const backgroundColor = isOnRoute ? '#4285F4' : '#EA4335';
    
    return (
      <View style={{
        backgroundColor,
        borderRadius: size / 2,
        padding: 12,
        alignItems: 'center',
        justifyContent: 'center',
      }}>
        <Icon size={size} color="#FFFFFF" />
      </View>
    );
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#FFFFFF' }}>
      <View style={{ flex: 1, padding: 20 }}>
        {!isNavigating ? (
          // Start Navigation Screen
          <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
            <Compass size={80} color="#000000" />
            
            <Text style={{
              fontSize: 24,
              fontWeight: '900',
              color: '#000000',
              textAlign: 'center',
              marginVertical: 20,
            }}>
              Real-Time Navigation
            </Text>
            
            <Text style={{
              fontSize: 16,
              fontWeight: '400',
              color: '#666666',
              textAlign: 'center',
              marginBottom: 20,
              lineHeight: 24,
            }}>
              Get voice-guided walking directions with real-time GPS tracking and haptic feedback for wrong turns.
            </Text>

            <View style={{
              backgroundColor: '#F8F9FA',
              borderWidth: 3,
              borderColor: '#000000',
              borderRadius: 12,
              padding: 16,
              marginBottom: 30,
              width: '100%',
            }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8 }}>
                <MapPin size={20} color="#4285F4" />
                <Text style={{
                  fontSize: 14,
                  fontWeight: '700',
                  color: '#666666',
                  marginLeft: 8,
                }}>
                  Destination
                </Text>
              </View>
              <Text style={{
                fontSize: 18,
                fontWeight: '700',
                color: '#000000',
                marginBottom: 4,
              }}>
                {destination}
              </Text>
              {distanceToDestination && (
                <Text style={{
                  fontSize: 14,
                  fontWeight: '400',
                  color: '#4285F4',
                }}>
                  Distance: {distanceToDestination}
                </Text>
              )}
            </View>

            <TouchableOpacity
              onPress={startNavigation}
              disabled={isLoadingLocation}
              style={{
                backgroundColor: isLoadingLocation ? '#666666' : '#000000',
                borderWidth: 3,
                borderColor: '#4285F4',
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
              accessibilityLabel="Start real-time navigation to cab"
              accessibilityRole="button"
            >
              <Text style={{
                fontSize: 18,
                fontWeight: '900',
                color: '#FFFFFF',
              }}>
                {isLoadingLocation ? 'Getting Location...' : 'Start Navigation'}
              </Text>
            </TouchableOpacity>
          </View>
        ) : (
          // Active Navigation Screen
          <View style={{ flex: 1 }}>
            {/* Route Status Indicator */}
            {directionFeedback && (
              <View style={{
                backgroundColor: isOnRoute ? '#34A853' : '#EA4335',
                borderRadius: 12,
                padding: 12,
                marginBottom: 16,
                flexDirection: 'row',
                alignItems: 'center',
              }}>
                {isOnRoute ? (
                  <CheckCircle size={20} color="#FFFFFF" />
                ) : (
                  <AlertTriangle size={20} color="#FFFFFF" />
                )}
                <Text style={{
                  color: '#FFFFFF',
                  fontSize: 14,
                  fontWeight: '700',
                  marginLeft: 8,
                }}>
                  {isOnRoute 
                    ? 'On Route' 
                    : `Off Route (${Math.round(directionFeedback.distanceFromRoute)}m away)`}
                </Text>
              </View>
            )}

            {/* Current Step Display */}
            <View style={{
              backgroundColor: '#F8F9FA',
              borderWidth: 3,
              borderColor: isOnRoute ? '#000000' : '#EA4335',
              borderRadius: 16,
              padding: 20,
              marginBottom: 20,
              alignItems: 'center',
            }}>
              <DirectionIndicator direction={steps[currentStep]?.direction || 'straight'} />
              
              <Text style={{
                fontSize: 20,
                fontWeight: '900',
                color: '#000000',
                textAlign: 'center',
                marginVertical: 16,
                lineHeight: 28,
              }}>
                {steps[currentStep]?.instruction}
              </Text>
              
              <Text style={{
                fontSize: 16,
                fontWeight: '700',
                color: '#4285F4',
              }}>
                {steps[currentStep]?.distance}
              </Text>
              
              <Text style={{
                fontSize: 14,
                fontWeight: '400',
                color: '#666666',
                marginTop: 8,
              }}>
                Step {currentStep + 1} of {steps.length}
              </Text>

              {distanceToDestination && (
                <Text style={{
                  fontSize: 12,
                  fontWeight: '400',
                  color: '#666666',
                  marginTop: 4,
                }}>
                  {distanceToDestination} to destination
                </Text>
              )}
            </View>

            {/* Progress Steps */}
            <View style={{
              backgroundColor: '#FFFFFF',
              borderWidth: 2,
              borderColor: '#E0E0E0',
              borderRadius: 12,
              padding: 16,
              marginBottom: 20,
              maxHeight: 200,
            }}>
              <Text style={{
                fontSize: 16,
                fontWeight: '700',
                color: '#000000',
                marginBottom: 12,
              }}>
                Navigation Steps
              </Text>
              
              {steps.map((step, index) => (
                <View
                  key={index}
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    marginBottom: 8,
                    opacity: step.isCompleted ? 0.6 : (index === currentStep ? 1 : 0.4),
                  }}
                >
                  <View style={{
                    width: 20,
                    height: 20,
                    borderRadius: 10,
                    backgroundColor: step.isCompleted ? '#34A853' : (index === currentStep ? '#4285F4' : '#E0E0E0'),
                    marginRight: 12,
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}>
                    <Text style={{
                      fontSize: 12,
                      fontWeight: '700',
                      color: '#FFFFFF',
                    }}>
                      {index + 1}
                    </Text>
                  </View>
                  
                  <Text style={{
                    fontSize: 14,
                    fontWeight: step.isCompleted ? '400' : '700',
                    color: step.isCompleted ? '#666666' : '#000000',
                    flex: 1,
                    textDecorationLine: step.isCompleted ? 'line-through' : 'none',
                  }}>
                    {step.instruction}
                  </Text>
                </View>
              ))}
            </View>

            {/* Control Buttons */}
            <View style={{ flex: 1, justifyContent: 'flex-end' }}>
              <View style={{ flexDirection: 'row', marginBottom: 12 }}>
                <TouchableOpacity
                  onPress={repeatInstruction}
                  style={{
                    flex: 1,
                    backgroundColor: '#666666',
                    borderWidth: 2,
                    borderColor: '#000000',
                    borderRadius: 12,
                    padding: 16,
                    marginRight: 6,
                    alignItems: 'center',
                  }}
                  accessibilityLabel="Repeat current navigation instruction"
                  accessibilityRole="button"
                >
                  <Text style={{
                    fontSize: 14,
                    fontWeight: '700',
                    color: '#FFFFFF',
                  }}>
                    Repeat
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  onPress={nextStep}
                  style={{
                    flex: 2,
                    backgroundColor: '#34A853',
                    borderWidth: 2,
                    borderColor: '#000000',
                    borderRadius: 12,
                    padding: 16,
                    marginLeft: 6,
                    alignItems: 'center',
                  }}
                  accessibilityLabel={currentStep < steps.length - 1 ? 'Move to next navigation step' : 'Complete navigation'}
                  accessibilityRole="button"
                >
                  <Text style={{
                    fontSize: 16,
                    fontWeight: '700',
                    color: '#FFFFFF',
                  }}>
                    {currentStep < steps.length - 1 ? 'Next Step' : 'Complete'}
                  </Text>
                </TouchableOpacity>
              </View>

              <TouchableOpacity
                onPress={stopNavigation}
                style={{
                  backgroundColor: '#EA4335',
                  borderWidth: 2,
                  borderColor: '#000000',
                  borderRadius: 12,
                  padding: 16,
                  alignItems: 'center',
                }}
                accessibilityLabel="Stop navigation"
                accessibilityRole="button"
              >
                <Text style={{
                  fontSize: 16,
                  fontWeight: '700',
                  color: '#FFFFFF',
                }}>
                  Stop Navigation
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        )}
      </View>
    </SafeAreaView>
  );
}