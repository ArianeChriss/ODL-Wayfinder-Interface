/*
 * Handles sensor values and some simple GUI updates
 * https://github.com/trolllabs/eduROV
 */

var keycodes = {l:76, c:67, esc:27, enter:13};
var MOTOR_KEYS = [81, 87, 69, 65, 83, 68];
var stat = {light:false, armed:false, roll_ui:true, cinema:false,
            video_rotation:0};
var sensors = {};/*{time:0, temp:0, pressure:0, humidity:0, header:0, pitch:0, roll:0, yaw:0,
            tempWater:0, pressureWater:0, conductivity:0, batteryVoltage:0, free_space:0,
            cpu_temp:0};*/
var ids = ['mission', 'camera', 'temp', /*'pressure', */'humidity', 'header', 'pitch', 'roll', 'yaw', 'tempWater', 'depthWater', 'pressureWater',
            'conductivity', 'sonar_depth', 'sonar_confi', 'batteryVoltage', 'free_space', 'cpu_temp'];
var critical = {voltage:10.0, disk_space:500.0, cpu_temp:80.0};

var sensor_interval = 1000;
var interval;
var camera_interval;
var file_list;
var directory = "TrialData";
var custom_program_time = 0;
var custom_time_hours = 0;
var custom_time_minutes = 0;
var custom_program_name = "";
var custom_program_list = [];
var program_element = {};
var curr_element;
var rotation = 0;

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function send_keydown(keycode){
    var xhttp = new XMLHttpRequest();
    xhttp.open("GET", "/keydown="+keycode, true);
    xhttp.setRequestHeader("Content-Type", "text/html");
    xhttp.send(null);
}

/*function handle_in_browser(keycode){
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
}*/

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

function fullscreen() {
    var helper = document.getElementById("fullscreen_helper");
    var image = document.getElementById("image");
    if (image.getBoundingClientRect().height > image.getBoundingClientRect().width) {
        image.style.setProperty("height", "100%");
    }
    else {
        image.style.setProperty("width", "100%");
    }
    helper.requestFullscreen();
}

/*function trigger_camera() {
    var btn = document.getElementById("cameraTrigger");
    var xhttp = new XMLHttpRequest();
    xhttp.onreadystatechange = function() {
        if (xhttp.readyState==4 && xhttp.status==200) {
            btn.innerHTML = xhttp.statusText;
            console.log(xhttp.statusText);
            if(xhttp.statusText == "Start Recording") {
                btn.style.setProperty("background", "#0C6338");
                if (camera_interval) {
                    console.log("interval stopped");
                    clearInterval(camera_interval);
                    camera_interval = null;
                }
            }
            else if (xhttp.statusText == "Stop Recording") {
                btn.style.setProperty("background", "#B31C1C");
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

function cam_state() {
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
}*/

function list_download(level){
    var xhttp = new XMLHttpRequest();
    var dir_el = document.getElementById("directory");
    if (level == "base") {
        var download_list = document.getElementById("download_popup");
        xhttp.onreadystatechange = function() {
            if (xhttp.readyState==4 && xhttp.status==200) {
                var files = document.getElementById("files");
                var i, L = files.options.length - 1;
                for(i = L; i >= 0; i--) {
                    files.remove(i);
                }
                file_list = xhttp.responseText.split(';');
                for (var i = 0; i < file_list.length; i++) {
                    var file = file_list[i];
                    if (file.indexOf('HTTP') != -1) {
                        file = file.slice(0, file.indexOf('HTTP'));
                    }
                    var new_file = document.createElement("option");
                    if (file.indexOf('.') == -1) {
                        new_file.innerHTML = "&#128447 " + String(file);
                    }
                    else {
                        new_file.innerHTML = "&#128456 " + String(file);
                    }
                    files.appendChild(new_file);
                }
                var modal = document.getElementById("file_popup");
                modal.style.display = "block";
                directory = "TrialData";
                dir_el.innerText = directory;
            }
        }
        xhttp.open("GET", "download", true);
    }
    else if (level == "open") {
        var files = document.getElementById("files");
        var folder = files.options[files.selectedIndex].text.slice(3);
        xhttp.onreadystatechange = function() {
            if (xhttp.readyState==4 && xhttp.status==200) {
                response_text = xhttp.responseText.split(';');
                var files = document.getElementById("files");
                var i, L = files.options.length - 1; //used to be -1
                for(i = L; i >= 0; i--) {
                    files.remove(i);
                }
                for (var i = 0; i < response_text.length; i++) {
                    var file = response_text[i];
                    if (file.indexOf('HTTP') != -1) {
                        file = file.slice(0, file.indexOf('HTTP'));
                    }
                    var new_file = document.createElement("option");
                    if (file.indexOf('.') == -1) {
                        new_file.innerHTML = "&#128447 " + String(file);
                    }
                    else {
                        new_file.innerHTML = "&#128456 " + String(file);
                    }
                    files.appendChild(new_file);
                }
                /*else if (response_text[0] == "file") {
                    var split_path = directory.split("/");
                    if (split_path.length > 1) {
                        split_path.pop();
                        directory = split_path.join("/");
                        dir_el.innerText = directory;
                        return;
                    }
                    else {
                        return;
                    }
                }*/
            }
        }
        directory += "/" + folder;
        dir_el.innerText = directory;
        xhttp.open("GET", "download/"+directory, true);
    }
    else if (level == "back") {
        var split_path = directory.split("/");
        if (split_path.length > 1) {
            split_path.pop();
            directory = split_path.join("/");
        }
        else {
            return;
        }
        xhttp.onreadystatechange = function() {
            if (xhttp.readyState==4 && xhttp.status==200) {
                var files = document.getElementById("files");
                var i, L = files.options.length - 1;
                for(i = L; i >= 0; i--) {
                    files.remove(i);
                }
                file_list = xhttp.responseText.split(';');
                for (var i = 0; i < file_list.length; i++) {
                    var file = file_list[i];
                    if (file.indexOf('HTTP') != -1) {
                        file = file.slice(0, file.indexOf('HTTP'));
                    }
                    var new_file = document.createElement("option");
                    if (file.indexOf('.') == -1) {
                        new_file.innerHTML = "&#128447 " + String(file);
                    }
                    else {
                        new_file.innerHTML = "&#128456 " + String(file);
                    }
                    files.appendChild(new_file);
                }
            }
        }
        dir_el.innerText = directory;
        xhttp.open("GET", "download/"+directory, true);
    }
    else {
        xhttp.onreadystatechange = function() {
            if (xhttp.readyState==4 && xhttp.status==200) {
                var blob = xhttp.response;
                var filename = "zipped_data.zip";
                var a = document.createElement('a');
                a.href = window.URL.createObjectURL(blob);
                a.download = filename;
                a.dispatchEvent(new MouseEvent('click'));
                var finished_xhttp = new XMLHttpRequest();
                finished_xhttp.open("POST", "finished-download", true);
                finished_xhttp.setRequestHeader("Content-Type", "application/text");
                finished_xhttp.send(null);
            }
        }
        var download_progress = document.getElementById("download_progress");
        download_progress.hidden = false;
        xhttp.upload.onprogress = function(pe) {
            if(pe.lengthComputable) {
                download_progress.setAttribute('aria-valuenow',Number(pe.loaded));
                download_progress.setAttribute('style','width:'+Number(pe.loaded)+'%');
            }
        }
        xhttp.onloadend = function(pe) {
            download_progress.setAttribute('aria-valuenow', Number(0));
            download_progress.setAttribute('style','width:'+Number(0));
            download_progress.hidden = true;
        }
        files = document.getElementById("files");
        var wanted = '';//'{"files":"';
        for (var i = 0; i < files.options.length; i++) {
            if (files.options[i].selected) {
                wanted += String(files.options[i].text.slice(3)) + ';';
            }
        }
        //wanted += '"}'
        console.log(wanted)
        xhttp.open("POST", "download-data/"+directory, true);
        xhttp.setRequestHeader("Content-Type", "application/text");
        xhttp.responseType = 'blob';
        xhttp.send(wanted);
        return;
    }
    xhttp.setRequestHeader("Content-Type", "application/text");
    xhttp.send(null);
}

