import React, { useState } from "react";
import MDBox from "components/MDBox";
import MDTypography from "components/MDTypography";
import BlockMRSPopup from "./block_mrs_popup";

const statusMap = {
  IDLE: {
    color: "#10a64a",
    text: "Standby",
  },
  RUNNING: {
    color: "#e21d1d",
    text: "Occupied",
  },
};

const BlockMRS = ({ mrs }) => {
  const [open, setOpen] = useState(false);

  const statusConfig = statusMap[mrs.status] || statusMap.IDLE;

  return (
    <>
      <MDBox
        onClick={() => setOpen(true)}
        sx={{
          width: "100%",
          height: 150,
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
        {/* line 1 */}
        <MDTypography variant="h3" fontWeight="bold" color="black">
          Block {mrs.id}
        </MDTypography>

        {/* line 2 */}
        <MDTypography variant="h3" fontWeight="bold" color="black">
          {statusConfig.text}
        </MDTypography>

        {/* line 3 */}
        {mrs.status === "RUNNING" && (
          <MDTypography variant="h3" fontWeight="bold" color="black">
            {mrs.mrs_location}
          </MDTypography>
        )}
      </MDBox>

      {/* Popup */}
      <BlockMRSPopup
        open={open}
        onClose={() => setOpen(false)}
        blockId={mrs.id}
        bottomText={mrs.aisle}
        status={mrs.status}
        image={mrs.image}
      />
    </>
  );
};

export default BlockMRS;