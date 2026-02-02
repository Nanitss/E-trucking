import React, { useState, useEffect } from "react";
import { useParams, useHistory } from "react-router-dom";
import axios from "axios";
import {
  FaArrowLeft,
  FaTruck,
  FaMapMarkerAlt,
  FaCalendarAlt,
  FaClock,
  FaMoneyBillWave,
  FaMap,
  FaCheckCircle,
  FaTimesCircle,
  FaExclamationCircle,
} from "react-icons/fa";
import LoadingComponent from "../../components/common/LoadingComponent";
import ErrorComponent from "../../components/common/ErrorComponent";
import DeliveryMap from "../../components/maps/DeliveryMap";

const DeliveryDetails = () => {
  const { id } = useParams();
  const history = useHistory();
  const [delivery, setDelivery] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showMap, setShowMap] = useState(false);

  useEffect(() => {
    const fetchDelivery = async () => {
      try {
        setLoading(true);
        const token = localStorage.getItem("token");

        if (!token) {
          setError("Authentication token missing. Please login again.");
          setLoading(false);
          return;
        }

        axios.defaults.headers.common["Authorization"] = `Bearer ${token}`;
        const response = await axios.get(`/api/clients/deliveries/${id}`);
        setDelivery(response.data);
      } catch (error) {
        console.error("Error fetching delivery details:", error);
        setError(
          error.response?.data?.message || "Failed to load delivery details",
        );
      } finally {
        setLoading(false);
      }
    };

    fetchDelivery();
  }, [id]);

  const getStatusColor = (status) => {
    switch (status) {
      case "pending":
        return "bg-amber-100 text-amber-700 border-amber-200";
      case "in-progress":
        return "bg-blue-100 text-blue-700 border-blue-200";
      case "completed":
        return "bg-emerald-100 text-emerald-700 border-emerald-200";
      case "cancelled":
        return "bg-red-100 text-red-700 border-red-200";
      default:
        return "bg-gray-100 text-gray-700 border-gray-200";
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return "N/A";
    const date = new Date(dateString);
    return new Intl.DateTimeFormat("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    }).format(date);
  };

  const toggleMap = () => {
    setShowMap(!showMap);
  };

  if (loading) return <LoadingComponent />;
  if (error) return <ErrorComponent message={error} />;
  if (!delivery) return <ErrorComponent message="Delivery not found" />;

  return (
    <div className="w-full max-w-[1400px] mx-auto p-4 md:p-8 bg-slate-50 min-h-screen">
      <div className="mb-6">
        <button
          onClick={() => history.push("/client/deliveries")}
          className="flex items-center gap-2 text-gray-600 hover:text-blue-600 transition-colors font-medium"
        >
          <FaArrowLeft /> Back to Deliveries
        </button>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        {/* Header */}
        <div className="p-6 border-b border-gray-100 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-800 mb-1">
              Delivery Details
            </h1>
            <p className="text-gray-500 text-sm font-mono">
              ID: #{delivery.DeliveryID}
            </p>
          </div>
          <div
            className={`px-4 py-2 rounded-full border text-sm font-bold uppercase tracking-wide flex items-center gap-2 ${getStatusColor(delivery.DeliveryStatus)}`}
          >
            {delivery.DeliveryStatus === "completed" && <FaCheckCircle />}
            {delivery.DeliveryStatus === "cancelled" && <FaTimesCircle />}
            {delivery.DeliveryStatus === "in-progress" && <FaTruck />}
            {delivery.DeliveryStatus === "pending" && <FaClock />}
            {delivery.DeliveryStatus}
          </div>
        </div>

        <div className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Truck Info Card */}
            <div className="bg-gray-50 rounded-xl p-6 border border-gray-200 h-full">
              <h3 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2 border-b border-gray-200 pb-3">
                <FaTruck className="text-blue-600" /> Truck Information
              </h3>
              <div className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-gray-500 text-sm">Truck ID</span>
                  <span className="font-medium text-gray-800">
                    {delivery.TruckID}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500 text-sm">Truck Plate</span>
                  <span className="font-medium text-gray-800">
                    {delivery.TruckPlate || "N/A"}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500 text-sm">Truck Type</span>
                  <span className="font-medium text-gray-800">
                    {delivery.TruckType || "N/A"}
                  </span>
                </div>
                {delivery.DriverName && (
                  <div className="flex justify-between">
                    <span className="text-gray-500 text-sm">Driver</span>
                    <span className="font-medium text-gray-800">
                      {delivery.DriverName}
                    </span>
                  </div>
                )}
                {delivery.HelperName && (
                  <div className="flex justify-between">
                    <span className="text-gray-500 text-sm">Helper</span>
                    <span className="font-medium text-gray-800">
                      {delivery.HelperName}
                    </span>
                  </div>
                )}
              </div>
            </div>

            {/* Schedule Info Card */}
            <div className="bg-gray-50 rounded-xl p-6 border border-gray-200 h-full">
              <h3 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2 border-b border-gray-200 pb-3">
                <FaCalendarAlt className="text-blue-600" /> Schedule & Cost
              </h3>
              <div className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-gray-500 text-sm">Scheduled For</span>
                  <span className="font-medium text-gray-800">
                    {formatDate(delivery.DeliveryDate)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500 text-sm">
                    Estimated Distance
                  </span>
                  <span className="font-medium text-gray-800">
                    {delivery.DeliveryDistance
                      ? `${delivery.DeliveryDistance} km`
                      : "N/A"}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500 text-sm">
                    Estimated Duration
                  </span>
                  <span className="font-medium text-gray-800">
                    {delivery.EstimatedDuration
                      ? `${delivery.EstimatedDuration} minutes`
                      : "N/A"}
                  </span>
                </div>
                <div className="flex justify-between items-center pt-2 border-t border-gray-200 mt-2">
                  <span className="text-gray-600 font-bold">Total Cost</span>
                  <span className="text-xl font-bold text-emerald-600 flex items-center gap-1">
                    <FaMoneyBillWave className="text-emerald-500 text-sm" />$
                    {delivery.DeliveryRate || "N/A"}
                  </span>
                </div>
              </div>
            </div>

            {/* Location Info & Map - Full Width */}
            <div className="md:col-span-2 bg-gray-50 rounded-xl p-6 border border-gray-200">
              <div className="flex justify-between items-center mb-4 border-b border-gray-200 pb-3">
                <h3 className="text-lg font-bold text-gray-800 flex items-center gap-2">
                  <FaMapMarkerAlt className="text-blue-600" /> Location Details
                </h3>
                <button
                  onClick={toggleMap}
                  className="px-4 py-2 bg-white border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 hover:text-blue-600 hover:border-blue-300 transition-all shadow-sm flex items-center gap-2"
                >
                  <FaMap /> {showMap ? "Hide Map" : "Show Map"}
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-4">
                <div className="relative pl-8 border-l-2 border-blue-200">
                  <div className="absolute left-[-9px] top-0 w-4 h-4 rounded-full bg-blue-500 border-4 border-white shadow-sm"></div>
                  <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">
                    Pickup Location
                  </p>
                  <p className="text-gray-800 font-medium text-lg">
                    {delivery.PickupLocation || "N/A"}
                  </p>
                </div>
                <div className="relative pl-8 border-l-2 border-amber-200">
                  <div className="absolute left-[-9px] top-0 w-4 h-4 rounded-full bg-amber-500 border-4 border-white shadow-sm"></div>
                  <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">
                    Drop-off Location
                  </p>
                  <p className="text-gray-800 font-medium text-lg">
                    {delivery.DeliveryAddress || "N/A"}
                  </p>
                </div>
              </div>

              {showMap && (
                <div className="mt-6 rounded-xl overflow-hidden shadow-md border border-gray-200 h-[400px]">
                  <DeliveryMap
                    pickupCoordinates={
                      delivery.pickupCoordinates || delivery.PickupCoordinates
                    }
                    dropoffCoordinates={
                      delivery.dropoffCoordinates || delivery.DropoffCoordinates
                    }
                    pickupLocation={delivery.PickupLocation}
                    dropoffLocation={delivery.DeliveryAddress}
                  />
                </div>
              )}
            </div>

            {/* Progress Section - Full Width */}
            <div className="md:col-span-2 bg-white rounded-xl p-6 border border-gray-200 shadow-sm">
              <h3 className="text-lg font-bold text-gray-800 mb-6 flex items-center gap-2">
                <FaClock className="text-blue-600" /> Delivery Progress
              </h3>

              {(() => {
                let progress = 0;
                let statusText = "";
                let barColor = "bg-blue-600";
                let textColor = "text-blue-600";

                switch (delivery.DeliveryStatus) {
                  case "pending":
                    progress = 25;
                    statusText =
                      "Your delivery is scheduled and pending pickup";
                    barColor = "bg-amber-500";
                    textColor = "text-amber-600";
                    break;
                  case "in-progress":
                    progress = 75;
                    statusText = "Your delivery is currently in transit";
                    barColor = "bg-blue-600";
                    textColor = "text-blue-600";
                    break;
                  case "completed":
                    progress = 100;
                    statusText =
                      "Your delivery has been completed successfully";
                    barColor = "bg-emerald-500";
                    textColor = "text-emerald-600";
                    break;
                  case "cancelled":
                    progress = 100;
                    statusText = "This delivery has been cancelled";
                    barColor = "bg-red-500";
                    textColor = "text-red-600";
                    break;
                  default:
                    progress = 0;
                    statusText = "Unknown status";
                }

                return (
                  <div className="w-full">
                    <div className="w-full bg-gray-100 rounded-full h-4 mb-4 overflow-hidden">
                      <div
                        className={`h-4 rounded-full transition-all duration-1000 ease-out ${barColor}`}
                        style={{ width: `${progress}%` }}
                      ></div>
                    </div>
                    <div
                      className={`text-center font-medium ${textColor} flex items-center justify-center gap-2`}
                    >
                      {delivery.DeliveryStatus === "completed" ? (
                        <FaCheckCircle />
                      ) : (
                        <FaTruck />
                      )}
                      {statusText}
                    </div>
                  </div>
                );
              })()}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DeliveryDetails;
