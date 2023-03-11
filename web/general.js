/*
 * Handles sensor values and some simple GUI updates
 * https://github.com/trolllabs/eduROV
 */

var keycodes = {l:76, c:67, esc:27, enter:13};
var MOTOR_KEYS = [81, 87, 69, 65, 83, 68];
var stat = {light:false, armed:false, roll_ui:true, cinema:false,
            video_rotation:0};
var sensors = {time:0, temp:0, pressure:0, humidity:0, pitch:0, roll:0, yaw:0,
            tempWater:0, pressureWater:0, batteryVoltage:0, free_space:0,
            cpu_temp:0};
var critical = {voltage:10.0, disk_space:500.0, cpu_temp:80.0};

var sensor_interval = 500;
var interval;
var camera_interval;

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function send_keydown(keycode){
    var xhttp = new XMLHttpRequest();
    xhttp.open("GET", "/keydown="+keycode, true);
    xhttp.setRequestHeader("Content-Type", "text/html");
    xhttp.send(null);
}

function handle_in_browser(keycode){
    if (MOTOR_KEYS.indexOf(keycode) > -1 && !stat.armed){
        if (confirm("The ROV is not armed, do you want to arm it?")) {
            toggle_armed();
        }
        return true;
    } else if (keycode == keycodes.l){
        toggle_light();
        return true;
    } else if (keycode == keycodes.enter){
        toggle_armed();
        return true;
    } else if (keycode == keycodes.esc && stat.cinema){
        toggle_cinema();
        return true;
    } else if (keycode == keycodes.c){
        toggle_cinema();
        return true;
    }
}

function toggle_cinema(){
    stat.cinema = !stat.cinema;
    set_cinema(stat.cinema);
}

function toggle_light(){
    var btn = document.getElementById("lightBtn");
    if(stat.light){
        btn.className = btn.className.replace(" active", "");
    }else{
        btn.className += " active";
    }
    stat.light = !stat.light;
    send_keydown(keycodes.l);
}

function toggle_armed(){
    var btn = document.getElementById("armBtn");
    if(stat.armed){
        btn.className = btn.className.replace(" active", "");
    }else{
        btn.className += " active";
    }
    stat.armed = !stat.armed;
    refresh_ui();
}

function set_update_frequency(){
    var interval = prompt("Set sensor update interval in ms",sensor_interval);
    if (interval){
        if (interval<30){
            alert('Sensor frequency can not be less than 30 ms');
            interval = 30;
        }
        sensor_interval = interval;
    }
}

function trigger_camera() {         // sends and handles return of recording start/stop command
    var btn = document.getElementById("cameraTrigger");
    var xhttp = new XMLHttpRequest();
    xhttp.onreadystatechange = function() {
        if (xhttp.readyState==4 && xhttp.status==200) {
            btn.innerHTML = xhttp.statusText;
            console.log(xhttp.statusText);
            if(xhttp.statusText == "Start Recording") {
                btn.className = "btn btn-outline-success btn-sm btn-block"
                if (camera_interval) {
                    console.log("interval stopped");
                    clearInterval(camera_interval);
                    camera_interval = null;
                }
            }
            else if (xhttp.statusText == "Stop Recording") {
                btn.className = "btn btn-outline-danger btn-sm btn-block"
                console.log("interval started")
                camera_interval = setInterval(cam_state, 30000);
            }
            else if (xhttp.statusText == "Unable to save recording") {
                btn.disabled = true;
                if (camera_interval) {
                    console.log("interval stopped");
                    clearInterval(camera_interval);
                    camera_interval = null;
                }
            }
        }
    }
    if (btn.innerHTML == "Start Camera") {
        xhttp.open("GET", "camera", true);
        xhttp.setRequestHeader("Content-Type", "application/text");
        xhttp.send(null);
    }
    else {
        xhttp.open("GET", "camera", true);
        xhttp.setRequestHeader("Content-Type", "application/text");
        xhttp.send(null);
    }
}

