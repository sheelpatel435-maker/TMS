const userModuleAccessModel = require("../models/userModuleAccessModel");

const getUserAccess = async (req, res) => {
    try {
        const userId = req.params.userId || req.user.id;

        const access = await userModuleAccessModel.getUserAccess(userId);

        return res.status(200).json({
            success: true,
            access
        });
    } catch (error) {
        console.error(error);

        return res.status(500).json({
            success: false,
            message: "Server error"
        });
    }
};

const createUserAccess = async (req, res) => {
    try {
        const {
            user_id,
            module_id,
            can_view,
            can_create,
            can_update,
            can_delete,
            can_approve,
            can_export,
            can_dispatch,
            can_close
        } = req.body;

        if (!user_id || !module_id) {
            return res.status(400).json({
                success: false,
                message: "user_id and module_id are required"
            });
        }

        const accessId =
            await userModuleAccessModel.createUserAccess({
                user_id,
                module_id,
                can_view,
                can_create,
                can_update,
                can_delete,
                can_approve,
                can_export,
                can_dispatch,
                can_close
            });

        return res.status(201).json({
            success: true,
            message: "User module access created successfully",
            access_id: accessId
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
    getUserAccess,
    createUserAccess
};
