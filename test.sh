#!/bin/bash

# Quick test script for safenode
echo "Testing safenode with Docker..."

# Test with a simple echo command first
echo "1. Testing basic Docker connectivity:"
docker run --rm alpine echo "Docker works!"

echo ""
echo "2. Now run this command to test safenode with the example app:"
echo "   cd example && ../bin/safenode -p 8080:3000"
echo ""
echo "3. In another terminal, test the server:"
echo "   curl http://localhost:8080"
echo "   curl http://localhost:8080/health"
echo ""
echo "4. Press Ctrl+C to stop the container"