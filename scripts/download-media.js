#!/usr/bin/env node

/**
 * Script to download all media from WordPress site to Next.js public directory
 * 
 * Usage: node scripts/download-media.js
 */

const fs = require('fs');
const path = require('path');
const https = require('https');
const http = require('http');

const HTML_FILE = path.join(__dirname, '../lib/homepage.html');
const PUBLIC_DIR = path.join(__dirname, '../public');
const LANDING_DIR = path.join(__dirname, '../public/landing');

// Ensure directories exist
[PUBLIC_DIR, LANDING_DIR].forEach(dir => {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
});

// Extract all image URLs from HTML
function extractImageUrls(html) {
  const urls = new Set();
  
  // Match all img src attributes
  const imgRegex = /<img[^>]+src=["']([^"']+)["']/gi;
  let match;
  while ((match = imgRegex.exec(html)) !== null) {
    const url = match[1];
    if (url.startsWith('http://') || url.startsWith('https://')) {
      urls.add(url);
    }
  }
  
  // Match all srcset attributes (for responsive images)
  const srcsetRegex = /srcset=["']([^"']+)["']/gi;
  while ((match = srcsetRegex.exec(html)) !== null) {
    // Split by comma, then extract URL (first part before space or descriptor)
    const srcsetEntries = match[1].split(',');
    srcsetEntries.forEach(entry => {
      const trimmed = entry.trim();
      // URL is the first part before space (or the whole thing if no space)
      const url = trimmed.split(/\s+/)[0];
      if (url.startsWith('http://') || url.startsWith('https://')) {
        urls.add(url);
      }
    });
  }
  
  // Match meta og:image
  const ogImageRegex = /property=["']og:image["'][^>]+content=["']([^"']+)["']/gi;
  while ((match = ogImageRegex.exec(html)) !== null) {
    const url = match[1];
    if (url.startsWith('http://') || url.startsWith('https://')) {
      urls.add(url);
    }
  }
  
  return Array.from(urls).filter(url => {
    // Filter to only image URLs and ensure they're valid
    return (url.startsWith('http://') || url.startsWith('https://')) &&
           /\.(webp|png|jpg|jpeg|svg|gif)(\?|$)/i.test(url);
  });
}

// Download a file from URL
function downloadFile(url, destPath) {
  return new Promise((resolve, reject) => {
    // Validate URL
    if (!url.startsWith('http://') && !url.startsWith('https://')) {
      reject(new Error(`Invalid URL: ${url}`));
      return;
    }
    
    const protocol = url.startsWith('https') ? https : http;
    
    const file = fs.createWriteStream(destPath);
    
    const request = protocol.get(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36'
      }
    }, (response) => {
      if (response.statusCode === 301 || response.statusCode === 302) {
        // Handle redirects
        file.close();
        if (fs.existsSync(destPath)) {
          fs.unlinkSync(destPath);
        }
        return downloadFile(response.headers.location, destPath)
          .then(resolve)
          .catch(reject);
      }
      
      if (response.statusCode !== 200) {
        file.close();
        if (fs.existsSync(destPath)) {
          fs.unlinkSync(destPath);
        }
        reject(new Error(`Failed to download ${url}: ${response.statusCode}`));
        return;
      }
      
      // Check content type
      const contentType = response.headers['content-type'];
      if (contentType && !contentType.startsWith('image/')) {
        file.close();
        if (fs.existsSync(destPath)) {
          fs.unlinkSync(destPath);
        }
        reject(new Error(`Not an image: ${url} (content-type: ${contentType})`));
        return;
      }
      
      response.pipe(file);
      
      file.on('finish', () => {
        file.close();
        // Verify file was written and is valid
        if (fs.existsSync(destPath)) {
          const stats = fs.statSync(destPath);
          if (stats.size === 0) {
            fs.unlinkSync(destPath);
            reject(new Error(`Downloaded file is empty: ${url}`));
            return;
          }
          // Check file header to ensure it's a valid image
          const buffer = fs.readFileSync(destPath, { start: 0, end: 12 });
          const isValidImage = 
            buffer[0] === 0xFF && buffer[1] === 0xD8 && buffer[2] === 0xFF || // JPEG
            buffer[0] === 0x89 && buffer[1] === 0x50 && buffer[2] === 0x4E && buffer[3] === 0x47 || // PNG
            buffer[0] === 0x52 && buffer[1] === 0x49 && buffer[2] === 0x46 && buffer[3] === 0x46 || // WebP (RIFF)
            buffer[0] === 0x3C && buffer[1] === 0x73 && buffer[2] === 0x76 && buffer[3] === 0x67; // SVG
          
          if (!isValidImage) {
            fs.unlinkSync(destPath);
            reject(new Error(`Downloaded file is not a valid image: ${url}`));
            return;
          }
          resolve(destPath);
        } else {
          reject(new Error(`File was not created: ${url}`));
        }
      });
    });
    
    request.on('error', (err) => {
      file.close();
      if (fs.existsSync(destPath)) {
        fs.unlinkSync(destPath);
      }
      reject(err);
    });
    
    request.setTimeout(30000, () => {
      request.destroy();
      file.close();
      if (fs.existsSync(destPath)) {
        fs.unlinkSync(destPath);
      }
      reject(new Error(`Timeout downloading ${url}`));
    });
  });
}

