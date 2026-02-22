import React, { useState, useEffect } from "react";
import { Card, Box, Grid } from "@mui/material";
import DashboardLayout from "examples/LayoutContainers/DashboardLayout";
import DashboardNavbar from "examples/Navbars/DashboardNavbar";
import MDBox from "components/MDBox";
import MDTypography from "components/MDTypography";
import CounterAPI from "api/CounterAPI";
import EventsAPI from "api/EventsAPI";
import ReusableDataTable from "../components/table_component_v2";
import CounterBox from "../components/counter_box";
//import ScanQtyDialog from "../transactions/scan_qty_form";
import SweetAlertComponent from "../components/sweetAlert";
import ExecutionAPI from "api/TaskAPI";
import StatusBadge from "../components/statusBadge";
import {
  normalizeStatus,
  STATUS_STYLE,
} from "common/utils/statusUtils";

import { GlobalVar } from "common/GlobalVar";
import { getStoreTypeTrans } from "common/utils/storeTypeHelper";

const CheckOutTPage = () => {
  const [loading, setLoading] = useState(true);
  const [ordersList, setOrdersList] = useState([]);
  const [counters, setCounters] = useState([]);
  // const [selectedOrder, setSelectedOrder] = useState(null);
  // const [scanDialogOpen, setScanDialogOpen] = useState(false);
  // const [actualQty, setActualQty] = useState(0);
const [scannedOrderIds, setScannedOrderIds] = useState(new Set());

  const [alert, setAlert] = useState({
    show: false,
    type: "success",
    title: "",
    message: "",
    onConfirm: null,
  });

  const role = GlobalVar.getRole();
  const storeType = GlobalVar.getStoreType();
  const storeTypeTrans = getStoreTypeTrans(storeType);

  const FIXED_COUNTER_IDS = [1, 2, 3, 4, 5, 6];

  const createDefaultCounter = (id) => ({
    id,
    status: "IDLE",
    color: "#000",
    actual: 0,
    plan: 0,
    isActive: false,
  });

  /* ---------------- Fetch Orders ---------------- */
  const fetchDataAll = async () => {
    setLoading(true);
    try {
      const response = await CounterAPI.getAllOrders();
      setOrdersList(Array.isArray(response?.data) ? response.data : []);
    } catch (error) {
      console.error(error);
      setOrdersList([]);
    } finally {
      setLoading(false);
    }
  };

  /* ---------------- Fetch Counters ---------------- */
  const fetchCounters = async () => {
    try {
      const res = await CounterAPI.getCounterAll();
      const apiCounters = Array.isArray(res?.data) ? res.data : [];

      const mappedCounters = FIXED_COUNTER_IDS.map((counterId) => {
        const apiCounter = apiCounters.find(
          (c) => Number(c.id) === counterId || Number(c.counter_id) === counterId
        );

      const actual = Number(apiCounter?.actual_qty || 0);
      const plan = Number(apiCounter?.plan_qty || 0);

      const isActive = plan > 0 || actual > 0;

        return {
          ...createDefaultCounter(counterId),
          ...(apiCounter || {}),
          id: counterId,

          // ⭐ สี counter ใช้เมื่อ active เท่านั้น
          color: isActive ? apiCounter.color || "#000" : "#000",

          // normalize status
          status: isActive ? apiCounter.status : "IDLE",
          actual,
          plan,
          // ⭐ ส่ง flag ไปให้ CounterBox
          isActive,
        };
      });

      setCounters(mappedCounters);
    } catch (err) {
      console.error(err);
      setCounters(FIXED_COUNTER_IDS.map(createDefaultCounter));
    }
  };

  useEffect(() => {
    fetchDataAll();
    fetchCounters();
  }, []);

  const counterGroups = React.useMemo(
    () => [
      counters.filter((c) => c.id === 1 || c.id === 2),
      counters.filter((c) => c.id === 3 || c.id === 4),
      counters.filter((c) => c.id === 5 || c.id === 6),
    ],
    [counters]
  );

  const handleScan = async (row) => {
    try {
      if (!row?.order_id) throw new Error("Order not found");

      // 🔒 scan ได้ครั้งเดียว
      if (scannedOrderIds.has(row.order_id)) return;

      const counterId = row.counter_id;
      const planQty = Number(row.plan_qty || 0);

      if (!counterId || planQty <= 0) {
        throw new Error("Invalid counter or plan qty");
      }

      const res = await CounterAPI.scanBulk(counterId, planQty);

      if (!res?.ok) {
        throw new Error(res?.message || "Scan failed");
      }

      // ✅ mark ว่า order นี้ scan แล้ว
      setScannedOrderIds((prev) => {
        const next = new Set(prev);
        next.add(row.order_id);
        return next;
      });

      setAlert({
        show: true,
        type: "success",
        title: "Scanned",
        message: "Scan completed",
      });

      await fetchDataAll();
      await fetchCounters();

    } catch (err) {
      console.error("handleScan error:", err);
      setAlert({
        show: true,
        type: "error",
        title: "Error",
        message: err.message || "Scan failed",
      });
    }
  };

  /* ---------------- Table Columns By Requester ---------------- */
  const requesterColumns = [
    {
      field: "status",
      label: "Order Status",
      valueGetter: (row) => row.status,
      renderCell: (status) => (
      <StatusBadge
          value={status}
          normalize={normalizeStatus}
          styles={STATUS_STYLE}
      />
      ),
    },
    { field: "work_order", label: "Work Order" },
    { field: "spr_no", label: "SPR No." },
    { field: "usage_line", label: "Usage Line" },
    { field: "usage_num", label: "Usage No." },
    { field: "mc_code", label: "MC Code" },
    { field: "stock_item", label: "Stock Item Number" },
    { field: "item_desc", label: "Stock Item Description" },
    { field: "cond", label: "Condition" },
    { field: "unit_cost_handled", label: "Unit Cost" },
    { field: "total_cost_handled", label: "Total Cost" },
    { field: "plan_qty", label: "Required Qty" },
    { field: "actual_qty", label: "Actual Qty" },
{
  field: "scan",
  label: "Scan",
  type: "scanSku",
},
    {
      field: "counter_id",
      label: "Counter",
      renderCell: (value, row) => (
        <span style={{ color: row.counter_color || "#000", fontWeight: 600 }}>
          Counter {value}
        </span>
      ),
    },
//     {
//   field: "counter_id",
//   label: "Counter",
//   renderCell: (value, row) => {
//     const isError = row.status === "ERROR";

//     return (
//       <div style={{ display: "flex", flexDirection: "column" }}>
//         <span
//           style={{
//             color: row.counter_color || "#000",
//             fontWeight: 600,
//           }}
//         >
//           Counter {value}
//         </span>

//         {isError && (
//           <span
//             style={{
//               color: "red",
//               fontWeight: 700,
//               fontSize: "0.8rem",
//               marginTop: "2px",
//             }}
//           >
//             ERROR
//           </span>
//         )}
//       </div>
//     );
//   },
// }
  ];

  /* ---------------- Table Columns By Defualt ---------------- */
  const defaultColumns = [
    {
        field: "status",
        label: "Order Status",
        valueGetter: (row) => row.status,
        renderCell: (status) => (
        <StatusBadge
            value={status}
            normalize={normalizeStatus}
            styles={STATUS_STYLE}
        />
        ),
    },
    { field: "mc_code", label: "Maintenance Contract" },
    { field: "type", label: "Transaction Type" },
    { field: "work_order", label: "Work Order" },
    { field: "spr_no", label: "SPR No." },
    { field: "usage_num", label: "Usage No." },
    { field: "usage_line", label: "Usage Line" },
    { field: "po_num", label: "PO No." },
    { field: "object_id", label: "OBJECT ID" },
    { field: "stock_item", label: "Stock Item Number" },
    { field: "item_desc", label: "Stock Item Description" },
    { field: "cond", label: "Condition" },
    { field: "from_loc", label: "From Location" },
    { field: "from_box_loc", label: "From BIN" },
    { field: "to_loc", label: "To Location" },
    { field: "to_box_loc", label: "To BIN" },
    { field: "unit_cost_handled", label: "Unit Cost" },
    { field: "total_cost_handled", label: "Total Cost" },
    { field: "plan_qty", label: "Required Quantity" },
    { field: "actual_qty", label: "Scanned Quantity" },
    {
      field: "counter_id",
      label: "Counter",
      minWidth: 120,
      renderCell: (value, row) => (
          <span
            style={{
              color: row.counter_color || "#000",
              fontWeight: 600,
              whiteSpace: "nowrap", // ⭐ กันขึ้นบรรทัดใหม่
            }}
          >
            Counter {value}
          </span>
        ),
    },
    {
      field: "scan",
      label: "Scan",
      type: "scanSku",
    },
    { field: "is_confirm", label: "Confirm", type: "confirmSku" },
    { field: "set_error", label: "Set Error", type: "setError" },
  ];

  const columns = React.useMemo(() => {
    if (role === "REQUESTER") {
      return requesterColumns;
    }
    return defaultColumns;
  }, [role]);

  return (
    <DashboardLayout>
      <DashboardNavbar />
      <MDBox p={2}>
        <Box display="flex" alignItems="baseline" gap={1}>
          {/* storeTypeTrans + underline */}
          <Box display="inline-block">
            <MDTypography variant="h3" color="bold">
              {storeTypeTrans}
            </MDTypography>
            <Box
              sx={{
                width: "100%",
                height: "5px",
                backgroundColor: "#FFA726",
                borderRadius: "4px",
                mt: "12px",
              }}
            />
          </Box>

          {/* Check In & Out */}
          <MDTypography variant="h3" color="bold">
            - Check In & Out
          </MDTypography>
        </Box>
      </MDBox>

      {/* Counters */}
      <MDBox mt={1}>
        <MDBox mb={1} display="flex" alignItems="center">
          <MDTypography variant="h4">Counters</MDTypography>
        </MDBox>
        <Grid container spacing={6}>
          {counterGroups.map((group, index) => (
            <Grid item xs={12} md={4} key={index}>
              <Card>
                <MDBox p={3}>
                  <Grid container spacing={2} justifyContent="center">
                    {group.map((counter) => (
                      <Grid item xs={6} key={counter.id}>
                        <CounterBox
                          counter={counter}
                          onClick={() => {
                            // เปิด PickCounterPage ใหม่ พร้อม counterId
                            window.open(`/pick-counter/${counter.id}`, "_blank");
                          }}
                        />
                      </Grid>
                    ))}
                  </Grid>
                </MDBox>
              </Card>
            </Grid>
          ))}
        </Grid>
      </MDBox>

      {/* Orders Table */}
      <MDBox mt={3}>
        <MDBox mb={1} display="flex" alignItems="center">
          <MDTypography variant="h4" color="inherit">
            Orders
          </MDTypography>
        </MDBox>
        <Card>
          <MDBox p={3}>
            {loading ? (
              <div>Loading...</div>
            ) : (
              <MDBox sx={{ fontSize: "0.85rem", maxHeight: "600px", overflowY: "auto" }}>
                <ReusableDataTable
                  columns={columns}
                  rows={ordersList}
                  //disableHorizontalScroll
                  idField="order_id"
                  defaultPageSize={10}
                  pageSizeOptions={[10, 25, 50]}
                  fontSize="0.8rem"

                  /* ---------------- SCAN ---------------- */
                  scanSkuDisabled={(row) =>
                    row?.status !== "PROCESSING" ||
                    scannedOrderIds.has(row.order_id)
                  }
                  onScanSku={(row) => handleScan(row)}

                  /* ---------------- CONFIRM ---------------- */
                  confirmSkuDisabled={(row) =>
                    row?.status !== "PROCESSING" ||
                    !scannedOrderIds.has(row.order_id)
                  }
                  onConfirmSku={async (row) => {
                  try {
                    const actual_qty = row.plan_qty;

                    const response = await ExecutionAPI.handleOrderItemT1(
                      row.order_id,
                      actual_qty
                    );

                    if (response.isCompleted) {

                      // 🔥 ยิง transferChangeStatus เฉพาะกรณีที่กำหนด
                      if (
                        row.type === "TRANSFER" &&
                        row.transfer_scenario === "INTERNAL_OUT"
                      ) {
                        // 🔥 update transfer status
                        await ExecutionAPI.transferChangeStatus({
                          items: [{ order_id: row.order_id }],
                          transfer_status: "PICK_SUCCESS",
                        });

                        // 🔥 NEW: update counter status
                        await CounterAPI.counterChangeStatus({
                          order_id: row.order_id,
                          status: "WAITING_AMR",
                        });
                      }

                      if (
                        row.type === "TRANSFER" &&
                        row.transfer_scenario === "INTERNAL_IN"
                      ) {
                        await ExecutionAPI.transferChangeStatus({
                          items: [{ order_id: row.order_id }],
                          transfer_status: "COMPLETED",
                        });
                      }

                      setAlert({
                        show: true,
                        type: "success",
                        title: "Confirmed",
                        message: response.message,
                      });

                      // 🔥 ลบออกจาก scanned set
                      setScannedOrderIds((prev) => {
                        const next = new Set(prev);
                        next.delete(row.order_id);
                        return next;
                      });

                      await fetchDataAll();
                      await fetchCounters();

                    } else {
                      throw new Error(response.message || "Failed");
                    }

                  } catch (err) {
                    console.error(err);
                    setAlert({
                      show: true,
                      type: "error",
                      title: "Error",
                      message: "Something went wrong",
                    });
                  }
                }}

                /* ---------------- ERROR BUTTON ---------------- */
                errorDisabled={(row) =>
                  row?.status !== "PROCESSING"
                }
                onError={async (row) => {
                  try {
                    const res = await EventsAPI.setOrderError(row.order_id);

                    if (!res?.isCompleted) {
                      throw new Error(res?.message || "Failed");
                    }

                    setAlert({
                      show: true,
                      type: "success",
                      title: "Set Error",
                      message: res.message,
                    });

                    // 🔥 ลบออกจาก scanned set
                    setScannedOrderIds((prev) => {
                      const next = new Set(prev);
                      next.delete(row.order_id);
                      return next;
                    });

                    await fetchDataAll();
                    await fetchCounters();

                  } catch (err) {
                    console.error(err);
                    setAlert({
                      show: true,
                      type: "error",
                      title: "Error",
                      message: "Failed to set error",
                    });
                  }
                }}
                />
              </MDBox>
            )}
          </MDBox>
        </Card>
      </MDBox>

      {/* Scan Qty Dialog */}
      {/* {selectedOrder && (
        <ScanQtyDialog
          open={scanDialogOpen}
          order={selectedOrder}
          actualQty={actualQty}
          onQtyChange={setActualQty}
          onClose={() => setScanDialogOpen(false)}
          onSubmit={async (order_id, actual_qty) => {
            try {
              const response = await ExecutionAPI.handleOrderItemT1(order_id, actual_qty);
              console.log("response", response);
              if (response.isCompleted) {
                setAlert({
                  show: true,
                  type: "success",
                  title: "Confirmed",
                  message: response.message,
                });
                // โหลด Orders ใหม่
                await fetchDataAll();

                // โหลด Counters ใหม่
                await fetchCounters();
              } else {
                setAlert({
                  show: true,
                  type: "error",
                  title: "Error",
                  message: response.message || "Failed",
                });
              }
            } catch (err) {
              console.error(err);
            } finally {
              setScanDialogOpen(false);
            }
          }}
        />
      )} */}

      {/* General Alert */}
      <SweetAlertComponent
        show={alert.show}
        type={alert.type}
        title={alert.title}
        message={alert.message}
        onConfirm={() => {
          alert.onConfirm?.();
          setAlert({ ...alert, show: false });
        }}
      />
    </DashboardLayout>
  );
};

export default CheckOutTPage;
