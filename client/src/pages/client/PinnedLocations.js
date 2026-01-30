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
  FaFilter,
  FaMapPin,
  FaPhone,
  FaStickyNote,
  FaEye,
  FaCheck,
  FaTimes,
} from "react-icons/fa";
import enhancedIsolatedMapModal from "../../components/maps/EnhancedIsolatedMapModal";
import Loader from "../../components/common/Loader";
import "./PinnedLocations.css";
import "../../styles/ClientPage.css"; // Import standard styles

const PinnedLocations = () => {
  const { authUser } = useContext(AuthContext);
  const { showSuccess, showError, showWarning, showInfo } = useModernToast();

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
        "http://localhost:5007/api/client/pinned-locations",
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
        ? `http://localhost:5007/api/client/pinned-locations/${selectedLocation.id}`
        : "http://localhost:5007/api/client/pinned-locations";

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
        const result = await response.json();
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
        `http://localhost:5007/api/client/pinned-locations/${selectedLocation.id}`,
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

  return (
    <div className="client-page-container">
      {/* Header */}
      <div className="client-page-header">
        <h1>
          <FaMapPin className="header-icon" />
          Pinned Locations
          <span
            className="location-count"
            style={{
              fontSize: "1rem",
              marginLeft: "1rem",
              color: "var(--secondary-color)",
              fontWeight: "normal",
            }}
          >
            {locations.length} saved
          </span>
        </h1>
        <div className="header-actions">
          <button className="btn btn-primary" onClick={openAddModal}>
            <FaPlus /> Add Location
          </button>
        </div>
      </div>

      {/* Search and Filter Bar */}
      <div className="search-filter-bar" style={{ marginBottom: "1.5rem" }}>
        <div className="search-box">
          <FaSearch className="search-icon" />
          <input
            type="text"
            placeholder="Search locations..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        <div className="filter-controls">
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="category-filter"
          >
            <option value="all">All Categories</option>
            {categories.map((cat) => (
              <option key={cat.value} value={cat.value}>
                {cat.label}
              </option>
            ))}
          </select>

          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
            className="sort-filter"
          >
            <option value="name">Sort by Name</option>
            <option value="category">Sort by Category</option>
            <option value="lastUsed">Sort by Last Used</option>
            <option value="usageCount">Sort by Usage</option>
          </select>
        </div>
      </div>

      {/* Locations Table */}
      <div className="locations-container">
        {filteredLocations.length === 0 ? (
          <div className="empty-state">
            <FaMapMarkerAlt className="empty-icon" />
            <h3>No saved locations</h3>
            <p>
              {searchTerm || categoryFilter !== "all"
                ? "No locations match your search criteria."
                : "Start by adding your frequently used pickup and dropoff locations."}
            </p>
            {!searchTerm && categoryFilter === "all" && (
              <button className="btn-primary" onClick={openAddModal}>
                <FaPlus /> Add Your First Location
              </button>
            )}
          </div>
        ) : (
          <div className="locations-table-wrapper">
            <table className="locations-table">
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Category</th>
                  <th>Address</th>
                  <th>Contact</th>
                  <th>Last Used</th>
                  <th>Usage</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredLocations.map((location) => {
                  const CategoryIcon = getCategoryIcon(location.category);
                  return (
                    <tr key={location.id} className="location-row">
                      <td>
                        <div className="location-name-cell">
                          <span className="location-name">{location.name}</span>
                          {location.isDefault && (
                            <FaStar
                              className="default-star"
                              title="Default location"
                            />
                          )}
                          {location.notes && (
                            <div className="location-notes-preview">
                              <FaStickyNote className="notes-icon" />
                              <span>{location.notes}</span>
                            </div>
                          )}
                        </div>
                      </td>
                      <td>
                        <div className="category-cell">
                          <CategoryIcon
                            style={{
                              color: getCategoryColor(location.category),
                            }}
                            className="category-icon"
                          />
                          <span className="category-label">
                            {categories.find(
                              (c) => c.value === location.category,
                            )?.label || location.category}
                          </span>
                        </div>
                      </td>
                      <td>
                        <div className="address-cell">
                          <FaMapMarkerAlt className="address-icon" />
                          <span>{location.address}</span>
                        </div>
                      </td>
                      <td>
                        {location.contactPerson ? (
                          <div className="contact-cell">
                            <div className="contact-person">
                              {location.contactPerson}
                            </div>
                            {location.contactNumber && (
                              <div className="contact-number">
                                <FaPhone className="phone-icon" />
                                {location.contactNumber}
                              </div>
                            )}
                          </div>
                        ) : (
                          <span className="no-data">-</span>
                        )}
                      </td>
                      <td>
                        <div className="date-cell">
                          <FaClock className="clock-icon" />
                          <span>
                            {location.lastUsed
                              ? new Date(location.lastUsed).toLocaleDateString()
                              : "Never"}
                          </span>
                        </div>
                      </td>
                      <td>
                        <div className="usage-cell">
                          <FaEye className="usage-icon" />
                          <span>{location.usageCount || 0} times</span>
                        </div>
                      </td>
                      <td>
                        <div className="actions-cell">
                          <button
                            className="action-btn edit-btn"
                            onClick={() => openEditModal(location)}
                            title="Edit location"
                          >
                            <FaEdit />
                          </button>
                          <button
                            className="action-btn delete-btn"
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
          className="modal-overlay"
          onClick={() => {
            setShowAddModal(false);
            setShowEditModal(false);
            resetForm();
          }}
        >
          <div
            className="modal-content location-modal"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="modal-header">
              <h2>{showEditModal ? "Edit Location" : "Add New Location"}</h2>
              <button
                className="modal-close"
                onClick={() => {
                  setShowAddModal(false);
                  setShowEditModal(false);
                  resetForm();
                }}
              >
                <FaTimes />
              </button>
            </div>

            <div className="modal-body">
              <div className="form-grid">
                <div className="form-group full-width">
                  <label>Location Name *</label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) =>
                      setFormData((prev) => ({ ...prev, name: e.target.value }))
                    }
                    placeholder="e.g., Main Office, Home, Warehouse A"
                  />
                </div>

                <div className="form-group full-width">
                  <label>Address *</label>
                  <div className="address-input-group">
                    <input
                      type="text"
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
                      className="map-picker-btn"
                      onClick={openMapPicker}
                    >
                      <FaMapMarkerAlt /> Map
                    </button>
                  </div>
                </div>

                <div className="form-group">
                  <label>Category</label>
                  <select
                    value={formData.category}
                    onChange={(e) =>
                      setFormData((prev) => ({
                        ...prev,
                        category: e.target.value,
                      }))
                    }
                  >
                    {categories.map((cat) => (
                      <option key={cat.value} value={cat.value}>
                        {cat.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="form-group">
                  <label>Contact Person</label>
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
                  />
                </div>

                <div className="form-group">
                  <label>Contact Number</label>
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
                  />
                </div>

                <div className="form-group">
                  <label>Operating Hours</label>
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
                  />
                </div>

                <div className="form-group full-width">
                  <label>Notes</label>
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
                  />
                </div>

                <div className="form-group full-width">
                  <label>Access Instructions</label>
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
                  />
                </div>

                <div className="form-group full-width">
                  <label className="checkbox-label">
                    <input
                      type="checkbox"
                      checked={formData.isDefault}
                      onChange={(e) =>
                        setFormData((prev) => ({
                          ...prev,
                          isDefault: e.target.checked,
                        }))
                      }
                    />
                    <span className="checkbox-text">
                      Set as default location
                    </span>
                  </label>
                </div>
              </div>
            </div>

            <div className="modal-footer">
              <button
                className="btn-secondary"
                onClick={() => {
                  setShowAddModal(false);
                  setShowEditModal(false);
                  resetForm();
                }}
              >
                Cancel
              </button>
              <button className="btn-primary" onClick={handleSaveLocation}>
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
          className="modal-overlay"
          onClick={() => setShowDeleteModal(false)}
        >
          <div
            className="modal-content delete-modal"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="modal-header">
              <h2>Delete Location</h2>
              <button
                className="modal-close"
                onClick={() => setShowDeleteModal(false)}
              >
                <FaTimes />
              </button>
            </div>

            <div className="modal-body">
              <p>
                Are you sure you want to delete{" "}
                <strong>{selectedLocation.name}</strong>?
              </p>
              <p className="delete-warning">This action cannot be undone.</p>
            </div>

            <div className="modal-footer">
              <button
                className="btn-secondary"
                onClick={() => setShowDeleteModal(false)}
              >
                Cancel
              </button>
              <button className="btn-danger" onClick={handleDeleteLocation}>
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
