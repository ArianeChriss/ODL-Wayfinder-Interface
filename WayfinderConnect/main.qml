import QtQuick 2.15
import QtQuick.Controls 2.15
import QtQuick.Window 2.15
import CommandLine 1.0
import QtWebEngine
import QtQml

Window {
    id: root
    width: Screen.desktopAvailableWidth / 1.5
    height: Screen.desktopAvailableHeight / 1.5
    visible: true
    color: "#004D64"
    title: qsTr("Wayfinder")
    FontLoader { id: montserrat; source: "Montserrat-VariableFont_wght.ttf" }
    FontLoader { id: montserrat_bold; source: "Montserrat-ExtraBold.ttf" }
    FontLoader { id: montserrat_italic; source: "Montserrat-Italic-VariableFont_wght.ttf" }
    Rectangle {
        id: logo_back
        height: root.height / 5
        width: root.width
        color: "#000000"
    }
    Image {
        id: logo
        anchors.top: logo_back.top
        anchors.left: logo_back.left
        anchors.margins: height / 2
        //anchors.horizontalCenter: tab_bar.horizontalCenter
        //anchors.verticalCenter: logo_back.verticalCenter
        source: "images/odl_logo.png"
        height: logo_back.height / 2
        width: (1999 / 718) * logo.height
    }
    Rectangle {
        id: tab_bar
        anchors.horizontalCenter: logo.horizontalCenter
        anchors.top: logo_back.bottom
        height: (root.height / 5) * 3
        width: logo.width + logo.height
        color: "#BBBBBB"
        ListView {
            anchors.fill: parent;
            model: ListModel {
                ListElement {
                    name: "module1"
                }
                ListElement {
                    name: "module2"
                }
                ListElement {
                    name: "module3"
                }
            }
            delegate: Text {
                text: name
                font.family: montserrat.name
                font.bold: true
                font.pointSize: 15
                padding: 5
            }

            /*model: Qt.fontFamilies()

            delegate: Item {
                height: 40;
                width: ListView.view.width
                Text {
                    anchors.centerIn: parent
                    text: modelData;
                }
            }*/
        }
    }
    Text {
        id: title
        anchors.verticalCenter: logo.verticalCenter
        anchors.left: tab_bar.right
        font.family: montserrat.name
        font.pointSize: logo.height
        color: "#FFFFFF"
        text: "Wayfinder"
    }
    Wayfinder {
        id: connection
    }
    Rectangle {
        id: command_box
        anchors.left: tab_bar.right
        anchors.top: logo_back.bottom
        height: 30
        width: root.width / 4
        anchors.margins: 10
        TextField {
            id: command
            anchors.verticalCenter: command_box.verticalCenter
            anchors.left: command_box.left
            width: command_box.width
            height: command_box.height
            font.pointSize: command_box.height / 2.25
            font.family: montserrat_italic.name
            font.italic: true
            color: "#111111"
            placeholderTextColor: "#444444"
            placeholderText: "IP Address..."
            background: Rectangle {
                color: "transparent"
                border.color: "transparent"
            }
            onDisplayTextChanged: {
                if (command.text !== "") {
                    command.font.italic = false
                    command.font.family = montserrat_bold.name
                }
                else {
                    command.font.italic = true
                    command.font.family = montserrat_italic.name
                }
            }
        }
    }
    Button {
        id: command_button
        anchors.verticalCenter: command_box.verticalCenter
        anchors.left: command_box.right
        height: command_box.height
        width: command_box.width/4
        text: qsTr("Connect")
        font.family: montserrat.name
        onClicked: {
            command_output.text = connection.connect(command.text)
            winld.source = "video_feed.qml"
        }
    }
    Loader {
        id: winld
    }
    Rectangle {
        id: command_return_box
        anchors.top: tab_bar.bottom
        height: root.height / 5
        width: root.width
        color: "#0E2446"
        Text {
            id: command_output
            padding: 15
            width: parent.width
            font.pointSize: 12
            text: ""
            color: "#FFFFFF"
        }
    }
}
