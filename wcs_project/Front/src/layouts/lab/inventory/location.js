import React, { useState, useEffect } from "react"; // นำเข้า useState และ useEffect จาก React
import { Card, Grid, InputAdornment, Box, FormControl } from "@mui/material"; // นำเข้า components จาก MUI (Material-UI)
import SweetAlertComponent from "../components/sweetAlert";
import DashboardLayout from "examples/LayoutContainers/DashboardLayout"; // นำเข้า layout component
import DashboardNavbar from "examples/Navbars/DashboardNavbar"; // นำเข้า navbar component
import MDBox from "components/MDBox";
import MDTypography from "components/MDTypography";
import LocationsAPI from "api/LocationsAPI";
import InventoryAPI from "api/InventoryAPI";
import { GlobalVar } from "../../../common/GlobalVar";
import ReusableDataTable from "../components/table_component_v2";
import MDButton from "components/MDButton";
import LocationsFormDialog from "./location_form";
import MDInput from "components/MDInput";
import SearchIcon from "@mui/icons-material/Search";
import { getStoreTypeTrans } from "common/utils/storeTypeHelper";
import { StoreType, Condition } from "common/dataMain";
import { StyledMenuItem, StyledSelect } from "common/Global.style";

const LocationMaster = () => {
    const storeType = GlobalVar.getStoreType();
    const storeTypeTrans = getStoreTypeTrans(storeType);
    
    const [isInventoryView, setIsInventoryView] = useState(false);
    const [loading , setLoading] = useState(true);
    const [deleteLoc, setDeleteLoc] = useState(null); // รหัสที่จะลบ
    const [confirmAlert, setConfirmAlert] = useState(false);
    const [alert, setAlert] = useState({
        show: false,
        type: "success",
        title: "",
        message: "",
    });

    // inventory(Box)
    const [inventoryList, setInventoryList] = useState([]);
    const [filteredInventory, setFilteredInventory] = useState([]);
    const [searchInventory, setSearchInventory] = useState({ 
        stock_item: "",
        item_desc: "",
        mc_code: "",
        total_inv_qty: "",
        avg_unit_cost: "",
        total_cost_inv: "",
        cond: "",
        loc: "",
        box_loc: "",
        item_status: "",
        org_id: "",
        dept: ""
    });
    const [filterCondition, setFilterCondition] = useState("");

    //location
    const [locList, setLocList] = useState([]);
    const [filteredLocs, setFilteredLocs] = useState([]);
    const [searchLocs, setSearchLocs] = useState({
        store_type: "",
        loc: "",
        box_loc: "",
    });

    const [formOpen, setFormOpen] = useState(false);
    const [formMode, setFormMode] = useState("create"); // "create" | "edit"
    const [editingLocs, setEditingLocs] = useState(null);

    const [filterLocation, setFilterLocation] = useState("");

    const fetchDataAll = async () => {
        try {
            const response = await LocationsAPI.getAll();

            const list = Array.isArray(response?.data) ? response.data : [];

            const mappedList = list.map((locs) => ({
            ...locs,
            }));

            setLocList(mappedList);
            setFilteredLocs(mappedList);
        } catch (error) {
            console.error("Error fetching data: ", error);
            setLocList([]);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchDataAll();
    }, []);

    //bin location
    const fetchInventoryData = async () => {
        try {
            const response = await InventoryAPI.getBoxAll();

            const list = Array.isArray(response?.data) ? response.data : [];

            const mappedList = list.map((boxs) => ({
            ...boxs,
            }));

            setInventoryList(mappedList);
            setFilteredInventory(mappedList);
        } catch (error) {
            console.error("Error fetching boxes: ", error);
        } finally {
            setLoading(false);
        }
    };

    /* =============================
        TOGGLE VIEW
    ============================== */

    const handleToggleView = () => {
        setIsInventoryView(prev => {
        const newValue = !prev;

        // ถ้าเพิ่งเข้า Inventory View และยังไม่มี data → fetch
        if (newValue && inventoryList.length === 0) {
            fetchInventoryData();
        }

        return newValue;
        });
    };

    //ฟังก์ชัน พิมพ์เล็ก / ใหญ่ , รองรับ number, null, undefined , trim
    const includesIgnoreCase = (value, search) => {
        if (!search) return true; // ถ้าไม่ได้พิมพ์อะไร = ผ่าน
        return String(value ?? "")
            .toLowerCase()
            .trim()
            .includes(String(search).toLowerCase().trim());
    };
    
    // --- Filter Logic Location ---
    useEffect(() => {
        const filtered = locList.filter(
            (locs) =>
                (filterLocation === "" || locs.store_type === filterLocation) &&
                includesIgnoreCase(locs.loc, searchLocs.loc) &&
                includesIgnoreCase(locs.box_loc, searchLocs.box_loc)
            );
        setFilteredLocs(filtered);
    }, [locList, searchLocs, filterLocation]);


    // --- Filter Logic Bin ---
    useEffect(() => {
        const filtered = inventoryList.filter((item) =>
            includesIgnoreCase(item.stock_item, searchInventory.stock_item) &&
            includesIgnoreCase(item.item_desc, searchInventory.item_desc) &&
            includesIgnoreCase(item.mc_code, searchInventory.mc_code) &&
            includesIgnoreCase(item.sum_inv_qty, searchInventory.total_inv_qty) &&
            includesIgnoreCase(item.unit_cost_sum_inv, searchInventory.avg_unit_cost) &&
            includesIgnoreCase(item.total_cost_sum_inv, searchInventory.total_cost_inv) &&
            includesIgnoreCase(item.loc, searchInventory.loc) &&
            includesIgnoreCase(item.box_loc, searchInventory.box_loc) &&
            (filterCondition === "" || item.cond === filterCondition) &&
            (filterLocation === "" || item.store_type === filterLocation)
        );

        setFilteredInventory(filtered);
    }, [inventoryList, searchInventory, filterCondition, filterLocation]);

    const handleAdd = () => {
        setFormMode("create");
        setEditingLocs(null);
        setFormOpen(true);
    };

    const fetchDataById = async (loc_id) => {
        try {
        const response = await LocationsAPI.getByID(loc_id);
        if (response.isCompleted) {
            const data = response.data;
            setEditingLocs({
            loc_id: data.loc_id,
            store_type: data.store_type,
            loc: data.loc ?? "",
            box_loc: data.box_loc ?? "",
            });
            setFormOpen(true); // เปิดฟอร์มหลังได้ข้อมูล
        } else {
            console.error("Failed to fetch location:", response.message);
        }
        } catch (error) {
        console.error("Error fetching location by id:", error);
        }
    };

    const handleEditClick = (row) => {
        setFormMode("edit");
        fetchDataById(row.loc_id); // ใช้ loc_id ดึงข้อมูล
    };

    const handleSubmitForm = async (payload) => {
        try {

        let res;
        if (formMode === "edit") {
            res = await LocationsAPI.update(editingLocs.loc_id, payload);
        } else {
            res = await LocationsAPI.create(payload);
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
        if (!deleteLoc) return;

        try {
        const response = await LocationsAPI.delete(deleteLoc);
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

    const locationColumns = [
        { field: "store_type", label: "Source Store Location" },
        { field: "loc", label: "Source Location" },
        { field: "box_loc", label: "Source Box Location" },
    ];

    const inventoryColumns = [
        { field: "store_type", label: "Store Location" },
        { field: "loc", label: "Location" },
        { field: "box_loc", label: "Box Location" },
        { field: "stock_item", label: "Stock Item No." },
        { field: "item_desc", label: "Stock Item Description" },
        { field: "mc_code", label: "Maintenance Contract" },
        { field: "cond", label: "Condition" },
        { field: "unit_cost_sum_inv", label: "Average Unit Cost"},
        { field: "total_cost_sum_inv", label: "Total Cost" },
        { field: "sum_inv_qty", label: "Inventory Quantity" },
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
                - Inventory - Location Master
            </MDTypography>
            </Box>
        </MDBox>

            {/* --------------------------------------------------
                เพิ่ม IMPORT
            --------------------------------------------------- */}
            <MDBox
                display="flex"
                justifyContent="flex-end"
                alignItems="center"
                gap={2}
                mb={3}
                >
                {/* ปุ่ม Toggle */}
                <MDButton
                    variant="contained"
                    color="warning"
                    onClick={handleToggleView}
                >
                    {isInventoryView
                    ? "Change To Location List"
                    : "Change To Stock Item in the Box"}
                </MDButton>

                {/* ปุ่ม Create (แสดงเฉพาะ Location View) */}
                {!isInventoryView && (
                    <MDButton
                    variant="contained"
                    color="info"
                    onClick={handleAdd}
                    >
                    Create
                    </MDButton>
                )}
            </MDBox>

        <MDBox mt={1}>
            <Card>
            <MDBox p={3}>
            {/* =========================
                LOCATION VIEW
            ========================== */}
                {!isInventoryView && (
                <>
                <Grid container spacing={2} sx={{ mb: 0.5 }}>
                    {/* Source Store Location */}
                    <Grid item xs={12} md={2.4}>
                        <MDTypography variant="caption" fontWeight="bold">Source Location</MDTypography>
                        <FormControl fullWidth>
                        <StyledSelect
                            sx={{ height: "45px" }}
                            name="filterLocation"
                            value={filterLocation}
                            onChange={(e) => setFilterLocation(e.target.value)}
                            displayEmpty
                        >
                            <StyledMenuItem value="">Pull Down List</StyledMenuItem>
    
                            {StoreType.map((t) => (
                            <StyledMenuItem key={t.value} value={t.value}>
                                {t.text}
                            </StyledMenuItem>
                            ))}
                        </StyledSelect>
                        </FormControl>
                    </Grid>

                    {/* Source Location */}
                    <Grid item xs={12} md={3}>
                    <MDTypography variant="caption" fontWeight="bold">
                        Source Location
                    </MDTypography>
                    <MDInput
                        placeholder="Text Field"
                        sx={{ height: "45px" }}
                        value={searchLocs.loc}
                        onChange={(e) => setSearchLocs({ ...searchLocs, loc: e.target.value })}
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
                    
                    {/* Source Box Location */}
                    <Grid item xs={12} md={3}>
                    <MDTypography variant="caption" fontWeight="bold">
                        Source Box Location
                    </MDTypography>
                    <MDInput
                        placeholder="Text Field"
                        sx={{ height: "45px" }}
                        value={searchLocs.box_loc}
                        onChange={(e) => setSearchLocs({ ...searchLocs, box_loc: e.target.value })}
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
                {loading ? (
                <div>Loading...</div>
                ) : (
                    <ReusableDataTable
                        columns={locationColumns}
                        rows={filteredLocs}
                        idField="loc_id"
                        defaultPageSize={10}
                        pageSizeOptions={[10, 25, 50]}
                        showActions={["edit", "delete"]}
                        onEdit={(row) => handleEditClick(row)}
                        onDelete={(row) => {
                        setDeleteLoc(row.loc_id);
                        setConfirmAlert(true);
                        }}
                    />
                    )}
                </>
                )}

            {/* =========================
                    BOX VIEW
            ========================== */}
                {isInventoryView && (
                <>
                <Grid container spacing={2} sx={{ mb: 0.5 }}>
                    {/* Stock Item No. */}
                    <Grid item xs={12} md={2.4}>
                        <MDTypography variant="caption" fontWeight="bold">Stock Item No.</MDTypography>
                        <MDInput
                        placeholder="Text Field"
                        sx={{ height: "45px" }}
                        value={searchInventory.stock_item}
                        onChange={(e) =>
                            setSearchInventory({ ...searchInventory, stock_item: e.target.value })
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
                    <Grid item xs={12} md={2.4}>
                        <MDTypography variant="caption" fontWeight="bold">Stock Item Description</MDTypography>
                        <MDInput
                        placeholder="Text Field"
                        sx={{ height: "45px" }}
                        value={searchInventory.item_desc}
                        onChange={(e) =>
                            setSearchInventory({ ...searchInventory, item_desc: e.target.value })
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
                    
                    {/* Maintenance Contract */}
                    <Grid item xs={12} md={2.4}>
                        <MDTypography variant="caption" fontWeight="bold">Maintenance Contract</MDTypography>
                        <MDInput
                        placeholder="Text Field"
                        sx={{ height: "45px" }}
                        value={searchInventory.mc_code}
                        onChange={(e) =>
                            setSearchInventory({ ...searchInventory, mc_code: e.target.value })
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
                    <Grid item xs={12} md={2.4}>
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

                    {/* Inventory Quantity */}
                    <Grid item xs={12} md={2.4}>
                        <MDTypography variant="caption" fontWeight="bold">Inventory Quantity</MDTypography>
                        <MDInput
                        placeholder="Text Field"
                        sx={{ height: "45px" }}
                        value={searchInventory.total_inv_qty}
                        onChange={(e) =>
                            setSearchInventory({ ...searchInventory, total_inv_qty: e.target.value })
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
                    <Grid item xs={12} md={2.4}>
                        <MDTypography variant="caption" fontWeight="bold">Store Location</MDTypography>
                        <FormControl fullWidth>
                        <StyledSelect
                            sx={{ height: "45px" }}
                            name="filterLocation"
                            value={filterLocation}
                            onChange={(e) => setFilterLocation(e.target.value)}
                            displayEmpty
                        >
                            <StyledMenuItem value="">Pull Down List</StyledMenuItem>

                            {StoreType.map((t) => (
                            <StyledMenuItem key={t.value} value={t.value}>
                                {t.text}
                            </StyledMenuItem>
                            ))}
                        </StyledSelect>
                        </FormControl>
                    </Grid>

                    {/* Location */}
                    <Grid item xs={12} md={2.4}>
                        <MDTypography variant="caption" fontWeight="bold">Location</MDTypography>
                        <MDInput
                        placeholder="Text Field"
                        sx={{ height: "45px" }}
                        value={searchInventory.loc}
                        onChange={(e) =>
                            setSearchInventory({ ...searchInventory, loc: e.target.value })
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

                    {/* Box Location */}
                    <Grid item xs={12} md={2.4}>
                        <MDTypography variant="caption" fontWeight="bold">Box Location</MDTypography>
                        <MDInput
                        placeholder="Text Field"
                        sx={{ height: "45px" }}
                        value={searchInventory.box_loc}
                        onChange={(e) =>
                            setSearchInventory({ ...searchInventory, box_loc: e.target.value })
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

                    {/* Average Unit Cost */}
                    <Grid item xs={12} md={2.4}>
                        <MDTypography variant="caption" fontWeight="bold">Average Unit Cost</MDTypography>
                        <MDInput
                        placeholder="Text Field"
                        sx={{ height: "45px" }}
                        value={searchInventory.avg_unit_cost}
                        onChange={(e) =>
                            setSearchInventory({ ...searchInventory, avg_unit_cost: e.target.value })
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
                    <Grid item xs={12} md={2.4}>
                        <MDTypography variant="caption" fontWeight="bold">Total Cost</MDTypography>
                        <MDInput
                        placeholder="Text Field"
                        sx={{ height: "45px" }}
                        value={searchInventory.total_cost_inv}
                        onChange={(e) =>
                            setSearchInventory({ ...searchInventory, total_cost_inv: e.target.value })
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
                {loading ? (
                <div>Loading...</div>
                ) : (
                    <ReusableDataTable
                        columns={inventoryColumns}
                        rows={filteredInventory}
                        idField="sum_inv_id"
                        defaultPageSize={10}
                        pageSizeOptions={[10, 25, 50]}
                    />
                )}
                </>
            )}
            </MDBox>
        </Card>
        </MDBox>

        {/* Pop-up */}
        <LocationsFormDialog
            open={formOpen}
            mode={formMode}
            initialData={editingLocs}
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
export default LocationMaster;
