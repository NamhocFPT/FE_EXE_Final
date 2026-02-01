// src/services/drugProductService.js
import { get } from "../utils/request";

/**
 * Search drug products by query
 * GET /api/v1/drug-products?q={query}&limit={limit}&offset={offset}
 * 
 * @param {string} query - Search term
 * @param {object} options - { limit, offset }
 * @returns {Promise<Array>} Array of drug products
 */
export const searchDrugProducts = async (query, options = {}) => {
    if (!query || query.trim().length === 0) {
        return [];
    }

    const params = {
        q: query.trim(),
        limit: options.limit || 10,
        offset: options.offset || 0
    };

    try {
        const response = await get("/drug-products", params);
        
        // Handle different response formats
        const data = response?.data ?? response;
        
        // Ensure we return an array
        if (Array.isArray(data)) {
            return data;
        }
        
        // If wrapped in a data property
        if (Array.isArray(data?.data)) {
            return data.data;
        }
        
        // If single object, wrap in array
        if (data && typeof data === 'object') {
            return [data];
        }
        
        return [];
    } catch (error) {
        console.error("searchDrugProducts error:", error);
        return [];
    }
};

/**
 * Get drug product by ID
 * GET /api/v1/drug-products/{id}
 */
export const getDrugProductById = async (id) => {
    if (!id) throw new Error("Drug product ID is required");
    
    const response = await get(`/drug-products/${id}`);
    return response?.data ?? response;
};
