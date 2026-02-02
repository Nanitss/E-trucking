import React, { useState, useEffect, useContext } from "react";
import { useHistory, Link } from "react-router-dom";
import axios from "axios";
import {
    FaTruck,
    FaMapMarkerAlt,
    FaCalendarAlt,
    FaUser,
    FaPhone,
    FaRoute,
    FaSearch,
    FaArrowLeft,
} from "react-icons/fa";

import { AuthContext } from "../../context/AuthContext";
import RouteMap from "../../components/maps/RouteMap";
import enhancedIsolatedMapModal from "../../components/maps/EnhancedIsolatedMapModal";
import useWarningModal from "../../hooks/useWarningModal";
import { useModernToast } from "../../context/ModernToastContext";
import WarningModal from "../../components/common/WarningModal";
import ModernToast from "../../components/common/ModernToast";

const BookTruck = () => {
    const { authUser } = useContext(AuthContext) || { authUser: null };
    const history = useHistory();

    // Data states
    const [allocatedTrucks, setAllocatedTrucks] = useState([]);
    const [deliveries, setDeliveries] = useState([]);
    const [vehicleRates, setVehicleRates] = useState([]);
    const [isLoading, setIsLoading] = useState(true);

    // Booking states
    const [bookingData, setBookingData] = useState({
        pickupLocation: "",
        pickupCoordinates: null,
        dropoffLocation: "",
        dropoffCoordinates: null,
        weight: "",
        deliveryDate: "",
        deliveryTime: "",
        selectedTrucks: [],
        pickupContactPerson: "",
        pickupContactNumber: "",
        dropoffContactPerson: "",
        dropoffContactNumber: "",
    });
    const [recommendedTrucks, setRecommendedTrucks] = useState([]);
    const [showRoutePreview, setShowRoutePreview] = useState(false);
    const [routeDetails, setRouteDetails] = useState(null);

    // Real-time availability checking states
    const [availableTrucksForDate, setAvailableTrucksForDate] = useState([]);
    const [bookedDatesForTruck, setBookedDatesForTruck] = useState([]);
    const [isCheckingAvailability, setIsCheckingAvailability] = useState(false);

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

    // Modern toast hook
    const {
        toasts,
        removeToast,
        showSuccess: showToastSuccess,
        showError: showToastError,
    } = useModernToast();

    // Set up axios with token
    useEffect(() => {
        const token = localStorage.getItem("token");
        if (token) {
            axios.defaults.headers.common["Authorization"] = `Bearer ${token}`;
        }
    }, []);

    // Fetch data on mount
    useEffect(() => {
        fetchData();
    }, []);

    // Set default date and time for booking
    useEffect(() => {
        const tomorrow = new Date();
        tomorrow.setDate(tomorrow.getDate() + 1);
        const formattedDate = tomorrow.toISOString().split("T")[0];
        const defaultTime = "12:00";

        setBookingData((prev) => ({
            ...prev,
            deliveryDate: formattedDate,
            deliveryTime: defaultTime,
        }));
    }, []);

    // Clear used locations when component unmounts
    useEffect(() => {
        return () => {
            enhancedIsolatedMapModal.clearUsedLocations();
        };
    }, []);

    // Check truck availability when date changes
    useEffect(() => {
        if (bookingData.deliveryDate) {
            checkAvailableTrucksForDate(bookingData.deliveryDate);
        }
    }, [bookingData.deliveryDate]);

    const fetchData = async () => {
        try {
            setIsLoading(true);

            // Fetch allocated trucks
            try {
                const trucksRes = await axios.get("/api/clients/profile/trucks");
                setAllocatedTrucks(trucksRes.data || []);
            } catch (trucksError) {
                console.error("Error fetching trucks:", trucksError);
                setAllocatedTrucks([]);
            }

            // Fetch deliveries for availability checking
            try {
                const deliveriesRes = await axios.get("/api/clients/profile/deliveries");
                setDeliveries(deliveriesRes.data || []);
            } catch (deliveriesError) {
                console.error("Error fetching deliveries:", deliveriesError);
                setDeliveries([]);
            }

            // Fetch vehicle rates
            try {
                const response = await axios.get("/api/clients/vehicle-rates");
                if (response.data.success) {
                    setVehicleRates(response.data.data || []);
                }
            } catch (ratesError) {
                console.error("Error fetching vehicle rates:", ratesError);
                setVehicleRates([]);
            }

            setIsLoading(false);
        } catch (error) {
            console.error("Error fetching data:", error);
            setIsLoading(false);
        }
    };

    // Check available trucks for a specific date
    const checkAvailableTrucksForDate = async (selectedDate) => {
        try {
            setIsCheckingAvailability(true);
            const response = await axios.get(
                `/api/clients/trucks/availability?date=${selectedDate}`
            );
            if (response.data.success) {
                setAvailableTrucksForDate(response.data.availableTruckIds || []);
            }
        } catch (error) {
            console.error("Error checking availability:", error);
            // Fallback to showing all trucks
            setAvailableTrucksForDate(allocatedTrucks.map((t) => t.TruckID));
        } finally {
            setIsCheckingAvailability(false);
        }
    };

    // Handle date change with availability checking
    const handleDateChange = (e) => {
        const newDate = e.target.value;
        setBookingData((prev) => ({
            ...prev,
            deliveryDate: newDate,
            selectedTrucks: [], // Clear selections when date changes
        }));
        setRecommendedTrucks([]);
    };

    // Handle truck selection with availability
    const handleTruckSelectionWithAvailability = (truckId) => {
        setBookingData((prev) => {
            const isSelected = prev.selectedTrucks.includes(truckId);
            return {
                ...prev,
                selectedTrucks: isSelected
                    ? prev.selectedTrucks.filter((id) => id !== truckId)
                    : [...prev.selectedTrucks, truckId],
            };
        });
    };

    // Handle cargo weight change and smart booking
    const handleCapacityChange = async (e) => {
        const capacity = parseFloat(e.target.value);
        setBookingData((prev) => ({
            ...prev,
            weight: e.target.value,
        }));

        if (!isNaN(capacity) && capacity > 0) {
            await handleSmartBooking(capacity);
        } else {
            setRecommendedTrucks([]);
            setBookingData((prev) => ({
                ...prev,
                selectedTrucks: [],
            }));
        }
    };

    // Smart booking algorithm
    const handleSmartBooking = async (cargoWeight) => {
        // Filter available trucks
        let availableTrucks = allocatedTrucks.filter((truck) => {
            const operationalStatus =
                truck.operationalStatus?.toLowerCase() ||
                truck.OperationalStatus?.toLowerCase();
            return operationalStatus !== "maintenance" && operationalStatus !== "broken";
        });

        // Filter by date availability
        if (bookingData.deliveryDate && availableTrucksForDate.length > 0) {
            availableTrucks = availableTrucks.filter((truck) =>
                availableTrucksForDate.includes(truck.TruckID)
            );
        }

        // Calculate total available capacity
        const totalCapacity = availableTrucks.reduce(
            (sum, truck) => sum + (parseFloat(truck.TruckCapacity) || 0),
            0
        );

        if (totalCapacity < cargoWeight) {
            showWarning(
                "Insufficient Truck Capacity",
                `Your cargo (${cargoWeight} tons) exceeds available capacity (${totalCapacity.toFixed(1)} tons).`
            );
            setRecommendedTrucks([]);
            return;
        }

        // Find optimal truck combination
        const optimalTrucks = findBestTruckCombination(availableTrucks, cargoWeight);

        if (optimalTrucks.length > 0) {
            setRecommendedTrucks(optimalTrucks);
            const truckIds = optimalTrucks.map((truck) => truck.TruckID);
            setBookingData((prev) => ({
                ...prev,
                selectedTrucks: truckIds,
            }));
        } else {
            setRecommendedTrucks([]);
            showWarning(
                "No Suitable Combination",
                "Unable to find a suitable truck combination."
            );
        }
    };

    // Find best truck combination algorithm
    const findBestTruckCombination = (availableTrucks, targetWeight) => {
        if (!availableTrucks || availableTrucks.length === 0) return [];

        const sortedTrucks = [...availableTrucks].sort((a, b) => {
            const capacityA = parseFloat(a.TruckCapacity) || 0;
            const capacityB = parseFloat(b.TruckCapacity) || 0;
            return capacityA - capacityB;
        });

        // Find single truck with closest capacity match
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
            return [bestSingleTruck];
        }

        // Find combination of trucks
        let bestCombination = [];
        let bestWaste = Infinity;

        const maxCombinations = Math.min(Math.pow(2, sortedTrucks.length), 1000);

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
                const waste = totalCapacity - targetWeight;
                if (
                    waste < bestWaste ||
                    (waste === bestWaste && combination.length < bestCombination.length)
                ) {
                    bestWaste = waste;
                    bestCombination = combination;
                }
            }
        }

        return bestCombination;
    };

    // Open map modal for location selection
    const openMapModal = (type) => {
        const onSelectCallback = (address, coordinates, locationData) => {
            if (type === "pickup") {
                setBookingData((prev) => ({
                    ...prev,
                    pickupLocation: address,
                    pickupCoordinates: coordinates,
                    pickupContactPerson: locationData?.contactPerson || prev.pickupContactPerson,
                    pickupContactNumber: locationData?.contactNumber || prev.pickupContactNumber,
                }));
            } else {
                setBookingData((prev) => ({
                    ...prev,
                    dropoffLocation: address,
                    dropoffCoordinates: coordinates,
                    dropoffContactPerson: locationData?.contactPerson || prev.dropoffContactPerson,
                    dropoffContactNumber: locationData?.contactNumber || prev.dropoffContactNumber,
                }));
            }
        };

        enhancedIsolatedMapModal.open({
            onSelect: onSelectCallback,
            initialLocation: type === "pickup" ? bookingData.pickupCoordinates : bookingData.dropoffCoordinates,
            title: type === "pickup" ? "Select Pickup Location" : "Select Drop-off Location",
            locationType: type,
        });
    };

    // Toggle route preview
    const toggleRoutePreview = () => {
        setShowRoutePreview(!showRoutePreview);
    };

    // Handle route calculation
    const handleRouteCalculated = (routeInfo) => {
        setRouteDetails(routeInfo);
    };

    // Calculate estimated cost per truck
    const calculateEstimatedCostPerTruck = () => {
        if (!routeDetails || !bookingData.selectedTrucks.length) return 0;

        const firstTruck = allocatedTrucks.find((truck) =>
            bookingData.selectedTrucks.includes(truck.TruckID)
        );
        if (!firstTruck) return 0;

        const vehicleType = firstTruck.TruckType || "mini truck";
        const distance = routeDetails.distanceValue || 0;
        const rate = vehicleRates.find((r) => r.vehicleType === vehicleType);

        if (rate) {
            const baseRate = parseFloat(rate.baseRate) || 0;
            const ratePerKm = parseFloat(rate.ratePerKm) || 0;
            return (baseRate + distance * ratePerKm).toFixed(2);
        }

        // Default calculation
        return (500 + distance * 15).toFixed(2);
    };

    // Calculate total estimated cost
    const calculateTotalEstimatedCost = () => {
        const costPerTruck = parseFloat(calculateEstimatedCostPerTruck()) || 0;
        return (costPerTruck * bookingData.selectedTrucks.length).toFixed(2);
    };

    // Handle booking submission
    const handleBookingSubmit = async (e) => {
        e.preventDefault();

        // Validation
        if (!bookingData.pickupLocation || !bookingData.dropoffLocation) {
            showError("Missing Information", "Please select both pickup and drop-off locations.");
            return;
        }

        if (!bookingData.pickupContactNumber || !bookingData.dropoffContactNumber) {
            showError("Missing Information", "Please provide contact numbers for pickup and drop-off.");
            return;
        }

        if (bookingData.selectedTrucks.length === 0) {
            showError("No Trucks Selected", "Please select at least one truck for booking.");
            return;
        }

        // Show confirmation
        showConfirm(
            "Confirm Booking",
            `You are about to book ${bookingData.selectedTrucks.length} truck(s) for delivery on ${bookingData.deliveryDate}. Proceed?`,
            {
                onConfirm: async () => {
                    try {
                        const response = await axios.post("/api/deliveries/book", {
                            pickupLocation: bookingData.pickupLocation,
                            pickupCoordinates: bookingData.pickupCoordinates,
                            dropoffLocation: bookingData.dropoffLocation,
                            dropoffCoordinates: bookingData.dropoffCoordinates,
                            deliveryDate: bookingData.deliveryDate,
                            deliveryTime: bookingData.deliveryTime,
                            selectedTrucks: bookingData.selectedTrucks,
                            cargoWeight: parseFloat(bookingData.weight) || 0,
                            pickupContactPerson: bookingData.pickupContactPerson,
                            pickupContactNumber: bookingData.pickupContactNumber,
                            dropoffContactPerson: bookingData.dropoffContactPerson,
                            dropoffContactNumber: bookingData.dropoffContactNumber,
                            routeInfo: routeDetails,
                        });

                        if (response.data.success) {
                            showToastSuccess(
                                "Booking Successful",
                                `Successfully booked ${bookingData.selectedTrucks.length} truck(s) for delivery.`
                            );
                            // Navigate back to trucks tab
                            setTimeout(() => {
                                history.push("/client/profile?tab=trucks");
                            }, 1500);
                        }
                    } catch (error) {
                        console.error("Booking error:", error);
                        showError(
                            "Booking Failed",
                            error.response?.data?.message || "Failed to create booking. Please try again."
                        );
                    }
                },
            }
        );
    };

    // Get available trucks for display
    const getAvailableTrucksForDisplay = () => {
        let availableTrucks = allocatedTrucks.filter((truck) => {
            const operationalStatus =
                truck.operationalStatus?.toLowerCase() ||
                truck.OperationalStatus?.toLowerCase();
            return operationalStatus !== "maintenance" && operationalStatus !== "broken";
        });

        if (bookingData.deliveryDate && availableTrucksForDate.length > 0) {
            availableTrucks = availableTrucks.filter((truck) =>
                availableTrucksForDate.includes(truck.TruckID)
            );
        }

        return availableTrucks;
    };

    if (isLoading) {
        return (
            <div className="flex items-center justify-center min-h-screen">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
            </div>
        );
    }

    const availableTrucks = getAvailableTrucksForDisplay();

    return (
        <div className="min-h-screen bg-gray-50 py-8 px-4">
            {/* Warning Modal */}
            <WarningModal
                isOpen={modalState.isOpen}
                onClose={hideModal}
                title={modalState.title}
                message={modalState.message}
                type={modalState.type}
                onConfirm={modalState.onConfirm}
                confirmText={modalState.confirmText}
                cancelText={modalState.cancelText}
            />

            {/* Modern Toast Container */}
            <ModernToast toasts={toasts} removeToast={removeToast} />

            <div className="max-w-4xl mx-auto">
                {/* Header */}
                <div className="mb-6">
                    <Link
                        to="/client/profile?tab=trucks"
                        className="inline-flex items-center gap-2 text-blue-600 hover:text-blue-700 font-medium mb-4"
                    >
                        <FaArrowLeft /> Back to My Trucks
                    </Link>
                    <h1 className="text-3xl font-bold text-gray-800 flex items-center gap-3">
                        <FaTruck className="text-blue-600" />
                        Book Truck Rental
                    </h1>
                    <p className="text-gray-500 mt-1">
                        Fill in the details below to book trucks for your delivery
                    </p>
                </div>

                {/* Booking Form */}
                <div className="bg-white rounded-2xl shadow-lg border border-gray-200 p-8">
                    <form onSubmit={handleBookingSubmit} className="flex flex-col gap-6">
                        {/* Cargo Weight */}
                        <div className="flex flex-col gap-2">
                            <label htmlFor="weight" className="text-sm font-bold text-gray-700">
                                Cargo Weight (tons)
                            </label>
                            <div className="flex gap-2">
                                <input
                                    type="number"
                                    id="weight"
                                    name="weight"
                                    value={bookingData.weight}
                                    onChange={handleCapacityChange}
                                    className="flex-1 w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-blue-500 focus:ring-4 focus:ring-blue-100 outline-none transition-all"
                                    required
                                    min="0.1"
                                    step="0.1"
                                    placeholder="Enter cargo weight in tons"
                                />
                                <button
                                    type="button"
                                    className={`px-5 py-3 rounded-xl font-bold text-white transition-all shadow-md ${!bookingData.weight || parseFloat(bookingData.weight) <= 0
                                            ? "bg-gray-400 cursor-not-allowed"
                                            : "bg-emerald-500 hover:bg-emerald-600 shadow-emerald-500/20"
                                        }`}
                                    onClick={() => {
                                        const weight = parseFloat(bookingData.weight);
                                        if (weight && weight > 0) {
                                            handleSmartBooking(weight);
                                        }
                                    }}
                                    disabled={!bookingData.weight || parseFloat(bookingData.weight) <= 0}
                                >
                                    🚀 Smart Book
                                </button>
                            </div>
                            <small className="text-xs text-gray-500">
                                Enter cargo weight and click "Smart Book" to automatically find the optimal truck combination
                            </small>
                        </div>

                        {/* Pickup Location */}
                        <div className="flex flex-col gap-2">
                            <label className="text-sm font-bold text-gray-700">
                                <FaMapMarkerAlt className="inline mr-1" /> Pickup Location
                            </label>
                            <div className="flex gap-2">
                                <input
                                    type="text"
                                    value={bookingData.pickupLocation}
                                    onChange={(e) =>
                                        setBookingData((prev) => ({ ...prev, pickupLocation: e.target.value }))
                                    }
                                    className="flex-1 w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-blue-500 focus:ring-4 focus:ring-blue-100 outline-none transition-all"
                                    required
                                    placeholder="Enter pickup address"
                                />
                                <button
                                    type="button"
                                    className="px-4 py-3 border border-gray-200 text-gray-600 bg-white hover:bg-gray-50 rounded-xl font-medium transition-colors flex items-center gap-2"
                                    onClick={() => openMapModal("pickup")}
                                >
                                    <FaSearch /> Map
                                </button>
                            </div>
                        </div>

                        {/* Drop-off Location */}
                        <div className="flex flex-col gap-2">
                            <label className="text-sm font-bold text-gray-700">
                                <FaMapMarkerAlt className="inline mr-1" /> Drop-off Location
                            </label>
                            <div className="flex gap-2">
                                <input
                                    type="text"
                                    value={bookingData.dropoffLocation}
                                    onChange={(e) =>
                                        setBookingData((prev) => ({ ...prev, dropoffLocation: e.target.value }))
                                    }
                                    className="flex-1 w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-blue-500 focus:ring-4 focus:ring-blue-100 outline-none transition-all"
                                    required
                                    placeholder="Enter delivery address"
                                />
                                <button
                                    type="button"
                                    className="px-4 py-3 border border-gray-200 text-gray-600 bg-white hover:bg-gray-50 rounded-xl font-medium transition-colors flex items-center gap-2"
                                    onClick={() => openMapModal("dropoff")}
                                >
                                    <FaSearch /> Map
                                </button>
                            </div>
                        </div>

                        {/* Route Preview Button */}
                        <div className="flex justify-center">
                            <button
                                type="button"
                                className="px-4 py-2 border border-blue-200 text-blue-600 bg-blue-50 hover:bg-blue-100 rounded-xl font-bold flex items-center gap-2 transition-colors"
                                onClick={toggleRoutePreview}
                                disabled={!bookingData.pickupCoordinates || !bookingData.dropoffCoordinates}
                            >
                                <FaRoute /> {showRoutePreview ? "Hide Route Preview" : "Show Route Preview"}
                            </button>
                        </div>

                        {/* Route Info */}
                        {bookingData.pickupCoordinates && bookingData.dropoffCoordinates && (
                            <div className="bg-blue-50 rounded-xl p-4 border border-blue-100">
                                <h4 className="text-sm font-bold text-blue-800 mb-3 flex items-center gap-2">
                                    🚛 Delivery Route Information
                                </h4>
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
                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="bg-white p-3 rounded-lg shadow-sm border border-blue-100">
                                            <div className="text-xs text-gray-500 font-bold uppercase">Distance</div>
                                            <div className="text-lg font-bold text-gray-800">{routeDetails.distanceText}</div>
                                        </div>
                                        <div className="bg-white p-3 rounded-lg shadow-sm border border-blue-100">
                                            <div className="text-xs text-gray-500 font-bold uppercase">Travel Time</div>
                                            <div className="text-lg font-bold text-gray-800">{routeDetails.durationText}</div>
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}

                        {/* Route Map Preview */}
                        {showRoutePreview && (
                            <div className="border rounded-xl overflow-hidden shadow-md">
                                <div className="bg-gray-50 px-4 py-2 border-b border-gray-200">
                                    <h4 className="text-sm font-bold text-gray-700 m-0">
                                        Delivery Route Map Preview
                                    </h4>
                                </div>
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

                        {/* Delivery Date */}
                        <div className="flex flex-col gap-2">
                            <label className="text-sm font-bold text-gray-700">
                                <FaCalendarAlt className="inline mr-1" /> Delivery Date
                            </label>
                            <input
                                type="date"
                                value={bookingData.deliveryDate}
                                onChange={handleDateChange}
                                className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-blue-500 focus:ring-4 focus:ring-blue-100 outline-none transition-all"
                                required
                                min={new Date().toISOString().split("T")[0]}
                                disabled={isCheckingAvailability}
                            />
                            {isCheckingAvailability && (
                                <small className="text-xs text-blue-600 animate-pulse font-medium">
                                    🔍 Checking truck availability...
                                </small>
                            )}
                            {bookingData.deliveryDate && availableTrucksForDate.length > 0 && (
                                <small className="text-xs text-emerald-600 font-medium">
                                    ✅ {availableTrucksForDate.length} truck(s) available on this date
                                </small>
                            )}
                        </div>

                        {/* Delivery Time */}
                        <div className="flex flex-col gap-2">
                            <label className="text-sm font-bold text-gray-700">Delivery Time</label>
                            <input
                                type="time"
                                value={bookingData.deliveryTime}
                                onChange={(e) =>
                                    setBookingData((prev) => ({ ...prev, deliveryTime: e.target.value }))
                                }
                                className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-blue-500 focus:ring-4 focus:ring-blue-100 outline-none transition-all"
                                required
                            />
                        </div>

                        {/* Contact Information Tip */}
                        <div className="bg-blue-50 text-blue-700 p-3 rounded-xl border border-blue-200 text-sm flex items-start gap-2">
                            <span className="text-lg">💡</span>
                            <div>
                                <strong>Tip:</strong> If you select a saved location, contact info will be auto-filled
                            </div>
                        </div>

                        {/* Pickup Contact Information */}
                        <div className="bg-gray-50 p-5 rounded-xl border border-gray-200">
                            <h5 className="text-sm font-bold text-blue-800 uppercase tracking-wider mb-4 border-b border-gray-200 pb-2">
                                📍 Pickup Contact Information
                            </h5>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="flex flex-col gap-2">
                                    <label className="text-sm font-bold text-gray-700">
                                        <FaUser className="inline mr-1" /> Contact Person{" "}
                                        <span className="text-gray-400 font-normal text-xs">(Optional)</span>
                                    </label>
                                    <input
                                        type="text"
                                        value={bookingData.pickupContactPerson || ""}
                                        onChange={(e) =>
                                            setBookingData((prev) => ({
                                                ...prev,
                                                pickupContactPerson: e.target.value,
                                            }))
                                        }
                                        className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-blue-500 focus:ring-4 focus:ring-blue-100 outline-none transition-all"
                                        placeholder="Person at pickup"
                                    />
                                </div>
                                <div className="flex flex-col gap-2">
                                    <label className="text-sm font-bold text-gray-700">
                                        <FaPhone className="inline mr-1" /> Contact Number{" "}
                                        <span className="text-red-500">*</span>
                                    </label>
                                    <input
                                        type="tel"
                                        value={bookingData.pickupContactNumber || ""}
                                        onChange={(e) =>
                                            setBookingData((prev) => ({
                                                ...prev,
                                                pickupContactNumber: e.target.value,
                                            }))
                                        }
                                        className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-blue-500 focus:ring-4 focus:ring-blue-100 outline-none transition-all"
                                        required
                                        placeholder="e.g., 09605877964"
                                    />
                                </div>
                            </div>
                        </div>

                        {/* Dropoff Contact Information */}
                        <div className="bg-gray-50 p-5 rounded-xl border border-gray-200">
                            <h5 className="text-sm font-bold text-blue-800 uppercase tracking-wider mb-4 border-b border-gray-200 pb-2">
                                📍 Dropoff Contact Information
                            </h5>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="flex flex-col gap-2">
                                    <label className="text-sm font-bold text-gray-700">
                                        <FaUser className="inline mr-1" /> Contact Person{" "}
                                        <span className="text-gray-400 font-normal text-xs">(Optional)</span>
                                    </label>
                                    <input
                                        type="text"
                                        value={bookingData.dropoffContactPerson || ""}
                                        onChange={(e) =>
                                            setBookingData((prev) => ({
                                                ...prev,
                                                dropoffContactPerson: e.target.value,
                                            }))
                                        }
                                        className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-blue-500 focus:ring-4 focus:ring-blue-100 outline-none transition-all"
                                        placeholder="Person at dropoff"
                                    />
                                </div>
                                <div className="flex flex-col gap-2">
                                    <label className="text-sm font-bold text-gray-700">
                                        <FaPhone className="inline mr-1" /> Contact Number{" "}
                                        <span className="text-red-500">*</span>
                                    </label>
                                    <input
                                        type="tel"
                                        value={bookingData.dropoffContactNumber || ""}
                                        onChange={(e) =>
                                            setBookingData((prev) => ({
                                                ...prev,
                                                dropoffContactNumber: e.target.value,
                                            }))
                                        }
                                        className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-blue-500 focus:ring-4 focus:ring-blue-100 outline-none transition-all"
                                        required
                                        placeholder="e.g., 09605877964"
                                    />
                                </div>
                            </div>
                        </div>

                        {/* Price Estimation */}
                        {bookingData.selectedTrucks.length > 0 && routeDetails && (
                            <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl p-5 border border-blue-200 shadow-sm">
                                <h4 className="text-base font-bold text-blue-900 mb-3 pb-2 border-b border-blue-200 flex items-center gap-2">
                                    🧮 Estimated Cost
                                </h4>
                                <div className="flex flex-col gap-2">
                                    <div className="flex justify-between items-center text-sm">
                                        <span className="text-gray-600 font-medium">Distance:</span>
                                        <span className="font-bold text-gray-800">{routeDetails.distanceText}</span>
                                    </div>
                                    <div className="flex justify-between items-center text-sm">
                                        <span className="text-gray-600 font-medium">Selected Trucks:</span>
                                        <span className="font-bold text-gray-800">
                                            {bookingData.selectedTrucks.length} truck{bookingData.selectedTrucks.length !== 1 ? "s" : ""}
                                        </span>
                                    </div>
                                    <div className="flex justify-between items-center text-sm">
                                        <span className="text-gray-600 font-medium">Estimated Cost per Truck:</span>
                                        <span className="font-bold text-blue-700">₱{calculateEstimatedCostPerTruck()}</span>
                                    </div>
                                    <div className="flex justify-between items-center pt-2 mt-1 border-t border-blue-200/50">
                                        <span className="text-base font-bold text-blue-900">Total Estimated Cost:</span>
                                        <span className="text-xl font-extrabold text-blue-700">₱{calculateTotalEstimatedCost()}</span>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Truck Selection */}
                        <div className="flex flex-col gap-2">
                            <label className="text-sm font-bold text-gray-700">Select Trucks for Booking</label>
                            <p className="text-xs text-gray-500 m-0">
                                📋 Only trucks allocated to your account can be booked. Contact your account manager if you need additional trucks.
                            </p>

                            {bookingData.weight && recommendedTrucks.length > 0 && (
                                <div className="bg-emerald-50 text-emerald-800 p-3 rounded-xl border border-emerald-200 mb-3 flex items-start gap-2 text-sm">
                                    <span className="text-lg">⚙️</span>
                                    <div>
                                        <strong>Smart Recommendation:</strong> {recommendedTrucks.length} truck
                                        {recommendedTrucks.length !== 1 ? "s" : ""} recommended for {bookingData.weight} tons cargo
                                    </div>
                                </div>
                            )}

                            {availableTrucks.length > 0 ? (
                                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 max-h-96 overflow-y-auto pr-1">
                                    {availableTrucks.map((truck) => {
                                        const isRecommended = recommendedTrucks.some((rt) => rt.TruckID === truck.TruckID);
                                        const isSelected = bookingData.selectedTrucks.includes(truck.TruckID);
                                        const capacity = parseFloat(truck.TruckCapacity) || 0;
                                        const cargoWeight = parseFloat(bookingData.weight) || 0;

                                        let utilizationPercentage = 0;
                                        if (isSelected && cargoWeight > 0) {
                                            const selectedTruckObjects = bookingData.selectedTrucks
                                                .map((id) => availableTrucks.find((t) => t.TruckID === id))
                                                .filter((t) => t);
                                            const totalSelectedCapacity = selectedTruckObjects.reduce(
                                                (sum, t) => sum + (parseFloat(t.TruckCapacity) || 0),
                                                0
                                            );
                                            if (totalSelectedCapacity > 0) {
                                                const assignedCargo = (capacity / totalSelectedCapacity) * cargoWeight;
                                                utilizationPercentage = (assignedCargo / capacity) * 100;
                                            }
                                        }

                                        return (
                                            <div
                                                key={truck.TruckID}
                                                className={`relative border rounded-xl p-3 cursor-pointer transition-all hover:translate-y-[-2px] hover:shadow-md ${isSelected
                                                        ? "border-blue-500 bg-blue-50 ring-2 ring-blue-200"
                                                        : isRecommended
                                                            ? "border-amber-400 bg-amber-50"
                                                            : "border-gray-200 bg-white hover:bg-gray-50"
                                                    }`}
                                                onClick={() => handleTruckSelectionWithAvailability(truck.TruckID)}
                                            >
                                                {isRecommended && (
                                                    <div className="absolute top-2 right-2 bg-amber-400 text-white text-[10px] font-extrabold px-2 py-0.5 rounded shadow-sm z-10">
                                                        RECOMMENDED
                                                    </div>
                                                )}
                                                <div className="flex gap-3 items-center mb-2">
                                                    <div className={`p-2 rounded-lg ${isSelected ? "bg-blue-200 text-blue-700" : "bg-gray-100 text-gray-500"}`}>
                                                        <FaTruck className="text-xl" />
                                                    </div>
                                                    <div>
                                                        <div className="font-bold text-gray-800 text-sm">{truck.TruckPlate}</div>
                                                        <div className="text-xs text-gray-500 uppercase font-medium">{truck.TruckType}</div>
                                                    </div>
                                                </div>
                                                <div className="text-sm text-gray-600 mb-2">{truck.TruckCapacity} tons capacity</div>
                                                <div className="absolute top-2 right-2">
                                                    {isSelected && <span className="text-blue-600 font-bold text-lg">✓</span>}
                                                </div>
                                                <div className="h-1.5 w-full bg-gray-200 rounded-full overflow-hidden">
                                                    <div
                                                        className={`h-full rounded-full transition-all duration-500 ${utilizationPercentage > 100 ? "bg-red-500" : "bg-emerald-500"
                                                            }`}
                                                        style={{ width: `${Math.min(100, utilizationPercentage)}%` }}
                                                    ></div>
                                                </div>
                                                <div className="text-[10px] text-gray-500 mt-1 text-right font-medium">
                                                    {utilizationPercentage.toFixed(0)}% utilized
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            ) : (
                                <div className="bg-gray-50 border border-dashed border-gray-300 rounded-xl p-6 text-center text-gray-500">
                                    <p className="m-0 font-medium">No available trucks for booking.</p>
                                    <p className="m-0 text-sm mt-1">
                                        All trucks are currently in use or contact your account manager to get trucks allocated.
                                    </p>
                                </div>
                            )}

                            <small className="text-xs text-gray-500 mt-2 block">
                                {bookingData.selectedTrucks.length} truck{bookingData.selectedTrucks.length !== 1 ? "s" : ""} selected
                                {bookingData.selectedTrucks.length > 0 && (
                                    <span className="font-medium text-gray-700">
                                        {" "}• Total capacity:{" "}
                                        {bookingData.selectedTrucks
                                            .map((id) => allocatedTrucks.find((t) => t.TruckID === id))
                                            .filter((t) => t)
                                            .reduce((sum, truck) => sum + (parseFloat(truck.TruckCapacity) || 0), 0)}{" "}
                                        tons
                                    </span>
                                )}
                            </small>
                        </div>

                        {/* Action Buttons */}
                        <div className="flex justify-end gap-3 mt-4 pt-4 border-t border-gray-100">
                            <button
                                type="button"
                                className="px-6 py-3 border border-gray-200 rounded-xl text-gray-600 bg-white hover:bg-gray-50 transition-colors font-medium"
                                onClick={() => history.push("/client/profile?tab=trucks")}
                            >
                                Cancel
                            </button>
                            <button
                                type="submit"
                                className="px-8 py-3 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white rounded-xl font-bold shadow-lg shadow-blue-500/20 transition-all hover:-translate-y-0.5 disabled:opacity-50 disabled:cursor-not-allowed disabled:shadow-none"
                                disabled={bookingData.selectedTrucks.length === 0}
                            >
                                Book {bookingData.selectedTrucks.length} Truck{bookingData.selectedTrucks.length !== 1 ? "s" : ""}
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    );
};

export default BookTruck;
