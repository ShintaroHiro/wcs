import { GlobalVar } from "../common/GlobalVar";
import ApiProvider from "./ApiProvider";
import ApiResponse from "../common/ApiResponse";

class EventsAPI {
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

    static async setOrderError(order_id) {
        try {
            const token = GlobalVar.getToken();
            const endpoint = `/api/events/set-order-error/${order_id}`;

            const response = await ApiProvider.postData(endpoint, {}, token);
            return response;
        } catch (error) {
            console.error("Error in Order Error:", error);
            throw error;
        }
    }

    static async getAll() {
        try {
        const token = GlobalVar.getToken();
        const endpoint = "/api/events/get-all";
        const response = await ApiProvider.getData(endpoint, {}, token);
            //console.log("API Response:", response);
        return response; // ส่งค่ากลับไป

        } catch (error) {
        console.error("Error search Events Data:", error.message || error);
        throw new Error(`Error: ${error.message}`);

        }
    }

    static async getByID(related_id) {
        try {
            const token = GlobalVar.getToken();
            const endpoint = `/api/events/by-related/${related_id}`;
            
            // ทำการเรียก API ด้วย token และ endpoint
            const response = await ApiProvider.getData(endpoint, {}, token);
            //console.log("API Response:", response);
            
            return response; // ส่งค่ากลับไป
        } catch (error) {
            console.error("Error in Events Data:", error);
            throw error;
        }
    }

}

export default EventsAPI;