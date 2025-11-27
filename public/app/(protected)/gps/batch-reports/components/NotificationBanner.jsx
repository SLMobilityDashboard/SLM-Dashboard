"use client";

import { Alert, AlertDescription } from "@/components/ui/alert";

export const NotificationBanner = ({ notification }) => {
  if (!notification) return null;

  return (
    <Alert
      className={`${
        notification.type === "success"
          ? "border-green-500/50 bg-green-500/10"
          : notification.type === "error"
          ? "border-red-500/50 bg-red-500/10"
          : "border-blue-500/50 bg-blue-500/10"
      }`}
    >
      <AlertDescription
        className={`${
          notification.type === "success"
            ? "text-green-400"
            : notification.type === "error"
            ? "text-red-400"
            : "text-blue-400"
        }`}
      >
        {notification.message}
      </AlertDescription>
    </Alert>
  );
};