function cam_state() {      // sends and handles return of recording state check xmlhttp request
    var btn = document.getElementById("cameraTrigger");
    var xhttp = new XMLHttpRequest();
    xhttp.onreadystatechange = function() {
        if (xhttp.readyState==4 && xhttp.status==200) {
            console.log(xhttp.statusText);
            if(xhttp.statusText == "off") {
                btn.className = "btn btn-outline-success btn-sm btn-block"
                btn.innerHTML = "Start Recording";
                if (camera_interval) {
                    console.log("interval stopped");
                    clearInterval(camera_interval);
                    camera_interval = null;
                }
            }
            else if (xhttp.statusText == "running") {
                btn.className = "btn btn-outline-danger btn-sm btn-block"
                btn.innerHTML = "Stop Recording";
                console.log("interval called");
                if (!camera_interval) {
                    console.log("interval started")
                    camera_interval = setInterval(cam_state, 30000);
                }
            }
            else if(xhttp.statusText == "Unable to save recording") {
                btn.innerHTML = "Unable to save recording";
                btn.disabled = true;
                if (camera_interval) {
                    console.log("interval stopped");
                    clearInterval(camera_interval);
                    camera_interval = null;
                }
            }
        }
    }
    xhttp.open("GET", "cam_state", true);
    xhttp.setRequestHeader("Content-Type", "application/text");
    xhttp.send(null);
}

function toggle_roll(){
    var btn = document.getElementById("rollBtn");
    if(stat.roll_ui){
        document.getElementById("rollOverlay").style.visibility = "hidden";
        btn.className = btn.className.replace(" active", "");
    }else{
        document.getElementById("rollOverlay").style.visibility = "visible";
        btn.className += " active";
    }
    stat.roll_ui = !stat.roll_ui;
}

function stop_rov(){
    var xhttp = new XMLHttpRequest();
    xhttp.open("GET", "stop", true);
    xhttp.setRequestHeader("Content-Type", "application/text");
    xhttp.send();
}

function rotate_image(){
    stat.video_rotation += 90;
    rotation = stat.video_rotation;
    document.getElementById("image").style.transform =
        `rotate(${rotation}deg)`;
}

function get_sensor(){
    var xhttp = new XMLHttpRequest();
    xhttp.onreadystatechange = function() {
        if (this.readyState == 4 && this.status == 200) {
            var response = JSON.parse(this.responseText);
            for (var key in response) {
                sensors[key] = response[key];
            }
            refresh_ui();
        }
    };
    xhttp.open("GET", "sensor.json", true);
    xhttp.send();

    // Reset interval
    interval = setInterval(function () {
        clearInterval(interval);
        get_sensor();
    }, sensor_interval);
}

function refresh_ui(){
    var roll_val = sensors.roll
    document.getElementById("rollOverlay").style.transform =
        `rotate(${roll_val}deg)`;

    for (var key in sensors){
        var element = document.getElementById(key);
        if (element){
            var val = sensors[key];
            if (isNaN(val)){
                element.innerHTML = val;
            } else{
                element.innerHTML = val.toFixed(1);
            }
        }
    }

    // Check critical system values
    var voltElem = document.getElementById("voltageTr");
    var diskElem = document.getElementById("diskTr");
    var cpuElem = document.getElementById("cpuTr");
    if (sensors.batteryVoltage < critical.voltage){
        voltElem.className = " table-danger";
    } else{
        voltElem.className = voltElem.className.replace(" table-danger", "");
    }
    if (sensors.free_space < critical.disk_space){
        diskElem.className = " table-danger";
    } else{
        diskElem.className = diskElem.className.replace(" table-danger", "");
    }
    if (sensors.cpu_temp > critical.cpu_temp){
        cpuElem.className = " table-danger";
    } else{
        cpuElem.className = cpuElem.className.replace(" table-danger", "");
    }
}

get_sensor();
const state_timeout = setTimeout(cam_state(), 2000);
