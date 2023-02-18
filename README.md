# ODL Wayfinder Interface

An interface for connecting to the Ocean Discovery League Wayfinder system, setting up operations, and transferring data.

## Instructions for Environment Setup:
1. Download [Qt Online Installer](https://www.qt.io/download-qt-installer?utm_referrer=https%3A%2F%2Fwww.qt.io%2Fdownload-open-source%3Futm_referrer%3Dhttps%253A%252F%252Fwww.qt.io%252Fdownload)
2. Run Qt installer, select open source development under LGPL license
3. Open Qt Creator
4. File --> New Project --> Import Project --> Git Clone --> Choose...
5. Add repository URL (https://github.com/ArianeChriss/ODL-Wayfinder-Interface.git)

_*Note: if committing changes from a not-mine system, add build folders to the repository .gitignore file_

## For Development:
Interface frontend is done in main.qml, with functions being called from main.cpp and any other C++ source files. Any images or other resources need to be added in qml.qrc.

QML: [Qt Tutorial](https://doc.qt.io/qt-6/qml-tutorial.html)
### For adding C++ functions to QML:
1. Create C++ .cpp and .h files ([helpful forum post for formatting](https://forum.qt.io/topic/33170/call-c-function-from-qml/2))
2. Add include statement to top of main.cpp:

    `#include "MyFunctions.h"`

3. Define function file version in main.cpp:
```
    QGuiApplication app(argc, argv);

    qmlRegisterType<Wayfinder>("MyFunctions", 1, 0, "MyFunctions");

    QQmlApplicationEngine engine;
```
4. Add import statement with version to top of main.qml:

    `import MyFunctions 1.0`

## For Building:
