const vehicleDocumentModel = require("../models/vehicleDocumentModel");

const getVehicleDocuments = async (req, res) => {
    try {
        const { vehicleId } = req.params;

        const documents = await vehicleDocumentModel.getVehicleDocuments(
            req.user.company_id,
            vehicleId
        );

        return res.status(200).json({
            success: true,
            documents
        });
    } catch (error) {
        console.error(error);

        return res.status(500).json({
            success: false,
            message: "Server error"
        });
    }
};

const createVehicleDocument = async (req, res) => {
    try {
        const { vehicleId } = req.params;
        const { document_type } = req.body;

        if (!document_type) {
            return res.status(400).json({
                success: false,
                message: "Document type is required"
            });
        }

        const id = await vehicleDocumentModel.createVehicleDocument(
            req.user.company_id,
            vehicleId,
            req.body
        );

        return res.status(201).json({
            success: true,
            message: "Vehicle document created successfully",
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
    getVehicleDocuments,
    createVehicleDocument
};