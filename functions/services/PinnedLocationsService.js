const { db, admin } = require('../config/firebase');

class PinnedLocationsService {
  constructor() {
    this.collection = db.collection('client_pinned_locations');
  }

  // Get pinned locations for a client with smart suggestions
  async getClientLocations(clientId, options = {}) {
    try {
      const doc = await this.collection.doc(clientId).get();
      
      if (!doc.exists) {
        return {
          locations: [],
          suggestions: {
            frequent: [],
            recent: [],
            nearby: []
          },
          analytics: {
            totalLocations: 0,
            totalUsage: 0,
            categoryCounts: {},
            mostUsed: null,
            leastUsed: null
          }
        };
      }

      const data = doc.data();
      const locations = data.locations || [];

      // Generate smart suggestions
      const suggestions = this.generateSmartSuggestions(locations, options);
      
      // Generate analytics
      const analytics = this.generateAnalytics(locations);

      return {
        locations,
        suggestions,
        analytics
      };
    } catch (error) {
      console.error('Error getting client locations:', error);
      throw error;
    }
  }

  // Generate smart suggestions based on usage patterns
  generateSmartSuggestions(locations, options = {}) {
    const suggestions = {
      frequent: [],
      recent: [],
      nearby: [],
      recommended: []
    };

    if (locations.length === 0) {
      return suggestions;
    }

    // Most frequently used locations (top 5)
    suggestions.frequent = locations
      .filter(loc => (loc.usageCount || 0) > 0)
      .sort((a, b) => (b.usageCount || 0) - (a.usageCount || 0))
      .slice(0, 5);

    // Recently used locations (last 30 days, top 5)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    
    suggestions.recent = locations
      .filter(loc => {
        if (!loc.lastUsed) return false;
        const lastUsedDate = new Date(loc.lastUsed.seconds ? loc.lastUsed.seconds * 1000 : loc.lastUsed);
        return lastUsedDate > thirtyDaysAgo;
      })
      .sort((a, b) => {
        const aDate = new Date(a.lastUsed.seconds ? a.lastUsed.seconds * 1000 : a.lastUsed);
        const bDate = new Date(b.lastUsed.seconds ? b.lastUsed.seconds * 1000 : b.lastUsed);
        return bDate - aDate;
      })
      .slice(0, 5);

    // Nearby locations (if user coordinates provided)
    if (options.userCoordinates) {
      suggestions.nearby = locations
        .filter(loc => loc.coordinates)
        .map(loc => ({
          ...loc,
          distance: this.calculateDistance(
            options.userCoordinates,
            loc.coordinates
          )
        }))
        .filter(loc => loc.distance <= 10) // Within 10km
        .sort((a, b) => a.distance - b.distance)
        .slice(0, 5);
    }

    // Recommended locations based on patterns
    suggestions.recommended = this.generateRecommendations(locations);

    return suggestions;
  }

  // Generate analytics for client locations
  generateAnalytics(locations) {
    const analytics = {
      totalLocations: locations.length,
      totalUsage: 0,
      categoryCounts: {},
      mostUsed: null,
      leastUsed: null,
      averageUsage: 0,
      defaultLocation: null,
      creationTrend: {},
      usageTrend: {}
    };

    if (locations.length === 0) {
      return analytics;
    }

    // Calculate totals and find extremes
    let maxUsage = 0;
    let minUsage = Infinity;
    let totalUsage = 0;

    locations.forEach(location => {
      const usage = location.usageCount || 0;
      totalUsage += usage;

      // Category counts
      const category = location.category || 'business';
      analytics.categoryCounts[category] = (analytics.categoryCounts[category] || 0) + 1;

      // Most/least used
      if (usage > maxUsage) {
        maxUsage = usage;
        analytics.mostUsed = location;
      }
      if (usage < minUsage && usage >= 0) {
        minUsage = usage;
        analytics.leastUsed = location;
      }

      // Default location
      if (location.isDefault) {
        analytics.defaultLocation = location;
      }
    });

    analytics.totalUsage = totalUsage;
    analytics.averageUsage = locations.length > 0 ? totalUsage / locations.length : 0;

    // Creation trend (last 6 months)
    analytics.creationTrend = this.generateCreationTrend(locations);

    return analytics;
  }

  // Generate location recommendations based on patterns
  generateRecommendations(locations) {
    const recommendations = [];

    // Recommend creating a default location if none exists
    const hasDefault = locations.some(loc => loc.isDefault);
    if (!hasDefault && locations.length > 0) {
      const mostUsed = locations.reduce((max, loc) => 
        (loc.usageCount || 0) > (max.usageCount || 0) ? loc : max
      );
      
      recommendations.push({
        type: 'set_default',
        title: 'Set Default Location',
        description: `Consider setting "${mostUsed.name}" as your default location`,
        location: mostUsed,
        priority: 'high'
      });
    }

    // Recommend adding business locations if client only has residential
    const categories = locations.reduce((cats, loc) => {
      cats[loc.category || 'business'] = (cats[loc.category || 'business'] || 0) + 1;
      return cats;
    }, {});

    if (categories.residential && !categories.business) {
      recommendations.push({
        type: 'add_business',
        title: 'Add Business Location',
        description: 'Consider adding your office or business locations for work deliveries',
        priority: 'medium'
      });
    }

    // Recommend cleaning up unused locations
    const unusedLocations = locations.filter(loc => (loc.usageCount || 0) === 0);
    if (unusedLocations.length > 3) {
      recommendations.push({
        type: 'cleanup',
        title: 'Clean Up Unused Locations',
        description: `You have ${unusedLocations.length} unused locations. Consider removing ones you don't need.`,
        priority: 'low'
      });
    }

    return recommendations.slice(0, 3); // Return top 3 recommendations
  }

