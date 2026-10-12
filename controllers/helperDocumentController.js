const helperDocumentModel = require("../models/helperDocumentModel");

const getHelperDocuments = async (req, res) => {
    try {
        const { helperId } = req.params;

        const documents = await helperDocumentModel.getHelperDocuments(
            req.user.company_id,
            helperId
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

const createHelperDocument = async (req, res) => {
    try {
        const { helperId } = req.params;
        const { document_type } = req.body;

        if (!document_type) {
            return res.status(400).json({
                success: false,
                message: "Document type is required"
            });
        }

        const id = await helperDocumentModel.createHelperDocument(
            req.user.company_id,
            helperId,
            req.body
        );

        return res.status(201).json({
            success: true,
            message: "Helper document created successfully",
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
    getHelperDocuments,
    createHelperDocument
};