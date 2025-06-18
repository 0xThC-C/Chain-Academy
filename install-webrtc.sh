#!/bin/bash

echo "🚀 Installing WebRTC dependencies for Chain Academy V2..."

# Backend dependencies
echo "📦 Installing backend dependencies..."
cd backend
npm install socket.io@^4.8.1 @types/socket.io@^3.0.2
cd ..

# Frontend dependencies
echo "📦 Installing frontend dependencies..."
cd frontend
npm install socket.io-client@^4.8.1
cd ..

# Create environment files if they don't exist
echo "⚙️ Setting up environment files..."

if [ ! -f backend/.env ]; then
    cp backend/.env.example backend/.env
    echo "✅ Created backend/.env from example"
else
    echo "ℹ️ backend/.env already exists"
fi

if [ ! -f frontend/.env ]; then
    cp frontend/.env.example frontend/.env
    echo "✅ Created frontend/.env from example"
else
    echo "ℹ️ frontend/.env already exists"
fi

echo ""
echo "🎉 WebRTC installation complete!"
echo ""
echo "To start the development servers:"
echo ""
echo "Backend:"
echo "  cd backend && npm run dev"
echo ""
echo "Frontend:"
echo "  cd frontend && npm start"
echo ""
echo "📖 See WEBRTC_README.md for detailed documentation"
echo ""
echo "🔗 Test the implementation:"
echo "  1. Open http://localhost:3000/dashboard"
echo "  2. Go to 'My Mentorships' tab"
echo "  3. Click 'Join Session' to test WebRTC"