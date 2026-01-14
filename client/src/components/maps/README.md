# Google Maps Integration

## How to Get a Google Maps API Key

1. **Go to the Google Cloud Console**
   - Visit [Google Cloud Console](https://console.cloud.google.com/)
   - Create a new project or select an existing one

2. **Enable the Required APIs**
   - In your project, navigate to "APIs & Services" > "Library"
   - Search for and enable the following APIs:
     - Maps JavaScript API
     - Places API
     - Geocoding API
     - Distance Matrix API

3. **Create API Key**
   - Go to "APIs & Services" > "Credentials"
   - Click "Create Credentials" > "API Key"
   - Your new API key will appear on the screen

4. **Restrict the API Key (Recommended)**
   - In the credentials page, find your API key and click "Edit"
   - Under "Application restrictions", choose "HTTP referrers" and add your website domains
   - Under "API restrictions", select the APIs you enabled in step 2
   - Click "Save"

5. **Add the API Key to Your Application**
   - Open `public/index.html`
   - Replace `YOUR_API_KEY_HERE` in the Google Maps script tag with your actual API key:
   ```html
   <script src="https://maps.googleapis.com/maps/api/js?key=YOUR_ACTUAL_API_KEY&libraries=places"></script>
   ```

## Features in the Map Integration

- **Location Search**: Users can search for addresses using Google Places Autocomplete
- **Map Interaction**: Users can click on the map or drag the marker to select a location
- **Geocoding**: Converts between addresses and coordinates
- **Distance Calculation**: Calculates distances between pickup and dropoff locations

## Troubleshooting

If the map doesn't appear or you encounter errors:

1. Check browser console for error messages
2. Verify that your API key is correctly set in the HTML file
3. Make sure all required APIs are enabled in your Google Cloud Console
4. Check if your API key has the correct restrictions set

## Billing Information

Google Maps Platform uses a pay-as-you-go pricing model. You get $200 of free usage each month, which is generally sufficient for smaller applications. For detailed pricing information, visit the [Google Maps Platform Pricing page](https://cloud.google.com/maps-platform/pricing). 