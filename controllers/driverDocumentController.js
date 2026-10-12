const driverDocumentModel = require("../models/driverDocumentModel");

const getDriverDocuments = async (req, res) => {
    try {
        const { driverId } = req.params;

        const documents = await driverDocumentModel.getDriverDocuments(
            req.user.company_id,
            driverId
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

const createDriverDocument = async (req, res) => {
    try {
        const { driverId } = req.params;
        const { document_type } = req.body;

        if (!document_type) {
            return res.status(400).json({
                success: false,
                message: "Document type is required"
            });
        }

        const id = await driverDocumentModel.createDriverDocument(
            req.user.company_id,
            driverId,
            req.body
        );

        return res.status(201).json({
            success: true,
            message: "Driver document created successfully",
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
    getDriverDocuments,
    createDriverDocument
};