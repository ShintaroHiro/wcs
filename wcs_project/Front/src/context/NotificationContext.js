// ดึงทุก 10 วิ
// import { createContext, useEffect, useState } from "react";
// import EventsAPI from "api/EventsAPI";
// import { GlobalVar } from "common/GlobalVar";

// export const NotificationContext = createContext();

// export const NotificationProvider = ({ children }) => {

//   const [alertOpen, setAlertOpen] = useState(false);
//   const [alertMessages, setAlertMessages] = useState([]);
//   const [isError, setIsError] = useState(false); // ⭐ เพิ่มตัวนี้

//   const fetchAlert = async () => {
//     try {
//       const res = await EventsAPI.getErrorAlert(GlobalVar.getStoreType());

//       if (res?.data) {
//         const { is_error, messages } = res.data;

//         GlobalVar.setSumError(res.data.sum_error);

//         setIsError(is_error);                 // ⭐ ใช้ตัวนี้
//         setAlertMessages(messages || []);
//         setAlertOpen(is_error);
//       }

//     } catch (error) {
//       console.error("Alert API error:", error);
//     }
//   };

//   useEffect(() => {
//     fetchAlert();

//     const interval = setInterval(() => {
//       fetchAlert();
//     }, 10000);

//     return () => clearInterval(interval);
//   }, []);

//   return (
//     <NotificationContext.Provider
//       value={{
//         alertOpen,
//         alertMessages,
//         isError,          // ⭐ ต้องส่งออกไป
//         setAlertOpen
//       }}
//     >
//       {children}
//     </NotificationContext.Provider>
//   );
// };

//ค่อยดึงตอนเข้าหน้านั้น
import { createContext, useEffect, useState } from "react";
import { useLocation } from "react-router-dom";
import EventsAPI from "api/EventsAPI";
import { GlobalVar } from "common/GlobalVar";

export const NotificationContext = createContext();

export const NotificationProvider = ({ children }) => {

  const [alertOpen, setAlertOpen] = useState(false);
  const [alertMessages, setAlertMessages] = useState([]);
  const [isError, setIsError] = useState(false);

  const location = useLocation();

  const fetchAlert = async () => {
    try {
      const storeType = GlobalVar.getStoreType();

      const res = await EventsAPI.getErrorAlert(storeType);

      if (res?.data) {
        const { is_error, messages } = res.data;

        setIsError(is_error);
        setAlertMessages(messages || []);
        setAlertOpen(is_error);
      }

    } catch (error) {
      console.error("Alert API error:", error);
    }
  };

  useEffect(() => {
    fetchAlert();
  }, [location.pathname]); // ⭐ เปลี่ยนหน้าเมื่อไหร่ค่อยเรียก

  return (
    <NotificationContext.Provider
      value={{
        alertOpen,
        setAlertOpen,
        alertMessages,
        isError
      }}
    >
      {children}
    </NotificationContext.Provider>
  );
};