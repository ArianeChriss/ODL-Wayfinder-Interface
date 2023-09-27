#!/usr/bin/python
import sys
import os
import time
import math
import board
import busio
import adafruit_icm20x
import datetime
import time
import shutil
from digitalio import DigitalInOut, Direction, Pull
import adafruit_rfm9x
import ms5837
import smbus
import subprocess
from picamera2 import Picamera2
from picamera2.encoders import H264Encoder
from picamera2.outputs import FileOutput
import serial
import csv
import wiringpi

#GLOBAL VARIABLE

#-----------MODIFY HERE-------------
recording_secs = 300 # seconds of recording per video file before switching to new one, currently 5min
min_remaining_space = 8589934592 # amount of space on disk required for another video segment to be recorded, currently 8GB
#-----------------------------------

class DataException(Exception):
	def __init__(self, sensor):
		self.message = "error getting data from " + sensor
		super().__init__(self.message)

def motor_move(location):
	wiringpi.wiringPiSetupGpio()
	# set #18 to be a PWM output
	wiringpi.pinMode(18, wiringpi.GPIO.PWM_OUTPUT)
	# set the PWM mode to milliseconds stype
	wiringpi.pwmSetMode(wiringpi.GPIO.PWM_MODE_MS)
	# divide down clock
	wiringpi.pwmSetClock(192)
	wiringpi.pwmSetRange(2000)
	wiringpi.pwmWrite(18, location)

def record_camera(checker, sensor, camera, file_encoder, lores_stream, trial_path):
	try:
		camera_start = 0
		active = False
		while checker["camera"]:
			if (shutil.disk_usage('/').free > min_remaining_space and time.time() - camera_start > recording_secs):
				try:
					if (os.path.exists(trial_path) == False):
						os.mkdir(trial_path)
					if (os.path.exists(trial_path+"Videos/") == False):
						os.mkdir(trial_path+"Videos/")
					if active == True:
						file_encoder.stop()
						active = False
					active = True
					print("triggering new file start")
					file_encoder.output = FileOutput(trial_path + "Videos/vid_"+str(time.strftime("%Y%m%d-%H%M%S"))+".h264")
					file_encoder.start()
					camera_start = time.time()
					#sensor = { 'camera' : True }
					sensor['camera'] = True
				except Exception as e:
					print(e)
					if active == True:
						active = False
						file_encoder.stop()
					if 'camera' in sensor.keys():
						sensor.pop('camera')
					print("exception1")
					raise DataException("camera")
			else:
				request = camera.capture_request()
				file_encoder.encode(lores_stream, request)
				request.release()
		active = False
		file_encoder.stop()
		print("stopping camera")
		if 'camera' in sensor.keys():
			sensor.pop('camera')
		return
	except Exception as e:
		print(e)
		if active == True:
			active = False
			file_encoder.stop()
		if 'camera' in sensor.keys():
			sensor.pop('camera')
		print("exception2")
		raise DataException("camera")

def get_sonar(checker, sensor, trial_path):
	""" get sonar value transmtted by Lora module RFM9X pair required on tranmismitter and receiver end 
	# Required packages:
	#  pip install adafruit-circuitpython-rfm9x
	"""
   
	# Configure RFM9x LoRa Radio
	CS = DigitalInOut(board.CE1)
	RESET = DigitalInOut(board.D25)
	spi = busio.SPI(board.SCK, MOSI=board.MOSI, MISO=board.MISO)

	try:
			if checker["sonar"]:
				# Attempt to set up the RFM9x module
				try:
					rfm9x = adafruit_rfm9x.RFM9x(spi, CS, RESET, 915.0)
					print('RFM9x detected')
				except RuntimeError:
					if 'sonar_depth' in sensor.keys():
						sensor.pop('sonar_depth')
					if 'sonar_confi' in sensor.keys():
						sensor.pop('sonar_confi')
					raise DataException("sonar")
				nameCSV_sonar = trial_path + 'sonarFile_' + str(time.strftime("%Y%m%d-%H%M%S")) + '.csv'
				sonar_file = open(nameCSV_sonar, mode='a')    #added by Jess 01/31/2023
				sonar_writer = csv.writer(sonar_file, delimiter=',', quotechar='"', quoting=csv.QUOTE_MINIMAL)          #added by Jess 01/31/2023
				sonar_writer.writerow(["Date/Time", "Distance (m)", "Confidence (%)"])
				while checker["sonar"]:
					try:
						packet = None
						packet = rfm9x.receive()
						if packet != None:
							#print("Received:",  str(packet)
							# Split packet
							from_addr = packet[0]
							to_addr = packet[1]
							depth = int.from_bytes(packet[2:4], byteorder='little') #/ 10.0
							confi = int.from_bytes(packet[4:6], byteorder='little') / 10.0
							pres = int.from_bytes(packet[6:8], byteorder='little') / 10.0
							print("Sonar Distance:", depth/1000, "m")
							print("Sonar Confidence:", confi, "%")
							# sensor = { 'sonar_depth': depth/1000,
										# 'sonar_confi': confi}
							sensor['sonar_depth'] = depth/1000
							sensor['sonar_confi'] = confi
							sonar_writer.writerow([datetime.datetime.now(), depth])
						else:
							print("no sonar info received")
						time.sleep(1)
					except:
						if 'sonar_depth' in sensor.keys():
							sensor.pop('sonar_depth')
						if 'sonar_confi' in sensor.keys():
							sensor.pop('sonar_confi')
						sonar_file.close()
						raise DataException("sonar")
				if 'sonar_depth' in sensor.keys():
					sensor.pop('sonar_depth')
				if 'sonar_confi' in sensor.keys():
					sensor.pop('sonar_confi')
				sonar_file.close()
				return
	except:
		if 'sonar_depth' in sensor.keys():
			sensor.pop('sonar_depth')
		if 'sonar_confi' in sensor.keys():
			sensor.pop('sonar_confi')
		raise DataException("sonar")

