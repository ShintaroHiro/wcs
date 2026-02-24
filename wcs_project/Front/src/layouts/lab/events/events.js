// //Version have pop up clear form
// import React, { useState, useEffect } from "react"; // นำเข้า useState และ useEffect จาก React
// import { Card, Grid, Box, FormControl } from "@mui/material"; // นำเข้า components จาก MUI (Material-UI)
// import SweetAlertComponent from "../components/sweetAlert";
// import DashboardLayout from "examples/LayoutContainers/DashboardLayout"; // นำเข้า layout component
// import DashboardNavbar from "examples/Navbars/DashboardNavbar"; // นำเข้า navbar component
// import MDBox from "components/MDBox";
// import MDTypography from "components/MDTypography";
// import EventsAPI from "api/EventsAPI";
// import ExecutionAPI from "api/TaskAPI";
// import { GlobalVar } from "../../../common/GlobalVar";
// import ReusableDataTable from "../components/table_component_v2";
// import ClearFormDialog from "./events_clear_form";
// import MDInput from "components/MDInput";
// import { getStoreTypeTrans } from "common/utils/storeTypeHelper";
// import { EventType, Equipment } from "common/dataMain";
// import { StyledMenuItem, StyledSelect } from "common/Global.style";

// import { DatePicker } from "@mui/x-date-pickers/DatePicker";
// import { LocalizationProvider } from "@mui/x-date-pickers/LocalizationProvider";
// import { AdapterDayjs } from "@mui/x-date-pickers/AdapterDayjs";
// import dayjs from "dayjs";

// const EventsPage = () => {
//     const storeType = GlobalVar.getStoreType();
//     const storeTypeTrans = getStoreTypeTrans(storeType);
    
//     const [loading , setLoading] = useState(true);
//     const [alert, setAlert] = useState({
//         show: false,
//         type: "success",
//         title: "",
//         message: "",
//     });
//     const [eventsList, setEventsList] = useState([]);
//     const [filteredEvents, setFilteredEvents] = useState([]);
//     const [searchEvents, setSearchLocs] = useState({
//         type: "",
//         category: "",
//         date: "",
//     });

//     const [formOpen, setFormOpen] = useState(false);
//     //const [formClear, setFormClear] = useState(false); // clear error

//     const [filterType, setFilterType] = useState("");
//     const [filterCategory, setFilterCategory] = useState("");

//     const [selectedEvent, setSelectedEvent] = useState(null);
//     const [selectedEventDetail, setSelectedEventDetail] = useState([]);

//     const fetchDataAll = async () => {
//         try {
//             const response = await EventsAPI.getAll();

//             const list = Array.isArray(response?.data) ? response.data : [];

//             const mappedList = list.map((data) => ({
//             ...data,
//             }));

//             setEventsList(mappedList);
//         } catch (error) {
//             console.error("Error fetching data: ", error);
//             setEventsList([]);
//         } finally {
//             setLoading(false);
//         }
//     };

//     useEffect(() => {
//         fetchDataAll();
//     }, []);

//     //ฟังก์ชัน พิมพ์เล็ก / ใหญ่ , รองรับ number, null, undefined , trim
//     const includesIgnoreCase = (value, search) => {
//         if (!search) return true; // ถ้าไม่ได้พิมพ์อะไร = ผ่าน
//         return String(value ?? "")
//             .toLowerCase()
//             .trim()
//             .includes(String(search).toLowerCase().trim());
//     };
    
//     // --- Filter Logic ---
//     useEffect(() => {
//         const filtered = eventsList.filter(
//             (data) =>
//                 (filterType === "" || data.type === filterType) &&
//                 (filterCategory === "" || data.category === filterCategory) &&
//                 includesIgnoreCase(data.created_at, searchEvents.date)
//             );
//         setFilteredEvents(filtered);
//     }, [eventsList, searchEvents, filterType, filterCategory]);

//     const fetchDataByRelatedId = async (related_id) => {
//         try {
//             const response = await EventsAPI.getByID(related_id);

//             if (response?.isCompleted) {
//                 const data = Array.isArray(response.data)
//                     ? response.data
//                     : [response.data];

