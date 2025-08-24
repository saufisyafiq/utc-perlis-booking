# Coolify Configuration for UTC Perlis Project

## Quick Setup Commands

### Generate Security Keys for Strapi
Run these commands to generate secure keys:

```bash
# APP_KEYS (generate 4 keys and join with commas)
echo "$(openssl rand -base64 32),$(openssl rand -base64 32),$(openssl rand -base64 32),$(openssl rand -base64 32)"

# Other secrets
openssl rand -base64 32  # JWT_SECRET
openssl rand -base64 32  # ADMIN_JWT_SECRET  
openssl rand -base64 32  # API_TOKEN_SALT
openssl rand -base64 32  # TRANSFER_TOKEN_SALT
```

## Coolify Service Configuration

### 1. PostgreSQL Database Service
- **Name**: `utc-perlis-db`
- **Type**: PostgreSQL 15
- **Database**: `strapi`
- **Username**: `strapi`
- **Password**: Generate strong password

### 2. Strapi Backend Application
- **Name**: `utc-perlis-strapi`
- **Repository**: Your git repository
- **Build Context**: `strapi/my-utc-perlis`
- **Dockerfile**: `strapi/my-utc-perlis/Dockerfile`
- **Port**: `1337`
- **Domain**: `api.yourdomain.com`

### 3. Next.js Frontend Application  
- **Name**: `utc-perlis-frontend`
- **Repository**: Your git repository
- **Build Context**: `my-utc-perlis-next`
- **Dockerfile**: `my-utc-perlis-next/Dockerfile`
- **Port**: `3000`
- **Domain**: `yourdomain.com`

## Environment Variables

Copy the variables from the `.template` files in each service directory to your Coolify environment configuration.

## Deployment Order

1. Deploy PostgreSQL database first
2. Deploy Strapi backend (wait for completion)
3. Create Strapi admin user and API token
4. Deploy Next.js frontend with the API token

## Post-Deployment

1. Configure CORS in Strapi admin panel
2. Test email functionality
3. Set up content in Strapi CMS
4. Test the complete booking flow
