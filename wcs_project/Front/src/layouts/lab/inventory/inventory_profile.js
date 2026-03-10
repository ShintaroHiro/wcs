import React, { useState, useEffect } from "react"; // นำเข้า useState และ useEffect จาก React
import { Card, Grid, InputAdornment, Box } from "@mui/material"; // นำเข้า components จาก MUI (Material-UI)
import SweetAlertComponent from "../components/sweetAlert";
import DashboardLayout from "examples/LayoutContainers/DashboardLayout"; // นำเข้า layout component
import DashboardNavbar from "examples/Navbars/DashboardNavbar"; // นำเข้า navbar component
import MDBox from "components/MDBox";
import MDTypography from "components/MDTypography";
import StockItemsAPI from "api/StockItemsAPI";
import { GlobalVar } from "../../../common/GlobalVar";
import ReusableDataTable from "../components/table_component_v2";
import MDButton from "components/MDButton";
import ItemsFormDialog from "./inventory_profile_form";
import MDInput from "components/MDInput";
import SearchIcon from "@mui/icons-material/Search";
import ImportFileAPI from "api/ImportAPI";
import ButtonComponent from "../components/ButtonComponent";
import Swal from "sweetalert2";
import { getStoreTypeTrans } from "common/utils/storeTypeHelper";

