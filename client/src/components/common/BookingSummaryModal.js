import React from "react";
import {
  FaCheckCircle,
  FaTimes,
  FaTruck,
  FaMapMarkerAlt,
  FaCalendarAlt,
  FaClock,
  FaRoute,
  FaMoneyBillWave,
} from "react-icons/fa";

/**
 * BookingSummaryModal - Displays a detailed summary of the booked trucks after successful booking
 */
const BookingSummaryModal = ({
  isOpen,
  onClose,
  bookingDetails,
  trucks,
  routeDetails,
  estimatedCost,
}) => {
  if (!isOpen) return null;

  const handleBackdropClick = (e) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  return (
    <div
      className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
      onClick={handleBackdropClick}
    >
      <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full max-h-[90vh] overflow-hidden animate-in fade-in zoom-in duration-300">
        {/* Header */}
        <div className="bg-gradient-to-r from-emerald-500 to-green-600 p-6 text-white relative">
          <button
            onClick={onClose}
            className="absolute top-4 right-4 text-white/80 hover:text-white transition-colors p-1"
          >
            <FaTimes size={20} />
          </button>
          <div className="flex items-center gap-4">
            <div className="bg-white/20 rounded-full p-4">
              <FaCheckCircle size={32} />
            </div>
            <div>
              <h2 className="text-2xl font-bold">Booking Confirmed!</h2>
              <p className="text-white/80 text-sm mt-1">
                Your truck rental has been successfully booked
              </p>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto max-h-[60vh]">
          {/* Booked Trucks Section */}
          <div className="mb-6">
            <h3 className="text-sm font-bold text-gray-500 uppercase tracking-wider mb-3 flex items-center gap-2">
              <FaTruck className="text-blue-600" /> Booked Trucks (
              {trucks?.length || 0})
            </h3>
            <div className="space-y-2">
              {trucks?.map((truck, index) => (
                <div
                  key={truck.TruckID || index}
                  className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl p-4 border border-blue-100"
                >
                  <div className="flex justify-between items-start">
                    <div>
                      <p className="font-bold text-gray-800">
                        {truck.PlateNumber || truck.TruckID}
                      </p>
                      <p className="text-sm text-gray-500">
                        {truck.TruckType || "Standard Truck"}
                      </p>
                    </div>
                    <div className="bg-blue-600 text-white px-3 py-1 rounded-full text-xs font-bold">
                      {truck.TruckCapacity || "N/A"} tons
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Delivery Details Section */}
          <div className="mb-6">
            <h3 className="text-sm font-bold text-gray-500 uppercase tracking-wider mb-3">
              Delivery Details
            </h3>
            <div className="bg-gray-50 rounded-xl p-4 border border-gray-200 space-y-3">
              {/* Pickup Location */}
              <div className="flex items-start gap-3">
                <div className="bg-emerald-100 rounded-full p-2 mt-0.5">
                  <FaMapMarkerAlt className="text-emerald-600" size={14} />
                </div>
                <div>
                  <p className="text-xs font-bold text-gray-500 uppercase">
                    Pickup
                  </p>
                  <p className="text-sm text-gray-800 font-medium">
                    {bookingDetails?.pickupLocation || "Not specified"}
                  </p>
                </div>
              </div>

              {/* Drop-off Location */}
              <div className="flex items-start gap-3">
                <div className="bg-red-100 rounded-full p-2 mt-0.5">
                  <FaMapMarkerAlt className="text-red-600" size={14} />
                </div>
                <div>
                  <p className="text-xs font-bold text-gray-500 uppercase">
                    Drop-off
                  </p>
                  <p className="text-sm text-gray-800 font-medium">
                    {bookingDetails?.dropoffLocation || "Not specified"}
                  </p>
                </div>
              </div>

              {/* Date & Time */}
              <div className="flex items-center gap-6 pt-2 border-t border-gray-200">
                <div className="flex items-center gap-2">
                  <FaCalendarAlt className="text-blue-600" size={14} />
                  <span className="text-sm text-gray-700 font-medium">
                    {bookingDetails?.deliveryDate || "Not set"}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <FaClock className="text-blue-600" size={14} />
                  <span className="text-sm text-gray-700 font-medium">
                    {bookingDetails?.deliveryTime || "Not set"}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Route & Cost Section */}
          {(routeDetails || estimatedCost) && (
            <div className="mb-6">
              <h3 className="text-sm font-bold text-gray-500 uppercase tracking-wider mb-3">
                Route & Cost
              </h3>
              <div className="grid grid-cols-2 gap-3">
                {routeDetails?.distanceText && (
                  <div className="bg-purple-50 rounded-xl p-4 border border-purple-100">
                    <div className="flex items-center gap-2 mb-1">
                      <FaRoute className="text-purple-600" size={14} />
                      <span className="text-xs font-bold text-purple-600 uppercase">
                        Distance
                      </span>
                    </div>
                    <p className="text-lg font-bold text-gray-800">
                      {routeDetails.distanceText}
                    </p>
                  </div>
                )}
                {routeDetails?.durationText && (
                  <div className="bg-orange-50 rounded-xl p-4 border border-orange-100">
                    <div className="flex items-center gap-2 mb-1">
                      <FaClock className="text-orange-600" size={14} />
                      <span className="text-xs font-bold text-orange-600 uppercase">
                        Travel Time
                      </span>
                    </div>
                    <p className="text-lg font-bold text-gray-800">
                      {routeDetails.durationText}
                    </p>
                  </div>
                )}
              </div>
              {estimatedCost && (
                <div className="mt-3 bg-gradient-to-r from-emerald-50 to-green-50 rounded-xl p-4 border border-emerald-200">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <FaMoneyBillWave className="text-emerald-600" size={18} />
                      <span className="text-sm font-bold text-gray-700">
                        Estimated Total
                      </span>
                    </div>
                    <span className="text-2xl font-extrabold text-emerald-600">
                      ₱{estimatedCost}
                    </span>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 bg-gray-50 border-t border-gray-200">
          <button
            onClick={onClose}
            className="w-full py-3 px-6 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-bold rounded-xl transition-all shadow-lg shadow-blue-500/20"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};

export default BookingSummaryModal;
