# Trucking App Media Assets

This directory contains images and media files for the trucking web application.

## Login Page Assets

### Required Images

**Truck Hero Image (Desktop)**
- File: `truck-hero.jpg`
- Recommended size: 1920x1080px or higher
- Purpose: Background image for the left side of the login page on desktop
- Suggested content: Trucks on highway, fleet of trucks, or professional trucking scene

**Optional Video Background**
- File: `truck-fleet.mp4` (place in `/videos/` folder)
- Recommended format: MP4, WebM compatible
- Purpose: Animated background alternative to static image
- Suggested content: Trucks driving, fleet management footage

### Current Assets

- `truck-background.jpg` - Currently used as fallback background
- `logo.png.webp` - Company logo

### Image Recommendations

For best results, use images that are:
- High quality (1920px wide or larger)
- Professional trucking/logistics themed
- Good contrast for white text overlay
- Landscape orientation for hero section

### How to Add Your Images

1. **Static Hero Image**: Add `truck-hero.jpg` to this folder
2. **Video Background**: 
   - Create a `videos` folder in `/public/`
   - Add `truck-fleet.mp4` to that folder
   - Uncomment the video section in `Login.js`

### Troubleshooting

- If images don't load, check the file names match exactly
- Ensure images are in the correct format (JPG, PNG, WebP)
- Video files should be web-optimized and under 10MB for good performance

### Placeholder Behavior

If the truck hero image isn't found, the design gracefully falls back to the gradient background, so the app will work without custom images. 