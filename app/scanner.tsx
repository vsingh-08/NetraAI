import React, { useState, useEffect, useRef } from 'react';
import { View, Text, TouchableOpacity, Vibration, Dimensions, Alert, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { CameraView, CameraType, useCameraPermissions } from 'expo-camera';
import * as Speech from 'expo-speech';
import * as Haptics from 'expo-haptics';
import { Camera, Scan, CheckCircle, XCircle, RotateCcw, Flashlight, Target } from 'lucide-react-native';
import CameraService, { LicensePlateResult } from '../services/CameraService';

const { width, height } = Dimensions.get('window');

export default function LicenseScannerScreen() {
  const [permission, requestPermission] = useCameraPermissions();
  const [facing, setFacing] = useState<CameraType>('back');
  const [isScanning, setIsScanning] = useState(false);
  const [isContinuousScanning, setIsContinuousScanning] = useState(false);
  const [detectedPlate, setDetectedPlate] = useState<string | null>(null);
  const [isFlashOn, setIsFlashOn] = useState(false);
  const [scanResult, setScanResult] = useState<'match' | 'no-match' | null>(null);
  const [confidence, setConfidence] = useState<number>(0);
  const [scanCount, setScanCount] = useState(0);
  const cameraRef = useRef<CameraView>(null);
  const continuousScanRef = useRef<(() => void) | null>(null);

  // Mock booked license plate (in real app, this would come from booking state)
  const bookedPlate = 'MH12AB1234';

  useEffect(() => {
    const announceScreen = async () => {
      await speak('License plate scanner ready. Point camera at license plate and tap scan, or use voice commands. Long press anywhere to activate voice control.');
    };
    announceScreen();

    // Cleanup continuous scanning on unmount
    return () => {
      if (continuousScanRef.current) {
        continuousScanRef.current();
      }
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

  const scanLicensePlate = async () => {
    if (!permission?.granted) {
      await speak('Camera permission required. Please grant camera access.');
      requestPermission();
      return;
    }

    if (isScanning) {
      return;
    }

    setIsScanning(true);
    setScanCount(prev => prev + 1);
    await speak('Scanning license plate. Hold steady.', { interrupt: true });
    if (Platform.OS !== 'web') {
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    }

    try {
      const result = await CameraService.detectLicensePlate(cameraRef, bookedPlate, {
        quality: 0.8,
        base64: true,
      });

      setDetectedPlate(result.plateNumber);
      setConfidence(result.confidence);
      setScanResult(result.isMatch ? 'match' : 'no-match');
      setIsScanning(false);

      // Enhanced feedback based on result
      if (result.isMatch) {
        await speak(`License plate detected: ${CameraService.formatPlateForSpeech(result.plateNumber)}. This matches your booked cab! Your cab is here. Confidence: ${Math.round(result.confidence * 100)} percent.`, { interrupt: true });
        if (Platform.OS !== 'web') {
          await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
          Vibration.vibrate([300, 100, 300, 100, 300]);
        }
      } else {
        const state = CameraService.getStateFromPlate(result.plateNumber);
        await speak(`License plate detected: ${CameraService.formatPlateForSpeech(result.plateNumber)} from ${state}. This does not match your booked cab. Expected plate: ${CameraService.formatPlateForSpeech(bookedPlate)}. Confidence: ${Math.round(result.confidence * 100)} percent.`, { interrupt: true });
        if (Platform.OS !== 'web') {
          await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
          Vibration.vibrate([100, 100, 100, 100, 100]);
        }
      }

    } catch (error) {
      console.error('Error during scanning:', error);
      setIsScanning(false);
      await speak('Scanning failed. Please ensure the license plate is clearly visible and try again.');
      if (Platform.OS !== 'web') {
        await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      }
    }
  };

  const startContinuousScanning = async () => {
    if (!permission?.granted) {
      await speak('Camera permission required. Please grant camera access.');
      requestPermission();
      return;
    }

    if (isContinuousScanning) {
      stopContinuousScanning();
      return;
    }

    setIsContinuousScanning(true);
    await speak('Starting continuous scanning. I will automatically detect license plates and notify you when your cab arrives.', { interrupt: true });
    if (Platform.OS !== 'web') {
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }

    try {
      const stopScanning = await CameraService.startContinuousScanning(
        cameraRef,
        bookedPlate,
        async (result: LicensePlateResult) => {
          setDetectedPlate(result.plateNumber);
          setConfidence(result.confidence);
          setScanResult(result.isMatch ? 'match' : 'no-match');
          setScanCount(prev => prev + 1);

          if (result.isMatch) {
            await speak(`Your cab has arrived! License plate: ${CameraService.formatPlateForSpeech(result.plateNumber)}. This is your booked vehicle.`, { interrupt: true });
            if (Platform.OS !== 'web') {
              await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
              Vibration.vibrate([500, 200, 500, 200, 500]);
            }
            setIsContinuousScanning(false);
          } else {
            // Subtle feedback for non-matching plates
            if (Platform.OS !== 'web') {
              await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            }
          }
        },
        async (error: string) => {
          console.error('Continuous scanning error:', error);
          if (Platform.OS !== 'web') {
            await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
          }
        },
        2500 // Scan every 2.5 seconds
      );

      continuousScanRef.current = stopScanning;

    } catch (error) {
      console.error('Error starting continuous scanning:', error);
      setIsContinuousScanning(false);
      await speak('Failed to start continuous scanning. Please try manual scanning.');
    }
  };

  const stopContinuousScanning = async () => {
    if (continuousScanRef.current) {
      continuousScanRef.current();
      continuousScanRef.current = null;
    }
    setIsContinuousScanning(false);
    await speak('Continuous scanning stopped.');
    if (Platform.OS !== 'web') {
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
  };

  const resetScan = async () => {
    if (continuousScanRef.current) {
      continuousScanRef.current();
      continuousScanRef.current = null;
    }
    setDetectedPlate(null);
    setScanResult(null);
    setConfidence(0);
    setScanCount(0);
    setIsContinuousScanning(false);
    await speak('Scanner reset. Ready to scan again.');
  };

  const toggleFlash = async () => {
    setIsFlashOn(!isFlashOn);
    await speak(isFlashOn ? 'Flash turned off' : 'Flash turned on');
    if (Platform.OS !== 'web') {
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
  };

  const switchCamera = async () => {
    setFacing(current => (current === 'back' ? 'front' : 'back'));
    await speak(facing === 'back' ? 'Switched to front camera' : 'Switched to back camera');
    if (Platform.OS !== 'web') {
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
  };

  if (!permission) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: '#FFFFFF' }}>
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20 }}>
          <Text style={{ fontSize: 18, fontWeight: '700', textAlign: 'center' }}>
            Requesting camera permission...
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!permission.granted) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: '#FFFFFF' }}>
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20 }}>
          <Camera size={80} color="#000000" />
          <Text style={{
            fontSize: 20,
            fontWeight: '900',
            color: '#000000',
            textAlign: 'center',
            marginVertical: 20,
          }}>
            Camera Access Required
          </Text>
          <Text style={{
            fontSize: 16,
            fontWeight: '400',
            color: '#666666',
            textAlign: 'center',
            marginBottom: 30,
            lineHeight: 24,
          }}>
            We need camera access to scan license plates and help you identify your cab safely.
          </Text>
          <TouchableOpacity
            onPress={requestPermission}
            style={{
              backgroundColor: '#000000',
              borderWidth: 3,
              borderColor: '#4285F4',
              borderRadius: 12,
              paddingVertical: 16,
              paddingHorizontal: 32,
            }}
          >
            <Text style={{
              fontSize: 16,
              fontWeight: '700',
              color: '#FFFFFF',
            }}>
              Grant Camera Access
            </Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#000000' }}>
      <View style={{ flex: 1 }}>
        {/* Camera View */}
        <View style={{ flex: 1, position: 'relative' }}>
          <CameraView
            ref={cameraRef}
            style={{ flex: 1 }}
            facing={facing}
            flash={isFlashOn ? 'on' : 'off'}
          />
          
          {/* Scanning Overlay */}
          <View style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            justifyContent: 'center',
            alignItems: 'center',
          }}>
            {/* Scanning Frame */}
            <View style={{
              width: width * 0.85,
              height: 140,
              borderWidth: 4,
              borderColor: isScanning || isContinuousScanning ? '#4285F4' : '#FFFFFF',
              borderRadius: 16,
              backgroundColor: 'rgba(0,0,0,0.4)',
              justifyContent: 'center',
              alignItems: 'center',
              position: 'relative',
            }}>
              {/* Scanning Animation */}
              {(isScanning || isContinuousScanning) && (
                <View style={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  right: 0,
                  height: 4,
                  backgroundColor: '#4285F4',
                  opacity: 0.8,
                }} />
              )}
              
              {/* Corner Markers */}
              <View style={{ position: 'absolute', top: -4, left: -4, width: 20, height: 20, borderTopWidth: 4, borderLeftWidth: 4, borderColor: '#4285F4' }} />
              <View style={{ position: 'absolute', top: -4, right: -4, width: 20, height: 20, borderTopWidth: 4, borderRightWidth: 4, borderColor: '#4285F4' }} />
              <View style={{ position: 'absolute', bottom: -4, left: -4, width: 20, height: 20, borderBottomWidth: 4, borderLeftWidth: 4, borderColor: '#4285F4' }} />
              <View style={{ position: 'absolute', bottom: -4, right: -4, width: 20, height: 20, borderBottomWidth: 4, borderRightWidth: 4, borderColor: '#4285F4' }} />
              
              <Target size={32} color="#FFFFFF" style={{ opacity: 0.8 }} />
              <Text style={{
                color: '#FFFFFF',
                fontSize: 16,
                fontWeight: '700',
                textAlign: 'center',
                marginTop: 8,
              }}>
                {isScanning ? 'Scanning...' : 
                 isContinuousScanning ? 'Auto-Scanning...' : 
                 'Align license plate here'}
              </Text>
            </View>

            {/* Expected Plate Info */}
            <View style={{
              position: 'absolute',
              top: 60,
              left: 20,
              right: 20,
              backgroundColor: 'rgba(0,0,0,0.8)',
              borderRadius: 12,
              padding: 16,
            }}>
              <Text style={{
                color: '#FFFFFF',
                fontSize: 16,
                fontWeight: '700',
                textAlign: 'center',
                marginBottom: 4,
              }}>
                Expected: {bookedPlate}
              </Text>
              <Text style={{
                color: '#CCCCCC',
                fontSize: 12,
                fontWeight: '400',
                textAlign: 'center',
              }}>
                {CameraService.getStateFromPlate(bookedPlate)} • Scans: {scanCount}
              </Text>
            </View>

            {/* Continuous Scanning Status */}
            {isContinuousScanning && (
              <View style={{
                position: 'absolute',
                bottom: 200,
                left: 20,
                right: 20,
                backgroundColor: 'rgba(66, 133, 244, 0.9)',
                borderRadius: 12,
                padding: 12,
                alignItems: 'center',
              }}>
                <Text style={{
                  color: '#FFFFFF',
                  fontSize: 14,
                  fontWeight: '700',
                  textAlign: 'center',
                }}>
                  🔄 Auto-Scanning Active
                </Text>
                <Text style={{
                  color: '#FFFFFF',
                  fontSize: 12,
                  fontWeight: '400',
                  textAlign: 'center',
                  marginTop: 2,
                }}>
                  I'll notify you when your cab arrives
                </Text>
              </View>
            )}
          </View>
        </View>

        {/* Results Display */}
        {detectedPlate && (
          <View style={{
            backgroundColor: scanResult === 'match' ? '#34A853' : '#EA4335',
            padding: 20,
            alignItems: 'center',
          }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8 }}>
              {scanResult === 'match' ? (
                <CheckCircle size={32} color="#FFFFFF" />
              ) : (
                <XCircle size={32} color="#FFFFFF" />
              )}
              <Text style={{
                color: '#FFFFFF',
                fontSize: 18,
                fontWeight: '900',
                marginLeft: 12,
              }}>
                {scanResult === 'match' ? 'Cab Verified!' : 'Wrong Cab'}
              </Text>
            </View>
            
            <Text style={{
              color: '#FFFFFF',
              fontSize: 16,
              fontWeight: '700',
              textAlign: 'center',
            }}>
              Detected: {detectedPlate}
            </Text>
            
            <Text style={{
              color: '#FFFFFF',
              fontSize: 14,
              fontWeight: '400',
              textAlign: 'center',
              marginTop: 4,
            }}>
              {scanResult === 'match' 
                ? `This is your booked cab. Safe to board! (${Math.round(confidence * 100)}% confidence)` 
                : `This is not your cab. Keep looking. (${Math.round(confidence * 100)}% confidence)`}
            </Text>
            
            <Text style={{
              color: '#FFFFFF',
              fontSize: 12,
              fontWeight: '400',
              textAlign: 'center',
              marginTop: 4,
              opacity: 0.8,
            }}>
              {CameraService.getStateFromPlate(detectedPlate)} • Scan #{scanCount}
            </Text>
          </View>
        )}

        {/* Control Buttons */}
        <View style={{
          backgroundColor: '#FFFFFF',
          padding: 20,
          flexDirection: 'row',
          justifyContent: 'space-around',
          alignItems: 'center',
        }}>
          <TouchableOpacity
            onPress={toggleFlash}
            style={{
              backgroundColor: isFlashOn ? '#4285F4' : '#666666',
              borderRadius: 50,
              padding: 12,
            }}
            accessibilityLabel={isFlashOn ? 'Turn off flash' : 'Turn on flash'}
            accessibilityRole="button"
          >
            <Flashlight size={24} color="#FFFFFF" />
          </TouchableOpacity>

          <TouchableOpacity
            onPress={scanLicensePlate}
            disabled={isScanning}
            style={{
              backgroundColor: isScanning ? '#4285F4' : '#000000',
              borderWidth: 3,
              borderColor: isScanning ? '#000000' : '#4285F4',
              borderRadius: 50,
              padding: 20,
              shadowColor: '#000000',
              shadowOffset: { width: 4, height: 4 },
              shadowOpacity: 1,
              shadowRadius: 0,
              elevation: 8,
            }}
            accessibilityLabel={isScanning ? 'Scanning license plate' : 'Tap to scan license plate'}
            accessibilityRole="button"
          >
            <Scan size={32} color="#FFFFFF" />
          </TouchableOpacity>

          <TouchableOpacity
            onPress={startContinuousScanning}
            style={{
              backgroundColor: isContinuousScanning ? '#34A853' : '#666666',
              borderRadius: 50,
              padding: 12,
            }}
            accessibilityLabel={isContinuousScanning ? 'Stop continuous scanning' : 'Start continuous scanning'}
            accessibilityRole="button"
          >
            <Target size={24} color="#FFFFFF" />
          </TouchableOpacity>

          <TouchableOpacity
            onPress={resetScan}
            style={{
              backgroundColor: '#666666',
              borderRadius: 50,
              padding: 12,
            }}
            accessibilityLabel="Reset scanner"
            accessibilityRole="button"
          >
            <RotateCcw size={24} color="#FFFFFF" />
          </TouchableOpacity>
        </View>
      </View>
    </SafeAreaView>
  );
}