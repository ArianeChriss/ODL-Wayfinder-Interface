#include "CommandLine.h"
#include <QDebug>

using namespace std;

Wayfinder::Wayfinder(QObject *parent)://, QUrl *q_url):
QObject(parent)
{
}

QString Wayfinder::connect(QString ip_address)
{
    array<char, 128> buffer;
    string return_text;

    const char* command = command_strings->c_str();

#ifdef _WIN32
    FILE* pipe = _popen(command, "r");
#else
    FILE* pipe = popen(command, "r");
#endif

    while (fgets(buffer.data(), 128, pipe) != NULL) {
        return_text += buffer.data();
    }

    fclose(pipe);
    //string returntext = system(command);
    return QString::fromStdString(return_text);
}
