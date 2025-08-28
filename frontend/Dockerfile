FROM nginx:latest

# Copy nginx.conf
COPY nginx.conf /etc/nginx/nginx.conf

# Copy source files into application directory
COPY ./frontend/html /usr/share/nginx/html

# Expose port 8080 for Cloud Run
EXPOSE 8080

# Health check endpoint for Cloud Run
HEALTHCHECK CMD curl --fail http://localhost:8080/ || exit 1