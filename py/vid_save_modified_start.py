#!/usr/bin/python
import sys
#import Adafruit_DHT
import os
import time

from picamera import PiCamera     #jess 02/09/2023

import Pyro4
import pandas as pd
import math
import board
import busio
import adafruit_icm20x
import datetime

#-----------MODIFY HERE-------------
web_duration   = 180          #How long the browser is up
num_snapshots  = 3          #Number of snapshots taken 
video_duration = 30        #How long the video is taken    

#-----------------------------------


#camera = PiCamera()  #jess  02/09/2023   #THIS IS KILLING THE webbrowser program run

from digitalio import DigitalInOut, Direction, Pull
import adafruit_rfm9x
#from get_yaw_pitch import *


#from edurov import WebMethod
#from edurov.utils import detect_pi, serial_connection, send_arduino, \
#    receive_arduino, free_drive_space, cpu_temperature

#GLOBAL VARIABLE
timeMe = time.strftime("%Y%m%d-%H%M%S")      #ADDED BY JESS 01/30/2023
print(timeMe)                                #ADDED BY JESS 01/30/2023
global_data_location = '/home/pi/TrialData/' + timeMe + '/'
os.mkdir(global_data_location)                #Added jas 02162023
os.mkdir(global_data_location + 'Videos' + '/')

#following commented out by jess 02212023
from core import WebMethod      # changed to import from local file instead of installed package, ariane 3-4-23
from edurov.utils import detect_pi, serial_connection, send_arduino, \
    receive_arduino, free_drive_space, cpu_temperature

# webmethod already calls picamera methods, calling independently will end the program and crash the GUI
'''
def camera_snapshot(burstnumber):      #jess  02/09/2023
# file_name = global_data_location + 'Pictures/img_' + str(time.time()) + '.jpg'  #jess 02/09/2023
   timeNow = time.strftime("%Y%m%d-%H%M%S")
   camera = PiCamera() 
   picturelocation = global_data_location + 'Pictures/'    #Added JAS 02162023
   os.mkdir(picturelocation)
   camera.resolution = (1024, 768)   #1920, 1080                  #Max Resolution (2592, 1944) for camera    JESS
   camera.framerate = 15                                #Need  framerate 15 for max resolution JESS
   for snap in range (1, burstnumber):
      print(snap)
      file_name = picturelocation + 'img_' + timeNow + '_' + str(snap) + '.jpg' #jess 02/16/2023
      camera.capture(file_name)    #jess 02/09/2023
      print('done')      #jess 02/09/2023
   camera.close()    ######
   return()

def record_video(videolength):  #jess 02/09/2023
    timeNow = time.strftime("%Y%m%d-%H%M%S")
    camera = PiCamera()    
    videolocation = global_data_location + 'Videos/'                   #jess 02162023
    os.mkdir(videolocation)                                            #jess 02162023   
    vid_name = videolocation + 'vid_' + timeNow + '.h264'   #jess  02/09/2023
    print(vid_name)
    #camera.resolution = (1920, 1080)     #MAX RESOLUTION FOR VIDEO  JESS
    camera.resolution = (1024, 768)
    camera.framerate = 15                #Need framerate 15 for max resolution JESS
    camera.start_preview()
    camera.start_recording(vid_name)  #jess  02/09/2023
    time.sleep(videolength)
    camera.stop_recording()
    camera.stop_preview()
    camera.close()   ######
    print('viddone')
    return()
'''


def control_motors():
    """ to control the servo motor SG90"""
    print("motor control")
    # Servo Control
    # WIRINGpi is better than using GPIO for controlling pwm servos
    import wiringpi
     
    # use 'GPIO naming'
    wiringpi.wiringPiSetupGpio()
     
    # set #18 to be a PWM output
    wiringpi.pinMode(18, wiringpi.GPIO.PWM_OUTPUT)
     
    # set the PWM mode to milliseconds stype
    wiringpi.pwmSetMode(wiringpi.GPIO.PWM_MODE_MS)
     
    # divide down clock
    wiringpi.pwmSetClock(192)
    wiringpi.pwmSetRange(2000)
     
    delay_period = 0.01

    #initial position for the motor. change the following value to change the starting camera position
    pulse = 150  
 
    #change the following values to get full 180 degrees from the motor, 50-250
    motor_up_limit = 225
    motor_down_limit = 75

    wiringpi.pwmWrite(18, pulse)
    
    with Pyro4.Proxy("PYRONAME:KeyManager") as keys:
        with Pyro4.Proxy("PYRONAME:ROVSyncer") as rov:
            while rov.run:
                keys_dict = keys.arrow_dict
                
                if keys_dict['right arrow'] == True:
                    pulse = pulse + 15
                    if pulse > motor_up_limit:
                        pulse = motor_up_limit
                  
                    wiringpi.pwmWrite(18, pulse)
                    print(pulse)
                    time.sleep(0.1)
                
                if keys_dict['left arrow'] == True:
                    pulse = pulse - 15
                    if pulse < motor_down_limit:
                        pulse = motor_down_limit

                    wiringpi.pwmWrite(18, pulse)
                    print(pulse)
                    time.sleep(0.1)
               # if keys_dict['up arrow'] == True:                #JESS
               #     print('hi')
               #     web_method.serve(timeout=1)
               #     time.sleep(1)           #Jess
               #     camera_snapshot(5)
               #     time.sleep(0.1)
               #     web_method.serve()
               # if keys_dict['down arrow'] == True:             #JESS
               #     print('lo')
               #   #  record_video(5)                      
               #     time.sleep(0.1)
                    
    print("exiting motor control")                

