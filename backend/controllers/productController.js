const Product = require("../models/Product");
const fallbackStore = require("../utils/fallbackStore");

const useFallback = () => !Product.db?.readyState || Product.db.readyState !== 1;

const getProducts = async (req, res) => {
  try {
    if (useFallback()) {
      const products = fallbackStore.listProducts(req.query);
      return res.json(products);
    }

    const { search = "", category = "", sort = "" } = req.query;
    const filter = {};

    if (search) {
      filter.name = { $regex: search, $options: "i" };
    }

    if (category) {
      filter.category = category;
    }

    let query = Product.find(filter);

    if (sort === "price-asc") {
      query = query.sort({ price: 1 });
    } else if (sort === "price-desc") {
      query = query.sort({ price: -1 });
    } else {
      query = query.sort({ createdAt: -1 });
    }

    const products = await query;
    res.json(products);
  } catch (error) {
    res.status(500).json({ message: "Unable to fetch products" });
  }
};

const getFeaturedProducts = async (req, res) => {
  try {
    if (useFallback()) {
      return res.json(fallbackStore.getFeaturedProducts());
    }

    const products = await Product.find({ featured: true }).limit(4);
    res.json(products);
  } catch (error) {
    res.status(500).json({ message: "Unable to fetch featured products" });
  }
};

const getCategories = async (req, res) => {
  try {
    if (useFallback()) {
      return res.json(fallbackStore.getCategories());
    }

    const categories = await Product.distinct("category");
    res.json(categories);
  } catch (error) {
    res.status(500).json({ message: "Unable to fetch categories" });
  }
};

const getProductById = async (req, res) => {
  try {
    if (useFallback()) {
      const product = fallbackStore.getProductById(req.params.id);
      if (!product) {
        return res.status(404).json({ message: "Product not found" });
      }
      return res.json(product);
    }

    const product = await Product.findById(req.params.id);

    if (!product) {
      return res.status(404).json({ message: "Product not found" });
    }

    res.json(product);
  } catch (error) {
    res.status(400).json({ message: "Invalid product ID" });
  }
};

module.exports = {
  getProducts,
  getFeaturedProducts,
  getCategories,
  getProductById,
};
