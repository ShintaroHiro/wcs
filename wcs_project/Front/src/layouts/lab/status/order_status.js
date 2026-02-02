import React, { useState, useEffect } from "react"; // นำเข้า useState และ useEffect จาก React
import { Card, Grid, InputAdornment, FormControl, Box } from "@mui/material"; // นำเข้า components จาก MUI (Material-UI)
import DashboardLayout from "examples/LayoutContainers/DashboardLayout"; // นำเข้า layout component
import DashboardNavbar from "examples/Navbars/DashboardNavbar"; // นำเข้า navbar component
import MDBox from "components/MDBox";
import MDTypography from "components/MDTypography";
import OrdersAPI from "api/OrdersAPI";
import ReusableDataTable from "../components/table_component_v2";
import MDInput from "components/MDInput";
import MDButton from "components/MDButton";

import { DatePicker } from "@mui/x-date-pickers/DatePicker";
import { LocalizationProvider } from "@mui/x-date-pickers/LocalizationProvider";
import { AdapterDayjs } from "@mui/x-date-pickers/AdapterDayjs";
import dayjs from "dayjs";

import SearchIcon from "@mui/icons-material/Search";
import { StyledMenuItem, StyledSelect } from "common/Global.style";
import { useNavigate } from "react-router-dom";
import { GlobalVar } from "common/GlobalVar";
import { normalizeStatus } from "common/utils/statusUtils";
import StatusBadge from "../components/statusBadge";
import { OrderStatus, Condition, TransactionType } from "common/dataMain";

