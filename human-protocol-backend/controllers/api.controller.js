const ApiService = require('../services/api.service')

const apiService = new ApiService()
const controller = {}

controller.stake = async (req, res) => {
    const [stakedAmount, stakerAddress, txHash] = await apiService.stake()
    res.json({
        stakedAmount: stakedAmount,
        stakerAddress: stakerAddress,
        txHash: txHash
    })
}

controller.escrow = async (req, res) => {
    let transaction;
    try {
        transaction = await apiService.escrow()
    } catch (error) {
        console.log(error.error.data.reason)
        res.status(500).json({ error: error.error.data.reason })
        return;
    }

    res.json({
        message: "Escrow created successfully",
        txHash: transaction
    })
}
module.exports = controller
