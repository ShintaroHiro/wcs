import { GlobalVar } from "../common/GlobalVar";
import ApiProvider from "./ApiProvider";
import ApiResponse from "../common/ApiResponse";

class ExecutionTMAPI {

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
  
  static async createTaskT1M(payload) {
    try {
      const token = GlobalVar.getToken();
      const endpoint = "/api/execution-t1m/change-to-processing";

      const response = await ApiProvider.postData(endpoint, payload, token);
      //console.log("API Response:", response);

      return response;
    } catch (error) {
      console.error("Error create Task:", error);
      throw error;
    }
  }

  static async handleOrderItemT1M(order_id, actual_qty) {
      try {
          const token = GlobalVar.getToken();
          const endpoint = `/api/execution-t1m/handle-order-item-t1m/${order_id}/${actual_qty}`;

          const response = await ApiProvider.postData(endpoint, {}, token);
          //console.log("handleOrderItemT1", response);
          return response;
      } catch (error) {
          console.error("Error in Task:", error);
          throw error;
      }
  }

  static async handleErrorOrderItemT1M(event_id, items) {
    try {
      const token = GlobalVar.getToken();
      const endpoint = "/api/execution-t1m/handle-error-order-item-t1m";

      const payload = {
        event_id,
        items
      };

      const response = await ApiProvider.postData(endpoint, payload, token);
      return response;
    } catch (error) {
      console.error("Error in handleErrorOrderItemT1M:", error);
      throw error;
    }
  }

  static async handleManualOrder(items) {
    try {
        if (!Array.isArray(items) || items.length === 0) {
            throw new Error("No orders provided");
        }

        const token = GlobalVar.getToken();
        const endpoint = "/api/execution-t1m/handle-manual-order-item-t1m";

        // ส่ง body เป็น array ของ {order_id, actual_qty}
        const response = await ApiProvider.postData(endpoint, items, token);
        return response;
    } catch (error) {
        console.error("Error in Task:", error);
        throw error;
    }
  }
}

export default ExecutionTMAPI;
