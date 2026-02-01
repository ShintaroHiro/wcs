import * as XLSX from "xlsx";
import ApiProvider from "./ApiProvider";
import ApiResponse from "../common/ApiResponse";
import { GlobalVar } from "../common/GlobalVar";

const toNumber = (val) => {
    if (val === null || val === undefined || val === "") return 0;
    return Number(
        val
        .toString()
        .replace(/,/g, "") // 🔥 เอา comma ออก
        .trim()
    );
};

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

    static checkHeaders(expectedHeaders, headers) {
  const normalize = (h) =>
    h?.toString().trim().toUpperCase();

  const expected = expectedHeaders.map(normalize);
  const actual = headers.map(normalize).filter(Boolean);

  const missing = expected.filter((h) => !actual.includes(h));
  const unexpected = actual.filter((h) => !expected.includes(h));

  return {
    isValid: missing.length === 0 && unexpected.length === 0,
    missing,
    unexpected,
  };
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
            "FROM BIN",
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
            "INVUSENUM",
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
    
        .map((r, index) => {
            const excel_row_no = index + 1; // ⭐ row จริงใน Excel (รวม header + row ว่าง + merge)

            // ข้าม header แต่ยังคง index
            if (index === 0) return null;

            return {
                excel_row_no, // ⭐ ส่งไป BE

                loc: r[col("FROM LOCATION")]?.toString().trim(),
                box_loc: r[col("FROM BIN")]?.toString().trim(),
                stock_item: r[col("STOCK ITEM")]?.toString().trim(),
                item_desc: r[col("ITEM DESCRIPTION")]?.toString().trim(),
                plan_qty: toNumber(r[col("QUANTITY")]),
                cond: r[col("CONDITION")]?.toString().trim().toUpperCase(),

                mc_code: r[col("MAINTENANCE CONTRACT")]?.toString().trim(),
                requested_at: r[col("REQUIREDDATE")]?.toString().trim(),
                requested_by: r[col("REQUESTEDBY")]?.toString().trim(),

                usage_type: r[col("USETYPE")]?.toString().trim(),
                work_order: r[col("WORK ORDER")]?.toString().trim(),
                spr_no: r[col("SPR NO.")]?.toString().trim(),
                usage_num: r[col("INVUSENUM")]?.toString().trim(),
                usage_line: r[col("USAGE LINE")]?.toString().trim(),
                split: Number(r[col("SPLIT")] ?? 0),
                invuse_status: r[col("INVUSE STATUS")]?.toString().trim(),
                };
            })
            // 🔥 ค่อยกรอง row ว่างออก "หลังจาก" ใส่ excel_row_no แล้ว
            .filter(row =>
            row &&
            (
                row.loc ||
                row.box_loc ||
                row.stock_item ||
                row.plan_qty > 0
            )
        );

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
             /** helper หา index column */
            const col = (name) => headerMap[name.toUpperCase()];

            const payload = rows
        
            .map((r, index) => {
                const excel_row_no = index + 1; // ⭐ row จริงใน Excel (รวม header + row ว่าง + merge)

                // ข้าม header แต่ยังคง index
                if (index === 0) return null;

                return {
                    excel_row_no, // ⭐ ส่งไป BE
                    transtype: r[col("TRANSTYPE")]?.toString().trim().toUpperCase(),
                    po_num: r[col("PONUM")]?.toString().trim(),
                    object_id: r[col("OBJECT_ID")]?.toString().trim(),
                    stock_item: r[col("ITEMNUM")]?.toString().trim(),
                    item_desc: r[col("DESCRIPTION")]?.toString().trim(),
                    loc: r[col("TO_STORE")]?.toString().trim(),
                    box_loc: r[col("TO_BINNUM")]?.toString().trim(),
                    cond: r[col("CONDITIONCODE")]?.toString().trim().toUpperCase(),
                    mc_code: r[col("AACONTRACT")]?.toString().trim(),
                    unit_cost_handled: toNumber(r[col("NEWCOST")]),
                    requested_at: r[col("TRANSDATE")]?.toString().trim(),

                    // ส่งดิบ
                    new_qty: toNumber(r[col("NEW_QTY")]),
                    cap_qty: toNumber(r[col("CAP_QTY")]),
                    recond_qty: toNumber(r[col("RECOND_QTY")]),
                };
                })
                // 🔥 ค่อยกรอง row ว่างออก "หลังจาก" ใส่ excel_row_no แล้ว
                .filter(row =>
                row &&
                (
                    row.loc ||
                    row.box_loc ||
                    row.stock_item
                )
            );

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
    
        .map((r, index) => {
            const excel_row_no = index + 1; // ⭐ row จริงใน Excel (รวม header + row ว่าง + merge)

            // ข้าม header แต่ยังคง index
            if (index === 0) return null;

            return {
                excel_row_no, // ⭐ ส่งไป BE
                transtype: r[col("TRANSACTION TYPE")]?.toString().trim(),
                loc: r[col("TO LOCATION")]?.toString().trim(),
                box_loc: r[col("TO BIN")]?.toString().trim(),
                stock_item: r[col("STOCK ITEM")]?.toString().trim(),
                item_desc: r[col("ITEM DESCRIPTION")]?.toString().trim(),
                plan_qty: toNumber(r[col("QUANTITY")]),
                cond: r[col("CONDITION")]?.toString().trim().toUpperCase(),

                mc_code: r[col("MAINTENANCE CONTRACT")]?.toString().trim(),
                requested_at: r[col("TRANSDATE")]?.toString().trim(),

                work_order: r[col("WORK ORDER")]?.toString().trim(),
                spr_no: r[col("SPR NO.")]?.toString().trim(),
                usage_num: r[col("USAGE")]?.toString().trim(),
                usage_line: r[col("USAGE LINE")]?.toString().trim(),
            };
            })
            // 🔥 ค่อยกรอง row ว่างออก "หลังจาก" ใส่ excel_row_no แล้ว
            .filter(row =>
            row &&
            (
                row.loc ||
                row.box_loc ||
                row.stock_item ||
                row.plan_qty > 0
            )
        );
    
            
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

    static async importItemFile(file) {
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
            "Maintain Contract",
            "Item",
            "Description",
            "Order Unit",
            "Commodity Group",
            "Condition Enabled",
            "Status",
            "Category Code",
            "System"
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
    
        .map((r, index) => {
            const excel_row_no = index + 1; // ⭐ row จริงใน Excel (รวม header + row ว่าง + merge)

            // ข้าม header แต่ยังคง index
            if (index === 0) return null;

            return {
                excel_row_no, // ⭐ ส่งไป BE
                mc_code: r[col("Maintain Contract")]?.toString().trim(),
                stock_item: r[col("Item")]?.toString().trim(),
                item_desc: r[col("Description")]?.toString().trim(),
                order_unit: r[col("Order Unit")]?.toString().trim(),
                com_group: r[col("Commodity Group")]?.toString().trim(),
                cond_en: r[col("Condition Enabled")]?.toString().trim(),
                item_status: r[col("Status")]?.toString().trim(),
                catg_code: r[col("Category Code")]?.toString().trim(),
                system: r[col("System")]?.toString().trim(),
            };
            })
            // 🔥 ค่อยกรอง row ว่างออก "หลังจาก" ใส่ excel_row_no แล้ว
            .filter(row =>
            row &&
            (
                row.stock_item ||
                row.item_desc
            )
        );
            
        if (!payload.length) {
            return new ApiResponse({
            isCompleted: false,
            isError: true,
            message: "Invalid file format",
            data: null,
            });
        }

        return await ApiProvider.postData("/api/import/create-item-json", payload, token);
        } catch (err) {
        console.error("❌ importItemFile error", err);
        return new ApiResponse({
            isCompleted: false,
            isError: true,
            message: err.message,
            data: null,
        });
        }
    }
}
