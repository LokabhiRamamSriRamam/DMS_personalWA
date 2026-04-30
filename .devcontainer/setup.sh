#!/bin/bash

echo "Setting up DentalClinic dev environment..."

if [ ! -d "dms_backend/node_modules" ]; then
  echo "Installing backend dependencies..."
  cd dms_backend && npm install && cd ..
fi

if [ ! -d "frontend/node_modules" ]; then
  echo "Installing frontend dependencies..."
  cd frontend && npm install && cd ..
fi

if [ ! -f "dms_backend/.env" ]; then
  echo "Creating .env template..."
  cat > dms_backend/.env << 'EOF'
MONGO_URI=mongodb://root:devpass@mongodb:27017/?authSource=admin
JWT_SECRET=dev-secret-key-change-in-production
JWT_REFRESH_SECRET=dev-refresh-secret-change-in-production
PORT=4000
EOF
  echo ".env created at dms_backend/.env — update with real values if needed"
fi

echo "Dev environment ready!"
echo "Backend:  http://localhost:4000"
echo "Frontend: http://localhost:5173"
echo "MongoDB:  mongodb://root:devpass@localhost:27017"