  // Generate creation trend for the last 6 months
  generateCreationTrend(locations) {
    const trend = {};
    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

    locations.forEach(location => {
      if (!location.created_at) return;
      
      const createdDate = new Date(location.created_at.seconds ? location.created_at.seconds * 1000 : location.created_at);
      if (createdDate < sixMonthsAgo) return;

      const monthKey = `${createdDate.getFullYear()}-${String(createdDate.getMonth() + 1).padStart(2, '0')}`;
      trend[monthKey] = (trend[monthKey] || 0) + 1;
    });

    return trend;
  }

  // Calculate distance between two coordinates (Haversine formula)
  calculateDistance(coord1, coord2) {
    const R = 6371; // Earth's radius in kilometers
    const dLat = this.toRadians(coord2.lat - coord1.lat);
    const dLon = this.toRadians(coord2.lng - coord1.lng);
    
    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
              Math.cos(this.toRadians(coord1.lat)) * Math.cos(this.toRadians(coord2.lat)) *
              Math.sin(dLon / 2) * Math.sin(dLon / 2);
    
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    const distance = R * c;
    
    return Math.round(distance * 100) / 100; // Round to 2 decimal places
  }

  toRadians(degrees) {
    return degrees * (Math.PI / 180);
  }

  // Validate location data before saving
  validateLocationData(locationData) {
    const errors = [];

    if (!locationData.name || !locationData.name.trim()) {
      errors.push('Location name is required');
    }

    if (!locationData.address || !locationData.address.trim()) {
      errors.push('Location address is required');
    }

    if (locationData.name && locationData.name.length > 100) {
      errors.push('Location name must be less than 100 characters');
    }

    if (locationData.address && locationData.address.length > 500) {
      errors.push('Location address must be less than 500 characters');
    }

    if (locationData.notes && locationData.notes.length > 1000) {
      errors.push('Notes must be less than 1000 characters');
    }

    if (locationData.contactNumber && !/^[\+]?[0-9\s\-\(\)]{7,20}$/.test(locationData.contactNumber)) {
      errors.push('Invalid contact number format');
    }

    const validCategories = ['business', 'residential', 'commercial', 'industrial'];
    if (locationData.category && !validCategories.includes(locationData.category)) {
      errors.push('Invalid category');
    }

    return errors;
  }

  // Check for duplicate locations within a certain radius
  async checkForDuplicates(clientId, locationData, excludeId = null) {
    try {
      const doc = await this.collection.doc(clientId).get();
      
      if (!doc.exists) {
        return [];
      }

      const data = doc.data();
      const locations = data.locations || [];
      const duplicates = [];

      locations.forEach(location => {
        if (excludeId && location.id === excludeId) return;

        // Check for exact name match
        if (location.name.toLowerCase() === locationData.name.toLowerCase()) {
          duplicates.push({
            type: 'name',
            location,
            reason: 'Same name'
          });
        }

        // Check for nearby coordinates (within 100 meters)
        if (location.coordinates && locationData.coordinates) {
          const distance = this.calculateDistance(location.coordinates, locationData.coordinates);
          if (distance < 0.1) { // Less than 100 meters
            duplicates.push({
              type: 'proximity',
              location,
              reason: `Only ${Math.round(distance * 1000)}m away`,
              distance
            });
          }
        }

        // Check for similar address
        if (this.calculateStringSimilarity(location.address, locationData.address) > 0.8) {
          duplicates.push({
            type: 'address',
            location,
            reason: 'Similar address'
          });
        }
      });

      return duplicates;
    } catch (error) {
      console.error('Error checking for duplicates:', error);
      return [];
    }
  }

  // Calculate string similarity using Levenshtein distance
  calculateStringSimilarity(str1, str2) {
    const len1 = str1.length;
    const len2 = str2.length;
    const matrix = Array(len2 + 1).fill().map(() => Array(len1 + 1).fill(0));

    for (let i = 0; i <= len1; i++) matrix[0][i] = i;
    for (let j = 0; j <= len2; j++) matrix[j][0] = j;

    for (let j = 1; j <= len2; j++) {
      for (let i = 1; i <= len1; i++) {
        const substitutionCost = str1[i - 1] === str2[j - 1] ? 0 : 1;
        matrix[j][i] = Math.min(
          matrix[j][i - 1] + 1,
          matrix[j - 1][i] + 1,
          matrix[j - 1][i - 1] + substitutionCost
        );
      }
    }

    const maxLength = Math.max(len1, len2);
    return maxLength === 0 ? 1 : (maxLength - matrix[len2][len1]) / maxLength;
  }

  // Get location usage statistics
  async getLocationUsageStats(clientId, locationId) {
    try {
      const doc = await this.collection.doc(clientId).get();
      
      if (!doc.exists) {
        return null;
      }

      const data = doc.data();
      const locations = data.locations || [];
      const location = locations.find(loc => loc.id === locationId);

      if (!location) {
        return null;
      }

      // Get delivery history for this location (this would require integration with deliveries collection)
      // For now, return basic stats
      return {
        location,
        usageCount: location.usageCount || 0,
        lastUsed: location.lastUsed,
        createdAt: location.created_at,
        category: location.category,
        isDefault: location.isDefault || false
      };
    } catch (error) {
      console.error('Error getting location usage stats:', error);
      throw error;
    }
  }
}

module.exports = new PinnedLocationsService();
