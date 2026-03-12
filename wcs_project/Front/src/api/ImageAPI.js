import { GlobalVar } from "../common/GlobalVar";
import ApiProvider from "./ApiProvider";
import { DEFAULT_LANGUAGE } from "common/constants";

class ImageAPI {
    static async getImage(dirPath, subfolder, imageName) {
        try {
        const token = GlobalVar.getToken(); // รับ token สำหรับการยืนยันตัวตน
        
        // สร้าง URL endpoint พร้อม query string
        const endpoint = `/api/images/getImageUpload/${dirPath}/${subfolder}/${imageName}`;
        console.log("API endpoint with queryParams:", endpoint);
    
        // เรียก API และตั้ง responseType เป็น 'blob'
        const blob = await ApiProvider.getData(endpoint, {}, token, DEFAULT_LANGUAGE, "blob");
        
        // สร้าง URL จาก blob ที่ได้รับมา
        const imageUrl = URL.createObjectURL(blob);
        return imageUrl;
    
        } catch (error) {
            console.error("Error fetching data:", error.message || error);
            throw new Error(`Error: ${error.message}`);
        }
    }

    
}





export default ImageAPI;
