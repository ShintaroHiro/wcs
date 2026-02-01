import React, { useState, useEffect } from "react";
import { Grid, Card, IconButton, InputAdornment, FormControl } from "@mui/material";
import AddCircleIcon from "@mui/icons-material/AddCircle";
import RemoveCircleIcon from "@mui/icons-material/RemoveCircle";

import { DatePicker } from "@mui/x-date-pickers/DatePicker";
import { LocalizationProvider } from "@mui/x-date-pickers/LocalizationProvider";
import { AdapterDayjs } from "@mui/x-date-pickers/AdapterDayjs";
import dayjs from "dayjs";

import MDBox from "components/MDBox";
import MDTypography from "components/MDTypography";
import MDInput from "components/MDInput";
import ReusableDataTable from "../components/table_component_v2";
import DashboardLayout from "examples/LayoutContainers/DashboardLayout";
import DashboardNavbar from "examples/Navbars/DashboardNavbar";
import OrdersAPI from "api/OrdersAPI";
import ExecutionAPI from "api/TaskAPI";
import WaitingAPI from "api/WaitingAPI";
import ImportFileAPI from "api/ImportAPI";
import SweetAlertComponent from "../components/sweetAlert";
import { useNavigate } from "react-router-dom";
import MDButton from "components/MDButton";
import { StyledMenuItem, StyledSelect } from "common/Global.style";
import { Condition, OrderStatusNoFinish } from "common/dataMain";
import SearchIcon from "@mui/icons-material/Search";
import { GlobalVar } from "common/GlobalVar";
import { normalizeStatus } from "common/utils/statusUtils";
import StatusBadge from "../components/statusBadge";
import ButtonComponent from "../components/ButtonComponent";
import Swal from "sweetalert2";