const InventoryProfile = () => {
    const storeType = GlobalVar.getStoreType();
    const storeTypeTrans = getStoreTypeTrans(storeType);
    
    const [loading , setLoading] = useState(true);
    const [deleteItems, setDeleteItems] = useState(null); // รหัสที่จะลบ
    const [confirmAlert, setConfirmAlert] = useState(false);
    const [alert, setAlert] = useState({
        show: false,
        type: "success",
        title: "",
        message: "",
    });
    const [itemsList, setItemsList] = useState([]);
    const [filteredItems, setFilteredItems] = useState([]);
    const [searchItems, setSearchItems] = useState({
        stock_item: "",
        item_desc: "",
        order_unit: "",
        com_group: "",
        catg_code: "",
        cond_en: "",
        item_status: "",
        item_system: ""
    });

    const [formOpen, setFormOpen] = useState(false);
    const [formMode, setFormMode] = useState("create"); // "create" | "edit"
    const [editingItems, setEditingItems] = useState(null);

    // นำเข้า useState หากยังไม่ได้ import
    const [selectedFile, setSelectedFile] = useState(null);
    // state สำหรับ key ของ input element เพื่อบังคับ re-mount
    const [fileInputKey, setFileInputKey] = useState(Date.now());

    const fetchDataAll = async () => {
        try {
            const response = await StockItemsAPI.getAll();

            const list = Array.isArray(response?.data) ? response.data : [];

            const mappedList = list.map((item) => ({
            ...item,
            item_img: item.item_img ? "Yes" : "No",
            }));

            setItemsList(mappedList);
        } catch (error) {
            console.error("Error fetching data: ", error);
            setItemsList([]);
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
        const filtered = itemsList.filter(
            (item) =>
                includesIgnoreCase(item.stock_item, searchItems.stock_item) &&
                includesIgnoreCase(item.item_desc, searchItems.item_desc) &&
                includesIgnoreCase(item.item_img, searchItems.item_img) &&
                includesIgnoreCase(item.mc_code, searchItems.mc_code) &&
                includesIgnoreCase(item.order_unit, searchItems.order_unit) &&
                includesIgnoreCase(item.com_group, searchItems.com_group) &&
                includesIgnoreCase(item.item_system, searchItems.item_system) &&
                includesIgnoreCase(item.cond_en, searchItems.cond_en) &&
                includesIgnoreCase(item.item_status, searchItems.item_status) &&
                includesIgnoreCase(item.catg_code, searchItems.catg_code)
            );
        setFilteredItems(filtered);
    }, [itemsList, searchItems]);

    const handleAdd = () => {
        setFormMode("create");
        setEditingItems(null);
        setFormOpen(true);
    };

    const fetchDataById = async (item_id) => {
        try {
        const response = await StockItemsAPI.getByID(item_id);
        if (response.isCompleted) {
            const data = response.data;
            setEditingItems({
            item_id: data.item_id,
            stock_item: data.stock_item,
            item_desc: data.item_desc ?? "",
            item_img: data.item_img ?? "",
            item_img_url: data.item_img_url ?? "",
            order_unit: data.order_unit,
            com_group: data.com_group,
            catg_code: data.catg_code,
            cond_en: data.cond_en,
            item_status: data.item_status,
            item_system: data.item_system
            });
            setFormOpen(true); // เปิดฟอร์มหลังได้ข้อมูล
        } else {
            console.error("Failed to fetch stock items:", response.message);
        }
        } catch (error) {
        console.error("Error fetching stock items by id:", error);
        }
    };

    const handleEditClick = (row) => {
        setFormMode("edit");
        fetchDataById(row.item_id); // ใช้ item_id ดึงข้อมูล
    };

    const handleSubmitForm = async (payload) => {
        try {

        let res;
        if (formMode === "edit") {
            res = await StockItemsAPI.update(editingItems.item_id, payload);
        } else {
            res = await StockItemsAPI.create(payload);
        }

        if (res?.isCompleted) {
            setAlert({
            show: true,
            type: "success",
            title: formMode === "edit" ? "Updated" : "Created",
            message: res.message,
            });
            await fetchDataAll();
            return true;
        } else {
            setAlert({
            show: true,
            type: "error",
            title: "Error",
            message: res?.message || "Failed",
            });
            return false;
        }
        } catch (err) {
        console.error("Error in handleSubmitForm:", err);
        return false;
        }
    };

    const handleDelete = async () => {
        if (!deleteItems) return;

        try {
        const response = await StockItemsAPI.delete(deleteItems);
        if (response.isCompleted) {
            setAlert({
            show: true,
            type: "success",
            title: "Success",
            message: response.message,
            });
            await fetchDataAll();
        } else {
            setAlert({
            show: true,
            type: "error",
            title: "Error",
            message: response.message,
            });
        }
        } catch (error) {
        console.error("Error during submit:", error);
        } finally {
        setConfirmAlert(false); // ซ่อน SweetAlert ยืนยัน
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

            const response = await ImportFileAPI.importItemFile(selectedFile);

            // ❌ ปิด loading
            Swal.close();

            if (response.isCompleted) {
            setAlert({
                show: true,
                type: "success",
                title: "Success",
                message: response.message,
            });

            await fetchDataAll();
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

    const handleDeleteAll = async () => {
        if (itemsList.length === 0) {
            setAlert({
                show: true,
                type: "warning",
                title: "Warning",
                message: "No data to delete",
            });
            return;
        }

        try {
            // 🔄 แสดง loading
            Swal.fire({
                title: "Deleting...",
                text: "Please wait while deleting all items master",
                allowOutsideClick: false,
                allowEscapeKey: false,
                backdrop: "rgba(0,0,0,0.6)",
                didOpen: () => {
                    Swal.showLoading();
                },
            });

            // 🔥 ส่ง empty payload เพื่อสื่อว่า DELETE ALL
            const res = await StockItemsAPI.deleteAll({});

            // ❌ ปิด loading
            Swal.close();

            await fetchDataAll();

            if (res?.isCompleted) {
                setAlert({
                    show: true,
                    type: "success",
                    title: "Success",
                    message: res.message || "Delete all items master success",
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

            console.error("DELETE ALL ERROR:", err);

            setAlert({
                show: true,
                type: "error",
                title: "Error",
                message: err.response?.data?.message || "Something went wrong",
            });
        }
    };


    const columns = [
        { field: "stock_item", label: "Stock Item No." },
        { field: "item_desc", label: "Stock Item Description" },
        { field: "item_img", label: "Photo" },
        { field: "mc_code", label: "Maintenance Contract" },
        { field: "order_unit", label: "Order Unit" },
        { field: "com_group", label: "Commodity Group" },
        { field: "cond_en", label: "Condition Enabled" },
        { field: "item_status", label: "Status" },
        { field: "catg_code", label: "Category Code" },
        { field: "item_system", label: "System" },
    ];
    
    return (
        <DashboardLayout>
        <DashboardNavbar />
        {/* ===== Header Home ===== */}
        <MDBox p={2}>
            <Box display="flex" alignItems="baseline" gap={1}>
            {/* storeTypeTrans + underline */}
            <Box display="inline-block">
                <MDTypography variant="h3" fontWeight="bold" gutterBottom>
                {storeTypeTrans}
                </MDTypography>
                <Box
                sx={{
                    width: "100%",
                    height: "5px",
                    backgroundColor: "#FFA726",
                    borderRadius: "4px",
                }}
                />
            </Box>
            {/* Inventory Profile */}
            <MDTypography variant="h3" color="bold">
                - Inventory - Item Master
            </MDTypography>
            </Box>
        </MDBox>

            {/* --------------------------------------------------
                เพิ่ม IMPORT
            --------------------------------------------------- */}
            {/* 🟠 ขวา : ปุ่ม (Create + Import บน, Delete All ล่าง) */}
            <MDBox
                display="flex"
                flexDirection="column"
                alignItems="flex-end"
                gap={2}
                mb={3}
                >
                {/* ===== แถวบน : Create ===== */}
                <MDBox display="flex" justifyContent="flex-end">
                    <MDButton variant="contained" color="info" onClick={handleAdd}>
                    Create
                    </MDButton>
                </MDBox>

                {/* ===== แถวล่าง : Import + Delete All ===== */}
                <MDBox
                    display="flex"
                    alignItems="center"
                    gap={2}
                    flexWrap="wrap"   // กันจอเล็กล้น
                >
                    {/* Delete All */}
                    <MDButton
                    variant="contained"
                    color="secondary"
                    onClick={handleDeleteAll}
                    >
                    Delete All
                    </MDButton>
                    
                    {/* Import */}
                    <MDBox display="flex" alignItems="center" gap={1}>
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

                    {/* หลังเลือกไฟล์ */}
                    {selectedFile && (
                        <>
                        <MDTypography variant="body2">
                            {selectedFile.name}
                        </MDTypography>

                        <ButtonComponent
                            onClick={handleClearFile}
                            type="iconDelete"
                        />

                        <ButtonComponent
                            type="Confirm"
                            onClick={handleSubmitImport}
                        />
                        </>
                    )}
                    </MDBox>

                </MDBox>
                </MDBox>


        <MDBox mt={1}>
            <Card>
            <MDBox p={3}>
                {
                <Grid container spacing={2} sx={{ mb: 0.5 }}>
                    {/* Stock Item No. */}
                    <Grid item xs={12} md={2.4}>
                    <MDTypography variant="caption" fontWeight="bold">
                        Stock Item No.
                    </MDTypography>
                    <MDInput
                        placeholder="Text Field"
                        sx={{ height: "45px" }}
                        value={searchItems.stock_item}
                        onChange={(e) => setSearchItems({ ...searchItems, stock_item: e.target.value })}
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
                    <Grid item xs={12} md={2.4}>
                    <MDTypography variant="caption" fontWeight="bold">
                        Stock Item Description
                    </MDTypography>
                    <MDInput
                        placeholder="Text Field"
                        sx={{ height: "45px" }}
                        value={searchItems.item_desc}
                        onChange={(e) => setSearchItems({ ...searchItems, item_desc: e.target.value })}
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

                    {/* Photo */}
                    <Grid item xs={12} md={2.4}>
                    <MDTypography variant="caption" fontWeight="bold">
                        Photo
                    </MDTypography>
                    <MDInput
                        placeholder="Text Field"
                        sx={{ height: "45px" }}
                        value={searchItems.item_img}
                        onChange={(e) => setSearchItems({ ...searchItems, item_img: e.target.value })}
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
                    
                    {/* Maintenance Contract */}
                    <Grid item xs={12} md={2.4}>
                    <MDTypography variant="caption" fontWeight="bold">
                        Maintenance Contract
                    </MDTypography>
                    <MDInput
                        placeholder="Text Field"
                        sx={{ height: "45px" }}
                        value={searchItems.mc_code}
                        onChange={(e) => setSearchItems({ ...searchItems, mc_code: e.target.value })}
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

                    {/* Order Unit */}
                    <Grid item xs={12} md={2.4}>
                    <MDTypography variant="caption" fontWeight="bold">
                        Order Unit
                    </MDTypography>
                    <MDInput
                        placeholder="Text Field"
                        sx={{ height: "45px" }}
                        value={searchItems.order_unit}
                        onChange={(e) => setSearchItems({ ...searchItems, order_unit: e.target.value })}
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
                    
                    {/* Commodity Group */}
                    <Grid item xs={12} md={2.4}>
                    <MDTypography variant="caption" fontWeight="bold">
                        Commodity Group
                    </MDTypography>
                    <MDInput
                        placeholder="Text Field"
                        sx={{ height: "45px" }}
                        value={searchItems.com_group}
                        onChange={(e) => setSearchItems({ ...searchItems, com_group: e.target.value })}
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

                    {/* Condition Enabled */}
                    <Grid item xs={12} md={2.4}>
                    <MDTypography variant="caption" fontWeight="bold">
                        Condition Enabled
                    </MDTypography>
                    <MDInput
                        placeholder="Text Field"
                        sx={{ height: "45px" }}
                        value={searchItems.cond_en}
                        onChange={(e) => setSearchItems({ ...searchItems, cond_en: e.target.value })}
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
                    
                    {/* Status */}
                    <Grid item xs={12} md={2.4}>
                    <MDTypography variant="caption" fontWeight="bold">
                        Status
                    </MDTypography>
                    <MDInput
                        placeholder="Text Field"
                        sx={{ height: "45px" }}
                        value={searchItems.item_status}
                        onChange={(e) => setSearchItems({ ...searchItems, item_status: e.target.value })}
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

                    {/* Category Code */}
                    <Grid item xs={12} md={2.4}>
                    <MDTypography variant="caption" fontWeight="bold">
                        Category Code
                    </MDTypography>
                    <MDInput
                        placeholder="Text Field"
                        sx={{ height: "45px" }}
                        value={searchItems.catg_code}
                        onChange={(e) => setSearchItems({ ...searchItems, catg_code: e.target.value })}
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
                    
                    {/* System */}
                    <Grid item xs={12} md={2.4}>
                    <MDTypography variant="caption" fontWeight="bold">
                        System
                    </MDTypography>
                    <MDInput
                        placeholder="Text Field"
                        sx={{ height: "45px" }}
                        value={searchItems.item_system}
                        onChange={(e) => setSearchItems({ ...searchItems, item_system: e.target.value })}
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
                }
                {loading ? (
                <div>Loading...</div>
                ) : (
                <ReusableDataTable
                    columns={columns}
                    rows={filteredItems}
                    idField="item_id"
                    defaultPageSize={10}
                    pageSizeOptions={[10, 25, 50]}
                    showActions={["edit", "delete"]}
                    onEdit={(row) => handleEditClick(row)}
                    onDelete={(row) => {
                        setDeleteItems(row.item_id);
                        setConfirmAlert(true);
                    }}
                />
                )}
            </MDBox>
            </Card>
        </MDBox>

        {/* Pop-up */}
        <ItemsFormDialog
            open={formOpen}
            mode={formMode}
            initialData={editingItems}
            onClose={() => setFormOpen(false)}
            onSubmit={handleSubmitForm}
        />

        {confirmAlert && (
            <SweetAlertComponent
            type="error"
            title="Confirm Deletion"
            message="Are you sure you want to delete this data?"
            show={confirmAlert}
            showCancel
            confirmText="OK"
            cancelText="Cancel"
            onConfirm={handleDelete}
            onCancel={() => setConfirmAlert(false)}
            />
        )}
        <SweetAlertComponent
            show={alert.show}
            type={alert.type}
            title={alert.title}
            message={alert.message}
            onConfirm={() => setAlert({ ...alert, show: false })}
        />
        </DashboardLayout>
    );
};
export default InventoryProfile;
