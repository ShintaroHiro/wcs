import React, { useEffect, useMemo, useState } from "react";
import { Dialog, DialogTitle, DialogContent, DialogActions, Grid } from "@mui/material";
import PropTypes from "prop-types";
import MDInput from "components/MDInput";
import MDTypography from "components/MDTypography";
import MDButton from "components/MDButton";
import UploadPic from "../components/from_uploadpicture_V002";
import BaseClass from "common/baseClass";

export default function ItemsFormDialog({
    open,
    mode = "create",
    initialData = null,
    onClose,
    onSubmit,
}) {
    const isEdit = mode === "edit";

    const [form, setForm] = useState({
        stock_item: "",
        item_desc: "",
        item_img: "",
        item_img_url: "",
        order_unit: "",
        com_group: "",
        cond_en: "",
        item_status: "",
        catg_code: "",
        item_system: "",
    });

    const [errors, setErrors] = useState({});
    const [submitting, setSubmitting] = useState(false);

    useEffect(() => {
        if (open) {
        setErrors({});
        if (isEdit && initialData) {
            setForm({
            stock_item: initialData.stock_item ?? "",
            item_desc: initialData.item_desc ?? "",
            item_img: initialData.item_img ?? "",
            item_img_url: initialData.item_img_url ?? "",
            order_unit: initialData.order_unit ?? "",
            com_group: initialData.com_group ?? "",
            cond_en: initialData.cond_en ?? "",
            item_status: initialData.item_status ?? "",
            catg_code: initialData.catg_code ?? "",
            item_system: initialData.item_system ?? "",
            });
        } else {
            setForm({
            stock_item: "",
            item_desc: "",
            item_img: "",
            item_img_url: "",
            order_unit: "",
            com_group: "",
            cond_en: "",
            item_status: "",
            catg_code: "",
            item_system: "",
            });
        }
        }
    }, [open, isEdit, initialData]);

    const title = useMemo(
        () => (isEdit ? "Edit Stock Item Data" : "Create New Stock Item Data"),
        [isEdit]
    );

    const handleChange = (field) => (e) => {
        const value = e.target.value;
        setForm((prev) => ({ ...prev, [field]: value }));
        setErrors((prev) => ({ ...prev, [field]: "" }));
    };

    const handleImageChange = (name, file) => {
        setForm((prevState) => ({
        ...prevState,
        [name]: file,
        }));
    };

    const validateAll = () => {
        const next = {};
        if (!form.stock_item?.trim()) next.stock_item = "Stock item is required.";
        setErrors(next);
        return Object.keys(next).length === 0;
    };

    const handleSubmit = async () => {
        if (!validateAll()) return;

        try {
        setSubmitting(true);

        const formData = new FormData();
        formData.append("stock_item", form.stock_item);
        formData.append("item_desc", form.item_desc);
        formData.append("order_unit", form.order_unit);
        formData.append("com_group", form.com_group);
        formData.append("cond_en", form.cond_en);
        formData.append("item_status", form.item_status);
        formData.append("catg_code", form.catg_code);
        formData.append("system", form.item_system);

        // ถ้ามีรูป → append
        if (form.item_img instanceof File) {
            formData.append("item_img", form.item_img);
        }

        const ok = await onSubmit?.(formData);
        if (ok) onClose?.();
        } finally {
        setSubmitting(false);
        }
    };

    const leftFields = [
        "stock_item",
        "item_desc",
        "order_unit",
        "com_group",
        "catg_code"
        ];

    const rightFields = [
        "cond_en",
        "item_status",
        "item_system"
    ];

    const fieldConfig = {
        stock_item: {
            label: "Stock Item Number",
            placeholder: "Enter Stock Item Number"
        },
        item_desc: {
            label: "Stock Item Description",
            placeholder: "Enter Stock Item Description"
        },
        order_unit: {
            label: "Order Unit",
            placeholder: "Enter Order Unit"
        },
        com_group: {
            label: "Commodity Group",
            placeholder: "Enter Commodity Group"
        },
        catg_code: {
            label: "Category Code",
            placeholder: "Enter Category Code"
        },
        cond_en: {
            label: "Condition (EN)",
            placeholder: "Enter Condition Enabled"
        },
        item_status: {
            label: "Item Status",
            placeholder: "Enter Status"
        },
        item_system: {
            label: "System",
            placeholder: "Enter System"
        }
    };

    return (
        <Dialog 
        open={open} 
        onClose={onClose} 
        PaperProps={{
            sx: {
            borderRadius: 5, // 👈 ปรับความโค้งตรงนี้
            },
        }}
        fullWidth maxWidth="md">
        <DialogTitle>{title}</DialogTitle>
        <DialogContent dividers>
            <Grid container spacing={2}>
            {/* Left side: stock_item, item_desc */}
            {/* LEFT SIDE */}
<Grid item xs={12} lg={6}>
  <Grid container spacing={2}>
    {leftFields.map((field) => (
      <Grid item xs={12} key={field}>
        <MDTypography variant="body01" mb={0.5} display="block">
  {fieldConfig[field]?.label}
</MDTypography>

<MDInput
  fullWidth
  value={form[field]}
  onChange={handleChange(field)}
  error={!!errors[field]}
  multiline={field === "item_desc"}
  rows={field === "item_desc" ? 6 : 1}
  placeholder={fieldConfig[field]?.placeholder}
  sx={{ backgroundColor: "#fff" }}
/>

        {errors[field] && (
          <MDTypography variant="caption" color="error">
            {errors[field]}
          </MDTypography>
        )}
      </Grid>
    ))}
  </Grid>
</Grid>

            {/* RIGHT SIDE */}
<Grid item xs={12} lg={6}>
  <Grid container spacing={2}>

    {/* IMAGE */}
    <Grid item xs={12} display="flex" justifyContent="center">
      <UploadPic
        name="item_img"
        onImageChange={handleImageChange}
        apiImage={
          form.item_img instanceof File
            ? URL.createObjectURL(form.item_img)
            : form.item_img_url
            ? BaseClass.buildFileUrl(form.item_img_url)
            : null
        }
        resetImage={false}
        disabled={false}
        label="click to upload photo"
      />
    </Grid>

    {/* RIGHT FIELDS */}
    {rightFields.map((field) => (
      <Grid item xs={12} key={field}>
        <MDTypography variant="body01" mb={0.5} display="block">
  {fieldConfig[field]?.label}
</MDTypography>

<MDInput
  fullWidth
  value={form[field]}
  onChange={handleChange(field)}
  placeholder={fieldConfig[field]?.placeholder}
  sx={{ backgroundColor: "#fff" }}
/>
      </Grid>
    ))}
  </Grid>
</Grid>

</Grid>
</DialogContent>

        <DialogActions sx={{ justifyContent: "right", gap: 2}}>
            <MDButton variant="contained"
                color="secondary"
                sx={{ color: "#fff" }} 
                onClick={onClose} 
                disabled={submitting}>
                Cancel
            </MDButton>
            <MDButton 
                onClick={handleSubmit} 
                variant="contained"
                color="success"
                sx={{ color: "#fff" }} 
                disabled={submitting}>
                {submitting ? "Saving..." : isEdit ? "Update" : "Create"}
            </MDButton>
        </DialogActions>
        </Dialog>
    );
}

ItemsFormDialog.propTypes = {
    open: PropTypes.bool.isRequired,
    mode: PropTypes.oneOf(["create", "edit"]),
    initialData: PropTypes.object,
    onClose: PropTypes.func,
    onSubmit: PropTypes.func,
};
