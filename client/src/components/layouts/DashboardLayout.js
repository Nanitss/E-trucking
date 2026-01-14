import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { 
  TbTruck, 
  TbUsers, 
  TbUserCheck, 
  TbPackage, 
  TbBuilding,
  TbBell,
  TbMail
} from 'react-icons/tb';

const DashboardLayout = ({ children, currentUser, title = "Dashboard" }) => {
  const location = useLocation();

  const isActive = (path) => {
    return location.pathname === path;
  };

  return (
    <div className="dashboard-layout">
      {/* Sidebar */}
      <div className="sidebar">
        <div className="px-6 mb-8">
          <div className="flex items-center">
            <div className="w-8 h-8 bg-white bg-opacity-20 rounded-lg flex items-center justify-center mr-3">
              <TbTruck className="text-white" size={20} />
            </div>
            <h2 className="text-white font-bold text-lg">E-Trucking</h2>
          </div>
        </div>
        
        <nav className="px-6">
          <div className="space-y-2">
            <Link 
              to="/admin/dashboard" 
              className={`flex items-center px-3 py-2 rounded-lg transition-colors ${
                isActive('/admin/dashboard') 
                  ? 'text-white bg-white bg-opacity-20' 
                  : 'text-white text-opacity-70 hover:text-white hover:bg-white hover:bg-opacity-10'
              }`}
            >
              <TbTruck className="mr-3" size={20} />
              Dashboard
            </Link>
            <Link 
              to="/admin/trucks" 
              className={`flex items-center px-3 py-2 rounded-lg transition-colors ${
                isActive('/admin/trucks') 
                  ? 'text-white bg-white bg-opacity-20' 
                  : 'text-white text-opacity-70 hover:text-white hover:bg-white hover:bg-opacity-10'
              }`}
            >
              <TbUsers className="mr-3" size={20} />
              Trucks
            </Link>
            <Link 
              to="/admin/drivers" 
              className={`flex items-center px-3 py-2 rounded-lg transition-colors ${
                isActive('/admin/drivers') 
                  ? 'text-white bg-white bg-opacity-20' 
                  : 'text-white text-opacity-70 hover:text-white hover:bg-white hover:bg-opacity-10'
              }`}
            >
              <TbUserCheck className="mr-3" size={20} />
              Drivers
            </Link>
            <Link 
              to="/admin/deliveries" 
              className={`flex items-center px-3 py-2 rounded-lg transition-colors ${
                isActive('/admin/deliveries') 
                  ? 'text-white bg-white bg-opacity-20' 
                  : 'text-white text-opacity-70 hover:text-white hover:bg-white hover:bg-opacity-10'
              }`}
            >
              <TbPackage className="mr-3" size={20} />
              Deliveries
            </Link>
            <Link 
              to="/admin/clients" 
              className={`flex items-center px-3 py-2 rounded-lg transition-colors ${
                isActive('/admin/clients') 
                  ? 'text-white bg-white bg-opacity-20' 
                  : 'text-white text-opacity-70 hover:text-white hover:bg-white hover:bg-opacity-10'
              }`}
            >
              <TbBuilding className="mr-3" size={20} />
              Clients
            </Link>
          </div>
        </nav>
      </div>

      {/* Main Content */}
      <div className="main-content">
        {/* Header */}
        <div className="header">
          <div className="flex items-center">
            <h1 className="text-2xl font-bold text-gray-900">{title}</h1>
          </div>
          <div className="flex items-center space-x-4">
            <div className="relative">
              <input 
                type="text" 
                placeholder="Search..." 
                className="w-64 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            <div className="flex items-center space-x-2">
              <div className="w-8 h-8 bg-gray-200 rounded-full flex items-center justify-center">
                <TbBell size={16} className="text-gray-600" />
              </div>
              <div className="w-8 h-8 bg-gray-200 rounded-full flex items-center justify-center">
                <TbMail size={16} className="text-gray-600" />
              </div>
              <div className="flex items-center space-x-2">
                <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center">
                  <span className="text-white text-sm font-medium">A</span>
                </div>
                <span className="text-gray-700 font-medium">{currentUser?.username || 'Admin'}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Content Area */}
        <div className="content-area">
          {children}
        </div>
      </div>
    </div>
  );
};

export default DashboardLayout;
