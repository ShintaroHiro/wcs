import React from "react";
import SweetAlert from "react-bootstrap-sweetalert";

const SweetAlertComponent = ({
  type = "success", // success, error, warning, etc.
  title = "Alert",
  message = "",
  show = false,
  onConfirm,
  onCancel,
  showCancel = false,
  confirmText = "OK",
  cancelText = "Cancel",
  confirmBtnStyle = {},
  cancelBtnStyle = {},
  timeout = null,
}) => {
  const styles = {
    common: {
      padding: "20px",
      fontSize: "16px",
      borderRadius: "20px",
    },
    confirm: {
      backgroundColor:
      type === "error" ? "#d9534f" : 
      type === "warning" ? "#FFC107" : 
      type === "info" ? "#2196F3" : // สีฟ้าอ่อนสำหรับ type="info"
      "#15803D", // สีเขียวเป็นค่าเริ่มต้น
      color: "white",
      borderRadius: "10px",
      padding: "10px 30px",
      fontSize: "18px",
      ...confirmBtnStyle,
    },
    cancel: {
      backgroundColor: "white",
      color: 
      type === "error" ? "#d9534f" : 
      type === "warning" ? "#FFC107" : 
      type === "info" ? "#2196F3" : // สีฟ้าอ่อนสำหรับ type="info"
      "#15803D",
      border: 
      `2px solid ${
      type === "error" ? "#d9534f" : 
      type === "warning" ? "#FFC107" : 
      type === "info" ? "#2196F3" : // สีฟ้าอ่อนสำหรับ type="info"
      "#15803D"
    }`,
      borderRadius: "10px",
      padding: "10px 30px",
      fontSize: "18px",
      ...cancelBtnStyle,
    },
  };

  return (
    <SweetAlert
      type={type}
      title={title}
      show={show}
      style={styles.common}
      showCancel={showCancel || !!onCancel}
      cancelBtnText={cancelText}
      confirmBtnText={confirmText}
      cancelBtnStyle={styles.cancel}
      confirmBtnStyle={styles.confirm}
      onConfirm={onConfirm}
      onCancel={onCancel}
      timeout={timeout}
      focusCancelBtn
    >
      {message}
    </SweetAlert>
  );
};

export default SweetAlertComponent;
