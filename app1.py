from flask import Flask, request, jsonify, render_template, url_for
import os
import google.generativeai as genai
from dotenv import load_dotenv
from werkzeug.utils import secure_filename
import uuid

# Load environment variables
load_dotenv()

# Configure the Gemini API
genai.configure(api_key=os.getenv("GEMINI_API_KEY"))

# Initialize the model
chat_model = genai.GenerativeModel('gemini-1.5-flash')
image_model = genai.GenerativeModel('gemini-1.5-flash-002')

# Create upload folder if it doesn't exist
UPLOAD_FOLDER = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'static', 'uploads')
os.makedirs(UPLOAD_FOLDER, exist_ok=True)
ALLOWED_EXTENSIONS = {'png', 'jpg', 'jpeg', 'gif'}

app = Flask(__name__)
app.config['UPLOAD_FOLDER'] = UPLOAD_FOLDER
app.config['MAX_CONTENT_LENGTH'] = 16 * 1024 * 1024  # 16MB max upload

# Helper function to check allowed file extensions
def allowed_file(filename):
    return '.' in filename and filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/api/chat', methods=['POST'])
def chat():
    try:
        data = request.json
        user_message = data.get('message', '')
        
        if not user_message:
            return jsonify({'error': 'No message provided'}), 400
        
        # Create a system prompt for home maintenance context
        system_prompt = """
        You are HomeFix AI, a helpful home maintenance assistant.
        Keep your response look beautiful and tidy and minimal. 
        Your goal is to provide practical advice for home repairs, maintenance, and DIY projects.
        Be friendly, concise, and provide step-by-step instructions when appropriate.
        If you're unsure about something, acknowledge it and suggest consulting a professional.
        Focus on safety first in all your recommendations.
        """
        
        # Generate response using Gemini
        chat = chat_model.start_chat(history=[])
        response = chat.send_message(
            f"{system_prompt}\n\nUser query: {user_message}"
        )
        
        return jsonify({'response': response.text})
    
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/image-analysis', methods=['POST'])
def image_analysis():
    try:
        # Check if image is present in request
        if 'image' not in request.files:
            return jsonify({'error': 'No image provided'}), 400
        
        file = request.files['image']
        query = request.form.get('query', 'What maintenance issue can you identify in this image?')
        
        # Validate file
        if file.filename == '':
            return jsonify({'error': 'No image selected'}), 400
        
        if not allowed_file(file.filename):
            return jsonify({'error': 'File type not allowed'}), 400
        
        # Save file with unique name
        filename = secure_filename(f"{uuid.uuid4()}_{file.filename}")
        filepath = os.path.join(app.config['UPLOAD_FOLDER'], filename)
        file.save(filepath)
        
        # Process image with Gemini
        with open(filepath, 'rb') as img_file:
            image_data = img_file.read()
        
        # Create a system prompt for image analysis
        system_prompt = """
        You are HomeFix AI, a helpful home maintenance assistant analyzing an image.
        Identify any maintenance issues, repairs needed, or DIY opportunities in the image.
        Provide practical advice and suggestions based on what you see.
        If you can't clearly identify the issue, be honest about limitations and ask clarifying questions.
        Focus on safety first in all your recommendations.
        """
        
        # Generate response using Gemini Vision
        response = image_model.generate_content([
            system_prompt,
            f"User query about this image: {query}",
            {"mime_type": f"image/{filepath.split('.')[-1]}", "data": image_data}
        ])
        
        return jsonify({'response': response.text})
    
    except Exception as e:
        return jsonify({'error': str(e)}), 500

if __name__ == '__main__':
    app.run(debug=True)