import QtQuick 2.15
import QtQuick.Controls 2.15
import QtQuick.Window 2.15
import QtWebEngine

Window {
    id: new_wind
    width: Screen.desktopAvailableWidth / 3
    height: Screen.desktopAvailableHeight / 3
    visible: true
    title: qsTr("Wayfinder Video Feed")
    WebEngineView {
        anchors.fill: parent
        url: "http://192.168.1.153:8000"
    }
}
