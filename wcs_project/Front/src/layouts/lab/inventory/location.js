import React, { useState, useEffect } from "react"; // นำเข้า useState และ useEffect จาก React
import { Card, Grid, InputAdornment, Box, FormControl } from "@mui/material"; // นำเข้า components จาก MUI (Material-UI)
import SweetAlertComponent from "../components/sweetAlert";
import DashboardLayout from "examples/LayoutContainers/DashboardLayout"; // นำเข้า layout component
import DashboardNavbar from "examples/Navbars/DashboardNavbar"; // นำเข้า navbar component
import MDBox from "components/MDBox";
import MDTypography from "components/MDTypography";
import LocationsAPI from "api/LocationsAPI";
import { GlobalVar } from "../../../common/GlobalVar";
import ReusableDataTable from "../components/table_component_v2";
import MDButton from "components/MDButton";
import LocationsFormDialog from "./location_form";
import MDInput from "components/MDInput";
import SearchIcon from "@mui/icons-material/Search";
import { getStoreTypeTrans } from "common/utils/storeTypeHelper";
import { StoreType } from "common/dataMain";
import { StyledMenuItem, StyledSelect } from "common/Global.style";

const LocationMaster = () => {
    const storeType = GlobalVar.getStoreType();
    const storeTypeTrans = getStoreTypeTrans(storeType);
    
    const [loading , setLoading] = useState(true);
    const [deleteLoc, setDeleteLoc] = useState(null); // รหัสที่จะลบ
    const [confirmAlert, setConfirmAlert] = useState(false);
    const [alert, setAlert] = useState({
        show: false,
        type: "success",
        title: "",
        message: "",
    });
    const [locsList, setLocsList] = useState([]);
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

            setLocsList(mappedList);
        } catch (error) {
            console.error("Error fetching data: ", error);
            setLocsList([]);
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
        const filtered = locsList.filter(
            (locs) =>
                (filterLocation === "" || locs.store_type === filterLocation) &&
                includesIgnoreCase(locs.loc, searchLocs.loc) &&
                includesIgnoreCase(locs.box_loc, searchLocs.box_loc)
            );
        setFilteredLocs(filtered);
    }, [locsList, searchLocs, filterLocation]);

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

    const columns = [
        { field: "store_type", label: "Source Store Location" },
        { field: "loc", label: "Source Location" },
        { field: "box_loc", label: "Source Box Location" },
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
            </MDBox>


        <MDBox mt={1}>
            <Card>
            <MDBox p={3}>
                {
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
                }
                {loading ? (
                <div>Loading...</div>
                ) : (
                <ReusableDataTable
                    columns={columns}
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