def bt_serial_grab(checker, sensor, trial_path):
	""" get data from serial bluetooth comm port.
	esp32 should be transmitting strings on the other end
	"""

	try:
			if checker["bt_serial"]:
				try:
					bluetoothSerial = serial.Serial("/dev/rfcomm0",baudrate=115200, timeout=10)
				except Exception as e:
					if 'conductivity' in sensor.keys():
						sensor.pop('conductivity')
					print(e)
					raise DataException("bluetooth")
				else:
					pass
				print("Bluetooth connected")
				nameCSV_bt = trial_path + 'condFile_' + str(time.strftime("%Y%m%d-%H%M%S")) + '.csv'
				cond_file = open(nameCSV_bt, mode='a')             #added by Jess 01/31/2023
				bt_writer = csv.writer(cond_file, delimiter=',', quotechar='"', quoting=csv.QUOTE_MINIMAL)
				bt_writer.writerow(["Date/Time", "Conductivity (ms/cm)"])
				while checker["bt_serial"]:
					try:
						data = bluetoothSerial.readline()
					except:
						print("readline exception")
						raise DataException("bluetooth readline")
					else:
						pass
					print(data)
					time.sleep(1)
					try:
						bluetoothSerial.write(data)
					except:
						print("write exception")
						raise DataException("bluetooth write")
					else:
						pass
					datas = data.decode('UTF-8')
					underscore = datas.find("_")
					sal = float(datas[underscore + 1:8])
					print(sal)
					bt_writer.writerow([datetime.datetime.now(), sal])
					# sensor = {
						   # 'conductivity': sal
						# }
					sensor['conductivity'] = sal
					#sleep for a second
					time.sleep(1)
			if 'conductivity' in sensor.keys():
				sensor.pop('conductivity')
			cond_file.close()
			return
	except KeyboardInterrupt:
		print("Quit")
		if 'conductivity' in sensor.keys():
			sensor.pop('conductivity')
	except Exception as e:
		if 'conductivity' in sensor.keys():
			sensor.pop('conductivity')
		print(e)
		raise DataException("conductivity")

def get_sht_data():
	# Get I2C bus
	bus = smbus.SMBus(1)
 
	# SHT31 address, 0x44(68)
	bus.write_i2c_block_data(0x44, 0x2C, [0x06])
 
	time.sleep(0.5)
 
# SHT31 address, 0x44(68)
# Read data back from 0x00(00), 6 bytes
# Temp MSB, Temp LSB, Temp CRC, Humididty MSB, Humidity LSB, Humidity CRC
	data = bus.read_i2c_block_data(0x44, 0x00, 6)
 
# Convert the data
	temp = data[0] * 256 + data[1]
	cTemp = -45 + (175 * temp / 65535.0)
	fTemp = -49 + (315 * temp / 65535.0)
	humidity = 100 * (data[3] * 256 + data[4]) / 65535.0
	return(cTemp,humidity)

