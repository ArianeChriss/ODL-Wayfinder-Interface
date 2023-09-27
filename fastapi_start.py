import json
import asyncio
from fastapi import FastAPI, Request, WebSocket, Body
from fastapi.staticfiles import StaticFiles
from fastapi.responses import Response, StreamingResponse, FileResponse, JSONResponse
from pydantic import BaseModel
from uvicorn import run
from fastapi.templating import Jinja2Templates
from picamera2 import Picamera2
from picamera2.encoders import H264Encoder, MJPEGEncoder
from picamera2.outputs import FileOutput, FfmpegOutput
import threading
import multiprocessing
from multiprocessing import Process
from threading import Condition
import uvicorn
import io
import sys
import time
import os
import shutil
import psutil
import bluetooth
import subprocess
import signal
import aiofiles
from fastapi_sensor_functions import motor_move, record_camera, get_sonar, bt_serial_grab, environment, orientation, system_monitor

#GLOBAL VARIABLE
timeMe = time.strftime("%Y%m%d-%H%M%S")      #ADDED BY JESS 01/30/2023
print(timeMe)                                #ADDED BY JESS 01/30/2023
trial_path = '/home/wayfinder/TrialData/' + timeMe + '/'
os.mkdir(trial_path)                #Added jas 02162023
os.mkdir(trial_path + 'Videos' + '/')

app = FastAPI(title="main-app")
templates = Jinja2Templates(directory="templates")

class StreamingOutput(io.BufferedIOBase):
	def __init__(self):
		self.frame = None
		self.condition = Condition()

	def write(self, buf):
		with self.condition:
			self.frame = buf
			self.condition.notify_all()

class Files(BaseModel):
	name: str
	files_list: str

picam = Picamera2()
config = picam.create_video_configuration({"size": (640, 480)}, lores={"size": (640, 480)})
picam.configure(config)
picam.set_controls({"FrameRate": 15})
stream_encoder = MJPEGEncoder()
file_encoder = H264Encoder(framerate=15, enable_sps_framerate=True)
file_encoder.size = config["lores"]["size"]
file_encoder.format = config["lores"]["format"]
lores_stream = picam.stream_map["lores"]

output = StreamingOutput()
picam.start_recording(stream_encoder, FileOutput(output))

motor_position = 150
motor_limits = [150, 150]

with open("wayfinder_id.json", "r") as file:
	wayfinder_info = json.load(file)
	print("Starting Wayfinder", wayfinder_info["wayfinder id number"])
	motor_limits[0] = wayfinder_info["lower limit"]
	motor_limits[1] = wayfinder_info["upper limit"]
	wayfinder_ip = wayfinder_info["ip address"]

processes = {
	"camera" : False,
	"sonar" : False,
	"bt_serial" : False,
	"environment" : False,
	"orientation" : False,
	"system_monitor" : False,
	"mission" : False, 
	"motor_position" : 150 }
motor_move(150)
sensor = {}


async def bluetooth_connect(address):
	try:
		try:
			bluetooth_proc = await asyncio.create_subprocess_shell("sudo rfcomm connect hci0 "+address, stdout=asyncio.subprocess.PIPE)
			return
		except Exception as e:
			print(e)
			return
	except Exception as e:
		print(e)
		print("not able to do the function for...some reason.")
		return

async def bluetooth_check():
	try:
		connections = await asyncio.create_subprocess_shell("rfcomm", stdout = asyncio.subprocess.PIPE)
		stdout = await connections.communicate()
		print(stdout[0])
	except Exception as e:
		print(e)
		return e
	else:
		return stdout[0]

@app.get("/")
def read_root(request: Request):
	return templates.TemplateResponse("index.html", {"request": request})

@app.get("/index.html")
def read_root(request: Request):
	return templates.TemplateResponse("index.html", {"request": request})

@app.get("/static/{filename}")
async def get_resource(filename):
	filename = './templates/static/' + filename

	if not os.path.isfile(filename):
		return Response(status_code=404)

	return FileResponse(filename)

@app.get("/mjpeg", response_class=StreamingResponse)
def mjpeg(request: Request):
	def get_frame():
		try:
			while True:
				with output.condition:
					output.condition.wait()
					frame = output.frame
				yield (
					b"--frame\r\n" b"Content-Type: image/jpeg\r\n\r\n" + frame + b"\r\n"
				)
		except Exception as e:
			print("Error generating frames")
	
	try:
		frames = get_frame()
		response = StreamingResponse(
			frames,
			headers={
				"Cache-Control": "no-cache, private",
				"Pragma": "no-cache",
			},
			media_type="multipart/x-mixed-replace; boundary=frame",
		)
		return response
	except Exception as e:
		print("Error loading stream source")