//                 setSelectedEventDetail(data);
//                 setFormOpen(true);
//             } else {
//                 console.error("Failed to fetch data:", response.message);
//             }
//         } catch (error) {
//             console.error("Error fetching data:", error);
//         }
//     };

//     const handleSubmitForm = async (updatedRows) => {
//         if (!updatedRows?.length || !selectedEvent) return false;

//         try {

//             const payloadItems = updatedRows.map((item) => ({
//                 order_id: item.order_id,
//                 actual_qty: item.actual_qty || 0
//             }));

//             const res = await ExecutionAPI.handleErrorOrderItemT1(
//                 selectedEvent.event_id,   // 👈 event_id
//                 payloadItems
//             );
            
//             if (!res?.isCompleted) {
//             throw new Error(res?.message || "Failed");
//             }

//             setAlert({
//             show: true,
//             type: "success",
//             title: "Cleared Error",
//             message: "Error cleared successfully",
//             });

//             await fetchDataAll();
//             setFormOpen(false);
//             return true;

//         } catch (err) {

//             console.error("HANDLE ERROR:", err);

//             setAlert({
//             show: true,
//             type: "error",
//             title: "Error",
//             message: err.message || "Failed to clear error",
//             });

//             return false;
//         }
//         };


//     const handleClear = (row) => {
//         setSelectedEvent(row);
//         fetchDataByRelatedId(row.related_id);
//     };

//     const columns = [
//         { field: "type", label: "Type" },
//         { field: "category", label: "Category" },
//         { field: "created_at", label: "Date & Time" },
//         { field: "message", label: "Details" },
//         { field: "clear", label: "Actions", type: "clear" }
//     ];
    
//     return (
//         <DashboardLayout>
//         <DashboardNavbar />
//         {/* ===== Header Home ===== */}
//         <MDBox p={2}>
//             <Box display="flex" alignItems="baseline" gap={1}>
//             {/* storeTypeTrans + underline */}
//             <Box display="inline-block">
//                 <MDTypography variant="h3" fontWeight="bold" gutterBottom>
//                 {storeTypeTrans}
//                 </MDTypography>
//                 <Box
//                 sx={{
//                     width: "100%",
//                     height: "5px",
//                     backgroundColor: "#FFA726",
//                     borderRadius: "4px",
//                 }}
//                 />
//             </Box>
//             {/* Inventory Profile */}
//             <MDTypography variant="h3" color="bold">
//                 - Events
//             </MDTypography>
//             </Box>
//         </MDBox>

//         <MDBox mt={1}>
//             <Card>
//             <MDBox p={3}>
//                 {
//                 <Grid container spacing={2} sx={{ mb: 0.5 }}>
//                     {/* Type */}
//                     <Grid item xs={12} md={2.4}>
//                         <MDTypography variant="caption" fontWeight="bold">Type</MDTypography>
//                         <FormControl fullWidth>
//                         <StyledSelect
//                             sx={{ height: "45px" }}
//                             name="filterType"
//                             value={filterType}
//                             onChange={(e) => setFilterType(e.target.value)}
//                             displayEmpty
//                         >
//                             <StyledMenuItem value="">Pull Down List</StyledMenuItem>
    
//                             {EventType.map((t) => (
//                             <StyledMenuItem key={t.value} value={t.value}>
//                                 {t.text}
//                             </StyledMenuItem>
//                             ))}
//                         </StyledSelect>
//                         </FormControl>
//                     </Grid>

//                     {/* Equipment */}
//                     <Grid item xs={12} md={2.4}>
//                         <MDTypography variant="caption" fontWeight="bold">Equipment</MDTypography>
//                         <FormControl fullWidth>
//                         <StyledSelect
//                             sx={{ height: "45px" }}
//                             name="filterCategory"
//                             value={filterCategory}
//                             onChange={(e) => setFilterCategory(e.target.value)}
//                             displayEmpty
//                         >
//                             <StyledMenuItem value="">Pull Down List</StyledMenuItem>
    
//                             {Equipment.map((t) => (
//                             <StyledMenuItem key={t.value} value={t.value}>
//                                 {t.text}
//                             </StyledMenuItem>
//                             ))}
//                         </StyledSelect>
//                         </FormControl>
//                     </Grid>
                    
