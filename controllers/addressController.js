const Address = require("../models/addressModel");
const User = require("../models/userModel");
const Cart = require("../models/cartModel");
const { validationResult } = require("express-validator");

const loadCreateAddress = async (req, res) => {
  const user = req.user;
  try {
    let cart =
      (await Cart.findOne({ orderby: user._id })
        .populate("products.product")
        .exec()) || null;
    res.status(201).render("addAddress", { user, cart });
  } catch (error) {
    throw new Error(error);
  }
};

const createAddress = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.mapped() });
    }
    const newAddress = await Address.create(req.body);
    res.status(201).json(newAddress);
  } catch (error) {
    res
      .status(500)
      .json({ message: "Error saving address", error: error.message });
  }
};

const loadUpdateAddress = async (req, res) => {
  const user = req.user;
  const { id } = req.params;
  try {
    let cart =
      (await Cart.findOne({ orderby: user._id })
        .populate("products.product")
        .exec()) || null;
    const address = await Address.findById(id);
    res.status(200).render("editAddress", { user, address, cart });
  } catch (error) {
    throw new Error(error);
  }
};

const updateAddress = async (req, res) => {
  const { id } = req.params;
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.mapped() });
    }
    const updatedAddress = await Address.findByIdAndUpdate(id, req.body, {
      new: true,
    });
    res.json(updatedAddress);
  } catch (error) {
    throw new Error(error);
  }
};

const deleteAddress = async (req, res) => {
  const { id } = req.params;
  try {
    const deletedAddress = await Address.findByIdAndDelete(id);
    res
      .status(200)
      .json({ success: true, message: "Address deleted successfully" });
  } catch (error) {
    throw new Error(error);
  }
};

const getAddress = async (req, res) => {
  const { id } = req.params;
  try {
    const findAddress = await Address.findById(id);
    res.json(findAddress);
  } catch (error) {
    throw new Error(error);
  }
};

const getAllAddress = async (req, res) => {
  const user = req.user;
  const { id } = user;
  try {
    let cart =
      (await Cart.findOne({ orderby: user._id })
        .populate("products.product")
        .exec()) || null;
    const findAllAddress = await Address.find({ user: id });
    res
      .status(201)
      .render("all-address", { address: findAllAddress, user, cart });
  } catch (error) {
    throw new Error(error);
  }
};

const defaultAddress = async (req, res) => {
  const { id } = req.params;
  const { userId } = req.body;
  try {
    await Address.updateMany({ user: userId }, { default: false });

    // Set the selected address to default
    await Address.findByIdAndUpdate(id, { default: true });

    // Optionally, update the user schema with the default address reference
    await User.findByIdAndUpdate(userId, { defaultAddress: id });
    // res.redirect('/user/profile')
  } catch (error) {
    console.log(error);
  }
};

module.exports = {
  loadCreateAddress,
  createAddress,
  loadUpdateAddress,
  updateAddress,
  deleteAddress,
  getAddress,
  getAllAddress,
  defaultAddress,
};