function delete_file() {
    var xhttp = new XMLHttpRequest();
    var files = document.getElementById("files");
    var to_delete = [];
    for (var i = 0; i < files.options.length; i++) {
        if (files.options[i].selected) {
            to_delete.push(files.options[i].text.slice(3));
        }
    }
    xhttp.open("POST", "delete/"+directory, true);
    xhttp.onreadystatechange = function() {
        if (xhttp.readyState==4 && xhttp.status==200) {
            x2http = new XMLHttpRequest();
            x2http.onreadystatechange = function() {
                if (x2http.readyState==4 && x2http.status==200) {
                    var i, L = files.options.length - 1;
                    for(i = L; i >= 0; i--) {
                        files.remove(i);
                    }
                    var file_list = x2http.responseText.split(';');
                    for (var i = 0; i < file_list.length; i++) {
                        var file = file_list[i];
                        if (file.indexOf('HTTP') != -1) {
                            file = file.slice(0, file.indexOf('HTTP'));
                        }
                        var new_file = document.createElement("option");
                        if (file.indexOf('.') == -1) {
                            new_file.innerHTML = "&#128447 " + String(file);
                        }
                        else {
                            new_file.innerHTML = "&#128456 " + String(file);
                        }
                        files.appendChild(new_file);
                    }
                }
            }
            x2http.open("GET", "download/" + directory, true);
            x2http.setRequestHeader("Content-Type", "application/text");
            x2http.send(null);
        }
    }
    xhttp.setRequestHeader("Content-Type", "application/text");
    xhttp.send(to_delete);
}

function bluetooth_scan() {
    var devices_popup = document.getElementById("bluetooth_popup");
    var scanning_label = document.getElementById("scanning_label");
    //var disconnect_label = document.getElementById("disconnect_label");
    scanning_label.innerHTML = "Scanning for devices...";
    //disconnect_label.innerHTML = "";
    var available_devices = document.getElementById("available_devices");
    var i, L = available_devices.options.length - 1;
    for(i = L; i >= 0; i--) {
        available_devices.remove(i);
    }
    var xhttp = new XMLHttpRequest();
    xhttp.onreadystatechange = function() {
        if (xhttp.readyState==4 && xhttp.status==200) {
            scanning_label.innerHTML = "Select device to pair:";
            //disconnect_label.innerHTML = "Select paired device to disconnect:";
            var device_list = xhttp.responseText.split(';');
            for (var i = 0; i < device_list.length; i++) {
                var device = device_list[i];
                if (device != '') {
                    var new_device = document.createElement("option");
                    new_device.innerHTML = String(device);
                    available_devices.appendChild(new_device);
                }
            }
            if (available_devices.options.length == 0) {
                scanning_label.innerHTML = "No pairable devices found.";
            }
        }
    }
    var modal = document.getElementById("bluetooth_popup");
    modal.style.display = "block";
    xhttp.open("GET", "bluetooth-scan", true);
    xhttp.setRequestHeader("Content-Type", "application/text");
    xhttp.send(null);
}

function bluetooth_connect() {
    var devices = document.getElementById("available_devices");
    var connected_devices = document.getElementById("connected_devices");
    var connection = "";
    for (var i = 0; i < devices.options.length; i++) {
        if (devices.options[i].selected) {
            connection = devices.options[i].text;
        }
    }
    var xhttp = new XMLHttpRequest();
    xhttp.onreadystatechange = function() {
        if (xhttp.readyState==4 && xhttp.status==200) {
            for (var i = 0; i < devices.options.length; i++) {
                if (devices.options[i].selected) {
                    var new_device = document.createElement("option");
                    new_device.innerHTML = String(devices.options[i].text);
                    connected_devices.appendChild(new_device);
                    devices.remove(i);
                }
            }
        }
    }
    xhttp.open("POST", "bluetooth-connect", true);
    xhttp.setRequestHeader("Content-Type", "application/text");
    xhttp.send(connection);
    //setTimeout(bluetooth_check(connection), 5000);
}

function bluetooth_check(address) {
    var xhttp = new XMLHttpRequest();
    if (address != null) {
        xhttp.open("POST", "bluetooth-check-" + address, true);
    }
    else {
        xhttp.open("POST", "bluetooth-check", true);
    }
    xhttp.onreadystatechange = function() {
        if (xhttp.readyState==4 && xhttp.status==200) {
            var status = document.getElementById("bluetooth_check_spacer");
            //console.log(status);
            var status_output = document.createTextNode(xhttp.responseText);
            status.appendChild(document.createTextNode(xhttp.responseText));
            console.log(status_output)
            //console.log(xhttp.responseText);
            //status.innerHTML = xhttp.responseText;
        }
    }
    xhttp.setRequestHeader("Content-Type", "application/text");
    xhttp.send(null)
}

