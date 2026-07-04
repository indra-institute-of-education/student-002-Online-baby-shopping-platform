import mysql.connector
from mysql.connector import Error
import bcrypt # For password hashing

class DBConnector:
    def __init__(self, host, database, user, password):
        self.host = host
        self.database = database
        self.user = user
        self.password = password
        self.connection = None

    def connect(self):
        """Establishes a connection to the MySQL database."""
        try:
            self.connection = mysql.connector.connect(
                host=self.host,
                database=self.database,
                user=self.user,
                password=self.password
            )
            if self.connection.is_connected():
                print("Successfully connected to MySQL database")
                return True
        except Error as e:
            print(f"Error connecting to MySQL database: {e}")
            self.connection = None
            return False

    def close(self):
        """Closes the database connection."""
        if self.connection and self.connection.is_connected():
            self.connection.close()
            print("MySQL connection closed")

    def execute_query(self, query, params=None, fetch_one=False, fetch_all=False):
        """
        Executes a SQL query.
        Returns:
            - lastrowid for INSERT queries.
            - rowcount for UPDATE/DELETE queries.
            - fetched data for SELECT queries (list of dicts or single dict).
            - None on error.
        """
        if not self.connection or not self.connection.is_connected():
            if not self.connect(): # Attempt to reconnect
                return None

        cursor = self.connection.cursor(dictionary=True) # Return results as dictionaries
        try:
            cursor.execute(query, params or ()) # Use empty tuple if no params
            if query.strip().upper().startswith(('INSERT', 'UPDATE', 'DELETE')):
                self.connection.commit()
                return cursor.lastrowid if query.strip().upper().startswith('INSERT') else cursor.rowcount
            elif fetch_one:
                return cursor.fetchone()
            elif fetch_all:
                return cursor.fetchall()
            else:
                return None # For queries that don't return data (e.g., DDL)
        except Error as e:
            self.connection.rollback() # Rollback changes on error
            print(f"Error executing query: {e}")
            return None
        finally:
            cursor.close()

    def hash_password(self, password):
        """Hashes a password using bcrypt."""
        return bcrypt.hashpw(password.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')

    def check_password(self, password, hashed_password):
        """Checks a password against a hashed password."""
        return bcrypt.checkpw(password.encode('utf-8'), hashed_password.encode('utf-8'))

# Example Usage (for testing db_connector.py directly)
if __name__ == "__main__":
    # !!! REPLACE WITH YOUR ACTUAL MYSQL CREDENTIALS !!!
    DB_HOST = "localhost"
    DB_NAME = "tiny_twinkles"
    DB_USER = "root" # e.g., "root"
    DB_PASSWORD = "" # e.g., "" for XAMPP root

    db = DBConnector(host=DB_HOST, database=DB_NAME, user=DB_USER, password=DB_PASSWORD)
    db.connect()

    # Test User Registration
    test_email = "test_user@example.com"
    existing_user = db.execute_query("SELECT id FROM users WHERE email = %s", (test_email,), fetch_one=True)
    if not existing_user:
        hashed_pw = db.hash_password("securepass123")
        user_id = db.execute_query(
            "INSERT INTO users (name, email, password_hash) VALUES (%s, %s, %s)",
            ("Test User", test_email, hashed_pw)
        )
        if user_id:
            print(f"Test user added with ID: {user_id}")
    else:
        print(f"Test user '{test_email}' already exists.")

    # Test Login
    user_data = db.execute_query("SELECT id, name, email, password_hash FROM users WHERE email = %s", (test_email,), fetch_one=True)
    if user_data and db.check_password("securepass123", user_data['password_hash']):
        print(f"Login successful for {user_data['name']}")
    else:
        print("Login failed for test user.")

    # Test Fetch Products
    products = db.execute_query("SELECT * FROM products LIMIT 3", fetch_all=True)
    print("\nSample Products:", products)

    db.close()
