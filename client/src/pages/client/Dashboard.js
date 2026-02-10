import React, { useState, useEffect, useContext } from "react";
import { Link, useHistory } from "react-router-dom";
import axios from "axios";
import {
  FaTruck,
  FaShippingFast,
  FaCalendarAlt,
  FaMapMarkerAlt,
  FaPlus,
  FaEye,
  FaSignOutAlt,
  FaSearch,
  FaRoute,
  FaExclamationTriangle,
  FaUser,
  FaCreditCard,
} from "react-icons/fa";
import { AuthContext } from "../../context/AuthContext";
import Loader from "../../components/common/Loader";
import StatusBadge from "../../components/common/StatusBadge";
import Modal from "../../components/common/Modal";
import WarningModal from "../../components/common/WarningModal";
import LocationPicker from "../../components/maps/LocationPicker";
import RouteMap from "../../components/maps/RouteMap";
import PortalLocationPicker from "../../components/maps/PortalLocationPicker";
import enhancedIsolatedMapModal from "../../components/maps/EnhancedIsolatedMapModal";
import useWarningModal from "../../hooks/useWarningModal";

const Dashboard = () => {
  const { authUser, logout } = useContext(AuthContext) || {
    authUser: null,
    logout: () => {},
  };
  const history = useHistory();
  const [clientData, setClientData] = useState(null);
  const [allocatedTrucks, setAllocatedTrucks] = useState([]);
  const [deliveries, setDeliveries] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showBookingModal, setShowBookingModal] = useState(false);
  const [error, setError] = useState(null);
  const [warning, setWarning] = useState("");
  const [bookingData, setBookingData] = useState({
    pickupLocation: "",
    pickupCoordinates: null,
    dropoffLocation: "",
    dropoffCoordinates: null,
    weight: "",
    deliveryDate: "",
    deliveryTime: "",
    selectedTrucks: [], // Array for multiple truck selection
  });

  // State for recommended trucks based on capacity
  const [recommendedTrucks, setRecommendedTrucks] = useState([]);

  // Map modal states
  const [showPickupMapModal, setShowPickupMapModal] = useState(false);
  const [showDropoffMapModal, setShowDropoffMapModal] = useState(false);
  const [mapType, setMapType] = useState("pickup"); // 'pickup' or 'dropoff'

  // Add a state for showing route preview
  const [showRoutePreview, setShowRoutePreview] = useState(false);

  // Add this state for route information
  const [routeDetails, setRouteDetails] = useState(null);

  // State for vehicle rates from staff dashboard
  const [vehicleRates, setVehicleRates] = useState([]);

  // Warning modal hook
  const {
    modalState,
    hideModal,
    showWarning,
    showError,
    showSuccess,
    showInfo,
    showConfirm,
  } = useWarningModal();

  // Set default date and time for the form
  useEffect(() => {
    // Set default date to tomorrow
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);

    // Format date as YYYY-MM-DD
    const formattedDate = tomorrow.toISOString().split("T")[0];

    // Set default time to noon (12:00)
    const defaultTime = "12:00";

    setBookingData((prev) => ({
      ...prev,
      deliveryDate: formattedDate,
      deliveryTime: defaultTime,
    }));
  }, []);

  // Set up axios with token
  useEffect(() => {
    const token = localStorage.getItem("token");
    if (token) {
      axios.defaults.headers.common["Authorization"] = `Bearer ${token}`;
      console.log("✅ Token set in axios headers");
    } else {
      console.log("❌ No token found in localStorage");
    }
  }, []);

  // Function to fetch vehicle rates
  const fetchVehicleRates = async () => {
    try {
      console.log("🔄 Fetching vehicle rates...");
      const response = await axios.get("/api/clients/vehicle-rates", {
        headers: {
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
      });

      if (response.data.success) {
        console.log("✅ Vehicle rates fetched:", response.data.data);
        setVehicleRates(response.data.data || []);
      }
    } catch (error) {
      console.error("❌ Error fetching vehicle rates:", error);
      // Keep empty array if fetch fails - will use default rates
      setVehicleRates([]);
    }
  };

  // Fetch client data
  useEffect(() => {
    const fetchClientData = async () => {
      try {
        setIsLoading(true);
        setError(null);
        setWarning("");

        // Fetch client profile
        try {
          console.log("🔄 Fetching client profile...");
          const profileRes = await axios.get("/api/clients/profile");
          console.log("✅ Client profile response:", profileRes.data);
          setClientData(profileRes.data);
        } catch (profileError) {
          console.error(
            "❌ Error fetching profile:",
            profileError.response || profileError.message,
          );
          setError("Failed to load profile data. Please try again later.");
          // Don't return here - still try to fetch trucks and deliveries
        }

        // Fetch all available trucks for booking
        try {
          console.log("🔄 Fetching all available trucks for booking...");

          // Fetch both allocated trucks and available trucks for booking flexibility
          const [allocatedRes, availableRes] = await Promise.all([
            axios
              .get("/api/clients/profile/trucks")
              .catch(() => ({ data: [] })),
            axios.get("/api/trucks/available").catch(() => ({ data: [] })),
          ]);

          console.log("✅ Allocated trucks response:", allocatedRes.data);
          console.log("✅ Available trucks response:", availableRes.data);

          // Combine and deduplicate trucks
          const allTrucks = [
            ...(allocatedRes.data || []),
            ...(availableRes.data || []),
          ];
          const uniqueTrucks = allTrucks.filter(
            (truck, index, self) =>
              index ===
              self.findIndex(
                (t) => (t.id || t.TruckID) === (truck.id || truck.TruckID),
              ),
          );

          if (uniqueTrucks.length > 0) {
            // Normalize the truck data structure to ensure TruckID, etc.
            const normalizedTrucks = uniqueTrucks.map((truck) => ({
              // Use standardized property names with fallbacks
              TruckID: truck.TruckID || truck.id,
              TruckPlate: truck.TruckPlate || truck.truckPlate,
              TruckType: truck.TruckType || truck.truckType,
              TruckCapacity: truck.TruckCapacity || truck.truckCapacity,
              TruckStatus: truck.TruckStatus || truck.truckStatus, // Include truck status!
              // Include all other fields that might be needed
              ...truck,
            }));
            console.log("✅ Normalized trucks for booking:", normalizedTrucks);
            setAllocatedTrucks(normalizedTrucks);
          } else {
            setAllocatedTrucks([]);
          }
        } catch (trucksError) {
          console.error(
            "❌ Error fetching trucks:",
            trucksError.response || trucksError.message,
          );
          setAllocatedTrucks([]);
          setWarning((prev) => prev + " Unable to load trucks for booking.");
        }

        // Fetch deliveries
        try {
          console.log("🔄 Fetching deliveries...");
          const deliveriesRes = await axios.get(
            "/api/clients/profile/deliveries",
            {
              headers: {
                Authorization: `Bearer ${localStorage.getItem("token")}`,
                "Content-Type": "application/json",
              },
            },
          );
          console.log("✅ Deliveries response:", deliveriesRes.data);
          setDeliveries(deliveriesRes.data || []);
        } catch (deliveriesError) {
          console.error("❌ Error fetching deliveries:", deliveriesError);
          console.error("❌ Error details:", {
            status: deliveriesError.response?.status,
            data: deliveriesError.response?.data,
            message: deliveriesError.message,
          });

          setDeliveries([]);

          // If we get a 500 Internal Server Error, we should still allow the user to book trucks
          // This prevents the error from blocking the entire dashboard functionality
          if (
            deliveriesError.response?.status === 500 ||
            deliveriesError.response?.status === 403
          ) {
            console.log(
              "⚠️ Server error when fetching deliveries, but allowing dashboard to continue functioning",
            );
            // We'll show a warning but not block the entire dashboard
            setWarning(
              (prev) =>
                (prev ? prev + " " : "") +
                "Unable to load delivery history. Some features may be limited.",
            );
          }
        }

        setIsLoading(false);
      } catch (error) {
        console.error("❌ Error in fetchClientData:", error);
        setError("Failed to load dashboard data. Please refresh the page.");
        setIsLoading(false);
      }
    };

    fetchClientData();
    fetchVehicleRates();
  }, []);

  // Enhanced function to find the most efficient truck combination for cargo weight
  const findBestTruckCombination = (availableTrucks, targetWeight) => {
    console.log(
      `🔍 Finding most efficient truck combination for ${targetWeight} tons`,
    );
    console.log(
      "Available trucks:",
      availableTrucks.map((t) => `${t.TruckPlate}: ${t.TruckCapacity}t`),
    );

    if (!availableTrucks || availableTrucks.length === 0) {
      console.log("❌ No trucks available");
      return [];
    }

    // Sort trucks by capacity for analysis
    const sortedTrucks = [...availableTrucks].sort((a, b) => {
      const capacityA = parseFloat(a.TruckCapacity) || 0;
      const capacityB = parseFloat(b.TruckCapacity) || 0;
      return capacityA - capacityB; // Smallest first for efficiency analysis
    });

    console.log(
      "Available trucks by capacity:",
      sortedTrucks.map((t) => `${t.TruckPlate}: ${t.TruckCapacity}t`),
    );

    // Strategy 1: Find the most efficient single truck (closest capacity match)
    let bestSingleTruck = null;
    let smallestWaste = Infinity;

    for (const truck of sortedTrucks) {
      const capacity = parseFloat(truck.TruckCapacity) || 0;
      if (capacity >= targetWeight) {
        const waste = capacity - targetWeight;
        if (waste < smallestWaste) {
          smallestWaste = waste;
          bestSingleTruck = truck;
        }
      }
    }

    if (bestSingleTruck) {
      const efficiency = (
        (targetWeight / parseFloat(bestSingleTruck.TruckCapacity)) *
        100
      ).toFixed(1);
      console.log(
        `✅ Most efficient single truck: ${bestSingleTruck.TruckPlate} (${bestSingleTruck.TruckCapacity}t capacity, ${efficiency}% efficiency)`,
      );
      return [bestSingleTruck];
    }

    console.log(
      "🔄 No single truck can handle the cargo, finding optimal combination...",
    );

    // Strategy 2: Find the most efficient combination using a smart approach
    const findOptimalCombination = () => {
      let bestCombination = [];
      let bestEfficiency = 0;
      let bestWaste = Infinity;

      // Try all possible combinations (for small sets) or use heuristic for larger sets
      const maxCombinations = Math.min(Math.pow(2, sortedTrucks.length), 1000); // Limit for performance

      for (let i = 1; i < maxCombinations; i++) {
        const combination = [];
        let totalCapacity = 0;

        for (let j = 0; j < sortedTrucks.length; j++) {
          if (i & (1 << j)) {
            combination.push(sortedTrucks[j]);
            totalCapacity += parseFloat(sortedTrucks[j].TruckCapacity) || 0;
          }
        }

        if (totalCapacity >= targetWeight) {
          const efficiency = (targetWeight / totalCapacity) * 100;
          const waste = totalCapacity - targetWeight;

          // Prefer combinations with:
          // 1. Fewer trucks
          // 2. Higher efficiency (less waste)
          // 3. Smaller total capacity (if efficiency is similar)
          const isBetter =
            bestCombination.length === 0 ||
            combination.length < bestCombination.length ||
            (combination.length === bestCombination.length &&
              efficiency > bestEfficiency) ||
            (combination.length === bestCombination.length &&
              efficiency === bestEfficiency &&
              waste < bestWaste);

          if (isBetter) {
            bestCombination = combination;
            bestEfficiency = efficiency;
            bestWaste = waste;
          }
        }
      }

      return bestCombination;
    };

    // For larger truck sets, use a greedy heuristic approach
    const findGreedyOptimal = () => {
      // Sort trucks by efficiency for the target weight
      const trucksWithEfficiency = sortedTrucks
        .map((truck) => {
          const capacity = parseFloat(truck.TruckCapacity) || 0;
          let efficiency = 0;

          if (capacity <= targetWeight) {
            efficiency = capacity / targetWeight; // How much of the target this truck can handle
          } else {
            efficiency = targetWeight / capacity; // Efficiency if used alone
          }

          return { truck, capacity, efficiency };
        })
        .sort((a, b) => b.efficiency - a.efficiency);

      console.log(
        "Trucks sorted by efficiency:",
        trucksWithEfficiency.map(
          (t) =>
            `${t.truck.TruckPlate}: ${t.capacity}t (${(t.efficiency * 100).toFixed(1)}%)`,
        ),
      );

      const selectedTrucks = [];
      let remainingWeight = targetWeight;

      for (const { truck, capacity } of trucksWithEfficiency) {
        if (remainingWeight <= 0) break;

        // Add truck if it helps and doesn't create too much waste
        if (capacity > 0) {
          const wouldRemain = remainingWeight - capacity;

          // Add if it fits perfectly, reduces remaining weight significantly, or is the last needed
          if (wouldRemain >= -1 || capacity >= remainingWeight * 0.5) {
            selectedTrucks.push(truck);
            remainingWeight -= capacity;
            console.log(
              `➕ Added efficient truck: ${truck.TruckPlate} (${capacity}t), remaining: ${remainingWeight.toFixed(1)}t`,
            );
          }
        }
      }

      return selectedTrucks;
    };

    // Choose approach based on number of trucks
    let optimalTrucks;
    if (sortedTrucks.length <= 10) {
      optimalTrucks = findOptimalCombination();
    } else {
      optimalTrucks = findGreedyOptimal();
    }

    // Validate the solution
    if (optimalTrucks.length > 0) {
      const totalCapacity = optimalTrucks.reduce(
        (sum, truck) => sum + (parseFloat(truck.TruckCapacity) || 0),
        0,
      );

      if (totalCapacity >= targetWeight) {
        const efficiency = ((targetWeight / totalCapacity) * 100).toFixed(1);
        const waste = (totalCapacity - targetWeight).toFixed(1);

        console.log(`✅ Optimal solution found:`);
        console.log(`   Trucks: ${optimalTrucks.length}`);
        console.log(`   Total capacity: ${totalCapacity}t`);
        console.log(`   Cargo weight: ${targetWeight}t`);
        console.log(`   Efficiency: ${efficiency}%`);
        console.log(`   Waste: ${waste}t`);
        console.log(
          `   Combination: ${optimalTrucks.map((t) => `${t.TruckPlate}(${t.TruckCapacity}t)`).join(", ")}`,
        );

        return optimalTrucks;
      } else {
        console.log(
          `❌ Insufficient capacity: ${totalCapacity}t < ${targetWeight}t`,
        );
        return [];
      }
    }

    // No suitable combination found
    console.log("❌ No suitable truck combination found");
    return [];
  };

  // Helper function to check if truck is available on a specific date
  const isTruckAvailableOnDate = (truck, selectedDate) => {
    if (!selectedDate) return true; // If no date selected yet, show all trucks

    console.log(
      `🔍 Checking availability for truck ${truck.TruckPlate} on ${selectedDate}`,
    );

    // Check if truck has any delivery on the selected date
    const hasConflict = deliveries.some((delivery) => {
      // Check if this delivery uses this truck
      if (delivery.TruckID !== truck.TruckID) return false;

      // Only check active deliveries (pending, in-progress, etc.)
      const activeStatuses = [
        "pending",
        "in-progress",
        "started",
        "picked-up",
        "awaiting_confirmation",
      ];
      if (!activeStatuses.includes(delivery.DeliveryStatus?.toLowerCase()))
        return false;

      // Extract the delivery date and normalize to YYYY-MM-DD format
      let deliveryDate = null;
      if (delivery.deliveryDateString) {
        deliveryDate = delivery.deliveryDateString;
      } else if (delivery.DeliveryDate) {
        // Handle different date formats
        if (delivery.DeliveryDate.seconds) {
          deliveryDate = new Date(delivery.DeliveryDate.seconds * 1000)
            .toISOString()
            .split("T")[0];
        } else if (typeof delivery.DeliveryDate === "string") {
          deliveryDate = new Date(delivery.DeliveryDate)
            .toISOString()
            .split("T")[0];
        }
      }

      // Normalize both dates to YYYY-MM-DD format for comparison
      const normalizedDeliveryDate = deliveryDate
        ? new Date(deliveryDate).toISOString().split("T")[0]
        : null;
      const normalizedSelectedDate = new Date(selectedDate)
        .toISOString()
        .split("T")[0];

      console.log(`  📋 Delivery for truck ${truck.TruckPlate}:`);
      console.log(`     - Raw delivery date: ${deliveryDate}`);
      console.log(`     - Normalized delivery date: ${normalizedDeliveryDate}`);
      console.log(`     - Selected date: ${selectedDate}`);
      console.log(`     - Normalized selected date: ${normalizedSelectedDate}`);

      // Compare normalized dates
      const conflict = normalizedDeliveryDate === normalizedSelectedDate;
      if (conflict) {
        console.log(`     ❌ CONFLICT: Dates match!`);
      } else {
        console.log(`     ✅ No conflict: Dates don't match`);
      }
      return conflict;
    });

    console.log(
      `  ${hasConflict ? "❌ Truck UNAVAILABLE" : "✅ Truck AVAILABLE"} on ${selectedDate}`,
    );
    return !hasConflict;
  };

  // Smart booking function - automatically calculates optimal trucks
  const handleSmartBooking = (cargoWeight) => {
    console.log(
      `🚀 Smart Booking: Finding optimal trucks for ${cargoWeight} tons`,
    );
    console.log(`📋 Total allocated trucks: ${allocatedTrucks.length}`);
    console.log(`📋 Total deliveries: ${deliveries.length}`);
    console.log(`📅 Selected delivery date: ${bookingData.deliveryDate}`);

    if (!cargoWeight || cargoWeight <= 0) {
      showWarning("Invalid Input", "Please enter a valid cargo weight");
      return;
    }

    // Get available trucks - check ONLY date availability (not operational status)
    // Trucks can be "IN USE" with active deliveries but still bookable on different dates
    let availableTrucks = allocatedTrucks.filter((truck) => {
      // Only check operational status to ensure truck is not broken/maintenance
      const operationalStatus =
        truck.operationalStatus?.toLowerCase() ||
        truck.OperationalStatus?.toLowerCase();

      // Skip only if truck is under maintenance or broken
      if (
        operationalStatus === "maintenance" ||
        operationalStatus === "broken"
      ) {
        console.log(`❌ Truck ${truck.TruckPlate} is under maintenance/broken`);
        return false;
      }

      // Check if truck is available on the selected delivery date
      const isAvailableOnDate = isTruckAvailableOnDate(
        truck,
        bookingData.deliveryDate,
      );
      if (!isAvailableOnDate) {
        console.log(
          `❌ Truck ${truck.TruckPlate} is booked on ${bookingData.deliveryDate}`,
        );
        return false;
      }

      console.log(
        `✅ Truck ${truck.TruckPlate} is available for booking on ${bookingData.deliveryDate}`,
      );
      return true;
    });

    console.log(
      `📋 Available trucks after filtering: ${availableTrucks.length}`,
    );

    // No fallback needed - date-based filtering is the only filter

    // Debug: Log all allocated trucks
    console.log("🔍 All allocated trucks:");
    allocatedTrucks.forEach((truck, index) => {
      console.log(
        `  ${index + 1}. ${truck.TruckPlate} - ${truck.TruckCapacity} tons (ID: ${truck.TruckID})`,
      );
    });

    // Debug: Log available trucks
    console.log("🔍 Available trucks for booking:");
    availableTrucks.forEach((truck, index) => {
      const capacity = parseFloat(truck.TruckCapacity) || 0;
      console.log(
        `  ${index + 1}. ${truck.TruckPlate} - ${capacity} tons (ID: ${truck.TruckID})`,
      );
    });

    // Debug: Check which trucks can handle the cargo weight
    const suitableTrucks = availableTrucks.filter((truck) => {
      const capacity = parseFloat(truck.TruckCapacity) || 0;
      return capacity >= cargoWeight;
    });

    console.log(
      `🎯 Trucks that can handle ${cargoWeight} tons: ${suitableTrucks.length}`,
    );
    suitableTrucks.forEach((truck) => {
      console.log(`  ✅ ${truck.TruckPlate}: ${truck.TruckCapacity} tons`);
    });

    if (availableTrucks.length === 0) {
      showWarning(
        "No Available Trucks",
        "No trucks are currently available for booking. Please wait for trucks to become available or contact support.",
      );
      return;
    }

    // Calculate total capacity of all available trucks
    const totalAvailableCapacity = availableTrucks.reduce((sum, truck) => {
      return sum + (parseFloat(truck.TruckCapacity) || 0);
    }, 0);

    console.log(
      `📊 Total available capacity: ${totalAvailableCapacity} tons vs cargo weight: ${cargoWeight} tons`,
    );

    // Check if total capacity is insufficient
    if (totalAvailableCapacity < cargoWeight) {
      console.log(
        `❌ Insufficient total capacity: ${totalAvailableCapacity}t < ${cargoWeight}t`,
      );

      // Calculate how many more trucks are needed
      const shortfall = cargoWeight - totalAvailableCapacity;
      const averageTruckCapacity =
        allocatedTrucks.length > 0
          ? allocatedTrucks.reduce(
              (sum, truck) => sum + (parseFloat(truck.TruckCapacity) || 0),
              0,
            ) / allocatedTrucks.length
          : 5; // Default assumption of 5 tons per truck

      const estimatedAdditionalTrucks = Math.ceil(
        shortfall / averageTruckCapacity,
      );

      // Show detailed warning message
      let warningMessage = `📦 Your cargo weight: ${cargoWeight} tons\n`;
      warningMessage += `🚛 Available truck capacity: ${totalAvailableCapacity} tons\n`;
      warningMessage += `📉 Shortfall: ${shortfall.toFixed(1)} tons\n\n`;
      warningMessage += `SOLUTIONS:\n`;
      warningMessage += `1. 📞 Contact admin to allocate approximately ${estimatedAdditionalTrucks} more truck${estimatedAdditionalTrucks !== 1 ? "s" : ""}\n`;
      warningMessage += `2. ⏳ Wait for other trucks to complete their deliveries\n`;
      warningMessage += `3. 📦 Split your cargo into smaller shipments\n\n`;

      // Show currently available trucks for reference
      warningMessage += `Currently available trucks:\n`;
      availableTrucks.forEach((truck, index) => {
        warningMessage += `• ${truck.TruckPlate}: ${truck.TruckCapacity} tons\n`;
      });

      // Show trucks that are currently in use
      const trucksInUse = allocatedTrucks.filter((truck) => {
        const isInUse = deliveries.some(
          (delivery) =>
            delivery.TruckID === truck.TruckID &&
            (delivery.DeliveryStatus === "pending" ||
              delivery.DeliveryStatus === "in-progress"),
        );
        return isInUse;
      });

      if (trucksInUse.length > 0) {
        warningMessage += `\nTrucks currently in use:\n`;
        trucksInUse.forEach((truck, index) => {
          warningMessage += `• ${truck.TruckPlate}: ${truck.TruckCapacity} tons (in delivery)\n`;
        });
      }

      showWarning("Insufficient Truck Capacity", warningMessage, {
        size: "large",
      });
      setRecommendedTrucks([]);
      return;
    }

    console.log(`📋 Available trucks: ${availableTrucks.length}`);
    availableTrucks.forEach((truck) => {
      console.log(`  - ${truck.TruckPlate}: ${truck.TruckCapacity} tons`);
    });

    // Find the best combination of trucks
    const optimalTrucks = findBestTruckCombination(
      availableTrucks,
      parseFloat(cargoWeight),
    );

    if (optimalTrucks.length === 0) {
      showWarning(
        "No Suitable Combination",
        "Unable to find a suitable truck combination. Please try a different cargo weight or contact support.",
      );
      return;
    }

    // Set the optimal truck combination
    setRecommendedTrucks(optimalTrucks);
    setBookingData((prev) => ({
      ...prev,
      weight: cargoWeight.toString(),
      selectedTrucks: optimalTrucks.map((truck) => truck.TruckID),
    }));

    // Show success message with detailed breakdown
    const totalCapacity = optimalTrucks.reduce(
      (sum, truck) => sum + (parseFloat(truck.TruckCapacity) || 0),
      0,
    );
    const truckBreakdown = optimalTrucks
      .map((truck) => `${truck.TruckPlate} (${truck.TruckCapacity}t)`)
      .join(", ");

    console.log(
      `✅ Optimal solution: ${optimalTrucks.length} trucks with ${totalCapacity}t capacity`,
    );

    // Create a detailed breakdown message
    let message = `📦 Cargo Weight: ${cargoWeight} tons\n`;
    message += `🚛 Trucks Selected: ${optimalTrucks.length}\n`;
    message += `📊 Total Capacity: ${totalCapacity} tons\n`;
    message += `⚡ Efficiency: ${((cargoWeight / totalCapacity) * 100).toFixed(1)}%\n\n`;
    message += `Selected Trucks:\n${truckBreakdown}\n\n`;
    message += `Opening booking form...`;

    showSuccess("Smart Booking Complete!", message, {
      size: "large",
      onConfirm: () => {
        // Automatically open the booking modal with pre-filled data
        setShowBookingModal(true);
      },
    });
  };

  // Handle truck selection
  const handleTruckSelection = (truckId) => {
    // Find truck in allocatedTrucks (not just recommended ones)
    const selectedTruck = allocatedTrucks.find(
      (truck) => truck.TruckID === truckId,
    );

    if (!selectedTruck) {
      console.log(`⚠️ Truck ${truckId} not found in allocated trucks`);
      return;
    }

    // Only block if truck is under maintenance or broken
    // Allow selection even if truck is "IN USE" with active deliveries
    const operationalStatus =
      selectedTruck.operationalStatus?.toLowerCase() ||
      selectedTruck.OperationalStatus?.toLowerCase();

    if (operationalStatus === "maintenance" || operationalStatus === "broken") {
      showWarning(
        "Truck Unavailable",
        "This truck is under maintenance or broken and cannot be booked",
      );
      return;
    }

    // Check if truck is available on the selected delivery date
    if (!isTruckAvailableOnDate(selectedTruck, bookingData.deliveryDate)) {
      showWarning(
        "Date Conflict",
        `Truck ${selectedTruck.TruckPlate} is already booked on ${bookingData.deliveryDate}. Please select a different date or truck.`,
      );
      return;
    }

    setBookingData((prev) => {
      const currentSelection = [...prev.selectedTrucks];

      if (currentSelection.includes(truckId)) {
        // Remove if already selected
        return {
          ...prev,
          selectedTrucks: currentSelection.filter((id) => id !== truckId),
        };
      } else {
        // Add if not selected
        return {
          ...prev,
          selectedTrucks: [...currentSelection, truckId],
        };
      }
    });
  };

  // Open map modal - replace with our new isolated modal approach
  const openMapModal = (type) => {
    setMapType(type);

    // Get the other selected location to prevent duplicate selection
    const otherSelectedLocation =
      type === "pickup"
        ? {
            address: bookingData.dropoffLocation,
            coordinates: bookingData.dropoffCoordinates,
          }
        : {
            address: bookingData.pickupLocation,
            coordinates: bookingData.pickupCoordinates,
          };

    // Use the enhanced map modal with saved locations
    enhancedIsolatedMapModal.init({
      locationType: type,
      initialAddress:
        type === "pickup"
          ? bookingData.pickupLocation
          : bookingData.dropoffLocation,
      title: `Select ${type === "pickup" ? "Pickup" : "Dropoff"} Location`,
      otherSelectedLocation: otherSelectedLocation,
      onSelectCallback: (address, coordinates) => {
        // Update the booking data
        setBookingData((prev) => ({
          ...prev,
          [type === "pickup" ? "pickupLocation" : "dropoffLocation"]: address,
          [type === "pickup" ? "pickupCoordinates" : "dropoffCoordinates"]:
            coordinates,
        }));

        // Update our state to match the modal state
        if (type === "pickup") {
          setShowPickupMapModal(false);
        } else {
          setShowDropoffMapModal(false);
        }
      },
    });

    // Update our state to track that the modal is open
    if (type === "pickup") {
      setShowPickupMapModal(true);
    } else {
      setShowDropoffMapModal(true);
    }
  };

  // Improved route preview toggle function
  const toggleRoutePreview = () => {
    // Only show route preview if we have both coordinates
    if (bookingData.pickupCoordinates && bookingData.dropoffCoordinates) {
      console.log("🗺️ Toggling route preview with coordinates:", {
        pickup: bookingData.pickupCoordinates,
        dropoff: bookingData.dropoffCoordinates,
      });
      setShowRoutePreview(!showRoutePreview);
    } else {
      console.log("⚠️ Missing coordinates for route preview:", {
        pickup: bookingData.pickupCoordinates,
        dropoff: bookingData.dropoffCoordinates,
      });
      // Allow booking even without coordinates
      showInfo(
        "Route Preview Unavailable",
        "Select both locations on map for route preview, or continue booking with address text only.",
      );
    }
  };

  const handleBookingSubmit = async (e) => {
    e.preventDefault();
    console.log("🔄 === BOOKING SUBMISSION START ===");

    try {
      // Validate input - allow booking even if coordinates aren't selected
      if (
        !bookingData.pickupLocation ||
        !bookingData.dropoffLocation ||
        !bookingData.weight ||
        !bookingData.deliveryDate ||
        !bookingData.deliveryTime
      ) {
        showWarning(
          "Missing Required Fields",
          "Please fill in all required fields (pickup, dropoff, weight, date and time)",
        );
        return;
      }

      // Validate truck selection
      if (bookingData.selectedTrucks.length === 0) {
        showWarning(
          "No Trucks Selected",
          "Please select at least one truck for the delivery",
        );
        return;
      }

      // Double-check truck availability before submission
      // Allow trucks with "IN USE" status, only block if maintenance or broken
      const unavailableTrucks = [];
      for (const truckId of bookingData.selectedTrucks) {
        const selectedTruck = allocatedTrucks.find(
          (truck) => truck.TruckID === truckId,
        );

        if (!selectedTruck) {
          unavailableTrucks.push(`Truck ${truckId} not found`);
          continue;
        }

        // Only check if truck is under maintenance or broken
        const operationalStatus =
          selectedTruck.operationalStatus?.toLowerCase() ||
          selectedTruck.OperationalStatus?.toLowerCase();

        if (
          operationalStatus === "maintenance" ||
          operationalStatus === "broken"
        ) {
          unavailableTrucks.push(
            `${selectedTruck.TruckPlate} - Status: ${operationalStatus}`,
          );
        }

        // Check date availability
        if (!isTruckAvailableOnDate(selectedTruck, bookingData.deliveryDate)) {
          unavailableTrucks.push(
            `${selectedTruck.TruckPlate} - Already booked on ${bookingData.deliveryDate}`,
          );
        }
      }

      if (unavailableTrucks.length > 0) {
        const unavailableMessage = `Some trucks cannot be booked:\n\n${unavailableTrucks.join("\n")}\n\nPlease select different trucks or change the delivery date.`;

        showWarning("Trucks Unavailable", unavailableMessage, {
          onConfirm: () => {
            // Reset selection
            setBookingData((prev) => ({
              ...prev,
              selectedTrucks: [],
            }));

            // Re-calculate recommended trucks
            handleSmartBooking(parseFloat(bookingData.weight));
          },
        });
        return;
      }

      // Validate weight is a number
      if (isNaN(parseFloat(bookingData.weight))) {
        showWarning("Invalid Weight", "Please enter a valid weight");
        return;
      }

      // Ensure token is set
      const token = localStorage.getItem("token");
      if (!token) {
        console.error("❌ No token found during submission");
        showError(
          "Authentication Error",
          "Authentication token missing. Please login again.",
        );
        return;
      }

      console.log("🔍 Setting authentication token in headers");
      axios.defaults.headers.common["Authorization"] = `Bearer ${token}`;

      // Create booking data for multiple trucks
      console.log(
        `🔍 Creating booking for ${bookingData.selectedTrucks.length} truck(s):`,
        bookingData.selectedTrucks,
      );

      // Create fallback coordinates if missing
      const defaultPickupCoordinates = bookingData.pickupCoordinates || {
        lat: 14.5995,
        lng: 120.9842,
      }; // Manila fallback
      const defaultDropoffCoordinates = bookingData.dropoffCoordinates || {
        lat: 14.6091,
        lng: 121.0223,
      }; // Quezon City fallback

      // Prep the payload with all required fields - use selectedTrucks for multiple booking
      const bookingRequestData = {
        pickupLocation: bookingData.pickupLocation,
        dropoffLocation: bookingData.dropoffLocation,
        pickupCoordinates: defaultPickupCoordinates,
        dropoffCoordinates: defaultDropoffCoordinates,
        weight: bookingData.weight,
        deliveryDate: bookingData.deliveryDate,
        deliveryTime: bookingData.deliveryTime,
        selectedTrucks: bookingData.selectedTrucks, // Send array for multiple trucks
        deliveryDistance: bookingData.deliveryDistance || 0,
        estimatedDuration: bookingData.estimatedDuration || 0,
      };

      console.log("🔍 Booking request data:", bookingRequestData);

      // Log token for debugging
      console.log(
        "🔍 Using token (first 20 chars):",
        token.substring(0, 20) + "...",
      );
      console.log(
        "🔍 Authorization header:",
        axios.defaults.headers.common["Authorization"],
      );

      // Make API call with detailed error logging
      try {
        setIsLoading(true); // Show loading state
        console.log("🔍 Sending POST request to /api/clients/truck-rental");
        const response = await axios.post(
          "/api/clients/truck-rental",
          bookingRequestData,
          {
            headers: {
              Authorization: `Bearer ${token}`,
              "Content-Type": "application/json",
            },
          },
        );
        console.log("✅ Booking API response:", response.data);

        // Handle multiple truck booking response
        const {
          deliveriesCreated,
          totalRequested,
          deliveries,
          failedBookings,
          deliveryDetails,
        } = response.data;

        let successMessage = "";
        if (deliveriesCreated === totalRequested) {
          // All trucks booked successfully
          successMessage = `Successfully booked all ${deliveriesCreated} truck${deliveriesCreated !== 1 ? "s" : ""}!\n\n`;
        } else {
          // Some trucks booked successfully
          successMessage = `Successfully booked ${deliveriesCreated} out of ${totalRequested} truck${totalRequested !== 1 ? "s" : ""}!\n\n`;
        }

        // Add delivery details
        if (deliveries && deliveries.length > 0) {
          successMessage += "Booked trucks with cargo distribution:\n";
          deliveries.forEach((delivery, index) => {
            const assignedCargo = delivery.assignedCargo || 0;
            const truckCapacity = delivery.truckCapacity || 0;
            const utilizationPercent =
              truckCapacity > 0
                ? ((assignedCargo / truckCapacity) * 100).toFixed(1)
                : 0;
            const driverStatus = delivery.driverStatus || "unknown";
            const helperStatus = delivery.helperStatus || "unknown";

            // Format status display
            const driverDisplay =
              driverStatus === "awaiting_approval"
                ? `📋 ${delivery.driverName} (awaiting approval)`
                : driverStatus === "assigned"
                  ? `✅ ${delivery.driverName} (approved)`
                  : driverStatus === "awaiting_driver"
                    ? "⏳ Awaiting driver assignment"
                    : "❓ Unknown driver status";
            const helperDisplay =
              helperStatus === "awaiting_approval"
                ? `📋 ${delivery.helperName} (awaiting approval)`
                : helperStatus === "assigned"
                  ? `✅ ${delivery.helperName} (approved)`
                  : helperStatus === "awaiting_helper"
                    ? "⏳ Awaiting helper assignment"
                    : "❓ Unknown helper status";

            // Add approval status if applicable
            const driverApprovalStatus =
              delivery.driverApprovalStatus || "not_applicable";
            const helperApprovalStatus =
              delivery.helperApprovalStatus || "not_applicable";

            const driverFullStatus =
              driverStatus === "awaiting_approval" &&
              driverApprovalStatus === "pending_driver_approval"
                ? `📋 ${delivery.driverName} (⏳ Awaiting Admin Approval)`
                : driverStatus === "assigned" &&
                    driverApprovalStatus === "approved"
                  ? `✅ ${delivery.driverName} (Approved & Ready)`
                  : driverDisplay;

            const helperFullStatus =
              helperStatus === "awaiting_approval" &&
              helperApprovalStatus === "pending_helper_approval"
                ? `📋 ${delivery.helperName} (⏳ Awaiting Admin Approval)`
                : helperStatus === "assigned" &&
                    helperApprovalStatus === "approved"
                  ? `✅ ${delivery.helperName} (Approved & Ready)`
                  : helperDisplay;

            successMessage += `${index + 1}. ${delivery.truckPlate} (${truckCapacity}t capacity)\n`;
            successMessage += `   📦 Carrying: ${assignedCargo}t (${utilizationPercent}% utilization)\n`;
            successMessage += `   👨‍✈️ Driver: ${driverFullStatus}\n`;
            successMessage += `   👷‍♂️ Helper: ${helperFullStatus}\n`;
          });
          successMessage += "\n";
        }

        if (deliveryDetails) {
          successMessage += `Delivery Summary:\n`;
          successMessage += `📦 Total Cargo: ${deliveryDetails.cargoWeight} tons\n`;
          successMessage += `🚛 Total Truck Capacity: ${deliveryDetails.totalCapacity} tons\n`;
          successMessage += `📊 Capacity Utilization: ${deliveryDetails.capacityUtilization}\n`;
          successMessage += `✅ Status: ${deliveryDetails.capacityStatus === "sufficient" ? "Adequate capacity" : "Overloaded"}\n\n`;
          successMessage += `📍 Distance: ${deliveryDetails.distance} km\n`;
          successMessage += `⏱️ Duration: ${deliveryDetails.duration} minutes\n`;
          successMessage += `💰 Rate per truck: $${deliveryDetails.ratePerTruck}\n`;
          successMessage += `💰 Total rate: $${deliveryDetails.totalRate}\n`;
          successMessage += `📅 Scheduled: ${new Date(deliveryDetails.scheduledFor).toLocaleString()}\n`;
        }

        // Add failed bookings if any
        if (failedBookings && failedBookings.length > 0) {
          successMessage += `\n⚠️ Failed bookings:\n`;
          failedBookings.forEach((failed, index) => {
            successMessage += `${index + 1}. ${failed.reason}\n`;
          });
        }

        showSuccess("Booking Successful!", successMessage, {
          size: "large",
          onConfirm: () => {
            // Clear used locations to allow reuse
            enhancedIsolatedMapModal.clearUsedLocations();
            setShowBookingModal(false);
            // Force a reload of the page to ensure everything is in sync
            window.location.reload();
          },
        });
      } catch (apiError) {
        console.error("❌ API Error:", apiError);
        console.error("❌ API Error Response:", apiError.response?.data);
        console.error("❌ API Error Status:", apiError.response?.status);
        console.error("❌ API Request Config:", apiError.config);

        // Handle different error scenarios
        let errorMessage = "Error booking truck rental. Please try again.";

        if (apiError.response) {
          // Server responded with an error status
          if (apiError.response.status === 403) {
            errorMessage =
              "Some trucks are not available for booking. Please select different trucks.";

            showWarning("Booking Failed", errorMessage, {
              onConfirm: () => {
                // Reset truck selection
                setBookingData((prev) => ({
                  ...prev,
                  selectedTrucks: [],
                }));

                // Re-calculate recommended trucks
                handleSmartBooking(parseFloat(bookingData.weight));
              },
            });
          } else if (apiError.response.data) {
            const errorData = apiError.response.data;
            errorMessage = errorData.message || "Unknown error occurred";

            // Show detailed debug info if available
            if (errorData.debug) {
              console.log("🔍 Debug info:", errorData.debug);
              errorMessage += `\n\nDebug Info:`;
              errorMessage += `\n• Requested trucks: ${errorData.debug.requestedTrucks}`;
              errorMessage += `\n• Available drivers: ${errorData.debug.availableDrivers}`;
              errorMessage += `\n• Available helpers: ${errorData.debug.availableHelpers}`;

              if (
                errorData.failedBookings &&
                errorData.failedBookings.length > 0
              ) {
                errorMessage += `\n\nFailed trucks:`;
                errorData.failedBookings.forEach((failure) => {
                  errorMessage += `\n• ${failure.truckId}: ${failure.reason}`;
                });
              }
            }

            showError("Booking Failed", errorMessage);
          } else {
            showError("Booking Failed", errorMessage);
          }
        } else if (apiError.request) {
          // Request was made but no response
          errorMessage =
            "No response from server. Please check your internet connection.";
          showError("Connection Error", errorMessage);
        } else {
          showError("Booking Failed", errorMessage);
        }

        setIsLoading(false);
      }
    } catch (error) {
      console.error("🚨 === BOOKING ERROR ===", error);
      const errorMessage = error.message || "Error booking truck rental";
      showError("Unexpected Error", errorMessage);
      setIsLoading(false);
    }
    console.log("🏁 === BOOKING SUBMISSION END ===");
  };

  const handleLogout = () => {
    logout();
    history.push("/login");
  };

  if (isLoading) {
    return <Loader />;
  }

  // Add this function to handle route calculation
  const handleRouteCalculated = (routeInfo) => {
    console.log("🗺️ Route calculated:", routeInfo);
    setRouteDetails(routeInfo);

    // Update booking data with calculated distance and duration
    setBookingData((prev) => ({
      ...prev,
      deliveryDistance: routeInfo.distanceValue,
      estimatedDuration: routeInfo.durationValue,
    }));
  };

  const calculateEstimatedCost = () => {
    if (!routeDetails || !bookingData.selectedTrucks.length) return 0;

    // Get the first selected truck to determine vehicle type
    const firstTruck = allocatedTrucks.find((truck) =>
      bookingData.selectedTrucks.includes(truck.TruckID),
    );

    if (!firstTruck) return 0;

    // Use vehicle type to estimate cost based on vehicle rate system
    const vehicleType = firstTruck.TruckType || "mini truck";
    const distance = routeDetails.distanceValue || 0; // in km

    // Try to find the rate from staff-configured vehicle rates
    let rate = null;
    if (vehicleRates.length > 0) {
      rate = vehicleRates.find((r) => r.vehicleType === vehicleType);
      console.log(`🔍 Looking for rate for ${vehicleType}, found:`, rate);
    }

    // Fallback to default rates if no staff-configured rate found
    if (!rate) {
      console.log(
        `⚠️ No staff rate found for ${vehicleType}, using default rates`,
      );
      const defaultRates = {
        "mini truck": { baseRate: 100, ratePerKm: 15 },
        "4 wheeler": { baseRate: 150, ratePerKm: 20 },
        "6 wheeler": { baseRate: 200, ratePerKm: 25 },
        "8 wheeler": { baseRate: 250, ratePerKm: 30 },
        "10 wheeler": { baseRate: 300, ratePerKm: 35 },
      };
      rate = defaultRates[vehicleType] || defaultRates["mini truck"];
    }

    const baseRate = parseFloat(rate.baseRate) || 0;
    const ratePerKm = parseFloat(rate.ratePerKm) || 0;
    const totalCost = baseRate + distance * ratePerKm;

    console.log(
      `💰 Cost calculation for ${vehicleType}: Base ₱${baseRate} + (${distance}km × ₱${ratePerKm}/km) = ₱${totalCost}`,
    );

    return Math.round(totalCost);
  };

  // Replace the booking modal JSX with:
  const renderBookingModal = () => {
    if (!showBookingModal) return null;

    return (
      <Modal
        title="Book Truck Rental"
        onClose={() => setShowBookingModal(false)}
        size="large"
      >
        <form onSubmit={handleBookingSubmit} className="flex flex-col gap-5">
          <div className="flex flex-col gap-2">
            <label htmlFor="weight" className="text-sm font-bold text-gray-700">
              Cargo Weight (tons)
            </label>
            <div className="relative flex gap-2">
              <input
                type="number"
                id="weight"
                name="weight"
                value={bookingData.weight}
                onChange={(e) =>
                  setBookingData((prev) => ({
                    ...prev,
                    weight: e.target.value,
                  }))
                }
                className="w-full px-4 py-2 rounded-xl border border-gray-200 focus:border-blue-500 focus:ring-4 focus:ring-blue-100 outline-none transition-all"
                required
                min="0.1"
                step="0.1"
                placeholder="Enter cargo weight in tons"
              />
              <button
                type="button"
                className="px-4 py-2 bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl font-bold transition-all shadow-md shadow-emerald-500/20 whitespace-nowrap disabled:opacity-50 disabled:cursor-not-allowed"
                onClick={() => {
                  const weight = parseFloat(bookingData.weight);
                  if (weight && weight > 0) {
                    console.log(
                      `🚀 Smart booking triggered for ${weight} tons`,
                    );
                    handleSmartBooking(weight);
                  } else {
                    showWarning(
                      "Invalid Input",
                      "Please enter a valid cargo weight first",
                    );
                  }
                }}
                disabled={
                  !bookingData.weight || parseFloat(bookingData.weight) <= 0
                }
              >
                🚀 Smart Book
              </button>
            </div>
            <small className="text-xs text-gray-500">
              Enter cargo weight and click "Smart Book" to automatically find
              the optimal truck combination
            </small>
          </div>

          <div className="flex flex-col gap-2">
            <label
              htmlFor="pickupLocation"
              className="text-sm font-bold text-gray-700"
            >
              <span className="flex items-center gap-2">
                <FaMapMarkerAlt className="text-blue-500" /> Pickup Location
              </span>
            </label>
            <div className="relative flex gap-2">
              <input
                type="text"
                id="pickupLocation"
                name="pickupLocation"
                value={bookingData.pickupLocation}
                onChange={(e) =>
                  setBookingData((prev) => ({
                    ...prev,
                    pickupLocation: e.target.value,
                  }))
                }
                className="w-full px-4 py-2 rounded-xl border border-gray-200 focus:border-blue-500 focus:ring-4 focus:ring-blue-100 outline-none transition-all"
                required
                placeholder="Enter pickup address"
              />
              <button
                type="button"
                className="px-4 py-2 border border-gray-200 text-gray-600 hover:text-blue-600 hover:bg-blue-50 rounded-xl font-medium transition-all"
                onClick={() => openMapModal("pickup")}
              >
                <FaSearch /> Map
              </button>
            </div>
          </div>

          <div className="flex flex-col gap-2">
            <label
              htmlFor="dropoffLocation"
              className="text-sm font-bold text-gray-700"
            >
              <span className="flex items-center gap-2">
                {" "}
                <FaMapMarkerAlt className="text-amber-500" /> Drop-off Location
              </span>
            </label>
            <div className="relative flex gap-2">
              <input
                type="text"
                id="dropoffLocation"
                name="dropoffLocation"
                value={bookingData.dropoffLocation}
                onChange={(e) =>
                  setBookingData((prev) => ({
                    ...prev,
                    dropoffLocation: e.target.value,
                  }))
                }
                className="w-full px-4 py-2 rounded-xl border border-gray-200 focus:border-blue-500 focus:ring-4 focus:ring-blue-100 outline-none transition-all"
                required
                placeholder="Enter delivery address"
              />
              <button
                type="button"
                className="px-4 py-2 border border-gray-200 text-gray-600 hover:text-blue-600 hover:bg-blue-50 rounded-xl font-medium transition-all"
                onClick={() => openMapModal("dropoff")}
              >
                <FaSearch /> Map
              </button>
            </div>
          </div>

          <div className="flex justify-start">
            <button
              type="button"
              className={`px-4 py-2 rounded-lg font-medium transition-all flex items-center gap-2 ${showRoutePreview ? "bg-blue-100 text-blue-700" : "bg-gray-100 text-gray-600 hover:bg-gray-200"}`}
              onClick={toggleRoutePreview}
              disabled={
                !bookingData.pickupCoordinates ||
                !bookingData.dropoffCoordinates
              }
            >
              <FaRoute />{" "}
              {showRoutePreview ? "Hide Route Preview" : "Show Route Preview"}
            </button>
          </div>

          {/* Automatically show route info when both coordinates are available */}
          {bookingData.pickupCoordinates && bookingData.dropoffCoordinates && (
            <div className="bg-gradient-to-br from-gray-50 to-white rounded-xl border border-gray-200 p-4 mt-2 shadow-sm">
              <div className="space-y-4">
                <h4 className="text-sm font-bold text-gray-500 uppercase tracking-wider border-b border-gray-200 pb-2 mb-3">
                  🚛 Delivery Route Information (Philippines Only)
                </h4>
              </div>

              {/* Always show RouteMap when coordinates are available for calculation */}
              <div style={{ display: "none" }}>
                <RouteMap
                  pickupCoordinates={bookingData.pickupCoordinates}
                  dropoffCoordinates={bookingData.dropoffCoordinates}
                  pickupAddress={bookingData.pickupLocation}
                  dropoffAddress={bookingData.dropoffLocation}
                  onRouteCalculated={handleRouteCalculated}
                />
              </div>

              {routeDetails && (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                  <div className="bg-white p-3 rounded-lg border border-gray-100 shadow-sm flex items-center gap-3">
                    <div className="text-2xl bg-blue-50 w-10 h-10 rounded-full flex items-center justify-center">
                      📏
                    </div>
                    <div>
                      <div className="text-xs text-gray-500 font-medium uppercase">
                        Distance
                      </div>
                      <div className="text-sm font-bold text-gray-800">
                        {routeDetails.distanceText}
                      </div>
                    </div>
                  </div>

                  <div className="bg-white p-3 rounded-lg border border-gray-100 shadow-sm flex items-center gap-3">
                    <div className="text-2xl bg-amber-50 w-10 h-10 rounded-full flex items-center justify-center">
                      ⏱️
                    </div>
                    <div>
                      <div className="text-xs text-gray-500 font-medium uppercase">
                        Travel Time
                      </div>
                      <div className="text-sm font-bold text-gray-800">
                        {routeDetails.durationText}
                      </div>
                    </div>
                  </div>

                  {routeDetails.averageSpeed && (
                    <div className="bg-white p-3 rounded-lg border border-gray-100 shadow-sm flex items-center gap-3">
                      <div className="text-2xl bg-emerald-50 w-10 h-10 rounded-full flex items-center justify-center">
                        🚗
                      </div>
                      <div>
                        <div className="text-xs text-gray-500 font-medium uppercase">
                          Avg Speed
                        </div>
                        <div className="text-sm font-bold text-gray-800">
                          {routeDetails.averageSpeed} km/h
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {routeDetails && routeDetails.isShortestRoute && (
                <div className="bg-emerald-50 text-emerald-700 text-xs px-3 py-2 rounded-lg border border-emerald-100 mb-2 font-medium">
                  ✅ Shortest route automatically selected (
                  {routeDetails.totalRoutes} routes analyzed)
                </div>
              )}

              {routeDetails && routeDetails.isEstimate && (
                <div className="bg-blue-50 text-blue-700 text-xs px-3 py-2 rounded-lg border border-blue-100 mb-2 font-medium">
                  ℹ️ Estimated values based on Philippines road conditions
                </div>
              )}

              <div className="flex justify-end">
                <button
                  type="button"
                  className="text-sm text-blue-600 hover:text-blue-800 font-medium underline flex items-center gap-1"
                  onClick={toggleRoutePreview}
                >
                  <FaRoute />{" "}
                  {showRoutePreview ? "Hide Map Preview" : "Show Map Preview"}
                </button>
              </div>
            </div>
          )}

          {showRoutePreview && (
            <div className="mt-4 rounded-xl overflow-hidden border border-gray-200 shadow-md">
              <h4 className="bg-gray-50 px-4 py-2 text-sm font-bold text-gray-700 border-b border-gray-200">
                Delivery Route Map Preview
              </h4>
              <div className="h-64 w-full">
                <RouteMap
                  pickupCoordinates={bookingData.pickupCoordinates}
                  dropoffCoordinates={bookingData.dropoffCoordinates}
                  pickupAddress={bookingData.pickupLocation}
                  dropoffAddress={bookingData.dropoffLocation}
                  onRouteCalculated={handleRouteCalculated}
                />
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="flex flex-col gap-2">
              <label
                htmlFor="deliveryDate"
                className="text-sm font-bold text-gray-700"
              >
                <span className="flex items-center gap-2">
                  <FaCalendarAlt className="text-gray-500" /> Delivery Date
                </span>
              </label>
              <input
                type="date"
                id="deliveryDate"
                name="deliveryDate"
                value={bookingData.deliveryDate}
                onChange={(e) => {
                  const newDate = e.target.value;
                  console.log(`📅 Date changed to: ${newDate}`);

                  // Enforce 24-hour minimum lead time
                  const now = new Date();
                  const minDate = new Date(now.getTime() + 24 * 60 * 60 * 1000);
                  const selectedDate = new Date(newDate + "T00:00:00");
                  if (selectedDate < new Date(minDate.toISOString().split("T")[0] + "T00:00:00")) {
                    showError(
                      "Invalid Date",
                      "Bookings must be made at least 24 hours in advance. Please select a later date.",
                    );
                    return;
                  }

                  setBookingData((prev) => ({
                    ...prev,
                    deliveryDate: newDate,
                  }));

                  // Clear truck selection when date changes to re-evaluate availability
                  setBookingData((prev) => ({ ...prev, selectedTrucks: [] }));
                  setRecommendedTrucks([]);

                  showInfo(
                    "Date Changed",
                    "Please re-run Smart Booking to find available trucks for this date",
                  );
                }}
                className="w-full px-4 py-2 rounded-xl border border-gray-200 focus:border-blue-500 focus:ring-4 focus:ring-blue-100 outline-none transition-all"
                required
                min={(() => { const d = new Date(); d.setDate(d.getDate() + 1); return d.toISOString().split("T")[0]; })()}
                placeholder="yyyy-mm-dd"
              />
              <small className="text-xs text-gray-500">
                Trucks already booked on this date will not be available
              </small>
            </div>

            <div className="flex flex-col gap-2">
              <label
                htmlFor="deliveryTime"
                className="text-sm font-bold text-gray-700"
              >
                <span className="flex items-center gap-2">
                  <FaClock className="text-gray-500" /> Delivery Time
                </span>
              </label>
              <input
                type="time"
                id="deliveryTime"
                name="deliveryTime"
                value={bookingData.deliveryTime}
                onChange={(e) =>
                  setBookingData((prev) => ({
                    ...prev,
                    deliveryTime: e.target.value,
                  }))
                }
                className="w-full px-4 py-2 rounded-xl border border-gray-200 focus:border-blue-500 focus:ring-4 focus:ring-blue-100 outline-none transition-all"
                required
                placeholder="hh:mm"
              />
            </div>
          </div>

          {/* Price Estimation Section */}
          {bookingData.selectedTrucks.length > 0 && routeDetails && (
            <div className="mt-4 p-4 bg-emerald-50 rounded-xl border border-emerald-100">
              <h4 className="flex items-center gap-2 text-emerald-800 font-bold mb-3 text-sm uppercase tracking-wider">
                🧮 Estimated Cost
              </h4>
              <div className="flex flex-col gap-2">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Distance:</span>
                  <span className="font-medium">
                    {routeDetails.distanceText}
                  </span>
                </div>
                <div className="flex justify-between items-center bg-white p-2 rounded-lg border border-emerald-100/50">
                  <span className="text-gray-700 font-bold">
                    Estimated Total:
                  </span>
                  <span className="text-xl font-bold text-emerald-600">
                    ₱{calculateEstimatedCost()}
                  </span>
                </div>
                {(() => {
                  if (!routeDetails || !bookingData.selectedTrucks.length)
                    return null;
                  const firstTruck = allocatedTrucks.find((truck) =>
                    bookingData.selectedTrucks.includes(truck.TruckID),
                  );
                  if (!firstTruck) return null;

                  const vehicleType = firstTruck.TruckType || "mini truck";
                  const distance = routeDetails.distanceValue || 0;
                  let rate = vehicleRates.find(
                    (r) => r.vehicleType === vehicleType,
                  );

                  if (rate) {
                    const baseRate = parseFloat(rate.baseRate) || 0;
                    const ratePerKm = parseFloat(rate.ratePerKm) || 0;
                    return (
                      <div className="text-xs text-gray-500 text-right mt-1">
                        <small>
                          Rate: ₱{baseRate} base + {distance}km × ₱{ratePerKm}
                          /km
                        </small>
                      </div>
                    );
                  }
                  return null;
                })()}
                <div className="text-xs text-gray-400 italic text-center mt-2">
                  * Final pricing calculated using current vehicle rates set by
                  staff
                </div>
              </div>
            </div>
          )}

          <div className="mt-4">
            <label className="text-sm font-bold text-gray-700 block mb-2">
              Select Trucks for Booking
            </label>
            {bookingData.weight && recommendedTrucks.length > 0 && (
              <div className="bg-blue-50 border border-blue-200 text-blue-800 p-3 rounded-xl flex items-start gap-2 mb-4 text-sm">
                <span className="text-lg">⚙️</span>
                <div>
                  <strong>Smart Recommendation:</strong>{" "}
                  {recommendedTrucks.length} truck
                  {recommendedTrucks.length !== 1 ? "s" : ""} recommended for{" "}
                  {bookingData.weight} tons cargo
                </div>
              </div>
            )}
            {(() => {
              // Filter to show available trucks based on date availability ONLY
              const availableTrucks = allocatedTrucks.filter((truck) => {
                const operationalStatus =
                  truck.operationalStatus?.toLowerCase() ||
                  truck.OperationalStatus?.toLowerCase();
                if (
                  operationalStatus === "maintenance" ||
                  operationalStatus === "broken"
                )
                  return false;

                return isTruckAvailableOnDate(truck, bookingData.deliveryDate);
              });

              return availableTrucks.length > 0 ? (
                <div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-h-[300px] overflow-y-auto p-1">
                    {availableTrucks.map((truck, index) => {
                      const isSelected = bookingData.selectedTrucks.includes(
                        truck.TruckID,
                      );
                      const isRecommended = recommendedTrucks.some(
                        (rt) => rt.TruckID === truck.TruckID,
                      );
                      const capacity = parseFloat(truck.TruckCapacity) || 0;
                      const cargoWeight = parseFloat(bookingData.weight) || 0;

                      // Calculate estimated cargo distribution
                      const selectedCapacity = bookingData.selectedTrucks
                        .map((id) =>
                          allocatedTrucks.find((t) => t.TruckID === id),
                        )
                        .filter((t) => t)
                        .reduce(
                          (sum, t) => sum + (parseFloat(t.TruckCapacity) || 0),
                          0,
                        );

                      const cargoDistribution =
                        isSelected && selectedCapacity > 0
                          ? (capacity / selectedCapacity) * cargoWeight
                          : capacity;
                      const utilizationPercentage =
                        capacity > 0 && cargoWeight > 0
                          ? Math.min(100, (cargoDistribution / capacity) * 100)
                          : 0;

                      return (
                        <div
                          key={truck.TruckID}
                          className={`relative p-3 rounded-xl border-2 cursor-pointer transition-all hover:shadow-md flex items-center gap-3 ${
                            isSelected
                              ? "border-blue-500 bg-blue-50/50 ring-2 ring-blue-100"
                              : "border-gray-200 bg-white hover:border-blue-300"
                          }`}
                          onClick={() => handleTruckSelection(truck.TruckID)}
                        >
                          {isRecommended && (
                            <div className="absolute -top-2 -right-2 bg-amber-400 text-white text-[10px] font-bold px-2 py-0.5 rounded-full shadow-sm z-10">
                              RECOMMENDED
                            </div>
                          )}
                          <div
                            className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${isSelected ? "bg-blue-100 text-blue-600" : "bg-gray-100 text-gray-500"}`}
                          >
                            <FaTruck />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="font-bold text-gray-800 text-sm truncate">
                              {truck.TruckPlate}
                            </div>
                            <div className="text-xs text-gray-500 truncate">
                              {truck.TruckType} • {truck.TruckCapacity}t
                            </div>
                            {isSelected && cargoWeight > 0 && (
                              <div className="text-xs text-blue-600 font-medium mt-0.5">
                                ~{cargoDistribution.toFixed(1)}t cargo
                              </div>
                            )}
                          </div>
                          <div
                            className={`w-5 h-5 rounded-full border flex items-center justify-center ${isSelected ? "bg-blue-500 border-blue-500 text-white" : "border-gray-300"}`}
                          >
                            {isSelected && <span className="text-xs">✓</span>}
                          </div>

                          {/* Utilization bar overlay at bottom */}
                          {isSelected && cargoWeight > 0 && (
                            <div className="absolute bottom-0 left-0 right-0 h-1 bg-blue-100 rounded-b-lg overflow-hidden">
                              <div
                                className="h-full bg-blue-500"
                                style={{ width: `${utilizationPercentage}%` }}
                              ></div>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              ) : (
                <div className="py-8 text-center bg-gray-50 rounded-xl border border-dashed border-gray-300 text-gray-500">
                  <p className="mb-1">No available trucks for booking.</p>
                  <p className="text-xs">
                    All trucks are currently in use or contact your account
                    manager to get trucks allocated.
                  </p>
                </div>
              );
            })()}
            <small className="block mt-2 text-xs text-gray-500 text-right">
              {bookingData.selectedTrucks.length} truck
              {bookingData.selectedTrucks.length !== 1 ? "s" : ""} selected
              {bookingData.selectedTrucks.length > 0 && (
                <span className="font-medium text-gray-700">
                  {" "}
                  • Total capacity:{" "}
                  {bookingData.selectedTrucks
                    .map((id) => allocatedTrucks.find((t) => t.TruckID === id))
                    .filter((t) => t)
                    .reduce(
                      (sum, truck) =>
                        sum + (parseFloat(truck.TruckCapacity) || 0),
                      0,
                    )}{" "}
                  tons
                </span>
              )}
            </small>
          </div>

          <div className="flex justify-end gap-3 pt-4 mt-4 border-t border-gray-100">
            <button
              type="button"
              className="px-4 py-2 border border-gray-200 text-gray-600 rounded-lg hover:bg-gray-50 font-medium transition-colors"
              onClick={() => setShowBookingModal(false)}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-6 py-2 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white rounded-lg font-bold shadow-md shadow-blue-500/20 transition-all transform hover:-translate-y-0.5 flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
              disabled={bookingData.selectedTrucks.length === 0}
            >
              <FaTruck /> Book {bookingData.selectedTrucks.length} Truck
              {bookingData.selectedTrucks.length !== 1 ? "s" : ""}
            </button>
          </div>
        </form>
      </Modal>
    );
  };

  // Display a warning message if there is one
  const renderWarning = () => {
    if (!warning) return null;

    return (
      <div className="bg-amber-50 border-l-4 border-amber-500 p-4 mb-6 rounded-r-lg shadow-sm flex items-center gap-3">
        <div className="text-amber-500 text-xl">
          <FaExclamationTriangle />
        </div>
        <div className="text-amber-800 font-medium">{warning}</div>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-900 via-blue-800 to-amber-700 font-sans flex flex-col items-center overflow-x-hidden p-4 md:p-6 text-gray-800">
      <div className="w-full max-w-[1400px] flex flex-col gap-6">
        <div className="flex flex-col md:flex-row justify-between items-center bg-white/10 backdrop-blur-md rounded-2xl p-6 border border-white/10 shadow-xl gap-4">
          <h1 className="text-3xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-white to-amber-400 m-0 text-center md:text-left">
            Book a Truck Rental
          </h1>
          <div className="flex gap-3 flex-wrap justify-center md:justify-end">
            <Link
              to="/client/landing"
              className="px-4 py-2 bg-white/10 hover:bg-white/20 text-white border border-white/20 rounded-xl font-medium transition-all flex items-center gap-2 backdrop-blur-sm"
            >
              <FaEye /> Back to Dashboard
            </Link>
            <Link
              to="/client/profile"
              className="px-4 py-2 bg-white/10 hover:bg-white/20 text-white border border-white/20 rounded-xl font-medium transition-all flex items-center gap-2 backdrop-blur-sm"
            >
              <FaUser /> My Profile
            </Link>
            <Link
              to="/client/payment-management"
              className="px-4 py-2 bg-amber-500 hover:bg-amber-600 text-white border border-amber-400/30 rounded-xl font-medium transition-all flex items-center gap-2 shadow-lg shadow-amber-500/20"
            >
              <FaCreditCard /> Payments & Billing
            </Link>
            <Link
              to="/client/delivery-tracker"
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white border border-blue-500/30 rounded-xl font-medium transition-all flex items-center gap-2 shadow-lg shadow-blue-600/20"
            >
              <FaEye /> Track Orders
            </Link>
            <button
              className="px-4 py-2 bg-red-500/80 hover:bg-red-600 text-white border border-red-500/30 rounded-xl font-medium transition-all flex items-center gap-2 backdrop-blur-sm"
              onClick={handleLogout}
            >
              <FaSignOutAlt /> Logout
            </button>
          </div>
        </div>

        {error && (
          <div className="bg-red-50 border-l-4 border-red-500 p-4 rounded-r-lg shadow-sm text-red-700 flex items-center gap-3">
            <FaExclamationTriangle /> {error}
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-white/90 backdrop-blur-md rounded-2xl p-6 shadow-xl border border-white/20 flex items-center gap-5 transition-transform hover:-translate-y-1">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-blue-600 to-blue-800 flex items-center justify-center text-white text-2xl shadow-lg shadow-blue-600/30">
              <FaTruck />
            </div>
            <div>
              <h3 className="text-3xl font-bold text-gray-800 m-0">
                {allocatedTrucks.length}
              </h3>
              <p className="text-gray-500 font-medium m-0">Allocated Trucks</p>
            </div>
          </div>

          <div className="bg-white/90 backdrop-blur-md rounded-2xl p-6 shadow-xl border border-white/20 flex items-center gap-5 transition-transform hover:-translate-y-1">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-emerald-500 to-emerald-700 flex items-center justify-center text-white text-2xl shadow-lg shadow-emerald-500/30">
              <FaTruck />
            </div>
            <div>
              <h3 className="text-3xl font-bold text-gray-800 m-0">
                {
                  allocatedTrucks.filter((truck) => {
                    const truckStatus = truck.TruckStatus?.toLowerCase();
                    const isActivelyInUse = truck.activeDelivery === true;
                    const statusAvailable =
                      truckStatus === "allocated" ||
                      truckStatus === "available" ||
                      truckStatus === "active";
                    return statusAvailable && !isActivelyInUse;
                  }).length
                }
              </h3>
              <p className="text-gray-500 font-medium m-0">Available Trucks</p>
            </div>
          </div>

          <div className="bg-white/90 backdrop-blur-md rounded-2xl p-6 shadow-xl border border-white/20 flex items-center gap-5 transition-transform hover:-translate-y-1">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center text-white text-2xl shadow-lg shadow-amber-500/30">
              <FaShippingFast />
            </div>
            <div>
              <h3 className="text-3xl font-bold text-gray-800 m-0">
                {
                  deliveries.filter(
                    (d) =>
                      d.DeliveryStatus === "pending" ||
                      d.DeliveryStatus === "in-progress",
                  ).length
                }
              </h3>
              <p className="text-gray-500 font-medium m-0">Active Deliveries</p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
          <div className="flex flex-col h-full">
            <div className="bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden flex flex-col h-full">
              <div className="bg-gradient-to-r from-gray-50 to-white px-6 py-4 border-b border-gray-100 flex justify-between items-center">
                <h2 className="text-lg font-bold text-gray-800 m-0">
                  Available Trucks for Booking ({allocatedTrucks.length} trucks)
                </h2>
              </div>
              <div className="p-0 flex-1 overflow-x-auto">
                {allocatedTrucks.length > 0 ? (
                  <div className="min-w-full inline-block align-middle">
                    <div className="overflow-hidden">
                      <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                          <tr>
                            <th
                              scope="col"
                              className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider"
                            >
                              Plate
                            </th>
                            <th
                              scope="col"
                              className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider"
                            >
                              Type
                            </th>
                            <th
                              scope="col"
                              className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider"
                            >
                              Capacity
                            </th>
                            <th
                              scope="col"
                              className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider"
                            >
                              Status
                            </th>
                            <th
                              scope="col"
                              className="px-6 py-3 text-right text-xs font-bold text-gray-500 uppercase tracking-wider"
                            >
                              Action
                            </th>
                          </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-100">
                          {allocatedTrucks.map((truck) => {
                            const operationalStatus =
                              truck.operationalStatus?.toLowerCase() ||
                              truck.OperationalStatus?.toLowerCase();
                            const availabilityStatus =
                              truck.availabilityStatus?.toLowerCase() ||
                              truck.AvailabilityStatus?.toLowerCase();
                            const isInActiveDelivery = deliveries.some(
                              (delivery) =>
                                delivery.TruckID === truck.TruckID &&
                                (delivery.DeliveryStatus === "pending" ||
                                  delivery.DeliveryStatus === "in-progress"),
                            );
                            const isBookable =
                              operationalStatus !== "maintenance" &&
                              operationalStatus !== "broken";
                            const displayStatus =
                              availabilityStatus === "free"
                                ? "Available"
                                : "In Use";

                            return (
                              <tr
                                key={truck.TruckID}
                                className="hover:bg-gray-50 transition-colors"
                              >
                                <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-gray-800">
                                  {truck.TruckPlate || "N/A"}
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                                  {truck.TruckType || "N/A"}
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                                  {truck.TruckCapacity
                                    ? `${truck.TruckCapacity} tons`
                                    : "N/A"}
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap">
                                  <span
                                    className={`px-3 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${availabilityStatus === "free" ? "bg-green-100 text-green-800" : "bg-amber-100 text-amber-800"}`}
                                  >
                                    {displayStatus}
                                  </span>
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                  <button
                                    className={`px-3 py-1.5 rounded-lg text-xs font-bold uppercase tracking-wider shadow-sm transition-all ${isBookable ? "bg-blue-600 hover:bg-blue-700 text-white hover:shadow-md" : "bg-gray-200 text-gray-400 cursor-not-allowed"}`}
                                    disabled={!isBookable}
                                    onClick={() => {
                                      if (!isBookable) {
                                        showWarning(
                                          "Truck Unavailable",
                                          "This truck is under maintenance or broken",
                                        );
                                        return;
                                      }
                                      setBookingData((prev) => ({
                                        ...prev,
                                        selectedTrucks: [truck.TruckID],
                                      }));
                                      setShowBookingModal(true);
                                    }}
                                    title={
                                      isInActiveDelivery
                                        ? "Truck has active delivery but can be booked on different dates"
                                        : "Click to book this truck"
                                    }
                                  >
                                    📅 Book
                                  </button>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center py-12 text-gray-500">
                    <div className="text-4xl mb-3 opacity-20">
                      <FaTruck />
                    </div>
                    <p className="font-medium">
                      No trucks available for booking.
                    </p>
                    <p className="text-sm">
                      Please contact your account manager.
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="flex flex-col h-full">
            <div className="bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden flex flex-col h-full">
              <div className="bg-gradient-to-r from-gray-50 to-white px-6 py-4 border-b border-gray-100">
                <h2 className="text-lg font-bold text-gray-800 m-0">
                  Recent Deliveries
                </h2>
              </div>
              <div className="p-0 flex-1 overflow-x-auto">
                {deliveries.length > 0 ? (
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th
                          scope="col"
                          className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider"
                        >
                          ID
                        </th>
                        <th
                          scope="col"
                          className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider"
                        >
                          Driver
                        </th>
                        <th
                          scope="col"
                          className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider"
                        >
                          Truck
                        </th>
                        <th
                          scope="col"
                          className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider"
                        >
                          Date
                        </th>
                        <th
                          scope="col"
                          className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider"
                        >
                          Status
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-100">
                      {deliveries.slice(0, 5).map((delivery) => (
                        <tr
                          key={delivery.DeliveryID}
                          className="hover:bg-gray-50 transition-colors"
                        >
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 border-l-4 border-transparent hover:border-blue-500">
                            {delivery.DeliveryID || "N/A"}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600 flex items-center gap-2">
                            <div className="w-6 h-6 rounded-full bg-blue-50 flex items-center justify-center text-blue-600 text-xs">
                              <FaUser />
                            </div>
                            {delivery.DriverName || "N/A"}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                            {delivery.TruckPlate || "N/A"}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {(() => {
                              try {
                                let dateToFormat = null;
                                if (delivery.DeliveryDate) {
                                  if (delivery.DeliveryDate.seconds)
                                    dateToFormat = new Date(
                                      delivery.DeliveryDate.seconds * 1000,
                                    );
                                  else if (
                                    typeof delivery.DeliveryDate === "string"
                                  )
                                    dateToFormat = new Date(
                                      delivery.DeliveryDate,
                                    );
                                  else
                                    dateToFormat = new Date(
                                      delivery.DeliveryDate,
                                    );
                                } else if (delivery.deliveryDate) {
                                  if (delivery.deliveryDate.seconds)
                                    dateToFormat = new Date(
                                      delivery.deliveryDate.seconds * 1000,
                                    );
                                  else
                                    dateToFormat = new Date(
                                      delivery.deliveryDate,
                                    );
                                } else if (delivery.created_at) {
                                  if (delivery.created_at.seconds)
                                    dateToFormat = new Date(
                                      delivery.created_at.seconds * 1000,
                                    );
                                  else
                                    dateToFormat = new Date(
                                      delivery.created_at,
                                    );
                                } else if (delivery.createdAt) {
                                  if (delivery.createdAt.seconds)
                                    dateToFormat = new Date(
                                      delivery.createdAt.seconds * 1000,
                                    );
                                  else
                                    dateToFormat = new Date(delivery.createdAt);
                                }

                                if (
                                  dateToFormat &&
                                  !isNaN(dateToFormat.getTime())
                                ) {
                                  return dateToFormat.toLocaleDateString(
                                    "en-US",
                                    {
                                      year: "numeric",
                                      month: "short",
                                      day: "numeric",
                                    },
                                  );
                                } else {
                                  return "Recent";
                                }
                              } catch (e) {
                                return "Recent";
                              }
                            })()}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <StatusBadge status={delivery.DeliveryStatus} />
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                ) : (
                  <div className="p-6 text-center text-gray-500">
                    <p>No deliveries found.</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Add the booking modal */}
        {renderBookingModal()}

        {/* Warning Modal */}
        <WarningModal
          isOpen={modalState.isOpen}
          onClose={hideModal}
          title={modalState.title}
          message={modalState.message}
          type={modalState.type}
          confirmText={modalState.confirmText}
          cancelText={modalState.cancelText}
          onConfirm={modalState.onConfirm}
          size={modalState.size}
        />

        {/* Display warnings if any */}
        {renderWarning()}

        {/* Quick Smart Booking Section */}
        <div className="mt-8 mb-4">
          <div className="bg-white/95 backdrop-blur-md rounded-2xl shadow-xl overflow-hidden border border-white/20">
            <div className="bg-gradient-to-r from-blue-600 to-blue-800 p-6 text-white">
              <h3 className="text-xl font-bold m-0 flex items-center gap-2">
                🚀 Smart Truck Booking
              </h3>
              <p className="text-blue-100 m-0 mt-1 opacity-90">
                Enter your cargo weight and we'll automatically find the optimal
                truck combination
              </p>
            </div>
            <div className="p-6 bg-white">
              <div className="flex flex-col md:flex-row gap-4 max-w-2xl">
                <div className="flex-1 relative">
                  <input
                    type="number"
                    placeholder="Cargo weight (tons)"
                    min="0.1"
                    step="0.1"
                    className="w-full px-4 py-3 rounded-xl border border-gray-300 focus:border-blue-500 focus:ring-4 focus:ring-blue-100 outline-none transition-all text-lg"
                    id="quickCargoWeight"
                  />
                  <div className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 font-medium pointer-events-none">
                    tons
                  </div>
                </div>
                <button
                  className="px-6 py-3 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white rounded-xl font-bold shadow-lg shadow-blue-500/30 transition-all transform hover:-translate-y-0.5 flex items-center gap-2 whitespace-nowrap justify-center"
                  onClick={() => {
                    const weight =
                      document.getElementById("quickCargoWeight").value;
                    if (weight && parseFloat(weight) > 0) {
                      handleSmartBooking(parseFloat(weight));
                    } else {
                      showWarning(
                        "Invalid Input",
                        "Please enter a valid cargo weight",
                      );
                    }
                  }}
                >
                  🚀 Smart Book Now
                </button>
              </div>
              <small className="block mt-3 text-gray-500">
                <span className="font-bold">Examples:</span> 5 tons → 1 truck,
                10 tons → 2-3 trucks, 20 tons → 4-5 trucks
              </small>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
