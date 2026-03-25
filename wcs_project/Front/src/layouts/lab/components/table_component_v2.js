import React, { useMemo, useState } from "react";
import PropTypes from "prop-types";
import {
  Box,
  Card,
  IconButton,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TablePagination,
  TableRow,
  Tooltip,
  Typography,
  Checkbox,
} from "@mui/material";
import {
  Edit as EditIcon,
  Delete as DeleteIcon,
  Settings as SettingsIcon,
  QrCode as QrCodeIcon,
  Print as PrintIcon,
} from "@mui/icons-material";
import MDButton from "components/MDButton";

/**
 * ReusableDataTable
 * ...
 * เพิ่มเติม:
 *  - รองรับคอลัมน์ type: "confirmSku" เพื่อแสดงปุ่ม Confirm
 *  - ปิด/เปิดปุ่มได้ด้วยพร็อพ confirmSkuDisabled (boolean | (row)=>boolean)
 *  - callback onConfirmSku(row)
 */
export default function ReusableDataTable({
  columns,
  rows,
  idField = "id",
  pageSizeOptions = [10, 25, 50, 100],
  defaultPageSize = 10,
  stickyHeader = true,
  density = "standard",
  showActions = false,
  onEdit,
  onDelete,
  onSettings,
  onPrint,
  onBarcode,

  // เดิม
  actionsVariant = "icons",
  extraActionButtons = [],

  // ✅ ใหม่สำหรับ Confirm SKU column
  onConfirmSku,
  confirmSkuDisabled = false, // boolean หรือ (row)=>boolean
  
  onScanSku,
  scanSkuDisabled = false,

  onRowClick,
  selectedId,

  onClear,
  clearDisabled = false,

  onError,
  errorDisabled = false,

  onForceManual,
  forceManualDisabled = false,


  // สำหรับ checkbox
  enableSelection = false, // true = เปิด checkbox
  selectedRows = [], // array of ids ที่เลือกอยู่
  onSelectedRowsChange, // callback เมื่อ checkbox เปลี่ยน
  isRowSelectable, //ถ้าไม่ส่งเลือกได้ทุกแถว

  disableHorizontalScroll = false, //ปิด horizontal scroll

  expandable = false,
  getParentId,
  getLevel,

  pagination = true,

  onQuantityChange,
  quantityDisabled = false,
  minQuantity = 0,
  maxQuantity,

  getRowStyle,
}) {
  // ---- local state ----
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(defaultPageSize);
  const [orderBy, setOrderBy] = useState(null); // field
  const [order, setOrder] = useState("asc"); // 'asc' | 'desc'

  //ทำtree
  const [expandedIds, setExpandedIds] = useState([]);

  const toggleExpand = (id) => {
    setExpandedIds((prev) =>
      prev.includes(id)
        ? prev.filter((x) => x !== id)
        : [...prev, id]
    );
  };


  // Normalize actions list
  const actionsList = useMemo(() => {
    if (!showActions) return [];
    const all = ["edit", "delete", "settings", "print", "barcode", "stop", "confirm"];
    return Array.isArray(showActions) ? all.filter((a) => showActions.includes(a)) : all;
  }, [showActions]);

  // ทำให้ rows ปลอดภัยเป็นอาเรย์เสมอ
  const safeRows = useMemo(() => {
    if (Array.isArray(rows)) return rows;
    if (rows && Array.isArray(rows.items)) return rows.items;
    if (rows && Array.isArray(rows.data)) return rows.data;
    console.warn("ReusableDataTable: `rows` is not an array. Received:", rows);
    return [];
  }, [rows]);

  // Reset page เมื่อจำนวนข้อมูลเปลี่ยน
  React.useEffect(() => {
    const maxPage = Math.floor((safeRows.length - 1) / rowsPerPage);

    if (page > maxPage) {
      setPage(0);
    }
  }, [safeRows, rowsPerPage]);

  const getRowId = (row, index) => row?.[idField] ?? index;

  // Sorting utils
  const getValue = (row, col) => {
    if (col.valueGetter) return col.valueGetter(row);
    return row?.[col.field];
  };

  const sortedRows = useMemo(() => {
    if (!orderBy) return safeRows;
    const col = columns.find((c) => c.field === orderBy);
    if (!col) return safeRows;
    const arr = [...safeRows];
    arr.sort((a, b) => {
      const va = getValue(a, col);
      const vb = getValue(b, col);
      if (va == null && vb == null) return 0;
      if (va == null) return order === "asc" ? -1 : 1;
      if (vb == null) return order === "asc" ? 1 : -1;
      if (typeof va === "number" && typeof vb === "number") {
        return order === "asc" ? va - vb : vb - va;
      }
      const sa = String(va).toLowerCase();
      const sb = String(vb).toLowerCase();
      if (sa < sb) return order === "asc" ? -1 : 1;
      if (sa > sb) return order === "asc" ? 1 : -1;
      return 0;
    });
    return arr;
  }, [safeRows, columns, orderBy, order]);

  const visibleRows = useMemo(() => {
  if (!expandable || !getParentId) return sortedRows;

  const isRowVisible = (row) => {
    let parentId = getParentId(row);

    while (parentId) {
      if (!expandedIds.includes(parentId)) {
        return false;
      }

      const parentRow = sortedRows.find(
        (r) => getRowId(r) === parentId
      );

      if (!parentRow) break;

      parentId = getParentId(parentRow);
    }

    return true;
  };

  return sortedRows.filter(isRowVisible);
}, [sortedRows, expandable, expandedIds]);


  const pagedRows = useMemo(() => {
    const start = page * rowsPerPage;
    const end = start + rowsPerPage;
    return visibleRows.slice(start, end);
  }, [visibleRows, page, rowsPerPage]);

  const handleSort = (field, sortable = true) => {
    if (!sortable) return;
    if (orderBy === field) {
      setOrder((prev) => (prev === "asc" ? "desc" : "asc"));
    } else {
      setOrderBy(field);
      setOrder("asc");
    }
  };

  // ✅ เรนเดอร์ส่วน Actions เป็น “ไอคอน/ปุ่ม/ทั้งคู่”
  const renderActions = (row) => {
    const showIcons = actionsVariant === "icons" || actionsVariant === "both";
    const showButtons = actionsVariant === "buttons" || actionsVariant === "both";

    return (
      <Box display="flex" alignItems="center" justifyContent="center" gap={1} flexWrap="wrap">
        {showIcons && (
          <>
            {actionsList.includes("edit") && (
              <Tooltip title="Edit">
                <span>
                  <IconButton size="small" color="success" onClick={() => onEdit?.(row)}>
                    <EditIcon fontSize="small" />
                  </IconButton>
                </span>
              </Tooltip>
            )}
            {actionsList.includes("delete") && (
              <Tooltip title="Delete">
                <span>
                  <IconButton size="small" color="error" onClick={() => onDelete?.(row)}>
                    <DeleteIcon fontSize="small" />
                  </IconButton>
                </span>
              </Tooltip>
            )}
            {actionsList.includes("settings") && (
              <Tooltip title="Settings">
                <span>
                  <IconButton size="small" onClick={() => onSettings?.(row)}>
                    <SettingsIcon fontSize="small" />
                  </IconButton>
                </span>
              </Tooltip>
            )}
            {actionsList.includes("print") && (
              <Tooltip title="Print">
                <span>
                  <IconButton size="small" onClick={() => onPrint?.(row)}>
                    <PrintIcon fontSize="small" />
                  </IconButton>
                </span>
              </Tooltip>
            )}
            {actionsList.includes("barcode") && (
              <Tooltip title="Barcode">
                <span>
                  <IconButton size="small" onClick={() => onBarcode?.(row)}>
                    <QrCodeIcon fontSize="small" />
                  </IconButton>
                </span>
              </Tooltip>
            )}
            {actionsList.includes("stop") && (
              <Tooltip title="Stop">
                <span>
                  <MDButton
                    variant="contained"
                    color="error"
                    size="small"
                    onClick={() => console.log("Stop row:", row)}
                  >
                    Stop
                  </MDButton>
                </span>
              </Tooltip>
            )}
            {actionsList.includes("confirm") && (
              <Tooltip title="Confirm">
                <span>
                  <MDButton
                    variant="contained"
                    color="success"
                    size="small"
                    onClick={() => console.log("Confirm row:", row)}
                  >
                    Confirm
                  </MDButton>
                </span>
              </Tooltip>
            )}
          </>
        )}

        {showButtons && (
          <>
            {actionsList.includes("edit") && (
              <MDButton size="small" color="dark" onClick={() => onEdit?.(row)}>
                Edit
              </MDButton>
            )}
            {actionsList.includes("delete") && (
              <MDButton size="small" color="error" onClick={() => onDelete?.(row)}>
                Delete
              </MDButton>
            )}
            {actionsList.includes("settings") && (
              <MDButton size="small" color="info" onClick={() => onSettings?.(row)}>
                Settings
              </MDButton>
            )}
            {actionsList.includes("print") && (
              <MDButton size="small" onClick={() => onPrint?.(row)}>
                Print
              </MDButton>
            )}
            {actionsList.includes("barcode") && (
              <MDButton size="small" onClick={() => onBarcode?.(row)}>
                Barcode
              </MDButton>
            )}
          </>
        )}

        {/* ปุ่มเสริม */}
        {extraActionButtons.map((btn, i) => (
          <MDButton
            key={i}
            size="small"
            color={btn.color || "dark"}
            onClick={() => btn.onClick?.(row)}
          >
            {btn.label}
          </MDButton>
        ))}
      </Box>
    );
  };

  // ✅ เรนเดอร์เซลล์สำหรับคอลัมน์พิเศษ "confirmSku"
  const renderConfirmSkuCell = (row) => {
    const disabled =
      typeof confirmSkuDisabled === "function" ? !!confirmSkuDisabled(row) : !!confirmSkuDisabled;

    return (
      <MDButton
        variant="contained"
        size="small"
        color={disabled ? "secondary" : "success"}
        disabled={disabled}
        onClick={() => !disabled && onConfirmSku?.(row)}
      >
        Confirm
      </MDButton>
    );
  };

  //scan
  const renderScanSkuCell = (row) => {
    const disabled =
      typeof scanSkuDisabled === "function"
        ? !!scanSkuDisabled(row)
        : !!scanSkuDisabled;

    return (
      <MDButton
        variant="contained"
        size="small"
        color={disabled ? "secondary" : "info"}
        disabled={disabled}
        onClick={() => !disabled && onScanSku?.(row)}
      >
        Scan
      </MDButton>
    );
  };

  //clear
  const renderClearCell = (row) => {
    const hidden =
      typeof clearDisabled === "function"
        ? clearDisabled(row)
        : clearDisabled;

    if (hidden) return null;

    return (
      <MDButton
        variant="contained"
        size="small"
        color="info"
        onClick={() => onClear?.(row)}
      >
        Clear
      </MDButton>
    );
  };

  //setError
  const renderErrorCell = (row) => {
    const disabled =
      typeof errorDisabled === "function"
        ? !!errorDisabled(row)
        : !!errorDisabled;

    return (
      <MDButton
        variant="contained"
        size="small"
        color={disabled ? "secondary" : "error"}
        disabled={disabled}
        onClick={() => !disabled && onError?.(row)}
      >
        Error
      </MDButton>
    );
  };

  //forceManual
  const renderForceManualCell = (row) => {
    const disabled =
      typeof forceManualDisabled === "function"
        ? !!forceManualDisabled(row)
        : !!forceManualDisabled;

    return (
      <MDButton
        variant="contained"
        size="small"
        color={disabled ? "secondary" : "primary"}
        disabled={disabled}
        onClick={() => !disabled && onForceManual?.(row)}
      >
        Force Manual
      </MDButton>
    );
  };

  //+/- qty
  const renderQuantityCell = (row) => {

  const baseDisabled =
    typeof quantityDisabled === "function"
      ? !!quantityDisabled(row)
      : !!quantityDisabled;

  const value = Number(row.actual_qty ?? 0);

  const max =
    typeof maxQuantity === "function"
      ? maxQuantity(row)
      : maxQuantity;

  const handleDecrease = () => {
    if (baseDisabled) return;
    const newValue = Math.max(minQuantity, value - 1);
    onQuantityChange?.(row, newValue);
  };

  const handleIncrease = () => {
    if (baseDisabled) return;

    let newValue = value + 1;

    if (max !== undefined) {
      newValue = Math.min(max, newValue);
    }

    onQuantityChange?.(row, newValue);
  };

  return (
    <Box display="flex" alignItems="center" gap={1}>
      <MDButton
        size="small"
        variant="contained"
        color="secondary"
        disabled={baseDisabled || value <= minQuantity}
        onClick={handleDecrease}
        sx={{
          minWidth: 24,      // 🔥 เดิม 32 → ลดลง
          width: 24,
          height: 20,
          px: 0,
          fontSize: "0.7rem"
        }}
      >
        -
      </MDButton>

      <Typography
        sx={{
          minWidth: 20,
          textAlign: "center",
          fontSize: "1.0rem",   // 🔥 ลดขนาดตัวเลข
          fontWeight: 500
        }}
      >
        {value}
      </Typography>

      <MDButton
        size="small"
        variant="contained"
        color="secondary"
        disabled={baseDisabled || (max !== undefined && value >= max)}
        onClick={handleIncrease}
        sx={{
          minWidth: 24,      // 🔥 เดิม 32 → ลดลง
          width: 24,
          height: 24,
          px: 0,
          fontSize: "0.7rem"
        }}
      >
        +
      </MDButton>
    </Box>
  );
};

// version กรอกเลขได้
// const renderQuantityCell = (row) => {

//   const baseDisabled =
//     typeof quantityDisabled === "function"
//       ? !!quantityDisabled(row)
//       : !!quantityDisabled;

//   const value = Number(row.actual_qty ?? 0);

//   const max =
//     typeof maxQuantity === "function"
//       ? maxQuantity(row)
//       : maxQuantity;

//   const handleDecrease = () => {
//     if (baseDisabled) return;
//     const newValue = Math.max(minQuantity, value - 1);
//     onQuantityChange?.(row, newValue);
//   };

//   const handleIncrease = () => {
//     if (baseDisabled) return;

//     let newValue = value + 1;
//     if (max !== undefined) {
//       newValue = Math.min(max, newValue);
//     }

//     onQuantityChange?.(row, newValue);
//   };

//   const handleManualChange = (e) => {
//     if (baseDisabled) return;

//     let newValue = Number(e.target.value);

//     if (isNaN(newValue)) newValue = 0;

//     if (max !== undefined) {
//       newValue = Math.min(max, newValue);
//     }

//     newValue = Math.max(minQuantity, newValue);

//     onQuantityChange?.(row, newValue);
//   };

//   return (
//     <Box display="flex" alignItems="center" gap={1}>
//       <MDButton
//         size="small"
//         variant="contained"
//         color="secondary"
//         disabled={baseDisabled || value <= minQuantity}
//         onClick={handleDecrease}
//         sx={{ minWidth: 32, px: 1 }}
//       >
//         -
//       </MDButton>

//       <TextField
//         type="number"
//         size="small"
//         value={value}
//         onChange={handleManualChange}
//         inputProps={{
//           min: minQuantity,
//           max: max,
//           style: { textAlign: "center", width: 60 }
//         }}
//         disabled={baseDisabled}
//       />

//       <MDButton
//         size="small"
//         variant="contained"
//         color="secondary"
//         disabled={baseDisabled || (max !== undefined && value >= max)}
//         onClick={handleIncrease}
//         sx={{ minWidth: 32, px: 1 }}
//       >
//         +
//       </MDButton>
//     </Box>
//   );
// };



  const selectableRows = isRowSelectable ? safeRows.filter(isRowSelectable) : safeRows;

  const allSelectableIds = selectableRows.map((r, i) => getRowId(r, i));

  return (
    <Card variant="outlined" sx={{ overflow: "hidden", borderRadius: 0 }}>
      <TableContainer
        sx={{
          maxHeight: 640,
          borderRadius: 0,
          overflowX: disableHorizontalScroll ? "hidden" : "auto",
        }}
      >

        <Table stickyHeader={stickyHeader} size={density === "compact" ? "small" : "medium"}>
          <TableHead style={{ display: "table-header-group" }}>
            <TableRow>
              {/* Checkbox Header */}
              {enableSelection && (
                <TableCell
                  padding="checkbox"
                  sx={{
                    position: "sticky",
                    left: 0,
                    zIndex: 4, // header ต้องสูงกว่า row
                    backgroundColor: "#fff",
                  }}
                >
                  {/* <Checkbox
                  checked={selectedRows.length > 0 && selectedRows.length === safeRows.length}
                  indeterminate={selectedRows.length > 0 && selectedRows.length < safeRows.length}
                  onChange={(e) => {
                    if (e.target.checked) {
                      const allIds = safeRows.map((r, i) => getRowId(r, i));
                      onSelectedRowsChange?.(allIds);
                    } else {
                      onSelectedRowsChange?.([]);
                    }
                  }}
                /> */}
                  <Checkbox
                    checked={
                      allSelectableIds.length > 0 &&
                      allSelectableIds.every((id) => selectedRows.includes(id))
                    }
                    indeterminate={
                      selectedRows.length > 0 &&
                      selectedRows.length < allSelectableIds.length
                    }
                    onChange={(e) => {
                      onSelectedRowsChange?.(e.target.checked ? allSelectableIds : []);
                    }}
                    sx={{
                      "& .MuiSvgIcon-root": {
                        fontSize: 28,
                        border: "2px solid black",
                        borderRadius: "4px",
                        backgroundColor: "#fff",
                      },
                    }}
                  />
                </TableCell>
              )}

              {columns.map((col) => {
                const sortable = col.sortable !== false && col.type !== "confirmSku" && col.type !== "scanSku";
                const active = orderBy === col.field;
                return (
                  <TableCell
                    key={col.field}
                    onClick={() => handleSort(col.field, sortable)}
                    sx={{
                      cursor: sortable ? "pointer" : "default",
                      minWidth: col.minWidth,
                      fontWeight: 600,
                      backgroundColor: "#fff",
                      color: "#757575",
                    }}
                    align={col.align || "left"}
                  >
                    <Box display="inline-flex" alignItems="center" gap={0.5}>
                      {col.label ?? col.field}
                      {sortable && (
                        <Box component="span" sx={{ opacity: active ? 1 : 0.3 }}>
                          {active ? (order === "asc" ? "▲" : "▼") : "↕"}
                        </Box>
                      )}
                    </Box>
                  </TableCell>
                );
              })}

              {actionsList.length > 0 && (
                <TableCell
                  align="center"
                  sx={{
                    width: 160,
                    fontWeight: 600,
                    backgroundColor: "#fff",
                    color: "#757575",
                  }}
                >
                  Actions
                </TableCell>
              )}
            </TableRow>
          </TableHead>

          <TableBody>
            {pagedRows.map((row, idx) => {
              const rowId = getRowId(row, idx);
              const isSelected = rowId === selectedId;
              const rowSelectable = isRowSelectable ? isRowSelectable(row) : true;

              return (
                <TableRow
                  hover={rowSelectable}
                  key={rowId}
                  onClick={() => {
                    if (!rowSelectable) return;
                    onRowClick?.(row);
                  }}
                  selected={isSelected}
                  sx={{
                    cursor: rowSelectable ? "pointer" : "default",
                    backgroundColor: isSelected ? "rgba(25, 118, 210, 0.12)" : "inherit",
                    "&:hover": rowSelectable
                      ? {
                          backgroundColor: isSelected ? "rgba(25, 118, 210, 0.18)" : "#f5f5f5",
                        }
                      : {}, // ❌ ไม่มี hover effect ถ้าเลือกไม่ได้
                      ...(getRowStyle ? getRowStyle(row) : {})
                  }}
                >
                  {/* Checkbox Each Row */}
                  {/* {enableSelection && (
                  <TableCell 
                    padding="checkbox"
                    onClick={(e) => e.stopPropagation()}
                    sx={{
                      position: "sticky",
                      left: 0,
                      zIndex: 3,
                      backgroundColor: "#fff",
                    }}
                  >
                    <Checkbox
                      checked={selectedRows.includes(rowId)}
                      disabled={!selectable}
                      onChange={(e) => {
                        if (!selectable) return;

                        if (e.target.checked) {
                          onSelectedRowsChange?.([...selectedRows, rowId]);
                        } else {
                          onSelectedRowsChange?.(selectedRows.filter((id) => id !== rowId));
                        }
                      }}
                    />
                  </TableCell>
                )} */}
                  {enableSelection && (
                    <TableCell
                      padding="checkbox"
                      onClick={(e) => e.stopPropagation()}
                      sx={{
                        position: "sticky",
                        left: 0,
                        zIndex: 3,
                        backgroundColor: "#fff",
                      }}
                    >
                      <Checkbox
                        checked={selectedRows.includes(rowId)}
                        disabled={!rowSelectable}
                        onChange={(e) => {
                          if (!rowSelectable) return;

                          if (e.target.checked) {
                            onSelectedRowsChange?.([...selectedRows, rowId]);
                          } else {
                            onSelectedRowsChange?.(
                              selectedRows.filter((id) => id !== rowId)
                            );
                          }
                        }}
                        sx={{
                          opacity: rowSelectable ? 1 : 0.4,

                          // 🔥 ตัวนี้แหละสำคัญ
                          "& .MuiSvgIcon-root": {
                            fontSize: 28,              // ขยายให้เห็นชัด
                            border: "2px solid black", // กรอบจริง
                            borderRadius: "4px",
                            backgroundColor: "#fff",
                          },
                        }}
                      />
                    </TableCell>
                  )}

                  {columns.map((col, colIndex) => {
  const key = `${col.field}-${col.type || "data"}`;
  const rowId = getRowId(row, idx);

  const level = getLevel ? getLevel(row) : 0;
  const isParent =
    expandable &&
    safeRows.some((r) => getParentId?.(r) === rowId);

  const paddingLeft = expandable ? level * 24 : 0;

  // ===== scanSku =====
  if (col.type === "scanSku") {
    return (
      <TableCell key={key} align="center">
        {renderScanSkuCell(row)}
      </TableCell>
    );
  }

  // ===== confirmSku =====
  if (col.type === "confirmSku") {
    return (
      <TableCell key={key} align={col.align || "center"}>
        {renderConfirmSkuCell(row)}
      </TableCell>
    );
  }

  // ===== clear =====
  if (col.type === "clear") {
    return (
      <TableCell key={key} align={col.align || "center"}>
        {renderClearCell(row)}
      </TableCell>
    );
  }

  // ===== setError =====
  if (col.type === "setError") {
    return (
      <TableCell key={key} align={col.align || "center"}>
        {renderErrorCell(row)}
      </TableCell>
    );
  }

  // ===== forceManual =====
  if (col.type === "forceManual") {
    return (
      <TableCell key={key} align={col.align || "center"}>
        {renderForceManualCell(row)}
      </TableCell>
    );
  }

  // ===== quantityControl =====
  if (col.type === "quantityControl") {
    return (
      <TableCell key={key} align="center">
        {renderQuantityCell(row)}
      </TableCell>
    );
  }


  const value = getValue(row, col);

  // ===== TREE UI เฉพาะ column แรก =====
  if (colIndex === 0 && expandable) {
    return (
      <TableCell key={key} align={col.align || "left"}>
        <Box sx={{ pl: paddingLeft, display: "flex", alignItems: "center" }}>
          {isParent && (
            <span
              style={{ cursor: "pointer", marginRight: 6 }}
              onClick={(e) => {
                e.stopPropagation();
                toggleExpand(rowId);
              }}
            >
              {expandedIds.includes(rowId) ? "▼" : "▶"}
            </span>
          )}

          {col.renderCell ? col.renderCell(value, row) : value}
        </Box>
      </TableCell>
    );
  }

  // ===== cell ปกติ =====
  return (
    <TableCell key={key} align={col.align || "left"}>
      {col.renderCell ? col.renderCell(value, row) : value}
    </TableCell>
  );
})}


                  {actionsList.length > 0 && (
                    <TableCell align="center">{renderActions(row)}</TableCell>
                  )}
                </TableRow>
              );
            })}

            {safeRows.length === 0 && (
              <TableRow>
                <TableCell colSpan={columns.length + (actionsList.length > 0 ? 1 : 0)}>
                  <Typography variant="body2" color="text.secondary" align="center">
                    No data
                  </Typography>
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </TableContainer>

    {pagination && (
      <TablePagination
        component="div"
        count={safeRows.length}
        page={page}
        onPageChange={(e, newPage) => setPage(newPage)}
        rowsPerPage={rowsPerPage}
        onRowsPerPageChange={(e) => {
          setRowsPerPage(parseInt(e.target.value, 10));
          setPage(0);
        }}
        rowsPerPageOptions={pageSizeOptions}
        labelDisplayedRows={({ from, to, count }) => `Showing ${from} to ${to} of ${count} entries`}
      />
    )}
    </Card>
  );
}

ReusableDataTable.propTypes = {
  columns: PropTypes.arrayOf(
    PropTypes.shape({
      field: PropTypes.string.isRequired,
      label: PropTypes.string,
      align: PropTypes.oneOf(["left", "center", "right"]),
      sortable: PropTypes.bool,
      minWidth: PropTypes.number,
      flex: PropTypes.number,
      valueGetter: PropTypes.func,
      renderCell: PropTypes.func,
      // ✅ ใหม่: ระบุว่าเป็นคอลัมน์ปุ่ม Confirm SKU
      type: PropTypes.oneOf(["confirmSku","scanSku","clear","setError","forceManual","quantityControl"]),
    })
  ).isRequired,
  rows: PropTypes.array.isRequired,
  idField: PropTypes.string,
  pageSizeOptions: PropTypes.arrayOf(PropTypes.number),
  defaultPageSize: PropTypes.number,
  stickyHeader: PropTypes.bool,
  density: PropTypes.oneOf(["compact", "standard"]),
  showActions: PropTypes.oneOfType([
    PropTypes.bool,
    PropTypes.arrayOf(PropTypes.oneOf(["edit", "delete", "settings", "print", "barcode"])),
  ]),
  onEdit: PropTypes.func,
  onDelete: PropTypes.func,
  onSettings: PropTypes.func,
  onPrint: PropTypes.func,
  onBarcode: PropTypes.func,

  // เดิม
  actionsVariant: PropTypes.oneOf(["icons", "buttons", "both"]),
  extraActionButtons: PropTypes.arrayOf(
    PropTypes.shape({
      label: PropTypes.string.isRequired,
      color: PropTypes.string,
      onClick: PropTypes.func,
    })
  ),

  // ✅ ใหม่
  onConfirmSku: PropTypes.func,
  confirmSkuDisabled: PropTypes.oneOfType([PropTypes.bool, PropTypes.func]),

  onScanSku: PropTypes.func,
  scanSkuDisabled: PropTypes.oneOfType([PropTypes.bool, PropTypes.func]),

  onClear: PropTypes.func,
  clearDisabled: PropTypes.oneOfType([PropTypes.bool, PropTypes.func]),

  onError: PropTypes.func,
  errorDisabled: PropTypes.oneOfType([PropTypes.bool, PropTypes.func]),

  onForceManual: PropTypes.func,
  forceManualDisabled: PropTypes.oneOfType([PropTypes.bool, PropTypes.func]),

  onRowClick: PropTypes.func,
  selectedId: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),

  onQuantityChange: PropTypes.func,
  quantityDisabled: PropTypes.oneOfType([PropTypes.bool, PropTypes.func]),
  minQuantity: PropTypes.number,
  maxQuantity: PropTypes.number,

  // 🔥 ต้องเพิ่มเอง
  enableSelection: PropTypes.bool,
  selectedRows: PropTypes.arrayOf(PropTypes.oneOfType([PropTypes.string, PropTypes.number])),
  onSelectedRowsChange: PropTypes.func,
  isRowSelectable: PropTypes.func,

  disableHorizontalScroll: PropTypes.bool,

  expandable: PropTypes.bool,
  getParentId: PropTypes.func,
  getLevel: PropTypes.func,

  pagination: PropTypes.bool,
  getRowStyle: PropTypes.func,
};
