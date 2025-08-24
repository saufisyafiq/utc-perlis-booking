# Coolify Deployment Guide for UTC Perlis Project

This guide will help you deploy your UTC Perlis booking system (Next.js frontend + Strapi backend) to Coolify.

## Architecture Overview

- **Database**: PostgreSQL (Coolify managed service)
- **Backend**: Strapi CMS/API (containerized)
- **Frontend**: Next.js application (containerized)
- **Reverse Proxy**: Coolify's built-in Traefik

## Prerequisites

1. Coolify instance running and accessible
2. Domain names configured (e.g., `utc-perlis.com`, `api.utc-perlis.com`)
3. Git repository with your code
4. SMTP credentials for email functionality

## Step-by-Step Deployment

### 1. Create PostgreSQL Database

1. In Coolify dashboard, go to **Resources** > **Databases**
2. Click **+ New Database** > **PostgreSQL**
3. Configure:
   - **Name**: `utc-perlis-db`
   - **Database Name**: `strapi`
   - **Username**: `strapi`
   - **Password**: Generate a strong password
   - **Version**: `15` (recommended)
4. Click **Deploy**
5. Note down the connection details for later use

### 2. Deploy Strapi Backend

1. In Coolify dashboard, go to **Projects** > **+ New Resource** > **Application**
2. Configure the application:
   - **Name**: `utc-perlis-strapi`
   - **Git Repository**: Your repository URL
   - **Build Pack**: Docker
   - **Dockerfile Location**: `strapi/my-utc-perlis/Dockerfile`
   - **Build Context**: `strapi/my-utc-perlis`
   - **Port**: `1337`

3. Set Environment Variables:
   ```bash
   # Database Configuration
   DATABASE_CLIENT=postgres
   DATABASE_HOST=<your-postgres-host>
   DATABASE_PORT=5432
   DATABASE_NAME=strapi
   DATABASE_USERNAME=strapi
   DATABASE_PASSWORD=<your-postgres-password>
   DATABASE_SSL=false
   
   # Strapi Configuration
   HOST=0.0.0.0
   PORT=1337
   NODE_ENV=production
   
   # Security Keys (generate with: openssl rand -base64 32)
   APP_KEYS=<generate-random-keys>
   API_TOKEN_SALT=<generate-random-salt>
   ADMIN_JWT_SECRET=<generate-random-secret>
   TRANSFER_TOKEN_SALT=<generate-random-salt>
   JWT_SECRET=<generate-random-secret>
   
   # Public URL
   PUBLIC_URL=https://api.utc-perlis.com
   ```

4. Configure Domain:
   - **Domain**: `api.utc-perlis.com`
   - Enable **HTTPS** and **Force HTTPS Redirect**

5. Click **Deploy**

### 3. Configure Strapi Admin

1. Once Strapi is deployed, visit `https://api.utc-perlis.com/admin`
2. Create your admin account
3. Configure your content types and API tokens
4. Generate an API token for the Next.js frontend:
   - Go to **Settings** > **API Tokens** > **Create new API Token**
   - Name: `nextjs-frontend`
   - Token type: `Read-only` or `Full access` (based on your needs)
   - Save the token for Next.js configuration

### 4. Deploy Next.js Frontend

1. In Coolify dashboard, go to **Projects** > **+ New Resource** > **Application**
2. Configure the application:
   - **Name**: `utc-perlis-frontend`
   - **Git Repository**: Your repository URL
   - **Build Pack**: Docker
   - **Dockerfile Location**: `my-utc-perlis-next/Dockerfile`
   - **Build Context**: `my-utc-perlis-next`
   - **Port**: `3000`

3. Set Environment Variables:
   ```bash
   # Strapi Configuration
   NEXT_PUBLIC_STRAPI_API_URL=https://api.utc-perlis.com
   STRAPI_API_TOKEN=<your-strapi-api-token>
   STRAPI_HOSTNAME=api.utc-perlis.com
   
   # Site Configuration
   NEXT_PUBLIC_SITE_URL=https://utc-perlis.com
   
   # Email Configuration (SMTP)
   SMTP_HOST=smtp.gmail.com
   SMTP_PORT=587
   SMTP_SECURE=false
   SMTP_USER=<your-email@gmail.com>
   SMTP_PASS=<your-app-password>
   FROM_EMAIL=<your-email@gmail.com>
   FROM_NAME=UTC Perlis
   ```

