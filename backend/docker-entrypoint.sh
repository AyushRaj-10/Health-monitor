#!/bin/sh
set -e

echo "🏥 [RPM Backend Entrypoint] Starting container initialization..."

# Wait for PostgreSQL to be ready
echo "⏳ Waiting for PostgreSQL to accept connections..."
until npx prisma db push --skip-generate; do
  echo "Database is unavailable or migrating - sleeping 2 seconds..."
  sleep 2
done

echo "✅ Database schema synchronized successfully."

# Seed database with initial medical staff, patients, and IoMT devices if empty
echo "🌱 Checking seed data..."
node prisma/seed.js || echo "Seed completed or skipped."

echo "🚀 Starting backend HTTP and Socket.IO server..."
exec node src/index.js
