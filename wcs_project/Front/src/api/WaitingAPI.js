    import { GlobalVar } from "../common/GlobalVar";
    import ApiProvider from "./ApiProvider";
    import ApiResponse from "../common/ApiResponse";

    class WaitingAPI {
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

    static async createWaiting(payload) {
        try {
        const token = GlobalVar.getToken();
        const endpoint = "/api/waiting/create";
        const response = await ApiProvider.postData(endpoint, payload, token);
        //console.log("create API Response:", response);

        return response; // ส่งค่ากลับไป
        } catch (error) {
        console.error("Error search Waiting:", error.message || error);
        throw new Error(`Error: ${error.message}`);
        }
    }

    static async updateWaiting(order_id, formData) {
        try {
        const token = GlobalVar.getToken();
        const endpoint = `/api/waiting/update/${order_id}`;

        // ทำการเรียก API ด้วย token และ endpoint
        const response = await ApiProvider.putData(endpoint, formData, token);
        //console.log("update API Response:", response);

        return response; // ส่งค่ากลับไป
        } catch (error) {
        console.error("Error in Waiting:", error);
        throw error;
        }
    }

    static async deleteWaiting(payload) {
        try {
        const token = GlobalVar.getToken();
        const endpoint = "/api/waiting/delete";

        // ทำการเรียก API ด้วย token และ endpoint
        const response = await ApiProvider.deleteData(endpoint, payload, token, undefined, { useBody: true } );

        return response; // ส่งค่ากลับไป
        } catch (error) {
        console.error("Error in Waiting:", error);
        throw error;
        }
    }

    static async submitReturn(payload) {
        try {
            const token = GlobalVar.getToken();
            const endpoint = "/api/waiting/return-import";
            
            // ทำการเรียก API ด้วย token และ endpoint
            const response = await ApiProvider.postData(endpoint, payload, token);
            //console.log("confirm order API Response:", response);
            
            return response; // ส่งค่ากลับไป
        } catch (error) {
            console.error("Error in Task:", error);
            throw error;
        }
    }

    static async submitTransfer(payload) {
        try {
            const token = GlobalVar.getToken();
            const endpoint = "/api/waiting/transfer-import";
            
            // ทำการเรียก API ด้วย token และ endpoint
            const response = await ApiProvider.postData(endpoint, payload, token);
            //console.log("confirm order API Response:", response);
            
            return response; // ส่งค่ากลับไป
        } catch (error) {
            console.error("Error in Task:", error);
            throw error;
        }
    }

    static async WaitingAll() {
        try {
        const token = GlobalVar.getToken();
        const endpoint = "/api/waiting/get-all";
        const response = await ApiProvider.getData(endpoint, {}, token);

        //console.log("API Response:", response);

        return response; // ส่งค่ากลับไป
        } catch (error) {
        console.error("Error search Waiting:", error.message || error);
        throw new Error(`Error: ${error.message}`);
        }
    }

    static async WaitingUsageAll() {
        try {
        const token = GlobalVar.getToken();
        const endpoint = "/api/waiting/get-usage-all";
        const response = await ApiProvider.getData(endpoint, {}, token);
        //console.log("API Response:", response);

        return response; // ส่งค่ากลับไป
        } catch (error) {
        console.error("Error search Waiting:", error.message || error);
        throw new Error(`Error: ${error.message}`);
        }
    }

    static async getUsageByID(order_id) {
        try {
        const token = GlobalVar.getToken();
        const endpoint = `/api/waiting/get-usage-by-id/${order_id}`;

        // ทำการเรียก API ด้วย token และ endpoint
        const response = await ApiProvider.getData(endpoint, {}, token);
        //console.log("API Response:", response);

        return response; // ส่งค่ากลับไป
        } catch (error) {
        console.error("Error in Waiting:", error);
        throw error;
        }
    }

    static async WaitingReceiptAll() {
        try {
        const token = GlobalVar.getToken();
        const endpoint = "/api/waiting/get-receipt-all";
        const response = await ApiProvider.getData(endpoint, {}, token);
        //console.log("API Response:", response);

        return response; // ส่งค่ากลับไป
        } catch (error) {
        console.error("Error search Waiting:", error.message || error);
        throw new Error(`Error: ${error.message}`);
        }
    }

    static async getReceiptByID(order_id) {
        try {
        const token = GlobalVar.getToken();
        const endpoint = `/api/waiting/get-receipt-by-id/${order_id}`;

        // ทำการเรียก API ด้วย token และ endpoint
        const response = await ApiProvider.getData(endpoint, {}, token);
        //console.log("API Response:", response);

        return response; // ส่งค่ากลับไป
        } catch (error) {
        console.error("Error in Waiting:", error);
        throw error;
        }
    }
    }

    export default WaitingAPI;