@app.get("/download")
def download_popup():
	paths = os.listdir('../TrialData')
	paths.sort()
	joined_paths = ';'.join(paths)
	return Response(status_code=200, content=joined_paths.encode('utf-8'))

@app.get("/download/TrialData/{filepath:path}")
def download_list(filepath:str):
	filepath = "./TrialData/" + filepath
	for i in range(1,len(filepath)):
		if (filepath[i] == '.'):
			return Response(status_code=404)
		if (i == len(filepath) - 1):
			folder_name = filepath
			paths = os.listdir("."+folder_name)
			paths.sort()
			joined_paths = ';'.join(paths)
			return Response(status_code=200, content=joined_paths.encode('utf-8'))
	return Response(status_code=404)

@app.post("/download-data/{filepath:path}")
async def download_data(filepath: str, files: Request):
	files = await files.body()
	paths = str(files,"UTF-8")
	paths_list = paths.split(';')
	if (os.path.exists('../TrialData/zipped_data')):
		shutil.rmtree('../TrialData/zipped_data')
	if (os.path.exists('../TrialData/zipped_data.zip')):
		os.remove('../TrialData/zipped_data.zip')
	os.mkdir('../TrialData/zipped_data')
	print("made directory")
	for i in paths_list[0:-1]:
		if (os.path.isdir('../'+filepath+'/'+i)):
			shutil.copytree('../'+filepath+'/'+i, '../TrialData/zipped_data/'+i)
			print("copied tree " + str(i))
		else:
			shutil.copy('../'+filepath+'/'+i, '../TrialData/zipped_data/'+i)
			print("copied " + str(i))
	shutil.make_archive('../TrialData/zipped_data', 'zip', '../TrialData/zipped_data')
	print("made archive")
	# CHUNK_SIZE = 16  # = 1MB - adjust the chunk size as desired
	# async def iterfile():
		# async with aiofiles.open("../TrialData/zipped_data.zip", 'rb') as f:
			# while chunk := await f.read(CHUNK_SIZE):
				# yield chunk
	#return StreamingResponse(iterfile())
	#downloadResponse = FileResponse("../TrialData/zipped_data.zip", media_type="application/zip")
	#await downloadResponse()
	return FileResponse("../TrialData/zipped_data.zip", media_type="application/zip")

@app.post('/finished-download')
def finish():
	if (os.path.exists('../TrialData/zipped_data')):
		shutil.rmtree('../TrialData/zipped_data')
	if (os.path.exists('../TrialData/zipped_data.zip')):
		os.remove('../TrialData/zipped_data.zip')
	return Response(status_code=200)

@app.post('/delete/{filepath:path}')
async def delete_data(filepath, data: Request):
	data = await data.body()
	paths = str(data,"UTF-8")
	paths_list = paths.split(',')
	if (len(filepath) > 0):
		for i in paths_list:
			if (os.path.isdir('../'+filepath+'/'+i)):
				shutil.rmtree('../'+filepath+'/'+i)
				print("removing " + '../'+filepath+'/'+i)
			else:
				os.remove('../'+filepath+'/'+i)
				print("removing " + '../'+filepath+'/'+i)
	else:
		for i in paths_list[0:-1]:
			print(i)
			if (os.path.isdir('../TrialData/'+i)):
				shutil.rmtree('../TrialData/'+i)
				print("removing " + '../TrialData/'+i)
			else:
				os.remove('../TrialData/'+i)
				print("removing " + '../TrialData/'+i)
	return Response(status_code=200)

@app.get('/bluetooth-scan')
def device_scan():
	nearby_devices = bluetooth.discover_devices(duration=15, lookup_names=True,
											flush_cache=True, lookup_class=False)
	devices = []
	for addr, name in nearby_devices:
		try:
			devices.append("   {} - {}".format(addr, name))
		except UnicodeEncodeError:
			devices.append("   {} - {}".format(addr, name.encode("utf-8", "replace")))
	joined_devices = ';'.join(devices)
	return Response(status_code=200, content=joined_devices.encode('utf-8'))

