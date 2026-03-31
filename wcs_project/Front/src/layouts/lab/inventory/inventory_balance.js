import React, { useState, useEffect } from "react"; // นำเข้า useState และ useEffect จาก React
import { Card, Grid, Box, InputAdornment, FormControl, Dialog, DialogTitle, DialogContent, DialogActions} from "@mui/material"; // นำเข้า components จาก MUI (Material-UI)
import DashboardLayout from "examples/LayoutContainers/DashboardLayout"; // นำเข้า layout component
import DashboardNavbar from "examples/Navbars/DashboardNavbar"; // นำเข้า navbar component
import MDBox from "components/MDBox";
import MDTypography from "components/MDTypography";
import InventoryAPI from "api/InventoryAPI";
import { GlobalVar } from "../../../common/GlobalVar";
import ReusableDataTable from "../components/table_component_v2";
import SearchIcon from "@mui/icons-material/Search";
import { StoreType, Condition } from "common/dataMain";
import MDInput from "components/MDInput";
import MDButton from "components/MDButton";
import { StyledMenuItem, StyledSelect } from "common/Global.style";
import { getStoreTypeTrans } from "common/utils/storeTypeHelper";

const InventoryBalance = () => {
    const storeType = GlobalVar.getStoreType();
    const storeTypeTrans = getStoreTypeTrans(storeType);

    const [loading , setLoading] = useState(true);
    
    const [itemsList, setItemsList] = useState([]);
    const [filteredItems, setFilteredItems] = useState([]);

    const [searchItems, setSearchItems] = useState({ 
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
    const [filterLocation, setFilterLocation] = useState("");
    const [openSearchDialog, setOpenSearchDialog] = useState(false);

    const handleClearSearch = () => {
        setSearchItems({
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

    setFilterCondition("");
    setFilterLocation("");
    };

    //stock
    const fetchDataAll = async () => {
        try {
        const response = await InventoryAPI.getAll();

        const list = Array.isArray(response?.data) ? response.data : [];
        setItemsList(list);
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
        const filtered = itemsList.filter((item) =>
            includesIgnoreCase(item.stock_item, searchItems.stock_item) &&
            includesIgnoreCase(item.item_desc, searchItems.item_desc) &&
            includesIgnoreCase(item.org_id, searchItems.org_id) &&
            includesIgnoreCase(item.dept, searchItems.dept) &&
            includesIgnoreCase(item.item_status, searchItems.item_status) &&
            includesIgnoreCase(item.mc_code, searchItems.mc_code) &&
            includesIgnoreCase(item.total_inv_qty, searchItems.total_inv_qty) &&
            includesIgnoreCase(item.avg_unit_cost, searchItems.avg_unit_cost) &&
            includesIgnoreCase(item.total_cost_inv, searchItems.total_cost_inv) &&
            includesIgnoreCase(item.loc, searchItems.loc) &&
            includesIgnoreCase(item.box_loc, searchItems.box_loc) &&
            (filterCondition === "" || item.cond === filterCondition) &&
            (filterLocation === "" || item.store_type === filterLocation)
        );

        setFilteredItems(filtered);
    }, [itemsList, searchItems, filterCondition, filterLocation]);

    // by item ที่ต้องเหมือนกันทุกประการ ถึงรวม
    const columns = [
        { field: "stock_item", label: "Stock Item No." },
        { field: "item_desc", label: "Stock Item Description" },
        { field: "mc_code", label: "Maintenance Contract" },
        { field: "total_inv_qty", label: "Inventory Quantity" },
        { field: "avg_unit_cost", label: "Average Unit Cost" },
        { field: "total_cost_inv", label: "Total Cost" },
        { field: "cond", label: "Condition" },
        { field: "loc", label: "Location" },
        { field: "box_loc", label: "Box Location" },
        { field: "item_status", label: "Status" },
        { field: "org_id", label: "ORG ID" },
        { field: "dept", label: "Department" },
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
                - Inventory - Balance
            </MDTypography>
            </Box>
        </MDBox>

        {/* 🟠 ขวา : ปุ่ม (ซ้าย / ขวา) */}
        <MDBox display="flex" justifyContent="flex-end" mb={3}>
            {/* ขวา : Import */}
            <MDButton variant="contained" color="info">
            Import
            </MDButton>
        </MDBox>

        <MDBox mt={1}>
            <Card>
            <MDBox p={3}>
                <MDBox display="flex" justifyContent="flex-start">
                    <MDButton
                    variant="contained"
                    color="info"
                    onClick={() => setOpenSearchDialog(true)}
                    >
                    Advanced Search
                    </MDButton>
                </MDBox>

                {/* Filters*/}
                <Grid container spacing={2} mb={2} mt={0.1}>

                    {/* Stock Item No. */}
                    <Grid item xs={12} md={3}>
                        <MDTypography variant="caption" fontWeight="bold">Stock Item No.</MDTypography>
                        <MDInput
                        placeholder="Text Field"
                        sx={{ height: "45px" }}
                        value={searchItems.stock_item}
                        onChange={(e) =>
                            setSearchItems({ ...searchItems, stock_item: e.target.value })
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
                    <Grid item xs={12} md={3}>
                        <MDTypography variant="caption" fontWeight="bold">Average Unit Cost</MDTypography>
                        <MDInput
                        placeholder="Text Field"
                        sx={{ height: "45px" }}
                        value={searchItems.avg_unit_cost}
                        onChange={(e) =>
                            setSearchItems({ ...searchItems, avg_unit_cost: e.target.value })
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
                    <Grid item xs={12} md={3}>
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

                    {/* Inventory Quantity */}
                    <Grid item xs={12} md={3}>
                        <MDTypography variant="caption" fontWeight="bold">Inventory Quantity</MDTypography>
                        <MDInput
                        placeholder="Text Field"
                        sx={{ height: "45px" }}
                        value={searchItems.total_inv_qty}
                        onChange={(e) =>
                            setSearchItems({ ...searchItems, total_inv_qty: e.target.value })
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
                open={openSearchDialog}
                onClose={() => setOpenSearchDialog(false)}
                maxWidth="md"
                fullWidth
                PaperProps={{
                sx: {
                    p: 2,
                    borderRadius: 5, // ปรับโค้งได้
                },
                }}
            >
                <DialogTitle>Advanced Search - Inventory Balance</DialogTitle>
    
                <DialogContent sx={{ p: 3 }}>
                <Grid container spacing={2}>
                    {/* Maintenance Contract */}
                    <Grid item xs={12} md={6}>
                        <MDTypography variant="caption" fontWeight="bold">Maintenance Contract</MDTypography>
                        <MDInput
                        placeholder="Text Field"
                        sx={{ height: "45px" }}
                        value={searchItems.mc_code}
                        onChange={(e) =>
                            setSearchItems({ ...searchItems, mc_code: e.target.value })
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
                        <MDTypography variant="caption" fontWeight="bold">Total Cost</MDTypography>
                        <MDInput
                        placeholder="Text Field"
                        sx={{ height: "45px" }}
                        value={searchItems.total_cost_inv}
                        onChange={(e) =>
                            setSearchItems({ ...searchItems, total_cost_inv: e.target.value })
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

                    {/* Stock Item Description */}
                    <Grid item xs={12} md={6}>
                        <MDTypography variant="caption" fontWeight="bold">Stock Item Description</MDTypography>
                        <MDInput
                        placeholder="Text Field"
                        sx={{ height: "45px" }}
                        value={searchItems.item_desc}
                        onChange={(e) =>
                            setSearchItems({ ...searchItems, item_desc: e.target.value })
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

                    {/* Location */}
                    <Grid item xs={12} md={6}>
                        <MDTypography variant="caption" fontWeight="bold">Location</MDTypography>
                        <MDInput
                        placeholder="Text Field"
                        sx={{ height: "45px" }}
                        value={searchItems.loc}
                        onChange={(e) =>
                            setSearchItems({ ...searchItems, loc: e.target.value })
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
                    <Grid item xs={12} md={6}>
                        <MDTypography variant="caption" fontWeight="bold">Box Location</MDTypography>
                        <MDInput
                        placeholder="Text Field"
                        sx={{ height: "45px" }}
                        value={searchItems.box_loc}
                        onChange={(e) =>
                            setSearchItems({ ...searchItems, box_loc: e.target.value })
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

                    {/* OGR ID */}
                    <Grid item xs={12} md={6}>
                        <MDTypography variant="caption" fontWeight="bold">OGR ID</MDTypography>
                        <MDInput
                        placeholder="Text Field"
                        sx={{ height: "45px" }}
                        value={searchItems.org_id}
                        onChange={(e) =>
                            setSearchItems({ ...searchItems, org_id: e.target.value })
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

                    {/* Department */}
                    <Grid item xs={12} md={6}>
                        <MDTypography variant="caption" fontWeight="bold">Department</MDTypography>
                        <MDInput
                        placeholder="Text Field"
                        sx={{ height: "45px" }}
                        value={searchItems.dept}
                        onChange={(e) =>
                            setSearchItems({ ...searchItems, dept: e.target.value })
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

                    {/* Status */}
                    <Grid item xs={12} md={6}>
                        <MDTypography variant="caption" fontWeight="bold">Status</MDTypography>
                        <MDInput
                        placeholder="Text Field"
                        sx={{ height: "45px" }}
                        value={searchItems.item_status}
                        onChange={(e) =>
                            setSearchItems({ ...searchItems, item_status: e.target.value })
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
                    <MDButton
                    color="secondary"
                    onClick={handleClearSearch}
                    >
                    Clear
                    </MDButton>
                    {/* 
                    <MDButton
                    color="dark"
                    onClick={() => setOpenSearchDialog(false)}
                    >
                    Close
                    </MDButton> */}
                </DialogActions>
            </Dialog>
            {loading ? (
            <div>Loading...</div>
            ) : (
                <ReusableDataTable
                    columns={columns}
                    rows={filteredItems}
                    idField="row_key"
                    defaultPageSize={10}
                    pageSizeOptions={[10, 25, 50]}
                />
            )}
            </MDBox>
            </Card>
        </MDBox>
        </DashboardLayout>
    );
    };
export default InventoryBalance;
