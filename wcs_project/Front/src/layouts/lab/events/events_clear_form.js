import React, { useEffect, useState } from "react";
import {
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    Box,
    Typography,
} from "@mui/material";
import MDButton from "components/MDButton";
import ReusableDataTable from "../components/table_component_v2";

export default function ClearFormDialog({
    open,
    eventData,
    detailData,
    onClose,
    onSubmit,
}) {
    if (!eventData) return null;

    const [rows, setRows] = useState([]);

    useEffect(() => {
        setRows(detailData || []);
    }, [detailData]);

    const handleQuantityChange = (row, newValue) => {
        setRows((prev) =>
            prev.map((item) =>
                item.order_id === row.order_id
                    ? { ...item, actual_qty: newValue }
                    : item
            )
        );
    };

    const columns = [
        { field: "mc_code", label: "Maintenance Contract" },
        { field: "type", label: "Transaction Type" },
        { field: "usage_num", label: "Usage No." },
        { field: "usage_line", label: "Usage Line" },
        { field: "stock_item", label: "Stock Item ID" },
        { field: "cond", label: "Condition" },
        { field: "actual_qty", label: "Scanned Quantity",type: "quantityControl", },
        { field: "plan_qty", label: "Required Quantity" },
    ];

    return (
        <Dialog
            open={open}
            onClose={onClose}
            maxWidth="xl"
            fullWidth
            PaperProps={{
                sx: { borderRadius: 6, padding: 2 },
            }}
        >
            <DialogTitle sx={{ textAlign: "center" }}>
                <Typography variant="h4" fontWeight="bold" color="error">
                    Clear Error
                </Typography>

                <Typography variant="h5" mt={1}>
                    {eventData.message}
                </Typography>

                <Typography variant="subtitle1" mt={1}>
                    Please confirm the cause of error has been cleared
                </Typography>
            </DialogTitle>

            <DialogContent dividers>
                <Box mt={2}>
                    <ReusableDataTable
                        columns={columns}
                        rows={rows}
                        idField="order_id"
                        pagination={false}   // 🔥 ปิด footer

                        onQuantityChange={handleQuantityChange}
                        maxQuantity={(row) => row.plan_qty}
                        minQuantity={0}
                    />
                </Box>
            </DialogContent>

            <DialogActions sx={{ justifyContent: "center", mt: 2 }}>
                <MDButton
                    variant="contained"
                    color="info"
                    onClick={() => onSubmit(rows)}
                >
                    Clear Error and Confirm Order(s)
                </MDButton>
            </DialogActions>
        </Dialog>
    );
}
