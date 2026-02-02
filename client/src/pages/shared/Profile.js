import React, { useState, useContext, useEffect } from "react";
import axios from "axios";
import { AuthContext } from "../../context/AuthContext";
import { AlertContext } from "../../context/AlertContext";
import Loader from "../../components/common/Loader";

const Profile = () => {
  const { authUser } = useContext(AuthContext);
  const { showAlert } = useContext(AlertContext);
  const [userDetails, setUserDetails] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [formData, setFormData] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    fetchUserDetails();
  }, []);

  const fetchUserDetails = async () => {
    try {
      // Get appropriate endpoint based on user role
      let endpoint;
      switch (authUser.role) {
        case "admin":
          endpoint = "/api/users/admin";
          break;
        case "staff":
          endpoint = "/api/staffs/profile";
          break;
        case "client":
          endpoint = "/api/clients/profile";
          break;
        case "driver":
          endpoint = "/api/drivers/profile";
          break;
        case "helper":
          endpoint = "/api/helpers/profile";
          break;
        case "operator":
          endpoint = "/api/operators/profile";
          break;
        default:
          endpoint = "/api/auth/me";
      }

      const res = await axios.get(endpoint);
      setUserDetails(res.data);
      setIsLoading(false);
    } catch (error) {
      console.error("Error fetching user details:", error);
      showAlert("Error loading profile information", "danger");
      setIsLoading(false);
    }
  };

  const onChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handlePasswordChange = async (e) => {
    e.preventDefault();

    const { currentPassword, newPassword, confirmPassword } = formData;

    // Validate passwords
    if (newPassword !== confirmPassword) {
      showAlert("New passwords do not match", "danger");
      return;
    }

    setIsSubmitting(true);

    try {
      await axios.put("/api/users/password", { currentPassword, newPassword });
      showAlert("Password updated successfully", "success");
      setFormData({
        currentPassword: "",
        newPassword: "",
        confirmPassword: "",
      });
    } catch (error) {
      console.error("Error updating password:", error);
      showAlert(
        error.response?.data?.message || "Error updating password",
        "danger",
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return <Loader />;
  }

  return (
    <div>
      <div className="card">
        <div className="card-header">
          <h2 className="card-title">Profile</h2>
        </div>
        <div className="card-body">
          <div className="profile-info">
            <h3>Account Information</h3>
            <div className="info-grid">
              <div className="info-row">
                <div className="info-label">Username:</div>
                <div className="info-value">{authUser.username}</div>
              </div>
              <div className="info-row">
                <div className="info-label">Role:</div>
                <div className="info-value">
                  {authUser.role.charAt(0).toUpperCase() +
                    authUser.role.slice(1)}
                </div>
              </div>

              {userDetails && (
                <>
                  {userDetails.name && (
                    <div className="info-row">
                      <div className="info-label">Name:</div>
                      <div className="info-value">{userDetails.name}</div>
                    </div>
                  )}

                  {userDetails.email && (
                    <div className="info-row">
                      <div className="info-label">Email:</div>
                      <div className="info-value">{userDetails.email}</div>
                    </div>
                  )}

                  {userDetails.phone && (
                    <div className="info-row">
                      <div className="info-label">Phone:</div>
                      <div className="info-value">{userDetails.phone}</div>
                    </div>
                  )}

                  {userDetails.address && (
                    <div className="info-row">
                      <div className="info-label">Address:</div>
                      <div className="info-value">{userDetails.address}</div>
                    </div>
                  )}

                  {userDetails.joinDate && (
                    <div className="info-row">
                      <div className="info-label">Join Date:</div>
                      <div className="info-value">
                        {new Date(userDetails.joinDate).toLocaleDateString()}
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>
          </div>

          <hr />

          <div className="profile-password">
            <h3>Change Password</h3>
            <form onSubmit={handlePasswordChange}>
              <div className="form-group">
                <label className="form-label" htmlFor="currentPassword">
                  Current Password
                </label>
                <input
                  type="password"
                  id="currentPassword"
                  name="currentPassword"
                  className="form-control"
                  value={formData.currentPassword}
                  onChange={onChange}
                  required
                />
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label className="form-label" htmlFor="newPassword">
                    New Password
                  </label>
                  <input
                    type="password"
                    id="newPassword"
                    name="newPassword"
                    className="form-control"
                    value={formData.newPassword}
                    onChange={onChange}
                    minLength="6"
                    required
                  />
                </div>

                <div className="form-group">
                  <label className="form-label" htmlFor="confirmPassword">
                    Confirm New Password
                  </label>
                  <input
                    type="password"
                    id="confirmPassword"
                    name="confirmPassword"
                    className="form-control"
                    value={formData.confirmPassword}
                    onChange={onChange}
                    minLength="6"
                    required
                  />
                </div>
              </div>

              <div className="form-actions">
                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={isSubmitting}
                >
                  {isSubmitting ? "Updating..." : "Update Password"}
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Profile;
