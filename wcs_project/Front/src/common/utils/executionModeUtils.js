export const normalizeExecutionMode = (mode = "") => {
  const m = String(mode).trim().toUpperCase();

  if (m === "AUTO" || m === "MANUAL") {
    return m;
  }

  return "UNKNOWN";
};

export const EXECUTION_MODE_STYLE = {
  AUTO: {
    label: "Auto",
    bg: "#888888", // เทา
    color: "#fff",
  },
  MANUAL: {
    label: "Manual",
    bg: "#1976d2", // น้ำเงิน
    color: "#fff",
  },
  UNKNOWN: {
    label: "N/A",
    bg: "#ffffff",
    color: "#fff",
  },
};
