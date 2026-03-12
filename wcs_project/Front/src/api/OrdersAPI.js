import { GlobalVar } from "../common/GlobalVar";
import ApiProvider from "./ApiProvider";
import ApiResponse from "../common/ApiResponse";

class OrdersAPI {
    static async fetchData(endpoint, method = "GET", data = null) {
        try {
        const token = GlobalVar.getToken();
        if (!token) {
            return new ApiResponse({
            isCompleted: false,
            isError: true,
            message: "Token not found in GlobalVar",
            data: null,
            error: "Token not found in GlobalVar",
            });
        }

        const options = {
            method,
            headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
            },
            body: data ? JSON.stringify(data) : null,
        };

        const apiResponse = await ApiProvider.request(endpoint, options);
        return new ApiResponse({
            isCompleted: apiResponse.isCompleted,
            isError: apiResponse.isError,
            message: apiResponse.message,
            data: apiResponse.data,
            error: apiResponse.error,
        });
        } catch (error) {
        console.error(
            `Error ${method} request to ${endpoint}:`,
            error.response ? error.response.data : error.message || error
        );
        return new ApiResponse({
            isCompleted: false,
            isError: true,
            message: error.message || `Error ${method} request to ${endpoint}`,
            data: null,
            error: error.message || `Error ${method} request to ${endpoint}`,
        });
        }
    }

    static async OrdersUsageAll(params) {
        try {
            const token = GlobalVar.getToken();
            const endpoint = "/api/orders/get-usage-all";

            const response = await ApiProvider.getData(
                endpoint,
                params || {}, // 👈 ส่ง query params (ถ้าไม่ส่ง = ทั้งหมด)
                token
            );

            //console.log("API Response:", response);
            return response;

        } catch (error) {
            console.error("Error search orders:", error.message || error);
            throw new Error(`Error: ${error.message}`);
        }
    }

    static async OrdersReceiptAll(params) {
        try {
            const token = GlobalVar.getToken();
            const endpoint = "/api/orders/get-receipt-all";

            const response = await ApiProvider.getData(
                endpoint,
                params || {}, // 👈 ส่ง query params (ถ้าไม่ส่ง = ทั้งหมด)
                token
            );

            //console.log("API Response:", response);
            return response;

        } catch (error) {
            console.error("Error search orders:", error.message || error);
            throw new Error(`Error: ${error.message}`);
        }
    }

    static async OrdersReturnAll(params) {
        try {
            const token = GlobalVar.getToken();
            const endpoint = "/api/orders/get-return-all";

            const response = await ApiProvider.getData(
                endpoint,
                params || {}, // 👈 ส่ง query params (ถ้าไม่ส่ง = ทั้งหมด)
                token
            );

            //console.log("API Response:", response);
            return response;

        } catch (error) {
            console.error("Error search orders:", error.message || error);
            throw new Error(`Error: ${error.message}`);
        }
    }

    static async OrdersTransferAll(params) {
        try {
            const token = GlobalVar.getToken();
            const endpoint = "/api/orders/get-transfer-all";

            const response = await ApiProvider.getData(
                endpoint,
                params || {}, // 👈 ส่ง query params (ถ้าไม่ส่ง = ทั้งหมด)
                token
            );

            //console.log("API Response:", response);
            return response;

        } catch (error) {
            console.error("Error search orders:", error.message || error);
            throw new Error(`Error: ${error.message}`);
        }
    }

    static async OrdersStatusAll(params) {
        try {
            const token = GlobalVar.getToken();
            const endpoint = "/api/orders/get-status-all";

            const response = await ApiProvider.getData(
                endpoint,
                params || {}, // 👈 ส่ง query params (ถ้าไม่ส่ง = ทั้งหมด)
                token
            );

            //console.log("API Response:", response);
            return response;

        } catch (error) {
            console.error("Error search orders:", error.message || error);
            throw new Error(`Error: ${error.message}`);
        }
    }

    static async updateExecutionModeMany(payload) {
        try {
            const token = GlobalVar.getToken();
            const endpoint = "/api/orders/update-execution-mode";
            
            const response = await ApiProvider.putData(endpoint, payload, token);

            return response;
        } catch (error) {
            console.error("Error in updateExecutionModeMany:", error);
            throw error;
        }
    }

}

export default OrdersAPI;