@app.post('/bluetooth-connect')
async def device_connect(device: Request):
	device = await device.body()
	device = str(device, "UTF-8")
	await bluetooth_connect(device[0:17])
	print("connecting to bluetooth device " + device[0:17])
	return Response(status_code=200)
	

@app.post('/bluetooth-check')
async def device_check():
	try:
		output = await bluetooth_check()
	except Exception as e:
		print(e)
		return Response(status_code=503)
	else:
		return Response(status_code=200, content=output)

@app.get('/program-list')
def list_programs():
	missions = os.listdir('../Missions')
	joined_missions = ';'.join(missions)
	return Response(status_code=200, content=joined_missions.encode('utf-8'))

@app.get('/program-select/{mission:path}')
def select_program(mission):
	print(mission)
	jsonfile = "../Missions/" + str(mission) + ".json"
	print(jsonfile)
	with open(jsonfile, "r") as file:
		json_content = json.load(file)
	return JSONResponse(status_code=200, content=json_content)

@app.post('/save-mission')
async def save_mission(mission: Request):
	mission = await mission.body()
	mission = str(mission, "UTF-8")
	mission_json = json.loads(mission)
	mission_name = mission_json["name"]
	curr_missions = os.listdir('../Missions')
	for i in curr_missions:
		if (i == mission_name + ".json"):
			mission_name += "(new)"
	with open("../Missions/" + mission_name + ".json", "w") as file:
		file.write(json.dumps(mission_json, indent = 4))
		file.close()
	return Response(status_code=200)

@app.post('/mission-delete')
async def delete_mission(mission: Request):
	mission = await mission.body()
	mission = str(mission, "UTF-8")
	missions_list = missions_names.split(";")
	for i in missions_list:
		os.remove('../Missions/'+i)
	return Response(status_code=200)

@app.post('/mission-start/{mission}')
def start_mission(mission):
	processes["camera"] = False
	processes["orientation"] = False
	processes["bt_serial"] = False
	processes["environment"] = False
	processes["system_monitor"] = False
	with open('../Missions/' + mission) as mission_file:
		starts = []
		ends = []
		details = json.load(mission_file)
		for i in details['elements']:
			starts.append([i['sensor'], int(float(i['start']))])
			ends.append([i['sensor'], int(float(i['end']))])
		mission_start = time.time()
		processes["mission"] = True
		sensor["mission"] = True
		while (time.time() < mission_start + (int(float(details["length"])) * 60) and processes["mission"] == True):
			for i in range(len(starts)):
				if (mission_start + (starts[0][1] * 60) < time.time()):
					if starts[0][0] == "video_drag":
						processes["camera"] = True
						sensor_thread = threading.Thread(target = record_camera, args=(processes, sensor, picam, file_encoder, lores_stream, trial_path))
						#sensor_thread = multiprocessing.Process(target = record_camera, args=(processes, sensor, picam, file_encoder, lores_stream, lock, trial_path))
					elif starts[0][0] == "nav_drag":
						processes["orientation"] = True
						sensor_thread = threading.Thread(target = orientation, args=(processes, sensor, trial_path))
					elif starts[0][0] == "cond_drag":
						processes["bt_serial"] = True
						sensor_thread = threading.Thread(target = bt_serial_grab, args=(processes, sensor, trial_path))
					elif starts[0][0] == "env_drag":
						processes["environment"] = True
						sensor_thread = threading.Thread(target = environment, args=(processes, sensor, trial_path))
					elif starts[0][0] == "sys_drag":
						processes["system_monitor"] = True
						sensor_thread = threading.Thread(target = system_monitor, args=(processes, sensor, trial_path))
					elif starts[0][0] == "sonar_drag":
						processes["sonar"] = True
						sensor_thread = threading.Thread(target = get_sonar, args=(processes, sensor, trial_path))
					sensor_thread.start()
					starts.pop(0)
			for i in range(len(ends)):
				if (mission_start + (ends[0][1] * 60) < time.time()):
					if ends[0][0] == "video_drag":
						processes["camera"] = False
					elif ends[0][0] == "nav_drag":
						processes["orientation"] = False
					elif ends[0][0] == "cond_drag":
						processes["bt_serial"] = False
					elif ends[0][0] == "env_drag":
						processes["environment"] = False
					elif ends[0][0] == "sys_drag":
						processes["system_monitor"] = False
					elif end[0][0] == "sonar_drag":
						processes["sonar"] = False
					ends.pop(0)
			time.sleep(1)
		processes["mission"] = False
		sensor.pop("mission")
	return Response(status_code=200)

