const express = require("express");
const {
  getCategories,
  getFeaturedProducts,
  getProductById,
  getProducts,
} = require("../controllers/productController");

const router = express.Router();

router.get("/", getProducts);
router.get("/featured", getFeaturedProducts);
router.get("/categories", getCategories);
router.get("/:id", getProductById);

module.exports = router;
