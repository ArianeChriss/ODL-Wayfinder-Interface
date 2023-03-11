#include "CommandLine.h"
#include <QDebug>

using namespace std;

Wayfinder::Wayfinder(QObject *parent)://, QUrl *q_url):
QObject(parent)
{
}

void Wayfinder::connect(QString ip_address)
{
    // CREATE NAMED PIPE, IF WINDOWS32 CreateNamedPipeA, IF MAC/UNIX pipe()


    // COULD ALSO GO THROUGH QTCREATOR FOR UTILS SSH FILE
    
    // POSSIBLY USE QPROCESS, https://doc.qt.io/qt-6/qprocess.html#:~:text=QProcess%20forwards%20the%20input%20of,or%20modified%20in%20Qt%205.2.



    /*string new_command = command_strings[1] + ip_address.toStdString();// + "&&" + command_strings[2] + "&&" + command_strings[3] + "&&" + command_strings[4];
    const char* command = new_command.c_str();

    system(command);*/

    // array<char, 128> buffer;
    //int pipe_comms[2];
    //int i;
    //string return_text;
    //pid_t pip = fork();

    string new_command = command_strings[1] + ip_address.toStdString();// + "&&" + command_strings[2] + "&&" + command_strings[3] + "&&" + command_strings[4];
    const char* command = new_command.c_str();
    string password = "ikea";
    const char* password_char = password.c_str();

#ifdef _WIN32
    //FILE* pipe = _popen(command, "r");
    FILE* output = _popen(command, "w");
#else
    FILE* pipe = popen(command, "r");
#endif

    /*while (fgets(buffer.data(), 128, pipe) != NULL) {
       return_text += buffer.data();
    }*/

    fprintf(output, "%s", password_char);

    fclose(output);
    //fclose(pipe);

    //new_command = command_strings[2]

    //pipe = _popen
    //string returntext = system(command);*/
    //return QString::fromStdString(return_text);
    //return QString::fromStdString(new_command);
}
