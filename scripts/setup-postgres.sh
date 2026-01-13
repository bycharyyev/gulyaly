#!/bin/bash

# PostgreSQL Setup Script for VPS
# Run this on VPS to install and configure PostgreSQL

set -e

echo "🚀 Installing PostgreSQL..."

# Update system
apt-get update

# Install PostgreSQL
apt-get install -y postgresql postgresql-contrib

# Start PostgreSQL service
systemctl start postgresql
systemctl enable postgresql

# Create database and user
echo "📦 Creating database and user..."

sudo -u postgres psql <<EOF
-- Create database
CREATE DATABASE gulyaly;

-- Create user
CREATE USER gulyalyuser WITH PASSWORD 'gulyaly2026secure';

-- Grant privileges
GRANT ALL PRIVILEGES ON DATABASE gulyaly TO gulyalyuser;

-- Connect to database and grant schema privileges
\c gulyaly
GRANT ALL ON SCHEMA public TO gulyalyuser;
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO gulyalyuser;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO gulyalyuser;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO gulyalyuser;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO gulyalyuser;

-- Exit
\q
EOF

# Configure PostgreSQL to allow password authentication
echo "🔐 Configuring authentication..."

# Backup original config
cp /etc/postgresql/*/main/pg_hba.conf /etc/postgresql/*/main/pg_hba.conf.backup

# Allow local connections with password
cat > /etc/postgresql/*/main/pg_hba.conf <<EOF
# TYPE  DATABASE        USER            ADDRESS                 METHOD
local   all             postgres                                peer
local   all             all                                     md5
host    all             all             127.0.0.1/32            md5
host    all             all             ::1/128                 md5
EOF

# Restart PostgreSQL
systemctl restart postgresql

echo "✅ PostgreSQL installed and configured!"
echo ""
echo "📋 Connection Details:"
echo "   Host: localhost (or 89.104.74.7)"
echo "   Port: 5432"
echo "   Database: gulyaly"
echo "   User: gulyalyuser"
echo "   Password: gulyaly2026secure"
echo ""
echo "📝 Connection URL:"
echo "   postgresql://gulyalyuser:gulyaly2026secure@localhost:5432/gulyaly"
echo ""
echo "✅ Ready to use!"