@app.post('/cancel-mission')
def stop_mission():
	processes["camera"] = False
	processes["orientation"] = False
	processes["bt_serial"] = False
	processes["environment"] = False
	processes["system_monitor"] = False
	processes["mission"] = False
	return Response(status_code=200)

@app.post('/enable-{current_sense}')
def enable_sensor(current_sense: str):
	processes[current_sense] = not processes[current_sense]
	if (current_sense == "camera"):
		if (processes[current_sense]):
			try:
				record_camera(processes, sensor, picam, file_encoder, lores_stream, trial_path)
				return Response(status_code=200, content="disabled")
			except Exception as e:
				print(e)
				processes[current_sense] = False
				return Response(status_code=200, content="disabled")
		else:
			processes[current_sense] = False
			return Response(status_code=200, content="disabled")
	elif (current_sense == "sonar"):
		if (processes[current_sense]):
			try:
				get_sonar(processes, sensor, trial_path)
				return Response(status_code=200, content="disabled")
			except Exception as e:
				print(e)
				processes[current_sense] = False
				return Response(status_code=200, content="disabled")
		else:
			processes[current_sense] = False
			return Response(status_code=200, content="disabled")
	elif (current_sense == "bt_serial"):
		if (processes[current_sense]):
			try:
				bt_serial_grab(processes, sensor, trial_path)
				return Response(status_code=200, content="disabled")
			except Exception as e:
				print(e)
				processes[current_sense] = False
				return Response(status_code=200, content="disabled")
		else:
			processes[current_sense] = False
			return Response(status_code=200, content="disabled")
	elif (current_sense == "environment"):
		if (processes[current_sense]):
			try:
				environment(processes, sensor, trial_path)
				return Response(status_code=200, content="disabled")
			except Exception as e:
				print(e)
				processes[current_sense] = False
				return Response(status_code=200, content="disabled")
		else:
			processes[current_sense] = False
			return Response(status_code=200, content="disabled")
	elif (current_sense == "orientation"):
		if (processes[current_sense]):
			try:
				orientation(processes, sensor, trial_path)
				return Response(status_code=200, content="disabled")
			except Exception as e:
				print(e)
				processes[current_sense] = False
				return Response(status_code=200, content="disabled")
		else:
			processes[current_sense] = False
			return Response(status_code=200, content="disabled")
	elif (current_sense == "system_monitor"):
		if (processes[current_sense]):
			try:
				system_monitor(processes, sensor, trial_path)
				return Response(status_code=200, content="disabled")
			except Exception as e:
				print(e)
				processes[current_sense] = False
				return Response(status_code=200, content="disabled")
		else:
			processes[current_sense] = False
			return Response(status_code=200, content="disabled")

@app.get('/streaming-data', response_class=StreamingResponse)
async def stream_data():
	async def get_data():
		while True:
			yield json.dumps(sensor)
			await asyncio.sleep(1)
	return StreamingResponse(get_data())

@app.post('/motor-left')
def move_left():
	if (processes["motor_position"] <= motor_limits[1] - 15):
		motor_move(processes["motor_position"] + 15)
		processes["motor_position"] += 15
		print(processes["motor_position"])
		return Response(status_code=200)
	else:
		return Response(status_code=200)

@app.post('/motor-right')
def move_right():
	if (processes["motor_position"] >= motor_limits[0] + 15):
		motor_move(processes["motor_position"] - 15)
		processes["motor_position"] -= 15
		print(processes["motor_position"])
		return Response(status_code=200)
	else:
		return Response(status_code=200)

@app.get('/sensor')
def get_sensor():
	return Response(status_code=200, content=json.dumps(sensor))

@app.get("/stop")
async def stop():
	picam.stop_recording()
	processes["camera"] = False
	processes["orientation"] = False
	processes["bt_serial"] = False
	processes["environment"] = False
	processes["system_monitor"] = False
	processes["mission"] = False
	os.kill(os.getpid(), signal.SIGTERM)
	return Response(status_code=200, content='Server shutting down...')

@app.on_event('shutdown')
def on_shutdown():
	print('Server shutting down...')

if (__name__=="__main__"):
	run(app, port=8080, host=wayfinder_ip)