4. Configure Domain:
   - **Domain**: `utc-perlis.com`
   - Enable **HTTPS** and **Force HTTPS Redirect**

5. Click **Deploy**

## Post-Deployment Configuration

### 1. Update CORS Settings in Strapi

1. Go to Strapi admin panel: `https://api.utc-perlis.com/admin`
2. Navigate to **Settings** > **Security** > **CORS**
3. Add your frontend domain to allowed origins:
   ```
   https://utc-perlis.com
   ```

### 2. Configure File Upload Settings

1. In Strapi admin, go to **Settings** > **Media Library**
2. Configure upload settings as needed
3. For production, consider using AWS S3 or similar cloud storage

### 3. Set Up Email Templates

1. Configure your email templates in Strapi
2. Test email functionality through the admin panel

## Environment Variables Reference

### Strapi Backend Environment Variables

```bash
# Database
DATABASE_CLIENT=postgres
DATABASE_HOST=<coolify-postgres-host>
DATABASE_PORT=5432
DATABASE_NAME=strapi
DATABASE_USERNAME=strapi
DATABASE_PASSWORD=<secure-password>
DATABASE_SSL=false

# Application
HOST=0.0.0.0
PORT=1337
NODE_ENV=production
PUBLIC_URL=https://api.utc-perlis.com

# Security (generate unique values)
APP_KEYS=<random-base64-string>
API_TOKEN_SALT=<random-base64-string>
ADMIN_JWT_SECRET=<random-base64-string>
TRANSFER_TOKEN_SALT=<random-base64-string>
JWT_SECRET=<random-base64-string>
```

### Next.js Frontend Environment Variables

```bash
# Strapi
NEXT_PUBLIC_STRAPI_API_URL=https://api.utc-perlis.com
STRAPI_API_TOKEN=<strapi-api-token>
STRAPI_HOSTNAME=api.utc-perlis.com

# Site
NEXT_PUBLIC_SITE_URL=https://utc-perlis.com

# Email (SMTP)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=<email>
SMTP_PASS=<app-password>
FROM_EMAIL=<email>
FROM_NAME=UTC Perlis
```

## Security Considerations

1. **Use strong passwords** for database and admin accounts
2. **Generate unique secrets** for all Strapi security keys
3. **Enable HTTPS** for both frontend and backend
4. **Configure CORS** properly to only allow your frontend domain
5. **Use app passwords** for Gmail SMTP (not regular passwords)
6. **Regularly update** your containers and dependencies

## Monitoring and Logs

1. Use Coolify's built-in logging to monitor application health
2. Set up alerts for application downtime
3. Monitor database performance and storage usage
4. Regularly backup your database

## Troubleshooting

### Common Issues

1. **Database Connection Issues**
   - Check database host and credentials
   - Ensure database is running and accessible

2. **CORS Errors**
   - Verify CORS settings in Strapi admin
   - Check that frontend domain is properly configured

3. **Email Not Sending**
   - Verify SMTP credentials
   - Check if Gmail app passwords are configured correctly

4. **Build Failures**
   - Check Docker build logs in Coolify
   - Ensure all dependencies are properly installed

### Useful Commands

Generate random secrets for Strapi:
```bash
# Generate APP_KEYS (4 keys separated by commas)
openssl rand -base64 32
openssl rand -base64 32
openssl rand -base64 32
openssl rand -base64 32

# Generate other secrets
openssl rand -base64 32  # For JWT_SECRET
openssl rand -base64 32  # For ADMIN_JWT_SECRET
openssl rand -base64 32  # For API_TOKEN_SALT
openssl rand -base64 32  # For TRANSFER_TOKEN_SALT
```

## Performance Optimization

1. **Enable caching** in Strapi for better API performance
2. **Use CDN** for static assets and images
3. **Optimize images** in Next.js with the built-in Image component
4. **Enable compression** in production
5. **Monitor resource usage** and scale as needed

## Backup Strategy

1. **Database backups**: Set up automated PostgreSQL backups in Coolify
2. **Media files**: Backup uploaded files (consider cloud storage)
3. **Configuration**: Keep environment variables and configurations in version control
4. **Test restore procedures** regularly

This deployment setup provides a robust, scalable solution for your UTC Perlis booking system. The containerized approach ensures consistency across environments and makes scaling easier as your application grows.
