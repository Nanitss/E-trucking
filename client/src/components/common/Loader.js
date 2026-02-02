import React from "react";

export default function Loader({ size = "medium", message = "Loading..." }) {
  const sizeClasses = {
    small: "w-6 h-6 border-2",
    medium: "w-10 h-10 border-[3px]",
    large: "w-[60px] h-[60px] border-4",
  };

  return (
    <div className="flex flex-col justify-center items-center min-h-[calc(100vh-70px)] w-full p-8 box-border">
      <div
        className={`${sizeClasses[size] || sizeClasses.medium} border-gray-200 border-t-primary-500 rounded-full animate-spin`}
      />
      {message && (
        <p className="mt-4 text-gray-600 text-sm font-medium">{message}</p>
      )}
    </div>
  );
}
