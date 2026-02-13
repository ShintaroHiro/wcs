// import React from "react";
// import MDBox from "components/MDBox";
// import MDTypography from "components/MDTypography";
// import { normalizeStatus, STATUS_STYLE } from "common/utils/statusUtils";

// const StatusBadge = ({ status }) => {
//   const normalized = normalizeStatus(status);
//   const style = STATUS_STYLE[normalized];

//   if (!style) {
//     return (
//       <MDTypography variant="caption">
//         {normalized}
//       </MDTypography>
//     );
//   }

//   return (
//     <MDBox
//       sx={{
//         display: "inline-block",
//         px: 1.5,
//         py: 0.5,
//         borderRadius: "6px",
//         backgroundColor: style.bg,
//       }}
//     >
//       <MDTypography
//         variant="caption"
//         sx={{ color: style.color, fontWeight: "bold" }}
//       >
//         {style.label}
//       </MDTypography>
//     </MDBox>
//   );
// };

// export default StatusBadge;

import React from "react";
import MDBox from "components/MDBox";
import MDTypography from "components/MDTypography";

const StatusBadge = ({ value, normalize, styles }) => {
  const normalized = normalize(value);
  const style = styles[normalized];

  if (!style) {
    return (
      <MDTypography variant="caption">
        {normalized}
      </MDTypography>
    );
  }

  return (
    <MDBox
      sx={{
        display: "inline-block",
        px: 1.5,
        py: 0.5,
        borderRadius: "6px",
        backgroundColor: style.bg,
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

export default StatusBadge;
