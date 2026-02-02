import { GlobalVar } from "../common/GlobalVar";
import ApiProvider from "./ApiProvider";
import ApiResponse from "../common/ApiResponse";

class ExecutionAPI {

  static async fetchData(endpoint, method = "GET", data = null) {
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

      const options = {
        method,
        headers: {
          "Authorization": `Bearer ${token}`,
          "Content-Type": "application/json"
        },
        body: data ? JSON.stringify(data) : null
      };

      const apiResponse = await ApiProvider.request(endpoint, options);
      return new ApiResponse({
        isCompleted: apiResponse.isCompleted,
        isError: apiResponse.isError,
        message: apiResponse.message,
        data: apiResponse.data,
        error: apiResponse.error
      });

    } catch (error) {
      console.error(`Error ${method} request to ${endpoint}:`, error.response ? error.response.data : error.message || error);
      return new ApiResponse({
        isCompleted: false,
        isError: true,
        message: error.message || `Error ${method} request to ${endpoint}`,
        data: null,
        error: error.message || `Error ${method} request to ${endpoint}`
      });
    }
  }
  
  //สั่งให้ task ทำงาน
  static async createTask(payload) {
    try {
      const token = GlobalVar.getToken();
      const endpoint = "/api/execution/create";
      const response = await ApiProvider.postData(endpoint, payload, token);
      //console.log("API Response:", response);
            
            return response; // ส่งค่ากลับไป

    } catch (error) {
      console.error("Error search Task:", error.message || error);
      throw new Error(`Error: ${error.message}`);

    }
  }

  static async handleOrderItem(order_id, actual_qty) {
      try {
          const token = GlobalVar.getToken();
          const endpoint = `/api/execution/handle-order-item/${order_id}/${actual_qty}`;
          
          // ทำการเรียก API ด้วย token และ endpoint
          const response = await ApiProvider.postData(endpoint, {}, token);
          //console.log("confirm order API Response:", response);
          
          return response; // ส่งค่ากลับไป
      } catch (error) {
          console.error("Error in Task:", error);
          throw error;
      }
  }

  static async handleOrderItemT1(order_id, actual_qty, inv_id) {
      try {
          const token = GlobalVar.getToken();
          const endpoint = `/api/execution/handle-order-item-t1/${order_id}/${actual_qty}`;

          const body = {};
          if (inv_id !== undefined && inv_id !== null) {
              body.inv_id = inv_id;
          }

          const response = await ApiProvider.postData(endpoint, body, token);
          //console.log("handleOrderItemT1", response);
          return response;
      } catch (error) {
          console.error("Error in Task:", error);
          throw error;
      }
  }

  static async changeToWaiting(payload) {
    try {
      const token = GlobalVar.getToken();
      const endpoint = "/api/execution/change-to-waiting";

      const response = await ApiProvider.postData(endpoint, payload, token);
      //console.log("API Response:", response);

      return response;
    } catch (error) {
      console.error("Error in Waiting:", error);
      throw error;
    }
  }

  static async changeToPending(payload) {
    try {
      const token = GlobalVar.getToken();
      const endpoint = "/api/execution/change-to-pending";

      const response = await ApiProvider.postData(endpoint, payload, token);
      //console.log("API Response:", response);

      return response;
    } catch (error) {
      console.error("Error in pending:", error);
      throw error;
    }
  }


  static async TaskAll() {
      try {
      const token = GlobalVar.getToken();
      const endpoint = "/api/execution/get-all";
      const response = await ApiProvider.getData(endpoint, {}, token);

      //console.log("API Response:", response);
            
            return response; // ส่งค่ากลับไป

      } catch (error) {
      console.error("Error search Task:", error.message || error);
      throw new Error(`Error: ${error.message}`);

      }
  }

}

export default ExecutionAPI;