// MAKE NEW FUNCTION TO TEST WHETHER BLUETOOTH DEVICE HAS CONNECTED ON TIMEOUT

function program_list() {
    var available_programs = document.getElementById("available_programs");
    var i, L = available_programs.options.length - 1;
    for(i = L; i >= 0; i--) {
        available_programs.remove(i);
    }
    var xhttp = new XMLHttpRequest();
    xhttp.onreadystatechange = function() {
        if (xhttp.readyState==4 && xhttp.status==200) {
            var program_list = xhttp.responseText.split(';');
            console.log(program_list);
            for (var i = 0; i < program_list.length; i++) {
                var new_program = document.createElement("option");
                new_program.innerHTML = String(program_list[i]);
                new_program.value = String(program_list[i]);
                available_programs.appendChild(new_program);
            }
            available_programs.setAttribute("onchange", "preview_program(this.value)");
            var program_preview = document.getElementById("program-preview");
            program_preview.innerHTML = "";
        }
    }
    var modal = document.getElementById("program_popup");
    modal.style.display = "block";
    xhttp.open("GET", "program-list", true);
    xhttp.setRequestHeader("Content-Type", "application/text");
    xhttp.send(null);
}

function create_program() {
    var modal = document.getElementById("new_program_popup");
    var timeline = document.getElementById("drag_timeline");
    timeline.innerHTML = "";
    modal.style.display = "block";
    var name_element = document.getElementById("program-name");
    name_element.value = "";
    var hours_element = document.getElementById("length-hours");
    hours_element.value = "";
    var minutes_element = document.getElementById("length-minutes");
    minutes_element.value = "";
}

function custom_name() {
    var name_element = document.getElementById("program-name");
    custom_program_name = name_element.value;
}

function custom_hours() {
    var hours_element = document.getElementById("length-hours");
    custom_time_hours = parseInt(hours_element.value);
    custom_program_time = (custom_time_hours * 60) + custom_time_minutes;
}

function custom_minutes() {
    var minutes_element = document.getElementById("length-minutes");
    custom_time_minutes = parseInt(minutes_element.value);
    custom_program_time = (custom_time_hours * 60) + custom_time_minutes;
}

function allow_sensor_drop(e) {
    e.preventDefault();
}

function sensor_drag(e) {
    e.dataTransfer.setData("text", e.target.id);
}

function sensor_drop(e) {
    e.preventDefault();
    if (custom_program_time == 0 || custom_program_name == "") {
        var reminder = document.getElementById("timing_reminder");
        if (reminder != undefined) {
            return;
        }
        else {
            var window_content = document.getElementById("timing_spacer");
            var element_timing_div = document.createElement("div");
            element_timing_div.setAttribute("id", "timing_reminder");
            window_content.appendChild(element_timing_div);
            var new_content = document.createTextNode("Please enter a program name and time");
            element_timing_div.appendChild(new_content);
        }
    }
    else {
        for (var i = 0; i < custom_program_list.length; i++) {
            if (custom_program_list[i].start_time == NaN || custom_program_list[i].start_time == undefined || custom_program_list[i].end_time == NaN || custom_program_list[i].end_time == undefined) {
                return;
            }
        }
        var data = e.dataTransfer.getData("text");
        var old_drag = document.getElementById(data);
        var new_drag = old_drag.cloneNode(true);
        e.target.appendChild(new_drag);
        var style = old_drag.getAttribute("style");
        program_element = {};
        var top = "05.00%";
        if (old_drag.getAttribute("id") == "nav_drag") { program_element.type = "nav"; top = "20.83%"; }
        if (old_drag.getAttribute("id") == "cond_drag") { program_element.type = "cond"; top = "36.67%"; }
        if (old_drag.getAttribute("id") == "env_drag") { program_element.type = "temp"; top = "52.50%"; }
        if (old_drag.getAttribute("id") == "sys_drag") { program_element.type = "depth"; top = "68.33%"; }
        if (old_drag.getAttribute("id") == "sonar_drag") { program_element.type = "sonar"; top = "84.17%"; }
        var left_pos = e.clientX;
        var left = ((left_pos - e.target.getBoundingClientRect().x) / e.target.getBoundingClientRect().width) * 100
        var left_string = String(left)  + "%";
        if (left + 15 > 100) {
            width = 99 - left;
            width_string = String(width) + "%"
        }
        else {
            width_string = "15%";
        }
        var style = style + "position: absolute; height: 10.83%; top: " + top + "; left: " + left_string + "; width: " + width_string;
        new_drag.setAttribute("style", style);
        new_drag.innerHTML = "";
        var starttime = (left / 100) * custom_program_time;
        new_drag.setAttribute("data-starttime", starttime);
        var endtime = starttime + (custom_program_time * 0.15);
        if (endtime > custom_program_time) {
            endtime = custom_program_time;
        }
        new_drag.setAttribute("data-endtime", endtime);
        new_drag.setAttribute("onclick", "display_timing(event)");
        var window_content = document.getElementById("timing_spacer");
        var element_timing_div = document.getElementById("timing_reminder");
        if (element_timing_div != undefined) {
            element_timing_div.replaceChildren();
        }
        else {
            element_timing_div = document.createElement("div");
            element_timing_div.setAttribute("id", "timing_reminder");
        }
        window_content.appendChild(element_timing_div);
        var new_content_1 = document.createTextNode("Start Time:  ");
        element_timing_div.appendChild(new_content_1);
        var new_content_2 = document.createElement("input");
        element_timing_div.appendChild(new_content_2);
        new_content_2.setAttribute("id", "element_hours_start");
        new_content_2.setAttribute("style", "width: 4%; background-color: #555555; color: white; border-radius: 0.15rem; border: 0px; text-align: right; margin: 0.5%;");
        new_content_2.setAttribute("onchange", "set_element_attribute('element_hours_start')");
        var new_content_3 = document.createTextNode(" hours   ");
        element_timing_div.appendChild(new_content_3);
        var new_content_4 = document.createElement("input");
        element_timing_div.appendChild(new_content_4);
        new_content_4.setAttribute("id", "element_minutes_start");
        new_content_4.setAttribute("style", "width: 4%; background-color: #555555; color: white; border-radius: 0.15rem; border: 0px; text-align: right; margin: 0.5%;");
        new_content_4.setAttribute("onchange", "set_element_attribute('element_minutes_start')");
        var new_content_5 = document.createTextNode(" minutes");
        element_timing_div.appendChild(new_content_5);
        var new_content_6 = document.createElement("br");
        element_timing_div.appendChild(new_content_6);
        var new_content_7 = document.createTextNode("End Time:  ");
        element_timing_div.appendChild(new_content_7);
        var new_content_8 = document.createElement("input");
        element_timing_div.appendChild(new_content_8);
        new_content_8.setAttribute("id", "element_hours_end");
        new_content_8.setAttribute("style", "width: 4%; background-color: #555555; color: white; border-radius: 0.15rem; border: 0px; text-align: right; margin: 0.5%;");
        new_content_8.setAttribute("onchange", "set_element_attribute('element_hours_end')");
        var new_content_9 = document.createTextNode(" hours   ");
        element_timing_div.appendChild(new_content_9);
        var new_content_10 = document.createElement("input");
        element_timing_div.appendChild(new_content_10);
        new_content_10.setAttribute("id", "element_minutes_end");
        new_content_10.setAttribute("style", "width: 4%; background-color: #555555; color: white; border-radius: 0.15rem; border: 0px; text-align: right; margin: 0.5%;");
        new_content_10.setAttribute("onchange", "set_element_attribute('element_minutes_end')");
        var new_content_11 = document.createTextNode(" minutes");
        element_timing_div.appendChild(new_content_11);
        custom_program_list.push(program_element);
        curr_element = new_drag;
    }
}

