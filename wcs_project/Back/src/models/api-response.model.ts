// 2024-08-23 : ปรับ ให้ไม่ใช้ตัวแปร _ นำหน้า
import logger from '../common/logger'; // Import Logger จากไฟล์ logger.ts

export class ApiResponse<T> {
  public isCompleted: boolean = false;
  public message: string = '';
  public data?: T;
  public isError: boolean = false;
  public error?: string;

  constructor(init?: Partial<ApiResponse<T>>) {
    Object.assign(this, init);
  }

  // Getter และ Setter สำหรับ isCompleted
  get IsCompleted(): boolean {
    return this.isCompleted;
  }

  set IsCompleted(value: boolean) {
    this.isCompleted = value;
  }

  // Getter และ Setter สำหรับ message
  get Message(): string {
    return this.message;
  }

  set Message(value: string) {
    this.message = value;
  }

  // Getter และ Setter สำหรับ data
  get Data(): T | undefined {
    return this.data;
  }

  set Data(value: T | undefined) {
    this.data = value;
  }

  // Getter และ Setter สำหรับ isError
  get IsError(): boolean {
    return this.isError;
  }

  set IsError(value: boolean) {
    this.isError = value;
  }

  // Getter และ Setter สำหรับ error
  get Error(): string | undefined {
    return this.error;
  }

  set Error(value: string | undefined) {
    this.error = value;
  }

  // Method สำหรับบันทึก Log
  public savelog(operation: string = '', username: string = '') {
    const logMessage = JSON.stringify(this);
    const logOperation: string = (operation && operation.trim()) ? operation : 'N/A';
    const logUsername: string = (username && username.trim()) ? username : 'system';

    console.log('logMessage : ', logMessage);
    if (this.isError) {
      logger.error({
        message: 'API Response Error: ' + logMessage,
        operation: logOperation,
        username: logUsername,
      });
    } else {
      logger.info({
        message: 'API Response: ' + logMessage,
        operation: logOperation,
        username: logUsername,
      });
    }
  }

  // Method สำหรับตั้งค่าข้อผิดพลาด
  public setError(message: string, operation: string, error: any, username: string = 'system', log: boolean = false): ApiResponse<T> {
    this.isCompleted = false;
    this.message = message;
    this.isError = true;
    this.error = error.message || error;
    if (log) {
      this.savelog(operation, username);
    }
    return this;
  }

  // Method สำหรับตั้งค่าเมื่อข้อมูลไม่ครบถ้วน
  public setIncomplete(message: string, log: boolean = false, operation: string = '', username: string = 'system'): ApiResponse<T> {
    this.isCompleted = false;
    this.message = message;
    if (log) {
      this.savelog(operation, username);
    }
    return this;
  }

  // Method สำหรับตั้งค่าเมื่อข้อมูลไม่ครบถ้วน V02
  public setIncompleteWithData(message: string, data?: any, log: boolean = false, operation: string = '', username: string = 'system'): ApiResponse<T> {
    this.isCompleted = false;
    this.message = message;
    this.data = data;
    if (log) {
      this.savelog(operation, username);
    }
    return this;
  }

  // Method สำหรับตั้งค่าเมื่อการดำเนินการสำเร็จ
  public setComplete(message: string, data: Partial<T>, operation: string = '', username: string = 'system', log: boolean = false): ApiResponse<T> {
    this.isCompleted = true;
    this.message = message;
    this.data = data as T;
    if (log) {
      this.savelog(operation, username);
    }
    return this;
  }
}



// 2024-08-23 : ก่อนปรับ ให้ไม่ใช้ตัวแปร _ นำหน้า
/* // ApiResponse.ts
import logger from '../common/logger'; // Import Logger จากไฟล์ logger.ts

export class ApiResponse<T> {
  private _isCompleted: boolean = false;
  private _message: string = '';
  private _data?: T;
  private _isError: boolean = false;
  private _error?: string;

  constructor(init?: Partial<ApiResponse<T>>) {
    Object.assign(this, init);
  }

  // Getter และ Setter สำหรับ isCompleted
  get isCompleted(): boolean {
    return this._isCompleted;
  }

  set isCompleted(value: boolean) {
    this._isCompleted = value;
  }

  // Getter และ Setter สำหรับ message
  get message(): string {
    return this._message;
  }

  set message(value: string) {
    this._message = value;
  }

  // Getter และ Setter สำหรับ data
  get data(): T | undefined {
    return this._data;
  }

  set data(value: T | undefined) {
    this._data = value;
  }

  // Getter และ Setter สำหรับ isError
  get isError(): boolean {
    return this._isError;
  }

  set isError(value: boolean) {
    this._isError = value;
  }

  // Getter และ Setter สำหรับ error
  get error(): string | undefined {
    return this._error;
  }

  set error(value: string | undefined) {
    this._error = value;
  }

  // Method สำหรับบันทึก Log
  public savelog(operation: string = '', username: string = '') {
    const logMessage = JSON.stringify(this);
    const logOperation: string = (operation && operation.trim()) ? operation : 'N/A';
    const logUsername: string = (username && username.trim()) ? username : 'system';

    console.log('logMessage : ', logMessage);
    if (this._isError) {
      logger.error({
        message: 'API Response Error: ' + logMessage,
        operation: logOperation,
        username: logUsername,
      });
    } else {
      logger.info({
        message: 'API Response: ' + logMessage,
        operation: logOperation,
        username: logUsername,
      });
    }
  }

  // Method สำหรับแปลงเป็น JSON โดยไม่ใช้ underscore
  public toJSON() {
    return {
      isCompleted: this._isCompleted,
      message: this._message,
      data: this._data,
      isError: this._isError,
      error: this._error,
    };
  }


 // Method สำหรับตั้งค่าข้อผิดพลาด
  public setError(message: string, operation: string, error: any, username: string = 'system', log: boolean = false): ApiResponse<T> {
    this.isCompleted = false;
    this.message = message;
    this.isError = true;
    this.error = error.message || error;
    if (log) {
      this.savelog(operation, username);
    }
    return this;
  }

  // Method สำหรับตั้งค่าเมื่อข้อมูลไม่ครบถ้วน
  public setIncomplete(message: string, log: boolean = false, operation: string = '', username: string = 'system'): ApiResponse<T> {
    this.isCompleted = false;
    this.message = message;
    if (log) {
      this.savelog(operation, username);
    }
    return this;
  }

  // Method สำหรับตั้งค่าเมื่อการดำเนินการสำเร็จ
  public setComplete(message: string, data: Partial<T>, operation: string = '', username: string = 'system', log: boolean = false): ApiResponse<T> {
    this.isCompleted = true;
    this.message = message;
    this.data = data as T;
    if (log) {
      this.savelog(operation, username);
    }
    return this;
  } 
} */



