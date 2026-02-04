import React, { useState, useEffect, useContext } from "react";
import { useParams, useHistory } from "react-router-dom";
import axios from "axios";
// Using ProtectedRoute with header navigation
import { AlertContext } from "../../../context/AlertContext";
import AdminHeader from "../../../components/common/AdminHeader";
import { TbChevronLeft, TbDeviceFloppy } from "react-icons/tb";
import { API_BASE_URL } from "../../../config/api";

const DeliveryForm = ({ currentUser }) => {
  const { id } = useParams();
  const history = useHistory();
  const { showAlert } = useContext(AlertContext);
  const isEditMode = Boolean(id);
  const baseURL = API_BASE_URL;

  const [formData, setFormData] = useState({
    deliveryDate: new Date().toISOString().split("T")[0],
    deliveryStatus: "pending",
    deliveryAddress: "",
    deliveryDistance: "",
    deliveryRate: "",
    clientId: "",
    truckId: "",
    driverId: "",
    helperId: "",
    notes: "",
  });

  const [loading, setLoading] = useState(isEditMode);
  const [clients, setClients] = useState([]);
  const [trucks, setTrucks] = useState([]);
  const [drivers, setDrivers] = useState([]);
  const [helpers, setHelpers] = useState([]);
  const [error, setError] = useState(null);

  // Fetch delivery data if in edit mode
  useEffect(() => {
    const fetchData = async () => {
      if (isEditMode) {
        try {
          setLoading(true);
          const response = await axios.get(`${baseURL}/api/deliveries/${id}`);

          // Format date to YYYY-MM-DD for the date input
          const delivery = response.data;
          if (delivery.deliveryDate) {
            delivery.deliveryDate = new Date(delivery.deliveryDate)
              .toISOString()
              .split("T")[0];
          }

          setFormData({
            deliveryDate:
              delivery.deliveryDate || new Date().toISOString().split("T")[0],
            deliveryStatus: delivery.deliveryStatus || "pending",
            deliveryAddress: delivery.deliveryAddress || "",
            deliveryDistance: delivery.deliveryDistance || "",
            deliveryRate: delivery.deliveryRate || "",
            clientId: delivery.clientId || "",
            truckId: delivery.truckId || "",
            driverId: delivery.driverId || "",
            helperId: delivery.helperId || "",
            notes: delivery.notes || "",
          });

          setLoading(false);
        } catch (err) {
          setError("Error loading delivery data");
          console.error("Error fetching delivery:", err);
          setLoading(false);
        }
      }
    };

    fetchData();
  }, [id, isEditMode, baseURL]);

  // Fetch clients, trucks, drivers, and helpers
  useEffect(() => {
    const fetchReferenceData = async () => {
      try {
        // Fetch clients
        const clientsResponse = await axios.get(`${baseURL}/api/clients`);
        setClients(clientsResponse.data);

        // Fetch available trucks
        const trucksResponse = await axios.get(`${baseURL}/api/trucks`);
        setTrucks(trucksResponse.data);

        // Fetch drivers
        const driversResponse = await axios.get(`${baseURL}/api/drivers`);
        setDrivers(driversResponse.data);

        // Fetch helpers
        const helpersResponse = await axios.get(`${baseURL}/api/helpers`);
        setHelpers(helpersResponse.data);
      } catch (err) {
        setError("Error loading reference data");
        console.error("Error fetching reference data:", err);
      }
    };

    fetchReferenceData();
  }, [baseURL]);

  // Handle input changes
  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData({
      ...formData,
      [name]: value,
    });
  };

  // Handle form submission
  const handleSubmit = async (e) => {
    e.preventDefault();

    try {
      if (isEditMode) {
        // Update existing delivery
        await axios.put(`${baseURL}/api/deliveries/${id}`, formData);
        showAlert("Delivery updated successfully", "success");
      } else {
        // Create new delivery
        await axios.post(`${baseURL}/api/deliveries`, formData);
        showAlert("Delivery created successfully", "success");
      }

      // Redirect back to delivery list
      history.push("/admin/deliveries");
    } catch (err) {
      setError("Error saving delivery");
      console.error("Error saving delivery:", err);
      showAlert("Error saving delivery", "danger");
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="flex flex-col items-center gap-2">
          <div className="w-10 h-10 border-4 border-gray-200 border-t-blue-600 rounded-full animate-spin"></div>
          <p className="text-gray-500 font-medium">Loading delivery data...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <AdminHeader currentUser={currentUser} />

      <div className="flex-1 p-6 lg:p-8 max-w-4xl mx-auto w-full">
        <div className="flex items-center gap-4 mb-8">
          <button
            onClick={() => history.push("/admin/deliveries")}
            className="p-2 rounded-lg hover:bg-white hover:shadow-sm text-gray-500 hover:text-gray-900 transition-all border border-transparent hover:border-gray-200"
          >
            <TbChevronLeft size={20} />
          </button>
          <div>
            <h2 className="text-2xl font-bold text-gray-900">
              {isEditMode ? "Edit Delivery" : "New Delivery"}
            </h2>
            <p className="text-sm text-gray-500">
              Fill in the details below to{" "}
              {isEditMode ? "update the" : "create a new"} shipment.
            </p>
          </div>
        </div>

        {error && (
          <div className="mb-6 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl flex items-center gap-2">
            <span className="font-bold">Error:</span> {error}
          </div>
        )}

        <form
          onSubmit={handleSubmit}
          className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 lg:p-8"
        >
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
            {/* Section: Client & Date */}
            <div className="md:col-span-2">
              <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wider mb-4 border-b border-gray-100 pb-2">
                Basic Information
              </h3>
            </div>

            <div className="space-y-2">
              <label
                htmlFor="clientId"
                className="block text-sm font-medium text-gray-700"
              >
                Client <span className="text-red-500">*</span>
              </label>
              <select
                id="clientId"
                name="clientId"
                value={formData.clientId}
                onChange={handleChange}
                required
                className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 focus:bg-white transition-all text-sm"
              >
                <option value="">Select Client</option>
                {clients.map((client) => (
                  <option key={client.ClientID} value={client.ClientID}>
                    {client.ClientName}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-2">
              <label
                htmlFor="deliveryDate"
                className="block text-sm font-medium text-gray-700"
              >
                Delivery Date <span className="text-red-500">*</span>
              </label>
              <input
                type="date"
                id="deliveryDate"
                name="deliveryDate"
                value={formData.deliveryDate}
                onChange={handleChange}
                required
                className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 focus:bg-white transition-all text-sm"
              />
            </div>

            {/* Section: Assignment */}
            <div className="md:col-span-2 mt-2">
              <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wider mb-4 border-b border-gray-100 pb-2">
                Resource Assignment
              </h3>
            </div>

            <div className="space-y-2">
              <label
                htmlFor="truckId"
                className="block text-sm font-medium text-gray-700"
              >
                Truck <span className="text-red-500">*</span>
              </label>
              <select
                id="truckId"
                name="truckId"
                value={formData.truckId}
                onChange={handleChange}
                required
                className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 focus:bg-white transition-all text-sm"
              >
                <option value="">Select Truck</option>
                {trucks.map((truck) => (
                  <option
                    key={truck.TruckID || truck.id}
                    value={truck.TruckID || truck.id}
                  >
                    {truck.TruckPlate} - {truck.TruckType}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-2">
              <label
                htmlFor="driverId"
                className="block text-sm font-medium text-gray-700"
              >
                Driver <span className="text-red-500">*</span>
              </label>
              <select
                id="driverId"
                name="driverId"
                value={formData.driverId}
                onChange={handleChange}
                required
                className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 focus:bg-white transition-all text-sm"
              >
                <option value="">Select Driver</option>
                {drivers.map((driver) => (
                  <option
                    key={driver.DriverID || driver.id}
                    value={driver.DriverID || driver.id}
                  >
                    {driver.DriverName}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-2">
              <label
                htmlFor="helperId"
                className="block text-sm font-medium text-gray-700"
              >
                Helper (Optional)
              </label>
              <select
                id="helperId"
                name="helperId"
                value={formData.helperId}
                onChange={handleChange}
                className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 focus:bg-white transition-all text-sm"
              >
                <option value="">Select Helper</option>
                {helpers.map((helper) => (
                  <option
                    key={helper.HelperID || helper.id}
                    value={helper.HelperID || helper.id}
                  >
                    {helper.HelperName}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-2">
              <label
                htmlFor="deliveryStatus"
                className="block text-sm font-medium text-gray-700"
              >
                Status <span className="text-red-500">*</span>
              </label>
              <select
                id="deliveryStatus"
                name="deliveryStatus"
                value={formData.deliveryStatus}
                onChange={handleChange}
                required
                className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 focus:bg-white transition-all text-sm"
              >
                <option value="pending">Pending</option>
                <option value="accepted">Accepted</option>
                <option value="in-progress">In Progress</option>
                <option value="delivered">Delivered</option>
                <option value="completed">Completed</option>
                <option value="cancelled">Cancelled</option>
              </select>
            </div>

            {/* Section: Delivery Details */}
            <div className="md:col-span-2 mt-2">
              <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wider mb-4 border-b border-gray-100 pb-2">
                Delivery Details
              </h3>
            </div>

            <div className="md:col-span-2 space-y-2">
              <label
                htmlFor="deliveryAddress"
                className="block text-sm font-medium text-gray-700"
              >
                Delivery Address <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                id="deliveryAddress"
                name="deliveryAddress"
                value={formData.deliveryAddress}
                onChange={handleChange}
                required
                placeholder="Enter full delivery address"
                className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 focus:bg-white transition-all text-sm"
              />
            </div>

            <div className="space-y-2">
              <label
                htmlFor="deliveryDistance"
                className="block text-sm font-medium text-gray-700"
              >
                Distance (km) <span className="text-red-500">*</span>
              </label>
              <input
                type="number"
                id="deliveryDistance"
                name="deliveryDistance"
                value={formData.deliveryDistance}
                onChange={handleChange}
                required
                min="0"
                step="0.1"
                className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 focus:bg-white transition-all text-sm"
              />
            </div>

            <div className="space-y-2">
              <label
                htmlFor="deliveryRate"
                className="block text-sm font-medium text-gray-700"
              >
                Rate (₱) <span className="text-red-500">*</span>
              </label>
              <input
                type="number"
                id="deliveryRate"
                name="deliveryRate"
                value={formData.deliveryRate}
                onChange={handleChange}
                required
                min="0"
                step="0.01"
                className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 focus:bg-white transition-all text-sm"
              />
            </div>

            <div className="md:col-span-2 space-y-2">
              <label
                htmlFor="notes"
                className="block text-sm font-medium text-gray-700"
              >
                Notes (Optional)
              </label>
              <textarea
                id="notes"
                name="notes"
                value={formData.notes}
                onChange={handleChange}
                rows="3"
                placeholder="Any additional instructions or notes..."
                className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 focus:bg-white transition-all text-sm resize-none"
              ></textarea>
            </div>
          </div>

          <div className="flex items-center justify-end gap-3 pt-6 border-t border-gray-100">
            <button
              type="button"
              onClick={() => history.push("/admin/deliveries")}
              className="px-6 py-2.5 text-sm font-medium text-gray-600 bg-white border border-gray-200 rounded-xl hover:bg-gray-50 transition-all shadow-sm"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="flex items-center gap-2 px-6 py-2.5 text-sm font-bold text-white bg-gradient-to-r from-blue-600 to-blue-700 rounded-xl hover:from-blue-700 hover:to-blue-800 transition-all shadow-md hover:shadow-blue-500/20"
            >
              <TbDeviceFloppy size={18} />
              {isEditMode ? "Update Delivery" : "Create Delivery"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default DeliveryForm;