// Get filename from URL
function getFilename(url) {
  // Remove query parameters
  const urlPath = url.split('?')[0];
  // Extract filename
  const filename = path.basename(urlPath);
  return filename;
}

// Categorize images based on URL patterns
function categorizeImage(url, filename) {
  // Carousel images (from the carousel section)
  if (url.includes('Screenshot-2024-12-02') || 
      url.includes('2026/01/') ||
      url.includes('2025/12/Z1006364') ||
      url.includes('2024/12/Screenshot')) {
    return { type: 'carousel', dir: LANDING_DIR };
  }
  
  // Featured logos
  if (url.includes('Business-Times-logo') || 
      url.includes('logo-og-768x769')) {
    return { type: 'featured', dir: LANDING_DIR };
  }
  
  // Main logo
  if (url.includes('cropped-NS-Logo-Red-copy') && !url.includes('32x32') && !url.includes('192x192') && !url.includes('180x180') && !url.includes('270x270')) {
    return { type: 'logo', dir: PUBLIC_DIR, filename: 'logo.png' };
  }
  
  // OG image
  if (url.includes('1-2.webp') && url.includes('2026/01')) {
    return { type: 'og-image', dir: PUBLIC_DIR, filename: 'og-image.webp' };
  }
  
  // Default: put in landing directory
  return { type: 'other', dir: LANDING_DIR };
}

