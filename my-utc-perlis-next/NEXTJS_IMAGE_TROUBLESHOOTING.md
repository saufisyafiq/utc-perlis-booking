# Next.js Image Component Troubleshooting Guide

## Issues Fixed

### 1. Hardcoded Localhost URLs ✅
**Problem**: The service detail page (`app/services/[id]/page.tsx`) was using hardcoded `http://localhost:1337` URLs for both API calls and image sources.

**Solution**: 
- Replaced hardcoded URLs with `process.env.NEXT_PUBLIC_STRAPI_API_URL`
- This ensures the app works in both development and production environments

### 2. Next.js Image Configuration ✅
**Problem**: The `next.config.ts` wasn't properly configured for production Strapi domains.

**Solution**:
- Added additional remote patterns for both HTTP and HTTPS protocols
- Used `STRAPI_HOSTNAME` environment variable for flexible hostname configuration
- Added fallback domain placeholder

### 3. Missing Error Handling ✅
**Problem**: No fallback handling when images fail to load.

**Solution**:
- Added conditional rendering to check if images exist
- Added `onError` handler with fallback to default image
- Prevents broken image displays

## Environment Variables Required

Make sure your production environment has these variables set:

```env
# Required - Strapi API URL
NEXT_PUBLIC_STRAPI_API_URL=https://your-strapi-domain.com

# Optional - For specific hostname in next.config.ts
STRAPI_HOSTNAME=your-strapi-domain.com
```

## Current Image Patterns in next.config.ts

```typescript
images: {
  remotePatterns: [
    // Development
    {
      protocol: 'http',
      hostname: 'localhost',
      port: '1337',
      pathname: '/uploads/**',
    },
    // Production HTTPS
    {
      protocol: 'https',
      hostname: process.env.STRAPI_HOSTNAME || 'your-production-strapi-domain.com',
      pathname: '/uploads/**',
    },
    // Production HTTP (if needed)
    {
      protocol: 'http',
      hostname: process.env.STRAPI_HOSTNAME || 'your-production-strapi-domain.com',
      pathname: '/uploads/**',
    },
  ],
}
```

## Common Next.js Image Issues & Solutions

### Issue: Images not loading in production
**Causes:**
1. Missing remote patterns in `next.config.ts`
2. Incorrect protocol (HTTP vs HTTPS)
3. Wrong hostname configuration
4. Missing environment variables

**Solutions:**
- Verify `remotePatterns` includes your production domain
- Check environment variables are set correctly
- Ensure protocol matches your Strapi instance
- Test with curl/browser to verify image URLs are accessible

### Issue: Images work locally but not on server
**Causes:**
1. Hardcoded localhost URLs
2. Environment variables not set in production
3. Different network configuration between dev/prod

**Solutions:**
- Use environment variables instead of hardcoded URLs
- Verify production environment variables
- Check network policies and firewall rules

### Issue: "Invalid src prop" errors
**Causes:**
1. Malformed image URLs
2. Missing protocol in URLs
3. Special characters in URLs

**Solutions:**
- Validate URL format before passing to Image component
- Ensure URLs include protocol (http/https)
- URL encode special characters if needed

## Best Practices Implemented

1. **Environment Variable Usage**: All URLs use `NEXT_PUBLIC_STRAPI_API_URL`
2. **Error Handling**: Fallback images when loading fails
3. **Conditional Rendering**: Check if images exist before rendering
4. **Flexible Configuration**: Support for different protocols and hostnames

## Testing Checklist

- [ ] Images load correctly in development
- [ ] Images load correctly in production
- [ ] Fallback images work when original fails
- [ ] No console errors related to images
- [ ] Performance is acceptable (proper image optimization)

## Additional Improvements You Can Make

1. **Image Optimization**: Use different image formats (WebP, AVIF)
2. **Lazy Loading**: Already enabled by default in Next.js Image
3. **Responsive Images**: Use `sizes` prop for different screen sizes
4. **Placeholder**: Add blur placeholder while loading

Example with improvements:
```tsx
<Image
  src={imageUrl}
  alt={alt}
  fill
  className="object-cover"
  sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
  placeholder="blur"
  blurDataURL="data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQ..."
  onError={(e) => {
    const target = e.target as HTMLImageElement;
    target.src = '/fallback-image.jpg';
  }}
/>
```
