import React, { useState } from "react";
import MDBox from "components/MDBox";
import MDTypography from "components/MDTypography";
import BlockMRSPopup from "./block_mrs_popup";
import { GlobalVar } from "common/GlobalVar";

const statusMap = {
  CLOSED: {
    color: "#10a64a",
    text: "Standby",
  },
  ERROR: {
    color: "#e21d1d",
    text: "Error",
  },
  OPEN: {
    color: "#ffce18",
    text: "Occupied",
  },
};

const BlockMRS = ({ block }) => {
  const [open, setOpen] = useState(false);

  const userRole = GlobalVar.getRole();
  const isRequester = userRole === "REQUESTER";

  const statusConfig = statusMap[block.status] || statusMap.IDLE;

  return (
    <>
      <MDBox
        onClick={() => setOpen(true)}
        sx={{
          width: "100%",
          height: 200,
          borderRadius: "20px",
          backgroundColor: statusConfig.color,
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          flexDirection: "column",
          cursor: "pointer",
          boxShadow: 3,
        }}
      >
        {/* 🔹 บรรทัด 1: Block */}
        <MDTypography variant="h4" fontWeight="bold" color="black">
          Block {block.id}
        </MDTypography>

        {/* 🔹 บรรทัด 2: Status */}
        <MDTypography variant="h4" fontWeight="bold" color="black">
          {statusConfig.text}
        </MDTypography>

        {/* ================= OPEN ================= */}
        {block.status === "OPEN" && (
          <>
            {/* 🔹 บรรทัด 3: stock item */}
            <MDTypography variant="h4" color="black" sx={{ wordBreak: "break-word"}}>
              Stock Item: {block.stock_item}
            </MDTypography>

            {/* 🔹 บรรทัด 4: qty */}
            <MDTypography variant="h4" color="black" sx={{ wordBreak: "break-word"}}>
              Quantity: {block.actual_qty} / {block.plan_qty}
            </MDTypography>

            {/* 🔹 บรรทัด 5: box_loc */}
            <MDTypography variant="h4" color="black" sx={{ wordBreak: "break-word"}}>
              Location: {block.box_loc}
            </MDTypography>
          </>
        )}

        {/* ================= ERROR ================= */}
        {block.status === "ERROR" && !isRequester && (
          <MDTypography
            variant="h4"
            color="black"
            sx={{ wordBreak: "break-word" }}
          >
            Communication Error
          </MDTypography>
        )}

      </MDBox>

      {/* Popup */}
      <BlockMRSPopup
        open={open}
        onClose={() => setOpen(false)}
        blockId={block.id}
        bottomText={block.aisle}
        status={block.status}
        image={block.image}
      />
    </>
  );
};

export default BlockMRS;