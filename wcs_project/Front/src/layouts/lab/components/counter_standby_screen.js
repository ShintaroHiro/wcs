import { Box, Card, Typography } from "@mui/material";

export default function CounterStandbyScreen({ counter }) {
  return (
    <Box
      sx={{
        width: "100%",
        height: "100%",
        backgroundColor: "#ededed",
        border: "4px solid black",
        p: 4,
        boxSizing: "border-box",
        display: "flex",
        flexDirection: "column",
      }}
    >
      {/* Counter Title (ตำแหน่งเดิม) */}
      <Typography variant="h2" fontWeight="bold" mb={2} sx={{ color: "#000" }}>
        Counter {counter?.counter_id || "?"}
      </Typography>

      {/* Standby Area */}
      <Box
        sx={{
          flexGrow: 1, // 🔥 กินพื้นที่ทั้งหมดที่เหลือ
          display: "flex",
          alignItems: "center", // ⭐ กลางแนวตั้ง
          justifyContent: "center", // ⭐ กลางแนวนอน
        }}
      >
        <Card
          sx={{
            width: "100%", // 🔥 ยาวสุดขอบ
            height: "100%", // 🔥 สูงสุดเท่าที่ได้
            borderRadius: 20,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <Typography
            fontWeight="bold"
            sx={{
              fontSize: "clamp(80px, 12vw, 180px)", // 🔥 ใหญ่มาก + responsive
              color: "#000000c6",
              letterSpacing: 4,
            }}
          >
            Standby
          </Typography>
        </Card>
      </Box>
    </Box>
  );
}
