import React, { useState, useContext } from "react";
import { Grid, Card, Typography, Box } from "@mui/material";
import { useNavigate } from "react-router-dom";
import DashboardLayout from "examples/LayoutContainers/DashboardLayout";
import DashboardNavbar from "examples/Navbars/DashboardNavbar";
import Cog from "../../../assets/images/Icon_cog.png";
import PickHome from "./index_sub";
import PutHome from "./index_sub_put";
import ReturnHome from "./index_sub_return";
import TransferHome from "./index_sub_transfer";
import InventoryHome from "./index_sub_inv";

import { GlobalVar } from "common/GlobalVar";
import { getStoreTypeTrans } from "common/utils/storeTypeHelper";
import { NotificationContext } from "context/NotificationContext";

const HomePage = () => {
  const navigate = useNavigate();

  const [openPickHome, setOpenPickHome] = useState(false);
  const [openPutHome, setOpenPutHome] = useState(false);
  const [openReturnHome, setOpenReturnHome] = useState(false);
  const [openTransferHome, setOpenTransferHome] = useState(false);
  const [openInvHome, setOpenInvHome] = useState(false);

  // รายการ Role ที่ไม่ต้องการให้แสดงเมนู
  const hiddenRoles = ["REQUESTER", "STORE"];
  const userRole = GlobalVar.getRole(); // ดึง Role ของผู้ใช้
  const storeType = GlobalVar.getStoreType();
  const storeTypeTrans = getStoreTypeTrans(storeType);

  const { isError } = useContext(NotificationContext);

  const checkoutPathMap = {
    T1: "/checkout-t1",
    T1M: "/checkout-t1m",
    AGMB: "/checkout-agmb",
  };

  const checkoutPath = checkoutPathMap[storeType];

  // menu_route
  const menuItems = [
    { title: "T1M", path: "/store/tm-store" },
    { title: "T1", path: "/store/t-store" },
    { title: "Orders", path: "/order/list" },
    { title: "Pick", path: "/transactions/usage" },
    { title: "Put", path: "/transactions/receipt" },
    { title: "Transfer", path: "/transactions/transfer" },
    { title: "Order History", path: "/transactions/order" },
    { title: "Emergency Alert(s)", path: "/emergency" },
    { title: "Pick-req", path: "/pick/execute-requester" },
    { title: "Pick", path: "/pick/execute" },
    { title: "Status-req", path: "/status-requester" },
    { title: "Status", path: "/status" },
    // ✅ แสดงเฉพาะ WCS
    ...(storeType === "WCS" ? [
      { title: "Inventory", path: "/inventory" },
      {title: "History", path: "/events"}
    ] : []),
    //แสดงทุกคลัง
    ...(checkoutPath
    ? [{ title: "Check In & Out", path: checkoutPath }]
    : []),
    { title: "Put", path: "/put/execute" },
    { title: "Return", path: "/return/execute" },
    { title: "Transfer", path: "/transfer/execute" },
  ];

  //menu_route
  const Requester = [
    { title: "Pick", path: "/pick/execute-requester" },
    { title: "Status", path: "/status-requester" },
    ...(checkoutPath
    ? [{ title: "Check In & Out", path: checkoutPath }]
    : []),
  ];

  //menu_route
  const Store = [
    { title: "Pick", path: "/pick" },
    { title: "Put", path: "/put" },
    { title: "Return", path: "/return" },
    { title: "Transfer", path: "/transfer" },
    { title: "Status", path: "/status" },
    { title: "Inventory", path: "/inventory" },
    {title: "History", path: "/events"},
    ...(checkoutPath
    ? [{ title: "Check In & Out", path: checkoutPath }]
    : []),
    // ✅ แสดงเฉพาะ WCS
    // ...(storeType === "WCS" ? [
    //   { title: "Inventory", path: "/inventory" },
    //   {title: "History", path: "/events"}
    // ] : []),
  ];

  // 🧠 Logic เพื่อเลือกเมนูตาม Role
  let roleMenu = [];

  if (userRole === "REQUESTER") {
    roleMenu = Requester;
  } else if (userRole === "STORE") {
    roleMenu = Store;
  } else if (!hiddenRoles.includes(userRole)) {
    roleMenu = menuItems;
  }

  // ❌ ปิด Check In & Out เมื่อเป็น WCS
  if (storeType === "WCS") {
    roleMenu = roleMenu.filter((item) => item.title !== "Check In & Out");
  }

  // 🔁 แทนที่ส่วน return เก่า ด้วยโค้ดนี้
  return (
    <DashboardLayout>
      <DashboardNavbar />
      <Box>
        {openPickHome ? (
          <PickHome />
        ) : openPutHome ? (
          <PutHome />
        ) : openReturnHome ? (
          <ReturnHome />
        ) : openTransferHome ? (
          <TransferHome />
        ) : openInvHome ? (
          <InventoryHome />
        ) : (
          <>
            {/* ===== Header Home ===== */}
            <Box p={2}>
              <Box display="inline-block">
                <Typography variant="h3" fontWeight="bold" gutterBottom>
                  {storeTypeTrans}
                </Typography>
                <Box
                  sx={{
                    width: "100%",
                    height: "5px",
                    backgroundColor: "#FFA726",
                    borderRadius: "4px",
                  }}
                />
              </Box>
            </Box>

            {/* ===== Menu Home ===== */}
            <Box mt={1}>
              <Grid container spacing={4}>
                {roleMenu.map((item, index) => (
                  <Grid item xs={12} sm={6} md={3} key={index}>
                    <Box position="relative">
                      <Card
                        onClick={() => {
                          if (item.title === "Pick" && userRole === "STORE") {
                            setOpenPickHome(true); // 👈 สำคัญ
                          } else if (item.title === "Put" && userRole === "STORE") {
                            setOpenPutHome(true); // 👈 สำคัญ
                          } else if (item.title === "Return" && userRole === "STORE") {
                            setOpenReturnHome(true); // 👈 สำคัญ
                          } else if (item.title === "Transfer" && userRole === "STORE") {
                            setOpenTransferHome(true); // 👈 สำคัญ
                          } else if (item.title === "Inventory" && userRole === "STORE") {
                            setOpenInvHome(true); // 👈 สำคัญ
                          } else {
                            navigate(item.path);
                          }
                        }}
                        sx={{
                          cursor: "pointer",
                          display: "flex",
                          flexDirection: "column",
                          alignItems: "center",
                          justifyContent: "center",
                          padding: 2,
                          height: "200px",
                          width: "100%",
                          borderRadius: "26px",
                          boxShadow: "0px 4px 10px rgba(0, 0, 0, 0.1)",
                          "&:hover": {
                            boxShadow: "0px 6px 15px rgba(0, 0, 0, 0.2)",
                            transform: "scale(1.05)",
                            transition: "all 0.3s ease",
                          },
                        }}
                      >
                        <Box
                          component="img"
                          src={Cog}
                          alt="Menu Icon"
                          sx={{ width: "100px", height: "100px", marginBottom: 1 }}
                        />
                        <Typography variant="h5">{item.title}</Typography>
                      </Card>
                        {item.title === "History" && isError && (
                          <Box
                            sx={{
                              position: "absolute",
                              top: 10,
                              right: 20,
                              width: 30,
                              height: 30,
                              backgroundColor: "red",
                              borderRadius: "50%",
                              border: "2px solid white",
                            }}
                          />
                        )}
                    </Box>
                  </Grid>
                ))}
              </Grid>
            </Box>
          </>
        )}
      </Box>
    </DashboardLayout>
  );
};

export default HomePage;
