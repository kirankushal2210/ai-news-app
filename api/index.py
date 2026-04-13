import sys
import os
from pathlib import Path

# Add the project root to sys.path so we can import the app
sys.path.insert(0, str(Path(__file__).parent.parent))

from app.web import create_app

# Create the Flask app
app = create_app()

# This is the entry point for Vercel's Serverless Functions
if __name__ == "__main__":
    app.run()
