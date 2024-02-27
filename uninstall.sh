#!/bin/bash

# Service file name
SERVICE_FILE="spaceona.service"

# Check if root privileges are available
if [[ $EUID -ne 0 ]]; then
  echo "This script requires root privileges. Please run with sudo."
  exit 1
fi

# Stop and disable the service
systemctl stop "$SERVICE_FILE"
systemctl disable "$SERVICE_FILE"

# Remove the service file
rm -f "/etc/systemd/system/$SERVICE_FILE"

# Reload systemd
systemctl daemon-reload

# Success message
echo "Spaceona service successfully disabled"

echo "You may need to manually stop and remove the service from the system."