function set_element_attribute(id) {
    var element_attribute = document.getElementById(id);
    if (id == "element_hours_start") {
        if (element_attribute.value != undefined) {
            var minute_element = document.getElementById("element_minutes_start");
            if (minute_element != null) {
                var minutes = parseInt(minute_element.value);
                if (isNaN(minutes)) {
                    minutes = 0;
                }
            }
            else {
                var minutes = 0;
            }
            var new_start = (parseInt(element_attribute.value) * 60) + minutes;
            program_element.start_time = new_start;
            var new_left = 100 * new_start / custom_program_time;
            var new_left_string = String(new_left.toFixed(2)).slice(0, 4);
            if (new_left_string.length < 4) {
                new_left_string = "0" + new_left_string;
            }
            if (program_element.end_time == null) {
                curr_element.style.setProperty("left", new_left_string + "%");
                var starttime = (new_left / 100) * custom_program_time;
                curr_element.setAttribute("data-starttime", starttime);
            }
            else {
                var new_width = (100 * (program_element.end_time - new_start)) / custom_program_time;
                var new_width_string = String(new_width.toFixed(2)).slice(0, 4);
                if (new_width_string.length < 4) {
                    new_width_string = "0" + new_width_string;
                }
                curr_element.style.setProperty("left", new_left_string + "%");
                var starttime = (new_left / 100) * custom_program_time;
                curr_element.setAttribute("data-starttime", starttime);
                curr_element.style.setProperty("width", new_width_string + "%");
                var endtime = starttime + (custom_program_time * new_width / 100);
                curr_element.setAttribute("data-endtime", endtime);
            }
        }
    }
    else if (id == "element_minutes_start") {
        if (element_attribute.value != undefined) {
            if (program_element.start_time != null) {
                var hours_element = document.getElementById("element_hours_start");
                if (hours_element != null) {
                    var hours = parseInt(hours_element.value) * 60;
                    if (isNaN(hours)) {
                        hours = 0;
                    }
                    var new_start = hours + parseFloat(element_attribute.value);
                }
                else {
                    var new_start = parseFloat(element_attribute.value);
                }
                program_element.start_time = new_start;
            }
            var new_left = 100 * new_start / custom_program_time;
            var new_left_string = String(new_left.toFixed(2)).slice(0, 4);
            if (new_left_string.length < 4) {
                new_left_string = "0" + new_left_string;
            }
            if (program_element.end_time == null) {
                curr_element.style.setProperty("left", new_left_string + "%");
                var starttime = (new_left / 100) * custom_program_time;
                curr_element.setAttribute("data-starttime", starttime);
            }
            else {
                var new_width = (100 * (program_element.end_time - new_start)) / custom_program_time;
                var new_width_string = String(new_width.toFixed(2)).slice(0, 4);
                if (new_width_string.length < 4) {
                    new_width_string = "0" + new_width_string;
                }
                curr_element.style.setProperty("left", new_left_string + "%");
                var starttime = (new_left / 100) * custom_program_time;
                curr_element.setAttribute("data-starttime", starttime);
                curr_element.style.setProperty("width", new_width_string + "%");
                var endtime = starttime + (custom_program_time * new_width / 100);
                curr_element.setAttribute("data-endtime", endtime);
            }
        }
    }
    else if (id == "element_hours_end") {
        if (element_attribute.value != undefined) {
            var minute_element = document.getElementById("element_minutes_end");
            if (minute_element != null) {
                var minutes = parseInt(minute_element.value);
                if (isNaN(minutes)) {
                    minutes = 0;
                }
            }
            else {
                var minutes = 0;
            }
            var new_end = (parseFloat(element_attribute.value) * 60) + minutes;
            program_element.end_time = new_end;
            if (program_element.start_time!= null) {
                var new_width = 100 * (new_end - program_element.start_time) / custom_program_time;
                var new_width_string = String(new_width.toFixed(2));
            }
            else {
                var new_width_string = "10";
            }
            var starttime = parseFloat(curr_element.getAttribute("data-starttime"));
            curr_element.style.setProperty("width", new_width_string + "%");
            var endtime = starttime + (custom_program_time * new_width / 100);
            curr_element.setAttribute("data-endtime", endtime);
        }
    }
    else if (id == "element_minutes_end") {
        if (element_attribute.value != undefined) {
            var hour_element = document.getElementById("element_hours_end");
            if (hour_element != null) {
                var hours = parseInt(hour_element.value);
                if (isNaN(hours)) {
                    hours = 0;
                }
            }
            else {
                var hours = 0;
            }
            var new_end = parseFloat(element_attribute.value) + (hours * 60);
            program_element.end_time = new_end;
            if (program_element.start_time!= null) {
                var new_width = 100 * (new_end - program_element.start_time) / custom_program_time;
                var new_width_string = String(new_width.toFixed(2));
            }
            else {
                var new_width_string = "10";
            }
            var starttime = parseFloat(curr_element.getAttribute("data-starttime"));
            curr_element.style.setProperty("width", new_width_string + "%");
            var endtime = starttime + (custom_program_time * new_width / 100);
            curr_element.setAttribute("data-endtime", endtime);
            
        }
    }
}

