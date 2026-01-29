import * as XLSX from "xlsx";
import ApiProvider from "./ApiProvider";
import ApiResponse from "../common/ApiResponse";
import { GlobalVar } from "../common/GlobalVar";

export default class ImportFileAPI {
    // ✅ ตรวจสอบ headers
    static validateHeaders(expectedHeaders, actualHeaders) {
        const normalizedExpectedHeaders = expectedHeaders.map((header) => header.trim().toLowerCase());
        const normalizedActualHeaders = actualHeaders.map((header) => header.trim().toLowerCase());

        const matchingHeaders = normalizedExpectedHeaders.filter((header) =>
        normalizedActualHeaders.includes(header)
        );

        // ✅ ตรวจว่า header ตรงครบทั้งหมด
        return matchingHeaders.length === normalizedExpectedHeaders.length;
    }

    static async importUsageFile(file) {
        try {
        if (!file || !(file instanceof Blob)) {
            return new ApiResponse({
            isCompleted: false,
            isError: true,
            message: "Please select an Excel file.",
            data: null,
            });
        }

        const token = GlobalVar.getToken();
        if (!token) {
            return new ApiResponse({
            isCompleted: false,
            isError: true,
            message: "Token not found",
            data: null,
            });
        }

        const reader = new FileReader();

        const rows = await new Promise((resolve, reject) => {
            reader.onload = (e) => {
            const data = new Uint8Array(e.target.result);
            const workbook = XLSX.read(data, { type: "array" });
            const sheet = workbook.Sheets[workbook.SheetNames[0]];
            const json = XLSX.utils.sheet_to_json(sheet, {
                header: 1,
                raw: false,     // ⭐ บอก xlsx ให้แปลงค่า
                cellDates: true // ⭐ แปลง cell date เป็น Date
            });

            resolve(json);
            };
            reader.onerror = reject;
            reader.readAsArrayBuffer(file);
        });

        if (rows.length < 2) {
            return new ApiResponse({
            isCompleted: false,
            isError: true,
            message: "No Data",
            data: null,
            });
        }
        const expectedHeaders = [
            "FROM LOCATION",
            "FROMBIN",
            "STOCK ITEM",
            "ITEM DESCRIPTION",
            "QUANTITY",
            "CONDITION",
            "MAINTENANCE CONTRACT",
            "REQUIREDDATE",
            "REQUESTEDBY",
            "USETYPE",
            "WORK ORDER",
            "SPR NO.",
            "USAGE",
            "USAGE LINE",
            "SPLIT",
            "INVUSE STATUS",
        ];
        const headers = rows[0];

        if (!this.validateHeaders(expectedHeaders, headers)) {
            return new ApiResponse({
            isCompleted: false,
            isError: true,
            message: "Header is incorrect",
            data: null,
            });
        }

        const headerMap = {};
        headers.forEach((h, i) => {
            if (h) headerMap[h.trim().toUpperCase()] = i;
        });

        /** helper หา index column */
        const col = (name) => headerMap[name.toUpperCase()];

        const payload = rows
            .slice(1)
            .filter((r) => r.some((c) => c !== null && c !== undefined && c !== ""))
            .map((r) => ({
            loc: r[col("FROM LOCATION")]?.toString().trim(),
            box_loc: r[col("FROMBIN")]?.toString().trim(),
            stock_item: r[col("STOCK ITEM")]?.toString().trim(),
            item_desc: r[col("ITEM DESCRIPTION")]?.toString().trim(),
            plan_qty: Number(r[col("QUANTITY")] ?? 0),
            cond: r[col("CONDITION")]?.toString().trim().toUpperCase(),

            mc_code: r[col("MAINTENANCE CONTRACT")]?.toString().trim(),
            requested_at: r[col("REQUIREDDATE")]?.toString().trim(),
            requested_by: r[col("REQUESTEDBY")]?.toString().trim(),

            usage_type: r[col("USETYPE")]?.toString().trim(),
            work_order: r[col("WORK ORDER")]?.toString().trim(),
            spr_no: r[col("SPR NO.")]?.toString().trim(),
            usage_num: r[col("USAGE")]?.toString().trim(),
            usage_line: r[col("USAGE LINE")]?.toString().trim(),
            split: Number(r[col("SPLIT")] ?? 0),
            invuse_status: r[col("INVUSE STATUS")]?.toString().trim(),
            }));
    
        if (!payload.length) {
            return new ApiResponse({
            isCompleted: false,
            isError: true,
            message: "Invalid file format",
            data: null,
            });
        }

        return await ApiProvider.postData("/api/import/create-usage-json", payload, token);
        } catch (err) {
        console.error("❌ importUsageFile error", err);
        return new ApiResponse({
            isCompleted: false,
            isError: true,
            message: err.message,
            data: null,
        });
        }
    }

