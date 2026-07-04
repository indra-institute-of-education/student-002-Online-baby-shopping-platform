-- Create the database if it doesn't exist
CREATE DATABASE IF NOT EXISTS tiny_twinkles;

-- Use the newly created database
USE tiny_twinkles;

-- Create the users table
CREATE TABLE IF NOT EXISTS users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create the products table
CREATE TABLE IF NOT EXISTS products (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    price DECIMAL(10, 2) NOT NULL,
    image VARCHAR(255),
    featured BOOLEAN DEFAULT FALSE,
    category VARCHAR(255),
    subcategory VARCHAR(255),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- Create the orders table
CREATE TABLE IF NOT EXISTS orders (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    order_number VARCHAR(255) NOT NULL UNIQUE, -- Changed to VARCHAR for flexibility (e.g., UUIDs)
    total DECIMAL(10, 2) NOT NULL,
    order_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    status VARCHAR(50) DEFAULT 'Processing',
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Create the order_items table (details of products in an order)
CREATE TABLE IF NOT EXISTS order_items (
    id INT AUTO_INCREMENT PRIMARY KEY,
    order_id INT NOT NULL,
    product_id INT NOT NULL,
    product_name VARCHAR(255) NOT NULL,
    quantity INT NOT NULL,
    price_at_purchase DECIMAL(10, 2) NOT NULL,
    size VARCHAR(50), -- For products that have sizes (e.g., clothing)
    FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE,
    FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE
);

-- Create the wishlists table
CREATE TABLE IF NOT EXISTS wishlists (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    product_id INT NOT NULL,
    added_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE,
    UNIQUE (user_id, product_id) -- Ensures a user can only wishlist a product once
);

-- Optional: Insert some initial products (matching your frontend's defaultProducts)
INSERT INTO products (id, name, price, image, featured, category, subcategory) VALUES
(1, 'Organic Cotton Onesie', 24.99, 'allproduct/1.jpg', TRUE, 'boys-collection', 'onesies'),
(2, 'Dinosaur Print T-Shirt', 18.00, 'allproduct/2.jpg', FALSE, 'boys-collection', 'tshirts'),
(3, 'Comfy Denim Jeans', 29.50, 'allproduct/444.jpg', FALSE, 'boys-collection', 'jeans'),
(4, 'Baby body suits', 29.50, 'allproduct/boy/b1.jpg', FALSE, 'boys-collection', 'onesies'),
(5, 'Rampers', 29.50, 'allproduct/boy/b2.jpg', FALSE, 'boys-collection', 'sleepwear'),
(6, 'Joggers', 29.50, 'allproduct/boy/b3.jpg', FALSE, 'boys-collection', 'jeans'),
(7, 'Sleepers wear', 29.50, 'allproduct/boy/b4.jpg', FALSE, 'boys-collection', 'sleepwear'),
(8, 'Dress Set for Formal', 29.50, 'allproduct/boy/b5.jpg', FALSE, 'boys-collection', 'formal'),
(9, 'Baby Boy Festive Dress', 29.50, 'allproduct/boy/b6.jpg', FALSE, 'boys-collection', 'formal'),
(10, 'Baby Boys Casual Dress', 29.50, 'allproduct/boy/b7.jpg', FALSE, 'boys-collection', 'tshirts'),
(11, 'Cotton cloth set', 29.50, 'allproduct/boy/b8.jpg', FALSE, 'boys-collection', 'onesies'),
(12, 'function wear', 29.50, 'allproduct/boy/b9.jpg', FALSE, 'boys-collection', 'formal'),
(13, 'Jacket Pant', 29.50, 'allproduct/boy/b10.jpg', FALSE, 'boys-collection', 'tshirts'),
(14, 'card set', 29.50, 'allproduct/boy/b11.jpg', FALSE, 'boys-collection', 'sleepwear'),
(15, 'cute soft dress', 29.50, 'allproduct/boy/b12.jpg', FALSE, 'boys-collection', 'onesies'),
(16, 'wasty set', 29.50, 'allproduct/boy/b13.jpg', FALSE, 'boys-collection', 'tshirts'),
(17, 'Floral Sundress', 32.00, 'allproduct/5.jpg', FALSE, 'girls-collection', 'dresses'),
(18, 'Party wear', 15.00, 'allproduct/girl/g1.jpg', FALSE, 'girls-collection', 'dresses'),
(19, 'Ruffled Sleeve Top', 19.99, 'allproduct/6.jpg', FALSE, 'girls-collection', 'tops'),
(20, 'Heart Print Flare Dress', 32.00, 'allproduct/girl/g2.jpg', FALSE, 'girls-collection', 'dresses'),
(21, 'Sleeveless Smocked Frock', 32.00, 'allproduct/girl/g3.jpg', FALSE, 'girls-collection', 'dresses'),
(22, 'White Smocked Top', 32.00, 'allproduct/girl/g4.jpg', FALSE, 'girls-collection', 'tops'),
(23, 'Floral print look', 32.00, 'allproduct/girl/g5.jpg', FALSE, 'girls-collection', 'dresses'),
(24, 'Neck Ruffle Trim Top', 32.00, 'allproduct/girl/g6.jpg', FALSE, 'girls-collection', 'tops'),
(25, 'stylish dress', 32.00, 'allproduct/girl/g7.jpg', FALSE, 'girls-collection', 'dresses'),
(26, 'Traditional wear', 32.00, 'allproduct/girl/g8.jpg', FALSE, 'girls-collection', 'dresses'),
(27, 'Cute Frock', 32.00, 'allproduct/girl/g9.jpg', FALSE, 'girls-collection', 'dresses'),
(28, 'Function special dress', 32.00, 'allproduct/girl/g11.jpg', FALSE, 'girls-collection', 'dresses'),
(29, 'front body suit', 32.00, 'allproduct/girl/g12.jpg', FALSE, 'girls-collection', 'sets'),
(30, 'Casual Sleeveless', 32.00, 'allproduct/girl/g13.jpg', FALSE, 'girls-collection', 'tops'),
(31, 'Full sleeve dress', 32.00, 'allproduct/girl/g14.jpg', FALSE, 'girls-collection', 'dresses'),
(32, 'Rainbow dress', 32.00, 'allproduct/girl/g15.jpg', FALSE, 'girls-collection', 'dresses'),
(33, 'Plush Giraffe Toy', 15.50, 'allproduct/3.jpg', TRUE, 'toys', 'plush'),
(34, 'Wooden Teething Ring', 9.99, 'allproduct/8.jpg', TRUE, 'toys', 'teething'),
(35, 'Story Book Set', 22.50, 'allproduct/9.jpg', FALSE, 'toys', 'educational'),
(36, 'hexahedron pat drum', 22.50, 'allproduct/toys/t11.jpg', FALSE, 'toys', 'musical'),
(37, 'Baby Rattles', 22.50, 'allproduct/toys/t22.jpg', FALSE, 'toys', 'teething'),
(38, 'Ride-On Toys', 22.50, 'allproduct/toys/t3.jpg', FALSE, 'toys', 'outdoor'),
(39, 'Teddy bear purple', 22.50, 'allproduct/toys/t4.jpg', FALSE, 'toys', 'plush'),
(40, 'Unicorn gift toy', 22.50, 'allproduct/toys/t5.jpg', FALSE, 'toys', 'plush'),
(41, 'Roll Electric Guita', 22.50, 'allproduct/toys/t6.jpg', FALSE, 'toys', 'musical'),
(42, 'Drum set', 22.50, 'allproduct/toys/t7.jpg', FALSE, 'toys', 'musical'),
(43, 'Telephone game', 22.50, 'allproduct/toys/t8.jpg', FALSE, 'toys', 'educational'),
(44, 'Barbie toy', 22.50, 'allproduct/toys/t9.jpg', FALSE, 'toys', 'plush'),
(45, 'Train toy', 22.50, 'allproduct/toys/t10.jpg', FALSE, 'toys', 'educational'),
(46, 'Pop it toy', 22.50, 'allproduct/toys/t12.jpg', FALSE, 'toys', 'educational'),
(47, 'Ball', 22.50, 'allproduct/toys/t13.jpg', FALSE, 'toys', 'outdoor'),
(48, 'grassping sets', 22.50, 'allproduct/toys/t14.jpg', FALSE, 'toys', 'teething'),
(49, 'Silicone Bib Set', 14.99, 'allproduct/10.jpg', FALSE, 'feeding-nursing', 'bibs'),
(50, 'Bottle Warmer', 45.00, 'allproduct/12.jpg', FALSE, 'feeding-nursing', 'warmers'),
(51, 'Fresh fruit feeder', 45.00, 'allproduct/feed/f1.jpg', FALSE, 'feeding-nursing', 'solidfood'),
(52, 'Baby Feeding Bottle', 45.00, 'allproduct/feed/f2.jpg', FALSE, 'feeding-nursing', 'bottles'),
(53, 'Baby Essentials', 45.00, 'allproduct/feed/f3.jpg', FALSE, 'feeding-nursing', 'solidfood'),
(54, 'Cup & spoons', 45.00, 'allproduct/feed/f4.jpg', FALSE, 'feeding-nursing', 'solidfood'),
(55, 'Bamboo dinnerwear set', 45.00, 'allproduct/feed/f5.jpg', FALSE, 'feeding-nursing', 'solidfood'),
(56, 'Breast pumb', 45.00, 'allproduct/feed/f6.jpg', FALSE, 'feeding-nursing', 'pumps'),
(57, 'Modern Baby Crib', 299.99, 'allproduct/14.jpg', TRUE, 'furniture', 'cribs'),
(58, 'Changing Table', 179.50, 'allproduct/13.jpg', FALSE, 'furniture', 'changing'),
(59, 'Changing Table with Drawers', 199.50, 'allproduct/fu1.jpg', FALSE, 'furniture', 'changing'),
(60, 'Baby Dresser', 250.00, 'allproduct/13.jpg', FALSE, 'furniture', 'dressers'),
(61, 'Glider Chair', 150.00, 'allproduct/14.jpg', FALSE, 'furniture', 'gliders'),
(62, 'Toy Storage Bin', 45.00, 'allproduct/13.jpg', FALSE, 'furniture', 'storage'),
(63, 'Convertible Crib', 350.00, 'allproduct/14.jpg', FALSE, 'furniture', 'cribs'),
(64, 'Nursery Bookshelf', 90.00, 'allproduct/13.jpg', FALSE, 'furniture', 'storage'),
(65, 'Soft Baby Blanket', 35.00, 'allproduct/15.jpg', FALSE, 'essentials', NULL),
(66, 'Hooded Bath Towel', 28.00, 'allproduct/16.jpg', FALSE, 'essentials', NULL),
(67, 'Ergonomic Baby Carrier', 89.99, 'allproduct/17.jpg', FALSE, 'essentials', NULL),
(68, 'Ergonomic Baby Carrier', 89.99, 'allproduct/17.jpg', FALSE, 'essentials', NULL);