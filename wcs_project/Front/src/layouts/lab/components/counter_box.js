import React from "react";
import MDBox from "components/MDBox";
import MDTypography from "components/MDTypography";

const DEFAULT_TEXT_COLOR = "#000";
const DEFAULT_BG_COLOR = "#FFF";

const CounterBox = ({ counter, onClick }) => {
  const status = counter.status || "IDLE";
  const isWaiting = status === "WAITING_PICK";
  const isIdle = status === "IDLE";

  const counterTextColor = isIdle
    ? DEFAULT_TEXT_COLOR
    : counter.color || DEFAULT_TEXT_COLOR;

  const boxBgColor = isIdle
    ? DEFAULT_BG_COLOR
    : counter.color || DEFAULT_BG_COLOR;

  const quantityColor = counter.isActive
    ? counterTextColor
    : "#FFF";

  return (
    <MDBox textAlign="center" sx={{ cursor: "pointer" }} onClick={onClick}>
      {/* Counter ID */}
      <MDTypography
        variant="h3"
        sx={{ color: counterTextColor, mb: 1.5 }}
      >
        {counter.id}
      </MDTypography>

      {/* Square box */}
      <MDBox
        sx={{
          width: 135,
          height: 165,
          border: "2px solid #000",
          backgroundColor: boxBgColor,
          position: "relative",
          mx: "auto",
        }}
      >
        {isWaiting && (
          <MDTypography
            sx={{
              position: "absolute",
              top: "50%",
              left: "50%",
              transform: "translate(-50%, -50%) rotate(-45deg)",
              color: "#fff",
              fontWeight: "bold",
              fontSize: "2.3rem",
            }}
          >
            WAITING
          </MDTypography>
        )}
      </MDBox>

      {/* Quantity */}
      {!isWaiting && (
        <MDTypography
          variant="h5"
          sx={{ color: quantityColor, mt: 4.5 }}
        >
          {counter.actual}/{counter.plan}
        </MDTypography>
      )}

    </MDBox>
  );
};

export default CounterBox;
