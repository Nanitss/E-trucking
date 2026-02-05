import React, { useState, useEffect, useContext } from "react";
import { AuthContext } from "../../context/AuthContext";
import { useModernToast } from "../../context/ModernToastContext";
import {
  FaMapMarkerAlt,
  FaPlus,
  FaEdit,
  FaTrash,
  FaBuilding,
  FaHome,
  FaStore,
  FaIndustry,
  FaStar,
  FaClock,
  FaSearch,
  FaMapPin,
  FaPhone,
  FaStickyNote,
  FaEye,
  FaCheck,
  FaTimes,
  FaFilter,
} from "react-icons/fa";
import enhancedIsolatedMapModal from "../../components/maps/EnhancedIsolatedMapModal";
import Loader from "../../components/common/Loader";
import { API_BASE_URL } from "../../config/api";
// CSS imports removed in favor of Tailwind

const PinnedLocations = () => {
  // Configure the base URL for API requests - using centralized config
  const API_BASE = API_BASE_URL;

  const { authUser } = useContext(AuthContext);
  const { showSuccess, showError } = useModernToast();

  // State management
  const [locations, setLocations] = useState([]);
  const [filteredLocations, setFilteredLocations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [selectedLocation, setSelectedLocation] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [sortBy, setSortBy] = useState("name");
  const [showFilters, setShowFilters] = useState(false);

  // Form state for add/edit modal
  const [formData, setFormData] = useState({
    name: "",
    address: "",
    coordinates: null,
    category: "business",
    notes: "",
    contactPerson: "",
    contactNumber: "",
    operatingHours: "",
    accessInstructions: "",
    isDefault: false,
  });

  // Location categories
  const categories = [
    {
      value: "business",
      label: "Business",
      icon: FaBuilding,
      color: "#3b82f6",
    },
    {
      value: "residential",
      label: "Residential",
      icon: FaHome,
      color: "#10b981",
    },
    {
      value: "commercial",
      label: "Commercial",
      icon: FaStore,
      color: "#f59e0b",
    },
    {
      value: "industrial",
      label: "Industrial",
      icon: FaIndustry,
      color: "#ef4444",
    },
  ];

  // Load pinned locations on component mount
  useEffect(() => {
    loadPinnedLocations();
  }, [authUser]);

  // Filter and sort locations when search/filter changes
  useEffect(() => {
    filterAndSortLocations();
  }, [locations, searchTerm, categoryFilter, sortBy]);

  const loadPinnedLocations = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem("token");
      const response = await fetch(
        `${API_BASE_URL}/api/client/pinned-locations`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        },
      );

      if (response.ok) {
        const data = await response.json();
        setLocations(data.locations || []);
      } else {
        throw new Error("Failed to load pinned locations");
      }
    } catch (error) {
      console.error("Error loading pinned locations:", error);
      showError(
        "Failed to load saved locations",
        "Unable to retrieve your saved locations. Please try again.",
      );
      setLocations([]);
    } finally {
      setLoading(false);
    }
  };

  const filterAndSortLocations = () => {
    let filtered = [...locations];

    // Apply search filter
    if (searchTerm) {
      filtered = filtered.filter(
        (location) =>
          location.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
          location.address.toLowerCase().includes(searchTerm.toLowerCase()) ||
          location.notes?.toLowerCase().includes(searchTerm.toLowerCase()),
      );
    }

    // Apply category filter
    if (categoryFilter !== "all") {
      filtered = filtered.filter(
        (location) => location.category === categoryFilter,
      );
    }

    // Apply sorting
    filtered.sort((a, b) => {
      switch (sortBy) {
        case "name":
          return a.name.localeCompare(b.name);
        case "category":
          return a.category.localeCompare(b.category);
        case "lastUsed":
          return new Date(b.lastUsed || 0) - new Date(a.lastUsed || 0);
        case "usageCount":
          return (b.usageCount || 0) - (a.usageCount || 0);
        default:
          return 0;
      }
    });

    setFilteredLocations(filtered);
  };

  const resetForm = () => {
    setFormData({
      name: "",
      address: "",
      coordinates: null,
      category: "business",
      notes: "",
      contactPerson: "",
      contactNumber: "",
      operatingHours: "",
      accessInstructions: "",
      isDefault: false,
    });
  };

  const openAddModal = () => {
    resetForm();
    setShowAddModal(true);
  };

  const openEditModal = (location) => {
    setSelectedLocation(location);
    setFormData({
      name: location.name || "",
      address: location.address || "",
      coordinates: location.coordinates || null,
      category: location.category || "business",
      notes: location.notes || "",
      contactPerson: location.contactPerson || "",
      contactNumber: location.contactNumber || "",
      operatingHours: location.operatingHours || "",
      accessInstructions: location.accessInstructions || "",
      isDefault: location.isDefault || false,
    });
    setShowEditModal(true);
  };

  const openDeleteModal = (location) => {
    setSelectedLocation(location);
    setShowDeleteModal(true);
  };

  const openMapPicker = () => {
    enhancedIsolatedMapModal.init({
      locationType: "location",
      initialAddress: formData.address,
      title: "Select Location",
      onSelectCallback: (address, coordinates) => {
        setFormData((prev) => ({
          ...prev,
          address,
          coordinates,
        }));
      },
    });
  };

  const handleSaveLocation = async () => {
    try {
      // Validation
      if (!formData.name.trim()) {
        showError("Validation Error", "Please enter a location name");
        return;
      }
      if (!formData.address.trim()) {
        showError("Validation Error", "Please enter or select an address");
        return;
      }

      const token = localStorage.getItem("token");
      const url = showEditModal
        ? `${API_BASE_URL}/api/client/pinned-locations/${selectedLocation.id}`
        : `${API_BASE_URL}/api/client/pinned-locations`;

      const method = showEditModal ? "PUT" : "POST";

      const response = await fetch(url, {
        method,
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(formData),
      });

      if (response.ok) {
        await response.json();
        showSuccess(
          showEditModal ? "Location Updated" : "Location Saved",
          showEditModal
            ? "Your location has been updated successfully!"
            : "Your location has been saved successfully!",
        );

        // Refresh locations
        await loadPinnedLocations();

        // Close modals
        setShowAddModal(false);
        setShowEditModal(false);
        resetForm();
      } else {
        throw new Error("Failed to save location");
      }
    } catch (error) {
      console.error("Error saving location:", error);
      showError("Save Failed", "Unable to save location. Please try again.");
    }
  };

  const handleDeleteLocation = async () => {
    try {
      const token = localStorage.getItem("token");
      const response = await fetch(
        `${API_BASE_URL}/api/client/pinned-locations/${selectedLocation.id}`,
        {
          method: "DELETE",
          headers: {
            Authorization: `Bearer ${token}`,
          },
        },
      );

      if (response.ok) {
        showSuccess(
          "Location Deleted",
          "Your location has been deleted successfully!",
        );
        await loadPinnedLocations();
        setShowDeleteModal(false);
        setSelectedLocation(null);
      } else {
        throw new Error("Failed to delete location");
      }
    } catch (error) {
      console.error("Error deleting location:", error);
      showError(
        "Delete Failed",
        "Unable to delete location. Please try again.",
      );
    }
  };

  const getCategoryIcon = (category) => {
    const cat = categories.find((c) => c.value === category);
    return cat ? cat.icon : FaMapMarkerAlt;
  };

  const getCategoryColor = (category) => {
    const cat = categories.find((c) => c.value === category);
    return cat ? cat.color : "#6b7280";
  };

  if (loading) {
    return <Loader message="Loading your saved locations..." />;
  }

  // Common button styles
  const btnBase =
    "flex items-center gap-2 px-6 py-3 rounded-lg font-semibold text-base transition-all duration-300 border shadow-sm hover:-translate-y-px";
  const btnPrimary = `${btnBase} bg-gradient-to-br from-primary-500 to-primary-700 text-white border-transparent hover:shadow-lg shadow-primary-500/30`;
  const btnSecondary = `${btnBase} bg-gray-50 text-gray-600 border-gray-200 hover:bg-gray-200 hover:border-gray-300`;
  const btnDanger = `${btnBase} bg-gradient-to-br from-danger-500 to-danger-600 text-white border-transparent hover:shadow-lg shadow-danger-500/30`;

  // Icon Button
  const actionBtn =
    "w-8 h-8 flex items-center justify-center rounded-md border-none cursor-pointer text-sm transition-all duration-200 text-white hover:scale-110 shadow-sm";

  // Form input styles
  const inputClass =
    "w-full px-4 py-3.5 border-2 border-gray-200 rounded-lg text-base bg-gray-50 transition-all duration-300 focus:outline-none focus:border-primary-500 focus:bg-white focus:shadow-[0_0_0_3px_rgba(59,130,246,0.1)]";
  const labelClass = "block font-semibold text-gray-700 text-sm mb-2";

  return (
    <div className="w-full h-full animate-fade-in block overflow-hidden">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-center mb-8 pb-4 border-b border-gray-200">
        <h1 className="flex items-center gap-3 text-3xl font-bold text-primary-500 m-0">
          <FaMapPin className="text-primary-300" />
          Pinned Locations
          <span className="bg-gradient-to-br from-primary-500 to-primary-700 text-white px-4 py-1 rounded-full text-sm font-semibold shadow-md ml-4">
            {locations.length} saved
          </span>
        </h1>
        <div className="flex gap-4 mt-4 md:mt-0">
          <button className={btnPrimary} onClick={openAddModal}>
            <FaPlus /> Add Location
          </button>
        </div>
      </div>

      {/* Modern Filter Bar - Popup Style */}
      <div className="bg-white p-4 rounded-xl border border-gray-100 shadow-sm mb-6 relative">
        <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
          {/* Search */}
          <div className="relative flex-1 max-w-lg w-full">
            <FaSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Search locations by name, address..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all text-sm"
            />
          </div>

          <div className="flex items-center gap-3 w-full md:w-auto">
            {/* Filter Toggle Button */}
            <button
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl border transition-all text-sm font-medium ${showFilters ? "bg-blue-50 border-blue-200 text-blue-700" : "bg-white border-gray-200 text-gray-600 hover:bg-gray-50"}`}
              onClick={() => setShowFilters(!showFilters)}
            >
              <FaFilter size={14} />
              Filters
              {(categoryFilter !== "all" || sortBy !== "name") && (
                <span className="bg-blue-600 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full ml-1">
                  {[categoryFilter !== "all", sortBy !== "name"].filter(Boolean).length}
                </span>
              )}
            </button>
          </div>
        </div>

        <div className="mt-3 text-gray-500 text-sm font-medium">
          Showing {filteredLocations.length} of {locations.length} locations
        </div>

        {/* Filter Popup */}
        {showFilters && (
          <div className="absolute top-full mt-2 right-4 z-50 bg-white rounded-xl shadow-xl border border-gray-100 w-[360px] max-w-[90vw] p-5 animate-in fade-in zoom-in-95 duration-200">
            <div className="flex justify-between items-center mb-4">
              <h4 className="font-bold text-gray-900 text-lg">Filter Options</h4>
              <button
                className="p-1 hover:bg-gray-100 rounded-lg text-gray-500 transition-colors"
                onClick={() => setShowFilters(false)}
              >
                <FaTimes size={16} />
              </button>
            </div>

            <div className="grid grid-cols-1 gap-4 mb-6">
              {/* Category Filter */}
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold text-gray-500 uppercase">Category</label>
                <select
                  value={categoryFilter}
                  onChange={(e) => setCategoryFilter(e.target.value)}
                  className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                >
                  <option value="all">All Categories</option>
                  {categories.map((cat) => (
                    <option key={cat.value} value={cat.value}>{cat.label}</option>
                  ))}
                </select>
              </div>

              {/* Sort By */}
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold text-gray-500 uppercase">Sort By</label>
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value)}
                  className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                >
                  <option value="name">Sort by Name</option>
                  <option value="category">Sort by Category</option>
                  <option value="lastUsed">Sort by Last Used</option>
                  <option value="usageCount">Sort by Usage</option>
                </select>
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-4 border-t border-gray-100">
              <button
                className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-50 rounded-lg transition-colors"
                onClick={() => {
                  setSearchTerm("");
                  setCategoryFilter("all");
                  setSortBy("name");
                  setShowFilters(false);
                }}
              >
                Reset
              </button>
              <button
                className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg shadow-sm shadow-blue-200 transition-colors"
                onClick={() => setShowFilters(false)}
              >
                Apply Filters
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Locations Table */}
      <div className="bg-white rounded-2xl p-8 w-full shadow-card border border-white/20">
        {filteredLocations.length === 0 ? (
          <div className="text-center py-16 px-8 text-gray-500">
            <FaMapMarkerAlt className="text-6xl text-gray-300 mb-6 mx-auto" />
            <h3 className="text-2xl font-semibold text-gray-600 mb-2">
              No saved locations
            </h3>
            <p className="text-base mb-8 max-w-lg mx-auto leading-relaxed">
              {searchTerm || categoryFilter !== "all"
                ? "No locations match your search criteria."
                : "Start by adding your frequently used pickup and dropoff locations."}
            </p>
            {!searchTerm && categoryFilter === "all" && (
              <button
                className={`${btnPrimary} mx-auto`}
                onClick={openAddModal}
              >
                <FaPlus /> Add Your First Location
              </button>
            )}
          </div>
        ) : (
          <div className="w-full overflow-x-auto overflow-y-auto max-h-[calc(100vh-350px)]">
            <table className="w-full border-separate border-spacing-0 min-w-[800px]">
              <thead>
                <tr className="bg-gradient-to-br from-gray-50 to-gray-200">
                  <th className="px-6 py-4 text-left font-semibold text-sm text-gray-600 uppercase tracking-wide border-b-2 border-gray-200 rounded-tl-xl whitespace-nowrap">
                    Name
                  </th>
                  <th className="px-6 py-4 text-left font-semibold text-sm text-gray-600 uppercase tracking-wide border-b-2 border-gray-200 whitespace-nowrap">
                    Category
                  </th>
                  <th className="px-6 py-4 text-left font-semibold text-sm text-gray-600 uppercase tracking-wide border-b-2 border-gray-200 whitespace-nowrap">
                    Address
                  </th>
                  <th className="px-6 py-4 text-left font-semibold text-sm text-gray-600 uppercase tracking-wide border-b-2 border-gray-200 whitespace-nowrap">
                    Contact
                  </th>
                  <th className="px-6 py-4 text-left font-semibold text-sm text-gray-600 uppercase tracking-wide border-b-2 border-gray-200 whitespace-nowrap">
                    Last Used
                  </th>
                  <th className="px-6 py-4 text-left font-semibold text-sm text-gray-600 uppercase tracking-wide border-b-2 border-gray-200 whitespace-nowrap">
                    Usage
                  </th>
                  <th className="px-6 py-4 text-left font-semibold text-sm text-gray-600 uppercase tracking-wide border-b-2 border-gray-200 rounded-tr-xl whitespace-nowrap">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody>
                {filteredLocations.map((location) => {
                  const CategoryIcon = getCategoryIcon(location.category);
                  return (
                    <tr
                      key={location.id}
                      className="bg-white transition-all duration-200 border-b border-gray-100 hover:bg-gray-50 hover:shadow-sm"
                    >
                      <td className="px-6 py-5 text-gray-800 text-sm align-middle first:rounded-bl-xl">
                        <div className="flex flex-col gap-2">
                          <span className="font-semibold text-base text-gray-800 flex items-center gap-2">
                            {location.name}
                            {location.isDefault && (
                              <FaStar
                                className="text-warning-500 text-sm"
                                title="Default location"
                              />
                            )}
                          </span>
                          {location.notes && (
                            <div className="flex items-center gap-2 text-xs text-gray-500 italic">
                              <FaStickyNote className="text-gray-400" />
                              <span>{location.notes}</span>
                            </div>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-5 text-gray-800 text-sm align-middle">
                        <div className="flex items-center gap-2 px-3 py-2 bg-blue-50/50 rounded-lg w-fit">
                          <CategoryIcon
                            style={{
                              color: getCategoryColor(location.category),
                            }}
                            className="text-base"
                          />
                          <span className="font-semibold text-xs">
                            {categories.find(
                              (c) => c.value === location.category,
                            )?.label || location.category}
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-5 text-gray-800 text-sm align-middle">
                        <div className="flex items-start gap-2 text-gray-600 max-w-[300px]">
                          <FaMapMarkerAlt className="text-gray-500 mt-1 shrink-0 text-sm" />
                          <span>{location.address}</span>
                        </div>
                      </td>
                      <td className="px-6 py-5 text-gray-800 text-sm align-middle">
                        {location.contactPerson ? (
                          <div className="flex flex-col gap-1">
                            <div className="font-medium text-gray-800">
                              {location.contactPerson}
                            </div>
                            {location.contactNumber && (
                              <div className="flex items-center gap-1.5 text-xs text-gray-500">
                                <FaPhone className="text-xs" />
                                {location.contactNumber}
                              </div>
                            )}
                          </div>
                        ) : (
                          <span className="text-gray-300 italic">-</span>
                        )}
                      </td>
                      <td className="px-6 py-5 text-gray-800 text-sm align-middle">
                        <div className="flex items-center gap-2 text-gray-500">
                          <FaClock className="text-gray-400 text-sm" />
                          <span>
                            {location.lastUsed
                              ? new Date(location.lastUsed).toLocaleDateString()
                              : "Never"}
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-5 text-gray-800 text-sm align-middle">
                        <div className="flex items-center gap-2 text-gray-500">
                          <FaEye className="text-gray-400 text-sm" />
                          <span>{location.usageCount || 0} times</span>
                        </div>
                      </td>
                      <td className="px-6 py-5 text-gray-800 text-sm align-middle last:rounded-br-xl">
                        <div className="flex gap-2 justify-end">
                          <button
                            className={`${actionBtn} bg-gradient-to-br from-warning-500 to-warning-600`}
                            onClick={() => openEditModal(location)}
                            title="Edit location"
                          >
                            <FaEdit />
                          </button>
                          <button
                            className={`${actionBtn} bg-gradient-to-br from-danger-500 to-danger-600`}
                            onClick={() => openDeleteModal(location)}
                            title="Delete location"
                          >
                            <FaTrash />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Add/Edit Location Modal */}
      {(showAddModal || showEditModal) && (
        <div
          className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[10000] p-4"
          onClick={() => {
            setShowAddModal(false);
            setShowEditModal(false);
            resetForm();
          }}
        >
          <div
            className="bg-white rounded-2xl w-full max-w-[700px] max-h-[90vh] overflow-hidden flex flex-col shadow-modal"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex justify-between items-center px-8 py-6 border-b border-gray-200 bg-gradient-to-br from-gray-50 to-gray-200">
              <h2 className="text-2xl font-bold text-gray-800 m-0">
                {showEditModal ? "Edit Location" : "Add New Location"}
              </h2>
              <button
                className="w-9 h-9 border-none bg-gray-100 rounded-lg cursor-pointer flex items-center justify-center text-gray-500 transition-all duration-300 hover:bg-gray-200 hover:text-gray-600"
                onClick={() => {
                  setShowAddModal(false);
                  setShowEditModal(false);
                  resetForm();
                }}
              >
                <FaTimes />
              </button>
            </div>

            <div className="p-8 flex-1 overflow-y-auto">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="col-span-1 md:col-span-2 flex flex-col gap-2">
                  <label className={labelClass}>Location Name *</label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) =>
                      setFormData((prev) => ({ ...prev, name: e.target.value }))
                    }
                    placeholder="e.g., Main Office, Home, Warehouse A"
                    className={inputClass}
                  />
                </div>

                <div className="col-span-1 md:col-span-2 flex flex-col gap-2">
                  <label className={labelClass}>Address *</label>
                  <div className="flex gap-2 flex-col md:flex-row">
                    <input
                      type="text"
                      className={`${inputClass} flex-1`}
                      value={formData.address}
                      onChange={(e) =>
                        setFormData((prev) => ({
                          ...prev,
                          address: e.target.value,
                        }))
                      }
                      placeholder="Enter address or click map to select"
                    />
                    <button
                      type="button"
                      className="px-4 py-3.5 bg-gradient-to-br from-primary-500 to-primary-700 text-white border-none rounded-lg cursor-pointer flex items-center gap-2 font-semibold transition-all duration-300 hover:-translate-y-px shadow-sm whitespace-nowrap justify-center"
                      onClick={openMapPicker}
                    >
                      <FaMapMarkerAlt /> Map
                    </button>
                  </div>
                </div>

                <div className="flex flex-col gap-2">
                  <label className={labelClass}>Category</label>
                  <select
                    value={formData.category}
                    onChange={(e) =>
                      setFormData((prev) => ({
                        ...prev,
                        category: e.target.value,
                      }))
                    }
                    className={inputClass}
                  >
                    {categories.map((cat) => (
                      <option key={cat.value} value={cat.value}>
                        {cat.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="flex flex-col gap-2">
                  <label className={labelClass}>Contact Person</label>
                  <input
                    type="text"
                    value={formData.contactPerson}
                    onChange={(e) =>
                      setFormData((prev) => ({
                        ...prev,
                        contactPerson: e.target.value,
                      }))
                    }
                    placeholder="Contact person name"
                    className={inputClass}
                  />
                </div>

                <div className="flex flex-col gap-2">
                  <label className={labelClass}>Contact Number</label>
                  <input
                    type="tel"
                    value={formData.contactNumber}
                    onChange={(e) =>
                      setFormData((prev) => ({
                        ...prev,
                        contactNumber: e.target.value,
                      }))
                    }
                    placeholder="+63 912 345 6789"
                    className={inputClass}
                  />
                </div>

                <div className="flex flex-col gap-2">
                  <label className={labelClass}>Operating Hours</label>
                  <input
                    type="text"
                    value={formData.operatingHours}
                    onChange={(e) =>
                      setFormData((prev) => ({
                        ...prev,
                        operatingHours: e.target.value,
                      }))
                    }
                    placeholder="e.g., 8AM-6PM Mon-Fri"
                    className={inputClass}
                  />
                </div>

                <div className="col-span-1 md:col-span-2 flex flex-col gap-2">
                  <label className={labelClass}>Notes</label>
                  <textarea
                    value={formData.notes}
                    onChange={(e) =>
                      setFormData((prev) => ({
                        ...prev,
                        notes: e.target.value,
                      }))
                    }
                    placeholder="Additional notes about this location..."
                    rows="3"
                    className={inputClass}
                  />
                </div>

                <div className="col-span-1 md:col-span-2 flex flex-col gap-2">
                  <label className={labelClass}>Access Instructions</label>
                  <textarea
                    value={formData.accessInstructions}
                    onChange={(e) =>
                      setFormData((prev) => ({
                        ...prev,
                        accessInstructions: e.target.value,
                      }))
                    }
                    placeholder="Special instructions for accessing this location..."
                    rows="2"
                    className={inputClass}
                  />
                </div>

                <div className="col-span-1 md:col-span-2 flex flex-col gap-2">
                  <label className="flex items-center gap-3 cursor-pointer font-medium text-gray-700">
                    <input
                      type="checkbox"
                      className="w-[18px] h-[18px] cursor-pointer accent-primary-500"
                      checked={formData.isDefault}
                      onChange={(e) =>
                        setFormData((prev) => ({
                          ...prev,
                          isDefault: e.target.checked,
                        }))
                      }
                    />
                    <span>Set as default location</span>
                  </label>
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-4 px-8 py-6 border-t border-gray-200 bg-gray-50">
              <button
                className={btnSecondary}
                onClick={() => {
                  setShowAddModal(false);
                  setShowEditModal(false);
                  resetForm();
                }}
              >
                Cancel
              </button>
              <button className={btnPrimary} onClick={handleSaveLocation}>
                <FaCheck />{" "}
                {showEditModal ? "Update Location" : "Save Location"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteModal && selectedLocation && (
        <div
          className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[10000] p-4"
          onClick={() => setShowDeleteModal(false)}
        >
          <div
            className="bg-white rounded-2xl w-full max-w-[400px] flex flex-col shadow-modal"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex justify-between items-center px-6 py-5 border-b border-gray-100 bg-gray-50 rounded-t-2xl">
              <h2 className="text-xl font-bold text-gray-800 m-0">
                Delete Location
              </h2>
              <button
                className="w-8 h-8 border-none bg-gray-200 rounded-full cursor-pointer flex items-center justify-center text-gray-500 hover:bg-gray-300"
                onClick={() => setShowDeleteModal(false)}
              >
                <FaTimes />
              </button>
            </div>

            <div className="p-6">
              <p className="text-base text-gray-600 mb-2">
                Are you sure you want to delete{" "}
                <strong>{selectedLocation.name}</strong>?
              </p>
              <p className="text-danger-600 text-sm italic m-0">
                This action cannot be undone.
              </p>
            </div>

            <div className="flex justify-end gap-3 px-6 py-5 bg-gray-50 rounded-b-2xl">
              <button
                className={btnSecondary}
                onClick={() => setShowDeleteModal(false)}
              >
                Cancel
              </button>
              <button className={btnDanger} onClick={handleDeleteLocation}>
                <FaTrash /> Delete Location
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PinnedLocations;
