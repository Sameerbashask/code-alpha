const dotenv = require("dotenv");
const connectDB = require("./config/db");
const Product = require("./models/Product");
const products = require("./data/products");

dotenv.config();

const seedProducts = async () => {
  try {
    await connectDB();
    await Product.deleteMany();
    await Product.insertMany(products);
    console.log("Sample products inserted successfully");
    process.exit(0);
  } catch (error) {
    console.error(`Seed failed: ${error.message}`);
    process.exit(1);
  }
};

seedProducts();
