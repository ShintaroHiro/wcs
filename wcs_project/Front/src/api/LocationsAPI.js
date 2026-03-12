import { GlobalVar } from "../common/GlobalVar";
import ApiProvider from "./ApiProvider";
import ApiResponse from "../common/ApiResponse";

class LocationsAPI {
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
        const endpoint = "/api/locations/create";
        const response = await ApiProvider.postData(endpoint, payload, token);
            
        return response; // ส่งค่ากลับไป

        } catch (error) {
        console.error("Error search Location Master Data:", error.message || error);
        throw new Error(`Error: ${error.message}`);

        }
    }

    static async update(loc_id,formData) {
        try {
            const token = GlobalVar.getToken();
            const endpoint = `/api/locations/update/${loc_id}`;
            
            // ทำการเรียก API ด้วย token และ endpoint
            const response = await ApiProvider.putData(endpoint, formData, token);
            
            return response; // ส่งค่ากลับไป
        } catch (error) {
            console.error("Error in Location Master Data:", error);
            throw error;
        }
    }

    static async delete(loc_id) {
        try {
            const token = GlobalVar.getToken();
            const endpoint = `/api/locations/delete/${loc_id}`;
            
            // ทำการเรียก API ด้วย token และ endpoint
            const response = await ApiProvider.deleteData(endpoint, {}, token);

            
            return response; // ส่งค่ากลับไป
        } catch (error) {
            console.error("Error in Location Master Data:", error);
            throw error;
        }
    }

    static async deleteAll() {
        try {
            const token = GlobalVar.getToken();
            const endpoint = "/api/locations/delete-all";

            // เรียก API ลบทั้งหมด
            const response = await ApiProvider.deleteData(endpoint, {}, token);

            return response;
        } catch (error) {
            console.error("Error in Location Master Delete All:", error);
            throw error;
        }
    }

    static async getAll() {
        try {
        const token = GlobalVar.getToken();
        const endpoint = "/api/locations/get-all";
        const response = await ApiProvider.getData(endpoint, {}, token);
            
            return response; // ส่งค่ากลับไป

        } catch (error) {
        console.error("Error search Location Master Data:", error.message || error);
        throw new Error(`Error: ${error.message}`);

        }
    }

    static async getByID(loc_id) {
        try {
            const token = GlobalVar.getToken();
            const endpoint = `/api/locations/get-by-id/${loc_id}`;
            
            // ทำการเรียก API ด้วย token และ endpoint
            const response = await ApiProvider.getData(endpoint, {}, token);

            
            return response; // ส่งค่ากลับไป
        } catch (error) {
            console.error("Error in Location Master Data:", error);
            throw error;
        }
    }

    static async searchLocations({ loc = "", box_loc = "" }) {
        try {
            const token = GlobalVar.getToken();
            const language = GlobalVar.getLanguage() || "en";

            // 🔥 แปลง "" → undefined
            const filters = {
                loc: loc?.trim() || undefined,
                box_loc: box_loc?.trim() || undefined,
                lng: language,
            };
            
            const apiResponse = await ApiProvider.getData(
            "/api/locations/search-location",
            filters,  // <-- ApiProvider จะประกอบ query string ให้เอง
            token,
            language
            );

            //console.log("apiResponse:", apiResponse);
            return apiResponse;

        } catch (error) {
            console.error("Error search:", error.message || error);
            throw new Error(`Error: ${error.message}`);
        }
    }


}

export default LocationsAPI;