def get_sonar():
    """ get sonar value transmtted by Lora module RFM9X pair required on tranmismitter and receiver end 
    # Required packages:
    #  pip install adafruit-circuitpython-rfm9x
    """

    import csv
   
    # Configure RFM9x LoRa Radio
    CS = DigitalInOut(board.CE1)
    RESET = DigitalInOut(board.D25)
    spi = busio.SPI(board.SCK, MOSI=board.MOSI, MISO=board.MISO)

    # Attempt to set up the RFM9x module
    try:
        rfm9x = adafruit_rfm9x.RFM9x(spi, CS, RESET, 915.0)
        print('RFM9x detected')
    except RuntimeError:
        print('RFM9x error')
    try:
        with Pyro4.Proxy("PYRONAME:ROVSyncer") as rov:
            while rov.run:
                packet = None
                packet = rfm9x.receive()
                if packet != None:
                    #print("Received:",  str(packet))
                
                # Split packet
                    from_addr = packet[0]
                    to_addr = packet[1]
                    depth = int.from_bytes(packet[2:4], byteorder='little') #/ 10.0
                    confi = int.from_bytes(packet[4:6], byteorder='little') / 10.0
                    pres = int.from_bytes(packet[6:8], byteorder='little') / 10.0

                    # Print results
                    #print("From:", from_addr)
                    #print("To:", to_addr)
                    #print()
                    print("Sonar Distance:", depth/1000, "m")
                    print("Sonar Confidence:", confi, "%")
                    rov.sensor = { 'sonar_depth': depth/1000,
                                           'sonar_confi': confi}
                  
                    nameCSV_sonar = global_data_location + 'sonarFile_' + timeMe + '.csv'          #added by Jess 01/31/2023
                    # with open('sonar_file.csv', mode='a') as sonar_file:  #removed by Jess 01/31/2023
                    with open(nameCSV_sonar, mode='a') as sonar_file:    #added by Jess 01/31/2023
                        sonar_writer = csv.writer(sonar_file, delimiter=',', quotechar='"', quoting=csv.QUOTE_MINIMAL)
                        sonar_writer.writerow([datetime.datetime.now(), depth])
                    time.sleep(1)
    except:
        print("can not get data from rfm sonar")
        time.sleep(1)


                


def bt_serial_grab():
    """ get data from serial bluetooth comm port.
    esp32 should be transmitting strings on the other end
    """
    #! /usr/bin/python
    import serial
    import csv
    #import time
    #import 

    #please make sure that the link is made with the serial transmitter as per instruction manual
    
    bluetoothSerial = serial.Serial("/dev/rfcomm0",baudrate=115200)
    print("Bluetooth connected")
    try:
        with Pyro4.Proxy("PYRONAME:ROVSyncer") as rov:
            while rov.run:
                data = bluetoothSerial.readline()
                #print(data)
                time.sleep(1)
                bluetoothSerial.write(data)
                
                datas = str(data)
                datas = datas[2:]
        
                #print(datas)
                #as data is send with sa_ to signify its conducitivy or salinity readings
                if datas[0:3] == "sa_":
                    
                    #sal = float(datas[3:8])
                    #print("Conducitivity: "+ str(sal))
                    #print(datas[3:8])
                    sal = float(datas[3:8])
                    print("Conductivity: " +str(sal))
                    
                    #log the data in csv file
                    nameCSV_cond = global_data_location + 'condFile_' + timeMe + '.csv'                #added by Jess 01/31/2023
                    with open(nameCSV_cond, mode='a') as cond_file:             #added by Jess 01/31/2023
                    #with open('cond_file.csv', mode='a') as cond_file:          #removed by Jess 01/31/2023
                        cond_writer = csv.writer(cond_file, delimiter=',', quotechar='"', quoting=csv.QUOTE_MINIMAL)

                        cond_writer.writerow([datetime.datetime.now(), sal])
                        
                    
                    # send to GUI
                    rov.sensor = {
                           'conductivity': sal
                        }
                    #sleep for a second
                    time.sleep(1)
           
    except KeyboardInterrupt:
        print("Quit")
    except:
    #incase of error 
        print("conducitivity link broke")

    



