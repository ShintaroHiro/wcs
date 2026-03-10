import LocalStorageHelper from "../utils/LocalStorageHelper";
import * as Constants from "common/constants";
// import HospitalAPI from "api/HospitalAPI";
const StorageKeys = {
  USER_ID: "userID",
  USERNAME: "userName",
  ROLE: "role",
  USER_DATA: "userData",
  EMPLOYEE_DATA: "employeeData",
  HOSPITAL_CODE: "hospitalCode",
  HOSPITAL_NAME: "hospitalName",
  HOSPITAL_ADDRESS: "hospitalAddress",
  HOSPITAL_LOGO: "hospitalLogo",
  LANGUAGE: "language",
  MC_CODES: "mcCodes", 
  STORE_TYPE: "storeType",
  SUM_ERROR: "sumError",

  // เพิ่มคีย์อื่นๆ ตามที่ต้องการ
};

class GlobalVar {
  // ฟังก์ชันในการตั้งค่า token
  static setToken(token) {
    LocalStorageHelper.setItem(StorageKeys.TOKEN, token);
  }

  static setUserId(userID) {
    LocalStorageHelper.setItem(StorageKeys.USER_ID, userID);
  }

  static setUsername(username) {
    LocalStorageHelper.setItem(StorageKeys.USERNAME, username);
  }

  static setRole(role) {
    LocalStorageHelper.setItem(StorageKeys.ROLE, role);
  }

  static setHospitalCode(hospitalCode) {
    LocalStorageHelper.setItem(StorageKeys.HOSPITAL_CODE, hospitalCode);
  }

  static setHospitalName(hospitalName) {
    LocalStorageHelper.setItem(StorageKeys.HOSPITAL_NAME, hospitalName);
  }

  static setHospitalAddress(hospitalAddress) {
    LocalStorageHelper.setItem(StorageKeys.HOSPITAL_ADDRESS, hospitalAddress);
  }

  static setHospitalLogo(hospitalLogo) {
    LocalStorageHelper.setItem(StorageKeys.HOSPITAL_LOGO, hospitalLogo);
  }

  // ฟังก์ชันในการตั้งค่า token
  static setLanguage(language) {
    LocalStorageHelper.setItem(StorageKeys.LANGUAGE, language);
  }

  // ฟังก์ชันในการดึงค่า token
  static getToken() {
    return LocalStorageHelper.getItem(StorageKeys.TOKEN);
  }

  static getUsername() {
    return LocalStorageHelper.getItem(StorageKeys.USERNAME);
  }

  static getRole() {
    return LocalStorageHelper.getItem(StorageKeys.ROLE);
  }

  static getUserId() {
    return LocalStorageHelper.getItem(StorageKeys.USER_ID);
  }

  static async getHospitalName() {
    try {

      const storedHospitalName = LocalStorageHelper.getItem(StorageKeys.HOSPITAL_NAME); // ดึง hospitalName จาก LocalStorage
      // ถ้า hospitalCode ปัจจุบันตรงกับที่เคยเก็บไว้และมี hospitalName ใน LocalStorage
      if (storedHospitalName) {
        return JSON.parse(storedHospitalName); // คืนค่าจาก LocalStorage
      } else {
        console.warn("Hospital name not found in API response, using default names.");
        return {
          hospital_name_en: Constants.DEFAULT_LPI_NAME,
          hospital_name_th: Constants.DEFAULT_LPI_NAME,
        };
      }
    } catch (error) {
      console.error("Error fetching hospital name:", error);
      return {
        hospital_name_en: Constants.DEFAULT_LPI_NAME,
        hospital_name_th: Constants.DEFAULT_LPI_NAME,
      };
    }
  }

  static async getHospitalLogo() {
    try {
      return Constants.DEFAULT_LPI_LOGO;
    } catch (error) {
      console.error("Error fetching hospital logo:", error);
      return Constants.DEFAULT_LPI_LOGO;
    }
  }

  static getLanguage() {
    let language = "";
    try {
      const storedLanguage = LocalStorageHelper.getItem(StorageKeys.LANGUAGE);
      if (!storedLanguage) {
        language = Constants.DEFAULT_LANGUAGE;
      } else {
        language = storedLanguage;
      }
    } catch (error) {
      console.error("Error accessing localStorage:", error);
      language = Constants.DEFAULT_LANGUAGE;  // ใช้ค่าภาษาเริ่มต้นในกรณีเกิดข้อผิดพลาด
    }
    return language;
  }

  // =====================
  // MC CODE
  // =====================
  static setMcCodes(mcCodes) {
    // ควรเป็น array เสมอ
    LocalStorageHelper.setItem(
      StorageKeys.MC_CODES,
      JSON.stringify(mcCodes ?? [])
    );
  }

  static getMcCodes() {
    try {
      const value = LocalStorageHelper.getItem(StorageKeys.MC_CODES);
      return value ? JSON.parse(value) : [];
    } catch (e) {
      return [];
    }
  }

  static removeMcCodes() {
    LocalStorageHelper.removeItem(StorageKeys.MC_CODES);
  }

 // ===== store_type =====
  static setStoreType(storeType) {
    LocalStorageHelper.setItem(StorageKeys.STORE_TYPE, storeType);
  }

  static getStoreType() {
    return LocalStorageHelper.getItem(StorageKeys.STORE_TYPE);
  }

  static removeStoreType() {
    LocalStorageHelper.removeItem(StorageKeys.STORE_TYPE);
  }

   // ===== SumError =====
  static setSumError(sumError) {
    LocalStorageHelper.setItem(
      StorageKeys.SUM_ERROR,
      Number(sumError) || 0
    );
  }

  static getSumError() {
    return Number(LocalStorageHelper.getItem(StorageKeys.SUM_ERROR)) || 0;
  }

  static removeSumError() {
    LocalStorageHelper.removeItem(StorageKeys.SUM_ERROR);
  }

  // ฟังก์ชันในการตั้งค่าข้อมูลตามคีย์
  static setDataByKey(key, data) {
    LocalStorageHelper.setItem(key, data);
  }

  // ฟังก์ชันในการดึงข้อมูลตามคีย์
  static getDataByKey(key) {
    return LocalStorageHelper.getItem(key);
  }

  // ฟังก์ชันในการลบข้อมูลตามคีย์
  static removeDataByKey(key) {
    LocalStorageHelper.removeItem(key);
  }

  // ฟังก์ชันในการลบ token
  static removeToken() {
    LocalStorageHelper.removeItem(StorageKeys.TOKEN);
  }

  // ฟังก์ชันในการลบ localstorage ทั้งหมด ตอน logout
  static removeForLogout() {
    LocalStorageHelper.removeItem(StorageKeys.TOKEN);
    LocalStorageHelper.removeItem(StorageKeys.USER_ID);
    LocalStorageHelper.removeItem(StorageKeys.USERNAME);
    LocalStorageHelper.removeItem(StorageKeys.ROLE);
    LocalStorageHelper.removeItem(StorageKeys.MC_CODES);
    LocalStorageHelper.removeItem(StorageKeys.STORE_TYPE);
    LocalStorageHelper.removeItem(StorageKeys.SUM_ERROR);
  }
}

export { GlobalVar, StorageKeys };