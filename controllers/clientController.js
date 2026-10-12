const clientModel = require("../models/clientModel");

const getClients = async (req, res) => {
    try {
        const clients = await clientModel.getClients(
            req.user.company_id
        );

        return res.status(200).json({
            success: true,
            clients
        });
    } catch (error) {
        console.error(error);

        return res.status(500).json({
            success: false,
            message: "Server error"
        });
    }
};

const createClient = async (req, res) => {
    try {
        const { client_name } = req.body;

        if (!client_name) {
            return res.status(400).json({
                success: false,
                message: "Client name is required"
            });
        }

        const id = await clientModel.createClient(
            req.user.company_id,
            req.body
        );

        return res.status(201).json({
            success: true,
            message: "Client created successfully",
            id
        });
    } catch (error) {
        console.error(error);

        return res.status(500).json({
            success: false,
            message: "Server error"
        });
    }
};

module.exports = {
    getClients,
    createClient
};
