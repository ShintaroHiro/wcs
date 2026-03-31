import React, { useState, useEffect } from "react";
import { Grid, Card, IconButton, InputAdornment, FormControl, Dialog, DialogTitle, DialogContent, DialogActions } from "@mui/material";

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
//import { GlobalVar } from "common/GlobalVar";
import StatusBadge from "../components/statusBadge";
import {
  normalizeStatus,
  STATUS_STYLE,
} from "common/utils/statusUtils";
import ButtonComponent from "../components/ButtonComponent";
import Swal from "sweetalert2";
import ExecutionModeBadge from "../components/executionModeBadge";

//store
const PutExecutionPage = () => {
    const [waitingList, setWaitingList] = useState([]);
    const [executionList, setExecutionList] = useState([]);

    const [filteredWaiting, setFilteredWaiting] = useState([]);
    const [filteredExecution, setFilteredExecution] = useState([]);

    const [openAdvanceWaiting, setOpenAdvanceWaiting] = useState(false);
    const [openAdvanceExecution, setOpenAdvanceExecution] = useState(false);

    // นำเข้า useState หากยังไม่ได้ import
    const [selectedFile, setSelectedFile] = useState(null);
    // state สำหรับ key ของ input element เพื่อบังคับ re-mount
    const [fileInputKey, setFileInputKey] = useState(Date.now());

    const [searchWaiting, setSearchWaiting] = useState({
        date: "", 
        mc_code: "",
        po_num: "", 
        object_id: "",
        stock_item: "", 
        item_desc: "",
        cond: "", 
        loc: "",
        box_loc: "",
        unit_cost_handled: "",
        total_cost_handled: "",
    });
    const [searchExecution, setSearchExecution] = useState({
        date: "", 
        mc_code: "",
        po_num: "", 
        object_id: "",
        stock_item: "", 
        item_desc: "",
        cond: "",
        loc: "",
        box_loc: "",
        unit_cost_handled: "",
        total_cost_handled: "",
        status: "",
    });

     //Dialog
    const handleClearAdvancedWaiting = () => {
        setSearchWaiting({
            date: "", 
            mc_code: "",
            po_num: "", 
            object_id: "",
            stock_item: "", 
            item_desc: "",
            cond: "", 
            loc: "",
            box_loc: "",
            unit_cost_handled: "",
            total_cost_handled: "",
        });

        setFilterConditionWaiting("");
    };

    const handleClearAdvancedExecution = () => {
        setSearchExecution({
            date: "", 
            mc_code: "",
            po_num: "", 
            object_id: "",
            stock_item: "", 
            item_desc: "",
            cond: "",
            loc: "",
            box_loc: "",
            unit_cost_handled: "",
            total_cost_handled: "",
            status: "",
        });

        setFilterConditionExecution("");
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
    const [filterConditionWaiting, setFilterConditionWaiting] = useState("");
    const [filterConditionExecution, setFilterConditionExecution] = useState("");
    const [filterStatusExecution, setFilterStatusExecution] = useState("");

    const navigate = useNavigate();

    // ดึงจาก localStorage 
    //const mcCodes = GlobalVar.getMcCodes(); 
    //const storeType = GlobalVar.getStoreType();

    const [overdueChecked, setOverdueChecked] = useState(false);

    // --------------------------------------------------
    // FETCH API
    // --------------------------------------------------
    const fetchDataWaitingAll = async () => {
        setLoading(true);
        try {
        const response = await OrdersAPI.OrdersReceiptAll({
            isExecution: true,
            //mc_code: mcCodes,
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
        const response = await OrdersAPI.OrdersReceiptAll({
            isExecution: false,
            //mc_code: mcCodes,
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
                includesIgnoreCase(item.requested_at, searchWaiting.date) &&
                includesIgnoreCase(item.po_num, searchWaiting.po_num) &&
                includesIgnoreCase(item.object_id, searchWaiting.object_id) &&
                includesIgnoreCase(item.mc_code, searchWaiting.mc_code) &&
                includesIgnoreCase(item.stock_item, searchWaiting.stock_item) &&
                includesIgnoreCase(item.item_desc, searchWaiting.item_desc) &&
                includesIgnoreCase(item.loc, searchWaiting.loc) &&
                includesIgnoreCase(item.box_loc, searchWaiting.box_loc) &&
                includesIgnoreCase(
                    item.unit_cost_handled,
                    searchWaiting.unit_cost_handled
                ) &&
                includesIgnoreCase(
                    item.total_cost_handled,
                    searchWaiting.total_cost_handled
                ) &&
                (filterConditionWaiting === "" ||
                    item.cond === filterConditionWaiting)
        );

        setFilteredWaiting(filtered);
    }, [waitingList, searchWaiting, filterConditionWaiting]);

    // --------------------------------------------------
    // FILTER EXECUTION LIST
    // --------------------------------------------------
    useEffect(() => {
        const filtered = executionList.filter(
            (item) =>
                includesIgnoreCase(item.requested_at, searchExecution.date) &&
                includesIgnoreCase(item.po_num, searchExecution.po_num) &&
                includesIgnoreCase(item.object_id, searchExecution.object_id) &&
                includesIgnoreCase(item.mc_code, searchExecution.mc_code) &&
                (
                    filterStatusExecution === "" ||
                    normalizeStatus(item.status) === filterStatusExecution
                ) &&
                includesIgnoreCase(item.stock_item, searchExecution.stock_item) &&
                includesIgnoreCase(item.item_desc, searchExecution.item_desc) &&
                includesIgnoreCase(item.loc, searchExecution.loc) &&
                includesIgnoreCase(item.box_loc, searchExecution.box_loc) &&
                includesIgnoreCase(
                    item.unit_cost_handled,
                    searchExecution.unit_cost_handled
                ) &&
                includesIgnoreCase(
                    item.total_cost_handled,
                    searchExecution.total_cost_handled
                ) &&
                (filterConditionExecution === "" ||
                    item.cond === filterConditionExecution)
        );

        setFilteredExecution(filtered);
    }, [
        executionList,
        searchExecution,
        filterStatusExecution,
        filterConditionExecution
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
            message: "Moved to Execution List",
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
            message: "Moved back to Waiting List",
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
            // 🔹 หา order ที่ถูกเลือก
            const selectedOrders = executionList.filter(o =>
                selectedExecutionIds.includes(o.order_id)
            );

            // 🔹 แยก MANUAL / AUTO
            const manualOrders = selectedOrders.filter(
                o => (o.execution_mode ?? "AUTO") === "MANUAL"
            );

            const autoOrders = selectedOrders.filter(
                o => (o.execution_mode ?? "AUTO") === "AUTO"
            );

            // =========================
            // 🔹 MANUAL → handleManualOrder (ส่งหลาย order พร้อมกัน)
            // =========================
            if (manualOrders.length > 0) {
                // แปลง manualOrders เป็น array ของ { order_id, actual_qty }
                const items = manualOrders.map(o => ({
                    order_id: o.order_id,
                    actual_qty: Number(o.plan_qty || 0) // ใช้ plan_qty แทน actual_qty
                }));

                const res = await ExecutionAPI.handleManualOrder(items);

                if (!res?.isCompleted) {
                    throw new Error(res?.message || "Failed to handle manual orders");
                }
            }

            // =========================
            // 🔹 AUTO → createTask
            // =========================
            if (autoOrders.length > 0) {
                const items = autoOrders.map(o => ({
                    order_id: o.order_id
                }));

                await ExecutionAPI.createTask({ items });
            }

            // 🔄 Refresh data
            await Promise.all([
                fetchDataWaitingAll(),
                fetchDataExecuteAll(),
            ]);

            setSelectedExecutionIds([]);

            setAlert({
                show: true,
                type: "success",
                title: "Success",
                message: "Confirm to Execution",
                onConfirm: () => {
                    navigate("/status");
                },
            });

        } catch (err) {
            console.error(err);
            setAlert({
                show: true,
                type: "error",
                title: "Error",
                message: err.response?.data?.message || err.message || "Something went wrong",
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

    const getStatusColor = (status) => {
        switch (status) {
            case "WAITING": return "#f39c12";
            case "PENDING": return "#3498db";
            case "PROCESSING": return "#9b59b6";
            case "QUEUE": return "#16a085";
            case "COMPLETED": return "#27ae60";
            case "FINISHED": return "#2ecc71";
            default: return "#333";
        }
    };
    // ฟังก์ชันสำหรับส่งไฟล์ที่เลือกไปยัง API
    const handleSubmitImport = async (mode = "CHECK") => {
        if (!selectedFile) return;

        try {
            Swal.fire({
                title: "Importing...",
                text: "Please wait while processing file",
                allowOutsideClick: false,
                allowEscapeKey: false,
                backdrop: "rgba(0,0,0,0.6)",
                didOpen: () => {
                    Swal.showLoading();
                },
            });

            const response = await ImportFileAPI.importReceiptFile(selectedFile, mode);

            Swal.close();

            // ✅ SUCCESS
            if (response.isCompleted) {

                const blocked = response.data?.blockedList || [];
                const successCount = response.data?.successCount || 0;

                // 🔥 มี BLOCKED → popup table
                if (blocked.length > 0) {

                    await Swal.fire({
                        title: "Import Completed (with issues)",
                        html: `
                            <div style="margin-bottom:10px;">
                                ✅ Success: ${successCount} <br/>
                                ⛔ Blocked: ${blocked.length}
                            </div>

                            <div style="max-height:300px; overflow:auto;">
                                <table style="
                                    width:100%;
                                    border-collapse: collapse;
                                    font-size: 13px;
                                    text-align: left;
                                ">
                                    <thead>
                                        <tr style="background:#f5f5f5;">
                                            <th style="padding:8px; border:1px solid #ddd;">#</th>
                                            <th style="padding:8px; border:1px solid #ddd;">Object ID</th>
                                            <th style="padding:8px; border:1px solid #ddd;">PO</th>
                                            <th style="padding:8px; border:1px solid #ddd;">Status</th>
                                            <th style="padding:8px; border:1px solid #ddd;">Row</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        ${blocked.map((x, i) => `
                                            <tr>
                                                <td style="padding:6px; border:1px solid #eee;">${i + 1}</td>
                                                <td style="padding:6px; border:1px solid #eee;">${x.object_id}</td>
                                                <td style="padding:6px; border:1px solid #eee;">${x.po_num || "-"}</td>
                                                <td style="
                                                    padding:6px;
                                                    border:1px solid #eee;
                                                    color: ${getStatusColor(x.status)};
                                                    font-weight: 600;
                                                ">
                                                    ${x.status}
                                                </td>
                                                <td style="padding:6px; border:1px solid #eee;">${x.row_no}</td>
                                            </tr>
                                        `).join("")}
                                    </tbody>
                                </table>
                            </div>
                        `,
                        width: "700px",
                        icon: "warning",
                    });

                } else {
                    // ✅ ไม่มีปัญหา
                    setAlert({
                        show: true,
                        type: "success",
                        title: "Success",
                        message: `Import success (${successCount} rows)`,
                    });
                }

                await fetchDataWaitingAll();
                setSelectedFile(null);
                setFileInputKey(Date.now());

                return;
            }

            // 🔥 HANDLE NEED_CONFIRM
            if (response.message === "NEED_CONFIRM") {

                const list = response.data?.overwriteCandidates || [];

                const result = await Swal.fire({
                    title: "Duplicate Orders Found",
                    html: `
                        <div style="margin-bottom:10px;">
                            ⚠️ Found ${list.length} duplicate records
                        </div>

                        <div style="max-height:300px; overflow:auto;">
                            <table style="
                                width:100%;
                                border-collapse: collapse;
                                font-size: 13px;
                                text-align: left;
                            ">
                                <thead>
                                    <tr style="background:#f5f5f5;">
                                        <th style="padding:8px; border:1px solid #ddd;">#</th>
                                        <th style="padding:8px; border:1px solid #ddd;">Object ID</th>
                                        <th style="padding:8px; border:1px solid #ddd;">PO</th>
                                        <th style="padding:8px; border:1px solid #ddd;">Status</th>
                                        <th style="padding:8px; border:1px solid #ddd;">Row</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    ${list.map((x, i) => `
                                        <tr>
                                            <td style="padding:6px; border:1px solid #eee;">${i + 1}</td>
                                            <td style="padding:6px; border:1px solid #eee;">${x.object_id}</td>
                                            <td style="padding:6px; border:1px solid #eee;">${x.po_num || "-"}</td>
                                            <td style="
                                                padding:6px;
                                                border:1px solid #eee;
                                                color: ${getStatusColor(x.status)};
                                                font-weight: 600;
                                            ">
                                                ${x.status}
                                            </td>
                                            <td style="padding:6px; border:1px solid #eee;">${x.row_no || "-"}</td>
                                        </tr>
                                    `).join("")}
                                </tbody>
                            </table>
                        </div>

                        <br/>
                        Do you want to overwrite or skip?
                    `,
                    width: "700px",
                    icon: "warning",
                    showCancelButton: true,
                    confirmButtonText: "Overwrite",
                    cancelButtonText: "Skip",
                    // 🔥 กัน user กดนอก popup
                    allowOutsideClick: false,
                    allowEscapeKey: false,
                });

                if (result.isConfirmed) {
                    // ✅ OVERWRITE
                    return handleSubmitImport("OVERWRITE");
                }
                if (result.dismiss === Swal.DismissReason.cancel) {
                    // ✅ SKIP (กดปุ่ม Skip เท่านั้น)
                    return handleSubmitImport("SKIP");
                }

                // ❗ กรณีอื่น (เช่นปิด modal) → ไม่ต้องทำอะไร
                return;
            }

            // ❌ ERROR ปกติ
            setAlert({
                show: true,
                type: "error",
                title: "Upload failed",
                message: response.message,
            });

        } catch (error) {
            Swal.close();

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
        
    const getSelectedWaitingIds = () => {
        return selectedWaitingIds.filter(id =>
            waitingList.some(r => r.order_id === id && r.status === "WAITING")
        );
    };
    
    const isDeleteWaitingDisabled = selectedWaitingIds.length === 0 || loading;

    const handleDeleteAll = async () => {
        // ✅ เอาเฉพาะ id ที่ user select
        // + เช็คว่าต้องเป็น WAITING เท่านั้น
        const waitingIds = getSelectedWaitingIds();

        if (waitingIds.length === 0) return;

        try {
            Swal.fire({
                title: "Deleting...",
                text: "Please wait while clearing selected waiting list",
                allowOutsideClick: false,
                allowEscapeKey: false,
                backdrop: "rgba(0,0,0,0.6)",
                didOpen: () => {
                    Swal.showLoading();
                },
            });

            const payload = {
                order_ids: waitingIds,
            };

            const res = await WaitingAPI.deleteWaiting(payload);

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
                    message: res.message || "Delete selected waiting success",
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
            Swal.close();

            console.error(err);

            setAlert({
                show: true,
                type: "error",
                title: "Error",
                message: err.response?.data?.message || "Something went wrong",
            });
        }
    };

    const handleToggleExecutionMode = async (orderId, nextMode) => {
        const order = executionList.find(o => o.order_id === orderId);
        if (!order) return;

        if (order.status !== "PENDING") return;

        try {
            // 🔹 ยิง API ทันที
            await OrdersAPI.updateExecutionModeMany({
                orders: [
                    {
                        order_id: orderId,
                        execution_mode: nextMode,
                    },
                ],
            });

            // 🔹 ถ้าสำเร็จ → update state
            setExecutionList(prev =>
                prev.map(o =>
                    o.order_id === orderId
                        ? { ...o, execution_mode: nextMode }
                        : o
                )
            );

        } catch (err) {
            console.error(err);

            setAlert({
                show: true,
                type: "error",
                title: "Error",
                message: err.response?.data?.message || "Update failed",
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
        { field: "po_num", label: "PO No." },
        { field: "object_id", label: "OBJECT ID" },
        { field: "requested_at", label: "Date" },
        { field: "stock_item", label: "Stock Item Number" },
        { field: "item_desc", label: "Stock Item Description" },
        { field: "cond", label: "Condition" },
        { field: "loc", label: "To Location" },
        { field: "box_loc", label: "To BIN" },
        { field: "unit_cost_handled", label: "Unit Cost" },
        { field: "total_cost_handled", label: "Total Cost" },
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
        {
            field: "execution_mode",
            label: "Auto / Manual",
            renderCell: (_, row) => (
                <ExecutionModeBadge
                mode={row.execution_mode}
                status={row.status}
                onToggle={(nextMode) =>
                    handleToggleExecutionMode(row.order_id, nextMode)
                }
                />
            ),
        },
        { field: "mc_code", label: "Maintenance Contract" },
        { field: "po_num", label: "PO No." },
        { field: "object_id", label: "OBJECT ID" },
        { field: "requested_at", label: "Date" },
        { field: "stock_item", label: "Stock Item Number" },
        { field: "item_desc", label: "Stock Item Description" },
        { field: "cond", label: "Condition" },
        { field: "loc", label: "To Location" },
        { field: "box_loc", label: "To BIN" },
        { field: "unit_cost_handled", label: "Unit Cost" },
        { field: "total_cost_handled", label: "Total Cost" },
        { field: "plan_qty", label: "Required Quantity" },
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
                Put - Waiting and Execution List
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
                    disabled={isDeleteWaitingDisabled}
                    >
                    Delete
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
                        <ButtonComponent
                            type="Confirm"
                            onClick={() => handleSubmitImport()}
                            />
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
            <Grid item xs={12} md={5.6}>
                <Card sx={{ p: 2, display: "flex", flexDirection: "column", minHeight: "500px" }}>
                <MDBox display="flex" justifyContent="space-between" alignItems="center">
                    <MDTypography variant="h5">
                        Put - Waiting List
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

                    {/* PO No. */}
                    <Grid item xs={12} md={4}>
                    <MDTypography variant="h6">PO No.</MDTypography>
                    <MDInput
                        placeholder="Text Field"
                        sx={{ height: "45px" }}
                        value={searchWaiting.po_num}
                        onChange={(e) =>
                        setSearchWaiting({ ...searchWaiting, po_num: e.target.value })
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

                    {/* OBJECT ID */}
                    <Grid item xs={12} md={4}>
                    <MDTypography variant="h6">OBJECT ID</MDTypography>
                    <MDInput
                        placeholder="Text Field"
                        sx={{ height: "45px" }}
                        value={searchWaiting.object_id}
                        onChange={(e) =>
                        setSearchWaiting({ ...searchWaiting, object_id: e.target.value })
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
                {/* Dialog */}
                <Grid container spacing={2}>

                    {/* To Location */}
                    <Grid item xs={12} md={6}>
                    <MDTypography variant="h6">To Location</MDTypography>
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

                    {/* To BIN */}
                    <Grid item xs={12} md={6}>
                    <MDTypography variant="h6">To BIN</MDTypography>
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

                    {/* Unit Cost */}
                    <Grid item xs={12} md={6}>
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
                    <Grid item xs={12} md={6}>
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

                    {/* Condition */}
                    <Grid item xs={12} md={6}>
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
                        Put - Execution List
                    </MDTypography>

                    <MDButton
                        variant="contained"
                        color="info"
                        onClick={() => setOpenAdvanceExecution(true)}
                    >
                        Advance Search
                    </MDButton>
                </MDBox>

                {/* Filters*/}
                <Grid container spacing={2} mb={2} mt={0.1}>

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

                    {/* PO No. */}
                    <Grid item xs={12} md={4}>
                    <MDTypography variant="h6">PO No.</MDTypography>
                    <MDInput
                        placeholder="Text Field"
                        sx={{ height: "45px" }}
                        value={searchExecution.po_num}
                        onChange={(e) =>
                        setSearchExecution({ ...searchExecution, po_num: e.target.value })
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
                    
                    {/* OBJECT ID */}
                    <Grid item xs={12} md={4}>
                    <MDTypography variant="h6">OBJECT ID</MDTypography>
                    <MDInput
                        placeholder="Text Field"
                        sx={{ height: "45px" }}
                        value={searchExecution.object_id}
                        onChange={(e) =>
                        setSearchExecution({ ...searchExecution, object_id: e.target.value })
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

                    {/* To Location */}
                    <Grid item xs={12} md={6}>
                    <MDTypography variant="h6">To Location</MDTypography>
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

                    {/* To BIN */}
                    <Grid item xs={12} md={6}>
                    <MDTypography variant="h6">To BIN</MDTypography>
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

                    {/* Unit Cost */}
                    <Grid item xs={12} md={6}>
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
                    <Grid item xs={12} md={6}>
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

                    {/* Condition */}
                    <Grid item xs={12} md={6}>
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

export default PutExecutionPage;
