export enum Language {
    TH = "th",
    EN = "en"
}

export enum LabTestParamDataType {
    STRING = 'STRING',
    JSON = 'JSON',
    NUMBER = 'NUMBER',
    OBJECT = 'OBJECT',
    ARRAY = 'ARRAY',
    BOOLEAN = 'BOOLEAN',
    DATE = 'DATE',
}

export enum Directories {
    stock_items_image = "dirUploadStockItemsImage",
}

export enum ScanStatus {
    COMPLETED = "COMPLETED",  //ยิงครบ
    PARTIAL = "PARTIAL", //ยิงแต่ไม่ครบ
    PENDING = "PENDING", //ไม่ได้ยิง
}

export enum TypeInfm {
    USAGE = 'USAGE',
    RECEIPT = 'RECEIPT',
    TRANSFER = 'TRANSFER',
    RETURN = 'RETURN'
}

export enum ExecutionMode {
    AUTO = 'AUTO',       // execute normal
    MANUAL = 'MANUAL',   // update inventory only
}

export enum TransferScenario {
    INTERNAL_OUT = 'INTERNAL_OUT',
    INTERNAL_IN = 'INTERNAL_IN',
    OUTBOUND = 'OUTBOUND',
    INBOUND = 'INBOUND'
}

export enum Mode {
    AUTO = 'AUTO',
    MANUAL = 'MANUAL',
    MAINT = 'MAINT'
}

export enum Health {
    OK = 'OK',
    WARN = 'WARN',
    FAULT = 'FAULT'
}

export enum Connectivity {
    ONLINE = 'ONLINE',
    OFFLINE = 'OFFLINE',
    DEGRADED = 'DEGRADED'
}

export enum MrsLogAction {
    OPEN_AISLE = 'OPEN_AISLE',
    CLOSE_AISLE = 'CLOSE_AISLE',
    // MOVE = 'MOVE',
    // HOMING = 'HOMING',
    // CUSTOM = 'CUSTOM',
    JOIN_OPEN_SESSION = 'JOIN_OPEN_SESSION',           // ขอเข้าแถวใน session ที่เปิดค้างอยู่
    CONTINUE_IN_OPEN_SESSION = 'CONTINUE_IN_OPEN_SESSION' // ส่งไม้ต่อให้ task ถัดไปใน session เดิม
}

export enum LogResult {
    PENDING = 'PENDING',  //รอดำเนินการ
    IN_PROGRESS = 'IN_PROGRESS',    //กำลังดำเนินการ
    SUCCESS = 'SUCCESS',
    FAIL = 'FAIL',
    CANCELLED ='CANCELLED',
    DISCARDED = 'DISCARDED'
}

export enum RobotType {
    MRS = 'MRS',
    WRS = 'WRS'
}

export enum TargetScope {
    GLOBAL = 'GLOBAL',
    BY_DEVICE = 'BY_DEVICE',
    BY_AISLE = 'BY_AISLE'
}

export enum ControlSource {
    MANUAL = 'MANUAL',
    AUTO = 'AUTO'
}

export enum StatusWaiting {
    WAITING = 'WAITING',
    IN_PROGRESS = 'IN_PROGRESS', //อยู่ระหว่างดำเนินการ
    WAITING_CONFIRM = 'WAITING_CONFIRM',
    COMPLETED = 'COMPLETED',
    FAILED = 'FAILED',
    CANCELLED = 'CANCELLED'
}

export enum StatusOrders {
    WAITING = 'WAITING',
    PENDING = 'PENDING', 
    QUEUE = 'QUEUE',
    PROCESSING = 'PROCESSING',
    AISLE_OPEN = 'AISLE_OPEN', 
    COMPLETED = 'COMPLETED', //scan quantity matching CAPITAL/NEW quantity(required quantity)
    FINISHED = 'FINISHED', //scan quantity not matching CAPITAL/NEW quantity(required quantity)
    DELETE = 'DELETE',
    
    ERROR = 'ERROR',

    FAILED = 'FAILED',
    CANCELLED ='CANCELLED',

    WAITING_CONFIRM = 'WAITING_CONFIRM', 
    WAITING_FINISH = 'WAITING_FINISH',
    AISLE_CLOSE = 'AISLE_CLOSE',
    
    AMR_DELIVERING = 'AMR_DELIVERING'
}
/*
| Step | StatusOrders Enum | Function / Trigger                   | Comment          |
| ---- | ---------------- | ------------------------------------ | ---------------- |
| 1    | `WAITING`         | `createAndOpenBatch()` (รอ bank ว่าง)     | สร้าง order        |
1.1 PENDING คือเลือกมาฝั่ง execution แต่ยังไม่เริ่ม processing
| 2    | `QUEUE`      | `executionInbT1m()` → `gw.openAisle()` | Queue    |
| 3    | `PROCESSING`     | `onOpenFinished()`                   | Opening-Aisle       |
| 4    | `AISLE_OPEN` | `onOpenFinished()` (ต่อท้าย)         |  Aisle-Open  |
| 5    | `FINISHED`    | `handleOrderItem()`                | Waiting-Confirm    |
| 6    | `FAILED`           | `()`                  | Failed(Obstacle)        |
| 7    | `CANCELLED`         | `()`     | stop |

*/

