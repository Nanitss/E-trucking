import React from "react";
import ClientHeader from "../common/ClientHeader";

const ClientLayout = ({ children }) => {
  return (
    <div className="min-h-screen bg-gray-50">
      <ClientHeader />
      <div className="mt-[70px] min-h-[calc(100vh-70px)] overflow-y-auto bg-gray-50 flex flex-col items-center p-0">
        <div className="w-full max-w-[1400px] mx-auto p-8 box-border">
          {children}
        </div>
      </div>
    </div>
  );
};

export default ClientLayout;
