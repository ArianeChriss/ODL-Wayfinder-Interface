import QtQuick 2.15
import QtQuick.Controls 2.15
import QtQuick.Window 2.15

Window {
    id: root
    width: Screen.desktopAvailableWidth / 1.5
    height: Screen.desktopAvailableHeight / 1.5
    visible: true
    color: "#0e2730"
    title: qsTr("Wayfinder Connect")
    Image {
        id: logo
        source: "images/odl_logo.png"
        height: root.height / 9
        width: (1999 / 718) * logo.height
        x: root.width / 25
        y: root.height / 25
    }
    Text {
        id: title
        x: logo.width + (root.width / 20)
        y: logo.AlignTop
        font.bold: true
        font.pointSize: logo.height
        color: "#004f60"
        text: "Wayfinder Connect"
        topPadding: 0
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
        placeholderText: qsTr("Enter command...")
    }
}
