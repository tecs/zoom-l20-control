# zoom-l20-control

A web app that controls a **Zoom LiveTrak L-20** digital mixer equipped with a **BTA-1** Bluetooth adapter.

This is an open-source alternative to Zoom's own **L-20 Control App** iPad app.

> Not affiliated with or endorsed by the Zoom Corporation.
> This project contains no code or assets from Zoom's app.

## Features

Everything the iPad app can control:

- **Channel strips** - mute, solo, pan, 3-band EQ and bypass, low cut, phase, FX sends, record arm
- **Mixes** - switch between the master and monitor mixes (A to F) and set each channel's send level
- **FX** - configure type and parameters for both effect processors
- **Scenes** - save and recall
- **Recorder transport** - play, stop, record, rewind/fast forward, overdub (needs an SD card in the mixer), tap tempo
- **15-band graphic EQ** on the master output
- **Live meters** for the selected mix
- **Two-way sync** - moving a control on the mixer updates the page, and vice versa
- **Auto-reconnect** to the last mixer if the browser supports it
- Keeps the screen awake while connected, if the browser allows it

Some settings are not sent over Bluetooth at all, and can only be controlled physically:

- Analog gain
- Compressor
- +48V phantom power
- Pad
- Talkback (SLATE)
- USB audio return switches
- Monitor source switches
- Phones/speaker switch

## Project status

- **Not yet decoded:**
  - Recorder's file browser (folders, markers, remaining time, file format)
  - Menu settings
  - Several control messages and bytes in the state dump
- **Known issues:**
  - Reconnecting right after a dropped connection can sometimes fail - retrying fixes it
  - Slight control update lag on Linux
  - Dragging a fader on a touch screen can scroll the page instead
- **Planned:**
  - Relay server, so several devices can control one mixer at the same time. This also removes any platform/browser specific requirements
  - Import/export any part of the mixer state
  - Various features that extend the mixer's functionality beyond its hardware capabilites
  - UI/UX improvements

## Requirements

- A Zoom LiveTrak **L-20** with a **BTA-1** adapter
- A browser with **Web Bluetooth**, which means a Chromium-based one:
  | Platform     | Browser                 | Setup needed                         |
  | ------------ | ----------------------- | ------------------------------------ |
  | macOS        | Chrome, Edge, Brave     | None                                 |
  | Linux        | Chrome, Chromium, Brave | Yes, see [Linux setup](#linux-setup) |
  | Android      | Chrome                  | Page must be served over HTTPS       |
  | iOS / iPadOS | [Bluefy][bluefy] (free) | Page must be served over HTTPS       |
  | Windows      | Chrome, Edge            | Probably none - not tested           |
- The page must come from `https://` or `http://localhost`
- Only one device can connect to the mixer at a time
- **Don't pair the mixer** in the system's Bluetooth settings

> NOTE: To run/build from source, Node 22.18 or newer is also required

[bluefy]: https://apps.apple.com/us/app/bluefy-web-ble-browser/id1492822055

## Running

```bash
npm ci
npm run dev
```

Then open the URL in a supported browser, click **Connect** and pick the **L-20** from the list.

To build a static copy that can be hosted anywhere over HTTPS:

```bash
npm run build      # writes static files to dist/
npm run preview    # serves locally
```

### Phones and tablets

To view on a phones or a tablet, the client must be served over HTTPS. The easiest way is a tunnel to the dev server, e.g a VS Code port forward, `cloudflared` or `ngrok`.

### Linux setup

1. **Ensure BlueZ is installed and running:**
   ```bash
   sudo systemctl enable --now bluetooth
   bluetoothctl show     # should read: Powered: yes
   ```
2. **Stop BlueZ from claiming the mixer's Bluetooth MIDI service.**
   BlueZ's built-in `midi` plugin takes that service for itself and blocks the browser from writing to it.

   > **WARNING:** This makes all Bluetooth MIDI devices lose their system MIDI port on the machine (USB MIDI devices unaffected)

   Turn the plugin off:

   ```bash
   sudo mkdir -p /etc/systemd/system/bluetooth.service.d
   sudo tee /etc/systemd/system/bluetooth.service.d/10-no-midi-plugin.conf >/dev/null <<'EOF'
   [Service]
   ExecStart=
   ExecStart=/usr/lib/bluetooth/bluetoothd -P midi
   EOF
   sudo systemctl daemon-reload && sudo systemctl restart bluetooth
   ```

   The path to `bluetoothd` can differ between distributions - check with `systemctl cat bluetooth`.

3. **Turn on Web Bluetooth in the browser:**
   - `chrome://flags/#enable-experimental-web-platform-features` set to **Enabled**
   - Brave also needs `brave://flags/#brave-web-bluetooth-api`
   - relaunch the browser