def get_bar_temp():
	"""use this function to get pressure, and temperature from the bar sensor"""
	new_sensor = ms5837.MS5837_30BA() # Default I2C bus is 1 (Raspberry Pi 3)
	if not new_sensor.init():
		raise DataException("bar and temp")
		#print("Sensor could not be initialized")
		#exit(1)

	# We have to read values from sensor to update pressure and temperature
	if not new_sensor.read():
		raise DataException("bar and temp")
		#print("Sensor read failed!")
		#exit(1)

	freshwaterDepth = new_sensor.depth() # default is freshwater
	new_sensor.setFluidDensity(ms5837.DENSITY_SALTWATER)
	saltwaterDepth = new_sensor.depth() # No nead to read() again
	new_sensor.setFluidDensity(1000) # kg/m^3
	#print("Depth: %.3f m (freshwater)  %.3f m (saltwater)") % (freshwaterDepth, saltwaterDepth)

	# fluidDensity doesn't matter for altitude() (always MSL air density)
	#print("MSL Relative Altitude: %.2f m") % sensor.altitude() # relative to Mean Sea Level pressure in air
	#print(sensor.temperature())
	return new_sensor.temperature(), new_sensor.pressure(ms5837.UNITS_kPa), new_sensor.depth()

def rpy_sensor():
	""" get readings from adafruit icm orientation """

	i2c = busio.I2C(board.SCL, board.SDA)
	icm = adafruit_icm20x.ICM20948(i2c)
	
	x = icm.acceleration[0]
	y = icm.acceleration[1]
	z = icm.acceleration[2]
	try:
		m = icm.magnetic
		import math
		#print(m[1])
		#print(m[0])
	except:
		raise DataException("orientation")
		#print("cannot get magnetic values")
	
	try:
		heading = 180 * math.atan2(m[1],m[0])/math.pi;
		if(heading < 0):
			heading = heading + 360;
			print("heading: ", heading)
	except:
		print("cannot print header values")
	
   
	rawData_X = x
	rawData_Y = y
	rawData_Z = z
	#change x y and z to roll pitch yaw
	import math
	accelerationX = rawData_X #* 3.9
	accelerationY = rawData_Y #* 3.9
	accelerationZ = rawData_Z #* 3.9
	pitch = 180 * math.atan (accelerationX/math.sqrt(accelerationY*accelerationY + accelerationZ*accelerationZ))/math.pi
	roll = 180 * math.atan (accelerationY/math.sqrt(accelerationX*accelerationX + accelerationZ*accelerationZ))/math.pi
	yaw = 180 * math.atan (accelerationZ/math.sqrt(accelerationX*accelerationX + accelerationZ*accelerationZ))/math.pi
	
	return (pitch,roll,yaw,heading)

def cpu_temp():
	cmds = ['/usr/bin/vcgencmd', 'measure_temp']
	response = subprocess.check_output(cmds).decode()
	return float(response.split('=')[1].split("'")[0].rstrip())


def environment(checker, sensor, trial_path):
	nameCSV_environment = trial_path + 'environmentFile_' + str(time.strftime("%Y%m%d-%H%M%S")) + '.csv'
	environment_file = open(nameCSV_environment, mode='a')
	environment_writer = csv.writer(environment_file, delimiter=',', quotechar='"', quoting=csv.QUOTE_MINIMAL)
	environment_writer.writerow(["Date/Time", "Temperature ("+u'\u2103' + "C)", "Depth (m)", "Pressure (Bar)"])
	while checker["environment"]:
		try:
			temperature_2, pressure_2, depth_2 = get_bar_temp()
		except:		
			if 'pressure' in sensor.keys():
				sensor.pop('pressure')
			if 'tempWater' in sensor.keys():
				sensor.pop('tempWater')
			if 'depthWater' in sensor.keys():
				sensor.pop('depthWater')
			if 'tempWater2' in sensor.keys():
				sensor.pop('tempWater2')
			if 'depthWater2' in sensor.keys():
				sensor.pop('depthWater2')
			try:
				environment_file.close()
			except:
				raise DataException("closing environment")
			raise DataException("environment")
		else:
			# sensor = {'pressure': pressure_2,
						# 'tempWater': float(temperature_2),
						# 'pressureWater': float(pressure_2)/100,
						# 'depthWater': depth_2,
						# 'tempWater2': float(temperature_2),
						# 'pressureWater2': float(pressure_2)/100,
						# 'depthWater2': depth_2}
			sensor['pressure'] = pressure_2
			sensor['tempWater'] = float(temperature_2)
			sensor['pressureWater'] = float(pressure_2)/100
			sensor['depthWater'] = depth_2
			sensor['tempWater2'] = float(temperature_2)
			sensor['pressureWater2'] = float(pressure_2)/100
			sensor['depthWater2'] = depth_2
			environment_writer.writerow([datetime.datetime.now(), float(temperature_2), depth_2, pressure_2/100])
			time.sleep(1)
	if 'pressure' in sensor.keys():
		sensor.pop('pressure')
	if 'pressureWater' in sensor.keys():
		sensor.pop('pressureWater')
	if 'pressureWater2' in sensor.keys():
		sensor.pop('pressureWater2')
	if 'tempWater' in sensor.keys():
		sensor.pop('tempWater')
	if 'depthWater' in sensor.keys():
		sensor.pop('depthWater')
	if 'tempWater2' in sensor.keys():
		sensor.pop('tempWater2')
	if 'depthWater2' in sensor.keys():
		sensor.pop('depthWater2')
	environment_file.close()
	return

