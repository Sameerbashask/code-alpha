const mongoose = require("mongoose");
const Order = require("../models/Order");
const Product = require("../models/Product");
const fallbackStore = require("../utils/fallbackStore");

const createOrderId = () => `ORD-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
const useFallback = () => !Order.db?.readyState || Order.db.readyState !== 1;

const createOrder = async (req, res) => {
  const { items, shippingAddress } = req.body;

  if (!Array.isArray(items) || items.length === 0) {
    return res.status(400).json({ message: "Your cart is empty" });
  }

  const requiredFields = ["fullName", "phone", "address", "city", "state", "postalCode"];
  const missingField = requiredFields.find((field) => !shippingAddress?.[field]);
  if (missingField) {
    return res.status(400).json({ message: `Missing shipping field: ${missingField}` });
  }

  if (useFallback()) {
    try {
      const order = await fallbackStore.createOrder({
        userId: req.user._id,
        items,
        shippingAddress,
      });
      return res.status(201).json(order);
    } catch (error) {
      return res.status(400).json({ message: error.message || "Unable to place order" });
    }
  }

  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const orderProducts = [];
    let totalAmount = 0;

    for (const item of items) {
      const product = await Product.findById(item.productId).session(session);
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
      await product.save({ session });

      orderProducts.push({
        product: product._id,
        name: product.name,
        image: product.image,
        price: product.price,
        quantity: item.quantity,
      });

      totalAmount += product.price * item.quantity;
    }

    const order = await Order.create(
      [
        {
          orderId: createOrderId(),
          user: req.user._id,
          products: orderProducts,
          totalAmount,
          shippingAddress,
          paymentMethod: "Cash on Delivery",
          orderStatus: "Pending",
        },
      ],
      { session }
    );

    await session.commitTransaction();
    res.status(201).json(order[0]);
  } catch (error) {
    await session.abortTransaction();
    res.status(400).json({ message: error.message || "Unable to place order" });
  } finally {
    session.endSession();
  }
};

const getMyOrders = async (req, res) => {
  try {
    if (useFallback()) {
      return res.json(fallbackStore.getOrdersByUserId(req.user._id));
    }

    const orders = await Order.find({ user: req.user._id }).sort({ createdAt: -1 });
    res.json(orders);
  } catch (error) {
    res.status(500).json({ message: "Unable to fetch orders" });
  }
};

const getOrderById = async (req, res) => {
  try {
    if (useFallback()) {
      const order = fallbackStore.getOrderById(req.params.id, req.user._id);
      if (!order) {
        return res.status(404).json({ message: "Order not found" });
      }
      return res.json(order);
    }

    const order = await Order.findOne({
      _id: req.params.id,
      user: req.user._id,
    });

    if (!order) {
      return res.status(404).json({ message: "Order not found" });
    }

    res.json(order);
  } catch (error) {
    res.status(400).json({ message: "Invalid order ID" });
  }
};

module.exports = {
  createOrder,
  getMyOrders,
  getOrderById,
};