export enum StatusMRS {
    IDLE = 'IDLE',
    MOVING = 'MOVING',
    OPENED = 'OPENED',
    ERROR = 'ERROR'
}

export enum AisleStatus {
    OPEN = 'OPEN',
    CLOSED = 'CLOSED',
    BLOCKED = 'BLOCKED'
}

export enum TaskMrsAction {
    OPEN = 'OPEN',
    CLOSED = 'CLOSED',
}

export enum WrsAction {
    MOVE_TO_SOURCE = 'MOVE_TO_SOURCE',
    PICK = 'PICK',
    MOVE_TO_COUNTER = 'MOVE_TO_COUNTER',
    WAIT_USER_CONFIRM = 'WAIT_USER_CONFIRM',
    RETURN_TO_STORAGE = 'RETURN_TO_STORAGE',
    TO_CHARGER = 'TO_CHARGER',
    CHARGING = 'CHARGING',
    CUSTOM ='CUSTOM'
}

// ----- เพิ่มใหม่สำหรับ Task History / Timeline -----

// เหตุการณ์ระดับ "งาน" (semantic lifecycle)
export enum TaskEvent {
    TASK_CREATED = 'TASK_CREATED',
    TASK_ROUTING = 'TASK_ROUTING',
    TASK_AISLE_OPEN = 'TASK_AISLE_OPEN',
    TASK_EXECUTING = 'TASK_EXECUTING',
    TASK_WAITING_CONFIRM = 'TASK_WAITING_CONFIRM',
    TASK_WAITING_FINISH = 'TASK_WAITING_FINISH',
    PENDING = 'PENDING',
    USER_CONFIRM = 'USER_CONFIRM',
    USER_CONFIRM_BLOCKED = 'USER_CONFIRM_BLOCKED',
    TASK_CLOSING_AISLE = 'TASK_CLOSING_AISLE',
    TASK_DONE = 'TASK_DONE',
    TASK_FAILED = 'TASK_FAILED',
    TASK_CANCELLED = 'TASK_CANCELLED',
    CLOSE_ALREADY_SUCCESS = 'CLOSE_ALREADY_SUCCESS',
    CLOSE_SUCCESS = 'CLOSE_SUCCESS',
    SESSION_CLOSED = 'SESSION_CLOSED',
}

// เหตุผล/สาเหตุประกอบเหตุการณ์ (optional)
export enum TaskReason {
    BANK_BUSY = 'BANK_BUSY',            // ธนาคารเดียวกันมีช่องเปิดอยู่/ติดงานอื่น → ต้องเข้าคิว
    SENSOR_BLOCKED = 'SENSOR_BLOCKED',  // เซนเซอร์ยังมีสิ่งกีดขวาง
    PREEMPT = 'PREEMPT',                // ถูกแทรกโดยงาน priority สูงกว่าใน bank เดียวกัน (คนละ aisle)
    DUPLICATE = 'DUPLICATE',            // งานซ้ำซ้อน (ถ้าใช้)
    INVALID_STATE = 'INVALID_STATE',    // สถานะไม่ถูกต้องสำหรับแอ็กชันนั้น ๆ
    UNKNOWN = 'UNKNOWN',
    NO_DEVICE = 'NO_DEVICE',                
    JOIN_OPEN_SESSION = 'JOIN_OPEN_SESSION', 
    CONTINUE_IN_OPEN_SESSION = 'CONTINUE_IN_OPEN_SESSION', // ส่งไม้ต่อใน session เดิม
    NO_NEXT_SAME_AISLE = 'NO_NEXT_SAME_AISLE',     // ไม่มีงานคิวเดียวกันในช่องเดิม
    CLOSE_FINISHED_DUP = 'CLOSE_FINISHED_DUP',     // callback ปิดซ้ำ/idempotent
    CLOSE_FINISHED = 'CLOSE_FINISHED',
}

// ซับซิสเต็มที่ทำให้เกิดเหตุการณ์ (optional)
export enum TaskSubsystem {
    CORE = 'CORE',        // เลเยอร์ orchestrator/บริการหลัก
    MRS = 'MRS',          // ฝั่ง Mobile Rack System
    WRS = 'WRS',          // ฝั่งหุ่นยนต์ WRS (เผื่ออนาคต)
    GATEWAY = 'GATEWAY',  // เกตเวย์อุปกรณ์
}

// แหล่งที่มาของการทริกเกอร์เหตุการณ์ (optional)
export enum TaskSource {
    API = 'API',            // มาจาก REST API / Controller
    DISPATCHER = 'DISPATCHER', // ตัวจัดคิว/จองเครื่อง
    GATEWAY = 'GATEWAY',    // คอลแบ็กจากอุปกรณ์
    SYSTEM = 'SYSTEM',      // งานเบื้องหลัง/ระบบภายใน
    USER = 'USER',          // ผู้ใช้กดปุ่ม
}
