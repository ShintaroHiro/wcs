import React , {useState, useEffect}from "react";
import { Dialog } from "@mui/material";
import MDBox from "components/MDBox";
import MDTypography from "components/MDTypography";
import ImageAPI from "api/ImageAPI";

// const statusMap = {
//   IDLE: {
//     color: "#10a64a",
//   },
//   RUNNING: {
//     color: "#e21d1d",
//   },
// };

const BlockMRSPopup = ({ open, onClose, blockId, bottomText, image }) => {
  //const statusColor = statusMap[status]?.color || "#10a64a";
const [imageUrl, setImageUrl] = useState(null);

useEffect(() => {
  const fetchImage = async () => {
    try {
      if (!image) return;

      const pathParts = image.split("/");
      const dirPath = pathParts[0];
      const subfolder = pathParts[1];
      const imageName = pathParts[2];

      const url = await ImageAPI.getImage(dirPath, subfolder, imageName);
      setImageUrl(url);

    } catch (error) {
      console.error("Error fetching image:", error);
    }
  };

  fetchImage();
}, [image]);

  return (
    <Dialog 
    open={open} 
    onClose={onClose} 
    maxWidth="xl"
    PaperProps={{
        sx: {
        borderRadius: "80px",
        },
    }}>
      <MDBox
        sx={{
            width: 1000,          // เดิม 750
            height: 650,         // เดิม 550
            background: "#ffffff",
            //borderRadius: "10px", 
            p: 6,                // padding เพิ่ม
            textAlign: "center",
            margin: "auto",
        }}
        >
        {/* Title */}
        <MDTypography variant="h2" fontWeight="bold" mt={2} mb={2}>
          Block {blockId}
        </MDTypography>

        {/* Mock layout */}
        {/* <MDBox
          sx={{
            height: 370,
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            gap: 1,
          }}
        >
          {Array.from({ length: 15 }).map((_, i) => (
            <MDBox
              key={i}
              sx={{
                width: 25,
                height: 320,
                backgroundColor:
                  i === 8
                    ? statusColor
                    : i % 3 === 0
                    ? "#888"
                    : "#d9d9d9",
                border: "1px solid #333",
              }}
            />
          ))}
        </MDBox> */}
        
        {/* Layout Image */}
            <MDBox
            sx={{
                height: 370,
                display: "flex",
                justifyContent: "center",
                alignItems: "center",
            }}
            >
          <MDBox
  component="img"
  src={imageUrl}
  alt={`Block ${blockId}`}
  sx={{
      height: "350px",
    objectFit: "contain",
  }}
/>
            </MDBox>

        {/* Bottom Text */}
        <MDTypography variant="h2" fontWeight="bold" mt={2}>
          {bottomText}
        </MDTypography>
      </MDBox>
    </Dialog>
  );
};

export default BlockMRSPopup;