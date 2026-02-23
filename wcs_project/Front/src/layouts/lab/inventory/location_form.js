import React, { useEffect, useMemo, useState } from "react";
import { Dialog, DialogTitle, DialogContent, DialogActions, Grid } from "@mui/material";
import PropTypes from "prop-types";
import MDInput from "components/MDInput";
import MDTypography from "components/MDTypography";
import MDButton from "components/MDButton";

export default function LocationsFormDialog({
  open,
  mode = "create",
  initialData = null,
  onClose,
  onSubmit,
}) {
  const isEdit = mode === "edit";

  const [form, setForm] = useState({
    store_type: "",
    loc: "",
    box_loc: "",
  });

  const [errors, setErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!open) return;

    setErrors({});

    if (isEdit && initialData) {
      setForm({
        store_type: initialData.store_type || "",
        loc: initialData.loc || "",
        box_loc: initialData.box_loc || "",
      });
    } else {
      setForm({
        store_type: "",
        loc: "",
        box_loc: "",
      });
    }
  }, [open, isEdit, initialData]);

  const title = useMemo(
    () => (isEdit ? "Edit Location Master" : "Create New Location Master"),
    [isEdit]
  );

  const handleChange = (field) => (e) => {
    const value = e.target.value;
    setForm((prev) => ({ ...prev, [field]: value }));
    setErrors((prev) => ({ ...prev, [field]: "" }));
  };

  const validateAll = () => {
    const next = {};

    if (!form.store_type.trim()) next.store_type = "Source Store Location is required.";

    if (!form.loc.trim()) next.loc = "Source Location is required.";

    if (!form.box_loc.trim()) next.box_loc = "Source Box Location is required.";

    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const handleSubmit = async () => {
    if (!validateAll()) return;

    try {
      setSubmitting(true);

      const formData = new FormData();
      formData.append("store_type", form.store_type);
      formData.append("loc", form.loc);
      formData.append("box_loc", form.box_loc);

      const ok = await onSubmit?.(formData);
      if (ok) onClose?.();
    } finally {
      setSubmitting(false);
    }
  };

  const getLabel = (field) => {
    if (field === "store_type") return "Source Store Location";
    if (field === "loc") return "Source Location";
    if (field === "box_loc") return "Source Box Location";
    return "";
  };

  const getPlaceholder = (field) => {
    if (field === "store_type") return "Enter source store location";
    if (field === "loc") return "Enter source location";
    if (field === "box_loc") return "Enter source box location";
    return "";
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      PaperProps={{
        sx: { borderRadius: 5 },
      }}
      fullWidth
      maxWidth="xs"
    >
      <DialogTitle>{title}</DialogTitle>

      <DialogContent dividers>
        <Grid container spacing={2}>
          {["store_type", "loc", "box_loc"].map((field) => (
            <Grid item xs={12} key={field}>
              <MDTypography variant="body1" mb={0.5}>
                {getLabel(field)}
              </MDTypography>

              <MDInput
                fullWidth
                value={form[field]}
                onChange={handleChange(field)}
                error={!!errors[field]}
                multiline={field === "box_loc"}
                rows={field === "box_loc" ? 4 : 1}
                placeholder={getPlaceholder(field)}
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
      </DialogContent>

      <DialogActions sx={{ justifyContent: "right", gap: 2 }}>
        <MDButton
          variant="contained"
          color="secondary"
          sx={{ color: "#fff" }}
          onClick={onClose}
          disabled={submitting}
        >
          Cancel
        </MDButton>

        <MDButton
          onClick={handleSubmit}
          variant="contained"
          color="success"
          sx={{ color: "#fff" }}
          disabled={submitting}
        >
          {submitting ? "Saving..." : isEdit ? "Update" : "Create"}
        </MDButton>
      </DialogActions>
    </Dialog>
  );
}

LocationsFormDialog.propTypes = {
  open: PropTypes.bool.isRequired,
  mode: PropTypes.oneOf(["create", "edit"]),
  initialData: PropTypes.object,
  onClose: PropTypes.func,
  onSubmit: PropTypes.func,
};
