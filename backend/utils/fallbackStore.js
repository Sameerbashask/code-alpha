const bcrypt = require("bcryptjs");
const productsData = require("../data/products");

const createId = () => `fallback-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

const cloneProducts = () =>
  productsData.map((product, index) => ({
    ...product,
    _id: product._id || `product-${index + 1}`,
    createdAt: new Date(),
    updatedAt: new Date(),
  }));

let products = cloneProducts();
let users = [];
let orders = [];

const listProducts = ({ search = "", category = "", sort = "" } = {}) => {
  let filtered = [...products];

  if (search) {
    filtered = filtered.filter((product) => product.name.toLowerCase().includes(search.toLowerCase()));
  }

  if (category) {
    filtered = filtered.filter((product) => product.category === category);
  }

  if (sort === "price-asc") {
    filtered.sort((a, b) => a.price - b.price);
  } else if (sort === "price-desc") {
    filtered.sort((a, b) => b.price - a.price);
  } else {
    filtered.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  }

  return filtered;
};

const getFeaturedProducts = () => products.filter((product) => product.featured).slice(0, 4);

const getCategories = () => [...new Set(products.map((product) => product.category))];

const getProductById = (id) => products.find((product) => product._id === id || product._id.toString() === id.toString());

const createUser = async ({ name, email, password }) => {
  const user = {
    _id: createId(),
    name,
    email: email.toLowerCase(),
    password: await bcrypt.hash(password, 10),
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  users.push(user);
  return user;
};

const findUserByEmail = async (email) => users.find((user) => user.email === email.toLowerCase());

const findUserById = (id) => users.find((user) => user._id === id || user._id.toString() === id.toString());

const createOrder = async ({ userId, items, shippingAddress }) => {
  const orderProducts = [];
  let totalAmount = 0;

  for (const item of items) {
    const product = getProductById(item.productId);

    if (!product) {
      throw new Error("One of the selected products no longer exists");
    }

    if (item.quantity < 1) {
      throw new Error("Invalid product quantity");
    }

    if (product.stock < item.quantity) {
      throw new Error(`Insufficient stock for ${product.name}`);
    }

    product.stock -= item.quantity;
    product.updatedAt = new Date();

    orderProducts.push({
      product: product._id,
      name: product.name,
      image: product.image,
      price: product.price,
      quantity: item.quantity,
    });

    totalAmount += product.price * item.quantity;
  }

  const order = {
    _id: createId(),
    orderId: `ORD-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
    user: userId,
    products: orderProducts,
    totalAmount,
    shippingAddress,
    paymentMethod: "Cash on Delivery",
    orderStatus: "Pending",
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  orders.push(order);
  return order;
};

const getOrdersByUserId = (userId) =>
  orders
    .filter((order) => order.user === userId || order.user.toString() === userId.toString())
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

const getOrderById = (orderId, userId) =>
  orders.find((order) => (order._id === orderId || order._id.toString() === orderId.toString()) && (order.user === userId || order.user.toString() === userId.toString()));

module.exports = {
  listProducts,
  getFeaturedProducts,
  getCategories,
  getProductById,
  createUser,
  findUserByEmail,
  findUserById,
  createOrder,
  getOrdersByUserId,
  getOrderById,
};
