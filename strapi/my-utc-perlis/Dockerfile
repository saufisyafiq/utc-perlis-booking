# Strapi Dockerfile
FROM node:18-alpine

# Create non-root user for security first
RUN addgroup -g 1001 -S nodejs && \
    adduser -S strapi -u 1001 -G nodejs

# Set working directory
WORKDIR /app

# Change ownership of the app directory
RUN chown -R strapi:nodejs /app

# Switch to strapi user for subsequent operations
USER strapi

# Copy package files
COPY --chown=strapi:nodejs package*.json ./

# Install dependencies
RUN npm ci --only=production

# Copy source code
COPY --chown=strapi:nodejs . .

# Build the application
RUN npm run build

# Expose port
EXPOSE 1337

# Start the application
CMD ["npm", "start"]
