from http.server import BaseHTTPRequestHandler, HTTPServer
import json
from urllib.parse import urlparse, parse_qs
import uuid # For generating unique order numbers
from datetime import datetime

from db_connector import DBConnector # Import your DBConnector
from mysql.connector import Error

# --- Configuration ---
# !!! REPLACE WITH YOUR ACTUAL MYSQL CREDENTIALS !!!
DB_HOST = "localhost"
DB_NAME = "tiny_twinkles"
DB_USER = "root" # e.g., "root"
DB_PASSWORD = "" # e.g., "" for XAMPP root
SERVER_PORT = 8000

# Initialize your database connector
db = DBConnector(host=DB_HOST, database=DB_NAME, user=DB_USER, password=DB_PASSWORD)
db.connect() # Connect on server startup

class SimpleAPIHandler(BaseHTTPRequestHandler):
    def _set_headers(self, status_code=200, content_type='application/json'):
        """Sets common HTTP headers for responses."""
        self.send_response(status_code)
        self.send_header('Content-type', content_type)
        # Allow CORS for frontend development (IMPORTANT for local testing)
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type, Authorization')
        self.end_headers()

    def _send_json_response(self, data, status_code=200):
        """Helper to send JSON responses."""
        self._set_headers(status_code)
        self.wfile.write(json.dumps(data, default=str).encode('utf-8')) # default=str handles datetime objects

    def _read_json_body(self):
        """Helper to read and parse JSON request body."""
        try:
            content_length = int(self.headers['Content-Length'])
            post_data = self.rfile.read(content_length)
            return json.loads(post_data.decode('utf-8'))
        except (ValueError, json.JSONDecodeError) as e:
            print(f"Error reading JSON body: {e}")
            return None

    def do_OPTIONS(self):
        """Handles CORS preflight requests."""
        self._set_headers(200)

    def do_GET(self):
        parsed_path = urlparse(self.path)
        path = parsed_path.path
        query_params = parse_qs(parsed_path.query)

        # SECURITY NOTE: In a real application, endpoints like /users and /orders
        # should be protected and require admin authentication (e.g., via JWT or session tokens).
        
        if path == '/products':
            category = query_params.get('category', [None])[0]
            subcategory = query_params.get('subcategory', [None])[0]
            featured = query_params.get('featured', [None])[0] == 'true' # Convert to boolean

            sql = "SELECT * FROM products WHERE 1=1"
            params = []
            if category:
                sql += " AND category = %s"
                params.append(category)
            if subcategory:
                sql += " AND subcategory = %s"
                params.append(subcategory)
            if featured:
                sql += " AND featured = TRUE"

            products_data = db.execute_query(sql, tuple(params), fetch_all=True)
            self._send_json_response(products_data)

        elif path == '/users':
            users_data = db.execute_query("SELECT id, name, email, created_at FROM users", fetch_all=True)
            self._send_json_response(users_data)

        elif path == '/orders':
            # OPTIMIZATION NOTE: This implementation uses a loop making N+1 queries.
            # For larger datasets, it's better to use SQL JOINs to fetch all data in one go.
            orders_data = db.execute_query("SELECT id, user_id, order_number, total, order_date, status FROM orders ORDER BY order_date DESC", fetch_all=True)
            
            for order in orders_data:
                user = db.execute_query("SELECT id, name, email FROM users WHERE id = %s", (order['user_id'],), fetch_one=True)
                order['user'] = user if user else {"name": "Unknown User", "email": "N/A"}

                items = db.execute_query("SELECT product_id, product_name, quantity, price_at_purchase, size FROM order_items WHERE order_id = %s", (order['id'],), fetch_all=True)
                order['items'] = items if items else []
            
            self._send_json_response(orders_data)

        elif path == '/wishlist':
            user_id = query_params.get('user_id', [None])[0]
            if not user_id:
                self._send_json_response({"message": "User ID is required"}, 400)
                return

            sql = """
                SELECT w.id as wishlist_item_id, p.*
                FROM wishlists w
                JOIN products p ON w.product_id = p.id
                WHERE w.user_id = %s
            """
            wishlist_items = db.execute_query(sql, (user_id,), fetch_all=True)
            self._send_json_response(wishlist_items)

        else:
            self._send_json_response({"message": "Endpoint Not Found"}, 404)

    def do_POST(self):
        path = urlparse(self.path).path
        data = self._read_json_body()

        if data is None:
            self._send_json_response({"message": "Invalid JSON body"}, 400)
            return

        if path == '/register':
            name = data.get('name')
            email = data.get('email')
            password = data.get('password')

            if not all([name, email, password]):
                self._send_json_response({"message": "Missing required fields"}, 400)
                return

            existing_user = db.execute_query("SELECT id FROM users WHERE email = %s", (email,), fetch_one=True)
            if existing_user:
                self._send_json_response({"message": "User with this email already exists"}, 409)
                return

            hashed_password = db.hash_password(password)
            user_id = db.execute_query(
                "INSERT INTO users (name, email, password_hash) VALUES (%s, %s, %s)",
                (name, email, hashed_password)
            )
            if user_id:
                self._send_json_response({"message": "User registered successfully", "user_id": user_id}, 201)
            else:
                self._send_json_response({"message": "Failed to register user"}, 500)

        elif path == '/login':
            email = data.get('email')
            password = data.get('password')

            user = db.execute_query("SELECT id, name, email, password_hash FROM users WHERE email = %s", (email,), fetch_one=True)
            if user and db.check_password(password, user['password_hash']):
                self._send_json_response({"message": "Login successful", "user": {"id": user['id'], "name": user['name'], "email": user['email']}}, 200)
            else:
                self._send_json_response({"message": "Invalid email or password"}, 401)
        
        elif path == '/admin/login':
            email = data.get('email')
            password = data.get('password')
            # NOTE: This is a basic, insecure check. A real application should query a user table
            # with roles to verify admin status.
            if email == 'admin@babybliss.com' and password == 'admin123':
                self._send_json_response({"message": "Admin login successful"}, 200)
            else:
                self._send_json_response({"message": "Invalid admin credentials"}, 401)

        elif path == '/products':
            # SECURITY NOTE: This endpoint should be protected and only accessible by admins.
            name = data.get('name')
            price = data.get('price')
            image = data.get('image')
            category = data.get('category')
            subcategory = data.get('subcategory')
            featured = data.get('featured', False)

            if not all([name, price, image, category, subcategory]):
                self._send_json_response({"message": "Missing required product fields"}, 400)
                return

            product_id = db.execute_query(
                "INSERT INTO products (name, price, image, category, subcategory, featured) VALUES (%s, %s, %s, %s, %s, %s)",
                (name, price, image, category, subcategory, featured)
            )
            if product_id:
                self._send_json_response({"message": "Product added successfully", "product_id": product_id}, 201)
            else:
                self._send_json_response({"message": "Failed to add product"}, 500)

        elif path == '/orders':
            user_id = data.get('user_id')
            items = data.get('items')
            total = data.get('total')

            if not all([user_id, items, total]):
                self._send_json_response({"message": "Missing order details"}, 400)
                return

            try:
                db.connection.start_transaction()
                order_number = str(uuid.uuid4())
                
                order_id = db.execute_query(
                    "INSERT INTO orders (user_id, order_number, total) VALUES (%s, %s, %s)",
                    (user_id, order_number, total)
                )

                if not order_id:
                    raise Exception("Failed to create order record.")

                for item in items:
                    item_inserted = db.execute_query(
                        "INSERT INTO order_items (order_id, product_id, product_name, quantity, price_at_purchase, size) VALUES (%s, %s, %s, %s, %s, %s)",
                        (order_id, item.get('id'), item.get('name'), item.get('quantity'), item.get('price'), item.get('size'))
                    )
                    if not item_inserted:
                        raise Exception(f"Failed to add item {item.get('name')} to order.")

                db.connection.commit()
                self._send_json_response({"message": "Order placed successfully", "order_id": order_id, "order_number": order_number}, 201)

            except Exception as e:
                db.connection.rollback()
                print(f"Error placing order: {e}")
                self._send_json_response({"message": f"Failed to place order: {e}"}, 500)

        elif path == '/wishlist':
            user_id = data.get('user_id')
            product_id = data.get('product_id')

            if not all([user_id, product_id]):
                self._send_json_response({"message": "Missing user_id or product_id"}, 400)
                return

            try:
                wishlist_id = db.execute_query(
                    "INSERT INTO wishlists (user_id, product_id) VALUES (%s, %s)",
                    (user_id, product_id)
                )
                self._send_json_response({"message": "Product added to wishlist", "wishlist_id": wishlist_id}, 201)
            except Error as e:
                if "Duplicate entry" in str(e):
                    self._send_json_response({"message": "Product already in wishlist"}, 409)
                else:
                    print(f"Error adding to wishlist: {e}")
                    self._send_json_response({"message": f"Failed to add to wishlist: {e}"}, 500)
        else:
            self._send_json_response({"message": "Endpoint Not Found"}, 404)

    def do_PUT(self):
        parsed_path = urlparse(self.path)
        path = parsed_path.path
        data = self._read_json_body()

        if data is None:
            self._send_json_response({"message": "Invalid JSON body"}, 400)
            return

        # SECURITY NOTE: This endpoint should be protected and only accessible by admins.
        if path.startswith('/products/'):
            product_id_str = path.split('/')[-1]
            if not product_id_str.isdigit():
                self._send_json_response({"message": "Invalid product ID"}, 400)
                return
            product_id = int(product_id_str)

            updates = []
            params = []
            allowed_fields = ['name', 'price', 'image', 'category', 'subcategory', 'featured']
            for key, value in data.items():
                if key in allowed_fields:
                    updates.append(f"{key} = %s")
                    params.append(value)
            
            if not updates:
                self._send_json_response({"message": "No valid fields to update"}, 400)
                return

            sql = f"UPDATE products SET {', '.join(updates)} WHERE id = %s"
            params.append(product_id)

            rows_affected = db.execute_query(sql, tuple(params))
            if rows_affected is not None and rows_affected > 0:
                self._send_json_response({"message": "Product updated successfully"}, 200)
            else:
                self._send_json_response({"message": "Product not found or no changes made"}, 404)
        else:
            self._send_json_response({"message": "Endpoint Not Found"}, 404)

    def do_DELETE(self):
        parsed_path = urlparse(self.path)
        path = parsed_path.path

        if path.startswith('/products/'):
            # SECURITY NOTE: This endpoint should be protected and only accessible by admins.
            product_id_str = path.split('/')[-1]
            if not product_id_str.isdigit():
                self._send_json_response({"message": "Invalid product ID"}, 400)
                return
            product_id = int(product_id_str)

            rows_affected = db.execute_query("DELETE FROM products WHERE id = %s", (product_id,))
            if rows_affected is not None and rows_affected > 0:
                self._send_json_response({"message": "Product deleted successfully"}, 200)
            else:
                self._send_json_response({"message": "Product not found"}, 404)

        elif path.startswith('/wishlist/'):
            parts = path.split('/')
            if len(parts) == 4 and parts[2].isdigit() and parts[3].isdigit():
                user_id = int(parts[2])
                product_id = int(parts[3])
                rows_affected = db.execute_query(
                    "DELETE FROM wishlists WHERE user_id = %s AND product_id = %s",
                    (user_id, product_id)
                )
                if rows_affected is not None and rows_affected > 0:
                    self._send_json_response({"message": "Product removed from wishlist"}, 200)
                else:
                    self._send_json_response({"message": "Item not found in wishlist"}, 404)
            else:
                self._send_json_response({"message": "Invalid wishlist delete path. Use /wishlist/USER_ID/PRODUCT_ID"}, 400)
        else:
            self._send_json_response({"message": "Endpoint Not Found"}, 404)


def run_server(server_class=HTTPServer, handler_class=SimpleAPIHandler, port=SERVER_PORT):
    server_address = ('', port)
    httpd = server_class(server_address, handler_class)
    print(f"Starting Tiny Twinkles Backend API on port {port}")
    print("Press Ctrl+C to stop the server.")
    try:
        httpd.serve_forever()
    except KeyboardInterrupt:
        print("\nShutting down server...")
    finally:
        httpd.server_close()
        db.close()
        print("Server stopped.")

if __name__ == '__main__':
    run_server()