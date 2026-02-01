import { GlobalVar } from "../common/GlobalVar";
import ApiProvider from "./ApiProvider";
import ApiResponse from "../common/ApiResponse";

class StockItemsAPI {
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

    static async create(payload) {
        try {
        const token = GlobalVar.getToken();
        const endpoint = "/api/stock-items/create";
        const response = await ApiProvider.postData(endpoint, payload, token);
        //console.log("API Response:", response);
            
            return response; // ส่งค่ากลับไป

        } catch (error) {
        console.error("Error search Stock Items Data:", error.message || error);
        throw new Error(`Error: ${error.message}`);

        }
    }

    static async update(item_id,formData) {
        try {
            const token = GlobalVar.getToken();
            const endpoint = `/api/stock-items/update/${item_id}`;
            
            // ทำการเรียก API ด้วย token และ endpoint
            const response = await ApiProvider.putData(endpoint, formData, token);
            //console.log("update API Response:", response);
            
            return response; // ส่งค่ากลับไป
        } catch (error) {
            console.error("Error in Stock Items Data:", error);
            throw error;
        }
    }

    static async delete(item_id) {
        try {
            const token = GlobalVar.getToken();
            const endpoint = `/api/stock-items/delete/${item_id}`;
            
            // ทำการเรียก API ด้วย token และ endpoint
            const response = await ApiProvider.deleteData(endpoint, {}, token);
            //console.log("API Response:", response);
            
            return response; // ส่งค่ากลับไป
        } catch (error) {
            console.error("Error in Stock Items Data:", error);
            throw error;
        }
    }

    static async deleteAll() {
        try {
            const token = GlobalVar.getToken();
            const endpoint = "/api/stock-items/delete-all";

            // เรียก API ลบทั้งหมด
            const response = await ApiProvider.deleteData(endpoint, {}, token);
            // console.log("API Response:", response);

            return response;
        } catch (error) {
            console.error("Error in Stock Items Delete All:", error);
            throw error;
        }
    }

    static async getAll() {
        try {
        const token = GlobalVar.getToken();
        const endpoint = "/api/stock-items/get-all";
        const response = await ApiProvider.getData(endpoint, {}, token);
        //console.log("API Response:", response);
            
            return response; // ส่งค่ากลับไป

        } catch (error) {
        console.error("Error search Stock Items Data:", error.message || error);
        throw new Error(`Error: ${error.message}`);

        }
    }

    static async getByID(item_id) {
        try {
            const token = GlobalVar.getToken();
            const endpoint = `/api/stock-items/get-by-id/${item_id}`;
            
            // ทำการเรียก API ด้วย token และ endpoint
            const response = await ApiProvider.getData(endpoint, {}, token);
            //console.log("API Response:", response);
            
            return response; // ส่งค่ากลับไป
        } catch (error) {
            console.error("Error in Stock Items Data:", error);
            throw error;
        }
    }

}

export default StockItemsAPI;