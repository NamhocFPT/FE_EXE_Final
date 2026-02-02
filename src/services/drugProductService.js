// src/services/drugProductService.js
import { get } from "../utils/request";

/**
 * Normalize response to array
 * Vì utils/request đã return response.data luôn nên res thường là object/array trực tiếp.
 */
const toArray = (res) => {
    const payload = res?.data ?? res; // phòng trường hợp sau này bạn đổi wrapper
    if (Array.isArray(payload)) return payload;
    if (Array.isArray(payload?.data)) return payload.data;
    if (Array.isArray(payload?.items)) return payload.items;
    if (Array.isArray(payload?.data?.items)) return payload.data.items;
    return [];
};

/**
 * Search/list drug products
 * GET /api/v1/drug-products?q?&substance_id?&limit?&offset?
 *
 * @param {object} args
 * @param {string} args.q - search term
 * @param {string} args.substance_id - optional filter
 * @param {number} args.limit
 * @param {number} args.offset
 */
export const getDrugProducts = async ({ q, substance_id, limit = 10, offset = 0 } = {}) => {
    const params = {};
    if (q && String(q).trim()) params.q = String(q).trim();
    if (substance_id) params.substance_id = substance_id;
    if (limit != null) params.limit = limit;
    if (offset != null) params.offset = offset;

    const res = await get("/drug-products", params);
    return toArray(res);
};

/**
 * Alias cho dễ hiểu trong UI: gõ tên -> gợi ý
 */
export const searchDrugProducts = async (query, options = {}) => {
    return getDrugProducts({
        q: query,
        limit: options.limit ?? 10,
        offset: options.offset ?? 0,
        substance_id: options.substance_id,
    });
};

/**
 * Get drug product by ID
 * GET /api/v1/drug-products/{id}
 */
export const getDrugProductById = async (id) => {
    if (!id) throw new Error("Drug product ID is required");
    return get(`/drug-products/${id}`);
};
