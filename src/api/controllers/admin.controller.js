const adminService = require('../../services/admin.service');

exports.checkShippingStatus = (req, res) => {
    adminService.pingProvider(req.body.providerIP, req.body.options, out => res.send(out));
};

function safeCalculate(formula) {
    if (typeof formula !== 'string' || !/^[0-9+\-*/().\s]+$/.test(formula)) {
        throw new Error("Invalid formula expression");
    }
    // Safely evaluate simple mathematical expression
    return Function(`'use strict'; return (${formula})`)();
}

exports.previewDynamicPricing = (req, res) => {
    try {
        res.json({ price: safeCalculate(req.body.formula) });
    } catch (e) {
        res.status(400).send("Evaluation Failed");
    }
};