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
import WaitingAPI from "api/WaitingAPI";
import SweetAlertComponent from "../components/sweetAlert";
import { useNavigate } from "react-router-dom";
import MDButton from "components/MDButton";
import { StyledMenuItem, StyledSelect } from "common/Global.style";
import { Condition ,StoreType } from "common/dataMain";
import SearchIcon from "@mui/icons-material/Search";
//import { GlobalVar } from "common/GlobalVar";
import InventoryAPI from "api/InventoryAPI";

//store
const TransferCreatePage = () => {
    const [existingList, setExistingList] = useState([]);
    const [newList, setNewList] = useState([]);

    const [filteredExisting, setFilteredExisting] = useState([]);
    const [filteredNew, setFilteredNew] = useState([]);

    const [searchExisting, setSearchExisting] = useState({
        mc_code: "",
        stock_item: "", 
        item_desc: "",
        cond: "", 
        from_store_type: "",
        from_loc: "",
        from_box_loc: "",
    });
    const [searchNew, setSearchNew] = useState({
        object_id: "",
        mc_code: "",
        stock_item: "", 
        item_desc: "",
        cond: "",
        from_store_type: "",
        from_loc: "",
        from_box_loc: "",
        to_store_type: "",
        to_loc: "",
        to_box_loc: "",
    });

    const [selectedExistingIds, setSelectedExistingIds] = useState([]);
    const [selectedNewIds, setSelectedNewIds] = useState([]);

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
    const [filterConditionExisting, setFilterConditionExisting] = useState("");
    const [filterConditionNew, setFilterConditionNew] = useState("");
    const [filterFromLocation, setFilterFromLocation] = useState("");
    const [filterToLocation, setFilterToLocation] = useState("");

    const navigate = useNavigate();

    // ดึงจาก localStorage 
    //const mcCodes = GlobalVar.getMcCodes(); 
    //const storeType = GlobalVar.getStoreType();

    // --------------------------------------------------
    // FETCH API
    // --------------------------------------------------
    const fetchDataExistingAll = async () => {
        setLoading(true);
        try {
            const response = await InventoryAPI.getAll();
            console.log("response:", response);
            const list = Array.isArray(response?.data) ? response.data : [];
            setExistingList(list);
        } catch (err) {
            console.error(err);
            setExistingList([]);
        } finally {
            setLoading(false);
        }
    };

    const fetchDataNewAll = async () => {
        setLoading(true);
        try {
        const response = await WaitingAPI.getAllPlan({
            //mc_code: mcCodes,
            //store_type: storeType === "WCS" ? undefined : storeType, 
        });
        const list = Array.isArray(response?.data) ? response.data : [];
        setNewList(list);
        } catch (err) {
        console.error(err);
        setNewList([]);
        } finally {
        setLoading(false);
        }
    };

    useEffect(() => {
        fetchDataExistingAll();
        fetchDataNewAll();
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
    // FILTER EXISTING LIST
    // --------------------------------------------------
    useEffect(() => {
        const filtered = existingList.filter(
            (item) =>
                includesIgnoreCase(item.object_id, searchExisting.object_id) &&
                includesIgnoreCase(item.mc_code, searchExisting.mc_code) &&
                includesIgnoreCase(item.stock_item, searchExisting.stock_item) &&
                includesIgnoreCase(item.item_desc, searchExisting.item_desc) &&
                includesIgnoreCase(item.loc, searchExisting.loc) &&
                includesIgnoreCase(item.box_loc, searchExisting.box_loc) &&
                (filterConditionExisting === "" ||
                    item.cond === filterConditionExisting
                ) &&
                (filterFromLocation === "" || item.store_type === filterFromLocation)
        );

        setFilteredExisting(filtered);
    }, [existingList, searchExisting, filterConditionExisting, filterFromLocation]);

    // --------------------------------------------------
    // FILTER NEW LIST
    // --------------------------------------------------
    useEffect(() => {
        const filtered = newList.filter(
            (item) =>
                includesIgnoreCase(item.object_id, searchNew.object_id) &&
                includesIgnoreCase(item.mc_code, searchNew.mc_code) &&
                includesIgnoreCase(item.stock_item, searchNew.stock_item) &&
                includesIgnoreCase(item.item_desc, searchNew.item_desc) &&
                includesIgnoreCase(item.loc, searchNew.loc) &&
                includesIgnoreCase(item.box_loc, searchNew.box_loc) &&
                (filterConditionNew === "" ||
                    item.cond === filterConditionNew
                ) &&
                (filterFromLocation === "" || item.from_store_type === filterFromLocation
                ) &&
                (filterToLocation === "" || item.to_store_type === filterToLocation)
        );

        setFilteredNew(filtered);
    }, [
        newList,
        searchNew,
        filterConditionNew,
        filterFromLocation,
        filterToLocation
    ]);

    // --------------------------------------------------
    // MOVE TO EXISTING -> Go TO NEW
    // --------------------------------------------------
    const handleMoveToNew = async () => {
        if (selectedExistingIds.length === 0) return;

        try {
            const payload = {
                items: selectedExistingIds.map(id => ({ order_id: id }))
            };

            await Promise.all([
                WaitingAPI.changeToNew(payload),
            ]);

            await Promise.all([
                fetchDataExistingAll(),
                fetchDataNewAll()
            ]);

            setSelectedExistingIds([]);

            setAlert({
                show: true,
                type: "success",
                title: "Success",
                message: "Moved to New Location",
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
    // DELETE NEW -> BACK TO EXISTING
    // --------------------------------------------------
    const handleMoveToExisting = async () => {
        if (selectedNewIds.length === 0) return;

        try {
            const payload = {
                items: selectedNewIds.map(id => ({ order_id: id }))
            };

            await Promise.all([
                WaitingAPI.deleteWaiting(payload),
            ]);

            await Promise.all([
                fetchDataExistingAll(),
                fetchDataNewAll()
            ]);

            setSelectedNewIds([]);

            setAlert({
                show: true,
                type: "success",
                title: "Success",
                message: "Moved to Existing Location",
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
    // ALL Go TO Waiting
    // --------------------------------------------------
    const handleConfirm = async () => {
        if (selectedNewIds.length === 0) return;

        try {
        const payload = {
            items: selectedNewIds.map(id => ({ order_id: id }))
        };

        const res = await WaitingAPI.createWaiting(payload);

        await Promise.all([
            fetchDataExistingAll(),
            fetchDataNewAll()
        ]);

        setSelectedNewIds([]);

        if (res?.isCompleted) {
            setAlert({
            show: true,
            type: "success",
            title: "Success",
            message: res.message || "Confirm success",
            onConfirm: () => {
                navigate("/transfer/execute");
            },
            });
            return;
        }

        setAlert({
            show: true,
            type: "success",
            title: "Success",
            message: "Confirm to New Location",
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
    // CLEAR ALL PLAN -> BACK TO Existing
    // --------------------------------------------------

    const getPlanOrderIds = () => {
        return newList
        .filter(r => r.status === "PLAN")
        .map(r => r.order_id);
    };

    const handleClear = async () => {
        const pendingIds = getPlanOrderIds();
        if (pendingIds.length === 0) return;

        try {
        const payload = {
            items: pendingIds.map(id => ({ order_id: id })),
        };

        await WaitingAPI.deleteWaiting(payload);

        await Promise.all([
            fetchDataExistingAll(),
            fetchDataNewAll(),
        ]);

        setSelectedNewIds([]);

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
    // TABLE COLUMNS
    // --------------------------------------------------
    const columnsWaiting = [
        { field: "mc_code", label: "Maintenance Contract" },
        { field: "stock_item", label: "Stock Item Number" },
        { field: "item_desc", label: "Stock Item Description" },
        { field: "cond", label: "Condition" },
        { field: "store_type", label: "From Store Location" },
        { field: "loc", label: "From Location" },
        { field: "box_loc", label: "From BIN" },
        { field: "avg_unit_cost", label: "Unit Cost" },
        { field: "total_cost_inv", label: "Total Cost" },
    ];

    const columnsExecute = [
        { field: "mc_code", label: "Maintenance Contract" },
        { field: "object_id", label: "OBJECT ID" },
        { field: "stock_item", label: "Stock Item Number" },
        { field: "item_desc", label: "Stock Item Description" },
        { field: "cond", label: "Condition" },
        { field: "from_store_type", label: "From Store Location" },
        { field: "from_loc", label: "From Location" },
        { field: "from_box_loc", label: "From BIN" },
        { field: "to_store_type", label: "To Store Location" },
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
                Create - Transfer
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
                    setConfirmMessage("Create waiting orders?");
                    setConfirmAction(() => handleConfirm);
                    setConfirmAlert(true);
                }}
                disabled={selectedNewIds.length === 0 || loading}
                >
                Confirm
                </MDButton>

                {/* ครึ่งล่าง : Clear */}
                <MDButton
                variant="contained"
                color="secondary"
                onClick={() => {
                    setConfirmMessage("Clear all new location?");
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
            <Grid item xs={12} md={5.8}>
                <Card sx={{ p: 2, display: "flex", flexDirection: "column", minHeight: "500px" }}>
                <MDTypography variant="h5" mb={4}>
                    Transfer - Existing Location
                </MDTypography>

                {/* Filters */}
                <Grid container spacing={2} mb={2}>

                    {/* Maintenance Contract */}
                    <Grid item xs={12} md={4}>
                    <MDTypography variant="h6">Maintenance Contract</MDTypography>
                    <MDInput
                        placeholder="Text Field"
                        sx={{ height: "45px" }}
                        value={searchExisting.mc_code}
                        onChange={(e) =>
                        setSearchExisting({ ...searchExisting, mc_code: e.target.value })
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
                    
                    <Grid item xs={12} md={4}></Grid>
                    <Grid item xs={12} md={4}></Grid>

                    {/* Stock Item No. */}
                    <Grid item xs={12} md={4}>
                    <MDTypography variant="h6">Stock Item No.</MDTypography>
                    <MDInput
                        placeholder="Text Field"
                        sx={{ height: "45px" }}
                        value={searchExisting.stock_item}
                        onChange={(e) =>
                        setSearchExisting({ ...searchExisting, stock_item: e.target.value })
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
                        value={searchExisting.item_desc}
                        onChange={(e) =>
                        setSearchExisting({ ...searchExisting, item_desc: e.target.value })
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
                        name="filterConditionExisting"
                        value={filterConditionExisting}
                        onChange={(e) => setFilterConditionExisting(e.target.value)}
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

                    {/* Store Location */}
                    <Grid item xs={12} md={4}>
                        <MDTypography variant="h6" fontWeight="bold">From Store Location</MDTypography>
                        <FormControl fullWidth>
                        <StyledSelect
                            sx={{ height: "45px" }}
                            name="filterFromLocation"
                            value={filterFromLocation}
                            onChange={(e) => setFilterFromLocation(e.target.value)}
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

                    {/* From Location */}
                    <Grid item xs={12} md={4}>
                    <MDTypography variant="h6">From Location</MDTypography>
                    <MDInput
                        placeholder="Text Field"
                        sx={{ height: "45px" }}
                        value={searchExisting.loc}
                        onChange={(e) =>
                        setSearchExisting({ ...searchExisting, loc: e.target.value })
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
                        value={searchExisting.box_loc}
                        onChange={(e) =>
                        setSearchExisting({ ...searchExisting, box_loc: e.target.value })
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

                {/* Table */}
                <MDBox sx={{ fontSize: "0.85rem", maxHeight: "600px", overflowY: "auto" }}>
                    <ReusableDataTable
                    columns={columnsWaiting}
                    rows={filteredExisting}
                    //disableHorizontalScroll
                    idField="order_id"
                    enableSelection={true}              // ⭐ เปิด checkbox
                    selectedRows={selectedExistingIds}   // ⭐ รายการที่เลือก
                    onSelectedRowsChange={setSelectedExistingIds} // ⭐ callback
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
                onClick={handleMoveToNew}
                disabled={selectedExistingIds.length === 0 || loading}

                sx={{ p: 0.3 }}
                >
                <AddCircleIcon sx={{ fontSize: 36 }} />
                </IconButton>

                {/* - Button */}
                <IconButton
                color="error"
                onClick={handleMoveToExisting}
                disabled={selectedNewIds.length === 0 || loading}
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
                    Transfer - New Location
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
                        value={searchNew.mc_code}
                        onChange={(e) =>
                        setSearchNew({ ...searchNew, mc_code: e.target.value })
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
                        value={searchNew.object_id}
                        onChange={(e) =>
                        setSearchNew({ ...searchNew, object_id: e.target.value })
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

                    <Grid item xs={12} md={4}></Grid>

                    {/* Stock Item No. */}
                    <Grid item xs={12} md={4}>
                    <MDTypography variant="h6">Stock Item No.</MDTypography>
                    <MDInput
                        placeholder="Text Field"
                        sx={{ height: "45px" }}
                        value={searchNew.stock_item}
                        onChange={(e) =>
                        setSearchNew({ ...searchNew, stock_item: e.target.value })
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
                        value={searchNew.item_desc}
                        onChange={(e) =>
                        setSearchNew({ ...searchNew, item_desc: e.target.value })
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
                            name="filterConditionNew"
                            value={filterConditionNew}
                            onChange={(e) => setFilterConditionNew(e.target.value)}
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

                    {/* From Store Location */}
                    <Grid item xs={12} md={4}>
                        <MDTypography variant="h6" fontWeight="bold">From Store Location</MDTypography>
                        <FormControl fullWidth>
                        <StyledSelect
                            sx={{ height: "45px" }}
                            name="filterFromLocation"
                            value={filterFromLocation}
                            onChange={(e) => setFilterFromLocation(e.target.value)}
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

                    {/* From Location */}
                    <Grid item xs={12} md={4}>
                    <MDTypography variant="h6">From Location</MDTypography>
                    <MDInput
                        placeholder="Text Field"
                        sx={{ height: "45px" }}
                        value={searchNew.from_loc}
                        onChange={(e) =>
                        setSearchNew({ ...searchNew, from_loc: e.target.value })
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
                        value={searchNew.from_box_loc}
                        onChange={(e) =>
                        setSearchNew({ ...searchNew, from_box_loc: e.target.value })
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

                    {/* To Store Location */}
                    <Grid item xs={12} md={4}>
                        <MDTypography variant="h6" fontWeight="bold">To Store Location</MDTypography>
                        <FormControl fullWidth>
                        <StyledSelect
                            sx={{ height: "45px" }}
                            name="filterToLocation"
                            value={filterToLocation}
                            onChange={(e) => setFilterToLocation(e.target.value)}
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

                    {/* To Location */}
                    <Grid item xs={12} md={4}>
                    <MDTypography variant="h6">To Location</MDTypography>
                    <MDInput
                        placeholder="Text Field"
                        sx={{ height: "45px" }}
                        value={searchNew.to_loc}
                        onChange={(e) =>
                        setSearchNew({ ...searchNew, to_loc: e.target.value })
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
                        value={searchNew.to_box_loc}
                        onChange={(e) =>
                        setSearchNew({ ...searchNew, to_box_loc: e.target.value })
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

                {/* Table */}
                <MDBox sx={{ fontSize: "0.85rem", maxHeight: "600px", overflowY: "auto" }}>
                    <ReusableDataTable
                    columns={columnsExecute}
                    rows={filteredNew}
                    //disableHorizontalScroll
                    idField="order_id"
                    enableSelection={true}              // ⭐ เปิด checkbox
                    selectedRows={selectedNewIds}   // ⭐ รายการที่เลือก
                    onSelectedRowsChange={setSelectedNewIds} // ⭐ callback
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

export default TransferCreatePage;