def get_temp_dht():
    
    humidity, temperature = Adafruit_DHT.read_retry(11, 4)
    
    with open('temp_1_file.csv', mode='a') as temp_1_file:
        temp_1_writer = csv.writer(temp_1_file, delimiter=',', quotechar='"', quoting=csv.QUOTE_MINIMAL)
        temp_1_writer.writerow(['John Smith', 'Accounting', 'November'])
        

    if type(temperature) == 'NoneType':
        humidity = 1
        temperature = 1
    
    #print(type(temperature))
    return(temperature, humidity)

def get_sht_data():
    import smbus
    import time
 
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
    #try:
#     with open('temp1_file.csv', mode='a') as temp1_file:
#         temp1_writer = csv.writer(temp1_file, delimiter=',', quotechar='"', quoting=csv.QUOTE_MINIMAL)
#         temp1_writer.writerow(['John Smith', 'Accounting', 'November'])
#         #temp1_writer.writerow([cTemp,humidity])

            
#         with open('temp_1_file.csv', mode='a') as temp_1_file:
#             temp_1_writer = csv.writer(temp_1_file, delimiter=',', quotechar='"', quoting=csv.QUOTE_MINIMAL)
#             temp_1_writer.writerow(["hello"])
    #             #temp_1_writer.writerow([datetime.datetime.now(),cTemp,humidity])
    #except:
        #print("couldnt log temp_1")
    return(cTemp,humidity)
#print(temp)


def get_bar_temp():
    """use this function to get pressure, and temperature from the bar sensor"""

    import ms5837
    import time

    sensor = ms5837.MS5837_30BA() # Default I2C bus is 1 (Raspberry Pi 3)
    
    if not sensor.init():
        print("Sensor could not be initialized")
        exit(1)

    # We have to read values from sensor to update pressure and temperature
    if not sensor.read():
        print("Sensor read failed!")
        exit(1)

#     print("Pressure:") # %.2f atm  %.2f Torr  %.2f psi") % (
#     print(sensor.pressure(ms5837.UNITS_atm))
#     print(sensor.pressure(ms5837.UNITS_Torr))
#     print(sensor.pressure(ms5837.UNITS_psi))
# 
#     print("Temperature") #: %.2f C  %.2f F  %.2f K") % (
#     print(sensor.temperature(ms5837.UNITS_Centigrade))
#     print(sensor.temperature(ms5837.UNITS_Farenheit))
#     print(sensor.temperature(ms5837.UNITS_Kelvin))

    freshwaterDepth = sensor.depth() # default is freshwater
    sensor.setFluidDensity(ms5837.DENSITY_SALTWATER)
    saltwaterDepth = sensor.depth() # No nead to read() again
    sensor.setFluidDensity(1000) # kg/m^3
    #print("Depth: %.3f m (freshwater)  %.3f m (saltwater)") % (freshwaterDepth, saltwaterDepth)

    # fluidDensity doesn't matter for altitude() (always MSL air density)
    #print("MSL Relative Altitude: %.2f m") % sensor.altitude() # relative to Mean Sea Level pressure in air
    return sensor.temperature(),sensor.pressure(ms5837.UNITS_kPa),sensor.depth()




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
        print("cannot get magnetic values")
    
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
    
    
    #return(x,y,z)
    #return (x,y,z,heading)
    
    return (pitch,roll,yaw,heading)
# 
#     while True:
#         #print("Acceleration: X:%.2f, Y: %.2f, Z: %.2f m/s^2" % (icm.acceleration))
#         #print("Gyro X:%.2f, Y: %.2f, Z: %.2f rads/s" % (icm.gyro))
#         #print("Magnetometer X:%.2f, Y: %.2f, Z: %.2f uT" % (icm.magnetic))
#         #print("")
#         print(    icm.acceleration[0])
#         print(    icm.acceleration[1])
#         print(    icm.acceleration[2])
#         time.sleep(0.5)
#         
#         i2c = busio.I2C(board.SCL, board.SDA)
#         accelerometer = adafruit_adxl34x.ADXL345(i2c)
#         print("getting x y z")
#         x = (accelerometer.acceleration)[0]
#         y = (accelerometer.acceleration)[1]
#         z = (accelerometer.acceleration)[2]
#         return(x,y,z)
#     
    #print(accelerometer)
    #accelerometer.enable_freefall_detection(threshold=10, time=25)
    #accelerometer.enable_motion_detection(threshold=18)
    #accelerometer.enable_tap_detection(tap_count=1, threshold=20, duration=50, latency=20, window=255)

    def RP_calculate(x,y,z):
        x_Buff = x
        y_Buff = y
        z_Buff = z
        
        roll = math.atan2(y_Buff , z_Buff) * 57.3
        pitch = math.atan2((- x_Buff) , math.sqrt(y_Buff * y_Buff + z_Buff * z_Buff)) * 57.3
        yaw = 180 * math.atan (z_Buff/sqrt(x_Buff*x_Buff + z_Buff*z_Buff))/M_PI;
        
        return(roll,pitch)

    def get_acc_readings():
        x = (accelerometer.acceleration)[0]
        y = (accelerometer.acceleration)[1]
        z = (accelerometer.acceleration)[2]
        #int x, y, z;                        //three axis acceleration data
        roll = 0.00
        pitch = 0.00       #Roll & Pitch are the angles which rotate by the axis X and y
        roll,pitch =     RP_calculate(x,y,z)
        print(roll,pitch)
        return()




