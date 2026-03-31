import React, { useState, useEffect } from "react";
import { Grid, Card, IconButton, InputAdornment, FormControl, Dialog, DialogTitle, DialogContent, DialogActions } from "@mui/material";
import CalendarMonthIcon from "@mui/icons-material/CalendarMonth";
//import AccessTimeIcon from "@mui/icons-material/AccessTime";
import MDBox from "components/MDBox";
import MDTypography from "components/MDTypography";
import MDInput from "components/MDInput";
import ReusableDataTable from "../components/table_component_v2";
import DashboardLayout from "examples/LayoutContainers/DashboardLayout";
import DashboardNavbar from "examples/Navbars/DashboardNavbar";
import OrdersAPI from "api/OrdersAPI";
import ExecutionAPI from "api/TaskAPI";
import SweetAlertComponent from "../components/sweetAlert";
import { useNavigate } from "react-router-dom";
import MDButton from "components/MDButton";
import { StyledMenuItem, StyledSelect } from "common/Global.style";
import { OrderStatusNoFinish } from "common/dataMain";
import SearchIcon from "@mui/icons-material/Search";
import { GlobalVar } from "common/GlobalVar";
import StatusBadge from "../components/statusBadge";
import {
  normalizeStatus,
  STATUS_STYLE,
} from "common/utils/statusUtils";
import dayjs from "dayjs";

