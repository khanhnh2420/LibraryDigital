// // src/routes/jobs.routes.js
// import { Router } from "express";
// import { authenticateJWT, authorizeRoles } from "../middlewares/auth.middleware.js";
// import { expireHoldsOnce } from "../jobs/expireHolds.service.js";

// const router = Router();

// router.post(
//   "/expire-holds",
//   authenticateJWT,
//   authorizeRoles("admin", "librarian"),
//   async (_req, res) => {
//     const result = await expireHoldsOnce();
//     res.status(result.ok ? 200 : 500).json(result);
//   }
// );

// export default router;