def senser():
    temp_1 = -1
    humi_1 = -1
    
    x = -1
    y = -1
    z = -1
    
    temperature_2 =-1
    pressure_2 = -1
    depth_2 = 0

    #all internal sensors attached to the  control module are  and pulled as seperate functions.
    
    with Pyro4.Proxy("PYRONAME:ROVSyncer") as rov:
        while rov.run:
            #call the fucntion to get temperaturea nd humidity sht-
            #temp_1, humi_1 = get_temp_dht()
            try:
                temp_1, humi_1 = get_sht_data()
            except:
                #pass
                print("error getting temp from adafruit sht sensor")
            
            
            
            #call the function to get orientation
            try:
                x,y,z,header = rpy_sensor()
            except:
                #pass
                print("error getting orientation data from sensor")
        #time.sleep()

           
           #call the fucntion to get temp and pressure from
            try:
                temperature_2, pressure_2, depth_2 =     get_bar_temp()
            except:
                print("error getting bar pressure and temperature")
                time.sleep(1)

            import csv

            nameCSV = global_data_location + 'dataFile_' + timeMe + '.csv'  #added by Jess 01/30/2023	
            with open(nameCSV, mode='a') as temp1_file:               #added by Jess 01/30/2023
            #with open('temp1_file.csv', mode='a') as temp1_file:     #commented out by Jess 01/30/2023
                temp1_writer = csv.writer(temp1_file, delimiter=',', quotechar='"', quoting=csv.QUOTE_MINIMAL)
                temp1_writer.writerow([datetime.datetime.now(),temp_1, humi_1, x, y, z,temperature_2,pressure_2,depth_2])

            rov.sensor = {
            #FROM ADAFRUIT SHT sensor
              'temp': temp_1,
                          'pressure': pressure_2,
                          'humidity': humi_1,
                          
            #from adafruit imu sensor
                            'pitch': x,
                            'roll': y,
                           'yaw' : z, 
                            'header': header,
                            
            #variables used twice in gui, need to be initialized twice for display to work properly.
                            'tempWater': float(temperature_2),
                            'pressureWater': float(pressure_2)/100,
                            'depthWater': depth_2,
                            'tempWater2': float(temperature_2),
                            'pressureWater2': float(pressure_2)/100,
                            'depthWater2': depth_2
                            
            #disable line and give setup for battery
                            #'batteryVoltage': float(v3)
                          }
            

#def camera_keys():
#     with Pyro4.Proxy("PYRONAME:KeyManager") as keys:
#          with Pyro4.Proxy("PYRONAME:ROVSyncer") as rov:
#               while rov.run:




def system_monitor():
    with Pyro4.Proxy("PYRONAME:ROVSyncer") as rov:
        while rov.run:
            rov.sensor = {'free_space': free_drive_space(),
                          'cpu_temp': cpu_temperature()}
            time.sleep(1)
            



def main(video_resolution='1024x768', fps=15, server_port=8000, debug=False):
    web_method = WebMethod(
        index_file=os.path.join(os.path.dirname(__file__), 'index.html'),
        trial_path = global_data_location,
        video_resolution=video_resolution,
        fps=fps,
        server_port=server_port,
        debug=debug,
        #if a function is to be disabled, it can be removed from the following line and will not execute        
        runtime_functions=[senser, system_monitor, bt_serial_grab, get_sonar, control_motors]

    )
    web_method.serve() # put back in, ariane 3-4-23

    #web_method.serve(web_duration)                          #300 = 5 min           #Host on web browser for XX sec
    #time.sleep(10)
    #camera_snapshot(num_snapshots)                            #10           #Take Burst Images
    #time.sleep(10)
    #record_video(video_duration)                              #60
    #time.sleep(20)                          
    print('Program Terminated As Expected')


if __name__ == '__main__':
    main()

