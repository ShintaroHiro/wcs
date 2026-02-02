import { GlobalVar } from "../common/GlobalVar";
import ApiProvider from "./ApiProvider";
import ApiResponse from "../common/ApiResponse";

class CounterAPI {
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

    static async getCounterAll() {
        try {
            const token = GlobalVar.getToken();
            const endpoint = "/api/counter/get-all-by-user";

            const response = await ApiProvider.getData(
                endpoint,
                {},
                token
            );

            return response;

        } catch (error) {
            console.error("Error search counter:", error.message || error);
            throw new Error(`Error: ${error.message}`);
        }
    }

    static async getAllOrders(params) {
        try {
            const token = GlobalVar.getToken();
            const endpoint = "/api/counter/get-all-order-by-user";

            const response = await ApiProvider.getData(
                endpoint,
                params || {}, // 👈 ส่ง query params (ถ้าไม่ส่ง = ทั้งหมด)
                token
            );

            return response;

        } catch (error) {
            console.error("Error search counter:", error.message || error);
            throw new Error(`Error: ${error.message}`);
        }
    }

    static async getByID(counterId) {
        try {
        const token = GlobalVar.getToken();
        const endpoint = `/api/counter/get-by-id/${counterId}`;

        // ทำการเรียก API ด้วย token และ endpoint
        const response = await ApiProvider.getData(endpoint, {}, token);
        //console.log("API Response:", response);

        return response; // ส่งค่ากลับไป
        } catch (error) {
        console.error("Error in counter:", error);
        throw error;
        }
    }

//scan one by one
static async scanToServer(counterId) {
  try {
    const token = GlobalVar.getToken();
    const endpoint = `/api/sse/${counterId}/scan`;

    // ใช้ postData แบบเดียวกับ API อื่น ๆ
    const response = await ApiProvider.postData(
      endpoint,
      {},      // body ว่าง (เราแค่บอกว่า scan 1 ครั้ง)
      token
    );

    return response;
  } catch (error) {
    console.error("Error scanToServer:", error.message || error);
    return new ApiResponse({
      isCompleted: false,
      isError: true,
      message: error.message || "Scan failed",
      data: null,
      error: error,
    });
  }
}

static async resetCounter(counterId) {
  const token = GlobalVar.getToken();
  return ApiProvider.postData(
    `/api/sse/${counterId}/reset`,
    {},
    token
  );
}

static async getByCounterIdPublic(counterId) {
  const endpoint = `/api/counter/get-by-id-public/${counterId}`;

  const response = await ApiProvider.getData(
    endpoint,
    {},
    null, // ❌ ไม่ใช้ token
    "en",
    "json",
    {
      "x-wcs-key": process.env.REACT_APP_WCS_SCREEN_KEY,
    }
  );
  return response;
}

//scan required=sacn qty
static async scanBulk(counterId, qty) {
  try {
    const token = GlobalVar.getToken();
    const endpoint = `/api/sse/${counterId}/scan-bulk`;

    const response = await ApiProvider.postData(
      endpoint,
      { qty },      // จำนวนที่ต้องการ scan
      token
    );

    return response;
  } catch (error) {
    console.error("Error scanBulk:", error.message || error);
    return new ApiResponse({
      isCompleted: false,
      isError: true,
      message: error.message || "Scan bulk failed",
      data: null,
      error,
    });
  }
}


}

export default CounterAPI;