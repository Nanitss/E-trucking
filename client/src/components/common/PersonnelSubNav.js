import React from "react";
import { Link } from "react-router-dom";
import { TbUser, TbUsers, TbBriefcase, TbHandGrab } from "react-icons/tb";

const PersonnelSubNav = ({ activeTab }) => {
  const tabs = [
    {
      id: "drivers",
      label: "Drivers",
      icon: TbUser,
      link: "/admin/drivers/driverslist",
      description: "Manage drivers & licenses",
    },
    {
      id: "helpers",
      label: "Helpers",
      icon: TbHandGrab,
      link: "/admin/helpers/helperslist",
      description: "Manage helpers & assistants",
    },
    {
      id: "staff",
      label: "Staff",
      icon: TbUsers,
      link: "/admin/staffs/stafflist",
      description: "Office & support staff",
    },
    {
      id: "clients",
      label: "Clients",
      icon: TbBriefcase,
      link: "/admin/clients/clientlist",
      description: "Clients & allocations",
    },
  ];

  return (
    <div className="bg-white border-b border-gray-200 mb-6">
      <div className="max-w-[1600px] mx-auto px-6 lg:px-8">
        <div className="flex space-x-8">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;

            return (
              <Link
                key={tab.id}
                to={tab.link}
                className={`
                  group flex items-center gap-2 py-4 border-b-2 transition-all duration-200
                  ${
                    isActive
                      ? "border-blue-600 text-blue-600"
                      : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
                  }
                `}
              >
                <div
                  className={`
                  p-1.5 rounded-lg transition-colors
                  ${
                    isActive
                      ? "bg-blue-50 text-blue-600"
                      : "bg-gray-100/50 text-gray-400 group-hover:bg-gray-100 group-hover:text-gray-500"
                  }
                `}
                >
                  <Icon size={18} />
                </div>
                <div className="flex flex-col">
                  <span
                    className={`text-sm font-semibold leading-none ${isActive ? "text-blue-900" : "text-gray-700"}`}
                  >
                    {tab.label}
                  </span>
                  <span className="text-[10px] text-gray-400 font-medium mt-0.5 hidden sm:block">
                    {tab.description}
                  </span>
                </div>
              </Link>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default PersonnelSubNav;
