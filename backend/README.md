# Netra AI Flask Backend

This Flask backend provides AI-powered license plate detection and chatbot functionality for the Netra AI mobile app.

## Features

- **License Plate Detection**: Uses YOLOv5 for vehicle detection and EasyOCR for text extraction
- **Rule-based Chatbot**: Provides helpful responses to user queries
- **Text-to-Speech**: Converts text responses to audio using gTTS
- **CORS Enabled**: Ready for React Native app integration

## Installation

1. Create a virtual environment:
```bash
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
```

2. Install dependencies:
```bash
pip install -r requirements.txt
```

3. Run the server:
```bash
python app.py
```

The server will start on `http://localhost:5000`

## API Endpoints

### POST /detect_plate
Detects license plates from uploaded images.

**Request:**
```json
{
  "image": "base64_encoded_image_data"
}
```

**Response:**
```json
{
  "success": true,
  "license_plate": "MH12AB1234",
  "confidence": 0.95,
  "all_detections": ["MH12AB1234"]
}
```

### POST /chatbot
Rule-based chatbot for user queries.

**Request:**
```json
{
  "query": "Where is my cab?"
}
```

**Response:**
```json
{
  "success": true,
  "response": "Your cab should arrive in 2-3 minutes. Please wait at the pickup location.",
  "query": "where is my cab"
}
```

### POST /speak
Converts text to speech audio file.

**Request:**
```json
{
  "text": "Your cab is here"
}
```

**Response:** Audio file (MP3 format)

### GET /health
Health check endpoint.

**Response:**
```json
{
  "status": "healthy",
  "yolov5_loaded": true,
  "easyocr_ready": true
}
```

## Usage with React Native App

Update your React Native app to use this backend by changing the API endpoints from mock responses to actual HTTP requests to `http://your-server-ip:5000`.

## Deployment

For production deployment, consider using:
- **Gunicorn** for WSGI server
- **Nginx** for reverse proxy
- **Docker** for containerization
- **Cloud platforms** like AWS, Google Cloud, or Heroku

Example Gunicorn command:
```bash
gunicorn -w 4 -b 0.0.0.0:5000 app:app
```