function display_timing(event) {
    var window_content = document.getElementById("timing_spacer");
    var element_timing_div = document.getElementById("timing_reminder");
    if (element_timing_div != undefined) {
        element_timing_div.replaceChildren();
    }
    else {
        element_timing_div = document.createElement("div");
        element_timing_div.setAttribute("id", "timing_reminder");
    }
    window_content.appendChild(element_timing_div);
    var new_content_1 = document.createTextNode("Start Time:  ");
    element_timing_div.appendChild(new_content_1);
    var new_content_2 = document.createElement("input");
    var hours_start = (parseInt(event.target.getAttribute("data-starttime")) - (parseInt(event.target.getAttribute("data-starttime")) % 60)) / 60;
    new_content_2.setAttribute("value", hours_start);
    element_timing_div.appendChild(new_content_2);
    new_content_2.setAttribute("id", "element_hours_start");
    new_content_2.setAttribute("style", "width: 4%; background-color: #555555; color: white; border-radius: 0.15rem; border: 0px; text-align: right; margin: 0.5%;");
    new_content_2.setAttribute("onchange", "set_element_attribute('element_hours_start')");
    var new_content_3 = document.createTextNode(" hours   ");
    element_timing_div.appendChild(new_content_3);
    var new_content_4 = document.createElement("input");
    var minutes_start = parseInt(event.target.getAttribute("data-starttime")) % 60;
    new_content_4.setAttribute("value", minutes_start);
    element_timing_div.appendChild(new_content_4);
    new_content_4.setAttribute("id", "element_minutes_start");
    new_content_4.setAttribute("style", "width: 4%; background-color: #555555; color: white; border-radius: 0.15rem; border: 0px; text-align: right; margin: 0.5%;");
    new_content_4.setAttribute("onchange", "set_element_attribute('element_minutes_start')");
    var new_content_5 = document.createTextNode(" minutes");
    element_timing_div.appendChild(new_content_5);
    var new_content_6 = document.createElement("br");
    element_timing_div.appendChild(new_content_6);
    var new_content_7 = document.createTextNode("End Time:  ");
    element_timing_div.appendChild(new_content_7);
    var new_content_8 = document.createElement("input");
    var hours_end = (parseInt(event.target.getAttribute("data-endtime")) - (parseInt(event.target.getAttribute("data-endtime")) % 60)) / 60;
    new_content_8.setAttribute("value", hours_end);
    element_timing_div.appendChild(new_content_8);
    new_content_8.setAttribute("id", "element_hours_end");
    new_content_8.setAttribute("style", "width: 4%; background-color: #555555; color: white; border-radius: 0.15rem; border: 0px; text-align: right; margin: 0.5%;");
    new_content_8.setAttribute("onchange", "set_element_attribute('element_hours_end')");
    var new_content_9 = document.createTextNode(" hours   ");
    element_timing_div.appendChild(new_content_9);
    var new_content_10 = document.createElement("input");
    var minutes_end = parseInt(event.target.getAttribute("data-endtime")) % 60;
    new_content_10.setAttribute("value", minutes_end);
    element_timing_div.appendChild(new_content_10);
    new_content_10.setAttribute("id", "element_minutes_end");
    new_content_10.setAttribute("style", "width: 4%; background-color: #555555; color: white; border-radius: 0.15rem; border: 0px; text-align: right; margin: 0.5%;");
    new_content_10.setAttribute("onchange", "set_element_attribute('element_minutes_end')");
    var new_content_11 = document.createTextNode(" minutes");
    element_timing_div.appendChild(new_content_11);
    var br = document.createElement("br");
    element_timing_div.appendChild(br);
    var new_content_12 = document.createElement("button");
    new_content_12.innerHTML = "Delete Program Element";
    new_content_12.setAttribute("style", "text-align: center; background: #B31C1C; color: #FFFFFF; border-radius: 0.1rem; border: 0px; text-align: center; font-family: Montserrat; margin-top: 0.5rem;")
    new_content_12.addEventListener("click", function() {
        event.target.remove();
        element_timing_div.replaceChildren();
        });
    element_timing_div.appendChild(new_content_12);
}

function save_new_program() {
    var newProg = {"name": custom_program_name, "length": custom_program_time, "elements": []}
    var timeline = document.getElementById("drag_timeline");
        if (timeline.children.length > 0) {
        for (var i = 0; i < timeline.children.length; i++) {
            var newEl = timeline.children.item(i);
            var newData = {"sensor": newEl.id, "start": newEl.getAttribute("data-starttime"), "end": newEl.getAttribute("data-endtime")};
            newProg.elements.push(newData);
        }
        var xhttp = new XMLHttpRequest();
        xhttp.open("POST", "save-mission", true);
        xhttp.setRequestHeader("Content-Type", "application/json");
        xhttp.send(JSON.stringify(newProg));
    }
    close_modal("new_program_popup");
    close_modal("program_popup");
    setTimeout(program_list, 500);
}

function delete_mission() {
    var xhttp = new XMLHttpRequest();
    var missions_list = document.getElementById("available_programs");
    var mission = missions_list.options[missions_list.selectedIndex].text;
    xhttp.onreadystatechange = function() {
        if (xhttp.readyState==4 && xhttp.status==200) {
            program_list();
        }
    }
    xhttp.open("POST", "mission-delete", true);
    xhttp.setRequestHeader("Content-Type", "application/text");
    xhttp.send(mission);
}

function start_mission() {
    var xhttp = new XMLHttpRequest();
    var missions_list = document.getElementById("available_programs");
    var mission = missions_list.options[missions_list.selectedIndex].text;
    xhttp.onreadystatechange = function() {
        if (xhttp.readyState==4 && xhttp.status==200) {
            if (xhttp.statusText == "mission started") {
                close_modal("program_popup");
                var programmer = document.getElementById("programmer");
                programmer.style.setProperty("background", "#B31C1C");
                programmer.innerHTML = "Stop Mission";
                programmer.setAttribute("onclick", "cancel_mission()");
            }
        }
    }
    //var mission_format = '{"mission":"' + mission + '"}';
    xhttp.open("POST", "mission-start/"+mission, true);
    xhttp.setRequestHeader("Content-Type", "application/text");
    xhttp.send(null);
}