def orientation(checker, sensor, trial_path):
	nameCSV_orientation = trial_path + 'orientationFile_' + str(time.strftime("%Y%m%d-%H%M%S")) + '.csv'
	orientation_file = open(nameCSV_orientation, mode='a', encoding='utf-8-sig')
	orientation_writer = csv.writer(orientation_file, delimiter=',', quotechar='"', quoting=csv.QUOTE_MINIMAL)
	orientation_writer.writerow(["Date/Time", "Roll ("+u'\u00B0' + ")", "Pitch ("+u'\u00B0' + ")", "Yaw ("+u'\u00B0' + ")", "Heading ("+u'\u00B0' + " from North)"])
	while checker["orientation"]:
		x = -1
		y = -1
		z = -1
		try:
			x,y,z,header = rpy_sensor()
		except:
			if 'pitch' in sensor.keys():
				sensor.pop('pitch')
			if 'roll' in sensor.keys():
				sensor.pop('roll')
			if 'yaw' in sensor.keys():
				sensor.pop('yaw')
			if 'header' in sensor.keys():
				sensor.pop('header')
			orientation_file.close()
			raise DataException("orientation")
		else:
			# sensor = {'pitch': x,
						# 'roll': y,
						# 'yaw': z,
						# 'header': header}
			sensor['pitch'] = x
			sensor['roll'] = y
			sensor['yaw'] = z
			sensor['header'] = header
			orientation_writer.writerow([datetime.datetime.now(), y, x, z, header])
			time.sleep(1)
	if 'pitch' in sensor.keys():
		sensor.pop('pitch')
	if 'roll' in sensor.keys():
		sensor.pop('roll')
	if 'yaw' in sensor.keys():
		sensor.pop('yaw')
	if 'header' in sensor.keys():
		sensor.pop('header')
	orientation_file.close()
	return

def system_monitor(checker, sensor, trial_path):
	nameCSV_sys = trial_path + 'systemFile_' + str(time.strftime("%Y%m%d-%H%M%S")) + '.csv'
	sys_file = open(nameCSV_sys, mode='a', encoding='utf-8-sig')
	sys_writer = csv.writer(sys_file, delimiter=',', quotechar='"', quoting=csv.QUOTE_MINIMAL)
	sys_writer.writerow(["Date/Time", "Internal Temp ("+u'\u2103' + ")", "Internal Humidity (%)", "Free Space (MB)", "CPU Temp (" + u'\u2103' + ")"])
	while checker["system_monitor"]:
		temp_1 = "Error"
		humi_1 = "Error"
		try:
			temp_1, humi_1 = get_sht_data()
		except:
			if 'temp' in sensor.keys():
				sensor.pop('temp')
			if 'humidity' in sensor.keys():
				sensor.pop('humidity')
			print("error getting data from sht")
			pass
		else:
			#sensor = {'temp' : temp_1,
			#			'humidity' : humi_1}
			sensor['temp'] = temp_1
			sensor['humidity'] = humi_1
		sensor['free_space'] = shutil.disk_usage('/').free / 1000000
		sensor['cpu_temp'] = cpu_temp()
		#sensor = {'free_space': shutil.disk_usage('/').free / 1000000,
		#			  'cpu_temp': cpu_temp()}
		sys_writer.writerow([datetime.datetime.now(), temp_1, humi_1, shutil.disk_usage('/').free / 1000000, cpu_temp()])
		time.sleep(1)
	if 'free_space' in sensor:
		sensor.pop('free_space')
	if 'cpu_temp' in sensor:
		sensor.pop('cpu_temp')
	if 'temp' in sensor:
		sensor.pop('temp')
	if 'humidity' in sensor:
		sensor.pop('humidity')
	sys_file.close()
	return
