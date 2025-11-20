const geolib = require("geolib");
const Location = require("../models/Location");

const verifyUserLocation = async (userLat, userLon, locationId) => {
  try {
    const location = await Location.findByPk(locationId);

    if (!location || !location.isActive) {
      return {
        valid: false,
        message: "Location not found or inactive",
      };
    }

    const distance = calculateDistance(
      userLat,
      userLon,
      location.latitude,
      location.longitude
    );
    const isWithinRange = distance <= location.radiusMeters;

    return {
      valid: isWithinRange,
      distance,
      allowedRadius: location.radiusMeters,
      message: isWithinRange
        ? "Location verified successfully"
        : `You must be within ${location.radiusMeters}m of the participating store. You are ${distance}m away.`,
    };
  } catch (error) {
    console.error("Error verifying location:", error);
    throw new Error("Failed to verify location");
  }
};

function toRadians(degrees) {
  return degrees * (Math.PI / 180);
}

// Export calculateDistance so it can be used in controllers
function calculateDistance(lat1, lng1, lat2, lng2) {
  const R = 6371000; // Earth's radius in meters
  const dLat = toRadians(lat2 - lat1);
  const dLng = toRadians(lng2 - lng1);

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRadians(lat1)) *
      Math.cos(toRadians(lat2)) *
      Math.sin(dLng / 2) *
      Math.sin(dLng / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

const getNearbyLocations = async (userLat, userLon) => {
  try {
    const locations = await Location.findAll({
      where: { isActive: true },
      raw: true,
    });

    const nearbyLocations = locations
      .map((location) => {
        const distance = calculateDistance(
          userLat,
          userLon,
          location.latitude,
          location.longitude
        );
        console.log("distance:", distance);

        // const distance = geolib.getDistance(
        //   { latitude: userLat, longitude: userLon },
        //   {
        //     latitude: parseFloat(location.latitude),
        //     longitude: parseFloat(location.longitude),
        //   }
        // );

        return {
          ...location,
          distance,
        };
      })
      .filter((loc) => loc.distance <= locations.radiusMeters)
      .sort((a, b) => a.distance - b.distance);

    return nearbyLocations;
  } catch (error) {
    console.error("Error getting nearby locations:", error);
    throw new Error("Failed to get nearby locations");
  }
};

module.exports = {
  verifyUserLocation,
  getNearbyLocations,
  calculateDistance,
};
