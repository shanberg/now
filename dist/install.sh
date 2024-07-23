#!/bin/bash

# Define the installation directory
INSTALL_DIR="/usr/local/bin"

# Define the name of the executable
EXECUTABLE_NAME="focus-md"

# Download the bundled JavaScript file to a temporary location
TEMP_FILE=$(mktemp)
curl -o "$TEMP_FILE" https://your-server.com/path/to/bundle.js

# Ensure the installation directory exists
sudo mkdir -p "$INSTALL_DIR"

# Move the bundled JavaScript file to the installation directory
sudo mv "$TEMP_FILE" "$INSTALL_DIR/$EXECUTABLE_NAME.js"

# Create a wrapper script to run the application with Deno
WRAPPER_SCRIPT="$INSTALL_DIR/$EXECUTABLE_NAME"
sudo tee "$WRAPPER_SCRIPT" > /dev/null <<EOL
#!/bin/bash
deno run --allow-read --allow-write "$INSTALL_DIR/$EXECUTABLE_NAME.js" "\$@"
EOL

# Make the wrapper script executable
sudo chmod +x "$WRAPPER_SCRIPT"

# Clean up the temporary file if it still exists
[ -f "$TEMP_FILE" ] && rm "$TEMP_FILE"

echo "Installation complete. You can now run the application using the command: $EXECUTABLE_NAME"