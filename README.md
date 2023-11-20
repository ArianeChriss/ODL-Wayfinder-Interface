# Wayfinder
## Basic operation
### Connecting to the Wayfinder (static IP)
After switching on the unit, connect it to the computer via the ethernet port or adapter. Open the Terminal (Mac) or Command Prompt (PC) application and enter:

`ssh wayfinder@[unit IP address]`

and enter password `wayfinder` when prompted
### Starting the interface
Run:

`sudo python /home/fastapi_start.py`

Leaving the command line window open, open a browser and enter `[unit IP address]:8080` as URL. You should see an interface similar to the one below:

![main_081123](https://github.com/ocean-discovery-league/wayfinder/assets/45075120/ea607fa2-cf56-4718-a556-d605d5a4e03a)

### Using the interface
#### Connecting to bluetooth modules
Click Bluetooth Options. The Wayfinder will begin a scan for all nearby Bluetooth-enabled devices.

![bluetooth](https://github.com/ocean-discovery-league/wayfinder/assets/45075120/6ea21c6f-3346-4a28-9511-b1b0e526ae2d)


When the scan is complete, the heading will change and any available devices will be listed. To pair, select a device and click Connect. To ensure a successful connection, wait a few seconds and click Check Device Connections. If paired successfully, the listed address of the selected device will be present in the returned string of listed connections, and the window can be closed.
#### Creating/starting a mission
Missions are customized through a drag-and-drop interface. To make a new mission, click the Choose/Create Mission button on the top right, and select Create New Mission.

![programming](https://github.com/ocean-discovery-league/wayfinder/assets/45075120/16a1f345-0150-4610-aba1-b60e07f819ea)

Add a title using alphanumeric characters and a total duration for the mission. Then drag and drop sensor elements from the right onto the timeline, and customize the precise start and end times within the overall duration at the bottom. To edit a previously created element, click on it and change the times. The element will stretch or shrink to fit the entered timeline. When finished, click Save.

To run a mission, open the Choose/Create Mission menu again, select your desired mission, and click run. To stop the mission, click the Stop Mission button located in the same spot.
#### Starting a sensor
To start both data recording to a .csv file and live readout of sensor data independent of a mission, click the Enable button next to the desired sensor. To shut down the sensor, click disable.

> [!WARNING]
> All sensors MUST be disabled prior to downloading data. If a sensor is still enabled, the data may be downloaded as a blank file.

> [!WARNING]
> Bluetooth sensor must be connected before collecting conductivity data.

#### Downloading
Click Download Data on the top right, and select the desired files. All files are organized according to date and time program is started, then date and time data recording begins. Multiple files can be downloaded at once. If downloading large video files, the download will be slow. If the progress bar shows progress initialization, the download has started.

![data_download](https://github.com/ocean-discovery-league/wayfinder/assets/45075120/6324ac55-97ff-424b-b1f5-d7249be9953b)


> [!WARNING]
> The progress bar tends to get stuck at different points depending on window size. This does NOT mean that the download progress has stopped - if you wait, the process should still complete.

## Setting up a new SD card
### Flashing a new operating system
### Connecting to the Wayfinder (unknown IP)
### Packages to install
### Files
### Setting a static IP
## Bugs
