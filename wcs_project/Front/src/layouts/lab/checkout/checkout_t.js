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
  // const [loading, setLoading] = useState(true);
  const [ordersList, setOrdersList] = useState([]);
  const [counters, setCounters] = useState([]);
  const [confirmDialog, setConfirmDialog] = useState(null);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [shortageStep, setShortageStep] = useState(1);

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
    // setLoading(true);
    try {
      const response = await CounterAPI.getAllOrders();
      setOrdersList(Array.isArray(response?.data) ? response.data : []);
    } catch (error) {
      console.error(error);
      setOrdersList([]);
    // } finally {
    //   setLoading(false);
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

  // const handleScan = async (row) => {
  //   try {
  //     if (!row?.order_id) throw new Error("Order not found");

  //     const counterId = row.counter_id;
  //     const planQty = Number(row.plan_qty || 0);

  //     if (!counterId || planQty <= 0) {
  //       throw new Error("Invalid counter or plan qty");
  //     }

  //     // ⭐ ยิงเต็ม plan_qty เลย
  //     const res = await CounterAPI.scanBulk(counterId, planQty);

  //     if (!res?.ok) {
  //       throw new Error(res?.message || "Scan failed");
  //     }

  //     // setAlert({
  //     //   show: true,
  //     //   type: "success",
  //     //   title: "Scanned",
  //     //   message: "Scan completed",
  //     // });

  //     await fetchDataAll();
  //     await fetchCounters();

  //   } catch (err) {
  //     console.error("handleScan error:", err);
  //     setAlert({
  //       show: true,
  //       type: "error",
  //       title: "Error",
  //       message: err.message || "Scan failed",
  //     });
  //   }
  // };

  const handleScan = async (row) => {
    try {
      if (!row?.order_id) throw new Error("Order not found");

      const counterId = row.counter_id;
      const planQty = Number(row.plan_qty || 0);
      const unitCost = Number(row.unit_cost_handled || 0);

      const counter = counters.find(
        (c) => Number(c.id) === Number(counterId)
      );

      if (!counter) throw new Error("Counter not found");

      const actual = Number(counter.actual || 0);

      let newQty;

      if (unitCost >= 500) {
        // 🔴 ราคาแพง → เพิ่มทีละ 1
        newQty = actual + 1;
      } else {
        // 🟢 ราคาถูก → ยิงเต็ม plan
        newQty = planQty;
      }

      const res = await CounterAPI.scanBulk(counterId, newQty);

      if (!res?.ok) {
        throw new Error(res?.message || "Scan failed");
      }

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

  const submitConfirm = async () => {
    try {

      const counter = counters.find(
        (c) => Number(c.id) === Number(selectedOrder.counter_id)
      );

      const actual_qty = Number(counter?.actual || 0);

      const response = await ExecutionAPI.handleOrderItemT1(
        selectedOrder.order_id,
        actual_qty
      );

      if (response.isCompleted) {

        if (
          selectedOrder.type === "TRANSFER" &&
          selectedOrder.transfer_scenario === "INTERNAL_OUT"
        ) {

          await ExecutionAPI.transferChangeStatus({
            items: [{ order_id: selectedOrder.order_id }],
            transfer_status: "PICK_SUCCESS",
          });

          await CounterAPI.counterChangeStatus({
            order_id: selectedOrder.order_id,
            status: "WAITING_AMR",
          });

        }

        if (
          selectedOrder.type === "TRANSFER" &&
          selectedOrder.transfer_scenario === "INTERNAL_IN"
        ) {

          await ExecutionAPI.transferChangeStatus({
            items: [{ order_id: selectedOrder.order_id }],
            transfer_status: "COMPLETED",
          });

        }

        setAlert({
          show: true,
          type: "success",
          title: "Confirmed",
          message: response.message,
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
        message: err.message || "Something went wrong",
      });

    } finally {

      setConfirmDialog(null);
      setSelectedOrder(null);

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
    { field: "force_manual", label: "Action", type: "forceManual" },
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
                        {/* <CounterBox
                          counter={counter}
                          onClick={() => {
                            // เปิด PickCounterPage ใหม่ พร้อม counterId
                            window.open(`/pick-counter/${counter.id}`, "_blank");
                          }}
                        /> */}
                        <CounterBox
                          counter={counter}
                          onClick={() => {
                            window.open(`/pick-counter/${counter.id}`, "_blank");
                          }}
                          onQtyChange={async (counterId, newQty) => {
                            try {
                              const res = await CounterAPI.scanBulk(counterId, newQty);

                              if (!res?.ok) {
                                throw new Error(res?.message || "Update failed");
                              }

                              await fetchCounters();
                              await fetchDataAll();

                            } catch (err) {
                              console.error(err);
                              setAlert({
                                show: true,
                                type: "error",
                                title: "Error",
                                message: "Failed to update quantity",
                              });
                            }
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
            {/* {loading ? (
              <div>Loading...</div>
            ) : ( */}
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
                  // scanSkuDisabled={(row) =>
                  //   row?.status !== "PROCESSING" ||
                  //   scannedOrderIds.has(row.order_id)
                  // }
                  scanSkuDisabled={(row) => {
                    if (row?.status !== "PROCESSING") return true;

                    const counter = counters.find(
                      (c) => Number(c.id) === Number(row.counter_id)
                    );

                    if (!counter) return true; // ⭐ กัน undefined

                    const actual = Number(counter?.actual || 0);
                    const plan = Number(counter?.plan || 0);

                    return actual >= plan;   // 🔥 disable เมื่อเต็ม plan
                  }}
                  onScanSku={(row) => handleScan(row)}

                  /* ---------------- CONFIRM ---------------- */
                  confirmSkuDisabled={(row) => {
                    if (row?.status !== "PROCESSING") return true;

                    const counter = counters.find(
                      (c) => Number(c.id) === Number(row.counter_id)
                    );

                    if (!counter) return true; // ⭐ กัน undefined

                    return Number(counter.actual || 0) <= 0;
                  }}
                // onConfirmSku={async (row) => {
                //   try {
                //     const counter = counters.find(
                //       (c) => Number(c.id) === Number(row.counter_id)
                //     );

                //     const actual_qty = Number(counter?.actual || 0);

                //     if (actual_qty <= 0) {
                //       throw new Error("Actual quantity must be greater than 0");
                //     }

                //     const response = await ExecutionAPI.handleOrderItemT1(
                //       row.order_id,
                //       actual_qty
                //     );

                //     if (response.isCompleted) {

                //       // 🔥 ยิง transferChangeStatus เฉพาะกรณีที่กำหนด
                //       if (
                //         row.type === "TRANSFER" &&
                //         row.transfer_scenario === "INTERNAL_OUT"
                //       ) {
                //         // 🔥 update transfer status
                //         await ExecutionAPI.transferChangeStatus({
                //           items: [{ order_id: row.order_id }],
                //           transfer_status: "PICK_SUCCESS",
                //         });

                //         // 🔥 NEW: update counter status
                //         await CounterAPI.counterChangeStatus({
                //           order_id: row.order_id,
                //           status: "WAITING_AMR",
                //         });
                //       }

                //       if (
                //         row.type === "TRANSFER" &&
                //         row.transfer_scenario === "INTERNAL_IN"
                //       ) {
                //         await ExecutionAPI.transferChangeStatus({
                //           items: [{ order_id: row.order_id }],
                //           transfer_status: "COMPLETED",
                //         });
                //       }

                //       setAlert({
                //         show: true,
                //         type: "success",
                //         title: "Confirmed",
                //         message: response.message,
                //       });

                //       await fetchDataAll();
                //       await fetchCounters();

                //     } else {
                //       throw new Error(response.message || "Failed");
                //     }

                //   } catch (err) {
                //     console.error(err);
                //     setAlert({
                //       show: true,
                //       type: "error",
                //       title: "Error",
                //       message: "Something went wrong",
                //     });
                //   }
                // }}
                onConfirmSku={(row) => {

                  const counter = counters.find(
                    (c) => Number(c.id) === Number(row.counter_id)
                  );

                  if (!counter) return;

                  const actualQty = Number(counter.actual || 0);
                  const planQty = Number(row.plan_qty || 0);

                  setSelectedOrder(row);
                  setShortageStep(1);

                  if (actualQty === 0) {
                    setConfirmDialog("empty");
                    return;
                  }

                  if (actualQty < planQty) {
                    setConfirmDialog("shortage");
                    return;
                  }

                  if (actualQty === planQty) {
                    setConfirmDialog("confirmExact");
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

                /* ---------------- FORCE MANUAL ---------------- */
                forceManualDisabled={(row) =>
                  row?.status !== "ERROR"
                }

                onForceManual={async (row) => {
                  try {

                    const payloadItems = [{
                      order_id: row.order_id,
                      // actual_qty: row.actual_qty || 0
                      actual_qty: Number(row.plan_qty || 0)   // 👈 ใช้ plan_qty แทน
                    }];

                    const res = await ExecutionAPI.handleErrorOrderItemT1(
                      row.event_id,   // 👈 ใช้ event_id จาก row
                      payloadItems
                    );

                    if (!res?.isCompleted) {
                      throw new Error(res?.message || "Failed");
                    }

                    setAlert({
                      show: true,
                      type: "success",
                      title: "Force Manual",
                      message: res.message || "Force manual completed",
                    });

                    await fetchDataAll();
                    await fetchCounters();

                  } catch (err) {

                    console.error(err);

                    setAlert({
                      show: true,
                      type: "error",
                      title: "Error",
                      message: err.message || "Failed to force manual",
                    });

                  }
                }}
                />
              </MDBox>
            {/* )} */}
          </MDBox>
        </Card>
      </MDBox>

{/* ================= EXACT MATCH ================= */}
{confirmDialog === "confirmExact" && (
  <SweetAlertComponent
    show={true}
    type="warning"
    title="Confirm Order"
    message="Scanned quantity equals required quantity. Confirm submission?"
    confirmText="Confirm"
    cancelText="Cancel"
    onConfirm={submitConfirm}
    onCancel={() => setConfirmDialog(null)}
  />
)}

{/* ================= SHORTAGE STEP 1 ================= */}
{confirmDialog === "shortage" && shortageStep === 1 && (
  <SweetAlertComponent
    show={true}
    type="warning"
    title="Shortage"
    message="Scanned quantity is less than required quantity. Proceed?"
    confirmText="Proceed"
    cancelText="Cancel"
    onConfirm={() => setShortageStep(2)}
    onCancel={() => {
      setConfirmDialog(null);
      setShortageStep(1);
    }}
  />
)}

{/* ================= SHORTAGE STEP 2 ================= */}
{confirmDialog === "shortage" && shortageStep === 2 && (
  <SweetAlertComponent
    show={true}
    type="warning"
    title="Shortage Warning"
    message="This will report required stock item short to the staff."
    confirmText="Confirm"
    cancelText="Cancel"
    onConfirm={() => {
      setShortageStep(1);
      submitConfirm();
    }}
    onCancel={() => {
      setConfirmDialog(null);
      setShortageStep(1);
    }}
  />
)}

{/* ================= EMPTY ================= */}
{confirmDialog === "empty" && (
  <SweetAlertComponent
    show={true}
    type="error"
    title="No Quantity"
    message="Please scan at least 1 item before confirming."
    confirmText="OK"
    onConfirm={() => setConfirmDialog(null)}
    onCancel={() => setConfirmDialog(null)}
  />
)}

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