// Main function
async function main() {
  console.log('📥 Starting media download...\n');
  
  // Read HTML file
  const html = fs.readFileSync(HTML_FILE, 'utf-8');
  
  // Extract all image URLs
  const imageUrls = extractImageUrls(html);
  console.log(`Found ${imageUrls.length} unique image URLs\n`);
  
  // Filter out invalid URLs and group by category
  const carouselImages = [];
  const featuredLogos = [];
  const otherImages = [];
  
  imageUrls.forEach(url => {
    // Skip if URL is invalid
    if (!url || !url.startsWith('http')) {
      console.warn(`⚠ Skipping invalid URL: ${url}`);
      return;
    }
    
    const category = categorizeImage(url, getFilename(url));
    if (category.type === 'carousel') {
      carouselImages.push({ url, category });
    } else if (category.type === 'featured') {
      featuredLogos.push({ url, category });
    } else {
      otherImages.push({ url, category });
    }
  });
  
  // Remove duplicates by URL
  const seenUrls = new Set();
  const uniqueCarousel = carouselImages.filter(({ url }) => {
    if (seenUrls.has(url)) return false;
    seenUrls.add(url);
    return true;
  });
  const uniqueFeatured = featuredLogos.filter(({ url }) => {
    if (seenUrls.has(url)) return false;
    seenUrls.add(url);
    return true;
  });
  
  // Use unique arrays
  carouselImages.length = 0;
  carouselImages.push(...uniqueCarousel);
  featuredLogos.length = 0;
  featuredLogos.push(...uniqueFeatured);
  
  console.log(`📸 Carousel images: ${carouselImages.length}`);
  console.log(`🏢 Featured logos: ${featuredLogos.length}`);
  console.log(`📁 Other images: ${otherImages.length}\n`);
  
  // Download carousel images (prioritize these, limit to 11 unique)
  console.log('Downloading carousel images...');
  const carouselFiles = [];
  const maxCarouselImages = 11;
  const imagesToDownload = carouselImages.slice(0, maxCarouselImages);
  
  for (let i = 0; i < imagesToDownload.length; i++) {
    const { url, category } = imagesToDownload[i];
    const filename = `carousel-${i + 1}.webp`;
    const destPath = path.join(category.dir, filename);
    
    try {
      console.log(`  [${i + 1}/${imagesToDownload.length}] Downloading ${filename}...`);
      console.log(`      From: ${url.substring(0, 80)}...`);
      await downloadFile(url, destPath);
      carouselFiles.push(`/landing/${filename}`);
      console.log(`  ✓ Saved to ${destPath}`);
    } catch (error) {
      console.error(`  ✗ Failed to download:`, error.message);
      console.error(`      URL: ${url}`);
    }
  }
  
  if (carouselImages.length > maxCarouselImages) {
    console.log(`\n  ℹ Note: Found ${carouselImages.length} carousel images, downloaded first ${maxCarouselImages}`);
  }
  
  // Download featured logos (use largest size available)
  console.log('\nDownloading featured logos...');
  const featuredFiles = [];
  
  // Group featured logos by type
  const businessTimesLogos = featuredLogos.filter(({ url }) => url.includes('Business-Times-logo'));
  const otherFeaturedLogos = featuredLogos.filter(({ url }) => !url.includes('Business-Times-logo'));
  
  // Download Business Times logo (prefer largest size)
  if (businessTimesLogos.length > 0) {
    // Sort by size indicator in filename (largest first)
    businessTimesLogos.sort((a, b) => {
      const getSize = (url) => {
        const match = url.match(/(\d+)x(\d+)/);
        return match ? parseInt(match[1]) * parseInt(match[2]) : 0;
      };
      return getSize(b.url) - getSize(a.url);
    });
    
    const { url } = businessTimesLogos[0];
    const destPath = path.join(LANDING_DIR, 'business-times-logo.png');
    try {
      console.log(`  [1/2] Downloading business-times-logo.png...`);
      await downloadFile(url, destPath);
      featuredFiles.push({ src: `/landing/business-times-logo.png`, alt: 'Business Times' });
      console.log(`  ✓ Saved to ${destPath}`);
    } catch (error) {
      console.error(`  ✗ Failed to download ${url}:`, error.message);
    }
  }
  
  // Download other featured logo
  if (otherFeaturedLogos.length > 0) {
    // Sort by size (largest first)
    otherFeaturedLogos.sort((a, b) => {
      const getSize = (url) => {
        const match = url.match(/(\d+)x(\d+)/);
        return match ? parseInt(match[1]) * parseInt(match[2]) : 0;
      };
      return getSize(b.url) - getSize(a.url);
    });
    
    const { url } = otherFeaturedLogos[0];
    const destPath = path.join(LANDING_DIR, 'featured-logo-2.png');
    try {
      console.log(`  [2/2] Downloading featured-logo-2.png...`);
      await downloadFile(url, destPath);
      featuredFiles.push({ src: `/landing/featured-logo-2.png`, alt: 'Featured Publication' });
      console.log(`  ✓ Saved to ${destPath}`);
    } catch (error) {
      console.error(`  ✗ Failed to download ${url}:`, error.message);
    }
  }
  
  // Download other important images (only download once per filename)
  console.log('\nDownloading other images...');
  const downloadedFiles = new Set();
  for (const { url, category } of otherImages) {
    if (category.filename && !downloadedFiles.has(category.filename)) {
      const destPath = path.join(category.dir, category.filename);
      try {
        console.log(`  Downloading ${category.filename}...`);
        await downloadFile(url, destPath);
        downloadedFiles.add(category.filename);
        console.log(`  ✓ Saved to ${destPath}`);
      } catch (error) {
        console.error(`  ✗ Failed to download ${url}:`, error.message);
      }
    }
  }
  
  // Update content.ts with downloaded carousel images
  console.log('\n📝 Updating content.ts...');
  const contentFile = path.join(__dirname, '../components/landing/content.ts');
  let content = fs.readFileSync(contentFile, 'utf-8');
  
  // Update carousel images array
  const carouselArray = `export const LANDING_CAROUSEL_IMAGES = [\n${carouselFiles.map(f => `  "${f}",`).join('\n')}\n];`;
  content = content.replace(
    /export const LANDING_CAROUSEL_IMAGES = \[[\s\S]*?\];/,
    carouselArray
  );
  
  // Update featured logos array
  if (featuredFiles.length > 0) {
    const featuredArray = `export const FEATURED_IN_LOGOS = [\n${featuredFiles.map(f => `  {\n    src: "${f.src}",\n    alt: "${f.alt}",\n  },`).join('\n')}\n];`;
    content = content.replace(
      /export const FEATURED_IN_LOGOS = \[[\s\S]*?\];/,
      featuredArray
    );
  }
  
  fs.writeFileSync(contentFile, content);
  console.log('  ✓ Updated content.ts\n');
  
  console.log('✅ Media download complete!');
  console.log(`\n📊 Summary:`);
  console.log(`   - Carousel images: ${carouselFiles.length}`);
  console.log(`   - Featured logos: ${featuredFiles.length}`);
  console.log(`   - Total downloaded: ${carouselFiles.length + featuredFiles.length}`);
}

// Run the script
main().catch(error => {
  console.error('❌ Error:', error);
  process.exit(1);
});
