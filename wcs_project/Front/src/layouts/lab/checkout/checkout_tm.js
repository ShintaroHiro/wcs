import React, { useState, useEffect } from "react";
import { Card, Box, Grid } from "@mui/material";
import DashboardLayout from "examples/LayoutContainers/DashboardLayout";
import DashboardNavbar from "examples/Navbars/DashboardNavbar";
import MDBox from "components/MDBox";
import MDTypography from "components/MDTypography";
import EventsAPI from "api/EventsAPI";
import ReusableDataTable from "../components/table_component_v2";
import BlockMRS from "../components/block_mrs";
import SweetAlertComponent from "../components/sweetAlert";
import ExecutionTMAPI from "api/TaskTMAPI";
import ExecutionAPI from "api/TaskAPI";
import StatusBadge from "../components/statusBadge";
import {
  normalizeStatus,
  STATUS_STYLE,
} from "common/utils/statusUtils";

import { GlobalVar } from "common/GlobalVar";
import { getStoreTypeTrans } from "common/utils/storeTypeHelper";
import BlockAPI from "api/BlockAPI";

const CheckOutT1MPage = () => {
  // const [loading, setLoading] = useState(true);
  const [ordersList, setOrdersList] = useState([]);
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

  /* ---------------- Fetch Orders ---------------- */
  const fetchDataAll = async () => {
    // setLoading(true);
    try {
      const response = await BlockAPI.getOrderAllBlockByUser();
      setOrdersList(Array.isArray(response?.data) ? response.data : []);
    } catch (error) {
      console.error(error);
      setOrdersList([]);
    // } finally {
    //   setLoading(false);
    }
  };

  useEffect(() => {
    fetchDataAll();
  }, []);

  const handleScan = (row) => {
    setOrdersList((prev) =>
        prev.map((order) =>
        order.order_id === row.order_id
            ? { ...order, actual_qty: Number(order.plan_qty || 0) }
            : order
        )
    );
    };

    const submitConfirm = async () => {
    try {

        const actual_qty = Number(selectedOrder.actual_qty || 0);

        const response = await ExecutionTMAPI.handleOrderItemT1M(
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
    { field: "plan_qty", label: "Required Quantity" },
    { field: "actual_qty", label: "Scanned Quantity" },
    {
      field: "scan",
      label: "Scan",
      type: "scanSku",
    },
    {
      field: "mrs_id",
      label: "Block",
      minWidth: 120,
      renderCell: (value) => (
          <span
            style={{
              color: "#000",
              fontWeight: 600,
              whiteSpace: "nowrap", // ⭐ กันขึ้นบรรทัดใหม่
            }}
          >
            Block {value}
          </span>
        ),
    },
    { field: "phys_loc", label: "Physical Location(Mock)" },
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
      field: "mrs_id",
      label: "Block",
      minWidth: 120,
      renderCell: (value) => (
          <span
            style={{
              color: "#000",
              fontWeight: 600,
              whiteSpace: "nowrap", // ⭐ กันขึ้นบรรทัดใหม่
            }}
          >
            Block {value}
          </span>
        ),
    },
    { field: "phys_loc", label: "Physical Location(Mock)" },
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

    const mrsList = [
        { id: 1, status: "IDLE", aisle: "Aisle A7", image: "stock_items_image/91/S__17113092.jpg" },
        { id: 2, status: "RUNNING", mrs_location: "N1-MDR3-F5", aisle: "Aisle A6", image: "stock_items_image/92/LINE_P2026312_050016_new.jpg" },
        { id: 3, status: "IDLE", aisle: "Aisle B2", image: "stock_items_image/93/S__17113093.jpg" },
        { id: 4, status: "IDLE", aisle: "Aisle C1", image: "stock_items_image/94/S__17113094.jpg" }
    ];

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

      {/* Blocks */}
      <MDBox mt={1}>
        <MDBox mb={1} display="flex" alignItems="center">
          <MDTypography variant="h4">Status</MDTypography>
        </MDBox>
        <Grid container spacing={3}>
            {mrsList.map((mrs) => (
                <Grid item xs={6} key={mrs.id}>
                <BlockMRS mrs={mrs} />
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
                //   scanSkuDisabled={(row) => {
                //     if (row?.status !== "PROCESSING") return true;

                //     const counter = counters.find(
                //       (c) => Number(c.id) === Number(row.counter_id)
                //     );

                //     if (!counter) return true; // ⭐ กัน undefined

                //     const actual = Number(counter?.actual || 0);
                //     const plan = Number(counter?.plan || 0);

                //     return actual >= plan;   // 🔥 disable เมื่อเต็ม plan
                //   }}
                scanSkuDisabled={(row) => {
  if (row?.status !== "PROCESSING") return true;

  const actual = Number(row.actual_qty || 0);
  const plan = Number(row.plan_qty || 0);

  return actual >= plan;
}}
                onScanSku={(row) => handleScan(row)}

                  /* ---------------- CONFIRM ---------------- */
                //   confirmSkuDisabled={(row) => {
                //     if (row?.status !== "PROCESSING") return true;

                //     const counter = counters.find(
                //       (c) => Number(c.id) === Number(row.counter_id)
                //     );

                //     if (!counter) return true; // ⭐ กัน undefined

                //     return Number(counter.actual || 0) <= 0;
                //   }}
confirmSkuDisabled={(row) => {
  if (row?.status !== "PROCESSING") return true;

  const actual = Number(row.actual_qty || 0);

  return actual <= 0;
}}
                onConfirmSku={(row) => {

  const latest = ordersList.find(
    (o) => o.order_id === row.order_id
  );

  const actualQty = Number(latest?.actual_qty || 0);
  const planQty = Number(latest?.plan_qty || 0);

  setSelectedOrder(latest);
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
// errorDisabled={() => true}
                onError={async (row) => {
                  try {
                    const res = await EventsAPI.setOrderErrorTM(row.order_id);

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
// forceManualDisabled={() => true}
                onForceManual={async (row) => {
                  try {

                    const payloadItems = [{
                      order_id: row.order_id,
                      // actual_qty: row.actual_qty || 0
                      actual_qty: Number(row.plan_qty || 0)   // 👈 ใช้ plan_qty แทน
                    }];

                    const res = await ExecutionTMAPI.handleErrorOrderItemT1M(
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

export default CheckOutT1MPage;