//                     {/* Date */}
//                     <Grid item xs={12} md={1.71}>
//                         <MDTypography variant="caption" fontWeight="bold">Date</MDTypography>
        
//                         <LocalizationProvider dateAdapter={AdapterDayjs}>
//                             <DatePicker
//                             inputFormat="DD/MM/YYYY"   // ✅ รูปแบบ 24/01/2026
//                             value={
//                                 searchEvents.date
//                                 ? dayjs(searchEvents.date, "DD/MM/YYYY")
//                                 : null
//                             }
//                             onChange={(newValue) => {
//                                 setSearchLocs({
//                                 ...searchEvents,
//                                 date: newValue ? newValue.format("DD/MM/YYYY") : "",
//                                 });
//                             }}
//                             renderInput={(params) => (
//                                 <MDInput
//                                 {...params}
//                                 placeholder="Select date"
//                                 fullWidth
//                                 sx={{ height: "45px" }}
//                                 />
//                             )}
//                             />
//                         </LocalizationProvider>
//                     </Grid>
//                 </Grid>
//                 }
//                 {loading ? (
//                 <div>Loading...</div>
//                 ) : (
//                 <ReusableDataTable
//                     columns={columns}
//                     rows={filteredEvents}
//                     idField="event_id"
//                     defaultPageSize={10}
//                     pageSizeOptions={[10, 25, 50]}
//                     onClear={(row) => handleClear(row)}
//                     clearDisabled={(row) => row.is_cleared === true}
//                 />
//                 )}
//             </MDBox>
//             </Card>
//         </MDBox>

//         {/* Pop-up */}
//         <ClearFormDialog
//             open={formOpen}
//             eventData={selectedEvent}
//             detailData={selectedEventDetail}
//             onClose={() => setFormOpen(false)}
//             onSubmit={handleSubmitForm}
//         />

//         <SweetAlertComponent
//             show={alert.show}
//             type={alert.type}
//             title={alert.title}
//             message={alert.message}
//             onConfirm={() => setAlert({ ...alert, show: false })}
//         />
//         </DashboardLayout>
//     );
// };
// export default EventsPage;

//Version กดปุ่มเรียก api clearOrderError
import React, { useState, useEffect } from "react"; // นำเข้า useState และ useEffect จาก React
import { Card, Grid, Box, FormControl } from "@mui/material"; // นำเข้า components จาก MUI (Material-UI)
import SweetAlertComponent from "../components/sweetAlert";
import DashboardLayout from "examples/LayoutContainers/DashboardLayout"; // นำเข้า layout component
import DashboardNavbar from "examples/Navbars/DashboardNavbar"; // นำเข้า navbar component
import MDBox from "components/MDBox";
import MDTypography from "components/MDTypography";
import EventsAPI from "api/EventsAPI";
import { GlobalVar } from "../../../common/GlobalVar";
import ReusableDataTable from "../components/table_component_v2";
import MDInput from "components/MDInput";
import { getStoreTypeTrans } from "common/utils/storeTypeHelper";
import { EventType, Equipment } from "common/dataMain";
import { StyledMenuItem, StyledSelect } from "common/Global.style";

import { DatePicker } from "@mui/x-date-pickers/DatePicker";
import { LocalizationProvider } from "@mui/x-date-pickers/LocalizationProvider";
import { AdapterDayjs } from "@mui/x-date-pickers/AdapterDayjs";
import dayjs from "dayjs";

