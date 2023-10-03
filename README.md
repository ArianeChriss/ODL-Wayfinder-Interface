# Wayfinder
## Basic operation
### Connecting to the Wayfinder (static IP)
After switching on the unit, connect it to the computer via the ethernet port or adapter. Open the Terminal (Mac) or Command Prompt (PC) application and enter:

`ssh wayfinder@[unit IP address]`

and enter password `wayfinder` when prompted
### Starting the interface
Run:

`sudo python /home/fastapi_start.py`

Leaving the command line window open, open a browser and enter `[unit IP address]:8080` as URL
### Using the interface
#### Connecting to bluetooth modules
Click Bluetooth Options. The Wayfinder will begin a scan for all nearby Bluetooth-enabled devices. When the scan is complete, the heading will change and any available devices will be listed. To pair, select a device and click Connect. To ensure a successful connection, wait a few seconds and click Check Device Connections. If paired successfully, the listed address of the selected device will be present in the returned string of listed connections, and the window can be closed.
#### Creating/starting a mission
#### Starting a sensor
To start both data recording to a .csv file and live readout of sensor data, click the Enable button next to the desired sensor. To shut down the sensor, click disable.

> [!WARNING]
> All sensors MUST be disabled prior to downloading data. If a sensor is still enabled, the data may be downloaded as a blank file.

#### Downloading
## Setting up a new SD card
### Flashing a new operating system
### Connecting to the Wayfinder (unknown IP)
### Packages to install
### Files
### Setting a static IP
## Bugs
