"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.safeQuery = safeQuery;
exports.requireDb = requireDb;
const pool_1 = __importDefault(require("./pool"));
async function safeQuery(sql, params) {
    try {
        const result = await pool_1.default.query(sql, params);
        return result.rows;
    }
    catch (err) {
        console.error('Error en consulta SQL:', err.message);
        return [];
    }
}
async function requireDb(sql, params) {
    const result = await pool_1.default.query(sql, params);
    return result.rows;
}