function preview_program(selection) {
    var xhttp = new XMLHttpRequest();
    xhttp.onreadystatechange = function() {
        if (xhttp.readyState==4 && xhttp.status==200) {
            var program_preview = document.getElementById("program-preview");
            program_preview.innerHTML = "";
            console.log(xhttp.responseText);
            var program = JSON.parse(xhttp.responseText);
            console.log(program);
            for (var i = 0; i < program.elements.length; i++) {
                var sensor = document.createElement("button");
                sensor.style.setProperty("top", "5%");
                sensor.setAttribute("class", "drag-element vid-record");
                sensor.style.setProperty("background-color", "#AAAAAA");
                sensor.style.setProperty("height", "10.83%");
                sensor.style.setProperty("position", "absolute");
                if (program.elements[i].sensor == "nav_drag") {
                    sensor.style.setProperty("top", "20.83%");
                    sensor.setAttribute("class", "drag-element nav-sensor");
                    sensor.style.setProperty("background-color", "#BC6F20");
                }
                if (program.elements[i].sensor == "cond_drag") {
                    sensor.style.setProperty("top", "36.67%");
                    sensor.setAttribute("class", "drag-element cond-sensor");
                    sensor.style.setProperty("background-color", "#9E8F35");
                }
                if (program.elements[i].sensor == "env_drag") {
                    sensor.style.setProperty("top", "52.50%");
                    sensor.setAttribute("class", "drag-element environment-sensor");
                    sensor.style.setProperty("background-color", "#A92729");
                }
                if (program.elements[i].sensor == "sys_drag") {
                    sensor.style.setProperty("top", "68.33%");
                    sensor.setAttribute("class", "drag-element system-sensor");
                    sensor.style.setProperty("background-color", "#4064AE");
                }
                if (program.elements[i].sensor == "sonar_drag") {
                    sensor.style.setProperty("top", "84.17%");
                    sensor.setAttribute("class", "drag-element sonar-sensor");
                    sensor.style.setProperty("background-color", "#0C6338");
                }
                sensor.style.setProperty("left", String(parseFloat(program.elements[i].start) / parseFloat(program.length) * 100) + "%");
                sensor.style.setProperty("width", String((((parseFloat(program.elements[i].end)) - parseFloat(program.elements[i].start)) / parseFloat(program.length)) * 100) + "%");
                console.log(program.length, "length", program.elements[i].start, "start");
                program_preview.appendChild(sensor);
            }
        }
    }
    xhttp.open("GET", "program-select/" + selection.slice(0,-5), true);
    xhttp.setRequestHeader("Content-Type", "application/text");
    xhttp.send(null);
}

function close_modal(modal_element) {
    var modal = document.getElementById(modal_element);
    modal.style.display = "none";
    if (modal_element == "new_program_popup") {
        var reminder = document.getElementById("timing_reminder");
        if (reminder == undefined) {
            return;
        }
        else {
            reminder.innerHTML = "";
        }
    }
}

function toggle_roll(){
    var roll = document.getElementById("rollOverlay");
    if (roll.style.display == "block") {
        roll.setAttribute("style", "display: none;");
    }
    else {
        roll.setAttribute("style", "display: block;");
    }
    /*
    if(stat.roll_ui){
        document.getElementById("rollOverlay").style.visibility = "hidden";
        btn.className = btn.className.replace(" active", "");
    }else{
        document.getElementById("rollOverlay").style.visibility = "visible";
        btn.className += " active";
    }
    stat.roll_ui = !stat.roll_ui;*/
}

function stop_rov(){
    var xhttp = new XMLHttpRequest();
    xhttp.open("GET", "stop", true);
    xhttp.setRequestHeader("Content-Type", "application/text");
    xhttp.send();
    setTimeout(() => {
        location.reload();
        }, 3000);
}

function rotate_image(){
    root = document.querySelector(":root");
    var image = document.getElementById("image");
    var helper = document.getElementById("fullscreen_helper");
    if (rotation == 0) {
        rotation = 90;
        root.style.setProperty("--deg", "90deg");
        image.style.setProperty("width", "75%");
        var newHeight = image.getBoundingClientRect().height;
        helper.style.setProperty("height", String(newHeight) + "px");
        image.style.setProperty("top", String((newHeight - image.getBoundingClientRect().width) / 2) + "px");
        image.style.setProperty("left", "12.5%");
    }
    else if (rotation == 90) {
        rotation = 180;
        root.style.setProperty("--deg", "180deg");
        image.style.setProperty("width", "100%");
        var newHeight = image.getBoundingClientRect().height;
        helper.style.setProperty("height", String(newHeight) + "px");
        image.style.setProperty("top", "0px");
        image.style.setProperty("left", "0%");
    }
    else if (rotation == 180) {
        rotation = 270;
        root.style.setProperty("--deg", "270deg");
        image.style.setProperty("width", "75%");
        var newHeight = image.getBoundingClientRect().height;
        helper.style.setProperty("height", String(newHeight) + "px");
        image.style.setProperty("top", String((newHeight - image.getBoundingClientRect().width) / 2) + "px");
        image.style.setProperty("left", "12.5%");
    }
    else if (rotation == 270) {
        rotation = 0;
        root.style.setProperty("--deg", "0deg");
        image.style.setProperty("width", "100%");
        var newHeight = image.getBoundingClientRect().height;
        helper.style.setProperty("height", String(newHeight) + "px");
        image.style.setProperty("top", "0px");
        image.style.setProperty("left", "0%");
    }
    /*stat.video_rotation += 90;
    rotation = stat.video_rotation;
    document.getElementById("image").style.transform =
        `rotate(${rotation}deg)`;*/
}