const OrderStatusPage = () => {
  const [loading, setLoading] = useState(true);
  const [ordersList, setOrdersList] = useState([]);
  const [filteredOrders, setFilteredOrders] = useState([]);
  const [searchOrders, setSearchOrders] = useState({
    type: "",
    mc_code: "",
    spr_no: "",
    work_order: "",
    usage_num: "", 
    usage_line: "",
    po_num: "",
    stock_item: "", 
    item_desc: "",
    cond: "",
    from_loc: "",
    from_box_loc: "",
    to_loc: "",
    to_box_loc: "",
    actual_qty: "",   
    date: "",  
    status: "",
  });

  const [filterCondition, setFilterCondition] = useState("");
  const [filterStatusOrder, setFilterStatusOrders] = useState("");
  const [filterTrxType, setFilterTrxType] = useState("");

  const navigate = useNavigate();

  // ดึงจาก localStorage
  //const mcCodes = GlobalVar.getMcCodes();
  const storeType = GlobalVar.getStoreType();

  const handleNext = () => {
    const checkoutStores = ["T1M", "T1", "AGMB"];

    if (checkoutStores.includes(storeType)) {
      navigate("/checkout-t1");
    } else {
      navigate("/home");
    }
  };

  const fetchDataAll = async () => {
    setLoading(true);
    try {
      const response = await OrdersAPI.OrdersStatusAll({
        //isExecution: true, ดึงทั้งหมด
        //mc_code: mcCodes, ดึงทั้งหมด
        store_type: storeType === "WCS" ? undefined : storeType,
        // type: "", ดึงทั้งหมด
      });
      const list = Array.isArray(response?.data) ? response.data : [];
      setOrdersList(list);
    } catch (error) {
      console.error("Error fetching data: ", error);
      setOrdersList([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDataAll();
  }, []);


  //ฟังก์ชัน พิมพ์เล็ก / ใหญ่ , รองรับ number, null, undefined , trim
  const includesIgnoreCase = (value, search) => {
      if (!search) return true; // ถ้าไม่ได้พิมพ์อะไร = ผ่าน
      return String(value ?? "")
          .toLowerCase()
          .trim()
          .includes(String(search).toLowerCase().trim());
  };

  // --- Filter Logic ---
  useEffect(() => {
    const filtered = ordersList.filter(
      (item) =>
        (filterTrxType === "" || item.type === filterTrxType) &&
        includesIgnoreCase(item.mc_code, searchOrders.mc_code) &&
        includesIgnoreCase(item.spr_no, searchOrders.spr_no) &&
        includesIgnoreCase(item.work_order, searchOrders.work_order) &&
        includesIgnoreCase(item.usage_num, searchOrders.usage_num) &&
        includesIgnoreCase(item.usage_line, searchOrders.usage_line) &&
        includesIgnoreCase(item.po_num, searchOrders.po_num) &&
        includesIgnoreCase(item.stock_item, searchOrders.stock_item) &&
        includesIgnoreCase(item.item_desc, searchOrders.item_desc) &&
        (filterCondition === "" || item.cond === filterCondition) &&
        includesIgnoreCase(item.from_loc, searchOrders.from_loc) &&
        includesIgnoreCase(item.from_box_loc, searchOrders.from_box_loc) &&
        includesIgnoreCase(item.to_loc, searchOrders.to_loc) &&
        includesIgnoreCase(item.to_box_loc, searchOrders.to_box_loc) &&
        includesIgnoreCase(item.actual_qty, searchOrders.actual_qty) &&
        includesIgnoreCase(item.requested_at, searchOrders.date) &&
        (
          filterStatusOrder === "" ||
          normalizeStatus(item.status) === filterStatusOrder
        )
    );
    setFilteredOrders(filtered);
  }, [ordersList, searchOrders, filterStatusOrder, filterCondition, filterTrxType]);

  // table
  const columns = [
    { field: "mc_code", label: "Maintenance Contract" },
    {
      field: "type",
      label: "Transaction Type",
      valueGetter: (row) => row.type, // ใช้ค่าเดิมไว้ filter / sort
      renderCell: (type) => {
        if (type === "USAGE") return "Pick";
        if (type === "RECEIPT") return "Put";
        if (type === "RETURN") return "Return";
        if (type === "TRANSFER") return "Transfer";
        return type; // type อื่นแสดงตามเดิม
      },
    },
    { field: "spr_no", label: "SPR No." },
    { field: "work_order", label: "Work Order" },
    { field: "usage_num", label: "Usage No." },
    { field: "usage_line", label: "Usage Line" },
    { field: "po_num", label: "PO No." },
    { field: "requested_at", label: "Date" },
    { field: "stock_item", label: "Stock Item Number" },
    { field: "item_desc", label: "Stock Item Description" },
    { field: "cond", label: "Condition" },
    { field: "from_loc", label: "From Location" },
    { field: "from_box_loc", label: "From BIN" },
    { field: "to_loc", label: "To Location" },
    { field: "to_box_loc", label: "To BIN" },
    { field: "plan_qty", label: "Required Quantity" },
    { field: "actual_qty", label: "Scanned Quantity" },
    {
        field: "status",
        label: "Order Status",
        valueGetter: (row) => row.status, // เอาไว้ filter / sort
        renderCell: (status) => <StatusBadge status={status} />,
    }
  ];

  return (
    <DashboardLayout>
      <DashboardNavbar />
      <MDBox p={2} display="flex" alignItems="stretch">
        {/* 🔵 ซ้าย : Title */}
        <MDBox flex={1} display="flex" alignItems="center">
          <MDTypography variant="h3" color="inherit">
            Status
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
          {/* ครึ่งบน : Next */}
          <MDButton variant="contained" color="info" onClick={handleNext}>
            Next
          </MDButton>

          {/* ครึ่งล่าง : Back */}
          <MDButton variant="contained" color="secondary" onClick={() => navigate("/home")}>
            Back
          </MDButton>
        </MDBox>
      </MDBox>

      <MDBox mt={1}>
        <Card>
          <MDBox p={3}>
            <Box sx={{ flexGrow: 1 }} mb={3}>
            <Grid container spacing={2} sx={{ mb: 0.5 }}>
                {/* Transaction Type */}
              <Grid item xs={12} md={1.71}>
                <MDTypography variant="caption" fontWeight="bold">Transaction Type</MDTypography>
                <FormControl fullWidth>
                  <StyledSelect
                      sx={{ height: "45px" }}
                      name="filterTrxType"
                      value={filterTrxType}
                      onChange={(e) => setFilterTrxType(e.target.value)}
                      displayEmpty
                  >
                      <StyledMenuItem value="">Pull Down List</StyledMenuItem>

                      {TransactionType.map((t) => (
                      <StyledMenuItem key={t.value} value={t.value}>
                          {t.text}
                      </StyledMenuItem>
                      ))}
                  </StyledSelect>
                  </FormControl>
              </Grid>
            </Grid>
            <Grid container spacing={2} sx={{ mb: 0.5 }}>

              {/* Date */}
              <Grid item xs={12} md={1.71}>
              <MDTypography variant="caption" fontWeight="bold">Date</MDTypography>

              <LocalizationProvider dateAdapter={AdapterDayjs}>
                  <DatePicker
                  inputFormat="DD/MM/YYYY"   // ✅ รูปแบบ 24/01/2026
                  value={
                      searchOrders.date
                      ? dayjs(searchOrders.date, "DD/MM/YYYY")
                      : null
                  }
                  onChange={(newValue) => {
                      setSearchOrders({
                      ...searchOrders,
                      date: newValue ? newValue.format("DD/MM/YYYY") : "",
                      });
                  }}
                  renderInput={(params) => (
                      <MDInput
                      {...params}
                      placeholder="Select date"
                      fullWidth
                      sx={{ height: "45px" }}
                      />
                  )}
                  />
              </LocalizationProvider>
              </Grid>

              {/* Maintenance Contract */}
              <Grid item xs={12} md={1.71}>
                <MDTypography variant="caption" fontWeight="bold">Maintenance Contract</MDTypography>
                <MDInput
                  placeholder="Text Field"
                  sx={{ height: "45px" }}
                  value={searchOrders.mc_code}
                  onChange={(e) =>
                    setSearchOrders({ ...searchOrders, mc_code: e.target.value })
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
              <Grid item xs={12} md={1.71}>
                <MDTypography variant="caption" fontWeight="bold">SPR No.</MDTypography>
                <MDInput
                  placeholder="Text Field"
                  sx={{ height: "45px" }}
                  value={searchOrders.spr_no}
                  onChange={(e) =>
                    setSearchOrders({ ...searchOrders, spr_no: e.target.value })
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

              {/* Work Order */}
              <Grid item xs={12} md={1.71}>
                <MDTypography variant="caption" fontWeight="bold">Work Order</MDTypography>
                <MDInput
                  placeholder="Text Field"
                  sx={{ height: "45px" }}
                  value={searchOrders.work_order}
                  onChange={(e) =>
                    setSearchOrders({ ...searchOrders, work_order: e.target.value })
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
              <Grid item xs={12} md={1.71}>
                <MDTypography variant="caption" fontWeight="bold">Usage No.</MDTypography>
                <MDInput
                  placeholder="Text Field"
                  sx={{ height: "45px" }}
                  value={searchOrders.usage_num}
                  onChange={(e) =>
                    setSearchOrders({ ...searchOrders, usage_num: e.target.value })
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
              <Grid item xs={12} md={1.71}>
                <MDTypography variant="caption" fontWeight="bold">Usage Line</MDTypography>
                <MDInput
                  placeholder="Text Field"
                  sx={{ height: "45px" }}
                  value={searchOrders.usage_line}
                  onChange={(e) =>
                    setSearchOrders({ ...searchOrders, usage_line: e.target.value })
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
              {/* PO No. */}
              <Grid item xs={12} md={1.71}>
                <MDTypography variant="caption" fontWeight="bold">PO No.</MDTypography>
                <MDInput
                  placeholder="Text Field"
                  sx={{ height: "45px" }}
                  value={searchOrders.po_num}
                  onChange={(e) =>
                    setSearchOrders({ ...searchOrders, po_num: e.target.value })
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
            <Grid container spacing={2} sx={{ mb: 0.5 }}>
              {/* Stock Item Number */}
              <Grid item xs={12} md={1.71}>
                <MDTypography variant="caption" fontWeight="bold">Stock Item Number</MDTypography>
                <MDInput
                  placeholder="Text Field"
                  sx={{ height: "45px" }}
                  value={searchOrders.stock_item}
                  onChange={(e) =>
                    setSearchOrders({ ...searchOrders, stock_item: e.target.value })
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
              <Grid item xs={12} md={1.71}>
                <MDTypography variant="caption" fontWeight="bold">Stock Item Description</MDTypography>
                <MDInput
                  placeholder="Text Field"
                  sx={{ height: "45px" }}
                  value={searchOrders.item_desc}
                  onChange={(e) =>
                    setSearchOrders({ ...searchOrders, item_desc: e.target.value })
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

              {/* Condition */}
              <Grid item xs={12} md={1.71}>
                <MDTypography variant="caption" fontWeight="bold">Condition</MDTypography>
                <FormControl fullWidth>
                  <StyledSelect
                      sx={{ height: "45px" }}
                      name="filterCondition"
                      value={filterCondition}
                      onChange={(e) => setFilterCondition(e.target.value)}
                      displayEmpty
                  >
                      <StyledMenuItem value="">Pull Down List</StyledMenuItem>

                      {Condition.map((t) => (
                      <StyledMenuItem key={t.value} value={t.value}>
                          {t.text}
                      </StyledMenuItem>
                      ))}
                  </StyledSelect>
                  </FormControl>
              </Grid>
              
              {/* From Location */}
              <Grid item xs={12} md={1.71}>
                <MDTypography variant="caption" fontWeight="bold">From Location</MDTypography>
                <MDInput
                  placeholder="Text Field"
                  sx={{ height: "45px" }}
                  value={searchOrders.from_loc}
                  onChange={(e) =>
                    setSearchOrders({ ...searchOrders, from_loc: e.target.value })
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

              {/* From BIN */}
              <Grid item xs={12} md={1.71}>
                <MDTypography variant="caption" fontWeight="bold">From BIN</MDTypography>
                <MDInput
                  placeholder="Text Field"
                  sx={{ height: "45px" }}
                  value={searchOrders.from_box_loc}
                  onChange={(e) =>
                    setSearchOrders({ ...searchOrders, from_box_loc: e.target.value })
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

              {/* To Location */}
              <Grid item xs={12} md={1.71}>
                <MDTypography variant="caption" fontWeight="bold">To Location</MDTypography>
                <MDInput
                  placeholder="Text Field"
                  sx={{ height: "45px" }}
                  value={searchOrders.to_loc}
                  onChange={(e) =>
                    setSearchOrders({ ...searchOrders, to_loc: e.target.value })
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

              {/* To BIN */}
              <Grid item xs={12} md={1.71}>
                <MDTypography variant="caption" fontWeight="bold">To BIN</MDTypography>
                <MDInput
                  placeholder="Text Field"
                  sx={{ height: "45px" }}
                  value={searchOrders.to_box_loc}
                  onChange={(e) =>
                    setSearchOrders({ ...searchOrders, to_box_loc: e.target.value })
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
            <Grid container spacing={2}>

              {/* Scanned Quantity */}
              <Grid item xs={12} md={1.71}>
                <MDTypography variant="caption" fontWeight="bold">Scanned Quantity</MDTypography>
                <MDInput
                  placeholder="Select Range"
                  sx={{ height: "45px" }}
                  value={searchOrders.actual_qty}
                  onChange={(e) =>
                    setSearchOrders({ ...searchOrders, actual_qty: e.target.value })
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
                <Grid item xs={12} md={1.71}>
                <MDTypography variant="caption" fontWeight="bold">Order Status</MDTypography>
                    <FormControl fullWidth>
                    <StyledSelect
                        sx={{ height: "45px" }}
                        name="filterStatusOrder"
                        value={filterStatusOrder}
                        onChange={(e) => setFilterStatusOrders(e.target.value)}
                        displayEmpty
                    >
                        <StyledMenuItem value="">Pull Down List</StyledMenuItem>

                        {OrderStatus.map((t) => (
                        <StyledMenuItem key={t.value} value={t.value}>
                            {t.text}
                        </StyledMenuItem>
                        ))}
                    </StyledSelect>
                    </FormControl>
                </Grid>
            </Grid>
            </Box>
            {loading ? (
              <div>Loading...</div>
            ) : (
              <MDBox sx={{ fontSize: "0.85rem", maxHeight: "600px", overflowY: "auto" }}>
                {/* Table */}
                <ReusableDataTable
                  columns={columns}
                  rows={filteredOrders}
                  //disableHorizontalScroll
                  idField="order_id"
                  defaultPageSize={10}
                  pageSizeOptions={[10, 25, 50]}
                  fontSize="0.8rem"
                />
              </MDBox>
            )}
          </MDBox>
        </Card>
      </MDBox>
    </DashboardLayout>
  );
};
export default OrderStatusPage;
