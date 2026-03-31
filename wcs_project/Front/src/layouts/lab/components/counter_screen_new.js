import { Box, Card, Typography, Grid } from "@mui/material";
import { alpha } from "@mui/material/styles";
import CounterStandbyScreen from "./counter_standby_screen";

export default function CounterScreenNewLayOut({
  counter, // counter object จาก API
  status,
  stock_item,
  item_desc,
  plan_qty,
  pickedQty,
  type,
  typetwo,
  mc_code,
  usage_num,
  usage_line,
  po_num,
  object_id,
  imageUrl,
  slots = 6,
  isStandby,
}) {
  const counterColor = counter?.color || "#ff0000";

  //Transaction / Order Info
  let transactionFields = [];

  if (type === "RECEIPT") {
    transactionFields = [
      ["PO NO.", po_num],
      ["OBJECT ID", object_id],
    ];
  } else if (type === "TRANSFER") {
    transactionFields = [["OBJECT ID", object_id]];
  } else {
    transactionFields = [
      ["USAGE NO.", usage_num],
      ["USAGE Line", usage_line],
    ];
  }

  if (isStandby) {
    return <CounterStandbyScreen counter={counter} />;
  }

  return (
    <Card
      sx={{
        width: "100%",
        height: "100%",
        backgroundColor: alpha(counterColor || "#000", 0.1),
        border: "4px solid black",
        borderRadius: 0,
        p: 3,
        boxSizing: "border-box",
        position: "relative",
      }}
    >
      {/* Counter Title */}
      <Typography
        variant="h2"
        fontWeight="bold"
        textAlign="left"
        mb={2}
        sx={{
          cursor: "pointer",
          color: "#000", // 🔒 ดำล้วน
        }}
        onClick={() => {
          window.location.reload();
        }}
      >
        Counter {counter?.counter_id || "?"}
      </Typography>

      <Grid container spacing={2} sx={{ height: "100%" }} alignItems="stretch">
        {/* Left */}
        <Grid item xs={12} md={12}>
          <Grid container spacing={2} alignItems="stretch">
            {/* Info */}
            <Grid item xs={12} md={4} display="flex" sx={{ height: "100%" }}>
              <Card
                sx={{
                  borderRadius: 7,
                  p: 3,
                  width: "100%",
                  height: "290px",
                  display: "flex",
                  flexDirection: "column",
                }}
              >
                <Typography fontWeight="bold" fontSize={40} ml={2}>
                  {mc_code}
                </Typography>

                <Typography fontWeight="bold" fontSize={40} ml={2}>
                  REQUESTER
                </Typography>

                <Box display="flex" gap={10} sx={{ mt: "auto", ml: 2 }}>
                  <Typography fontWeight="bold" fontSize={40}>
                    {typetwo} Quantity :
                  </Typography>
                  <Typography fontSize={38}>{plan_qty}</Typography>
                </Box>
              </Card>
            </Grid>

            {/* Slot Indicator */}
            <Grid item xs={12} md={4} display="flex">
              <Card
                sx={{
                  borderRadius: 7,
                  p: 3,
                  width: "100%",
                  display: "flex",
                    alignItems: "center",     // 🔥 แนวตั้ง
                    justifyContent: "center", // 🔥 แนวนอน
                }}
              >
                <Box
                  display="flex"
                  gap={{ xs: 0.5, md: 1.5}}
                  width="100%"
                  alignItems="stretch" // 🔥 ทำให้สูงตามกัน
                >
                  {Array.from({ length: slots }).map((_, i) => {
                    const index = i + 1;
                    const counterId = Number(counter?.counter_id);
                    const isActive = counterId >= 1 && counterId <= slots && index === counterId;
                    const color = isActive ? counter?.color || "#000" : "#000";

                    return (
                      <Box
                        key={index}
                        sx={{
                          flex: 1, // 🔥 ยืดตาม Card
                          display: "flex",
                          flexDirection: "column",
                          alignItems: "center",
                        }}
                      >
                        <Typography fontWeight="bold" sx={{ color }}>
                          {index}
                        </Typography>

                        <Box
                          sx={{
                            width: "100%",
                            aspectRatio: "1.75 / 2.50", // 🔥 ตัวกำหนดความสูงทั้งหมด
                            border: "2px solid black",
                            backgroundColor: isActive ? color : "#fff",
                            transition: "all 0.2s ease",
                          }}
                        />
                      </Box>
                    );
                  })}
                </Box>
              </Card>
            </Grid>
            {/* Transaction / Order Info */}
            <Grid item xs={12} md={4} display="flex" sx={{ height: "100%" }}>
              <Card
                sx={{
                  borderRadius: 7,
                  p: 3,
                  textAlign: "left",
                  width: "100%",
                  height: "290px",
                }}
              >
                <Typography fontWeight="bold" fontSize={40} ml={2}>
                  {type || "-"} ( {typetwo} )
                </Typography>
                <Grid container spacing={0.5} mt={1} sx={{ pl: 2 }}>
                  {transactionFields.map(([label, value], i) => (
                    <Grid item xs={12} key={i}>
                      <Box
                        sx={{
                          display: "grid",
                          gridTemplateColumns: "200px minmax(0, 1fr)", // 🔥 สำคัญมาก
                          columnGap: 8,
                          alignItems: "start",
                          width: "100%", // 🔒 บังคับไม่เกิน Card
                          overflow: "hidden", // 🔒 กันล้น
                        }}
                      >
                        <Typography fontWeight="bold" fontSize={33}>
                          {label} :
                        </Typography>

                        <Typography
                          fontSize={33}
                          sx={{
                            minWidth: 0, // 🔥 กันดัน layout
                            wordBreak: "break-word",
                            whiteSpace: "normal",
                          }}
                        >
                          {value ?? "-"}
                        </Typography>
                      </Box>
                    </Grid>
                  ))}
                </Grid>
              </Card>
            </Grid>

            {/* 🔥 Middle + Bottom รวมกัน */}
            <Grid item xs={12}>
              <Grid container spacing={2} alignItems="stretch">
                {/* LEFT SIDE (Counter + Stock) */}
                <Grid item xs={12} md={8} sx={{ height: "100%" }}>
                  <Grid container spacing={2} sx={{ height: "100%" }}>
                    {/* Counter */}
                    <Grid item xs={12} sx={{ flex: 1, display: "flex" }}>
                      <Box
                        sx={{
                          backgroundColor: counterColor,
                          color: "#fff",
                          flex: 1, // 🔥 ยืดเต็ม
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          fontSize: "clamp(40px, 10vw, 200px)",
                          fontWeight: "bold",
                          borderRadius: 7,
                          overflow: "hidden",
                          height: "290px",
                        }}
                      >
                        {pickedQty}/{plan_qty}
                      </Box>
                    </Grid>

                    {/* Stock */}
                    <Grid item xs={12} sx={{ flex: 1, display: "flex" }}>
                      <Card
                        sx={{
                          height: "350px",
                          borderRadius: 7,
                          p: 3,
                          flex: 1, // 🔥 ยืดเต็ม
                          display: "flex",
                          flexDirection: "column",
                          justifyContent: "center",
                        }}
                      >
                        <Typography fontSize={40}>
                            <Box component="span" fontWeight="bold">
                                {typetwo}
                            </Box>{" "}
                            <Box component="span" fontWeight="normal">
                                Stock Item:
                            </Box>
                        </Typography>

                        <Typography fontWeight="bold" fontSize={110}>
                          {stock_item}
                        </Typography>

                        <Typography
                          fontSize={40}
                          sx={{
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                            display: "-webkit-box",
                            WebkitLineClamp: 2,
                            WebkitBoxOrient: "vertical",
                          }}
                        >
                          {item_desc}
                        </Typography>
                      </Card>
                    </Grid>
                  </Grid>
                </Grid>

                {/* 🔥 RIGHT SIDE = IMAGE (กิน 2 แถว) */}
                <Grid item xs={12} md={4} display="flex">
                  <Card
                    sx={{
                      borderRadius: 7,
                      p: 2,
                      width: "100%",
                      height: "100%", // 🔥 สำคัญมาก
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    {imageUrl ? (
                      <Box
                        component="img"
                        src={imageUrl}
                        alt="stock item image"
                        sx={{
                          width: "100%",
                          height: "100%", // 🔥 เต็ม 2 แถว
                          objectFit: "contain",
                        }}
                      />
                    ) : (
                      <Typography color="text.secondary">No image</Typography>
                    )}
                  </Card>
                </Grid>
              </Grid>
            </Grid>
          </Grid>
        </Grid>
      </Grid>
      {/* WAITING / ERROR Overlay */}
      {(status === "WAITING_PICK" || status === "ERROR") && (
        <Box
          sx={{
            position: "absolute",
            inset: 0,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 20,
            backgroundColor: "rgba(0,0,0,0.15)",
          }}
        >
          <Box
            sx={{
              width: "85%",
              height: "75%",
              backgroundColor: "#ffffff",
              borderRadius: 20,
              boxShadow: "0 15px 40px rgba(0,0,0,0.4)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <Typography
              sx={{
                fontSize: { xs: 80, md: 160, lg: 200 },
                fontWeight: "bold",
                color:
                  status === "ERROR"
                    ? "#000" // 👈 ERROR = สีดำ
                    : counterColor, // WAITING = สี counter
                letterSpacing: 6,
              }}
            >
              {status === "ERROR" ? "ERROR" : "WAITING"}
            </Typography>
          </Box>
        </Box>
      )}
    </Card>
  );
}