function enable(current_sense) {
    if (current_sense != "all") {
        var xhttp = new XMLHttpRequest();
        xhttp.onreadystatechange = function() {
            if (this.readyState == 4 && this.status == 200) {
                var status = xhttp.statusText;
                if (status == "disabled") {
                    if (current_sense != "camera") {
                        button.style.setProperty("background", "#187D8B");
                        button.innerHTML = "Enable";
                        var enable_all = document.getElementById("all");
                        enable_all.style.setProperty("background", "#187D8B");
                        enable_all.innerHTML = "Enable All";
                    }
                    else {
                        button.style.setProperty("background", "#0C6338");
                        button.innerHTML = "Start Recording";
                    }
                }
            }
        }
        xhttp.open("POST", "enable-" + current_sense, "true");
        xhttp.send();
        var button = document.getElementById(current_sense);
        if (button.innerHTML == "Enable") {
            button.style.setProperty("background", "#B31C1C");
            button.innerHTML = "Disable";
        }
        if (current_sense == "camera") {
            if (button.innerHTML == "Start Recording") {
                button.style.setProperty("background", "#B31C1C");
                button.innerHTML = "Stop Recording";
            }
        }
    }
    else {
        var camera_enable = document.getElementById("camera");
        if (camera_enable.innerHTML == "Stop Recording") {
            var camera_xhttp = new XMLHttpRequest();       // change ALL OF THESE TO ONLY SEND REQUEST IF NOT ENABLED
            camera_xhttp.onreadystatechange = function() {
                if (this.readyState == 4 && this.status == 200) {
                    var status = camera_xhttp.statusText;
                    if (status == "disabled") {
                        camera_enable.style.setProperty("background", "#0C6338");
                        camera_enable.innerHTML = "Start Recording";
                        enable_all.style.setProperty("background", "#187D8B");
                        enable_all.innerHTML = "Enable All";
                    }
                }
            }
            camera_xhttp.open("POST", "enable-camera", "true");
            camera_xhttp.send();
            camera_enable.style.setProperty("background", "#B31C1C");
            orientation_enable.innerHTML = "Stop Recording";
        }
        var orientation_enable = document.getElementById("orientation");
        if (orientation_enable.innerHTML == "Enable") {
            var orientation_xhttp = new XMLHttpRequest();
            orientation_xhttp.onreadystatechange = function() {
                if (this.readyState == 4 && this.status == 200) {
                    var status = orientation_xhttp.statusText;
                    if (status == "disabled") {
                        orientation_enable.style.setProperty("background", "#187D8B");
                        orientation_enable.innerHTML = "Enable";
                        enable_all.style.setProperty("background", "#187D8B");
                        enable_all.innerHTML = "Enable All";
                    }
                }
            }
            orientation_xhttp.open("POST", "enable-orientation", "true");
            orientation_xhttp.send();
            orientation_enable.style.setProperty("background", "#B31C1C");
            orientation_enable.innerHTML = "Disable";
        }
        var environment_enable = document.getElementById("environment");
        if (environment_enable.innerHTML == "Enable") {
            var environment_xhttp = new XMLHttpRequest();
            environment_xhttp.onreadystatechange = function() {
                if (this.readyState == 4 && this.status == 200) {
                    var status = environment_xhttp.statusText;
                    if (status == "disabled") {
                        environment_enable.style.setProperty("background", "#187D8B");
                        environment_enable.innerHTML = "Enable";
                        enable_all.style.setProperty("background", "#187D8B");
                        enable_all.innerHTML = "Enable All";
                    }
                }
            }
            environment_xhttp.open("POST", "enable-environment", "true");
            environment_xhttp.send();
            environment_enable.style.setProperty("background", "#B31C1C");
            environment_enable.innerHTML = "Disable";
        }
        var bt_serial_enable = document.getElementById("bt_serial");
        if (bt_serial_enable.innerHTML == "Enable") {
            var bt_serial_xhttp = new XMLHttpRequest();
            bt_serial_xhttp.onreadystatechange = function() {
                if (this.readyState == 4 && this.status == 200) {
                    var status = bt_serial_xhttp.statusText;
                    if (status == "disabled") {
                        bt_serial_enable.style.setProperty("background", "#187D8B");
                        bt_serial_enable.innerHTML = "Enable";
                        enable_all.style.setProperty("background", "#187D8B");
                        enable_all.innerHTML = "Enable All";
                    }
                }
            }
            bt_serial_xhttp.open("POST", "enable-bt_serial", "true");
            bt_serial_xhttp.send();
            bt_serial_enable.style.setProperty("background", "#B31C1C");
            bt_serial_enable.innerHTML = "Disable";
        }
        var sonar_enable = document.getElementById("sonar");
        if (sonar_enable.innerHTML == "Enable") {
            var sonar_xhttp = new XMLHttpRequest();
            sonar_xhttp.onreadystatechange = function() {
                if (this.readyState == 4 && this.status == 200) {
                    var status = sonar_xhttp.statusText;
                    if (status == "disabled") {
                        sonar_enable.style.setProperty("background", "#187D8B");
                        sonar_enable.innerHTML = "Enable";
                        enable_all.style.setProperty("background", "#187D8B");
                        enable_all.innerHTML = "Enable All";
                    }
                }
            }
            sonar_xhttp.open("POST", "enable-sonar", "true");
            sonar_xhttp.send();
            sonar_enable.style.setProperty("background", "#B31C1C");
            sonar_enable.innerHTML = "Disable";
        }
        var system_enable = document.getElementById("system_monitor");
        if (system_enable.innerHTML == "Enable") {
            var system_xhttp = new XMLHttpRequest();
            system_xhttp.onreadystatechange = function() {
                if (this.readyState == 4 && this.status == 200) {
                    var status = system_xhttp.statusText;
                    if (status == "disabled") {
                        system_enable.style.setProperty("background", "#187D8B");
                        system_enable.innerHTML = "Enable";
                        enable_all.style.setProperty("background", "#187D8B");
                        enable_all.innerHTML = "Enable All";
                    }
                }
            }
            system_xhttp.open("POST", "enable-system_monitor", "true");
            system_xhttp.send();
            system_enable.style.setProperty("background", "#B31C1C");
            system_enable.innerHTML = "Disable";
        }
        var enable_all = document.getElementById("all");
        /*if (orientation_enable.innerHTML == "Disable" && environment_enable.innerHTML == "Disable" &&
            bt_serial_enable.innerHTML == "Disable" && sonar_enable.innerHTML == "Disable" && system_enable.innerHTML == "Disable") {
            enable_all.style.setProperty("background", "#B31C1C");
            enable_all.innerHTML = "Disable All";
        }*/
    }
}

function cancel_mission() {
    close_modal("program_popup");
    var xhttp = new XMLHttpRequest();
    xhttp.open("POST", "cancel-mission", true);
    xhttp.send();
}

function motor(direction) {
    var xhttp = new XMLHttpRequest();
    if (direction == "left") {
        xhttp.open("POST", "motor-left", true);
    }
    else if (direction == "right") {
        xhttp.open("POST", "motor-right", true);
    }
    xhttp.send();
}

