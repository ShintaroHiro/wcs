const STORE_TYPE_MAP = {
    T1: "T1 Store",
    T1M: "T1M Store",
    AGMB: "AGMB Store",
    WCS: "WCS",
};

export const getStoreTypeTrans = (storeType) => {
    return STORE_TYPE_MAP[storeType] || storeType || "";
};
