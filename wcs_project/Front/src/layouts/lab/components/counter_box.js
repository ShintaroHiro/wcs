import React from "react";
import MDBox from "components/MDBox";
import MDButton from "components/MDButton";
import MDTypography from "components/MDTypography";

import { GlobalVar } from "common/GlobalVar";

const DEFAULT_TEXT_COLOR = "#000";
const DEFAULT_BG_COLOR = "#FFF";

const CounterBox = ({ counter, onClick, onQtyChange }) => {
  const userRole = GlobalVar.getRole();
  const isRequester = userRole === "REQUESTER";

  const status = counter.status || "IDLE";
  const isWaiting = status === "WAITING_PICK";
  const isIdle = status === "IDLE";
  const isError = status === "ERROR";

  const counterTextColor = isIdle
    ? DEFAULT_TEXT_COLOR
    : counter.color || DEFAULT_TEXT_COLOR;

  const boxBgColor = isIdle
    ? DEFAULT_BG_COLOR
    : counter.color || DEFAULT_BG_COLOR;

  const quantityColor = counter.isActive
    ? counterTextColor
    : "#FFF";

  // +
  const handleIncrease = (e) => {
    e.stopPropagation();

    if (counter.actual >= counter.plan) return;

    const newQty = counter.actual + 1;
    onQtyChange(counter.id, newQty);
  };

  // -
  const handleDecrease = (e) => {
    e.stopPropagation();

    if (counter.actual <= 0) return;

    const newQty = counter.actual - 1;
    onQtyChange(counter.id, newQty);
  };

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
        {isError && (
          <MDTypography
            sx={{
              position: "absolute",
              top: "50%",
              left: "50%",
              transform: "translate(-50%, -50%) rotate(-45deg)",
              color: "#000",   // 👈 สีดำ
              fontWeight: "bold",
              fontSize: "2.9rem",
            }}
          >
            ERROR
          </MDTypography>
        )}
      </MDBox>

      {/* Quantity */}
      {/* {!isWaiting && !isError && (
        <MDTypography
          variant="h5"
          sx={{ color: quantityColor, mt: 4.5 }}
        >
          {counter.actual}/{counter.plan}
        </MDTypography>
      )} */}
{!isWaiting && !isError && (
  <MDBox
    mt={4.5}
    display="flex"
    justifyContent="center"
    alignItems="center"
    gap={1.5}
  >
     {/* - Button (ซ่อนเฉพาะ REQUESTER) */}
    {!isRequester && counter.plan > 0 && (
      <MDButton
        size="small"
        variant="outlined"
        disabled={counter.actual === 0}
        onClick={handleDecrease}
        sx={{
          minWidth: 35,
          width: 35,
          height: 35,
          px: 0,
          borderRadius: "6px",
          fontSize: "1.5rem",
          fontWeight: 700,
          lineHeight: 1,

          // 🔴 กดได้ = แดง
          color: counter.actual === 0 ? "#bdbdbd" : "#d32f2f",
          borderColor:
            counter.actual === 0 ? "#e0e0e0" : "#d32f2f",
          backgroundColor:
            counter.actual === 0 ? "#f3f3f3" : "#fff",

          "&:hover": {
            backgroundColor:
              counter.actual === 0
                ? "#f3f3f3"
                : "#ffebee",
          },

          "&.Mui-disabled": {
            color: "#bdbdbd",
            backgroundColor: "#f3f3f3",
            borderColor: "#e0e0e0",
          },
        }}
      >
        −
      </MDButton>
    )}

    {/* Quantity */}
    <MDTypography
      variant="h5"
      sx={{
        color: quantityColor,
        minWidth: 70,
        textAlign: "center",
        fontWeight: 600,
      }}
    >
      {counter.actual}/{counter.plan}
    </MDTypography>

    {/* + Button (ซ่อนเฉพาะ REQUESTER) */}
    {!isRequester && counter.plan > 0 && (
      <MDButton
        size="small"
        variant="outlined"
        disabled={counter.actual === counter.plan}
        onClick={handleIncrease}
        sx={{
          minWidth: 35,
          width: 35,
          height: 35,
          px: 0,
          borderRadius: "6px",
          fontSize: "1.5rem",
          fontWeight: 700,
          lineHeight: 1,

          // 🟢 กดได้ = เขียว
          color:
            counter.actual === counter.plan
              ? "#bdbdbd"
              : "#2e7d32",
          borderColor:
            counter.actual === counter.plan
              ? "#e0e0e0"
              : "#2e7d32",
          backgroundColor:
            counter.actual === counter.plan
              ? "#f3f3f3"
              : "#fff",

          "&:hover": {
            backgroundColor:
              counter.actual === counter.plan
                ? "#f3f3f3"
                : "#e8f5e9",
          },

          "&.Mui-disabled": {
            color: "#bdbdbd",
            backgroundColor: "#f3f3f3",
            borderColor: "#e0e0e0",
          },
        }}
      >
        +
      </MDButton>
    )}
  </MDBox>
)}

    </MDBox>
  );
};

export default CounterBox;
