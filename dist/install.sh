#!/bin/bash

# Define the installation directory
INSTALL_DIR="/usr/local/bin"

# Define the name of the executable
EXECUTABLE_NAME="now"

# Function to install Deno
install_deno() {
  echo "Deno is not installed. Installing Deno..."
  curl -fsSL https://deno.land/x/install/install.sh | sh
  # Move Deno binary to /usr/local/bin
  sudo mv "$HOME/.deno/bin/deno" "$INSTALL_DIR/deno"
  # Add Deno to the PATH for bash
  if [ -n "$BASH_VERSION" ]; then
    echo 'export DENO_INSTALL="$HOME/.deno"' >> ~/.bashrc
    echo 'export PATH="$DENO_INSTALL/bin:$PATH"' >> ~/.bashrc
    source ~/.bashrc
  fi
  # Add Deno to the PATH for zsh
  if [ -n "$ZSH_VERSION" ]; then
    echo 'export DENO_INSTALL="$HOME/.deno"' >> ~/.zshrc
    echo 'export PATH="$DENO_INSTALL/bin:$PATH"' >> ~/.zshrc
    source ~/.zshrc
  fi
}

# Check if Deno is installed
if ! command -v deno &> /dev/null; then
  install_deno
else
  echo "Deno is already installed."
fi

# Download the bundled JavaScript file to a temporary location
TEMP_FILE=$(mktemp)
curl -o "$TEMP_FILE" https://raw.githubusercontent.com/shanberg/now/main/dist/bundle.js

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
