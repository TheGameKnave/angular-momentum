#!/bin/bash

# Script to run the SSR server with the backend API server for testing
# This allows you to test the dynamic screenshot feature

set -e

echo "🚀 Starting Angular Momentum with SSR..."
echo ""

# Check if build exists
if [ ! -d "client/dist/angular-momentum/server" ]; then
    echo "❌ SSR build not found. Building now..."
    cd client
    npm run build
    cd ..
    echo "✅ Build complete!"
    echo ""
fi

echo "📝 Starting services:"
echo "  - Backend API Server (port 4201)"
echo "  - SSR Server (port 4000)"
echo ""
echo "🌐 Your app will be available at: http://localhost:4000"
echo "📸 Screenshot API: http://localhost:4000/api/og-image?url=http://localhost:4000/"
echo ""
echo "Press Ctrl+C to stop all services"
echo ""

# Function to cleanup background processes on exit
cleanup() {
    echo ""
    echo "🛑 Stopping services..."
    kill $BACKEND_PID $SSR_PID 2>/dev/null || true
    exit
}

trap cleanup EXIT INT TERM

# Start backend API server in background
cd server
NODE_ENV=development node-env-run --exec nodemon &
BACKEND_PID=$!
cd ..

# Wait a bit for backend to start
sleep 3

# Start SSR server
cd client
node dist/angular-momentum/server/server.mjs &
SSR_PID=$!
cd ..

# Wait for both processes
wait
