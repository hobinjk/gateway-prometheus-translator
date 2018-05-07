#!/bin/bash

npm install

# Create the service file needed by systemctl
sudo sh -c 'cat > /etc/systemd/system/mozilla-iot-gateway-prometheus-translator.service' <<END
[Unit]
Description=Mozilla IoT Gateway to Prometheus Translator
After=network.target

[Service]
Type=simple
StandardOutput=journal
StandardError=journal
User=pi
WorkingDirectory=$(pwd)
# Edit this line, if needed, to set the correct path to node
ExecStart=$(pwd)/translator.sh
Restart=always
RestartSec=5s

[Install]
WantedBy=multi-user.target
END

sudo systemctl enable mozilla-iot-gateway-prometheus-translator
sudo systemctl start mozilla-iot-gateway-prometheus-translator

echo "Done! You can now access your translated metrics at http://gateway.local:3060 or http://localhost:3060"
echo "Make sure you've already added your URL and JWT to translator.js"
