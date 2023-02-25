import QtQuick 2.15
import QtQuick.Controls 2.15
import QtQuick.Window 2.15
import CommandLine 1.0
import QtWebEngine
import QtQml
//#include <QString>

Window {
    id: root
    width: Screen.desktopAvailableWidth / 1.5
    height: Screen.desktopAvailableHeight / 1.5
    visible: true
    color: "#0e2730"
    title: qsTr("Wayfinder")
    Image {
        id: logo
        source: "images/odl_logo.png"
        height: root.height / 9
        width: (1999 / 718) * logo.height
        x: root.width / 25
        y: root.height / 19
    }
    Text {
        id: title
        x: root.width / 3 //logo.width + (root.width / 20) + root.width / 15
        y: logo.height - (root.height / 15)
        font.family: "Montserrat"
        font.bold: true
        font.pointSize: logo.height
        color: "#004f60"
        text: "Wayfinder"
        topPadding: 0
    }
    Wayfinder {
        id: connection
    }

    TextField {
        id: command
        x: logo.x
        y: logo.y + logo.height * 2
        focus: true
        font.pointSize: command.height / 1.75
        height: root.height / 15
        width: root.width / 1.5
        color: "darkgray"
        //placeholderText: qsTr(connection.connect("ip address here"))
    }

    Button {
        id: ldbutton
        onClicked: {
            halp.text = connection.connect("thingy")
            winld.source = "video_feed.qml"
        }
    }
    Loader {
        id: winld
    }
    Text {
        id: halp
        width: parent.width
        font.pointSize: 100
        text: ""
    }
}
