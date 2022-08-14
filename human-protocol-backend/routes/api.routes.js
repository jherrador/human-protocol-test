const express = require("express");
const controller = require("../controllers/api.controller");

const router = express.Router();

router.post("/stake", controller.stake);
router.post("/escrow", controller.escrow);


module.exports = router;
