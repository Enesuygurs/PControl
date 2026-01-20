# PControl - Ultimate PC Dashboard

PControl is a highly advanced, cyber-themed Next.js dashboard that allows you to remotely control, monitor, and manage your Windows PC directly from your mobile device. Built with a sleek, responsive design and leveraging direct PowerShell integrations, PControl acts as your personal command center.

### ✨ Features

*   **Real-time System Monitoring**: Live CPU, Memory, Disk, Battery, and Wi-Fi signal status.
*   **Precision Touchpad & Keyboard**: Use your phone screen as a wireless mouse and keyboard.
*   **Advanced Audio Routing**: Instantly switch output audio devices (e.g., Speakers to Headset) with zero latency.
*   **Media & Power Controls**: Play/pause media, adjust volume, and execute power actions (Sleep, Shutdown, Restart).
*   **System Interactions**: Push URLs, send sticky notes to the screen, sync clipboards, and capture live screenshots.
*   **Tailscale Ready**: Optimized IP detection for seamless, secure remote access over Tailscale VPN networks.

### 🖼️ Screenshots

#### Image 1


#### Image 2


### 💻 Installation

1. Clone the repository:
   ```bash
   git clone https://github.com/Enesuygurs/pcontrol.git
   cd pcontrol
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

### 🚀 Usage

1. Start the application:
   ```bash
   npm run dev
   ```

2. **Connect**: Ensure your phone and PC are on the same local network (or connected via Tailscale). Scan the QR Code on the dashboard or navigate to `http://<YOUR-PC-IP>:3000` from your mobile device.

### 📜 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.
