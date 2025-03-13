from flask import Flask, render_template, request, jsonify
import numpy as np
from tensorflow.keras.models import load_model
from PIL import Image
import io
import os
import scipy.ndimage
from scipy.ndimage import binary_dilation, gaussian_filter

app = Flask(__name__)
model = load_model('mnist_mlp.h5')

def center_image(img, target_size=(28, 28)):
    """
    Centers the digit in the image with improved handling of edge cases.
    Returns a properly centered 28x28 image.
    """
    # Ensure input is binary (0 or 255)
    img = (img > 127).astype(np.uint8) * 255
    
    # Find bounding box of non-zero pixels
    coords = np.column_stack(np.where(img > 0))
    if coords.size == 0:
        return np.zeros(target_size, dtype=np.uint8)  # Return blank image if empty
    
    y_min, x_min = coords.min(axis=0)
    y_max, x_max = coords.max(axis=0)
    
    # Calculate dimensions of the digit
    h, w = y_max - y_min + 1, x_max - x_min + 1
    if h == 0 or w == 0:
        return np.zeros(target_size, dtype=np.uint8)
    
    # Crop with small padding
    pad = 2
    y_min = max(0, y_min - pad)
    y_max = min(img.shape[0], y_max + pad)
    x_min = max(0, x_min - pad)
    x_max = min(img.shape[1], x_max + pad)
    cropped = img[y_min:y_max, x_min:x_max]
    
    # Scale to fit while maintaining aspect ratio
    scale = min((target_size[0] - 4) / cropped.shape[0], 
                (target_size[1] - 4) / cropped.shape[1])
    new_h, new_w = int(cropped.shape[0] * scale), int(cropped.shape[1] * scale)
    
    if new_h > 0 and new_w > 0:
        pil_img = Image.fromarray(cropped)
        resized = pil_img.resize((new_w, new_h), Image.Resampling.LANCZOS)
        cropped = np.array(resized)
    
    # Create output canvas and place resized digit in center
    output = np.zeros(target_size, dtype=np.uint8)
    start_y = (target_size[0] - cropped.shape[0]) // 2
    start_x = (target_size[1] - cropped.shape[1]) // 2
    output[start_y:start_y + cropped.shape[0], start_x:start_x + cropped.shape[1]] = cropped
    
    return output

def preprocess_digit(digit_array, threshold=100, dilation_iterations=1, gaussian_sigma=0.5):
    """
    Enhanced preprocessing pipeline for digit images:
    1. Noise reduction with Gaussian blur
    2. Adaptive thresholding
    3. Morphological operations (dilation)
    4. Centering with scaling
    5. Normalization
    """
    try:
        # Convert to float32 for processing
        img = digit_array.astype(np.float32)
        print(f"Initial: min={img.min():.2f}, max={img.max():.2f}, shape={img.shape}")
        
        # Apply Gaussian blur to reduce noise
        if gaussian_sigma > 0:
            img = gaussian_filter(img, sigma=gaussian_sigma)
        
        # Adaptive thresholding
        img = (img > threshold).astype(np.uint8) * 255
        print(f"After threshold: min={img.min()}, max={img.max()}")
        
        # Apply dilation to connect broken strokes
        if dilation_iterations > 0:
            binary_img = img > 0
            dilated = binary_dilation(binary_img, iterations=dilation_iterations)
            img = dilated.astype(np.uint8) * 255
            print(f"After dilation: unique={np.unique(img)}")
        
        # Center and scale the digit
        img = center_image(img)
        
        # Additional smoothing and normalization
        img = gaussian_filter(img, sigma=0.3)  # Light smoothing
        img = img.astype(np.float32) / 255.0  # Normalize to [0,1]
        
        # Reshape for model input
        img = img.reshape(1, 28*28)
        print(f"Final: min={img.min():.3f}, max={img.max():.3f}")
        
        return img
    
    except Exception as e:
        print(f"Preprocessing error: {str(e)}")
        raise

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/predict', methods=['POST'])
def predict():
    try:
        data = request.json
        if 'digit' not in data:
            return jsonify({'error': 'No digit data provided'}), 400
            
        digit_data = np.array(data['digit'], dtype=np.uint8)
        
        # Validate input shape
        if digit_data.shape != (28, 28):
            return jsonify({'error': f'Invalid shape: {digit_data.shape}, expected (28,28)'}), 400
            
        print(f"Received: shape={digit_data.shape}, min={digit_data.min()}, max={digit_data.max()}")
        
        # Preprocess with optimized parameters
        processed_digit = preprocess_digit(
            digit_data,
            threshold=100,  # Lower threshold to capture faint strokes
            dilation_iterations=1,
            gaussian_sigma=0.5
        )
        
        # Predict and return only the prediction probabilities
        predictions = model.predict(processed_digit, verbose=0)
        print(f"Predictions: {predictions[0]}")
        
        return jsonify({
            'predictions': predictions[0].tolist()
        })
    
    except Exception as e:
        print(f"Prediction error: {str(e)}")
        return jsonify({'error': str(e)}), 500

if __name__ == '__main__':
    app.run(debug=True, host='0.0.0.0', port=5000)