// 2024-08-08 : ก่อนเพิ่ม ฟังก์ชั่น set กรณี Complete , error
// // ApiResponse.ts
// import logger from '../common/logger'; // Import Logger จากไฟล์ logger.ts

// export class ApiResponse<T> {
//   //private _operation: string = 'N/A'; // เพิ่มฟิลด์ operation ใช้บันทึก Log
//   private _isCompleted: boolean = false;
//   private _message: string = '';
//   private _data?: T;
//   private _isError: boolean = false;
//   private _error?: string;

//   constructor(init?: Partial<ApiResponse<T>>) {
//     Object.assign(this, init);
//   }

//   /* // Getter และ Setter สำหรับ operation
//   get operation(): string {
//     return this._operation;
//   }

//   set operation(value: string) {
//     this._operation = value;
//   } */

//   // Getter และ Setter สำหรับ isCompleted
//   get isCompleted(): boolean {
//     return this._isCompleted;
//   }

//   set isCompleted(value: boolean) {
//     this._isCompleted = value;
//   }

//   // Getter และ Setter สำหรับ message
//   get message(): string {
//     return this._message;
//   }

//   set message(value: string) {
//     this._message = value;
//   }

//   // Getter และ Setter สำหรับ data
//   get data(): T | undefined {
//     return this._data;
//   }

//   set data(value: T | undefined) {
//     this._data = value;
//   }

//   // Getter และ Setter สำหรับ isError
//   get isError(): boolean {
//     return this._isError;
//   }

//   set isError(value: boolean) {
//     this._isError = value;
//   }

//   // Getter และ Setter สำหรับ error
//   get error(): string | undefined {
//     return this._error;
//   }

//   set error(value: string | undefined) {
//     this._error = value;
//   }

//   // Method สำหรับบันทึก Log
//   public savelog(operation: string = '', username: string = '') {
//     // ใช้ JSON.stringify() ซึ่งจะเรียกใช้ toJSON() โดยอัตโนมัติ
//     const logMessage = JSON.stringify(this);
//     const logOperation: string = (operation && operation.trim()) ? operation : 'N/A';
//     const logUsername: string = (username && username.trim()) ? username : 'system';

//     console.log('logMessage : ',logMessage);
//     // บันทึกข้อมูล Log โดยใช้ Logger
//     if (this._isError) {
//       logger.error({
//         message: 'API Response Error: ' + logMessage, // บันทึก Log ข้อผิดพลาด
//         operation: logOperation, // ส่งฟิลด์ operation
//         username: logUsername,
//       });
//     } else {
//       logger.info({
//         message: 'API Response: ' + logMessage, // บันทึก Log ข้อมูลปกติ
//         operation: logOperation, // ส่งฟิลด์ operation
//         username: logUsername,
//       });
//     }
//   }

//   // Method สำหรับแปลงเป็น JSON โดยไม่ใช้ underscore
//   public toJSON() {
//     return {
//       //operation: this._operation,
//       isCompleted: this._isCompleted,
//       message: this._message,
//       data: this._data,
//       isError: this._isError,
//       error: this._error,
//     };
//   }

// }





// ก่อนปรับ ให้ ApiResponse รองรับ การบันทึก Logger
/* export class ApiResponse<T> {
    isCompleted: boolean = false; // สถานะการกระทำ หากเป็น true (เป็นการกระทำสำเร็จ เช่น บันทึกสำเร็จ, ค้นหาสำเร็จ, ดึงข้อมูลสำเร็จ, แก้ไขสำเร็จ, ลบสำเร็จ )  หากเป็น false (บันทึกไม่สำเร็จ, ข้อมูลไม่ถูกต้อง, เกิด Error)
    message: string;  // ข้อความที่แจ้งกลับ ไปที่ Client เพื่อนำไปแสดงผลกับผู้ใช้งาน
    data?: T;         // ข้อมูลที่ส่งกลับ จาก API
    isError: boolean = false; // สถานะการเกิดความผิดพลาดจาก try catch
    error?: string;   // ข้อความ error ที่ได้จาก try catch เป็นข้อความที่ไม่ได้แสดงกับ user แต่จะนำไปเก็บ log เพื่อตรวจสอบหาสาเหตุ error ต่อไป
    
    constructor(init?: Partial<ApiResponse<T>>) {
      Object.assign(this, init);
    }
  } */