"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const timeService_1 = require("../utils/timeService");
const router = (0, express_1.Router)();
/**
 * GET /api/time
 * Obtiene la hora actual de Colombia desde WorldTimeAPI
 */
router.get('/', async (_req, res) => {
    try {
        const colombiaTime = await (0, timeService_1.getColombiaTime)();
        return res.json({
            datetime: colombiaTime.toISOString(),
            formatted: (0, timeService_1.formatColombiaDateTime)(colombiaTime),
            sql: await (0, timeService_1.getColombiaTimeSql)(),
            timezone: 'America/Bogota',
            offset: '-05:00',
            timestamp: colombiaTime.getTime()
        });
    }
    catch (error) {
        console.error('Error obteniendo hora de Colombia:', error);
        return res.status(500).json({
            error: 'No se pudo obtener la hora de Colombia'
        });
    }
});
exports.default = router;