    static async importReceiptFile(file) {
        try {
            if (!file || !(file instanceof Blob)) {
            return new ApiResponse({
                isCompleted: false,
                isError: true,
                message: "Please select an Excel file.",
                data: null,
            });
            }

            const token = GlobalVar.getToken();
            if (!token) {
            return new ApiResponse({
                isCompleted: false,
                isError: true,
                message: "Token not found",
                data: null,
            });
            }

            const reader = new FileReader();

            const rows = await new Promise((resolve, reject) => {
            reader.onload = (e) => {
                const data = new Uint8Array(e.target.result);
                const workbook = XLSX.read(data, { type: "array" });
                const sheet = workbook.Sheets[workbook.SheetNames[0]];
                const json = XLSX.utils.sheet_to_json(sheet, {
                header: 1,
                raw: false,
                cellDates: true,
                });
                resolve(json);
            };
            reader.onerror = reject;
            reader.readAsArrayBuffer(file);
            });

            if (rows.length < 2) {
            return new ApiResponse({
                isCompleted: false,
                isError: true,
                message: "No Data",
                data: null,
            });
            }

            const expectedHeaders = [
            "TRANSTYPE",
            //"PONUM",
            "OBJECT_ID",
            "AACONTRACT",
            "ITEMNUM",
            "DESCRIPTION",
            "CONDITIONCODE",
            "TO_STORE",
            "TO_BINNUM",
            "NEWCOST",
            "TRANSDATE",
            "NEW_QTY",
            "CAP_QTY",
            "RECOND_QTY",
            ];

            const headers = rows[0];
            if (!this.validateHeaders(expectedHeaders, headers)) {
            return new ApiResponse({
                isCompleted: false,
                isError: true,
                message: "Header is incorrect",
                data: null,
            });
            }

            const headerMap = {};
                headers.forEach((h, i) => {
                if (h) headerMap[h.trim().toUpperCase()] = i;
            });
            const col = (name) => headerMap[name.toUpperCase()];

            const payload = rows
            .slice(1)
            .filter((r) => r.some((c) => c !== null && c !== undefined && c !== ""))
            .map((r) => ({
                transtype: r[col("TRANSTYPE")]?.toString().trim().toUpperCase(),
                po_num: r[col("PONUM")]?.toString().trim(),
                object_id: r[col("OBJECT_ID")]?.toString().trim(),
                stock_item: r[col("ITEMNUM")]?.toString().trim(),
                item_desc: r[col("DESCRIPTION")]?.toString().trim(),
                loc: r[col("TO_STORE")]?.toString().trim(),
                box_loc: r[col("TO_BINNUM")]?.toString().trim(),
                cond: r[col("CONDITIONCODE")]?.toString().trim().toUpperCase(),
                mc_code: r[col("AACONTRACT")]?.toString().trim(),
                unit_cost_handled: r[col("NEWCOST")]?.toString().trim(),
                requested_at: r[col("TRANSDATE")]?.toString().trim(),

                // ส่งดิบ
                new_qty: Number(r[col("NEW_QTY")] ?? 0),
                cap_qty: Number(r[col("CAP_QTY")] ?? 0),
                recond_qty: Number(r[col("RECOND_QTY")] ?? 0),
            }));

            if (!payload.length) {
            return new ApiResponse({
                isCompleted: false,
                isError: true,
                message: "Invalid file format",
                data: null,
            });
            }

            return await ApiProvider.postData(
            "/api/import/create-receipt-json",
            payload,
            token
            );
        } catch (err) {
            console.error("❌ importReceiptFile error", err);
            return new ApiResponse({
            isCompleted: false,
            isError: true,
            message: err.message,
            data: null,
            });
        }
    }