const EventsPage = () => {
    const storeType = GlobalVar.getStoreType();
    const storeTypeTrans = getStoreTypeTrans(storeType);
    
    const [loading , setLoading] = useState(true);
    const [alert, setAlert] = useState({
        show: false,
        type: "success",
        title: "",
        message: "",
    });
    const [eventsList, setEventsList] = useState([]);
    const [filteredEvents, setFilteredEvents] = useState([]);
    const [searchEvents, setSearchLocs] = useState({
        type: "",
        category: "",
        date: "",
    });

    const [filterType, setFilterType] = useState("");
    const [filterCategory, setFilterCategory] = useState("");

    const fetchDataAll = async () => {
        try {
            const response = await EventsAPI.getAll();

            const list = Array.isArray(response?.data) ? response.data : [];

            const mappedList = list.map((data) => ({
            ...data,
            }));

            setEventsList(mappedList);
        } catch (error) {
            console.error("Error fetching data: ", error);
            setEventsList([]);
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
        const filtered = eventsList.filter(
            (data) =>
                (filterType === "" || data.type === filterType) &&
                (filterCategory === "" || data.category === filterCategory) &&
                includesIgnoreCase(data.created_at, searchEvents.date)
            );
        setFilteredEvents(filtered);
    }, [eventsList, searchEvents, filterType, filterCategory]);

    const handleClear = async (row) => {
        try {
            const res = await EventsAPI.clearOrderError(
                row.event_id,
            );
            console.log("row.event_id",row.event_id);

            if (!res?.isCompleted) {
                throw new Error(res?.message || "Failed to clear");
            }

            setAlert({
                show: true,
                type: "success",
                title: "Cleared",
                message: "Order resumed successfully",
            });

            await fetchDataAll();

        } catch (err) {

            console.error("CLEAR ERROR:", err);

            setAlert({
                show: true,
                type: "error",
                title: "Error",
                message: err.message || "Failed to clear error",
            });
        }
    };


    const columns = [
        { field: "type", label: "Type" },
        { field: "category", label: "Category" },
        { field: "created_at", label: "Date & Time" },
        { field: "message", label: "Details" },
        { field: "clear", label: "Actions", type: "clear" }
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
                - Events
            </MDTypography>
            </Box>
        </MDBox>

        <MDBox mt={1}>
            <Card>
            <MDBox p={3}>
                {
                <Grid container spacing={2} sx={{ mb: 0.5 }}>
                    {/* Type */}
                    <Grid item xs={12} md={2.4}>
                        <MDTypography variant="caption" fontWeight="bold">Type</MDTypography>
                        <FormControl fullWidth>
                        <StyledSelect
                            sx={{ height: "45px" }}
                            name="filterType"
                            value={filterType}
                            onChange={(e) => setFilterType(e.target.value)}
                            displayEmpty
                        >
                            <StyledMenuItem value="">Pull Down List</StyledMenuItem>
    
                            {EventType.map((t) => (
                            <StyledMenuItem key={t.value} value={t.value}>
                                {t.text}
                            </StyledMenuItem>
                            ))}
                        </StyledSelect>
                        </FormControl>
                    </Grid>

                    {/* Equipment */}
                    <Grid item xs={12} md={2.4}>
                        <MDTypography variant="caption" fontWeight="bold">Equipment</MDTypography>
                        <FormControl fullWidth>
                        <StyledSelect
                            sx={{ height: "45px" }}
                            name="filterCategory"
                            value={filterCategory}
                            onChange={(e) => setFilterCategory(e.target.value)}
                            displayEmpty
                        >
                            <StyledMenuItem value="">Pull Down List</StyledMenuItem>
    
                            {Equipment.map((t) => (
                            <StyledMenuItem key={t.value} value={t.value}>
                                {t.text}
                            </StyledMenuItem>
                            ))}
                        </StyledSelect>
                        </FormControl>
                    </Grid>
                    
                    {/* Date */}
                    <Grid item xs={12} md={1.71}>
                        <MDTypography variant="caption" fontWeight="bold">Date</MDTypography>
        
                        <LocalizationProvider dateAdapter={AdapterDayjs}>
                            <DatePicker
                            inputFormat="DD/MM/YYYY"   // ✅ รูปแบบ 24/01/2026
                            value={
                                searchEvents.date
                                ? dayjs(searchEvents.date, "DD/MM/YYYY")
                                : null
                            }
                            onChange={(newValue) => {
                                setSearchLocs({
                                ...searchEvents,
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
                </Grid>
                }
                {loading ? (
                <div>Loading...</div>
                ) : (
                <ReusableDataTable
                    columns={columns}
                    rows={filteredEvents}
                    idField="event_id"
                    defaultPageSize={10}
                    pageSizeOptions={[10, 25, 50]}
                    onClear={(row) => handleClear(row)}
                    clearDisabled={(row) => row.is_cleared === true}
                />
                )}
            </MDBox>
            </Card>
        </MDBox>

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
export default EventsPage;
