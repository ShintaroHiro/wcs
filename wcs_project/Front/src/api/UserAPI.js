import { GlobalVar, StorageKeys } from "../common/GlobalVar";
import ApiProvider from "./ApiProvider";
import ApiResponse from "../common/ApiResponse";

class UserApi {

  static async searchUser() {
    try {
      const token = GlobalVar.getToken();
      const endpoint = "/api/users/search";
      const apiResponse = await ApiProvider.getData(endpoint, {}, token);


      return new ApiResponse({
        isCompleted: true,
        isError: false,
        message: "Success",
        data: apiResponse,
        error: null
      });

    } catch (error) {
      console.error("Error search Role:", error.message || error);
      throw new Error(`Error: ${error.message}`);

    }
  }

  static async getUserDataById(user_id) {
    try {
      const token = GlobalVar.getToken();

      if (!token) {
        return new ApiResponse({
          isCompleted: false,
          isError: true,
          message: "Token not found in GlobalVar",
          data: null,
          error: "Token not found in GlobalVar"
        });
      }

      const endpoint = `/api/users/get-by-user-id/${user_id}`;
      // console.log('Request Endpoint:', endpoint);
      const apiResponse = await ApiProvider.getData(endpoint, {}, token);

      // console.log('API Response:', apiResponse);

      // Mapping response to ApiResponse format
      const response = new ApiResponse({
        isCompleted: apiResponse.isCompleted,
        isError: apiResponse.isError,
        message: apiResponse.message,
        data: apiResponse.data,
        error: apiResponse.error
      });

      return response;

    } catch (error) {
      console.error(error.message || error);
      return {
        isCompleted: false,
        isError: true,
        message: error.message,
        data: null,
        error: error.message
      };
    }
  }


  static async createUser(payload) {
    try {
      const token = GlobalVar.getToken();
      const endpoint = "/api/users/create";
      const apiResponse = await ApiProvider.postData(endpoint, payload, token);


      return new ApiResponse({
        isCompleted: true,
        isError: false,
        message: "Success",
        data: apiResponse,
        error: null
      });

    } catch (error) {
      console.error("Error search Role:", error.message || error);
      throw new Error(`Error: ${error.message}`);

    }
  }
  static async updateUser(user_id, payload) {
    try {
      const token = GlobalVar.getToken();
      const endpoint = `/api/users/update/${user_id}`;
      const apiResponse = await ApiProvider.putData(endpoint, payload, token);
      //console.log("apiResponse : ", apiResponse);

      return new ApiResponse({
        isCompleted: true,
        isError: false,
        message: "Success",
        data: apiResponse,
        error: null
      });

    } catch (error) {
      console.error("Error search Role:", error.message || error);
      throw new Error(`Error: ${error.message}`);

    }
  }

  static async deleteUser(user_id) {
    try {
      const token = GlobalVar.getToken();
      const endpoint = `/api/users/delete/${user_id}`;

      // ทำการเรียก API ด้วย token และ endpoint
      const response = await ApiProvider.deleteData(endpoint, {}, token);
      //console.log("API Response:", response);

      return response; // ส่งค่ากลับไป
    } catch (error) {
      console.error("Error in factory:", error);
      throw error;
    }
  }






  static async login(username, password,storeType) {
    try {
      const data = { username, password ,store_type: storeType};
      const endpoint = "/api/users/login";

      const apiResponse = await ApiProvider.postData(endpoint, data);



      // ตรวจสอบว่า apiResponse มีค่าที่ต้องการ
      if (apiResponse && apiResponse.data && apiResponse.data.token) {
        return new ApiResponse({
          isCompleted: true,
          isError: false,
          message: "Login successful",
          data: apiResponse.data
        });
      } else {
        return new ApiResponse({
          isCompleted: false,
          isError: true,
          message: "Login failed",
          data: null,
          error: "Invalid response format"
        });
      }
    } catch (error) {
      console.error(error.message || error);
      return new ApiResponse({
        isCompleted: false,
        isError: true,
        message: error.message,
        data: null,
        error: error.message
      });
    }
  }


  static handleTokenExpiration() {

    GlobalVar.removeToken();
    GlobalVar.removeDataByKey(StorageKeys.USER_ID);
    window.location.href = "/login";
  }

  static async changePassword(payload) {
    try {
      const token = GlobalVar.getToken();
      const userID = GlobalVar.getDataByKey(StorageKeys.USER_ID);
      if (!token || !userID) {
        return new ApiResponse({
          isCompleted: false,
          isError: true,
          message: "Token or User ID not found in GlobalVar",
          data: null,
          error: "Token or User ID not found in GlobalVar"
        });
      }

      const endpoint = `/api/users/change-password/${userID}?lng=en`;
      const apiResponse = await ApiProvider.putData(endpoint, payload, token);

      return new ApiResponse({
        isCompleted: apiResponse.isCompleted,
        isError: apiResponse.isError,
        message: apiResponse.message,
        data: apiResponse.data,
        error: apiResponse.error
      });

    } catch (error) {
      console.error(error.message || error);
      return new ApiResponse({
        isCompleted: false,
        isError: true,
        message: error.message,
        data: null,
        error: error.message
      });
    }
  }
}

export default UserApi;
