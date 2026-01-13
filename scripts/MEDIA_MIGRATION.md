# Media Migration Guide

This guide explains the most efficient ways to move media from your WordPress site to the Next.js application.

## Method 1: Automated Script (Recommended) ⚡

The fastest and most efficient method is using the automated download script.

### Run the script:

```bash
node scripts/download-media.js
```

### What it does:

1. **Extracts all image URLs** from `lib/homepage.html`
2. **Categorizes images**:
   - Carousel images → `public/landing/carousel-*.webp`
   - Featured logos → `public/landing/business-times-logo.png`, etc.
   - Main logo → `public/logo.png`
   - OG image → `public/og-image.webp`
3. **Downloads all images** to the correct directories
4. **Updates `components/landing/content.ts`** automatically with the correct paths

### Expected output:

```
📥 Starting media download...

Found 19 unique image URLs

📸 Carousel images: 11
🏢 Featured logos: 2
📁 Other images: 6

Downloading carousel images...
  [1/11] Downloading carousel-1.webp...
  ✓ Saved to public/landing/carousel-1.webp
  ...

✅ Media download complete!
```

---

## Method 2: Manual Download via WordPress Admin

If you prefer to download manually from WordPress:

1. **Go to WordPress Media Library**: `thisisneverstrangers.com/wp-admin/upload.php`
2. **Filter by date/folder** to find homepage images
3. **Download images** in batches
4. **Organize them**:
   - Carousel images → `public/landing/carousel-1.webp` through `carousel-11.webp`
   - Featured logos → `public/landing/business-times-logo.png` and `featured-logo-2.png`
5. **Update `components/landing/content.ts`** manually with the paths

---

## Method 3: WordPress Export Plugin

If you have access to WordPress plugins:

1. Install a media export plugin (e.g., "Export Media Library")
2. Export all media files
3. Extract the ZIP file
4. Copy files to appropriate directories in `public/`

---

## Method 4: Direct Server Access (Fastest for Large Files)

If you have SSH/FTP access to the WordPress server:

```bash
# SSH into WordPress server
ssh user@thisisneverstrangers.com

# Navigate to uploads directory
cd /path/to/wordpress/wp-content/uploads

# Use rsync or scp to copy files
rsync -avz 2024/ 2025/ 2026/ user@nextjs-server:/path/to/public/landing/
```

---

## Image Requirements

### Carousel Images (11 images)
- Location: `public/landing/`
- Naming: `carousel-1.webp` through `carousel-11.webp`
- Format: WebP preferred, PNG/JPG acceptable
- Recommended size: 1200x800px or similar aspect ratio

### Featured Logos (2 images)
- Location: `public/landing/`
- Files:
  - `business-times-logo.png`
  - `featured-logo-2.png`
- Format: PNG with transparency preferred

### Main Logo
- Location: `public/logo.png`
- Format: PNG with transparency

### OG Image (for social sharing)
- Location: `public/og-image.webp`
- Recommended size: 1200x630px
- Format: WebP or PNG

---

## Troubleshooting

### Script fails to download images
- Check your internet connection
- Some URLs might be behind CDN (ShortPixel) - the script handles redirects
- If a specific image fails, download it manually and place it in the correct directory

### Images not showing after download
- Verify file paths in `components/landing/content.ts`
- Check that files are in `public/` directory (Next.js serves from here)
- Clear Next.js cache: `rm -rf .next`

### File size too large
- Consider optimizing images before download
- Use tools like `sharp` or online optimizers
- WordPress images are already optimized by ShortPixel, so they should be reasonable size

---

## Post-Migration Checklist

- [ ] All carousel images downloaded and named correctly
- [ ] Featured logos in place
- [ ] Main logo updated
- [ ] OG image for social sharing added
- [ ] `content.ts` file updated with correct paths
- [ ] Test the landing page: `npm run dev`
- [ ] Verify images load correctly
- [ ] Check mobile responsiveness
- [ ] Test carousel navigation

---

## Performance Tips

1. **Use WebP format** - Already optimized by ShortPixel
2. **Lazy load images** - Next.js Image component handles this automatically
3. **Optimize file sizes** - Most WordPress images are already optimized
4. **Use appropriate sizes** - Don't use 4K images for thumbnails

---

## Need Help?

If you encounter issues:
1. Check the script output for specific error messages
2. Verify file permissions on `public/` directory
3. Ensure Node.js version is 14+ (`node --version`)
4. Check that `lib/homepage.html` exists and is readable
