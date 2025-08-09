FROM node:18-alpine

# Install dependencies for media processing
RUN apk add --no-cache \
    ffmpeg \
    imagemagick \
    python3 \
    make \
    g++

# Create app directory
WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci --only=production

# Copy shared directory
COPY --from=shared /app/shared /app/shared

# Copy application files
COPY . .

# Create necessary directories
RUN mkdir -p /app/logs /app/temp

# Set user to node
USER node

# Expose port
EXPOSE 3001

# Start the application
CMD ["node", "src/index.js"]