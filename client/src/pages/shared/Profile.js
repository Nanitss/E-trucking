import React, { useState, useContext, useEffect } from "react";
import axios from "axios";
import { Link, useHistory } from "react-router-dom";
import {
  TbUser,
  TbMail,
  TbPhone,
  TbMapPin,
  TbCalendar,
  TbLock,
  TbArrowLeft,
  TbLoader,
  TbKey
} from "react-icons/tb";
import { AuthContext } from "../../context/AuthContext";
import { AlertContext } from "../../context/AlertContext";
import Loader from "../../components/common/Loader";

const Profile = () => {
  const { authUser } = useContext(AuthContext);
  const { showAlert } = useContext(AlertContext);
  const history = useHistory();

  const [userDetails, setUserDetails] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [showPasswordForm, setShowPasswordForm] = useState(false);
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
        case "admin": endpoint = "/api/users/admin"; break;
        case "staff": endpoint = "/api/staffs/profile"; break;
        case "client": endpoint = "/api/clients/profile"; break;
        case "driver": endpoint = "/api/drivers/profile"; break;
        case "helper": endpoint = "/api/helpers/profile"; break;
        case "operator": endpoint = "/api/operators/profile"; break;
        default: endpoint = "/api/auth/me";
      }

      console.log(`Fetching profile for role: ${authUser.role} from ${endpoint}`);
      const res = await axios.get(endpoint);
      setUserDetails(res.data);
    } catch (error) {
      console.error("Error fetching user details:", error);
      // Don't show error immediately, just log it. Some roles might not have profile details yet.
      // showAlert("Count not load detailed profile information", "warning"); 
    } finally {
      setIsLoading(false);
    }
  };

  const onChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handlePasswordChange = async (e) => {
    e.preventDefault();
    const { currentPassword, newPassword, confirmPassword } = formData;

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
      setShowPasswordForm(false);
    } catch (error) {
      console.error("Error updating password:", error);
      showAlert(error.response?.data?.message || "Error updating password", "danger");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Loader />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50/50 py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="flex items-center gap-4 mb-8">
          <button
            onClick={() => history.goBack()}
            className="p-2 hover:bg-white hover:shadow-sm rounded-lg transition-all text-gray-500 hover:text-gray-900"
          >
            <TbArrowLeft size={24} />
          </button>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">My Profile</h1>
            <p className="text-sm text-gray-500">Manage your account settings and preferences</p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Profile Card */}
          <div className="lg:col-span-2 space-y-6">
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
              <div className="bg-gradient-to-r from-primary-600 to-primary-700 h-32 relative">
                <div className="absolute -bottom-10 left-8">
                  <div className="w-24 h-24 rounded-full bg-white p-1 shadow-lg">
                    <div className="w-full h-full rounded-full bg-gray-100 flex items-center justify-center text-primary-600 text-3xl font-bold">
                      {authUser.username?.charAt(0).toUpperCase()}
                    </div>
                  </div>
                </div>
              </div>

              <div className="pt-12 pb-8 px-8">
                <div className="flex justify-between items-start mb-6">
                  <div>
                    <h2 className="text-xl font-bold text-gray-900">{authUser.username}</h2>
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-primary-50 text-primary-700 mt-1 capitalize border border-primary-100">
                      {authUser.role}
                    </span>
                  </div>
                </div>

                <div className="grid gap-6">
                  {userDetails?.name && (
                    <div className="flex items-center gap-3 text-gray-600 p-3 hover:bg-gray-50 rounded-lg transition-colors border border-transparent hover:border-gray-100">
                      <div className="w-10 h-10 rounded-full bg-blue-50 flex items-center justify-center text-blue-600">
                        <TbUser size={20} />
                      </div>
                      <div>
                        <p className="text-xs text-gray-500 font-medium uppercase tracking-wide">Full Name</p>
                        <p className="text-sm font-semibold text-gray-900">{userDetails.name}</p>
                      </div>
                    </div>
                  )}

                  {userDetails?.email && (
                    <div className="flex items-center gap-3 text-gray-600 p-3 hover:bg-gray-50 rounded-lg transition-colors border border-transparent hover:border-gray-100">
                      <div className="w-10 h-10 rounded-full bg-purple-50 flex items-center justify-center text-purple-600">
                        <TbMail size={20} />
                      </div>
                      <div>
                        <p className="text-xs text-gray-500 font-medium uppercase tracking-wide">Email Address</p>
                        <p className="text-sm font-semibold text-gray-900">{userDetails.email}</p>
                      </div>
                    </div>
                  )}

                  {userDetails?.phone && (
                    <div className="flex items-center gap-3 text-gray-600 p-3 hover:bg-gray-50 rounded-lg transition-colors border border-transparent hover:border-gray-100">
                      <div className="w-10 h-10 rounded-full bg-green-50 flex items-center justify-center text-green-600">
                        <TbPhone size={20} />
                      </div>
                      <div>
                        <p className="text-xs text-gray-500 font-medium uppercase tracking-wide">Phone Number</p>
                        <p className="text-sm font-semibold text-gray-900">{userDetails.phone}</p>
                      </div>
                    </div>
                  )}

                  {userDetails?.address && (
                    <div className="flex items-center gap-3 text-gray-600 p-3 hover:bg-gray-50 rounded-lg transition-colors border border-transparent hover:border-gray-100">
                      <div className="w-10 h-10 rounded-full bg-orange-50 flex items-center justify-center text-orange-600">
                        <TbMapPin size={20} />
                      </div>
                      <div>
                        <p className="text-xs text-gray-500 font-medium uppercase tracking-wide">Address</p>
                        <p className="text-sm font-semibold text-gray-900">{userDetails.address}</p>
                      </div>
                    </div>
                  )}

                  {userDetails?.joinDate && (
                    <div className="flex items-center gap-3 text-gray-600 p-3 hover:bg-gray-50 rounded-lg transition-colors border border-transparent hover:border-gray-100">
                      <div className="w-10 h-10 rounded-full bg-teal-50 flex items-center justify-center text-teal-600">
                        <TbCalendar size={20} />
                      </div>
                      <div>
                        <p className="text-xs text-gray-500 font-medium uppercase tracking-wide">Member Since</p>
                        <p className="text-sm font-semibold text-gray-900">
                          {new Date(userDetails.joinDate).toLocaleDateString(undefined, {
                            year: 'numeric',
                            month: 'long',
                            day: 'numeric'
                          })}
                        </p>
                      </div>
                    </div>
                  )}

                  {!userDetails?.email && !userDetails?.name && (
                    <div className="p-4 bg-gray-50 rounded-lg border border-gray-100 text-center text-gray-500 text-sm">
                      No additional profile information available.
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Security Card */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 sticky top-8">
              <div className="flex items-center justify-between gap-3 mb-6">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-red-50 text-red-600 rounded-lg">
                    <TbLock size={20} />
                  </div>
                  <h3 className="text-lg font-bold text-gray-900">Security</h3>
                </div>
              </div>

              {!showPasswordForm ? (
                <div className="text-center py-6">
                  <div className="w-12 h-12 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-3 text-gray-400">
                    <TbKey size={24} />
                  </div>
                  <p className="text-sm text-gray-500 mb-4">Update your password securely</p>
                  <button
                    onClick={() => setShowPasswordForm(true)}
                    className="w-full py-2.5 px-4 border border-gray-200 rounded-xl shadow-sm text-sm font-bold text-gray-700 bg-white hover:bg-gray-50 hover:text-gray-900 focus:outline-none transition-all"
                  >
                    Change Password
                  </button>
                </div>
              ) : (
                <form onSubmit={handlePasswordChange} className="space-y-4 animate-in fade-in slide-in-from-top-4 duration-300">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Current Password</label>
                    <input
                      type="password"
                      name="currentPassword"
                      value={formData.currentPassword}
                      onChange={onChange}
                      required
                      className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 outline-none transition-all text-sm"
                      placeholder="••••••••"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">New Password</label>
                    <input
                      type="password"
                      name="newPassword"
                      value={formData.newPassword}
                      onChange={onChange}
                      minLength="6"
                      required
                      className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 outline-none transition-all text-sm"
                      placeholder="Min. 6 characters"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Confirm Password</label>
                    <input
                      type="password"
                      name="confirmPassword"
                      value={formData.confirmPassword}
                      onChange={onChange}
                      minLength="6"
                      required
                      className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 outline-none transition-all text-sm"
                      placeholder="Min. 6 characters"
                    />
                  </div>

                  <div className="pt-2 flex flex-col gap-2">
                    <button
                      type="submit"
                      disabled={isSubmitting}
                      className="w-full flex justify-center py-2.5 px-4 border border-transparent rounded-xl shadow-sm text-sm font-bold text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                    >
                      {isSubmitting ? "Updating..." : "Update Password"}
                    </button>
                    <button
                      type="button"
                      onClick={() => setShowPasswordForm(false)}
                      className="w-full py-2.5 px-4 text-sm font-medium text-gray-500 hover:text-gray-700 transition-colors"
                    >
                      Cancel
                    </button>
                  </div>
                </form>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Profile;
