import React, { useState, useEffect } from "react";
import axios from "axios";
import { Link, useHistory } from "react-router-dom";
import {
  FaSearch,
  FaFilter,
  FaEye,
  FaTruck,
  FaCalendarAlt,
  FaMapMarkerAlt,
  FaMoneyBillWave,
  FaBox,
} from "react-icons/fa";
import Loader from "../../components/common/Loader";
import StatusBadge from "../../components/common/StatusBadge";

const DeliveriesList = () => {
  const history = useHistory();
  const [deliveries, setDeliveries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  useEffect(() => {
    fetchDeliveries();
  }, []);

  const fetchDeliveries = async () => {
    try {
      const token = localStorage.getItem("token");
      if (!token) {
        history.push("/login");
        return;
      }

      axios.defaults.headers.common["Authorization"] = `Bearer ${token}`;
      const response = await axios.get("/api/clients/deliveries");
      setDeliveries(response.data);
      setLoading(false);
    } catch (error) {
      console.error("Error fetching deliveries:", error);
      setLoading(false);
    }
  };

  const handleSearchChange = (event) => {
    setSearchTerm(event.target.value);
  };

  const handleStatusFilterChange = (event) => {
    setStatusFilter(event.target.value);
  };

  const filteredDeliveries = deliveries.filter((delivery) => {
    const matchesSearch =
      delivery.DeliveryID?.toString().includes(searchTerm) ||
      delivery.PickupLocation?.toLowerCase().includes(
        searchTerm.toLowerCase(),
      ) ||
      delivery.DeliveryAddress?.toLowerCase().includes(
        searchTerm.toLowerCase(),
      );
    const matchesStatus =
      statusFilter === "all" || delivery.DeliveryStatus === statusFilter;

    return matchesSearch && matchesStatus;
  });

  const formatDate = (dateString) => {
    if (!dateString) return "N/A";
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat("en-PH", {
      style: "currency",
      currency: "PHP",
    }).format(amount);
  };

  if (loading) {
    return <Loader />;
  }

  return (
    <div className="w-full max-w-[1400px] mx-auto p-4 md:p-8 bg-slate-50 min-h-screen">
      {/* Header Section */}
      <div className="flex flex-col md:flex-row justify-between items-center mb-8 pb-4 border-b border-gray-200 gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-800 flex items-center gap-3">
            <FaTruck className="text-blue-600" /> My Deliveries
          </h1>
          <p className="text-gray-500 mt-1">
            View and manage all your delivery requests
          </p>
        </div>
        <Link
          to="/client/profile"
          className="px-6 py-2 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white rounded-lg font-bold shadow-md shadow-blue-500/20 transition-all hover:-translate-y-0.5"
        >
          Book New Delivery
        </Link>
      </div>

      {/* Filters Section */}
      <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 mb-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {/* Search Input */}
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <FaSearch className="text-gray-400" />
            </div>
            <input
              type="text"
              placeholder="Search by ID or Location..."
              value={searchTerm}
              onChange={handleSearchChange}
              className="w-full pl-10 pr-4 py-3 rounded-xl border border-gray-200 focus:border-blue-500 focus:ring-4 focus:ring-blue-100 outline-none transition-all"
            />
          </div>

          {/* Status Filter */}
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <FaFilter className="text-gray-400" />
            </div>
            <select
              value={statusFilter}
              onChange={handleStatusFilterChange}
              className="w-full pl-10 pr-4 py-3 rounded-xl border border-gray-200 focus:border-blue-500 focus:ring-4 focus:ring-blue-100 outline-none transition-all appearance-none bg-white cursor-pointer"
            >
              <option value="all">All Statuses</option>
              <option value="pending">Pending</option>
              <option value="in-progress">In Progress</option>
              <option value="completed">Completed</option>
              <option value="cancelled">Cancelled</option>
            </select>
            <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none text-gray-400">
              <svg
                className="w-4 h-4"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d="M19 9l-7 7-7-7"
                />
              </svg>
            </div>
          </div>
        </div>
      </div>

      {/* Deliveries Table */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full border-collapse">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-100 text-left">
                <th className="p-4 pl-6 text-xs font-bold text-gray-500 uppercase tracking-wider">
                  ID
                </th>
                <th className="p-4 text-xs font-bold text-gray-500 uppercase tracking-wider">
                  Date
                </th>
                <th className="p-4 text-xs font-bold text-gray-500 uppercase tracking-wider">
                  Locations
                </th>
                <th className="p-4 text-xs font-bold text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="p-4 text-xs font-bold text-gray-500 uppercase tracking-wider">
                  Truck
                </th>
                <th className="p-4 text-xs font-bold text-gray-500 uppercase tracking-wider">
                  Price
                </th>
                <th className="p-4 text-center text-xs font-bold text-gray-500 uppercase tracking-wider">
                  Action
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filteredDeliveries.map((delivery) => (
                <tr
                  key={delivery.DeliveryID}
                  className="hover:bg-blue-50/30 transition-colors group"
                >
                  <td className="p-4 pl-6 whitespace-nowrap">
                    <span className="font-mono text-xs font-bold text-blue-600 bg-blue-50 px-2 py-1 rounded border border-blue-100">
                      #{delivery.DeliveryID}
                    </span>
                  </td>
                  <td className="p-4 whitespace-nowrap">
                    <div className="flex items-center gap-2 text-gray-600">
                      <FaCalendarAlt className="text-gray-400" />
                      <span className="text-sm font-medium">
                        {formatDate(delivery.DeliveryDate)}
                      </span>
                    </div>
                  </td>
                  <td className="p-4 min-w-[250px]">
                    <div className="flex flex-col gap-1">
                      <div className="flex items-center gap-2 text-sm text-gray-700">
                        <FaMapMarkerAlt className="text-blue-500 flex-shrink-0" />
                        <span
                          className="truncate max-w-[200px]"
                          title={delivery.PickupLocation}
                        >
                          {delivery.PickupLocation}
                        </span>
                      </div>
                      <div className="ml-1 border-l-2 border-gray-200 pl-3 py-0.5 text-xs text-gray-400">
                        to
                      </div>
                      <div className="flex items-center gap-2 text-sm text-gray-700">
                        <FaMapMarkerAlt className="text-amber-500 flex-shrink-0" />
                        <span
                          className="truncate max-w-[200px]"
                          title={delivery.DeliveryAddress}
                        >
                          {delivery.DeliveryAddress}
                        </span>
                      </div>
                    </div>
                  </td>
                  <td className="p-4 whitespace-nowrap">
                    <StatusBadge status={delivery.DeliveryStatus} />
                  </td>
                  <td className="p-4 whitespace-nowrap">
                    <div className="flex items-center gap-2 text-gray-600">
                      <FaTruck className="text-gray-400" />
                      <span className="text-sm">
                        {delivery.TruckPlate || "N/A"}
                      </span>
                    </div>
                  </td>
                  <td className="p-4 whitespace-nowrap">
                    <div className="flex items-center gap-2 text-gray-600">
                      <FaMoneyBillWave className="text-emerald-500" />
                      <span className="text-sm font-bold text-emerald-700">
                        {delivery.Price
                          ? formatCurrency(delivery.Price)
                          : "N/A"}
                      </span>
                    </div>
                  </td>
                  <td className="p-4 pr-6 text-center whitespace-nowrap">
                    <button
                      onClick={() =>
                        history.push(
                          `/client/deliveries/${delivery.DeliveryID}`,
                        )
                      }
                      className="inline-flex items-center justify-center w-8 h-8 rounded-lg bg-gray-100 text-gray-500 hover:bg-blue-100 hover:text-blue-600 border border-transparent hover:border-blue-200 transition-all"
                      title="View Details"
                    >
                      <FaEye />
                    </button>
                  </td>
                </tr>
              ))}
              {filteredDeliveries.length === 0 && (
                <tr>
                  <td colSpan="7" className="p-12 text-center text-gray-500">
                    <div className="flex flex-col items-center justify-center">
                      <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-4">
                        <FaBox className="text-2xl text-gray-300" />
                      </div>
                      <h3 className="text-lg font-bold text-gray-700 mb-1">
                        No deliveries found
                      </h3>
                      <p className="text-sm text-gray-400">
                        Try adjusting your search or filters
                      </p>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <div className="px-6 py-4 border-t border-gray-100 bg-gray-50 flex items-center justify-between">
          <span className="text-xs font-medium text-gray-500">
            Showing {filteredDeliveries.length} of {deliveries.length}{" "}
            deliveries
          </span>
        </div>
      </div>
    </div>
  );
};

export default DeliveriesList;
