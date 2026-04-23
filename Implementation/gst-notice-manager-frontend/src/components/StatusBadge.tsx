import React from "react";

const statusConfig: any = {
  uploaded: {
    label: "Uploaded",
    icon: "📤",
    color: "gray",
  },
  processing: {
    label: "Processing",
    icon: "⚙️",
    color: "blue",
  },
  ready: {
    label: "Ready",
    icon: "✅",
    color: "green",
  },
};

const StatusBadge = ({ status }: { status?: string }) => {
  // 🔥 SAFE FALLBACK
  const config = statusConfig[status || "uploaded"] || statusConfig["uploaded"];

  return (
    <span style={{ color: config.color }}>
      {config.icon} {config.label}
    </span>
  );
};

export default StatusBadge;