//requester
const PickExecutionReqPage = () => {
  const [waitingList, setWaitingList] = useState([]);
  const [executionList, setExecutionList] = useState([]);

  const [filteredWaiting, setFilteredWaiting] = useState([]);
  const [filteredExecution, setFilteredExecution] = useState([]);

  const [openAdvanceWaiting, setOpenAdvanceWaiting] = useState(false);
  const [openAdvanceExecution, setOpenAdvanceExecution] = useState(false);

  const [searchWaiting, setSearchWaiting] = useState({ 
    date: "", 
    spr_no: "", 
    work_order: "",
    usage_num: "", 
    usage_line: "",
    stock_item: "", 
    item_desc: "",
  });
  const [searchExecution, setSearchExecution] = useState({ 
    date: "", 
    spr_no: "", 
    work_order: "",
    usage_num: "", 
    usage_line: "",
    status: "",
    stock_item: "", 
    item_desc: "",
  });

  //Dialog
  const handleClearAdvancedWaiting = () => {
      setSearchWaiting({
        date: "", 
        spr_no: "", 
        work_order: "",
        usage_num: "", 
        usage_line: "",
        stock_item: "", 
        item_desc: "",
      });
  };

  const handleClearAdvancedExecution = () => {
      setSearchExecution({
        date: "", 
        spr_no: "", 
        work_order: "",
        usage_num: "", 
        usage_line: "",
        status: "",
        stock_item: "", 
        item_desc: "",
      });

      setFilterStatusExecution("");
  };

  const [selectedWaitingIds, setSelectedWaitingIds] = useState([]);
  const [selectedExecutionIds, setSelectedExecutionIds] = useState([]);

  const [loading, setLoading] = useState(false);

  const [confirmAlert, setConfirmAlert] = useState(false);
  const [confirmAction, setConfirmAction] = useState(null);
  const [confirmMessage, setConfirmMessage] = useState("");

  const [alert, setAlert] = useState({
    show: false,
    type: "success",
    title: "",
    message: "",
    onConfirm: null,
  });

  // Filter
  const [filterStatusExecution, setFilterStatusExecution] = useState("");

  const navigate = useNavigate();

  const [overdueChecked, setOverdueChecked] = useState(false);
  
  // ดึงจาก localStorage 
  const mcCodes = GlobalVar.getMcCodes(); 
  //const storeType = GlobalVar.getStoreType();

  // --------------------------------------------------
  // FETCH API
  // --------------------------------------------------
  const fetchDataWaitingAll = async () => {
    setLoading(true);
    try {
      const response = await OrdersAPI.OrdersUsageAll({
        isExecution: true,
        mc_code: mcCodes,
        //store_type: storeType === "WCS" ? undefined : storeType,
      });
      const list = Array.isArray(response?.data) ? response.data : [];
      setWaitingList(list);
    } catch (err) {
      console.error(err);
      setWaitingList([]);
    } finally {
      setLoading(false);
    }
  };

  const fetchDataExecuteAll = async () => {
    setLoading(true);
    try {
      const response = await OrdersAPI.OrdersUsageAll({
        isExecution: false,
        mc_code: mcCodes,
        //store_type: storeType === "WCS" ? undefined : storeType,
      });
      const list = Array.isArray(response?.data) ? response.data : [];
      setExecutionList(list);
    } catch (err) {
      console.error(err);
      setExecutionList([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDataWaitingAll();
    fetchDataExecuteAll();
  }, []);

  //order ที่มากกว่า 10 วัน
    useEffect(() => {
        if (overdueChecked) return;
        if (!waitingList || waitingList.length === 0) return;

        const overdueOrders = waitingList.filter((row) =>
            isOverdue(row.requested_at)
        );

        if (overdueOrders.length > 0) {
            setAlert({
                show: true,
                type: "warning",
                title: "Unprocessed Orders",
                message: `${overdueOrders.length} orders remain unprocessed for over 10 days.`,
            });
        }

        setOverdueChecked(true);
    }, [waitingList]);

  //ฟังก์ชัน พิมพ์เล็ก / ใหญ่ , รองรับ number, null, undefined , trim
  const includesIgnoreCase = (value, search) => {
      if (!search) return true; // ถ้าไม่ได้พิมพ์อะไร = ผ่าน
      return String(value ?? "")
          .toLowerCase()
          .trim()
          .includes(String(search).toLowerCase().trim());
  };

  // --------------------------------------------------
  // FILTER WAITING LIST
  // --------------------------------------------------
  useEffect(() => {
    const filtered = waitingList.filter(
      (item) =>
        (item.requested_at || "").includes(searchWaiting.date) &&
        (item.work_order || "").includes(searchWaiting.work_order) &&
        (item.spr_no || "").includes(searchWaiting.spr_no) &&
        (item.usage_num || "").includes(searchWaiting.usage_num) &&
        (item.usage_line || "").includes(searchWaiting.usage_line) &&
        (item.stock_item || "").includes(searchWaiting.stock_item) &&
        (item.item_desc || "").includes(searchWaiting.item_desc)
    );
    setFilteredWaiting(filtered);
  }, [waitingList, searchWaiting]);

  // --------------------------------------------------
  // FILTER EXECUTION LIST
  // --------------------------------------------------
  useEffect(() => {
    const filtered = executionList.filter(
      (item) =>
        includesIgnoreCase(item.requested_at, searchExecution.date) &&
        includesIgnoreCase(item.work_order, searchExecution.work_order) &&
        includesIgnoreCase(item.spr_no, searchExecution.spr_no) &&
        includesIgnoreCase(item.usage_num, searchExecution.usage_num) &&
        includesIgnoreCase(item.usage_line, searchExecution.usage_line) &&
        (
          filterStatusExecution === "" ||
          normalizeStatus(item.status) === filterStatusExecution
        ) &&
        includesIgnoreCase(item.stock_item, searchExecution.stock_item) &&
        includesIgnoreCase(item.item_desc, searchExecution.item_desc)
    );
    setFilteredExecution(filtered);
  }, [executionList, searchExecution, filterStatusExecution]);

  // --------------------------------------------------
  // MOVE TO EXECUTION -> Go TO PENDING
  // --------------------------------------------------
  const handleMoveToExecution = async () => {
    if (selectedWaitingIds.length === 0) return;

    try {
      const payload = {
        items: selectedWaitingIds.map(id => ({ order_id: id }))
      };

      await ExecutionAPI.changeToPending(payload);

      await Promise.all([fetchDataWaitingAll(), fetchDataExecuteAll()]);
      setSelectedWaitingIds([]);

      setAlert({
        show: true,
        type: "success",
        title: "Success",
        message: "Moved to Execution",
      });
    } catch (err) {
      console.error(err);
      setAlert({
        show: true,
        type: "error",
        title: "Error",
        message: err.response?.data?.message || "Something went wrong",
      });
    }
  };

  // --------------------------------------------------
  // DELETE EXECUTION -> BACK TO WAITING
  // --------------------------------------------------
  const handleDeleteTask = async () => {
    if (selectedExecutionIds.length === 0) return;

    try {
      const payload = {
        items: selectedExecutionIds.map(id => ({ order_id: id }))
      };

      await ExecutionAPI.changeToWaiting(payload);

      await Promise.all([fetchDataWaitingAll(), fetchDataExecuteAll()]);
      setSelectedExecutionIds([]);

      setAlert({
        show: true,
        type: "success",
        title: "Success",
        message: "Moved back to Waiting",
      });
    } catch (err) {
      console.error(err);
      setAlert({
        show: true,
        type: "error",
        title: "Error",
        message: err.response?.data?.message || "Something went wrong",
      });
    }
  };

  // --------------------------------------------------
  // ALL Go TO PROCESSING
  // --------------------------------------------------
  const handleConfirm = async () => {
    if (selectedExecutionIds.length === 0) return;

    try {
      const payload = {
        items: selectedExecutionIds.map(id => ({ order_id: id }))
      };

      const res = await ExecutionAPI.createTask(payload);

      await Promise.all([
        fetchDataWaitingAll(),
        fetchDataExecuteAll(),
      ]);

      setSelectedExecutionIds([]);

      if (res?.isCompleted) {
        setAlert({
          show: true,
          type: "success",
          title: "Success",
          message: res.message || "Confirm success",
          onConfirm: () => {
            navigate("/status-requester");
          },
        });
        return;
      }

      setAlert({
        show: true,
        type: "success",
        title: "Success",
        message: "Confirm to Execution",
      });
    } catch (err) {
      console.error(err);
      setAlert({
        show: true,
        type: "error",
        title: "Error",
        message: err.response?.data?.message || "Something went wrong",
      });
    }
  };


  // --------------------------------------------------
  // CLEAR ALL PENDING -> BACK TO WAITING
  // --------------------------------------------------

  const getPendingOrderIds = () => {
    return executionList
      .filter(r => r.status === "PENDING")
      .map(r => r.order_id);
  };

  const handleClear = async () => {
    const pendingIds = getPendingOrderIds();
    if (pendingIds.length === 0) return;

    try {
      const payload = {
        items: pendingIds.map(id => ({ order_id: id })),
      };

      await ExecutionAPI.changeToWaiting(payload);

      await Promise.all([
        fetchDataWaitingAll(),
        fetchDataExecuteAll(),
      ]);

      setSelectedExecutionIds([]);

      setAlert({
        show: true,
        type: "success",
        title: "Success",
        message: "Clear Pending success",
      });
    } catch (err) {
      console.error(err);
      setAlert({
        show: true,
        type: "error",
        title: "Error",
        message: err.response?.data?.message || "Something went wrong",
      });
    }
  };

  const isOverdue = (date) => {
      if (!date) return false;

      const today = dayjs();
      const req = dayjs(date, "DD/MM/YYYY");

      return today.diff(req, "day") >= 10;
  };

  // --------------------------------------------------
  // TABLE COLUMNS
  // --------------------------------------------------
  const columnsWaiting = [
    { field: "mc_code", label: "Maintenance Contract" },
    { field: "spr_no", label: "SPR No." },
    { field: "work_order", label: "Work Order" },
    { field: "usage_num", label: "Usage No." },
    { field: "usage_line", label: "Usage Line" },
    { field: "requested_at", label: "Date" },
    { field: "stock_item", label: "Stock Item Number" },
    { field: "item_desc", label: "Stock Item Description" },
    { field: "cond", label: "Condition" },
    // { field: "loc", label: "From Location" },
    // { field: "box_loc", label: "From Box Location" },
    { field: "plan_qty", label: "Required Quantity" },
  ];

  const columnsExecute = [
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
    { field: "spr_no", label: "SPR No." },
    { field: "work_order", label: "Work Order" },
    { field: "usage_num", label: "Usage No." },
    { field: "usage_line", label: "Usage Line" },
    { field: "requested_at", label: "Date" },
    { field: "stock_item", label: "Stock Item Number" },
    { field: "item_desc", label: "Stock Item Description" },
    { field: "cond", label: "Condition" },
    // { field: "loc", label: "From Location" },
    // { field: "box_loc", label: "From Box Location" },
    { field: "plan_qty", label: "Required Quantity" }
  ];

  const isMoveDisabled = selectedWaitingIds.length === 0 || loading;
  const isDeleteDisabled = selectedExecutionIds.length === 0 || loading;

  // --------------------------------------------------
  // RENDER
  // --------------------------------------------------
  return (
    <DashboardLayout>
      <DashboardNavbar />
        <MDBox
          p={2}
          display="flex"
          alignItems="stretch"
          >
          {/* 🔵 ซ้าย : Title */}
          <MDBox
              flex={1}
              display="flex"
              alignItems="center"
          >
              <MDTypography variant="h3" color="inherit">
              Pick - Waiting and Execution List - Requester
              </MDTypography>
          </MDBox>

          {/* 🟠 ขวา : ปุ่ม (แบ่งบน / ล่าง) */}
          <MDBox
              flex={1}
              display="flex"
              flexDirection="column"
              justifyContent="space-between"
              alignItems="flex-end"
              gap={2}
          >
              {/* ครึ่งบน : Confirm */}
              <MDButton
              variant="contained"
              color="info"
              onClick={() => {
                  setConfirmMessage("Are you sure you want to confirm orders?");
                  setConfirmAction(() => handleConfirm);
                  setConfirmAlert(true);
              }}
              disabled={selectedExecutionIds.length === 0 || loading}
              >
              Confirm
              </MDButton>

              {/* ครึ่งล่าง : Clear */}
              <MDButton
              variant="contained"
              color="secondary"
              onClick={() => {
                  setConfirmMessage("Are you sure you want to clear all pending?");
                  setConfirmAction(() => handleClear);
                  setConfirmAlert(true);
              }}
              >
              Clear Pending
              </MDButton>
          </MDBox>
          </MDBox>

      <MDBox mt={1}>
        <Grid container spacing={1.5}>
{/* --------------------------------------------------
    LEFT: WAITING LIST
--------------------------------------------------- */}
          <Grid item xs={12} md={5.6}>
            <Card sx={{ p: 2, display: "flex", flexDirection: "column", minHeight: "500px" }}>
              <MDBox display="flex" justifyContent="space-between" alignItems="center">
                <MDTypography variant="h5">
                    Pick - Waiting List
                </MDTypography>

                <MDButton
                    variant="contained"
                    color="info"
                    onClick={() => setOpenAdvanceWaiting(true)}
                >
                    Advance Search
                </MDButton>
            </MDBox>

            {/* Filters*/}
            <Grid container spacing={2} mb={2} mt={0.1}>
              {/* Date */}
              <Grid item xs={12} md={4}>
                <MDTypography variant="h6">Date</MDTypography>
                <MDInput
                  placeholder="dd/mm/yyyy"
                  value={searchWaiting.date}
                  onChange={(e) =>
                    setSearchWaiting({ ...searchWaiting, date: e.target.value })
                  }
                  InputProps={{
                    endAdornment: (
                      <InputAdornment position="end">
                        <CalendarMonthIcon fontSize="small" />
                      </InputAdornment>
                    ),
                  }}
                  fullWidth
                  sx={{ height: "45px" }}
                />
              </Grid>

              {/* Stock Item No. */}
                <Grid item xs={12} md={4}>
                  <MDTypography variant="h6">Stock Item No.</MDTypography>
                  <MDInput
                    placeholder="Text Field"
                    sx={{ height: "45px" }}
                    value={searchWaiting.stock_item}
                    onChange={(e) =>
                      setSearchWaiting({ ...searchWaiting, stock_item: e.target.value })
                    }
                    displayEmpty
                    InputProps={{
                      endAdornment: (
                          <InputAdornment position="end">
                              <SearchIcon />
                          </InputAdornment>
                      ),
                    }}
                    fullWidth
                  />
                </Grid>

              {/* Usage No. */}
              <Grid item xs={12} md={4}>
                <MDTypography variant="h6">Usage No.</MDTypography>
                <MDInput
                  placeholder="Text Field"
                  sx={{ height: "45px" }}
                  value={searchWaiting.usage_num}
                  onChange={(e) =>
                    setSearchWaiting({ ...searchWaiting, usage_num: e.target.value })
                  }
                  displayEmpty
                  InputProps={{
                    endAdornment: (
                        <InputAdornment position="end">
                            <SearchIcon />
                        </InputAdornment>
                    ),
                  }}
                  fullWidth
                />
              </Grid>
            </Grid>

            <Dialog
              open={openAdvanceWaiting}
              onClose={() => setOpenAdvanceWaiting(false)}
              maxWidth="md"
              fullWidth
              sx={{
                  "& .MuiDialog-paper": {
                  p: 2,
                  borderRadius: 5,
                  },
              }}
            >
            <DialogTitle>Advanced Search - Waiting List</DialogTitle>

            <DialogContent>
                {/* Dialog*/}
                <Grid container spacing={2}>

                  {/* Work Order */}
                  <Grid item xs={12} md={6}>
                    <MDTypography variant="h6">Work Order</MDTypography>
                    <MDInput
                      placeholder="Text Field"
                      sx={{ height: "45px" }}
                      value={searchWaiting.work_order}
                      onChange={(e) =>
                        setSearchWaiting({ ...searchWaiting, work_order: e.target.value })
                      }
                      displayEmpty
                      InputProps={{
                        endAdornment: (
                            <InputAdornment position="end">
                                <SearchIcon />
                            </InputAdornment>
                        ),
                      }}
                      fullWidth
                    />
                  </Grid>

                  {/* SPR No. */}
                  <Grid item xs={12} md={6}>
                    <MDTypography variant="h6">SPR No.</MDTypography>
                    <MDInput
                      placeholder="Text Field"
                      sx={{ height: "45px" }}
                      value={searchWaiting.spr_no}
                      onChange={(e) =>
                        setSearchWaiting({ ...searchWaiting, spr_no: e.target.value })
                      }
                      displayEmpty
                      InputProps={{
                        endAdornment: (
                            <InputAdornment position="end">
                                <SearchIcon />
                            </InputAdornment>
                        ),
                      }}
                      fullWidth
                    />
                  </Grid>

                  {/* Usage Line */}
                  <Grid item xs={12} md={6}>
                    <MDTypography variant="h6">Usage Line</MDTypography>
                    <MDInput
                      placeholder="Text Field"
                      sx={{ height: "45px" }}
                      value={searchWaiting.usage_line}
                      onChange={(e) =>
                        setSearchWaiting({ ...searchWaiting, usage_line: e.target.value })
                      }
                      displayEmpty
                      InputProps={{
                        endAdornment: (
                            <InputAdornment position="end">
                                <SearchIcon />
                            </InputAdornment>
                        ),
                      }}
                      fullWidth
                    />
                  </Grid> 

                  {/* Stock Item Description */}
                  <Grid item xs={12} md={6}>
                    <MDTypography variant="h6">Stock Item Description</MDTypography>
                    <MDInput
                      placeholder="Text Field"
                      sx={{ height: "45px" }}
                      value={searchWaiting.item_desc}
                      onChange={(e) =>
                        setSearchWaiting({ ...searchWaiting, item_desc: e.target.value })
                      }
                      displayEmpty
                      InputProps={{
                        endAdornment: (
                            <InputAdornment position="end">
                                <SearchIcon />
                            </InputAdornment>
                        ),
                      }}
                      fullWidth
                    />
                  </Grid>
              </Grid>
            </DialogContent>

                <DialogActions>
                    <MDButton color="secondary" onClick={handleClearAdvancedWaiting}>
                        Clear
                    </MDButton>

                    {/* <MDButton color="secondary" onClick={() => setOpenAdvanceWaiting(false)}>
                        Cancel
                    </MDButton> */}
                </DialogActions>
            </Dialog>

              {/* Table */}
              <MDBox sx={{ fontSize: "0.85rem", maxHeight: "600px", overflowY: "auto" }}>
                <ReusableDataTable
                  columns={columnsWaiting}
                  rows={filteredWaiting}
                  //disableHorizontalScroll
                  idField="order_id"
                  getRowStyle={(row) =>
                        isOverdue(row.requested_at)
                        ? { backgroundColor: "#f1c8a5" }
                        : {}
                    }
                  enableSelection={true}              // ⭐ เปิด checkbox
                  selectedRows={selectedWaitingIds}   // ⭐ รายการที่เลือก
                  onSelectedRowsChange={setSelectedWaitingIds} // ⭐ callback
                  fontSize="0.8rem"
                  autoHeight
                />
              </MDBox>
            </Card>
          </Grid>

{/* --------------------------------------------------
    MIDDLE BUTTONS ( +  - )
--------------------------------------------------- */}
          <Grid
            item
            xs={12}
            md={0.8}
            container
            direction="column"
            alignItems="center"
            justifyContent="center"
            sx={{ gap: 7 }}
        >
            {/* + Button */}
            <IconButton
                onClick={handleMoveToExecution}
                disabled={isMoveDisabled}
                sx={{
                    width: "100%",        // 🔥 เต็ม column
                    aspectRatio: "2 / 1", // 🔥 คุมทรงลูกศร
                    maxWidth: 160,        // 🔥 กันใหญ่เกิน
                }}
                >
                <svg
                    width="100%"
                    height="100%"
                    viewBox="0 0 200 100"
                    preserveAspectRatio="xMidYMid meet"
                >
                    <polygon
                    points="20,15 95,15 95,0 180,50 95,100 95,85 20,85"
                    fill={isMoveDisabled ? "#bdbdbd" : "#00FF00"}
                    />
                </svg>
            </IconButton>

            {/* - Button */}
            <IconButton
                onClick={handleDeleteTask}
                disabled={isDeleteDisabled}
                sx={{
                    width: "100%",
                    aspectRatio: "2 / 1",
                    maxWidth: 160,
                }}
                >
                <svg
                    width="100%"
                    height="100%"
                    viewBox="0 0 200 100"
                    preserveAspectRatio="xMidYMid meet"
                >
                    <polygon
                    points="180,15 105,15 105,0 20,50 105,100 105,85 180,85"
                    fill={isDeleteDisabled ? "#bdbdbd" : "#FF0000"} // 🔥 ตรงนี้
                    />
                </svg>
            </IconButton>
          </Grid>

{/* --------------------------------------------------
    RIGHT: EXECUTION LIST
--------------------------------------------------- */}
          <Grid item xs={12} md={5.6}>
            <Card sx={{ p: 2, display: "flex", flexDirection: "column", minHeight: "500px" }}>
              <MDBox display="flex" justifyContent="space-between" alignItems="center">
                <MDTypography variant="h5">
                    Pick - Execution List
                </MDTypography>

                <MDButton
                    variant="contained"
                    color="info"
                    onClick={() => setOpenAdvanceExecution(true)}
                >
                    Advance Search
                </MDButton>
            </MDBox>

            {/* Filters */}
            <Grid container spacing={2} mb={2} mt={0.1} >
              {/* Date */}
              <Grid item xs={12} md={4}>
                <MDTypography variant="h6">Date</MDTypography>
                <MDInput
                  placeholder="Calendar"
                  value={searchExecution.date}
                  onChange={(e) =>
                    setSearchExecution({ ...searchExecution, date: e.target.value })
                  }
                  InputProps={{
                    endAdornment: (
                      <InputAdornment position="end">
                        <CalendarMonthIcon fontSize="small" />
                      </InputAdornment>
                    ),
                  }}
                  fullWidth
                  sx={{ height: "45px" }}
                />
              </Grid>

              {/* Stock Item No. */}
              <Grid item xs={12} md={4}>
                <MDTypography variant="h6">Stock Item No.</MDTypography>
                <MDInput
                  placeholder="Text Field"
                  sx={{ height: "45px" }}
                  value={searchExecution.stock_item}
                  onChange={(e) =>
                    setSearchExecution({ ...searchExecution, stock_item: e.target.value })
                  }
                  displayEmpty
                  InputProps={{
                    endAdornment: (
                        <InputAdornment position="end">
                            <SearchIcon />
                        </InputAdornment>
                    ),
                  }}
                  fullWidth
                />
              </Grid>

              {/* Usage No. */}
              <Grid item xs={12} md={4}>
                <MDTypography variant="h6">Usage No.</MDTypography>
                <MDInput
                  placeholder="Text Field"
                  sx={{ height: "45px" }}
                  value={searchExecution.usage_num}
                  onChange={(e) =>
                    setSearchExecution({ ...searchExecution, usage_num: e.target.value })
                  }
                  displayEmpty
                  InputProps={{
                    endAdornment: (
                        <InputAdornment position="end">
                            <SearchIcon />
                        </InputAdornment>
                    ),
                  }}
                  fullWidth
                />
              </Grid>
            </Grid>

          <Dialog
            open={openAdvanceExecution}
            onClose={() => setOpenAdvanceExecution(false)}
            maxWidth="md"
            fullWidth
            sx={{
                "& .MuiDialog-paper": {
                p: 2,
                borderRadius: 5,
                },
            }}
        >
            <DialogTitle>Advanced Search - Execution List</DialogTitle>

            <DialogContent>
                {/* Dialog */}
                <Grid container spacing={2}>

                  {/* Work Order */}
                  <Grid item xs={12} md={6}>
                    <MDTypography variant="h6">Work Order</MDTypography>
                    <MDInput
                      placeholder="Text Field"
                      sx={{ height: "45px" }}
                      value={searchExecution.work_order}
                      onChange={(e) =>
                        setSearchExecution({ ...searchExecution, work_order: e.target.value })
                      }
                      displayEmpty
                      InputProps={{
                        endAdornment: (
                            <InputAdornment position="end">
                                <SearchIcon />
                            </InputAdornment>
                        ),
                      }}
                      fullWidth
                    />
                  </Grid>

                  {/* SPR No. */}
                  <Grid item xs={12} md={6}>
                    <MDTypography variant="h6">SPR No.</MDTypography>
                    <MDInput
                      placeholder="Text Field"
                      sx={{ height: "45px" }}
                      value={searchExecution.spr_no}
                      onChange={(e) =>
                        setSearchExecution({ ...searchExecution, spr_no: e.target.value })
                      }
                      displayEmpty
                      InputProps={{
                        endAdornment: (
                            <InputAdornment position="end">
                                <SearchIcon />
                            </InputAdornment>
                        ),
                      }}
                      fullWidth
                    />
                  </Grid>

                  {/* Usage Line */}
                  <Grid item xs={12} md={6}>
                    <MDTypography variant="h6">Usage Line</MDTypography>
                    <MDInput
                      placeholder="Text Field"
                      sx={{ height: "45px" }}
                      value={searchExecution.usage_line}
                      onChange={(e) =>
                        setSearchExecution({ ...searchExecution, usage_line: e.target.value })
                      }
                      displayEmpty
                      InputProps={{
                        endAdornment: (
                            <InputAdornment position="end">
                                <SearchIcon />
                            </InputAdornment>
                        ),
                      }}
                      fullWidth
                    />
                  </Grid>

                  {/* Stock Item Description */}
                  <Grid item xs={12} md={6}>
                    <MDTypography variant="h6">Stock Item Description</MDTypography>
                    <MDInput
                      placeholder="Text Field"
                      sx={{ height: "45px" }}
                      value={searchExecution.item_desc}
                      onChange={(e) =>
                        setSearchExecution({ ...searchExecution, item_desc: e.target.value })
                      }
                      displayEmpty
                      InputProps={{
                        endAdornment: (
                            <InputAdornment position="end">
                                <SearchIcon />
                            </InputAdornment>
                        ),
                      }}
                      fullWidth
                    />
                  </Grid>

                  {/* Order Status */}
                  <Grid item xs={12} md={6}>
                  <MDTypography variant="h6">Order Status</MDTypography>
                      <FormControl fullWidth>
                      <StyledSelect
                          sx={{ height: "45px" }}
                          name="filterStatusExecution"
                          value={filterStatusExecution}
                          onChange={(e) => setFilterStatusExecution(e.target.value)}
                          displayEmpty
                      >
                          <StyledMenuItem value="">Pull Down List</StyledMenuItem>

                          {OrderStatusNoFinish.map((t) => (
                          <StyledMenuItem key={t.value} value={t.value}>
                              {t.text}
                          </StyledMenuItem>
                          ))}
                      </StyledSelect>
                      </FormControl>
                  </Grid>
                </Grid>
              </DialogContent>

              <DialogActions>
                  <MDButton color="secondary" onClick={handleClearAdvancedExecution}>
                      Clear
                  </MDButton>

                  {/* <MDButton onClick={() => setOpenAdvanceExecution(false)}>
                      Cancel
                  </MDButton> */}
              </DialogActions>
          </Dialog>

              {/* Table */}
              <MDBox sx={{ fontSize: "0.85rem", maxHeight: "600px", overflowY: "auto" }}>
                <ReusableDataTable
                  columns={columnsExecute}
                  rows={filteredExecution}
                  //disableHorizontalScroll
                  idField="order_id"
                  enableSelection={true}              // ⭐ เปิด checkbox
                  selectedRows={selectedExecutionIds}   // ⭐ รายการที่เลือก
                  onSelectedRowsChange={setSelectedExecutionIds} // ⭐ callback
                  isRowSelectable={(row) => row.status === "PENDING"} // คลิ๊กได้เฉพาะที่ตั้ง เช่น ตาม status
                  fontSize="0.8rem"
                  autoHeight
                />
              </MDBox>
            </Card>
          </Grid>
        </Grid>
      </MDBox>

      {/* Confirm SweetAlert */}
      {confirmAlert && (
        <SweetAlertComponent
          type="warning"
          title="Confirmation"
          message={confirmMessage}
          show={confirmAlert}
          showCancel
          confirmText="Yes"
          cancelText="No"
          onConfirm={() => {
            if (confirmAction) confirmAction();
            setConfirmAlert(false);
          }}
          onCancel={() => setConfirmAlert(false)}
        />
      )}

      {/* Result Alert */}
      <SweetAlertComponent
        show={alert.show}
        type={alert.type}
        title={alert.title}
        message={alert.message}
        onConfirm={() => {
          alert.onConfirm?.();   // ⭐ เรียก navigate
          setAlert({ ...alert, show: false });
        }}
      />

    </DashboardLayout>
  );
};

export default PickExecutionReqPage;
