# FarmHand

A free, versatile scouting app for FIRST Robotics Competition (FRC) teams. FarmHand makes it easy to collect, organize, and share match data with customizable schemas and seamless QR code integration.

![FarmHand Screenshot](screenshots/HomePage.png)

## What is FarmHand?

FarmHand is a cross-platform scouting application designed to help FRC teams efficiently collect and manage match data during competitions. Whether you're a veteran team or just starting out, FarmHand provides the tools you need to scout effectively.

### Key Features

- **Customizable Schemas**: Create and edit scouting forms tailored to your team's needs
- **QR Code Sharing**: Transfer match data between devices instantly using QR codes
- **Multi-Device Support**: Coordinate multiple scouts with device IDs
- **Data Management**: Archive completed matches and export data for analysis
- **Themes**: Customize the app's appearance with multiple built-in themes
- **Cross-Platform**: Works on desktop (Windows, macOS, Linux) and mobile (iOS, Android)

## Download

Download the latest release of FarmHand for your platform:

**[📦 Download FarmHand from GitHub Releases](https://github.com/Team3655/FarmHand/releases)**

Available for:

- **Windows** - MSI installer or portable EXE
- **Android** - APK file
- **Linux** - AppImage, `.deb`, or `.rpm`
- **macOS** - Coming soon

On Linux, the **AppImage** is the one to grab if you are unsure: it carries its own
WebKit and media libraries, so it runs on any distro without installing anything. Mark it
executable first (`chmod +x farmhand-*.AppImage`), then run it. The `.deb` and `.rpm` are
much smaller but rely on your distro providing WebKitGTK 4.1 (Ubuntu 22.04+, Debian 12+,
Fedora 36+).

## Getting Started

### Prerequisites

- [Tauri](https://v2.tauri.app/start/prerequisites) (contains instructions for all other prerequisites)
- [Git](https://git-scm.com/downloads)

For mobile development:

- **iOS**: Xcode and CocoaPods (Only on MacOS)
- **Android**: Android Studio and Android SDK

On **Linux**, Tauri needs system libraries that are not installed by default. On Debian
or Ubuntu:

```shell
sudo apt update
sudo apt install libwebkit2gtk-4.1-dev build-essential curl wget file \
  libxdo-dev libssl-dev libayatana-appindicator3-dev librsvg2-dev
```

See the [Tauri prerequisites page](https://v2.tauri.app/start/prerequisites/) for the
Arch and Fedora equivalents.

### Building Locally

1. **Clone the repository:**

   ```shell
   git clone https://github.com/your-username/FarmHand.git
   cd FarmHand
   ```

2. **Install dependencies:**

   ```shell
   npm install
   ```

3. **Start the development server:**

   ```shell
   npm run start
   ```

   This will open the app in a window (desktop) and launch the development build at `localhost:1420`

   For mobile development:

   ```shell
   npm run start-ios      # For iOS
   npm run start-android  # For Android
   ```

4. **Build for production:**
   ```shell
   npm run build
   npm run tauri build
   ```

## How to Use FarmHand

### First Time Setup

1. Open **Settings** from the navigation menu
2. Set your **Device ID** A unique id for each device your team will use for scouting. (Usually 1-6)
3. Enable **"Lead scout only"** if this device will only collect and export data
4. Select your **scouting schema** (e.g., "2025 Reefscape")
5. Configure the total number of scout devices your team is using

![Settings Screenshot](screenshots/DeviceSettings.png) 

### Scouting a Match

1. Navigate to the **Scout** page
2. Fill out the form fields according to your schema
3. Save the match data
4. Generate a QR code to share with other devices

![Scouting Screenshot](screenshots/ScoutPage.png)

### Managing Data

- **Dashboard**: View and manage your current match data
- **QR Codes**: Scan or generate QR codes to transfer data between devices
- **Archive**: Access completed matches for long-term storage
- **Schemas**: Create and edit custom scouting schemas in Settings

![Dashboard Screenshot](screenshots/DashboardPage.png) 

For more detailed instructions, check out the **Help** page within the app!

## Troubleshooting

### Linux: the window opens blank or black

WebKitGTK's DMA-BUF renderer misbehaves on some NVIDIA drivers and Wayland sessions.
Launch with the renderer disabled:

```shell
WEBKIT_DISABLE_DMABUF_RENDERER=1 ./farmhand-*.AppImage
```

### Linux: the QR scanner cannot see the camera

First confirm the camera works elsewhere (`cheese`, or a browser). If it does but
FarmHand's scanner reports no camera, try forcing an X11 session — WebKitGTK's media
capture is unreliable on some Wayland compositors:

```shell
GDK_BACKEND=x11 ./farmhand-*.AppImage
```

If you installed the `.deb` or `.rpm` and the camera still does not appear, your distro's
WebKitGTK may have been built without media-stream support. The AppImage bundles its own
media stack and is the reliable option in that case.

## Tech Stack

- **[React](https://reactjs.org/)** - UI framework
- **[Material-UI (MUI)](https://mui.com/)** - Component library
- **[Tauri](https://v2.tauri.app/)** - Cross-platform framework
- **[TypeScript](https://www.typescriptlang.org/)** - Type safety
- **[Vite](https://vitejs.dev/)** - Build tool

## Contributing

We welcome contributions! Please see [CONTRIBUTING.md](CONTRIBUTING.md) for guidelines on how to contribute to this project.

## Changelog

View a structured log of all the version changes to this app: [CHANGELOG.md](CHANGELOG.md)

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.
