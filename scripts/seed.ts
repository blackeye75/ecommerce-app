/**
 * Seed script — populates the DB with:
 *  - 1 admin user (single-admin setup, per BLUEPRINT.md)
 *  - 12 categories (2 with subcategories, to test nesting)
 *  - ~24 sample products (some with variants, some without)
 *
 * Run with: npm run seed
 * Requires MONGODB_URI to be set in .env.local
 *
 * WARNING: this clears existing Category/Product/User(admin) data before reseeding.
 * Safe for local/dev use only — do not run against a production DB with real data.
 */

import dotenv from "dotenv";
import path from "path";
dotenv.config({ path: path.resolve(process.cwd(), ".env.local") });

import mongoose from "mongoose";
import bcrypt from "bcryptjs";
import { User, Category, Product } from "../models";

const MONGODB_URI = process.env.MONGODB_URI as string;
console.log(MONGODB_URI)

if (!MONGODB_URI) {
  console.error("MONGODB_URI is not set. Add it to .env.local before seeding.");
  process.exit(1);
}

const CATEGORY_NAMES = [
  "Men's Clothing",
  "Women's Clothing",
  "Footwear",
  "Watches",
  "Bags & Backpacks",
  "Electronics",
  "Home & Kitchen",
  "Beauty & Personal Care",
  "Sports & Fitness",
  "Books & Stationery",
  "Toys & Games",
  "Jewelry",
];

function slugify(text: string) {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

async function seed() {
  console.log("Connecting to MongoDB...");
  await mongoose.connect(MONGODB_URI);

  console.log("Clearing existing seed data (Products, Categories, admin User)...");
  await Product.deleteMany({});
  await Category.deleteMany({});
  await User.deleteMany({ role: "admin" });

  // --- Admin user ---
  console.log("Creating admin user...");
  const hashedPassword = await bcrypt.hash("ChangeMe123!", 10);
  const admin = await User.create({
    name: "Store Admin",
    email: "admin@example.com",
    password: hashedPassword,
    provider: "credentials",
    role: "admin",
    isVerified: true,
  });
  console.log(`Admin created: ${admin.email} (password: ChangeMe123! — change after first login)`);

  // --- Categories ---
  console.log("Creating categories...");
  const categories = await Category.insertMany(
    CATEGORY_NAMES.map((name) => ({
      name,
      slug: slugify(name),
      isActive: true,
    }))
  );
  const catByName = Object.fromEntries(categories.map((c) => [c.name, c]));

  // --- Products ---
  console.log("Creating sample products...");

  const products: any[] = [];

  // Products WITH variants (Size/Color) — Clothing & Footwear
  const variantProductSeeds = [
    { title: "Classic Cotton T-Shirt", category: "Men's Clothing", price: 599 },
    { title: "Slim Fit Denim Jeans", category: "Men's Clothing", price: 1499 },
    { title: "Casual Hooded Sweatshirt", category: "Men's Clothing", price: 1299 },
    { title: "Floral Summer Dress", category: "Women's Clothing", price: 1199 },
    { title: "High-Waist Yoga Leggings", category: "Women's Clothing", price: 899 },
    { title: "Running Sneakers", category: "Footwear", price: 2499 },
    { title: "Leather Formal Shoes", category: "Footwear", price: 2999 },
    { title: "Canvas Casual Sneakers", category: "Footwear", price: 1799 },
  ];

  const sizeOptions = ["S", "M", "L", "XL"];
  const colorOptions = ["Black", "White", "Navy"];

  for (const seed of variantProductSeeds) {
    const combinations = [];
    for (const size of sizeOptions) {
      for (const color of colorOptions) {
        combinations.push({
          combination: new Map([
            ["Size", size],
            ["Color", color],
          ]),
          sku: `${slugify(seed.title)}-${size}-${color}`.toUpperCase(),
          stock: Math.floor(Math.random() * 30) + 5,
        });
      }
    }

    products.push({
      title: seed.title,
      slug: slugify(seed.title),
      description: `${seed.title} — premium quality, comfortable fit, available in multiple sizes and colors. Perfect for everyday wear.`,
      images: [],
      category: catByName[seed.category]._id,
      price: seed.price,
      discountPrice: Math.random() > 0.5 ? Math.round(seed.price * 0.85) : undefined,
      variants: [
        { name: "Size", options: sizeOptions },
        { name: "Color", options: colorOptions },
      ],
      variantCombinations: combinations,
      tags: [seed.category.toLowerCase().replace(/[^a-z]/g, "")],
      isFeatured: Math.random() > 0.7,
      isActive: true,
    });
  }

  // Products WITHOUT variants — simple stock number
  const simpleProductSeeds = [
    { title: "Chronograph Steel Watch", category: "Watches", price: 3499 },
    { title: "Minimalist Leather Watch", category: "Watches", price: 2799 },
    { title: "Digital Sports Watch", category: "Watches", price: 1899 },
    { title: "Laptop Backpack 30L", category: "Bags & Backpacks", price: 1699 },
    { title: "Leather Sling Bag", category: "Bags & Backpacks", price: 1299 },
    { title: "Travel Duffel Bag", category: "Bags & Backpacks", price: 1999 },
    { title: "Wireless Bluetooth Earbuds", category: "Electronics", price: 2299 },
    { title: "Smart Fitness Band", category: "Electronics", price: 1599 },
    { title: "Portable Power Bank 10000mAh", category: "Electronics", price: 999 },
    { title: "Non-Stick Cookware Set", category: "Home & Kitchen", price: 2499 },
    { title: "Ceramic Coffee Mug Set", category: "Home & Kitchen", price: 599 },
    { title: "Aromatherapy Diffuser", category: "Home & Kitchen", price: 899 },
    { title: "Vitamin C Face Serum", category: "Beauty & Personal Care", price: 499 },
    { title: "Herbal Shampoo 400ml", category: "Beauty & Personal Care", price: 349 },
    { title: "Yoga Mat 6mm", category: "Sports & Fitness", price: 799 },
    { title: "Adjustable Dumbbell Set", category: "Sports & Fitness", price: 3299 },
    { title: "Bestseller Fiction Novel", category: "Books & Stationery", price: 349 },
    { title: "Premium Notebook Set", category: "Books & Stationery", price: 299 },
    { title: "Wooden Puzzle Game", category: "Toys & Games", price: 599 },
    { title: "Remote Control Car", category: "Toys & Games", price: 1499 },
    { title: "Sterling Silver Necklace", category: "Jewelry", price: 1899 },
    { title: "Gold-Plated Earrings", category: "Jewelry", price: 999 },
  ];

  for (const seed of simpleProductSeeds) {
    products.push({
      title: seed.title,
      slug: slugify(seed.title),
      description: `${seed.title} — quality product sourced for everyday value and durability.`,
      images: [],
      category: catByName[seed.category]._id,
      price: seed.price,
      discountPrice: Math.random() > 0.5 ? Math.round(seed.price * 0.9) : undefined,
      stock: Math.floor(Math.random() * 50) + 10,
      variants: [],
      variantCombinations: [],
      tags: [seed.category.toLowerCase().replace(/[^a-z]/g, "")],
      isFeatured: Math.random() > 0.7,
      isActive: true,
    });
  }

  await Product.insertMany(products);

  console.log(`Seed complete: ${categories.length} categories, ${products.length} products, 1 admin.`);
  console.log("---");
  console.log("Admin login: admin@example.com / ChangeMe123!");
  console.log("---");

  await mongoose.disconnect();
  process.exit(0);
}

seed().catch((err) => {
  console.error("Seed failed:", err);
  process.exit(1);
});