function get_sensor_stream(){
    var xhttp = new XMLHttpRequest();
    var icon = document.getElementById("online_icon");
    var label = document.getElementById("online_label");
    xhttp.onreadystatechange = function() {
        if (this.readyState == 3 && this.status == 200) {
            //icon.style.setProperty("background", "#34EB43");
            //label.innerHTML = "Connected";
            console.log(this.responseText);
            var response = JSON.parse(this.responseText);
            sensor_interval = setInterval(function() {
                response = JSON.parse(this.responseText);
                console.log(response);
                for (var key in ids) {
                    if (ids[key] in response) {
                        sensors[ids[key]] = response[ids[key]];
                    }
                    else {
                        delete sensors[ids[key]]
                    }
                }
                refresh_ui();
            }, 1000);
            //sensor_interval = setInterval(console.log(xhttp.responseText), 500);
        }
        else {
            //icon.style.setProperty("background", "#B31C1C");
            //label.innerHTML = "Disconnected";
        }
    }
    xhttp.open("GET", "streaming-data", true);
    xhttp.send();
}

function get_sensor(){
    var xhttp = new XMLHttpRequest();
    var icon = document.getElementById("online_icon");
    var label = document.getElementById("online_label");
    xhttp.onreadystatechange = function() {
        if (this.readyState == 4 && this.status == 200) {
            icon.style.setProperty("background", "#34EB43");
            label.innerHTML = "Connected";
            var response = JSON.parse(this.responseText);
            for (var key in ids) {
                if (ids[key] in response) {
                    sensors[ids[key]] = response[ids[key]];
                }
                else {
                    delete sensors[ids[key]]
                }
            }
            refresh_ui();
        }
        if (this.readyState == 4 && this.status != 200) {
            icon.style.setProperty("background", "#B31C1C");
            label.innerHTML = "Disconnected";
        }
    };
    xhttp.open("GET", "sensor", true);
    xhttp.send();

    // Reset interval
    interval = setInterval(function () {
        clearInterval(interval);
        get_sensor();
    }, sensor_interval);
}

function refresh_ui(){
    var roll_val = sensors.roll
    /*document.getElementById("rollOverlay").style.transform =
        `rotate(${roll_val}deg)`;*/

    for (var i = 0; i < ids.length; i++) {
        if ((ids[i] != "camera") && (ids[i] != "mission")) {
            var element = document.getElementById(ids[i]);
            //console.log(ids[i])
            //console.log(element)
            if (ids[i] in sensors){
                //console.log(ids[i])
                var val = sensors[ids[i]];
                /*if (Number.isNaN(val)){*/
                if (typeof val != "number") {
                    element.innerHTML = val;
                } else{
                    element.innerHTML = val.toFixed(1);
                }
            }
            else if (element != null) {
                element.innerHTML = "";
            }
            //console.log(sensors);
        }
    }

    // Check critical system values
    //var voltElem = document.getElementById("voltageTr");
    var diskElem = document.getElementById("diskTr");
    var cpuElem = document.getElementById("cpuTr");
    /*if (sensors.batteryVoltage < critical.voltage){
        voltElem.className = " table-danger";
    } else{
        voltElem.className = voltElem.className.replace(" table-danger", "");
    }*/
    if (sensors.free_space < critical.disk_space){
        diskElem.style.setProperty("color", "#B31C1C");
    } else{
        diskElem.style.setProperty("color", "#DDDDDD");
    }
    if (sensors.cpu_temp > critical.cpu_temp){
        cpuElem.style.setProperty("color", "#B31C1C");
    } else{
        cpuElem.style.setProperty("color", "#DDDDDD");
    }
    var mission_control = document.getElementById('programmer');
    if ('mission' in sensors) {
        mission_control.style.setProperty("background", "#911717");
        mission_control.innerHTML = "Stop Mission";
        mission_control.setAttribute("onclick", "cancel_mission()");
    }
    else {
        mission_control.style.setProperty("background", "#004D64");
        mission_control.innerHTML = "Choose/Create Mission";
        mission_control.setAttribute("onclick", "program_list()");
    }
    var camera_start = document.getElementById('camera');
    if ('camera' in sensors) {
        camera_start.style.setProperty("background", "#B31C1C");
        camera_start.innerHTML = "Stop Recording";
    }
    else {
        camera_start.style.setProperty("background", "#0C6338");
        camera_start.innerHTML = "Start Recording";
    }
    var orientation_enable = document.getElementById('orientation');
    if (('header' in sensors) || ('roll' in sensors) || ('pitch' in sensors) || ('yaw' in sensors)) {
        orientation_enable.style.setProperty("background", "#B31C1C");
        orientation_enable.innerHTML = "Disable";
    }
    else {
        orientation_enable.style.setProperty("background", "#187D8B");
        orientation_enable.innerHTML = "Enable";
    }
    var environment_enable = document.getElementById('environment');
    if (('tempWater' in sensors) || ('depthWater' in sensors) || ('pressureWater' in sensors)) {
        environment_enable.style.setProperty("background", "#B31C1C");
        environment_enable.innerHTML = "Disable";
    }
    else {
        environment_enable.style.setProperty("background", "#187D8B");
        environment_enable.innerHTML = "Enable";
    }
    var bt_serial_enable = document.getElementById('bt_serial');
    if ('conductivity' in sensors) {
        bt_serial_enable.style.setProperty("background", "#B31C1C");
        bt_serial_enable.innerHTML = "Disable";
    }
    else {
        bt_serial_enable.style.setProperty("background", "#187D8B");
        bt_serial_enable.innerHTML = "Enable";
    }
    var sonar_enable = document.getElementById('sonar');
    if (('sonar_depth' in sensors) || ('sonar_confi' in sensors)) {
        sonar_enable.style.setProperty("background", "#B31C1C");
        sonar_enable.innerHTML = "Disable";
    }
    else {
        sonar_enable.style.setProperty("background", "#187D8B");
        sonar_enable.innerHTML = "Enable";
    }
    var system_monitor_enable = document.getElementById('system_monitor');
    if (('free_space' in sensors) || ('cpu_temp' in sensors) || ('temp' in sensors) || ('humidity' in sensors)) {
        system_monitor_enable.style.setProperty("background", "#B31C1C");
        system_monitor.innerHTML = "Disable";
    }
    else {
        system_monitor_enable.style.setProperty("background", "#187D8B");
        system_monitor_enable.innerHTML = "Enable";
    }
}

//get_sensor_stream();
get_sensor();
//const state_timeout = setTimeout(cam_state(), 2000);