    static async importReturnFile(file) {
        try {
        if (!file || !(file instanceof Blob)) {
            return new ApiResponse({
            isCompleted: false,
            isError: true,
            message: "Please select an Excel file.",
            data: null,
            });
        }

        const token = GlobalVar.getToken();
        if (!token) {
            return new ApiResponse({
            isCompleted: false,
            isError: true,
            message: "Token not found",
            data: null,
            });
        }

        const reader = new FileReader();

        const rows = await new Promise((resolve, reject) => {
            reader.onload = (e) => {
            const data = new Uint8Array(e.target.result);
            const workbook = XLSX.read(data, { type: "array" });
            const sheet = workbook.Sheets[workbook.SheetNames[0]];
            const json = XLSX.utils.sheet_to_json(sheet, {
                header: 1,
                raw: false,     // ⭐ บอก xlsx ให้แปลงค่า
                cellDates: true // ⭐ แปลง cell date เป็น Date
            });

            resolve(json);
            };
            reader.onerror = reject;
            reader.readAsArrayBuffer(file);
        });

        if (rows.length < 2) {
            return new ApiResponse({
            isCompleted: false,
            isError: true,
            message: "No Data",
            data: null,
            });
        }
        const expectedHeaders = [
            "TRANSACTION TYPE",
            "WORK ORDER",
            "SPR NO.",
            "USAGE",
            "USAGE LINE",
            "TO LOCATION",
            "TO BIN",
            "STOCK ITEM",
            "ITEM DESCRIPTION",
            "QUANTITY",
            "CONDITION",
            "MAINTENANCE CONTRACT",
            "TRANSDATE",
        ];
        const headers = rows[0];

        if (!this.validateHeaders(expectedHeaders, headers)) {
            return new ApiResponse({
            isCompleted: false,
            isError: true,
            message: "Header is incorrect",
            data: null,
            });
        }

        const headerMap = {};
        headers.forEach((h, i) => {
            if (h) headerMap[h.trim().toUpperCase()] = i;
        });

        /** helper หา index column */
        const col = (name) => headerMap[name.toUpperCase()];

        const payload = rows
            .slice(1)
            .filter((r) => r.some((c) => c !== null && c !== undefined && c !== ""))
            .map((r) => ({
            transtype: r[col("TRANSACTION TYPE")]?.toString().trim(),
            loc: r[col("TO LOCATION")]?.toString().trim(),
            box_loc: r[col("TO BIN")]?.toString().trim(),
            stock_item: r[col("STOCK ITEM")]?.toString().trim(),
            item_desc: r[col("ITEM DESCRIPTION")]?.toString().trim(),
            plan_qty: Number(r[col("QUANTITY")] ?? 0),
            cond: r[col("CONDITION")]?.toString().trim().toUpperCase(),

            mc_code: r[col("MAINTENANCE CONTRACT")]?.toString().trim(),
            requested_at: r[col("TRANSDATE")]?.toString().trim(),

            work_order: r[col("WORK ORDER")]?.toString().trim(),
            spr_no: r[col("SPR NO.")]?.toString().trim(),
            usage_num: r[col("USAGE")]?.toString().trim(),
            usage_line: r[col("USAGE LINE")]?.toString().trim(),
            }));
    
             console.log("📌 ข้อมูล JSON ที่ส่งไป API:", payload);
        if (!payload.length) {
            return new ApiResponse({
            isCompleted: false,
            isError: true,
            message: "Invalid file format",
            data: null,
            });
        }

        return await ApiProvider.postData("/api/import/create-return-json", payload, token);
        } catch (err) {
        console.error("❌ importReturnFile error", err);
        return new ApiResponse({
            isCompleted: false,
            isError: true,
            message: err.message,
            data: null,
        });
        }
    }
}
