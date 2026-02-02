
import { AppDataSource } from "../config/app-data-source";
import { CounterRuntime } from "../entities/counter_runtime.entity";

export class CounterRuntimeService {
  private repo = AppDataSource.getRepository(CounterRuntime);

  async get(counterId: number) {
    return this.repo.findOne({ where: { counter_id: counterId } });
  }

  async ensure(counterId: number, orderId: number) {
  let row = await this.get(counterId);

  // ยังไม่เคยมี runtime
  if (!row) {
    row = this.repo.create({
      counter_id: counterId,
      order_id: orderId,
      actual_qty: 0,
    });
    await this.repo.save(row);
    return row;
  }

  // มี runtime อยู่ แต่เป็นคนละ order → reset
  if (row.order_id !== orderId) {
    row.order_id = orderId;
    row.actual_qty = 0;
    await this.repo.save(row);
  }

  return row;
}

  async increment(counterId: number, orderId: number) {
    await this.ensure(counterId, orderId);

    await this.repo.increment(
      { counter_id: counterId },
      "actual_qty",
      1
    );

    return this.get(counterId);
  }

  async reset(counterId: number) {
    await this.repo.update(
      { counter_id: counterId },
      {
        actual_qty: 0,
        order_id: null
      }
    );
  }

async bulkSet(
  counterId: number,
  orderId: number,
  qty: number
) {
  // 🔥 ensure ว่ามี runtime และ order ตรง
  await this.ensure(counterId, orderId); // ⬅️ ไม่ต้องรับค่า

  // set ตรง ไม่ increment
  await this.repo.update(
    { counter_id: counterId },
    { actual_qty: qty }
  );

  return this.get(counterId);
}


}
