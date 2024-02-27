#!/bin/bash

# Service file name and destination directory
SERVICE_FILE="spaceona.service"
DEST_DIR="/etc/systemd/system/"

# Check if root privileges are available
if [[ $EUID -ne 0 ]]; then
  echo "This script requires root privileges. Please run with sudo."
  exit 1
fi

# Copy service file
cp -f "$SERVICE_FILE" "$DEST_DIR"

# Reload systemd and enable/start the service
systemctl daemon-reload
systemctl enable "$SERVICE_FILE"
systemctl start "$SERVICE_FILE"

# Success message
echo "Spaceona service installed and started successfully!"
