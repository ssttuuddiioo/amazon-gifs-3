#!/bin/bash
set -e

echo "🔧 Setting up build environment..."

# Check if ffmpeg is available
if ! command -v ffmpeg &> /dev/null; then
    echo "📦 Installing ffmpeg..."
    
    # Try different installation methods based on environment
    if command -v apt &> /dev/null; then
        # Ubuntu/Debian (Netlify)
        sudo apt update && sudo apt install -y ffmpeg
    elif command -v brew &> /dev/null; then
        # macOS
        brew install ffmpeg
    else
        echo "❌ Could not install ffmpeg automatically"
        echo "Please install ffmpeg manually:"
        echo "  macOS: brew install ffmpeg"
        echo "  Ubuntu: sudo apt install ffmpeg"
        echo "  Windows: Download from https://ffmpeg.org/"
        exit 1
    fi
else
    echo "✅ ffmpeg already available"
fi

echo "📦 Installing npm dependencies..."
npm install

echo "🎬 Generating thumbnails and building..."
npm run build

echo "✅ Build complete!" 