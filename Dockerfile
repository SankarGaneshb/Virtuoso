# Use official Node.js LTS image
FROM node:18-alpine

# Set working directory
WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies (production only)
RUN npm ci --only=production

# Copy application source
COPY . .

# Create volume mount point for SQLite
VOLUME /app/data

# Expose port (Render/Railway/Fly usually use environment variable PORT)
ENV PORT=3000
EXPOSE 3000

# Start command
CMD ["node", "server.js"]
