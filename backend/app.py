from flask import Flask, request, jsonify, send_file
from flask_cors import CORS
import cv2
import numpy as np
import torch
import easyocr
from PIL import Image
import io
import base64
import re
import os
from gtts import gTTS
import tempfile
import logging

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = Flask(__name__)
CORS(app)  # Enable CORS for React Native app

# Initialize EasyOCR reader
reader = easyocr.Reader(['en'])

# Load YOLOv5 model (you can use a custom trained model or the default one)
try:
    model = torch.hub.load('ultralytics/yolov5', 'yolov5s', pretrained=True)
    logger.info("YOLOv5 model loaded successfully")
except Exception as e:
    logger.error(f"Error loading YOLOv5 model: {e}")
    model = None

def preprocess_image(image_data):
    """Convert base64 image to OpenCV format"""
    try:
        # Remove data URL prefix if present
        if ',' in image_data:
            image_data = image_data.split(',')[1]
        
        # Decode base64 image
        image_bytes = base64.b64decode(image_data)
        nparr = np.frombuffer(image_bytes, np.uint8)
        image = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
        return image
    except Exception as e:
        logger.error(f"Error preprocessing image: {e}")
        return None

def detect_license_plate_region(image):
    """Use YOLOv5 to detect potential license plate regions"""
    if model is None:
        # Fallback: return the whole image if YOLOv5 is not available
        return [image]
    
    try:
        # Run YOLOv5 inference
        results = model(image)
        
        # Extract bounding boxes for cars, trucks, buses (potential vehicles)
        vehicle_classes = [2, 5, 7]  # car, bus, truck in COCO dataset
        detections = results.pandas().xyxy[0]
        
        license_plate_regions = []
        
        for _, detection in detections.iterrows():
            if int(detection['class']) in vehicle_classes and detection['confidence'] > 0.5:
                # Extract vehicle region
                x1, y1, x2, y2 = int(detection['xmin']), int(detection['ymin']), int(detection['xmax']), int(detection['ymax'])
                vehicle_region = image[y1:y2, x1:x2]
                
                # Focus on the lower part of the vehicle (where license plates usually are)
                height = vehicle_region.shape[0]
                lower_region = vehicle_region[int(height * 0.6):, :]
                license_plate_regions.append(lower_region)
        
        # If no vehicles detected, use the whole image
        if not license_plate_regions:
            license_plate_regions = [image]
            
        return license_plate_regions
    except Exception as e:
        logger.error(f"Error in vehicle detection: {e}")
        return [image]

def extract_license_plate_text(image):
    """Extract text from license plate using EasyOCR"""
    try:
        # Use EasyOCR to extract text
        results = reader.readtext(image)
        
        # Filter and clean the results
        license_plates = []
        for (bbox, text, confidence) in results:
            if confidence > 0.5:  # Only consider high-confidence detections
                # Clean the text (remove spaces, special characters)
                cleaned_text = re.sub(r'[^A-Z0-9]', '', text.upper())
                
                # Check if it looks like a license plate (alphanumeric, reasonable length)
                if len(cleaned_text) >= 4 and len(cleaned_text) <= 12 and re.match(r'^[A-Z0-9]+$', cleaned_text):
                    license_plates.append({
                        'text': cleaned_text,
                        'confidence': confidence,
                        'bbox': bbox
                    })
        
        return license_plates
    except Exception as e:
        logger.error(f"Error extracting license plate text: {e}")
        return []

@app.route('/detect_plate', methods=['POST'])
def detect_plate():
    """Detect license plate from uploaded image"""
    try:
        data = request.get_json()
        
        if 'image' not in data:
            return jsonify({'error': 'No image provided'}), 400
        
        # Preprocess the image
        image = preprocess_image(data['image'])
        if image is None:
            return jsonify({'error': 'Invalid image format'}), 400
        
        # Detect license plate regions using YOLOv5
        license_plate_regions = detect_license_plate_region(image)
        
        all_detections = []
        
        # Extract text from each region
        for region in license_plate_regions:
            detections = extract_license_plate_text(region)
            all_detections.extend(detections)
        
        # Sort by confidence and return the best detection
        if all_detections:
            best_detection = max(all_detections, key=lambda x: x['confidence'])
            return jsonify({
                'success': True,
                'license_plate': best_detection['text'],
                'confidence': best_detection['confidence'],
                'all_detections': [d['text'] for d in all_detections]
            })
        else:
            return jsonify({
                'success': False,
                'message': 'No license plate detected',
                'license_plate': None
            })
            
    except Exception as e:
        logger.error(f"Error in detect_plate: {e}")
        return jsonify({'error': str(e)}), 500

@app.route('/chatbot', methods=['POST'])
def chatbot():
    """Rule-based chatbot for user queries"""
    try:
        data = request.get_json()
        query = data.get('query', '').lower().strip()
        
        # Rule-based responses
        responses = {
            'where is my cab': 'Your cab should arrive in 2-3 minutes. Please wait at the pickup location.',
            'what does this app do': 'Netra AI helps visually impaired users book cabs, detect license plates, navigate, and get assistance through voice commands.',
            'help me': 'I can help you with: booking a cab, scanning license plates, navigation, or answering questions. Just ask!',
            'how to book cab': 'Say "Book a cab" or tap the Book Ride button. I will generate a cab booking for you.',
            'how to scan plate': 'Say "Scan license plate" or tap the Scan Plate button to open the camera and detect license plates.',
            'navigation help': 'Use the Navigate button to get voice-guided directions to your destination.',
            'app features': 'Key features include voice commands, cab booking, license plate detection, navigation, and AI assistance.',
            'emergency': 'For emergencies, please contact local emergency services immediately. This app provides mobility assistance only.',
            'voice commands': 'Available commands: "Book a cab", "Scan license plate", "Navigate me", "Help me", "Where is my cab"'
        }
        
        # Find the best matching response
        response = None
        for key, value in responses.items():
            if key in query:
                response = value
                break
        
        if response is None:
            # Default response for unrecognized queries
            response = "I'm here to help with cab booking, license plate detection, and navigation. Try asking 'What does this app do?' or 'Help me' for more information."
        
        return jsonify({
            'success': True,
            'response': response,
            'query': query
        })
        
    except Exception as e:
        logger.error(f"Error in chatbot: {e}")
        return jsonify({'error': str(e)}), 500

@app.route('/speak', methods=['POST'])
def speak():
    """Convert text to speech using gTTS"""
    try:
        data = request.get_json()
        text = data.get('text', '')
        
        if not text:
            return jsonify({'error': 'No text provided'}), 400
        
        # Create a temporary file for the audio
        with tempfile.NamedTemporaryFile(delete=False, suffix='.mp3') as tmp_file:
            tts = gTTS(text=text, lang='en', slow=False)
            tts.save(tmp_file.name)
            
            # Return the audio file
            return send_file(tmp_file.name, mimetype='audio/mpeg', as_attachment=True, download_name='speech.mp3')
            
    except Exception as e:
        logger.error(f"Error in speak: {e}")
        return jsonify({'error': str(e)}), 500

@app.route('/health', methods=['GET'])
def health():
    """Health check endpoint"""
    return jsonify({
        'status': 'healthy',
        'yolov5_loaded': model is not None,
        'easyocr_ready': True
    })

if __name__ == '__main__':
    print("Starting Netra AI Flask Backend...")
    print("Available endpoints:")
    print("- POST /detect_plate - License plate detection")
    print("- POST /chatbot - Rule-based chatbot")
    print("- POST /speak - Text-to-speech")
    print("- GET /health - Health check")
    app.run(host='0.0.0.0', port=5000, debug=True)