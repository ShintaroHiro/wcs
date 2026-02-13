import React from "react";
import MDBox from "components/MDBox";
import MDTypography from "components/MDTypography";
import {
  normalizeExecutionMode,
  EXECUTION_MODE_STYLE,
} from "common/utils/executionModeUtils";

const ExecutionModeBadge = ({ mode, status, onToggle }) => {
  const normalized = normalizeExecutionMode(mode);
  const style = EXECUTION_MODE_STYLE[normalized];

  const isPending = status === "PENDING";

  const handleClick = () => {
    if (!isPending) return;

    const nextMode = normalized === "AUTO" ? "MANUAL" : "AUTO";
    onToggle(nextMode);
  };

  return (
    <MDBox
      onClick={handleClick}
      sx={{
        display: "inline-block",
        px: 1.5,
        py: 0.5,
        borderRadius: "6px",
        backgroundColor: style.bg,
        cursor: isPending ? "pointer" : "not-allowed",
        opacity: isPending ? 1 : 1,
        userSelect: "none",
      }}
    >
      <MDTypography
        variant="caption"
        sx={{ color: style.color, fontWeight: "bold" }}
      >
        {style.label}
      </MDTypography>
    </MDBox>
  );
};

export default ExecutionModeBadge;