//store
const ReturnExecutionPage = () => {
    const [waitingList, setWaitingList] = useState([]);
    const [executionList, setExecutionList] = useState([]);

    const [filteredWaiting, setFilteredWaiting] = useState([]);
    const [filteredExecution, setFilteredExecution] = useState([]);

    // นำเข้า useState หากยังไม่ได้ import
    const [selectedFile, setSelectedFile] = useState(null);
    // state สำหรับ key ของ input element เพื่อบังคับ re-mount
    const [fileInputKey, setFileInputKey] = useState(Date.now());

    const [searchWaiting, setSearchWaiting] = useState({ 
        mc_code: "",
        date: "", 
        spr_no: "", 
        work_order: "",
        usage_num: "", 
        usage_line: "",
        stock_item: "", 
        item_desc: "",
        cond: "", 
        loc: "",
        box_loc: "",
        unit_cost_handled: "",
        total_cost_handled: "",
    });
    const [searchExecution, setSearchExecution] = useState({ 
        mc_code: "",
        date: "", 
        spr_no: "", 
        work_order: "",
        usage_num: "", 
        usage_line: "",
        status: "",
        stock_item: "", 
        item_desc: "",
        cond: "",
        loc: "",
        box_loc: "",
        unit_cost_handled: "",
        total_cost_handled: "",
    });

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
    const [filterConditionWaiting, setFilterConditionWaiting] = useState("");
    const [filterConditionExecution, setFilterConditionExecution] = useState("");
    const [filterStatusExecution, setFilterStatusExecution] = useState("");

    const navigate = useNavigate();

    // ดึงจาก localStorage 
    //const mcCodes = GlobalVar.getMcCodes(); 
    const storeType = GlobalVar.getStoreType();

    // --------------------------------------------------
    // FETCH API
    // --------------------------------------------------
    const fetchDataWaitingAll = async () => {
        setLoading(true);
        try {
        const response = await OrdersAPI.OrdersReturnAll({
            isExecution: true,
            //mc_code: mcCodes,
            store_type: storeType === "WCS" ? undefined : storeType,
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
        const response = await OrdersAPI.OrdersReturnAll({
            isExecution: false,
            //mc_code: mcCodes,
            store_type: storeType === "WCS" ? undefined : storeType, 
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
            includesIgnoreCase(item.mc_code, searchWaiting.mc_code) &&
            includesIgnoreCase(item.loc, searchWaiting.loc) &&
            includesIgnoreCase(item.box_loc, searchWaiting.box_loc) &&
            includesIgnoreCase(item.requested_at, searchWaiting.date) &&
            includesIgnoreCase(item.work_order, searchWaiting.work_order) &&
            includesIgnoreCase(item.spr_no, searchWaiting.spr_no) &&
            includesIgnoreCase(item.usage_num, searchWaiting.usage_num) &&
            includesIgnoreCase(item.usage_line, searchWaiting.usage_line) &&
            includesIgnoreCase(item.stock_item, searchWaiting.stock_item) &&
            includesIgnoreCase(item.item_desc, searchWaiting.item_desc) &&
            includesIgnoreCase(
                item.unit_cost_handled,
                searchWaiting.unit_cost_handled
            ) &&
            includesIgnoreCase(
                item.total_cost_handled,
                searchWaiting.total_cost_handled
            ) &&
            (filterConditionWaiting === "" || item.cond === filterConditionWaiting)
        );

        setFilteredWaiting(filtered);
        }, [waitingList, searchWaiting, filterConditionWaiting]);

    // --------------------------------------------------
    // FILTER EXECUTION LIST
    // --------------------------------------------------
    useEffect(() => {
        const filtered = executionList.filter(
            (item) =>
            includesIgnoreCase(item.mc_code, searchExecution.mc_code) &&
            includesIgnoreCase(item.loc, searchExecution.loc) &&
            includesIgnoreCase(item.box_loc, searchExecution.box_loc) &&
            includesIgnoreCase(item.requested_at, searchExecution.date) &&
            includesIgnoreCase(item.work_order, searchExecution.work_order) &&
            includesIgnoreCase(item.spr_no, searchExecution.spr_no) &&
            includesIgnoreCase(item.usage_num, searchExecution.usage_num) &&
            includesIgnoreCase(item.usage_line, searchExecution.usage_line) &&
            (filterStatusExecution === "" ||
                normalizeStatus(item.status) === filterStatusExecution) &&
            includesIgnoreCase(item.stock_item, searchExecution.stock_item) &&
            includesIgnoreCase(item.item_desc, searchExecution.item_desc) &&
            includesIgnoreCase(
                item.unit_cost_handled,
                searchExecution.unit_cost_handled
            ) &&
            includesIgnoreCase(
                item.total_cost_handled,
                searchExecution.total_cost_handled
            ) &&
            (filterConditionExecution === "" || item.cond === filterConditionExecution)
        );

        setFilteredExecution(filtered);
    }, [
        executionList, searchExecution, filterStatusExecution, filterConditionExecution,
    ]);

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
    // ALL Go TO PROCESSING END RETURN
    // --------------------------------------------------
    const handleConfirm = async () => {
        if (selectedExecutionIds.length === 0) return;

        try {
            const payload = {
                order_ids: selectedExecutionIds
            };

            const res = await WaitingAPI.submitReturn(payload);

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
                        navigate("/status");
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

    // --------------------------------------------------
    // IMPORT FILE
    // --------------------------------------------------
    // ปรับปรุง handleImportFile ให้เก็บไฟล์ที่เลือกไว้ใน state
    const handleImportFile = (event) => {
        const file = event.target.files[0];
        if (!file) {
        setAlert({
            show: true,
            type: "error",
            title: "Error",
            message: "Please select the file before uploading.",
        });
        return;
        }
    
        setSelectedFile(file);
    };

    // ฟังก์ชันสำหรับส่งไฟล์ที่เลือกไปยัง API
    const handleSubmitImport = async () => {
        if (!selectedFile) return;
        try {

            // 🔄 แสดง loading (ฟิกตรงนี้เลย)
            Swal.fire({
                title: "Importing...",
                text: "Please wait while processing file",
                allowOutsideClick: false,
                allowEscapeKey: false,
                backdrop: "rgba(0,0,0,0.6)", // ✅ overlay เต็มจอ
                didOpen: () => {
                    Swal.showLoading();
                },
            });

        const response = await ImportFileAPI.importReturnFile(selectedFile);

        // ❌ ปิด loading
        Swal.close();

        if (response.isCompleted) {
            setAlert({
            show: true,
            type: "success",
            title: "Success",
            message: response.message,
            });
            await fetchDataWaitingAll();
            // เคลียร์ไฟล์ที่เลือก และอัปเดต key เพื่อให้ input re-mount ใหม่
            setSelectedFile(null);
            setFileInputKey(Date.now());
        } else {
            setAlert({
            show: true,
            type: "error",
            title: "Upload failed",
            message: response.message,
            });
        }
        } catch (error) {
            // ❌ ปิด loading (กันเหนียว)
            Swal.close();

            console.error("Error uploading file:", error);

            setAlert({
            show: true,
            type: "error",
            title: "Error",
            message: "Import failed",
            });
        }
    };
    
    // ฟังก์ชันสำหรับลบไฟล์ที่เลือก (และรีเซ็ต input)
    const handleClearFile = () => {
        setSelectedFile(null);
        setFileInputKey(Date.now());
    };

    
    const getWaitingOrderIds = () => {
    return waitingList
        .filter(r => r.status === "WAITING")
        .map(r => r.order_id);
    };
    
    const handleDeleteAll = async () => {
        const waitingIds = getWaitingOrderIds();
        if (waitingIds.length === 0) return;

        try {
            // 🔄 แสดง loading
            Swal.fire({
                title: "Deleting...",
                text: "Please wait while clearing waiting list",
                allowOutsideClick: false,
                allowEscapeKey: false,
                backdrop: "rgba(0,0,0,0.6)",
                didOpen: () => {
                    Swal.showLoading();
                },
            });

            // ✅ payload ให้ตรงกับ backend
            const payload = {
                order_ids: waitingIds,
            };

            const res = await WaitingAPI.deleteWaiting(payload);

            // ❌ ปิด loading
            Swal.close();

            await Promise.all([
                fetchDataWaitingAll(),
                fetchDataExecuteAll(),
            ]);

            setSelectedWaitingIds([]);

            if (res?.isCompleted) {
                setAlert({
                    show: true,
                    type: "success",
                    title: "Success",
                    message: res.message || "Clear waiting list success",
                });
                return;
            }

            setAlert({
                show: true,
                type: "error",
                title: "Error",
                message: res?.message || "Delete failed",
            });

        } catch (err) {
            // ❌ ปิด loading (กันเหนียว)
            Swal.close();

            console.error("FULL ERROR:", err);
            console.error("RESPONSE:", err.response);
            console.error("DATA:", err.response?.data);

            setAlert({
                show: true,
                type: "error",
                title: "Error",
                message: err.response?.data?.message || "Something went wrong",
            });
        }
    };


    // --------------------------------------------------
    // TABLE COLUMNS
    // --------------------------------------------------
    const columnsWaiting = [
        { field: "mc_code", label: "Maintenance Contract" },
        { field: "work_order", label: "Work Order" },
        { field: "spr_no", label: "SPR No." },
        { field: "usage_num", label: "Usage No." },
        { field: "usage_line", label: "Usage Line" },
        { field: "requested_at", label: "Date" },
        { field: "stock_item", label: "Stock Item Number" },
        { field: "item_desc", label: "Stock Item Description" },
        { field: "cond", label: "Condition" },
        { field: "loc", label: "Store Location" },
        { field: "box_loc", label: "Bin Location" },
        { field: "unit_cost_handled", label: "Unit Cost" },
        { field: "total_cost_handled", label: "Total Cost" },
        { field: "plan_qty", label: "Required Quantity" },
    ];

    const columnsExecute = [
        { field: "mc_code", label: "Maintenance Contract" },
        { field: "work_order", label: "Work Order" },
        { field: "spr_no", label: "SPR No." },
        { field: "usage_num", label: "Usage No." },
        { field: "usage_line", label: "Usage Line" },
        { field: "requested_at", label: "Date" },
        { field: "stock_item", label: "Stock Item Number" },
        { field: "item_desc", label: "Stock Item Description" },
        { field: "cond", label: "Condition" },
        { field: "loc", label: "Store Location" },
        { field: "box_loc", label: "Bin Location" },
        { field: "unit_cost_handled", label: "Unit Cost" },
        { field: "total_cost_handled", label: "Total Cost" },
        { field: "plan_qty", label: "Required Quantity" },
        {
            field: "status",
            label: "Order Status",
            valueGetter: (row) => row.status, // เอาไว้ filter / sort
            renderCell: (status) => <StatusBadge status={status} />,
        }
    ];

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
                Return - Waiting and Execution List
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

        {/* --------------------------------------------------
            เพิ่ม IMPORT
        --------------------------------------------------- */}
        <MDBox 
            p={2}
            display="flex"
            alignItems="stretch"
            >
                <Grid mr={2}>
                 <MDButton
                variant="contained"
                color="secondary"
                onClick={handleDeleteAll}
                >
                Delete All
                </MDButton>
              </Grid>

              <Grid item xs={12}>
                <Grid container alignItems="center" justifyContent="flex-end" spacing={2}>
                  {/* ปุ่มนำเข้าไฟล์เป็นตัวแรก */}
                  <Grid item>
                    <MDBox mb={0}>
                      <MDInput
                        key={fileInputKey}
                        type="file"
                        accept=".xlsx"
                        style={{ display: "none" }}
                        id="import-file"
                        onChange={handleImportFile}
                      />
                      <label htmlFor="import-file">
                        <MDButton variant="contained" component="span" color="warning">
                          IMPORT
                        </MDButton>
                      </label>
                    </MDBox>
                  </Grid>

                  {/* เมื่อมีไฟล์แล้วจึงแสดง ชื่อไฟล์ → ปุ่มลบไฟล์ → ปุ่มยืนยัน ถัดไปทางขวา */}
                  {selectedFile && (
                    <>
                      <Grid item>
                        <MDTypography variant="body2">{selectedFile.name}</MDTypography>
                      </Grid>

                      <Grid item>
                        <ButtonComponent onClick={handleClearFile} type="iconDelete" />
                      </Grid>

                      <Grid item>
                        <ButtonComponent type="Confirm" onClick={handleSubmitImport} />
                      </Grid>
                    </>
                  )}
                </Grid>
              </Grid>
            </MDBox>

        <MDBox mt={1}>
            <Grid container spacing={1.5}>
    {/* --------------------------------------------------
        LEFT: WAITING LIST
    --------------------------------------------------- */}
            <Grid item xs={12} md={5.8}>
                <Card sx={{ p: 2, display: "flex", flexDirection: "column", minHeight: "500px" }}>
                <MDTypography variant="h5" mb={4}>
                    Return - Waiting List
                </MDTypography>

                {/* Filters */}
                <Grid container spacing={2} mb={2}>

                    {/* Date */}
                    <Grid item xs={12} md={4}>
                    <MDTypography variant="h6">Date</MDTypography>

                    <LocalizationProvider dateAdapter={AdapterDayjs}>
                        <DatePicker
                        inputFormat="DD/MM/YYYY"   // ✅ รูปแบบ 24/01/2026
                        value={
                            searchWaiting.date
                            ? dayjs(searchWaiting.date, "DD/MM/YYYY")
                            : null
                        }
                        onChange={(newValue) => {
                            setSearchWaiting({
                            ...searchWaiting,
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
                    <Grid item xs={12} md={4}>
                    <MDTypography variant="h6">Maintenance Contract</MDTypography>
                    <MDInput
                        placeholder="Text Field"
                        sx={{ height: "45px" }}
                        value={searchWaiting.mc_code}
                        onChange={(e) =>
                        setSearchWaiting({ ...searchWaiting, mc_code: e.target.value })
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
                    <Grid item xs={12} md={4}>
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
                    <Grid item xs={12} md={4}>
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

                    {/* Usage Line */}
                    <Grid item xs={12} md={4}>
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

                    {/* Stock Item Description */}
                    <Grid item xs={12} md={4}>
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

                    {/* Store Location */}
                    <Grid item xs={12} md={4}>
                    <MDTypography variant="h6">Store Location</MDTypography>
                    <MDInput
                        placeholder="Text Field"
                        sx={{ height: "45px" }}
                        value={searchWaiting.loc}
                        onChange={(e) =>
                        setSearchWaiting({ ...searchWaiting, loc: e.target.value })
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

                     {/* Unit Cost */}
                    <Grid item xs={12} md={4}>
                    <MDTypography variant="h6">Unit Cost</MDTypography>
                    <MDInput
                        placeholder="Text Field"
                        sx={{ height: "45px" }}
                        value={searchWaiting.unit_cost_handled}
                        onChange={(e) =>
                        setSearchWaiting({ ...searchWaiting, unit_cost_handled: e.target.value })
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

                    {/* Total Cost */}
                    <Grid item xs={12} md={4}>
                    <MDTypography variant="h6">Total Cost</MDTypography>
                    <MDInput
                        placeholder="Text Field"
                        sx={{ height: "45px" }}
                        value={searchWaiting.total_cost_handled}
                        onChange={(e) =>
                        setSearchWaiting({ ...searchWaiting, total_cost_handled: e.target.value })
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

                    {/* Bin Location */}
                    <Grid item xs={12} md={4}>
                    <MDTypography variant="h6">Bin Location</MDTypography>
                    <MDInput
                        placeholder="Text Field"
                        sx={{ height: "45px" }}
                        value={searchWaiting.box_loc}
                        onChange={(e) =>
                        setSearchWaiting({ ...searchWaiting, box_loc: e.target.value })
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
                    <Grid item xs={12} md={4}>
                    <MDTypography variant="h6">Condition</MDTypography>
                    <FormControl fullWidth>
                        <StyledSelect
                        sx={{ height: "45px" }}
                        name="filterConditionWaiting"
                        value={filterConditionWaiting}
                        onChange={(e) => setFilterConditionWaiting(e.target.value)}
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
                </Grid>

                {/* Table */}
                <MDBox sx={{ fontSize: "0.85rem", maxHeight: "600px", overflowY: "auto" }}>
                    <ReusableDataTable
                    columns={columnsWaiting}
                    rows={filteredWaiting}
                    //disableHorizontalScroll
                    idField="order_id"
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
                md={0.4}
                container
                direction="column"
                alignItems="center"
                justifyContent="center"
                sx={{ gap: 3 }}
            >
                {/* + Button */}
                <IconButton
                color="primary"
                onClick={handleMoveToExecution}
                disabled={selectedWaitingIds.length === 0 || loading}

                sx={{ p: 0.3 }}
                >
                <AddCircleIcon sx={{ fontSize: 36 }} />
                </IconButton>

                {/* - Button */}
                <IconButton
                color="error"
                onClick={handleDeleteTask}
                disabled={selectedExecutionIds.length === 0 || loading}
                sx={{ p: 0.3 }}
                >
                <RemoveCircleIcon sx={{ fontSize: 36 }} />
                </IconButton>
            </Grid>

    {/* --------------------------------------------------
        RIGHT: EXECUTION LIST
    --------------------------------------------------- */}
            <Grid item xs={12} md={5.8}>
                <Card sx={{ p: 2, display: "flex", flexDirection: "column", minHeight: "500px" }}>
                <MDTypography variant="h5" mb={4}>
                    Return - Execution List
                </MDTypography>

                {/* Filters */}
                <Grid container spacing={2} mb={2}>
                    {/* Date */}
                    <Grid item xs={12} md={4}>
                    <MDTypography variant="h6">Date</MDTypography>

                    <LocalizationProvider dateAdapter={AdapterDayjs}>
                        <DatePicker
                        inputFormat="DD/MM/YYYY"   // ✅ รูปแบบ 24/01/2026
                        value={
                            searchExecution.date
                            ? dayjs(searchExecution.date, "DD/MM/YYYY")
                            : null
                        }
                        onChange={(newValue) => {
                            setSearchExecution({
                            ...searchExecution,
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
                    <Grid item xs={12} md={4}>
                    <MDTypography variant="h6">Maintenance Contract</MDTypography>
                    <MDInput
                        placeholder="Text Field"
                        sx={{ height: "45px" }}
                        value={searchExecution.mc_code}
                        onChange={(e) =>
                        setSearchExecution({ ...searchExecution, mc_code: e.target.value })
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
                    <Grid item xs={12} md={4}>
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
                    <Grid item xs={12} md={4}>
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

                    {/* Usage Line */}
                    <Grid item xs={12} md={4}>
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

                    {/* Stock Item Description */}
                    <Grid item xs={12} md={4}>
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

                    {/* Store Location */}
                    <Grid item xs={12} md={4}>
                    <MDTypography variant="h6">Store Location</MDTypography>
                    <MDInput
                        placeholder="Text Field"
                        sx={{ height: "45px" }}
                        value={searchExecution.loc}
                        onChange={(e) =>
                        setSearchExecution({ ...searchExecution, loc: e.target.value })
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

                    {/* Unit Cost */}
                    <Grid item xs={12} md={4}>
                    <MDTypography variant="h6">Unit Cost</MDTypography>
                    <MDInput
                        placeholder="Text Field"
                        sx={{ height: "45px" }}
                        value={searchExecution.unit_cost_handled}
                        onChange={(e) =>
                        setSearchExecution({ ...searchExecution, unit_cost_handled: e.target.value })
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

                    {/* Total Cost */}
                    <Grid item xs={12} md={4}>
                    <MDTypography variant="h6">Total Cost</MDTypography>
                    <MDInput
                        placeholder="Text Field"
                        sx={{ height: "45px" }}
                        value={searchExecution.total_cost_handled}
                        onChange={(e) =>
                        setSearchExecution({ ...searchExecution, total_cost_handled: e.target.value })
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

                    {/* Bin Location */}
                    <Grid item xs={12} md={4}>
                    <MDTypography variant="h6">Bin Location</MDTypography>
                    <MDInput
                        placeholder="Text Field"
                        sx={{ height: "45px" }}
                        value={searchExecution.box_loc}
                        onChange={(e) =>
                        setSearchExecution({ ...searchExecution, box_loc: e.target.value })
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
                    <Grid item xs={12} md={4}>
                    <MDTypography variant="h6">Condition</MDTypography>
                        <FormControl fullWidth>
                        <StyledSelect
                            sx={{ height: "45px" }}
                            name="filterConditionExecution"
                            value={filterConditionExecution}
                            onChange={(e) => setFilterConditionExecution(e.target.value)}
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

                    {/* Order Status */}
                    <Grid item xs={12} md={4}>
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

export default ReturnExecutionPage;
