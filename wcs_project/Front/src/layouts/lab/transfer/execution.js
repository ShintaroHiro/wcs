import React, { useState, useEffect } from "react";
import { Grid, Card, IconButton, InputAdornment, FormControl } from "@mui/material";
import AddCircleIcon from "@mui/icons-material/AddCircle";
import RemoveCircleIcon from "@mui/icons-material/RemoveCircle";

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
import StatusBadge from "../components/statusBadge";
import {
  normalizeStatus,
  STATUS_STYLE,
} from "common/utils/statusUtils";
import ExecutionModeBadge from "../components/executionModeBadge";
import ButtonComponent from "../components/ButtonComponent";
import Swal from "sweetalert2";
import dayjs from "dayjs";

//store
const TransferExecutionPage = () => {
    const [waitingList, setWaitingList] = useState([]);
    const [executionList, setExecutionList] = useState([]);

    const [filteredWaiting, setFilteredWaiting] = useState([]);
    const [filteredExecution, setFilteredExecution] = useState([]);

    // นำเข้า useState หากยังไม่ได้ import
    const [selectedFile, setSelectedFile] = useState(null);
     // state สำหรับ key ของ input element เพื่อบังคับ re-mount
    const [fileInputKey, setFileInputKey] = useState(Date.now());

    const [searchWaiting, setSearchWaiting] = useState({
        object_id: "",
        mc_code: "",
        stock_item: "", 
        item_desc: "",
        cond: "", 
        from_loc: "",
        from_box_loc: "",
        to_loc: "",
        to_box_loc: "",
        unit_cost_handled: "",
        total_cost_handled: "",
    });
    const [searchExecution, setSearchExecution] = useState({
        object_id: "",
        mc_code: "",
        stock_item: "", 
        item_desc: "",
        cond: "",
        from_loc: "",
        from_box_loc: "",
        to_loc: "",
        to_box_loc: "",
        unit_cost_handled: "",
        total_cost_handled: "",
        status: "",
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

    const [overdueChecked, setOverdueChecked] = useState(false);

    // --------------------------------------------------
    // FETCH API
    // --------------------------------------------------
    const fetchDataWaitingAll = async () => {
        setLoading(true);
        try {
        const response = await OrdersAPI.OrdersTransferAll({
            isExecution: true,
            //mc_code: mcCodes,
            store_type: storeType === "WCS" ? undefined : storeType,
        });
        //console.log("storeType:", storeType);
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
        const response = await OrdersAPI.OrdersTransferAll({
            isExecution: false,
            //mc_code: mcCodes,
            store_type: storeType === "WCS" ? undefined : storeType, 
        });
        console.log("storeType:", storeType);
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

            const selectedOrders = waitingList.filter(o =>
                selectedWaitingIds.includes(o.order_id)
            );

            const payload = {
                items: selectedWaitingIds.map(id => ({ order_id: id }))
            };

            // 🔥 หาเฉพาะ INTERNAL
            const internalOrders = selectedOrders.filter(o =>
                o.transfer_scenario === "INTERNAL_OUT" ||
                o.transfer_scenario === "INTERNAL_IN"
            );

            // ยิง changeToPending เสมอ
            const promises = [
                ExecutionAPI.changeToPending(payload)
            ];

            // 🔥 ยิง transferChangeStatus เฉพาะ INTERNAL
            if (internalOrders.length > 0) {
                promises.push(
                    ExecutionAPI.transferChangeStatus({
                        items: internalOrders.map(o => ({ order_id: o.order_id })),
                        transfer_status: "PENDING"
                    })
                );
            }

            await Promise.all(promises);

            await Promise.all([
                fetchDataWaitingAll(),
                fetchDataExecuteAll()
            ]);

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

            const selectedOrders = executionList.filter(o =>
                selectedExecutionIds.includes(o.order_id)
            );

            const payload = {
                items: selectedExecutionIds.map(id => ({ order_id: id }))
            };

            // 🔥 หาเฉพาะ INTERNAL
            const internalOrders = selectedOrders.filter(o =>
                o.transfer_scenario === "INTERNAL_OUT" ||
                o.transfer_scenario === "INTERNAL_IN"
            );

            const promises = [
                ExecutionAPI.changeToWaiting(payload)
            ];

            // 🔥 ยิง transferChangeStatus เฉพาะ INTERNAL
            if (internalOrders.length > 0) {
                promises.push(
                    ExecutionAPI.transferChangeStatus({
                        items: internalOrders.map(o => ({ order_id: o.order_id })),
                        transfer_status: "WAITING"
                    })
                );
            }

            await Promise.all(promises);

            await Promise.all([
                fetchDataWaitingAll(),
                fetchDataExecuteAll()
            ]);

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
    // const handleConfirm = async () => {
    //     if (selectedExecutionIds.length === 0) return;

    //     try {

    //         const selectedOrders = executionList.filter(o =>
    //             selectedExecutionIds.includes(o.order_id)
    //         );

    //         const manualOrders = selectedOrders.filter(
    //             o => (o.execution_mode ?? "AUTO") === "MANUAL"
    //         );

    //         const autoOrders = selectedOrders.filter(
    //             o => (o.execution_mode ?? "AUTO") === "AUTO"
    //         );

    //         // 🔥 เปลี่ยนเป็น PROCESSING ก่อน
    //         const internalOrders = selectedOrders.filter(o =>
    //             o.transfer_scenario === "INTERNAL_OUT" ||
    //             o.transfer_scenario === "INTERNAL_IN"
    //         );

    //         if (internalOrders.length > 0) {
    //             await ExecutionAPI.transferChangeStatus({
    //                 items: internalOrders.map(o => ({ order_id: o.order_id })),
    //                 transfer_status: "PROCESSING"
    //             });
    //         }


    //         // 🔹 MANUAL
    //         if (manualOrders.length > 0) {

    //             const orderIds = [];
    //             const mainOrderIds = manualOrders.map(o => o.order_id); // 🔥 เอาเฉพาะตัวหลัก

    //             manualOrders.forEach(o => {

    //                 orderIds.push(o.order_id);

    //                 if (
    //                     o.transfer_scenario === "INTERNAL_OUT" &&
    //                     o.related_order_id
    //                 ) {
    //                     orderIds.push(o.related_order_id);
    //                 }

    //             });

    //             const uniqueIds = [...new Set(orderIds)];

    //             // 1️⃣ submit transfer (รวม related)
    //             await WaitingAPI.submitTransfer({
    //                 order_ids: uniqueIds,
    //             });

    //             // 2️⃣ 🔥 update COMPLETED เฉพาะ order หลัก
    //             await ExecutionAPI.transferChangeStatus({
    //                 items: mainOrderIds.map(id => ({ order_id: id })),
    //                 transfer_status: "COMPLETED"
    //             });
    //         }

    //         // 🔹 AUTO
    //         if (autoOrders.length > 0) {

    //             const items = [];

    //             autoOrders.forEach(o => {

    //                 // ใส่ order หลักเสมอ
    //                 items.push({ order_id: o.order_id });

    //                 // 🔥 ถ้าเป็น INTERNAL_OUT ให้ใส่ related_order_id ด้วย
    //                 if (
    //                     o.transfer_scenario === "INTERNAL_OUT" &&
    //                     o.related_order_id
    //                 ) {
    //                     items.push({ order_id: o.related_order_id });
    //                 }

    //             });

    //             await ExecutionAPI.createTask({
    //                 items,
    //             });
    //         }

    //         await Promise.all([
    //             fetchDataWaitingAll(),
    //             fetchDataExecuteAll(),
    //         ]);

    //         setSelectedExecutionIds([]);

    //         setAlert({
    //             show: true,
    //             type: "success",
    //             title: "Success",
    //             message: "Confirm to Execution",
    //             onConfirm: () => navigate("/status"),
    //         });

    //     } catch (err) {
    //         console.error(err);
    //         setAlert({
    //             show: true,
    //             type: "error",
    //             title: "Error",
    //             message: err.response?.data?.message || "Something went wrong",
    //         });
    //     }
    // };

    //V2
    const handleConfirm = async () => {
    if (selectedExecutionIds.length === 0) return;

    try {

        const selectedOrders = executionList.filter(o =>
            selectedExecutionIds.includes(o.order_id)
        );

        const manualOrders = selectedOrders.filter(
            o => (o.execution_mode ?? "AUTO") === "MANUAL"
        );

        const autoOrders = selectedOrders.filter(
            o => (o.execution_mode ?? "AUTO") === "AUTO"
        );

        // 🔥 เปลี่ยน INTERNAL เป็น PROCESSING ก่อน
        const internalOrders = selectedOrders.filter(o =>
            o.transfer_scenario === "INTERNAL_OUT" ||
            o.transfer_scenario === "INTERNAL_IN"
        );

        if (internalOrders.length > 0) {
            await ExecutionAPI.transferChangeStatus({
                items: internalOrders.map(o => ({ order_id: o.order_id })),
                transfer_status: "PROCESSING"
            });
        }

        // =========================
        // 🔹 MANUAL → handleManualOrder
        // =========================
        if (manualOrders.length > 0) {

            const items = [];

            manualOrders.forEach(o => {

                // order หลัก
                items.push({
                    order_id: o.order_id,
                    actual_qty: Number(o.plan_qty || 0)
                });

                // 🔥 INTERNAL_OUT ต้องยิง related_order ด้วย
                if (
                    o.transfer_scenario === "INTERNAL_OUT" &&
                    o.related_order_id
                ) {
                    items.push({
                        order_id: o.related_order_id,
                        actual_qty: Number(o.plan_qty || 0)
                    });
                }

            });

            const res = await ExecutionAPI.handleManualOrder(items);

            if (!res?.isCompleted) {
                throw new Error(res?.message || "Failed to handle manual orders");
            }
        }

        // =========================
        // 🔹 AUTO → createTask
        // =========================
        if (autoOrders.length > 0) {

            const items = [];

            autoOrders.forEach(o => {

                items.push({ order_id: o.order_id });

                if (
                    o.transfer_scenario === "INTERNAL_OUT" &&
                    o.related_order_id
                ) {
                    items.push({ order_id: o.related_order_id });
                }

            });

            await ExecutionAPI.createTask({
                items,
            });
        }

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
            onConfirm: () => navigate("/status"),
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
                    
                    const response = await ImportFileAPI.importReceiptFile(selectedFile);
    
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
    
                 // 🔥 ดึง order เต็มจาก waitingList
        const selectedOrders = waitingList.filter(o =>
            waitingIds.includes(o.order_id)
        );

        // 🔥 สร้าง order_ids ใหม่ (รวม related_order_id)
        const orderIds = [];

        selectedOrders.forEach(o => {

            // ใส่ order หลัก
            orderIds.push(o.order_id);

            // 🔥 ถ้าเป็น INTERNAL_OUT ให้ใส่ related_order_id ด้วย
            if (
                o.transfer_scenario === "INTERNAL_OUT" &&
                o.related_order_id
            ) {
                orderIds.push(o.related_order_id);
            }
        });

        const payload = {
            order_ids: orderIds,
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

    const handleToggleExecutionMode = async (orderId, nextMode) => {
        const order = executionList.find(o => o.order_id === orderId);

        if (!order) return;

        if (order.status !== "PENDING") return;

        // 🔴 INBOUND = MANUAL ONLY
        if (order.transfer_scenario === "INBOUND" && nextMode === "AUTO") {
            setAlert({
                show: true,
                type: "warning",
                title: "Not Allowed",
                message: "Order transfer from Non-WMS Store to WCS",
            });
            return;
        }

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

            // setAlert({
            //     show: true,
            //     type: "success",
            //     title: "Success",
            //     message: "Execution mode updated",
            // });

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
                Transfer - Waiting and Execution List
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
                    Transfer - Waiting List
                </MDTypography>

                {/* Filters */}
                <Grid container spacing={2} mb={2}>

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

                    {/* From Location */}
                    <Grid item xs={12} md={4}>
                    <MDTypography variant="h6">From Location</MDTypography>
                    <MDInput
                        placeholder="Text Field"
                        sx={{ height: "45px" }}
                        value={searchWaiting.from_loc}
                        onChange={(e) =>
                        setSearchWaiting({ ...searchWaiting, from_loc: e.target.value })
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
                    <Grid item xs={12} md={4}>
                    <MDTypography variant="h6">From BIN</MDTypography>
                    <MDInput
                        placeholder="Text Field"
                        sx={{ height: "45px" }}
                        value={searchWaiting.from_box_loc}
                        onChange={(e) =>
                        setSearchWaiting({ ...searchWaiting, from_box_loc: e.target.value })
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
                    <Grid item xs={12} md={4}>
                    <MDTypography variant="h6">To Location</MDTypography>
                    <MDInput
                        placeholder="Text Field"
                        sx={{ height: "45px" }}
                        value={searchWaiting.to_loc}
                        onChange={(e) =>
                        setSearchWaiting({ ...searchWaiting, to_loc: e.target.value })
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
                    <Grid item xs={12} md={4}>
                    <MDTypography variant="h6">To BIN</MDTypography>
                    <MDInput
                        placeholder="Text Field"
                        sx={{ height: "45px" }}
                        value={searchWaiting.to_box_loc}
                        onChange={(e) =>
                        setSearchWaiting({ ...searchWaiting, to_box_loc: e.target.value })
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
                    Transfer - Execution List
                </MDTypography>

                {/* Filters */}
                <Grid container spacing={2} mb={2}>
{/* 
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

                    {/* From Location */}
                    <Grid item xs={12} md={4}>
                    <MDTypography variant="h6">From Location</MDTypography>
                    <MDInput
                        placeholder="Text Field"
                        sx={{ height: "45px" }}
                        value={searchExecution.from_loc}
                        onChange={(e) =>
                        setSearchExecution({ ...searchExecution, from_loc: e.target.value })
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
                    <Grid item xs={12} md={4}>
                    <MDTypography variant="h6">From BIN</MDTypography>
                    <MDInput
                        placeholder="Text Field"
                        sx={{ height: "45px" }}
                        value={searchExecution.from_box_loc}
                        onChange={(e) =>
                        setSearchExecution({ ...searchExecution, from_box_loc: e.target.value })
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
                    <Grid item xs={12} md={4}>
                    <MDTypography variant="h6">To Location</MDTypography>
                    <MDInput
                        placeholder="Text Field"
                        sx={{ height: "45px" }}
                        value={searchExecution.to_loc}
                        onChange={(e) =>
                        setSearchExecution({ ...searchExecution, to_loc: e.target.value })
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
                    <Grid item xs={12} md={4}>
                    <MDTypography variant="h6">To BIN</MDTypography>
                    <MDInput
                        placeholder="Text Field"
                        sx={{ height: "45px" }}
                        value={searchExecution.to_box_loc}
                        onChange={(e) =>
                        setSearchExecution({ ...searchExecution, to_box_loc: e.target.value })
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

export default TransferExecutionPage;
