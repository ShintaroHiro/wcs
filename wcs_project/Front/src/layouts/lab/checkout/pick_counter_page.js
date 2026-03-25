import React, { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import CounterScreen from "../components/counter_screen";
import CounterAPI from "api/CounterAPI";
import MDBox from "components/MDBox";
import DisplayLayout from "../../../utils/DisplayLayout";
//import CounterStandbyScreen from "../components/counter_standby_screen";
//import ScanQtyDialog from "../transactions/scan_qty_form";

const ScaledWrapper = ({ children }) => {
  const BASE_W = 1920;
  const BASE_H = 1080;

  const [scale, setScale] = React.useState(() => {
    return Math.min(window.innerWidth / BASE_W, window.innerHeight / BASE_H);
  });

  React.useEffect(() => {
    const resize = () => {
      const s = Math.min(window.innerWidth / BASE_W, window.innerHeight / BASE_H);
      setScale(s);
    };

    window.addEventListener("resize", resize);
    return () => window.removeEventListener("resize", resize);
  }, []);

  return (
    <div
      style={{
        width: BASE_W,
        height: BASE_H,
        transform: `scale(${scale})`,
        transformOrigin: "top left",
        marginLeft: `calc((100vw - ${BASE_W * scale}px) / 2)`,
        marginTop: `calc((100vh - ${BASE_H * scale}px) / 2)`,
      }}
    >
      {children}
    </div>
  );
};

const PickCounterPage = () => {
  const { counterId } = useParams();
  const [counter, setCounter] = useState(null);
  //const [scanOpen, setScanOpen] = useState(false);

  useEffect(() => {
    const fetchCounter = async () => {
      try {
        const res = await CounterAPI.getByCounterIdPublic(counterId); // คืนค่า array
        const data = res?.data;

        if (!data || data.length === 0) {
          setCounter(null);
        } else {
          // ใช้แถวแรกเป็นตัวอย่าง
          setCounter(data[0]);
        }

        //console.log("res", data);
      } catch (err) {
        console.error(err);
        setCounter(null);
      }
    };
    fetchCounter();
  }, [counterId]);

  /* =========================
   * SSE (auto reconnect)
   * ========================= */
  useEffect(() => {
    if (!counterId) return;

    const API_BASE =
      process.env.REACT_APP_API_BASE_URL || "http://localhost:3000";

    let es = null;
    let retryTimer;

    const connectSSE = () => {
      console.log("🔌 Connecting SSE:", counterId);

      es = new EventSource(
        `${API_BASE}/api/sse/${counterId}?key=${process.env.REACT_APP_WCS_SCREEN_KEY}`
      );

      es.onopen = () => {
        console.log("✅ SSE connected");
      };

      es.onmessage = (e) => {
        try {
          const data = JSON.parse(e.data);
          if (typeof data.actualQty !== "number") return;

          setCounter((prev) =>
            prev
              ? { ...prev, actual_qty: data.actualQty }
              : prev
          );
          
        } catch (err) {
          console.error("❌ SSE parse error", err);
        }
      };

      es.onerror = () => {
        console.warn("⚠️ SSE disconnected, retrying...");
        es?.close();

        retryTimer = setTimeout(connectSSE, 3000);
      };
    };

    connectSSE();

    
    return () => {
      clearTimeout(retryTimer);
      es?.close();
      console.log("🔌 SSE closed");
    };
  }, [counterId]);

  if (!counter) return <div>Counter not found</div>;

  return (
    <DisplayLayout>
      <MDBox
        sx={{
          width: "100vw",
          height: "100vh",
          overflow: "hidden",
          backgroundColor: "#ffffff",
        }}
      >
        <ScaledWrapper>
          {/* {counter?.trx_type === null ? (
            <CounterStandbyScreen counter={counter} />
          ) : ( */}
            <CounterScreen
              counter={counter} // counter object
              status={counter.status}
              stock_item={counter.stock_item} // จาก flattened row
              item_desc={counter.item_desc}
              plan_qty={counter.plan_qty}
              pickedQty={counter.actual_qty}
              spr_no={counter.spr_no}
              type={counter.trx_type} // เปลี่ยนจาก counter.type
              work_order={counter.work_order}
              mc_code={counter.mc_code}
              usage_num={counter.usage_num}
              usage_line={counter.usage_line}
              po_num={counter.po_num}
              object_id={counter.object_id}
              item_id={counter.item_id}
              imageUrl={counter.item_img_url}
              slots={6}

              isStandby={counter?.trx_type === null} //render สลับcounter ภายใน
            />
          {/* )} */}
        </ScaledWrapper>
        {/* 🔥 Dialog อยู่นี่ */}
      {/* <ScanQtyDialog
        open={scanOpen}                 // ใครจะเปิด คนนั้นคุม
        order={counter}
        actualQty={counter.actual_qty}
        onClose={() => setScanOpen(false)}
        onSubmit={(orderId, qty) =>
          CounterAPI.confirmOrder(orderId, qty)
        }
      /> */}
      </MDBox>
    </DisplayLayout>
  );
};
export default PickCounterPage;
